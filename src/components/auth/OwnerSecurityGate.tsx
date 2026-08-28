import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { sound } from '../../utils/audio';

interface OwnerSecurityGateProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  moduleName?: string;
}

export const OwnerSecurityGate: React.FC<OwnerSecurityGateProps> = ({
  children,
  title = 'Acesso Restrito ao Dono do Sistema',
  subtitle = 'A tabela e gestão de utilizadores possui proteção de segurança de nível mestre.',
  moduleName = 'Tabela de Utilizadores',
}) => {
  const { isUserTableUnlocked, unlockUserTable, lockUserTable, notify } = useApp();
  const [pinCode, setPinCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!pinCode) {
      setErrorMsg('Por favor, introduza o código de acesso mestre.');
      sound.playError();
      return;
    }

    setIsSubmitting(true);
    const result = unlockUserTable(pinCode);

    if (result.success) {
      sound.playSuccessChime();
      notify('Acesso concedido à tabela de utilizadores.', 'success');
      setErrorMsg(null);
      setPinCode('');
    } else {
      sound.playError();
      setErrorMsg(result.error || 'Código incorreto. Acesso restrito ao proprietário do sistema.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    }
    setIsSubmitting(false);
  };

  const handleLock = () => {
    lockUserTable();
    sound.playBeep();
    notify('Tabela de utilizadores bloqueada com sucesso.', 'info');
  };

  // If already unlocked in this session, render children with a re-lock toolbar indicator
  if (isUserTableUnlocked) {
    return (
      <div className="space-y-4">
        {/* Unlocked Owner Status Ribbon */}
        <div className="bg-[#141414] border border-[#c5a47e]/40 rounded-xl p-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#c5a47e]/20 border border-[#c5a47e]/50 flex items-center justify-center text-[#c5a47e]">
              <Unlock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">Modo Dono / Proprietário Ativo</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>AUTORIZADO</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Acesso desbloqueado à {moduleName}. Bloqueie quando terminar a administração.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLock}
            className="px-3 py-1.5 bg-[#222222] hover:bg-rose-950/40 hover:text-rose-300 text-neutral-300 border border-[#383838] hover:border-rose-500/40 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
            title="Bloquear novamente a tabela de utilizadores"
          >
            <Lock className="w-3.5 h-3.5 text-[#c5a47e]" />
            <span>Bloquear Tabela</span>
          </button>
        </div>

        {/* Render Actual Protected Content */}
        {children}
      </div>
    );
  }

  // If locked, display PIN entry gate
  return (
    <div className="min-h-[420px] flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md bg-[#121212] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Header with Luxury Lock Icon */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c5a47e]/20 to-[#c5a47e]/5 border border-[#c5a47e]/40 flex items-center justify-center text-[#c5a47e] shadow-lg relative">
            <Lock className="w-8 h-8" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500/30 rounded-full flex items-center justify-center border border-amber-400/50">
              <KeyRound className="w-3 h-3 text-amber-300" />
            </div>
          </div>

          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#c5a47e]/15 text-[#c5a47e] border border-[#c5a47e]/30 uppercase tracking-wider inline-block mb-1.5">
              Proteção de Nível Mestre
            </span>
            <h3 className="text-lg font-serif font-bold text-white">{title}</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {subtitle}
            </p>
          </div>
        </div>

        {/* PIN Code Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Código / PIN de Acesso do Dono
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                autoComplete="off"
                placeholder="••••••••"
                value={pinCode}
                onChange={(e) => {
                  setPinCode(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full pl-4 pr-11 py-3 bg-[#0a0a0a] border border-[#2a2a2a] focus:border-[#c5a47e] rounded-xl text-white font-mono text-sm tracking-widest focus:outline-hidden transition-all text-center shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                title={showPassword ? 'Ocultar código' : 'Mostrar código'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5 text-center">
              O código é confidencial e não é visível durante a digitação.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl flex items-start space-x-2 text-rose-300 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !pinCode}
            className="w-full py-3 bg-[#c5a47e] hover:bg-[#b5946e] disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md"
          >
            <KeyRound className="w-4 h-4" />
            <span>Entrar na Tabela de Utilizadores</span>
          </button>
        </form>

        {/* Security Note Footer */}
        <div className="pt-4 border-t border-[#202020] text-center">
          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-neutral-400">
            <ShieldAlert className="w-3.5 h-3.5 text-[#c5a47e]" />
            <span>Apenas o proprietário autorizado tem permissão de entrada</span>
          </div>
        </div>
      </div>
    </div>
  );
};
