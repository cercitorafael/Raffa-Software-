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
import { calculateSubscription, getWhatsAppRenewalUrl, WHATSAPP_CONTACTS } from '../../utils/subscription';
import { sound } from '../../utils/audio';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const { currentCompany, updateCompany, refreshCompanySubscription, notify, currentUser } = useApp();
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
    } catch (err) {
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

  // Quick testing tools for admin
  const handleQuickAddDays = (days: number) => {
    const baseDate = subInfo.expiresAt && subInfo.expiresAt.getTime() > Date.now()
      ? subInfo.expiresAt
      : new Date();
    const newExpires = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    updateCompany(currentCompany.id, {
      subscriptionExpiresAt: newExpires.toISOString(),
      status: 'active',
      subscriptionStartedAt: new Date().toISOString(),
    });
    notify(`Assinatura estendida em +${days} dias com sucesso!`, 'success');
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
      <div className="w-full max-w-2xl bg-[#0f0f0f] border border-[#282828] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
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

          {/* Admin Simulation & Control Bar */}
          {currentUser.role === 'admin' && (
            <div className="p-3.5 bg-[#101010] border border-[#262626] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase font-mono flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-[#c5a47e]" />
                  <span>Ações Administrativas / Simulação de Licença</span>
                </span>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-[11px] text-[#c5a47e] hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar Supabase</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleQuickAddDays(30)}
                  className="px-2.5 py-1 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-200 text-xs border border-[#333] transition-colors cursor-pointer"
                >
                  +30 Dias (Mensal)
                </button>
                <button
                  onClick={() => handleQuickAddDays(365)}
                  className="px-2.5 py-1 rounded bg-[#1e1e1e] hover:bg-[#2a2a2a] text-neutral-200 text-xs border border-[#333] transition-colors cursor-pointer"
                >
                  +365 Dias (Anual)
                </button>
                <button
                  onClick={() => {
                    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                    updateCompany(currentCompany.id, {
                      subscriptionExpiresAt: yesterday,
                      status: 'expired',
                    });
                    notify('Simulação: Licença expirada ativada.', 'warning');
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs border border-rose-800/40 transition-colors cursor-pointer"
                >
                  Simular Bloqueio / Expirada
                </button>
              </div>
            </div>
          )}
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
