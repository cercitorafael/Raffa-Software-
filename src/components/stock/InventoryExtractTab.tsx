import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/crypto';
import {
  FileSpreadsheet,
  Calendar,
  Filter,
  Printer,
  FileDown,
  FileText,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Layers,
  Warehouse as WarehouseIcon,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  printInventoryExtractA4,
  downloadInventoryExtractPdf,
  exportInventoryExtractCsv,
} from '../../utils/print';
import { InventoryExtractRow } from '../../types';

export const InventoryExtractTab: React.FC = () => {
  const {
    products,
    warehouses,
    stock,
    stockMovements,
    currentCompany,
    currentStore,
    categories,
    users,
  } = useApp();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  // Filter States
  const [periodType, setPeriodType] = useState<'day' | 'month' | 'year' | 'custom' | 'all'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [startDate, setStartDate] = useState<string>(`${currentMonthStr}-01`);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMovementType, setSelectedMovementType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Human-readable period label
  const periodLabel = useMemo(() => {
    if (periodType === 'day') {
      return `Dia ${formatDate(selectedDate)}`;
    }
    if (periodType === 'month') {
      const [y, m] = selectedMonth.split('-');
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const monthIndex = parseInt(m, 10) - 1;
      return `${monthNames[monthIndex] || m} de ${y}`;
    }
    if (periodType === 'year') {
      return `Ano Fiscal ${selectedYear}`;
    }
    if (periodType === 'custom') {
      return `De ${formatDate(startDate)} até ${formatDate(endDate)}`;
    }
    return 'Histórico Geral Completo';
  }, [periodType, selectedDate, selectedMonth, selectedYear, startDate, endDate]);

  // Build warehouse map
  const warehouseMap = useMemo(() => {
    const map = new Map<string, string>();
    warehouses.forEach((w) => map.set(w.id, w.name));
    return map;
  }, [warehouses]);

  // Build product map
  const productMap = useMemo(() => {
    const map = new Map<string, any>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Build user map
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => map.set(u.id, u.name));
    return map;
  }, [users]);

  // Filter movements according to chosen date range and options
  const filteredRows = useMemo(() => {
    const rows: InventoryExtractRow[] = [];

    // Sort chronologically (oldest to newest for running balance calculation)
    const sorted = [...stockMovements].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Track running balance per product
    const runningBalances: Record<string, number> = {};

    sorted.forEach((m) => {
      const prod = productMap.get(m.productId);
      const isOut =
        m.type === 'saida_venda' ||
        m.type === 'perda' ||
        m.type === 'quebra' ||
        (m.type === 'transferencia' && m.sourceWarehouseId);

      const qty = Math.abs(m.quantity);
      const prevBal = runningBalances[m.productId] || 0;
      const currentBal = isOut ? prevBal - qty : prevBal + qty;
      runningBalances[m.productId] = currentBal;

      // 1. Period filter
      const movDate = new Date(m.timestamp);
      const movDateStr = m.timestamp.split('T')[0];

      let inPeriod = true;
      if (periodType === 'day') {
        inPeriod = movDateStr === selectedDate;
      } else if (periodType === 'month') {
        const [y, mm] = selectedMonth.split('-');
        inPeriod =
          movDate.getFullYear() === parseInt(y, 10) &&
          movDate.getMonth() + 1 === parseInt(mm, 10);
      } else if (periodType === 'year') {
        inPeriod = movDate.getFullYear() === selectedYear;
      } else if (periodType === 'custom') {
        inPeriod = movDateStr >= startDate && movDateStr <= endDate;
      }

      if (!inPeriod) return;

      // 2. Warehouse filter
      if (selectedWarehouse !== 'all') {
        const matchesWh =
          m.targetWarehouseId === selectedWarehouse ||
          m.sourceWarehouseId === selectedWarehouse;
        if (!matchesWh) return;
      }

      // 3. Category filter
      if (selectedCategory !== 'all') {
        if (!prod || prod.category !== selectedCategory) return;
      }

      // 4. Movement Type filter
      if (selectedMovementType !== 'all') {
        if (m.type !== selectedMovementType) return;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const prodName = (prod?.name || '').toLowerCase();
        const sku = (prod?.sku || '').toLowerCase();
        const barcode = (prod?.barcode || '').toLowerCase();
        const refDoc = (m.referenceDoc || '').toLowerCase();
        const reason = (m.reason || '').toLowerCase();
        const lot = (m.lotNumber || '').toLowerCase();
        const op = (userMap.get(m.operatorId) || '').toLowerCase();

        if (
          !prodName.includes(q) &&
          !sku.includes(q) &&
          !barcode.includes(q) &&
          !refDoc.includes(q) &&
          !reason.includes(q) &&
          !lot.includes(q) &&
          !op.includes(q)
        ) {
          return;
        }
      }

      // Label mapping
      const typeLabels: Record<string, string> = {
        entrada_compra: 'Entrada / Compra',
        saida_venda: 'Saída / Venda',
        ajuste: 'Ajuste de Inventário',
        transferencia: 'Transferência',
        perda: 'Quebra / Perda',
        quebra: 'Quebra / Avaria',
        devolucao: 'Devolução / Estorno',
      };

      const whName =
        warehouseMap.get(m.targetWarehouseId || '') ||
        warehouseMap.get(m.sourceWarehouseId || '') ||
        'Armazém Geral';

      const unitCost = m.unitCost || prod?.costPrice || 0;

      rows.push({
        id: m.id,
        timestamp: m.timestamp,
        productId: m.productId,
        productName: prod?.name || 'Artigo Desconhecido',
        sku: prod?.sku || 'S/ SKU',
        unit: prod?.unit || 'un',
        category: prod?.category || '',
        warehouseName: whName,
        type: m.type,
        typeLabel: typeLabels[m.type] || m.type,
        referenceDoc: m.referenceDoc || '—',
        quantityIn: !isOut ? qty : 0,
        quantityOut: isOut ? qty : 0,
        runningBalance: currentBal,
        unitCost,
        totalCost: qty * unitCost,
        operatorName: userMap.get(m.operatorId) || 'Operador',
        reason: m.reason || '—',
        batchNumber: m.lotNumber,
      });
    });

    // Return reversed (newest first for reading table)
    return rows.reverse();
  }, [
    stockMovements,
    productMap,
    warehouseMap,
    userMap,
    periodType,
    selectedDate,
    selectedMonth,
    selectedYear,
    startDate,
    endDate,
    selectedWarehouse,
    selectedCategory,
    selectedMovementType,
    searchQuery,
  ]);

  // Aggregate totals
  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalCostIn = 0;
    let totalCostOut = 0;

    filteredRows.forEach((r) => {
      if (r.quantityIn > 0) {
        totalIn += r.quantityIn;
        totalCostIn += r.totalCost;
      }
      if (r.quantityOut > 0) {
        totalOut += r.quantityOut;
        totalCostOut += r.totalCost;
      }
    });

    const netQty = totalIn - totalOut;
    const netCost = totalCostIn - totalCostOut;
    const currentStockTotal = stock.reduce((s, it) => s + it.quantity, 0);
    const totalCostValue = stock.reduce((s, it) => s + it.quantity * it.avgCost, 0);

    return {
      totalIn,
      totalOut,
      totalCostIn,
      totalCostOut,
      netQty,
      netCost,
      initialStockTotal: Math.max(0, currentStockTotal - netQty),
      finalStockTotal: currentStockTotal,
      totalCostValue,
      count: filteredRows.length,
    };
  }, [filteredRows, stock]);

  // Print & Export Handlers
  const handlePrintA4 = () => {
    const whName =
      selectedWarehouse === 'all'
        ? 'Todos os Armazéns'
        : warehouseMap.get(selectedWarehouse) || 'Armazém Selecionado';

    printInventoryExtractA4({
      rows: filteredRows,
      periodLabel,
      initialStockTotal: totals.initialStockTotal,
      finalStockTotal: totals.finalStockTotal,
      totalIn: totals.totalIn,
      totalOut: totals.totalOut,
      totalCostValue: totals.totalCostValue,
      company: currentCompany,
      store: currentStore,
      warehouseName: whName,
      filterDetails: `Filtro: ${periodType.toUpperCase()} | Armazém: ${whName} | Tipo: ${selectedMovementType}`,
    });
  };

  const handleDownloadPdf = () => {
    const whName =
      selectedWarehouse === 'all'
        ? 'Todos os Armazéns'
        : warehouseMap.get(selectedWarehouse) || 'Armazém Selecionado';

    downloadInventoryExtractPdf({
      rows: filteredRows,
      periodLabel,
      initialStockTotal: totals.initialStockTotal,
      finalStockTotal: totals.finalStockTotal,
      totalIn: totals.totalIn,
      totalOut: totals.totalOut,
      totalCostValue: totals.totalCostValue,
      company: currentCompany,
      store: currentStore,
      warehouseName: whName,
    });
  };

  const handleExportCsv = () => {
    exportInventoryExtractCsv({
      rows: filteredRows,
      periodLabel,
      initialStockTotal: totals.initialStockTotal,
      finalStockTotal: totals.finalStockTotal,
      totalIn: totals.totalIn,
      totalOut: totals.totalOut,
      totalCostValue: totals.totalCostValue,
      company: currentCompany,
      store: currentStore,
    });
  };

  const resetFilters = () => {
    setPeriodType('month');
    setSelectedMonth(currentMonthStr);
    setSelectedDate(todayStr);
    setSelectedYear(currentYear);
    setStartDate(`${currentMonthStr}-01`);
    setEndDate(todayStr);
    setSelectedWarehouse('all');
    setSelectedCategory('all');
    setSelectedMovementType('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm space-y-4">
        {/* Row 1: Period Selection Tabs & Print Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#262626]">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>Filtrar por:</span>
            </span>

            <div className="inline-flex p-1 bg-[#0d0d0d] border border-[#262626] rounded-lg">
              <button
                type="button"
                onClick={() => setPeriodType('day')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodType === 'day'
                    ? 'bg-[#c5a47e] text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Dias / Data
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('month')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodType === 'month'
                    ? 'bg-[#c5a47e] text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Mês
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('year')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodType === 'year'
                    ? 'bg-[#c5a47e] text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Ano
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('custom')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodType === 'custom'
                    ? 'bg-[#c5a47e] text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Personalizado
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodType === 'all'
                    ? 'bg-[#c5a47e] text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          {/* Print & Export Actions */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <button
              id="print-inventory-extract-a4"
              type="button"
              onClick={handlePrintA4}
              className="px-3.5 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Imprimir Extrato de Inventário Oficial em Formato A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir A4</span>
            </button>

            <button
              id="download-inventory-extract-pdf"
              type="button"
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-200 border border-[#333] hover:border-[#c5a47e]/50 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Descarregar Extrato de Inventário em PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>Descarregar PDF</span>
            </button>

            <button
              id="export-inventory-extract-csv"
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-200 border border-[#333] hover:border-emerald-500/50 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Exportar dados para Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel / CSV</span>
            </button>
          </div>
        </div>

        {/* Row 2: Dynamic Period Date Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center bg-[#0d0d0d] p-3 rounded-lg border border-[#262626]">
          {periodType === 'day' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                  Data Específica (Dia)
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-[#141414] border border-[#333] rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>
              <div className="md:col-span-3 flex items-center space-x-2 pt-3 md:pt-0">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] text-[11px] text-neutral-300 rounded border border-[#333] transition-colors cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] text-[11px] text-neutral-300 rounded border border-[#333] transition-colors cursor-pointer"
                >
                  Ontem
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] text-[11px] text-neutral-300 rounded border border-[#333] transition-colors cursor-pointer"
                >
                  Há 7 Dias
                </button>
              </div>
            </>
          )}

          {periodType === 'month' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                  Mês / Ano
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-[#141414] border border-[#333] rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>
              <div className="md:col-span-3 flex items-center space-x-2 pt-3 md:pt-0">
                <button
                  type="button"
                  onClick={() => setSelectedMonth(currentMonthStr)}
                  className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] text-[11px] text-neutral-300 rounded border border-[#333] transition-colors cursor-pointer"
                >
                  Este Mês
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - 1);
                    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                  }}
                  className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] text-[11px] text-neutral-300 rounded border border-[#333] transition-colors cursor-pointer"
                >
                  Mês Anterior
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - 2);
                    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                  }}
                  className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] text-[11px] text-neutral-300 rounded border border-[#333] transition-colors cursor-pointer"
                >
                  Há 2 Meses
                </button>
              </div>
            </>
          )}

          {periodType === 'year' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                  Ano Fiscal
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="w-full bg-[#141414] border border-[#333] rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                >
                  {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4].map((y) => (
                    <option key={y} value={y}>
                      {y} (Exercício Fiscal)
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3 flex items-center space-x-2 pt-3 md:pt-0">
                <button
                  type="button"
                  onClick={() => setSelectedYear(currentYear)}
                  className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] text-[11px] text-neutral-300 rounded border border-[#333] transition-colors cursor-pointer"
                >
                  Ano Atual ({currentYear})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedYear(currentYear - 1)}
                  className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] text-[11px] text-neutral-300 rounded border border-[#333] transition-colors cursor-pointer"
                >
                  Ano Anterior ({currentYear - 1})
                </button>
              </div>
            </>
          )}

          {periodType === 'custom' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#141414] border border-[#333] rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                  Data Final
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#141414] border border-[#333] rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>
              <div className="md:col-span-2 flex items-center space-x-2 pt-3 md:pt-4">
                <span className="text-xs text-[#c5a47e] font-semibold">{periodLabel}</span>
              </div>
            </>
          )}

          {periodType === 'all' && (
            <div className="md:col-span-4 text-xs text-neutral-400 flex items-center justify-between">
              <span>A exibir todos os lançamentos e movimentos históricos gravados na base de dados.</span>
              <span className="text-[#c5a47e] font-semibold">{totals.count} movimentos no total</span>
            </div>
          )}
        </div>

        {/* Row 3: Secondary Filters (Warehouse, Category, Type, Search) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Warehouse */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
              Armazém / Estabelecimento
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
            >
              <option value="all">Todos os Armazéns</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
              Categoria / Família
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Movement Type */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
              Tipo de Movimento
            </label>
            <select
              value={selectedMovementType}
              onChange={(e) => setSelectedMovementType(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
            >
              <option value="all">Todos os Movimentos</option>
              <option value="entrada_compra">Entradas / Compras (+)</option>
              <option value="saida_venda">Saídas / Vendas (-)</option>
              <option value="ajuste">Ajustes de Inventário (±)</option>
              <option value="transferencia">Transferências entre Armazéns</option>
              <option value="perda">Quebras / Perdas (-)</option>
              <option value="devolucao">Devoluções / Estornos (+)</option>
            </select>
          </div>

          {/* Search Term */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
              Pesquisar Artigo / Ref / Lote
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Nome, SKU, doc ou motivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg pl-9 pr-7 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards for Filtered Extract */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-3.5">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
            <span>Entradas no Período</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-mono font-bold text-emerald-400 mt-1">
            +{totals.totalIn.toLocaleString()} un
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            Valor: {formatCurrency(totals.totalCostIn)}
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-3.5">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
            <span>Saídas no Período</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-base font-mono font-bold text-rose-400 mt-1">
            -{totals.totalOut.toLocaleString()} un
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            Valor Custo: {formatCurrency(totals.totalCostOut)}
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-3.5">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
            <span>Variação Líquida</span>
            {totals.netQty >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div className={`text-base font-mono font-bold mt-1 ${totals.netQty >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totals.netQty >= 0 ? `+${totals.netQty.toLocaleString()}` : totals.netQty.toLocaleString()} un
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            Saldo: {formatCurrency(totals.netCost)}
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-3.5">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Valorização Total (CMP)
          </div>
          <div className="text-base font-mono font-bold text-[#c5a47e] mt-1">
            {formatCurrency(totals.totalCostValue)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            {totals.finalStockTotal.toLocaleString()} un em stock
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-3.5 col-span-2 md:col-span-1">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Total Movimentos
          </div>
          <div className="text-base font-mono font-bold text-neutral-200 mt-1">
            {filteredRows.length} registos
          </div>
          <div className="text-[11px] text-[#c5a47e] mt-0.5 truncate" title={periodLabel}>
            {periodLabel}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#262626] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-[#c5a47e]" />
            <h3 className="text-sm font-serif font-bold text-[#e5e5e5]">
              Extrato Detalhado de Movimentos &bull; {periodLabel}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-400">
              A mostrar <strong>{filteredRows.length}</strong> registos
            </span>
            {(selectedWarehouse !== 'all' || selectedCategory !== 'all' || selectedMovementType !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-[#c5a47e] hover:underline flex items-center space-x-1 ml-2 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-[#0f0f0f] text-[10px] uppercase tracking-wider text-neutral-400 font-semibold border-b border-[#262626]">
              <tr>
                <th className="py-3 px-4">Data & Hora</th>
                <th className="py-3 px-4">Artigo / Referência</th>
                <th className="py-3 px-4">Armazém</th>
                <th className="py-3 px-4">Tipo Movimento</th>
                <th className="py-3 px-4">Documento / Ref</th>
                <th className="py-3 px-4 text-right">Entrada</th>
                <th className="py-3 px-4 text-right">Saída</th>
                <th className="py-3 px-4 text-right">Saldo</th>
                <th className="py-3 px-4 text-right">Custo Unit.</th>
                <th className="py-3 px-4 text-right">Total Custo</th>
                <th className="py-3 px-4">Operador & Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-neutral-500">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-neutral-600" />
                    <p className="text-sm font-semibold text-neutral-400">Nenhum movimento encontrado</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Tente alterar os filtros de dia, mês, ano ou armazém selecionado.
                    </p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-3 px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-200 text-xs rounded-lg border border-[#333] transition-colors cursor-pointer"
                    >
                      Restaurar Todos os Filtros
                    </button>
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  return (
                    <tr key={r.id} className="hover:bg-[#181818] transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-neutral-400">
                        {formatDate(r.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-200">{r.productName}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          SKU: {r.sku} {r.batchNumber ? `• Lote: ${r.batchNumber}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-neutral-300">
                        {r.warehouseName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            r.type === 'entrada_compra'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : r.type === 'saida_venda'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : r.type === 'ajuste'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : r.type === 'transferencia'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : r.type === 'devolucao'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                              : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                          }`}
                        >
                          {r.typeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                        {r.referenceDoc}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {r.quantityIn > 0 ? `+${r.quantityIn} ${r.unit}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                        {r.quantityOut > 0 ? `-${r.quantityOut} ${r.unit}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-200 whitespace-nowrap">
                        {r.runningBalance} {r.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-400 whitespace-nowrap">
                        {formatCurrency(r.unitCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#c5a47e] whitespace-nowrap">
                        {formatCurrency(r.totalCost)}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-neutral-400 max-w-xs truncate">
                        <span className="text-neutral-300 font-medium">{r.operatorName}</span>
                        {r.reason && r.reason !== '—' && (
                          <span className="text-neutral-500 block truncate">({r.reason})</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
