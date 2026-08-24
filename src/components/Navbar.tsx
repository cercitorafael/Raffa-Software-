import React from 'react';
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
    setCurrentUser,
    switchRole,
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
  } = useApp();

  const roleLabels: Record<Role, { name: string; badge: string; color: string }> = {
    caixa: { name: 'Operador de Caixa', badge: 'POS', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    gerente: { name: 'Gerente de Loja', badge: 'GERÊNCIA', color: 'bg-[#c5a47e]/15 text-[#c5a47e] border-[#c5a47e]/30' },
    financeiro: { name: 'Diretor Financeiro', badge: 'FINANÇAS', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    rh: { name: 'Recursos Humanos', badge: 'RH', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    comprador: { name: 'Gestor de Compras', badge: 'PROCUREMENT', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
    admin: { name: 'Administrador Global', badge: 'ADMIN SGPS', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  };

  return (
    <header className="h-16 bg-[#0d0d0d] border-b border-[#262626] px-4 flex items-center justify-between z-30 sticky top-0 shadow-sm text-[#e5e5e5]">
      {/* Left: Dynamic Company Brand & Tenancy Selectors */}
      <div className="flex items-center space-x-3">
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
            <div className="w-10 h-10 rounded-full bg-[#141414] border-2 border-[#262626] group-hover:border-[#c5a47e] overflow-hidden flex items-center justify-center p-0.5 shadow-md transition-all duration-200 group-hover:scale-105">
              <img
                src={currentCompany.logoUrl}
                alt={currentCompany.tradeName || currentCompany.name}
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#c5a47e]/15 border-2 border-[#c5a47e]/40 group-hover:border-[#c5a47e] text-[#c5a47e] flex items-center justify-center font-bold shadow-md transition-all duration-200 group-hover:scale-105">
              <Building2 className="w-5 h-5 text-[#c5a47e]" />
            </div>
          )}
        </button>

        <div className="h-6 w-px bg-[#262626] mx-1 hidden md:block" />

        {/* Company / Tenant Selector */}
        <div className="hidden lg:flex items-center bg-[#141414] border border-[#262626] rounded-md px-2.5 py-1 space-x-1.5 text-xs text-[#e5e5e5]">
          <Building2 className="w-3.5 h-3.5 text-[#c5a47e]" />
          <select
            value={currentCompany.id}
            onChange={(e) => {
              const comp = companies.find((c) => c.id === e.target.value);
              if (comp) setCurrentCompany(comp);
            }}
            className="bg-transparent border-none text-xs font-medium text-[#e5e5e5] focus:outline-hidden cursor-pointer [&>option]:bg-[#141414] [&>option]:text-[#e5e5e5]"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#141414] text-[#e5e5e5]">
                {c.name} ({c.taxNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Store Selector */}
        <div className="hidden sm:flex items-center bg-[#141414] border border-[#262626] rounded-md px-2.5 py-1 space-x-1.5 text-xs text-[#e5e5e5]">
          <StoreIcon className="w-3.5 h-3.5 text-emerald-400" />
          <select
            value={currentStore.id}
            onChange={(e) => {
              const st = stores.find((s) => s.id === e.target.value);
              if (st) setCurrentStore(st);
            }}
            className="bg-transparent border-none text-xs font-medium text-[#e5e5e5] focus:outline-hidden cursor-pointer [&>option]:bg-[#141414] [&>option]:text-[#e5e5e5]"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#141414] text-[#e5e5e5]">
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        {/* Terminal Selector */}
        <div className="hidden xl:flex items-center bg-[#141414] border border-[#262626] rounded-md px-2.5 py-1 space-x-1.5 text-xs text-[#e5e5e5]">
          <Monitor className="w-3.5 h-3.5 text-[#c5a47e]" />
          <select
            value={currentTerminal.id}
            onChange={(e) => {
              const term = terminals.find((t) => t.id === e.target.value);
              if (term) setCurrentTerminal(term);
            }}
            className="bg-transparent border-none text-xs font-medium text-[#e5e5e5] focus:outline-hidden cursor-pointer [&>option]:bg-[#141414] [&>option]:text-[#e5e5e5]"
          >
            {terminals.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#141414] text-[#e5e5e5]">
                {t.code} - {t.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5">
        {/* Quick Price Checker & SAF-T Buttons */}
        <div className="hidden md:flex items-center space-x-1.5">
          <button
            onClick={() => setShowPriceCheckerModal(true)}
            title="Consultar Preço & Scanner de Artigos"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium border bg-[#141414] hover:bg-[#1f1f1f] border-[#262626] text-neutral-300 transition-all cursor-pointer"
          >
            <Barcode className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Preços & Stock</span>
          </button>

          <button
            onClick={() => setShowFiscalAuditModal(true)}
            title="Auditoria e Validador SAF-T (PT)"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium border bg-[#141414] hover:bg-[#1f1f1f] border-[#262626] text-neutral-300 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">SAF-T PT</span>
          </button>
        </div>

        {/* Offline / Online Switcher, Database Diagnostics & Queue Indicator */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowOfflineSyncModal(true)}
            title="Gestor de Resiliência Offline & IndexedDB"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border bg-[#141414] hover:bg-[#1f1f1f] border-[#262626] text-neutral-300 transition-all cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-[#c5a47e]" />
            <span className="hidden sm:inline">Offline & IDB</span>
          </button>

          <button
            onClick={() => setIsOnline(!isOnline)}
            title={isOnline ? 'Online (Conectado ao Backend Central). Clique para alternar.' : 'Modo Offline (Operando via IndexedDB). Clique para alternar.'}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Online</span>
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
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#c5a47e] text-black font-semibold rounded-md text-xs hover:bg-[#d4b896] active:scale-95 transition-all shadow-xs cursor-pointer"
              title="Sincronizar vendas offline pendentes com a nuvem central"
            >
              <RotateCw className={`w-3 h-3 text-black ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : `Sync (${syncQueue.length})`}</span>
            </button>
          )}
        </div>

        {/* Cash Register Shift Button */}
        <button
          onClick={onOpenShiftModal}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            activeShift
              ? 'bg-[#141414] text-[#e5e5e5] border-[#262626] hover:bg-[#1a1a1a]'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
          }`}
          title="Gestão de Turno de Caixa (Abertura, Sangria, Suprimento, Fecho Z)"
        >
          <Wallet className="w-3.5 h-3.5 text-[#c5a47e]" />
          <span className="hidden md:inline">{activeShift ? 'Caixa Aberto' : 'Caixa Fechado'}</span>
          {activeShift && (
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="relative p-2 rounded-md border text-xs font-medium bg-[#141414] border-[#262626] text-neutral-300 hover:text-[#c5a47e] hover:border-[#c5a47e]/40 hover:bg-[#1a1a1a] transition-all cursor-pointer shadow-xs"
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
          className={`relative p-2 rounded-md border text-xs font-medium transition-colors ${
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

        {/* User Role Switcher (RBAC Simulation) */}
        <div className="flex items-center space-x-2 pl-1 border-l border-[#262626]">
          <div className="relative group">
            <button className="flex items-center space-x-2 p-1 rounded-md hover:bg-[#1a1a1a] transition-colors">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-[#c5a47e]/40"
              />
              <div className="text-left hidden lg:block">
                <p className="text-xs font-medium text-[#e5e5e5] leading-tight">{currentUser.name}</p>
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

            {/* Quick Role Switcher & User Management Dropdown */}
            <div className="absolute right-0 mt-1 w-72 bg-[#141414] rounded-lg shadow-2xl border border-[#262626] py-2 hidden group-hover:block group-focus-within:block z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-[#262626] flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">
                    Sessão Atual
                  </p>
                  <p className="text-xs text-neutral-200 font-semibold">{currentUser.name}</p>
                  <p className="text-[11px] text-neutral-400 font-mono">@{currentUser.username}</p>
                </div>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${roleLabels[currentUser.role]?.color}`}>
                  {roleLabels[currentUser.role]?.badge}
                </span>
              </div>

              {/* Direct Link to User Management */}
              <div className="p-2 border-b border-[#262626] space-y-1.5">
                <button
                  onClick={() => setActiveNavTab('users')}
                  className="w-full py-1.5 px-3 bg-[#1a1a1a] hover:bg-[#222222] text-[#c5a47e] border border-[#c5a47e]/30 rounded-md text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Gestão de Utilizadores</span>
                </button>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={lockScreen}
                    className="py-1.5 px-2 bg-[#1a1a1a] hover:bg-amber-950/30 text-amber-400 hover:text-amber-300 border border-[#262626] hover:border-amber-500/30 rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Bloquear</span>
                  </button>
                  <button
                    onClick={logout}
                    className="py-1.5 px-2 bg-[#1a1a1a] hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 border border-[#262626] hover:border-rose-500/30 rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Terminar</span>
                  </button>
                </div>
              </div>

              <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">
                Simular Perfil / RBAC
              </div>

              {(['admin', 'gerente', 'caixa', 'financeiro', 'rh', 'comprador'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#1a1a1a] transition-colors cursor-pointer ${
                    currentUser?.role === r ? 'bg-[#c5a47e]/15 font-semibold text-[#c5a47e]' : 'text-neutral-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Shield className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{roleLabels[r]?.name || r}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-xs border ${roleLabels[r]?.color || 'border-neutral-700 text-neutral-300'}`}>
                    {roleLabels[r]?.badge || r}
                  </span>
                </button>
              ))}

              <div className="px-3 pt-2 pb-1 border-t border-[#262626] text-[10px] uppercase tracking-widest font-semibold text-neutral-400">
                Alternar Utilizador da Equipa
              </div>

              <div className="max-h-36 overflow-y-auto px-1 space-y-0.5">
                {(users || []).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUser(u);
                      switchRole(u.roleId as Role);
                    }}
                    className={`w-full text-left px-2 py-1.5 text-[11px] rounded flex items-center justify-between hover:bg-[#1f1f1f] cursor-pointer transition-colors ${
                      currentUser?.id === u.id ? 'bg-[#c5a47e]/10 text-[#c5a47e] font-semibold' : 'text-neutral-300'
                    }`}
                  >
                    <div className="truncate">
                      <span>{u.name}</span>
                      <span className="text-[10px] text-neutral-500 ml-1 font-mono">(@{u.username})</span>
                    </div>
                    <span className="text-[9px] text-neutral-400 capitalize font-mono">{u.roleId}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
