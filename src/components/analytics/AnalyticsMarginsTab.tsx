import React from 'react';
import {
  TrendingUp,
  Calendar,
  CalendarRange,
  Target,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Percent,
  BarChart3,
  HelpCircle,
  Award,
  Filter,
  Package,
  ShoppingBag,
  TrendingDown,
  Tag,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';

export interface WeeklyMarginMetricItem {
  key?: string;
  weekKey?: string;
  weekNumber: number;
  year?: number;
  label: string;
  startDate: string;
  endDate: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  transactions: number;
  units: number;
  growthPercent?: number;
}

export interface MonthlyMarginMetricItem {
  key?: string;
  monthKey?: string;
  monthIndex?: number;
  year?: number;
  label: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  transactions: number;
  units: number;
  growthPercent?: number;
}

export interface YearlyMarginMetricItem {
  year: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  transactions: number;
  units: number;
}

export interface CategoryMarginItem {
  category: string;
  name?: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  quantity?: number;
  units?: number;
  salesCount?: number;
  shareOfMargin?: number;
  shareOfTotalMargin?: number;
}

interface AnalyticsMarginsTabProps {
  weeklyMarginMetrics: {
    series: WeeklyMarginMetricItem[];
    current: WeeklyMarginMetricItem;
    bestWeek: WeeklyMarginMetricItem | null;
    avgMarginPercent?: number;
    avgWeeklyMargin?: number;
  };
  monthlyMarginMetrics: {
    series: MonthlyMarginMetricItem[];
    current: MonthlyMarginMetricItem;
    bestMonth: MonthlyMarginMetricItem | null;
    avgMarginPercent?: number;
  };
  yearlyMarginMetrics: {
    series: YearlyMarginMetricItem[];
    current: YearlyMarginMetricItem;
    totalMargin?: number;
  };
  periodMarginMetrics: {
    revenue: number;
    cost: number;
    margin: number;
    marginPercent: number;
    transactions: number;
    units: number;
  };
  categoryMarginMetrics: CategoryMarginItem[];
  marginViewMode: 'summary' | 'weekly' | 'monthly' | 'yearly' | 'categories';
  setMarginViewMode: (mode: 'summary' | 'weekly' | 'monthly' | 'yearly' | 'categories') => void;
  currencySymbol: string;
  formatCurrency: (value: number) => string;
  customStartDate: string;
  customEndDate: string;
}

export const AnalyticsMarginsTab: React.FC<AnalyticsMarginsTabProps> = ({
  weeklyMarginMetrics,
  monthlyMarginMetrics,
  yearlyMarginMetrics,
  periodMarginMetrics,
  categoryMarginMetrics,
  marginViewMode,
  setMarginViewMode,
  currencySymbol,
  formatCurrency,
  customStartDate,
  customEndDate,
}) => {
  const getMarginBadgeClass = (percent: number) => {
    if (percent >= 35) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (percent >= 20) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (percent >= 10) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  };

  const getMarginClassification = (percent: number) => {
    if (percent >= 35) return 'Alta Rentabilidade';
    if (percent >= 20) return 'Rentabilidade Saudável';
    if (percent >= 10) return 'Margem Reduzida';
    return 'Margem Crítica';
  };

  return (
    <div className="space-y-6" id="analytics-margins-container">
      {/* 1. Header & Sub-view Switcher */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-100 flex items-center space-x-2">
                  <span>Análise de Margens & Rentabilidade Comercial</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Acompanhamento minucioso da margem semanal, mensal e anual conforme o filtro selecionado ({customStartDate} a {customEndDate}).
                </p>
              </div>
            </div>
          </div>

          {/* Sub-view switcher with visible horizontal scrollbar */}
          <div className="custom-horizontal-scrollbar flex items-center gap-1.5 bg-[#1a1a1a] p-1.5 rounded-xl border border-[#2a2a2a] overflow-x-auto pb-2 scroll-smooth shrink-0">
            {[
              { id: 'summary', label: 'Resumo Geral', icon: BarChart3 },
              { id: 'weekly', label: 'Margem Semanal', icon: CalendarRange },
              { id: 'monthly', label: 'Margem Mensal', icon: Calendar },
              { id: 'yearly', label: 'Margem Anual', icon: TrendingUp },
              { id: 'categories', label: 'Por Categoria', icon: Package },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = marginViewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`margin-view-${tab.id}`}
                  onClick={() => setMarginViewMode(tab.id as any)}
                  className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500 text-neutral-950 shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-[#252525]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Informative Hint Banner */}
        <div className="mt-4 pt-4 border-t border-[#262626] flex items-start space-x-3 text-xs text-neutral-400">
          <HelpCircle className="w-4 h-4 text-[#c5a47e] shrink-0 mt-0.5" />
          <p>
            <strong className="text-neutral-200">Fórmula de Rentabilidade: </strong>
            Margem Bruta (MT) = Faturação Líquida - Custo dos Produtos Vendidos (CPV). 
            A Margem Percentual (%) reflete a proporção do lucro sobre o total faturado, permitindo avaliar a sustentabilidade do negócio ao longo de semanas, meses e anos.
          </p>
        </div>
      </div>

      {/* 2. SUB-VIEW: SUMMARY */}
      {marginViewMode === 'summary' && (
        <div className="space-y-6">
          {/* Quick KPIs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Semanal */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Semana Ativa</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                  {weeklyMarginMetrics.current.label}
                </span>
              </div>
              <div className={`mt-2 text-2xl font-bold ${weeklyMarginMetrics.current.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {weeklyMarginMetrics.current.margin > 0 ? '+' : ''}{formatCurrency(weeklyMarginMetrics.current.margin)}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Margem %:</span>
                <span className={`px-1.5 py-0.5 rounded border font-semibold text-[11px] ${getMarginBadgeClass(weeklyMarginMetrics.current.marginPercent)}`}>
                  {weeklyMarginMetrics.current.marginPercent}%
                </span>
              </div>
              <div className="mt-3 pt-2 border-t border-[#262626] text-[11px] text-neutral-400 flex justify-between">
                <span>Faturação / CPV:</span>
                <span className="text-neutral-200">{formatCurrency(weeklyMarginMetrics.current.revenue)} / {formatCurrency(weeklyMarginMetrics.current.cost)}</span>
              </div>
            </div>

            {/* Mensal */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-blue-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Mês Ativo</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">
                  {monthlyMarginMetrics.current.label}
                </span>
              </div>
              <div className={`mt-2 text-2xl font-bold ${monthlyMarginMetrics.current.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {monthlyMarginMetrics.current.margin > 0 ? '+' : ''}{formatCurrency(monthlyMarginMetrics.current.margin)}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Margem %:</span>
                <span className={`px-1.5 py-0.5 rounded border font-semibold text-[11px] ${getMarginBadgeClass(monthlyMarginMetrics.current.marginPercent)}`}>
                  {monthlyMarginMetrics.current.marginPercent}%
                </span>
              </div>
              <div className="mt-3 pt-2 border-t border-[#262626] text-[11px] text-neutral-400 flex justify-between">
                <span>Faturação / CPV:</span>
                <span className="text-neutral-200">{formatCurrency(monthlyMarginMetrics.current.revenue)} / {formatCurrency(monthlyMarginMetrics.current.cost)}</span>
              </div>
            </div>

            {/* Anual */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-purple-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Ano Fiscal</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-400">
                  Ano {yearlyMarginMetrics.current.year}
                </span>
              </div>
              <div className={`mt-2 text-2xl font-bold ${yearlyMarginMetrics.current.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {yearlyMarginMetrics.current.margin > 0 ? '+' : ''}{formatCurrency(yearlyMarginMetrics.current.margin)}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Margem %:</span>
                <span className={`px-1.5 py-0.5 rounded border font-semibold text-[11px] ${getMarginBadgeClass(yearlyMarginMetrics.current.marginPercent)}`}>
                  {yearlyMarginMetrics.current.marginPercent}%
                </span>
              </div>
              <div className="mt-3 pt-2 border-t border-[#262626] text-[11px] text-neutral-400 flex justify-between">
                <span>Faturação / CPV:</span>
                <span className="text-neutral-200">{formatCurrency(yearlyMarginMetrics.current.revenue)} / {formatCurrency(yearlyMarginMetrics.current.cost)}</span>
              </div>
            </div>

            {/* Filtro Selecionado */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#c5a47e]/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Total do Filtro</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#c5a47e]/20 text-[#c5a47e]">
                  {periodMarginMetrics.transactions} docs
                </span>
              </div>
              <div className={`mt-2 text-2xl font-bold ${periodMarginMetrics.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {periodMarginMetrics.margin > 0 ? '+' : ''}{formatCurrency(periodMarginMetrics.margin)}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Margem Global %:</span>
                <span className={`px-1.5 py-0.5 rounded border font-semibold text-[11px] ${getMarginBadgeClass(periodMarginMetrics.marginPercent)}`}>
                  {periodMarginMetrics.marginPercent}%
                </span>
              </div>
              <div className="mt-3 pt-2 border-t border-[#262626] text-[11px] text-neutral-400 flex justify-between">
                <span>Total Faturado:</span>
                <span className="text-neutral-200 font-semibold">{formatCurrency(periodMarginMetrics.revenue)}</span>
              </div>
            </div>
          </div>

          {/* Monthly Comparison Chart and Key Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Chart */}
            <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-6 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-base font-semibold text-neutral-100 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Evolução da Margem Mensal no Ano ({yearlyMarginMetrics.current.year})</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Comparativo de Faturação, Custo dos Produtos e Margem Líquida acumulada mês a mês.
                  </p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={monthlyMarginMetrics.series}
                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis
                      dataKey="label"
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
                      tickFormatter={(val) => `${val} ${currencySymbol}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#38bdf8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#333333',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f5f5f5',
                      }}
                      formatter={(value: any, name: string) => {
                        if (name === 'revenue') return [formatCurrency(Number(value)), 'Faturação Total'];
                        if (name === 'cost') return [formatCurrency(Number(value)), 'Custo CPV'];
                        if (name === 'margin') return [formatCurrency(Number(value)), 'Margem Bruta (MT)'];
                        if (name === 'marginPercent') return [`${value}%`, 'Margem %'];
                        return [value, name];
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => {
                        if (value === 'revenue') return 'Faturação Total';
                        if (value === 'cost') return 'Custo CPV';
                        if (value === 'margin') return 'Margem Bruta (MT)';
                        if (value === 'marginPercent') return 'Margem %';
                        return value;
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      name="revenue"
                      fill="#3b82f6"
                      opacity={0.7}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={18}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="cost"
                      name="cost"
                      fill="#ef4444"
                      opacity={0.6}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={18}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="margin"
                      name="margin"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={18}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="marginPercent"
                      name="marginPercent"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#38bdf8' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Highlights Panel */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-6 shadow-md flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100 flex items-center space-x-2">
                  <Award className="w-4 h-4 text-[#c5a47e]" />
                  <span>Destaques de Rentabilidade</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Indicadores de excelência comercial no período filtrado.
                </p>
              </div>

              <div className="space-y-3">
                {/* Melhor Mês */}
                <div className="p-3 bg-[#181818] border border-[#262626] rounded-lg">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Melhor Mês em Lucro:</span>
                    </span>
                    <span className="font-bold text-neutral-200 font-mono">
                      {monthlyMarginMetrics.bestMonth?.label || 'N/D'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className={`text-lg font-bold ${(monthlyMarginMetrics.bestMonth?.margin || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {(monthlyMarginMetrics.bestMonth?.margin || 0) > 0 ? '+' : ''}{formatCurrency(monthlyMarginMetrics.bestMonth?.margin || 0)}
                    </span>
                    <span className="text-xs font-semibold text-neutral-400">
                      Margem: {monthlyMarginMetrics.bestMonth?.marginPercent || 0}%
                    </span>
                  </div>
                </div>

                {/* Melhor Semana */}
                <div className="p-3 bg-[#181818] border border-[#262626] rounded-lg">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="flex items-center space-x-1.5">
                      <CalendarRange className="w-3.5 h-3.5 text-blue-400" />
                      <span>Melhor Semana em Lucro:</span>
                    </span>
                    <span className="font-bold text-neutral-200 font-mono truncate max-w-[130px]">
                      {weeklyMarginMetrics.bestWeek?.label || 'N/D'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className={`text-lg font-bold ${(weeklyMarginMetrics.bestWeek?.margin || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {(weeklyMarginMetrics.bestWeek?.margin || 0) > 0 ? '+' : ''}{formatCurrency(weeklyMarginMetrics.bestWeek?.margin || 0)}
                    </span>
                    <span className="text-xs font-semibold text-neutral-400">
                      Margem: {weeklyMarginMetrics.bestWeek?.marginPercent || 0}%
                    </span>
                  </div>
                </div>

                {/* Margem Média Global */}
                <div className="p-3 bg-[#181818] border border-[#262626] rounded-lg">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Margem Média das Vendas:</span>
                    <span className="font-semibold text-emerald-400">
                      {periodMarginMetrics.marginPercent}%
                    </span>
                  </div>
                  <div className="mt-1.5 w-full bg-[#262626] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${Math.min(periodMarginMetrics.marginPercent, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-neutral-400 text-right">
                    Classificação: <span className="font-semibold text-neutral-200">{getMarginClassification(periodMarginMetrics.marginPercent)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#262626]">
                <button
                  onClick={() => setMarginViewMode('weekly')}
                  className="w-full py-2 px-3 rounded-lg bg-[#1f1f1f] hover:bg-[#282828] text-neutral-200 text-xs font-semibold border border-[#333] transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>Consultar Detalhes Semanais</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUB-VIEW: WEEKLY (SEMANA A SEMANA) */}
      {marginViewMode === 'weekly' && (
        <div className="space-y-6">
          {/* Weekly Chart */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 sm:p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-semibold text-neutral-100 flex items-center space-x-2">
                  <CalendarRange className="w-4 h-4 text-emerald-400" />
                  <span>Evolução da Margem Semanal (Semana a Semana)</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Desempenho consolidado por cada semana do ano com cálculo de Faturação, Custo CPV e Margem Líquida.
                </p>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                {weeklyMarginMetrics.series.length} semanas registadas
              </span>
            </div>

            <div className="h-72 w-full">
              {weeklyMarginMetrics.series.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                  <CalendarRange className="w-8 h-8 text-neutral-600 mb-2" />
                  <p className="text-xs">Não existem dados para exibição no período selecionado.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={weeklyMarginMetrics.series}
                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis
                      dataKey="label"
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
                      tickFormatter={(val) => `${val} ${currencySymbol}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#38bdf8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#333333',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f5f5f5',
                      }}
                      formatter={(value: any, name: string) => {
                        if (name === 'revenue') return [formatCurrency(Number(value)), 'Faturação Total'];
                        if (name === 'cost') return [formatCurrency(Number(value)), 'Custo CPV'];
                        if (name === 'margin') return [formatCurrency(Number(value)), 'Margem Bruta'];
                        if (name === 'marginPercent') return [`${value}%`, 'Margem %'];
                        return [value, name];
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => {
                        if (value === 'revenue') return 'Faturação';
                        if (value === 'cost') return 'Custo CPV';
                        if (value === 'margin') return 'Margem Bruta';
                        if (value === 'marginPercent') return 'Margem %';
                        return value;
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      name="revenue"
                      fill="#3b82f6"
                      opacity={0.65}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="cost"
                      name="cost"
                      fill="#ef4444"
                      opacity={0.6}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="margin"
                      name="margin"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
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
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Weekly Data Table */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">
                  Tabela Detalhada de Margens Semanais
                </h3>
                <p className="text-xs text-neutral-400">
                  Valores calculados estritamente com base nas vendas e custos das respetivas semanas.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1a1a1a] text-neutral-400 uppercase tracking-wider font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3 px-4">Semana</th>
                    <th className="py-3 px-4">Período (Início - Fim)</th>
                    <th className="py-3 px-4 text-center">Vendas</th>
                    <th className="py-3 px-4 text-center">Unidades</th>
                    <th className="py-3 px-4 text-right">Faturação Total</th>
                    <th className="py-3 px-4 text-right">Custo Estimado (CPV)</th>
                    <th className="py-3 px-4 text-right">Margem Bruta (MT)</th>
                    <th className="py-3 px-4 text-right">Margem %</th>
                    <th className="py-3 px-4 text-center">Classificação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]/60">
                  {weeklyMarginMetrics.series.map((week) => (
                    <tr
                      key={week.key}
                      className="hover:bg-[#1f1f1f]/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-neutral-200 font-mono">
                        {week.label}
                      </td>
                      <td className="py-3 px-4 text-neutral-400">
                        {week.startDate} a {week.endDate}
                      </td>
                      <td className="py-3 px-4 text-center text-neutral-300">
                        {week.transactions}
                      </td>
                      <td className="py-3 px-4 text-center text-neutral-300">
                        {week.units}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-neutral-100">
                        {formatCurrency(week.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-400 font-mono">
                        {formatCurrency(week.cost)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold font-mono ${week.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {week.margin > 0 ? '+' : ''}{formatCurrency(week.margin)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${getMarginBadgeClass(week.marginPercent)}`}>
                          {week.marginPercent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] text-neutral-400">
                          {getMarginClassification(week.marginPercent)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-VIEW: MONTHLY (MÊS A MÊS) */}
      {marginViewMode === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly Table */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">
                  Desempenho de Margem Mês a Mês ({yearlyMarginMetrics.current.year})
                </h3>
                <p className="text-xs text-neutral-400">
                  Visão consolidada mensal de faturação, custo de mercadoria e lucro comercial.
                </p>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                12 meses do ano fiscal
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1a1a1a] text-neutral-400 uppercase tracking-wider font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3 px-4">Mês</th>
                    <th className="py-3 px-4 text-center">Transações</th>
                    <th className="py-3 px-4 text-center">Unidades</th>
                    <th className="py-3 px-4 text-right">Faturação Total</th>
                    <th className="py-3 px-4 text-right">Custo CPV</th>
                    <th className="py-3 px-4 text-right">Margem Bruta (MT)</th>
                    <th className="py-3 px-4 text-right">Margem %</th>
                    <th className="py-3 px-4 text-center">Variação vs Mês Anterior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]/60">
                  {monthlyMarginMetrics.series.map((month) => (
                    <tr
                      key={month.key}
                      className="hover:bg-[#1f1f1f]/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-neutral-200">
                        {month.label}
                      </td>
                      <td className="py-3 px-4 text-center text-neutral-300">
                        {month.transactions}
                      </td>
                      <td className="py-3 px-4 text-center text-neutral-300">
                        {month.units}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-neutral-100">
                        {formatCurrency(month.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-400 font-mono">
                        {formatCurrency(month.cost)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold font-mono ${month.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {month.margin > 0 ? '+' : ''}{formatCurrency(month.margin)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${getMarginBadgeClass(month.marginPercent)}`}>
                          {month.marginPercent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {month.growthPercent !== 0 ? (
                          <span
                            className={`inline-flex items-center space-x-0.5 text-[11px] font-semibold ${
                              month.growthPercent > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {month.growthPercent > 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            <span>{month.growthPercent > 0 ? '+' : ''}{month.growthPercent}%</span>
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-VIEW: YEARLY (ANO A ANO) */}
      {marginViewMode === 'yearly' && (
        <div className="space-y-6">
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">
                  Evolução da Margem Anual (Ano a Ano)
                </h3>
                <p className="text-xs text-neutral-400">
                  Comparativo multianual de faturamento, custos de aquisição e lucro comercial total.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1a1a1a] text-neutral-400 uppercase tracking-wider font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3 px-4">Ano Fiscal</th>
                    <th className="py-3 px-4 text-center">Vendas Totais</th>
                    <th className="py-3 px-4 text-center">Unidades</th>
                    <th className="py-3 px-4 text-right">Faturação Anual</th>
                    <th className="py-3 px-4 text-right">Custo Total (CPV)</th>
                    <th className="py-3 px-4 text-right">Margem Bruta (MT)</th>
                    <th className="py-3 px-4 text-right">Margem %</th>
                    <th className="py-3 px-4 text-center">Classificação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]/60">
                  {yearlyMarginMetrics.series.map((year) => (
                    <tr
                      key={year.year}
                      className="hover:bg-[#1f1f1f]/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-neutral-100 text-sm">
                        {year.year}
                      </td>
                      <td className="py-3 px-4 text-center text-neutral-300">
                        {year.transactions} vendas
                      </td>
                      <td className="py-3 px-4 text-center text-neutral-300">
                        {year.units}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-neutral-100">
                        {formatCurrency(year.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-400 font-mono">
                        {formatCurrency(year.cost)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold font-mono text-sm ${year.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {year.margin > 0 ? '+' : ''}{formatCurrency(year.margin)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded border font-bold text-xs ${getMarginBadgeClass(year.marginPercent)}`}>
                          {year.marginPercent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs text-neutral-300">
                          {getMarginClassification(year.marginPercent)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-VIEW: CATEGORIES (POR CATEGORIA) */}
      {marginViewMode === 'categories' && (
        <div className="space-y-6">
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">
                  Rentabilidade e Margem por Categoria de Produtos
                </h3>
                <p className="text-xs text-neutral-400">
                  Identifique quais categorias geram maior retorno financeiro para o negócio.
                </p>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                {categoryMarginMetrics.length} categorias
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1a1a1a] text-neutral-400 uppercase tracking-wider font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-center">Qtd Vendida</th>
                    <th className="py-3 px-4 text-right">Faturação</th>
                    <th className="py-3 px-4 text-right">Custo (CPV)</th>
                    <th className="py-3 px-4 text-right">Margem Bruta (MT)</th>
                    <th className="py-3 px-4 text-right">Margem %</th>
                    <th className="py-3 px-4 text-right">Quota da Margem Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]/60">
                  {categoryMarginMetrics.map((cat) => (
                    <tr
                      key={cat.category}
                      className="hover:bg-[#1f1f1f]/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-neutral-200 flex items-center space-x-2">
                        <Tag className="w-3.5 h-3.5 text-[#c5a47e]" />
                        <span>{cat.category}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-neutral-300">
                        {cat.quantity} un
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-neutral-200">
                        {formatCurrency(cat.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-400 font-mono">
                        {formatCurrency(cat.cost)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold font-mono ${cat.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {cat.margin > 0 ? '+' : ''}{formatCurrency(cat.margin)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${getMarginBadgeClass(cat.marginPercent)}`}>
                          {cat.marginPercent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-300 font-medium">
                        {cat.shareOfTotalMargin}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
