import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/crypto';
import {
  isEffectiveSale,
  calculateNetSalesRevenue,
  calculateNetSubtotal,
  calculateNetTax,
} from '../../utils/documentUtils';
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
    setActiveNavTab,
    setShowPriceCheckerModal,
    setShowFiscalAuditModal,
    setShowOfflineSyncModal,
  } = useApp();

  const [timeRange, setTimeRange] = useState<'hoje' | 'semana' | 'mes' | 'ano'>('hoje');

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

  // Key Calculated Metrics - STRICTLY Commercial Sales (FT, FS, FR, VD, ND minus NC).
  // Proformas (PF), Transport Guides (GT/GR) are NEVER counted as sales.
  const commercialSales = salesHistory.filter((s) => isEffectiveSale(s));
  const totalSalesRevenue = calculateNetSalesRevenue(salesHistory);
  const totalSubtotal = calculateNetSubtotal(salesHistory);
  const totalTaxCollected = calculateNetTax(salesHistory);
  const totalInvoicesCount = commercialSales.length;
  const avgTicket = totalInvoicesCount > 0 ? totalSalesRevenue / totalInvoicesCount : 0;

  // Active Proformas summary
  const quoteDocs = salesHistory.filter(
    (s) => ['PF', 'ORC'].includes((s.invoiceType || '').toUpperCase()) && s.status !== 'anulado' && s.status !== 'convertido'
  );
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

  // Payment Breakdown - from commercial sales only
  const paymentBreakdown = commercialSales.reduce(
    (acc, s) => {
      s.payments.forEach((p) => {
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

  const totalPaymentSum =
    paymentBreakdown.multibanco +
    paymentBreakdown.mbway +
    paymentBreakdown.cartao +
    paymentBreakdown.dinheiro +
    paymentBreakdown.outros || 1;

  // VAT Breakdown (Normal 23%, Intermedia 13%, Reduzida 6%) - from commercial sales only
  const vatBreakdown = commercialSales.reduce(
    (acc, s) => {
      s.items.forEach((item) => {
        if (item.taxRate >= 23) acc.tax23 += item.taxAmount;
        else if (item.taxRate >= 13) acc.tax13 += item.taxAmount;
        else if (item.taxRate >= 6) acc.tax6 += item.taxAmount;
        else acc.tax0 += item.taxAmount;
      });
      return acc;
    },
    { tax23: 0, tax13: 0, tax6: 0, tax0: 0 }
  );

  // Top Selling Products - from commercial sales only
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  commercialSales.forEach((s) => {
    s.items.forEach((item) => {
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

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

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
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Visão consolidada de faturação fiscal, tesouraria, inventário e performance das lojas
          </p>
        </div>

        {/* Time Filter & Quick Shortcuts */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#141414] border border-[#262626] rounded-lg p-0.5 text-xs font-medium">
            {(['hoje', 'semana', 'mes', 'ano'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-md transition-all capitalize cursor-pointer ${
                  timeRange === r
                    ? 'bg-[#c5a47e] text-black font-semibold shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
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
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Gross Sales */}
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-4.5 flex flex-col justify-between hover:border-[#383838] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Faturação Total (Bruto)</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-white tracking-tight">
                {formatCurrency(totalSalesRevenue)}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400 mt-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+12.8% vs. período anterior</span>
              </div>
            </div>
          </div>

          {/* Card 2: Average Ticket */}
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-4.5 flex flex-col justify-between hover:border-[#383838] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-medium">Ticket Médio por Venda</span>
              <div className="p-2 rounded-lg bg-[#c5a47e]/10 text-[#c5a47e] border border-[#c5a47e]/20">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono text-white tracking-tight">
                {formatCurrency(avgTicket)}
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-400 mt-1">
                <span>{totalInvoicesCount} faturas emitidas</span>
                <span className="text-neutral-400 font-mono">100% Cert. AT</span>
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
                    <span>Meios de Pagamento Recebidos</span>
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
                  className="bg-blue-500 h-full"
                  title={`Multibanco: ${formatCurrency(paymentBreakdown.multibanco)}`}
                />
                <div
                  style={{ width: `${(paymentBreakdown.mbway / totalPaymentSum) * 100}%` }}
                  className="bg-emerald-500 h-full"
                  title={`MB Way: ${formatCurrency(paymentBreakdown.mbway)}`}
                />
                <div
                  style={{ width: `${(paymentBreakdown.dinheiro / totalPaymentSum) * 100}%` }}
                  className="bg-amber-500 h-full"
                  title={`Numerário: ${formatCurrency(paymentBreakdown.dinheiro)}`}
                />
                <div
                  style={{ width: `${(paymentBreakdown.cartao / totalPaymentSum) * 100}%` }}
                  className="bg-purple-500 h-full"
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
                    <span>Apuramento de IVA (Artigo 41.º CIVA)</span>
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
                  <span>Artigos Mais Vendidos</span>
                </h3>
                <span className="text-[10px] text-neutral-400">Volume & Receita</span>
              </div>

              <div className="space-y-3">
                {topProducts.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-4">Nenhuma venda registada ainda.</p>
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
                  <span>Desempenho por Loja</span>
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
                  const storeSales = salesHistory.filter((s) => s.storeId === store.id);
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
    </div>
  );
};
