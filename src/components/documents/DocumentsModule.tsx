import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sale, SaleItem, OmnichannelOrder, OmnichannelOrderStatus, PaymentMethod, InvoiceType } from '../../types';
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
  Boxes,
  CheckSquare,
  Square,
  Minus,
  ListPlus,
  SlidersHorizontal,
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
  Info,
  Check,
  RotateCcw,
  Edit3,
  Copy,
  ArrowRightCircle,
  Tag,
  ChevronDown,
  Ban,
  ArrowLeft,
} from 'lucide-react';
import { sound } from '../../utils/audio';
import {
  printThermalReceipt,
  printInvoiceDocument,
  downloadInvoicePdf,
  getActiveInvoiceTemplate,
  getDocumentTitle,
} from '../../utils/print';
import { calculateNetSalesRevenue, isEffectiveSale, canEditDocument, canDeleteDocument } from '../../utils/documentUtils';
import { defaultInvoiceTemplates } from '../../mockData';

export const DocumentsModule: React.FC = () => {
  const {
    salesHistory,
    setSalesHistory,
    products,
    categories,
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
    getAvailableStock,
    updateOrderStatus,
    convertOrderToSale,
    cancelInvoice,
    updateDocument,
    deleteDocument,
    clearSalesHistory,
    convertQuoteToInvoice,
    updateDocumentStatus,
    recordStockMovement,
    deductStockForItems,
    replenishStockForItems,
    requestConfirm,
    notify,
    hasPermission,
    setActiveNavTab,
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
            onClick={() => setActiveNavTab('pos')}
            className="px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-xl cursor-pointer shadow-md transition-colors"
          >
            Voltar ao Ponto de Venda
          </button>
        </div>
      </div>
    );
  }

  // ================= STATE FOR NEW DOCUMENT ISSUANCE =================
  const [docType, setDocType] = useState<InvoiceType>('FT');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerNif, setCustomerNif] = useState<string>('999999990');
  const [customerName, setCustomerName] = useState<string>('Consumidor Final');
  const [customerAddress, setCustomerAddress] = useState<string>('Lisboa, Portugal');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [paymentTerm, setPaymentTerm] = useState<string>('pronto');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cartao');
  const [selectedSeries, setSelectedSeries] = useState<string>('2026A');
  const [documentNotes, setDocumentNotes] = useState<string>('');

  // Transport & Delivery Guide Specifics (GT / GR)
  const [transportOrigin, setTransportOrigin] = useState<string>(currentStore.address || 'Armazém Central, Lisboa');
  const [transportDestination, setTransportDestination] = useState<string>('Morada do Cliente');
  const [vehiclePlate, setVehiclePlate] = useState<string>('99-AA-00');
  const [driverName, setDriverName] = useState<string>('');

  // Credit Note Specifics (NC) & Debit Note (ND) & Receipt (RC)
  const [originInvoiceNumber, setOriginInvoiceNumber] = useState<string>('');
  const [ncReason, setNcReason] = useState<string>('Devolução de Artigo / Acordo Comercial');
  const [ncRestock, setNcRestock] = useState<boolean>(true);
  const [ndReason, setNdReason] = useState<string>('Correção de Preço / Débito Adicional de Serviços');

  // Modal for issuing Credit Note from Archive list
  const [creditNoteModalDoc, setCreditNoteModalDoc] = useState<Sale | null>(null);
  const [creditNoteModalReason, setCreditNoteModalReason] = useState<string>('Devolução de Mercadoria / Anulação');
  const [creditNoteModalRestock, setCreditNoteModalRestock] = useState<boolean>(true);

  // Quotation & Proforma Specifics (ORC / PF)
  const [orcValidity, setOrcValidity] = useState<string>('30 dias');

  // ================= DOCUMENT CRUD & MANAGEMENT STATES =================
  const [editingDoc, setEditingDoc] = useState<Sale | null>(null);
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editCustomerNif, setEditCustomerNif] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editValidity, setEditValidity] = useState<string>('30 dias');
  const [editStatus, setEditStatus] = useState<Sale['status']>('pendente');
  const [editItems, setEditItems] = useState<(SaleItem & { tempId: string })[]>([]);

  // Convert Quote to Invoice Modal state
  const [convertingDoc, setConvertingDoc] = useState<Sale | null>(null);
  const [convertTargetType, setConvertTargetType] = useState<InvoiceType>('FT');
  const [convertPaymentMethod, setConvertPaymentMethod] = useState<PaymentMethod>('numerario');
  const [isConverting, setIsConverting] = useState<boolean>(false);

  // Delete Document Modal states
  const [deletingDoc, setDeletingDoc] = useState<Sale | null>(null);
  const [deletingDocRestock, setDeletingDocRestock] = useState<boolean>(false);
  const [showClearArchiveModal, setShowClearArchiveModal] = useState<boolean>(false);
  const [clearScope, setClearScope] = useState<'all' | 'filtered'>('all');
  const [clearRestockStock, setClearRestockStock] = useState<boolean>(false);

  // Start Editing a Document (Quote / Proforma)
  const handleStartEdit = (doc: Sale) => {
    setEditingDoc(doc);
    setEditCustomerName(doc.customerName || 'Consumidor Final');
    setEditCustomerNif(doc.customerNif || doc.customerTaxNumber || '999999990');
    setEditNotes(doc.notes || '');
    setEditValidity(doc.validityDate || '30 dias');
    setEditStatus(doc.status || 'pendente');
    setEditItems(
      doc.items.map((item, idx) => ({
        ...item,
        tempId: `edit-item-${Date.now()}-${idx}`,
      }))
    );
  };

  // Save Edit Changes
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    if (editItems.length === 0) {
      notify('O documento deve conter pelo menos um artigo.', 'warning');
      return;
    }

    const subtotal = editItems.reduce((acc, it) => acc + it.total, 0);
    const taxSummary: Record<number, { base: number; tax: number }> = {};
    editItems.forEach((i) => {
      const rate = i.taxRate || 23;
      const base = i.total / (1 + rate / 100);
      const tax = i.total - base;
      if (!taxSummary[rate]) taxSummary[rate] = { base: 0, tax: 0 };
      taxSummary[rate].base += base;
      taxSummary[rate].tax += tax;
    });
    const taxTotal = Object.values(taxSummary).reduce((acc, t) => acc + t.tax, 0);
    const total = subtotal;

    updateDocument(editingDoc.id, {
      customerName: editCustomerName.trim(),
      customerNif: editCustomerNif.trim(),
      customerTaxNumber: editCustomerNif.trim(),
      notes: editNotes.trim(),
      validityDate: editValidity,
      status: editStatus,
      items: editItems.map(({ tempId, ...rest }) => rest),
      subtotal,
      taxTotal,
      total,
    });

    setEditingDoc(null);
  };

  // Duplicate Document to Emission Tab
  const handleDuplicateDoc = (doc: Sale) => {
    setDocType(doc.invoiceType);
    setCustomerName(doc.customerName || 'Consumidor Final');
    setCustomerNif(doc.customerNif || doc.customerTaxNumber || '999999990');
    setSelectedCustomerId(doc.customerId || '');
    setDocumentNotes(
      doc.notes
        ? `Cópia do doc ${doc.invoiceNumber}: ${doc.notes}`
        : `Cópia do documento ${doc.invoiceNumber}`
    );
    setDocItems(
      doc.items.map((item, idx) => ({
        ...item,
        tempId: `dup-item-${Date.now()}-${idx}`,
      }))
    );
    setActiveTab('emit');
    sound.playSuccessChime();
    notify(`Documento ${doc.invoiceNumber} duplicado para a emissão! Pode ajustar os dados e emitir.`, 'success');
  };

  // Convert Quote
  const handleConfirmConvert = async () => {
    if (!convertingDoc) return;
    setIsConverting(true);
    try {
      const newInvoice = await convertQuoteToInvoice(
        convertingDoc.id,
        convertTargetType,
        convertPaymentMethod
      );
      if (newInvoice) {
        setConvertingDoc(null);
        setSelectedDocForPreview(newInvoice);
      }
    } finally {
      setIsConverting(false);
    }
  };

  // Delete Document (Single)
  const handleConfirmDelete = () => {
    if (!deletingDoc) return;
    deleteDocument(deletingDoc.id, deletingDocRestock);
    setDeletingDoc(null);
  };

  // Clear / Delete Multiple Documents from Archive
  const handleConfirmClearArchive = () => {
    if (clearScope === 'all') {
      clearSalesHistory('all', clearRestockStock);
    } else {
      const idsToDelete = filteredArchive.map((d) => d.id);
      clearSalesHistory(idsToDelete, clearRestockStock);
    }
    setShowClearArchiveModal(false);
  };

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

  // ================= MASS PRODUCT SELECTION STATE =================
  const [showMassAddModal, setShowMassAddModal] = useState<boolean>(false);
  const [massSelectedItems, setMassSelectedItems] = useState<Record<string, number>>({});
  const [massSearchQuery, setMassSearchQuery] = useState<string>('');
  const [massCategoryFilter, setMassCategoryFilter] = useState<string>('todas');
  const [massStockOnly, setMassStockOnly] = useState<boolean>(false);
  const [massBatchQty, setMassBatchQty] = useState<number>(1);

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

      // Check stock availability if document type affects physical inventory (e.g. FS, FT, FR, GT, GR, VD)
      const isInventoryDocument = !['ORC', 'PF', 'NC', 'RC'].includes(docType);
      if (isInventoryDocument) {
        const available = getAvailableStock(prod.id, currentStore.defaultWarehouseId);
        if (available <= 0) {
          sound.playError();
          notify(`Artigo sem stock: Não é possível adicionar "${prod.name}" porque o stock atual é 0 ou insuficiente.`, 'error');
          return;
        }

        const existingQty = docItems
          .filter((i) => i.productId === prod.id)
          .reduce((sum, i) => sum + i.quantity, 0);

        if (existingQty + itemQty > available) {
          sound.playError();
          notify(`Stock insuficiente para "${prod.name}": Disponível: ${available}, Já no documento: ${existingQty}, Tentativa: ${itemQty}.`, 'error');
          return;
        }
      }

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

  const handleUpdateItemQuantity = (tempId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(tempId);
      return;
    }
    setDocItems((prev) =>
      prev.map((item) => {
        if (item.tempId === tempId) {
          const isInventoryDocument = !['ORC', 'PF', 'NC', 'RC'].includes(docType);
          if (isInventoryDocument && item.productId && !item.productId.startsWith('custom-')) {
            const available = getAvailableStock(item.productId, currentStore.defaultWarehouseId);
            if (available > 0 && newQty > available) {
              notify(`Atenção: A quantidade (${newQty}) excede o stock disponível (${available}) no armazém.`, 'warning');
            }
          }

          const rate = item.taxRate || 23;
          const unitPrice = item.unitPrice;
          const total = unitPrice * newQty;
          const base = total / (1 + rate / 100);
          const taxAmount = total - base;
          return {
            ...item,
            quantity: newQty,
            taxAmount,
            total,
          };
        }
        return item;
      })
    );
  };

  // ================= MASS PRODUCT SELECTION HANDLERS =================
  const handleToggleMassSelect = (prodId: string, defaultQty: number = 1) => {
    setMassSelectedItems((prev) => {
      const updated = { ...prev };
      if (updated[prodId] !== undefined) {
        delete updated[prodId];
      } else {
        updated[prodId] = defaultQty > 0 ? defaultQty : 1;
      }
      return updated;
    });
  };

  const handleSetMassQuantity = (prodId: string, qty: number) => {
    setMassSelectedItems((prev) => {
      const updated = { ...prev };
      if (qty <= 0) {
        delete updated[prodId];
      } else {
        updated[prodId] = qty;
      }
      return updated;
    });
  };

  const handleSelectAllVisible = (visibleProds: typeof products) => {
    setMassSelectedItems((prev) => {
      const updated = { ...prev };
      const fallbackQty = massBatchQty > 0 ? massBatchQty : 1;
      visibleProds.forEach((p) => {
        if (updated[p.id] === undefined) {
          updated[p.id] = fallbackQty;
        }
      });
      return updated;
    });
  };

  const handleDeselectAll = () => {
    setMassSelectedItems({});
  };

  const handleApplyBatchQuantity = (qty: number) => {
    if (qty <= 0) return;
    setMassSelectedItems((prev) => {
      const updated: Record<string, number> = {};
      Object.keys(prev).forEach((k) => {
        updated[k] = qty;
      });
      return updated;
    });
  };

  const handleConfirmMassAdd = () => {
    const selectedEntries: [string, number][] = Object.entries(massSelectedItems).map(([k, v]) => [k, Number(v)] as [string, number]).filter(([_, qty]) => qty > 0);
    if (selectedEntries.length === 0) {
      notify('Nenhum artigo selecionado para adicionar.', 'warning');
      return;
    }

    const isInventoryDoc = !['ORC', 'PF', 'NC', 'RC'].includes(docType);
    let addedCount = 0;
    const newItems: (SaleItem & { tempId: string; notes?: string })[] = [];

    for (const [prodId, qty] of selectedEntries) {
      const prod = products.find((p) => p.id === prodId);
      if (!prod) continue;

      if (isInventoryDoc) {
        const available = getAvailableStock(prod.id, currentStore.defaultWarehouseId);
        if (available <= 0) {
          notify(`Artigo "${prod.name}" sem stock atual no armazém principal.`, 'warning');
        } else if (qty > available) {
          notify(`Aviso: Qtd de "${prod.name}" (${qty}) excede stock (${available}).`, 'warning');
        }
      }

      const rate = prod.taxRate || 23;
      const unitPrice = prod.price;
      const total = unitPrice * qty;
      const base = total / (1 + rate / 100);
      const taxAmount = total - base;

      newItems.push({
        tempId: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: qty,
        unitPrice,
        taxRate: rate,
        taxAmount,
        discountPercent: 0,
        discountAmount: 0,
        total,
      });
      addedCount++;
    }

    if (newItems.length > 0) {
      setDocItems((prev) => [...prev, ...newItems]);
      sound.playCashRegisterSound();
      notify(`${addedCount} produto(s) adicionado(s) com sucesso ao documento!`, 'success');
      setShowMassAddModal(false);
      setMassSelectedItems({});
    }
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

  // Cancel Document Emission Handler
  const handleCancelEmission = () => {
    if (docItems.length > 0) {
      requestConfirm({
        title: 'Cancelar Emissão de Documento',
        message: 'Tem a certeza que deseja cancelar a emissão deste documento? Todas as linhas e artigos adicionados serão descartados.',
        confirmLabel: 'Sim, Cancelar Emissão',
        cancelLabel: 'Continuar a Editar',
        variant: 'danger',
        onConfirm: () => {
          setDocItems([]);
          setDocumentNotes('');
          setActiveTab('archive');
          notify('Emissão de documento cancelada.', 'info');
        },
      });
    } else {
      setDocItems([]);
      setDocumentNotes('');
      setActiveTab('archive');
      notify('Emissão cancelada.', 'info');
    }
  };

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

    // Strict stock verification for inventory documents (FS, FT, FR, GT, GR, VD)
    const isInventoryDocument = !['ORC', 'PF', 'NC', 'RC'].includes(docType);
    if (isInventoryDocument) {
      for (const item of docItems) {
        if (item.productId && !item.productId.startsWith('custom-')) {
          const available = getAvailableStock(item.productId, currentStore.defaultWarehouseId);
          if (available <= 0) {
            sound.playError();
            notify(`Emissão cancelada: O artigo "${item.productName}" está com stock zero ou esgotado.`, 'error');
            return;
          }
          const totalReqQty = docItems
            .filter((i) => i.productId === item.productId)
            .reduce((sum, i) => sum + i.quantity, 0);

          if (totalReqQty > available) {
            sound.playError();
            notify(`Emissão cancelada: Stock insuficiente para "${item.productName}". Disponível: ${available}, Requerido: ${totalReqQty}.`, 'error');
            return;
          }
        }
      }
    }

    const countType = salesHistory.filter((s) => (s.invoiceType || '').toUpperCase() === docType).length + 1;
    const docPrefix = docType;
    const invNumber = `${docPrefix} 2026/${String(countType).padStart(4, '0')}`;
    const dateStr = new Date().toISOString();
    const prevSale = salesHistory[0];
    const prevHash = prevSale ? prevSale.fiscalHash : '0000000000000000';
    const fiscalHash = `HASH-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    let generatedNotes = documentNotes;
    if (!generatedNotes) {
      if (docType === 'GT' || docType === 'GR') {
        generatedNotes = `Guia de ${docType === 'GT' ? 'Transporte' : 'Remessa'}. Carga: ${transportOrigin} | Descarga: ${transportDestination} | Matrícula: ${vehiclePlate}${driverName ? ` | Condutor: ${driverName}` : ''}`;
      } else if (docType === 'NC') {
        const stockStatusText = ncRestock ? 'Artigos repostos no inventário' : 'Sem reposição física / Apenas estorno financeiro';
        generatedNotes = `Nota de Crédito ref. ${originInvoiceNumber || 'Fatura Original'}. Motivo: ${ncReason} [Stock: ${stockStatusText}]`;
      } else if (docType === 'ND') {
        generatedNotes = `Nota de Débito ref. ${originInvoiceNumber || 'Fatura Original'}. Motivo: ${ndReason}`;
      } else if (docType === 'ORC' || docType === 'PF') {
        generatedNotes = `Documento Proposta / Cotação. Validade: ${orcValidity}. Não serve de fatura. Não movimenta stock.`;
      } else if (docType === 'RC') {
        generatedNotes = `Recibo de Quitação ref. ${originInvoiceNumber || 'Fatura Original'}.`;
      }
    }

    const initialStatus =
      docType === 'ORC' || docType === 'PF'
        ? 'pendente'
        : docType === 'FR' || docType === 'FS' || docType === 'VD'
        ? 'pago'
        : docType === 'NC'
        ? 'anulado'
        : 'emitido';

    const newDoc: Sale = {
      id: `doc-${Date.now()}`,
      companyId: currentCompany.id,
      storeId: currentStore.id,
      terminalId: currentTerminal.id,
      invoiceNumber: invNumber,
      invoiceType: docType,
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
      status: initialStatus,
      validityDate: docType === 'ORC' || docType === 'PF' ? orcValidity : undefined,
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
      fiscalSeries: selectedSeries,
      invoiceTemplateId: previewTemplateId || currentCompany.activeInvoiceTemplateId || activeTemplate.id,
      notes: generatedNotes,
    };

    // 1. Stock handling: deduct for sales/transport, replenish for credit note if enabled, bypass for quotation/proforma/receipt
    if (docType === 'NC') {
      if (ncRestock) {
        replenishStockForItems(
          docItems,
          currentStore.defaultWarehouseId,
          invNumber,
          `Emissão de Nota de Crédito ${invNumber} ref. ${originInvoiceNumber || ''} (Devolução ao Stock)`
        );
      }
    } else if (isInventoryDocument) {
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
    const docDisplayTitle = getDocumentTitle(docType);
    notify(`${docDisplayTitle} ${invNumber} emitida e assinada digitalmente com sucesso (Cert. 4120/AT).`, 'success');

    // Reset doc form
    setDocItems([]);
    setDocumentNotes('');
    setSelectedDocForPreview(newDoc);
  };

  // Filtered Archive
  const filteredArchive = salesHistory.filter((doc) => {
    const docT = (doc.invoiceType || '').toUpperCase();
    const matchType =
      archiveTypeFilter === 'todos' ||
      docT === archiveTypeFilter ||
      (archiveTypeFilter === 'PF' && (docT === 'PF' || docT === 'ORC'));
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

  // Mass Products Filtered List (Alphabetically sorted)
  const massFilteredProducts = products
    .filter((p) => {
      const matchesSearch =
        massSearchQuery.trim() === '' ||
        p.name.toLowerCase().includes(massSearchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(massSearchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(massSearchQuery.toLowerCase()));

      const matchesCategory =
        massCategoryFilter === 'todas' ||
        p.categoryId === massCategoryFilter ||
        p.category === massCategoryFilter;

      const available = getAvailableStock(p.id, currentStore.defaultWarehouseId);
      const matchesStock = !massStockOnly || available > 0 || ['PF', 'ORC'].includes(docType);

      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt', { sensitivity: 'base', numeric: true }));

  const massSelectedCount = Object.keys(massSelectedItems).length;
  const massTotalUnits = Object.values(massSelectedItems).reduce((sum: number, q) => sum + Number(q), 0);
  const massEstimatedTotal = Object.entries(massSelectedItems).reduce((sum: number, [prodId, qty]) => {
    const prod = products.find((p) => p.id === prodId);
    return sum + (prod ? prod.price * Number(qty) : 0);
  }, 0);

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
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#262626] flex items-center space-x-2">
            <span className="text-neutral-400">Total Documentos:</span>
            <span className="font-mono font-bold text-white">{salesHistory.length}</span>
          </div>

          <div
            className="px-3 py-1.5 rounded-lg bg-[#c5a47e]/10 border border-[#c5a47e]/30 flex items-center space-x-2 text-[#c5a47e]"
            title="Faturação Comercial Efetiva (FT, FS, FR, VD menos NC). Faturas Proforma são excluídas."
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-neutral-300">Vendas Efetivas:</span>
            <span className="font-mono font-bold">
              {formatCurrency(calculateNetSalesRevenue(salesHistory))}
            </span>
          </div>

          {salesHistory.some((s) => ['PF', 'ORC'].includes((s.invoiceType || '').toUpperCase())) && (
            <div
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center space-x-2 text-amber-400"
              title="Faturas Proforma em aberto (não somam em relatórios de vendas até conversão)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="text-neutral-400">Proformas:</span>
              <span className="font-mono font-bold">
                {
                  salesHistory.filter(
                    (s) =>
                      ['PF', 'ORC'].includes((s.invoiceType || '').toUpperCase()) &&
                      s.status !== 'anulado' &&
                      s.status !== 'convertido'
                  ).length
                }{' '}
                (
                {formatCurrency(
                  salesHistory
                    .filter(
                      (s) =>
                        ['PF', 'ORC'].includes((s.invoiceType || '').toUpperCase()) &&
                        s.status !== 'anulado' &&
                        s.status !== 'convertido'
                    )
                    .reduce((acc, q) => acc + (q.total || 0), 0)
                )}
                )
              </span>
            </div>
          )}
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
            <span>Encomendas ({omnichannelOrders.length})</span>
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
                <div className="flex items-center space-x-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#c5a47e]" />
                    <span>1. Tipo de Documento Fiscal / Comercial</span>
                  </h3>
                </div>
                <div className="flex items-center space-x-3 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={handleCancelEmission}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 mr-2"
                    title="Cancelar emissão de documento e voltar ao arquivo"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar Emissão</span>
                  </button>
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

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
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
                    id: 'ND',
                    name: 'ND - Nota de Débito',
                    desc: 'Débito Adicional / Ajuste',
                    badge: 'Fiscal',
                  },
                  {
                    id: 'PF',
                    name: 'PF - Fatura Proforma',
                    desc: 'Cotação / Proposta Prévia',
                    badge: 'Proforma',
                  },
                  {
                    id: 'GT',
                    name: 'GT - Guia Transporte',
                    desc: 'Circulação de Carga',
                    badge: 'Comunicação AT',
                  },
                  {
                    id: 'GR',
                    name: 'GR - Guia de Remessa',
                    desc: 'Entrega de Mercadoria',
                    badge: 'Logística',
                  },
                  {
                    id: 'RC',
                    name: 'RC - Recibo Quitação',
                    desc: 'Liquidação de Fatura',
                    badge: 'Tesouraria',
                  },
                  {
                    id: 'VD',
                    name: 'VD - Venda a Dinheiro',
                    desc: 'Transação Imediata',
                    badge: 'Direto',
                  },
                ].map((type) => (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => setDocType(type.id as InvoiceType)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      docType === type.id
                        ? 'bg-[#c5a47e]/15 border-[#c5a47e] text-white ring-1 ring-[#c5a47e]'
                        : 'bg-[#161616] border-[#262626] text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-bold text-xs block text-[#e5e5e5]">{type.name}</span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">{type.desc}</span>
                    <span
                      className={`inline-block mt-2 px-1.5 py-0.5 rounded-xs text-[9px] font-mono ${
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

              {(docType === 'PF' || docType === 'ORC') && (
                <div className="mt-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start space-x-3 text-xs text-amber-300">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Fatura Proforma (Documento Estimativo)</span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Este documento é uma estimativa comercial de preços e condições. Não movimenta o inventário e <strong>não é considerado venda nem avança valores nos relatórios de faturação/DRE</strong> até que seja aprovado e convertido em Fatura oficial (FT, FR ou FS).
                    </p>
                  </div>
                </div>
              )}
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
                    <label className="text-neutral-400 block mb-1 font-semibold">Email para Envio de Documento</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="cliente@empresa.pt"
                      className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                {/* Additional conditional fields for Credit Note */}
                {docType === 'NC' && (
                  <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-rose-300 font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Parâmetros da Nota de Crédito (Estorno / Retificação)</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold uppercase">
                        Documento Retificativo
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-neutral-400 block mb-1 font-semibold">Nº Fatura de Origem *</label>
                        <input
                          type="text"
                          required
                          value={originInvoiceNumber}
                          onChange={(e) => setOriginInvoiceNumber(e.target.value)}
                          placeholder="ex: FT 2026/0012"
                          className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white font-mono focus:outline-hidden focus:border-[#c5a47e]"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1 font-semibold">Motivo de Retificação / Estorno *</label>
                        <input
                          type="text"
                          required
                          value={ncReason}
                          onChange={(e) => setNcReason(e.target.value)}
                          placeholder="ex: Devolução de Mercadoria / Acordo Comercial"
                          className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white focus:outline-hidden focus:border-[#c5a47e]"
                        />
                      </div>
                    </div>

                    {/* Stock Movement Option */}
                    <div className="pt-3 border-t border-rose-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-white font-bold block flex items-center space-x-2">
                          <Package className="w-4 h-4 text-[#c5a47e]" />
                          <span>Opção de Movimentação de Stock (Inventário):</span>
                        </label>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          ncRestock ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {ncRestock ? 'Com Reentrada de Stock' : 'Sem Reposição Física'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setNcRestock(true)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                            ncRestock
                              ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                              : 'bg-[#0f0f0f] border-[#262626] text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                            ncRestock ? 'border-emerald-400 bg-emerald-500' : 'border-neutral-600'
                          }`}>
                            {ncRestock && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-white block">Adicionar / Devolver ao Stock</span>
                            <span className="text-[11px] text-neutral-300 block mt-0.5">
                              Repõe as quantidades dos artigos no armazém da loja ({currentStore.name || 'Armazém Principal'}).
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setNcRestock(false)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                            !ncRestock
                              ? 'bg-amber-950/40 border-amber-500 text-white ring-1 ring-amber-500/50'
                              : 'bg-[#0f0f0f] border-[#262626] text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                            !ncRestock ? 'border-amber-400 bg-amber-500' : 'border-neutral-600'
                          }`}>
                            {!ncRestock && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-white block">Não Adicionar / Não Movimentar Stock</span>
                            <span className="text-[11px] text-neutral-300 block mt-0.5">
                              Apenas estorno financeiro/fiscal (ex: desconto concedido, mercadoria danificada/descartada ou sem retorno físico).
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional conditional fields for Debit Note */}
                {docType === 'ND' && (
                  <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-amber-300 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Parâmetros da Nota de Débito (Encargos / Débito Adicional)</span>
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
                        <label className="text-neutral-400 block mb-1">Motivo do Débito *</label>
                        <input
                          type="text"
                          required
                          value={ndReason}
                          onChange={(e) => setNdReason(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#333] rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional conditional fields for Fatura Proforma */}
                {(docType === 'PF' || docType === 'ORC') && (
                  <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                        <FileCheck className="w-4 h-4" />
                        <span>Parâmetros da Fatura Proforma</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded font-semibold text-[10px] uppercase">
                        Não Movimenta Stock
                      </span>
                    </div>

                    <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/20 rounded-lg text-emerald-200 text-[11px] flex items-start space-x-2">
                      <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Fatura Proforma:</strong> Este documento serve como estimativa e cotação oficial. Não abate stock nem exige stock em armazém para emissão. Pode adicionar artigos do catálogo mesmo que o stock esteja a zero.
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-neutral-400 block mb-1">Prazo de Validade da Proforma</label>
                        <select
                          value={orcValidity}
                          onChange={(e) => setOrcValidity(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#333] rounded-lg text-white"
                        >
                          <option value="15 dias">15 dias corridos</option>
                          <option value="30 dias">30 dias corridos</option>
                          <option value="60 dias">60 dias corridos</option>
                          <option value="90 dias">90 dias corridos</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">Condição de Adiantamento / Sinal</label>
                        <input
                          type="text"
                          placeholder="ex: 50% na adjudicação, 50% na entrega"
                          className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#333] rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional conditional fields for Receipts */}
                {docType === 'RC' && (
                  <div className="p-3.5 bg-sky-950/20 border border-sky-500/30 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-sky-300 font-bold">
                      <Receipt className="w-4 h-4" />
                      <span>Parâmetros do Recibo de Quitação</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-neutral-400 block mb-1">Nº Fatura Liquidada</label>
                        <input
                          type="text"
                          value={originInvoiceNumber}
                          onChange={(e) => setOriginInvoiceNumber(e.target.value)}
                          placeholder="ex: FT 2026/0005"
                          className="w-full px-3 py-1.5 bg-[#0a0a0a] border border-[#333] rounded-lg text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional conditional fields for Transport & Delivery */}
                {(docType === 'GT' || docType === 'GR') && (
                  <div className="p-3.5 bg-blue-950/20 border border-blue-500/30 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-blue-300 font-bold">
                      <Truck className="w-4 h-4" />
                      <span>Parâmetros de Transporte e Carga (Comunicação AT)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
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
                      <div>
                        <label className="text-neutral-400 block mb-1">Condutor / Motorista</label>
                        <input
                          type="text"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          placeholder="Nome do motorista"
                          className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#333] rounded-lg text-white"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-[#c5a47e]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    4. Linhas de Artigos & Serviços
                  </h3>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono text-[#c5a47e] font-bold">
                    {docItems.length} {docItems.length === 1 ? 'linha adicionada' : 'linhas adicionadas'}
                  </span>

                  {/* Mass Product Selection Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setMassSearchQuery('');
                      setMassCategoryFilter('todas');
                      setMassStockOnly(false);
                      setMassBatchQty(1);
                      setShowMassAddModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                    title="Adicionar múltiplos produtos de uma só vez selecionando produtos e definindo quantidades"
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Seleção Massiva de Produtos</span>
                  </button>
                </div>
              </div>

              {/* Add item control bar (Single item or Custom Description) */}
              <div className="p-3.5 bg-[#0d0d0d] rounded-xl border border-[#262626] grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs">
                <div className="md:col-span-4">
                  <label className="text-neutral-400 block mb-1 font-semibold">Artigo Individual do Catálogo</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      if (e.target.value) setCustomItemName('');
                    }}
                    className="w-full px-3 py-2 bg-[#181818] border border-[#2a2a2a] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
                  >
                    <option value="">-- Escolher artigo individual --</option>
                    {products.map((p) => {
                      const avail = getAvailableStock(p.id, currentStore.defaultWarehouseId);
                      const isOutOfStock = avail <= 0;
                      const canBypassStock = ['ORC', 'PF', 'NC'].includes(docType);
                      const stockLabel = isOutOfStock
                        ? (['PF', 'ORC'].includes(docType)
                          ? '⚠️ Sem Stock (Permitido em Proforma)'
                          : '🔴 SEM STOCK (0)')
                        : `🟢 Stock: ${avail}`;
                      return (
                        <option key={p.id} value={p.id} disabled={!canBypassStock && isOutOfStock}>
                          {p.name} ({p.sku}) - {formatCurrency(p.price)} (IVA {p.taxRate}%) — {stockLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-neutral-400 block mb-1 font-semibold">Ou Descrição Livre / Serviço</label>
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
                    className="w-full px-2 py-2 bg-[#181818] border border-[#2a2a2a] rounded-xl text-white font-mono text-center focus:outline-hidden focus:border-[#c5a47e]"
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

                <div className={`${customItemName ? 'md:col-span-2' : 'md:col-span-4'} flex items-center space-x-2`}>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex-1 py-2 bg-[#202020] hover:bg-[#282828] text-neutral-200 hover:text-white border border-[#333] font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Linha</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMassSearchQuery('');
                      setMassCategoryFilter('todas');
                      setMassStockOnly(false);
                      setMassBatchQty(1);
                      setShowMassAddModal(true);
                    }}
                    className="py-2 px-3 bg-[#c5a47e]/15 hover:bg-[#c5a47e]/25 text-[#c5a47e] border border-[#c5a47e]/40 font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center space-x-1 shrink-0"
                    title="Abrir catálogo completo para seleção em massa"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Em Massa</span>
                  </button>
                </div>
              </div>

              {/* Items Table with interactive inline quantity adjustments */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#262626] text-neutral-400">
                      <th className="pb-2.5 font-medium">SKU / Código</th>
                      <th className="pb-2.5 font-medium">Designação do Artigo / Serviço</th>
                      <th className="pb-2.5 font-medium text-center min-w-[140px]">Qtd & Ajuste</th>
                      <th className="pb-2.5 font-medium text-right">PVP Unit.</th>
                      <th className="pb-2.5 font-medium text-center">IVA</th>
                      <th className="pb-2.5 font-medium text-right">Total Linha</th>
                      <th className="pb-2.5 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {docItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-500">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <ShoppingBag className="w-8 h-8 text-neutral-600" />
                            <p className="text-xs">Nenhum artigo adicionado ao documento.</p>
                            <button
                              type="button"
                              onClick={() => setShowMassAddModal(true)}
                              className="mt-1 px-4 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
                            >
                              <Boxes className="w-3.5 h-3.5" />
                              <span>Abrir Seleção Massiva de Produtos</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      docItems.map((item) => (
                        <tr key={item.tempId} className="hover:bg-[#161616] transition-colors">
                          <td className="py-3 font-mono text-neutral-400">{item.sku}</td>
                          <td className="py-3 font-medium text-white">
                            <div>{item.productName}</div>
                            {item.notes && <div className="text-[10px] text-neutral-500">{item.notes}</div>}
                          </td>
                          <td className="py-2 text-center">
                            <div className="inline-flex items-center space-x-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(item.tempId, item.quantity - 1)}
                                className="w-6 h-6 rounded-md bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                                title="Diminuir quantidade"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemQuantity(item.tempId, Math.max(1, Number(e.target.value)))}
                                className="w-12 text-center bg-transparent font-mono text-white text-xs font-bold focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(item.tempId, item.quantity + 1)}
                                className="w-6 h-6 rounded-md bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                                title="Aumentar quantidade"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 font-mono text-right text-neutral-300">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-3 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-[#1f1f1f] text-neutral-300 font-mono text-[10px]">
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
                              className="p-1.5 hover:bg-rose-950/40 text-neutral-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                              title="Remover linha"
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
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleCancelEmission}
                  id="btn-cancel-document-emission"
                  className="flex items-center space-x-1.5 px-4 py-2.5 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar Emissão</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocItems([])}
                  className="px-4 py-2.5 bg-[#181818] hover:bg-[#222] border border-[#2a2a2a] text-neutral-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Limpar Linhas
                </button>
              </div>

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
                <option value="todos">Todos os Tipos de Documento</option>
                <option value="FT">FT - Faturas</option>
                <option value="FS">FS - Faturas Simplificadas</option>
                <option value="FR">FR - Faturas-Recibo</option>
                <option value="NC">NC - Notas de Crédito</option>
                <option value="ND">ND - Notas de Débito</option>
                <option value="PF">PF - Faturas Proforma</option>
                <option value="GT">GT - Guias de Transporte</option>
                <option value="GR">GR - Guias de Remessa</option>
                <option value="RC">RC - Recibos de Quitação</option>
                <option value="VD">VD - Vendas a Dinheiro</option>
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

            <div className="flex items-center space-x-3">
              <div className="text-xs text-neutral-400 font-mono">
                Encontrados: <strong className="text-white">{filteredArchive.length}</strong> documentos
              </div>

              {/* Clear / Delete Archive Button */}
              <button
                type="button"
                onClick={() => {
                  setClearScope(filteredArchive.length < salesHistory.length && filteredArchive.length > 0 ? 'filtered' : 'all');
                  setClearRestockStock(false);
                  setShowClearArchiveModal(true);
                }}
                disabled={salesHistory.length === 0}
                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                title="Eliminar dados e documentos do arquivo fiscal"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-bold">Eliminar Dados</span>
              </button>
            </div>
          </div>

          {/* Table of Documents */}
          <div className="flex-1 bg-[#121212] border border-[#262626] rounded-2xl overflow-y-auto shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0c0c0c] border-b border-[#262626] text-neutral-400 z-10">
                <tr>
                  <th className="p-3.5 font-semibold">Documento Nº</th>
                  <th className="p-3.5 font-semibold">Tipo</th>
                  <th className="p-3.5 font-semibold">Estado</th>
                  <th className="p-3.5 font-semibold">Data / Hora</th>
                  <th className="p-3.5 font-semibold">Cliente</th>
                  <th className="p-3.5 font-semibold">NIF</th>
                  <th className="p-3.5 font-semibold text-right">Total</th>
                  <th className="p-3.5 font-semibold text-center">Assinatura AT</th>
                  <th className="p-3.5 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {filteredArchive.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-neutral-500">
                      Nenhum documento fiscal encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredArchive.map((doc) => {
                    const isCreditNote = doc.invoiceType === 'NC';
                    const isQuote = doc.invoiceType === 'ORC' || doc.invoiceType === 'PF';
                    const docTmpl = getActiveInvoiceTemplate(currentCompany, doc.invoiceTemplateId, doc);

                    return (
                      <tr key={doc.id} className="hover:bg-[#161616] transition-colors">
                        <td className="p-3.5 font-mono font-bold text-white">
                          <div className="flex items-center space-x-2">
                            <FileText
                              className={`w-3.5 h-3.5 ${
                                isQuote
                                  ? 'text-amber-400'
                                  : isCreditNote
                                  ? 'text-rose-400'
                                  : 'text-[#c5a47e]'
                              }`}
                            />
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
                              isQuote
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : isCreditNote
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : doc.invoiceType === 'FT'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-[#c5a47e]/15 text-[#c5a47e] border-[#c5a47e]/30'
                            }`}
                          >
                            {doc.invoiceType || 'FS'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {isQuote ? (
                            doc.status === 'convertido' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-semibold">
                                <Sparkles className="w-3 h-3" />
                                <span>Convertido ({doc.convertedToInvoiceNumber || 'FT'})</span>
                              </span>
                            ) : (
                              <select
                                value={doc.status || 'pendente'}
                                onChange={(e) =>
                                  updateDocumentStatus(doc.id, e.target.value as Sale['status'])
                                }
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer focus:outline-hidden ${
                                  doc.status === 'aprovado'
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : doc.status === 'recusado'
                                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                <option value="pendente">Pendente</option>
                                <option value="aprovado">Aprovado</option>
                                <option value="recusado">Recusado</option>
                              </select>
                            )
                          ) : isCreditNote ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-semibold">
                              <span>Estorno NC</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                              <Check className="w-3 h-3" />
                              <span>Emitido</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-neutral-300 font-mono text-[11px]">
                          {new Date(doc.date).toLocaleString('pt-PT')}
                        </td>
                        <td className="p-3.5 font-medium text-white truncate max-w-xs">
                          {doc.customerName || 'Consumidor Final'}
                        </td>
                        <td className="p-3.5 font-mono text-neutral-400">{doc.customerNif || '999999990'}</td>
                        <td className="p-3.5 font-mono font-bold text-right">
                          <span className={isQuote ? 'text-amber-400' : 'text-[#c5a47e]'}>
                            {formatCurrency(doc.total)}
                          </span>
                          {isQuote && (
                            <span className="block text-[9px] font-sans font-normal text-neutral-500">
                              Sem efeito fiscal
                            </span>
                          )}
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
                          <div className="flex items-center justify-end space-x-1">
                            {/* View / Print */}
                            <button
                              onClick={() => setSelectedDocForPreview(doc)}
                              className="p-1.5 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Visualizar e Imprimir Documento"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#c5a47e]" />
                            </button>

                            {/* Duplicate Document */}
                            <button
                              onClick={() => handleDuplicateDoc(doc)}
                              className="p-1.5 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Duplicar / Clonar para Nova Emissão"
                            >
                              <Copy className="w-3.5 h-3.5 text-sky-400" />
                            </button>

                            {/* Actions for Quotes / Proformas */}
                            {isQuote && (
                              <>
                                {doc.status !== 'convertido' && (
                                  <>
                                    <button
                                      onClick={() => handleStartEdit(doc)}
                                      className="p-1.5 bg-[#1a1a1a] hover:bg-amber-950/40 text-amber-300 rounded-lg transition-colors cursor-pointer"
                                      title="Editar Linhas / Valores do Orçamento"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => {
                                        setConvertingDoc(doc);
                                        setConvertTargetType('FT');
                                      }}
                                      className="p-1.5 bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                                      title="Converter Orçamento em Fatura Fiscal (Deduz Stock e Fatura)"
                                    >
                                      <ArrowRightCircle className="w-3.5 h-3.5" />
                                      <span className="hidden xl:inline text-[10px] font-bold">Faturar</span>
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => setDeletingDoc(doc)}
                                  className="p-1.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar Orçamento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {/* Credit Note / Cancel Document for standard sales */}
                            {!isCreditNote && !isQuote && doc.status !== 'anulado' && (
                              <button
                                onClick={() => {
                                  setCreditNoteModalDoc(doc);
                                  setCreditNoteModalReason(`Devolução / Anulação do documento ${doc.invoiceNumber}`);
                                  setCreditNoteModalRestock(true);
                                }}
                                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                                title="Cancelar Documento (Emitir Nota de Crédito de Anulação / Estorno)"
                              >
                                <Ban className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-[10px] font-semibold">Cancelar / NC</span>
                              </button>
                            )}

                            {/* Delete Document Button (Available for all document types) */}
                            <button
                              onClick={() => {
                                setDeletingDoc(doc);
                                setDeletingDocRestock(!['ORC', 'PF', 'NC', 'RC'].includes(doc.invoiceType || ''));
                              }}
                              className="p-1.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 rounded-lg transition-colors cursor-pointer"
                              title={`Eliminar documento ${doc.invoiceNumber}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                          {getDocumentTitle(selectedDocForPreview.invoiceType)} n.º {selectedDocForPreview.invoiceNumber}
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
                          className="px-2 py-0.5 rounded text-[9px] font-mono font-bold text-white uppercase"
                          style={{ backgroundColor: previewTmpl.primaryColor || '#1e293b' }}
                        >
                          {getDocumentTitle(selectedDocForPreview.invoiceType)}
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

      {/* Modal for Issuing Credit Note from Archive */}
      {creditNoteModalDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#222] bg-[#161616]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <span>Emitir Nota de Crédito (NC)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                      {creditNoteModalDoc.invoiceNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Estorno e retificação fiscal de documento com escolha de reposição de stock
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreditNoteModalDoc(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#222] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Document Summary Card */}
              <div className="p-3.5 bg-[#181818] border border-[#262626] rounded-xl text-xs space-y-2">
                <div className="flex justify-between items-center text-neutral-300">
                  <span>Cliente: <strong className="text-white">{creditNoteModalDoc.customerName || 'Consumidor Final'}</strong></span>
                  <span className="font-mono text-neutral-400">NIF: {creditNoteModalDoc.customerNif || creditNoteModalDoc.customerTaxNumber || '999999990'}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-300">
                  <span>Data de Emissão: <strong className="text-white">{new Date(creditNoteModalDoc.date).toLocaleDateString('pt-PT')}</strong></span>
                  <span className="text-rose-400 font-mono font-bold text-sm">Total a Estornar: {formatCurrency(creditNoteModalDoc.total)}</span>
                </div>
                {creditNoteModalDoc.items && creditNoteModalDoc.items.length > 0 && (
                  <div className="pt-2 border-t border-[#262626] text-[11px] text-neutral-400">
                    <span className="font-semibold text-neutral-300 block mb-1">Artigos incluídos na fatura:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {creditNoteModalDoc.items.map((it, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-[#202020] rounded border border-[#333] text-neutral-300 font-mono">
                          {it.quantity}x {it.productName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Motivo */}
              <div className="space-y-1.5 text-xs">
                <label className="text-white font-semibold block">Motivo da Anulação / Estorno *</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Devolução de Mercadoria',
                    'Erro de Faturação',
                    'Acordo Comercial',
                    'Artigo Danificado',
                    'Cancelamento do Pedido',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setCreditNoteModalReason(chip)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                        creditNoteModalReason === chip
                          ? 'bg-[#c5a47e]/20 border-[#c5a47e] text-[#c5a47e] font-semibold'
                          : 'bg-[#181818] border-[#2a2a2a] text-neutral-400 hover:border-neutral-700 hover:text-white'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={creditNoteModalReason}
                  onChange={(e) => setCreditNoteModalReason(e.target.value)}
                  placeholder="Especifique o motivo do estorno..."
                  className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#2a2a2a] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              {/* Stock Movement Option */}
              <div className="p-3.5 bg-[#161616] border border-[#2a2a2a] rounded-xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <label className="text-white font-bold flex items-center space-x-2">
                    <Package className="w-4 h-4 text-[#c5a47e]" />
                    <span>Movimentação de Stock (Inventário):</span>
                  </label>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    creditNoteModalRestock ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {creditNoteModalRestock ? 'Adicionar ao Stock' : 'Não Movimentar Stock'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCreditNoteModalRestock(true)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2.5 ${
                      creditNoteModalRestock
                        ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                        : 'bg-[#0f0f0f] border-[#262626] text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                      creditNoteModalRestock ? 'border-emerald-400 bg-emerald-500' : 'border-neutral-600'
                    }`}>
                      {creditNoteModalRestock && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-white block">Adicionar ao Stock</span>
                      <span className="text-[11px] text-neutral-400 block mt-0.5">
                        Devolve os artigos ao armazém da loja ({currentStore.name || 'Armazém Central'}).
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreditNoteModalRestock(false)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2.5 ${
                      !creditNoteModalRestock
                        ? 'bg-amber-950/40 border-amber-500 text-white ring-1 ring-amber-500/50'
                        : 'bg-[#0f0f0f] border-[#262626] text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                      !creditNoteModalRestock ? 'border-amber-400 bg-amber-500' : 'border-neutral-600'
                    }`}>
                      {!creditNoteModalRestock && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-white block">Não Adicionar ao Stock</span>
                      <span className="text-[11px] text-neutral-400 block mt-0.5">
                        Apenas estorno financeiro / acerto de contas sem entrada física de mercadoria.
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-4 border-t border-[#222] bg-[#161616]">
              <button
                type="button"
                onClick={() => setCreditNoteModalDoc(null)}
                className="px-4 py-2 bg-[#202020] hover:bg-[#282828] text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!creditNoteModalReason.trim()) {
                    notify('Por favor, informe o motivo do estorno.', 'error');
                    return;
                  }
                  const targetDoc = creditNoteModalDoc;
                  setCreditNoteModalDoc(null);
                  await cancelInvoice(targetDoc.id, creditNoteModalReason, creditNoteModalRestock);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors flex items-center space-x-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirmar Emissão de NC</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT QUOTE / DOCUMENT ================= */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#222] bg-[#161616] shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <span>Editar {getDocumentTitle(editingDoc.invoiceType)}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                      {editingDoc.invoiceNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Modifique dados do cliente, itens, preços, quantidades ou notas da proposta comercial
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#222] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1 font-semibold">Cliente / Entidade</label>
                  <input
                    type="text"
                    required
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1 font-semibold">NIF / NUIT</label>
                  <input
                    type="text"
                    required
                    value={editCustomerNif}
                    onChange={(e) => setEditCustomerNif(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white font-mono focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1 font-semibold">Estado da Cotação</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Sale['status'])}
                    className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white font-semibold cursor-pointer focus:outline-hidden focus:border-[#c5a47e]"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="recusado">Recusado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1 font-semibold">Prazo de Validade</label>
                  <select
                    value={editValidity}
                    onChange={(e) => setEditValidity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white cursor-pointer focus:outline-hidden focus:border-[#c5a47e]"
                  >
                    <option value="7 dias">7 dias</option>
                    <option value="15 dias">15 dias</option>
                    <option value="30 dias">30 dias</option>
                    <option value="60 dias">60 dias</option>
                    <option value="90 dias">90 dias</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-neutral-400 block mb-1 font-semibold">Observações / Condições</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Condições de pagamento, entrega ou notas..."
                    className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 pt-2 border-t border-[#222]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Linhas da Proforma ({editItems.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setEditItems((prev) => [
                        ...prev,
                        {
                          tempId: `edit-item-${Date.now()}`,
                          productId: `custom-${Date.now()}`,
                          productName: 'Novo Artigo / Serviço',
                          quantity: 1,
                          unitPrice: 10,
                          discount: 0,
                          taxRate: 23,
                          taxAmount: 1.87,
                          total: 10,
                        },
                      ]);
                    }}
                    className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-[#c5a47e] rounded-lg text-xs font-bold cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Linha</span>
                  </button>
                </div>

                <div className="border border-[#262626] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0c0c0c] text-neutral-400 border-b border-[#262626]">
                      <tr>
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5 w-20 text-center">Qtd</th>
                        <th className="p-2.5 w-28 text-right">Preço Unit.</th>
                        <th className="p-2.5 w-20 text-center">IVA %</th>
                        <th className="p-2.5 w-28 text-right">Total</th>
                        <th className="p-2.5 w-12 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c1c1c] bg-[#101010]">
                      {editItems.map((item, idx) => (
                        <tr key={item.tempId || idx}>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, productName: val } : it))
                                );
                              }}
                              className="w-full px-2 py-1 bg-[#0a0a0a] border border-[#262626] rounded text-white text-xs focus:outline-hidden focus:border-[#c5a47e]"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const q = Math.max(1, Number(e.target.value) || 1);
                                setEditItems((prev) =>
                                  prev.map((it, i) => {
                                    if (i === idx) {
                                      const tot = q * it.unitPrice * (1 - (it.discount || 0) / 100);
                                      const rate = it.taxRate || 23;
                                      const base = tot / (1 + rate / 100);
                                      return { ...it, quantity: q, total: tot, taxAmount: tot - base };
                                    }
                                    return it;
                                  })
                                );
                              }}
                              className="w-16 px-1.5 py-1 text-center bg-[#0a0a0a] border border-[#262626] rounded text-white font-mono text-xs focus:outline-hidden focus:border-[#c5a47e]"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const p = Math.max(0, Number(e.target.value) || 0);
                                setEditItems((prev) =>
                                  prev.map((it, i) => {
                                    if (i === idx) {
                                      const tot = it.quantity * p * (1 - (it.discount || 0) / 100);
                                      const rate = it.taxRate || 23;
                                      const base = tot / (1 + rate / 100);
                                      return { ...it, unitPrice: p, total: tot, taxAmount: tot - base };
                                    }
                                    return it;
                                  })
                                );
                              }}
                              className="w-24 px-1.5 py-1 text-right bg-[#0a0a0a] border border-[#262626] rounded text-white font-mono text-xs focus:outline-hidden focus:border-[#c5a47e]"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <select
                              value={item.taxRate || 23}
                              onChange={(e) => {
                                const rate = Number(e.target.value) || 0;
                                setEditItems((prev) =>
                                  prev.map((it, i) => {
                                    if (i === idx) {
                                      const base = it.total / (1 + rate / 100);
                                      return { ...it, taxRate: rate, taxAmount: it.total - base };
                                    }
                                    return it;
                                  })
                                );
                              }}
                              className="w-16 px-1 py-1 text-center bg-[#0a0a0a] border border-[#262626] rounded text-neutral-300 font-mono text-xs focus:outline-hidden cursor-pointer"
                            >
                              <option value="0">0%</option>
                              <option value="6">6%</option>
                              <option value="13">13%</option>
                              <option value="16">16%</option>
                              <option value="23">23%</option>
                            </select>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-amber-400">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditItems((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="p-1 text-neutral-500 hover:text-rose-400 rounded cursor-pointer"
                              title="Remover Linha"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Edit Totals Summary */}
                <div className="flex justify-between items-center p-3 bg-[#181818] border border-[#262626] rounded-xl text-xs">
                  <div className="text-neutral-400">
                    Artigos: <strong className="text-white">{editItems.length}</strong>
                  </div>
                  <div className="flex items-center space-x-4 font-mono">
                    <div>
                      Subtotal:{' '}
                      <strong className="text-neutral-300">
                        {formatCurrency(
                          editItems.reduce(
                            (sum, it) => sum + it.total / (1 + (it.taxRate || 23) / 100),
                            0
                          )
                        )}
                      </strong>
                    </div>
                    <div>
                      IVA Total:{' '}
                      <strong className="text-neutral-300">
                        {formatCurrency(
                          editItems.reduce(
                            (sum, it) =>
                              sum + (it.total - it.total / (1 + (it.taxRate || 23) / 100)),
                            0
                          )
                        )}
                      </strong>
                    </div>
                    <div className="text-sm font-bold text-amber-400">
                      Total:{' '}
                      {formatCurrency(editItems.reduce((sum, it) => sum + it.total, 0))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 bg-[#1e1e1e] hover:bg-[#282828] text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs cursor-pointer shadow-md flex items-center space-x-2"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONVERT QUOTE TO INVOICE ================= */}
      {convertingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#222] bg-[#161616]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ArrowRightCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <span>Converter Fatura Proforma em Fatura</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      {convertingDoc.invoiceNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Transforma a proforma aprovada num documento fiscal oficial, deduz stock e contabiliza na faturação
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConvertingDoc(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#222] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Quote summary card */}
              <div className="p-3.5 bg-[#181818] border border-[#262626] rounded-xl text-xs space-y-2">
                <div className="flex justify-between items-center text-neutral-300">
                  <span>
                    Cliente:{' '}
                    <strong className="text-white">
                      {convertingDoc.customerName || 'Consumidor Final'}
                    </strong>
                  </span>
                  <span className="font-mono text-neutral-400">
                    NIF: {convertingDoc.customerNif || '999999990'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-300">
                  <span>
                    Artigos:{' '}
                    <strong className="text-white">{convertingDoc.items.length} linhas</strong>
                  </span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    Total: {formatCurrency(convertingDoc.total)}
                  </span>
                </div>
              </div>

              {/* Target Document Type */}
              <div className="space-y-2 text-xs">
                <label className="text-white font-bold block">
                  Selecione o Tipo de Fatura a Emitir:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'FT',
                      name: 'FT - Fatura',
                      desc: 'A Crédito / 30 Dias',
                    },
                    {
                      id: 'FR',
                      name: 'FR - Fatura-Recibo',
                      desc: 'Pronto Pagamento',
                    },
                    {
                      id: 'FS',
                      name: 'FS - Fatura Simplificada',
                      desc: 'Balcão Rápido',
                    },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setConvertTargetType(t.id as InvoiceType)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        convertTargetType === t.id
                          ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                          : 'bg-[#161616] border-[#262626] text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span className="font-bold text-xs block text-white">{t.name}</span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2 text-xs">
                <label className="text-white font-bold block">Método de Pagamento:</label>
                <select
                  value={convertPaymentMethod}
                  onChange={(e) => setConvertPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-[#0c0c0c] border border-[#262626] rounded-xl text-white font-semibold cursor-pointer focus:outline-hidden focus:border-[#c5a47e]"
                >
                  <option value="numerario">Numerário (Dinheiro)</option>
                  <option value="multibanco">Multibanco / TPA</option>
                  <option value="mbway">MBWay</option>
                  <option value="cartao">Cartão de Crédito / Débito</option>
                  <option value="transferencia">Transferência Bancária</option>
                </select>
              </div>

              {/* Inventory Notice */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex items-start space-x-2.5 text-xs text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Movimentação Automática de Stock & Fiscal</span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Ao confirmar, os artigos serão deduzidos do armazém da loja (
                    {currentStore.name}), o documento fiscal será certificado e assinado digitalmente
                    com ATCUD e passará a constar em todos os relatórios financeiros.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-4 border-t border-[#222] bg-[#161616]">
              <button
                type="button"
                onClick={() => setConvertingDoc(null)}
                className="px-4 py-2 bg-[#202020] hover:bg-[#282828] text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isConverting}
                onClick={handleConfirmConvert}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isConverting ? 'A converter...' : 'Emitir Fatura Fiscal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE SINGLE DOCUMENT ================= */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Eliminar Documento do Arquivo?</h3>
                  <p className="text-xs text-neutral-400">Esta ação removerá o documento de forma permanente.</p>
                </div>
              </div>

              {/* Document Summary Card */}
              <div className="bg-[#181818] border border-[#262626] rounded-xl p-3 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between items-center text-white">
                  <span className="text-neutral-400 font-sans">Documento:</span>
                  <span className="font-bold">{deletingDoc.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 font-sans">Tipo / Estado:</span>
                  <span className="text-neutral-200">{deletingDoc.invoiceType} &bull; {deletingDoc.status || 'emitido'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 font-sans">Cliente:</span>
                  <span className="text-neutral-200 truncate max-w-[200px]">{deletingDoc.customerName || 'Consumidor Final'}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-[#262626]">
                  <span className="text-neutral-400 font-sans">Total:</span>
                  <span className="text-[#c5a47e] font-bold text-sm">{formatCurrency(deletingDoc.total)}</span>
                </div>
              </div>

              {/* Restock checkbox if applicable */}
              {!['ORC', 'PF', 'NC', 'RC'].includes(deletingDoc.invoiceType || '') && (
                <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-[#181818] border border-[#262626] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deletingDocRestock}
                    onChange={(e) => setDeletingDocRestock(e.target.checked)}
                    className="mt-0.5 rounded border-[#333] text-[#c5a47e] focus:ring-[#c5a47e]"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-white block">Repor / Devolver artigos ao Stock</span>
                    <span className="text-neutral-400 text-[11px] block">
                      Reverte a saída de artigos e restabelece a quantidade no armazém.
                    </span>
                  </div>
                </label>
              )}

              <p className="text-[11px] text-neutral-500">
                O documento será excluído do histórico local e sincronizado para eliminação na base de dados central Supabase.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 p-4 border-t border-[#222] bg-[#161616]">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="px-4 py-2 bg-[#202020] hover:bg-[#282828] text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md"
              >
                Sim, Eliminar Documento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CLEAR / DELETE ARCHIVE BATCH ================= */}
      {showClearArchiveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Eliminar Dados do Arquivo Fiscal</h3>
                  <p className="text-xs text-neutral-400">Limpeza e eliminação de histórico de documentos</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-neutral-300">
                  Selecione os dados que deseja eliminar do histórico de faturas e documentos:
                </p>

                {/* Options */}
                <div className="space-y-2 pt-1">
                  <label
                    className={`flex items-start space-x-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      clearScope === 'all'
                        ? 'bg-rose-500/10 border-rose-500/40 text-white'
                        : 'bg-[#181818] border-[#262626] text-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clearScope"
                      checked={clearScope === 'all'}
                      onChange={() => setClearScope('all')}
                      className="mt-0.5 text-rose-500 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold block">Eliminar Todos os Documentos ({salesHistory.length})</span>
                      <span className="text-neutral-400 text-[11px] block">
                        Limpa todo o arquivo e histórico fiscal da empresa.
                      </span>
                    </div>
                  </label>

                  {filteredArchive.length < salesHistory.length && (
                    <label
                      className={`flex items-start space-x-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                        clearScope === 'filtered'
                          ? 'bg-rose-500/10 border-rose-500/40 text-white'
                          : 'bg-[#181818] border-[#262626] text-neutral-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="clearScope"
                        checked={clearScope === 'filtered'}
                        onChange={() => setClearScope('filtered')}
                        className="mt-0.5 text-rose-500 focus:ring-rose-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold block">
                          Eliminar apenas os Documentos Filtrados ({filteredArchive.length})
                        </span>
                        <span className="text-neutral-400 text-[11px] block">
                          Elimina apenas os documentos correspondentes aos filtros e pesquisa atuais.
                        </span>
                      </div>
                    </label>
                  )}
                </div>

                {/* Restock items checkbox */}
                <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-[#181818] border border-[#262626] cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={clearRestockStock}
                    onChange={(e) => setClearRestockStock(e.target.checked)}
                    className="mt-0.5 rounded border-[#333] text-[#c5a47e] focus:ring-[#c5a47e]"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-white block">Repor / Devolver artigos ao Stock</span>
                    <span className="text-neutral-400 text-[11px] block">
                      Restaura as quantidades no inventário para todos os artigos dos documentos eliminados.
                    </span>
                  </div>
                </label>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-800/30 text-rose-300 text-[11px] flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Aviso: Esta eliminação será refletida localmente e sincronizada imediatamente com o Supabase.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-4 border-t border-[#222] bg-[#161616]">
              <button
                type="button"
                onClick={() => setShowClearArchiveModal(false)}
                className="px-4 py-2 bg-[#202020] hover:bg-[#282828] text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearArchive}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  Confirmar Eliminação ({clearScope === 'all' ? salesHistory.length : filteredArchive.length})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MASS PRODUCT SELECTION MODAL ================= */}
      {showMassAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#222] bg-[#181818]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Seleção Massiva de Produtos para Documento</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#c5a47e]/20 text-[#c5a47e] font-mono font-semibold">
                      {docType} - {getDocumentTitle(docType)}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Selecione múltiplos produtos do catálogo, defina as respetivas quantidades e adicione tudo em lote.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMassAddModal(false)}
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-[#252525] transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filters & Batch Config Bar */}
            <div className="p-4 bg-[#101010] border-b border-[#222] space-y-3 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Search Bar */}
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={massSearchQuery}
                    onChange={(e) => setMassSearchQuery(e.target.value)}
                    placeholder="Pesquisar por nome, SKU ou código de barras..."
                    className="w-full pl-9 pr-8 py-2 bg-[#181818] border border-[#2a2a2a] rounded-xl text-white text-xs placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                  {massSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMassSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <div className="sm:col-span-3">
                  <select
                    value={massCategoryFilter}
                    onChange={(e) => setMassCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-[#181818] border border-[#2a2a2a] rounded-xl text-white text-xs focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
                  >
                    <option value="todas">Todas as Categorias</option>
                    {categories &&
                      categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Stock Only Checkbox */}
                <div className="sm:col-span-4 flex items-center justify-end space-x-2">
                  <label className="flex items-center space-x-2 text-xs text-neutral-300 cursor-pointer select-none bg-[#181818] border border-[#2a2a2a] px-3 py-2 rounded-xl">
                    <input
                      type="checkbox"
                      checked={massStockOnly}
                      onChange={(e) => setMassStockOnly(e.target.checked)}
                      className="rounded border-[#333] text-[#c5a47e] focus:ring-[#c5a47e]"
                    />
                    <span>Apenas com Stock</span>
                  </label>
                </div>
              </div>

              {/* Quick Batch Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1c1c1c] text-xs">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllVisible(massFilteredProducts)}
                    className="px-3 py-1.5 bg-[#202020] hover:bg-[#282828] text-neutral-200 hover:text-white border border-[#333] rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>Selecionar Todos os Visíveis ({massFilteredProducts.length})</span>
                  </button>

                  {massSelectedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-3 py-1.5 bg-[#202020] hover:bg-rose-950/30 text-neutral-300 hover:text-rose-300 border border-[#333] hover:border-rose-800/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
                    >
                      <Square className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Desmarcar Todos</span>
                    </button>
                  )}
                </div>

                {/* Batch Quantity Setter */}
                <div className="flex items-center space-x-2 bg-[#181818] border border-[#282828] px-2.5 py-1 rounded-xl">
                  <span className="text-neutral-400 text-[11px] font-semibold">Qtd em Lote:</span>
                  <input
                    type="number"
                    min="1"
                    value={massBatchQty}
                    onChange={(e) => setMassBatchQty(Math.max(1, Number(e.target.value)))}
                    className="w-12 text-center bg-[#0d0d0d] border border-[#333] rounded-md text-white font-mono text-xs py-0.5"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyBatchQuantity(massBatchQty)}
                    disabled={massSelectedCount === 0}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                      massSelectedCount > 0
                        ? 'bg-[#c5a47e] text-neutral-950 hover:bg-[#b5946e]'
                        : 'bg-[#252525] text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    Aplicar aos Selecionados
                  </button>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {massFilteredProducts.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 flex flex-col items-center justify-center space-y-2">
                  <Search className="w-10 h-10 text-neutral-600" />
                  <p className="text-sm font-semibold text-neutral-300">Nenhum produto encontrado</p>
                  <p className="text-xs text-neutral-500">Tente ajustar o termo de pesquisa ou os filtros de categoria e stock.</p>
                  {(massSearchQuery || massCategoryFilter !== 'todas' || massStockOnly) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMassSearchQuery('');
                        setMassCategoryFilter('todas');
                        setMassStockOnly(false);
                      }}
                      className="mt-2 px-3 py-1 bg-[#202020] hover:bg-[#282828] text-[#c5a47e] border border-[#333] rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#262626] text-neutral-400 font-semibold uppercase text-[11px]">
                        <th className="pb-3 pl-2 w-12 text-center">Sel.</th>
                        <th className="pb-3">Artigo & Detalhes</th>
                        <th className="pb-3">Categoria</th>
                        <th className="pb-3 text-center">Stock Atual</th>
                        <th className="pb-3 text-right">PVP (c/ IVA)</th>
                        <th className="pb-3 text-center min-w-[140px]">Quantidade a Faturar</th>
                        <th className="pb-3 text-right pr-2">Subtotal Linha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c1c1c]">
                      {massFilteredProducts.map((prod) => {
                        const isSelected = massSelectedItems[prod.id] !== undefined;
                        const currentQty = massSelectedItems[prod.id] || 1;
                        const availStock = getAvailableStock(prod.id, currentStore.defaultWarehouseId);
                        const isOutOfStock = availStock <= 0;
                        const isProformaOrQuote = ['ORC', 'PF', 'NC'].includes(docType);
                        const lineTotal = prod.price * (isSelected ? currentQty : 0);

                        return (
                          <tr
                            key={prod.id}
                            className={`transition-colors ${
                              isSelected
                                ? 'bg-[#c5a47e]/10 hover:bg-[#c5a47e]/15'
                                : 'hover:bg-[#181818]'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3 text-center pl-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleMassSelect(prod.id, massBatchQty > 0 ? massBatchQty : 1)}
                                className="w-4 h-4 rounded border-[#333] text-[#c5a47e] focus:ring-[#c5a47e] cursor-pointer"
                              />
                            </td>

                            {/* Product Info */}
                            <td className="py-3">
                              <div
                                onClick={() => handleToggleMassSelect(prod.id, massBatchQty > 0 ? massBatchQty : 1)}
                                className="cursor-pointer select-none"
                              >
                                <span className="font-semibold text-white text-xs block hover:text-[#c5a47e] transition-colors">
                                  {prod.name}
                                </span>
                                <div className="flex items-center space-x-2 text-[10px] text-neutral-400 font-mono mt-0.5">
                                  <span>SKU: {prod.sku}</span>
                                  {prod.barcode && <span>• EAN: {prod.barcode}</span>}
                                </div>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="py-3 text-neutral-300">
                              <span className="px-2 py-0.5 rounded bg-[#1c1c1c] text-neutral-300 text-[10px]">
                                {prod.category || 'Geral'}
                              </span>
                            </td>

                            {/* Stock Badge */}
                            <td className="py-3 text-center">
                              {isOutOfStock ? (
                                isProformaOrQuote ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px]">
                                    0 (Permitido em {docType})
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-bold">
                                    Sem stock
                                  </span>
                                )
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">
                                  {availStock} un
                                </span>
                              )}
                            </td>

                            {/* Unit Price */}
                            <td className="py-3 text-right font-mono font-medium text-neutral-200">
                              <div>{formatCurrency(prod.price)}</div>
                              <div className="text-[10px] text-neutral-500">IVA {prod.taxRate || 23}%</div>
                            </td>

                            {/* Quantity Controls */}
                            <td className="py-3 text-center">
                              <div className="inline-flex items-center space-x-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      handleSetMassQuantity(prod.id, currentQty - 1);
                                    }
                                  }}
                                  disabled={!isSelected}
                                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                                    isSelected
                                      ? 'bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-200 cursor-pointer'
                                      : 'text-neutral-600 cursor-not-allowed'
                                  }`}
                                  title="Diminuir quantidade"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>

                                <input
                                  type="number"
                                  min="1"
                                  value={isSelected ? currentQty : 1}
                                  onChange={(e) => {
                                    const val = Math.max(1, Number(e.target.value));
                                    handleSetMassQuantity(prod.id, val);
                                  }}
                                  onFocus={() => {
                                    if (!isSelected) {
                                      handleToggleMassSelect(prod.id, massBatchQty > 0 ? massBatchQty : 1);
                                    }
                                  }}
                                  className={`w-14 text-center bg-transparent font-mono text-xs font-bold focus:outline-hidden ${
                                    isSelected ? 'text-white' : 'text-neutral-500'
                                  }`}
                                />

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isSelected) {
                                      handleToggleMassSelect(prod.id, 1);
                                    } else {
                                      handleSetMassQuantity(prod.id, currentQty + 1);
                                    }
                                  }}
                                  className="w-6 h-6 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-200 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                                  title="Aumentar quantidade"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* Line Total */}
                            <td className="py-3 text-right pr-2 font-mono font-bold">
                              {isSelected ? (
                                <span className="text-[#c5a47e]">{formatCurrency(lineTotal)}</span>
                              ) : (
                                <span className="text-neutral-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Sticky Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[#222] bg-[#161616] shrink-0">
              {/* Stats overview */}
              <div className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
                <div className="px-3 py-1.5 rounded-xl bg-[#101010] border border-[#262626] flex items-center space-x-2">
                  <Boxes className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span className="text-neutral-400">Selecionados:</span>
                  <strong className="text-white font-mono">{massSelectedCount} produtos</strong>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-[#101010] border border-[#262626] flex items-center space-x-2">
                  <span className="text-neutral-400">Total Unidades:</span>
                  <strong className="text-white font-mono">{massTotalUnits} un</strong>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center space-x-2 text-[#c5a47e]">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="text-neutral-300">Total Estimado:</span>
                  <strong className="font-mono">{formatCurrency(massEstimatedTotal)}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowMassAddModal(false)}
                  className="px-4 py-2.5 bg-[#202020] hover:bg-[#282828] text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmMassAdd}
                  disabled={massSelectedCount === 0}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 ${
                    massSelectedCount > 0
                      ? 'bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 cursor-pointer active:scale-95'
                      : 'bg-[#252525] text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    Adicionar {massSelectedCount} {massSelectedCount === 1 ? 'Produto' : 'Produtos'} ao Documento
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
