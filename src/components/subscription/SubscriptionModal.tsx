import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Calendar,
  MessageSquare,
  Building2,
  CheckCircle2,
  RotateCw,
  ExternalLink,
  Copy,
  Check,
  CreditCard,
  X,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
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

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const { currentCompany, refreshCompanySubscription, notify } = useApp();
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(text);
    sound.playClick();
    notify(`Copiado para a área de transferência: ${text}`, 'success');
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  // Progress Bar color logic
  const getProgressColor = () => {
    if (subInfo.isSuspended || subInfo.isExpired) return 'bg-rose-500';
    if (subInfo.isCritical) return 'bg-rose-500 animate-pulse';
    if (subInfo.isExpiringSoon) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getBadgeStyle = () => {
    if (subInfo.isSuspended || subInfo.isExpired) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
    if (subInfo.isCritical) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
    }
    if (subInfo.isExpiringSoon) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#0f0f0f] border border-[#282828] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#222222] bg-[#141414] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-neutral-100">
                  Estado da Licença & Assinatura
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${getBadgeStyle()}`}>
                  {subInfo.isSuspended ? 'SUSPENSA' : subInfo.isCritical ? 'EXPIRA EM BREVE' : 'ATIVA'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {currentCompany?.tradeName || currentCompany?.name} • NUIT: {currentCompany?.taxNumber || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Sincronizar estado da subscrição com o Supabase"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-[#c5a47e] hover:bg-[#222222] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#c5a47e]' : ''}`} />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Main License Progress Card */}
          <div className="p-5 bg-[#141414] border border-[#262626] rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] text-neutral-400 uppercase font-mono block">Plano Atual</span>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>{subInfo.plan}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#c5a47e]/20 text-[#c5a47e] font-normal">
                    {subInfo.billingCycle === 'yearly' ? 'Ciclo Anual (365d)' : 'Ciclo Mensal (30d)'}
                  </span>
                </h3>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] text-neutral-400 uppercase font-mono block">Tempo Restante</span>
                <span className={`text-xl font-mono font-black ${
                  subInfo.isSuspended ? 'text-rose-400' : subInfo.isCritical ? 'text-rose-400' : subInfo.isExpiringSoon ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {subInfo.daysRemaining <= 0 ? 'Vencida' : `${subInfo.daysRemaining} Dias`}
                </span>
                <span className="text-xs text-neutral-400 ml-1">({subInfo.percentageRemaining}%)</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Progresso do Ciclo</span>
                <span>Validade: <strong className="text-neutral-200">{subInfo.expiresAtFormatted}</strong></span>
              </div>
              <div className="w-full h-3 bg-[#0a0a0a] rounded-full overflow-hidden p-0.5 border border-[#2a2a2a]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
                  style={{ width: `${subInfo.percentageRemaining}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
              <div className="p-2.5 bg-[#0a0a0a] rounded-xl border border-[#222222]">
                <span className="text-[10px] text-neutral-500 uppercase font-mono block">Início</span>
                <span className="font-medium text-neutral-300">{subInfo.startedAtFormatted}</span>
              </div>
              <div className="p-2.5 bg-[#0a0a0a] rounded-xl border border-[#222222]">
                <span className="text-[10px] text-neutral-500 uppercase font-mono block">Expiração</span>
                <span className="font-medium text-neutral-300">{subInfo.expiresAtFormatted}</span>
              </div>
              <div className="p-2.5 bg-[#0a0a0a] rounded-xl border border-[#222222]">
                <span className="text-[10px] text-neutral-500 uppercase font-mono block">Certificação AT</span>
                <span className="font-medium text-[#c5a47e]">{currentCompany?.softwareCertNumber || '4120/AT'}</span>
              </div>
              <div className="p-2.5 bg-[#0a0a0a] rounded-xl border border-[#222222]">
                <span className="text-[10px] text-neutral-500 uppercase font-mono block">SAF-T</span>
                <span className="font-medium text-neutral-300">{currentCompany?.saftVersion || '1.04_01'}</span>
              </div>
            </div>
          </div>

          {/* CHOOSE PROFESSIONAL PLAN SECTION (FROM USER IMAGE) */}
          <div className="space-y-3 pt-1">
            <div className="text-center space-y-0.5">
              <h3 className="text-base font-black uppercase tracking-wider text-[#98b87a] flex items-center justify-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-[#98b87a]" />
                <span>ESCOLHA O SEU PLANO PROFISSIONAL</span>
                <Sparkles className="w-4 h-4 text-[#98b87a]" />
              </h3>
              <p className="text-xs text-neutral-400">
                Clique num dos planos para solicitar renovação ou extensão imediata via WhatsApp
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {PROFESSIONAL_PLANS.map((plan) => {
                const isSemestral = plan.id === 'semestral';
                const isAnual = plan.id === 'anual';
                const isTrimestral = plan.id === 'trimestral';
                const planUrl = getWhatsAppPlanRenewalUrl(WHATSAPP_CONTACTS[0].rawPhone, plan, currentCompany);

                return (
                  <a
                    key={plan.id}
                    href={planUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => sound.playClick()}
                    className={`group relative text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.02] active:scale-[0.99] shadow-md ${
                      isAnual
                        ? 'bg-gradient-to-b from-[#1a1710] to-[#121212] border-amber-500/50 hover:border-amber-400'
                        : isSemestral
                        ? 'bg-gradient-to-b from-[#141812] to-[#121212] border-emerald-500/50 hover:border-emerald-400'
                        : isTrimestral
                        ? 'bg-gradient-to-b from-[#10141a] to-[#121212] border-sky-500/40 hover:border-sky-400'
                        : 'bg-[#141414] border-[#2a2a2a] hover:border-[#c5a47e]/60'
                    }`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-2 right-2">
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase tracking-wide shadow-xs ${
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
                      <div className="border-b border-[#262626] pb-1.5 mb-2 flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#88b04b] group-hover:text-[#a2cc5d] transition-colors">
                          {plan.name}
                        </h4>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {plan.period}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-[#0a0a0a]/80 border border-[#222222] group-hover:border-neutral-700 transition-colors mb-2">
                        <p className="text-[10px] font-bold text-blue-400 group-hover:text-blue-300 leading-snug uppercase tracking-tight text-center">
                          {plan.formattedText}
                        </p>
                      </div>

                      <div className="text-center my-1.5">
                        <span className="text-lg font-black text-white font-mono tracking-tight group-hover:text-[#c5a47e] transition-colors">
                          {plan.price}
                        </span>
                        <p className="text-[9px] text-neutral-400 font-mono">
                          {plan.durationText}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#222222]">
                      <div className="w-full py-1.5 px-2 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 text-white text-[11px] font-bold transition-all flex items-center justify-center space-x-1 shadow-xs">
                        <MessageSquare className="w-3 h-3" />
                        <span>Subscrever</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Direct WhatsApp Contact & Renewal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Contactar para Renovação de Licença</span>
              </h4>
              <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Suporte Direto</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WHATSAPP_CONTACTS.map((contact) => {
                const whatsappUrl = getWhatsAppRenewalUrl(contact.rawPhone, currentCompany, subInfo);
                const isCopied = copiedPhone === contact.number;

                return (
                  <div
                    key={contact.rawPhone}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                      contact.isPrimary
                        ? 'bg-emerald-950/15 border-emerald-500/40 hover:border-emerald-400'
                        : 'bg-[#141414] border-[#262626] hover:border-neutral-500'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                          contact.isPrimary ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-300'
                        }`}>
                          {contact.isPrimary ? 'WhatsApp Principal' : 'WhatsApp Comercial'}
                        </span>
                        {contact.isPrimary && (
                          <span className="text-[10px] text-emerald-400 font-semibold">Prioritário</span>
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
                        onClick={() => sound.playClick()}
                        className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer text-center"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Renovar via WhatsApp</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopy(contact.number)}
                        className="p-2 rounded-lg bg-[#1e1e1e] hover:bg-[#282828] text-neutral-300 hover:text-white border border-[#333333] transition-colors cursor-pointer"
                        title="Copiar número"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl text-xs space-y-2">
            <div className="flex items-center space-x-2 text-neutral-200 font-semibold">
              <CreditCard className="w-4 h-4 text-[#c5a47e]" />
              <span>Modalidades de Pagamento e Reativação</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Pague com facilidade através de <strong className="text-neutral-200">M-Pesa, E-Mola, Millennium BIM, BCI ou Standard Bank</strong>.
              Ao enviar o comprovativo pelo WhatsApp acima, a sua subscrição será sincronizada em tempo real.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#222222] bg-[#141414] flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-[#222222] hover:bg-[#2a2a2a] text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
