import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  AlertTriangle,
  MessageSquare,
  Building2,
  Calendar,
  RotateCw,
  LogOut,
  Copy,
  Check,
  CreditCard,
  Phone,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Tag,
} from 'lucide-react';
import {
  calculateSubscription,
  getWhatsAppRenewalUrl,
  getWhatsAppPlanRenewalUrl,
  PROFESSIONAL_PLANS,
  PricingPlan,
  WHATSAPP_CONTACTS,
} from '../../utils/subscription';
import { sound } from '../../utils/audio';

export const SubscriptionSuspendedScreen: React.FC = () => {
  const { currentCompany, logout, refreshCompanySubscription, companies, setCurrentCompany, notify } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [selectedWhatsApp, setSelectedWhatsApp] = useState<string>(WHATSAPP_CONTACTS[0].rawPhone);

  const subInfo = calculateSubscription(currentCompany);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    sound.playClick();
    try {
      if (refreshCompanySubscription) {
        await refreshCompanySubscription();
      }
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    } catch {
      setIsRefreshing(false);
    }
  };

  const handleCopyPhone = (phone: string, label: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    sound.playClick();
    notify(`Contacto copiado: ${phone}`, 'success');
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  const handleSelectPlan = (plan: PricingPlan) => {
    sound.playClick();
    const url = getWhatsAppPlanRenewalUrl(selectedWhatsApp, plan, currentCompany);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen w-screen bg-[#070707] text-[#e5e5e5] flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-y-auto">
      {/* Subtle background ambient gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-4xl bg-[#0f0f0f] border border-rose-500/30 rounded-2xl shadow-2xl shadow-rose-950/20 overflow-hidden relative z-10 my-auto">
        {/* Header Alert Banner */}
        <div className="bg-rose-500/10 border-b border-rose-500/20 p-6 sm:p-8 text-center relative">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4 shadow-lg animate-pulse">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Acesso Temporariamente Suspenso</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
            Conta Suspensa por Vencimento de Assinatura
          </h1>

          <p className="text-sm text-neutral-300 max-w-xl mx-auto leading-relaxed">
            A licença de utilização desta empresa atingiu a data de validade ou encontra-se suspensa.
            Escolha um dos planos profissionais abaixo para renovar o acesso imediato via WhatsApp.
          </p>
        </div>

        {/* Company & Subscription Details Card */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">
                    {currentCompany?.tradeName || currentCompany?.name || 'A Minha Empresa'}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    NUIT: {currentCompany?.taxNumber || 'Não especificado'} • ID: {currentCompany?.id}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 uppercase">
                {subInfo.rawStatus === 'suspended' ? 'Bloqueado' : 'Expirada'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-2.5 bg-[#0a0a0a] rounded-lg border border-[#222222]">
                <span className="text-[10px] text-neutral-500 uppercase font-mono block">Plano Atual</span>
                <span className="font-semibold text-[#c5a47e]">{subInfo.plan}</span>
              </div>

              <div className="p-2.5 bg-[#0a0a0a] rounded-lg border border-[#222222]">
                <span className="text-[10px] text-neutral-500 uppercase font-mono block">Ciclo Anterior</span>
                <span className="font-semibold text-neutral-200">
                  {subInfo.billingCycle === 'yearly' ? 'Anual (365 Dias)' : 'Mensal (30 Dias)'}
                </span>
              </div>

              <div className="p-2.5 bg-[#0a0a0a] rounded-lg border border-[#222222]">
                <span className="text-[10px] text-neutral-500 uppercase font-mono block">Data de Vencimento</span>
                <span className="font-semibold text-rose-400">{subInfo.expiresAtFormatted}</span>
              </div>
            </div>
          </div>

          {/* CHOOSE PROFESSIONAL PLAN SECTION (FROM USER IMAGE) */}
          <div className="space-y-4 pt-2">
            <div className="text-center space-y-1">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-[#98b87a] sm:tracking-widest drop-shadow-sm flex items-center justify-center space-x-2">
                <Sparkles className="w-5 h-5 text-[#98b87a]" />
                <span>ESCOLHA O SEU PLANO PROFISSIONAL</span>
                <Sparkles className="w-5 h-5 text-[#98b87a]" />
              </h2>
              <p className="text-xs text-neutral-400">
                Clique no plano pretendido para enviar mensagem direta com o pacote selecionado
              </p>
            </div>

            {/* Plans Grid / Table matching the provided reference layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PROFESSIONAL_PLANS.map((plan) => {
                const isSemestral = plan.id === 'semestral';
                const isAnual = plan.id === 'anual';
                const isTrimestral = plan.id === 'trimestral';

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={`group relative text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.02] active:scale-[0.99] shadow-lg ${
                      isAnual
                        ? 'bg-gradient-to-b from-[#1a1710] to-[#121212] border-amber-500/50 hover:border-amber-400 hover:shadow-amber-950/40'
                        : isSemestral
                        ? 'bg-gradient-to-b from-[#141812] to-[#121212] border-emerald-500/50 hover:border-emerald-400 hover:shadow-emerald-950/40'
                        : isTrimestral
                        ? 'bg-gradient-to-b from-[#10141a] to-[#121212] border-sky-500/40 hover:border-sky-400 hover:shadow-sky-950/40'
                        : 'bg-[#141414] border-[#2a2a2a] hover:border-[#c5a47e]/60 hover:shadow-neutral-900/50'
                    }`}
                  >
                    {/* Top Badge if any */}
                    {plan.badge && (
                      <div className="absolute -top-2.5 right-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-md ${
                          isAnual
                            ? 'bg-amber-500 text-black'
                            : isSemestral
                            ? 'bg-emerald-500 text-black'
                            : 'bg-sky-500 text-black'
                        }`}>
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div>
                      {/* Plan Header */}
                      <div className="border-b border-[#262626] pb-2.5 mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-wider text-[#88b04b] group-hover:text-[#a2cc5d] transition-colors">
                          {plan.name}
                        </h3>
                        <span className="text-[11px] font-mono text-neutral-400">
                          {plan.period}
                        </span>
                      </div>

                      {/* Main Box Message Matching User Image */}
                      <div className="p-2.5 rounded-lg bg-[#0a0a0a]/80 border border-[#222222] group-hover:border-neutral-700 transition-colors mb-3">
                        <p className="text-[11px] font-bold text-blue-400 group-hover:text-blue-300 leading-snug uppercase tracking-tight text-center">
                          {plan.formattedText}
                        </p>
                      </div>

                      {/* Price Highlight */}
                      <div className="text-center my-2">
                        <span className="text-2xl font-black text-white font-mono tracking-tight group-hover:text-[#c5a47e] transition-colors">
                          {plan.price}
                        </span>
                        <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                          {plan.durationText}
                        </p>
                      </div>
                    </div>

                    {/* Button CTA to WhatsApp */}
                    <div className="mt-4 pt-3 border-t border-[#222222]">
                      <div className="w-full py-2 px-3 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-md">
                        <MessageSquare className="w-3.5 h-3.5 fill-white/20" />
                        <span>Subscrever via WhatsApp</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* WhatsApp Direct Action Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Contactos de Suporte & Faturação</span>
              </h4>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Atendimento Rápido</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WHATSAPP_CONTACTS.map((contact) => {
                const whatsappUrl = getWhatsAppRenewalUrl(contact.rawPhone, currentCompany, subInfo);
                const isCopied = copiedPhone === contact.number;
                const isSelected = selectedWhatsApp === contact.rawPhone;

                return (
                  <div
                    key={contact.rawPhone}
                    onClick={() => setSelectedWhatsApp(contact.rawPhone)}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/40'
                        : contact.isPrimary
                        ? 'bg-emerald-950/10 border-emerald-500/30 hover:border-emerald-400'
                        : 'bg-[#141414] border-[#2a2a2a] hover:border-neutral-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                          contact.isPrimary ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-300'
                        }`}>
                          {contact.isPrimary ? 'WhatsApp Principal' : 'WhatsApp Comercial'}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                            <Check className="w-3 h-3" />
                            <span>Selecionado</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-neutral-100 font-mono mt-1">
                        {contact.number}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {contact.label}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.playClick();
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer text-center"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Abrir WhatsApp</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </a>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPhone(contact.number, contact.label);
                        }}
                        className="p-2 rounded-lg bg-[#1e1e1e] hover:bg-[#282828] text-neutral-300 hover:text-white border border-[#333333] transition-colors cursor-pointer"
                        title="Copiar número de telefone"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Instructions helper box */}
          <div className="p-3.5 bg-[#121212] border border-[#222222] rounded-xl text-xs space-y-2 text-neutral-400">
            <div className="flex items-center space-x-2 text-neutral-200 font-semibold">
              <CreditCard className="w-4 h-4 text-[#c5a47e]" />
              <span>Modalidades de Pagamento Aceites</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Aceitamos pagamentos via <strong className="text-neutral-200">M-Pesa, E-Mola, Millennium BIM, BCI e Standard Bank</strong>.
              Após o envio do comprovativo por WhatsApp, a licença é reativada de imediato sem perda de dados.
            </p>
          </div>

          {/* Footer Actions: Revalidate & Logout / Switch */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#222222]">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-[#1a1a1a] hover:bg-[#242424] text-neutral-200 border border-[#333333] hover:border-[#c5a47e]/50 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#c5a47e] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'A verificar pagamento...' : 'Verificar Pagamento / Revalidar'}</span>
            </button>

            {companies.length > 1 && (
              <div className="w-full sm:w-auto flex items-center space-x-2">
                <span className="text-[11px] text-neutral-500 whitespace-nowrap">Trocar Empresa:</span>
                <select
                  value={currentCompany?.id}
                  onChange={(e) => {
                    const c = companies.find((comp) => comp.id === e.target.value);
                    if (c) setCurrentCompany(c);
                  }}
                  className="bg-[#141414] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.tradeName || c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-950/20 text-xs transition-colors cursor-pointer ml-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Terminar Sessão</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

