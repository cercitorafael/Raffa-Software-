import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Warehouse } from '../../types';
import { formatCurrency } from '../../utils/crypto';
import {
  X,
  Search,
  Barcode,
  ShoppingBag,
  Boxes,
  Percent,
  Sparkles,
  Check,
  Calendar,
  Layers,
  Store,
  Tag,
} from 'lucide-react';

export const PriceCheckerModal: React.FC = () => {
  const {
    showPriceCheckerModal,
    setShowPriceCheckerModal,
    products,
    stock,
    warehouses,
    lots,
    addToCart,
    setActiveNavTab,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showPriceCheckerModal) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [showPriceCheckerModal]);

  if (!showPriceCheckerModal) return null;

  const filteredProducts = searchTerm.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.barcode.includes(searchTerm)
      )
    : [];

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    setSearchTerm('');
  };

  // Stock calculations for selected product
  const productStockItems = selectedProduct
    ? stock.filter((st) => st.productId === selectedProduct.id)
    : [];
  const totalStockQty = productStockItems.reduce((acc, st) => acc + st.quantity, 0);

  // Lots for selected product
  const productLots = selectedProduct
    ? lots.filter((l) => l.productId === selectedProduct.id)
    : [];

  // Loyalty tier simulations
  const calculateTierPrice = (basePrice: number, discountRate: number) =>
    basePrice * (1 - discountRate / 100);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#101010] border border-[#262626] rounded-2xl w-full max-w-2xl text-[#e5e5e5] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#141414]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#c5a47e]/15 text-[#c5a47e] border border-[#c5a47e]/30">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Terminal de Consulta Rápida de Preços & Stock
              </h2>
              <p className="text-xs text-neutral-400">
                Pesquise por código de barras, SKU ou designação do artigo
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowPriceCheckerModal(false)}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-[#202020] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-6 border-b border-[#262626] bg-[#0c0c0c]">
          <div className="relative">
            <Search className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Leia o código com o leitor ou digite o nome / SKU (ex: 5601234567890)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-[#171717] border border-[#333] rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#c5a47e] shadow-inner"
            />
          </div>

          {/* Autocomplete Dropdown List */}
          {filteredProducts.length > 0 && (
            <div className="mt-2 bg-[#171717] border border-[#262626] rounded-xl overflow-hidden divide-y divide-[#222] shadow-xl max-h-48 overflow-y-auto">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className="p-3 hover:bg-[#222] cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <span className="font-semibold text-white">{p.name}</span>
                    <div className="text-[10px] text-neutral-400 flex items-center space-x-2 mt-0.5">
                      <span className="font-mono">SKU: {p.sku}</span>
                      <span>&bull;</span>
                      <span className="font-mono">EAN: {p.barcode}</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#c5a47e] text-sm">
                    {formatCurrency(p.price)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Product Information View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {selectedProduct ? (
            <>
              {/* Main Price & Title Hero Card */}
              <div className="bg-[#151515] border border-[#262626] rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#c5a47e]">
                      {selectedProduct.category} &bull; SKU: {selectedProduct.sku}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">
                      {selectedProduct.name}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 font-mono">
                      Código EAN-13: {selectedProduct.barcode}
                    </p>
                  </div>

                  <div className="text-left sm:text-right bg-[#0f0f0f] sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-[#262626]">
                    <span className="text-[11px] text-neutral-400 block">PVP com IVA ({selectedProduct.taxRate}%)</span>
                    <div className="text-3xl font-extrabold font-mono text-[#c5a47e]">
                      {formatCurrency(selectedProduct.price)}
                    </div>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">
                      Base Tributável: {formatCurrency(selectedProduct.price / (1 + selectedProduct.taxRate / 100))}
                    </span>
                  </div>
                </div>

                {/* Action button: add to cart */}
                <div className="mt-4 pt-4 border-t border-[#262626] flex items-center justify-between">
                  <span className="text-xs text-neutral-400">
                    Stock Global Disponível:{' '}
                    <strong className="text-emerald-400">{totalStockQty} {selectedProduct.unit}</strong>
                  </span>

                  <button
                    onClick={() => {
                      addToCart(selectedProduct);
                      setShowPriceCheckerModal(false);
                      setActiveNavTab('pos');
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-[#c5a47e] hover:bg-[#d4b896] text-black font-bold rounded-lg text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Lançar no Caixa POS</span>
                  </button>
                </div>
              </div>

              {/* Stock Across Warehouses */}
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <Boxes className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Disponibilidade por Armazém & Loja</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {warehouses.map((wh) => {
                    const st = productStockItems.find((s) => s.warehouseId === wh.id);
                    const qty = st ? st.quantity : 0;
                    return (
                      <div key={wh.id} className="p-3 rounded-lg bg-[#181818] border border-[#262626]">
                        <span className="text-xs font-semibold text-white block truncate">{wh.name}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-neutral-400">{wh.location}</span>
                          <span className={`text-xs font-mono font-bold ${
                            qty > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {qty} {selectedProduct.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Loyalty Tier Simulation */}
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simulador de Desconto por Escalão de Fidelização</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-[#181818] border border-[#262626] text-center">
                    <span className="text-[10px] text-neutral-400 block">PVP Regular</span>
                    <span className="text-xs font-mono font-bold text-white mt-1 block">
                      {formatCurrency(selectedProduct.price)}
                    </span>
                    <span className="text-[9px] text-neutral-500">Sem Cartão</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#181818] border border-[#262626] text-center">
                    <span className="text-[10px] text-amber-600 font-bold block">Cartão Bronze (-5%)</span>
                    <span className="text-xs font-mono font-bold text-amber-400 mt-1 block">
                      {formatCurrency(calculateTierPrice(selectedProduct.price, 5))}
                    </span>
                    <span className="text-[9px] text-neutral-400">Poupança: {formatCurrency(selectedProduct.price * 0.05)}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#181818] border border-[#262626] text-center">
                    <span className="text-[10px] text-neutral-300 font-bold block">Cartão Prata (-10%)</span>
                    <span className="text-xs font-mono font-bold text-neutral-200 mt-1 block">
                      {formatCurrency(calculateTierPrice(selectedProduct.price, 10))}
                    </span>
                    <span className="text-[9px] text-neutral-400">Poupança: {formatCurrency(selectedProduct.price * 0.10)}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#181818] border border-[#c5a47e]/30 text-center bg-[#c5a47e]/5">
                    <span className="text-[10px] text-[#c5a47e] font-bold block">Cartão Ouro (-15%)</span>
                    <span className="text-xs font-mono font-bold text-[#c5a47e] mt-1 block">
                      {formatCurrency(calculateTierPrice(selectedProduct.price, 15))}
                    </span>
                    <span className="text-[9px] text-[#c5a47e]/80">Poupança: {formatCurrency(selectedProduct.price * 0.15)}</span>
                  </div>
                </div>
              </div>

              {/* Batch & Expiry Info if available */}
              {productLots.length > 0 && (
                <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                  <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>Lotes e Validades em Armazém</span>
                  </h4>
                  <div className="divide-y divide-[#222]">
                    {productLots.map((l) => (
                      <div key={l.id} className="py-2 flex items-center justify-between text-xs">
                        <span className="font-mono text-neutral-300">Lote: {l.batchNumber}</span>
                        <span className="text-neutral-400">Validade: {l.expiryDate}</span>
                        <span className="font-mono font-bold text-white">{l.currentQuantity} un</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 space-y-3">
              <Barcode className="w-12 h-12 text-neutral-600 mx-auto stroke-1" />
              <p className="text-sm font-medium text-neutral-400">
                Passe um código de barras com o leitor ou faça uma pesquisa acima
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Exemplos de teste: digite "Café", "Azeite", "ALIM-001" ou "BEB-003".
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#141414] border-t border-[#262626] flex items-center justify-between text-xs text-neutral-400">
          <span>Software Certificado &bull; Portaria n.º 363/2010</span>
          <button
            onClick={() => setShowPriceCheckerModal(false)}
            className="px-4 py-1.5 bg-[#202020] hover:bg-[#282828] text-white rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
