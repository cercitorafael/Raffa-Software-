import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Crown,
  TrendingUp,
  Search,
  Filter,
  Phone,
  ShoppingBag,
  ArrowUpDown,
  Download,
  Calendar,
  CreditCard,
  UserCheck,
  Star,
  Receipt,
  ExternalLink,
  DollarSign,
  PieChart,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { Customer, Sale } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/crypto';

interface TopBuyersReportProps {
  onSelectCustomer: (customer: Customer) => void;
  onInitiateCall: (customer: Customer) => void;
  onViewHistory: (customer: Customer) => void;
}

export const TopBuyersReport: React.FC<TopBuyersReportProps> = ({
  onSelectCustomer,
  onInitiateCall,
  onViewHistory,
}) => {
  const { customers, salesHistory, addLoyaltyPoints, notify } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'Bronze' | 'Prata' | 'Ouro' | 'Platina'>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | '30d' | '90d' | 'year'>('all');
  const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'avgTicket' | 'points'>('spent');

  // Compute detailed purchasing analytics for each customer
  const enrichedCustomers = useMemo(() => {
    const now = new Date();

    return customers.map((customer) => {
      // Find all sales for this customer
      const matchingSales = salesHistory.filter((s) => {
        if (s.customerId && s.customerId === customer.id) return true;
        if (customer.taxNumber && (s.customerTaxNumber === customer.taxNumber || s.customerNif === customer.taxNumber)) return true;
        if (customer.name && s.customerName && s.customerName.toLowerCase().trim() === customer.name.toLowerCase().trim()) return true;
        return false;
      });

      // Filter by period if needed
      const periodSales = matchingSales.filter((s) => {
        if (periodFilter === 'all') return true;
        const sDate = new Date(s.date);
        const diffDays = (now.getTime() - sDate.getTime()) / (1000 * 3600 * 24);
        if (periodFilter === '30d') return diffDays <= 30;
        if (periodFilter === '90d') return diffDays <= 90;
        if (periodFilter === 'year') return diffDays <= 365;
        return true;
      });

      const totalFromSales = periodSales.reduce((acc, s) => acc + (s.total || 0), 0);
      const effectiveTotalSpent = periodFilter === 'all' 
        ? Math.max(customer.totalSpent || 0, totalFromSales) 
        : totalFromSales;

      const effectiveOrdersCount = periodFilter === 'all'
        ? Math.max(customer.ordersCount || 0, periodSales.length)
        : periodSales.length;

      const avgTicket = effectiveOrdersCount > 0 ? effectiveTotalSpent / effectiveOrdersCount : 0;

      // Find last purchase date
      const sortedSales = [...matchingSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastPurchaseDate = sortedSales[0]?.date || customer.createdAt;

      // Identify top purchased category or product
      const productCounts: Record<string, number> = {};
      matchingSales.forEach((s) => {
        (s.items || []).forEach((item) => {
          const name = item.productName || 'Artigo';
          productCounts[name] = (productCounts[name] || 0) + (item.quantity || 1);
        });
      });

      const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Vários Artigos';

      return {
        ...customer,
        calculatedTotalSpent: effectiveTotalSpent,
        calculatedOrdersCount: effectiveOrdersCount,
        calculatedAvgTicket: avgTicket,
        lastPurchaseDate,
        topProduct,
        salesCount: matchingSales.length,
      };
    });
  }, [customers, salesHistory, periodFilter]);

  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    let list = enrichedCustomers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.taxNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTier =
        tierFilter === 'all' ||
        c.loyaltyTier?.toLowerCase() === tierFilter.toLowerCase();

      return matchesSearch && matchesTier;
    });

    list.sort((a, b) => {
      if (sortBy === 'spent') return b.calculatedTotalSpent - a.calculatedTotalSpent;
      if (sortBy === 'orders') return b.calculatedOrdersCount - a.calculatedOrdersCount;
      if (sortBy === 'avgTicket') return b.calculatedAvgTicket - a.calculatedAvgTicket;
      if (sortBy === 'points') return (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0);
      return 0;
    });

    return list;
  }, [enrichedCustomers, searchTerm, tierFilter, sortBy]);

  // Key KPI metrics
  const totalVolume = enrichedCustomers.reduce((acc, c) => acc + c.calculatedTotalSpent, 0);
  const totalOrders = enrichedCustomers.reduce((acc, c) => acc + c.calculatedOrdersCount, 0);
  const topCustomer = [...enrichedCustomers].sort((a, b) => b.calculatedTotalSpent - a.calculatedTotalSpent)[0];
  const overallAvgTicket = totalOrders > 0 ? totalVolume / totalOrders : 0;
  const vipCount = customers.filter((c) => c.loyaltyTier === 'Ouro' || c.loyaltyTier === 'Platina' || c.segment === 'vip').length;

  const maxSpent = topCustomer?.calculatedTotalSpent || 1;

  // Export report to CSV
  const handleExportCSV = () => {
    const headers = [
      'Posicao',
      'Nome do Cliente',
      'NIF',
      'Telefone',
      'Email',
      'Escalao Fidelizacao',
      'Total Compras (EUR)',
      'Numero de Encomendas',
      'Ticket Medio (EUR)',
      'Pontos Fidelidade',
      'Artigo Mais Comprado',
      'Ultima Compra',
    ];

    const rows = filteredAndSortedCustomers.map((c, idx) => [
      idx + 1,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.taxNumber}"`,
      `"${c.phone}"`,
      `"${c.email}"`,
      `"${c.loyaltyTier}"`,
      c.calculatedTotalSpent.toFixed(2),
      c.calculatedOrdersCount,
      c.calculatedAvgTicket.toFixed(2),
      c.loyaltyPoints,
      `"${c.topProduct.replace(/"/g, '""')}"`,
      `"${c.lastPurchaseDate}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_top_clientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Relatório de Melhores Clientes exportado em CSV com sucesso!', 'success');
  };

  const handleBonusPoints = (customer: Customer) => {
    addLoyaltyPoints(customer.id, 50);
    notify(`Atribuídos +50 pontos de bónus VIP a ${customer.name}!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Relatório de Clientes com Mais Compras (Top Buyers)
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Análise aprofundada de faturação, frequência, ticket médio e preferências de compra dos clientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-top-customers-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Volume */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400">Volume Total Identificado</span>
            <div className="text-xl font-bold text-white mt-0.5">{formatCurrency(totalVolume)}</div>
            <span className="text-[11px] text-emerald-400 font-medium">100% transações auditadas</span>
          </div>
        </div>

        {/* Top #1 Customer */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Crown className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <span className="text-xs font-medium text-slate-400">Cliente Nº 1 em Vendas</span>
            <div className="text-sm font-bold text-white truncate mt-0.5">
              {topCustomer ? topCustomer.name : 'N/D'}
            </div>
            <span className="text-[11px] text-amber-400 font-bold">
              {topCustomer ? formatCurrency(topCustomer.calculatedTotalSpent) : '—'}
            </span>
          </div>
        </div>

        {/* Average Ticket */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400">Ticket Médio por Compra</span>
            <div className="text-xl font-bold text-white mt-0.5">{formatCurrency(overallAvgTicket)}</div>
            <span className="text-[11px] text-slate-400">{totalOrders} compras registadas</span>
          </div>
        </div>

        {/* VIP / Gold Tiers */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400">Clientes VIP / Ouro / Platina</span>
            <div className="text-xl font-bold text-white mt-0.5">{vipCount} Clientes</div>
            <span className="text-[11px] text-violet-300 font-medium">Programa de Fidelização</span>
          </div>
        </div>
      </div>

      {/* Top 3 Visual Podium Cards */}
      {filteredAndSortedCustomers.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* #2 Silver */}
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/70 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-700 text-slate-200 border border-slate-500 flex items-center justify-center font-bold text-lg shadow-md">
                  🥈 #2
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{filteredAndSortedCustomers[1]?.name}</h4>
                  <span className="text-xs text-slate-400">NIF: {filteredAndSortedCustomers[1]?.taxNumber}</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                Tier {filteredAndSortedCustomers[1]?.loyaltyTier}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Comprado</span>
                <span className="text-base font-bold text-slate-200">
                  {formatCurrency(filteredAndSortedCustomers[1]?.calculatedTotalSpent || 0)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onInitiateCall(filteredAndSortedCustomers[1])}
                  className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition-all"
                  title="Fazer chamada para o cliente"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onViewHistory(filteredAndSortedCustomers[1])}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                >
                  Ver Faturas
                </button>
              </div>
            </div>
          </div>

          {/* #1 Gold - Champion */}
          <div className="bg-gradient-to-b from-amber-950/40 via-slate-800 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between shadow-xl shadow-amber-950/20">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 text-[10px] font-extrabold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
              <Crown className="w-3 h-3" /> Top Comprador
            </div>

            <div className="flex items-start justify-between mt-1">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-extrabold text-xl shadow-lg shadow-amber-900/40">
                  🥇 #1
                </div>
                <div>
                  <h4 className="font-bold text-white text-base leading-tight">{filteredAndSortedCustomers[0]?.name}</h4>
                  <span className="text-xs text-amber-200/80">NIF: {filteredAndSortedCustomers[0]?.taxNumber}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-amber-300/80 block font-medium">Volume Faturado</span>
                <span className="text-lg font-extrabold text-amber-400">
                  {formatCurrency(filteredAndSortedCustomers[0]?.calculatedTotalSpent || 0)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onInitiateCall(filteredAndSortedCustomers[0])}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all"
                  title="Fazer chamada direta para o Top Comprador"
                >
                  <Phone className="w-4 h-4" />
                  <span>Ligar Agora</span>
                </button>
                <button
                  onClick={() => onViewHistory(filteredAndSortedCustomers[0])}
                  className="px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-semibold transition-all"
                >
                  Histórico
                </button>
              </div>
            </div>
          </div>

          {/* #3 Bronze */}
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/70 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-900/50 text-amber-400 border border-amber-700/60 flex items-center justify-center font-bold text-lg shadow-md">
                  🥉 #3
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{filteredAndSortedCustomers[2]?.name}</h4>
                  <span className="text-xs text-slate-400">NIF: {filteredAndSortedCustomers[2]?.taxNumber}</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                Tier {filteredAndSortedCustomers[2]?.loyaltyTier}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Comprado</span>
                <span className="text-base font-bold text-amber-300">
                  {formatCurrency(filteredAndSortedCustomers[2]?.calculatedTotalSpent || 0)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onInitiateCall(filteredAndSortedCustomers[2])}
                  className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition-all"
                  title="Fazer chamada para o cliente"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onViewHistory(filteredAndSortedCustomers[2])}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                >
                  Ver Faturas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search Control Bar */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, NIF ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Tier & Period & Sort Filters */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          {/* Period */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs">
            <span className="text-[11px] text-slate-400 px-2 font-medium">Período:</span>
            {[
              { id: 'all', label: 'Todo' },
              { id: '30d', label: '30 Dias' },
              { id: '90d', label: 'Trimestre' },
              { id: 'year', label: 'Ano' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodFilter(p.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  periodFilter === p.id
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="spent" className="bg-slate-900">Maior Valor Gasto (€)</option>
              <option value="orders" className="bg-slate-900">Mais Encomendas (Qtd)</option>
              <option value="avgTicket" className="bg-slate-900">Maior Ticket Médio</option>
              <option value="points" className="bg-slate-900">Mais Pontos Fidelidade</option>
            </select>
          </div>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Todos os Escalões</option>
            <option value="Platina">Platina</option>
            <option value="Ouro">Ouro</option>
            <option value="Prata">Prata</option>
            <option value="Bronze">Bronze</option>
          </select>
        </div>
      </div>

      {/* Main Ranking Table */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Rank</th>
                <th className="py-3.5 px-4">Cliente & Contacto</th>
                <th className="py-3.5 px-4 text-center">Escalão / NIF</th>
                <th className="py-3.5 px-4 text-right">Total Faturado</th>
                <th className="py-3.5 px-4 text-center">Compras</th>
                <th className="py-3.5 px-4 text-right">Ticket Médio</th>
                <th className="py-3.5 px-4">Artigo Favorito</th>
                <th className="py-3.5 px-4 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredAndSortedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAndSortedCustomers.map((customer, index) => {
                  const spendPercentage = Math.min(100, Math.round((customer.calculatedTotalSpent / maxSpent) * 100));
                  
                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-750/50 transition-colors group"
                    >
                      {/* Rank Number with Badge */}
                      <td className="py-3.5 px-4 text-center font-bold">
                        {index === 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-extrabold shadow-sm">
                            1º
                          </span>
                        ) : index === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-300 text-slate-950 font-extrabold shadow-sm">
                            2º
                          </span>
                        ) : index === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-800 text-amber-200 font-extrabold shadow-sm">
                            3º
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">#{index + 1}</span>
                        )}
                      </td>

                      {/* Customer info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                            {customer.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <button
                              onClick={() => onSelectCustomer(customer)}
                              className="font-bold text-white hover:text-indigo-400 text-sm text-left transition-colors block"
                            >
                              {customer.name}
                            </button>
                            <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                              {customer.phone ? (
                                <button
                                  onClick={() => onInitiateCall(customer)}
                                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                                  title="Clique para efetuar chamada"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{customer.phone}</span>
                                </button>
                              ) : (
                                <span>Sem telefone</span>
                              )}
                              <span>•</span>
                              <span>{customer.city || 'Portugal'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Loyalty Tier & Tax Number */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              customer.loyaltyTier === 'Platina'
                                ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                                : customer.loyaltyTier === 'Ouro'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : customer.loyaltyTier === 'Prata'
                                ? 'bg-slate-300/20 text-slate-200 border-slate-300/30'
                                : 'bg-amber-900/20 text-amber-400 border-amber-900/30'
                            }`}
                          >
                            Tier {customer.loyaltyTier}
                          </span>
                          <div className="font-mono text-[11px] text-slate-400">{customer.taxNumber}</div>
                        </div>
                      </td>

                      {/* Total Spent with Progress Bar */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="space-y-1">
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            {formatCurrency(customer.calculatedTotalSpent)}
                          </span>
                          <div className="w-24 ml-auto bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full"
                              style={{ width: `${spendPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Orders Count */}
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-200">
                        {customer.calculatedOrdersCount}
                        <span className="text-[10px] text-slate-400 block font-normal">faturas</span>
                      </td>

                      {/* Average Ticket */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-300">
                        {formatCurrency(customer.calculatedAvgTicket)}
                      </td>

                      {/* Top Product / Preference */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/40 text-[11px] inline-block max-w-[160px] truncate">
                          {customer.topProduct}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Call Button */}
                          <button
                            id={`call-cust-btn-${customer.id}`}
                            onClick={() => onInitiateCall(customer)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition-all text-xs font-medium"
                            title="Efetuar chamada telefónica via CRM"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Ligar</span>
                          </button>

                          {/* View History Button */}
                          <button
                            id={`history-cust-btn-${customer.id}`}
                            onClick={() => onViewHistory(customer)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-all text-xs font-medium"
                            title="Ver histórico detalhado de compras e faturas"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Faturas</span>
                          </button>

                          {/* Bonus VIP Points */}
                          <button
                            onClick={() => handleBonusPoints(customer)}
                            className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 transition-all"
                            title="Atribuir +50 pontos bónus VIP"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
