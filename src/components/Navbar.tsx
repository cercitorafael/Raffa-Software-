import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Store as StoreIcon,
  Monitor,
  Wifi,
  WifiOff,
  Activity,
  UserCheck,
  RotateCw,
  Wallet,
  Shield,
  Layers,
  Database,
  Barcode,
  ShieldCheck,
  Sun,
  Moon,
  Palette,
  Sparkles,
  Lock,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Role } from '../types';

export const Navbar: React.FC<{ onOpenShiftModal: () => void }> = ({ onOpenShiftModal }) => {
  const {
    companies,
    currentCompany,
    setCurrentCompany,
    stores,
    currentStore,
    setCurrentStore,
    terminals,
    currentTerminal,
    setCurrentTerminal,
    users,
    currentUser,
    hasPermission,
    isOnline,
    setIsOnline,
    isSyncing,
    syncQueue,
    triggerManualSync,
    setShowOfflineSyncModal,
    activeShift,
    setShowEventDrawer,
    showEventDrawer,
    events,
    setShowPriceCheckerModal,
    setShowFiscalAuditModal,
    setActiveNavTab,
    theme,
    toggleTheme,
    setTheme,
    lockScreen,
    logout,
    isSidebarCollapsed,
    toggleSidebar,
    supabaseRealtimeStatus,
  } = useApp();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, []);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && !e.deltaX && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const roleLabels: Record<Role, { name: string; badge: string; color: string }> = {
    caixa: { name: 'Operador de Caixa', badge: 'POS', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    gerente: { name: 'Gerente de Loja', badge: 'GERÊNCIA', color: 'bg-[#c5a47e]/15 text-[#c5a47e] border-[#c5a47e]/30' },
    financeiro: { name: 'Diretor Financeiro', badge: 'FINANÇAS', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    rh: { name: 'Recursos Humanos', badge: 'RH', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    comprador: { name: 'Gestor de Compras', badge: 'PROCUREMENT', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
    admin: { name: 'Administrador Global', badge: 'ADMIN SGPS', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  };

  return (
    <header className="h-16 bg-[#0d0d0d] border-b border-[#262626] px-3 sm:px-4 flex items-center justify-between z-30 sticky top-0 shadow-sm text-[#e5e5e5] gap-2">
      {/* Left: Dynamic Company Brand & Pinned Logo */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Toggle Sidebar Button (↔) */}
        <button
          id="navbar-toggle-sidebar-btn"
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-neutral-400 hover:text-[#c5a47e] bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] hover:border-[#c5a47e]/40 transition-all cursor-pointer shadow-xs flex items-center justify-center"
          title={isSidebarCollapsed ? "Expandir Menu Lateral (↔ / Ctrl+B)" : "Encolher Menu Lateral (↔ / Ctrl+B)"}
          aria-label="Alternar Menu Lateral"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-[#c5a47e]" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-neutral-300" />
          )}
        </button>

        <button
          id="navbar-company-logo-btn"
          onClick={() => setActiveNavTab('settings')}
          className="relative group cursor-pointer focus:outline-hidden"
          title={`${currentCompany?.tradeName || currentCompany?.name || 'Definições da Empresa'} • NIF ${currentCompany?.taxNumber || '509823410'}`}
          aria-label="Logotipo da Empresa - Abrir Definições"
        >
          {currentCompany?.logoUrl ? (
            <div className="w-9 h-9 rounded-full bg-[#141414] border-2 border-[#262626] group-hover:border-[#c5a47e] overflow-hidden flex items-center justify-center p-0.5 shadow-md transition-all duration-200 group-hover:scale-105">
              <img
                src={currentCompany.logoUrl}
                alt={currentCompany.tradeName || currentCompany.name}
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#c5a47e]/15 border-2 border-[#c5a47e]/40 group-hover:border-[#c5a47e] text-[#c5a47e] flex items-center justify-center font-bold shadow-md transition-all duration-200 group-hover:scale-105">
              <Building2 className="w-4.5 h-4.5 text-[#c5a47e]" />
            </div>
          )}
        </button>

        <div className="h-6 w-px bg-[#262626] mx-0.5" />
      </div>

      {/* Middle: Horizontally Scrollable Bar with All Selectors & Tools */}
      <div className="flex-1 min-w-0 relative flex items-center">
        {/* Left Scroll Arrow */}
        {canScrollLeft && (
          <button
            onClick={handleScrollLeft}
            className="absolute left-0 z-10 p-1.5 bg-[#141414]/90 hover:bg-[#202020] text-[#c5a47e] border border-[#2e2e2e] rounded-full shadow-lg transition-all cursor-pointer backdrop-blur-xs"
            title="Rolar para a esquerda"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Scrollable Container with Custom Scrollbar */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollability}
          onWheel={handleWheel}
          className="w-full custom-horizontal-scrollbar flex items-center space-x-2.5 py-2 px-1 scroll-smooth"
        >
          {/* Registered Company Display (Locked to registered user company - no switching allowed) */}
          <div
  id="navbar-company-display"
  className="flex items-center bg-[#141414] border border-[#262626] rounded-lg px-2.5 py-1 space-x-2 text-xs text-[#e5e5e5] shrink-0 select-none shadow-xs"
  title={`Empresa Registada: ${currentCompany.name} (NUIT: ${currentCompany.taxNumber})`}
>
  <Building2 className="w-3.5 h-3.5 text-[#c5a47e] shrink-0" />
  <div className="flex items-center space-x-1.5 max-w-[220px]">
    <span className="font-semibold text-[#e5e5e5] truncate">
      {currentCompany.tradeName || currentCompany.name}
    </span>
    {currentCompany.taxNumber && (
      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#c5a47e]/15 text-[#c5a47e]">
        {currentCompany.taxNumber}
      </span>
    )}
  </div>
</div>

          {/* Store Selector */}
          <div className="flex items-center bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#383838] rounded-lg px-2.5 py-1 space-x-1.5 text-xs text-[#e5e5e5] shrink-0 transition-colors">
            <StoreIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={currentStore.id}
              onChange={(e) => {
                const st = stores.find((s) => s.id === e.target.value);
                if (st) setCurrentStore(st);
              }}
              className="bg-transparent border-none text-xs font-medium text-[#e5e5e5] focus:outline-hidden cursor-pointer [&>option]:bg-[#141414] [&>option]:text-[#e5e5e5] max-w-[180px] truncate"
              title={`Loja / Armazém Ativo: ${currentStore.name}`}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#141414] text-[#e5e5e5]">
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Terminal Selector */}
          <div className="flex items-center bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#383838] rounded-lg px-2.5 py-1 space-x-1.5 text-xs text-[#e5e5e5] shrink-0 transition-colors">
            <Monitor className="w-3.5 h-3.5 text-[#c5a47e] shrink-0" />
            <select
              value={currentTerminal.id}
              onChange={(e) => {
                const term = terminals.find((t) => t.id === e.target.value);
                if (term) setCurrentTerminal(term);
              }}
              className="bg-transparent border-none text-xs font-medium text-[#e5e5e5] focus:outline-hidden cursor-pointer [&>option]:bg-[#141414] [&>option]:text-[#e5e5e5] max-w-[180px] truncate"
              title={`Terminal Ativo: ${currentTerminal.code} - ${currentTerminal.description}`}
            >
              {terminals.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#141414] text-[#e5e5e5]">
                  {t.code} - {t.description}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Price Checker & SAF-T PT */}
          <button
            onClick={() => setShowPriceCheckerModal(true)}
            title="Consultar Preço & Scanner de Artigos"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-[#141414] hover:bg-[#1f1f1f] border-[#262626] hover:border-[#383838] text-neutral-300 transition-all cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
          >
            <Barcode className="w-3.5 h-3.5 text-amber-400" />
            <span>Preços & Stock</span>
          </button>

          <button
            onClick={() => setShowFiscalAuditModal(true)}
            title="Auditoria e Validador SAF-T (PT)"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-[#141414] hover:bg-[#1f1f1f] border-[#262626] hover:border-[#383838] text-neutral-300 transition-all cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>SAF-T PT</span>
          </button>

          {/* Offline / Online Switcher & Diagnostic */}
          <button
            onClick={() => setShowOfflineSyncModal(true)}
            title="Gestor de Resiliência Offline & IndexedDB"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-[#141414] hover:bg-[#1f1f1f] border-[#262626] hover:border-[#383838] text-neutral-300 transition-all cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
          >
            <Database className="w-3.5 h-3.5 text-[#c5a47e]" />
            <span>Offline & IDB</span>
          </button>

          {/* Supabase Realtime Live Status Button */}
          <button
            onClick={() => setActiveNavTab('supabase')}
            title={`Supabase Realtime: ${supabaseRealtimeStatus === 'connected' ? '🟢 Conectado em direto (escutando INSERT/UPDATE/DELETE)' : supabaseRealtimeStatus === 'connecting' ? '🟡 A conectar...' : '🔴 Desconectado'}. Clique para abrir o Painel Supabase.`}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer shrink-0 whitespace-nowrap shadow-xs ${
              supabaseRealtimeStatus === 'connected'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : supabaseRealtimeStatus === 'connecting'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseRealtimeStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : supabaseRealtimeStatus === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-400'
              }`}
            />
            <span className="font-medium">
              Supabase Realtime
            </span>
          </button>

          <button
            onClick={() => setIsOnline(!isOnline)}
            title={isOnline ? 'Online (Conectado ao Backend Central). Clique para alternar.' : 'Modo Offline (Operando via IndexedDB). Clique para alternar.'}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer shrink-0 whitespace-nowrap shadow-xs ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline</span>
              </>
            )}
          </button>

          {syncQueue.length > 0 && (
            <button
              onClick={triggerManualSync}
              disabled={isSyncing}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#c5a47e] text-black font-semibold rounded-lg text-xs hover:bg-[#d4b896] active:scale-95 transition-all shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
              title="Sincronizar vendas offline pendentes com a nuvem central"
            >
              <RotateCw className={`w-3.5 h-3.5 text-black ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : `Sync (${syncQueue.length})`}</span>
            </button>
          )}

          {/* Cash Register Shift Button */}
          <button
            onClick={onOpenShiftModal}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 whitespace-nowrap shadow-xs ${
              activeShift
                ? 'bg-[#141414] text-[#e5e5e5] border-[#262626] hover:bg-[#1a1a1a]'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
            }`}
            title="Gestão de Turno de Caixa (Abertura, Sangria, Suprimento, Fecho Z)"
          >
            <Wallet className="w-3.5 h-3.5 text-[#c5a47e]" />
            <span>{activeShift ? 'Caixa Aberto' : 'Caixa Fechado'}</span>
            {activeShift && (
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border text-xs font-medium bg-[#141414] border-[#262626] text-neutral-300 hover:text-[#c5a47e] hover:border-[#c5a47e]/40 hover:bg-[#1a1a1a] transition-all cursor-pointer shadow-xs shrink-0"
            title={`Trocar Tema Atual: ${theme === 'dark' ? 'Noir Dourado' : theme === 'light' ? 'Executivo Claro' : theme === 'midnight' ? 'Azul Meia-Noite' : 'Verde Esmeralda'}`}
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500 animate-in spin-in-180 duration-300" />
            ) : theme === 'midnight' ? (
              <Sparkles className="w-4 h-4 text-sky-400 animate-in spin-in-180 duration-300" />
            ) : theme === 'emerald' ? (
              <Palette className="w-4 h-4 text-emerald-400 animate-in spin-in-180 duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-[#c5a47e] animate-in spin-in-180 duration-300" />
            )}
          </button>

          {/* Event Bus Live Stream Trigger */}
          <button
            onClick={() => setShowEventDrawer(!showEventDrawer)}
            className={`relative p-2 rounded-lg border text-xs font-medium transition-colors shrink-0 ${
              showEventDrawer
                ? 'bg-[#c5a47e]/15 border-[#c5a47e]/40 text-[#c5a47e]'
                : 'bg-[#141414] border-[#262626] text-neutral-400 hover:text-[#e5e5e5] hover:bg-[#1a1a1a]'
            }`}
            title="Ver Barramento de Eventos (Event-Driven Streaming)"
          >
            <Activity className="w-4 h-4 text-[#c5a47e]" />
            {events.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#c5a47e] text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {events.length > 9 ? '9+' : events.length}
              </span>
            )}
          </button>
        </div>

        {/* Right Scroll Arrow */}
        {canScrollRight && (
          <button
            onClick={handleScrollRight}
            className="absolute right-0 z-10 p-1.5 bg-[#141414]/90 hover:bg-[#202020] text-[#c5a47e] border border-[#2e2e2e] rounded-full shadow-lg transition-all cursor-pointer backdrop-blur-xs"
            title="Rolar para a direita"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right: Pinned User Role Switcher & Profile Dropdown */}
      <div className="flex items-center shrink-0 pl-1 border-l border-[#262626]">
        <div className="relative group">
          <button className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-[#1a1a1a] transition-colors cursor-pointer">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover border border-[#c5a47e]/40 shrink-0"
            />
            <div className="text-left hidden sm:block">
              <p className="text-xs font-medium text-[#e5e5e5] leading-tight max-w-[110px] truncate">{currentUser.name}</p>
              <div className="flex items-center space-x-1">
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-xs border ${
                    roleLabels[currentUser.role]?.color || 'bg-[#141414] text-neutral-400 border-[#262626]'
                  }`}
                >
                  {roleLabels[currentUser.role]?.badge || currentUser.role}
                </span>
              </div>
            </div>
          </button>

          {/* Authenticated User Session & Security Dropdown (No Simulation) */}
          <div className="absolute right-0 mt-1 w-80 bg-[#141414] rounded-xl shadow-2xl border border-[#262626] py-2 hidden group-hover:block group-focus-within:block z-50 animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-3 border-b border-[#262626]">
              <div className="flex items-center space-x-3">
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#c5a47e]/40 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-200 font-bold truncate">{currentUser.name}</p>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${roleLabels[currentUser.role]?.color}`}>
                      {roleLabels[currentUser.role]?.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-mono">@{currentUser.username || 'utilizador'}</p>
                  <p className="text-[10px] text-neutral-500 truncate">{currentUser.email}</p>
                </div>
              </div>

              {/* Context Details */}
              <div className="mt-2.5 pt-2 border-t border-[#202020] grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-neutral-500 block">Loja Afeta:</span>
                  <span className="text-neutral-300 font-medium truncate block">{currentStore?.name || 'Loja Principal'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Terminal:</span>
                  <span className="text-neutral-300 font-medium truncate block">{currentTerminal?.name || 'POS-01'}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-2 space-y-1.5">
              {(currentUser.role === 'admin' || hasPermission('users', 'read')) && (
                <button
                  onClick={() => setActiveNavTab('users')}
                  className="w-full py-2 px-3 bg-[#1a1a1a] hover:bg-[#222222] text-[#c5a47e] border border-[#c5a47e]/30 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
                >
                  <UserCheck className="w-4 h-4 text-[#c5a47e]" />
                  <span>Gestão de Utilizadores & Acessos</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={lockScreen}
                  className="py-2 px-2 bg-[#1a1a1a] hover:bg-amber-950/30 text-amber-400 hover:text-amber-300 border border-[#262626] hover:border-amber-500/30 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  title="Bloquear terminal com código PIN"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bloquear Terminal</span>
                </button>
                <button
                  onClick={logout}
                  className="py-2 px-2 bg-[#1a1a1a] hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 border border-[#262626] hover:border-rose-500/30 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  title="Encerrar sessão de forma segura"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Terminar Sessão</span>
                </button>
              </div>
            </div>

            {/* Strict Authentication Note */}
            <div className="mx-2 mt-1 p-2 bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg text-[10px] text-neutral-400 flex items-start space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-tight">
                Sessão com autenticação individual e trilha de auditoria AT. A troca de perfil exige novo login com credenciais/PIN.
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
