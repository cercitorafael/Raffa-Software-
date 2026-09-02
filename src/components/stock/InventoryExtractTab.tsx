import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/crypto';
import {
  getTodayDateStr,
  getYesterdayDateStr,
  getCurrentMonthStr,
  getPrevMonthStr,
  getMonthBounds,
  getMonthNamePT,
} from '../../utils/dateUtils';
import {
  FileSpreadsheet,
  Calendar,
  Filter,
  Printer,
  FileDown,
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
  Plus,
  Package,
  Boxes,
  ArrowUpDown,
  History,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  printInventoryExtractA4,
  downloadInventoryExtractPdf,
  exportInventoryExtractCsv,
} from '../../utils/print';
import { InventoryExtractRow, StockMovement } from '../../types';

export const InventoryExtractTab: React.FC = () => {
  const {
    products,
    warehouses,
    stores,
    stock,
    stockMovements,
    salesHistory,
    currentCompany,
    currentStore,
    categories,
    users,
    currentUser,
    recordStockMovement,
    createStockAdjustment,
    hasPermission,
    notify,
  } = useApp();

  const todayStr = getTodayDateStr();
  const currentMonthStr = getCurrentMonthStr();
  const currentYear = new Date().getFullYear();
  const initialBounds = getMonthBounds(currentMonthStr);

  // Primary Tab View Mode (Detailed Timeline vs Articles Summary)
  const [viewMode, setViewMode] = useState<'timeline' | 'articles_summary'>('timeline');

  // Filter States
  const [periodType, setPeriodType] = useState<'day' | 'month' | 'year' | 'custom' | 'all'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [startDate, setStartDate] = useState<string>(initialBounds.start);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMovementType, setSelectedMovementType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Action Modals
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showQuickAdjustModal, setShowQuickAdjustModal] = useState(false);
  const [quickActionProduct, setQuickActionProduct] = useState<any>(null);

  // Form States
  const [entryForm, setEntryForm] = useState({
    productId: products[0]?.id || '',
    warehouseId: warehouses[0]?.id || '',
    quantity: 10,
    unitCost: 0,
    referenceDoc: '',
    supplier: '',
    lotNumber: '',
    reason: 'Entrada de mercadoria / Compra',
  });

  const [adjustForm, setAdjustForm] = useState({
    productId: products[0]?.id || '',
    warehouseId: warehouses[0]?.id || '',
    newQty: 0,
    reason: 'Contagem física e acerto de inventário',
  });

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

  // Build category map
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Build user map
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => map.set(u.id, u.name));
    return map;
  }, [users]);

  // Helper to safely extract date in local calendar format
  const parseMovementDate = (m: StockMovement) => {
    const raw = m.timestamp || m.date || '';
    const d = raw ? new Date(raw) : new Date();
    const validDate = isNaN(d.getTime()) ? new Date() : d;
    const y = validDate.getFullYear();
    const mo = String(validDate.getMonth() + 1).padStart(2, '0');
    const da = String(validDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${mo}-${da}`;
    const monthStr = `${y}-${mo}`;
    return { dateStr, monthStr, year: y, dateObj: validDate };
  };

  // Helper to determine if movement is outflow (saída/redução)
  const isOutMovement = (m: StockMovement): boolean => {
    if (
      m.type === 'saida' ||
      m.type === 'saida_venda' ||
      m.type === 'venda' ||
      m.type === 'perda' ||
      m.type === 'quebra'
    ) {
      return true;
    }
    if (m.type === 'transferencia' && (m.originWarehouseId || m.sourceWarehouseId)) {
      return true;
    }
    if (m.type === 'ajuste') {
      if (m.quantity < 0) return true;
      const r = (m.reason || '').toLowerCase();
      if (r.includes('(-') || r.includes('redução') || r.includes('quebra') || r.includes('perda')) {
        return true;
      }
    }
    return false;
  };

  // Label and styling mapping
  const getMovementLabel = (type: string, isOut: boolean) => {
    switch (type) {
      case 'entrada':
      case 'entrada_compra':
        return { label: 'Entrada / Compra', badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' };
      case 'saida':
      case 'saida_venda':
      case 'venda':
        return { label: 'Saída / Venda', badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' };
      case 'ajuste':
        return {
          label: isOut ? 'Ajuste Negativo (-)' : 'Ajuste Positivo (+)',
          badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
        };
      case 'transferencia':
        return { label: 'Transferência', badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30' };
      case 'quebra':
      case 'perda':
        return { label: 'Quebra / Avaria', badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30' };
      case 'devolucao':
        return { label: 'Devolução / Estorno', badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30' };
      default:
        return { label: type, badgeClass: 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-300 border border-neutral-500/30' };
    }
  };

  // Filter movements according to chosen date range and options
  const filteredRows = useMemo(() => {
    const rows: InventoryExtractRow[] = [];

    // Sort chronologically (oldest to newest for running balance calculation)
    const sorted = [...stockMovements].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.date || 0).getTime();
      const timeB = new Date(b.timestamp || b.date || 0).getTime();
      return timeA - timeB;
    });

    // Track running balance per product
    const runningBalances: Record<string, number> = {};

    sorted.forEach((m) => {
      const prod = productMap.get(m.productId);
      const isOut = isOutMovement(m);
      const qty = Math.abs(m.quantity || 0);

      const prevBal = runningBalances[m.productId] || 0;
      const currentBal = isOut ? prevBal - qty : prevBal + qty;
      runningBalances[m.productId] = currentBal;

      // 1. Period filter
      const { dateStr, monthStr, year } = parseMovementDate(m);

      let inPeriod = true;
      if (periodType === 'day') {
        inPeriod = dateStr === selectedDate;
      } else if (periodType === 'month') {
        inPeriod = monthStr === selectedMonth;
      } else if (periodType === 'year') {
        inPeriod = year === selectedYear;
      } else if (periodType === 'custom') {
        inPeriod = dateStr >= startDate && dateStr <= endDate;
      }

      if (!inPeriod) return;

      // 2. Product filter
      if (selectedProduct !== 'all') {
        if (m.productId !== selectedProduct) return;
      }

      // 3. Warehouse filter
      if (selectedWarehouse !== 'all') {
        const matchesWh =
          m.targetWarehouseId === selectedWarehouse ||
          m.originWarehouseId === selectedWarehouse ||
          m.sourceWarehouseId === selectedWarehouse;
        if (!matchesWh) return;
      }

      // 4. Category filter
      if (selectedCategory !== 'all') {
        if (!prod || prod.category !== selectedCategory) return;
      }

      // 5. Movement Type filter
      if (selectedMovementType !== 'all') {
        if (selectedMovementType === 'entrada' && isOut) return;
        if (selectedMovementType === 'saida' && !isOut) return;
        if (selectedMovementType === 'ajuste' && m.type !== 'ajuste') return;
        if (selectedMovementType === 'transferencia' && m.type !== 'transferencia') return;
        if (selectedMovementType === 'quebra' && m.type !== 'quebra' && m.type !== 'perda') return;
        if (selectedMovementType === 'devolucao' && m.type !== 'devolucao') return;
      }

      // 6. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const prodName = (prod?.name || '').toLowerCase();
        const sku = (prod?.sku || '').toLowerCase();
        const barcode = (prod?.barcode || '').toLowerCase();
        const refDoc = (m.referenceDoc || '').toLowerCase();
        const reason = (m.reason || '').toLowerCase();
        const lot = (m.batchNumber || m.lotNumber || '').toLowerCase();
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

      const { label, badgeClass } = getMovementLabel(m.type, isOut);

      const whName =
        warehouseMap.get(m.targetWarehouseId || '') ||
        warehouseMap.get(m.originWarehouseId || '') ||
        warehouseMap.get(m.sourceWarehouseId || '') ||
        'Armazém Geral';

      const unitCost = Number(m.unitCost) > 0 ? Number(m.unitCost) : (prod?.costPrice || 0);

      rows.push({
        id: m.id,
        timestamp: m.timestamp || m.date || new Date().toISOString(),
        productId: m.productId,
        productName: prod?.name || 'Artigo Desconhecido',
        sku: prod?.sku || 'S/ SKU',
        unit: prod?.unit || 'un',
        category: prod?.category || '',
        warehouseName: whName,
        type: m.type,
        typeLabel: label,
        referenceDoc: m.referenceDoc || '—',
        quantityIn: !isOut ? qty : 0,
        quantityOut: isOut ? qty : 0,
        runningBalance: currentBal,
        unitCost,
        totalCost: qty * unitCost,
        operatorName: userMap.get(m.operatorId) || 'Operador',
        reason: m.reason || '—',
        batchNumber: m.batchNumber || m.lotNumber,
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
    selectedProduct,
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

    // Filter relevant stock according to active warehouse/product/category filters
    const relevantStock = stock.filter((s) => {
      if (selectedWarehouse !== 'all' && s.warehouseId !== selectedWarehouse) return false;
      if (selectedProduct !== 'all' && s.productId !== selectedProduct) return false;
      if (selectedCategory !== 'all') {
        const prod = productMap.get(s.productId);
        if (!prod || prod.category !== selectedCategory) return false;
      }
      return true;
    });

    const currentStockTotal = relevantStock.reduce((s, it) => s + it.quantity, 0);
    const totalCostValue = relevantStock.reduce((s, it) => s + it.quantity * it.avgCost, 0);

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
  }, [filteredRows, stock, selectedWarehouse, selectedProduct, selectedCategory, productMap]);

  // Consolidated Articles Summary (Kardex por Artigo)
  const articlesSummary = useMemo(() => {
    const list = products.filter((p) => {
      if (selectedProduct !== 'all' && p.id !== selectedProduct) return false;
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q))
        );
      }
      return true;
    });

    return list.map((prod) => {
      const prodRows = filteredRows.filter((r) => r.productId === prod.id);
      const totalIn = prodRows.reduce((sum, r) => sum + r.quantityIn, 0);
      const totalOut = prodRows.reduce((sum, r) => sum + r.quantityOut, 0);

      const prodStockItems = stock.filter((s) => {
        if (s.productId !== prod.id) return false;
        if (selectedWarehouse !== 'all' && s.warehouseId !== selectedWarehouse) return false;
        return true;
      });

      const currentQty = prodStockItems.reduce((sum, s) => sum + s.quantity, 0);
      const avgCost = prodStockItems[0]?.avgCost || prod.costPrice || 0;
      const initialQty = Math.max(0, currentQty - (totalIn - totalOut));
      const totalValuation = currentQty * avgCost;

      return {
        product: prod,
        categoryName: categoryMap.get(prod.category) || prod.category,
        initialQty,
        totalIn,
        totalOut,
        currentQty,
        avgCost,
        totalValuation,
        movementsCount: prodRows.length,
      };
    });
  }, [products, selectedProduct, selectedCategory, searchQuery, filteredRows, stock, selectedWarehouse, categoryMap]);

  // Synchronize stock movements for articles with existing stock and reconcile sales history
  const handleSynchronizeOpeningStock = () => {
    let syncedStock = 0;
    let syncedSales = 0;
    const compId = currentCompany?.id || 'comp-1';
    const opId = currentUser?.id || 'user-1';

    // 1. Initial stock sync
    const existingProdIdsWithMovements = new Set(stockMovements.map((m) => m.productId));
    stock.forEach((s) => {
      if (s.quantity > 0 && !existingProdIdsWithMovements.has(s.productId)) {
        const prod = productMap.get(s.productId);
        recordStockMovement({
          companyId: compId,
          type: 'entrada',
          productId: s.productId,
          targetWarehouseId: s.warehouseId,
          quantity: s.quantity,
          unitCost: s.avgCost || prod?.costPrice || 0,
          referenceDoc: 'INVENTARIO-INICIAL',
          reason: 'Stock Inicial / Existências Iniciais Registadas',
          operatorId: opId,
        });
        syncedStock++;
      }
    });

    // 2. Sync historical sales documents into stockMovements if not registered
    const existingRefDocs = new Set(stockMovements.map((m) => (m.referenceDoc || '').trim().toUpperCase()));
    salesHistory.forEach((sale) => {
      const isOutDoc = ['FT', 'FR', 'FS', 'VD', 'GT', 'GR', 'POS'].includes((sale.invoiceType || '').toUpperCase()) || !sale.invoiceType;
      const ref = (sale.invoiceNumber || '').trim().toUpperCase();
      if (isOutDoc && ref && !existingRefDocs.has(ref) && sale.status !== 'anulado') {
        const saleWh = sale.storeId
          ? stores.find((st) => st.id === sale.storeId)?.defaultWarehouseId || currentStore.defaultWarehouseId || warehouses[0]?.id
          : currentStore.defaultWarehouseId || warehouses[0]?.id;

        (sale.items || []).forEach((item) => {
          if (!item.productId || item.productId.startsWith('custom-')) return;
          const prod = productMap.get(item.productId);
          recordStockMovement({
            companyId: compId,
            type: 'saida',
            productId: item.productId,
            originWarehouseId: saleWh,
            quantity: Number(item.quantity) || 1,
            unitCost: item.unitPrice || prod?.costPrice || 0,
            referenceDoc: sale.invoiceNumber,
            reason: `Venda ${sale.invoiceNumber} (${sale.customerName || 'Consumidor Final'})`,
            operatorId: sale.operatorId || opId,
          });
          syncedSales++;
        });
      }
    });

    if (syncedStock > 0 || syncedSales > 0) {
      notify(
        `Sincronização concluída: ${syncedStock} artigos com balanço inicial e ${syncedSales} saídas de vendas históricas reconciliadas!`,
        'success'
      );
    } else {
      notify('O extrato de inventário já está 100% atualizado e sincronizado em tempo real.', 'info');
    }
  };

  // Execute quick stock entry
  const handleSaveQuickEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryForm.productId || !entryForm.warehouseId || entryForm.quantity <= 0) return;

    const prod = productMap.get(entryForm.productId);
    const unitCost = Number(entryForm.unitCost) > 0 ? Number(entryForm.unitCost) : (prod?.costPrice || 0);

    recordStockMovement({
      companyId: currentCompany.id,
      type: 'entrada',
      productId: entryForm.productId,
      targetWarehouseId: entryForm.warehouseId,
      quantity: Number(entryForm.quantity),
      unitCost,
      batchNumber: entryForm.lotNumber || undefined,
      lotNumber: entryForm.lotNumber || undefined,
      referenceDoc: entryForm.referenceDoc || `REC-${Date.now().toString().slice(-4)}`,
      reason: entryForm.reason || 'Entrada manual de mercadorias / Compra',
      operatorId: currentUser.id,
    });

    // Update stock item in warehouse
    createStockAdjustment(
      entryForm.productId,
      entryForm.warehouseId,
      (stock.find((s) => s.productId === entryForm.productId && s.warehouseId === entryForm.warehouseId)?.quantity || 0) + Number(entryForm.quantity),
      `Entrada de stock (${entryForm.quantity} ${prod?.unit || 'un'})`
    );

    setShowNewEntryModal(false);
    notify(`Entrada de ${entryForm.quantity} ${prod?.unit || 'un'} registada com sucesso!`, 'success');
  };

  // Execute quick stock adjustment
  const handleSaveQuickAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.productId || !adjustForm.warehouseId) return;

    createStockAdjustment(
      adjustForm.productId,
      adjustForm.warehouseId,
      Number(adjustForm.newQty),
      adjustForm.reason
    );

    setShowQuickAdjustModal(false);
    notify('Ajuste de inventário concluído com sucesso!', 'success');
  };

  // Reset Filters
  const resetFilters = () => {
    setPeriodType('month');
    setSelectedDate(todayStr);
    setSelectedMonth(currentMonthStr);
    setSelectedYear(currentYear);
    setStartDate(`${currentMonthStr}-01`);
    setEndDate(todayStr);
    setSelectedProduct('all');
    setSelectedWarehouse('all');
    setSelectedCategory('all');
    setSelectedMovementType('all');
    setSearchQuery('');
  };

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

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm space-y-4">
        {/* Row 1: View Modes & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#262626]">
          {/* Mode Selector */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <div className="inline-flex p-1 bg-[#0d0d0d] border border-[#262626] rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-[#c5a47e] text-neutral-950 shadow-xs font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Extrato & Movimentos</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('articles_summary')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'articles_summary'
                    ? 'bg-[#c5a47e] text-neutral-950 shadow-xs font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Resumo por Artigo (Kardex)</span>
              </button>
            </div>

            {/* Synchronize Button */}
            <button
              type="button"
              onClick={handleSynchronizeOpeningStock}
              className="px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-300 hover:text-[#c5a47e] text-xs font-medium rounded-lg border border-[#333] transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Gera lançamentos automáticos de balanço inicial para artigos que têm stock físico registado mas sem histórico prévio"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>Sincronizar Stock</span>
            </button>
          </div>

          {/* Action Buttons: New Entry & Print */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              type="button"
              onClick={() => {
                setEntryForm({
                  productId: products[0]?.id || '',
                  warehouseId: warehouses[0]?.id || '',
                  quantity: 10,
                  unitCost: products[0]?.costPrice || 0,
                  referenceDoc: `COMPRA-${Date.now().toString().slice(-4)}`,
                  supplier: '',
                  lotNumber: '',
                  reason: 'Entrada de mercadoria / Compra',
                });
                setShowNewEntryModal(true);
              }}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Entrada de Stock</span>
            </button>

            <button
              id="print-inventory-extract-a4"
              type="button"
              onClick={handlePrintA4}
              className="px-3 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Imprimir Extrato de Inventário Oficial em Formato A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir A4</span>
            </button>

            <button
              id="download-inventory-extract-pdf"
              type="button"
              onClick={handleDownloadPdf}
              className="px-3 py-2 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-200 border border-[#333] hover:border-[#c5a47e]/50 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Descarregar Extrato em PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>PDF</span>
            </button>

            <button
              id="export-inventory-extract-csv"
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-200 border border-[#333] hover:border-emerald-500/50 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Exportar dados para Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Row 2: Period Selection Tabs & Date Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#0d0d0d] p-3 rounded-lg border border-[#262626]">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>Período:</span>
            </span>

            <div className="inline-flex p-1 bg-[#141414] border border-[#262626] rounded-lg flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  const today = getTodayDateStr();
                  const currM = getCurrentMonthStr();
                  setPeriodType('day');
                  setSelectedDate(today);
                  setSelectedMonth(currM);
                  setStartDate(today);
                  setEndDate(today);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodType === 'day' && selectedDate === getTodayDateStr()
                    ? 'bg-[#c5a47e] text-neutral-950 font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#202020]'
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  const yest = getYesterdayDateStr();
                  setPeriodType('day');
                  setSelectedDate(yest);
                  setSelectedMonth(yest.substring(0, 7));
                  setStartDate(yest);
                  setEndDate(yest);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodType === 'day' && selectedDate === getYesterdayDateStr()
                    ? 'bg-[#c5a47e] text-neutral-950 font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#202020]'
                }`}
              >
                Ontem
              </button>
              <button
                type="button"
                onClick={() => {
                  const currM = getCurrentMonthStr();
                  const bounds = getMonthBounds(currM);
                  setPeriodType('month');
                  setSelectedMonth(currM);
                  setStartDate(bounds.start);
                  setEndDate(bounds.end);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodType === 'month' && selectedMonth === getCurrentMonthStr()
                    ? 'bg-[#c5a47e] text-neutral-950 font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#202020]'
                }`}
              >
                Este Mês
              </button>
              <button
                type="button"
                onClick={() => {
                  const prevM = getPrevMonthStr();
                  const bounds = getMonthBounds(prevM);
                  setPeriodType('month');
                  setSelectedMonth(prevM);
                  setStartDate(bounds.start);
                  setEndDate(bounds.end);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodType === 'month' && selectedMonth === getPrevMonthStr()
                    ? 'bg-[#c5a47e] text-neutral-950 font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#202020]'
                }`}
              >
                Mês Anterior
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriodType('year');
                  setSelectedYear(currentYear);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodType === 'year'
                    ? 'bg-[#c5a47e] text-neutral-950 font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#202020]'
                }`}
              >
                Ano Fiscal
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('custom')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodType === 'custom'
                    ? 'bg-[#c5a47e] text-neutral-950 font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#202020]'
                }`}
              >
                Personalizado
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodType === 'all'
                    ? 'bg-[#c5a47e] text-neutral-950 font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#202020]'
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          {/* Dynamic Date Controls */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {periodType === 'day' && (
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-[#141414] border border-[#333] rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>
            )}

            {periodType === 'month' && (
              <div className="flex items-center space-x-2">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-[#141414] border border-[#333] rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>
            )}

            {periodType === 'year' && (
              <div className="flex items-center space-x-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="bg-[#141414] border border-[#333] rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                >
                  {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
                    <option key={y} value={y}>
                      Exercício {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periodType === 'custom' && (
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-[#141414] border border-[#333] rounded-md px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                />
                <span className="text-neutral-500 text-xs">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-[#141414] border border-[#333] rounded-md px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>
            )}

            {periodType === 'all' && (
              <span className="text-xs text-[#c5a47e] font-semibold">
                Histórico completo com todos os registos
              </span>
            )}
          </div>
        </div>

        {/* Row 3: Secondary Filters (Article, Warehouse, Category, Movement Type, Search) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Article / Product */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
              Artigo / Produto
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
            >
              <option value="all">Todos os Artigos ({products.length})</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
              Armazém
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
              Categoria
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
              <option value="entrada">Entradas / Compras (+)</option>
              <option value="saida">Saídas / Vendas (-)</option>
              <option value="ajuste">Ajustes de Inventário (±)</option>
              <option value="transferencia">Transferências</option>
              <option value="quebra">Quebras / Perdas (-)</option>
              <option value="devolucao">Devoluções / Estornos (+)</option>
            </select>
          </div>

          {/* Search Term */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
              Pesquisa Rápida
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Artigo, SKU, doc ou motivo..."
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

      {/* VIEW 1: TIMELINE & DETAILED EXTRACT */}
      {viewMode === 'timeline' && (
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
              {(selectedProduct !== 'all' || selectedWarehouse !== 'all' || selectedCategory !== 'all' || selectedMovementType !== 'all' || searchQuery) && (
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
                        Tente alterar os filtros de dia, mês, ano ou armazém selecionado, ou registe uma nova entrada de stock.
                      </p>
                      <div className="mt-4 flex items-center justify-center space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEntryForm({
                              productId: products[0]?.id || '',
                              warehouseId: warehouses[0]?.id || '',
                              quantity: 10,
                              unitCost: products[0]?.costPrice || 0,
                              referenceDoc: `COMPRA-${Date.now().toString().slice(-4)}`,
                              supplier: '',
                              lotNumber: '',
                              reason: 'Entrada de mercadoria / Compra',
                            });
                            setShowNewEntryModal(true);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          + Registar Entrada de Stock
                        </button>
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-200 text-xs rounded-lg border border-[#333] transition-colors cursor-pointer"
                        >
                          Restaurar Todos os Filtros
                        </button>
                      </div>
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
                              r.type === 'entrada' || r.type === 'entrada_compra'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : r.type === 'saida' || r.type === 'saida_venda' || r.type === 'venda'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : r.type === 'ajuste'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : r.type === 'transferencia'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
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
      )}

      {/* VIEW 2: ARTICLES SUMMARY (Kardex Consolidado por Artigo) */}
      {viewMode === 'articles_summary' && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#262626] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Boxes className="w-5 h-5 text-[#c5a47e]" />
              <h3 className="text-sm font-serif font-bold text-[#e5e5e5]">
                Resumo de Existências e Movimentação por Artigo &bull; {periodLabel}
              </h3>
            </div>
            <span className="text-xs text-neutral-400">
              Total de <strong>{articlesSummary.length}</strong> artigos no catálogo
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-[#0f0f0f] text-[10px] uppercase tracking-wider text-neutral-400 font-semibold border-b border-[#262626]">
                <tr>
                  <th className="py-3 px-4">Artigo & SKU</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Saldo Inicial</th>
                  <th className="py-3 px-4 text-right">Entradas (+)</th>
                  <th className="py-3 px-4 text-right">Saídas (-)</th>
                  <th className="py-3 px-4 text-right">Saldo Final</th>
                  <th className="py-3 px-4 text-right">Custo Médio (CMP)</th>
                  <th className="py-3 px-4 text-right">Valor Total Stock</th>
                  <th className="py-3 px-4 text-center">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {articlesSummary.map((item) => {
                  const p = item.product;
                  return (
                    <tr key={p.id} className="hover:bg-[#181818] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-200">{p.name}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          SKU: {p.sku} {p.barcode ? `• Barcode: ${p.barcode}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-300">
                        {item.categoryName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-neutral-400">
                        {item.initialQty} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {item.totalIn > 0 ? `+${item.totalIn} ${p.unit}` : '0 un'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                        {item.totalOut > 0 ? `-${item.totalOut} ${p.unit}` : '0 un'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-100">
                        {item.currentQty} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-400">
                        {formatCurrency(item.avgCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#c5a47e]">
                        {formatCurrency(item.totalValuation)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(p.id);
                              setViewMode('timeline');
                            }}
                            className="px-2 py-1 bg-[#1f1f1f] hover:bg-[#282828] text-xs text-[#c5a47e] rounded border border-[#333] transition-colors cursor-pointer"
                            title="Ver extrato de movimentos deste artigo"
                          >
                            Ver Extrato
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickActionProduct(p);
                              setEntryForm({
                                productId: p.id,
                                warehouseId: warehouses[0]?.id || '',
                                quantity: 10,
                                unitCost: p.costPrice || 0,
                                referenceDoc: `REC-${Date.now().toString().slice(-4)}`,
                                supplier: p.supplierId || '',
                                lotNumber: '',
                                reason: 'Entrada de mercadoria / Compra',
                              });
                              setShowNewEntryModal(true);
                            }}
                            className="px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800/40 text-xs rounded transition-colors cursor-pointer"
                            title="Adicionar entrada de stock para este artigo"
                          >
                            + Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickActionProduct(p);
                              setAdjustForm({
                                productId: p.id,
                                warehouseId: warehouses[0]?.id || '',
                                newQty: item.currentQty,
                                reason: 'Acerto manual de inventário',
                              });
                              setShowQuickAdjustModal(true);
                            }}
                            className="px-2 py-1 bg-amber-950/40 hover:bg-amber-900/50 text-amber-400 border border-amber-800/40 text-xs rounded transition-colors cursor-pointer"
                            title="Ajustar / acertar inventário físico"
                          >
                            Ajustar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOVA ENTRADA DE STOCK */}
      {showNewEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-serif font-bold text-white">
                  Registar Entrada / Compra de Stock
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewEntryModal(false)}
                className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEntry} className="p-5 space-y-4">
              {/* Product */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Artigo a Entrar *
                </label>
                <select
                  value={entryForm.productId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    const p = productMap.get(pId);
                    setEntryForm({
                      ...entryForm,
                      productId: pId,
                      unitCost: p?.costPrice || entryForm.unitCost,
                    });
                  }}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) &bull; Atual: {stock.filter((s) => s.productId === p.id).reduce((sum, it) => sum + it.quantity, 0)} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Warehouse & Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Armazém Destino *
                  </label>
                  <select
                    value={entryForm.warehouseId}
                    onChange={(e) => setEntryForm({ ...entryForm, warehouseId: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Quantidade a Entrar *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={entryForm.quantity}
                    onChange={(e) => setEntryForm({ ...entryForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                    required
                  />
                </div>
              </div>

              {/* Cost Price & Reference Doc */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Custo Unitário de Compra (MT)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryForm.unitCost}
                    onChange={(e) => setEntryForm({ ...entryForm, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Doc. Referência / Fatura Compra
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: FT 2026/0142"
                    value={entryForm.referenceDoc}
                    onChange={(e) => setEntryForm({ ...entryForm, referenceDoc: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
              </div>

              {/* Lot & Reason */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Nº do Lote (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: LOT-2026-08"
                    value={entryForm.lotNumber}
                    onChange={(e) => setEntryForm({ ...entryForm, lotNumber: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Motivo / Observações
                  </label>
                  <input
                    type="text"
                    value={entryForm.reason}
                    onChange={(e) => setEntryForm({ ...entryForm, reason: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
              </div>

              {/* Total Calculation Preview */}
              <div className="p-3 bg-[#0d0d0d] rounded-lg border border-[#262626] flex items-center justify-between text-xs">
                <span className="text-neutral-400">Valor Total da Entrada:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCurrency((entryForm.quantity || 0) * (entryForm.unitCost || 0))}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowNewEntryModal(false)}
                  className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-300 text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Entrada</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTE RÁPIDO DE INVENTÁRIO */}
      {showQuickAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-serif font-bold text-white">
                  Ajuste Rápido de Inventário
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAdjustModal(false)}
                className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickAdjust} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Artigo
                </label>
                <select
                  value={adjustForm.productId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    const curQty = stock.find((s) => s.productId === pId && s.warehouseId === adjustForm.warehouseId)?.quantity || 0;
                    setAdjustForm({
                      ...adjustForm,
                      productId: pId,
                      newQty: curQty,
                    });
                  }}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Armazém
                </label>
                <select
                  value={adjustForm.warehouseId}
                  onChange={(e) => {
                    const whId = e.target.value;
                    const curQty = stock.find((s) => s.productId === adjustForm.productId && s.warehouseId === whId)?.quantity || 0;
                    setAdjustForm({
                      ...adjustForm,
                      warehouseId: whId,
                      newQty: curQty,
                    });
                  }}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#0d0d0d] rounded-lg border border-[#262626]">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                    Stock Atual
                  </span>
                  <span className="font-mono font-bold text-neutral-200 text-base">
                    {stock.find((s) => s.productId === adjustForm.productId && s.warehouseId === adjustForm.warehouseId)?.quantity || 0} un
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Nova Quantidade Física *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={adjustForm.newQty}
                    onChange={(e) => setAdjustForm({ ...adjustForm, newQty: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-[#c5a47e]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Motivo do Ajuste *
                </label>
                <input
                  type="text"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="Ex: Contagem física de rotina, quebra ou acerto de lote"
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowQuickAdjustModal(false)}
                  className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-300 text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-colors shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Gravar Ajuste</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
