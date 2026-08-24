import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sale, SaleItem, OmnichannelOrder, OmnichannelOrderStatus, PaymentMethod } from '../../types';
import {
  FileText,
  FileSpreadsheet,
  Receipt,
  Plus,
  Search,
  Filter,
  Printer,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  Package,
  ShoppingBag,
  Eye,
  Trash2,
  Sparkles,
  Layers,
  Building2,
  User,
  MapPin,
  Calendar,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  QrCode,
  ArrowRight,
  Download,
  Share2,
  X,
  FileCheck,
  Send,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { sound } from '../../utils/audio';
import { printThermalReceipt, printInvoiceDocument, downloadInvoicePdf, getActiveInvoiceTemplate } from '../../utils/print';
import { defaultInvoiceTemplates } from '../../mockData';

export const DocumentsModule: React.FC = () => {
  const {
    salesHistory,
    setSalesHistory,
    products,
    customers,
    currentCompany,
    currentStore,
    currentTerminal,
    currentUser,
    stores,
    fiscalSeries,
    omnichannelOrders,
    currencyDefinition,
    formatCurrency,
    updateOrderStatus,
    convertOrderToSale,
    cancelInvoice,
    recordStockMovement,
    deductStockForItems,
    replenishStockForItems,
    requestConfirm,
    notify,
    hasPermission,
    switchRole,
    updateCompany,
  } = useApp();

  const currencySymbol = currentCompany?.currencySymbol || currencyDefinition?.symbol || 'Mt';

  const canReadDocs = hasPermission('documents', 'read');
  const canCreateDocs = hasPermission('documents', 'create');
  const canFiscalDocs = hasPermission('documents', 'fiscal');

  const [activeTab, setActiveTab] = useState<'emit' | 'archive' | 'orders' | 'transport'>('emit');

  // Active template lookup
  const companyTemplates =
    currentCompany.invoiceTemplates && currentCompany.invoiceTemplates.length > 0
      ? currentCompany.invoiceTemplates
      : defaultInvoiceTemplates;

  const activeTemplate = getActiveInvoiceTemplate(currentCompany);

  const [selectedDocForPreview, setSelectedDocForPreview] = useState<Sale | null>(null);

  const [previewTemplateId, setPreviewTemplateId] = useState<string>(
    currentCompany.activeInvoiceTemplateId || activeTemplate.id
  );

  React.useEffect(() => {
    if (currentCompany.activeInvoiceTemplateId) {
      setPreviewTemplateId(currentCompany.activeInvoiceTemplateId);
    }
  }, [currentCompany.activeInvoiceTemplateId]);

  React.useEffect(() => {
    if (selectedDocForPreview?.invoiceTemplateId) {
      setPreviewTemplateId(selectedDocForPreview.invoiceTemplateId);
    } else if (currentCompany.activeInvoiceTemplateId) {
      setPreviewTemplateId(currentCompany.activeInvoiceTemplateId);
    }
  }, [selectedDocForPreview, currentCompany.activeInvoiceTemplateId]);

  if (!canReadDocs) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a0a] text-center space-y-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-base font-serif font-bold text-white">
            Acesso Restrito à Gestão de Documentos Fiscais
          </h3>
          <p className="text-xs text-neutral-400">
            O seu perfil atual (<strong>{currentUser.name}</strong> &bull; {currentUser.role.toUpperCase()}) não tem permissão para aceder à emissão e arquivo de faturas.
          </p>
        </div>
        <div className="pt-2 flex items-center space-x-3">
          <button
            onClick={() => switchRole('admin')}
            className="px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-xl cursor-pointer shadow-md transition-colors"
          >
            Alternar p/ Perfil Administrador
          </button>
        </div>
      </div>
    );
  }

  // ================= STATE FOR NEW DOCUMENT ISSUANCE =================
  const [docType, setDocType] = useState<'FT' | 'FS' | 'FR' | 'NC' | 'ORC' | 'GT'>('FT');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerNif, setCustomerNif] = useState<string>('999999990');
  const [customerName, setCustomerName] = useState<string>('Consumidor Final');
  const [customerAddress, setCustomerAddress] = useState<string>('Lisboa, Portugal');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [paymentTerm, setPaymentTerm] = useState<string>('pronto');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cartao');
  const [selectedSeries, setSelectedSeries] = useState<string>('2026A');
  const [documentNotes, setDocumentNotes] = useState<string>('');

  // Transport Guide Specifics
  const [transportOrigin, setTransportOrigin] = useState<string>(currentStore.address || 'Armazém Central, Lisboa');
  const [transportDestination, setTransportDestination] = useState<string>('Morada do Cliente');
  const [vehiclePlate, setVehiclePlate] = useState<string>('99-AA-00');

  // Credit Note Specifics
  const [originInvoiceNumber, setOriginInvoiceNumber] = useState<string>('');
  const [ncReason, setNcReason] = useState<string>('Devolução de Artigo / Acordo Comercial');

  // Items in the document
  const [docItems, setDocItems] = useState<
    (SaleItem & { tempId: string; notes?: string })[]
  >([]);

  // Item selector helpers
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [customItemName, setCustomItemName] = useState<string>('');
  const [customItemPrice, setCustomItemPrice] = useState<number>(10);
  const [customItemTax, setCustomItemTax] = useState<number>(23);

  // ================= ARCHIVE & FILTER STATES =================
  const [archiveSearch, setArchiveSearch] = useState<string>('');
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<string>('todos');
  const [archiveStoreFilter, setArchiveStoreFilter] = useState<string>('todas');

  // ================= OMNICHANNEL ORDER STATES =================
  const [selectedOrder, setSelectedOrder] = useState<OmnichannelOrder | null>(
    omnichannelOrders[0] || null
  );
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('todos');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');

  // Auto-populate customer fields when selecting customer
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const c = customers.find((cust) => cust.id === custId);
    if (c) {
      setCustomerNif(c.taxNumber || '999999990');
      setCustomerName(c.name);
      setCustomerAddress(`${c.address || ''}, ${c.city || ''}`);
      setCustomerEmail(c.email || '');
    } else {
      setCustomerNif('999999990');
      setCustomerName('Consumidor Final');
      setCustomerAddress('Lisboa, Portugal');
      setCustomerEmail('');
    }
  };

  // Add Item to Document
  const handleAddItem = () => {
    if (selectedProductId) {
      const prod = products.find((p) => p.id === selectedProductId);
      if (!prod) return;

      const rate = prod.taxRate || 23;
      const unitPrice = prod.price;
      const total = unitPrice * itemQty;
      const base = total / (1 + rate / 100);
      const taxAmount = total - base;

      setDocItems((prev) => [
        ...prev,
        {
          tempId: `item-${Date.now()}-${Math.random()}`,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          quantity: itemQty,
          unitPrice,
          taxRate: rate,
          taxAmount,
          discountPercent: 0,
          discountAmount: 0,
          total,
        },
      ]);
      setSelectedProductId('');
      setItemQty(1);
    } else if (customItemName.trim()) {
      const total = customItemPrice * itemQty;
      const base = total / (1 + customItemTax / 100);
      const taxAmount = total - base;

      setDocItems((prev) => [
        ...prev,
        {
          tempId: `item-custom-${Date.now()}`,
          productId: `custom-${Date.now()}`,
          productName: customItemName.trim(),
          sku: 'SERV-DIV',
          quantity: itemQty,
          unitPrice: customItemPrice,
          taxRate: customItemTax,
          taxAmount,
          discountPercent: 0,
          discountAmount: 0,
          total,
        },
      ]);
      setCustomItemName('');
      setItemQty(1);
    } else {
      notify('Selecione um artigo do catálogo ou digite uma descrição.', 'warning');
    }
  };

  const handleRemoveItem = (tempId: string) => {
    setDocItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  // Document Totals Calculation
  const subtotal = docItems.reduce((acc, item) => acc + item.total, 0);
  const taxSummary: Record<number, { base: number; tax: number }> = {};
  docItems.forEach((i) => {
    const rate = i.taxRate || 23;
    const base = i.total / (1 + rate / 100);
    const tax = i.total - base;
    if (!taxSummary[rate]) taxSummary[rate] = { base: 0, tax: 0 };
    taxSummary[rate].base += base;
    taxSummary[rate].tax += tax;
  });
  const taxTotal = Object.values(taxSummary).reduce((acc, t) => acc + t.tax, 0);
  const total = subtotal;

  // Emit Document Handler
  const handleEmitDocument = (e: React.FormEvent) => {
    e.preventDefault();

    if (docItems.length === 0) {
      notify('Adicione pelo menos um artigo ou linha ao documento.', 'warning');
      return;
    }

    if (docType === 'FT' && (!customerNif || customerNif === '999999990')) {
      notify('Para emissão de Fatura (FT), é obrigatório indicar o NIF do cliente.', 'warning');
      return;
    }

    const seq = salesHistory.length + 1;
    const docPrefix = docType;
    const invNumber = `${docPrefix} 2026/${String(seq).padStart(4, '0')}`;
    const dateStr = new Date().toISOString();
    const prevSale = salesHistory[0];
    const prevHash = prevSale ? prevSale.fiscalHash : '0000000000000000';
    const fiscalHash = `HASH-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newDoc: Sale = {
      id: `doc-${Date.now()}`,
      companyId: currentCompany.id,
      storeId: currentStore.id,
      terminalId: currentTerminal.id,
      invoiceNumber: invNumber,
      invoiceType: (['FS', 'FT', 'FR', 'NC'].includes(docType) ? docType : 'FT') as any,
      date: dateStr,
      customerId: selectedCustomerId || undefined,
      customerName: customerName.trim(),
      customerNif: customerNif.trim(),
      customerTaxNumber: customerNif.trim(),
      items: docItems.map(({ tempId, ...rest }) => rest),
      subtotal,
      discountTotal: 0,
      taxTotal,
      total,
      payments: [
        {
          id: `pay-${Date.now()}`,
          method: selectedPaymentMethod,
          amount: total,
          status: 'concluido',
        },
      ],
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      shiftId: 'shift-doc',
      fiscalHash,
      previousHash: prevHash,
      atcud: `ATCUD-${currentCompany.taxNumber}-${invNumber}`,
      isOffline: false,
      isSynced: true,
      invoiceTemplateId: previewTemplateId || currentCompany.activeInvoiceTemplateId || activeTemplate.id,
      notes: documentNotes
        ? documentNotes
        : docType === 'GT'
        ? `Guia de Transporte. Carga: ${transportOrigin} | Descarga: ${transportDestination} | Matrícula: ${vehiclePlate}`
        : docType === 'NC'
        ? `Nota de Crédito ref. ${originInvoiceNumber}. Motivo: ${ncReason}`
        : undefined,
    };

    // 1. Stock handling: deduct for sales/transport, replenish for credit note
    if (docType === 'NC') {
      replenishStockForItems(
        docItems,
        currentStore.defaultWarehouseId,
        invNumber,
        `Emissão de Nota de Crédito ${invNumber} ref. ${originInvoiceNumber || ''}`
      );
    } else if (docType !== 'ORC' && docType !== 'PF') {
      deductStockForItems(
        docItems,
        currentStore.defaultWarehouseId,
        invNumber,
        `Emissão de ${docType} ${invNumber}`
      );
    }

    // 2. Append to salesHistory in App context
    setSalesHistory((prev) => [newDoc, ...prev]);
    sound.playCashRegisterSound();
    notify(`Documento ${invNumber} emitido e assinado digitalmente com sucesso (Cert. 4120/AT).`, 'success');

    // Reset doc form
    setDocItems([]);
    setDocumentNotes('');
    setSelectedDocForPreview(newDoc);
  };

  // Filtered Archive
  const filteredArchive = salesHistory.filter((doc) => {
    const matchType = archiveTypeFilter === 'todos' || doc.invoiceType === archiveTypeFilter;
    const matchStore = archiveStoreFilter === 'todas' || doc.storeId === archiveStoreFilter;
    const matchSearch =
      doc.invoiceNumber.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      (doc.customerName || '').toLowerCase().includes(archiveSearch.toLowerCase()) ||
      (doc.customerNif || '').includes(archiveSearch) ||
      (doc.fiscalHash || '').toLowerCase().includes(archiveSearch.toLowerCase());
    return matchType && matchStore && matchSearch;
  });

  // Omnichannel Orders Filter
  const filteredOrders = omnichannelOrders.filter((ord) => {
    const matchesStatus = orderStatusFilter === 'todos' || ord.status === orderStatusFilter;
    const matchesQuery =
      ord.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      ord.customerPhone.includes(orderSearchQuery) ||
      ord.customerNif.includes(orderSearchQuery);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-[#e5e5e5] overflow-hidden">
      {/* Module Header */}
      <div className="bg-[#0f0f0f] border-b border-[#262626] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-serif font-bold text-white tracking-wide">
              Gestão & Emissão de Documentos Fiscais
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Certificação AT 4120/AT
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Faturas (FT), Faturas-Recibo (FR), Faturas Simplificadas (FS), Notas de Crédito (NC), Guias de Transporte (GT) e Encomendas
          </p>
        </div>

        {/* Action Header Stats */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#262626] flex items-center space-x-2">
            <span className="text-neutral-400">Total Emitidos:</span>
            <span className="font-mono font-bold text-white">{salesHistory.length}</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#c5a47e]/10 border border-[#c5a47e]/30 flex items-center space-x-2 text-[#c5a47e]">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="font-mono font-bold">
              {formatCurrency(salesHistory.reduce((sum, s) => sum + (s.total || 0), 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="px-6 pt-2 pb-0 flex items-center justify-between border-b border-[#222222] bg-[#0c0c0c] shrink-0">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('emit')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'emit'
                ? 'border-[#c5a47e] text-[#c5a47e] bg-[#c5a47e]/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Emitir Novo Documento</span>
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'archive'
                ? 'border-[#c5a47e] text-[#c5a47e] bg-[#c5a47e]/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Arquivo & Histórico Fiscal ({salesHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-[#c5a47e] text-[#c5a47e] bg-[#c5a47e]/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Encomendas & Omnicanal ({omnichannelOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transport')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'transport'
                ? 'border-[#c5a47e] text-[#c5a47e] bg-[#c5a47e]/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Guias de Transporte (AT)</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: EMIT NEW DOCUMENT ================= */}
      {activeTab === 'emit' && (
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleEmitDocument} className="max-w-6xl mx-auto space-y-6">
            {/* Step 1: Select Document Type */}
            <div className="bg-[#121212] border border-[#262626] rounded-2xl p-5 space-y-3 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-[#c5a47e]" />
                  <span>1. Tipo de Documento Fiscal / Comercial</span>
                </h3>
                <div className="flex items-center space-x-3 text-[11px] font-mono">
                  <span className="text-neutral-400">
                    Série AT: <strong className="text-[#c5a47e]">{selectedSeries}</strong>
                  </span>
                  <span className="text-neutral-600">|</span>
                  <span className="text-neutral-400 flex items-center space-x-1">
                    <span>Modelo Ativo:</span>
                    <strong className="text-emerald-400">{activeTemplate.name}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {[
                  {
                    id: 'FT',
                    name: 'FT - Fatura',
                    desc: 'A Crédito / Conta-Corrente',
                    badge: 'Comercial',
                  },
                  {
                    id: 'FS',
                    name: 'FS - Fatura Simplificada',
                    desc: 'Balcão / Consumidor',
                    badge: 'POS Rápido',
                  },
                  {
                    id: 'FR',
                    name: 'FR - Fatura-Recibo',
                    desc: 'Faturação & Quitação',
                    badge: 'Pronto Pagamento',
                  },
                  {
                    id: 'NC',
                    name: 'NC - Nota de Crédito',
                    desc: 'Retificação / Estorno',
                    badge: 'Fiscal',
                  },
                  {
                    id: 'ORC',
                    name: 'ORC - Orçamento',
                    desc: 'Proposta / Proforma',
                    badge: 'Cotação',
                  },
                  {
                    id: 'GT',
                    name: 'GT - Guia Transporte',
                    desc: 'Circulação de Carga',
                    badge: 'Comunicação AT',
                  },
                ].map((type) => (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => setDocType(type.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      docType === type.id
                        ? 'bg-[#c5a47e]/15 border-[#c5a47e] text-white ring-1 ring-[#c5a47e]'
                        : 'bg-[#161616] border-[#262626] text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-bold text-xs block text-[#e5e5e5]">{type.name}</span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">{type.desc}</span>
                    <span
                      className={`inline-block mt-2 px-1.5 py-0.2 rounded-xs text-[9px] font-mono ${
                        docType === type.id
                          ? 'bg-[#c5a47e] text-neutral-950 font-bold'
                          : 'bg-[#202020] text-neutral-400'
                      }`}
                    >
                      {type.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Customer & Document Parameters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Customer Box */}
              <div className="lg:col-span-2 bg-[#121212] border border-[#262626] rounded-2xl p-5 space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center space-x-2">
                    <User className="w-4 h-4 text-sky-400" />
                    <span>2. Dados do Cliente / Destinatário</span>
                  </h3>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="px-2.5 py-1 bg-[#181818] border border-[#2a2a2a] rounded-lg text-xs text-[#c5a47e] focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
                  >
                    <option value="">-- Selecionar da Base de Clientes --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (NIF: {c.taxNumber || 'S/NIF'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-neutral-400 block mb-1 font-semibold">Nome / Razão Social *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nome do cliente"
                      className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1 font-semibold">
                      NIF / NIPC {docType === 'FT' ? '(Obrigatório para FT) *' : ''}
                    </label>
                    <input
                      type="text"
                      required={docType === 'FT'}
                      value={customerNif}
                      onChange={(e) => setCustomerNif(e.target.value)}
                      placeholder="ex: 501234567"
                      className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white font-mono focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1 font-semibold">Morada / Sede</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Morada de faturação"
                      className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1 font-semibold">Email para Envio de Fatura</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="cliente@empresa.pt"
                      className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                {/* Additional conditional fields */}
                {docType === 'NC' && (
                  <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-rose-300 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Parâmetros da Nota de Crédito</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-neutral-400 block mb-1">Nº Fatura de Origem *</label>
                        <input
                          type="text"
                          required
                          value={originInvoiceNumber}
                          onChange={(e) => setOriginInvoiceNumber(e.target.value)}
                          placeholder="ex: FT 2026/0012"
                          className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#333] rounded-lg text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">Motivo de Retificação *</label>
                        <input
                          type="text"
                          required
                          value={ncReason}
                          onChange={(e) => setNcReason(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#333] rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {docType === 'GT' && (
                  <div className="p-3.5 bg-blue-950/20 border border-blue-500/30 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-blue-300 font-bold">
                      <Truck className="w-4 h-4" />
                      <span>Parâmetros de Transporte (Comunicação AT)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-neutral-400 block mb-1">Local de Carga</label>
                        <input
                          type="text"
                          value={transportOrigin}
                          onChange={(e) => setTransportOrigin(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#333] rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">Local de Descarga</label>
                        <input
                          type="text"
                          value={transportDestination}
                          onChange={(e) => setTransportDestination(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#333] rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">Matrícula da Viatura</label>
                        <input
                          type="text"
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#333] rounded-lg text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Conditions Box */}
              <div className="bg-[#121212] border border-[#262626] rounded-2xl p-5 space-y-4 shadow-md flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center space-x-2 border-b border-[#222222] pb-3 mb-3">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>3. Condições de Pagamento</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-neutral-400 block mb-1 font-semibold">Condição / Prazo</label>
                      <select
                        value={paymentTerm}
                        onChange={(e) => setPaymentTerm(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
                      >
                        <option value="pronto">Pronto Pagamento</option>
                        <option value="30dias">A Prazo - 30 Dias</option>
                        <option value="60dias">A Prazo - 60 Dias</option>
                        <option value="90dias">A Prazo - 90 Dias</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-neutral-400 block mb-1 font-semibold">Meio de Liquidação</label>
                      <select
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
                      >
                        <option value="cartao">Cartão de Débito / Crédito (TPA)</option>
                        <option value="dinheiro">Numerário / Dinheiro</option>
                        <option value="mbway">MB WAY</option>
                        <option value="transferencia">Transferência Bancária</option>
                        <option value="vale">Vale / Crédito Comercial</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-neutral-400 block mb-1 font-semibold">Observações / Menções Fiscais</label>
                      <textarea
                        rows={2}
                        value={documentNotes}
                        onChange={(e) => setDocumentNotes(e.target.value)}
                        placeholder="ex: Isenção de IVA - Artigo 9º do CIVA ou Condições de entrega..."
                        className="w-full px-3 py-1.5 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white text-xs focus:outline-hidden focus:border-[#c5a47e]"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#0d0d0d] rounded-xl border border-[#202020] text-[11px] text-neutral-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Loja Emissora:</span>
                    <strong className="text-white">{currentStore.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Terminal POS:</span>
                    <strong className="text-[#c5a47e]">{currentTerminal.code}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Operador:</span>
                    <strong className="text-neutral-200">{currentUser.name}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Document Items Line Builder */}
            <div className="bg-[#121212] border border-[#262626] rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-[#c5a47e]" />
                  <span>4. Linhas de Artigos & Serviços</span>
                </h3>
                <span className="text-xs font-mono text-[#c5a47e] font-bold">
                  {docItems.length} {docItems.length === 1 ? 'linha adicionada' : 'linhas adicionadas'}
                </span>
              </div>

              {/* Add item control bar */}
              <div className="p-3.5 bg-[#0d0d0d] rounded-xl border border-[#262626] grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs">
                <div className="md:col-span-5">
                  <label className="text-neutral-400 block mb-1 font-semibold">Artigo do Catálogo</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      if (e.target.value) setCustomItemName('');
                    }}
                    className="w-full px-3 py-2 bg-[#181818] border border-[#2a2a2a] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
                  >
                    <option value="">-- Escolher artigo do catálogo --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - {formatCurrency(p.price)} (IVA {p.taxRate}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-neutral-400 block mb-1 font-semibold">Ou Descrição Livre</label>
                  <input
                    type="text"
                    value={customItemName}
                    onChange={(e) => {
                      setCustomItemName(e.target.value);
                      if (e.target.value) setSelectedProductId('');
                    }}
                    placeholder="ex: Consultoria / Serviço Especial"
                    className="w-full px-3 py-2 bg-[#181818] border border-[#2a2a2a] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="text-neutral-400 block mb-1 font-semibold">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-[#181818] border border-[#2a2a2a] rounded-xl text-white font-mono text-center focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                {customItemName && (
                  <>
                    <div className="md:col-span-1">
                      <label className="text-neutral-400 block mb-1 font-semibold">PVP {currencySymbol}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customItemPrice}
                        onChange={(e) => setCustomItemPrice(Number(e.target.value))}
                        className="w-full px-2 py-2 bg-[#181818] border border-[#2a2a2a] rounded-xl text-white font-mono text-center"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-neutral-400 block mb-1 font-semibold">IVA %</label>
                      <select
                        value={customItemTax}
                        onChange={(e) => setCustomItemTax(Number(e.target.value))}
                        className="w-full px-1 py-2 bg-[#181818] border border-[#2a2a2a] rounded-xl text-white font-mono text-center cursor-pointer"
                      >
                        <option value="23">23%</option>
                        <option value="13">13%</option>
                        <option value="6">6%</option>
                        <option value="0">0%</option>
                      </select>
                    </div>
                  </>
                )}

                <div className={`${customItemName ? 'md:col-span-1' : 'md:col-span-3'}`}>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#262626] text-neutral-400">
                      <th className="pb-2.5 font-medium">SKU / Código</th>
                      <th className="pb-2.5 font-medium">Designação do Artigo / Serviço</th>
                      <th className="pb-2.5 font-medium text-center">Qtd</th>
                      <th className="pb-2.5 font-medium text-right">PVP Unit.</th>
                      <th className="pb-2.5 font-medium text-center">IVA</th>
                      <th className="pb-2.5 font-medium text-right">Total Linha</th>
                      <th className="pb-2.5 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {docItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-neutral-500">
                          Nenhum artigo adicionado ao documento. Selecione do catálogo acima.
                        </td>
                      </tr>
                    ) : (
                      docItems.map((item) => (
                        <tr key={item.tempId} className="hover:bg-[#161616]">
                          <td className="py-3 font-mono text-neutral-400">{item.sku}</td>
                          <td className="py-3 font-medium text-white">{item.productName}</td>
                          <td className="py-3 font-mono font-bold text-center text-white">
                            {item.quantity}
                          </td>
                          <td className="py-3 font-mono text-right text-neutral-300">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-3 text-center">
                            <span className="px-1.5 py-0.2 rounded-xs bg-[#1f1f1f] text-neutral-300 font-mono text-[10px]">
                              {item.taxRate}%
                            </span>
                          </td>
                          <td className="py-3 font-mono font-bold text-right text-[#c5a47e]">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.tempId)}
                              className="p-1 hover:bg-rose-950/40 text-neutral-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total & Tax breakdown box */}
              {docItems.length > 0 && (
                <div className="pt-4 border-t border-[#262626] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0d0d0d] p-4 rounded-xl">
                  {/* Tax summary breakdown */}
                  <div className="flex items-center space-x-3 text-[11px] text-neutral-400 font-mono">
                    <span className="font-sans text-neutral-500 font-semibold uppercase text-[10px]">
                      Incidências de IVA:
                    </span>
                    {Object.entries(taxSummary).map(([rate, val]) => (
                      <span key={rate} className="bg-[#181818] px-2 py-1 rounded-md border border-[#262626]">
                        {rate}%: <strong className="text-white">{formatCurrency(val.tax)}</strong>
                      </span>
                    ))}
                  </div>

                  {/* Grand total */}
                  <div className="text-right flex items-center space-x-4">
                    <div>
                      <span className="text-xs text-neutral-400 block">Total a Pagar (com IVA):</span>
                      <span className="text-2xl font-serif font-bold text-[#c5a47e] font-mono">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Final Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setDocItems([])}
                className="px-4 py-2 bg-[#181818] hover:bg-[#222] border border-[#2a2a2a] text-neutral-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Limpar Formulário
              </button>

              <button
                type="submit"
                disabled={docItems.length === 0}
                className="flex items-center space-x-2 px-8 py-3 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-xl text-sm tracking-wide shadow-xl active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Emitir & Assinar {docType} (SHA-256 / AT)</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 2: ARCHIVE & FISCAL HISTORY ================= */}
      {activeTab === 'archive' && (
        <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
          {/* Filters and search bar */}
          <div className="bg-[#121212] border border-[#262626] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar por nº doc, cliente, NIF ou hash..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              {/* Type filter */}
              <select
                value={archiveTypeFilter}
                onChange={(e) => setArchiveTypeFilter(e.target.value)}
                className="px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-xl text-xs text-neutral-300 focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
              >
                <option value="todos">Todos os Tipos (FT, FS, FR, NC)</option>
                <option value="FT">FT - Faturas</option>
                <option value="FS">FS - Faturas Simplificadas</option>
                <option value="FR">FR - Faturas-Recibo</option>
                <option value="NC">NC - Notas de Crédito</option>
              </select>

              {/* Store filter */}
              <select
                value={archiveStoreFilter}
                onChange={(e) => setArchiveStoreFilter(e.target.value)}
                className="px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-xl text-xs text-neutral-300 focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
              >
                <option value="todas">Todas as Lojas</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-neutral-400 font-mono">
              Encontrados: <strong className="text-white">{filteredArchive.length}</strong> documentos
            </div>
          </div>

          {/* Table of Documents */}
          <div className="flex-1 bg-[#121212] border border-[#262626] rounded-2xl overflow-y-auto shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0c0c0c] border-b border-[#262626] text-neutral-400 z-10">
                <tr>
                  <th className="p-3.5 font-semibold">Documento Nº</th>
                  <th className="p-3.5 font-semibold">Tipo</th>
                  <th className="p-3.5 font-semibold">Data / Hora</th>
                  <th className="p-3.5 font-semibold">Cliente</th>
                  <th className="p-3.5 font-semibold">NIF</th>
                  <th className="p-3.5 font-semibold text-right">Total c/ IVA</th>
                  <th className="p-3.5 font-semibold text-center">Assinatura AT</th>
                  <th className="p-3.5 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {filteredArchive.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-500">
                      Nenhum documento fiscal encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredArchive.map((doc) => {
                    const isCreditNote = doc.invoiceType === 'NC';
                    const docTmpl = getActiveInvoiceTemplate(currentCompany, doc.invoiceTemplateId, doc);

                    return (
                      <tr key={doc.id} className="hover:bg-[#161616] transition-colors">
                        <td className="p-3.5 font-mono font-bold text-white">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-3.5 h-3.5 text-[#c5a47e]" />
                            <span>{doc.invoiceNumber}</span>
                          </div>
                          <div className="text-[9.5px] font-sans font-normal text-neutral-400 mt-0.5 flex items-center space-x-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full inline-block"
                              style={{ backgroundColor: docTmpl.primaryColor || '#166534' }}
                            />
                            <span>{docTmpl.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              isCreditNote
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-[#c5a47e]/15 text-[#c5a47e] border-[#c5a47e]/30'
                            }`}
                          >
                            {doc.invoiceType || 'FS'}
                          </span>
                        </td>
                        <td className="p-3.5 text-neutral-300 font-mono text-[11px]">
                          {new Date(doc.date).toLocaleString('pt-PT')}
                        </td>
                        <td className="p-3.5 font-medium text-white truncate max-w-xs">
                          {doc.customerName || 'Consumidor Final'}
                        </td>
                        <td className="p-3.5 font-mono text-neutral-400">{doc.customerNif || '999999990'}</td>
                        <td className="p-3.5 font-mono font-bold text-right text-[#c5a47e]">
                          {formatCurrency(doc.total)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold"
                            title={`Hash Completo: ${doc.fiscalHash}`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>{(doc.fiscalHash || 'AT-OK').substring(0, 8)}</span>
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setSelectedDocForPreview(doc)}
                              className="p-1.5 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                              title="Visualizar e Imprimir Fatura"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#c5a47e]" />
                              <span className="hidden sm:inline text-[11px]">Ver</span>
                            </button>

                            {!isCreditNote && (
                              <button
                                onClick={() => {
                                  requestConfirm({
                                    title: 'Emitir Nota de Crédito',
                                    message: `Deseja anular/estornar o documento ${doc.invoiceNumber} e emitir uma Nota de Crédito?`,
                                    itemDetails: `Valor: ${formatCurrency(doc.total)} | Cliente: ${doc.customerName}`,
                                    confirmLabel: 'Emitir Nota de Crédito (NC)',
                                    isDestructive: true,
                                    onConfirm: () => {
                                      cancelInvoice(doc.id, 'Anulação solicitada no módulo de documentos');
                                    },
                                  });
                                }}
                                className="p-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 rounded-lg transition-colors cursor-pointer"
                                title="Emitir Nota de Crédito (Estorno)"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      )}

      {/* ================= TAB 3: OMNICHANNEL ORDERS ================= */}
      {activeTab === 'orders' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Orders List */}
          <div className="w-full sm:w-96 md:w-[420px] bg-[#0c0c0c] border-r border-[#262626] flex flex-col shrink-0">
            <div className="p-3.5 border-b border-[#262626] space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar por nº, cliente ou NIF..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#141414] border border-[#262626] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              {/* Status Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'pendente', label: 'Pendentes' },
                  { id: 'em_preparacao', label: 'Em Preparação' },
                  { id: 'pronto_levantamento', label: 'Prontos' },
                  { id: 'concluido', label: 'Faturados' },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setOrderStatusFilter(pill.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                      orderStatusFilter === pill.id
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
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                          {order.status}
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
              <div className="p-6 border-b border-[#262626] flex items-center justify-between bg-[#121212]">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold font-mono text-white">
                      {selectedOrder.orderNumber}
                    </h2>
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      {selectedOrder.channel.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Cliente: <strong>{selectedOrder.customerName}</strong> (NIF: {selectedOrder.customerNif})
                  </p>
                </div>

                {selectedOrder.status !== 'concluido' && (
                  <button
                    onClick={() => {
                      const sale = convertOrderToSale(selectedOrder.id);
                      if (sale) {
                        notify(`Encomenda ${selectedOrder.orderNumber} convertida em Fatura com sucesso!`, 'success');
                      }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-xl text-xs tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Converter em Fatura (FT/FS)</span>
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="p-6 space-y-4 max-w-4xl">
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3">
                    Artigos Encomendados
                  </h3>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#262626] text-neutral-400">
                        <th className="pb-2">SKU</th>
                        <th className="pb-2">Artigo</th>
                        <th className="pb-2 text-center">Qtd</th>
                        <th className="pb-2 text-right">PVP</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f1f]">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 font-mono text-neutral-400">{item.sku}</td>
                          <td className="py-2 font-medium text-white">{item.productName}</td>
                          <td className="py-2 text-center font-mono font-bold text-white">
                            {item.quantity}
                          </td>
                          <td className="py-2 text-right font-mono text-neutral-300">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-2 text-right font-mono font-bold text-[#c5a47e]">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">
              Selecione uma encomenda para ver os detalhes
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: TRANSPORT GUIDES ================= */}
      {activeTab === 'transport' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="bg-[#121212] border border-[#262626] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div>
                <h3 className="text-sm font-serif font-bold text-white flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-[#c5a47e]" />
                  <span>Comunicação e Guias de Transporte à Autoridade Tributária</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Regime de Bens em Circulação &bull; Emissão de Guias GT e obtenção de código de validação AT
                </p>
              </div>
              <button
                onClick={() => {
                  setDocType('GT');
                  setActiveTab('emit');
                }}
                className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                + Nova Guia de Transporte
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
              <div className="p-4 bg-[#0d0d0d] rounded-xl border border-[#242424] space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-neutral-500">WebService AT</span>
                <p className="font-bold text-emerald-400 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Conectado (Ambiente Produção AT)</span>
                </p>
                <span className="text-[10px] text-neutral-400">Certificado Software: 4120/AT</span>
              </div>

              <div className="p-4 bg-[#0d0d0d] rounded-xl border border-[#242424] space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-neutral-500">Série de Guias</span>
                <p className="font-bold text-white font-mono">GT 2026A</p>
                <span className="text-[10px] text-neutral-400">Comunicação Prévia em Tempo Real</span>
              </div>

              <div className="p-4 bg-[#0d0d0d] rounded-xl border border-[#242424] space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-neutral-500">Regras de Validação</span>
                <p className="font-bold text-sky-400">QR Code Fiscal Obrigatório</p>
                <span className="text-[10px] text-neutral-400">Portaria 195/2020 & Art. 4º RBC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: INVOICE / DOCUMENT PREVIEW ================= */}
      {selectedDocForPreview && (() => {
        const previewTmpl = getActiveInvoiceTemplate(
          currentCompany,
          previewTemplateId || selectedDocForPreview.invoiceTemplateId,
          selectedDocForPreview
        );
        const isAgroStyle =
          previewTmpl.style === 'agro_mz' ||
          previewTmpl.style === 'vendus_mz' ||
          previewTmpl.id === 'tmpl-agro-vendus' ||
          previewTmpl.id.includes('agro');

        // Dynamic tax calculation
        const taxSummaryMap = new Map<number, { base: number; tax: number; total: number }>();
        selectedDocForPreview.items.forEach((it) => {
          const rate = it.taxRate ?? 0;
          const current = taxSummaryMap.get(rate) || { base: 0, tax: 0, total: 0 };
          const itemTotal = it.total;
          const base = rate === 0 ? itemTotal : itemTotal / (1 + rate / 100);
          const tax = itemTotal - base;
          current.base += base;
          current.tax += tax;
          current.total += itemTotal;
          taxSummaryMap.set(rate, current);
        });
        if (taxSummaryMap.size === 0) {
          taxSummaryMap.set(0, {
            base: selectedDocForPreview.subtotal,
            tax: selectedDocForPreview.taxTotal,
            total: selectedDocForPreview.total,
          });
        }
        const taxRows = Array.from(taxSummaryMap.entries());

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-3xl shadow-2xl p-6 text-[#e5e5e5] space-y-4 max-h-[92vh] overflow-y-auto">
              {/* Modal Header with Template Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-3">
                <div className="flex items-center space-x-2.5">
                  <FileCheck className="w-5 h-5 text-[#c5a47e]" />
                  <div>
                    <h3 className="text-sm font-serif font-bold text-white">
                      Documento Fiscal: {selectedDocForPreview.invoiceNumber}
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      Certificação AT 4120/AT &bull; Série {selectedDocForPreview.fiscalSeries || '2026A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1.5 bg-[#1a1a1a] px-2.5 py-1 rounded-lg border border-[#333]">
                    <span className="text-[11px] text-neutral-400">Modelo:</span>
                    <select
                      value={previewTmpl.id}
                      onChange={(e) => setPreviewTemplateId(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-white focus:outline-hidden cursor-pointer"
                    >
                      {companyTemplates.map((t) => (
                        <option key={t.id} value={t.id} className="bg-[#1a1a1a] text-white">
                          {t.name} {t.id === currentCompany.activeInvoiceTemplateId ? '★ (Padrão)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentCompany.activeInvoiceTemplateId !== previewTmpl.id && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = companyTemplates.map((t) => ({
                          ...t,
                          isDefault: t.id === previewTmpl.id,
                        }));
                        updateCompany({
                          activeInvoiceTemplateId: previewTmpl.id,
                          invoiceTemplates: updated,
                        });
                        notify(`Modelo "${previewTmpl.name}" definido como padrão rigoroso do sistema!`, 'success');
                      }}
                      className="px-2.5 py-1 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-lg cursor-pointer transition-transform active:scale-95 shadow-sm whitespace-nowrap"
                    >
                      Tornar Padrão
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedDocForPreview(null)}
                    className="p-1 rounded-md text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Document Paper Simulation Container (White Paper Authentic Print Layout) */}
              <div className="bg-neutral-200 p-4 rounded-xl flex items-center justify-center overflow-x-auto">
                {isAgroStyle ? (
                  /* AGRO / VENDUS MZ EXACT PDF SIMULATION */
                  <div
                    className="bg-white text-neutral-900 shadow-2xl p-6 rounded relative text-[10px] leading-snug w-full max-w-2xl font-sans border-t-4"
                    style={{ borderColor: previewTmpl.primaryColor || '#166534' }}
                  >
                    {/* Header: Logo + Company Info on Left, Customer on Right */}
                    <div className="flex justify-between items-start pb-2 border-b border-neutral-300">
                      <div className="space-y-0.5 max-w-[60%]">
                        {currentCompany.logoUrl ? (
                          <div className="mb-2">
                            <img src={currentCompany.logoUrl} alt="Logo" className="h-14 max-w-[170px] object-contain" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-sm bg-emerald-700 text-white flex items-center justify-center font-bold text-[13px] mb-1.5">
                            🌱
                          </div>
                        )}
                        <div>
                          <h5 className="font-bold text-[11px] text-neutral-950 uppercase tracking-tight leading-none">
                            {currentCompany.tradeName || currentCompany.name || 'RAFFA ALIADOS DO CAMPO, LDA'}
                          </h5>
                          <p className="text-[8.5px] font-bold text-emerald-800 tracking-wider mt-0.5">
                            {previewTmpl.headerNotes || 'FOCO NO AGRO, GANHO NO CAMPO'}
                          </p>
                        </div>
                        <div className="text-[8.5px] text-neutral-700 leading-tight pt-1">
                          <div>{currentCompany.address || 'Vila de Ribaue, Namiconha'}{currentCompany.city ? `, ${currentCompany.city}` : ''}</div>
                          <div>Contribuinte: <span className="font-mono font-semibold">{currentCompany.taxNumber || '402172967'}</span></div>
                          <div>E-mail: {currentCompany.email || 'raffaaliadosdocampo@gmail.com'}</div>
                          <div>Tel: {currentCompany.phone || '258848361130'} {currentCompany.mobile ? `| Tlm: ${currentCompany.mobile}` : ''}</div>
                        </div>
                      </div>

                      <div className="text-right text-[9px] pt-1">
                        <div className="font-bold text-neutral-900 uppercase">
                          {selectedDocForPreview.customerName || 'CARLOS'}
                        </div>
                        <div className="text-neutral-600">Moçambique</div>
                        <div className="text-neutral-500 font-mono text-[8.5px]">
                          NUIT: {selectedDocForPreview.customerNif || selectedDocForPreview.customerTaxNumber || '---------'}
                        </div>
                      </div>
                    </div>

                    {/* Document Title Bar & 4-Column Meta Header */}
                    <div className="my-2">
                      <div className="flex justify-between items-center text-xs font-bold text-neutral-950 pb-1">
                        <span>
                          {selectedDocForPreview.invoiceType === 'FS'
                            ? 'Fatura Simplificada'
                            : selectedDocForPreview.invoiceType === 'NC'
                            ? 'Nota de Crédito'
                            : selectedDocForPreview.invoiceType === 'FR'
                            ? 'Fatura-Recibo'
                            : 'Fatura'}{' '}
                          n.º {selectedDocForPreview.invoiceNumber}
                        </span>
                        <span className="font-normal text-neutral-600 text-[9px]">Original</span>
                      </div>

                      <div className="grid grid-cols-4 border-y border-neutral-300 py-1 text-[8px]">
                        <div>
                          <div className="font-bold text-neutral-800">Data (Date)</div>
                          <div className="text-neutral-600 font-mono">
                            {new Date(selectedDocForPreview.date).toISOString().split('T')[0]}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-neutral-800">Vencimento (Due)</div>
                          <div className="text-neutral-600 font-mono">
                            {selectedDocForPreview.dueDate
                              ? new Date(selectedDocForPreview.dueDate).toISOString().split('T')[0]
                              : new Date(selectedDocForPreview.date).toISOString().split('T')[0]}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-neutral-800">Contribuinte (VAT NR)</div>
                          <div className="text-neutral-600 font-mono">
                            {selectedDocForPreview.customerNif || '---------'}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-neutral-800">V/ Ref. (Your Ref.)</div>
                          <div className="text-neutral-600 font-mono">{selectedDocForPreview.invoiceNumber}</div>
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full text-left text-[8.5px] border-b border-neutral-300 mb-2">
                      <thead>
                        <tr className="border-b border-neutral-300 font-bold text-neutral-900 bg-neutral-50/80">
                          <th className="py-1">Código<br/><span className="text-[7.5px] font-normal text-neutral-500">(Code)</span></th>
                          <th className="py-1">Descrição<br/><span className="text-[7.5px] font-normal text-neutral-500">(Description)</span></th>
                          <th className="py-1 text-right">P. Uni.<br/><span className="text-[7.5px] font-normal text-neutral-500">(Unit Price)</span></th>
                          <th className="py-1 text-center">Uni.<br/><span className="text-[7.5px] font-normal text-neutral-500">(Unit)</span></th>
                          <th className="py-1 text-center">Qtd.<br/><span className="text-[7.5px] font-normal text-neutral-500">(Qty)</span></th>
                          <th className="py-1 text-center">IVA<br/><span className="text-[7.5px] font-normal text-neutral-500">(VAT)</span></th>
                          <th className="py-1 text-right">Total<br/><span className="text-[7.5px] font-normal text-neutral-500">(Total)</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {selectedDocForPreview.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-1 font-mono text-[8px]">
                              <div>{it.sku || `ART-${idx + 1}`}</div>
                              <div className="text-[7.5px] text-neutral-500">Lote1</div>
                            </td>
                            <td className="py-1 font-medium">{it.productName}</td>
                            <td className="py-1 text-right font-mono">{formatCurrency(it.unitPrice)}</td>
                            <td className="py-1 text-center font-mono">UNI</td>
                            <td className="py-1 text-center font-mono font-bold">{it.quantity}</td>
                            <td className="py-1 text-center font-mono">{it.taxRate}% (1)</td>
                            <td className="py-1 text-right font-mono font-bold">{formatCurrency(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Lower Grid: Taxes & Bank on Left, Summary & Grand Total on Right */}
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-300 items-start">
                      {/* Left: Tax breakdown & Payment & Bank */}
                      <div className="space-y-1.5 text-[8px]">
                        <table className="w-full border-collapse border border-neutral-300 text-left">
                          <thead>
                            <tr className="bg-neutral-100 font-bold text-neutral-800 text-[7.5px]">
                              <th className="p-0.5 border border-neutral-300">Taxa (Tax)</th>
                              <th className="p-0.5 border border-neutral-300 text-right">Base (Net)</th>
                              <th className="p-0.5 border border-neutral-300 text-right">IVA (VAT)</th>
                              <th className="p-0.5 border border-neutral-300 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {taxRows.map(([rate, val]) => (
                              <tr key={rate}>
                                <td className="p-0.5 border border-neutral-300 font-mono">{rate}%</td>
                                <td className="p-0.5 border border-neutral-300 text-right font-mono">{formatCurrency(val.base)}</td>
                                <td className="p-0.5 border border-neutral-300 text-right font-mono">{formatCurrency(val.tax)}</td>
                                <td className="p-0.5 border border-neutral-300 text-right font-mono">{formatCurrency(val.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="text-[7px] text-neutral-500 italic leading-tight">
                          {previewTmpl.legalNotice || '(1) Não sujeito; não tributado ou similar'}
                        </div>

                        {/* Payment method */}
                        <div className="pt-0.5">
                          <span className="font-bold text-neutral-800">Modo Pagamento: </span>
                          <span className="font-mono uppercase">{selectedDocForPreview.payments?.[0]?.method || 'Numerário / Pronto'}</span>
                        </div>

                        {/* Bank info */}
                        {(previewTmpl.bankIban || previewTmpl.bankName) && (
                          <div className="bg-neutral-50 p-1 border border-neutral-200 rounded text-[7.5px] font-mono leading-tight">
                            <span className="font-bold text-neutral-900">Coordenadas Bancárias: </span>
                            {previewTmpl.bankName || 'Millennium BIM (Moçambique)'} | IBAN: {previewTmpl.bankIban || 'MZ59 0001 0000 1234 5678 9012 3'}
                          </div>
                        )}
                      </div>

                      {/* Right: Resume Summary */}
                      <div className="space-y-0.5 text-[8.5px] border border-neutral-300 p-1.5 rounded bg-neutral-50/50 text-right">
                        <div className="flex justify-between text-neutral-700">
                          <span>Total Ilíquido:</span>
                          <span className="font-mono">{formatCurrency(selectedDocForPreview.subtotal)}</span>
                        </div>
                        {selectedDocForPreview.discountTotal > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Desconto Comercial:</span>
                            <span className="font-mono">-{formatCurrency(selectedDocForPreview.discountTotal)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-neutral-700">
                          <span>Total Imposto (IVA):</span>
                          <span className="font-mono">{formatCurrency(selectedDocForPreview.taxTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold text-neutral-950 pt-1 border-t border-neutral-300">
                          <span>Total a Pagar:</span>
                          <span className="font-mono text-sm">{formatCurrency(selectedDocForPreview.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Hash & Cert */}
                    <div className="pt-2 border-t border-neutral-300 mt-2 flex justify-between items-end text-[7px] font-mono text-neutral-500">
                      <div>Assinatura Digital AT: {selectedDocForPreview.fiscalHash || '0EC949341CA5FDD4'}</div>
                      <div className="text-right">
                        Software Certificado nº {currentCompany.softwareCertNumber || '4120/AT'} - Processado por Sistema Certificado
                      </div>
                    </div>
                  </div>
                ) : (
                  /* CLASSIC / MODERN / CORPORATE SIMULATION */
                  <div
                    className="bg-white text-neutral-900 shadow-2xl p-6 rounded relative text-[10px] leading-snug w-full max-w-2xl font-sans border-t-4"
                    style={{ borderColor: previewTmpl.primaryColor || '#1e293b' }}
                  >
                    <div className="flex justify-between items-start pb-3 border-b border-neutral-200">
                      <div>
                        <h4 className="text-sm font-serif font-bold text-neutral-900">{currentCompany.name}</h4>
                        <p className="text-[8.5px] text-neutral-600">{currentCompany.address}, {currentCompany.city}</p>
                        <p className="text-[8.5px] font-mono text-neutral-600">NUIT/NIF: {currentCompany.taxNumber}</p>
                        <p className="text-[8px] font-mono text-emerald-700 mt-0.5">Software Certificado nº {currentCompany.softwareCertNumber || '4120/AT'}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-mono font-bold text-white"
                          style={{ backgroundColor: previewTmpl.primaryColor || '#1e293b' }}
                        >
                          {selectedDocForPreview.invoiceType || 'FS'}
                        </span>
                        <p className="text-xs font-mono font-bold text-neutral-900 mt-1">{selectedDocForPreview.invoiceNumber}</p>
                        <p className="text-[8.5px] font-mono text-neutral-500">
                          Data: {new Date(selectedDocForPreview.date).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                    </div>

                    {/* Customer */}
                    <div className="my-2 p-2 bg-neutral-50 border border-neutral-200 rounded text-[9px]">
                      <span className="text-[8px] text-neutral-500 uppercase font-semibold block">Exmo.(a) Senhor(a):</span>
                      <strong className="text-neutral-900">{selectedDocForPreview.customerName || 'Consumidor Final'}</strong>
                      <span className="text-neutral-600 font-mono ml-2">NIF: {selectedDocForPreview.customerNif || '999999990'}</span>
                    </div>

                    {/* Table */}
                    <table className="w-full text-left text-[9px] border-b border-neutral-200 my-2">
                      <thead>
                        <tr className="border-b border-neutral-300 font-bold text-neutral-800 bg-neutral-50">
                          <th className="py-1">Artigo</th>
                          <th className="py-1 text-center">Qtd</th>
                          <th className="py-1 text-right">PVP Unit.</th>
                          <th className="py-1 text-center">IVA</th>
                          <th className="py-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {selectedDocForPreview.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-1 font-medium">{it.productName}</td>
                            <td className="py-1 text-center font-mono">{it.quantity}</td>
                            <td className="py-1 text-right font-mono">{formatCurrency(it.unitPrice)}</td>
                            <td className="py-1 text-center font-mono">{it.taxRate}%</td>
                            <td className="py-1 text-right font-mono font-bold">{formatCurrency(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div className="pt-2 border-t border-neutral-200 flex justify-between items-start text-[9px]">
                      <div className="space-y-0.5">
                        {previewTmpl.bankIban && (
                          <div className="font-mono text-[8px] text-neutral-600">
                            <strong>IBAN:</strong> {previewTmpl.bankIban} ({previewTmpl.bankName || 'Banco'})
                          </div>
                        )}
                        <div className="font-mono text-[8px] text-neutral-500">
                          Assinatura AT: {selectedDocForPreview.fiscalHash}
                        </div>
                      </div>
                      <div className="text-right space-y-0.5 font-mono">
                        <div>Base: {formatCurrency(selectedDocForPreview.subtotal)}</div>
                        <div>IVA: {formatCurrency(selectedDocForPreview.taxTotal)}</div>
                        <div className="text-xs font-bold text-neutral-900 pt-1 border-t border-neutral-300">
                          Total: {formatCurrency(selectedDocForPreview.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#222]">
                <button
                  onClick={() => setSelectedDocForPreview(null)}
                  className="px-4 py-2 bg-[#181818] hover:bg-[#222] text-neutral-300 font-medium rounded-xl text-xs cursor-pointer"
                >
                  Fechar
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      notify(`Documento ${selectedDocForPreview.invoiceNumber} enviado por email com sucesso.`, 'success');
                    }}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-neutral-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>Enviar Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      downloadInvoicePdf(selectedDocForPreview, currentCompany, previewTmpl);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-neutral-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>Baixar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      printThermalReceipt(selectedDocForPreview, currentCompany, currentStore);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-neutral-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>Talão 80mm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      printInvoiceDocument(selectedDocForPreview, currentCompany, previewTmpl);
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-xl text-xs cursor-pointer shadow-md"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir A4 ({previewTmpl.name.split(' ')[0]})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
