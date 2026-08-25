import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Receipt,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Package,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  FileText,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Customer, Sale } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/crypto';

interface CustomerPurchaseHistoryModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onInitiateCall: (customer: Customer) => void;
}

export const CustomerPurchaseHistoryModal: React.FC<CustomerPurchaseHistoryModalProps> = ({
  customer,
  isOpen,
  onClose,
  onInitiateCall,
}) => {
  const { salesHistory } = useApp();
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'all' | '30d' | '90d' | 'year'>('all');

  if (!isOpen || !customer) return null;

  // Filter sales matching this customer by ID or NIF or exact name match
  const customerSales = salesHistory.filter((s) => {
    if (s.customerId && s.customerId === customer.id) return true;
    if (customer.taxNumber && (s.customerTaxNumber === customer.taxNumber || s.customerNif === customer.taxNumber)) return true;
    if (customer.name && s.customerName && s.customerName.toLowerCase().trim() === customer.name.toLowerCase().trim()) return true;
    return false;
  });

  // Apply period filter
  const now = new Date();
  const filteredSales = customerSales.filter((s) => {
    if (filterPeriod === 'all') return true;
    const saleDate = new Date(s.date);
    const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
    if (filterPeriod === '30d') return diffDays <= 30;
    if (filterPeriod === '90d') return diffDays <= 90;
    if (filterPeriod === 'year') return diffDays <= 365;
    return true;
  });

  // Calculate aggregates
  const totalSalesVolume = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalOrdersCount = filteredSales.length || customer.ordersCount || 0;
  const avgTicket = totalOrdersCount > 0 ? (totalSalesVolume || customer.totalSpent) / totalOrdersCount : 0;
  
  // Compute top products bought by this customer
  const productCountMap: Record<string, { name: string; quantity: number; totalSpent: number }> = {};
  filteredSales.forEach((s) => {
    (s.items || []).forEach((item) => {
      const pId = item.productId || item.productName;
      if (!productCountMap[pId]) {
        productCountMap[pId] = {
          name: item.productName,
          quantity: 0,
          totalSpent: 0,
        };
      }
      productCountMap[pId].quantity += item.quantity || 1;
      productCountMap[pId].totalSpent += item.total || 0;
    });
  });

  const topProducts = Object.values(productCountMap)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  const toggleExpand = (saleId: string) => {
    setExpandedSaleId((prev) => (prev === saleId ? null : saleId));
  };

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        id="customer-purchase-history-modal"
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Histórico de Compras & Faturas</h3>
              <p className="text-xs text-slate-400">
                Relatório analítico e transações de <strong className="text-slate-200">{customer.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onInitiateCall(customer)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              title="Fazer chamada telefónica para o cliente"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Efetuar Chamada</span>
            </button>
            <button
              onClick={handlePrintStatement}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs border border-slate-700 transition-colors"
              title="Imprimir extrato de compras"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Customer Overview Banner */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-800/40 border border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-950/50">
                {customer.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-white text-lg font-bold">{customer.name}</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Tier {customer.loyaltyTier}
                  </span>
                  {customer.segment && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-700 text-slate-300">
                      Segmento: {customer.segment.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400 flex-wrap">
                  <span>NIF: <strong className="text-slate-200">{customer.taxNumber || '999999990'}</strong></span>
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <strong className="text-slate-200">{customer.phone}</strong>
                    </span>
                  )}
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-indigo-400" />
                      <strong className="text-slate-200">{customer.email}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick stats mini-cards */}
            <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 text-center">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Gasto</span>
                <span className="text-sm font-bold text-emerald-400">
                  {formatCurrency(totalSalesVolume || customer.totalSpent || 0)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Nº Faturas</span>
                <span className="text-sm font-bold text-indigo-300">{totalOrdersCount}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Ticket Médio</span>
                <span className="text-sm font-bold text-amber-300">{formatCurrency(avgTicket)}</span>
              </div>
            </div>
          </div>

          {/* Top Products Preference Section */}
          {topProducts.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Artigos Mais Comprados por Este Cliente
                </h5>
                <span className="text-xs text-slate-400">Preferências de Compra</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {topProducts.map((prod, idx) => (
                  <div
                    key={prod.name + idx}
                    className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-lg bg-indigo-900/40 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-200 truncate">{prod.name}</div>
                        <div className="text-[11px] text-slate-400">{prod.quantity} unidades compradas</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 shrink-0 ml-2">
                      {formatCurrency(prod.totalSpent)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Period Filter & Sales List Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                Listagem de Transações & Faturas ({filteredSales.length})
              </h5>

              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                {[
                  { id: 'all', label: 'Todo o Histórico' },
                  { id: '30d', label: 'Últimos 30 Dias' },
                  { id: '90d', label: 'Último Trimestre' },
                  { id: 'year', label: 'Este Ano' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterPeriod(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filterPeriod === tab.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoices List */}
            {filteredSales.length === 0 ? (
              <div className="bg-slate-800/30 border border-slate-700/60 rounded-xl p-8 text-center space-y-2">
                <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-300">Nenhuma fatura encontrada neste período</h4>
                <p className="text-xs text-slate-400">
                  As transações realizadas com este cliente no POS ou Faturação aparecerão automaticamente aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredSales.map((sale) => {
                  const isExpanded = expandedSaleId === sale.id;
                  return (
                    <div
                      key={sale.id}
                      className={`border rounded-xl transition-all overflow-hidden ${
                        isExpanded
                          ? 'bg-slate-800/80 border-indigo-500/50 shadow-md'
                          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Sale Summary Row */}
                      <div
                        onClick={() => toggleExpand(sale.id)}
                        className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-700/40 flex items-center justify-center font-mono text-xs font-bold">
                            {sale.invoiceType || 'FS'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white font-mono">{sale.invoiceNumber}</span>
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                {sale.items?.length || 0} artigos
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(sale.date)}
                              </span>
                              <span>Operador: {sale.operatorName || 'Caixa'}</span>
                              {sale.fiscalHash && (
                                <span className="font-mono text-[10px] text-slate-400 bg-slate-900/60 px-1 rounded">
                                  Assinatura: {sale.fiscalHash.substring(0, 4)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-sm font-bold text-emerald-400 block">
                              {formatCurrency(sale.total)}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {sale.payments?.[0]?.method ? `Pago via ${sale.payments[0].method.toUpperCase()}` : 'Concluído'}
                            </span>
                          </div>

                          <div className="p-1 rounded-lg bg-slate-700/50 text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Item Breakdown */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-700/60 bg-slate-900/40 space-y-3 animate-in fade-in duration-150">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Linhas da Fatura ({sale.items?.length || 0})
                          </div>
                          <div className="space-y-1.5">
                            {sale.items?.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-800/60 border border-slate-700/40"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                                    {idx + 1}
                                  </span>
                                  <span className="text-slate-200 font-medium">{item.productName}</span>
                                  <span className="text-slate-400 font-mono">x{item.quantity}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-400">{formatCurrency(item.unitPrice)}/un</span>
                                  <span className="text-slate-200 font-bold font-mono">
                                    {formatCurrency(item.total)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Invoice Totals summary bar */}
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 font-mono text-slate-300">
                            <span>Subtotal: {formatCurrency(sale.subtotal || sale.total * 0.77)}</span>
                            <span>IVA Total: {formatCurrency(sale.taxTotal || sale.total * 0.23)}</span>
                            <span className="text-emerald-400 font-bold text-sm">Total: {formatCurrency(sale.total)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Total acumulado do cliente: <strong className="text-emerald-400 font-semibold">{formatCurrency(customer.totalSpent || totalSalesVolume)}</strong>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
