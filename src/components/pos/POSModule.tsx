import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/crypto';
import { sound } from '../../utils/audio';
import {
  Search,
  Barcode,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  User,
  Percent,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  History,
  RotateCcw,
  WifiOff,
  Database,
  LayoutGrid,
  List,
  Edit2,
  UserPlus,
  X,
  Lock,
  Unlock,
  AlertTriangle,
  ShieldAlert,
  Wallet,
  FileText,
} from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { CashShiftModal } from './CashShiftModal';
import { Product, Customer } from '../../types';

export const POSModule: React.FC = () => {
  const {
    products,
    categories,
    stock,
    getAvailableStock,
    currentStore,
    currentCompany,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    updateCartDiscount,
    globalDiscount,
    setGlobalDiscount,
    selectedCustomer,
    setSelectedCustomer,
    customers,
    addCustomer,
    updateCustomer,
    clearCart,
    activeShift,
    salesHistory,
    lastCompletedSale,
    setLastCompletedSale,
    isOnline,
    syncQueue,
    setShowOfflineSyncModal,
    notify,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('pos_catalog_view_mode') as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftModalInitialMode, setShiftModalInitialMode] = useState<'info' | 'open' | 'close' | 'sangria' | 'suprimento' | 'history'>('info');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [showSalesHistoryModal, setShowSalesHistoryModal] = useState(false);

  // Customer Picker Modal States & Quick Direct Input
  const [isTypingCustomer, setIsTypingCustomer] = useState(false);
  const [directCustomerName, setDirectCustomerName] = useState('');
  const [directCustomerNif, setDirectCustomerNif] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [editingPosCustomer, setEditingPosCustomer] = useState<Customer | null>(null);
  const [showNewCustPosForm, setShowNewCustPosForm] = useState(false);
  const [posCustName, setPosCustName] = useState('');
  const [posCustNif, setPosCustNif] = useState('');
  const [posCustEmail, setPosCustEmail] = useState('');
  const [posCustPhone, setPosCustPhone] = useState('');

  // Barcode quick test scanner simulation
  const [barcodeInput, setBarcodeInput] = useState('');

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = barcodeInput.trim();
    if (!raw) return;

    let qty = 1;
    let term = raw;

    // Support multiplier format like "5*BEB-001", "10*400982341", "3xAgua"
    if (term.includes('*')) {
      const parts = term.split('*');
      const parsedQty = parseFloat(parts[0]);
      if (!isNaN(parsedQty) && parsedQty > 0) {
        qty = parsedQty;
        term = parts.slice(1).join('*').trim();
      }
    } else if (term.toLowerCase().includes('x')) {
      const parts = term.split(/[xX]/);
      const parsedQty = parseFloat(parts[0]);
      if (!isNaN(parsedQty) && parsedQty > 0 && parts.length > 1) {
        qty = parsedQty;
        term = parts.slice(1).join('x').trim();
      }
    }

    const found = products.find(
      (p) =>
        p.barcode === term ||
        p.sku.toLowerCase() === term.toLowerCase() ||
        p.name.toLowerCase() === term.toLowerCase()
    );

    if (found) {
      const available = getProductStock(found.id);
      if (available <= 0) {
        sound.playError();
        notify(`Venda não permitida: O artigo "${found.name}" está sem stock ou com stock zero (Stock: 0).`, 'error');
        return;
      }
      addToCart(found, qty);
      setBarcodeInput('');
      notify(`Adicionado: ${qty}x ${found.name}`, 'success');
    } else {
      sound.playError();
      notify(`Artigo "${term}" não encontrado!`, 'warning');
    }
  };

  // Filter products (Sorted alphabetically)
  const filteredProducts = products
    .filter((p) => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt', { sensitivity: 'base', numeric: true }));

  // Calculate cart totals
  const subtotal = cart.reduce((sum, i) => sum + Number(i.unitPrice || 0) * Number(i.quantity || 0), 0);
  const itemDiscounts = cart.reduce((sum, i) => sum + Number(i.discountAmount || 0), 0);
  const globalDiscountAmt = ((subtotal - itemDiscounts) * Number(globalDiscount || 0)) / 100;
  const totalDiscount = itemDiscounts + globalDiscountAmt;
  const grandTotal = Math.max(0, subtotal - totalDiscount);
  const totalItemsCount = cart.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

  // Get stock for store default warehouse with fallback
  const getProductStock = (productId: string) => {
    return getAvailableStock(productId, currentStore?.defaultWarehouseId);
  };

  // Stock validity for entire cart
  const invalidStockItems = cart.filter(
    (item) => !item.productId.startsWith('custom-') && (getProductStock(item.productId) <= 0 || item.quantity > getProductStock(item.productId))
  );
  const hasStockErrors = invalidStockItems.length > 0;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Left Workspace: Product Catalog & Fast Search */}
      <div className="flex-1 flex flex-col min-w-0 p-4 overflow-hidden">
        {/* Closed Cash Register Notice */}
        {!activeShift ? (
          <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5 text-amber-300">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-amber-200">Caixa Fechada &bull; Abertura Obrigatória</p>
                <p className="text-[11px] text-amber-400/80">
                  O caixa permanece fechado até que o operador realize a abertura manual com o fundo de maneio.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShiftModalInitialMode('history');
                  setShowShiftModal(true);
                }}
                className="px-2.5 py-1.5 bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300 hover:text-white border border-[#333333] rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer"
                title="Consultar e reimprimir relatórios Z anteriores"
              >
                <FileText className="w-3.5 h-3.5 text-[#c5a47e]" />
                <span>Relatórios Z Anteriores</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShiftModalInitialMode('open');
                  setShowShiftModal(true);
                }}
                className="px-3 py-1.5 bg-[#c5a47e] hover:bg-[#d4b896] text-black font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Abrir Caixa</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2.5 text-emerald-300 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30 text-emerald-400">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-emerald-200 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    <span>Caixa Aberto</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    &bull; Operador: <strong className="text-neutral-200">{activeShift.operatorName}</strong>
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400 font-mono flex items-center space-x-3 mt-0.5">
                  <span>Fundo Inicial: <strong className="text-neutral-200">{formatCurrency(activeShift.initialCash)}</strong></span>
                  <span>Total Faturado no Turno: <strong className="text-[#c5a47e]">{formatCurrency(activeShift.totalSales)}</strong></span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShiftModalInitialMode('history');
                  setShowShiftModal(true);
                }}
                className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300 hover:text-white border border-[#333333] rounded-lg text-[11px] font-medium flex items-center space-x-1.5 transition-all cursor-pointer"
                title="Consultar e reimprimir relatórios Z anteriores"
              >
                <FileText className="w-3.5 h-3.5 text-[#c5a47e]" />
                <span>Relatórios Z Anteriores</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShiftModalInitialMode('info');
                  setShowShiftModal(true);
                }}
                className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300 hover:text-white border border-[#333333] rounded-lg text-[11px] font-medium flex items-center space-x-1.5 transition-all cursor-pointer"
                title="Gerir Turno, Sangria, Suprimento e Fecho Z"
              >
                <span>Gerir Turno / Fecho Z</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Control Bar: Barcode Gun Simulation & Search */}
        <div className="bg-[#141414] p-3 rounded-xl border border-[#262626] shadow-sm space-y-2 mb-3">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar por nome do artigo, SKU ou código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-xs text-[#e5e5e5] placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e] transition-all"
              />
            </div>

            {/* Barcode Gun Simulator */}
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5">
              <div className="relative">
                <Barcode className="w-4 h-4 text-[#c5a47e] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ler Código de Barras (Gun)..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-48 sm:w-56 pl-8 pr-2 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-xs font-mono text-[#c5a47e] placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#c5a47e] hover:bg-[#d4b896] text-black rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
              >
                Scan
              </button>
            </form>
          </div>

          {/* Quick Barcode Sample Pills for instant test */}
          <div className="flex items-center gap-1.5 custom-horizontal-scrollbar py-1 text-[11px] text-neutral-400">
            <span className="font-semibold text-neutral-400 shrink-0 uppercase tracking-widest text-[10px]">Scans Rápidos:</span>
            {products.slice(0, 8).map((p) => {
              const pStock = getProductStock(p.id);
              const isOutOfStock = pStock <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (isOutOfStock) {
                      sound.playError();
                      notify(`Venda não permitida: O artigo "${p.name}" está sem stock ou esgotado (Stock: 0).`, 'error');
                      return;
                    }
                    addToCart(p);
                  }}
                  disabled={isOutOfStock}
                  className={`px-2 py-0.5 rounded-md border shrink-0 transition-colors cursor-pointer text-[11px] ${
                    isOutOfStock
                      ? 'bg-rose-950/30 text-rose-400/60 border-rose-900/30 cursor-not-allowed line-through'
                      : 'bg-[#0d0d0d] hover:bg-[#c5a47e]/20 hover:text-[#c5a47e] text-neutral-300 border-[#262626]'
                  }`}
                  title={isOutOfStock ? `Sem stock disponível (${pStock})` : `Adicionar ${p.name}`}
                >
                  + {(p.name || '').split(' ')[0]} ({formatCurrency(p.price)})
                  {isOutOfStock && <span className="ml-1 text-[9px] text-rose-400 font-bold font-mono">0</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filter Pills & View Mode Toggle */}
        <div className="flex items-center justify-between gap-2 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 custom-horizontal-scrollbar py-1 min-w-0 flex-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#c5a47e] text-black shadow-xs'
                  : 'bg-[#141414] text-neutral-400 hover:text-[#e5e5e5] border border-[#262626]'
              }`}
            >
              Todos os Artigos ({products.length})
            </button>
            {categories.map((c) => {
              const count = products.filter((p) => p.category === c.id).length;
              const isSelected = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#c5a47e] text-black shadow-xs'
                      : 'bg-[#141414] text-neutral-400 hover:text-[#e5e5e5] border border-[#262626]'
                  }`}
                >
                  <span>{c.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-black/20 text-black font-bold' : 'bg-[#0d0d0d] text-neutral-400 border border-[#262626]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle: Grid vs List */}
          <div className="bg-[#141414] p-1 rounded-lg border border-[#262626] flex items-center space-x-1 shrink-0">
            <button
              type="button"
              id="pos-view-grid-btn"
              onClick={() => {
                setViewMode('grid');
                try {
                  localStorage.setItem('pos_catalog_view_mode', 'grid');
                } catch {}
              }}
              title="Visualização em Grelha (Cartões)"
              className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center space-x-1 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#c5a47e] text-neutral-950 shadow-xs font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Grelha</span>
            </button>

            <button
              type="button"
              id="pos-view-list-btn"
              onClick={() => {
                setViewMode('list');
                try {
                  localStorage.setItem('pos_catalog_view_mode', 'list');
                } catch {}
              }}
              title="Visualização em Lista Compacta"
              className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center space-x-1 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#c5a47e] text-neutral-950 shadow-xs font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Lista</span>
            </button>
          </div>
        </div>

        {/* Product Catalog Display: Grid or List */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-[#141414] rounded-2xl border border-[#262626]">
              <div className="w-12 h-12 rounded-full bg-[#1e1e1e] flex items-center justify-center text-neutral-500 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-300">Nenhum artigo encontrado</h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                Não foram encontrados artigos correspondentes aos critérios de pesquisa ou categoria selecionada.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* ================= GRID VIEW ================= */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const currentStock = getProductStock(product.id);
                const isOutOfStock = currentStock <= 0;
                const isLowStock = !isOutOfStock && currentStock <= product.minStock;
                const inCart = cart.find((c) => c.productId === product.id);

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (isOutOfStock) {
                        sound.playError();
                        notify(`Venda não permitida: O artigo "${product.name}" está sem stock ou esgotado (Stock: 0).`, 'error');
                        return;
                      }
                      addToCart(product);
                    }}
                    className={`bg-[#141414] rounded-xl border overflow-hidden shadow-xs transition-all flex flex-col group select-none ${
                      isOutOfStock
                        ? 'border-rose-900/30 opacity-60 cursor-not-allowed bg-[#140f0f]'
                        : inCart
                        ? 'border-[#c5a47e]/50 ring-1 ring-[#c5a47e]/30 cursor-pointer hover:border-[#c5a47e]/60 hover:shadow-md active:scale-98'
                        : 'border-[#262626] cursor-pointer hover:border-[#c5a47e]/60 hover:shadow-md active:scale-98'
                    }`}
                  >
                    {/* Image container with badges */}
                    <div className="h-28 bg-[#0d0d0d] relative overflow-hidden">
                      <img
                        src={
                          product.imageUrl ||
                          'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300'
                        }
                        alt={product.name}
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                          isOutOfStock ? 'grayscale opacity-50' : 'group-hover:scale-105 opacity-90 group-hover:opacity-100'
                        }`}
                      />
                      <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs ${
                            isOutOfStock
                              ? 'bg-rose-900/90 text-rose-200 border border-rose-700/50 uppercase font-mono'
                              : isLowStock
                              ? 'bg-amber-900/90 text-amber-200 border border-amber-700/50 animate-pulse font-mono'
                              : 'bg-[#0a0a0a]/90 text-neutral-300 border border-[#262626] font-mono'
                          }`}
                        >
                          {isOutOfStock ? 'SEM STOCK (0)' : `Stock: ${currentStock}`}
                        </span>
                        {inCart && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#c5a47e] text-neutral-950 font-mono shadow-xs">
                            Cesto: {inCart.quantity}
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-1.5 left-1.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-[#0a0a0a]/90 text-neutral-300 border border-[#262626] backdrop-blur-xs font-mono">
                          IVA {product.taxRate}%
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-neutral-400 font-mono block mb-0.5">
                          {product.sku}
                        </span>
                        <h4 className={`text-xs font-medium line-clamp-2 leading-snug ${isOutOfStock ? 'text-neutral-500 line-through' : 'text-[#e5e5e5]'}`}>
                          {product.name}
                        </h4>
                      </div>

                      <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-[#262626]">
                        <span className={`text-base font-serif font-bold ${isOutOfStock ? 'text-neutral-500' : 'text-[#c5a47e]'}`}>
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium">/{product.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= LIST VIEW ================= */
            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs divide-y divide-[#202020]">
              {filteredProducts.map((product) => {
                const currentStock = getProductStock(product.id);
                const isOutOfStock = currentStock <= 0;
                const isLowStock = !isOutOfStock && currentStock <= product.minStock;
                const inCart = cart.find((c) => c.productId === product.id);
                const categoryName = categories.find((c) => c.id === product.category)?.name || product.category;

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (isOutOfStock) {
                        sound.playError();
                        notify(`Venda não permitida: O artigo "${product.name}" está sem stock ou esgotado (Stock: 0).`, 'error');
                        return;
                      }
                      addToCart(product);
                    }}
                    className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-all select-none ${
                      isOutOfStock
                        ? 'opacity-60 bg-[#120e0e] cursor-not-allowed'
                        : inCart
                        ? 'bg-[#c5a47e]/5 border-l-2 border-l-[#c5a47e] hover:bg-[#1c1c1c] cursor-pointer group active:bg-[#222]'
                        : 'hover:bg-[#1c1c1c] cursor-pointer group active:bg-[#222]'
                    }`}
                  >
                    {/* Thumbnail & Product Details */}
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-[#0d0d0d] border border-[#262626] overflow-hidden shrink-0 relative">
                        <img
                          src={
                            product.imageUrl ||
                            'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300'
                          }
                          alt={product.name}
                          className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale opacity-50' : 'group-hover:scale-105 transition-transform'}`}
                        />
                        {inCart && (
                          <div className="absolute inset-0 bg-[#c5a47e]/30 flex items-center justify-center font-bold text-xs text-black font-mono">
                            {inCart.quantity}x
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono text-neutral-400 bg-[#0d0d0d] px-1.5 py-0.5 rounded-xs border border-[#262626]">
                            {product.sku}
                          </span>
                          <span className="text-[10px] text-neutral-500 truncate hidden sm:inline">
                            {categoryName}
                          </span>
                        </div>
                        <h4 className={`text-xs font-semibold truncate mt-0.5 ${isOutOfStock ? 'text-neutral-500 line-through' : 'text-neutral-200 group-hover:text-[#c5a47e] transition-colors'}`}>
                          {product.name}
                        </h4>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] text-neutral-500 font-mono">
                            EAN: {product.barcode}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stock & Tax Badges */}
                    <div className="hidden md:flex items-center space-x-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono ${
                          isOutOfStock
                            ? 'bg-rose-950/60 text-rose-300 border-rose-800/40 uppercase'
                            : isLowStock
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800/40'
                            : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                        }`}
                      >
                        {isOutOfStock ? 'Sem Stock (0)' : `Stock: ${currentStock} ${product.unit}`}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 bg-[#0d0d0d] px-1.5 py-0.5 rounded-md border border-[#262626]">
                        IVA {product.taxRate}%
                      </span>
                    </div>

                    {/* Price & Quick Add Button */}
                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <div className={`text-sm sm:text-base font-bold font-mono ${isOutOfStock ? 'text-neutral-500' : 'text-[#c5a47e]'}`}>
                          {formatCurrency(product.price)}
                        </div>
                        <div className="text-[10px] text-neutral-500">/{product.unit}</div>
                      </div>

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isOutOfStock) {
                            sound.playError();
                            notify(`Venda não permitida: O artigo "${product.name}" está sem stock ou esgotado (Stock: 0).`, 'error');
                            return;
                          }
                          addToCart(product);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                          isOutOfStock
                            ? 'bg-rose-950/30 text-rose-400/50 border border-rose-900/30 cursor-not-allowed'
                            : inCart
                            ? 'bg-[#c5a47e] text-neutral-950 shadow-xs cursor-pointer'
                            : 'bg-[#1f1f1f] hover:bg-[#c5a47e] text-neutral-200 hover:text-neutral-950 border border-[#333] cursor-pointer'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {isOutOfStock ? 'Esgotado' : inCart ? `+1 (${inCart.quantity})` : 'Adicionar'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: POS Shopping Cart & Register Checkout */}
      <div className="w-full md:w-96 lg:w-[420px] bg-[#0d0d0d] border-l border-[#262626] flex flex-col shrink-0 shadow-2xl z-20">
        {/* Cart Header */}
        <div className="p-3.5 border-b border-[#262626] flex items-center justify-between bg-[#141414]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#c5a47e]/20 border border-[#c5a47e]/30 text-[#c5a47e] flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4 text-[#c5a47e]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#f2f2f2] uppercase tracking-wider">Venda Atual</h3>
              <p className="text-[10px] text-neutral-400">
                {totalItemsCount} {totalItemsCount === 1 ? 'artigo' : 'artigos'} no cesto
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowSalesHistoryModal(true)}
              className="p-1.5 text-neutral-400 hover:text-[#e5e5e5] hover:bg-[#1a1a1a] rounded-md transition-colors"
              title="Histórico de Vendas"
            >
              <History className="w-4 h-4" />
            </button>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors"
                title="Limpar Cesto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Customer Selector / Direct Name Input */}
        <div className="px-3.5 py-2.5 bg-[#141414] border-b border-[#262626] relative">
          {isTypingCustomer ? (
            /* Direct typing inline mode */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#c5a47e] flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Digitar Dados do Cliente</span>
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTypingCustomer(false);
                      setShowCustomerDropdown(false);
                    }}
                    className="p-1 text-neutral-400 hover:text-white rounded-sm hover:bg-[#222]"
                    title="Fechar edição direta"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nome do cliente (ex: João Silva)..."
                  value={directCustomerName}
                  onChange={(e) => {
                    setDirectCustomerName(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full px-2.5 py-1.5 bg-[#0d0d0d] border border-[#2e2e2e] rounded-md text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
                />

                {/* Auto-suggest dropdown from existing customers */}
                {showCustomerDropdown && directCustomerName.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#181818] border border-[#333] rounded-lg shadow-xl z-30 max-h-40 overflow-y-auto divide-y divide-[#262626]">
                    {customers
                      .filter((c) =>
                        (c.name || '').toLowerCase().includes(directCustomerName.toLowerCase()) ||
                        (c.taxNumber || '').includes(directCustomerName)
                      )
                      .slice(0, 5)
                      .map((c) => (
                        <div
                          key={c.id}
                          onMouseDown={() => {
                            setSelectedCustomer(c);
                            setDirectCustomerName(c.name);
                            setDirectCustomerNif(c.taxNumber);
                            setIsTypingCustomer(false);
                            setShowCustomerDropdown(false);
                            notify(`Cliente "${c.name}" associado!`, 'success');
                          }}
                          className="p-2 hover:bg-[#252525] cursor-pointer text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-white block">{c.name}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">NIF: {c.taxNumber}</span>
                          </div>
                          <span className="text-[10px] text-[#c5a47e] font-mono">{c.loyaltyPoints} pts</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="NIF / NUIT (opcional, padrão 999999990)"
                  value={directCustomerNif}
                  onChange={(e) => setDirectCustomerNif(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-[#0d0d0d] border border-[#2e2e2e] rounded-md text-xs font-mono text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmedName = directCustomerName.trim();
                    const trimmedNif = directCustomerNif.trim() || '999999990';
                    if (!trimmedName) {
                      notify('Por favor digite o nome do cliente', 'warning');
                      return;
                    }

                    // Check if exists or create a temporary/durable customer
                    const existing = customers.find(
                      (c) => c.taxNumber === trimmedNif || c.name.toLowerCase() === trimmedName.toLowerCase()
                    );

                    if (existing) {
                      setSelectedCustomer(existing);
                    } else {
                      const newCust: Customer = {
                        id: `cust-pos-${Date.now()}`,
                        companyId: currentCompany.id,
                        name: trimmedName,
                        taxNumber: trimmedNif,
                        email: `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
                        phone: '',
                        address: 'Balcão de Venda',
                        city: 'Lisboa',
                        country: 'PT',
                        postalCode: '1000-001',
                        loyaltyPoints: 0,
                        loyaltyTier: 'bronze',
                        totalSpent: 0,
                        ordersCount: 0,
                        creditLimit: 0,
                        currentCredit: 0,
                        createdAt: new Date().toISOString().split('T')[0],
                      };
                      addCustomer(newCust);
                      setSelectedCustomer(newCust);
                    }

                    setIsTypingCustomer(false);
                    setShowCustomerDropdown(false);
                    notify(`Cliente "${trimmedName}" pronto para a fatura!`, 'success');
                  }}
                  className="px-3 py-1.5 bg-[#c5a47e] text-black font-bold rounded-md text-xs hover:bg-[#b5946e] cursor-pointer flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aplicar</span>
                </button>
              </div>
            </div>
          ) : (
            /* Standard Customer Pill with Instant Type Button */
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs truncate">
                <User className="w-4 h-4 text-[#c5a47e] shrink-0" />
                <div className="truncate">
                  {selectedCustomer ? (
                    <div>
                      <span className="font-bold text-[#e5e5e5] text-xs block truncate">
                        {selectedCustomer.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        NIF: {selectedCustomer.taxNumber} •{' '}
                        <span className="text-[#c5a47e]">
                          {selectedCustomer.loyaltyPoints || 0} pts ({selectedCustomer.loyaltyTier || 'Bronze'})
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-medium text-neutral-300 text-xs block">Consumidor Final</span>
                      <span className="text-[10px] text-neutral-400 font-mono">NIF 999999990</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setDirectCustomerName(selectedCustomer ? selectedCustomer.name : '');
                    setDirectCustomerNif(selectedCustomer ? selectedCustomer.taxNumber : '');
                    setIsTypingCustomer(true);
                  }}
                  className="px-2 py-1 bg-[#1a1a1a] hover:bg-[#c5a47e]/20 text-[#c5a47e] border border-[#262626] rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Digitar nome do cliente diretamente"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{selectedCustomer ? 'Editar Nome' : 'Digitar Nome'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomerPicker(true)}
                  className="p-1 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-300 border border-[#262626] rounded-md text-[11px] transition-colors cursor-pointer"
                  title="Pesquisar na Lista de Clientes ou Registar"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>

                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setDirectCustomerName('');
                      setDirectCustomerNif('');
                      notify('Consumidor Final reposto!', 'info');
                    }}
                    className="p-1 bg-[#1a1a1a] hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-[#262626] rounded-md transition-colors"
                    title="Remover cliente e repor Consumidor Final"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
              <ShoppingBag className="w-12 h-12 text-neutral-700 mb-2 stroke-1" />
              <p className="text-xs font-semibold text-neutral-300">Cesto de compras vazio</p>
              <p className="text-[11px] text-neutral-400 mt-1 max-w-xs">
                Selecione os artigos no catálogo ou passe o código de barras no scanner.
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const isCustom = item.productId.startsWith('custom-');
              const itemStock = isCustom ? 9999 : getProductStock(item.productId);
              const isStockError = !isCustom && (itemStock <= 0 || item.quantity > itemStock);

              return (
                <div
                  key={item.productId}
                  className={`bg-[#141414] rounded-lg p-2.5 border flex flex-col gap-1.5 transition-colors ${
                    isStockError ? 'border-rose-700/80 bg-rose-950/20' : 'border-[#262626]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-[#e5e5e5] line-clamp-1">
                          {item.productName}
                        </span>
                        {isStockError && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white animate-pulse shrink-0 font-mono">
                            {itemStock <= 0 ? 'STOCK ZERO' : `MAX: ${itemStock}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {item.sku} &bull; {formatCurrency(item.unitPrice)} (IVA {item.taxRate}%)
                        </span>
                        {!isCustom && (
                          <span className={`text-[10px] font-mono ${itemStock <= 0 ? 'text-rose-400 font-bold' : 'text-neutral-500'}`}>
                            Stock Disp.: {itemStock}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-[#c5a47e]">
                      {formatCurrency(item.total)}
                    </span>
                  </div>

                  {/* Controls: Quantity +/- with direct typed input & Item Discount */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#262626]">
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                        className="w-6 h-6 rounded-md bg-[#1a1a1a] border border-[#262626] flex items-center justify-center text-neutral-300 hover:bg-[#262626] active:scale-95 transition-colors cursor-pointer"
                        title="Diminuir quantidade (-1)"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            updateCartQuantity(item.productId, val);
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-14 text-center text-xs font-bold font-mono text-[#c5a47e] bg-[#0d0d0d] border border-[#333333] hover:border-[#c5a47e]/60 focus:border-[#c5a47e] rounded-md py-0.5 px-1 focus:outline-hidden focus:ring-1 focus:ring-[#c5a47e]/50 transition-colors"
                        title="Clique ou selecione para digitar a quantidade a vender"
                      />

                      <button
                        type="button"
                        disabled={!isCustom && item.quantity >= itemStock}
                        onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                          !isCustom && item.quantity >= itemStock
                            ? 'bg-[#141414] border-[#222] text-neutral-600 cursor-not-allowed'
                            : 'bg-[#1a1a1a] border-[#262626] text-neutral-300 hover:bg-[#262626] active:scale-95 cursor-pointer'
                        }`}
                        title={!isCustom && item.quantity >= itemStock ? 'Limite de stock atingido' : 'Aumentar quantidade (+1)'}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line Discount selector */}
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-neutral-400">Desc:</span>
                        <select
                          value={item.discountPercent}
                          onChange={(e) => updateCartDiscount(item.productId, Number(e.target.value))}
                          className="bg-[#0d0d0d] border border-[#262626] rounded-xs text-[10px] px-1 py-0.5 font-semibold text-neutral-300 focus:outline-hidden"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="10">10%</option>
                          <option value="15">15%</option>
                          <option value="20">20%</option>
                          <option value="50">50%</option>
                        </select>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-neutral-400 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Totals & Checkout Panel */}
        <div className="p-4 bg-[#141414] border-t border-[#262626] space-y-3">
          {/* Quick Actions (Global Discount, Open Drawer, Shift, Z Reports) */}
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              onClick={() => setShowDiscountModal(true)}
              className={`flex items-center justify-center space-x-1 py-1.5 px-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                globalDiscount > 0
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-[#0d0d0d] border-[#262626] text-neutral-300 hover:bg-[#1a1a1a]'
              }`}
            >
              <Percent className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="truncate">Desc. {globalDiscount > 0 ? `${globalDiscount}%` : ''}</span>
            </button>

            <button
              onClick={() => {
                sound.playDrawerSound();
                setShiftModalInitialMode('info');
                setShowShiftModal(true);
              }}
              className="flex items-center justify-center space-x-1 py-1.5 px-1.5 bg-[#0d0d0d] border border-[#262626] hover:bg-[#1a1a1a] text-neutral-300 rounded-lg text-[11px] font-semibold transition-colors"
              title="Gerir Caixa e Turno atual"
            >
              <Clock className="w-3.5 h-3.5 text-[#c5a47e] shrink-0" />
              <span className="truncate">Turno</span>
            </button>

            <button
              onClick={() => {
                setShiftModalInitialMode('history');
                setShowShiftModal(true);
              }}
              className="flex items-center justify-center space-x-1 py-1.5 px-1.5 bg-[#0d0d0d] border border-[#262626] hover:bg-[#1a1a1a] text-neutral-300 hover:text-white rounded-lg text-[11px] font-semibold transition-colors"
              title="Aceder aos relatórios Z anteriores"
            >
              <FileText className="w-3.5 h-3.5 text-[#c5a47e] shrink-0" />
              <span className="truncate">Relatórios Z</span>
            </button>
          </div>

          {/* Subtotals & Taxes */}
          <div className="space-y-1.5 text-xs text-neutral-400 pt-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono text-neutral-200">{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-rose-400 font-medium">
                <span>Descontos Totais:</span>
                <span className="font-mono">-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-400 text-[11px]">
              <span>IVA Incluído:</span>
              <span className="font-mono">{formatCurrency(cart.reduce((s, i) => s + i.taxAmount, 0))}</span>
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-[#262626]">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Total a Pagar:</span>
              <span className="text-2xl font-serif font-bold text-[#c5a47e] tracking-tight">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            {hasStockErrors && (
              <div className="mt-2 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-tight">
                  <strong>Venda Bloqueada:</strong> Existem artigos com stock insuficiente ou a zero no cesto.
                </span>
              </div>
            )}

            {!isOnline && (
              <div
                className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center space-x-1.5 text-[11px] text-amber-300"
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Modo Offline: Os dados sincronizam automaticamente ao restaurar conexão.</span>
              </div>
            )}
          </div>

          {/* Checkout Button */}
          <button
            onClick={() => {
              if (hasStockErrors) {
                sound.playError();
                notify('Não é possível cobrar: Corrija os artigos com stock zero ou insuficiente no cesto.', 'error');
                return;
              }
              if (!activeShift) {
                setShowShiftModal(true);
              } else {
                setShowPaymentModal(true);
              }
            }}
            disabled={cart.length === 0 || hasStockErrors}
            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
              cart.length > 0 && !hasStockErrors
                ? 'bg-[#c5a47e] hover:bg-[#d4b896] text-black shadow-lg cursor-pointer active:scale-98'
                : 'bg-[#1a1a1a] text-neutral-500 border border-[#262626] cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {hasStockErrors ? 'BLOQUEADO: SEM STOCK' : 'PAGAR / COBRAR (F12)'}
            </span>
          </button>
        </div>
      </div>

      {/* Customer Picker Modal */}
      {showCustomerPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] text-[#e5e5e5]">
            <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] text-[#e5e5e5] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-serif font-bold text-[#c5a47e]">Associar ou Editar Cliente da Venda</h4>
                <p className="text-[11px] text-neutral-400">Selecione, edite ou crie um cliente para esta fatura</p>
              </div>
              <button
                onClick={() => {
                  setShowCustomerPicker(false);
                  setEditingPosCustomer(null);
                  setShowNewCustPosForm(false);
                }}
                className="p-1 text-neutral-400 hover:text-white rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions / Search Bar */}
            <div className="p-3 bg-[#0f0f0f] border-b border-[#262626] flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, NIF ou email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#181818] border border-[#2c2c2c] rounded-lg text-xs text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewCustPosForm(!showNewCustPosForm);
                  setEditingPosCustomer(null);
                  setPosCustName('');
                  setPosCustNif('');
                  setPosCustEmail('');
                  setPosCustPhone('');
                }}
                className="px-2.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-black text-xs font-bold rounded-lg transition-all flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showNewCustPosForm ? 'Ver Lista' : '+ Novo'}</span>
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {/* Form: Edit Customer inline */}
              {editingPosCustomer && (
                <div className="p-3.5 bg-[#1a1a1a] border border-[#c5a47e]/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-2">
                    <span className="text-xs font-bold text-[#c5a47e] flex items-center space-x-1.5">
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar Dados de: {editingPosCustomer.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingPosCustomer(null)}
                      className="text-neutral-400 hover:text-white text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-neutral-400 block mb-0.5 text-[11px]">Nome / Razão Social</label>
                      <input
                        type="text"
                        value={posCustName}
                        onChange={(e) => setPosCustName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-0.5 text-[11px]">NIF / NUIT</label>
                      <input
                        type="text"
                        value={posCustNif}
                        onChange={(e) => setPosCustNif(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-0.5 text-[11px]">Email</label>
                      <input
                        type="email"
                        value={posCustEmail}
                        onChange={(e) => setPosCustEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-0.5 text-[11px]">Telefone</label>
                      <input
                        type="text"
                        value={posCustPhone}
                        onChange={(e) => setPosCustPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!posCustName.trim()) return;
                        updateCustomer(editingPosCustomer.id, {
                          name: posCustName.trim(),
                          taxNumber: posCustNif.trim(),
                          email: posCustEmail.trim(),
                          phone: posCustPhone.trim(),
                        });
                        setSelectedCustomer({
                          ...editingPosCustomer,
                          name: posCustName.trim(),
                          taxNumber: posCustNif.trim(),
                          email: posCustEmail.trim(),
                          phone: posCustPhone.trim(),
                        });
                        notify(`Cliente ${posCustName} atualizado e associado!`, 'success');
                        setEditingPosCustomer(null);
                        setShowCustomerPicker(false);
                      }}
                      className="px-3 py-1.5 bg-[#c5a47e] text-black font-bold text-xs rounded-lg hover:bg-[#b5946e]"
                    >
                      Guardar e Selecionar
                    </button>
                  </div>
                </div>
              )}

              {/* Form: Register New Customer inline */}
              {showNewCustPosForm && !editingPosCustomer && (
                <div className="p-3.5 bg-[#1a1a1a] border border-[#c5a47e]/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-2">
                    <span className="text-xs font-bold text-[#c5a47e] flex items-center space-x-1.5">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Registar Novo Cliente</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewCustPosForm(false)}
                      className="text-neutral-400 hover:text-white text-xs"
                    >
                      Voltar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-neutral-400 block mb-0.5 text-[11px]">Nome / Empresa *</label>
                      <input
                        type="text"
                        required
                        value={posCustName}
                        onChange={(e) => setPosCustName(e.target.value)}
                        placeholder="Nome do cliente"
                        className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-0.5 text-[11px]">NIF / NUIT *</label>
                      <input
                        type="text"
                        required
                        value={posCustNif}
                        onChange={(e) => setPosCustNif(e.target.value)}
                        placeholder="234567890"
                        className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-0.5 text-[11px]">Email</label>
                      <input
                        type="email"
                        value={posCustEmail}
                        onChange={(e) => setPosCustEmail(e.target.value)}
                        placeholder="cliente@email.pt"
                        className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-0.5 text-[11px]">Telefone</label>
                      <input
                        type="text"
                        value={posCustPhone}
                        onChange={(e) => setPosCustPhone(e.target.value)}
                        placeholder="+351 9..."
                        className="w-full px-2.5 py-1.5 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!posCustName.trim() || !posCustNif.trim()) return;
                        addCustomer({
                          companyId: currentCompany.id,
                          name: posCustName.trim(),
                          taxNumber: posCustNif.trim(),
                          email: posCustEmail.trim() || `${posCustName.toLowerCase().replace(/\s+/g, '.')}@email.pt`,
                          phone: posCustPhone.trim() || '+351 900 000 000',
                          address: 'Balcão de Venda',
                          city: 'Lisboa',
                          country: 'PT',
                          postalCode: '1000-001',
                          loyaltyPoints: 10,
                          loyaltyTier: 'bronze',
                          totalSpent: 0,
                          notes: 'Criado no POS',
                        });
                        notify(`Cliente ${posCustName} criado e adicionado à venda!`, 'success');
                        setShowNewCustPosForm(false);
                        setShowCustomerPicker(false);
                      }}
                      className="px-3 py-1.5 bg-[#c5a47e] text-black font-bold text-xs rounded-lg hover:bg-[#b5946e]"
                    >
                      Criar e Associar à Venda
                    </button>
                  </div>
                </div>
              )}

              {/* Default Consumidor Final Option */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setShowCustomerPicker(false);
                  }}
                  className={`flex-1 text-left p-3 rounded-lg border text-xs transition-colors ${
                    !selectedCustomer
                      ? 'border-[#c5a47e] bg-[#c5a47e]/10'
                      : 'border-[#262626] bg-[#0d0d0d] hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#e5e5e5]">Consumidor Final (Padrão)</p>
                      <p className="text-[11px] text-neutral-400 font-mono">NIF 999999990 • Venda a balcão</p>
                    </div>
                    {!selectedCustomer && (
                      <span className="text-[10px] px-2 py-0.5 bg-[#c5a47e]/20 text-[#c5a47e] rounded-full font-bold">
                        Selecionado
                      </span>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const defaultCust = customers.find((c) => c.name.toLowerCase().includes('consumidor')) || {
                      id: 'cust-1',
                      companyId: currentCompany.id,
                      name: 'Consumidor Final',
                      taxNumber: '999999990',
                      email: 'consumidor@anonimo.pt',
                      phone: '',
                      address: 'Balcão de Venda',
                      city: 'Lisboa',
                      country: 'PT',
                      postalCode: '1000-001',
                      loyaltyPoints: 0,
                      loyaltyTier: 'bronze',
                      totalSpent: 0,
                      ordersCount: 0,
                      creditLimit: 0,
                      currentCredit: 0,
                      createdAt: '2026-01-01',
                    };
                    setEditingPosCustomer(defaultCust);
                    setPosCustName(defaultCust.name);
                    setPosCustNif(defaultCust.taxNumber);
                    setPosCustEmail(defaultCust.email || '');
                    setPosCustPhone(defaultCust.phone || '');
                  }}
                  className="p-3 bg-[#1f1f1f] hover:bg-[#c5a47e] hover:text-black text-[#c5a47e] border border-[#2e2e2e] rounded-lg transition-all"
                  title="Editar Consumidor Final"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {/* Customer List */}
              {customers
                .filter((c) => {
                  const q = customerSearch.toLowerCase();
                  return (
                    (c.name || '').toLowerCase().includes(q) ||
                    (c.taxNumber || '').includes(q) ||
                    (c.email || '').toLowerCase().includes(q)
                  );
                })
                .map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-colors ${
                      selectedCustomer?.id === c.id
                        ? 'border-[#c5a47e] bg-[#c5a47e]/10'
                        : 'border-[#262626] bg-[#0d0d0d] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setShowCustomerPicker(false);
                      }}
                      className="flex-1 text-left flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-[#e5e5e5]">{c.name}</p>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          NIF: {c.taxNumber} &bull; {c.email || c.phone || 'Sem contacto'}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/30 rounded-full font-bold">
                        {c.loyaltyTier || 'Bronze'} ({c.loyaltyPoints || 0} pts)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPosCustomer(c);
                        setPosCustName(c.name || '');
                        setPosCustNif(c.taxNumber || '');
                        setPosCustEmail(c.email || '');
                        setPosCustPhone(c.phone || '');
                      }}
                      className="p-1.5 bg-[#1a1a1a] hover:bg-[#c5a47e] hover:text-black text-[#c5a47e] border border-[#333] rounded-md transition-colors"
                      title="Editar Cliente"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Global Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-[#e5e5e5]">
            <h4 className="text-sm font-serif font-bold text-[#c5a47e]">Aplicar Desconto Global</h4>
            <div className="flex gap-2">
              {[0, 5, 10, 15, 20, 25].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    setGlobalDiscount(pct);
                    setShowDiscountModal(false);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    globalDiscount === pct
                      ? 'bg-[#c5a47e] text-black border-[#c5a47e]'
                      : 'bg-[#0d0d0d] hover:bg-[#1a1a1a] text-neutral-300 border-[#262626]'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <div className="pt-2">
              <label className="text-xs text-neutral-400 block mb-1">Outro valor percentual:</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(Number(e.target.value))}
                  placeholder="%"
                  className="flex-1 px-3 py-1.5 bg-[#0d0d0d] border border-[#262626] rounded-lg text-xs text-[#e5e5e5] focus:outline-hidden focus:border-[#c5a47e]"
                />
                <button
                  onClick={() => {
                    setGlobalDiscount(discountInput);
                    setShowDiscountModal(false);
                  }}
                  className="px-4 py-1.5 bg-[#c5a47e] text-black rounded-lg text-xs font-bold hover:bg-[#d4b896]"
                >
                  Aplicar
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowDiscountModal(false)}
              className="w-full py-2 bg-[#0d0d0d] border border-[#262626] text-neutral-400 hover:text-white rounded-lg text-xs font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Sales History Modal */}
      {showSalesHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] text-[#e5e5e5]">
            <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between">
              <h4 className="text-sm font-serif font-bold text-[#c5a47e] flex items-center space-x-2">
                <History className="w-4 h-4 text-[#c5a47e]" />
                <span>Histórico de Vendas Recentes</span>
              </h4>
              <button
                onClick={() => setShowSalesHistoryModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {salesHistory.length === 0 ? (
                <p className="text-center py-8 text-xs text-neutral-500">Nenhuma venda registada neste turno.</p>
              ) : (
                salesHistory.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-[#0d0d0d] border border-[#262626] rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#e5e5e5] font-mono">{s.invoiceNumber}</span>
                      <span className="text-[10px] text-neutral-400 block">
                        {new Date(s.date).toLocaleTimeString()} &bull; {s.customerName} ({s.customerTaxNumber})
                      </span>
                      <span className="text-[9px] text-neutral-400 font-mono">
                        Hash: {s.fiscalHash.substring(0, 8)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-serif font-bold text-[#c5a47e] text-sm">
                        {formatCurrency(s.total)}
                      </span>
                      <button
                        onClick={() => {
                          setLastCompletedSale(s);
                          setShowReceiptModal(true);
                          setShowSalesHistoryModal(false);
                        }}
                        className="px-2.5 py-1 bg-[#c5a47e]/20 hover:bg-[#c5a47e]/30 text-[#c5a47e] border border-[#c5a47e]/30 rounded-md font-semibold text-[11px] transition-colors"
                      >
                        Recibo
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout / Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            setShowReceiptModal(true);
          }}
        />
      )}

      {/* Post-Checkout Receipt Modal */}
      {showReceiptModal && lastCompletedSale && (
        <ReceiptModal
          sale={lastCompletedSale}
          company={currentCompany}
          store={currentStore}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      {/* Cash Shift Modal */}
      {showShiftModal && (
        <CashShiftModal
          initialMode={shiftModalInitialMode}
          onClose={() => {
            setShowShiftModal(false);
            setShiftModalInitialMode('info');
          }}
        />
      )}
    </div>
  );
};
