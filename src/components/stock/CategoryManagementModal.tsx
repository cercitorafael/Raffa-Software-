import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCategory, Product } from '../../types';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Check,
  Tag,
  Package,
  Boxes,
  ShoppingBag,
  Sparkles,
  Coffee,
  Apple,
  Laptop,
  Shirt,
  HeartPulse,
  BookOpen,
  Sprout,
  Wrench,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';
import { formatCurrency } from '../../utils/crypto';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory?: (categoryId: string) => void;
}

const COLOR_PALETTE = [
  { id: 'emerald', label: 'Verde Esmeralda', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', hex: '#10b981' },
  { id: 'amber', label: 'Âmbar / Dourado', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', hex: '#f59e0b' },
  { id: 'blue', label: 'Azul Safira', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', hex: '#3b82f6' },
  { id: 'violet', label: 'Violeta / Roxo', bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', hex: '#8b5cf6' },
  { id: 'teal', label: 'Azul Turquesa', bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30', hex: '#14b8a6' },
  { id: 'rose', label: 'Rosa / Coral', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', hex: '#f43f5e' },
  { id: 'orange', label: 'Laranja Quente', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', hex: '#f97316' },
  { id: 'cyan', label: 'Ciano Claro', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', hex: '#06b6d4' },
  { id: 'gold', label: 'Ouro Especial', bg: 'bg-[#c5a47e]/15', text: 'text-[#c5a47e]', border: 'border-[#c5a47e]/30', hex: '#c5a47e' },
];

const AVAILABLE_ICONS = [
  { id: 'Layers', label: 'Camadas', icon: Layers },
  { id: 'Tag', label: 'Etiqueta', icon: Tag },
  { id: 'Package', label: 'Caixa / Artigo', icon: Package },
  { id: 'Boxes', label: 'Stock / Multi', icon: Boxes },
  { id: 'ShoppingBag', label: 'Saco de Compras', icon: ShoppingBag },
  { id: 'Coffee', label: 'Bebidas / Café', icon: Coffee },
  { id: 'Apple', label: 'Alimentos / Fruta', icon: Apple },
  { id: 'Laptop', label: 'Tecnologia', icon: Laptop },
  { id: 'Shirt', label: 'Vestuário', icon: Shirt },
  { id: 'HeartPulse', label: 'Saúde & Higiene', icon: HeartPulse },
  { id: 'BookOpen', label: 'Papelaria', icon: BookOpen },
  { id: 'Sprout', label: 'Agro / Campo', icon: Sprout },
  { id: 'Wrench', label: 'Ferramentas / Oficina', icon: Wrench },
  { id: 'Sparkles', label: 'Destaques & Promoções', icon: Sparkles },
];

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
}) => {
  const {
    categories,
    products,
    stock,
    addCategory,
    updateCategory,
    deleteCategory,
    currentUser,
    hasPermission,
    requestConfirm,
    notify,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    color: string;
    icon: string;
  }>({
    name: '',
    color: 'emerald',
    icon: 'Layers',
  });

  const canCreate = hasPermission('stock', 'create') || currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const canEdit = hasPermission('stock', 'edit') || currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const canDelete = hasPermission('stock', 'delete') || currentUser?.role === 'admin' || currentUser?.role === 'manager';

  if (!isOpen) return null;

  const filteredCategories = categories.filter((cat) =>
    (cat.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to count products and value per category
  const getCategoryStats = (categoryId: string) => {
    const categoryProducts = products.filter((p) => p.category === categoryId);
    const count = categoryProducts.length;
    const value = categoryProducts.reduce((sum, p) => {
      const prodStock = stock
        .filter((s) => s.productId === p.id)
        .reduce((acc, s) => acc + s.quantity, 0);
      return sum + prodStock * (p.costPrice || 0);
    }, 0);

    return { count, value };
  };

  const handleStartCreate = () => {
    setEditingCatId(null);
    setFormData({
      name: '',
      color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)].id,
      icon: 'Tag',
    });
    setShowCreateForm(true);
  };

  const handleStartEdit = (cat: ProductCategory) => {
    setEditingCatId(cat.id);
    setFormData({
      name: cat.name,
      color: cat.color || 'emerald',
      icon: cat.icon || 'Layers',
    });
    setShowCreateForm(true);
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setEditingCatId(null);
    setFormData({ name: '', color: 'emerald', icon: 'Layers' });
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formData.name.trim();
    if (!cleanName) {
      notify('Por favor introduza o nome da categoria.', 'warning');
      return;
    }

    if (editingCatId) {
      updateCategory(editingCatId, {
        name: cleanName,
        color: formData.color,
        icon: formData.icon,
      });
      notify(`Categoria "${cleanName}" atualizada com sucesso!`, 'success');
    } else {
      addCategory({
        name: cleanName,
        color: formData.color,
        icon: formData.icon,
      });
      notify(`Categoria "${cleanName}" criada com sucesso!`, 'success');
    }

    handleCancelForm();
  };

  const handleDeleteCategory = (cat: ProductCategory) => {
    const stats = getCategoryStats(cat.id);

    if (categories.length <= 1) {
      notify('Não é possível eliminar a única categoria existente.', 'warning');
      return;
    }

    requestConfirm({
      title: 'Eliminar Categoria de Artigos',
      message: stats.count > 0
        ? `Atenção: A categoria "${cat.name}" possui ${stats.count} artigo(s) associado(s). Se eliminar, estes artigos ficarão sem categoria principal.`
        : `Tem a certeza que deseja eliminar a categoria "${cat.name}"?`,
      confirmLabel: 'Sim, Eliminar',
      cancelLabel: 'Cancelar',
      isDestructive: true,
      onConfirm: () => {
        deleteCategory(cat.id);
      },
    });
  };

  const renderIcon = (iconName?: string, className: string = 'w-4 h-4') => {
    const found = AVAILABLE_ICONS.find((i) => i.id === iconName);
    const IconComp = found ? found.icon : Layers;
    return <IconComp className={className} />;
  };

  return (
    <div
      id="category-management-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#171717]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Gestão de Categorias de Stock</h2>
              <p className="text-xs text-neutral-400">
                Organize e classifique artigos, famílias de produtos e regras de inventário
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-[#222] transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Search Bar */}
        <div className="p-4 border-b border-[#262626] bg-[#141414] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#0a0a0a] border border-[#2e2e2e] rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <div className="text-xs text-neutral-400 font-mono hidden md:block">
              Total: <span className="text-white font-semibold">{categories.length}</span> categorias
            </div>

            {canCreate && !showCreateForm && (
              <button
                id="btn-add-category-modal"
                onClick={handleStartCreate}
                className="px-3.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Categoria</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Create / Edit Form Collapsible */}
          {showCreateForm && (
            <form
              onSubmit={handleSaveCategory}
              className="bg-[#181818] border border-[#333] rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between border-b border-[#282828] pb-3">
                <div className="flex items-center space-x-2">
                  <FolderPlus className="w-4 h-4 text-[#c5a47e]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {editingCatId ? 'Editar Categoria' : 'Criar Nova Categoria'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs text-neutral-300 font-medium">
                    Nome da Categoria <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ex: Frutas & Vegetais, Bebidas, Ferragens..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#2e2e2e] rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                {/* Color Palette Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs text-neutral-300 font-medium">
                    Cor de Destaque / Badge
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_PALETTE.map((pal) => {
                      const isSelected = formData.color === pal.id;
                      return (
                        <button
                          key={pal.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: pal.id })}
                          title={pal.label}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            pal.bg
                          } ${pal.border} border ${
                            isSelected ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Icon Selector */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs text-neutral-300 font-medium">
                    Ícone Representativo
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {AVAILABLE_ICONS.map((ic) => {
                      const IconComponent = ic.icon;
                      const isSelected = formData.icon === ic.id;
                      return (
                        <button
                          key={ic.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: ic.id })}
                          className={`p-2 rounded-lg border text-xs flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#c5a47e]/20 border-[#c5a47e] text-[#c5a47e] font-semibold'
                              : 'bg-[#121212] border-[#2a2a2a] text-neutral-400 hover:text-white hover:bg-[#1a1a1a]'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                          <span className="text-[10px] truncate max-w-full">{ic.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#282828]">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3.5 py-1.5 bg-[#222] hover:bg-[#2a2a2a] text-neutral-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingCatId ? 'Guardar Alterações' : 'Criar Categoria'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Categories Grid / List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-400 px-1 font-mono uppercase tracking-wider">
              <span>Categorias Existentes ({filteredCategories.length})</span>
              <span>Artigos Associados</span>
            </div>

            {filteredCategories.length === 0 ? (
              <div className="text-center py-10 bg-[#151515] border border-[#262626] rounded-xl">
                <Layers className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-neutral-400">Nenhuma categoria encontrada</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {searchQuery ? 'Tente outro termo de pesquisa.' : 'Crie a primeira categoria acima.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCategories.map((cat) => {
                  const stats = getCategoryStats(cat.id);
                  const colorObj = COLOR_PALETTE.find((c) => c.id === cat.color) || COLOR_PALETTE[0];

                  return (
                    <div
                      key={cat.id}
                      className="bg-[#161616] hover:bg-[#1a1a1a] border border-[#282828] hover:border-[#383838] rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all group shadow-xs"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${colorObj.bg} ${colorObj.text} ${colorObj.border}`}
                        >
                          {renderIcon(cat.icon, 'w-4 h-4')}
                        </div>

                        <div className="truncate">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-white text-xs truncate">{cat.name}</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${colorObj.bg} ${colorObj.text} ${colorObj.border}`}
                            >
                              {colorObj.label.split(' ')[0]}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 flex items-center space-x-2 mt-0.5 font-mono">
                            <span>{stats.count} artigo(s)</span>
                            <span>•</span>
                            <span className="text-[#c5a47e]">{formatCurrency(stats.value)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        {onSelectCategory && (
                          <button
                            onClick={() => {
                              onSelectCategory(cat.id);
                              onClose();
                            }}
                            className="px-2 py-1 bg-[#222] hover:bg-[#c5a47e]/20 text-[#c5a47e] text-[11px] font-medium rounded-md transition-colors"
                            title="Filtrar por esta categoria"
                          >
                            Filtrar
                          </button>
                        )}

                        {canEdit && (
                          <button
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#252525] rounded-md transition-colors cursor-pointer"
                            title="Editar Categoria"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                            title="Eliminar Categoria"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#262626] bg-[#141414] flex items-center justify-between">
          <div className="text-xs text-neutral-500 flex items-center space-x-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500/80" />
            <span>As categorias estão sincronizadas com o POS, faturas e relatórios.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#222] hover:bg-[#2a2a2a] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
