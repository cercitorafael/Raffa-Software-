import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/crypto';
import {
  ShoppingBag,
  Truck,
  FileCheck2,
  Building2,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  Send,
  PackageCheck,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Search,
  Check,
  Ban,
  Package,
} from 'lucide-react';
import { PurchaseOrder, PurchaseRequisition, Supplier } from '../../types';

export const ProcurementModule: React.FC = () => {
  const {
    purchaseRequisitions,
    purchaseOrders,
    suppliers,
    products,
    warehouses,
    currentCompany,
    currentUser,
    currencyDefinition,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addPurchaseRequisition,
    updatePurchaseRequisition,
    deletePurchaseRequisition,
    approveRequisition,
    rejectRequisition,
    createPurchaseOrder,
    createPurchaseOrderFromReq,
    updatePurchaseOrder,
    deletePurchaseOrder,
    receiveGoods,
    receivePurchaseOrder,
    hasPermission,
    requestConfirm,
    notify,
  } = useApp();

  const currencySymbol = currentCompany?.currencySymbol || currencyDefinition?.symbol || 'Mt';

  const [activeTab, setActiveTab] = useState<'orders' | 'requisitions' | 'receiving' | 'suppliers'>('orders');
  const [searchQuery, setSearchQuery] = useState('');

  // Supplier Modals
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    code: '',
    taxNumber: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: '30_dias',
    rating: 5,
  });

  // Purchase Order Modals
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [poForm, setPoForm] = useState({
    supplierId: suppliers[0]?.id || '',
    warehouseId: warehouses[0]?.id || '',
    productId: products[0]?.id || '',
    quantity: 50,
    unitPrice: 10,
    expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes: '',
  });

  // Requisition Modals
  const [showNewRequisitionModal, setShowNewRequisitionModal] = useState(false);
  const [editingRequisition, setEditingRequisition] = useState<PurchaseRequisition | null>(null);
  const [reqForm, setReqForm] = useState({
    department: 'Armazém Central',
    priority: 'media' as PurchaseRequisition['priority'],
    productId: products[0]?.id || '',
    quantity: 20,
    notes: '',
  });

  // Convert Requisition to PO modal
  const [convertingReq, setConvertingReq] = useState<PurchaseRequisition | null>(null);
  const [convertSupplierId, setConvertSupplierId] = useState<string>('');

  // Receiving tab forms state
  const [receivingInputs, setReceivingInputs] = useState<Record<string, { warehouseId: string; docNumber: string }>>({});

  // Permissions check
  const canCreate = hasPermission('procurement', 'create');
  const canEdit = hasPermission('procurement', 'edit');
  const canDelete = hasPermission('procurement', 'delete');

  // Filtered Suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.taxNumber.includes(q) || (s.code || '').toLowerCase().includes(q);
  });

  // ================= SUPPLIER HANDLERS =================
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim() || !supplierForm.taxNumber.trim()) {
      notify('Por favor preencha o Nome e o NIF do fornecedor.', 'warning');
      return;
    }

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        name: supplierForm.name.trim(),
        code: supplierForm.code.trim() || editingSupplier.code,
        taxNumber: supplierForm.taxNumber.trim(),
        email: supplierForm.email.trim(),
        phone: supplierForm.phone.trim(),
        address: supplierForm.address.trim(),
        paymentTerms: supplierForm.paymentTerms,
        rating: Number(supplierForm.rating) || 5,
      });
      notify(`Fornecedor "${supplierForm.name.trim()}" atualizado com sucesso!`, 'success');
      setEditingSupplier(null);
    } else {
      addSupplier({
        companyId: currentCompany.id,
        name: supplierForm.name.trim(),
        code: supplierForm.code.trim() || `FOR-${Math.floor(100 + Math.random() * 900)}`,
        taxNumber: supplierForm.taxNumber.trim(),
        email: supplierForm.email.trim() || '',
        phone: supplierForm.phone.trim() || '',
        address: supplierForm.address.trim() || '',
        paymentTerms: supplierForm.paymentTerms,
        categories: ['Geral'],
        rating: Number(supplierForm.rating) || 5,
        isActive: true,
      });
      notify(`Fornecedor "${supplierForm.name.trim()}" registado com sucesso!`, 'success');
      setShowNewSupplierModal(false);
    }
  };

  // ================= PURCHASE ORDER HANDLERS =================
  const handleSavePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === poForm.supplierId) || suppliers[0];
    const prod = products.find((p) => p.id === poForm.productId) || products[0];
    if (!sup || !prod) {
      notify('Selecione um fornecedor e um artigo válidos.', 'error');
      return;
    }

    const unitPrice = Number(poForm.unitPrice) || prod.costPrice || 10;
    const qty = Number(poForm.quantity) || 1;
    const subtotal = unitPrice * qty;
    const taxRate = Number(prod.taxRate || 0);
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;

    if (editingOrder) {
      updatePurchaseOrder(editingOrder.id, {
        supplierId: sup.id,
        supplierName: sup.name,
        warehouseId: poForm.warehouseId || warehouses[0]?.id,
        destinationWarehouseId: poForm.warehouseId || warehouses[0]?.id,
        expectedDeliveryDate: poForm.expectedDeliveryDate,
        deliveryDateExpected: poForm.expectedDeliveryDate,
        notes: poForm.notes,
        subtotal,
        taxTotal: tax,
        total,
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            quantity: qty,
            quantityOrdered: qty,
            quantityReceived: editingOrder.items?.[0]?.quantityReceived || 0,
            unitPrice,
            taxRate,
            total,
          },
        ],
      });
      notify(`Ordem de Compra ${editingOrder.orderNumber || editingOrder.code} atualizada!`, 'success');
      setEditingOrder(null);
    } else {
      createPurchaseOrder({
        companyId: currentCompany.id,
        supplierId: sup.id,
        supplierName: sup.name,
        warehouseId: poForm.warehouseId || warehouses[0]?.id,
        destinationWarehouseId: poForm.warehouseId || warehouses[0]?.id,
        status: 'enviada',
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            quantity: qty,
            quantityOrdered: qty,
            quantityReceived: 0,
            unitPrice,
            taxRate,
            total,
          },
        ],
        subtotal,
        taxTotal: tax,
        total,
        expectedDeliveryDate: poForm.expectedDeliveryDate,
        deliveryDateExpected: poForm.expectedDeliveryDate,
        notes: poForm.notes || 'Ordem de Compra direta',
      });
      notify('Ordem de Compra criada e enviada com sucesso!', 'success');
      setShowNewOrderModal(false);
    }
  };

  // ================= REQUISITION HANDLERS =================
  const handleSaveRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === reqForm.productId) || products[0];
    if (!prod) {
      notify('Selecione um artigo válido para a requisição.', 'error');
      return;
    }

    const qty = Number(reqForm.quantity) || 1;
    const estimatedCost = prod.costPrice || 10;
    const totalEst = qty * estimatedCost;

    if (editingRequisition) {
      updatePurchaseRequisition(editingRequisition.id, {
        department: reqForm.department,
        priority: reqForm.priority,
        notes: reqForm.notes,
        totalEstimated: totalEst,
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            quantity: qty,
            estimatedUnitCost: estimatedCost,
            total: totalEst,
          },
        ],
      });
      notify(`Requisição ${editingRequisition.requisitionNumber || editingRequisition.code} atualizada!`, 'success');
      setEditingRequisition(null);
    } else {
      addPurchaseRequisition({
        companyId: currentCompany.id,
        requesterId: currentUser.id,
        requesterName: currentUser.name,
        department: reqForm.department,
        priority: reqForm.priority,
        status: 'pendente',
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            quantity: qty,
            estimatedUnitCost: estimatedCost,
            total: totalEst,
          },
        ],
        totalEstimated: totalEst,
        notes: reqForm.notes,
      });
      notify('Requisição interna criada e registada!', 'success');
      setShowNewRequisitionModal(false);
    }
  };

  // Convert Requisition to PO
  const handleConvertRequisitionToPO = () => {
    if (!convertingReq || !convertSupplierId) {
      notify('Selecione o fornecedor para adjudicar a encomenda.', 'warning');
      return;
    }
    createPurchaseOrderFromReq(convertingReq.id, convertSupplierId);
    notify(`Requisição ${convertingReq.requisitionNumber || convertingReq.code} convertida em Ordem de Compra!`, 'success');
    setConvertingReq(null);
    setConvertSupplierId('');
    setActiveTab('orders');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Top Banner KPI Cards */}
      <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] grid grid-cols-1 sm:grid-cols-4 gap-3 shrink-0">
        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#c5a47e]/15 text-[#c5a47e] border border-[#c5a47e]/30 flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Ordens de Compra (PO)</span>
            <p className="text-xl font-serif font-bold text-[#e5e5e5]">{purchaseOrders.length} ordens</p>
          </div>
        </div>

        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Requisições Pendentes</span>
            <p className="text-xl font-serif font-bold text-amber-400">
              {purchaseRequisitions.filter((r) => r.status === 'pendente').length} pedidos
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Em Trânsito / Receber</span>
            <p className="text-xl font-serif font-bold text-emerald-400">
              {purchaseOrders.filter((o) => o.status === 'enviada').length} entregas
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Fornecedores Ativos</span>
            <p className="text-xl font-serif font-bold text-[#c5a47e]">{suppliers.length} parceiros</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between">
        <div className="flex space-x-1 overflow-x-auto">
          {[
            { id: 'orders', label: 'Ordens de Compra (PO)', icon: ShoppingBag, count: purchaseOrders.length },
            { id: 'requisitions', label: 'Requisições Internas (RC)', icon: FileCheck2, count: purchaseRequisitions.length },
            { id: 'receiving', label: 'Receção no Armazém', icon: Truck },
            { id: 'suppliers', label: 'Fornecedores & SLA', icon: Building2, count: suppliers.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-medium border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#c5a47e] text-[#c5a47e]'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-[#c5a47e]/20 text-[#c5a47e]' : 'bg-[#1f1f1f] text-neutral-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ================= TAB 1: ORDERS (PO) CRUD ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="text-xs text-neutral-400">
                Ordens de Compra oficiais emitidas a fornecedores externos
              </div>
              {canCreate && (
                <button
                  onClick={() => {
                    setEditingOrder(null);
                    setShowNewOrderModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Ordem de Compra</span>
                </button>
              )}
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Número PO</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3">Armazém Destino</th>
                    <th className="px-4 py-3">Data Emissão</th>
                    <th className="px-4 py-3">Entrega Prevista</th>
                    <th className="px-4 py-3 text-right">Total c/ IVA</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Ações CRUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {purchaseOrders.map((po) => {
                    const wh = warehouses.find((w) => w.id === (po.warehouseId || po.destinationWarehouseId));
                    const isReceivable = po.status === 'enviada' || po.status === 'emitida';
                    const isReceived = po.status === 'recebida' || po.status === 'recebida_total';

                    return (
                      <tr key={po.id} className="hover:bg-[#191919] transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-[#c5a47e]">{po.orderNumber || po.code}</td>
                        <td className="px-4 py-3 font-medium text-neutral-200">{po.supplierName}</td>
                        <td className="px-4 py-3 text-neutral-400">{wh?.name || po.warehouseId || 'Armazém Central'}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDate(po.createdAt || po.date)}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDate(po.expectedDeliveryDate || po.deliveryDateExpected)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                          {formatCurrency(po.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                            isReceived ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                            po.status === 'enviada' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                            po.status === 'emitida' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                            'bg-neutral-800 text-neutral-400'
                          }`}>
                            {isReceived ? 'Recebida' : po.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {isReceivable && (
                              <button
                                onClick={() => {
                                  const targetWh = po.warehouseId || po.destinationWarehouseId || warehouses[0]?.id;
                                  const docNum = `GUIA-${po.orderNumber || po.code}`;
                                  receiveGoods(po.id, targetWh, docNum);
                                  notify(`Mercadoria da PO ${po.orderNumber || po.code} registada no stock!`, 'success');
                                }}
                                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-medium cursor-pointer flex items-center space-x-1"
                                title="Receber mercadoria e dar entrada no stock"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                <span>Receber</span>
                              </button>
                            )}
                            {canEdit && !isReceived && (
                              <button
                                onClick={() => {
                                  setEditingOrder(po);
                                  setPoForm({
                                    supplierId: po.supplierId,
                                    warehouseId: po.warehouseId || po.destinationWarehouseId || (warehouses[0]?.id || ''),
                                    productId: po.items?.[0]?.productId || products[0]?.id || '',
                                    quantity: po.items?.[0]?.quantity || po.items?.[0]?.quantityOrdered || 10,
                                    unitPrice: po.items?.[0]?.unitPrice || 10,
                                    expectedDeliveryDate: (po.expectedDeliveryDate || po.deliveryDateExpected || new Date().toISOString()).split('T')[0],
                                    notes: po.notes || '',
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                                title="Editar Ordem de Compra"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  requestConfirm({
                                    title: 'Eliminar Ordem de Compra',
                                    message: `Tem a certeza que deseja eliminar a ordem de compra ${po.orderNumber || po.code}?`,
                                    itemDetails: `Fornecedor: ${po.supplierName} | Total: ${formatCurrency(po.total)} | Estado: ${po.status}`,
                                    confirmLabel: 'Eliminar Ordem',
                                    isDestructive: true,
                                    onConfirm: () => {
                                      deletePurchaseOrder(po.id);
                                      notify(`Ordem ${po.orderNumber || po.code} eliminada.`, 'info');
                                    },
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                                title="Eliminar Ordem de Compra"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: REQUISITIONS (RC) CRUD ================= */}
        {activeTab === 'requisitions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="text-xs text-neutral-400">
                Requisições de compra internas com aprovação hierárquica e conversão em PO
              </div>
              {canCreate && (
                <button
                  onClick={() => {
                    setEditingRequisition(null);
                    setShowNewRequisitionModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-md cursor-pointer"
                >
                  + Nova Requisição Interna
                </button>
              )}
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Número RC</th>
                    <th className="px-4 py-3">Requisitante</th>
                    <th className="px-4 py-3">Departamento</th>
                    <th className="px-4 py-3">Prioridade</th>
                    <th className="px-4 py-3 text-right">Valor Estimado</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {purchaseRequisitions.map((req) => {
                    const isApproved = req.status === 'aprovada' || req.status === 'aprovado';
                    const isRejected = req.status === 'rejeitada' || req.status === 'rejeitado';
                    const isConverted = req.status === 'convertido_em_po';

                    return (
                      <tr key={req.id} className="hover:bg-[#191919] transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-[#c5a47e]">{req.requisitionNumber || req.code}</td>
                        <td className="px-4 py-3 font-medium text-neutral-200">{req.requesterName}</td>
                        <td className="px-4 py-3 text-neutral-400">{req.department}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            req.priority === 'urgente' ? 'bg-rose-500/20 text-rose-400' :
                            req.priority === 'alta' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-neutral-800 text-neutral-400'
                          }`}>
                            {req.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-200">
                          {formatCurrency(req.totalEstimated)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                            isApproved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                            isRejected ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                            isConverted ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {isConverted ? 'Convertida em PO' : isApproved ? 'Aprovada' : isRejected ? 'Rejeitada' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {req.status === 'pendente' && (
                              <>
                                <button
                                  onClick={() => {
                                    approveRequisition(req.id);
                                    notify(`Requisição ${req.requisitionNumber || req.code} aprovada com sucesso!`, 'success');
                                  }}
                                  title="Aprovar Requisição"
                                  className="p-1 hover:bg-neutral-800 rounded text-emerald-400 cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    rejectRequisition(req.id);
                                    notify(`Requisição ${req.requisitionNumber || req.code} rejeitada.`, 'info');
                                  }}
                                  title="Rejeitar Requisição"
                                  className="p-1 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {isApproved && (
                              <button
                                onClick={() => {
                                  setConvertingReq(req);
                                  setConvertSupplierId(suppliers[0]?.id || '');
                                }}
                                title="Converter em Ordem de Compra"
                                className="px-2 py-1 bg-[#c5a47e]/20 hover:bg-[#c5a47e]/30 text-[#c5a47e] border border-[#c5a47e]/40 rounded text-[11px] font-medium cursor-pointer flex items-center space-x-1"
                              >
                                <ArrowRight className="w-3 h-3" />
                                <span>Gerar PO</span>
                              </button>
                            )}
                            {canEdit && req.status === 'pendente' && (
                              <button
                                onClick={() => {
                                  setEditingRequisition(req);
                                  setReqForm({
                                    department: req.department,
                                    priority: req.priority,
                                    productId: req.items[0]?.productId || products[0]?.id || '',
                                    quantity: req.items[0]?.quantity || 10,
                                    notes: req.notes || '',
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                                title="Editar Requisição"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  requestConfirm({
                                    title: 'Eliminar Requisição de Compra',
                                    message: `Tem a certeza que deseja eliminar a requisição ${req.requisitionNumber || req.code}?`,
                                    itemDetails: `Requisitante: ${req.requesterName} | Departamento: ${req.department} | Prioridade: ${req.priority}`,
                                    confirmLabel: 'Eliminar Requisição',
                                    isDestructive: true,
                                    onConfirm: () => {
                                      deletePurchaseRequisition(req.id);
                                      notify(`Requisição ${req.requisitionNumber || req.code} eliminada.`, 'info');
                                    },
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                                title="Eliminar Requisição"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: RECEIVING ================= */}
        {activeTab === 'receiving' && (
          <div className="space-y-4">
            <div className="bg-[#141414] p-4 rounded-xl border border-[#262626]">
              <h3 className="text-sm font-semibold text-neutral-200">Entradas de Mercadoria no Armazém</h3>
              <p className="text-xs text-neutral-400">
                Ordens com entrega pendente aguardando conferência física, afetação de stock e emissão de conta a pagar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {purchaseOrders.filter((o) => o.status === 'enviada' || o.status === 'emitida').map((po) => {
                const currentInput = receivingInputs[po.id] || {
                  warehouseId: po.warehouseId || po.destinationWarehouseId || warehouses[0]?.id || '',
                  docNumber: `FT-${po.orderNumber || po.code}`,
                };

                return (
                  <div key={po.id} className="bg-[#141414] border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-mono text-[#c5a47e] font-semibold">{po.orderNumber || po.code}</span>
                          <h4 className="text-sm font-semibold text-neutral-200 mt-1">{po.supplierName}</h4>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400 font-mono">
                          {po.status === 'enviada' ? 'Em Trânsito' : 'Aguardando Entrada'}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-neutral-400 font-mono">
                        <div>Previsão de Entrega: {formatDate(po.expectedDeliveryDate || po.deliveryDateExpected)}</div>
                        <div>Total Artigos: {(po.items || []).reduce((s, i) => s + (i.quantity || i.quantityOrdered || 0), 0)} unidades</div>
                        <div className="text-emerald-400 font-semibold">Valor Total: {formatCurrency(po.total)}</div>
                      </div>

                      <div className="mt-3 p-3 bg-[#0d0d0d] border border-[#262626] rounded-lg space-y-2 text-xs">
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Armazém de Entrada:</label>
                          <select
                            value={currentInput.warehouseId}
                            onChange={(e) => setReceivingInputs({
                              ...receivingInputs,
                              [po.id]: { ...currentInput, warehouseId: e.target.value },
                            })}
                            className="w-full bg-[#141414] border border-[#262626] rounded px-2.5 py-1 text-xs text-neutral-200 focus:outline-hidden"
                          >
                            {warehouses.map((w) => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Nº da Guia / Fatura do Fornecedor:</label>
                          <input
                            type="text"
                            value={currentInput.docNumber}
                            onChange={(e) => setReceivingInputs({
                              ...receivingInputs,
                              [po.id]: { ...currentInput, docNumber: e.target.value },
                            })}
                            placeholder="ex: FT-10492 / GUIA-90"
                            className="w-full bg-[#141414] border border-[#262626] rounded px-2.5 py-1 text-xs text-neutral-200 font-mono focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#262626] flex justify-end">
                      <button
                        onClick={() => {
                          const targetWh = currentInput.warehouseId || po.warehouseId || po.destinationWarehouseId || warehouses[0]?.id;
                          const docNum = currentInput.docNumber || `FT-${po.orderNumber || po.code}`;
                          receiveGoods(po.id, targetWh, docNum);
                          notify(`Mercadoria da PO ${po.orderNumber || po.code} recebida no armazém e stock atualizado!`, 'success');
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>Confirmar Entrada no Stock</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {purchaseOrders.filter((o) => o.status === 'enviada' || o.status === 'emitida').length === 0 && (
                <div className="col-span-2 text-center py-12 text-neutral-500 bg-[#141414] rounded-xl border border-[#262626]">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p>Não existem encomendas pendentes de receção no armazém.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: SUPPLIERS CRUD ================= */}
        {activeTab === 'suppliers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Pesquisar fornecedor por nome, NIF, código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md pl-9 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              {canCreate && (
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setSupplierForm({
                      name: '',
                      code: '',
                      taxNumber: '',
                      email: '',
                      phone: '',
                      address: '',
                      paymentTerms: '30_dias',
                      rating: 5,
                    });
                    setShowNewSupplierModal(true);
                  }}
                  className="px-3.5 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Fornecedor</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredSuppliers.map((sup) => (
                <div key={sup.id} className="bg-[#141414] border border-[#262626] rounded-xl p-5 hover:border-[#383838] transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold font-mono">
                        {sup.code?.slice(0, 3) || 'FOR'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-200 text-sm">{sup.name}</h3>
                        <p className="text-xs font-mono text-[#c5a47e]">NIF: {sup.taxNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditingSupplier(sup);
                            setSupplierForm({
                              name: sup.name,
                              code: sup.code,
                              taxNumber: sup.taxNumber,
                              email: sup.email,
                              phone: sup.phone,
                              address: sup.address,
                              paymentTerms: sup.paymentTerms,
                              rating: sup.rating,
                            });
                          }}
                          className="p-1.5 hover:bg-neutral-800 rounded-md text-cyan-400 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            requestConfirm({
                              title: 'Eliminar Fornecedor',
                              message: `Tem a certeza que deseja eliminar o fornecedor "${sup.name}" (${sup.code})?`,
                              itemDetails: `NIF: ${sup.taxNumber} | Email: ${sup.email} | Telefone: ${sup.phone}`,
                              confirmLabel: 'Eliminar Fornecedor',
                              isDestructive: true,
                              onConfirm: () => {
                                deleteSupplier(sup.id);
                              },
                            });
                          }}
                          className="p-1.5 hover:bg-neutral-800 rounded-md text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#262626] space-y-1.5 text-xs text-neutral-400">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Email:</span>
                      <span className="text-neutral-300 font-mono">{sup.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Telefone:</span>
                      <span className="text-neutral-300 font-mono">{sup.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Condições:</span>
                      <span className="text-neutral-300 uppercase font-mono">{sup.paymentTerms.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-neutral-500">Avaliação / SLA:</span>
                      <span className="text-amber-400 font-bold">★ {sup.rating} / 5</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: SUPPLIER ================= */}
      {(showNewSupplierModal || editingSupplier) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h3>
              <button
                onClick={() => {
                  setShowNewSupplierModal(false);
                  setEditingSupplier(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Nome Comercial / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Código Fornecedor</label>
                  <input
                    type="text"
                    value={supplierForm.code}
                    onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">NIF *</label>
                  <input
                    type="text"
                    required
                    value={supplierForm.taxNumber}
                    onChange={(e) => setSupplierForm({ ...supplierForm, taxNumber: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Morada / Endereço</label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Condições de Pagamento</label>
                  <select
                    value={supplierForm.paymentTerms}
                    onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  >
                    <option value="pronto_pagamento">Pronto Pagamento</option>
                    <option value="30_dias">30 Dias</option>
                    <option value="60_dias">60 Dias</option>
                    <option value="90_dias">90 Dias</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Classificação SLA (1 a 5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={supplierForm.rating}
                    onChange={(e) => setSupplierForm({ ...supplierForm, rating: Number(e.target.value) })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewSupplierModal(false);
                    setEditingSupplier(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingSupplier ? 'Guardar' : 'Registar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PURCHASE ORDER ================= */}
      {(showNewOrderModal || editingOrder) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingOrder ? 'Editar Ordem de Compra' : 'Nova Ordem de Compra (PO)'}
              </h3>
              <button
                onClick={() => {
                  setShowNewOrderModal(false);
                  setEditingOrder(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchaseOrder} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Fornecedor *</label>
                <select
                  value={poForm.supplierId}
                  onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Armazém de Entrega</label>
                <select
                  value={poForm.warehouseId}
                  onChange={(e) => setPoForm({ ...poForm, warehouseId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Artigo Principal</label>
                <select
                  value={poForm.productId}
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === e.target.value);
                    setPoForm({
                      ...poForm,
                      productId: e.target.value,
                      unitPrice: prod?.costPrice || 10,
                    });
                  }}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={poForm.quantity}
                    onChange={(e) => setPoForm({ ...poForm, quantity: Number(e.target.value) })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Preço Unitário Custo ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={poForm.unitPrice}
                    onChange={(e) => setPoForm({ ...poForm, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Data Prevista Entrega</label>
                <input
                  type="date"
                  value={poForm.expectedDeliveryDate}
                  onChange={(e) => setPoForm({ ...poForm, expectedDeliveryDate: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewOrderModal(false);
                    setEditingOrder(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingOrder ? 'Guardar' : 'Emitir Ordem de Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: REQUISITION ================= */}
      {(showNewRequisitionModal || editingRequisition) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingRequisition ? 'Editar Requisição' : 'Nova Requisição Interna'}
              </h3>
              <button
                onClick={() => {
                  setShowNewRequisitionModal(false);
                  setEditingRequisition(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRequisition} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Departamento Solicitante</label>
                <input
                  type="text"
                  required
                  value={reqForm.department}
                  onChange={(e) => setReqForm({ ...reqForm, department: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Prioridade</label>
                <select
                  value={reqForm.priority}
                  onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value as any })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Artigo Necessário</label>
                <select
                  value={reqForm.productId}
                  onChange={(e) => setReqForm({ ...reqForm, productId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={reqForm.quantity}
                  onChange={(e) => setReqForm({ ...reqForm, quantity: Number(e.target.value) })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Justificação / Motivo</label>
                <input
                  type="text"
                  value={reqForm.notes}
                  onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewRequisitionModal(false);
                    setEditingRequisition(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingRequisition ? 'Guardar' : 'Submeter Requisição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONVERT REQUISITION TO PO ================= */}
      {convertingReq && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                Adjudicar e Converter Requisição em PO
              </h3>
              <button
                onClick={() => setConvertingReq(null)}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-[#0d0d0d] border border-[#262626] rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Nº Requisição:</span>
                  <span className="font-mono text-[#c5a47e] font-semibold">{convertingReq.requisitionNumber || convertingReq.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Requisitante:</span>
                  <span className="text-neutral-200">{convertingReq.requesterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Departamento:</span>
                  <span className="text-neutral-300">{convertingReq.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Valor Estimado:</span>
                  <span className="text-emerald-400 font-mono font-semibold">{formatCurrency(convertingReq.totalEstimated)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Selecione o Fornecedor Adjudicatário *
                </label>
                <select
                  value={convertSupplierId}
                  onChange={(e) => setConvertSupplierId(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  <option value="">-- Selecionar Fornecedor --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.taxNumber})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-500 mt-1">
                  Será gerada uma Ordem de Compra oficial com os artigos e quantidades desta requisição.
                </p>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setConvertingReq(null)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConvertRequisitionToPO}
                  disabled={!convertSupplierId}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    convertSupplierId
                      ? 'bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 cursor-pointer'
                      : 'bg-[#1e1e1e] text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  Converter em Ordem de Compra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
