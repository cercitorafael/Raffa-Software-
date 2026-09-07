import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { isEffectiveSale } from '../../utils/documentUtils';
import {
  getTodayDateStr,
  getCurrentMonthStr,
  getPrevMonthStr,
  getMonthBounds,
  getDaysAgoStr,
  getMonthNamePT,
  getWeekInfo,
} from '../../utils/dateUtils';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  CalendarRange,
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
  ChevronLeft,
  ChevronRight,
  PieChart as PieIcon,
  CheckCircle2,
  ShieldAlert,
  Percent,
  Target,
  DollarSign,
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
import { AnalyticsMarginsTab } from './AnalyticsMarginsTab';
import { AnalyticsSalesGoalsTab } from './AnalyticsSalesGoalsTab';

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
  const [chartMetric, setChartMetric] = useState<'both' | 'revenue' | 'volume' | 'margin'>('both');
  const [topProductsMetric, setTopProductsMetric] = useState<'revenue' | 'quantity'>('revenue');
  const [activeTab, setActiveTab] = useState<'overview' | 'margins' | 'goals' | 'daily' | 'products' | 'payments' | 'hours'>('overview');
  const [marginViewMode, setMarginViewMode] = useState<'summary' | 'weekly' | 'monthly' | 'yearly' | 'categories'>('summary');
  const [productSearch, setProductSearch] = useState<string>('');

  // Horizontal scroll controller for report section tabs
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 260;
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleTabSelect = (tabId: any) => {
    setActiveTab(tabId);
    const tabEl = document.getElementById(`analytics-tab-${tabId}`);
    if (tabEl && tabsContainerRef.current) {
      tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

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

  // Helper to reliably find product for a sale item avoiding accidental SKU collisions
  const findProductForSaleItem = useCallback(
    (item: { productId?: string; sku?: string; productName?: string }) => {
      // 1. Primary & safest: match by exact productId
      if (item.productId) {
        const byId = products.find((p) => p.id === item.productId);
        if (byId) return byId;
      }
      // 2. Exact match by productName
      if (item.productName) {
        const normName = item.productName.trim().toLowerCase();
        const byName = products.find((p) => p.name.trim().toLowerCase() === normName);
        if (byName) return byName;
      }
      // 3. Match by SKU only if SKU matches AND (productName partially matches or item has no productName)
      if (item.sku) {
        if (item.productName) {
          const normName = item.productName.trim().toLowerCase();
          const bySkuAndName = products.find(
            (p) =>
              p.sku === item.sku &&
              (p.name.trim().toLowerCase().includes(normName) ||
                normName.includes(p.name.trim().toLowerCase()))
          );
          if (bySkuAndName) return bySkuAndName;
        }
        // Fallback: match by SKU only if item has no productId
        if (!item.productId) {
          const bySku = products.find((p) => p.sku === item.sku);
          if (bySku) return bySku;
        }
      }
      return undefined;
    },
    [products]
  );

  // Filter Sales according to date range, store, payment method, and product category
  // EXCLUDES quotations (ORC), proformas (PF), transport guides (GT/GR) from commercial revenue
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

      // Category filtering
      if (selectedCategory !== 'all') {
        const hasCategory = sale.items?.some((item) => {
          const prod = findProductForSaleItem(item);
          return (prod?.category === selectedCategory) || (item.category === selectedCategory);
        });
        if (!hasCategory) return false;
      }

      return true;
    });
  }, [salesHistory, customStartDate, customEndDate, selectedStoreId, selectedPaymentMethod, selectedCategory, findProductForSaleItem]);

  // Helper to calculate revenue, units, and estimated product cost for any sale
  // Uses product costPrice or estimates 50% of unit price if not defined
  const getSaleFinancials = (sale: any) => {
    let rev = 0;
    let cost = 0;
    let units = 0;
    sale.items?.forEach((item: any) => {
      const prod = findProductForSaleItem(item);
      if (selectedCategory !== 'all' && prod?.category !== selectedCategory && item.category !== selectedCategory) {
        return;
      }
      const qty = item.quantity || 0;
      const itemRev = item.total || ((item.unitPrice || 0) * qty);
      const unitCost =
        prod?.costPrice !== undefined && prod.costPrice !== null
          ? prod.costPrice
          : item.unitPrice
          ? item.unitPrice * 0.5
          : 0;
      const itemCost = unitCost * qty;

      rev += itemRev;
      cost += itemCost;
      units += qty;
    });
    return { rev, cost, margin: rev - cost, units };
  };

  // Aggregate KPI summary metrics including Costs & Profit Margin
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalTax = 0;
    let totalSubtotal = 0;
    let totalUnitsSold = 0;
    let totalCost = 0;
    let totalTransactions = filteredSales.length;

    filteredSales.forEach((sale) => {
      const fin = getSaleFinancials(sale);
      totalRevenue += selectedCategory === 'all' ? (sale.total || 0) : fin.rev;
      totalTax += selectedCategory === 'all' ? (sale.taxTotal || 0) : 0;
      totalSubtotal += selectedCategory === 'all' ? (sale.subtotal || 0) : (fin.rev * 0.84);
      totalUnitsSold += fin.units;
      totalCost += fin.cost;
    });

    const totalMargin = totalRevenue - totalCost;
    const totalMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const itemsPerSale = totalTransactions > 0 ? totalUnitsSold / totalTransactions : 0;

    return {
      totalRevenue,
      totalTax,
      totalSubtotal,
      totalUnitsSold,
      totalCost,
      totalMargin,
      totalMarginPercent,
      totalTransactions,
      averageTicket,
      itemsPerSale,
    };
  }, [filteredSales, selectedCategory, products]);

  // 1. Daily Sales Volume Dataset with Cost and Margin for Recharts and Table
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
        cost: number;
        margin: number;
        marginPercent: number;
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
          cost: 0,
          margin: 0,
          marginPercent: 0,
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
          cost: 0,
          margin: 0,
          marginPercent: 0,
        };
        dayMap.set(isoDate, entry);
      }

      const fin = getSaleFinancials(sale);
      const rev = selectedCategory === 'all' ? (sale.total || 0) : fin.rev;
      entry.revenue += Number(rev.toFixed(2));
      entry.transactions += 1;
      entry.subtotal += Number((selectedCategory === 'all' ? (sale.subtotal || 0) : rev * 0.84).toFixed(2));
      entry.tax += Number((selectedCategory === 'all' ? (sale.taxTotal || 0) : 0).toFixed(2));
      entry.units += fin.units;
      entry.cost += Number(fin.cost.toFixed(2));
      entry.margin = Number((entry.revenue - entry.cost).toFixed(2));
      entry.marginPercent = entry.revenue > 0 ? Number(((entry.margin / entry.revenue) * 100).toFixed(1)) : 0;
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
  }, [filteredSales, customStartDate, customEndDate, selectedCategory, products]);

  // =========================================================================
  // MARGEM SEMANAL, MENSAL E ANUAL DE ACORDO COM O FILTRO ESCOLHIDO
  // =========================================================================

  // Vendas elegíveis respeitando loja, forma de pagamento e categoria
  const eligibleSalesForMargins = useMemo(() => {
    return salesHistory.filter((sale) => {
      if (!isEffectiveSale(sale)) return false;
      if (selectedStoreId !== 'all' && sale.storeId !== selectedStoreId) return false;
      if (selectedPaymentMethod !== 'all') {
        const hasMethod = sale.payments?.some((p) => p.method === selectedPaymentMethod);
        if (!hasMethod) return false;
      }
      if (selectedCategory !== 'all') {
        const hasCategory = sale.items?.some((item) => {
          const prod = findProductForSaleItem(item);
          return (prod?.category === selectedCategory) || (item.category === selectedCategory);
        });
        if (!hasCategory) return false;
      }
      return true;
    });
  }, [salesHistory, selectedStoreId, selectedPaymentMethod, selectedCategory, findProductForSaleItem]);

  // 1. Margem do Período Filtrado Ativo
  const periodMarginMetrics = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    let units = 0;
    let transactions = filteredSales.length;

    filteredSales.forEach((sale) => {
      const fin = getSaleFinancials(sale);
      revenue += selectedCategory === 'all' ? (sale.total || 0) : fin.rev;
      cost += fin.cost;
      units += fin.units;
    });

    const margin = revenue - cost;
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

    return {
      revenue: Number(revenue.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      margin: Number(margin.toFixed(2)),
      marginPercent: Number(marginPercent.toFixed(1)),
      units,
      transactions,
    };
  }, [filteredSales, selectedCategory, products]);

  // 2. Margem Semanal (Semana Atual / Filtrada e Série Semana a Semana)
  const weeklyMarginMetrics = useMemo(() => {
    const weekMap = new Map<
      string,
      {
        weekKey: string;
        weekNumber: number;
        year: number;
        label: string;
        startDate: string;
        endDate: string;
        revenue: number;
        cost: number;
        margin: number;
        marginPercent: number;
        units: number;
        transactions: number;
      }
    >();

    // Consider all weeks in the filtered scope
    const minDate = customStartDate || '2026-01-01';
    const maxDate = customEndDate || '2026-12-31';

    eligibleSalesForMargins.forEach((sale) => {
      const saleDate = sale.date ? sale.date.substring(0, 10) : '';
      if (!saleDate) return;
      if (saleDate < minDate || saleDate > maxDate) return;

      const wInfo = getWeekInfo(saleDate);
      let entry = weekMap.get(wInfo.weekKey);
      if (!entry) {
        entry = {
          weekKey: wInfo.weekKey,
          weekNumber: wInfo.weekNumber,
          year: wInfo.year,
          label: wInfo.label,
          startDate: wInfo.startDate,
          endDate: wInfo.endDate,
          revenue: 0,
          cost: 0,
          margin: 0,
          marginPercent: 0,
          units: 0,
          transactions: 0,
        };
        weekMap.set(wInfo.weekKey, entry);
      }

      const fin = getSaleFinancials(sale);
      entry.revenue += selectedCategory === 'all' ? (sale.total || 0) : fin.rev;
      entry.cost += fin.cost;
      entry.units += fin.units;
      entry.transactions += 1;
    });

    const series = Array.from(weekMap.values())
      .map((w) => {
        const mrg = w.revenue - w.cost;
        return {
          ...w,
          revenue: Number(w.revenue.toFixed(2)),
          cost: Number(w.cost.toFixed(2)),
          margin: Number(mrg.toFixed(2)),
          marginPercent: w.revenue > 0 ? Number(((mrg / w.revenue) * 100).toFixed(1)) : 0,
        };
      })
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey));

    // Determine target week to feature (latest week in filter, or today's week)
    const targetDateForWeek = customEndDate || initialTodayStr;
    const currentWeekInfo = getWeekInfo(targetDateForWeek);

    // Sales in current active week
    const currentWeekSales = eligibleSalesForMargins.filter((s) => {
      const d = s.date ? s.date.substring(0, 10) : '';
      return d >= currentWeekInfo.startDate && d <= currentWeekInfo.endDate;
    });

    // Previous week bounds
    const [cy, cm, cd] = currentWeekInfo.startDate.split('-').map(Number);
    const prevMon = new Date(cy, (cm || 1) - 1, (cd || 1) - 7);
    const prevSun = new Date(cy, (cm || 1) - 1, (cd || 1) - 1);
    const prevStartStr = `${prevMon.getFullYear()}-${String(prevMon.getMonth() + 1).padStart(2, '0')}-${String(prevMon.getDate()).padStart(2, '0')}`;
    const prevEndStr = `${prevSun.getFullYear()}-${String(prevSun.getMonth() + 1).padStart(2, '0')}-${String(prevSun.getDate()).padStart(2, '0')}`;

    const prevWeekSales = eligibleSalesForMargins.filter((s) => {
      const d = s.date ? s.date.substring(0, 10) : '';
      return d >= prevStartStr && d <= prevEndStr;
    });

    const calcWeekTotals = (salesList: any[]) => {
      let rev = 0, cst = 0, un = 0;
      salesList.forEach((s) => {
        const fin = getSaleFinancials(s);
        rev += selectedCategory === 'all' ? (s.total || 0) : fin.rev;
        cst += fin.cost;
        un += fin.units;
      });
      const mrg = rev - cst;
      return {
        revenue: Number(rev.toFixed(2)),
        cost: Number(cst.toFixed(2)),
        margin: Number(mrg.toFixed(2)),
        marginPercent: rev > 0 ? Number(((mrg / rev) * 100).toFixed(1)) : 0,
        units: un,
        transactions: salesList.length,
      };
    };

    const currentWeekStats = calcWeekTotals(currentWeekSales);
    const prevWeekStats = calcWeekTotals(prevWeekSales);

    const growthPercent = prevWeekStats.margin > 0
      ? Number((((currentWeekStats.margin - prevWeekStats.margin) / prevWeekStats.margin) * 100).toFixed(1))
      : currentWeekStats.margin > 0 ? 100 : 0;

    // Best week in series
    const bestWeek = series.length > 0 ? [...series].sort((a, b) => b.margin - a.margin)[0] : null;

    // Average weekly margin
    const totalWeeklyMargin = series.reduce((acc, curr) => acc + curr.margin, 0);
    const avgWeeklyMargin = series.length > 0 ? Number((totalWeeklyMargin / series.length).toFixed(2)) : 0;

    return {
      current: {
        ...currentWeekStats,
        label: currentWeekInfo.label,
        weekNumber: currentWeekInfo.weekNumber,
        startDate: currentWeekInfo.startDate,
        endDate: currentWeekInfo.endDate,
        growthPercent,
      },
      series,
      bestWeek,
      avgWeeklyMargin,
    };
  }, [eligibleSalesForMargins, customStartDate, customEndDate, selectedCategory, products]);

  // 3. Margem Mensal (Mês Selecionado / Atual e Série Mensal Mês a Mês)
  const monthlyMarginMetrics = useMemo(() => {
    const monthMap = new Map<
      string,
      {
        monthKey: string;
        label: string;
        revenue: number;
        cost: number;
        margin: number;
        marginPercent: number;
        units: number;
        transactions: number;
      }
    >();

    // Active Month key from filter or today
    const activeMonthKey = (selectedMonth !== 'all' ? selectedMonth : '') || (customEndDate ? customEndDate.substring(0, 7) : getCurrentMonthStr());
    const activeYear = activeMonthKey.substring(0, 4) || '2026';

    // Populate all 12 months for that year
    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, '0');
      const mKey = `${activeYear}-${mStr}`;
      monthMap.set(mKey, {
        monthKey: mKey,
        label: getMonthNamePT(mKey),
        revenue: 0,
        cost: 0,
        margin: 0,
        marginPercent: 0,
        units: 0,
        transactions: 0,
      });
    }

    eligibleSalesForMargins.forEach((sale) => {
      const saleDate = sale.date ? sale.date.substring(0, 10) : '';
      if (!saleDate) return;
      const mKey = saleDate.substring(0, 7);
      const entry = monthMap.get(mKey);
      if (!entry) return;

      const fin = getSaleFinancials(sale);
      entry.revenue += selectedCategory === 'all' ? (sale.total || 0) : fin.rev;
      entry.cost += fin.cost;
      entry.units += fin.units;
      entry.transactions += 1;
    });

    const series = Array.from(monthMap.values())
      .map((m) => {
        const mrg = m.revenue - m.cost;
        return {
          ...m,
          revenue: Number(m.revenue.toFixed(2)),
          cost: Number(m.cost.toFixed(2)),
          margin: Number(mrg.toFixed(2)),
          marginPercent: m.revenue > 0 ? Number(((mrg / m.revenue) * 100).toFixed(1)) : 0,
        };
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    const currMonthEntry = monthMap.get(activeMonthKey) || {
      monthKey: activeMonthKey,
      label: getMonthNamePT(activeMonthKey),
      revenue: 0,
      cost: 0,
      margin: 0,
      marginPercent: 0,
      units: 0,
      transactions: 0,
    };

    // Calculate previous month for growth
    const [ay, am] = activeMonthKey.split('-').map(Number);
    const prevMonthDate = new Date(ay, (am || 1) - 2, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthEntry = monthMap.get(prevMonthKey);

    const currMargin = currMonthEntry.revenue - currMonthEntry.cost;
    const prevMargin = prevMonthEntry ? (prevMonthEntry.revenue - prevMonthEntry.cost) : 0;
    const growthPercent = prevMargin > 0
      ? Number((((currMargin - prevMargin) / prevMargin) * 100).toFixed(1))
      : currMargin > 0 ? 100 : 0;

    // Best month in series
    const bestMonth = series.length > 0 ? [...series].sort((a, b) => b.margin - a.margin)[0] : null;

    // Average monthly margin of active months
    const activeMonthsWithSales = series.filter((m) => m.transactions > 0);
    const totalMonthlyMargin = activeMonthsWithSales.reduce((acc, curr) => acc + curr.margin, 0);
    const avgMonthlyMargin = activeMonthsWithSales.length > 0 ? Number((totalMonthlyMargin / activeMonthsWithSales.length).toFixed(2)) : 0;

    return {
      current: {
        ...currMonthEntry,
        revenue: Number(currMonthEntry.revenue.toFixed(2)),
        cost: Number(currMonthEntry.cost.toFixed(2)),
        margin: Number(currMargin.toFixed(2)),
        marginPercent: currMonthEntry.revenue > 0 ? Number(((currMargin / currMonthEntry.revenue) * 100).toFixed(1)) : 0,
        growthPercent,
      },
      series,
      bestMonth,
      avgMonthlyMargin,
    };
  }, [eligibleSalesForMargins, selectedMonth, customEndDate, selectedCategory, products]);

  // 4. Margem Anual (Ano Vigente / Filtrado e Série Anual)
  const yearlyMarginMetrics = useMemo(() => {
    const yearMap = new Map<
      number,
      {
        year: number;
        revenue: number;
        cost: number;
        margin: number;
        marginPercent: number;
        units: number;
        transactions: number;
      }
    >();

    const activeYear = Number((customEndDate || initialTodayStr).substring(0, 4)) || 2026;

    // Initialize current and previous year
    yearMap.set(activeYear, { year: activeYear, revenue: 0, cost: 0, margin: 0, marginPercent: 0, units: 0, transactions: 0 });
    yearMap.set(activeYear - 1, { year: activeYear - 1, revenue: 0, cost: 0, margin: 0, marginPercent: 0, units: 0, transactions: 0 });

    eligibleSalesForMargins.forEach((sale) => {
      const saleDate = sale.date ? sale.date.substring(0, 10) : '';
      if (!saleDate) return;
      const y = Number(saleDate.substring(0, 4));
      let entry = yearMap.get(y);
      if (!entry) {
        entry = { year: y, revenue: 0, cost: 0, margin: 0, marginPercent: 0, units: 0, transactions: 0 };
        yearMap.set(y, entry);
      }

      const fin = getSaleFinancials(sale);
      entry.revenue += selectedCategory === 'all' ? (sale.total || 0) : fin.rev;
      entry.cost += fin.cost;
      entry.units += fin.units;
      entry.transactions += 1;
    });

    const series = Array.from(yearMap.values())
      .map((y) => {
        const mrg = y.revenue - y.cost;
        return {
          ...y,
          revenue: Number(y.revenue.toFixed(2)),
          cost: Number(y.cost.toFixed(2)),
          margin: Number(mrg.toFixed(2)),
          marginPercent: y.revenue > 0 ? Number(((mrg / y.revenue) * 100).toFixed(1)) : 0,
        };
      })
      .sort((a, b) => b.year - a.year);

    const currYearEntry = yearMap.get(activeYear)!;
    const prevYearEntry = yearMap.get(activeYear - 1);

    const currMargin = currYearEntry.revenue - currYearEntry.cost;
    const prevMargin = prevYearEntry ? (prevYearEntry.revenue - prevYearEntry.cost) : 0;
    const growthPercent = prevMargin > 0
      ? Number((((currMargin - prevMargin) / prevMargin) * 100).toFixed(1))
      : currMargin > 0 ? 100 : 0;

    return {
      current: {
        ...currYearEntry,
        year: activeYear,
        revenue: Number(currYearEntry.revenue.toFixed(2)),
        cost: Number(currYearEntry.cost.toFixed(2)),
        margin: Number(currMargin.toFixed(2)),
        marginPercent: currYearEntry.revenue > 0 ? Number(((currMargin / currYearEntry.revenue) * 100).toFixed(1)) : 0,
        growthPercent,
      },
      series,
    };
  }, [eligibleSalesForMargins, customEndDate, selectedCategory, products]);

  // 5. Margem Agrupada por Categoria de Produtos
  const categoryMarginMetrics = useMemo(() => {
    const catMap = new Map<
      string,
      {
        category: string;
        name: string;
        revenue: number;
        cost: number;
        margin: number;
        marginPercent: number;
        units: number;
        salesCount: number;
      }
    >();

    filteredSales.forEach((sale) => {
      sale.items?.forEach((item: any) => {
        const prod = findProductForSaleItem(item);
        const catKey = prod?.category || item.category || 'Geral';
        if (selectedCategory !== 'all' && catKey !== selectedCategory) return;

        let entry = catMap.get(catKey);
        if (!entry) {
          const catObj = categories.find((c) => c.id === catKey || c.name === catKey);
          entry = {
            category: catKey,
            name: catObj?.name || catKey,
            revenue: 0,
            cost: 0,
            margin: 0,
            marginPercent: 0,
            units: 0,
            salesCount: 0,
          };
          catMap.set(catKey, entry);
        }

        const qty = item.quantity || 0;
        const rev = item.total || ((item.unitPrice || 0) * qty);
        const unitCost =
          prod?.costPrice !== undefined && prod.costPrice !== null
            ? prod.costPrice
            : item.unitPrice
            ? item.unitPrice * 0.5
            : 0;
        const cost = unitCost * qty;

        entry.revenue += rev;
        entry.cost += cost;
        entry.units += qty;
        entry.salesCount += 1;
      });
    });

    const totalPeriodMargin = periodMarginMetrics.margin || 1;

    return Array.from(catMap.values())
      .map((c) => {
        const mrg = c.revenue - c.cost;
        return {
          ...c,
          revenue: Number(c.revenue.toFixed(2)),
          cost: Number(c.cost.toFixed(2)),
          margin: Number(mrg.toFixed(2)),
          marginPercent: c.revenue > 0 ? Number(((mrg / c.revenue) * 100).toFixed(1)) : 0,
          shareOfMargin: Number(((mrg / totalPeriodMargin) * 100).toFixed(1)),
        };
      })
      .sort((a, b) => b.margin - a.margin);
  }, [filteredSales, products, categories, selectedCategory, periodMarginMetrics.margin]);

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
        const prod = findProductForSaleItem(item);
        const key = item.productId || (item.productName ? `${item.sku || 'nosku'}-${item.productName}` : item.sku) || 'Produto';

        let entry = prodMap.get(key);
        if (!entry) {
          const catObj = categories.find((c) => c.id === prod?.category || c.name === prod?.category || c.id === item.category);
          entry = {
            productId: key,
            productName: item.productName || prod?.name || 'Produto',
            sku: item.sku || prod?.sku || 'SKU-000',
            category: catObj?.name || prod?.category || item.category || 'Geral',
            quantity: 0,
            revenue: 0,
            costEstimate: 0,
            unitPrice: item.unitPrice || prod?.price || 0,
          };
          prodMap.set(key, entry);
        }

        const qty = item.quantity || 0;
        const itemRev = item.total || ((item.unitPrice || 0) * qty);
        entry.quantity += qty;
        entry.revenue += itemRev;
        const unitCost =
          prod?.costPrice !== undefined && prod.costPrice !== null
            ? prod.costPrice
            : item.unitPrice
            ? item.unitPrice * 0.5
            : 0;
        const itemCost = unitCost * qty;
        entry.costEstimate += itemCost;
      });
    });

    const list = Array.from(prodMap.values());
    const totalRev = summaryMetrics.totalRevenue || 1;

    return list
      .map((item) => {
        const margin = Number((item.revenue - item.costEstimate).toFixed(2));
        const marginPct =
          item.revenue > 0
            ? Number(((margin / item.revenue) * 100).toFixed(1))
            : 0;
        return {
          ...item,
          revenue: Number(item.revenue.toFixed(2)),
          costEstimate: Number(item.costEstimate.toFixed(2)),
          marginEstimate: margin,
          marginPercent: marginPct,
          shareOfTotal: Number(((item.revenue / totalRev) * 100).toFixed(1)),
        };
      })
      .sort((a, b) => (topProductsMetric === 'revenue' ? b.revenue - a.revenue : b.quantity - a.quantity));
  }, [filteredSales, products, categories, summaryMetrics.totalRevenue, topProductsMetric, findProductForSaleItem]);

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
      const headers = [
        'Data',
        'Transações',
        'Faturação Total',
        'Subtotal',
        'IVA',
        'Custo Estimado (CPV)',
        'Margem Bruta (MT)',
        'Margem %',
        'Unidades Vendidas',
      ];
      const rows = dailySalesData.map((d) => [
        d.date,
        d.transactions,
        d.revenue.toFixed(2),
        d.subtotal.toFixed(2),
        d.tax.toFixed(2),
        d.cost.toFixed(2),
        d.margin.toFixed(2),
        `${d.marginPercent}%`,
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
      csvContent += 'RELATORIO ANALITICO DE VENDAS E MARGENS\n';
      csvContent += `Periodo: ${customStartDate} a ${customEndDate}\n\n`;

      csvContent += 'RESUMO DE MARGENS DO FILTRO ATIVO\n';
      csvContent += ['Faturacao Total', 'Custo Estimado (CPV)', 'Margem Bruta (MT)', 'Margem (%)'].join(';') + '\n';
      csvContent += [
        periodMarginMetrics.revenue.toFixed(2),
        periodMarginMetrics.cost.toFixed(2),
        periodMarginMetrics.margin.toFixed(2),
        `${periodMarginMetrics.marginPercent}%`,
      ].join(';') + '\n\n';

      csvContent += 'MARGEM SEMANAL (SEMANA A SEMANA)\n';
      csvContent += ['Semana', 'Intervalo', 'Faturacao Total', 'Custo Estimado (CPV)', 'Margem Bruta (MT)', 'Margem %', 'Vendas'].join(';') + '\n';
      weeklyMarginMetrics.series.forEach((w) => {
        csvContent += [w.label, `"${w.startDate} a ${w.endDate}"`, w.revenue.toFixed(2), w.cost.toFixed(2), w.margin.toFixed(2), `${w.marginPercent}%`, w.transactions].join(';') + '\n';
      });

      csvContent += '\n\nMARGEM MENSAL (MES A MES)\n';
      csvContent += ['Mes', 'Faturacao Total', 'Custo Estimado (CPV)', 'Margem Bruta (MT)', 'Margem %', 'Vendas'].join(';') + '\n';
      monthlyMarginMetrics.series.forEach((m) => {
        csvContent += [m.label, m.revenue.toFixed(2), m.cost.toFixed(2), m.margin.toFixed(2), `${m.marginPercent}%`, m.transactions].join(';') + '\n';
      });

      csvContent += '\n\nMARGEM ANUAL (ANO A ANO)\n';
      csvContent += ['Ano', 'Faturacao Total', 'Custo Estimado (CPV)', 'Margem Bruta (MT)', 'Margem %', 'Vendas'].join(';') + '\n';
      yearlyMarginMetrics.series.forEach((y) => {
        csvContent += [y.year, y.revenue.toFixed(2), y.cost.toFixed(2), y.margin.toFixed(2), `${y.marginPercent}%`, y.transactions].join(';') + '\n';
      });

      csvContent += '\n\nVOLUME DIARIO DE VENDAS E MARGENS\n';
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
        `relatorio_vendas_e_margens_${customStartDate}_a_${customEndDate}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notify('Relatório de vendas e margens exportado com sucesso em CSV!', 'success');
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
        <div className="pt-3 border-t border-[#262626] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
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

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1 flex items-center space-x-1">
              <Tag className="w-3 h-3 text-[#c5a47e]" />
              <span>Categoria de Artigo</span>
            </label>
            <div className="relative">
              <select
                id="analytics-category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-[#2e2e2e] focus:border-[#c5a47e] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none transition-colors cursor-pointer appearance-none pr-8"
              >
                <option value="all">Todas as Categorias ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
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

      {/* 2.1 Key Profitability & Margin Metrics (Weekly, Monthly, Annual, Filtered Period) */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626]/80 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
                  Rentabilidade & Margens de Lucro Comerciais
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Semanal • Mensal • Anual
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Calculadas com base no Custo dos Produtos Vendidos (CPV) e preço de venda, respeitando os filtros de loja, forma de pagamento e categoria.
              </p>
            </div>
          </div>
          {activeTab !== 'margins' && (
            <button
              onClick={() => setActiveTab('margins')}
              className="text-xs text-[#c5a47e] hover:text-[#d8b892] font-semibold flex items-center space-x-1 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <span>Ver painel analítico de margens</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Margem Semanal */}
          <div className="bg-[#181818] border border-[#2a2a2a] hover:border-emerald-500/40 rounded-lg p-3 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400 flex items-center space-x-1">
                <CalendarRange className="w-3.5 h-3.5 text-emerald-400" />
                <span>Margem Semanal</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono">
                {weeklyMarginMetrics.current.label}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className={`text-xl font-bold tracking-tight ${weeklyMarginMetrics.current.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {weeklyMarginMetrics.current.margin > 0 ? '+' : ''}{formatCurrency(weeklyMarginMetrics.current.margin)}
              </div>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                weeklyMarginMetrics.current.marginPercent >= 30 ? 'bg-emerald-500/20 text-emerald-300' : weeklyMarginMetrics.current.marginPercent >= 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {weeklyMarginMetrics.current.marginPercent}%
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#2a2a2a] space-y-1 text-[11px] text-neutral-400">
              <div className="flex justify-between">
                <span>Faturação da Semana:</span>
                <span className="text-neutral-200 font-medium">{formatCurrency(weeklyMarginMetrics.current.revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Custo (CPV):</span>
                <span className="text-neutral-300">{formatCurrency(weeklyMarginMetrics.current.cost)}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-neutral-400">vs. Semana Anterior:</span>
                <span className={`font-semibold flex items-center text-[10px] ${
                  weeklyMarginMetrics.current.growthPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {weeklyMarginMetrics.current.growthPercent >= 0 ? '+' : ''}{weeklyMarginMetrics.current.growthPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* 2. Margem Mensal */}
          <div className="bg-[#181818] border border-[#2a2a2a] hover:border-emerald-500/40 rounded-lg p-3 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Margem Mensal</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-mono truncate max-w-[110px]">
                {monthlyMarginMetrics.current.label}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className={`text-xl font-bold tracking-tight ${monthlyMarginMetrics.current.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {monthlyMarginMetrics.current.margin > 0 ? '+' : ''}{formatCurrency(monthlyMarginMetrics.current.margin)}
              </div>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                monthlyMarginMetrics.current.marginPercent >= 30 ? 'bg-emerald-500/20 text-emerald-300' : monthlyMarginMetrics.current.marginPercent >= 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {monthlyMarginMetrics.current.marginPercent}%
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#2a2a2a] space-y-1 text-[11px] text-neutral-400">
              <div className="flex justify-between">
                <span>Faturação do Mês:</span>
                <span className="text-neutral-200 font-medium">{formatCurrency(monthlyMarginMetrics.current.revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Custo (CPV):</span>
                <span className="text-neutral-300">{formatCurrency(monthlyMarginMetrics.current.cost)}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-neutral-400">vs. Mês Anterior:</span>
                <span className={`font-semibold flex items-center text-[10px] ${
                  monthlyMarginMetrics.current.growthPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {monthlyMarginMetrics.current.growthPercent >= 0 ? '+' : ''}{monthlyMarginMetrics.current.growthPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* 3. Margem Anual */}
          <div className="bg-[#181818] border border-[#2a2a2a] hover:border-emerald-500/40 rounded-lg p-3 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                <span>Margem Anual</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-mono">
                Ano {yearlyMarginMetrics.current.year}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className={`text-xl font-bold tracking-tight ${yearlyMarginMetrics.current.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {yearlyMarginMetrics.current.margin > 0 ? '+' : ''}{formatCurrency(yearlyMarginMetrics.current.margin)}
              </div>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                yearlyMarginMetrics.current.marginPercent >= 30 ? 'bg-emerald-500/20 text-emerald-300' : yearlyMarginMetrics.current.marginPercent >= 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {yearlyMarginMetrics.current.marginPercent}%
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#2a2a2a] space-y-1 text-[11px] text-neutral-400">
              <div className="flex justify-between">
                <span>Faturação do Ano:</span>
                <span className="text-neutral-200 font-medium">{formatCurrency(yearlyMarginMetrics.current.revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Custo Anual (CPV):</span>
                <span className="text-neutral-300">{formatCurrency(yearlyMarginMetrics.current.cost)}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-neutral-400">Total Transações:</span>
                <span className="font-semibold text-neutral-200 text-[10px]">
                  {yearlyMarginMetrics.current.transactions} vendas
                </span>
              </div>
            </div>
          </div>

          {/* 4. Margem do Filtro Ativo */}
          <div className="bg-[#181818] border border-[#2a2a2a] hover:border-[#c5a47e]/50 rounded-lg p-3 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400 flex items-center space-x-1">
                <Target className="w-3.5 h-3.5 text-[#c5a47e]" />
                <span>Margem no Filtro Ativo</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#c5a47e]/20 text-[#c5a47e]">
                {periodMarginMetrics.transactions} docs
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className={`text-xl font-bold tracking-tight ${periodMarginMetrics.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {periodMarginMetrics.margin > 0 ? '+' : ''}{formatCurrency(periodMarginMetrics.margin)}
              </div>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                {periodMarginMetrics.marginPercent}%
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-[#2a2a2a] space-y-1 text-[11px] text-neutral-400">
              <div className="flex justify-between">
                <span>Faturação Filtrada:</span>
                <span className="text-neutral-200 font-medium">{formatCurrency(periodMarginMetrics.revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Custo Mercadoria:</span>
                <span className="text-neutral-300">{formatCurrency(periodMarginMetrics.cost)}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span>Unidades Vendidas:</span>
                <span className="font-semibold text-neutral-200 text-[10px]">{periodMarginMetrics.units} artigos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section Tabs Navigation Bar with Horizontal Scrollbar & Scroll Controls */}
      <div
        id="analytics-section-tabs-bar"
        className="bg-[#141414] border border-[#262626] rounded-xl p-3 shadow-md shrink-0 space-y-2.5"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#262626]/70 pb-2 px-0.5">
          <div className="flex items-center space-x-2 text-xs text-neutral-400 shrink-0">
            <div className="p-1 rounded bg-[#c5a47e]/15 text-[#c5a47e]">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-neutral-100 text-xs">Vistas do Relatório:</span>
            <span className="text-[10px] text-neutral-400 bg-[#1c1c1c] px-2 py-0.5 rounded-full border border-[#2d2d2d] font-mono">
              6 menus disponíveis
            </span>
          </div>

          {/* Quick Scroll Controls & Roll Bar Indicator */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="text-[11px] text-neutral-400 hidden sm:inline mr-1">
              Rolar menus:
            </span>
            <button
              type="button"
              id="analytics-scroll-tabs-left"
              onClick={() => scrollTabs('left')}
              className="p-1.5 rounded-lg bg-[#1c1c1c] hover:bg-[#282828] text-neutral-300 hover:text-white border border-[#2c2c2c] transition-colors cursor-pointer shadow-sm active:scale-95"
              title="Rolar menus para a esquerda"
              aria-label="Rolar menus para a esquerda"
            >
              <ChevronLeft className="w-4 h-4 text-[#c5a47e]" />
            </button>
            <button
              type="button"
              id="analytics-scroll-tabs-right"
              onClick={() => scrollTabs('right')}
              className="p-1.5 rounded-lg bg-[#1c1c1c] hover:bg-[#282828] text-neutral-300 hover:text-white border border-[#2c2c2c] transition-colors cursor-pointer shadow-sm active:scale-95"
              title="Rolar menus para a direita"
              aria-label="Rolar menus para a direita"
            >
              <ChevronRight className="w-4 h-4 text-[#c5a47e]" />
            </button>
          </div>
        </div>

        {/* Scrollable Container with Visible Barra de Rolamento (Draggable & Accessible) */}
        <div
          ref={tabsContainerRef}
          id="analytics-tabs-scroll-container"
          className="custom-horizontal-scrollbar flex items-center gap-2 overflow-x-auto pb-2.5 pt-0.5 scroll-smooth whitespace-nowrap"
        >
          {[
            {
              id: 'overview',
              label: 'Visão Geral & Volume Diário',
              badge: 'Completo',
              icon: BarChart3,
            },
            {
              id: 'margins',
              label: 'Margens & Rentabilidade',
              badge: 'Semana / Mês / Ano',
              icon: TrendingUp,
            },
            {
              id: 'goals',
              label: 'Metas Comerciais (Motor IA)',
              badge: 'Gemini AI',
              icon: Target,
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
                onClick={() => handleTabSelect(tab.id as any)}
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
              <div className="flex items-center space-x-1 bg-[#1a1a1a] p-1 rounded-lg border border-[#2a2a2a] self-start sm:self-auto flex-wrap gap-1 sm:gap-0">
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
                <button
                  onClick={() => setChartMetric('margin')}
                  className={`px-3 py-1 text-xs rounded font-medium transition-all cursor-pointer ${
                    chartMetric === 'margin'
                      ? 'bg-emerald-500 text-neutral-950 font-bold'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  Lucro & Margem %
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
                      <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                    {chartMetric === 'margin' && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#38bdf8"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) => `${val}%`}
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
                        if (name === 'cost' || name === 'Custo (CPV)') {
                          return [formatCurrency(Number(value)), 'Custo CPV'];
                        }
                        if (name === 'margin' || name === 'Margem Bruta') {
                          return [formatCurrency(Number(value)), 'Margem Bruta (MT)'];
                        }
                        if (name === 'marginPercent' || name === 'Margem %') {
                          return [`${value}%`, 'Margem (%)'];
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
                        if (value === 'cost') return 'Custo Estimado (CPV)';
                        if (value === 'margin') return 'Margem Bruta (MT)';
                        if (value === 'marginPercent') return 'Margem Rentabilidade (%)';
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

                    {/* Margin Metric View */}
                    {chartMetric === 'margin' && (
                      <>
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="margin"
                          name="margin"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#marginGradient)"
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="cost"
                          name="cost"
                          fill="#ef4444"
                          opacity={0.65}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={24}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="marginPercent"
                          name="marginPercent"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#38bdf8' }}
                        />
                      </>
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
                    <th className="py-3 px-4 text-right">Custo (CPV)</th>
                    <th className="py-3 px-4 text-right">Margem Bruta</th>
                    <th className="py-3 px-4 text-right">Margem %</th>
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
                          <td className="py-3 px-4 text-right text-neutral-400 font-mono">
                            {formatCurrency(day.cost)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono">
                            +{formatCurrency(day.margin)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              day.marginPercent >= 30 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {day.marginPercent}%
                            </span>
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

      {/* 4.1 TAB: PROFITABILITY & MARGINS (Weekly, Monthly, Annual, Categories) */}
      {activeTab === 'margins' && (
        <AnalyticsMarginsTab
          weeklyMarginMetrics={weeklyMarginMetrics}
          monthlyMarginMetrics={monthlyMarginMetrics}
          yearlyMarginMetrics={yearlyMarginMetrics}
          periodMarginMetrics={periodMarginMetrics}
          categoryMarginMetrics={categoryMarginMetrics}
          marginViewMode={marginViewMode}
          setMarginViewMode={setMarginViewMode}
          currencySymbol={currentCompany.currencySymbol}
          formatCurrency={formatCurrency}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
        />
      )}

      {/* 4.2 TAB: COMMERCIAL GOALS (AI Engine with Gemini 2.5 / 3.8 Flash) */}
      {activeTab === 'goals' && (
        <AnalyticsSalesGoalsTab
          salesHistory={salesHistory}
          formatCurrency={formatCurrency}
          notify={notify}
        />
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
                      <td
                        className={`py-3 px-4 text-right font-medium ${
                          item.marginEstimate > 0
                            ? 'text-emerald-400'
                            : item.marginEstimate < 0
                            ? 'text-rose-400'
                            : 'text-neutral-400'
                        }`}
                        title={`Faturação: ${formatCurrency(item.revenue)} | Custo Est.: ${formatCurrency(item.costEstimate)} | Margem: ${formatCurrency(item.marginEstimate)}`}
                      >
                        {item.marginEstimate > 0 ? '+' : ''}
                        {formatCurrency(item.marginEstimate)} ({item.marginEstimate > 0 ? '+' : ''}
                        {item.marginPercent}%)
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
