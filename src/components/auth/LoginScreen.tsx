import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  KeyRound,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  RotateCw,
  CheckCircle2,
  ShieldAlert,
  Building2,
  Sparkles,
  PlusCircle,
  ArchiveRestore,
} from 'lucide-react';
import { User, Role } from '../../types';
import { sound } from '../../utils/audio';
import { isCompanyDeleted } from '../../utils/companyDeletion';
import { RegisterCompanyModal } from './RegisterCompanyModal';
import { RestoreCompanyModal } from './RestoreCompanyModal';

export const LoginScreen: React.FC = () => {
  const {
    users,
    companies,
    currentCompany,
    stores,
    currentStore,
    currentTerminal,
    activeShift,
    formatCurrency,
    login,
    loginWithPin,
    language,
    toggleLanguage,
    t,
  } = useApp();

  // Modes:
  // - 'credentials': User & Password form
  // - 'pin': POS Touch Numeric Keypad
  const [authMode, setAuthMode] = useState<'credentials' | 'pin'>('credentials');
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);

  // Credentials Mode State
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);

  // PIN Touch Mode State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const uniqueUsers = useMemo(() => {
    const seen = new Set<string>();
    return (users || []).filter((u) => {
      if (!u || !u.id || seen.has(u.id)) return false;
      if (isCompanyDeleted(u.companyId)) return false;
      const compExists = (companies || []).some(
        (c) => c.id === u.companyId && !isCompanyDeleted(c.id, c.name)
      );
      if (!compExists) return false;
      seen.add(u.id);
      return true;
    });
  }, [users, companies]);

  // Dynamic automatic identification of user and company (strictly active companies)
  const detectedUser = useMemo(() => {
    const clean = identifier.trim().toLowerCase();
    if (!clean) return null;
    return (users || []).find((u) => {
      if (isCompanyDeleted(u.companyId)) return false;
      const compExists = (companies || []).some(
        (c) => c.id === u.companyId && !isCompanyDeleted(c.id, c.name)
      );
      if (!compExists) return false;
      return (
        u.email?.toLowerCase() === clean ||
        (u.username && u.username.toLowerCase() === clean) ||
        (u.name && u.name.toLowerCase() === clean) ||
        (clean === 'admin' && u.role === 'admin') ||
        (clean === 'caixa' && u.role === 'caixa') ||
        (clean === 'gerente' && u.role === 'gerente') ||
        (clean === 'financeiro' && u.role === 'financeiro') ||
        (clean === 'rh' && u.role === 'rh') ||
        (clean === 'compras' && u.role === 'comprador')
      );
    }) || null;
  }, [identifier, users, companies]);

  const detectedCompany = useMemo(() => {
    if (!detectedUser || !detectedUser.companyId) return null;
    if (isCompanyDeleted(detectedUser.companyId)) return null;
    return (
      (companies || []).find((c) => c.id === detectedUser.companyId && !isCompanyDeleted(c.id, c.name)) || null
    );
  }, [detectedUser, companies]);

  // Keyboard navigation for PIN mode
  useEffect(() => {
    if (authMode !== 'pin') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (pinInput.length < 10) {
          sound.playBeep();
          setPinInput((prev) => prev + e.key.toUpperCase());
          setPinError(null);
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        setPinInput((prev) => prev.slice(0, -1));
        setPinError(null);
      } else if (e.key === 'Enter') {
        if (pinInput.length > 0) {
          handlePinSubmit();
        }
      } else if (e.key === 'Escape') {
        setPinInput('');
        setPinError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authMode, pinInput, selectedUser]);

  // Role metadata
  const roleBadges: Record<string, { name: string; badge: string; color: string; desc: string }> = {
    admin: {
      name: t('roles.admin'),
      badge: t('roles.adminBadge'),
      color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      desc: 'Gestão total, parametrização fiscal AT e auditoria',
    },
    gerente: {
      name: t('roles.gerente'),
      badge: t('roles.gerenteBadge'),
      color: 'bg-[#c5a47e]/20 text-[#c5a47e] border-[#c5a47e]/40',
      desc: 'Operações de loja, stocks, relatórios e turnos de caixa',
    },
    caixa: {
      name: t('roles.caixa'),
      badge: t('roles.caixaBadge'),
      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      desc: 'Emissão de faturas, abertura/fecho de caixa e fidelização',
    },
    financeiro: {
      name: t('roles.financeiro'),
      badge: t('roles.financeiroBadge'),
      color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      desc: 'Tesouraria, contabilidade, reconciliação e SAF-T',
    },
    rh: {
      name: t('roles.rh'),
      badge: t('roles.rhBadge'),
      color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      desc: 'Gestão de colaboradores, assiduidade e salários',
    },
    comprador: {
      name: t('roles.comprador'),
      badge: t('roles.compradorBadge'),
      color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      desc: 'Fornecedores, requisições e receção de mercadorias',
    },
  };

  // Submit Standard Credentials (Login + Password)
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialsError(null);

    const cleanIdent = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanIdent) {
      setCredentialsError(t('auth.usernameOrEmail'));
      sound.playError();
      return;
    }

    if (isCompanyDeleted(cleanIdent)) {
      setCredentialsError('A empresa vinculada a este identificador foi eliminada do sistema. O acesso e as credenciais foram revogados permanentemente.');
      sound.playError();
      return;
    }

    if (!cleanPass) {
      setCredentialsError(t('auth.passwordField'));
      sound.playError();
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login({
        identifier: cleanIdent,
        pinOrPassword: cleanPass,
      });

      if (!result.success) {
        setCredentialsError(result.error || t('auth.invalidCredentialsError'));
      }
    } catch (err: any) {
      setCredentialsError(t('auth.validationError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Touchscreen PIN
  const handlePinSubmit = () => {
    if (!selectedUser) {
      setPinError(t('auth.selectOperatorFirst'));
      sound.playError();
      return;
    }

    if (!pinInput.trim()) {
      setPinError(t('auth.enterSecurityPin'));
      sound.playError();
      return;
    }

    setIsSubmitting(true);
    setPinError(null);

    setTimeout(() => {
      const result = loginWithPin(
        pinInput.trim(),
        selectedUser.id
      );

      if (!result.success) {
        setPinError(result.error || t('auth.invalidPin'));
        setPinInput('');
      }
      setIsSubmitting(false);
    }, 250);
  };

  const handleKeypadPress = (digit: string) => {
    if (pinInput.length < 8) {
      sound.playBeep();
      setPinInput((prev) => prev + digit);
      setPinError(null);
    }
  };

  const handleKeypadBackspace = () => {
    sound.playBeep();
    setPinInput((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const handleKeypadClear = () => {
    sound.playBeep();
    setPinInput('');
    setPinError(null);
  };

  return (
    <div className="min-h-screen w-screen bg-[#070707] text-[#e5e5e5] flex flex-col justify-center items-center p-4 md:p-8 overflow-y-auto select-none">
      {/* Main Authentication Container */}
      <main className="w-full flex flex-col items-center justify-center max-w-2xl">
        {/* Top Header Mode Switcher Bar */}
        <div className="w-full mb-3 flex items-center justify-between bg-[#121212] border border-[#242424] p-1.5 rounded-2xl">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('credentials');
                setCredentialsError(null);
                sound.playBeep();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                authMode === 'credentials'
                  ? 'bg-[#c5a47e] text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>{t('auth.generalErpAccess')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('pin');
                setPinError(null);
                sound.playBeep();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                authMode === 'pin'
                  ? 'bg-[#c5a47e] text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{t('auth.posOperatorPin')}</span>
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Language Switcher */}
            <button
              id="login-language-toggle-btn"
              type="button"
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1a1a1a] text-neutral-300 hover:text-[#c5a47e] hover:bg-[#222222] border border-[#2a2a2a] transition-all cursor-pointer flex items-center space-x-1.5"
              title={t('header.switchTo', { lang: language === 'pt' ? 'English (🇬🇧)' : 'Português (🇲🇿)' })}
            >
              <span>{language === 'pt' ? '🇲🇿' : '🇬🇧'}</span>
              <span className="font-mono uppercase font-bold text-[11px]">{language}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowRegisterModal(true);
                sound.playBeep();
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#c5a47e]/15 text-[#c5a47e] hover:bg-[#c5a47e]/25 border border-[#c5a47e]/40 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t('auth.registerCompanyBtn')}</span>
            </button>
          </div>
        </div>

        {/* Multi-tenant Commercial Pitch Bar */}
        <div className="w-full mb-3 p-3 bg-gradient-to-r from-[#181818] via-[#141414] to-[#181818] border border-[#262626] rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c5a47e]/20 border border-[#c5a47e]/40 flex items-center justify-center text-[#c5a47e] shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-200">
                {t('auth.multiTenantBannerTitle')}
              </p>
              <p className="text-[11px] text-neutral-400">
                {t('auth.multiTenantBannerDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowRegisterModal(true);
              sound.playBeep();
            }}
            className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#c5a47e] text-neutral-950 text-xs font-bold hover:bg-[#b5946e] transition-all cursor-pointer shadow-sm shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('auth.createNewCompany')}</span>
          </button>
        </div>

        <div className="w-full bg-[#121212] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all">
          {/* ================= MODE 1: LOGIN & SENHA (CREDENTIALS ERP) ================= */}
          {authMode === 'credentials' && (
            <div className="p-6 md:p-8">
              {credentialsError && (
                <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start space-x-2.5 animate-in fade-in duration-200">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block">Falha de Autenticação</span>
                    <span>{credentialsError}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-xs">
                {/* Identifier Input */}
                <div>
                  <label className="text-neutral-300 font-semibold block mb-1.5">
                    Nome de Utilizador ou Email *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        setCredentialsError(null);
                      }}
                      placeholder="ex: utilizador ou email"
                      className="w-full pl-10 pr-3 py-2.5 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 placeholder:text-neutral-600 font-medium focus:outline-hidden focus:border-[#c5a47e] focus:ring-1 focus:ring-[#c5a47e]/30 transition-all text-sm"
                    />
                  </div>

                  {/* Real-time Detected Company Badge */}
                  {detectedCompany && (
                    <div className="mt-2 p-2.5 bg-[#c5a47e]/10 border border-[#c5a47e]/30 rounded-xl flex items-center justify-between animate-in fade-in duration-200">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-6 h-6 rounded-lg bg-[#c5a47e]/20 flex items-center justify-center text-[#c5a47e] shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-[#c5a47e] tracking-wider block">
                            Empresa Vinculada
                          </span>
                          <span className="text-xs font-bold text-neutral-100 truncate block">
                            {detectedCompany.tradeName || detectedCompany.name}
                          </span>
                        </div>
                      </div>
                      {detectedCompany.taxNumber && (
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-black/50 text-neutral-300 border border-neutral-700 shrink-0">
                          NUIT: {detectedCompany.taxNumber}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Password Input */}
                <div>
                  <label className="text-neutral-300 font-semibold block mb-1.5">
                    Palavra-passe / Senha de Acesso *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setCredentialsError(null);
                      }}
                      placeholder="Digite a palavra-passe..."
                      className="w-full pl-10 pr-10 py-2.5 bg-[#0a0a0a] border border-[#282828] rounded-xl text-neutral-100 placeholder:text-neutral-600 font-mono font-medium focus:outline-hidden focus:border-[#c5a47e] focus:ring-1 focus:ring-[#c5a47e]/30 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-neutral-400 hover:text-white cursor-pointer"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Automatic Company Resolution Notice */}
                <div className="flex items-center space-x-2 text-[11px] text-neutral-400 bg-[#0a0a0a] p-2.5 rounded-xl border border-[#222222]">
                  <Building2 className="w-3.5 h-3.5 text-[#c5a47e] shrink-0" />
                  <span>
                    A sua empresa e filial são identificadas e carregadas automaticamente a partir do seu login.
                  </span>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting || !identifier.trim() || !password.trim()}
                  className={`w-full mt-3 py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-md ${
                    identifier.trim() && password.trim() && !isSubmitting
                      ? 'bg-[#c5a47e] text-neutral-950 hover:bg-[#b5946e] cursor-pointer active:scale-98'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                  }`}
                >
                  {isSubmitting ? (
                    <RotateCw className="w-4 h-4 animate-spin text-neutral-950" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'A Validar Credenciais...' : 'Entrar no Sistema ERP'}</span>
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('pin');
                      setPinError(null);
                      sound.playBeep();
                    }}
                    className="text-xs text-neutral-400 hover:text-[#c5a47e] transition-colors cursor-pointer"
                  >
                    Ou aceder com PIN de Operador POS &rarr;
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= MODE 2: POS OPERATOR PIN (TOUCH KEYPAD) ================= */}
          {authMode === 'pin' && (
            <div className="p-6 md:p-8 space-y-5">
              {pinError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start space-x-2.5 animate-in fade-in duration-200">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* Step 1: Select Operator */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-2">
                  1. Selecione o Colaborador
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {uniqueUsers.map((u) => {
                    const isSelected = selectedUser?.id === u.id;
                    const roleInfo = (roleBadges && roleBadges[u.role]) || roleBadges?.caixa || {
                      name: u.role || 'Operador',
                      badge: String(u.role || 'POS').toUpperCase(),
                      color: 'bg-neutral-800 text-neutral-300 border-neutral-700',
                      desc: '',
                    };

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setPinInput('');
                          setPinError(null);
                          sound.playBeep();
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-2.5 ${
                          isSelected
                            ? 'bg-[#c5a47e]/20 border-[#c5a47e] ring-2 ring-[#c5a47e]/30 shadow-md'
                            : 'bg-[#0d0d0d] border-[#222222] hover:border-neutral-600 hover:bg-[#161616]'
                        }`}
                      >
                        <img
                          src={
                            u.avatarUrl ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                          }
                          alt={u.name}
                          className="w-8 h-8 rounded-full object-cover border border-[#2a2a2a]"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#e5e5e5] truncate">{u.name}</p>
                          <span
                            className={`inline-block text-[8px] px-1 py-0.2 rounded-xs border font-bold uppercase ${roleInfo.color}`}
                          >
                            {roleInfo.badge}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Confidential Numeric PIN Input */}
              <div className="bg-[#0b0b0b] p-4 rounded-xl border border-[#242424] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300">
                    2. Digite o PIN Confidencial
                  </label>
                  {selectedUser && (
                    <span className="text-xs text-[#c5a47e] font-medium truncate max-w-[200px]">
                      Operador: <strong>{selectedUser.name}</strong>
                    </span>
                  )}
                </div>

                {/* Masked PIN Display */}
                <div className="bg-[#121212] border border-[#262626] rounded-xl p-3 flex flex-col items-center justify-center min-h-[50px]">
                  <div className="flex items-center space-x-2.5">
                    {Array.from({ length: Math.max(6, pinInput.length) }).map((_, idx) => {
                      const isFilled = pinInput.length > idx;
                      return (
                        <div
                          key={idx}
                          className={`w-3 h-3 rounded-full transition-all duration-150 ${
                            isFilled
                              ? 'bg-[#c5a47e] scale-110 shadow-xs ring-4 ring-[#c5a47e]/20'
                              : 'bg-[#222222] border border-[#333333]'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* 3x4 Touch Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadPress(digit)}
                      className="h-11 bg-[#161616] hover:bg-[#202020] active:bg-[#c5a47e]/20 border border-[#262626] hover:border-neutral-600 rounded-xl text-base font-bold font-mono text-[#e5e5e5] active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-xs"
                    >
                      {digit}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleKeypadClear}
                    className="h-11 bg-[#161616] hover:bg-rose-950/30 text-rose-400 border border-[#262626] rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center"
                  >
                    Limpar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-11 bg-[#161616] hover:bg-[#202020] active:bg-[#c5a47e]/20 border border-[#262626] hover:border-neutral-600 rounded-xl text-base font-bold font-mono text-[#e5e5e5] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="h-11 bg-[#161616] hover:bg-amber-950/30 text-amber-400 border border-[#262626] rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center"
                    title="Apagar dígito"
                  >
                    ⌫
                  </button>
                </div>

                {/* Submit PIN */}
                <button
                  type="button"
                  disabled={isSubmitting || pinInput.length === 0 || !selectedUser}
                  onClick={handlePinSubmit}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md ${
                    pinInput.length > 0 && selectedUser && !isSubmitting
                      ? 'bg-[#c5a47e] text-neutral-950 hover:bg-[#b5946e] cursor-pointer'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                  }`}
                >
                  {isSubmitting ? (
                    <RotateCw className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'A Validar PIN...' : 'Confirmar PIN & Abrir Turno'}</span>
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('credentials');
                      setCredentialsError(null);
                      sound.playBeep();
                    }}
                    className="text-xs text-neutral-400 hover:text-[#c5a47e] transition-colors cursor-pointer"
                  >
                    Ou aceder com Utilizador e Palavra-passe &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botão de Restauração de Dados (Inferior / Em Baixo da Tela de Login) */}
        <div className="w-full mt-4 flex items-center justify-center">
          <button
            id="login-restore-company-btn"
            type="button"
            onClick={() => {
              setShowRestoreModal(true);
              sound.playBeep();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#121212] hover:bg-[#1a1a1a] text-neutral-400 hover:text-sky-400 border border-[#242424] hover:border-sky-500/40 transition-all cursor-pointer flex items-center space-x-2 shadow-sm active:scale-98"
            title="Restaurar dados para o sistema a partir de um dump JSON de segurança"
          >
            <ArchiveRestore className="w-3.5 h-3.5 text-sky-400" />
            <span>Restaurar Dados</span>
          </button>
        </div>
      </main>

      <RegisterCompanyModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={(data) => {
          setIdentifier(data.userEmail);
          setAuthMode('credentials');
        }}
      />

      <RestoreCompanyModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onSuccessRestore={(company, adminUser) => {
          if (adminUser) {
            setIdentifier(adminUser.email || adminUser.username || '');
            setAuthMode('credentials');
          }
        }}
      />
    </div>
  );
};
