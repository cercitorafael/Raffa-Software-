import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { OmnichannelOrder, OmnichannelOrderStatus } from '../../types';
import { formatCurrency } from '../../utils/crypto';
import {
  Package,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  FileText,
  Printer,
  Sparkles,
  Layers,
  ChevronRight,
  Receipt,
  User,
} from 'lucide-react';

export const OmnichannelOrdersModule: React.FC = () => {
  const {
    omnichannelOrders,
    updateOrderStatus,
    convertOrderToSale,
    stores,
    setActiveNavTab,
  } = useApp();

  const [selectedOrder, setSelectedOrder] = useState<OmnichannelOrder | null>(
    omnichannelOrders[0] || null
  );
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPackingSlip, setShowPackingSlip] = useState<boolean>(false);

  const filteredOrders = omnichannelOrders.filter((ord) => {
    const matchesStatus = statusFilter === 'todos' || ord.status === statusFilter;
    const matchesQuery =
      ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customerPhone.includes(searchQuery) ||
      ord.customerNif.includes(searchQuery);
    return matchesStatus && matchesQuery;
  });

  const getStatusBadge = (status: OmnichannelOrderStatus) => {
    switch (status) {
      case 'pendente':
        return {
          label: 'Pendente',
          classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icon: Clock,
        };
      case 'em_preparacao':
        return {
          label: 'Em Preparação',
          classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          icon: Package,
        };
      case 'pronto_levantamento':
        return {
          label: 'Pronto p/ Levantamento',
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2,
        };
      case 'expedido':
        return {
          label: 'Expedido',
          classes: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          icon: Truck,
        };
      case 'concluido':
        return {
          label: 'Faturado / Concluído',
          classes: 'bg-neutral-800 text-neutral-400 border-neutral-700',
          icon: Receipt,
        };
      case 'cancelado':
        return {
          label: 'Cancelado',
          classes: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          icon: Clock,
        };
      default:
        return {
          label: status,
          classes: 'bg-neutral-800 text-neutral-400 border-neutral-700',
          icon: Clock,
        };
    }
  };

  const handleConvertToSale = (order: OmnichannelOrder) => {
    const sale = convertOrderToSale(order.id);
    if (sale) {
      // Refresh current selected order
      const updated = omnichannelOrders.find((o) => o.id === order.id);
      if (updated) {
        setSelectedOrder({ ...updated, status: 'concluido', invoiceId: sale.id });
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-[#e5e5e5] overflow-hidden">
      {/* Top Header */}
      <div className="bg-[#0f0f0f] border-b border-[#262626] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-lg font-bold text-white tracking-wide">
              Gestão de Encomendas
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              Click & Collect & E-Commerce
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Processamento de pedidos online, separação em loja e faturação fiscal integrada no POS
          </p>
        </div>

        {/* Stats Mini Bar */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#262626] flex items-center space-x-2">
            <span className="text-neutral-400">Total Encomendas:</span>
            <span className="font-mono font-bold text-white">{omnichannelOrders.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-emerald-400">
            <span>Prontas p/ Entrega:</span>
            <span className="font-mono font-bold">
              {omnichannelOrders.filter((o) => o.status === 'pronto_levantamento').length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Workspace: Left List + Right Details */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Orders List */}
        <div className="w-full sm:w-96 md:w-[420px] bg-[#0c0c0c] border-r border-[#262626] flex flex-col shrink-0">
          {/* Filter and Search */}
          <div className="p-3.5 border-b border-[#262626] space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquisar por nº, cliente ou NIF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#c5a47e]"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'pendente', label: 'Pendentes' },
                { id: 'em_preparacao', label: 'Em Preparação' },
                { id: 'pronto_levantamento', label: 'Prontos' },
                { id: 'concluido', label: 'Concluídos' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === pill.id
                      ? 'bg-[#c5a47e] text-black font-semibold shadow-xs'
                      : 'bg-[#141414] text-neutral-400 hover:text-white border border-[#262626]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1f1f1f]">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs">
                Nenhuma encomenda encontrada com os filtros selecionados.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const badge = getStatusBadge(order.status);
                const BadgeIcon = badge.icon;
                const isSelected = selectedOrder?.id === order.id;

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#c5a47e]/10 border-l-4 border-[#c5a47e]'
                        : 'hover:bg-[#121212]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-white">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.classes}`}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-neutral-200 truncate">
                        {order.customerName}
                      </span>
                      <span className="font-mono font-bold text-[#c5a47e]">
                        {formatCurrency(order.total)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="capitalize">
                        {order.deliveryType === 'levantamento_loja'
                          ? '🛍️ Click & Collect'
                          : '🚚 Entrega Domicílio'}
                      </span>
                      <span>{order.items.length} artigos</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Order Detail View */}
        {selectedOrder ? (
          <div className="flex-1 flex flex-col bg-[#0f0f0f] overflow-y-auto">
            {/* Header Actions */}
            <div className="p-6 border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212]">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-bold font-mono text-white">
                    {selectedOrder.orderNumber}
                  </h2>
                  {(() => {
                    const badge = getStatusBadge(selectedOrder.status);
                    const Icon = badge.icon;
                    return (
                      <span
                        className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-bold border ${badge.classes}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{badge.label}</span>
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Criada a {new Date(selectedOrder.createdAt).toLocaleString('pt-PT')} &bull; Canal:{' '}
                  <span className="text-white font-medium capitalize">{selectedOrder.channel}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPackingSlip(!showPackingSlip)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#171717] hover:bg-[#202020] border border-[#262626] text-neutral-300 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Guia de Separação</span>
                </button>

                {selectedOrder.status !== 'concluido' && selectedOrder.status !== 'cancelado' && (
                  <button
                    onClick={() => handleConvertToSale(selectedOrder)}
                    className="flex items-center space-x-2 px-4 py-2 bg-[#c5a47e] hover:bg-[#d4b896] text-black font-bold rounded-lg text-xs tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Faturar & Concluir no POS</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Details Body */}
            <div className="p-6 space-y-6 max-w-5xl">
              {/* Order Status Progression Pipeline */}
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3">
                  Progresso do Pedido
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'pendente')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                      selectedOrder.status === 'pendente'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                        : 'bg-[#1a1a1a] text-neutral-400 border-[#262626] hover:text-white'
                    }`}
                  >
                    1. Pendente
                  </button>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'em_preparacao')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                      selectedOrder.status === 'em_preparacao'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-xs'
                        : 'bg-[#1a1a1a] text-neutral-400 border-[#262626] hover:text-white'
                    }`}
                  >
                    2. Em Separação
                  </button>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'pronto_levantamento')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                      selectedOrder.status === 'pronto_levantamento'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                        : 'bg-[#1a1a1a] text-neutral-400 border-[#262626] hover:text-white'
                    }`}
                  >
                    3. Pronto p/ Entrega
                  </button>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'concluido')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                      selectedOrder.status === 'concluido'
                        ? 'bg-neutral-700 text-white border-neutral-600 shadow-xs'
                        : 'bg-[#1a1a1a] text-neutral-400 border-[#262626] hover:text-white'
                    }`}
                  >
                    4. Faturado / Entregue
                  </button>
                </div>
              </div>

              {/* Customer and Delivery Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Info */}
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>Dados do Cliente</span>
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Nome:</span>
                      <span className="font-semibold text-white">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">NIF:</span>
                      <span className="font-mono text-neutral-200">{selectedOrder.customerNif}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Telefone:</span>
                      <span className="text-neutral-200">{selectedOrder.customerPhone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Email:</span>
                      <span className="text-neutral-200">{selectedOrder.customerEmail}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery & Pickup Info */}
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Modalidade de Entrega</span>
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Tipo:</span>
                      <span className="font-semibold text-white capitalize">
                        {selectedOrder.deliveryType.replace('_', ' ')}
                      </span>
                    </div>
                    {selectedOrder.pickupStoreId && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Loja de Levantamento:</span>
                        <span className="text-neutral-200">
                          {stores.find((s) => s.id === selectedOrder.pickupStoreId)?.name ||
                            'Loja Principal'}
                        </span>
                      </div>
                    )}
                    {selectedOrder.deliveryAddress && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Morada:</span>
                        <span className="text-neutral-200">
                          {selectedOrder.deliveryAddress}, {selectedOrder.deliveryCity}
                        </span>
                      </div>
                    )}
                    {selectedOrder.notes && (
                      <div className="pt-2 border-t border-[#262626] text-[11px] text-amber-300/90 italic">
                        &ldquo;{selectedOrder.notes}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Artigos Encomendados</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#262626] text-neutral-400">
                        <th className="pb-2 font-medium">SKU</th>
                        <th className="pb-2 font-medium">Designação do Artigo</th>
                        <th className="pb-2 font-medium text-center">Qtd</th>
                        <th className="pb-2 font-medium text-right">PVP Unit.</th>
                        <th className="pb-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f1f]">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 font-mono text-neutral-400">{item.sku}</td>
                          <td className="py-2.5 font-medium text-white">{item.productName}</td>
                          <td className="py-2.5 text-center font-mono font-bold text-white">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 text-right font-mono text-neutral-300">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-[#c5a47e]">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#262626] text-xs font-bold">
                        <td colSpan={4} className="pt-3 text-right text-neutral-400">
                          Subtotal:
                        </td>
                        <td className="pt-3 text-right font-mono text-white">
                          {formatCurrency(selectedOrder.subtotal)}
                        </td>
                      </tr>
                      {selectedOrder.shippingFee > 0 && (
                        <tr className="text-xs">
                          <td colSpan={4} className="py-1 text-right text-neutral-400">
                            Portes de Envio:
                          </td>
                          <td className="py-1 text-right font-mono text-white">
                            {formatCurrency(selectedOrder.shippingFee)}
                          </td>
                        </tr>
                      )}
                      <tr className="text-sm font-bold">
                        <td colSpan={4} className="pt-2 text-right text-white">
                          Total Geral:
                        </td>
                        <td className="pt-2 text-right font-mono text-[#c5a47e]">
                          {formatCurrency(selectedOrder.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">
            Selecione uma encomenda para ver os detalhes
          </div>
        )}
      </div>
    </div>
  );
};
