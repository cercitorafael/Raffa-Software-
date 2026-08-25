import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/crypto';
import {
  Boxes,
  ArrowUpDown,
  AlertTriangle,
  Plus,
  Package,
  Layers,
  Search,
  CheckCircle,
  FileSpreadsheet,
  TrendingUp,
  Tag,
  Warehouse as WarehouseIcon,
  Edit2,
  Trash2,
  Sliders,
  Calendar,
  Eye,
  X,
  RefreshCw,
  Clock,
  ShieldAlert,
  Upload,
  Download,
  FileUp,
  FileDown,
} from 'lucide-react';
import { Product, Warehouse, LotBatch, ProductCategory } from '../../types';
import { ProductImportExportModal } from './ProductImportExportModal';
import { CategoryManagementModal } from './CategoryManagementModal';
import { CategoryManagementTab } from './CategoryManagementTab';

export const StockModule: React.FC = () => {
  const {
    products,
    warehouses,
    stock,
    lots,
    stockMovements,
    currentStore,
    currentCompany,
    currentUser,
    currencyDefinition,
    categories,
    suppliers,
    addProduct,
    updateProduct,
    deleteProduct,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    addLot,
    updateLot,
    deleteLot,
    transferStock,
    recordStockMovement,
    createStockAdjustment,
    deleteStockMovement,
    addPurchaseRequisition,
    hasPermission,
    requestConfirm,
    notify,
  } = useApp();

  const currencySymbol = currentCompany?.currencySymbol || currencyDefinition?.symbol || 'Mt';

  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'warehouses' | 'lots' | 'movements' | 'transfer' | 'inventory_count' | 'reorder'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('all');

  // Product Modals
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [importExportInitialMode, setImportExportInitialMode] = useState<'import' | 'export'>('import');

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Warehouse Modals
  const [showNewWarehouseModal, setShowNewWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  // Lot Modals
  const [showNewLotModal, setShowNewLotModal] = useState(false);
  const [editingLot, setEditingLot] = useState<LotBatch | null>(null);

  // Product Form State
  const [prodForm, setProdForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    price: 9.90,
    costPrice: 4.50,
    taxRate: 23,
    category: categories[0]?.id || 'cat-bebidas',
    unit: 'un',
    minStock: 10,
    maxStock: 100,
    supplierId: suppliers[0]?.id || '',
    hasBatchControl: false,
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300',
    description: '',
  });

  // Stock Adjustment Form State
  const [adjustWarehouseId, setAdjustWarehouseId] = useState<string>(warehouses[0]?.id || '');
  const [adjustNewQty, setAdjustNewQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Contagem física de rotina');

  // Warehouse Form State
  const [whForm, setWhForm] = useState({
    name: '',
    code: '',
    location: '',
    isDefault: false,
    storeId: currentStore.id,
  });

  // Lot Form State
  const [lotForm, setLotForm] = useState({
    productId: products[0]?.id || '',
    warehouseId: warehouses[0]?.id || '',
    batchNumber: `LOT-2026-${Math.floor(100 + Math.random() * 900)}`,
    manufacturingDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    initialQuantity: 50,
    currentQuantity: 50,
    supplierId: suppliers[0]?.id || '',
  });

  // Transfer Form State
  const [transferProductId, setTransferProductId] = useState<string>(products[0]?.id || '');
  const [transferFromWh, setTransferFromWh] = useState<string>(warehouses[0]?.id || '');
  const [transferToWh, setTransferToWh] = useState<string>(warehouses[1]?.id || warehouses[0]?.id || '');
  const [transferQty, setTransferQty] = useState<number>(10);

  // Physical count state
  const [countedQuantities, setCountedQuantities] = useState<Record<string, number>>({});
  const [inventoryFinalized, setInventoryFinalized] = useState<boolean>(false);

  // Permissions check
  const canCreate = hasPermission('stock', 'create');
  const canEdit = hasPermission('stock', 'edit');
  const canDelete = hasPermission('stock', 'delete');

  // Filtered Stock Table
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.includes(q);
    const matchesCat = selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  // Calculate Total Valuation (CMP)
  const totalStockValue = stock.reduce((sum, item) => sum + item.quantity * item.avgCost, 0);
  const totalStockUnits = stock.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockProducts = products.filter((p) => {
    const totalQty = stock.filter((s) => s.productId === p.id).reduce((sum, s) => sum + s.quantity, 0);
    return totalQty <= p.minStock;
  });

  // Handle Save Product (Create or Edit)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name || !prodForm.sku) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: prodForm.name,
        sku: prodForm.sku,
        barcode: prodForm.barcode,
        price: Number(prodForm.price),
        costPrice: Number(prodForm.costPrice),
        taxRate: Number(prodForm.taxRate),
        category: prodForm.category,
        unit: prodForm.unit,
        minStock: Number(prodForm.minStock),
        maxStock: Number(prodForm.maxStock),
        supplierId: prodForm.supplierId,
        hasBatchControl: prodForm.hasBatchControl,
        imageUrl: prodForm.imageUrl,
        description: prodForm.description,
      });
      setEditingProduct(null);
    } else {
      addProduct({
        companyId: currentCompany.id,
        name: prodForm.name,
        sku: prodForm.sku,
        barcode: prodForm.barcode || `560${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        category: prodForm.category,
        price: Number(prodForm.price),
        costPrice: Number(prodForm.costPrice),
        taxRate: Number(prodForm.taxRate),
        unit: prodForm.unit,
        minStock: Number(prodForm.minStock),
        maxStock: Number(prodForm.maxStock),
        supplierId: prodForm.supplierId,
        hasBatchControl: prodForm.hasBatchControl,
        imageUrl: prodForm.imageUrl,
        description: prodForm.description,
      });
      setShowNewProductModal(false);
    }

    // Reset Form
    setProdForm({
      name: '',
      sku: '',
      barcode: '',
      price: 9.90,
      costPrice: 4.50,
      taxRate: 23,
      category: categories[0]?.id || 'cat-bebidas',
      unit: 'un',
      minStock: 10,
      maxStock: 100,
      supplierId: suppliers[0]?.id || '',
      hasBatchControl: false,
      imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300',
      description: '',
    });
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdForm({
      name: prod.name,
      sku: prod.sku,
      barcode: prod.barcode,
      price: prod.price,
      costPrice: prod.costPrice,
      taxRate: prod.taxRate,
      category: prod.category,
      unit: prod.unit,
      minStock: prod.minStock,
      maxStock: prod.maxStock,
      supplierId: prod.supplierId || '',
      hasBatchControl: prod.hasBatchControl,
      imageUrl: prod.imageUrl || '',
      description: prod.description || '',
    });
  };

  const handleOpenAdjustStock = (prod: Product) => {
    const currentQty = stock.find((s) => s.productId === prod.id && s.warehouseId === currentStore.defaultWarehouseId)?.quantity || 0;
    setAdjustingProduct(prod);
    setAdjustWarehouseId(currentStore.defaultWarehouseId || warehouses[0]?.id || '');
    setAdjustNewQty(currentQty);
    setAdjustReason('Ajuste de inventário manual');
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    createStockAdjustment(adjustingProduct.id, adjustWarehouseId, Number(adjustNewQty), adjustReason);
    setAdjustingProduct(null);
  };

  // Warehouse Handlers
  const handleSaveWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whForm.name || !whForm.code) return;

    if (editingWarehouse) {
      updateWarehouse(editingWarehouse.id, whForm);
      setEditingWarehouse(null);
    } else {
      addWarehouse({
        companyId: currentCompany.id,
        name: whForm.name,
        code: whForm.code,
        location: whForm.location,
        isDefault: whForm.isDefault,
        storeId: whForm.storeId,
      });
      setShowNewWarehouseModal(false);
    }
    setWhForm({ name: '', code: '', location: '', isDefault: false, storeId: currentStore.id });
  };

  // Lot Handlers
  const handleSaveLot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotForm.batchNumber || !lotForm.productId) return;

    if (editingLot) {
      updateLot(editingLot.id, lotForm);
      setEditingLot(null);
    } else {
      addLot({
        productId: lotForm.productId,
        warehouseId: lotForm.warehouseId,
        batchNumber: lotForm.batchNumber,
        manufacturingDate: lotForm.manufacturingDate,
        expiryDate: lotForm.expiryDate,
        initialQuantity: Number(lotForm.initialQuantity),
        currentQuantity: Number(lotForm.currentQuantity),
        supplierId: lotForm.supplierId,
      });
      setShowNewLotModal(false);
    }
  };

  // Transfer Handler
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferFromWh === transferToWh) {
      notify('O armazém de origem e de destino não podem ser iguais.', 'warning');
      return;
    }
    transferStock(transferProductId, transferFromWh, transferToWh, Number(transferQty));
    notify('Transferência entre armazéns registada com sucesso!', 'success');
  };

  // 1-Click Requisition Generator
  const handleCreateRequisitionForLowStock = (prod: Product) => {
    const currentQty = stock.filter((s) => s.productId === prod.id).reduce((acc, s) => acc + s.quantity, 0);
    const qtyNeeded = prod.maxStock - currentQty;
    addPurchaseRequisition({
      companyId: currentCompany.id,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      department: 'Armazém / Stock',
      priority: 'alta',
      status: 'pendente',
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          quantity: Math.max(10, qtyNeeded),
          estimatedUnitCost: prod.costPrice,
          total: Math.max(10, qtyNeeded) * prod.costPrice,
        },
      ],
      totalEstimated: Math.max(10, qtyNeeded) * prod.costPrice,
      notes: `Reposição automática de stock mínimo crítico para ${prod.sku}`,
    });
    notify(`Requisição de Compra criada com sucesso para reposição de ${prod.name}!`, 'success');
  };

  // Apply inventory count adjustments
  const handleFinalizeInventoryCount = () => {
    const targetWh = warehouses.find((w) => w.id === adjustWarehouseId) || warehouses[0];
    Object.entries(countedQuantities).forEach(([prodId, countedQty]) => {
      createStockAdjustment(prodId, targetWh.id, countedQty, 'Inventário Físico Finalizado');
    });
    setInventoryFinalized(true);
    setTimeout(() => setInventoryFinalized(false), 4000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Header & Metric Bar */}
      <div className="bg-[#141414] border-b border-[#262626] px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-serif text-[#e5e5e5]">Stock & Inventário Multiarmazém</h1>
              <p className="text-xs text-neutral-400">
                Catálogo mestre, valorização CMP, lotes/validades e gestão de armazéns
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="stock-import-btn"
              onClick={() => {
                setImportExportInitialMode('import');
                setShowImportExportModal(true);
              }}
              className="px-3.5 py-2 bg-[#1a1a1a] hover:bg-[#242424] text-neutral-200 border border-[#333] hover:border-[#c5a47e]/40 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Importar catálogo via Excel, CSV ou JSON"
            >
              <FileUp className="w-4 h-4 text-[#c5a47e]" />
              <span>Importar</span>
            </button>

            <button
              id="stock-export-btn"
              onClick={() => {
                setImportExportInitialMode('export');
                setShowImportExportModal(true);
              }}
              className="px-3.5 py-2 bg-[#1a1a1a] hover:bg-[#242424] text-neutral-200 border border-[#333] hover:border-[#c5a47e]/40 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
              title="Exportar catálogo para Excel, CSV ou JSON"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
              <span>Exportar</span>
            </button>

            <button
              id="stock-categories-btn"
              onClick={() => setActiveTab('categories')}
              className={`px-3.5 py-2 border font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs ${
                activeTab === 'categories'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-[#1a1a1a] hover:bg-[#252525] text-amber-300 hover:text-amber-200 border-[#333] hover:border-amber-500/40'
              }`}
              title="Gerir categorias de artigos, famílias de produtos, cores e ícones"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Gestão de Categorias</span>
            </button>

            {canCreate && (
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setShowNewProductModal(true);
                }}
                className="px-3.5 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Artigo</span>
              </button>
            )}
            {canCreate && (
              <button
                onClick={() => {
                  setEditingWarehouse(null);
                  setShowNewWarehouseModal(true);
                }}
                className="px-3.5 py-2 bg-[#1f1f1f] hover:bg-[#262626] text-neutral-200 border border-[#333] font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <WarehouseIcon className="w-4 h-4 text-emerald-400" />
                <span>Novo Armazém</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[#262626]">
          <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Valorização Total (CMP)</div>
            <div className="text-lg font-mono font-semibold text-[#c5a47e] mt-0.5">
              {formatCurrency(totalStockValue)}
            </div>
          </div>
          <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Unidades em Stock</div>
            <div className="text-lg font-mono font-semibold text-emerald-400 mt-0.5">
              {totalStockUnits.toLocaleString()} un
            </div>
          </div>
          <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Artigos no Catálogo</div>
            <div className="text-lg font-mono font-semibold text-neutral-200 mt-0.5">
              {products.length} referências
            </div>
          </div>
          <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-3">
            <div className="text-[11px] text-rose-400 uppercase tracking-wider flex items-center justify-between">
              <span>Stock Crítico / Baixo</span>
              {lowStockProducts.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
            </div>
            <div className="text-lg font-mono font-semibold text-rose-400 mt-0.5">
              {lowStockProducts.length} artigos
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#121212] border-b border-[#262626] px-6 flex items-center space-x-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Artigos & Catálogo', icon: Package, count: products.length },
          { id: 'categories', label: 'Gestão de Categorias', icon: Layers, count: categories.length },
          { id: 'warehouses', label: 'Armazéns & Lojas', icon: WarehouseIcon, count: warehouses.length },
          { id: 'lots', label: 'Lotes & Validades', icon: Tag, count: lots.length },
          { id: 'movements', label: 'Histórico de Movimentos', icon: ArrowUpDown, count: stockMovements.length },
          { id: 'transfer', label: 'Transferências Internas', icon: RefreshCw },
          { id: 'inventory_count', label: 'Contagem Física', icon: FileSpreadsheet },
          { id: 'reorder', label: 'Reposição Automática', icon: AlertTriangle, count: lowStockProducts.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-3 text-xs font-medium border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#c5a47e] text-[#c5a47e]'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-[#c5a47e]/20 text-[#c5a47e]'
                    : 'bg-[#1f1f1f] text-neutral-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB 1: OVERVIEW & PRODUCTS CRUD */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, SKU, código de barras..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md pl-9 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="flex items-center space-x-1">
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden"
                  >
                    <option value="all">Todas as Categorias</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="p-1.5 bg-[#1a1a1a] hover:bg-[#252525] text-amber-400 hover:text-amber-300 border border-[#2e2e2e] hover:border-amber-500/40 rounded-md transition-colors cursor-pointer"
                    title="Gerir Categorias (+ Nova / Editar)"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                </div>

                <select
                  value={selectedWarehouseFilter}
                  onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                  className="bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden"
                >
                  <option value="all">Todos os Armazéns</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Artigo / Referência</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3 text-right">PVP (c/ IVA)</th>
                    <th className="px-4 py-3 text-right">Custo (CMP)</th>
                    <th className="px-4 py-3 text-center">IVA</th>
                    <th className="px-4 py-3 text-right">Stock Global</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Ações CRUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {filteredProducts.map((prod) => {
                    const prodStockItems = stock.filter((s) => s.productId === prod.id);
                    const totalQty = prodStockItems.reduce((sum, s) => sum + s.quantity, 0);
                    const isLow = totalQty <= prod.minStock;
                    const cat = categories.find((c) => c.id === prod.category);

                    return (
                      <tr key={prod.id} className="hover:bg-[#191919] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt="" className="w-9 h-9 rounded-md object-cover bg-neutral-900 border border-[#262626]" />
                            ) : (
                              <div className="w-9 h-9 rounded-md bg-neutral-900 border border-[#262626] flex items-center justify-center text-neutral-500">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-neutral-200">{prod.name}</div>
                              <div className="text-[11px] font-mono text-neutral-500 flex items-center space-x-2">
                                <span>SKU: {prod.sku}</span>
                                <span>&bull;</span>
                                <span>EAN: {prod.barcode}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {cat?.name || prod.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-[#c5a47e]">
                          {formatCurrency(prod.price)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-400">
                          {formatCurrency(prod.costPrice)}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {prod.taxRate}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          <span className={isLow ? 'text-rose-400 font-bold' : 'text-neutral-200'}>
                            {totalQty} {prod.unit}
                          </span>
                          <div className="text-[10px] text-neutral-500">
                            Min: {prod.minStock} / Max: {prod.maxStock}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              Crítico
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleOpenAdjustStock(prod)}
                              title="Ajustar Stock Manualmente"
                              className="p-1.5 hover:bg-neutral-800 rounded-md text-amber-400 transition-colors cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => handleOpenEditProduct(prod)}
                                title="Editar Artigo"
                                className="p-1.5 hover:bg-neutral-800 rounded-md text-cyan-400 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  requestConfirm({
                                    title: 'Eliminar Artigo do Catálogo',
                                    message: `Tem a certeza que deseja eliminar o artigo "${prod.name}" (${prod.sku})? Esta ação removerá o registo de stock associado.`,
                                    itemDetails: `SKU: ${prod.sku} | Preço: ${formatCurrency(prod.price)} | Categoria: ${prod.category}`,
                                    confirmLabel: 'Eliminar Artigo',
                                    isDestructive: true,
                                    onConfirm: () => {
                                      deleteProduct(prod.id);
                                    },
                                  });
                                }}
                                title="Eliminar Artigo"
                                className="p-1.5 hover:bg-neutral-800 rounded-md text-rose-400 transition-colors cursor-pointer"
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

        {/* TAB: CATEGORIES CRUD */}
        {activeTab === 'categories' && (
          <CategoryManagementTab
            onFilterByCategory={(catId) => {
              setSelectedCategoryFilter(catId);
              setActiveTab('overview');
            }}
          />
        )}

        {/* TAB 2: WAREHOUSES CRUD */}
        {activeTab === 'warehouses' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {warehouses.map((wh) => {
                const whStock = stock.filter((s) => s.warehouseId === wh.id);
                const whUnits = whStock.reduce((sum, s) => sum + s.quantity, 0);
                const whVal = whStock.reduce((sum, s) => sum + s.quantity * s.avgCost, 0);

                return (
                  <div key={wh.id} className="bg-[#141414] border border-[#262626] rounded-xl p-5 relative group hover:border-[#383838] transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <WarehouseIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-200 text-sm">{wh.name}</h3>
                          <span className="text-xs font-mono text-neutral-500">{wh.code}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditingWarehouse(wh);
                              setWhForm({
                                name: wh.name,
                                code: wh.code,
                                location: wh.location,
                                isDefault: !!wh.isDefault,
                                storeId: wh.storeId || currentStore.id,
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
                                title: 'Eliminar Armazém',
                                message: `Tem a certeza que deseja eliminar o armazém "${wh.name}" (${wh.code})?`,
                                itemDetails: `Código: ${wh.code} | Localização: ${wh.location || 'N/A'}`,
                                confirmLabel: 'Eliminar Armazém',
                                isDestructive: true,
                                onConfirm: () => {
                                  deleteWarehouse(wh.id);
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
                        <span>Localização:</span>
                        <span className="text-neutral-200 font-medium">{wh.location || 'N/D'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total de Unidades:</span>
                        <span className="text-emerald-400 font-mono font-medium">{whUnits.toLocaleString()} un</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor em Stock:</span>
                        <span className="text-[#c5a47e] font-mono font-semibold">{formatCurrency(whVal)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span>Armazém Principal:</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          wh.isDefault ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {wh.isDefault ? 'Padrão' : 'Secundário'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: LOTS & BATCHES CRUD */}
        {activeTab === 'lots' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="text-xs text-neutral-400">
                Rastreabilidade de lotes com controlo de datas de fabrico e validade
              </div>
              {canCreate && (
                <button
                  onClick={() => {
                    setEditingLot(null);
                    setShowNewLotModal(true);
                  }}
                  className="px-3 py-1.5 bg-[#c5a47e] text-neutral-950 rounded-md text-xs font-medium cursor-pointer"
                >
                  + Criar Novo Lote
                </button>
              )}
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Número de Lote</th>
                    <th className="px-4 py-3">Artigo</th>
                    <th className="px-4 py-3">Armazém</th>
                    <th className="px-4 py-3">Fabrico</th>
                    <th className="px-4 py-3">Validade</th>
                    <th className="px-4 py-3 text-right">Qtd. Inicial</th>
                    <th className="px-4 py-3 text-right">Qtd. Atual</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {lots.map((lot) => {
                    const prod = products.find((p) => p.id === lot.productId);
                    const wh = warehouses.find((w) => w.id === lot.warehouseId);
                    const isNearExpiry = new Date(lot.expiryDate).getTime() - Date.now() < 90 * 86400000;

                    return (
                      <tr key={lot.id} className="hover:bg-[#191919] transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-[#c5a47e]">{lot.batchNumber}</td>
                        <td className="px-4 py-3 font-medium text-neutral-200">{prod?.name || lot.productId}</td>
                        <td className="px-4 py-3 text-neutral-400">{wh?.name || lot.warehouseId}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDate(lot.manufacturingDate)}</td>
                        <td className="px-4 py-3 font-mono">
                          <span className={isNearExpiry ? 'text-rose-400 font-bold' : 'text-neutral-300'}>
                            {formatDate(lot.expiryDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{lot.initialQuantity}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">{lot.currentQuantity}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingLot(lot);
                                  setLotForm({
                                    productId: lot.productId,
                                    warehouseId: lot.warehouseId,
                                    batchNumber: lot.batchNumber,
                                    manufacturingDate: lot.manufacturingDate,
                                    expiryDate: lot.expiryDate,
                                    initialQuantity: lot.initialQuantity,
                                    currentQuantity: lot.currentQuantity,
                                    supplierId: lot.supplierId || '',
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
                                    title: 'Eliminar Lote de Stock',
                                    message: `Tem a certeza que deseja eliminar o lote "${lot.batchNumber}"?`,
                                    itemDetails: `Lote: ${lot.batchNumber} | Quantidade: ${lot.currentQuantity} | Validade: ${lot.expiryDate}`,
                                    confirmLabel: 'Eliminar Lote',
                                    isDestructive: true,
                                    onConfirm: () => {
                                      deleteLot(lot.id);
                                    },
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded-md text-rose-400 cursor-pointer"
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

        {/* TAB 4: MOVEMENTS LOG CRUD */}
        {activeTab === 'movements' && (
          <div className="space-y-4">
            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Data/Hora</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Artigo</th>
                    <th className="px-4 py-3">Origem &rarr; Destino</th>
                    <th className="px-4 py-3 text-right">Quantidade</th>
                    <th className="px-4 py-3">Documento Ref.</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {stockMovements.map((mov) => {
                    const prod = products.find((p) => p.id === mov.productId);
                    const fromWh = warehouses.find((w) => w.id === mov.originWarehouseId);
                    const toWh = warehouses.find((w) => w.id === mov.targetWarehouseId);

                    return (
                      <tr key={mov.id} className="hover:bg-[#191919] transition-colors">
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDate(mov.timestamp)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                            mov.type === 'entrada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                            mov.type === 'saida' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                            mov.type === 'transferencia' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {mov.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-200">{prod?.name || mov.productId}</td>
                        <td className="px-4 py-3 text-neutral-400">
                          {fromWh?.name || '—'} &rarr; {toWh?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-200">
                          {mov.quantity}
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{mov.referenceDoc || '—'}</td>
                        <td className="px-4 py-3 text-neutral-400">{mov.reason || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {canDelete && (
                            <button
                              onClick={() => deleteStockMovement(mov.id)}
                              className="p-1 hover:bg-neutral-800 rounded-md text-neutral-500 hover:text-rose-400 cursor-pointer"
                              title="Remover registo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {stockMovements.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-neutral-500">
                        Nenhum movimento de stock registado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: STOCK TRANSFER */}
        {activeTab === 'transfer' && (
          <div className="max-w-2xl mx-auto bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-xs">
            <h3 className="text-base font-serif text-[#e5e5e5] mb-1">Transferência Entre Armazéns</h3>
            <p className="text-xs text-neutral-400 mb-6">
              Transfira artigos entre o Armazém Central e as lojas físicas com registo automático na cadeia fiscal.
            </p>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Artigo a Transferir</label>
                <select
                  value={transferProductId}
                  onChange={(e) => setTransferProductId(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Armazém de Origem</label>
                  <select
                    value={transferFromWh}
                    onChange={(e) => setTransferFromWh(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Armazém de Destino</label>
                  <select
                    value={transferToWh}
                    onChange={(e) => setTransferToWh(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Quantidade a Transferir</label>
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden font-mono"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Confirmar Transferência de Stock
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 6: PHYSICAL INVENTORY COUNT */}
        {activeTab === 'inventory_count' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#141414] p-4 rounded-xl border border-[#262626]">
              <div>
                <h3 className="text-sm font-semibold text-neutral-200">Sessão de Contagem Física de Inventário</h3>
                <p className="text-xs text-neutral-400">
                  Introduza as quantidades reais contadas fisicamente em armazém para calcular quebras ou sobras.
                </p>
              </div>
              <button
                onClick={handleFinalizeInventoryCount}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Finalizar e Aplicar Acertos
              </button>
            </div>

            {inventoryFinalized && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Inventário concluído! As diferenças foram gravadas e o stock atualizado.</span>
              </div>
            )}

            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Artigo</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3 text-right">Stock em Sistema</th>
                    <th className="px-4 py-3 text-right w-40">Qtd. Contada</th>
                    <th className="px-4 py-3 text-right">Desvio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {products.map((prod) => {
                    const currentQty = stock.filter((s) => s.productId === prod.id).reduce((sum, s) => sum + s.quantity, 0);
                    const counted = countedQuantities[prod.id] !== undefined ? countedQuantities[prod.id] : currentQty;
                    const diff = counted - currentQty;

                    return (
                      <tr key={prod.id} className="hover:bg-[#191919]">
                        <td className="px-4 py-3 font-medium text-neutral-200">{prod.name}</td>
                        <td className="px-4 py-3 font-mono text-neutral-500">{prod.sku}</td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-400">{currentQty}</td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            value={counted}
                            onChange={(e) => setCountedQuantities((prev) => ({ ...prev, [prod.id]: Number(e.target.value) }))}
                            className="w-24 bg-[#0d0d0d] border border-[#333] rounded px-2 py-1 text-right font-mono text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          <span className={diff < 0 ? 'text-rose-400' : diff > 0 ? 'text-emerald-400' : 'text-neutral-500'}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: REORDER & LOW STOCK */}
        {activeTab === 'reorder' && (
          <div className="space-y-4">
            <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-rose-400">Sugestões de Reposição Crítica</h3>
                <p className="text-xs text-neutral-400">
                  Artigos cujo stock atual está abaixo do limite de segurança configurado.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lowStockProducts.map((prod) => {
                const currentQty = stock.filter((s) => s.productId === prod.id).reduce((sum, s) => sum + s.quantity, 0);
                const needed = prod.maxStock - currentQty;

                return (
                  <div key={prod.id} className="bg-[#141414] border border-rose-500/20 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-neutral-200 text-sm">{prod.name}</h4>
                          <span className="text-xs font-mono text-neutral-500">{prod.sku}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 font-mono">
                          Stock: {currentQty} / Min: {prod.minStock}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#262626] flex items-center justify-between">
                      <div className="text-xs text-neutral-400">
                        Sugerido encomendar: <strong className="text-neutral-200 font-mono">{needed} un</strong> ({formatCurrency(needed * prod.costPrice)})
                      </div>
                      <button
                        onClick={() => handleCreateRequisitionForLowStock(prod)}
                        className="px-3 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-md transition-colors cursor-pointer"
                      >
                        Gerar Requisição
                      </button>
                    </div>
                  </div>
                );
              })}
              {lowStockProducts.length === 0 && (
                <div className="col-span-2 text-center py-12 text-neutral-500 bg-[#141414] rounded-xl border border-[#262626]">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p>Todos os artigos encontram-se dentro dos níveis de stock adequados.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: CREATE / EDIT PRODUCT ================= */}
      {(showNewProductModal || editingProduct) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingProduct ? 'Editar Artigo' : 'Adicionar Novo Artigo'}
              </h3>
              <button
                onClick={() => {
                  setShowNewProductModal(false);
                  setEditingProduct(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Nome do Artigo *</label>
                  <input
                    type="text"
                    required
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Código SKU *</label>
                  <input
                    type="text"
                    required
                    value={prodForm.sku}
                    onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Código de Barras (EAN-13)</label>
                  <input
                    type="text"
                    value={prodForm.barcode}
                    onChange={(e) => setProdForm({ ...prodForm, barcode: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Preço de Venda (PVP c/ IVA - {currencySymbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodForm.price}
                    onChange={(e) => setProdForm({ ...prodForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Preço de Custo (CMP - {currencySymbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodForm.costPrice}
                    onChange={(e) => setProdForm({ ...prodForm, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Taxa de IVA *</label>
                  <select
                    value={prodForm.taxRate}
                    onChange={(e) => setProdForm({ ...prodForm, taxRate: Number(e.target.value) })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                  >
                    <option value={23}>Taxa Normal (23%)</option>
                    <option value={13}>Taxa Intermédia (13%)</option>
                    <option value={6}>Taxa Reduzida (6%)</option>
                    <option value={0}>Isento (0%)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-neutral-300">Categoria</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-[11px] text-[#c5a47e] hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Gerir</span>
                    </button>
                  </div>
                  <select
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={prodForm.minStock}
                    onChange={(e) => setProdForm({ ...prodForm, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Stock Máximo</label>
                  <input
                    type="number"
                    value={prodForm.maxStock}
                    onChange={(e) => setProdForm({ ...prodForm, maxStock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-300 mb-1">URL da Imagem</label>
                  <input
                    type="text"
                    value={prodForm.imageUrl}
                    onChange={(e) => setProdForm({ ...prodForm, imageUrl: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProductModal(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {editingProduct ? 'Guardar Alterações' : 'Criar Artigo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADJUST STOCK ================= */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">Ajustar Stock Manual</h3>
              <button onClick={() => setAdjustingProduct(null)} className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-6 space-y-4">
              <div>
                <span className="text-xs text-neutral-400">Artigo Selecionado:</span>
                <div className="text-sm font-semibold text-neutral-200 mt-0.5">{adjustingProduct.name}</div>
                <div className="text-xs font-mono text-neutral-500">SKU: {adjustingProduct.sku}</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Armazém</label>
                <select
                  value={adjustWarehouseId}
                  onChange={(e) => setAdjustWarehouseId(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Nova Quantidade Real em Stock</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustNewQty}
                  onChange={(e) => setAdjustNewQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Motivo do Acerto</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  Gravar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE / EDIT WAREHOUSE ================= */}
      {(showNewWarehouseModal || editingWarehouse) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingWarehouse ? 'Editar Armazém' : 'Novo Armazém'}
              </h3>
              <button
                onClick={() => {
                  setShowNewWarehouseModal(false);
                  setEditingWarehouse(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWarehouse} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Nome do Armazém *</label>
                <input
                  type="text"
                  required
                  value={whForm.name}
                  onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Código Identificador *</label>
                <input
                  type="text"
                  required
                  value={whForm.code}
                  onChange={(e) => setWhForm({ ...whForm, code: e.target.value.toUpperCase() })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Localização Física</label>
                <input
                  type="text"
                  value={whForm.location}
                  onChange={(e) => setWhForm({ ...whForm, location: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="whDefault"
                  checked={whForm.isDefault}
                  onChange={(e) => setWhForm({ ...whForm, isDefault: e.target.checked })}
                  className="rounded border-neutral-700 text-[#c5a47e]"
                />
                <label htmlFor="whDefault" className="text-xs text-neutral-300 cursor-pointer">
                  Definir como Armazém Principal por Padrão
                </label>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewWarehouseModal(false);
                    setEditingWarehouse(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingWarehouse ? 'Guardar' : 'Criar Armazém'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE / EDIT LOT ================= */}
      {(showNewLotModal || editingLot) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingLot ? 'Editar Lote' : 'Novo Lote / Validade'}
              </h3>
              <button
                onClick={() => {
                  setShowNewLotModal(false);
                  setEditingLot(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLot} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Artigo *</label>
                <select
                  value={lotForm.productId}
                  onChange={(e) => setLotForm({ ...lotForm, productId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Armazém</label>
                <select
                  value={lotForm.warehouseId}
                  onChange={(e) => setLotForm({ ...lotForm, warehouseId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Número de Lote / Batch *</label>
                <input
                  type="text"
                  required
                  value={lotForm.batchNumber}
                  onChange={(e) => setLotForm({ ...lotForm, batchNumber: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Data de Fabrico</label>
                  <input
                    type="date"
                    value={lotForm.manufacturingDate}
                    onChange={(e) => setLotForm({ ...lotForm, manufacturingDate: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Data de Validade</label>
                  <input
                    type="date"
                    value={lotForm.expiryDate}
                    onChange={(e) => setLotForm({ ...lotForm, expiryDate: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Quantidade Inicial</label>
                  <input
                    type="number"
                    min="1"
                    value={lotForm.initialQuantity}
                    onChange={(e) => setLotForm({ ...lotForm, initialQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Quantidade Atual</label>
                  <input
                    type="number"
                    min="0"
                    value={lotForm.currentQuantity}
                    onChange={(e) => setLotForm({ ...lotForm, currentQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewLotModal(false);
                    setEditingLot(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingLot ? 'Guardar' : 'Criar Lote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Import / Export Modal */}
      <ProductImportExportModal
        isOpen={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        initialMode={importExportInitialMode}
      />

      {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelectCategory={(catId) => {
          setSelectedCategoryFilter(catId);
          setActiveTab('overview');
        }}
      />
    </div>
  );
};
