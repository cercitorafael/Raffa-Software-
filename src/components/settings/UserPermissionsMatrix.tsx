import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Role, UserPermissions, ModulePermission, User } from '../../types';
import { defaultPermissionsByRole } from '../../mockData';
import {
  ShieldCheck,
  Lock,
  Unlock,
  UserCheck,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  Users,
  Building2,
  Receipt,
  ShoppingBag,
  Boxes,
  Truck,
  HeartHandshake,
  Settings,
  Store,
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react';

interface ModuleDef {
  key: keyof UserPermissions;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const UserPermissionsMatrix: React.FC = () => {
  const {
    users,
    currentUser,
    updateUserPermissions,
    roles,
    updateRolePermissions,
    notify
  } = useApp();

  const [selectedTargetType, setSelectedTargetType] = useState<'role' | 'user'>('role');
  const [selectedRoleId, setSelectedRoleId] = useState<Role>('caixa');
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || 'usr-admin');

  // Selected User Object
  const targetUser: User | undefined = users.find((u) => u.id === selectedUserId);

  // Active permissions object being edited
  const [currentPermissions, setCurrentPermissions] = useState<UserPermissions>(() => {
    return defaultPermissionsByRole['caixa'];
  });

  // Operational restrictions state
  const [maxDiscountWithoutSupervisor, setMaxDiscountWithoutSupervisor] = useState<number>(10);
  const [canCancelInvoiceWithoutPin, setCanCancelInvoiceWithoutPin] = useState<boolean>(false);
  const [canViewCostPrices, setCanViewCostPrices] = useState<boolean>(false);
  const [canOpenDrawerWithoutSale, setCanOpenDrawerWithoutSale] = useState<boolean>(false);
  const [canCloseShiftWithDifference, setCanCloseShiftWithDifference] = useState<boolean>(false);

  // Sync state when role or user selection changes
  React.useEffect(() => {
    if (selectedTargetType === 'role') {
      const perms = defaultPermissionsByRole[selectedRoleId];
      if (perms) setCurrentPermissions({ ...perms });

      // Default restrictions based on role
      if (selectedRoleId === 'admin') {
        setMaxDiscountWithoutSupervisor(100);
        setCanCancelInvoiceWithoutPin(true);
        setCanViewCostPrices(true);
        setCanOpenDrawerWithoutSale(true);
        setCanCloseShiftWithDifference(true);
      } else if (selectedRoleId === 'gerente') {
        setMaxDiscountWithoutSupervisor(50);
        setCanCancelInvoiceWithoutPin(true);
        setCanViewCostPrices(true);
        setCanOpenDrawerWithoutSale(true);
        setCanCloseShiftWithDifference(true);
      } else if (selectedRoleId === 'financeiro') {
        setMaxDiscountWithoutSupervisor(20);
        setCanCancelInvoiceWithoutPin(true);
        setCanViewCostPrices(true);
        setCanOpenDrawerWithoutSale(false);
        setCanCloseShiftWithDifference(false);
      } else {
        // Caixa / RH / Comprador
        setMaxDiscountWithoutSupervisor(5);
        setCanCancelInvoiceWithoutPin(false);
        setCanViewCostPrices(false);
        setCanOpenDrawerWithoutSale(false);
        setCanCloseShiftWithDifference(false);
      }
    } else {
      if (targetUser?.role === 'admin' || targetUser?.roleId === 'admin') {
        setCurrentPermissions({ ...defaultPermissionsByRole.admin });
        setMaxDiscountWithoutSupervisor(100);
        setCanCancelInvoiceWithoutPin(true);
        setCanViewCostPrices(true);
        setCanOpenDrawerWithoutSale(true);
        setCanCloseShiftWithDifference(true);
      } else if (targetUser?.permissions) {
        setCurrentPermissions({ ...targetUser.permissions });
      } else if (targetUser?.role) {
        setCurrentPermissions({ ...defaultPermissionsByRole[targetUser.role] });
      }
    }
  }, [selectedTargetType, selectedRoleId, selectedUserId, targetUser]);

  const modulesList: ModuleDef[] = [
    {
      key: 'pos',
      label: 'Ponto de Venda (POS)',
      description: 'Abertura de turnos, registo de vendas, pagamentos e sangrias',
      icon: ShoppingBag,
    },
    {
      key: 'documents',
      label: 'Gestão de Documentos & Faturação',
      description: 'Emissão de Faturas FT/FS/FR, Notas de Crédito e Guias de Transporte AT',
      icon: FileSpreadsheet,
    },
    {
      key: 'stores',
      label: 'Gestão de Lojas & Filiais',
      description: 'Parametrização de lojas físicas, armazéns associados e séries fiscais',
      icon: Store,
    },
    {
      key: 'stock',
      label: 'Stock & Inventário',
      description: 'Gestão de produtos, lotes/validade, ajustes e transferências entre lojas',
      icon: Boxes,
    },
    {
      key: 'finance',
      label: 'Financeiro & Tesouraria',
      description: 'Contas a Pagar/Receber, extratos bancários, razão e relatórios fiscais',
      icon: Receipt,
    },
    {
      key: 'hr',
      label: 'Recursos Humanos (RH)',
      description: 'Cadastro de colaboradores, turnos de trabalho e recibos de vencimento',
      icon: Users,
    },
    {
      key: 'procurement',
      label: 'Compras & Fornecedores',
      description: 'Requisições de compra, ordens a fornecedores e receção de mercadorias',
      icon: Truck,
    },
    {
      key: 'crm',
      label: 'CRM & Clientes',
      description: 'Base de dados de clientes, histórico de compras, limites de crédito e fidelização',
      icon: HeartHandshake,
    },
    {
      key: 'analytics',
      label: 'Relatórios Analíticos & Visão Geral (BI)',
      description: 'Dashboard executivo, faturamento líquido, curvas ABC, gráficos de vendas e rentabilidade',
      icon: TrendingUp,
    },
    {
      key: 'settings',
      label: 'Definições & SAF-T',
      description: 'Configurações da empresa, logótipo, modelos de faturas e exportação SAF-T',
      icon: Settings,
    },
    {
      key: 'users',
      label: 'Gestão de Utilizadores',
      description: 'Criação de operadores, atribuição de PINs e gestão de acessos',
      icon: UserCheck,
    },
  ];

  const handleToggleAction = (moduleKey: keyof UserPermissions, action: keyof ModulePermission) => {
    setCurrentPermissions((prev) => {
      const mod = prev[moduleKey] || {
        read: false,
        create: false,
        edit: false,
        delete: false,
        fiscal: false,
      };
      return {
        ...prev,
        [moduleKey]: {
          ...mod,
          [action]: !mod[action],
        },
      };
    });
  };

  const handleGrantFullModule = (moduleKey: keyof UserPermissions) => {
    setCurrentPermissions((prev) => ({
      ...prev,
      [moduleKey]: {
        read: true,
        create: true,
        edit: true,
        delete: true,
        fiscal: true,
      },
    }));
  };

  const handleRevokeFullModule = (moduleKey: keyof UserPermissions) => {
    setCurrentPermissions((prev) => ({
      ...prev,
      [moduleKey]: {
        read: false,
        create: false,
        edit: false,
        delete: false,
        fiscal: false,
      },
    }));
  };

  const handleSavePermissions = () => {
    if (selectedTargetType === 'user') {
      updateUserPermissions(selectedUserId, currentPermissions);
      notify(`Permissões personalizadas atualizadas para o operador "${targetUser?.name}"!`, 'success');
    } else {
      // Update role permissions across system
      Object.keys(currentPermissions).forEach((modKey) => {
        updateRolePermissions(selectedRoleId, modKey, currentPermissions[modKey as keyof UserPermissions]);
      });
      notify(`Matriz de permissões e restrições do perfil "${selectedRoleId.toUpperCase()}" gravada!`, 'success');
    }
  };

  const handleResetPermissions = () => {
    const base = defaultPermissionsByRole[selectedRoleId];
    if (base) {
      setCurrentPermissions({ ...base });
      notify('Permissões restauradas para a política de segurança recomendada.', 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 text-[#c5a47e]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-white">
                Controlo de Acessos, Permissões & Restrições (RBAC)
              </h3>
              <p className="text-xs text-neutral-400">
                Reforce os privilégios e restrições de segurança por perfil de função ou operador individual.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetPermissions}
              className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-neutral-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Restaurar Predefinições
            </button>

            <button
              onClick={handleSavePermissions}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-xl text-xs cursor-pointer shadow-md transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Gravar Permissões</span>
            </button>
          </div>
        </div>

        {/* Target Selector: By Role or By Specific User */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Target Type Switch */}
          <div className="bg-[#0d0d0d] p-3 rounded-xl border border-[#242424] space-y-2">
            <label className="text-xs font-semibold text-neutral-300 block">
              1. Selecionar Escopo de Aplicação:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTargetType('role')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                  selectedTargetType === 'role'
                    ? 'bg-[#c5a47e]/20 text-[#c5a47e] border-[#c5a47e] font-bold'
                    : 'bg-[#141414] text-neutral-400 border-[#262626]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Por Perfil / Função (Role)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTargetType('user')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                  selectedTargetType === 'user'
                    ? 'bg-[#c5a47e]/20 text-[#c5a47e] border-[#c5a47e] font-bold'
                    : 'bg-[#141414] text-neutral-400 border-[#262626]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Por Utilizador Específico</span>
              </button>
            </div>
          </div>

          {/* Role or User Dropdown */}
          <div className="bg-[#0d0d0d] p-3 rounded-xl border border-[#242424] space-y-2">
            <label className="text-xs font-semibold text-neutral-300 block">
              2. {selectedTargetType === 'role' ? 'Selecione o Perfil a Configurar:' : 'Selecione o Utilizador:'}
            </label>

            {selectedTargetType === 'role' ? (
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'admin', label: '👑 Administrador' },
                  { id: 'gerente', label: '👔 Gerente de Loja' },
                  { id: 'caixa', label: '🛍️ Caixa / Operador POS' },
                  { id: 'financeiro', label: '💼 Diretor Financeiro' },
                  { id: 'rh', label: '👥 Gestor de RH' },
                  { id: 'comprador', label: '📦 Comprador / Stock' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoleId(r.id as Role)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      selectedRoleId === r.id
                        ? 'bg-[#c5a47e] text-neutral-950 font-bold border-[#c5a47e] shadow-xs'
                        : 'bg-[#141414] text-neutral-300 border-[#262626] hover:border-neutral-500'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-xs text-white focus:outline-hidden focus:border-[#c5a47e]"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-[#141414] text-white">
                    {u.name} ({u.role.toUpperCase()}) &bull; PIN: {u.pin || '1234'}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Operational Restrictions Panel */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-[#222222]">
          <Lock className="w-4 h-4 text-[#c5a47e]" />
          <h4 className="text-sm font-serif font-bold text-white">
            Restrições Operacionais & Salvaguardas no Ponto de Venda
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Max Discount */}
          <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#242424] space-y-2">
            <span className="font-semibold text-neutral-200 block">
              Desconto Máximo sem Autorização de Gerente:
            </span>
            <div className="flex items-center space-x-2">
              <select
                value={maxDiscountWithoutSupervisor}
                onChange={(e) => setMaxDiscountWithoutSupervisor(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-[#141414] border border-[#262626] rounded-lg text-xs font-bold text-[#c5a47e]"
              >
                <option value={0}>0% (Nenhum desconto permitido)</option>
                <option value={5}>5% (Desconto de cortesia)</option>
                <option value={10}>10% (Desconto padrão)</option>
                <option value={20}>20% (Desconto comercial)</option>
                <option value={50}>50% (Autorização especial)</option>
                <option value={100}>100% (Sem restrição - Admin)</option>
              </select>
            </div>
            <p className="text-[10px] text-neutral-400">
              Descontos superiores exigirão a inserção do PIN de um Gerente ou Administrador no POS.
            </p>
          </div>

          {/* Invoice Cancellation (NC) */}
          <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#242424] space-y-2 flex flex-col justify-between">
            <div>
              <span className="font-semibold text-neutral-200 block">
                Anulação de Faturas & Notas de Crédito
              </span>
              <p className="text-[10px] text-neutral-400 mt-1">
                Permite ao operador anular faturas emitidas e gerar notas de crédito de estorno.
              </p>
            </div>
            <label className="flex items-center space-x-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={canCancelInvoiceWithoutPin}
                onChange={(e) => setCanCancelInvoiceWithoutPin(e.target.checked)}
                className="w-4 h-4 rounded accent-[#c5a47e]"
              />
              <span className="text-neutral-200 font-medium">Permitir sem PIN de Supervisor</span>
            </label>
          </div>

          {/* Cost Prices & Margins */}
          <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#242424] space-y-2 flex flex-col justify-between">
            <div>
              <span className="font-semibold text-neutral-200 block">
                Visualização de Preço de Custo & Margem
              </span>
              <p className="text-[10px] text-neutral-400 mt-1">
                Oculta o custo dos artigos e a margem de lucro líquida para operadores de caixa.
              </p>
            </div>
            <label className="flex items-center space-x-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={canViewCostPrices}
                onChange={(e) => setCanViewCostPrices(e.target.checked)}
                className="w-4 h-4 rounded accent-[#c5a47e]"
              />
              <span className="text-neutral-200 font-medium">Exibir Margens e Custos</span>
            </label>
          </div>

          {/* Drawer Opening Without Sale */}
          <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#242424] space-y-2 flex flex-col justify-between">
            <div>
              <span className="font-semibold text-neutral-200 block">
                Abertura Manual de Gaveta (No-Sale)
              </span>
              <p className="text-[10px] text-neutral-400 mt-1">
                Abertura física da gaveta de dinheiro sem registo prévio de transação.
              </p>
            </div>
            <label className="flex items-center space-x-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={canOpenDrawerWithoutSale}
                onChange={(e) => setCanOpenDrawerWithoutSale(e.target.checked)}
                className="w-4 h-4 rounded accent-[#c5a47e]"
              />
              <span className="text-neutral-200 font-medium">Permitir Abertura Manual</span>
            </label>
          </div>

          {/* Shift Difference Tolerance */}
          <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#242424] space-y-2 flex flex-col justify-between">
            <div>
              <span className="font-semibold text-neutral-200 block">
                Fecho de Turno com Quebra de Caixa
              </span>
              <p className="text-[10px] text-neutral-400 mt-1">
                Autorização para encerrar o caixa quando a contagem física diferir do esperado.
              </p>
            </div>
            <label className="flex items-center space-x-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={canCloseShiftWithDifference}
                onChange={(e) => setCanCloseShiftWithDifference(e.target.checked)}
                className="w-4 h-4 rounded accent-[#c5a47e]"
              />
              <span className="text-neutral-200 font-medium">Permitir Fecho com Diferença</span>
            </label>
          </div>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
          <div>
            <h4 className="text-sm font-serif font-bold text-white">
              Matriz de Permissões por Módulo
            </h4>
            <p className="text-xs text-neutral-400">
              Defina os privilégios de Leitura (Consultar), Criação, Edição, Eliminação e Ações Fiscais.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#262626] text-neutral-400 text-[11px] uppercase bg-[#0d0d0d]">
                <th className="p-3">Módulo do Sistema</th>
                <th className="p-3 text-center">Consultar (Leitura)</th>
                <th className="p-3 text-center">Criar / Emitir</th>
                <th className="p-3 text-center">Editar / Alterar</th>
                <th className="p-3 text-center">Eliminar</th>
                <th className="p-3 text-center">Ações Fiscais</th>
                <th className="p-3 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {modulesList.map((mod) => {
                const Icon = mod.icon;
                const perm = currentPermissions[mod.key] || {
                  read: false,
                  create: false,
                  edit: false,
                  delete: false,
                  fiscal: false,
                };

                return (
                  <tr key={mod.key} className="hover:bg-[#121212] transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-[#0d0d0d] border border-[#242424] text-[#c5a47e]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{mod.label}</p>
                          <p className="text-[10px] text-neutral-400">{mod.description}</p>
                        </div>
                      </div>
                    </td>

                    {/* Read */}
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={!!perm.read}
                        onChange={() => handleToggleAction(mod.key, 'read')}
                        className="w-4 h-4 rounded accent-[#c5a47e] cursor-pointer"
                      />
                    </td>

                    {/* Create */}
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={!!perm.create}
                        onChange={() => handleToggleAction(mod.key, 'create')}
                        className="w-4 h-4 rounded accent-[#c5a47e] cursor-pointer"
                      />
                    </td>

                    {/* Edit */}
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={!!perm.edit}
                        onChange={() => handleToggleAction(mod.key, 'edit')}
                        className="w-4 h-4 rounded accent-[#c5a47e] cursor-pointer"
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={!!perm.delete}
                        onChange={() => handleToggleAction(mod.key, 'delete')}
                        className="w-4 h-4 rounded accent-[#c5a47e] cursor-pointer"
                      />
                    </td>

                    {/* Fiscal */}
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={!!perm.fiscal}
                        onChange={() => handleToggleAction(mod.key, 'fiscal')}
                        className="w-4 h-4 rounded accent-[#c5a47e] cursor-pointer"
                      />
                    </td>

                    {/* Quick Buttons */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          type="button"
                          onClick={() => handleGrantFullModule(mod.key)}
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-semibold cursor-pointer"
                          title="Conceder Acesso Total a este módulo"
                        >
                          Total
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeFullModule(mod.key)}
                          className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[10px] font-semibold cursor-pointer"
                          title="Bloquear Acesso a este módulo"
                        >
                          Bloquear
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
