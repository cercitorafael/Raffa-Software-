import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingBag,
  Boxes,
  Receipt,
  Users,
  Truck,
  HeartHandshake,
  BarChart3,
  TrendingUp,
  Activity,
  Settings,
  Package,
  UserCheck,
  Lock,
  LogOut,
  Store as StoreIcon,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeNavTab,
    setActiveNavTab,
    syncQueue,
    currentUser,
    omnichannelOrders,
    users,
    stores,
    lockScreen,
    logout,
    isSidebarCollapsed,
    toggleSidebar,
  } = useApp();

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const pendingOrdersCount = omnichannelOrders.filter(
    (o) => o.status === 'pendente' || o.status === 'pronto_levantamento'
  ).length;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Visão Geral & Métricas',
      icon: BarChart3,
      roles: ['gerente', 'financeiro', 'admin'],
    },
    {
      id: 'analytics',
      label: 'Relatórios Analíticos',
      icon: TrendingUp,
      badge: 'BI',
      shortBadge: 'BI',
      badgeColor: 'bg-[#c5a47e]/20 text-[#c5a47e]',
      roles: ['admin', 'gerente', 'financeiro', 'caixa', 'comprador', 'rh'],
    },
    {
      id: 'pos',
      label: 'Ponto de Venda (POS)',
      icon: ShoppingBag,
      badge: syncQueue.length > 0 ? `${syncQueue.length} offline` : undefined,
      shortBadge: syncQueue.length > 0 ? `${syncQueue.length}` : undefined,
      badgeColor: 'bg-amber-500 text-white',
      roles: ['caixa', 'gerente', 'admin'],
    },
    {
      id: 'documents',
      label: 'Gestão de Documentos',
      icon: FileSpreadsheet,
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} novos` : undefined,
      shortBadge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : undefined,
      badgeColor: 'bg-[#c5a47e] text-neutral-950',
      roles: ['caixa', 'gerente', 'financeiro', 'admin'],
    },
    {
      id: 'stores',
      label: 'Gestão de Lojas',
      icon: StoreIcon,
      badge: `${stores.length} lojas`,
      shortBadge: `${stores.length}`,
      badgeColor: 'bg-emerald-500/20 text-emerald-400',
      roles: ['gerente', 'admin', 'financeiro'],
    },
    {
      id: 'stock',
      label: 'Stock & Inventário',
      icon: Boxes,
      roles: ['gerente', 'comprador', 'admin'],
    },
    {
      id: 'finance',
      label: 'Financeiro & Faturação',
      icon: Receipt,
      roles: ['financeiro', 'gerente', 'admin'],
    },
    {
      id: 'hr',
      label: 'Recursos Humanos',
      icon: Users,
      roles: ['rh', 'gerente', 'admin'],
    },
    {
      id: 'procurement',
      label: 'Compras & Fornecedores',
      icon: Truck,
      roles: ['comprador', 'gerente', 'admin'],
    },
    {
      id: 'crm',
      label: 'CRM & Fidelização',
      icon: HeartHandshake,
      roles: ['gerente', 'caixa', 'admin'],
    },
    {
      id: 'users',
      label: 'Gestão de Utilizadores',
      icon: UserCheck,
      badge: `${users.length} ativos`,
      shortBadge: `${users.length}`,
      badgeColor: 'bg-[#c5a47e]/20 text-[#c5a47e]',
      roles: ['admin', 'gerente', 'rh', 'caixa', 'financeiro', 'comprador'],
    },
    {
      id: 'events',
      label: 'Barramento de Eventos',
      icon: Activity,
      roles: ['admin', 'gerente', 'financeiro'],
    },
    {
      id: 'settings',
      label: 'Definições & SAF-T',
      icon: Settings,
      roles: ['admin', 'gerente', 'financeiro', 'rh', 'caixa', 'comprador'],
    },
  ];

  return (
    <aside
      id="main-sidebar"
      className={`relative bg-[#0a0a0a] text-[#e5e5e5] flex flex-col shrink-0 border-r border-[#262626] select-none transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'w-[70px]' : 'w-64'
      }`}
    >
      {/* Sidebar Header with Toggle Arrow ↔ */}
      <div className="pt-3 pb-2 px-3 border-b border-[#262626]/50 flex items-center justify-between min-h-[44px]">
        {!isSidebarCollapsed ? (
          <>
            <span className="px-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-widest truncate">
              Módulos Integrados
            </span>
            <button
              id="sidebar-collapse-btn"
              onClick={toggleSidebar}
              className="p-1.5 rounded-md text-neutral-400 hover:text-[#c5a47e] hover:bg-[#141414] border border-transparent hover:border-[#c5a47e]/30 transition-all cursor-pointer flex items-center justify-center group"
              title="Encolher menu lateral (↔ / Ctrl+B)"
              aria-label="Encolher menu lateral"
            >
              <div className="flex items-center space-x-0.5 text-neutral-400 group-hover:text-[#c5a47e]">
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              </div>
            </button>
          </>
        ) : (
          <div className="w-full flex justify-center">
            <button
              id="sidebar-expand-btn"
              onClick={toggleSidebar}
              className="p-1.5 rounded-md text-neutral-400 hover:text-[#c5a47e] bg-[#141414] hover:bg-[#1c1c1c] border border-[#262626] hover:border-[#c5a47e]/50 transition-all cursor-pointer flex items-center justify-center group shadow-xs"
              title="Expandir menu lateral (↔ / Ctrl+B)"
              aria-label="Expandir menu lateral"
            >
              <ChevronRight className="w-4 h-4 text-[#c5a47e] transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNavTab === item.id;
          const hasAccess = item.roles.includes(currentUser.role) || currentUser.role === 'admin';

          if (isSidebarCollapsed) {
            return (
              <button
                key={item.id}
                id={`sidebar-item-${item.id}`}
                onClick={() => setActiveNavTab(item.id)}
                title={`${item.label}${item.badge ? ` (${item.badge})` : ''}${!hasAccess ? ' - Restrito' : ''}`}
                className={`relative w-full h-11 flex items-center justify-center rounded-lg transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-[#c5a47e]/15 text-[#c5a47e] border border-[#c5a47e]/40 shadow-xs'
                    : 'hover:bg-[#141414] hover:text-[#e5e5e5] text-neutral-400 border border-transparent'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-[#c5a47e]' : 'text-neutral-400 group-hover:text-neutral-200'
                    }`}
                  />
                  {item.shortBadge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold bg-[#c5a47e] text-neutral-950 flex items-center justify-center shadow-xs">
                      {item.shortBadge}
                    </span>
                  )}
                  {!hasAccess && (
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-neutral-600 ring-2 ring-[#0a0a0a]" />
                  )}
                </div>

                {/* Left Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#c5a47e]" />
                )}
              </button>
            );
          }

          return (
            <button
              key={item.id}
              id={`sidebar-item-${item.id}`}
              onClick={() => setActiveNavTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-[#c5a47e]/15 text-[#c5a47e] border border-[#c5a47e]/30 shadow-xs'
                  : 'hover:bg-[#141414] hover:text-[#e5e5e5] text-neutral-400 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#c5a47e]' : 'text-neutral-400 group-hover:text-neutral-200'
                  }`}
                />
                <span className="text-left font-medium truncate">{item.label}</span>
              </div>

              {item.badge ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[#c5a47e] text-black shrink-0">
                  {item.badge}
                </span>
              ) : !hasAccess ? (
                <span className="text-[9px] text-neutral-400 uppercase font-mono shrink-0">Restrito</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Operator Mini-Card & System Status */}
      <div className="p-2.5 bg-[#0d0d0d] border-t border-[#262626] space-y-2 text-[11px]">
        {/* User Card */}
        {!isSidebarCollapsed ? (
          <div className="flex items-center justify-between p-2 bg-[#141414] rounded-lg border border-[#262626]">
            <div className="flex items-center space-x-2 min-w-0">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60'}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-[#c5a47e]/40 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-neutral-200 truncate leading-tight">{currentUser.name}</p>
                <span className="text-[9px] font-mono text-[#c5a47e] uppercase block truncate">{currentUser.role}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={lockScreen}
                className="p-1.5 rounded-md text-neutral-400 hover:text-amber-400 hover:bg-amber-950/20 transition-colors cursor-pointer"
                title="Bloquear Terminal"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={logout}
                className="p-1.5 rounded-md text-neutral-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                title="Terminar Sessão"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div className="relative group/user cursor-pointer" title={`${currentUser.name} (${currentUser.role})`}>
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60'}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-[#c5a47e]/50"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0d0d0d]" />
            </div>
            <div className="flex items-center justify-center space-x-1">
              <button
                onClick={lockScreen}
                className="p-1 rounded-md text-neutral-400 hover:text-amber-400 hover:bg-amber-950/20 transition-colors cursor-pointer"
                title="Bloquear Terminal"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={logout}
                className="p-1 rounded-md text-neutral-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                title="Terminar Sessão"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* System Status Info */}
        {!isSidebarCollapsed ? (
          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono px-1">
            <span>SAF-T 1.04_01</span>
            <span className="text-[#c5a47e]">Cert. 4120/AT</span>
          </div>
        ) : (
          <div className="text-center text-[9px] text-[#c5a47e] font-mono" title="Certificado 4120/AT - SAF-T PT">
            4120/AT
          </div>
        )}
      </div>
    </aside>
  );
};

