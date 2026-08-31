import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Unlock,
  LogOut,
  Layers,
  Building2,
  Store,
  ShieldAlert,
  RotateCw,
  Clock,
  Wifi,
  WifiOff,
  Wallet,
} from 'lucide-react';
import { sound } from '../../utils/audio';

export const LockScreen: React.FC = () => {
  const {
    currentUser,
    currentCompany,
    currentStore,
    currentTerminal,
    activeShift,
    formatCurrency,
    unlockScreen,
    logout,
    isOnline,
  } = useApp();

  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setCurrentDate(
        now.toLocaleDateString('pt-PT', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pinInput.length < 8) {
          sound.playBeep();
          setPinInput((prev) => prev + e.key);
          setErrorMsg(null);
        }
      } else if (e.key === 'Backspace') {
        setPinInput((prev) => prev.slice(0, -1));
        setErrorMsg(null);
      } else if (e.key === 'Enter') {
        if (pinInput.length > 0) {
          handleUnlock();
        }
      } else if (e.key === 'Escape') {
        setPinInput('');
        setErrorMsg(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinInput]);

  const handleKeypadPress = (digit: string) => {
    if (pinInput.length < 8) {
      sound.playBeep();
      setPinInput((prev) => prev + digit);
      setErrorMsg(null);
    }
  };

  const handleKeypadBackspace = () => {
    sound.playBeep();
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleKeypadClear = () => {
    sound.playBeep();
    setPinInput('');
    setErrorMsg(null);
  };

  const handleUnlock = () => {
    if (!pinInput) {
      setErrorMsg('Por favor introduza o seu PIN.');
      sound.playError();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    setTimeout(() => {
      const res = unlockScreen(pinInput);
      if (!res.success) {
        setErrorMsg(res.error || 'PIN incorreto.');
        setPinInput('');
      }
      setIsSubmitting(false);
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070707]/95 backdrop-blur-md flex flex-col justify-between p-6 select-none text-[#e5e5e5]">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          {currentCompany?.logoUrl ? (
            <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#262626] overflow-hidden flex items-center justify-center p-0.5 shadow-xs">
              <img
                src={currentCompany.logoUrl}
                alt={currentCompany.tradeName || currentCompany.name}
                className="w-full h-full object-contain rounded-md"
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 text-[#c5a47e] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          )}
          <div>
            <span className="text-sm font-serif font-bold text-white">
              {currentCompany?.tradeName || currentCompany?.name || 'OmniERP & POS'}
            </span>
            <span className="text-[10px] text-neutral-400 block font-mono">
              {currentStore?.name || 'Terminal Bloqueado'} &bull; NIF {currentCompany?.taxNumber || '509823410'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <div className="text-right">
            <div className="text-sm font-mono font-bold text-[#c5a47e]">{currentTime}</div>
            <div className="text-[10px] text-neutral-400 capitalize">{currentDate}</div>
          </div>
        </div>
      </div>

      {/* Center Lock Box */}
      <div className="max-w-md mx-auto w-full bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col items-center">
        {/* User Avatar & Lock Icon */}
        <div className="relative mb-4">
          <img
            src={
              currentUser.avatarUrl ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'
            }
            alt={currentUser.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-[#c5a47e] shadow-lg"
          />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-500 rounded-full border-2 border-[#141414] flex items-center justify-center text-black">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        <h2 className="text-lg font-serif font-bold text-[#e5e5e5] text-center">
          {currentUser.name}
        </h2>
        <div className="flex items-center space-x-2 mt-1 mb-2.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-[#c5a47e]/15 text-[#c5a47e] border border-[#c5a47e]/30">
            {currentUser.role.toUpperCase()}
          </span>
          <span className="text-xs text-neutral-400">&bull;</span>
          <span className="text-xs text-neutral-400 font-mono">
            {currentTerminal.code} ({currentStore.name})
          </span>
        </div>

        {/* Live Cash Register Status on Lock Screen */}
        <div
          className={`mb-4 px-3 py-1.5 rounded-xl border flex items-center space-x-2 text-xs transition-all ${
            activeShift
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <Wallet className={`w-3.5 h-3.5 ${activeShift ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="font-semibold">{activeShift ? 'Caixa Aberto' : 'Caixa Fechado'}</span>
          {activeShift && (
            <span className="text-[10px] text-emerald-400/80 font-mono">
              &bull; {activeShift.operatorName.split(' ')[0]} ({formatCurrency(activeShift.initialCash)})
            </span>
          )}
        </div>

        <p className="text-xs text-neutral-400 text-center mb-4">
          Introduza o seu PIN para retomar a sessão de trabalho
        </p>

        {/* Masked PIN Display */}
        <div className="w-full bg-[#0d0d0d] border border-[#262626] rounded-xl p-3.5 flex flex-col items-center justify-center mb-4">
          <div className="flex items-center space-x-3">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pinInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    isFilled
                      ? 'bg-[#c5a47e] scale-110 shadow-xs ring-4 ring-[#c5a47e]/20'
                      : 'bg-[#262626] border border-[#3a3a3a]'
                  }`}
                />
              );
            })}
          </div>

          {errorMsg && (
            <p className="text-[11px] text-rose-400 font-medium mt-2 animate-in fade-in">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Compact Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 w-full mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeypadPress(digit)}
              className="h-11 bg-[#181818] hover:bg-[#222222] active:bg-[#c5a47e]/20 border border-[#2a2a2a] hover:border-neutral-600 rounded-xl text-base font-bold font-mono text-[#e5e5e5] active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-xs"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleKeypadClear}
            className="h-11 bg-[#181818] hover:bg-rose-950/30 text-rose-400 border border-[#2a2a2a] rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center"
          >
            C
          </button>

          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            className="h-11 bg-[#181818] hover:bg-[#222222] active:bg-[#c5a47e]/20 border border-[#2a2a2a] hover:border-neutral-600 rounded-xl text-base font-bold font-mono text-[#e5e5e5] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleKeypadBackspace}
            className="h-11 bg-[#181818] hover:bg-amber-950/30 text-amber-400 border border-[#2a2a2a] rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {/* Unlock and Switch User Actions */}
        <div className="w-full space-y-2">
          <button
            onClick={handleUnlock}
            disabled={isSubmitting || pinInput.length === 0}
            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md ${
              pinInput.length > 0 && !isSubmitting
                ? 'bg-[#c5a47e] text-neutral-950 hover:bg-[#b5946e]'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
            }`}
          >
            {isSubmitting ? (
              <RotateCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
            <span>Desbloquear Terminal</span>
          </button>

          <button
            onClick={logout}
            className="w-full py-2.5 bg-transparent hover:bg-rose-950/20 text-neutral-400 hover:text-rose-300 border border-transparent hover:border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Trocar de Utilizador / Encerrar Sessão</span>
          </button>
        </div>
      </div>
    </div>
  );
};
