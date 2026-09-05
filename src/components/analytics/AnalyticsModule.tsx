import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { isEffectiveSale } from '../../utils/documentUtils';
import {
  getTodayDateStr,
  getCurrentMonthStr,
  getPrevMonthStr,
  getMonthBounds,
  getDaysAgoStr,
  getMonthNamePT,
} from '../../utils/dateUtils';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Filter,
  Download,
  Printer,
  ShoppingBag,
  CreditCard,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Search,
  Store as StoreIcon,
  Tag,
  Clock,
  Award,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  PieChart as PieIcon,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';

// Chart Color Palette tailored for dark theme with crisp contrast
const COLORS = [
  '#c5a47e', // Primary Brand Gold/Sand
  '#3b82f6', // Electric Blue
  '#10b981', // Emerald Green
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

type DatePreset =
  | 'today'
  | 'last7days'
  | 'this_month'
  | 'last_month'
  | 'last90days'
  | 'year_2026'
  | 'all'
  | 'custom';

export const AnalyticsModule: React.FC = () => {
  const {
    currentUser,
    hasPermission,
    setActiveNavTab,
    salesHistory,
    products,
    categories,
    stores,
    currentCompany,
    formatCurrency,
    notify,
  } = useApp();

  // RBAC Permission check for Analytics/BI
  if (!hasPermission('analytics', 'read') && currentUser?.role !== 'admin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a0a] text-center space-y-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-base font-serif font-bold text-white">
            Acesso Restrito aos Relatórios Analíticos & BI
          </h3>
          <p className="text-xs text-neutral-400">
            O seu perfil atual (<strong>{currentUser?.name}</strong> &bull; {currentUser?.role?.toUpperCase()}) não tem permissão para aceder aos relatórios analíticos, gráficos e métricas de desempenho.
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

  // Local date computations
  const initialTodayStr = getTodayDateStr();
  const initialCurrentMonth = getCurrentMonthStr();
  const initialMonthBounds = getMonthBounds(initialCurrentMonth);

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [selectedMonth, setSelectedMonth] = useState<string>(initialCurrentMonth);
  const [customStartDate, setCustomStartDate] = useState<string>(initialMonthBounds.start);
  const [customEndDate, setCustomEndDate] = useState<string>(initialMonthBounds.end);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');

  // View States
  const [chartMetric, setChartMetric] = useState<'both' | 'revenue' | 'volume'>('both');
  const [topProductsMetric, setTopProductsMetric] = useState<'revenue' | 'quantity'>('revenue');
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'products' | 'payments' | 'hours'>('overview');
  const [productSearch, setProductSearch] = useState<string>('');

  // Extract distinct available months from sales history
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const currM = getCurrentMonthStr();
    const prevM = getPrevMonthStr();
    monthsSet.add(currM);
    monthsSet.add(prevM);

    salesHistory.forEach((sale) => {
      if (sale.date) {
        const monthKey = sale.date.substring(0, 7); // "YYYY-MM"
        if (monthKey && monthKey.length === 7) {
          monthsSet.add(monthKey);
        }
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [salesHistory]);

  // Handle Preset Change
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = getTodayDateStr();
    const currMonth = getCurrentMonthStr();

    if (preset === 'today') {
      setSelectedMonth(currMonth);
      setCustomStartDate(today);
      setCustomEndDate(today);
    } else if (preset === 'last7days') {
      setSelectedMonth(currMonth);
      setCustomStartDate(getDaysAgoStr(6));
      setCustomEndDate(today);
    } else if (preset === 'this_month') {
      const bounds = getMonthBounds(currMonth);
      setSelectedMonth(currMonth);
      setCustomStartDate(bounds.start);
      setCustomEndDate(bounds.end);
    } else if (preset === 'last_month') {
      const prevMonth = getPrevMonthStr();
      const bounds = getMonthBounds(prevMonth);
      setSelectedMonth(prevMonth);
      setCustomStartDate(bounds.start);
      setCustomEndDate(bounds.end);
    } else if (preset === 'last90days') {
      setSelectedMonth(currMonth);
      setCustomStartDate(getDaysAgoStr(90));
      setCustomEndDate(today);
    } else if (preset === 'year_2026') {
      const currentYear = new Date().getFullYear();
      setSelectedMonth(currMonth);
      setCustomStartDate(`${currentYear}-01-01`);
      setCustomEndDate(`${currentYear}-12-31`);
    } else if (preset === 'all') {
      setSelectedMonth('all');
      setCustomStartDate('2020-01-01');
      setCustomEndDate('2030-12-31');
    }
  };

  // Handle specific month dropdown selection
  const handleMonthSelect = (monthKey: string) => {
    setSelectedMonth(monthKey);
    if (monthKey === 'all') {
      setDatePreset('all');
      setCustomStartDate('2020-01-01');
      setCustomEndDate('2030-12-31');
    } else {
      setDatePreset('custom');
      const bounds = getMonthBounds(monthKey);
      setCustomStartDate(bounds.start);
      setCustomEndDate(bounds.end);
    }
  };

  // Filter Sales according to date range, store, and payment method
  // EXCLUDES quotations (ORC), proformas (PF), transport guides (GT/GR) from sales revenue
  const filteredSales = useMemo(() => {
    return salesHistory.filter((sale) => {
      // Must be an effective commercial sale / invoice
      if (!isEffectiveSale(sale)) return false;

      const saleDate = sale.date ? sale.date.substring(0, 10) : '';

      // Date filtering
      if (customStartDate && saleDate < customStartDate) return false;
      if (customEndDate && saleDate > customEndDate) return false;

      // Store filtering
      if (selectedStoreId !== 'all' && sale.storeId !== selectedStoreId) return false;

      // Payment method filtering
      if (selectedPaymentMethod !== 'all') {
        const hasMethod = sale.payments?.some((p) => p.method === selectedPaymentMethod);
        if (!hasMethod) return false;
      }

      return true;
    });
  }, [salesHistory, customStartDate, customEndDate, selectedStoreId, selectedPaymentMethod]);

  // Aggregate KPI summary metrics
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalTax = 0;
    let totalSubtotal = 0;
    let totalUnitsSold = 0;
    let totalTransactions = filteredSales.length;

    filteredSales.forEach((sale) => {
      totalRevenue += sale.total || 0;
      totalTax += sale.taxTotal || 0;
      totalSubtotal += sale.subtotal || 0;
      sale.items?.forEach((item) => {
        totalUnitsSold += item.quantity || 0;
      });
    });

    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const itemsPerSale = totalTransactions > 0 ? totalUnitsSold / totalTransactions : 0;

    return {
      totalRevenue,
      totalTax,
      totalSubtotal,
      totalUnitsSold,
      totalTransactions,
      averageTicket,
      itemsPerSale,
    };
  }, [filteredSales]);

  // 1. Daily Sales Volume Dataset for Recharts
  const dailySalesData = useMemo(() => {
    const dayMap = new Map<
      string,
      {
        date: string;
        displayDate: string;
        revenue: number;
        transactions: number;
        units: number;
        subtotal: number;
        tax: number;
      }
    >();

    // Determine bounds for dates
    const safeStartStr = customStartDate || initialTodayStr;
    const safeEndStr = customEndDate || initialTodayStr;
    const [sy, sm, sd] = safeStartStr.split('-').map(Number);
    const [ey, em, ed] = safeEndStr.split('-').map(Number);
    const startDateObj = new Date(sy, (sm || 1) - 1, sd || 1, 12, 0, 0);
    const endDateObj = new Date(ey, (em || 1) - 1, ed || 1, 12, 0, 0);

    // Limit day slots creation if range is too large (> 62 days) to avoid chart congestion
    const diffDays = Math.round((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 62) {
      const curr = new Date(startDateObj);
      while (curr <= endDateObj) {
        const cy = curr.getFullYear();
        const cm = String(curr.getMonth() + 1).padStart(2, '0');
        const cd = String(curr.getDate()).padStart(2, '0');
        const isoDate = `${cy}-${cm}-${cd}`;
        const displayDate = `${cd}/${cm}`;
        dayMap.set(isoDate, {
          date: isoDate,
          displayDate,
          revenue: 0,
          transactions: 0,
          units: 0,
          subtotal: 0,
          tax: 0,
        });
        curr.setDate(curr.getDate() + 1);
      }
    }

    filteredSales.forEach((sale) => {
      const isoDate = sale.date ? sale.date.substring(0, 10) : '';
      if (!isoDate) return;

      let entry = dayMap.get(isoDate);
      if (!entry) {
        const [y, m, d] = isoDate.split('-');
        entry = {
          date: isoDate,
          displayDate: `${d}/${m}`,
          revenue: 0,
          transactions: 0,
          units: 0,
          subtotal: 0,
          tax: 0,
        };
        dayMap.set(isoDate, entry);
      }

      entry.revenue += Number((sale.total || 0).toFixed(2));
      entry.transactions += 1;
      entry.subtotal += Number((sale.subtotal || 0).toFixed(2));
      entry.tax += Number((sale.taxTotal || 0).toFixed(2));

      sale.items?.forEach((item) => {
        entry!.units += item.quantity || 0;
      });
    });

    const sortedArray = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate moving average for smoother analysis
    return sortedArray.map((item, idx, arr) => {
      const start = Math.max(0, idx - 2);
      const subset = arr.slice(start, idx + 1);
      const avgRevenue = subset.reduce((acc, curr) => acc + curr.revenue, 0) / subset.length;
      return {
        ...item,
        movingAvgRevenue: Number(avgRevenue.toFixed(2)),
      };
    });
  }, [filteredSales, customStartDate, customEndDate]);

  // Peak sales day calculation
  const peakSalesDay = useMemo(() => {
    if (dailySalesData.length === 0) return null;
    let max = dailySalesData[0];
    dailySalesData.forEach((day) => {
      if (day.revenue > max.revenue) max = day;
    });
    return max.revenue > 0 ? max : null;
  }, [dailySalesData]);

  // 2. Top Selling Products Dataset for Recharts
  const topProductsData = useMemo(() => {
    const prodMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        category: string;
        quantity: number;
        revenue: number;
        costEstimate: number;
        unitPrice: number;
      }
    >();

    filteredSales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId || p.sku === item.sku);
        const key = item.productId || item.sku || item.productName;

        let entry = prodMap.get(key);
        if (!entry) {
          entry = {
            productId: key,
            productName: item.productName || prod?.name || 'Produto',
            sku: item.sku || prod?.sku || 'SKU-000',
            category: prod?.category || 'Geral',
            quantity: 0,
            revenue: 0,
            costEstimate: 0,
            unitPrice: item.unitPrice || prod?.price || 0,
          };
          prodMap.set(key, entry);
        }

        entry.quantity += item.quantity || 0;
        entry.revenue += item.total || 0;
        const itemCost = (prod?.costPrice || (item.unitPrice ? item.unitPrice * 0.5 : 0)) * (item.quantity || 0);
        entry.costEstimate += itemCost;
      });
    });

    const list = Array.from(prodMap.values());
    const totalRev = summaryMetrics.totalRevenue || 1;

    return list
      .map((item) => ({
        ...item,
        revenue: Number(item.revenue.toFixed(2)),
        marginEstimate: Number((item.revenue - item.costEstimate).toFixed(2)),
        marginPercent:
          item.revenue > 0
            ? Number((((item.revenue - item.costEstimate) / item.revenue) * 100).toFixed(1))
            : 0,
        shareOfTotal: Number(((item.revenue / totalRev) * 100).toFixed(1)),
      }))
      .sort((a, b) => (topProductsMetric === 'revenue' ? b.revenue - a.revenue : b.quantity - a.quantity));
  }, [filteredSales, products, summaryMetrics.totalRevenue, topProductsMetric]);

  // Top 10 Products for BarChart
  const top10ChartData = useMemo(() => {
    return topProductsData.slice(0, 10).map((p) => ({
      name: p.productName.length > 18 ? p.productName.substring(0, 18) + '...' : p.productName,
      fullName: p.productName,
      revenue: p.revenue,
      quantity: p.quantity,
      sku: p.sku,
    }));
  }, [topProductsData]);

  // 3. Category Distribution for PieChart
  const categoryDistribution = useMemo(() => {
    const catMap = new Map<string, { name: string; revenue: number; quantity: number }>();

    topProductsData.forEach((item) => {
      const catObj = categories.find((c) => c.id === item.category);
      const catName = catObj ? catObj.name : item.category;

      let entry = catMap.get(catName);
      if (!entry) {
        entry = { name: catName, revenue: 0, quantity: 0 };
        catMap.set(catName, entry);
      }
      entry.revenue += item.revenue;
      entry.quantity += item.quantity;
    });

    return Array.from(catMap.values())
      .map((c) => ({
        name: c.name,
        value: Number(c.revenue.toFixed(2)),
        quantity: c.quantity,
      }))
      .sort((a, b) => b.value - a.value);
  }, [topProductsData, categories]);

  // 4. Payment Methods Distribution
  const paymentMethodsData = useMemo(() => {
    const payMap: Record<string, { method: string; label: string; amount: number; count: number }> = {
      dinheiro: { method: 'dinheiro', label: 'Numerário / Dinheiro', amount: 0, count: 0 },
      cartao: { method: 'cartao', label: 'Cartão / TPA SIBS', amount: 0, count: 0 },
      mbway: { method: 'mbway', label: 'MB WAY', amount: 0, count: 0 },
      transferencia: { method: 'transferencia', label: 'Transferência Bancária', amount: 0, count: 0 },
      vale: { method: 'vale', label: 'Vales & Outros', amount: 0, count: 0 },
    };

    filteredSales.forEach((sale) => {
      sale.payments?.forEach((p) => {
        const m = p.method || 'dinheiro';
        if (!payMap[m]) {
          payMap[m] = { method: m, label: m.toUpperCase(), amount: 0, count: 0 };
        }
        payMap[m].amount += p.amount || 0;
        payMap[m].count += 1;
      });
    });

    return Object.values(payMap)
      .filter((p) => p.amount > 0)
      .map((p) => ({
        ...p,
        amount: Number(p.amount.toFixed(2)),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredSales]);

  // 5. Hourly Sales Breakdown (08:00 to 21:00)
  const hourlySalesData = useMemo(() => {
    const hoursMap = new Map<number, { hour: string; revenue: number; salesCount: number }>();

    for (let h = 8; h <= 21; h++) {
      hoursMap.set(h, {
        hour: `${h.toString().padStart(2, '0')}:00`,
        revenue: 0,
        salesCount: 0,
      });
    }

    filteredSales.forEach((sale) => {
      if (sale.date) {
        const dateObj = new Date(sale.date);
        const h = dateObj.getHours();
        const entry = hoursMap.get(h);
        if (entry) {
          entry.revenue += sale.total || 0;
          entry.salesCount += 1;
        }
      }
    });

    return Array.from(hoursMap.values()).map((h) => ({
      ...h,
      revenue: Number(h.revenue.toFixed(2)),
    }));
  }, [filteredSales]);

  // Filtered Top Products Table
  const filteredProductsTable = useMemo(() => {
    if (!productSearch.trim()) return topProductsData;
    const q = productSearch.toLowerCase();
    return topProductsData.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [topProductsData, productSearch]);

  // Export to CSV Function
  const exportToCSV = () => {
    try {
      const headers = ['Data', 'Transações', 'Faturação Total', 'Subtotal', 'IVA', 'Unidades Vendidas'];
      const rows = dailySalesData.map((d) => [
        d.date,
        d.transactions,
        d.revenue.toFixed(2),
        d.subtotal.toFixed(2),
        d.tax.toFixed(2),
        d.units,
      ]);

      const topHeaders = ['Ranking', 'Artigo', 'SKU', 'Categoria', 'Qtd Vendida', 'Receita Total', 'Quota %'];
      const topRows = topProductsData.map((p, idx) => [
        `#${idx + 1}`,
        `"${p.productName.replace(/"/g, '""')}"`,
        p.sku,
        p.category,
        p.quantity,
        p.revenue.toFixed(2),
        `${p.shareOfTotal}%`,
      ]);

      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'RELATORIO DE VOLUME DIARIO DE VENDAS\n';
      csvContent += headers.join(';') + '\n';
      rows.forEach((r) => {
        csvContent += r.join(';') + '\n';
      });

      csvContent += '\n\nPRODUTOS MAIS VENDIDOS NO PERIODO\n';
      csvContent += topHeaders.join(';') + '\n';
      topRows.forEach((r) => {
        csvContent += r.join(';') + '\n';
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `relatorio_vendas_${customStartDate}_a_${customEndDate}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notify('Relatório exportado com sucesso em CSV!', 'success');
    } catch (err) {
      notify('Erro ao gerar exportação CSV.', 'error');
    }
  };

  // Print Analytical Report
  const handlePrint = () => {
    window.print();
  };

  // Helper month label formatter
  const formatMonthLabel = (monthKey: string) => {
    return getMonthNamePT(monthKey);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-[#e5e5e5] overflow-y-auto select-none p-4 lg:p-6 space-y-6">
      {/* 1. Header & Filter Controls Bar */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 lg:p-5 shadow-lg space-y-4">
        {/* Title and Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-100">
                  Relatórios Analíticos de Vendas
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/30">
                  BI & Recharts
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Visualização detalhada do volume de vendas diárias, produtos campeões e métricas
                comerciais.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              id="analytics-export-csv"
              onClick={exportToCSV}
              className="px-3.5 py-2 rounded-lg bg-[#1e1e1e] hover:bg-[#262626] border border-[#333333] hover:border-[#c5a47e]/50 text-xs font-medium text-neutral-200 hover:text-white transition-all flex items-center space-x-2 cursor-pointer shadow-sm"
              title="Exportar dados para folha de cálculo CSV / Excel"
            >
              <Download className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>Exportar CSV</span>
            </button>

            <button
              id="analytics-print-btn"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-lg bg-[#1e1e1e] hover:bg-[#262626] border border-[#333333] hover:border-[#c5a47e]/50 text-xs font-medium text-neutral-200 hover:text-white transition-all flex items-center space-x-2 cursor-pointer shadow-sm"
              title="Imprimir relatório analítico ou guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="pt-3 border-t border-[#262626] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Month Quick Selector */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1 flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-[#c5a47e]" />
              <span>Filtrar por Mês</span>
            </label>
            <div className="relative">
              <select
                id="analytics-month-select"
                value={datePreset === 'all' ? 'all' : selectedMonth}
                onChange={(e) => handleMonthSelect(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-[#2e2e2e] focus:border-[#c5a47e] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none transition-colors cursor-pointer appearance-none pr-8"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
                <option value="all">Todo o Histórico</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Date Range Start & End */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Data Início
              </label>
              <input
                id="analytics-start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full bg-[#1c1c1c] border border-[#2e2e2e] focus:border-[#c5a47e] rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Data Fim
              </label>
              <input
                id="analytics-end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full bg-[#1c1c1c] border border-[#2e2e2e] focus:border-[#c5a47e] rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Store Filter */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1 flex items-center space-x-1">
              <StoreIcon className="w-3 h-3 text-[#c5a47e]" />
              <span>Estabelecimento / Loja</span>
            </label>
            <div className="relative">
              <select
                id="analytics-store-filter"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-[#2e2e2e] focus:border-[#c5a47e] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none transition-colors cursor-pointer appearance-none pr-8"
              >
                <option value="all">Todas as Lojas ({stores.length})</option>
                {stores.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1 flex items-center space-x-1">
              <CreditCard className="w-3 h-3 text-[#c5a47e]" />
              <span>Forma de Pagamento</span>
            </label>
            <div className="relative">
              <select
                id="analytics-payment-filter"
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-[#2e2e2e] focus:border-[#c5a47e] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none transition-colors cursor-pointer appearance-none pr-8"
              >
                <option value="all">Todas as Formas</option>
                <option value="dinheiro">Numerário / Dinheiro</option>
                <option value="cartao">Cartão / TPA</option>
                <option value="mbway">MB WAY</option>
                <option value="transferencia">Transferência Bancária</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Quick Date Range Preset Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-medium text-neutral-400 mr-1 flex items-center">
            <Filter className="w-3 h-3 mr-1 text-[#c5a47e]" />
            Atalhos:
          </span>
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'last7days', label: 'Últimos 7 Dias' },
            { id: 'this_month', label: 'Este Mês' },
            { id: 'last_month', label: 'Mês Anterior' },
            { id: 'last90days', label: 'Últimos 3 Meses' },
            { id: 'year_2026', label: 'Ano 2026' },
            { id: 'all', label: 'Todo o Período' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id as DatePreset)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                datePreset === preset.id
                  ? 'bg-[#c5a47e] text-neutral-950 font-semibold shadow'
                  : 'bg-[#1c1c1c] text-neutral-400 hover:text-neutral-200 hover:bg-[#252525] border border-[#2c2c2c]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Key Performance Metric Cards (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue Card */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#c5a47e]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Faturação Total (Bruto)</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-neutral-100 tracking-tight">
              {formatCurrency(summaryMetrics.totalRevenue)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#262626]/80 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Líquido: {formatCurrency(summaryMetrics.totalSubtotal)}</span>
            <span>IVA: {formatCurrency(summaryMetrics.totalTax)}</span>
          </div>
        </div>

        {/* Total Transactions Card */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#c5a47e]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Vendas & Documentos</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-neutral-100 tracking-tight">
              {summaryMetrics.totalTransactions}{' '}
              <span className="text-xs font-normal text-neutral-400">faturas</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#262626]/80 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Ticket Médio:</span>
            <span className="font-semibold text-neutral-200">
              {formatCurrency(summaryMetrics.averageTicket)}
            </span>
          </div>
        </div>

        {/* Units Sold Card */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#c5a47e]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Unidades Vendidas</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-neutral-100 tracking-tight">
              {summaryMetrics.totalUnitsSold}{' '}
              <span className="text-xs font-normal text-neutral-400">artigos</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#262626]/80 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Média / Talão:</span>
            <span className="font-semibold text-neutral-200">
              {summaryMetrics.itemsPerSale.toFixed(1)} un/venda
            </span>
          </div>
        </div>

        {/* Peak Best Day Card */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#c5a47e]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Melhor Dia de Vendas</span>
            <div className="p-1.5 rounded-lg bg-[#c5a47e]/15 text-[#c5a47e]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold text-neutral-100 tracking-tight truncate">
              {peakSalesDay ? formatCurrency(peakSalesDay.revenue) : formatCurrency(0)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#262626]/80 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Data Pico:</span>
            <span className="font-semibold text-[#c5a47e]">
              {peakSalesDay ? peakSalesDay.date : 'N/D'} ({peakSalesDay ? peakSalesDay.transactions : 0} v.)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Section Tabs Navigation Bar */}
      <div
        id="analytics-section-tabs-bar"
        className="bg-[#141414] border border-[#262626] rounded-xl p-2.5 shadow-md shrink-0"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-neutral-400 shrink-0 px-1">
            <Layers className="w-4 h-4 text-[#c5a47e]" />
            <span className="font-semibold text-neutral-200">Vistas do Relatório:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth flex-wrap sm:flex-nowrap">
            {[
              {
                id: 'overview',
                label: 'Visão Geral & Volume Diário',
                badge: 'Completo',
                icon: BarChart3,
              },
              {
                id: 'products',
                label: 'Produtos Mais Vendidos',
                badge: 'Ranking',
                icon: Award,
              },
              {
                id: 'daily',
                label: 'Tabela de Desempenho Diário',
                badge: `${dailySalesData.length} dias`,
                icon: Calendar,
              },
              {
                id: 'payments',
                label: 'Formas de Pagamento',
                badge: `${paymentMethodsData.length} métodos`,
                icon: CreditCard,
              },
              {
                id: 'hours',
                label: 'Horários de Pico',
                badge: '24 Horas',
                icon: Clock,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`analytics-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                    isActive
                      ? 'bg-[#c5a47e] text-neutral-950 border-[#c5a47e] shadow-sm font-bold'
                      : 'bg-[#1c1c1c] text-neutral-300 hover:text-white hover:bg-[#252525] border-[#2c2c2c]'
                  }`}
                  title={`Alternar visualização para: ${tab.label}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-neutral-950' : 'text-[#c5a47e]'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                        isActive
                          ? 'bg-neutral-950/25 text-neutral-900 border border-neutral-950/20'
                          : 'bg-[#141414] text-neutral-400 border border-[#2e2e2e]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. TAB 1 & PRIMARY CHART: Daily Sales Volume & Overview */}
      {(activeTab === 'overview' || activeTab === 'daily') && (
        <div className="space-y-6">
          {/* Main Daily Sales Volume Chart */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 lg:p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base font-semibold text-neutral-100 flex items-center space-x-2">
                  <span>Evolução do Volume de Vendas Diárias</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Faturação acumulada por dia e contagem de transações no intervalo selecionado
                  ({customStartDate} até {customEndDate}).
                </p>
              </div>

              {/* Metric Toggle */}
              <div className="flex items-center space-x-1 bg-[#1a1a1a] p-1 rounded-lg border border-[#2a2a2a] self-start sm:self-auto">
                <button
                  onClick={() => setChartMetric('both')}
                  className={`px-3 py-1 text-xs rounded font-medium transition-all cursor-pointer ${
                    chartMetric === 'both'
                      ? 'bg-[#c5a47e] text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Receita + Volume
                </button>
                <button
                  onClick={() => setChartMetric('revenue')}
                  className={`px-3 py-1 text-xs rounded font-medium transition-all cursor-pointer ${
                    chartMetric === 'revenue'
                      ? 'bg-[#c5a47e] text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Apenas Faturação
                </button>
                <button
                  onClick={() => setChartMetric('volume')}
                  className={`px-3 py-1 text-xs rounded font-medium transition-all cursor-pointer ${
                    chartMetric === 'volume'
                      ? 'bg-[#c5a47e] text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Apenas Transações
                </button>
              </div>
            </div>

            {/* Recharts Area/Composed Chart */}
            <div className="h-80 w-full">
              {dailySalesData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-2">
                  <Calendar className="w-8 h-8 text-neutral-600" />
                  <p className="text-sm">Não existem vendas registadas no período selecionado.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={dailySalesData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c5a47e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#c5a47e" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis
                      dataKey="displayDate"
                      stroke="#737373"
                      fontSize={11}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#737373"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `${val} ${currentCompany.currencySymbol}`}
                    />
                    {chartMetric === 'both' && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#3b82f6"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) => `${val} v.`}
                      />
                    )}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#333333',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f5f5f5',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                      }}
                      formatter={(value: any, name: string) => {
                        if (name === 'revenue' || name === 'Faturação Total') {
                          return [formatCurrency(Number(value)), 'Faturação Total'];
                        }
                        if (name === 'movingAvgRevenue' || name === 'Média Móvel') {
                          return [formatCurrency(Number(value)), 'Média Móvel'];
                        }
                        if (name === 'transactions' || name === 'Transações') {
                          return [`${value} vendas`, 'Transações'];
                        }
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => {
                        if (value === 'revenue') return 'Faturação Diária';
                        if (value === 'transactions') return 'Número de Vendas';
                        if (value === 'movingAvgRevenue') return 'Tendência (Média Móvel)';
                        return value;
                      }}
                    />

                    {/* Revenue Area (Primary) */}
                    {(chartMetric === 'both' || chartMetric === 'revenue') && (
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        name="revenue"
                        stroke="#c5a47e"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#revenueGradient)"
                      />
                    )}

                    {/* Moving average line */}
                    {(chartMetric === 'both' || chartMetric === 'revenue') && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="movingAvgRevenue"
                        name="movingAvgRevenue"
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    )}

                    {/* Transactions Bar (Secondary Axis) */}
                    {(chartMetric === 'both' || chartMetric === 'volume') && (
                      <Bar
                        yAxisId={chartMetric === 'both' ? 'right' : 'left'}
                        dataKey="transactions"
                        name="transactions"
                        fill="url(#barGradient)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Daily Performance Breakdown Table */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">
                  Desempenho Detalhado por Dia
                </h3>
                <p className="text-xs text-neutral-400">
                  Resumo cronológico de vendas diárias, unidades e ticket médio.
                </p>
              </div>
              <span className="text-xs text-neutral-400 font-medium">
                {dailySalesData.filter((d) => d.transactions > 0).length} dias com vendas
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1a1a1a] text-neutral-400 uppercase tracking-wider font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4 text-center">Transações</th>
                    <th className="py-3 px-4 text-center">Unidades</th>
                    <th className="py-3 px-4 text-right">Líquido (Subtotal)</th>
                    <th className="py-3 px-4 text-right">IVA</th>
                    <th className="py-3 px-4 text-right">Faturação Total</th>
                    <th className="py-3 px-4 text-right">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]/60">
                  {dailySalesData
                    .filter((d) => d.transactions > 0)
                    .map((day) => {
                      const avg = day.transactions > 0 ? day.revenue / day.transactions : 0;
                      const isPeak = peakSalesDay?.date === day.date;
                      return (
                        <tr
                          key={day.date}
                          className={`hover:bg-[#1f1f1f]/60 transition-colors ${
                            isPeak ? 'bg-[#c5a47e]/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-medium text-neutral-200 flex items-center space-x-2">
                            <span>{day.date}</span>
                            {isPeak && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#c5a47e] text-neutral-950">
                                PICO
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-neutral-300">
                            {day.transactions}
                          </td>
                          <td className="py-3 px-4 text-center text-neutral-300">{day.units}</td>
                          <td className="py-3 px-4 text-right text-neutral-400">
                            {formatCurrency(day.subtotal)}
                          </td>
                          <td className="py-3 px-4 text-right text-neutral-400">
                            {formatCurrency(day.tax)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-neutral-100">
                            {formatCurrency(day.revenue)}
                          </td>
                          <td className="py-3 px-4 text-right text-[#c5a47e] font-medium">
                            {formatCurrency(avg)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 2: Top Selling Products & Category Breakdown */}
      {(activeTab === 'overview' || activeTab === 'products') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top 10 Products Horizontal Bar Chart */}
            <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-xl p-4 lg:p-6 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-base font-semibold text-neutral-100 flex items-center space-x-2">
                    <Award className="w-4 h-4 text-[#c5a47e]" />
                    <span>Top 10 Produtos Mais Vendidos</span>
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Ranking dos artigos com maior desempenho no período selecionado.
                  </p>
                </div>

                {/* Toggle Revenue vs Quantity */}
                <div className="flex items-center space-x-1 bg-[#1a1a1a] p-1 rounded-lg border border-[#2a2a2a]">
                  <button
                    onClick={() => setTopProductsMetric('revenue')}
                    className={`px-3 py-1 text-xs rounded font-medium transition-all cursor-pointer ${
                      topProductsMetric === 'revenue'
                        ? 'bg-[#c5a47e] text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Por Valor ({currentCompany?.currencySymbol || 'Mt'})
                  </button>
                  <button
                    onClick={() => setTopProductsMetric('quantity')}
                    className={`px-3 py-1 text-xs rounded font-medium transition-all cursor-pointer ${
                      topProductsMetric === 'quantity'
                        ? 'bg-[#c5a47e] text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Por Quantidade (Un.)
                  </button>
                </div>
              </div>

              {/* Recharts Horizontal Bar Chart */}
              <div className="h-80 w-full">
                {top10ChartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                    <ShoppingBag className="w-8 h-8 text-neutral-600 mb-2" />
                    <p className="text-sm">Sem dados de produtos no período selecionado.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={top10ChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                      <XAxis
                        type="number"
                        stroke="#737373"
                        fontSize={11}
                        tickFormatter={(val) =>
                          topProductsMetric === 'revenue'
                            ? `${val} ${currentCompany.currencySymbol}`
                            : `${val} un.`
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#a3a3a3"
                        fontSize={11}
                        width={130}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#171717',
                          borderColor: '#333333',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#f5f5f5',
                        }}
                        formatter={(value: any, name: string, item: any) => {
                          const p = item.payload;
                          if (topProductsMetric === 'revenue') {
                            return [formatCurrency(Number(value)), 'Faturação Total'];
                          }
                          return [`${value} unidades`, 'Quantidade'];
                        }}
                        labelFormatter={(label, payload) => {
                          const fullName = payload?.[0]?.payload?.fullName || label;
                          return `Produto: ${fullName}`;
                        }}
                      />
                      <Bar
                        dataKey={topProductsMetric === 'revenue' ? 'revenue' : 'quantity'}
                        fill="#c5a47e"
                        radius={[0, 6, 6, 0]}
                      >
                        {top10ChartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            fillOpacity={0.9}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Category Share Donut / Pie Chart */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 lg:p-6 shadow-md flex flex-col">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-neutral-100 flex items-center space-x-2">
                  <PieIcon className="w-4 h-4 text-[#c5a47e]" />
                  <span>Distribuição por Categoria</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">Quota de vendas por família de produtos.</p>
              </div>

              <div className="h-64 w-full flex-1">
                {categoryDistribution.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
                    Sem vendas por categoria
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell
                            key={`cat-cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="#141414"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#171717',
                          borderColor: '#333333',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#f5f5f5',
                        }}
                        formatter={(val: any) => [formatCurrency(Number(val)), 'Faturação']}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span className="text-xs text-neutral-300">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Full Top Products Interactive Table */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">
                  Tabela Completa de Desempenho de Produtos
                </h3>
                <p className="text-xs text-neutral-400">
                  Total de {topProductsData.length} artigos comercializados no período filtrado.
                </p>
              </div>

              {/* Search in Products */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Pesquisar produto ou SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-[#2e2e2e] focus:border-[#c5a47e] rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1a1a1a] text-neutral-400 uppercase tracking-wider font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Artigo</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-center">Qtd Vendida</th>
                    <th className="py-3 px-4 text-right">Preço Médio</th>
                    <th className="py-3 px-4 text-right">Faturação Total</th>
                    <th className="py-3 px-4 text-right">Quota %</th>
                    <th className="py-3 px-4 text-right">Margem Est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]/60">
                  {filteredProductsTable.map((item, idx) => (
                    <tr
                      key={item.productId}
                      className="hover:bg-[#1f1f1f]/60 transition-colors"
                    >
                      <td className="py-3 px-4 text-center">
                        {idx === 0 ? (
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 font-bold inline-flex items-center justify-center text-[10px]">
                            1
                          </span>
                        ) : idx === 1 ? (
                          <span className="w-5 h-5 rounded-full bg-slate-300 text-neutral-950 font-bold inline-flex items-center justify-center text-[10px]">
                            2
                          </span>
                        ) : idx === 2 ? (
                          <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-bold inline-flex items-center justify-center text-[10px]">
                            3
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-[11px] font-medium">
                            #{idx + 1}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-200">
                        {item.productName}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-400 text-[11px]">
                        {item.sku}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#222222] text-neutral-300 border border-[#333333]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-neutral-100">
                        {item.quantity} un.
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-400">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-neutral-100">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#c5a47e] font-semibold">
                        {item.shareOfTotal}%
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                        +{formatCurrency(item.marginEstimate)} ({item.marginPercent}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 3: Payment Methods & Peak Hours Analysis */}
      {(activeTab === 'overview' || activeTab === 'payments' || activeTab === 'hours') && (
        <div className={`grid grid-cols-1 ${activeTab === 'overview' ? 'lg:grid-cols-2' : ''} gap-6`}>
          {/* Payment Methods Breakdown Chart */}
          {(activeTab === 'overview' || activeTab === 'payments') && (
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 lg:p-6 shadow-md">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-neutral-100 flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-[#c5a47e]" />
                  <span>Volume por Forma de Pagamento</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Comparação de receitas recebidas por TPA, Numerário, MB WAY e Transferência.
                </p>
              </div>

              <div className="h-64 w-full">
                {paymentMethodsData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
                    Sem registos de pagamentos
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={paymentMethodsData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="label" stroke="#737373" fontSize={11} tickLine={false} />
                      <YAxis
                        stroke="#737373"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => `${v} ${currentCompany.currencySymbol}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#171717',
                          borderColor: '#333333',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#f5f5f5',
                        }}
                        formatter={(val: any) => [formatCurrency(Number(val)), 'Total Faturado']}
                      />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                        {paymentMethodsData.map((_, index) => (
                          <Cell key={`pay-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {/* Peak Hours Breakdown Chart */}
          {(activeTab === 'overview' || activeTab === 'hours') && (
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 lg:p-6 shadow-md">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-neutral-100 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#c5a47e]" />
                  <span>Horários de Maior Afluência (Horas de Pico)</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Distribuição horária de faturação para planeamento de equipas e turnos de caixa.
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={hourlySalesData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="hour" stroke="#737373" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#737373"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `${v} ${currentCompany.currencySymbol}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#333333',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f5f5f5',
                      }}
                      formatter={(val: any, name: string, item: any) => [
                        formatCurrency(Number(val)),
                        `Faturação (${item.payload.salesCount} vendas)`,
                      ]}
                    />
                    <Bar dataKey="revenue" fill="#c5a47e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
