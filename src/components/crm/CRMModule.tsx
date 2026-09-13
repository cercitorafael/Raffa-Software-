import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/crypto';
import {
  HeartHandshake,
  Gift,
  Award,
  Users,
  Plus,
  Search,
  Sparkles,
  Ticket,
  Mail,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneOff,
  Edit2,
  Trash2,
  X,
  Check,
  Building,
  UserCheck,
  Trophy,
  ShoppingBag,
  Clock,
  ExternalLink,
  MessageSquare,
  Receipt,
  FileSpreadsheet,
  ShieldAlert,
  MapPin,
  Navigation,
  Compass,
  Loader2,
} from 'lucide-react';
import { Customer, CallLog } from '../../types';
import { CustomerCallModal } from './CustomerCallModal';
import { CustomerPurchaseHistoryModal } from './CustomerPurchaseHistoryModal';
import { TopBuyersReport } from './TopBuyersReport';

export const CRMModule: React.FC = () => {
  const {
    currentUser,
    hasPermission,
    setActiveNavTab,
    customers,
    currentCompany,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    salesHistory,
    addLoyaltyPoints,
    callLogs,
    deleteCallLog,
    notify,
  } = useApp();

  const canRead = hasPermission('crm', 'read') || currentUser?.role === 'admin';

  if (!canRead) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a0a] text-center space-y-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-base font-serif font-bold text-white">
            Acesso Restrito ao Módulo de CRM
          </h3>
          <p className="text-xs text-neutral-400">
            O seu perfil atual (<strong>{currentUser?.name}</strong> &bull; {currentUser?.role?.toUpperCase()}) não tem permissão para aceder à gestão de clientes e CRM.
          </p>
        </div>
        <div className="pt-2 flex items-center space-x-3">
          <button
            onClick={() => setActiveNavTab('pos')}
            className="px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-xl cursor-pointer shadow-md transition-colors"
          >
            Ir para o Ponto de Venda (POS)
          </button>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<
    'customers' | 'top_buyers' | 'calls' | 'loyalty' | 'giftcards' | 'campaigns'
  >('customers');

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Call Modal State
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callingCustomer, setCallingCustomer] = useState<Customer | null>(null);
  const [customCallNumber, setCustomCallNumber] = useState<string>('');

  // Purchase History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<Customer | null>(null);

  // Calls Log Search & Filter
  const [callsSearch, setCallsSearch] = useState('');
  const [callsOutcomeFilter, setCallsOutcomeFilter] = useState<string>('all');

  // Quick Dialer popup state
  const [showQuickDialPad, setShowQuickDialPad] = useState(false);
  const [quickDialNumber, setQuickDialNumber] = useState('');

  // New Customer Form
  const [name, setName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Edit Customer Form State
  const [editName, setEditName] = useState('');
  const [editTaxNumber, setEditTaxNumber] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editTier, setEditTier] = useState<'bronze' | 'prata' | 'ouro' | 'platina'>('bronze');
  const [editNotes, setEditNotes] = useState('');

  // Gift card state simulation
  const [giftCards, setGiftCards] = useState([
    { code: 'GIFT-2026-9812', initialBalance: 50.0, currentBalance: 35.50, issuedTo: 'Ana Ribeiro', expiresAt: '2026-12-31' },
    { code: 'GIFT-2026-4411', initialBalance: 100.0, currentBalance: 100.00, issuedTo: 'Manuel Santos', expiresAt: '2026-12-31' },
    { code: 'GIFT-2026-1188', initialBalance: 25.0, currentBalance: 0.00, issuedTo: 'Carla Dias', expiresAt: '2026-10-15' },
  ]);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.taxNumber || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.address || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q) ||
      (c.location || '').toLowerCase().includes(q)
    );
  });

  const filteredCallLogs = (callLogs || []).filter((call) => {
    const q = callsSearch.toLowerCase();
    const matchesQuery =
      (call.customerName || '').toLowerCase().includes(q) ||
      (call.customerPhone || '').includes(q) ||
      (call.notes || '').toLowerCase().includes(q) ||
      (call.operatorName || '').toLowerCase().includes(q);

    const matchesOutcome =
      callsOutcomeFilter === 'all' || call.outcome === callsOutcomeFilter;

    return matchesQuery && matchesOutcome;
  });

  const handleGetGPSLocation = (target: 'new' | 'edit') => {
    if (!navigator.geolocation) {
      notify('Geolocalização não suportada pelo navegador.', 'error');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        const gpsTag = `GPS: ${lat}, ${lng}`;
        if (target === 'new') {
          setLocation((prev) => (prev ? `${prev} (${gpsTag})` : gpsTag));
        } else {
          setEditLocation((prev) => (prev ? `${prev} (${gpsTag})` : gpsTag));
        }
        notify('Coordenadas GPS de localização capturadas com sucesso!', 'success');
      },
      (err) => {
        setIsLocating(false);
        notify(`Não foi possível obter a localização: ${err.message}`, 'error');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditName(cust.name || '');
    setEditTaxNumber(cust.taxNumber || '');
    setEditEmail(cust.email || '');
    setEditPhone(cust.phone || '');
    setEditAddress(cust.address || '');
    setEditCity(cust.city || '');
    setEditLocation(cust.location || '');
    setEditPostalCode(cust.postalCode || '');
    setEditTier(((cust.loyaltyTier || 'bronze').toLowerCase()) as any);
    setEditNotes(cust.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editName.trim()) return;

    updateCustomer(editingCustomer.id, {
      name: editName.trim(),
      taxNumber: editTaxNumber.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim(),
      city: editCity.trim(),
      location: editLocation.trim(),
      postalCode: editPostalCode.trim(),
      loyaltyTier: editTier,
      notes: editNotes.trim(),
    });

    notify(`Cliente "${editName}" atualizado com sucesso!`, 'success');
    setEditingCustomer(null);
  };

  const handleDelete = (cust: Customer) => {
    if (confirm(`Tem a certeza que deseja eliminar o cliente "${cust.name}"?`)) {
      deleteCustomer(cust.id);
      notify(`Cliente "${cust.name}" eliminado.`, 'info');
    }
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addCustomer({
      companyId: currentCompany.id,
      name: name.trim(),
      taxNumber: taxNumber.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      location: location.trim(),
      country: '',
      postalCode: postalCode.trim(),
      loyaltyPoints: 0,
      loyaltyTier: 'bronze',
      notes: notes.trim(),
    });

    notify(`Cliente "${name}" registado com sucesso!`, 'success');
    setShowNewCustModal(false);
    setName('');
    setTaxNumber('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setLocation('');
    setPostalCode('');
    setNotes('');
  };

  // Launch Softphone / VoIP Call
  const handleInitiateCall = (customer: Customer) => {
    setCallingCustomer(customer);
    setCustomCallNumber(customer.phone || '');
    setIsCallModalOpen(true);
  };

  const handleDialCustomNumber = (phoneToDial: string) => {
    const matchedCustomer = customers.find(
      (c) => c.phone && c.phone.replace(/\s+/g, '') === phoneToDial.replace(/\s+/g, '')
    );
    setCallingCustomer(matchedCustomer || null);
    setCustomCallNumber(phoneToDial);
    setShowQuickDialPad(false);
    setIsCallModalOpen(true);
  };

  // View Customer Purchase and Invoices History
  const handleViewPurchaseHistory = (customer: Customer) => {
    setSelectedHistoryCustomer(customer);
    setIsHistoryModalOpen(true);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s (Não atendida)';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins > 0 ? `${mins}m ` : ''}${secs}s`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Top Banner KPI Cards */}
      <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#c5a47e]/15 text-[#c5a47e] border border-[#c5a47e]/30 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Base de Clientes</span>
            <p className="text-xl font-serif font-bold text-[#e5e5e5]">{customers.length} registados</p>
          </div>
        </div>

        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Top Comprador</span>
            <p className="text-sm font-serif font-bold text-amber-400 truncate max-w-[140px]">
              {[...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))[0]?.name || 'N/D'}
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Chamadas Realizadas</span>
            <p className="text-xl font-serif font-bold text-emerald-400">
              {(callLogs || []).length} no CRM
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Pontos em Circulação</span>
            <p className="text-xl font-serif font-bold text-[#c5a47e]">
              {(customers || []).reduce((s, c) => s + (c.loyaltyPoints || 0), 0)} pts
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs and Header Actions */}
      <div className="px-4 bg-[#0d0d0d] border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex space-x-1 overflow-x-auto">
          {[
            { id: 'customers', label: 'Diretório de Clientes', icon: Users },
            { id: 'top_buyers', label: 'Relatórios & Top Compradores', icon: Trophy, badge: 'Novo' },
            { id: 'calls', label: 'Registo de Chamadas', icon: PhoneCall, count: (callLogs || []).length },
            { id: 'loyalty', label: 'Programa de Fidelização', icon: Award },
            { id: 'giftcards', label: 'Cartões Presente / Vouchers', icon: Gift },
            { id: 'campaigns', label: 'Campanhas & Descontos', icon: Ticket },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`crm-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'border-[#c5a47e] text-[#c5a47e]'
                    : 'border-transparent text-neutral-400 hover:text-[#e5e5e5]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                    {tab.badge}
                  </span>
                )}
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Teclado Telefónico & Registar Cliente */}
        <div className="flex items-center gap-2 py-2 sm:py-0">
          {/* Quick Call / Dialer Trigger */}
          <div className="relative">
            <button
              id="open-crm-dialer-btn"
              onClick={() => setShowQuickDialPad(!showQuickDialPad)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
              title="Abrir teclado e efetuar chamada telefónica"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Fazer Chamada</span>
            </button>

            {/* Quick dial popover */}
            {showQuickDialPad && (
              <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Central Telefónica CRM
                  </h4>
                  <button
                    onClick={() => setShowQuickDialPad(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-medium">Número ou Contacto a Ligar:</label>
                  <input
                    type="tel"
                    placeholder="+351 912 345 678"
                    value={quickDialNumber}
                    onChange={(e) => setQuickDialNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                    Ou escolher cliente rápido:
                  </span>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                    {customers.slice(0, 4).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          handleInitiateCall(c);
                          setShowQuickDialPad(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-300 hover:text-white flex items-center justify-between"
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="font-mono text-[11px] text-emerald-400 shrink-0">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (quickDialNumber.trim()) {
                      handleDialCustomNumber(quickDialNumber.trim());
                    }
                  }}
                  disabled={!quickDialNumber.trim()}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Discar & Iniciar Chamada</span>
                </button>
              </div>
            )}
          </div>

          <button
            id="register-new-customer-btn"
            onClick={() => setShowNewCustModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#c5a47e] hover:bg-[#d4b896] text-black rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registar Cliente</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* 1. TOP BUYERS & PURCHASING REPORTS TAB */}
        {activeTab === 'top_buyers' && (
          <TopBuyersReport
            onSelectCustomer={(c) => {
              handleOpenEdit(c);
            }}
            onInitiateCall={(c) => {
              handleInitiateCall(c);
            }}
            onViewHistory={(c) => {
              handleViewPurchaseHistory(c);
            }}
          />
        )}

        {/* 2. CALL LOGS & CRM HISTORY TAB */}
        {activeTab === 'calls' && (
          <div className="space-y-4">
            {/* Header / Search Controls */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar chamadas por cliente, telefone ou notas..."
                  value={callsSearch}
                  onChange={(e) => setCallsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-xs text-[#e5e5e5] placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <select
                  value={callsOutcomeFilter}
                  onChange={(e) => setCallsOutcomeFilter(e.target.value)}
                  className="bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-[#c5a47e]"
                >
                  <option value="all">Todos os Resultados</option>
                  <option value="venda_realizada">Venda Concretizada</option>
                  <option value="contacto_positivo">Contacto Positivo</option>
                  <option value="agendamento">Agendamento</option>
                  <option value="informacao">Informação</option>
                  <option value="nao_atendeu">Não Atendeu</option>
                  <option value="reclamacao">Reclamação</option>
                </select>

                <button
                  onClick={() => setShowQuickDialPad(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Nova Chamada</span>
                </button>
              </div>
            </div>

            {/* Calls Table */}
            <div className="bg-[#141414] rounded-xl border border-[#262626] shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0d0d0d] border-b border-[#262626] text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Cliente / Contacto</th>
                    <th className="p-3">Duração</th>
                    <th className="p-3">Resultado / Desfecho</th>
                    <th className="p-3">Notas & Apontamentos</th>
                    <th className="p-3">Operador</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626] font-medium">
                  {filteredCallLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-neutral-500">
                        Nenhum registo de chamada encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredCallLogs.map((call) => {
                      const matchedCustomer = customers.find(
                        (c) => c.id === call.customerId || (c.phone && c.phone === call.customerPhone)
                      );

                      return (
                        <tr key={call.id} className="hover:bg-[#1a1a1a]/60">
                          <td className="p-3 font-mono text-neutral-400">
                            {formatDate(call.timestamp)}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-white">{call.customerName}</div>
                            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{call.customerPhone}</span>
                              {call.customerPhone && (
                                <a
                                  href={`tel:${call.customerPhone.replace(/\s+/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-neutral-500 hover:text-emerald-400"
                                  title="Ligar direto via dispositivo"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-neutral-300">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-neutral-500" />
                              {formatDuration(call.durationSeconds)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                call.outcome === 'venda_realizada'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : call.outcome === 'contacto_positivo'
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                  : call.outcome === 'agendamento'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : call.outcome === 'reclamacao'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'
                              }`}
                            >
                              {call.outcome === 'venda_realizada' && 'Venda Concretizada'}
                              {call.outcome === 'contacto_positivo' && 'Contacto Positivo'}
                              {call.outcome === 'agendamento' && 'Agendamento'}
                              {call.outcome === 'informacao' && 'Informação'}
                              {call.outcome === 'nao_atendeu' && 'Não Atendeu'}
                              {call.outcome === 'reclamacao' && 'Reclamação'}
                              {call.outcome === 'ocupado' && 'Ocupado'}
                            </span>
                          </td>
                          <td className="p-3 text-neutral-300 max-w-xs">
                            <p className="line-clamp-2 text-xs">{call.notes || 'Sem observações registadas.'}</p>
                          </td>
                          <td className="p-3 text-neutral-400 text-xs">
                            {call.operatorName || 'Operador'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => {
                                  if (matchedCustomer) {
                                    handleInitiateCall(matchedCustomer);
                                  } else {
                                    handleDialCustomNumber(call.customerPhone);
                                  }
                                }}
                                className="p-1.5 bg-[#1f1f1f] hover:bg-emerald-600 hover:text-white text-emerald-400 border border-[#333333] rounded-md transition-all cursor-pointer shadow-xs"
                                title="Voltar a Ligar"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Deseja eliminar este registo de chamada?')) {
                                    deleteCallLog(call.id);
                                    notify('Registo de chamada eliminado.', 'info');
                                  }
                                }}
                                className="p-1.5 bg-[#1f1f1f] hover:bg-rose-500 hover:text-white text-neutral-500 border border-[#333333] rounded-md transition-all cursor-pointer shadow-xs"
                                title="Eliminar Registo"
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

        {/* 3. CUSTOMERS DIRECTORY TAB */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar por cliente, NIF ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-xs text-[#e5e5e5] placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
              />
            </div>

            <div className="bg-[#141414] rounded-xl border border-[#262626] shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0d0d0d] border-b border-[#262626] text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Nome do Cliente</th>
                    <th className="p-3">NIF Fiscal</th>
                    <th className="p-3">Contactos & Telefone</th>
                    <th className="p-3">Localização & Morada</th>
                    <th className="p-3 text-center">Nível Fidelidade</th>
                    <th className="p-3 text-right">Pontos</th>
                    <th className="p-3 text-right">Total Acumulado</th>
                    <th className="p-3 text-center">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626] font-medium">
                  {filteredCustomers.map((cust) => {
                    const tier = (cust.loyaltyTier || 'bronze').toLowerCase();
                    return (
                      <tr key={cust.id} className="hover:bg-[#1a1a1a]/60 group">
                        <td className="p-3 font-bold text-[#e5e5e5]">
                          <div className="flex items-center space-x-2">
                            <span>{cust.name}</span>
                            {cust.name.toLowerCase().includes('consumidor') && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-[#c5a47e]/15 text-[#c5a47e] border border-[#c5a47e]/30 rounded-xs font-mono uppercase">
                                Padrão
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[#c5a47e]">{cust.taxNumber || ''}</td>
                        
                        {/* Contacts Column with direct Click-to-Call */}
                        <td className="p-3 text-neutral-400">
                          {cust.email ? <div className="text-xs text-neutral-300">{cust.email}</div> : null}
                          {cust.phone ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <button
                                onClick={() => handleInitiateCall(cust)}
                                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-mono transition-colors"
                                title="Efetuar chamada via Central Telefónica do CRM"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{cust.phone}</span>
                              </button>
                              <a
                                href={`tel:${cust.phone.replace(/\s+/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-neutral-500 hover:text-emerald-400 transition-colors"
                                title="Ligar direto no telemóvel / dispositivo"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ) : null}
                        </td>

                        <td className="p-3 text-neutral-300">
                          {(cust.address || cust.location || cust.city) ? (
                            <div className="flex items-start space-x-1.5 max-w-xs">
                              <MapPin className="w-3.5 h-3.5 text-[#c5a47e] shrink-0 mt-0.5" />
                              <div className="text-xs leading-tight min-w-0">
                                {cust.address ? (
                                  <span className="text-neutral-200 font-medium block truncate" title={cust.address}>
                                    {cust.address}
                                  </span>
                                ) : null}
                                {[cust.location, cust.city].filter(Boolean).length > 0 ? (
                                  <div className="flex items-center space-x-1 text-[11px] text-neutral-400 truncate">
                                    <span>{[cust.location, cust.city].filter(Boolean).join(' • ')}</span>
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                        [cust.address, cust.location, cust.city, cust.country].filter(Boolean).join(', ')
                                      )}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[#c5a47e] hover:text-[#d4b896] inline-flex items-center ml-1"
                                      title="Abrir Morada e Localização no Google Maps"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              tier === 'ouro'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : tier === 'prata'
                                ? 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30'
                                : tier === 'platina'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                            }`}
                          >
                            {tier.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-[#c5a47e]">
                          {cust.loyaltyPoints || 0} pts
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {formatCurrency(cust.totalSpent || 0)}
                        </td>

                        {/* Action buttons including Call and Purchase History */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Make Phone Call */}
                            <button
                              id={`call-cust-row-${cust.id}`}
                              onClick={() => handleInitiateCall(cust)}
                              className="p-1.5 bg-[#1f1f1f] hover:bg-emerald-600 hover:text-white text-emerald-400 border border-[#333333] rounded-md transition-all cursor-pointer shadow-xs"
                              title="Efetuar Chamada Telefónica"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </button>

                            {/* View Purchase History & Invoices */}
                            <button
                              id={`history-cust-row-${cust.id}`}
                              onClick={() => handleViewPurchaseHistory(cust)}
                              className="p-1.5 bg-[#1f1f1f] hover:bg-indigo-600 hover:text-white text-indigo-400 border border-[#333333] rounded-md transition-all cursor-pointer shadow-xs"
                              title="Ver Histórico de Compras e Faturas"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Customer */}
                            <button
                              onClick={() => handleOpenEdit(cust)}
                              className="p-1.5 bg-[#1f1f1f] hover:bg-[#c5a47e] hover:text-black text-[#c5a47e] border border-[#333333] rounded-md transition-all cursor-pointer shadow-xs"
                              title="Editar Dados do Cliente"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Customer */}
                            <button
                              onClick={() => handleDelete(cust)}
                              className="p-1.5 bg-[#1f1f1f] hover:bg-rose-500 hover:text-white text-neutral-400 border border-[#333333] rounded-md transition-all cursor-pointer shadow-xs"
                              title="Eliminar Cliente"
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

        {/* 4. LOYALTY PROGRAM RULES TAB */}
        {activeTab === 'loyalty' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#141414] p-5 rounded-xl border border-amber-500/30 shadow-sm space-y-3">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h4 className="font-serif font-bold text-amber-300 text-sm">Escalão Ouro (VIP)</h4>
              </div>
              <p className="text-xs text-neutral-400">Para clientes com mais de 500 pontos acumulados.</p>
              <ul className="text-xs text-neutral-300 space-y-1.5 list-disc pl-4">
                <li>10% Desconto imediato em todas as compras</li>
                <li>Acumulação a dobrar (2 pontos por cada {formatCurrency(1, currentCompany?.currency)})</li>
                <li>Oferta exclusiva no dia de aniversário</li>
              </ul>
            </div>

            <div className="bg-[#141414] p-5 rounded-xl border border-[#262626] shadow-sm space-y-3">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-neutral-400" />
                <h4 className="font-serif font-bold text-neutral-200 text-sm">Escalão Prata</h4>
              </div>
              <p className="text-xs text-neutral-400">Para clientes com 200 a 499 pontos.</p>
              <ul className="text-xs text-neutral-300 space-y-1.5 list-disc pl-4">
                <li>5% Desconto em artigos selecionados</li>
                <li>1.5 pontos por cada {formatCurrency(1, currentCompany?.currency)} gasto</li>
                <li>Acesso antecipado a campanhas de saldos</li>
              </ul>
            </div>

            <div className="bg-[#141414] p-5 rounded-xl border border-orange-500/30 shadow-sm space-y-3">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-orange-400" />
                <h4 className="font-serif font-bold text-orange-300 text-sm">Escalão Bronze (Início)</h4>
              </div>
              <p className="text-xs text-neutral-400">Todos os clientes registados com NIF.</p>
              <ul className="text-xs text-neutral-300 space-y-1.5 list-disc pl-4">
                <li>1 ponto por cada {formatCurrency(1, currentCompany?.currency)} gasto</li>
                <li>Vales de desconto de {formatCurrency(5, currentCompany?.currency)} a cada 100 pontos</li>
              </ul>
            </div>
          </div>
        )}

        {/* 5. GIFT CARDS TAB */}
        {activeTab === 'giftcards' && (
          <div className="bg-[#141414] rounded-xl border border-[#262626] shadow-sm overflow-hidden">
            <div className="p-3.5 border-b border-[#262626] bg-[#0d0d0d] flex justify-between items-center">
              <h4 className="text-xs font-serif font-bold text-[#c5a47e]">Cartões Presente / Gift Cards Emitidos</h4>
              <button
                onClick={() => {
                  const newCode = `GIFT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
                  setGiftCards([...giftCards, { code: newCode, initialBalance: 50.0, currentBalance: 50.0, issuedTo: 'Novo Cliente', expiresAt: '2026-12-31' }]);
                  notify(`Cartão Presente ${newCode} emitido com ${formatCurrency(50, currentCompany?.currency)} de saldo!`, 'success');
                }}
                className="px-3 py-1.5 bg-[#c5a47e] hover:bg-[#d4b896] text-black rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
              >
                + Emitir Cartão Oferta
              </button>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d0d0d] border-b border-[#262626] text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Código do Cartão</th>
                  <th className="p-3">Titular</th>
                  <th className="p-3 text-right">Saldo Inicial</th>
                  <th className="p-3 text-right">Saldo Disponível</th>
                  <th className="p-3">Validade</th>
                  <th className="p-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] font-medium">
                {giftCards.map((gc) => (
                  <tr key={gc.code} className="hover:bg-[#1a1a1a]/60">
                    <td className="p-3 font-mono font-bold text-[#c5a47e]">{gc.code}</td>
                    <td className="p-3 font-bold text-[#e5e5e5]">{gc.issuedTo}</td>
                    <td className="p-3 text-right font-mono text-neutral-400">{formatCurrency(gc.initialBalance)}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400 text-sm">
                      {formatCurrency(gc.currentBalance)}
                    </td>
                    <td className="p-3 text-neutral-400">{gc.expiresAt}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          gc.currentBalance > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'
                        }`}
                      >
                        {gc.currentBalance > 0 ? 'Ativo com Saldo' : 'Esgotado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. CAMPAIGNS TAB */}
        {activeTab === 'campaigns' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#141414] p-5 rounded-xl border border-[#262626] shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                    Campanha Ativa
                  </span>
                  <h4 className="font-serif font-bold text-[#e5e5e5] text-sm mt-1">Verão em Grande - Bebidas Premium</h4>
                </div>
                <Ticket className="w-5 h-5 text-[#c5a47e]" />
              </div>
              <p className="text-xs text-neutral-400">15% de desconto direto em toda a categoria de vinhos e bebidas.</p>
              <div className="text-xs font-mono text-[#c5a47e] bg-[#0d0d0d] border border-[#262626] p-2 rounded-lg">
                Cupão POS: <strong className="text-[#e5e5e5]">VERAO2026</strong> • Válido até 31/08/2026
              </div>
            </div>

            <div className="bg-[#141414] p-5 rounded-xl border border-[#262626] shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2 py-0.5 bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/30 rounded-full text-[10px] font-bold">
                    Fidelização
                  </span>
                  <h4 className="font-serif font-bold text-[#e5e5e5] text-sm mt-1">Regresso às Aulas & Escritório</h4>
                </div>
                <Ticket className="w-5 h-5 text-[#c5a47e]" />
              </div>
              <p className="text-xs text-neutral-400">Acumulação tripla de pontos em tecnologia e acessórios.</p>
              <div className="text-xs font-mono text-[#c5a47e] bg-[#0d0d0d] border border-[#262626] p-2 rounded-lg">
                Automático para clientes identificados • Início 01/09/2026
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CALL MODAL (SOFTPHONE / VOIP DIALER) */}
      <CustomerCallModal
        customer={callingCustomer}
        initialPhoneNumber={customCallNumber}
        isOpen={isCallModalOpen}
        onClose={() => {
          setIsCallModalOpen(false);
          setCallingCustomer(null);
          setCustomCallNumber('');
        }}
      />

      {/* PURCHASE & INVOICE HISTORY MODAL */}
      <CustomerPurchaseHistoryModal
        customer={selectedHistoryCustomer}
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedHistoryCustomer(null);
        }}
        onInitiateCall={(customer) => {
          setIsHistoryModalOpen(false);
          handleInitiateCall(customer);
        }}
      />

      {/* NEW CUSTOMER MODAL */}
      {showNewCustModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] text-[#e5e5e5] rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-serif font-bold text-[#c5a47e]">
                    Registar Novo Cliente
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Insira a identificação, contactos, morada e localização
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCustModal(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              {/* Secção 1: Identificação */}
              <div className="space-y-3">
                <div className="flex items-center space-x-1.5 text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Identificação & Contactos</span>
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Nome Completo / Razão Social <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: João Silva ou Sociedade Comercial Lda"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-300 block mb-1">
                      NIF / NUIT Fiscal (Opcional)
                    </label>
                    <input
                      type="text"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      placeholder="Deixe vazio se não tiver NIF"
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg font-mono text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-neutral-300 block mb-1">Telefone / Telemóvel</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+258 84 000 0000"
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@exemplo.mz"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
              </div>

              {/* Secção 2: Morada e Localização */}
              <div className="pt-2 border-t border-[#262626] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>Morada & Localização Geográfica</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGetGPSLocation('new')}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#c5a47e] hover:text-[#e5cbb0] border border-[#383838] text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                    title="Preencher automaticamente com a localização atual do dispositivo"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#c5a47e]" />
                    ) : (
                      <Navigation className="w-3 h-3 text-[#c5a47e]" />
                    )}
                    <span>{isLocating ? 'A obter GPS...' : 'Obter GPS Atual'}</span>
                  </button>
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Morada / Endereço Físico (Rua, Avenida, Nº, Edifício)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ex: Av. 24 de Julho, Edifício Platinum, nº 123, 3º Andar"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-300 block mb-1">
                      Cidade / Província
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="ex: Maputo, Matola, Beira, Nampula..."
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-300 block mb-1">
                      Localização / Bairro / Ponto de Referência
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="ex: Polana Cimento, Bairro Central, Perto do Millenium BIM..."
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-300 block mb-1">Código Postal (Opcional)</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="ex: 1100"
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-neutral-300 block mb-1">País</label>
                    <input
                      type="text"
                      disabled
                      value={currentCompany?.country === 'PT' ? 'Portugal (PT)' : 'Moçambique (MZ)'}
                      className="w-full px-3 py-2 bg-[#121212] border border-[#262626] rounded-lg text-neutral-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Secção 3: Notas Adicionais */}
              <div className="pt-2 border-t border-[#262626]">
                <label className="font-semibold text-neutral-300 block mb-1">Observações / Notas do Cliente</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instruções de entrega, preferências ou observações sobre o cliente..."
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="flex space-x-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowNewCustModal(false)}
                  className="flex-1 py-2.5 bg-[#0d0d0d] hover:bg-[#1a1a1a] text-neutral-300 border border-[#262626] rounded-lg font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#c5a47e] hover:bg-[#d4b896] text-black rounded-lg font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all"
                >
                  Registar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] text-[#e5e5e5] rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div>
                <h4 className="text-base font-serif font-bold text-[#c5a47e]">
                  Editar Dados do Cliente
                </h4>
                <p className="text-xs text-neutral-400">
                  ID: <span className="font-mono text-neutral-300">{editingCustomer.id}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1 rounded-md text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-neutral-300 block mb-1">Nome Completo / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="ex: Consumidor Final ou Nome da Empresa"
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">NIF / NUIT Fiscal (Opcional)</label>
                  <input
                    type="text"
                    value={editTaxNumber}
                    onChange={(e) => setEditTaxNumber(e.target.value)}
                    placeholder="Deixe vazio se não tiver NIF"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg font-mono text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">Telefone / Telemóvel</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+258 84 000 0000"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="cliente@exemplo.mz"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">Escalão de Fidelidade</label>
                  <select
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] focus:outline-hidden focus:border-[#c5a47e] cursor-pointer"
                  >
                    <option value="bronze">Bronze (Padrão)</option>
                    <option value="prata">Prata (Intermédio)</option>
                    <option value="ouro">Ouro (VIP)</option>
                    <option value="platina">Platina (Exclusivo)</option>
                  </select>
                </div>
              </div>

              {/* Morada e Localização */}
              <div className="pt-2 border-t border-[#262626] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-300 block">Morada e Localização</span>
                  <button
                    type="button"
                    onClick={() => handleGetGPSLocation('edit')}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#c5a47e] border border-[#383838] text-[10px] font-semibold cursor-pointer disabled:opacity-50 shadow-xs"
                    title="Capturar localização atual"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#c5a47e]" />
                    ) : (
                      <Navigation className="w-3 h-3 text-[#c5a47e]" />
                    )}
                    <span>Obter GPS</span>
                  </button>
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">Morada / Endereço</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Rua, Avenida, Número..."
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-300 block mb-1">Cidade / Província</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="Maputo, Matola, Beira, Lisboa..."
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-neutral-300 block mb-1">Localização / Bairro / Ponto de Referência</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="Bairro Central, Polana, etc."
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-300 block mb-1">Código Postal</label>
                    <input
                      type="text"
                      value={editPostalCode}
                      onChange={(e) => setEditPostalCode(e.target.value)}
                      placeholder="1100"
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-300 block mb-1">Observações / Notas Internas</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notas adicionais sobre o cliente..."
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="flex space-x-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="flex-1 py-2.5 bg-[#0d0d0d] hover:bg-[#1a1a1a] text-neutral-300 border border-[#262626] rounded-lg font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#c5a47e] hover:bg-[#d4b896] text-black rounded-lg font-bold uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
