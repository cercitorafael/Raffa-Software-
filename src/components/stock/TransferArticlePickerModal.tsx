import React, { useState, useMemo } from 'react';
import { Product, Warehouse, StockItem, ProductCategory } from '../../types';
import { formatCurrency } from '../../utils/crypto';
import {
  Search,
  X,
  CheckSquare,
  Square,
  Package,
  Check,
  Warehouse as WarehouseIcon,
  Filter,
  AlertCircle,
  Plus,
  Layers,
} from 'lucide-react';

interface TransferArticlePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  stock: StockItem[];
  originWarehouseId: string;
  destinationWarehouseId: string;
  warehouses: Warehouse[];
  categories: ProductCategory[];
  onSelectSingle: (productId: string, quantity?: number) => void;
  onSelectBatch?: (items: Array<{ productId: string; quantity: number }>) => void;
}

interface SelectedItemInfo {
  selected: boolean;
  quantity: number;
}

export const TransferArticlePickerModal: React.FC<TransferArticlePickerModalProps> = ({
  isOpen,
  onClose,
  products,
  stock,
  originWarehouseId,
  destinationWarehouseId,
  warehouses,
  categories,
  onSelectSingle,
  onSelectBatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyWithStock, setOnlyWithStock] = useState<boolean>(true);
  
  // Selected items map: { [productId]: SelectedItemInfo }
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItemInfo>>({});

  const originWh = useMemo(
    () => warehouses.find((w) => w.id === originWarehouseId) || warehouses[0],
    [warehouses, originWarehouseId]
  );

  const destWh = useMemo(
    () => warehouses.find((w) => w.id === destinationWarehouseId) || warehouses[1] || warehouses[0],
    [warehouses, destinationWarehouseId]
  );

  // Helper to get stock in a warehouse
  const getProductStock = (prodId: string, whId: string) => {
    return stock
      .filter((s) => s.productId === prodId && s.warehouseId === whId)
      .reduce((sum, s) => sum + s.quantity, 0);
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        searchTerm.trim() === '' ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' || p.categoryId === selectedCategory;

      const originQty = getProductStock(p.id, originWarehouseId);
      const matchStock = !onlyWithStock || originQty > 0;

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, searchTerm, selectedCategory, onlyWithStock, stock, originWarehouseId]);

  if (!isOpen) return null;

  const toggleSelect = (prodId: string, defaultQty = 1) => {
    setSelectedItems((prev) => {
      const current = prev[prodId];
      if (current && current.selected) {
        const next = { ...prev };
        delete next[prodId];
        return next;
      } else {
        const originStock = getProductStock(prodId, originWarehouseId);
        const qty = originStock > 0 ? Math.min(defaultQty, originStock) : 1;
        return {
          ...prev,
          [prodId]: { selected: true, quantity: qty },
        };
      }
    });
  };

  const updateItemQty = (prodId: string, qty: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [prodId]: {
        selected: true,
        quantity: Math.max(1, qty),
      },
    }));
  };

  const selectAllFiltered = () => {
    const next: Record<string, { selected: boolean; quantity: number }> = { ...selectedItems };
    filteredProducts.forEach((p) => {
      const originStock = getProductStock(p.id, originWarehouseId);
      next[p.id] = {
        selected: true,
        quantity: originStock > 0 ? 1 : 1,
      };
    });
    setSelectedItems(next);
  };

  const clearSelection = () => {
    setSelectedItems({});
  };

  const selectedCount = (Object.values(selectedItems) as SelectedItemInfo[]).filter(
    (i) => i.selected
  ).length;

  const handleConfirmBatch = () => {
    const itemsToTransfer = (Object.entries(selectedItems) as [string, SelectedItemInfo][])
      .filter(([_, val]) => val.selected && val.quantity > 0)
      .map(([productId, val]) => ({
        productId,
        quantity: val.quantity,
      }));

    if (itemsToTransfer.length === 0) return;

    if (itemsToTransfer.length === 1) {
      onSelectSingle(itemsToTransfer[0].productId, itemsToTransfer[0].quantity);
    } else if (onSelectBatch) {
      onSelectBatch(itemsToTransfer);
    } else {
      onSelectSingle(itemsToTransfer[0].productId, itemsToTransfer[0].quantity);
    }
    onClose();
  };

  const handlePickSingleDirectly = (prod: Product) => {
    const currentSelected = selectedItems[prod.id];
    const qty = currentSelected ? currentSelected.quantity : 1;
    onSelectSingle(prod.id, qty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#2e2e2e] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#171717]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#c5a47e]/10 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Selecção de Artigos para Transferência</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#262626] text-[#c5a47e] font-mono">
                  {filteredProducts.length} artigos
                </span>
              </h2>
              <div className="flex items-center space-x-2 text-xs text-neutral-400 mt-0.5">
                <span className="flex items-center space-x-1">
                  <WarehouseIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Origem: <strong className="text-neutral-200">{originWh?.name}</strong></span>
                </span>
                <span>&rarr;</span>
                <span className="flex items-center space-x-1">
                  <WarehouseIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Destino: <strong className="text-neutral-200">{destWh?.name}</strong></span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-[#111111] border-b border-[#262626] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 flex-1 min-w-[260px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por Nome, SKU ou Código de Barras..."
                className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
                >
                  &times;
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <label className="flex items-center space-x-2 text-neutral-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyWithStock}
                onChange={(e) => setOnlyWithStock(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-[#c5a47e] focus:ring-0 cursor-pointer"
              />
              <span>Apenas com stock na origem</span>
            </label>

            <div className="h-4 w-px bg-[#2e2e2e]"></div>

            <button
              onClick={selectAllFiltered}
              className="text-neutral-400 hover:text-[#c5a47e] font-medium cursor-pointer transition-colors"
            >
              Selecionar Visíveis
            </button>
            {selectedCount > 0 && (
              <button
                onClick={clearSelection}
                className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer transition-colors"
              >
                Limpar ({selectedCount})
              </button>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[50vh]">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500 space-y-2">
              <Package className="w-12 h-12 text-neutral-600" />
              <p className="text-sm font-medium text-neutral-300">Nenhum artigo encontrado</p>
              <p className="text-xs text-neutral-500">
                Tente ajustar os termos de pesquisa ou desmarcar o filtro "Apenas com stock na origem".
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#171717] text-neutral-400 font-medium border-b border-[#262626] z-10 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">
                    <span className="sr-only">Seleção</span>
                  </th>
                  <th className="px-4 py-3">Artigo & Referência</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3 text-right">Stock Origem ({originWh?.code || 'Origem'})</th>
                  <th className="px-4 py-3 text-right">Stock Destino ({destWh?.code || 'Destino'})</th>
                  <th className="px-4 py-3 text-center w-36">Qtd. a Transferir</th>
                  <th className="px-4 py-3 text-right w-28">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {filteredProducts.map((prod) => {
                  const originQty = getProductStock(prod.id, originWarehouseId);
                  const destQty = getProductStock(prod.id, destinationWarehouseId);
                  const isSelected = !!selectedItems[prod.id]?.selected;
                  const itemQty = selectedItems[prod.id]?.quantity || 1;
                  const hasStock = originQty > 0;
                  const categoryName = categories.find((c) => c.id === prod.categoryId)?.name || 'Geral';

                  return (
                    <tr
                      key={prod.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-[#c5a47e]/10 border-l-2 border-l-[#c5a47e]'
                          : 'hover:bg-[#191919]'
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelect(prod.id, 1)}
                          className="text-neutral-400 hover:text-[#c5a47e] cursor-pointer p-1 rounded transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#c5a47e]" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-600 hover:text-neutral-400" />
                          )}
                        </button>
                      </td>

                      {/* Name & SKU */}
                      <td className="px-4 py-3">
                        <div
                          className="cursor-pointer"
                          onClick={() => toggleSelect(prod.id, 1)}
                        >
                          <div className="font-semibold text-white flex items-center space-x-2">
                            <span>{prod.name}</span>
                            {prod.minStock > 0 && originQty <= prod.minStock && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/15 text-rose-400 border border-rose-500/20">
                                Stock Crítico
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono flex items-center space-x-2 mt-0.5">
                            <span>SKU: {prod.sku}</span>
                            {prod.barcode && <span>&bull; EAN: {prod.barcode}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-neutral-300">
                        <span className="px-2 py-0.5 rounded-full bg-[#1c1c1c] text-neutral-300 border border-[#2e2e2e] text-[10px]">
                          {categoryName}
                        </span>
                      </td>

                      {/* Origin Stock */}
                      <td className="px-4 py-3 text-right font-mono">
                        <span
                          className={`font-bold ${
                            originQty <= 0
                              ? 'text-rose-400'
                              : originQty <= 5
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {originQty} un
                        </span>
                      </td>

                      {/* Destination Stock */}
                      <td className="px-4 py-3 text-right font-mono text-neutral-400">
                        <span>{destQty} un</span>
                      </td>

                      {/* Quantity Input */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center space-x-1.5 bg-[#0e0e0e] border border-[#2e2e2e] rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.max(1, itemQty - 1);
                              updateItemQty(prod.id, newQty);
                            }}
                            className="w-6 h-6 rounded bg-[#202020] text-neutral-300 hover:text-white hover:bg-[#2a2a2a] text-xs font-bold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={originQty > 0 ? originQty : undefined}
                            value={isSelected ? itemQty : 1}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value));
                              updateItemQty(prod.id, val);
                            }}
                            className="w-12 text-center bg-transparent text-xs font-mono font-bold text-white focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = itemQty + 1;
                              updateItemQty(prod.id, newQty);
                            }}
                            className="w-6 h-6 rounded bg-[#202020] text-neutral-300 hover:text-white hover:bg-[#2a2a2a] text-xs font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                          {hasStock && (
                            <button
                              type="button"
                              onClick={() => updateItemQty(prod.id, originQty)}
                              title="Transferir todo o stock da origem"
                              className="px-1.5 py-0.5 rounded text-[9px] bg-[#c5a47e]/15 text-[#c5a47e] hover:bg-[#c5a47e]/25 font-semibold cursor-pointer"
                            >
                              Max
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handlePickSingleDirectly(prod)}
                          className="px-2.5 py-1.5 bg-[#202020] hover:bg-[#c5a47e] text-neutral-200 hover:text-neutral-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center ml-auto space-x-1"
                        >
                          <span>Escolher</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="px-6 py-4 bg-[#171717] border-t border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-3 text-xs">
            <span className="font-medium text-neutral-300">
              {selectedCount === 0
                ? 'Nenhum artigo marcado (clique nas caixas 🔳 ou em "Escolher")'
                : `${selectedCount} ${selectedCount === 1 ? 'artigo selecionado' : 'artigos selecionados'}`}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#202020] hover:bg-[#2a2a2a] text-neutral-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleConfirmBatch}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                selectedCount > 0
                  ? 'bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 shadow-md'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {selectedCount <= 1
                  ? 'Confirmar Seleção'
                  : `Carregar ${selectedCount} Artigos para Transferência`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
