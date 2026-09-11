import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StockTransfer, StockTransferItem } from '../../types';
import { formatCurrency } from '../../utils/crypto';
import { TransferArticlePickerModal } from './TransferArticlePickerModal';
import {
  RefreshCw,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Copy,
  Check,
  Share2,
  FileText,
  Key,
  X,
  Plus,
  Trash2,
  Eye,
  Search,
  Filter,
  Warehouse as WarehouseIcon,
  Package,
  CheckSquare,
  AlertCircle,
  MessageCircle,
  Truck,
  RotateCcw,
  BadgeAlert,
  Send,
  HelpCircle,
} from 'lucide-react';

interface InterStoreTransfersTabProps {}

export const InterStoreTransfersTab: React.FC<InterStoreTransfersTabProps> = () => {
  const {
    stockTransfers,
    requestStockTransfer,
    approveStockTransfer,
    confirmStockTransfer,
    rejectStockTransfer,
    cancelStockTransfer,
    warehouses,
    products,
    stock,
    categories,
    currentUser,
    currentCompany,
  } = useApp();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

  // Modals state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPickerInRequest, setShowPickerInRequest] = useState(false);

  // Active transfer for modals
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

  // New Request Form State
  const [requestOriginWh, setRequestOriginWh] = useState<string>(() => warehouses[0]?.id || 'wh-1');
  const [requestDestWh, setRequestDestWh] = useState<string>(() => warehouses[1]?.id || warehouses[0]?.id || 'wh-2');
  const [requestItems, setRequestItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [requestNotes, setRequestNotes] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Approval Form State
  const [approveQuantities, setApproveQuantities] = useState<Record<string, number>>({});
  const [approveNotes, setApproveNotes] = useState('');
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);
  const [generatedCodeResult, setGeneratedCodeResult] = useState<{
    transfer: StockTransfer;
    code: string;
  } | null>(null);

  // Confirmation Form State
  const [confirmationCodeInput, setConfirmationCodeInput] = useState('');
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  // Rejection Form State
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Copy Feedback
  const [copiedCode, setCopiedCode] = useState(false);

  // Helper maps
  const warehouseMap = useMemo(() => {
    const map = new Map<string, string>();
    warehouses.forEach((w) => map.set(w.id, w.name));
    return map;
  }, [warehouses]);

  const productMap = useMemo(() => {
    const map = new Map<string, (typeof products)[0]>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Statistics
  const stats = useMemo(() => {
    const total = stockTransfers.length;
    const pending = stockTransfers.filter((t) => t.status === 'PENDENTE').length;
    const inTransit = stockTransfers.filter((t) => t.status === 'APROVADO').length;
    const completed = stockTransfers.filter((t) => t.status === 'CONCLUIDO').length;
    const rejected = stockTransfers.filter((t) => t.status === 'REJEITADO' || t.status === 'CANCELADO').length;
    return { total, pending, inTransit, completed, rejected };
  }, [stockTransfers]);

  // Filtered Transfers
  const filteredTransfers = useMemo(() => {
    return stockTransfers.filter((t) => {
      // Status Filter
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      // Warehouse Filter
      if (
        warehouseFilter !== 'all' &&
        t.originWarehouseId !== warehouseFilter &&
        t.destinationWarehouseId !== warehouseFilter
      ) {
        return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesNumber = t.transferNumber.toLowerCase().includes(query);
        const matchesOrigin = (warehouseMap.get(t.originWarehouseId) || '').toLowerCase().includes(query);
        const matchesDest = (warehouseMap.get(t.destinationWarehouseId) || '').toLowerCase().includes(query);
        const matchesUser =
          (t.requestedByName || '').toLowerCase().includes(query) ||
          (t.approvedByName || '').toLowerCase().includes(query) ||
          (t.receivedByName || '').toLowerCase().includes(query);
        const matchesItem = t.items.some(
          (it) =>
            (it.productName || '').toLowerCase().includes(query) ||
            (it.productSku || '').toLowerCase().includes(query)
        );
        return matchesNumber || matchesOrigin || matchesDest || matchesUser || matchesItem;
      }

      return true;
    });
  }, [stockTransfers, statusFilter, warehouseFilter, searchTerm, warehouseMap]);

  // Helper to get stock quantity in a specific warehouse
  const getProductStockInWarehouse = (productId: string, warehouseId: string): number => {
    return stock
      .filter((s) => s.productId === productId && s.warehouseId === warehouseId)
      .reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
  };

  // HANDLERS FOR NEW REQUEST
  const handleOpenNewRequest = () => {
    const orig = warehouses[0]?.id || 'wh-1';
    const dest = warehouses.find((w) => w.id !== orig)?.id || warehouses[1]?.id || orig;
    setRequestOriginWh(orig);
    setRequestDestWh(dest);
    setRequestItems([]);
    setRequestNotes('');
    setShowRequestModal(true);
  };

  const handleSwapRequestWarehouses = () => {
    setRequestOriginWh(requestDestWh);
    setRequestDestWh(requestOriginWh);
  };

  const handleAddProductToRequest = (productId: string, quantity = 1) => {
    setRequestItems((prev) => {
      const exists = prev.find((it) => it.productId === productId);
      if (exists) {
        return prev.map((it) =>
          it.productId === productId ? { ...it, quantity: it.quantity + quantity } : it
        );
      }
      return [...prev, { productId, quantity: Math.max(1, quantity) }];
    });
  };

  const handleUpdateItemQty = (productId: string, qty: number) => {
    const safeQty = Math.max(1, qty);
    setRequestItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, quantity: safeQty } : it))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setRequestItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestOriginWh === requestDestWh) {
      alert('O armazém de origem e o armazém de destino não podem ser iguais!');
      return;
    }
    if (requestItems.length === 0) {
      alert('Selecione pelo menos um artigo para transferir.');
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await requestStockTransfer(requestOriginWh, requestDestWh, requestItems, requestNotes);
      setShowRequestModal(false);
      setRequestItems([]);
      setRequestNotes('');
    } catch (err: any) {
      alert(err.message || 'Erro ao criar solicitação.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // HANDLERS FOR APPROVAL
  const handleOpenApproveModal = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    const initialQtyMap: Record<string, number> = {};
    transfer.items.forEach((it) => {
      initialQtyMap[it.productId] = it.quantityRequested;
    });
    setApproveQuantities(initialQtyMap);
    setApproveNotes('');
    setShowApproveModal(true);
  };

  const handleSubmitApprove = async () => {
    if (!selectedTransfer) return;
    setIsSubmittingApprove(true);
    try {
      const itemsToApprove = selectedTransfer.items.map((it) => ({
        productId: it.productId,
        quantity: approveQuantities[it.productId] ?? it.quantityRequested,
      }));

      const res = await approveStockTransfer(selectedTransfer.id, itemsToApprove, approveNotes);
      if (res.success && res.verificationCode) {
        setShowApproveModal(false);
        setGeneratedCodeResult({
          transfer: {
            ...selectedTransfer,
            status: 'APROVADO',
            verificationCode: res.verificationCode,
          },
          code: res.verificationCode,
        });
        setShowCodeModal(true);
      } else {
        alert(res.error || 'Erro ao aprovar transferência.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao aprovar transferência.');
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  // HANDLERS FOR CONFIRMATION (DESTINATION)
  const handleOpenConfirmModal = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    setConfirmationCodeInput('');
    setConfirmError(null);
    setConfirmSuccess(false);
    setShowConfirmModal(true);
  };

  const handleSubmitConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    if (!confirmationCodeInput.trim()) {
      setConfirmError('Introduza o código de 6 dígitos recebido da origem.');
      return;
    }

    setIsSubmittingConfirm(true);
    setConfirmError(null);
    try {
      const res = await confirmStockTransfer(selectedTransfer.id, confirmationCodeInput);
      if (res.success) {
        setConfirmSuccess(true);
        setTimeout(() => {
          setShowConfirmModal(false);
          setConfirmSuccess(false);
          setConfirmationCodeInput('');
        }, 1800);
      } else {
        setConfirmError(res.error || 'Código inválido.');
      }
    } catch (err: any) {
      setConfirmError(err.message || 'Erro ao validar código.');
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  // HANDLERS FOR REJECTION
  const handleOpenRejectModal = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    setRejectionReasonInput('');
    setShowRejectModal(true);
  };

  const handleSubmitReject = async () => {
    if (!selectedTransfer) return;
    setIsSubmittingReject(true);
    try {
      await rejectStockTransfer(selectedTransfer.id, rejectionReasonInput);
      setShowRejectModal(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao rejeitar.');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // HANDLERS FOR CANCELLATION & REVERSAL
  const handleCancelTransfer = async (transfer: StockTransfer) => {
    const isApproved = transfer.status === 'APROVADO';
    const msg = isApproved
      ? `Tem a certeza que deseja cancelar a transferência ${transfer.transferNumber}? O stock que já foi abatido na origem será automaticamente estornado/devolvido.`
      : `Tem a certeza que deseja cancelar o pedido ${transfer.transferNumber}?`;

    if (window.confirm(msg)) {
      try {
        await cancelStockTransfer(transfer.id, 'Cancelado pelo operador');
      } catch (err: any) {
        alert(err.message || 'Erro ao cancelar.');
      }
    }
  };

  // COPY & WHATSAPP
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleShareWhatsApp = (transfer: StockTransfer, code: string) => {
    const orig = warehouseMap.get(transfer.originWarehouseId) || 'Origem';
    const dest = warehouseMap.get(transfer.destinationWarehouseId) || 'Destino';
    const itemsList = transfer.items
      .map((it) => `• ${it.productName || 'Artigo'} (Qtd: ${it.quantityApproved || it.quantityRequested})`)
      .join('%0A');

    const msg = `📦 *TRANSFERÊNCIA DE STOCK ERP - ${transfer.transferNumber}*%0A%0A` +
      `🏢 *Origem:* ${orig}%0A` +
      `🏬 *Destino:* ${dest}%0A%0A` +
      `📋 *Artigos em trânsito:*%0A${itemsList}%0A%0A` +
      `🔑 *CÓDIGO DE ACEITAÇÃO:* *${code}*%0A` +
      `⏳ *Validade:* 7 dias (até ${new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString('pt-PT')})%0A%0A` +
      `_Introduza este código no sistema na Loja Destino para confirmar a recepção e descarregar o stock._`;

    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // STATUS BADGE RENDERER
  const renderStatusBadge = (status: StockTransfer['status']) => {
    switch (status) {
      case 'PENDENTE':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Pendente (Origem)</span>
          </span>
        );
      case 'APROVADO':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Truck className="w-3.5 h-3.5" />
            <span>Em Trânsito / Código Ativo</span>
          </span>
        );
      case 'CONCLUIDO':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Concluído</span>
          </span>
        );
      case 'REJEITADO':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <X className="w-3.5 h-3.5" />
            <span>Rejeitado</span>
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-500/15 text-neutral-400 border border-neutral-500/30">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancelado / Estornado</span>
          </span>
        );
      case 'EXPIRADO':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-900/30 text-rose-300 border border-rose-800/40">
            <Clock className="w-3.5 h-3.5" />
            <span>Expirado</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Workflow Steps Banner */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Transferência de Stock com Código de Verificação (Handshake OTP)</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Controlo rigoroso entre armazéns e lojas com autorização de saída, geração de código seguro e descarga no destino.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleOpenNewRequest}
              className="px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Solicitação de Transferência</span>
            </button>
          </div>
        </div>

        {/* 4 Interactive Flow Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#202020]">
          <div className="p-2.5 rounded-lg bg-[#0d0d0d] border border-[#262626] flex items-start space-x-2.5">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 border border-amber-500/40">
              1
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">1. Solicitação</h4>
              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                Loja Destino seleciona artigos e emite pedido para o Armazém Origem (<span className="text-amber-400">PENDENTE</span>).
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0d0d0d] border border-[#262626] flex items-start space-x-2.5">
            <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center shrink-0 border border-sky-500/40">
              2
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">2. Aprovação & Abate</h4>
              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                Armazém Origem aceita, o sistema abate o stock na Origem e gera um Código Único de 6 dígitos (<span className="text-sky-400">APROVADO</span>).
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0d0d0d] border border-[#262626] flex items-start space-x-2.5">
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 border border-indigo-500/40">
              3
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">3. Envio do Código</h4>
              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                Origem transmite o código via WhatsApp, SMS ou guia ao operador ou estafeta que transporta a mercadoria.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0d0d0d] border border-[#262626] flex items-start space-x-2.5">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 border border-emerald-500/40">
              4
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">4. Descarga no Destino</h4>
              <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                Loja Destino introduz o código, valida a mercadoria e o stock é adicionado ao destino (<span className="text-emerald-400">CONCLUÍDO</span>).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl">
          <div className="text-neutral-400 text-xs font-medium flex items-center justify-between">
            <span>Total Pedidos</span>
            <Package className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {stats.total}
          </div>
        </div>

        <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl">
          <div className="text-neutral-400 text-xs font-medium flex items-center justify-between">
            <span>Aguardam Aprovação</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 flex items-center space-x-2">
            <span>{stats.pending}</span>
            {stats.pending > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          </div>
        </div>

        <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl">
          <div className="text-neutral-400 text-xs font-medium flex items-center justify-between">
            <span>Em Trânsito / Código</span>
            <Truck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
            {stats.inTransit}
          </div>
        </div>

        <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-xl">
          <div className="text-neutral-400 text-xs font-medium flex items-center justify-between">
            <span>Concluídas c/ Sucesso</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {stats.completed}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#141414] p-3 rounded-xl border border-[#262626]">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Pesquisar por nº TRF, artigo, SKU, loja ou operador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-300 focus:outline-hidden focus:border-[#c5a47e]"
          >
            <option value="all">Todos os Estados</option>
            <option value="PENDENTE">Pendentes (Aguarda Origem)</option>
            <option value="APROVADO">Aprovados / Em Trânsito</option>
            <option value="CONCLUIDO">Concluídos</option>
            <option value="REJEITADO">Rejeitados</option>
            <option value="CANCELADO">Cancelados</option>
            <option value="EXPIRADO">Expirados</option>
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-300 focus:outline-hidden focus:border-[#c5a47e]"
          >
            <option value="all">Todos os Armazéns</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transfers List / Table */}
      {filteredTransfers.length === 0 ? (
        <div className="py-14 border border-dashed border-[#262626] rounded-xl text-center flex flex-col items-center justify-center space-y-3 bg-[#0d0d0d]">
          <Package className="w-10 h-10 text-neutral-600" />
          <div>
            <h4 className="text-sm font-semibold text-neutral-300">
              Nenhuma transferência encontrada
            </h4>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Inicie um novo pedido entre lojas clicando no botão "+ Nova Solicitação de Transferência".
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNewRequest}
            className="px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Primeira Solicitação</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransfers.map((transfer) => {
            const originName = warehouseMap.get(transfer.originWarehouseId) || 'Origem';
            const destName = warehouseMap.get(transfer.destinationWarehouseId) || 'Destino';
            const totalItemsCount = transfer.items.reduce(
              (acc, it) => acc + (it.quantityApproved ?? it.quantityRequested),
              0
            );

            return (
              <div
                key={transfer.id}
                className="bg-[#141414] border border-[#262626] hover:border-[#383838] rounded-xl p-4 transition-colors shadow-xs"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#202020] pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-[#c5a47e]" />
                      <span>{transfer.transferNumber}</span>
                    </div>

                    {renderStatusBadge(transfer.status)}

                    <span className="text-[11px] text-neutral-400 font-mono">
                      {new Date(transfer.createdAt).toLocaleString('pt-PT')}
                    </span>
                  </div>

                  {/* Route Indicator */}
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0d0d0d] border border-[#262626] text-amber-300">
                      <WarehouseIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-medium">{originName}</span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />

                    <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0d0d0d] border border-[#262626] text-emerald-300">
                      <WarehouseIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-medium">{destName}</span>
                    </div>
                  </div>
                </div>

                {/* Items Summary & Notes */}
                <div className="py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-neutral-400 text-[11px] font-medium mr-1">
                        Artigos ({transfer.items.length}):
                      </span>
                      {transfer.items.map((it, idx) => (
                        <span
                          key={it.id || idx}
                          className="px-2 py-0.5 rounded bg-[#1c1c1c] border border-[#2a2a2a] text-neutral-300 text-[11px] font-mono"
                        >
                          {it.productName}{' '}
                          <strong className="text-white">
                            x{it.quantityApproved ?? it.quantityRequested}
                          </strong>
                        </span>
                      ))}
                    </div>

                    {transfer.notes && (
                      <p className="text-[11px] text-neutral-400 italic">
                        Nota: {transfer.notes}
                      </p>
                    )}

                    <div className="text-[11px] text-neutral-500 flex items-center space-x-3 pt-0.5">
                      <span>Solicitante: <strong className="text-neutral-300">{transfer.requestedByName}</strong></span>
                      {transfer.approvedByName && (
                        <span>Aprovado por: <strong className="text-sky-300">{transfer.approvedByName}</strong></span>
                      )}
                      {transfer.receivedByName && (
                        <span>Recebido por: <strong className="text-emerald-300">{transfer.receivedByName}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Actions based on status */}
                  <div className="flex items-center space-x-2 shrink-0 pt-2 lg:pt-0">
                    {/* Status: PENDENTE */}
                    {transfer.status === 'PENDENTE' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenApproveModal(transfer)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                          title="Aprovar pedido, abater da origem e gerar código"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Aprovar & Gerar Código</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(transfer)}
                          className="px-2.5 py-1.5 bg-[#1c1c1c] hover:bg-rose-950/40 text-neutral-400 hover:text-rose-400 border border-[#2e2e2e] hover:border-rose-800 rounded-lg text-xs transition-colors cursor-pointer"
                          title="Rejeitar pedido de transferência"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Rejeitar</span>
                        </button>
                      </>
                    )}

                    {/* Status: APROVADO */}
                    {transfer.status === 'APROVADO' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenConfirmModal(transfer)}
                          className="px-3.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-lg transition-all shadow-md flex items-center space-x-1.5 cursor-pointer animate-pulse"
                          title="Loja Destino: Inserir código de 6 dígitos para receber stock"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Confirmar Recepção (Código)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTransfer(transfer);
                            setGeneratedCodeResult({
                              transfer,
                              code: transfer.verificationCode || '',
                            });
                            setShowCodeModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-[#1c1c1c] hover:bg-[#282828] text-sky-400 border border-[#2e2e2e] rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                          title="Ver ou reenviar código à loja destino"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Ver / Partilhar Código</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancelTransfer(transfer)}
                          className="px-2.5 py-1.5 bg-[#1c1c1c] hover:bg-rose-950/40 text-neutral-400 hover:text-rose-400 border border-[#2e2e2e] rounded-lg text-xs transition-colors cursor-pointer"
                          title="Cancelar e estornar stock para o armazém de origem"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                      </>
                    )}

                    {/* Status: CONCLUIDO */}
                    {transfer.status === 'CONCLUIDO' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransfer(transfer);
                          setShowDetailsModal(true);
                        }}
                        className="px-3 py-1.5 bg-[#1c1c1c] hover:bg-[#252525] text-neutral-300 hover:text-white border border-[#2e2e2e] rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#c5a47e]" />
                        <span>Ver Guia Completa</span>
                      </button>
                    )}

                    {/* Detalhes para qualquer estado */}
                    {transfer.status !== 'CONCLUIDO' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransfer(transfer);
                          setShowDetailsModal(true);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Ver detalhes da transferência"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: NOVA SOLICITAÇÃO (LOJA DESTINO SOLICITA À ORIGEM)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#262626] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-[#c5a47e]" />
                  <span>Nova Solicitação de Transferência de Stock</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Passo 1: A Loja Destino emite um pedido com os artigos necessários.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitRequest} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Warehouse Route Card */}
              <div className="p-3.5 bg-[#0d0d0d] border border-[#262626] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Definir Rota do Pedido
                  </span>
                  <button
                    type="button"
                    onClick={handleSwapRequestWarehouses}
                    className="text-xs text-[#c5a47e] hover:text-white flex items-center space-x-1 px-2 py-0.5 rounded bg-[#1c1c1c] border border-[#2e2e2e] cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>Inverter</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-amber-400 mb-1 flex items-center space-x-1">
                      <WarehouseIcon className="w-3.5 h-3.5" />
                      <span>Armazém de Origem (Quem vai fornecer)</span>
                    </label>
                    <select
                      value={requestOriginWh}
                      onChange={(e) => setRequestOriginWh(e.target.value)}
                      className="w-full bg-[#171717] border border-[#2e2e2e] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#c5a47e]"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.code ? `(${w.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-emerald-400 mb-1 flex items-center space-x-1">
                      <WarehouseIcon className="w-3.5 h-3.5" />
                      <span>Loja / Armazém de Destino (Quem vai receber)</span>
                    </label>
                    <select
                      value={requestDestWh}
                      onChange={(e) => setRequestDestWh(e.target.value)}
                      className="w-full bg-[#171717] border border-[#2e2e2e] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#c5a47e]"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.code ? `(${w.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {requestOriginWh === requestDestWh && (
                  <p className="text-xs text-rose-400 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Atenção: A origem e o destino têm de ser armazéns diferentes!</span>
                  </p>
                )}
              </div>

              {/* Items Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-200">
                    Artigos a Solicitar ({requestItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPickerInRequest(true)}
                    className="px-3 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>🔳 Selecionar do Catálogo</span>
                  </button>
                </div>

                {requestItems.length === 0 ? (
                  <div className="py-8 border border-dashed border-[#262626] rounded-xl text-center flex flex-col items-center justify-center space-y-2 bg-[#0d0d0d]">
                    <Package className="w-8 h-8 text-neutral-600" />
                    <p className="text-xs text-neutral-400">
                      Nenhum artigo adicionado ao pedido.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPickerInRequest(true)}
                      className="text-xs text-[#c5a47e] hover:underline font-semibold cursor-pointer"
                    >
                      Clique aqui para abrir o catálogo e marcar artigos com caixas de seleção
                    </button>
                  </div>
                ) : (
                  <div className="border border-[#262626] rounded-lg overflow-hidden bg-[#0d0d0d]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#171717] text-neutral-400 font-medium border-b border-[#262626] text-[10px] uppercase">
                        <tr>
                          <th className="px-3 py-2">Artigo</th>
                          <th className="px-3 py-2 text-right">Disp. Origem</th>
                          <th className="px-3 py-2 text-center w-32">Qtd. Pedida</th>
                          <th className="px-3 py-2 text-right w-12">Remover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#202020]">
                        {requestItems.map((item) => {
                          const prod = productMap.get(item.productId);
                          if (!prod) return null;
                          const originStock = getProductStockInWarehouse(item.productId, requestOriginWh);

                          return (
                            <tr key={item.productId} className="hover:bg-[#141414]">
                              <td className="px-3 py-2 font-medium text-white">
                                <div>{prod.name}</div>
                                <div className="text-[10px] font-mono text-neutral-500">
                                  SKU: {prod.sku}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                <span
                                  className={
                                    originStock <= 0
                                      ? 'text-rose-400 font-bold'
                                      : originStock <= 5
                                      ? 'text-amber-400 font-bold'
                                      : 'text-emerald-400 font-bold'
                                  }
                                >
                                  {originStock} un
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="inline-flex items-center space-x-1 bg-[#171717] border border-[#2e2e2e] rounded-md p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQty(item.productId, item.quantity - 1)}
                                    className="w-5 h-5 rounded bg-[#222] text-neutral-300 hover:text-white text-xs font-bold flex items-center justify-center cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleUpdateItemQty(item.productId, Number(e.target.value))
                                    }
                                    className="w-12 text-center bg-transparent text-xs font-mono font-bold text-white focus:outline-hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQty(item.productId, item.quantity + 1)}
                                    className="w-5 h-5 rounded bg-[#222] text-neutral-300 hover:text-white text-xs font-bold flex items-center justify-center cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.productId)}
                                  className="p-1 text-neutral-500 hover:text-rose-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Notas / Justificação do Pedido (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Ex: Reposição para fim-de-semana, artigos esgotados na montra..."
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-[#202020]">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#252525] text-neutral-300 font-medium text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest || requestItems.length === 0 || requestOriginWh === requestDestWh}
                  className="px-5 py-2 bg-[#c5a47e] hover:bg-[#b5946e] disabled:opacity-50 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingRequest ? 'A emitir...' : 'Emitir Solicitação (Status: PENDENTE)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: APROVAÇÃO & GERAÇÃO DE CÓDIGO (ARMAZÉM ORIGEM)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showApproveModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#262626] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Aprovar Transferência {selectedTransfer.transferNumber}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Passo 2: O Armazém Origem confirma a separação física e gera o código de aceitação.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="p-3 bg-[#0d0d0d] border border-[#262626] rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px]">Origem (Saída)</span>
                  <span className="font-semibold text-amber-400">
                    {warehouseMap.get(selectedTransfer.originWarehouseId)}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500" />
                <div className="text-right">
                  <span className="text-neutral-500 block text-[10px]">Destino (Entrada)</span>
                  <span className="font-semibold text-emerald-400">
                    {warehouseMap.get(selectedTransfer.destinationWarehouseId)}
                  </span>
                </div>
              </div>

              {/* Items Review Table */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Revisão dos Artigos Solicitados
                </label>
                <div className="border border-[#262626] rounded-lg overflow-hidden bg-[#0d0d0d]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#171717] text-neutral-400 text-[10px] uppercase border-b border-[#262626]">
                      <tr>
                        <th className="px-3 py-2">Artigo</th>
                        <th className="px-3 py-2 text-right">Disponível</th>
                        <th className="px-3 py-2 text-center">Qtd. Pedida</th>
                        <th className="px-3 py-2 text-center">Qtd. a Aprovar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#202020]">
                      {selectedTransfer.items.map((it) => {
                        const originStock = getProductStockInWarehouse(it.productId, selectedTransfer.originWarehouseId);
                        const currentApproved = approveQuantities[it.productId] ?? it.quantityRequested;
                        const hasInsufficient = originStock < currentApproved;

                        return (
                          <tr key={it.id} className="hover:bg-[#141414]">
                            <td className="px-3 py-2 text-white font-medium">
                              <div>{it.productName}</div>
                              <div className="text-[10px] font-mono text-neutral-500">{it.productSku}</div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              <span className={originStock < currentApproved ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                                {originStock} un
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-neutral-400">
                              {it.quantityRequested}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="1"
                                max={originStock}
                                value={currentApproved}
                                onChange={(e) =>
                                  setApproveQuantities((prev) => ({
                                    ...prev,
                                    [it.productId]: Number(e.target.value),
                                  }))
                                }
                                className={`w-16 text-center rounded bg-[#171717] border px-1 py-1 text-xs font-mono font-bold ${
                                  hasInsufficient ? 'border-rose-500 text-rose-400' : 'border-[#2e2e2e] text-white'
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Warning on approval deduction */}
              <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-800/40 text-xs text-sky-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                <p>
                  Ao aprovar, o stock é <strong>automaticamente abatido no Armazém de Origem</strong> e o sistema gera o <strong>Código de Aceitação único de 6 dígitos</strong> para ser enviado à Loja Destino.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Observações de Despacho (Opcional)
                </label>
                <input
                  type="text"
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="Ex: Mercadoria despachada na viatura 03 às 14h..."
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-[#202020]">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 bg-[#1c1c1c] text-neutral-300 font-medium text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingApprove}
                  onClick={handleSubmitApprove}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmittingApprove ? 'A processar...' : 'Aprovar, Abater Stock & Gerar Código'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 3: EXIBIÇÃO DO CÓDIGO GERADO (PARA ORIGEM ENVIAR AO DESTINO) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showCodeModal && generatedCodeResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden text-center p-6 space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Key className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                Transferência Aprovada com Sucesso!
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Nº Transferência: <strong className="text-neutral-200">{generatedCodeResult.transfer.transferNumber}</strong>
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Forneça o código de verificação abaixo ao operador ou estafeta que vai entregar na Loja Destino:
              </p>
            </div>

            {/* Giant OTP Code Display */}
            <div className="p-4 bg-[#0d0d0d] border border-emerald-500/40 rounded-xl space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                CÓDIGO DE ACEITAÇÃO (OTP)
              </span>
              <div className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-widest selection:bg-[#c5a47e]">
                {generatedCodeResult.code.slice(0, 3)} {generatedCodeResult.code.slice(3)}
              </div>
              <span className="text-[11px] text-neutral-500 block">
                Válido por 7 dias &bull; Limite de 5 tentativas
              </span>
            </div>

            {/* Action Buttons: Copy & WhatsApp */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyCode(generatedCodeResult.code)}
                className="flex-1 w-full py-2.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-neutral-200 border border-[#2e2e2e] font-semibold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Código Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neutral-400" />
                    <span>Copiar Código</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleShareWhatsApp(generatedCodeResult.transfer, generatedCodeResult.code)}
                className="flex-1 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar via WhatsApp</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowCodeModal(false);
                setGeneratedCodeResult(null);
              }}
              className="w-full py-2 bg-[#171717] hover:bg-[#202020] text-neutral-300 text-xs rounded-xl font-medium cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 4: CONFIRMAÇÃO E DESCARGA COM CÓDIGO (LOJA DESTINO)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showConfirmModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Key className="w-5 h-5 text-[#c5a47e]" />
                  <span>Confirmar Recepção de Mercadoria</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Pedido: <strong className="text-white">{selectedTransfer.transferNumber}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {confirmSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-emerald-400">
                  Código Validado com Sucesso!
                </h4>
                <p className="text-xs text-neutral-300">
                  O stock foi creditado no armazém de destino e o estado mudou para <strong>CONCLUÍDO</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitConfirm} className="space-y-4">
                {/* Security Access Control Info */}
                <div className="p-2.5 rounded-xl bg-[#111827]/60 border border-blue-500/30 flex items-center space-x-2 text-[11px] text-blue-300">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-blue-400" />
                  <span>
                    <strong>Validação Rigorosa:</strong> Apenas o Gerente ou Operador atribuído à loja de destino (<strong>{warehouseMap.get(selectedTransfer.destinationWarehouseId)}</strong>) tem permissão para descarregar este stock.
                  </span>
                </div>

                {/* Summary of goods arriving */}
                <div className="p-3 bg-[#0d0d0d] border border-[#262626] rounded-xl space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-neutral-400">
                    Artigos a Descarregar em <strong className="text-emerald-400">{warehouseMap.get(selectedTransfer.destinationWarehouseId)}</strong>:
                  </div>
                  <ul className="space-y-1 divide-y divide-[#1e1e1e]">
                    {selectedTransfer.items.map((it) => (
                      <li key={it.id} className="pt-1 flex items-center justify-between">
                        <span className="text-neutral-200">{it.productName}</span>
                        <span className="font-mono font-bold text-white">
                          {it.quantityApproved ?? it.quantityRequested} un
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Input OTP */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-200 text-center">
                    Introduza o Código de Aceitação (6 Dígitos)
                  </label>
                  <p className="text-[11px] text-neutral-400 text-center">
                    Solicite este código ao operador do armazém de origem ou ao motorista.
                  </p>

                  <input
                    type="text"
                    maxLength={7}
                    value={confirmationCodeInput}
                    onChange={(e) => setConfirmationCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Ex: 849203"
                    autoFocus
                    className="w-full text-center text-2xl font-mono font-bold tracking-widest bg-[#0d0d0d] border-2 border-[#c5a47e] rounded-xl py-3 text-white focus:outline-hidden focus:ring-2 focus:ring-[#c5a47e]/50"
                  />

                  {confirmError && (
                    <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{confirmError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 px-1">
                    <span>Tentativas falhadas: {selectedTransfer.failedAttempts} / {selectedTransfer.maxAttempts}</span>
                    <span>Status: Em Trânsito</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 bg-[#1c1c1c] text-neutral-300 font-medium text-xs rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingConfirm || !confirmationCodeInput.trim()}
                    className="flex-1 py-2.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmittingConfirm ? 'A validar...' : 'Validar Código & Descarregar Stock'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 5: DETALHES COMPLETOS / GUIA DE TRANSFERÊNCIA           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showDetailsModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-5 h-5 text-[#c5a47e]" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Guia de Transferência {selectedTransfer.transferNumber}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Emitida em {new Date(selectedTransfer.createdAt).toLocaleString('pt-PT')}
                  </p>
                </div>
              </div>
              {renderStatusBadge(selectedTransfer.status)}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#0d0d0d] rounded-xl border border-[#262626]">
                <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Armazém de Origem</span>
                <span className="text-amber-400 font-bold text-sm block mt-0.5">
                  {warehouseMap.get(selectedTransfer.originWarehouseId)}
                </span>
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Aprovado por: {selectedTransfer.approvedByName || 'Pendente'}
                </span>
              </div>

              <div className="p-3 bg-[#0d0d0d] rounded-xl border border-[#262626]">
                <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Armazém de Destino</span>
                <span className="text-emerald-400 font-bold text-sm block mt-0.5">
                  {warehouseMap.get(selectedTransfer.destinationWarehouseId)}
                </span>
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Recebido por: {selectedTransfer.receivedByName || 'Pendente'}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#0d0d0d]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#171717] text-neutral-400 text-[10px] uppercase border-b border-[#262626]">
                  <tr>
                    <th className="px-3 py-2">Artigo</th>
                    <th className="px-3 py-2 text-center">Qtd. Solicitada</th>
                    <th className="px-3 py-2 text-center">Qtd. Aprovada</th>
                    <th className="px-3 py-2 text-right">Custo Unit.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202020]">
                  {selectedTransfer.items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#141414]">
                      <td className="px-3 py-2 font-medium text-white">
                        <div>{it.productName}</div>
                        <div className="text-[10px] font-mono text-neutral-500">SKU: {it.productSku}</div>
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-neutral-300">
                        {it.quantityRequested} un
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-emerald-400">
                        {it.quantityApproved ?? it.quantityRequested} un
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-neutral-400">
                        {formatCurrency(it.unitCost || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Audit Log timeline */}
            <div className="p-3 bg-[#0d0d0d] rounded-xl border border-[#262626] text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Rastreabilidade & Auditoria</span>
              <div className="text-[11px] text-neutral-300">
                &bull; <strong>Solicitado:</strong> {new Date(selectedTransfer.createdAt).toLocaleString('pt-PT')} por {selectedTransfer.requestedByName}
              </div>
              {selectedTransfer.approvedAt && (
                <div className="text-[11px] text-sky-300 flex flex-wrap items-center gap-1.5">
                  <span>&bull; <strong>Aprovado & Abatido na Origem:</strong> {new Date(selectedTransfer.approvedAt).toLocaleString('pt-PT')} por {selectedTransfer.approvedByName}</span>
                  {selectedTransfer.approvedByIp && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-sky-950/60 text-sky-400 border border-sky-800/40 rounded">
                      IP: {selectedTransfer.approvedByIp}
                    </span>
                  )}
                </div>
              )}
              {selectedTransfer.completedAt && (
                <div className="text-[11px] text-emerald-300 flex flex-wrap items-center gap-1.5">
                  <span>&bull; <strong>Validado & Descarregado no Destino:</strong> {new Date(selectedTransfer.completedAt).toLocaleString('pt-PT')} por {selectedTransfer.receivedByName}</span>
                  {selectedTransfer.receivedByIp && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 rounded">
                      IP: {selectedTransfer.receivedByIp}
                    </span>
                  )}
                </div>
              )}
              {selectedTransfer.cancelledAt && (
                <div className="text-[11px] text-rose-300">
                  &bull; <strong>Cancelado:</strong> {new Date(selectedTransfer.cancelledAt).toLocaleString('pt-PT')} ({selectedTransfer.rejectionReason})
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#252525] text-neutral-200 border border-[#2e2e2e] rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#c5a47e]" />
                <span>Imprimir Comprovativo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 6: REJEIÇÃO DE PEDIDO (ARMAZÉM ORIGEM)                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showRejectModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Rejeitar Pedido {selectedTransfer.transferNumber}</h3>
            </div>
            <p className="text-xs text-neutral-400">
              Indique o motivo pelo qual a solicitação da Loja Destino não pode ser atendida:
            </p>

            <textarea
              rows={3}
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="Ex: Rutura de stock no armazém central, lote reservado para encomenda externa..."
              className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg p-2.5 text-xs text-white focus:outline-hidden focus:border-rose-500"
            />

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-[#1c1c1c] text-neutral-300 text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingReject}
                onClick={handleSubmitReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {isSubmittingReject ? 'A rejeitar...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Picker Modal Integration for selecting items in the request modal */}
      {showPickerInRequest && (
        <TransferArticlePickerModal
          isOpen={showPickerInRequest}
          onClose={() => setShowPickerInRequest(false)}
          products={products}
          stock={stock}
          originWarehouseId={requestOriginWh}
          destinationWarehouseId={requestDestWh}
          warehouses={warehouses}
          categories={categories}
          onSelectSingle={(productId, quantity = 1) => {
            handleAddProductToRequest(productId, quantity);
            setShowPickerInRequest(false);
          }}
          onSelectBatch={(items) => {
            items.forEach((it) => handleAddProductToRequest(it.productId, it.quantity));
            setShowPickerInRequest(false);
          }}
        />
      )}
    </div>
  );
};
