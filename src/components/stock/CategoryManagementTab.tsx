import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCategory } from '../../types';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
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
  ArrowRight,
  Filter,
  Wand2,
  DownloadCloud,
} from 'lucide-react';
import { formatCurrency } from '../../utils/crypto';
import {
  standardizeCategoryName,
  getCategoryDisplayName,
  RECOMMENDED_PRESETS_BY_INDUSTRY,
} from '../../utils/categoryUtils';

export const COLOR_PALETTE = [
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

export const AVAILABLE_ICONS = [
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

interface CategoryManagementTabProps {
  onFilterByCategory?: (categoryId: string) => void;
}

export const CategoryManagementTab: React.FC<CategoryManagementTabProps> = ({
  onFilterByCategory,
}) => {
  const {
    categories,
    products,
    stock,
    addCategory,
    updateCategory,
    deleteCategory,
    standardizeAllCategories,
    currentUser,
    hasPermission,
    requestConfirm,
    notify,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPresetsDrawer, setShowPresetsDrawer] = useState(false);

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

  const filteredCategories = categories.filter((cat) =>
    (cat.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      message:
        stats.count > 0
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
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Famílias & Categorias de Artigos</h3>
            <p className="text-xs text-neutral-400">
              Classifique o catálogo, agrupe produtos no POS e configure relatórios por setor
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#0a0a0a] border border-[#2e2e2e] rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
            />
          </div>

          <button
            type="button"
            onClick={standardizeAllCategories}
            title="Corrige automaticamente a ortografia, acentos e maiúsculas de todas as categorias e artigos"
            className="px-3 py-1.5 bg-[#1c1c1c] hover:bg-[#252525] text-amber-300 border border-amber-500/30 hover:border-amber-400/50 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Corrigir & Padronizar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPresetsDrawer(!showPresetsDrawer)}
            className="px-3 py-1.5 bg-[#1c1c1c] hover:bg-[#252525] text-neutral-300 border border-[#333] hover:border-neutral-500 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-[#c5a47e]" />
            <span>Pacotes de Setor</span>
          </button>

          <button
            type="button"
            onClick={handleStartCreate}
            className="px-3.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Categoria</span>
          </button>
        </div>
      </div>

      {/* Presets Drawer / Quick Sector Categories */}
      {showPresetsDrawer && (
        <div className="bg-[#161616] border border-[#333] rounded-xl p-4 space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DownloadCloud className="w-4 h-4 text-[#c5a47e]" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Pacotes de Categorias Prontas por Ramo de Negócio
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowPresetsDrawer(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Fechar
            </button>
          </div>
          <p className="text-xs text-neutral-400">
            Adicione facilmente conjuntos de categorias completas com ortografia correta para o seu setor de atividade:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {RECOMMENDED_PRESETS_BY_INDUSTRY.map((preset) => {
              const existingCount = preset.categories.filter((rc) =>
                categories.some((c) => c.name.toLowerCase() === rc.name.toLowerCase())
              ).length;
              const allAdded = existingCount === preset.categories.length;

              return (
                <div
                  key={preset.industry}
                  className="bg-[#101010] border border-[#262626] rounded-lg p-3 flex flex-col justify-between space-y-2"
                >
                  <div>
                    <h5 className="text-xs font-semibold text-white">{preset.industry}</h5>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {preset.categories.map((c) => (
                        <span
                          key={c.name}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={allAdded}
                    onClick={() => {
                      let added = 0;
                      preset.categories.forEach((rc) => {
                        const exists = categories.some(
                          (c) => c.name.toLowerCase() === rc.name.toLowerCase()
                        );
                        if (!exists) {
                          addCategory({
                            name: rc.name,
                            color: rc.color,
                            icon: rc.icon,
                          });
                          added++;
                        }
                      });
                      notify(
                        added > 0
                          ? `Foram adicionadas ${added} categorias de ${preset.industry} com sucesso!`
                          : 'Todas as categorias deste pacote já existem no sistema.',
                        'success'
                      );
                    }}
                    className={`w-full py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer ${
                      allAdded
                        ? 'bg-neutral-800/40 text-neutral-500 cursor-not-allowed'
                        : 'bg-[#c5a47e]/15 hover:bg-[#c5a47e]/25 text-[#c5a47e] border border-[#c5a47e]/30'
                    }`}
                  >
                    {allAdded ? (
                      <span>Todas Adicionadas</span>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Pacote ({preset.categories.length})</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form for Create / Edit */}
      {showCreateForm && (
        <form
          onSubmit={handleSaveCategory}
          className="bg-[#161616] border border-amber-500/30 rounded-xl p-5 space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-200"
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
            <div className="space-y-1.5">
              <label className="block text-xs text-neutral-300 font-medium">
                Nome da Categoria <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Bebidas & Refrigerantes, Laticínios, Ferramentas..."
                value={formData.name}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    setFormData({ ...formData, name: standardizeCategoryName(e.target.value) });
                  }
                }}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#2e2e2e] rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
              />

              {/* Sugestões de nomes comuns com ortografia correta */}
              <div className="pt-1">
                <span className="text-[10px] text-neutral-500">Sugestões rápidas:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {[
                    'Bebidas & Refrigerantes',
                    'Alimentação & Mercearia',
                    'Laticínios & Frios',
                    'Frescos & Hortícolas',
                    'Padaria & Pastelaria',
                    'Higiene & Limpeza',
                    'Informática & Tecnologia',
                    'Vestuário & Calçado',
                    'Ferramentas & Ferragens',
                    'Peças & Componentes',
                    'Serviços & Atendimento',
                    'Artigos Gerais',
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setFormData({ ...formData, name: sug })}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#202020] hover:bg-[#c5a47e]/20 hover:text-[#c5a47e] text-neutral-400 transition-colors border border-neutral-800"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-neutral-300 font-medium">
                Cor de Destaque / Identificação
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

            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs text-neutral-300 font-medium">
                Ícone da Categoria
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
                          : 'bg-[#101010] border-[#262626] text-neutral-400 hover:text-white hover:bg-[#181818]'
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

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#282828]">
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

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => {
          const stats = getCategoryStats(cat.id);
          const colorObj = COLOR_PALETTE.find((c) => c.id === cat.color) || COLOR_PALETTE[0];

          return (
            <div
              key={cat.id}
              className="bg-[#141414] hover:bg-[#181818] border border-[#262626] hover:border-[#383838] rounded-xl p-4 flex flex-col justify-between gap-4 transition-all shadow-xs group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-3 truncate">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${colorObj.bg} ${colorObj.text} ${colorObj.border}`}
                  >
                    {renderIcon(cat.icon, 'w-5 h-5')}
                  </div>

                  <div className="truncate">
                    <h4 className="font-semibold text-white text-sm truncate">{cat.name}</h4>
                    <span
                      className={`inline-block text-[9px] font-mono px-1.5 py-0.2 rounded-md border mt-0.5 ${colorObj.bg} ${colorObj.text} ${colorObj.border}`}
                    >
                      {colorObj.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#222] rounded-md transition-colors cursor-pointer"
                    title="Editar Categoria"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                    title="Eliminar Categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Statistics & Quick Action */}
              <div className="pt-3 border-t border-[#222] flex items-center justify-between">
                <div className="text-xs">
                  <div className="text-neutral-400 font-mono">{stats.count} artigo(s)</div>
                  <div className="text-xs font-semibold text-[#c5a47e] font-mono">
                    {formatCurrency(stats.value)}
                  </div>
                </div>

                {onFilterByCategory && (
                  <button
                    onClick={() => onFilterByCategory(cat.id)}
                    className="px-2.5 py-1 bg-[#1f1f1f] hover:bg-[#c5a47e]/20 text-[#c5a47e] border border-[#2a2a2a] hover:border-[#c5a47e]/40 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <span>Ver Artigos</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-16 bg-[#141414] border border-[#262626] rounded-2xl">
          <Layers className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-neutral-300">Nenhuma categoria encontrada</h4>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `Não foram encontrados resultados para "${searchQuery}".`
              : 'Comece por criar as suas categorias para organizar os produtos.'}
          </p>
          <button
            onClick={handleStartCreate}
            className="mt-4 px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Categoria</span>
          </button>
        </div>
      )}
    </div>
  );
};
