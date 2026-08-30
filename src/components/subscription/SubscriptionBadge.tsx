import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, ShieldAlert, AlertTriangle, Clock, ChevronRight, Zap } from 'lucide-react';
import { calculateSubscription } from '../../utils/subscription';
import { sound } from '../../utils/audio';

interface SubscriptionBadgeProps {
  variant?: 'navbar' | 'sidebar' | 'compact';
  onClick?: () => void;
}

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ variant = 'navbar', onClick }) => {
  const { currentCompany, setShowSubscriptionModal } = useApp();
  const subInfo = calculateSubscription(currentCompany);

  const handleClick = () => {
    sound.playClick();
    if (onClick) {
      onClick();
    } else if (setShowSubscriptionModal) {
      setShowSubscriptionModal(true);
    }
  };

  // Status-based styles
  const getColors = () => {
    if (subInfo.isSuspended || subInfo.isExpired) {
      return {
        bg: 'bg-rose-500/15 hover:bg-rose-500/25',
        border: 'border-rose-500/40',
        text: 'text-rose-400',
        bar: 'bg-rose-500',
        dot: 'bg-rose-500 animate-pulse',
      };
    }
    if (subInfo.isCritical) {
      return {
        bg: 'bg-rose-500/10 hover:bg-rose-500/20',
        border: 'border-rose-500/30',
        text: 'text-rose-300',
        bar: 'bg-rose-500 animate-pulse',
        dot: 'bg-rose-400 animate-ping',
      };
    }
    if (subInfo.isExpiringSoon) {
      return {
        bg: 'bg-amber-500/10 hover:bg-amber-500/20',
        border: 'border-amber-500/30',
        text: 'text-amber-300',
        bar: 'bg-amber-500',
        dot: 'bg-amber-400',
      };
    }
    return {
      bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
      border: 'border-emerald-500/30',
      text: 'text-emerald-300',
      bar: 'bg-emerald-500',
      dot: 'bg-emerald-400',
    };
  };

  const colors = getColors();

  // Sidebar Card Layout
  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`w-full p-3 rounded-xl border ${colors.bg} ${colors.border} transition-all duration-200 text-left flex flex-col space-y-2 cursor-pointer group shadow-xs`}
        title="Clique para ver detalhes da assinatura e renovação"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
            <span className="text-[11px] font-bold text-neutral-200 uppercase tracking-wider font-mono">
              Licença {subInfo.billingCycle === 'yearly' ? 'Anual' : 'Mensal'}
            </span>
          </div>

          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${colors.text} bg-black/40`}>
            {subInfo.daysRemaining <= 0 ? 'Vencida' : `${subInfo.daysRemaining}d`}
          </span>
        </div>

        {/* Progress Bar with Percentage */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] text-neutral-400">
            <span className="truncate max-w-[110px]">{subInfo.plan}</span>
            <span className="font-mono font-semibold text-neutral-300">{subInfo.percentageRemaining}%</span>
          </div>

          <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
              style={{ width: `${subInfo.percentageRemaining}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-0.5 text-[10px] text-neutral-400 group-hover:text-neutral-200">
          <span>Expira: {subInfo.expiresAtFormatted.split(' de ')[0]}...</span>
          <span className="flex items-center space-x-0.5 text-[#c5a47e] font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Renovar</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </button>
    );
  }

  // Navbar Compact Indicator (Mini progress bar + countdown)
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg border ${colors.bg} ${colors.border} transition-all duration-150 cursor-pointer shadow-xs`}
      title={`Licença: ${subInfo.daysRemaining} dias restantes (${subInfo.percentageRemaining}%). Expira em ${subInfo.expiresAtFormatted}. Clique para renovar.`}
    >
      <div className="flex items-center space-x-1.5">
        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
        <span className="text-xs font-mono font-bold text-neutral-200">
          {subInfo.daysRemaining <= 0 ? (
            <span className="text-rose-400">Expirada</span>
          ) : (
            <span>{subInfo.daysRemaining}d</span>
          )}
        </span>
      </div>

      {/* Mini Progress Bar */}
      <div className="hidden sm:flex flex-col w-16 space-y-0.5">
        <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
            style={{ width: `${subInfo.percentageRemaining}%` }}
          />
        </div>
        <div className="flex justify-between text-[8px] font-mono text-neutral-400">
          <span>{subInfo.percentageRemaining}%</span>
          <span className="text-[8px] text-neutral-500 uppercase">{subInfo.billingCycle === 'yearly' ? '365d' : '30d'}</span>
        </div>
      </div>
    </button>
  );
};
