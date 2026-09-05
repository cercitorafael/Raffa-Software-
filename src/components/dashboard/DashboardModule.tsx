import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/crypto';
import {
  isEffectiveSale,
  calculateNetSalesRevenue,
  calculateNetSubtotal,
  calculateNetTax,
} from '../../utils/documentUtils';
import {
  getTodayDateStr,
  getYesterdayDateStr,
  getCurrentWeekBounds,
  getPrevWeekBounds,
  getCurrentMonthStr,
  getPrevMonthStr,
  getMonthBounds,
  getCurrentYearBounds,
  getPrevYearBounds,
  getMonthNamePT,
} from '../../utils/dateUtils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Receipt,
  Users,
  AlertTriangle,
  ShoppingBag,
  CreditCard,
  Building2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Boxes,
  ShieldCheck,
  Clock,
  Sparkles,
  Layers,
  Percent,
  FileSpreadsheet,
  Store as StoreIcon,
  ShieldAlert,
  Wallet,
  Calendar,
  BarChart3,
  Scale,
  FileText,
  RefreshCw,
  X,
  Info,
} from 'lucide-react';

export const DashboardModule: React.FC = () => {
  const {
    currentUser,
    hasPermission,
    salesHistory,
    products,
    stock,
    customers,
    accountsPayable,
    accountsReceivable,
    currentCompany,
    stores,
    currentTerminal,
    activeShift,
    syncActiveShiftWithTodaySales,
    setActiveNavTab,
    setShowPriceCheckerModal,
    setShowFiscalAuditModal,
    setShowOfflineSyncModal,
  } = useApp();

  const [timeRange, setTimeRange] = useState<'hoje' | 'semana' | 'mes' | 'ano'>('hoje');
  const [dashboardScope, setDashboardScope] = useState<'all' | 'active_shift'>('all');
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);

  // RBAC Permission check for Dashboard/Overview
  if (!hasPermission('analytics', 'read') && currentUser?.role !== 'admin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a0a] text-center space-y-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-base font-serif font-bold text-white">
            Acesso Restrito à Visão Geral & Métricas
          </h3>
          <p className="text-xs text-neutral-400">
            O seu perfil atual (<strong>{currentUser?.name}</strong> &bull; {currentUser?.role?.toUpperCase()}) não tem permissão para aceder à visão geral e indicadores executivos.
          </p>
        </div>
        <div className="pt-2 flex items-center space-x-3">
          <button
            onClick={() => setActiveNavTab('pos')}
            className="px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-xl cursor-pointer shadow-md transition-colors"
          >
            Ir para o Ponto de Venda (POS)
          </button>
        </div>
      </div>
    );
  }

  // Active Date Range boundaries & metadata
  const rangeInfo = useMemo(() => {
    const todayStr = getTodayDateStr();
    if (timeRange === 'hoje') {
      const yesterdayStr = getYesterdayDateStr();
      const [y, m, d] = todayStr.split('-');
      return {
        startDate: todayStr,
        endDate: todayStr,
        prevStartDate: yesterdayStr,
        prevEndDate: yesterdayStr,
        label: `Hoje (${d}/${m}/${y})`,
        shortLabel: 'Hoje',
        comparisonLabel: 'vs. ontem',
      };
    } else if (timeRange === 'semana') {
      const curr = getCurrentWeekBounds();
      const prev = getPrevWeekBounds();
      const [sY, sM, sD] = curr.start.split('-');
      const [eY, eM, eD] = curr.end.split('-');
      return {
        startDate: curr.start,
        endDate: curr.end,
        prevStartDate: prev.start,
        prevEndDate: prev.end,
        label: `Esta Semana (${sD}/${sM} a ${eD}/${eM})`,
        shortLabel: 'Esta Semana',
        comparisonLabel: 'vs. semana anterior',
      };
    } else if (timeRange === 'mes') {
      const currMonth = getCurrentMonthStr();
      const curr = getMonthBounds(currMonth);
      const prevMonth = getPrevMonthStr();
      const prev = getMonthBounds(prevMonth);
      return {
        startDate: curr.start,
        endDate: curr.end,
        prevStartDate: prev.start,
        prevEndDate: prev.end,
        label: `Este Mês (${getMonthNamePT(currMonth)})`,
        shortLabel: 'Este Mês',
        comparisonLabel: 'vs. mês anterior',
      };
    } else {
      const curr = getCurrentYearBounds();
      const prev = getPrevYearBounds();
      const y = new Date().getFullYear();
      return {
        startDate: curr.start,
        endDate: curr.end,
        prevStartDate: prev.start,
        prevEndDate: prev.end,
        label: `Ano Fiscal ${y}`,
        shortLabel: `Ano ${y}`,
        comparisonLabel: 'vs. ano anterior',
      };
    }
  }, [timeRange]);

  const isDateInRange = (dateStr: string | undefined, start: string, end: string) => {
    if (!dateStr) return false;
    const d = dateStr.substring(0, 10);
    return d >= start && d <= end;
  };

  // Today's total sales and active cash shift reconciliation
  const todayDateStr = getTodayDateStr();
  const allTodaySales = useMemo(() => {
    return salesHistory.filter((s) => isDateInRange(s.date, todayDateStr, todayDateStr));
  }, [salesHistory, todayDateStr]);

  const allTodayCommercialSales = useMemo(() => {
    return allTodaySales.filter((s) => isEffectiveSale(s));
  }, [allTodaySales]);

  const todayGlobalRevenue = useMemo(() => {
    return calculateNetSalesRevenue(allTodaySales);
  }, [allTodaySales]);

  // Discriminate today's sales: in current active shift vs outside
  const { shiftSalesToday, outsideShiftSalesToday } = useMemo(() => {
    if (!activeShift) {
      return { shiftSalesToday: [], outsideShiftSalesToday: allTodaySales };
    }
    const inShift: typeof salesHistory = [];
    const outShift: typeof salesHistory = [];
    allTodaySales.forEach((s) => {
      const matchesShiftId = s.shiftId && s.shiftId === activeShift.id;
      const matchesTimeWindow = activeShift.openedAt && s.date && s.date >= activeShift.openedAt;
      if (matchesShiftId || matchesTimeWindow) {
        inShift.push(s);
      } else {
        outShift.push(s);
      }
    });
    return { shiftSalesToday: inShift, outsideShiftSalesToday: outShift };
  }, [allTodaySales, activeShift]);

  const shiftSalesRevenue = useMemo(() => {
    if (!activeShift) return 0;
    if (activeShift.totalSales > 0) return activeShift.totalSales;
    return calculateNetSalesRevenue(shiftSalesToday);
  }, [activeShift, shiftSalesToday]);

  const outsideShiftSalesRevenue = Math.max(0, todayGlobalRevenue - shiftSalesRevenue);
  const hasReconciliationDiff = timeRange === 'hoje' && activeShift && outsideShiftSalesRevenue > 0;

  // Filtered sales for active time range & dashboard scope
  const periodSalesHistory = useMemo(() => {
    const raw = salesHistory.filter((s) => isDateInRange(s.date, rangeInfo.startDate, rangeInfo.endDate));
    if (timeRange === 'hoje' && dashboardScope === 'active_shift' && activeShift) {
      return shiftSalesToday;
    }
    return raw;
  }, [salesHistory, rangeInfo, timeRange, dashboardScope, activeShift, shiftSalesToday]);

  // Previous period sales for comparison percentage
  const prevPeriodSalesHistory = useMemo(() => {
    return salesHistory.filter((s) => isDateInRange(s.date, rangeInfo.prevStartDate, rangeInfo.prevEndDate));
  }, [salesHistory, rangeInfo]);

  // Filtered Commercial Sales (FT, FS, FR, VD, ND minus NC)
  const commercialSales = useMemo(() => {
    return periodSalesHistory.filter((s) => isEffectiveSale(s));
  }, [periodSalesHistory]);

  const totalSalesRevenue = useMemo(() => calculateNetSalesRevenue(periodSalesHistory), [periodSalesHistory]);
  const prevSalesRevenue = useMemo(() => calculateNetSalesRevenue(prevPeriodSalesHistory), [prevPeriodSalesHistory]);

  const revenueGrowthPercent = useMemo(() => {
    if (prevSalesRevenue > 0) {
      return ((totalSalesRevenue - prevSalesRevenue) / prevSalesRevenue) * 100;
    }
    return totalSalesRevenue > 0 ? 100 : 0;
  }, [totalSalesRevenue, prevSalesRevenue]);

  const totalSubtotal = useMemo(() => calculateNetSubtotal(periodSalesHistory), [periodSalesHistory]);
  const totalTaxCollected = useMemo(() => calculateNetTax(periodSalesHistory), [periodSalesHistory]);
  const totalInvoicesCount = commercialSales.length;
  const avgTicket = totalInvoicesCount > 0 ? totalSalesRevenue / totalInvoicesCount : 0;

  // Active Proformas summary for this period
  const quoteDocs = useMemo(() => {
    return periodSalesHistory.filter(
      (s) => ['PF', 'ORC'].includes((s.invoiceType || '').toUpperCase()) && s.status !== 'anulado' && s.status !== 'convertido'
    );
  }, [periodSalesHistory]);
  const totalQuotesValue = quoteDocs.reduce((acc, q) => acc + (q.total || 0), 0);

  // Stock Metrics
  const lowStockCount = stock.filter((st) => {
    const prod = products.find((p) => p.id === st.productId);
    return prod ? st.quantity <= prod.minStock : false;
  }).length;

  const totalStockValuation = stock.reduce((acc, st) => {
    const prod = products.find((p) => p.id === st.productId);
    return acc + st.quantity * (prod ? prod.costPrice : 0);
  }, 0);

  // Financial Metrics
  const totalReceivables = accountsReceivable
    .filter((a) => a.status === 'pendente')
    .reduce((acc, a) => acc + a.amount, 0);
  const totalPayables = accountsPayable
    .filter((a) => a.status === 'pendente')
    .reduce((acc, a) => acc + a.amount, 0);

  // Payment Breakdown - from commercial sales of selected period
  const paymentBreakdown = useMemo(() => {
    return commercialSales.reduce(
      (acc, s) => {
        s.payments?.forEach((p) => {
          if (p.method === 'multibanco') acc.multibanco += p.amount;
          else if (p.method === 'mbway') acc.mbway += p.amount;
          else if (p.method === 'cartao') acc.cartao += p.amount;
          else if (p.method === 'dinheiro') acc.dinheiro += p.amount;
          else acc.outros += p.amount;
        });
        return acc;
      },
      { multibanco: 0, mbway: 0, cartao: 0, dinheiro: 0, outros: 0 }
    );
  }, [commercialSales]);

  const totalPaymentSum =
    paymentBreakdown.multibanco +
    paymentBreakdown.mbway +
    paymentBreakdown.cartao +
    paymentBreakdown.dinheiro +
    paymentBreakdown.outros || 1;

  // VAT Breakdown (Normal 23%, Intermedia 13%, Reduzida 6%) - from commercial sales of selected period
  const vatBreakdown = useMemo(() => {
    return commercialSales.reduce(
      (acc, s) => {
        s.items?.forEach((item) => {
          if (item.taxRate >= 23) acc.tax23 += item.taxAmount;
          else if (item.taxRate >= 13) acc.tax13 += item.taxAmount;
          else if (item.taxRate >= 6) acc.tax6 += item.taxAmount;
          else acc.tax0 += item.taxAmount;
        });
        return acc;
      },
      { tax23: 0, tax13: 0, tax6: 0, tax0: 0 }
    );
  }, [commercialSales]);

  // Top Selling Products - from commercial sales of selected period
  const topProducts = useMemo(() => {
    const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    commercialSales.forEach((s) => {
      s.items?.forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            name: item.productName,
            qty: 0,
            revenue: 0,
          };
        }
        productSalesMap[item.productId].qty += item.quantity;
        productSalesMap[item.productId].revenue += item.total;
      });
    });

    return Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [commercialSales]);

  // Timeline / Evolution Chart Data dynamically generated for the active period
  const chartData = useMemo(() => {
    if (timeRange === 'hoje') {
      const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      return hours.map((h) => {
        const startH = parseInt(h.split(':')[0], 10);
        const endH = startH + 2;
        const bucketSales = commercialSales.filter((s) => {
          if (!s.date) return false;
          const timePart = s.date.includes('T') ? s.date.split('T')[1] : '';
          const saleHour = parseInt(timePart.substring(0, 2) || '0', 10);
          return saleHour >= startH && saleHour < endH;
        });
        const revenue = bucketSales.reduce((acc, s) => acc + (s.total || 0), 0);
        return {
          name: h,
          vendas: revenue,
          faturas: bucketSales.length,
        };
      });
    } else if (timeRange === 'semana') {
      const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const weekBounds = getCurrentWeekBounds();
      const monday = new Date(weekBounds.start);
      return days.map((dayName, idx) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + idx);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        const targetDate = `${y}-${m}-${dayStr}`;

        const daySales = commercialSales.filter((s) => s.date && s.date.substring(0, 10) === targetDate);
        const revenue = daySales.reduce((acc, s) => acc + (s.total || 0), 0);
        return {
          name: `${dayName} (${dayStr}/${m})`,
          vendas: revenue,
          faturas: daySales.length,
        };
      });
    } else if (timeRange === 'mes') {
      const currMonth = getCurrentMonthStr();
      const [yStr, mStr] = currMonth.split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      const totalDays = new Date(year, month, 0).getDate();

      const buckets = [
        { name: '1-6', start: 1, end: 6 },
        { name: '7-12', start: 7, end: 12 },
        { name: '13-18', start: 13, end: 18 },
        { name: '19-24', start: 19, end: 24 },
        { name: `25-${totalDays}`, start: 25, end: totalDays },
      ];

      return buckets.map((b) => {
        const bucketSales = commercialSales.filter((s) => {
          if (!s.date || !s.date.startsWith(currMonth)) return false;
          const day = parseInt(s.date.substring(8, 10), 10);
          return day >= b.start && day <= b.end;
        });
        const revenue = bucketSales.reduce((acc, s) => acc + (s.total || 0), 0);
        return {
          name: `Dias ${b.name}`,
          vendas: revenue,
          faturas: bucketSales.length,
        };
      });
    } else {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const currentYearStr = String(new Date().getFullYear());
      return months.map((mName, mIdx) => {
        const monthNumStr = String(mIdx + 1).padStart(2, '0');
        const targetPrefix = `${currentYearStr}-${monthNumStr}`;
        const mSales = commercialSales.filter((s) => s.date && s.date.startsWith(targetPrefix));
        const revenue = mSales.reduce((acc, s) => acc + (s.total || 0), 0);
        return {
          name: mName,
          vendas: revenue,
          faturas: mSales.length,
        };
      });
    }
  }, [timeRange, commercialSales]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-[#e5e5e5] overflow-y-auto">
      {/* Header Bar */}
      <div className="bg-[#0f0f0f] border-b border-[#262626] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
            <h1 className="text-lg font-bold text-white tracking-wide">
              Cockpit Executivo & Inteligência de Negócio
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/40">
              Live Real-Time
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center space-x-1 border ${
                activeShift
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
              title={activeShift ? `Caixa Aberto por ${activeShift.operatorName} (${currentTerminal?.code || 'POS-01'})` : 'Caixa Fechado'}
            >
              <Wallet className="w-3 h-3 shrink-0" />
              <span>{activeShift ? `Caixa Aberto (${activeShift.operatorName.split(' ')[0]})` : 'Caixa Fechado'}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1a1a1a] text-neutral-300 border border-[#2e2e2e] flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-[#c5a47e]" />
              <span>{rangeInfo.label}</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Visão consolidada de faturação fiscal, tesouraria, inventário e performance das lojas
          </p>
        </div>

        {/* Time Filter & Quick Shortcuts */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <div className="flex items-center bg-[#141414] border border-[#262626] rounded-lg p-0.5 text-xs font-medium shadow-inner">
            {(['hoje', 'semana', 'mes', 'ano'] as const).map((r) => {
              const labels: Record<string, string> = {
                hoje: 'Hoje',
                semana: 'Semana',
                mes: 'Mês',
                ano: 'Ano',
              };
              return (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                    timeRange === r
                      ? 'bg-[#c5a47e] text-neutral-950 font-bold shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-[#202020]'
                  }`}
                  title={`Filtrar dados por ${labels[r]}`}
                >
                  {labels[r]}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setActiveNavTab('analytics')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#c5a47e]/15 hover:bg-[#c5a47e]/25 text-[#c5a47e] hover:text-white border border-[#c5a47e]/30 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            title="Abrir módulo completo de relatórios analíticos com gráficos Recharts"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Relatórios Analíticos</span>
          </button>

          <button
            onClick={() => setShowFiscalAuditModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#141414] hover:bg-[#1a1a1a] text-neutral-300 hover:text-white border border-[#262626] rounded-lg text-xs font-medium transition-all cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Auditoria SAF-T</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Cash Shift vs Daily Sales Reconciliation Banner */}
        {timeRange === 'hoje' && activeShift && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center shrink-0 text-[#c5a47e] mt-0.5 sm:mt-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h3 className="text-sm font-bold text-white">
                      Reconciliação: Vendas de Hoje vs. Caixa em Aberto
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Operador: {activeShift.operatorName}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    O menu <strong>Visão Geral</strong> reflete a faturação fiscal global de todo o dia civil (<strong className="text-white font-mono">{formatCurrency(todayGlobalRevenue)}</strong> em {allTodayCommercialSales.length} faturas). A <strong>Caixa em Aberto</strong> reflete as vendas processadas estritamente neste turno (<strong className="text-emerald-400 font-mono">{formatCurrency(shiftSalesRevenue)}</strong>).
                    {outsideShiftSalesRevenue > 0 && (
                      <span className="text-amber-400 font-medium"> A diferença de {formatCurrency(outsideShiftSalesRevenue)} corresponde a faturas emitidas fora deste turno ou em turnos anteriores fechados.</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Scope Switcher & Audit Button */}
              <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 shrink-0 self-end lg:self-center">
                <div className="flex bg-[#0e0e0e] border border-[#2b2b2b] rounded-lg p-0.5 text-xs font-medium shadow-inner">
                  <button
                    onClick={() => setDashboardScope('all')}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      dashboardScope === 'all'
                        ? 'bg-[#c5a47e] text-neutral-950 font-bold shadow-xs'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Exibir todos os documentos emitidos hoje no sistema"
                  >
                    Dia Completo ({formatCurrency(todayGlobalRevenue)})
                  </button>
                  <button
                    onClick={() => setDashboardScope('active_shift')}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      dashboardScope === 'active_shift'
                        ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Exibir apenas as vendas da caixa aberta em funcionamento"
                  >
                    Caixa Aberto ({formatCurrency(shiftSalesRevenue)})
                  </button>
                </div>

                <button
                  onClick={() => setShowReconciliationModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#202020] hover:bg-[#2a2a2a] text-neutral-200 hover:text-white border border-[#383838] rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs whitespace-nowrap"
                  title="Abrir auditoria detalhada de faturas de hoje"
                >
                  <FileText className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Auditar Faturas</span>
                </button>

                {outsideShiftSalesRevenue > 0 && (
                  <button
                    onClick={() => syncActiveShiftWithTodaySales()}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#c5a47e]/15 hover:bg-[#c5a47e]/25 text-[#c5a47e] border border-[#c5a47e]/30 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs whitespace-nowrap"
                    title="Vincular e sincronizar todas as faturas de hoje com a caixa em aberto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sincronizar Caixa Aberto</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Gross Sales for Selected Period */}
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-4.5 flex flex-col justify-between hover:border-[#383838] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">
                {timeRange === 'hoje' && activeShift && dashboardScope === 'active_shift'
                  ? `Faturação (Turno ${activeShift.operatorName.split(' ')[0]})`
                  : `Faturação (${rangeInfo.shortLabel})`}
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-white tracking-tight">
                {formatCurrency(totalSalesRevenue)}
              </div>
              <div className="flex items-center space-x-1.5 text-xs mt-1">
                {revenueGrowthPercent >= 0 ? (
                  <span className="text-emerald-400 flex items-center space-x-1 font-semibold">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+{revenueGrowthPercent.toFixed(1)}%</span>
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center space-x-1 font-semibold">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>{revenueGrowthPercent.toFixed(1)}%</span>
                  </span>
                )}
                <span className="text-neutral-500">{rangeInfo.comparisonLabel}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Average Ticket & Invoices Count */}
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-4.5 flex flex-col justify-between hover:border-[#383838] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Ticket Médio ({rangeInfo.shortLabel})</span>
              <div className="p-2 rounded-lg bg-[#c5a47e]/10 text-[#c5a47e] border border-[#c5a47e]/20">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-white tracking-tight">
                {formatCurrency(avgTicket)}
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-400 mt-1">
                <span className="font-semibold text-neutral-300">{totalInvoicesCount} faturas emitidas</span>
                <span className="text-neutral-500 font-mono">100% Cert. AT</span>
              </div>
            </div>
          </div>

          {/* Card 3: Stock Valuation & Low Alerts */}
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-4.5 flex flex-col justify-between hover:border-[#383838] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Inventário & Alertas</span>
              <div className={`p-2 rounded-lg border ${
                lowStockCount > 0
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-white tracking-tight">
                {formatCurrency(totalStockValuation)}
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-neutral-400">{products.length} referências ativas</span>
                {lowStockCount > 0 ? (
                  <span className="text-amber-400 font-semibold flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{lowStockCount} ruturas</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">Stock saudável</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Working Capital Balance */}
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-4.5 flex flex-col justify-between hover:border-[#383838] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Saldo de Tesouraria</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-white tracking-tight">
                {formatCurrency(totalReceivables - totalPayables)}
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-400 mt-1">
                <span className="text-emerald-400">Rec: {formatCurrency(totalReceivables)}</span>
                <span className="text-rose-400">Pag: {formatCurrency(totalPayables)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Sales Trend Chart for Selected Time Range */}
        <div className="bg-[#121212] border border-[#262626] rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-[#c5a47e]" />
                <span>Evolução de Vendas & Faturação ({rangeInfo.label})</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Valores consolidados em tempo real para o intervalo selecionado
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5 text-neutral-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c5a47e]"></span>
                <span>Faturação Total: <strong>{formatCurrency(totalSalesRevenue)}</strong></span>
              </span>
              <span className="flex items-center space-x-1.5 text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span>{totalInvoicesCount} Documentos</span>
              </span>
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            {commercialSales.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#262626] rounded-lg bg-[#0e0e0e]">
                <ShoppingBag className="w-8 h-8 text-neutral-600 mb-2" />
                <p className="text-xs font-medium text-neutral-300">
                  Nenhuma fatura emitida no período selecionado ({rangeInfo.label})
                </p>
                <p className="text-[11px] text-neutral-500 max-w-sm mt-1">
                  Abra o Ponto de Venda (POS) para registar a primeira venda deste período ou consulte os outros intervalos.
                </p>
                <button
                  onClick={() => setActiveNavTab('pos')}
                  className="mt-3 px-3 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-xs"
                >
                  Abrir Caixa POS & Faturar
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c5a47e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#c5a47e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#525252"
                    tick={{ fill: '#737373', fontSize: 11 }}
                    axisLine={{ stroke: '#262626' }}
                  />
                  <YAxis
                    stroke="#525252"
                    tick={{ fill: '#737373', fontSize: 11 }}
                    axisLine={{ stroke: '#262626' }}
                    tickFormatter={(val) => `${val} ${currentCompany?.currencySymbol || 'Mt'}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#141414',
                      borderColor: '#2e2e2e',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Faturação']}
                    labelStyle={{ color: '#c5a47e', fontWeight: 'bold' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    stroke="#c5a47e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Launchpad Shortcuts */}
        <div className="bg-[#121212] border border-[#262626] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>Ações Rápidas de Operação</span>
            </h3>
            <span className="text-[11px] text-neutral-400">Atalhos rápidos para alta produtividade</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <button
              onClick={() => setActiveNavTab('pos')}
              className="p-3 rounded-lg bg-[#171717] hover:bg-[#202020] border border-[#262626] hover:border-[#c5a47e]/50 flex flex-col items-center text-center group transition-all cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 text-[#c5a47e] mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white">Abrir POS</span>
              <span className="text-[10px] text-neutral-400">Caixa Registadora</span>
            </button>

            <button
              onClick={() => setShowPriceCheckerModal(true)}
              className="p-3 rounded-lg bg-[#171717] hover:bg-[#202020] border border-[#262626] hover:border-[#c5a47e]/50 flex flex-col items-center text-center group transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white">Consultar Preço</span>
              <span className="text-[10px] text-neutral-400">Scanner & Stocks</span>
            </button>

            <button
              onClick={() => setActiveNavTab('documents')}
              className="p-3 rounded-lg bg-[#171717] hover:bg-[#202020] border border-[#262626] hover:border-[#c5a47e]/50 flex flex-col items-center text-center group transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5 text-indigo-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white">Documentos</span>
              <span className="text-[10px] text-neutral-400">Emissão FT / FS / NC</span>
            </button>

            <button
              onClick={() => setActiveNavTab('stores')}
              className="p-3 rounded-lg bg-[#171717] hover:bg-[#202020] border border-[#262626] hover:border-[#c5a47e]/50 flex flex-col items-center text-center group transition-all cursor-pointer"
            >
              <StoreIcon className="w-5 h-5 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white">Gestão Lojas</span>
              <span className="text-[10px] text-neutral-400">Filiais & Terminais</span>
            </button>

            <button
              onClick={() => setActiveNavTab('documents')}
              className="p-3 rounded-lg bg-[#171717] hover:bg-[#202020] border border-[#262626] hover:border-[#c5a47e]/50 flex flex-col items-center text-center group transition-all cursor-pointer"
            >
              <Clock className="w-5 h-5 text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white">Arquivo Fiscal</span>
              <span className="text-[10px] text-neutral-400">Histórico de Vendas</span>
            </button>

            <button
              onClick={() => setShowFiscalAuditModal(true)}
              className="p-3 rounded-lg bg-[#171717] hover:bg-[#202020] border border-[#262626] hover:border-[#c5a47e]/50 flex flex-col items-center text-center group transition-all cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white">SAF-T (PT)</span>
              <span className="text-[10px] text-neutral-400">Exportar & Validar</span>
            </button>
          </div>
        </div>

        {/* Main Analytics Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Col 1 & 2: Payment Distribution & VAT breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Methods Distribution */}
            <div className="bg-[#121212] border border-[#262626] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-[#c5a47e]" />
                    <span>Meios de Pagamento Recebidos ({rangeInfo.shortLabel})</span>
                  </h3>
                  <p className="text-xs text-neutral-400">Distribuição por Multibanco, MB Way, Numerário e Cartões</p>
                </div>
                <span className="text-xs font-mono font-bold text-[#c5a47e]">
                  {formatCurrency(totalSalesRevenue)}
                </span>
              </div>

              {/* Visual Distribution Bar */}
              <div className="w-full h-3 bg-[#1a1a1a] rounded-full overflow-hidden flex mb-4 border border-[#262626]">
                <div
                  style={{ width: `${(paymentBreakdown.multibanco / totalPaymentSum) * 100}%` }}
                  className="bg-blue-500 h-full transition-all"
                  title={`Multibanco: ${formatCurrency(paymentBreakdown.multibanco)}`}
                />
                <div
                  style={{ width: `${(paymentBreakdown.mbway / totalPaymentSum) * 100}%` }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`MB Way: ${formatCurrency(paymentBreakdown.mbway)}`}
                />
                <div
                  style={{ width: `${(paymentBreakdown.dinheiro / totalPaymentSum) * 100}%` }}
                  className="bg-amber-500 h-full transition-all"
                  title={`Numerário: ${formatCurrency(paymentBreakdown.dinheiro)}`}
                />
                <div
                  style={{ width: `${(paymentBreakdown.cartao / totalPaymentSum) * 100}%` }}
                  className="bg-purple-500 h-full transition-all"
                  title={`Cartão Crédito: ${formatCurrency(paymentBreakdown.cartao)}`}
                />
              </div>

              {/* Breakdown Legend items */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-lg bg-[#171717] border border-[#262626]">
                  <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Multibanco</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-white mt-1">
                    {formatCurrency(paymentBreakdown.multibanco)}
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {((paymentBreakdown.multibanco / totalPaymentSum) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#171717] border border-[#262626]">
                  <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>MB Way</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-white mt-1">
                    {formatCurrency(paymentBreakdown.mbway)}
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {((paymentBreakdown.mbway / totalPaymentSum) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#171717] border border-[#262626]">
                  <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Numerário</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-white mt-1">
                    {formatCurrency(paymentBreakdown.dinheiro)}
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {((paymentBreakdown.dinheiro / totalPaymentSum) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#171717] border border-[#262626]">
                  <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span>Cartão de Crédito</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-white mt-1">
                    {formatCurrency(paymentBreakdown.cartao)}
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {((paymentBreakdown.cartao / totalPaymentSum) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Portuguese VAT (IVA) Breakdown Table */}
            <div className="bg-[#121212] border border-[#262626] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Percent className="w-4 h-4 text-emerald-400" />
                    <span>Apuramento de IVA (Artigo 41.º CIVA) - {rangeInfo.shortLabel}</span>
                  </h3>
                  <p className="text-xs text-neutral-400">Incidência fiscal e imposto liquidado por escalão</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-neutral-400 block">Total IVA Liquidado</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {formatCurrency(totalTaxCollected)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#262626] text-neutral-400">
                      <th className="pb-2 font-medium">Taxa de IVA</th>
                      <th className="pb-2 font-medium">Designação</th>
                      <th className="pb-2 font-medium text-right">IVA Liquidado</th>
                      <th className="pb-2 font-medium text-right">Estado Legal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    <tr>
                      <td className="py-2.5 font-mono font-bold text-white">23%</td>
                      <td className="py-2.5 text-neutral-300">Taxa Normal (Continente)</td>
                      <td className="py-2.5 font-mono font-semibold text-right text-emerald-400">
                        {formatCurrency(vatBreakdown.tax23)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Conforme
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono font-bold text-white">13%</td>
                      <td className="py-2.5 text-neutral-300">Taxa Intermédia (Vinhos/Alimentar)</td>
                      <td className="py-2.5 font-mono font-semibold text-right text-emerald-400">
                        {formatCurrency(vatBreakdown.tax13)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Conforme
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono font-bold text-white">6%</td>
                      <td className="py-2.5 text-neutral-300">Taxa Reduzida (Bens Essenciais)</td>
                      <td className="py-2.5 font-mono font-semibold text-right text-emerald-400">
                        {formatCurrency(vatBreakdown.tax6)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Conforme
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Col 3: Top Products & Multi-Store Performance */}
          <div className="space-y-6">
            {/* Top Products */}
            <div className="bg-[#121212] border border-[#262626] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-[#c5a47e]" />
                  <span>Artigos Mais Vendidos ({rangeInfo.shortLabel})</span>
                </h3>
                <span className="text-[10px] text-neutral-400">Volume & Receita</span>
              </div>

              <div className="space-y-3">
                {topProducts.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-4">Nenhuma venda registada neste período.</p>
                ) : (
                  topProducts.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#171717] border border-[#262626]">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#262626] text-neutral-300 font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-medium text-white truncate">{p.name}</p>
                          <p className="text-[10px] text-neutral-400">{p.qty} unidades vendidas</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#c5a47e] shrink-0">
                        {formatCurrency(p.revenue)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Stores Performance */}
            <div className="bg-[#121212] border border-[#262626] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setActiveNavTab('stores')}
                  className="text-sm font-bold text-white flex items-center space-x-2 hover:text-[#c5a47e] transition-colors cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Desempenho por Loja ({rangeInfo.shortLabel})</span>
                </button>
                <button
                  onClick={() => setActiveNavTab('stores')}
                  className="text-[10px] text-[#c5a47e] hover:underline cursor-pointer"
                >
                  Gerir {stores.length} Lojas &rarr;
                </button>
              </div>

              <div className="space-y-3">
                {stores.map((store) => {
                  const storeSales = periodSalesHistory.filter((s) => s.storeId === store.id && isEffectiveSale(s));
                  const storeTotal = storeSales.reduce((acc, s) => acc + s.total, 0);

                  return (
                    <div key={store.id} className="p-3 rounded-lg bg-[#171717] border border-[#262626]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white">{store.name}</span>
                        <span className="text-xs font-mono font-semibold text-[#c5a47e]">
                          {formatCurrency(storeTotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-400">
                        <span>{store.city} &bull; {store.terminalsCount} Terminais POS</span>
                        <span>{storeSales.length} Faturas</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Sales vs Cash Drawer Reconciliation Modal */}
      {showReconciliationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-[#262626] flex items-center justify-between bg-[#171717]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Auditoria & Reconciliação: Vendas de Hoje vs Caixa Aberto
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Discriminação contábil entre a faturação fiscal do dia e a gaveta do turno atual
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReconciliationModal(false)}
                className="w-8 h-8 rounded-lg bg-[#222] hover:bg-[#2e2e2e] text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Informational Explanation Box */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs space-y-2">
                <div className="flex items-center space-x-2 text-blue-400 font-bold">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Por que razão os dois valores podem ser diferentes?</span>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  O menu <strong>Visão Geral</strong> apresenta o total de toda a faturação fiscal certificada emitida ao longo de todo o dia civil de hoje. Já a <strong>Caixa em Aberto</strong> calcula o dinheiro e vendas faturadas estritamente durante a sessão física do <strong>turno atual</strong> (aberto por <strong>{activeShift?.operatorName || 'Operador'}</strong>{activeShift?.openedAt ? ` às ${activeShift.openedAt.substring(11, 16)}` : ''}).
                </p>
                <p className="text-neutral-400">
                  Caso tenham sido emitidas faturas em turnos anteriores já fechados (ex: turno da manhã) ou através do balcão de emissão manual de documentos, esse valor soma na faturação diária mas não entra na gaveta física do operador deste turno.
                </p>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#1a1a1a] border border-[#2d2d2d] rounded-xl">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 block mb-1">
                    Faturação Fiscal de Hoje
                  </span>
                  <p className="text-xl font-mono font-bold text-white">{formatCurrency(todayGlobalRevenue)}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{allTodayCommercialSales.length} faturas emitidas</p>
                </div>

                <div className="p-3.5 bg-[#1a1a1a] border border-emerald-500/30 rounded-xl">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 block mb-1">
                    Neste Turno (Caixa Aberto)
                  </span>
                  <p className="text-xl font-mono font-bold text-emerald-400">{formatCurrency(shiftSalesRevenue)}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{shiftSalesToday.length} faturas neste turno</p>
                </div>

                <div className="p-3.5 bg-[#1a1a1a] border border-amber-500/30 rounded-xl">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 block mb-1">
                    Turnos Anteriores / Fora do Turno
                  </span>
                  <p className="text-xl font-mono font-bold text-amber-400">{formatCurrency(outsideShiftSalesRevenue)}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{outsideShiftSalesToday.length} faturas fora do turno</p>
                </div>
              </div>

              {/* Invoices List for Today */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Extrato Discriminado de Faturas de Hoje ({allTodaySales.length})
                  </h4>
                  <span className="text-[11px] text-neutral-400">Ordenadas por emissão</span>
                </div>

                {allTodaySales.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500 border border-dashed border-[#262626] rounded-xl">
                    Nenhuma fatura emitida hoje no sistema.
                  </div>
                ) : (
                  <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#101010]">
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#181818] border-b border-[#262626] text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                            <th className="p-2.5">Documento</th>
                            <th className="p-2.5">Hora</th>
                            <th className="p-2.5">Operador</th>
                            <th className="p-2.5">Cliente</th>
                            <th className="p-2.5">Pagamento</th>
                            <th className="p-2.5 text-right">Total</th>
                            <th className="p-2.5 text-center">Vínculo de Caixa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222]">
                          {allTodaySales.map((sale) => {
                            const isShiftSale =
                              activeShift &&
                              (sale.shiftId === activeShift.id ||
                                (activeShift.openedAt && sale.date && sale.date >= activeShift.openedAt));
                            const timeStr = sale.date?.includes('T')
                              ? sale.date.split('T')[1].substring(0, 5)
                              : sale.date?.substring(11, 16) || '--:--';
                            const primaryPay = sale.payments?.[0]?.method || 'dinheiro';

                            return (
                              <tr key={sale.id} className="hover:bg-[#151515] transition-colors">
                                <td className="p-2.5 font-mono font-bold text-white">
                                  {sale.invoiceNumber || sale.id}
                                </td>
                                <td className="p-2.5 font-mono text-neutral-400">
                                  {timeStr}
                                </td>
                                <td className="p-2.5 text-neutral-300 truncate max-w-[100px]">
                                  {sale.operatorName || 'Operador'}
                                </td>
                                <td className="p-2.5 text-neutral-300 truncate max-w-[120px]">
                                  {sale.customerName || 'Consumidor Final'}
                                </td>
                                <td className="p-2.5 uppercase text-[10px] font-mono text-neutral-400">
                                  {primaryPay}
                                </td>
                                <td className="p-2.5 font-mono font-bold text-right text-[#c5a47e]">
                                  {formatCurrency(sale.total)}
                                </td>
                                <td className="p-2.5 text-center">
                                  {isShiftSale ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      Caixa Aberto
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                      Turno Fechado / Externo
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#262626] bg-[#171717] flex items-center justify-between">
              <div className="text-xs text-neutral-400">
                Total Faturado Hoje: <strong className="text-white font-mono">{formatCurrency(todayGlobalRevenue)}</strong>
              </div>
              <div className="flex items-center space-x-2">
                {activeShift && outsideShiftSalesRevenue > 0 && (
                  <button
                    onClick={() => {
                      syncActiveShiftWithTodaySales();
                      setShowReconciliationModal(false);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sincronizar Vendas com Caixa</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowReconciliationModal(false);
                    setActiveNavTab('pos');
                  }}
                  className="px-4 py-2 bg-[#202020] hover:bg-[#282828] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Ir para o POS
                </button>
                <button
                  onClick={() => setShowReconciliationModal(false)}
                  className="px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-lg text-xs cursor-pointer transition-colors shadow-xs"
                >
                  Fechar Reconciliação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
