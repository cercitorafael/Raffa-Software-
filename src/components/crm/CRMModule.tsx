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
  Edit2,
  Trash2,
  X,
  Check,
  Building,
  UserCheck,
} from 'lucide-react';
import { Customer } from '../../types';

export const CRMModule: React.FC = () => {
  const {
    customers,
    currentCompany,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    salesHistory,
    addLoyaltyPoints,
    notify,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'customers' | 'loyalty' | 'giftcards' | 'campaigns'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // New Customer Form
  const [name, setName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Lisboa');

  // Edit Customer Form State
  const [editName, setEditName] = useState('');
  const [editTaxNumber, setEditTaxNumber] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
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
      (c.phone || '').includes(q)
    );
  });

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditName(cust.name || '');
    setEditTaxNumber(cust.taxNumber || '');
    setEditEmail(cust.email || '');
    setEditPhone(cust.phone || '');
    setEditAddress(cust.address || '');
    setEditCity(cust.city || '');
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
    if (!name || !taxNumber) return;

    addCustomer({
      companyId: currentCompany.id,
      name,
      taxNumber,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@email.pt`,
      phone: phone || '+351 900 000 000',
      address: address || 'Rua Central, nº 10',
      city,
      country: 'PT',
      postalCode: '1000-001',
      loyaltyPoints: 50,
      loyaltyTier: 'bronze',
      totalSpent: 0,
      notes: 'Cliente registado no balcão',
    });

    notify(`Cliente "${name}" registado com sucesso!`, 'success');
    setShowNewCustModal(false);
    setName('');
    setTaxNumber('');
    setEmail('');
    setPhone('');
    setAddress('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Top Banner KPI Cards */}
      <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] grid grid-cols-1 sm:grid-cols-4 gap-3 shrink-0">
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
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Membros VIP Ouro</span>
            <p className="text-xl font-serif font-bold text-amber-400">
              {(customers || []).filter((c) => (c.loyaltyTier || '').toLowerCase() === 'ouro').length} clientes
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Pontos em Circulação</span>
            <p className="text-xl font-serif font-bold text-emerald-400">
              {(customers || []).reduce((s, c) => s + (c.loyaltyPoints || 0), 0)} pts
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Saldo Cartões Oferta</span>
            <p className="text-xl font-serif font-bold text-[#c5a47e]">
              {formatCurrency(giftCards.reduce((s, g) => s + g.currentBalance, 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between">
        <div className="flex space-x-1 overflow-x-auto">
          {[
            { id: 'customers', label: 'Diretório de Clientes' },
            { id: 'loyalty', label: 'Programa de Fidelização' },
            { id: 'giftcards', label: 'Cartões Presente / Vouchers' },
            { id: 'campaigns', label: 'Campanhas & Descontos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-[#c5a47e] text-[#c5a47e]'
                  : 'border-transparent text-neutral-400 hover:text-[#e5e5e5]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowNewCustModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#c5a47e] hover:bg-[#d4b896] text-black rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registar Cliente</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Customers Tab */}
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
                    <th className="p-3">Contactos</th>
                    <th className="p-3">Localidade</th>
                    <th className="p-3 text-center">Nível Fidelidade</th>
                    <th className="p-3 text-right">Pontos</th>
                    <th className="p-3 text-right">Total Acumulado</th>
                    <th className="p-3 text-center">Ações</th>
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
                        <td className="p-3 font-mono text-[#c5a47e]">{cust.taxNumber || '999999990'}</td>
                        <td className="p-3 text-neutral-400">
                          <div>{cust.email || '-'}</div>
                          <div className="text-[10px] text-neutral-500">{cust.phone || '-'}</div>
                        </td>
                        <td className="p-3 text-neutral-300">{cust.city || 'Lisboa'}{cust.country ? `, ${cust.country}` : ''}</td>
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
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenEdit(cust)}
                              className="p-1.5 bg-[#1f1f1f] hover:bg-[#c5a47e] hover:text-black text-[#c5a47e] border border-[#333333] rounded-md transition-all cursor-pointer shadow-xs"
                              title="Editar Dados do Cliente / Consumidor Final"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* Loyalty Program Rules Tab */}
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
                <li>Acumulação a dobrar (2 pontos por cada 1€)</li>
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
                <li>1.5 pontos por cada 1€ gasto</li>
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
                <li>1 ponto por cada 1€ gasto</li>
                <li>Vales de desconto de 5€ a cada 100 pontos</li>
              </ul>
            </div>
          </div>
        )}

        {/* Gift Cards Tab */}
        {activeTab === 'giftcards' && (
          <div className="bg-[#141414] rounded-xl border border-[#262626] shadow-sm overflow-hidden">
            <div className="p-3.5 border-b border-[#262626] bg-[#0d0d0d] flex justify-between items-center">
              <h4 className="text-xs font-serif font-bold text-[#c5a47e]">Cartões Presente / Gift Cards Emitidos</h4>
              <button
                onClick={() => {
                  const newCode = `GIFT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
                  setGiftCards([...giftCards, { code: newCode, initialBalance: 50.0, currentBalance: 50.0, issuedTo: 'Novo Cliente', expiresAt: '2026-12-31' }]);
                  notify(`Cartão Presente ${newCode} emitido com 50.00€ de saldo!`, 'success');
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

        {/* Campaigns Tab */}
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

      {/* New Customer Modal */}
      {showNewCustModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] text-[#e5e5e5] rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h4 className="text-sm font-serif font-bold text-[#c5a47e] pb-2 border-b border-[#262626]">
              Registar Novo Cliente
            </h4>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-neutral-300 block mb-1">Nome Completo / Empresa</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">NIF Fiscal</label>
                  <input
                    type="text"
                    required
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="234567890"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg font-mono text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">Telefone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+351 9..."
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
                  placeholder="cliente@exemplo.pt"
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustModal(false)}
                  className="flex-1 py-2 bg-[#0d0d0d] hover:bg-[#1a1a1a] text-neutral-300 border border-[#262626] rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#c5a47e] hover:bg-[#d4b896] text-black rounded-lg font-bold uppercase tracking-wider"
                >
                  Gravar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Customer Modal */}
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
                  <label className="font-semibold text-neutral-300 block mb-1">NIF / NUIT Fiscal</label>
                  <input
                    type="text"
                    value={editTaxNumber}
                    onChange={(e) => setEditTaxNumber(e.target.value)}
                    placeholder="999999990"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg font-mono text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">Telefone / Telemóvel</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+351 9..."
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
                    placeholder="cliente@exemplo.pt"
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
                  <label className="font-semibold text-neutral-300 block mb-1">Cidade / Localidade</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="Lisboa, Porto, Nampula..."
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">Código Postal</label>
                  <input
                    type="text"
                    value={editPostalCode}
                    onChange={(e) => setEditPostalCode(e.target.value)}
                    placeholder="1000-001"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#e5e5e5] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
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
