import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  RotateCcw,
  Calendar,
  Warehouse as WarehouseIcon,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Plus,
  Minus,
  Download,
  Printer,
  Save,
  RefreshCw,
  Eye,
  Check,
  X,
  Package,
  Layers,
  Info,
  TrendingDown,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, Warehouse, StockItem, PhysicalCount } from '../../types';
import { obterExtratoInventarioArmazemClient } from '../../lib/supabase';

export const PhysicalInventoryCountTab: React.FC = () => {
  const {
    products,
    warehouses,
    stock,
    stockMovements,
    categories,
    currentCompany,
    currentUser,
    currencyDefinition,
    createStockAdjustment,
    notify,
  } = useApp();

  const currencySymbol = currentCompany?.currencySymbol || currencyDefinition?.symbol || 'Mt';

  // State: Warehouse & Cutoff Date
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    warehouses[0]?.id || 'wh-1'
  );
  const [cutoffDate, setCutoffDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 19);
  });
  const [sessionTitle, setSessionTitle] = useState<string>(() => {
    const d = new Date();
    return `Contagem Física - ${d.toLocaleDateString('pt-PT')}`;
  });

  // State: Theoretical Stock Data by Product at Cutoff Date
  const [loadingTheoreticalStock, setLoadingTheoreticalStock] = useState<boolean>(false);
  const [theoreticalStockMap, setTheoreticalStockMap] = useState<Record<string, {
    saldoAtual: number;
    movsAposData: number;
    stockNaData: number;
  }>>({});

  // State: Physical Count Entries (productId -> countedQty)
  const [countedQuantities, setCountedQuantities] = useState<Record<string, number | null>>({});
  const [notesByProduct, setNotesByProduct] = useState<Record<string, string>>({});

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'divergences' | 'surplus' | 'shortage' | 'pending'>('all');

  // Modals
  const [showKardexModal, setShowKardexModal] = useState<boolean>(false);
  const [kardexProduct, setKardexProduct] = useState<Product | null>(null);
  const [kardexData, setKardexData] = useState<any[]>([]);
  const [kardexLoading, setKardexLoading] = useState<boolean>(false);

  const [showConfirmFinalizeModal, setShowConfirmFinalizeModal] = useState<boolean>(false);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Acerto por Contagem Física de Inventário');
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [inventoryFinalized, setInventoryFinalized] = useState<boolean>(false);

  // Selected Warehouse Object
  const currentWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === selectedWarehouseId) || warehouses[0];
  }, [warehouses, selectedWarehouseId]);

  // Format Helpers
  const formatCurrency = (amount: number) => {
    return `${(amount || 0).toLocaleString('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currencySymbol}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to determine if a movement is outgoing
  const isOutMovement = (m: any) => {
    const type = (m.type || m.tipo_movimento || '').toLowerCase();
    return (
      type.includes('saida') ||
      type.includes('venda') ||
      type.includes('transferencia_saida') ||
      type.includes('quebra') ||
      type.includes('perda') ||
      type.includes('consumo')
    );
  };

  // 1. Fetch or Calculate Theoretical Stock at Cutoff Date
  const loadTheoreticalStock = async () => {
    if (!selectedWarehouseId || !cutoffDate) return;
    setLoadingTheoreticalStock(true);

    try {
      // Tentar obter via API backend / Supabase
      const res = await obterExtratoInventarioArmazemClient({
        armazem_id: selectedWarehouseId,
        data_limite: new Date(cutoffDate).toISOString(),
      });

      const resultMap: Record<string, { saldoAtual: number; movsAposData: number; stockNaData: number }> = {};

      if (res && res.itens_por_produto && Object.keys(res.itens_por_produto).length > 0) {
        Object.entries(res.itens_por_produto).forEach(([pId, val]) => {
          resultMap[pId] = {
            saldoAtual: val.saldo_atual,
            movsAposData: val.movimentacoes_apos_data,
            stockNaData: val.stock_na_data,
          };
        });
      }

      // Preencher produtos que existam no catálogo local caso não tenham retornado
      const limitTime = new Date(cutoffDate).getTime();
      products.forEach((p) => {
        if (!resultMap[p.id]) {
          const currentQty = stock
            .filter((s) => s.productId === p.id && s.warehouseId === selectedWarehouseId)
            .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);

          const movsApos = stockMovements.filter((m) => {
            const wh = m.targetWarehouseId || m.originWarehouseId || m.sourceWarehouseId;
            if (wh !== selectedWarehouseId || m.productId !== p.id) return false;
            const t = new Date(m.timestamp || m.date || 0).getTime();
            return t > limitTime;
          });

          const totalApos = movsApos.reduce((sum, m) => {
            const isOut = isOutMovement(m);
            return sum + (isOut ? -Math.abs(m.quantity || 0) : Math.abs(m.quantity || 0));
          }, 0);

          resultMap[p.id] = {
            saldoAtual: currentQty,
            movsAposData: totalApos,
            stockNaData: currentQty - totalApos,
          };
        }
      });

      setTheoreticalStockMap(resultMap);
      notify('Stock teórico na data limite calculado com sucesso!', 'success');
    } catch (err) {
      // Fallback determinístico 100% local com dados em memória
      const limitTime = new Date(cutoffDate).getTime();
      const localMap: Record<string, { saldoAtual: number; movsAposData: number; stockNaData: number }> = {};

      products.forEach((p) => {
        const currentQty = stock
          .filter((s) => s.productId === p.id && s.warehouseId === selectedWarehouseId)
          .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);

        const movsApos = stockMovements.filter((m) => {
          const wh = m.targetWarehouseId || m.originWarehouseId || m.sourceWarehouseId;
          if (wh !== selectedWarehouseId || m.productId !== p.id) return false;
          const t = new Date(m.timestamp || m.date || 0).getTime();
          return t > limitTime;
        });

        const totalApos = movsApos.reduce((sum, m) => {
          const isOut = isOutMovement(m);
          return sum + (isOut ? -Math.abs(m.quantity || 0) : Math.abs(m.quantity || 0));
        }, 0);

        localMap[p.id] = {
          saldoAtual: currentQty,
          movsAposData: totalApos,
          stockNaData: currentQty - totalApos,
        };
      });

      setTheoreticalStockMap(localMap);
      notify('Stock na data limite apurado via motor local!', 'info');
    } finally {
      setLoadingTheoreticalStock(false);
    }
  };

  // Carregar dados teóricos ao iniciar ou mudar armazém/data
  useEffect(() => {
    loadTheoreticalStock();
  }, [selectedWarehouseId, cutoffDate]);

  // Lista de itens processados para a contagem
  const countItems = useMemo(() => {
    return products.map((prod) => {
      const theo = theoreticalStockMap[prod.id] || {
        saldoAtual: stock
          .filter((s) => s.productId === prod.id && s.warehouseId === selectedWarehouseId)
          .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0),
        movsAposData: 0,
        stockNaData: stock
          .filter((s) => s.productId === prod.id && s.warehouseId === selectedWarehouseId)
          .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0),
      };

      const counted = countedQuantities[prod.id];
      const isCounted = counted !== undefined && counted !== null;
      const difference = isCounted ? (counted as number) - theo.stockNaData : 0;
      const diffValue = difference * (prod.costPrice || 0);

      return {
        product: prod,
        saldoAtual: theo.saldoAtual,
        movsAposData: theo.movsAposData,
        stockNaData: theo.stockNaData,
        counted: counted,
        isCounted,
        difference,
        diffValue,
        notes: notesByProduct[prod.id] || '',
      };
    });
  }, [products, theoreticalStockMap, countedQuantities, notesByProduct, stock, selectedWarehouseId]);

  // Filtros aplicados
  const filteredItems = useMemo(() => {
    return countItems.filter((item) => {
      const p = item.product;
      // Busca texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = (p.sku || '').toLowerCase().includes(q);
        const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBarcode) return false;
      }
      // Categoria
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      // Modo de divergência
      if (filterMode === 'divergences') {
        return item.isCounted && item.difference !== 0;
      }
      if (filterMode === 'surplus') {
        return item.isCounted && item.difference > 0;
      }
      if (filterMode === 'shortage') {
        return item.isCounted && item.difference < 0;
      }
      if (filterMode === 'pending') {
        return !item.isCounted;
      }
      return true;
    });
  }, [countItems, searchQuery, selectedCategory, filterMode]);

  // Métricas do Painel
  const metrics = useMemo(() => {
    let totalItems = countItems.length;
    let countedItems = 0;
    let itemsWithDivergence = 0;
    let totalSurplusUnits = 0;
    let totalShortageUnits = 0;
    let totalFinancialDiff = 0;

    countItems.forEach((item) => {
      if (item.isCounted) {
        countedItems++;
        if (item.difference > 0) {
          itemsWithDivergence++;
          totalSurplusUnits += item.difference;
        } else if (item.difference < 0) {
          itemsWithDivergence++;
          totalShortageUnits += Math.abs(item.difference);
        }
        totalFinancialDiff += item.diffValue;
      }
    });

    const progressPct = totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0;

    return {
      totalItems,
      countedItems,
      itemsWithDivergence,
      totalSurplusUnits,
      totalShortageUnits,
      totalFinancialDiff,
      progressPct,
    };
  }, [countItems]);

  // Ações em Massa
  const handlePreFillWithTheoretical = () => {
    const updated: Record<string, number | null> = { ...countedQuantities };
    filteredItems.forEach((item) => {
      updated[item.product.id] = item.stockNaData;
    });
    setCountedQuantities(updated);
    notify(`Quantidades de ${filteredItems.length} artigos preenchidas com o stock teórico na data!`, 'info');
  };

  const handleClearCounts = () => {
    setCountedQuantities({});
    notify('Todas as contagens foram limpas.', 'info');
  };

  // Alterar contagem de um item individual
  const handleSetCount = (productId: string, val: number | null) => {
    setCountedQuantities((prev) => ({
      ...prev,
      [productId]: val === null ? null : Math.max(0, val),
    }));
  };

  // Abrir auditoria Kardex do artigo
  const handleOpenKardex = async (prod: Product) => {
    setKardexProduct(prod);
    setShowKardexModal(true);
    setKardexLoading(true);

    try {
      const res = await obterExtratoInventarioArmazemClient({
        armazem_id: selectedWarehouseId,
        produto_id: prod.id,
        data_limite: new Date(cutoffDate).toISOString(),
      });

      if (res && res.extrato_movimentos && res.extrato_movimentos.length > 0) {
        setKardexData(res.extrato_movimentos);
      } else {
        // Fallback local
        const limitTime = new Date(cutoffDate).getTime();
        const movs = stockMovements
          .filter((m) => {
            const wh = m.targetWarehouseId || m.originWarehouseId || m.sourceWarehouseId;
            return wh === selectedWarehouseId && m.productId === prod.id;
          })
          .filter((m) => new Date(m.timestamp || m.date || 0).getTime() <= limitTime)
          .sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime())
          .map((m) => ({
            id: m.id,
            tipo_movimento: m.type,
            quantidade: m.quantity,
            data_movimento: m.timestamp || m.date,
            usuario_id: m.operatorId,
            referencia_id: m.referenceDoc,
          }));
        setKardexData(movs);
      }
    } catch {
      const limitTime = new Date(cutoffDate).getTime();
      const movs = stockMovements
        .filter((m) => {
          const wh = m.targetWarehouseId || m.originWarehouseId || m.sourceWarehouseId;
          return wh === selectedWarehouseId && m.productId === prod.id;
        })
        .filter((m) => new Date(m.timestamp || m.date || 0).getTime() <= limitTime)
        .map((m) => ({
          id: m.id,
          tipo_movimento: m.type,
          quantidade: m.quantity,
          data_movimento: m.timestamp || m.date,
          usuario_id: m.operatorId,
          referencia_id: m.referenceDoc,
        }));
      setKardexData(movs);
    } finally {
      setKardexLoading(false);
    }
  };

  // Finalizar Inventário Físico e Aplicar Acertos
  const handleFinalizeInventory = async () => {
    setIsFinalizing(true);

    try {
      const itemsToAdjust = countItems.filter((item) => item.isCounted && item.difference !== 0);

      itemsToAdjust.forEach((item) => {
        // O novo stock aplicado é o stock contado
        createStockAdjustment(
          item.product.id,
          selectedWarehouseId,
          item.counted as number,
          `${adjustmentReason} (Data de Corte: ${formatDate(cutoffDate)})`
        );
      });

      setInventoryFinalized(true);
      setShowConfirmFinalizeModal(false);
      notify(
        `Contagem finalizada! ${itemsToAdjust.length} artigos ajustados no armazém ${currentWarehouse?.name}.`,
        'success'
      );
      // Recarregar os dados do armazém
      setTimeout(() => {
        loadTheoreticalStock();
      }, 500);
    } catch (err) {
      console.error('Erro ao finalizar inventário:', err);
      notify('Ocorreu um erro ao aplicar os acertos de inventário.', 'error');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Exportar Folha de Contagem CSV
  const handleExportCsv = () => {
    const headers = [
      'Artigo',
      'SKU',
      'Categoria',
      'Stock Atual',
      'Stock na Data Limite',
      'Qtd. Contada',
      'Desvio (Qtd)',
      'Preço Custo',
      'Valor do Desvio',
    ];

    const rows = filteredItems.map((i) => [
      `"${i.product.name.replace(/"/g, '""')}"`,
      `"${i.product.sku || ''}"`,
      `"${categories.find((c) => c.id === i.product.category)?.name || ''}"`,
      i.saldoAtual,
      i.stockNaData,
      i.isCounted ? i.counted : '',
      i.isCounted ? i.difference : '',
      i.product.costPrice || 0,
      i.isCounted ? i.diffValue.toFixed(2) : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Folha_Contagem_Fisica_${currentWarehouse?.name.replace(/\s+/g, '_')}_${cutoffDate.slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Folha de contagem física exportada com sucesso!', 'success');
  };

  // Imprimir Folha de Contagem
  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Configuration Session Bar */}
      <div className="bg-[#141414] border border-[#262626] p-4 rounded-xl shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#c5a47e]/15 text-[#c5a47e] rounded-xl border border-[#c5a47e]/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">
                  Contagem Física de Inventário
                </h2>
                <span className="px-2 py-0.5 bg-[#c5a47e]/20 text-[#c5a47e] text-[10px] font-mono font-bold rounded-full uppercase">
                  Motor Retroativo Ativo
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Auditoria de stock real vs. stock teórico calculado na data de corte:
                <span className="text-[#c5a47e] font-mono font-semibold ml-1">
                  Stock na Data = Saldo Atual - Movimentações Pós-Data
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-200 text-xs font-semibold rounded-lg border border-[#333] transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintSheet}
              className="px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-200 text-xs font-semibold rounded-lg border border-[#333] transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-400" />
              <span>Imprimir Folha</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfirmFinalizeModal(true)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Finalizar e Aplicar Acertos</span>
            </button>
          </div>
        </div>

        {/* Form Controls: Armazém & Data Limite */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-[#262626]">
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
              Armazém / Localização da Contagem *
            </label>
            <div className="relative">
              <WarehouseIcon className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#c5a47e]"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
              Data de Corte / Data Limite (Retroativo) *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
              <input
                type="datetime-local"
                value={cutoffDate}
                onChange={(e) => setCutoffDate(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#c5a47e]"
              />
            </div>
          </div>

          <div className="md:col-span-4 flex items-end space-x-2">
            <button
              type="button"
              disabled={loadingTheoreticalStock}
              onClick={loadTheoreticalStock}
              className="flex-1 px-4 py-2 bg-[#1f1a14] hover:bg-[#2b241c] text-[#c5a47e] border border-[#c5a47e]/40 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTheoreticalStock ? 'animate-spin' : ''}`} />
              <span>{loadingTheoreticalStock ? 'Calculando...' : 'Recalcular Stock na Data'}</span>
            </button>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-400">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase">Atalhos de data:</span>
          <button
            type="button"
            onClick={() => setCutoffDate(new Date().toISOString().slice(0, 19))}
            className="px-2 py-0.5 bg-[#1c1c1c] hover:bg-[#282828] rounded border border-[#333] text-[11px] cursor-pointer"
          >
            Agora (Tempo Real)
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              setCutoffDate(`${d.toISOString().slice(0, 10)}T23:59:59`);
            }}
            className="px-2 py-0.5 bg-[#1c1c1c] hover:bg-[#282828] rounded border border-[#333] text-[11px] cursor-pointer"
          >
            Fim de Ontem (23:59)
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(0); // Último dia do mês anterior
              setCutoffDate(`${d.toISOString().slice(0, 10)}T23:59:59`);
            }}
            className="px-2 py-0.5 bg-[#1c1c1c] hover:bg-[#282828] rounded border border-[#333] text-[11px] cursor-pointer"
          >
            Fim do Mês Anterior
          </button>
          <button
            type="button"
            onClick={() => setCutoffDate('2026-09-01T23:59:59')}
            className="px-2 py-0.5 bg-[#1c1c1c] hover:bg-[#282828] rounded border border-[#333] text-[11px] text-[#c5a47e] cursor-pointer"
          >
            01/09/2026 (Exemplo de Auditoria)
          </button>
        </div>
      </div>

      {inventoryFinalized && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Inventário Físico finalizado com sucesso! As diferenças foram aplicadas e sincronizadas no armazém.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setInventoryFinalized(false)}
            className="text-emerald-400/80 hover:text-emerald-400 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Metrics & Status Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#141414] p-3 rounded-xl border border-[#262626]">
          <span className="text-[10px] text-neutral-400 uppercase font-bold block">
            Total Artigos
          </span>
          <span className="font-mono font-bold text-white text-lg">
            {metrics.totalItems}
          </span>
        </div>

        <div className="bg-[#141414] p-3 rounded-xl border border-[#262626]">
          <span className="text-[10px] text-neutral-400 uppercase font-bold block">
            Progresso ({metrics.progressPct}%)
          </span>
          <div className="flex items-baseline space-x-1">
            <span className="font-mono font-bold text-neutral-200 text-lg">
              {metrics.countedItems}
            </span>
            <span className="text-xs text-neutral-500">/ {metrics.totalItems}</span>
          </div>
        </div>

        <div className="bg-[#141414] p-3 rounded-xl border border-[#262626]">
          <span className="text-[10px] text-amber-400 uppercase font-bold block">
            Com Divergência
          </span>
          <span className="font-mono font-bold text-amber-400 text-lg">
            {metrics.itemsWithDivergence}
          </span>
        </div>

        <div className="bg-[#141414] p-3 rounded-xl border border-[#262626]">
          <span className="text-[10px] text-emerald-400 uppercase font-bold block">
            Sobras (+)
          </span>
          <span className="font-mono font-bold text-emerald-400 text-lg">
            +{metrics.totalSurplusUnits} un
          </span>
        </div>

        <div className="bg-[#141414] p-3 rounded-xl border border-[#262626]">
          <span className="text-[10px] text-rose-400 uppercase font-bold block">
            Quebras (-)
          </span>
          <span className="font-mono font-bold text-rose-400 text-lg">
            -{metrics.totalShortageUnits} un
          </span>
        </div>

        <div className="bg-[#1a1714] p-3 rounded-xl border border-[#c5a47e]/40 shadow-xs">
          <span className="text-[10px] text-[#c5a47e] uppercase font-bold block">
            Impacto Financeiro
          </span>
          <span
            className={`font-mono font-bold text-base ${
              metrics.totalFinancialDiff < 0
                ? 'text-rose-400'
                : metrics.totalFinancialDiff > 0
                ? 'text-emerald-400'
                : 'text-[#c5a47e]'
            }`}
          >
            {formatCurrency(metrics.totalFinancialDiff)}
          </span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-[#141414] border border-[#262626] p-3 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar por artigo, SKU ou código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#0d0d0d] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-hidden focus:border-[#c5a47e]"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto justify-end">
          {/* Quick Filters */}
          <div className="bg-[#0d0d0d] border border-[#333] p-0.5 rounded-lg flex items-center text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#222] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos ({countItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('divergences')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filterMode === 'divergences'
                  ? 'bg-amber-500/20 text-amber-400 font-bold'
                  : 'text-neutral-400 hover:text-amber-400'
              }`}
            >
              Divergências ({metrics.itemsWithDivergence})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('pending')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                filterMode === 'pending'
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Pendentes ({metrics.totalItems - metrics.countedItems})
            </button>
          </div>

          {/* Bulk Helpers */}
          <button
            type="button"
            onClick={handlePreFillWithTheoretical}
            className="px-2.5 py-1.5 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-300 rounded-lg text-xs font-semibold border border-[#333] transition-colors flex items-center space-x-1 cursor-pointer"
            title="Preenche a coluna contada com o stock teórico na data"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c5a47e]" />
            <span>Preencher c/ Teórico</span>
          </button>

          <button
            type="button"
            onClick={handleClearCounts}
            className="px-2.5 py-1.5 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-400 hover:text-rose-400 rounded-lg text-xs font-semibold border border-[#333] transition-colors cursor-pointer"
            title="Limpar todas as contagens introduzidas"
          >
            <span>Zerar</span>
          </button>
        </div>
      </div>

      {/* 4. Table: Physical Count Grid */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-[#1a1a1a] text-neutral-400 font-bold uppercase tracking-wider text-[10px] border-b border-[#262626] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">Artigo / Referência</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Stock Atual</th>
                <th className="px-4 py-3 text-right">Movs Pós-Data</th>
                <th className="px-4 py-3 text-right bg-[#1f1a14] text-[#c5a47e]">
                  Stock na Data Limite
                </th>
                <th className="px-4 py-3 text-center w-48">Qtd. Contada</th>
                <th className="px-4 py-3 text-right">Desvio</th>
                <th className="px-4 py-3 text-right">Valor Desvio</th>
                <th className="px-4 py-3 text-center">Auditoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const prod = item.product;
                  const hasDiff = item.isCounted && item.difference !== 0;

                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-[#181818] transition-colors ${
                        hasDiff
                          ? item.difference > 0
                            ? 'bg-emerald-500/5'
                            : 'bg-rose-500/5'
                          : ''
                      }`}
                    >
                      {/* Product Name & SKU */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{prod.name}</div>
                        <div className="font-mono text-[11px] text-neutral-500 flex items-center space-x-2">
                          <span>SKU: {prod.sku}</span>
                          {prod.barcode && <span>• EAN: {prod.barcode}</span>}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-neutral-400">
                        {categories.find((c) => c.id === prod.category)?.name || 'Geral'}
                      </td>

                      {/* Current Stock */}
                      <td className="px-4 py-3 text-right font-mono text-neutral-400">
                        {item.saldoAtual} {prod.unit || 'un'}
                      </td>

                      {/* Movements After Cutoff */}
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {item.movsAposData !== 0 ? (
                          <span
                            className={
                              item.movsAposData > 0 ? 'text-amber-400' : 'text-neutral-400'
                            }
                          >
                            {item.movsAposData > 0 ? `+${item.movsAposData}` : item.movsAposData}
                          </span>
                        ) : (
                          <span className="text-neutral-600">0</span>
                        )}
                      </td>

                      {/* Theoretical Stock at Cutoff Date */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#c5a47e] bg-[#1a1714]/60">
                        {item.stockNaData} {prod.unit || 'un'}
                      </td>

                      {/* Counted Quantity Input */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              const curr = item.counted !== null && item.counted !== undefined ? item.counted : item.stockNaData;
                              handleSetCount(prod.id, Math.max(0, curr - 1));
                            }}
                            className="w-6 h-6 rounded bg-[#222] hover:bg-[#333] text-neutral-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                          >
                            -
                          </button>

                          <input
                            type="number"
                            placeholder="—"
                            value={item.counted !== null && item.counted !== undefined ? item.counted : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              handleSetCount(prod.id, val);
                            }}
                            className="w-20 bg-[#0d0d0d] border border-[#333] rounded px-2 py-1 text-center font-mono font-bold text-xs text-white focus:outline-hidden focus:border-[#c5a47e]"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const curr = item.counted !== null && item.counted !== undefined ? item.counted : item.stockNaData;
                              handleSetCount(prod.id, curr + 1);
                            }}
                            className="w-6 h-6 rounded bg-[#222] hover:bg-[#333] text-neutral-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Deviation */}
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {item.isCounted ? (
                          <span
                            className={`px-2 py-0.5 rounded text-xs inline-block ${
                              item.difference > 0
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : item.difference < 0
                                ? 'bg-rose-500/15 text-rose-400'
                                : 'text-neutral-500'
                            }`}
                          >
                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                          </span>
                        ) : (
                          <span className="text-neutral-600 text-xs italic">Não contado</span>
                        )}
                      </td>

                      {/* Financial Impact */}
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold">
                        {item.isCounted && item.difference !== 0 ? (
                          <span
                            className={
                              item.difference > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {formatCurrency(item.diffValue)}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Audit / Kardex button */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenKardex(prod)}
                          className="p-1.5 bg-[#222] hover:bg-[#333] text-neutral-300 hover:text-[#c5a47e] rounded-lg transition-colors cursor-pointer"
                          title="Ver Extrato / Kardex de movimentos até à data de corte"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-neutral-500">
                    Nenhum artigo encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: Confirm Finalization & Apply Adjustments */}
      {showConfirmFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#333] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-lg">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Finalizar Contagem e Ajustar Stock
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Armazém: <strong className="text-white">{currentWarehouse?.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmFinalizeModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-[#0d0d0d] p-4 rounded-xl border border-[#262626] text-xs">
              <div className="flex justify-between py-1 border-b border-[#1f1f1f]">
                <span className="text-neutral-400">Artigos contados:</span>
                <strong className="text-white font-mono">{metrics.countedItems} / {metrics.totalItems}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1f1f1f]">
                <span className="text-neutral-400">Artigos com desvio a corrigir:</span>
                <strong className="text-amber-400 font-mono">{metrics.itemsWithDivergence}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1f1f1f]">
                <span className="text-neutral-400">Total de Sobras:</span>
                <strong className="text-emerald-400 font-mono">+{metrics.totalSurplusUnits} un</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1f1f1f]">
                <span className="text-neutral-400">Total de Quebras:</span>
                <strong className="text-rose-400 font-mono">-{metrics.totalShortageUnits} un</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400 font-bold">Impacto Financeiro Líquido:</span>
                <strong className={`font-mono font-bold ${metrics.totalFinancialDiff < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatCurrency(metrics.totalFinancialDiff)}
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Motivo / Justificação do Acerto de Inventário *
              </label>
              <input
                type="text"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#c5a47e]"
                placeholder="Ex: Contagem física anual, fecho de mês ou acerto de balanço"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => setShowConfirmFinalizeModal(false)}
                className="px-4 py-2 bg-[#222] hover:bg-[#333] text-neutral-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isFinalizing}
                onClick={handleFinalizeInventory}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isFinalizing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{isFinalizing ? 'Gravando Acertos...' : 'Confirmar e Atualizar Stock'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: Detailed Kardex / Extrato for Product up to Cutoff Date */}
      {showKardexModal && kardexProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#333] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#c5a47e]/15 text-[#c5a47e] rounded-lg">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Kardex do Artigo: {kardexProduct.name}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Armazém: {currentWarehouse?.name} • Até à Data Limite: {formatDate(cutoffDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowKardexModal(false);
                  setKardexProduct(null);
                }}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {kardexLoading ? (
              <div className="py-12 text-center text-neutral-400 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#c5a47e]" />
                <span className="text-xs">A carregar histórico de movimentações...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-[#0d0d0d] border border-[#262626] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1a1a1a] text-neutral-400 border-b border-[#262626]">
                      <tr>
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2 text-right">Qtd</th>
                        <th className="px-3 py-2">Utilizador</th>
                        <th className="px-3 py-2">Referência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f1f]">
                      {kardexData.length > 0 ? (
                        kardexData.map((m: any, idx: number) => (
                          <tr key={m.id || idx} className="hover:bg-[#181818]">
                            <td className="px-3 py-2 text-neutral-300 font-mono">
                              {m.data_movimento ? formatDate(m.data_movimento) : '—'}
                            </td>
                            <td className="px-3 py-2">
                              <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#222] text-neutral-300">
                                {m.tipo_movimento || 'Movimento'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-white">
                              {m.quantidade}
                            </td>
                            <td className="px-3 py-2 text-neutral-400">
                              {m.usuario_id || 'Sistema'}
                            </td>
                            <td className="px-3 py-2 text-neutral-400 font-mono">
                              {m.referencia_id || '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-neutral-500">
                            Nenhuma movimentação registada para este artigo no armazém até à data limite.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
