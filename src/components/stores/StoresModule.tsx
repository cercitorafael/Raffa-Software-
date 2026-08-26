import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Store, Terminal } from '../../types';
import { formatCurrency } from '../../utils/crypto';
import {
  Store as StoreIcon,
  Building2,
  Monitor,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Search,
  MapPin,
  Phone,
  Boxes,
  Users,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Sliders,
  Sparkles,
  ArrowRight,
  Receipt,
  RotateCw,
  Eye,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { sound } from '../../utils/audio';

export const StoresModule: React.FC = () => {
  const {
    stores,
    addStore,
    updateStore,
    deleteStore,
    currentStore,
    setCurrentStore,
    terminals,
    addTerminal,
    updateTerminal,
    deleteTerminal,
    currentCompany,
    warehouses,
    users,
    salesHistory,
    requestConfirm,
    notify,
    currentUser,
    hasPermission,
    setActiveNavTab,
  } = useApp();

  const canReadStores = hasPermission('stores', 'read');
  const canCreateStores = hasPermission('stores', 'create');

  if (!canReadStores) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a0a] text-center space-y-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-base font-serif font-bold text-white">
            Acesso Restrito à Gestão de Lojas & Filiais
          </h3>
          <p className="text-xs text-neutral-400">
            O seu perfil atual (<strong>{currentUser.name}</strong> &bull; {currentUser.role.toUpperCase()}) não tem permissão para visualizar ou gerir as filiais e lojas da empresa.
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('todas');
  const [activeTab, setActiveTab] = useState<'stores' | 'terminals' | 'analytics'>('stores');

  // Modal States
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeForm, setStoreForm] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    phone: '',
    managerId: '',
    defaultWarehouseId: '',
    terminalsCount: 1,
  });

  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const [terminalForm, setTerminalForm] = useState({
    storeId: currentStore?.id || stores[0]?.id || '',
    code: '',
    description: '',
    printerModel: 'Bixolon SRP-350III (Térmica 80mm)',
    isActive: true,
  });

  // Cities for filter
  const cities = Array.from(new Set(stores.map((s) => s.city).filter(Boolean)));

  // Filtered Stores
  const filteredStores = stores.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCity = selectedCity === 'todas' || s.city === selectedCity;
    return matchSearch && matchCity;
  });

  // Sales per store calculation
  const getStoreSalesTotal = (storeId: string) => {
    return salesHistory
      .filter((sale) => sale.storeId === storeId)
      .reduce((sum, s) => sum + (s.total || 0), 0);
  };

  // Handle open store modal
  const handleOpenNewStore = () => {
    setEditingStore(null);
    setStoreForm({
      code: `LJ-${String(stores.length + 1).padStart(2, '0')}`,
      name: '',
      address: '',
      city: 'Lisboa',
      phone: '+351 210 000 000',
      managerId: users[0]?.id || '',
      defaultWarehouseId: warehouses[0]?.id || 'arm-01',
      terminalsCount: 1,
    });
    setShowStoreModal(true);
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setStoreForm({
      code: store.code,
      name: store.name,
      address: store.address,
      city: store.city,
      phone: store.phone,
      managerId: store.managerId,
      defaultWarehouseId: store.defaultWarehouseId,
      terminalsCount: store.terminalsCount || 1,
    });
    setShowStoreModal(true);
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.name.trim() || !storeForm.code.trim()) {
      notify('Por favor preencha o Nome e o Código da Loja.', 'warning');
      return;
    }

    if (editingStore) {
      updateStore(editingStore.id, {
        ...storeForm,
      });
      notify(`Loja "${storeForm.name}" atualizada com sucesso.`, 'success');
    } else {
      addStore({
        companyId: currentCompany.id,
        code: storeForm.code.toUpperCase(),
        name: storeForm.name,
        address: storeForm.address,
        city: storeForm.city,
        phone: storeForm.phone,
        managerId: storeForm.managerId || users[0]?.id || 'usr-1',
        defaultWarehouseId: storeForm.defaultWarehouseId || warehouses[0]?.id || 'arm-01',
        terminalsCount: Number(storeForm.terminalsCount) || 1,
      });
      notify(`Nova loja "${storeForm.name}" registada no sistema.`, 'success');
    }
    setShowStoreModal(false);
  };

  // Handle open terminal modal
  const handleOpenNewTerminal = (storeId?: string) => {
    setEditingTerminal(null);
    setTerminalForm({
      storeId: storeId || currentStore?.id || stores[0]?.id || '',
      code: `POS-${String(terminals.length + 1).padStart(2, '0')}`,
      description: 'Caixa de Atendimento Principal',
      printerModel: 'Bixolon SRP-350III (Térmica 80mm)',
      isActive: true,
    });
    setShowTerminalModal(true);
  };

  const handleEditTerminal = (term: Terminal) => {
    setEditingTerminal(term);
    setTerminalForm({
      storeId: term.storeId,
      code: term.code,
      description: term.description,
      printerModel: term.printerModel || 'Bixolon SRP-350III (Térmica 80mm)',
      isActive: term.isActive,
    });
    setShowTerminalModal(true);
  };

  const handleSaveTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalForm.code.trim()) {
      notify('O código do terminal POS é obrigatório.', 'warning');
      return;
    }

    if (editingTerminal) {
      updateTerminal(editingTerminal.id, {
        storeId: terminalForm.storeId,
        code: terminalForm.code,
        description: terminalForm.description,
        printerModel: terminalForm.printerModel,
        isActive: terminalForm.isActive,
      });
      notify(`Terminal "${terminalForm.code}" atualizado.`, 'success');
    } else {
      addTerminal({
        storeId: terminalForm.storeId,
        code: terminalForm.code.toUpperCase(),
        description: terminalForm.description,
        isActive: terminalForm.isActive,
        currentShiftId: null,
        printerModel: terminalForm.printerModel,
      });
      notify(`Novo terminal "${terminalForm.code}" configurado.`, 'success');
    }
    setShowTerminalModal(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-[#e5e5e5] overflow-hidden">
      {/* Module Header */}
      <div className="bg-[#0f0f0f] border-b border-[#262626] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <StoreIcon className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-serif font-bold text-white tracking-wide">
              Gestão de Lojas & Unidades Físicas
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {stores.length} Unidades
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Supervisão de filiais, armazéns associados, postos POS e parâmetros de funcionamento multi-loja
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => handleOpenNewTerminal()}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#171717] hover:bg-[#202020] border border-[#262626] hover:border-neutral-600 rounded-lg text-xs font-semibold text-neutral-200 transition-all cursor-pointer"
          >
            <Monitor className="w-3.5 h-3.5 text-[#c5a47e]" />
            <span>+ Novo Terminal</span>
          </button>

          <button
            onClick={handleOpenNewStore}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-lg text-xs tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Loja</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 pb-2 shrink-0">
        <div className="bg-[#121212] border border-[#262626] rounded-xl p-3.5">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Lojas Registadas</span>
            <StoreIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-white mt-1">{stores.length}</p>
          <span className="text-[10px] text-emerald-400 font-medium">100% Operacionais</span>
        </div>

        <div className="bg-[#121212] border border-[#262626] rounded-xl p-3.5">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Terminais POS Ativos</span>
            <Monitor className="w-4 h-4 text-[#c5a47e]" />
          </div>
          <p className="text-xl font-bold font-mono text-white mt-1">{terminals.length}</p>
          <span className="text-[10px] text-neutral-400 font-mono">
            {terminals.filter((t) => t.isActive).length} Ligados
          </span>
        </div>

        <div className="bg-[#121212] border border-[#262626] rounded-xl p-3.5">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Loja Ativa na Sessão</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-sm font-bold text-sky-300 mt-1 truncate">{currentStore.name}</p>
          <span className="text-[10px] font-mono text-neutral-400">{currentStore.code} &bull; {currentStore.city}</span>
        </div>

        <div className="bg-[#121212] border border-[#262626] rounded-xl p-3.5">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Vendas Consolidadas</span>
            <TrendingUp className="w-4 h-4 text-[#c5a47e]" />
          </div>
          <p className="text-xl font-bold font-mono text-[#c5a47e] mt-1">
            {formatCurrency(salesHistory.reduce((sum, s) => sum + (s.total || 0), 0))}
          </p>
          <span className="text-[10px] text-neutral-400 font-mono">{salesHistory.length} Faturas emitidas</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="px-6 pt-2 pb-0 flex items-center justify-between border-b border-[#222222] shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('stores')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'stores'
                ? 'border-[#c5a47e] text-[#c5a47e] bg-[#c5a47e]/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <StoreIcon className="w-3.5 h-3.5" />
            <span>Lojas & Filiais ({stores.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('terminals')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'terminals'
                ? 'border-[#c5a47e] text-[#c5a47e] bg-[#c5a47e]/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Terminais de Caixa ({terminals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'analytics'
                ? 'border-[#c5a47e] text-[#c5a47e] bg-[#c5a47e]/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Performance por Loja</span>
          </button>
        </div>

        {/* Quick Search inside Store module */}
        <div className="flex items-center space-x-2 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar loja ou morada..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#141414] border border-[#262626] rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e] w-48 sm:w-64"
            />
          </div>

          {cities.length > 1 && (
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-2.5 py-1.5 bg-[#141414] border border-[#262626] rounded-lg text-xs text-neutral-300 focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
            >
              <option value="todas">Todas as Cidades</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ================= TAB 1: STORES LIST & CARDS ================= */}
        {activeTab === 'stores' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStores.map((store) => {
              const isCurrent = currentStore.id === store.id;
              const storeTerminals = terminals.filter((t) => t.storeId === store.id);
              const storeSales = getStoreSalesTotal(store.id);
              const manager = users.find((u) => u.id === store.managerId);
              const warehouse = warehouses.find((w) => w.id === store.defaultWarehouseId);

              return (
                <div
                  key={store.id}
                  className={`bg-[#121212] rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-md ${
                    isCurrent
                      ? 'border-[#c5a47e] ring-1 ring-[#c5a47e]/30 shadow-lg'
                      : 'border-[#242424] hover:border-neutral-600 hover:bg-[#151515]'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-[#222222] bg-[#0e0e0e]/80">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                            isCurrent
                              ? 'bg-[#c5a47e] text-neutral-950 shadow-sm'
                              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          <StoreIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-serif font-bold text-white leading-tight">
                              {store.name}
                            </h3>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded-xs font-mono text-[9px] font-bold bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/40">
                                EM USO
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-neutral-400">
                            Código: <strong className="text-neutral-200">{store.code}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEditStore(store)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-cyan-400 hover:bg-cyan-950/20 transition-colors cursor-pointer"
                          title="Editar Loja"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (stores.length <= 1) {
                              notify('Não é possível eliminar a única loja registada.', 'warning');
                              return;
                            }
                            requestConfirm({
                              title: 'Eliminar Loja',
                              message: `Tem a certeza que deseja eliminar a loja "${store.name}" (${store.code})?`,
                              itemDetails: `Morada: ${store.address}, ${store.city} | Terminais: ${storeTerminals.length}`,
                              confirmLabel: 'Eliminar Loja',
                              isDestructive: true,
                              onConfirm: () => {
                                deleteStore(store.id);
                              },
                            });
                          }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                          title="Eliminar Loja"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body Information */}
                  <div className="p-5 space-y-3.5 text-xs flex-1">
                    <div className="space-y-1.5 text-neutral-300">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">
                          {store.address}, {store.city}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="font-mono text-neutral-300">{store.phone}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Boxes className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Armazém: {warehouse?.name || store.defaultWarehouseId}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Users className="w-3.5 h-3.5 text-[#c5a47e] shrink-0" />
                        <span>Gestor: {manager?.name || 'Administração'}</span>
                      </div>
                    </div>

                    {/* Terminals & Sales stats box */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#222222] font-mono text-[11px]">
                      <div className="bg-[#0b0b0b] p-2 rounded-lg border border-[#202020]">
                        <span className="text-[10px] text-neutral-400 block font-sans">Terminais POS</span>
                        <span className="font-bold text-white">{storeTerminals.length} Postos</span>
                      </div>

                      <div className="bg-[#0b0b0b] p-2 rounded-lg border border-[#202020]">
                        <span className="text-[10px] text-neutral-400 block font-sans">Faturação</span>
                        <span className="font-bold text-[#c5a47e]">{formatCurrency(storeSales)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Set Active */}
                  <div className="p-3 bg-[#0d0d0d] border-t border-[#222222] flex items-center justify-between">
                    {isCurrent ? (
                      <div className="w-full py-1.5 text-center text-xs font-bold text-emerald-400 flex items-center justify-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Loja Ativa de Trabalho</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setCurrentStore(store);
                          sound.playSuccessChime();
                          notify(`Mudança de posto: a trabalhar agora na loja "${store.name}".`, 'info');
                        }}
                        className="w-full py-2 bg-[#171717] hover:bg-[#c5a47e] text-neutral-200 hover:text-neutral-950 border border-[#262626] hover:border-[#c5a47e] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Ativar como Loja de Trabalho</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= TAB 2: TERMINALS ================= */}
        {activeTab === 'terminals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Lista de Terminais POS & Caixas Fiscais
              </h3>
              <button
                onClick={() => handleOpenNewTerminal()}
                className="px-3 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-lg text-xs cursor-pointer"
              >
                + Adicionar Terminal
              </button>
            </div>

            <div className="bg-[#121212] border border-[#262626] rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#262626] bg-[#0c0c0c] text-neutral-400">
                    <th className="p-3.5 font-semibold">Código</th>
                    <th className="p-3.5 font-semibold">Descrição / Posto</th>
                    <th className="p-3.5 font-semibold">Loja Vinculada</th>
                    <th className="p-3.5 font-semibold">Impressora Térmica</th>
                    <th className="p-3.5 font-semibold text-center">Estado</th>
                    <th className="p-3.5 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f]">
                  {terminals.map((term) => {
                    const store = stores.find((s) => s.id === term.storeId);
                    return (
                      <tr key={term.id} className="hover:bg-[#171717] transition-colors">
                        <td className="p-3.5 font-mono font-bold text-[#c5a47e]">{term.code}</td>
                        <td className="p-3.5 font-medium text-white">{term.description}</td>
                        <td className="p-3.5 text-neutral-300">
                          {store?.name || term.storeId} ({store?.city || 'Local'})
                        </td>
                        <td className="p-3.5 text-neutral-400 font-mono text-[11px]">
                          {term.printerModel || 'Bixolon SRP-350III'}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              term.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${term.isActive ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
                            <span>{term.isActive ? 'Ativo' : 'Desativado'}</span>
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleEditTerminal(term)}
                              className="p-1.5 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                              title="Editar Terminal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (terminals.length <= 1) {
                                  notify('É necessário manter pelo menos um terminal registado.', 'warning');
                                  return;
                                }
                                requestConfirm({
                                  title: 'Eliminar Terminal POS',
                                  message: `Tem a certeza que deseja eliminar o terminal "${term.code}" (${term.description})?`,
                                  confirmLabel: 'Eliminar Terminal',
                                  isDestructive: true,
                                  onConfirm: () => {
                                    deleteTerminal(term.id);
                                  },
                                });
                              }}
                              className="p-1.5 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                              title="Eliminar Terminal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* ================= TAB 3: PERFORMANCE ANALYTICS ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {stores.map((store) => {
                const storeSales = salesHistory.filter((s) => s.storeId === store.id);
                const totalAmount = storeSales.reduce((acc, s) => acc + (s.total || 0), 0);
                const avgTicket = storeSales.length > 0 ? totalAmount / storeSales.length : 0;

                return (
                  <div key={store.id} className="bg-[#121212] border border-[#262626] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                      <div>
                        <h4 className="font-serif font-bold text-base text-white">{store.name}</h4>
                        <span className="text-[11px] text-neutral-400 font-mono">{store.code} &bull; {store.city}</span>
                      </div>
                      <span className="p-2 rounded-xl bg-[#c5a47e]/10 text-[#c5a47e] font-bold">
                        <TrendingUp className="w-4 h-4" />
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Total Faturado:</span>
                        <span className="font-mono font-bold text-[#c5a47e] text-sm">
                          {formatCurrency(totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Total Transações:</span>
                        <span className="font-mono font-semibold text-white">{storeSales.length}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Ticket Médio:</span>
                        <span className="font-mono text-neutral-200">{formatCurrency(avgTicket)}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#222222]">
                      <div className="text-[10px] text-neutral-400 uppercase font-semibold mb-1">
                        Terminais Registados nesta Loja
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {terminals
                          .filter((t) => t.storeId === store.id)
                          .map((t) => (
                            <span
                              key={t.id}
                              className="px-2 py-0.5 rounded-md bg-[#181818] border border-[#2a2a2a] text-[10px] font-mono text-neutral-300"
                            >
                              {t.code}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: CREATE / EDIT STORE ================= */}
      {showStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-lg shadow-2xl p-6 text-[#e5e5e5] space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2.5">
                <StoreIcon className="w-5 h-5 text-[#c5a47e]" />
                <h3 className="text-sm font-serif font-bold text-neutral-100">
                  {editingStore ? 'Editar Dados da Loja' : 'Registar Nova Loja / Filial'}
                </h3>
              </div>
              <button
                onClick={() => setShowStoreModal(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStore} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1 font-semibold">Código da Loja *</label>
                  <input
                    type="text"
                    required
                    value={storeForm.code}
                    onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value.toUpperCase() })}
                    placeholder="ex: LJ-01"
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 font-mono focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1 font-semibold">Nome Comercial *</label>
                  <input
                    type="text"
                    required
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                    placeholder="ex: Loja Chiado Flagship"
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 font-semibold">Morada Completa</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  placeholder="ex: Rua Garrett, nº 42"
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1 font-semibold">Cidade / Distrito</label>
                  <input
                    type="text"
                    value={storeForm.city}
                    onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                    placeholder="ex: Lisboa"
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1 font-semibold">Telefone de Contacto</label>
                  <input
                    type="text"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    placeholder="ex: +351 210 000 000"
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 font-mono focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1 font-semibold">Armazém Padrão</label>
                  <select
                    value={storeForm.defaultWarehouseId}
                    onChange={(e) => setStoreForm({ ...storeForm, defaultWarehouseId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1 font-semibold">Gestor Responsável</label>
                  <select
                    value={storeForm.managerId}
                    onChange={(e) => setStoreForm({ ...storeForm, managerId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowStoreModal(false)}
                  className="px-4 py-2 bg-[#171717] hover:bg-[#202020] text-neutral-300 font-medium rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  {editingStore ? 'Gravar Alterações' : 'Criar Loja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE / EDIT TERMINAL ================= */}
      {showTerminalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md shadow-2xl p-6 text-[#e5e5e5] space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2.5">
                <Monitor className="w-5 h-5 text-[#c5a47e]" />
                <h3 className="text-sm font-serif font-bold text-neutral-100">
                  {editingTerminal ? 'Editar Terminal POS' : 'Configurar Novo Terminal POS'}
                </h3>
              </div>
              <button
                onClick={() => setShowTerminalModal(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTerminal} className="space-y-3.5 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1 font-semibold">Loja Vinculada *</label>
                <select
                  value={terminalForm.storeId}
                  onChange={(e) => setTerminalForm({ ...terminalForm, storeId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 font-semibold">Código do Terminal *</label>
                <input
                  type="text"
                  required
                  value={terminalForm.code}
                  onChange={(e) => setTerminalForm({ ...terminalForm, code: e.target.value.toUpperCase() })}
                  placeholder="ex: POS-01"
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 font-mono focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 font-semibold">Descrição / Localização</label>
                <input
                  type="text"
                  value={terminalForm.description}
                  onChange={(e) => setTerminalForm({ ...terminalForm, description: e.target.value })}
                  placeholder="ex: Caixa 1 - Balcão Principal"
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 font-semibold">Impressora de Talões Associada</label>
                <input
                  type="text"
                  value={terminalForm.printerModel}
                  onChange={(e) => setTerminalForm({ ...terminalForm, printerModel: e.target.value })}
                  placeholder="ex: Bixolon SRP-350III (80mm)"
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 font-mono focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="termActive"
                  checked={terminalForm.isActive}
                  onChange={(e) => setTerminalForm({ ...terminalForm, isActive: e.target.checked })}
                  className="rounded-xs bg-[#0a0a0a] border-[#262626] text-[#c5a47e] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="termActive" className="text-neutral-300 cursor-pointer">
                  Terminal ativo para abertura de turnos e emissão
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowTerminalModal(false)}
                  className="px-4 py-2 bg-[#171717] hover:bg-[#202020] text-neutral-300 font-medium rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  {editingTerminal ? 'Gravar Alterações' : 'Configurar Terminal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
