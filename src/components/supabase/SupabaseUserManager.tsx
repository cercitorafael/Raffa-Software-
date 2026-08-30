import React, { useState, useEffect } from 'react';
import {
  Database,
  UserPlus,
  RefreshCw,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Code,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Search,
  ExternalLink,
  Plus,
  X,
  Server,
  Sparkles,
  Settings,
  HelpCircle,
  Link,
  Key,
  Layers,
  ArrowRight,
  Info,
  Radio,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
  Boxes,
  Users as UsersIcon,
  Truck,
  Receipt,
  ShoppingBag,
  Store as StoreIcon,
  Sliders,
  Filter,
  AlertCircle,
  Wrench,
  Building,
  UserCheck,
  Globe,
} from 'lucide-react';
import {
  supabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  Usuario,
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  eliminarUsuario,
  testarConexaoSupabase,
  diagnosticarTodasTabelasSupabase,
  TableDiagnosticResult,
  SUPABASE_SQL_SCHEMA,
  extractProjectRef,
  getSupabaseCredentials,
  saveSupabaseCredentials,
  resetSupabaseCredentials,
} from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import {
  SupabaseSyncLog,
  TableSyncName,
  pushTableToSupabase,
  pullTableFromSupabase,
} from '../../lib/supabaseSync';

export const SupabaseUserManager: React.FC = () => {
  const {
    notify,
    supabaseRealtimeStatus,
    supabaseSyncLogs,
    reconnectSupabaseRealtime,
    pullFromSupabase,
    pushToSupabase,
    companies,
    currentCompany,
    stores,
    currentStore,
    currentUser,
    products,
    customers,
    suppliers,
    categories,
    salesHistory,
    users,
    warehouses,
    stock,
    accountsPayable,
    accountsReceivable,
    employeeShifts,
  } = useApp();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [pushingAll, setPushingAll] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);

  // Multi-Tenant Scoping Filters for Import / Export
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(currentCompany?.id || 'ALL');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('ALL');

  const [connStatus, setConnStatus] = useState<{
    tested: boolean;
    conectado: boolean;
    mensagem: string;
    tabelaExiste?: boolean;
  }>({
    tested: false,
    conectado: false,
    mensagem: 'Não verificado',
  });

  const [tableDiagnostics, setTableDiagnostics] = useState<{
    ran: boolean;
    allPassed: boolean;
    existingTables: number;
    totalTables: number;
    tables: Record<string, TableDiagnosticResult>;
    summaryMessage: string;
  }>({
    ran: false,
    allPassed: false,
    existingTables: 0,
    totalTables: 14,
    tables: {},
    summaryMessage: '',
  });

  // Sync report modal state
  const [syncReport, setSyncReport] = useState<{
    isOpen: boolean;
    type: 'push' | 'pull';
    title: string;
    totalSuccess: number;
    results: Record<string, { count: number; error?: string; status: 'ok' | 'error' | 'empty' }>;
    errors: string[];
  } | null>(null);

  // Single table loading state
  const [tableActionLoading, setTableActionLoading] = useState<Record<string, boolean>>({});

  const [activeTab, setActiveTab] = useState<'realtime' | 'diagnostico' | 'tabelas' | 'usuarios' | 'sql' | 'config' | 'codigo'>('tabelas');
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ERROR'>('ALL');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Password visibility and copying states for users table
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedPasswordUserId, setCopiedPasswordUserId] = useState<string | number | null>(null);

  // Config tab form state
  const creds = getSupabaseCredentials();
  const [inputUrl, setInputUrl] = useState(creds.url);
  const [inputKey, setInputKey] = useState(creds.key);

  const projectRef = extractProjectRef(SUPABASE_URL);
  const dashboardProjectUrl = `https://supabase.com/dashboard/project/${projectRef}`;
  const tableEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/editor`;
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState<Omit<Usuario, 'id' | 'created_at' | 'updated_at'>>({
    nome: '',
    email: '',
    telefone: '',
    cargo: 'Operador',
    pin: '1234',
    password: '',
    senha: '',
    ativo: true,
    nif: '',
    avatar_url: '',
  });

  const handleTestConnection = async () => {
    setLoading(true);
    const result = await testarConexaoSupabase();
    setConnStatus({
      tested: true,
      conectado: result.conectado,
      mensagem: result.mensagem,
      tabelaExiste: result.tabelaExiste,
    });
    setLoading(false);
    if (result.conectado) {
      notify(result.mensagem, 'success');
      fetchUsuarios();
    } else {
      notify(result.mensagem, 'error');
    }
  };

  const handleRunFullDiagnostics = async () => {
    setDiagnosing(true);
    notify('A verificar status de todas as 11 tabelas no Supabase...', 'info');
    try {
      const diag = await diagnosticarTodasTabelasSupabase();
      setTableDiagnostics({
        ran: true,
        allPassed: diag.allPassed,
        existingTables: diag.existingTables,
        totalTables: diag.totalTables,
        tables: diag.tables,
        summaryMessage: diag.summaryMessage,
      });
      if (diag.allPassed) {
        notify(diag.summaryMessage, 'success');
      } else {
        notify(diag.summaryMessage, 'warning');
      }
    } catch (e: any) {
      notify(`Erro no diagnóstico: ${e.message || e}`, 'error');
    } finally {
      setDiagnosing(false);
    }
  };

  const fetchUsuarios = async () => {
    setLoading(true);
    const { data, error } = await listarUsuarios(currentCompany?.id);
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        setConnStatus((prev) => ({
          ...prev,
          tested: true,
          conectado: true,
          tabelaExiste: false,
          mensagem: 'Tabela "usuarios" não encontrada no Supabase. Crie-a no SQL Editor.',
        }));
      } else {
        notify(`Erro ao carregar do Supabase: ${error.message}`, 'error');
      }
    } else if (data) {
      setUsuarios(data);
      setConnStatus((prev) => ({
        ...prev,
        tested: true,
        conectado: true,
        tabelaExiste: true,
        mensagem: 'Conexão ativa e sincronizada!',
      }));
    }
    setLoading(false);
  };

  useEffect(() => {
    handleTestConnection();
    handleRunFullDiagnostics();
    fetchUsuarios();
  }, [currentCompany?.id]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputKey.trim()) {
      notify('Preencha a URL e a Anon Key do Supabase', 'warning');
      return;
    }
    const result = saveSupabaseCredentials(inputUrl.trim(), inputKey.trim());
    if (!result.success) {
      notify(result.message || 'URL do Supabase inválida', 'error');
      return;
    }
    const updatedCreds = getSupabaseCredentials();
    setInputUrl(updatedCreds.url);
    setInputKey(updatedCreds.key);
    notify('Credenciais atualizadas com sucesso!', 'success');
    handleTestConnection();
    handleRunFullDiagnostics();
    reconnectSupabaseRealtime();
  };

  const handleResetConfig = () => {
    resetSupabaseCredentials();
    const defaultCreds = getSupabaseCredentials();
    setInputUrl(defaultCreds.url);
    setInputKey(defaultCreds.key);
    notify('Restaurado para as credenciais padrão!', 'info');
    handleTestConnection();
    handleRunFullDiagnostics();
    reconnectSupabaseRealtime();
  };

  const handlePullFromSupabase = async () => {
    setSyncingAll(true);
    try {
      const options = {
        companyId: selectedCompanyId !== 'ALL' ? selectedCompanyId : undefined,
        profileId: selectedProfileId !== 'ALL' ? selectedProfileId : undefined,
      };
      const res = await pullFromSupabase(options);
      await fetchUsuarios();
      await handleRunFullDiagnostics();
      const scopeLabel = selectedCompanyId !== 'ALL' ? ` (Empresa: ${selectedCompanyId})` : ' (Global)';
      setSyncReport({
        isOpen: true,
        type: 'pull',
        title: `Relatório de Importação (Pull do Supabase)${scopeLabel}`,
        totalSuccess: Object.values(res.counts || {}).reduce((a: any, b: any) => a + b, 0),
        results: res.tableResults || {},
        errors: res.errors || [],
      });
    } finally {
      setSyncingAll(false);
    }
  };

  const handlePushToSupabase = async () => {
    setPushingAll(true);
    try {
      const options = {
        companyId: selectedCompanyId !== 'ALL' ? selectedCompanyId : undefined,
        profileId: selectedProfileId !== 'ALL' ? selectedProfileId : undefined,
      };
      const res = await pushToSupabase(options);
      await fetchUsuarios();
      await handleRunFullDiagnostics();
      const scopeLabel = selectedCompanyId !== 'ALL' ? ` (Empresa: ${selectedCompanyId})` : ' (Global)';
      setSyncReport({
        isOpen: true,
        type: 'push',
        title: `Relatório de Exportação (Push para o Supabase)${scopeLabel}`,
        totalSuccess: Object.values(res.uploaded || {}).reduce((a: any, b: any) => a + b, 0),
        results: res.tableResults || {},
        errors: res.errors || [],
      });
    } finally {
      setPushingAll(false);
    }
  };

  // Push single table
  const handlePushSingleTable = async (tableName: TableSyncName, localItems: any[]) => {
    setTableActionLoading((prev) => ({ ...prev, [tableName]: true }));
    const companyScope = selectedCompanyId !== 'ALL' ? selectedCompanyId : undefined;
    notify(`A enviar ${localItems.length} registos de "${tableName}" para o Supabase...`, 'info');
    try {
      const res = await pushTableToSupabase(tableName, localItems, { companyId: companyScope });
      if (res.success) {
        notify(`Sucesso: ${res.count} registos de "${tableName}" enviados para o Supabase!`, 'success');
        handleRunFullDiagnostics();
      } else {
        notify(`Erro ao enviar "${tableName}": ${res.error}`, 'error');
      }
    } catch (e: any) {
      notify(`Erro inesperado: ${e.message || e}`, 'error');
    } finally {
      setTableActionLoading((prev) => ({ ...prev, [tableName]: false }));
    }
  };

  // Pull single table
  const handlePullSingleTable = async (tableName: TableSyncName) => {
    setTableActionLoading((prev) => ({ ...prev, [tableName]: true }));
    const companyScope = selectedCompanyId !== 'ALL' ? selectedCompanyId : undefined;
    const profileScope = selectedProfileId !== 'ALL' ? selectedProfileId : undefined;
    notify(`A puxar dados de "${tableName}" do Supabase...`, 'info');
    try {
      const res = await pullTableFromSupabase(tableName, { companyId: companyScope, profileId: profileScope });
      if (res.success) {
        notify(`Puxados ${res.count} registos de "${tableName}" do Supabase!`, 'success');
        handleRunFullDiagnostics();
      } else {
        notify(`Erro ao puxar "${tableName}": ${res.error}`, 'error');
      }
    } catch (e: any) {
      notify(`Erro: ${e.message || e}`, 'error');
    } finally {
      setTableActionLoading((prev) => ({ ...prev, [tableName]: false }));
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cargo: 'Operador',
      pin: '1234',
      password: '1234',
      senha: '1234',
      ativo: true,
      nif: '',
      avatar_url: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (u: Usuario) => {
    setEditingId(u.id || null);
    setFormData({
      nome: u.nome,
      email: u.email,
      telefone: u.telefone || '',
      cargo: u.cargo || 'Operador',
      pin: u.pin || '1234',
      password: u.password || u.senha || u.pin || '1234',
      senha: u.senha || u.password || u.pin || '1234',
      ativo: u.ativo !== undefined ? u.ativo : true,
      nif: u.nif || '',
      avatar_url: u.avatar_url || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email) {
      notify('Nome e Email são obrigatórios', 'warning');
      return;
    }

    setLoading(true);
    if (editingId) {
      const { data, error } = await atualizarUsuario(editingId, formData);
      if (error) {
        notify(`Erro ao atualizar: ${error.message}`, 'error');
      } else {
        notify(`Usuário ${formData.nome} atualizado com sucesso no Supabase!`, 'success');
        setShowModal(false);
        fetchUsuarios();
      }
    } else {
      const { data, error } = await criarUsuario(formData);
      if (error) {
        notify(`Erro ao criar no Supabase: ${error.message}`, 'error');
      } else {
        notify(`Usuário ${formData.nome} criado com sucesso no Supabase!`, 'success');
        setShowModal(false);
        fetchUsuarios();
      }
    }
    setLoading(false);
  };

  const handleDelete = async (u: Usuario) => {
    if (!u.id) return;
    if (confirm(`Tem a certeza que deseja eliminar o usuário "${u.nome}" do Supabase?`)) {
      setLoading(true);
      const { success, error } = await eliminarUsuario(u.id);
      if (success) {
        notify(`Usuário "${u.nome}" eliminado do Supabase.`, 'info');
        fetchUsuarios();
      } else {
        notify(`Erro ao eliminar: ${error.message}`, 'error');
      }
      setLoading(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    notify('Script SQL completo copiado para a área de transferência!', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const nodeSnippet = `// Instalação: npm install @supabase/supabase-js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = '${SUPABASE_URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Inserir registro
const { data, error } = await supabase.from('produtos').upsert([
  { id: 'prod-1', name: 'Artigo Exemplo', price: 29.90, tax_rate: 16 }
]);
`;

  const filteredUsuarios = usuarios.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.nome || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.cargo || '').toLowerCase().includes(q) ||
      (u.nif || '').includes(q)
    );
  });

  const filteredLogs = supabaseSyncLogs.filter((log) => {
    if (logFilter === 'ALL') return true;
    return log.action === logFilter;
  });

  const tableMatrix: {
    name: TableSyncName;
    label: string;
    icon: any;
    localItems: any[];
    localCount: number;
  }[] = [
    { name: 'profiles', label: 'Perfis de Autenticação (Profiles)', icon: UserCheck, localItems: users, localCount: users.length },
    { name: 'empresas', label: 'Empresas & Filiais', icon: Building, localItems: companies, localCount: companies.length },
    { name: 'lojas', label: 'Lojas & Unidades Físicas', icon: StoreIcon, localItems: stores, localCount: stores.length },
    { name: 'produtos', label: 'Produtos & Artigos', icon: Boxes, localItems: products, localCount: products.length },
    { name: 'clientes', label: 'Clientes & CRM', icon: UsersIcon, localItems: customers, localCount: customers.length },
    { name: 'fornecedores', label: 'Fornecedores', icon: Truck, localItems: suppliers, localCount: suppliers.length },
    { name: 'categorias', label: 'Categorias de Produtos', icon: Layers, localItems: categories, localCount: categories.length },
    { name: 'vendas', label: 'Vendas & Faturas', icon: ShoppingBag, localItems: salesHistory, localCount: salesHistory.length },
    { name: 'armazens', label: 'Armazéns & Depósitos', icon: StoreIcon, localItems: warehouses, localCount: warehouses.length },
    { name: 'stock', label: 'Itens em Stock', icon: Boxes, localItems: stock, localCount: stock.length },
    { name: 'contas_pagar', label: 'Contas a Pagar', icon: Receipt, localItems: accountsPayable, localCount: accountsPayable.length },
    { name: 'contas_receber', label: 'Contas a Receber', icon: Receipt, localItems: accountsReceivable, localCount: accountsReceivable.length },
    { name: 'turnos_caixa', label: 'Turnos de Caixa', icon: Activity, localItems: employeeShifts, localCount: employeeShifts.length },
    { name: 'usuarios', label: 'Usuários do Sistema', icon: UsersIcon, localItems: users, localCount: users.length },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Top Header */}
      <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-serif font-bold text-white">Hub de Sincronização Supabase</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                {projectRef}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Sincronização bidirecional em tempo real & Banco de Dados PostgreSQL na Nuvem
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Realtime Status Badge */}
          <div
            className={`px-3 py-1.5 rounded-lg border text-xs flex items-center space-x-2 ${
              supabaseRealtimeStatus === 'connected'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : supabaseRealtimeStatus === 'connecting'
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 animate-pulse'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
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
            <span className="font-semibold text-[11px]">
              {supabaseRealtimeStatus === 'connected'
                ? 'Realtime Conectado'
                : supabaseRealtimeStatus === 'connecting'
                ? 'A Conectar...'
                : 'Desconectado'}
            </span>
          </div>

          {/* Diagnostics Button */}
          <button
            onClick={handleRunFullDiagnostics}
            disabled={diagnosing}
            className="px-3 py-1.5 bg-[#171717] hover:bg-[#222222] text-[#c5a47e] border border-[#333] rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Diagnosticar status de conexão e verificar se as 11 tabelas existem no Supabase"
          >
            <Wrench className={`w-3.5 h-3.5 ${diagnosing ? 'animate-spin' : ''}`} />
            <span>{diagnosing ? 'A Diagnosticar...' : 'Diagnóstico do Banco'}</span>
          </button>

          {/* Pull All Data */}
          <button
            onClick={handlePullFromSupabase}
            disabled={syncingAll}
            className="px-3 py-1.5 bg-[#171717] hover:bg-[#222222] text-[#c5a47e] hover:text-white border border-[#333] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Puxar todos os dados existentes no Supabase e reconciliar com o sistema local"
          >
            <ArrowDownToLine className={`w-3.5 h-3.5 ${syncingAll ? 'animate-bounce' : ''}`} />
            <span>{syncingAll ? 'A Puxar...' : 'Puxar da Nuvem (Pull)'}</span>
          </button>

          {/* Push All Data */}
          <button
            onClick={handlePushToSupabase}
            disabled={pushingAll}
            className="px-3 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-black font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
            title="Enviar todos os dados locais atuais para o Supabase"
          >
            <ArrowUpFromLine className={`w-3.5 h-3.5 ${pushingAll ? 'animate-bounce' : ''}`} />
            <span>{pushingAll ? 'A Carregar...' : 'Carregar para Supabase (Push)'}</span>
          </button>

          {/* Open Supabase SQL Editor */}
          <a
            href={sqlEditorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-[#171717] hover:bg-[#222222] text-[#c5a47e] border border-[#333] rounded-lg text-xs flex items-center space-x-1.5 transition-all"
            title="Abrir SQL Editor no Supabase"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SQL Editor</span>
          </a>
        </div>
      </div>

      {/* Banner de Aviso caso as tabelas ainda não existam */}
      {tableDiagnostics.ran && !tableDiagnostics.allPassed && (
        <div className="mx-4 mt-4 p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-white">
                ⚠️ As tabelas ainda precisam de ser criadas no seu banco de dados Supabase!
              </div>
              <p className="text-amber-300/90 mt-1">
                {tableDiagnostics.existingTables} de 11 tabelas estão disponíveis. Para carregar dados com sucesso, copie o script SQL e execute-o no SQL Editor do Supabase.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCopySql}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-md"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'SQL Copiado!' : 'Copiar Script SQL'}</span>
            </button>
            <a
              href={sqlEditorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-[#171717] hover:bg-[#222222] text-white border border-[#333] rounded-lg flex items-center space-x-1"
            >
              <span>Abrir SQL Editor</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-4 bg-[#0e0e0e] border-b border-[#262626] flex space-x-4 overflow-x-auto shrink-0 mt-2">
        <button
          onClick={() => setActiveTab('tabelas')}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'tabelas'
              ? 'border-[#c5a47e] text-[#c5a47e]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Matriz de Tabelas ERP (14 Tabelas)</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostico')}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'diagnostico'
              ? 'border-[#c5a47e] text-[#c5a47e]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Diagnóstico & Saúde ({tableDiagnostics.existingTables}/14 Prontas)</span>
        </button>

        <button
          onClick={() => setActiveTab('realtime')}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'realtime'
              ? 'border-[#c5a47e] text-[#c5a47e]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Monitor Real-time ({supabaseSyncLogs.length} eventos)</span>
        </button>

        <button
          onClick={() => setActiveTab('usuarios')}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'usuarios'
              ? 'border-[#c5a47e] text-[#c5a47e]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <UsersIcon className="w-3.5 h-3.5" />
          <span>Tabela Usuários ({usuarios.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'sql'
              ? 'border-[#c5a47e] text-[#c5a47e]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Esquema SQL & Criação</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'config'
              ? 'border-[#c5a47e] text-[#c5a47e]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Credenciais & Conexão</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB: MATRIZ DE TABELAS ERP (PRINCIPAL) */}
        {activeTab === 'tabelas' && (
          <div className="space-y-4">
            {/* Multi-Tenant Scoping Bar */}
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-3">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-[#222]">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Building className="w-4 h-4 text-[#c5a47e]" />
                    <span>Escopo Multi-Tenant: Empresa & Perfis (Profiles)</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Filtre a importação e exportação de dados para uma empresa ou perfil de utilizador específico no Supabase.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePushToSupabase}
                    disabled={pushingAll}
                    className="px-3.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-black font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    title={`Exportar todas as tabelas para o Supabase no escopo selecionado (${selectedCompanyId !== 'ALL' ? selectedCompanyId : 'Global'})`}
                  >
                    <ArrowUpFromLine className={`w-3.5 h-3.5 ${pushingAll ? 'animate-bounce' : ''}`} />
                    <span>{pushingAll ? 'A Exportar...' : 'Exportar Escopo p/ Nuvem (Push)'}</span>
                  </button>
                  <button
                    onClick={handlePullFromSupabase}
                    disabled={syncingAll}
                    className="px-3.5 py-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white border border-[#333] text-xs font-semibold rounded-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    title={`Importar todas as tabelas do Supabase no escopo selecionado (${selectedCompanyId !== 'ALL' ? selectedCompanyId : 'Global'})`}
                  >
                    <ArrowDownToLine className={`w-3.5 h-3.5 text-[#c5a47e] ${syncingAll ? 'animate-bounce' : ''}`} />
                    <span>{syncingAll ? 'A Importar...' : 'Importar Escopo da Nuvem (Pull)'}</span>
                  </button>
                </div>
              </div>

              {/* Selectors for Company and Profile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-neutral-400 font-medium mb-1 flex items-center space-x-1.5">
                    <Building className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>Filtrar por Empresa (company_id)</span>
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                  >
                    <option value="ALL">🌐 Todas as Empresas (Global / Multi-Empresas)</option>
                    {(companies || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.name || c.tradeName} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1 flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>Filtrar por Perfil / Utilizador (profile_id)</span>
                  </label>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                  >
                    <option value="ALL">👥 Todos os Perfis (Global)</option>
                    {(users || []).map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.name} ({u.email || u.username || u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <div className="w-full p-2 bg-[#0a0a0a] rounded-lg border border-[#222] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase font-mono block">Escopo Atual</span>
                      <span className="text-xs font-semibold text-[#c5a47e]">
                        {selectedCompanyId === 'ALL' ? 'Multi-Empresas Global' : `Empresa: ${selectedCompanyId}`}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                      Multi-Tenant Ativo
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tableMatrix.map((tbl) => {
                const Icon = tbl.icon;
                const isItemLoading = tableActionLoading[tbl.name];
                const diag = tableDiagnostics.tables[tbl.name];

                return (
                  <div
                    key={tbl.name}
                    className="p-4 bg-[#111111] border border-[#262626] rounded-xl hover:border-[#383838] transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-[#1a1a1a] rounded-lg text-[#c5a47e] border border-[#2a2a2a]">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">{tbl.label}</h4>
                            <span className="font-mono text-[10px] text-neutral-400 block">
                              public.{tbl.name}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-200 border border-neutral-700 font-mono">
                          {tbl.localCount} local
                        </span>
                      </div>

                      {/* Status no Supabase */}
                      <div className="mt-3 text-[11px] p-2 bg-[#161616] rounded-lg border border-[#222] flex items-center justify-between">
                        <span className="text-neutral-400">Status Nuvem:</span>
                        {diag?.exists ? (
                          <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{diag.rowCount} regs no Supabase</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Tabela não criada</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ações por Tabela */}
                    <div className="pt-2 border-t border-[#202020] flex items-center gap-2">
                      <button
                        onClick={() => handlePushSingleTable(tbl.name, tbl.localItems)}
                        disabled={isItemLoading}
                        className="flex-1 py-1.5 px-2 bg-[#1e1e1e] hover:bg-[#282828] text-white hover:text-[#c5a47e] border border-[#333] rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer disabled:opacity-50"
                        title={`Enviar ${tbl.localCount} registos de ${tbl.label} para o Supabase`}
                      >
                        <ArrowUpFromLine className={`w-3 h-3 ${isItemLoading ? 'animate-bounce' : ''}`} />
                        <span>Carregar</span>
                      </button>

                      <button
                        onClick={() => handlePullSingleTable(tbl.name)}
                        disabled={isItemLoading}
                        className="flex-1 py-1.5 px-2 bg-[#1e1e1e] hover:bg-[#282828] text-white hover:text-[#c5a47e] border border-[#333] rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer disabled:opacity-50"
                        title={`Puxar registos de ${tbl.label} do Supabase`}
                      >
                        <ArrowDownToLine className={`w-3 h-3 ${isItemLoading ? 'animate-bounce' : ''}`} />
                        <span>Puxar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: DIAGNÓSTICO DETALHADO */}
        {activeTab === 'diagnostico' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Wrench className="w-4 h-4 text-[#c5a47e]" />
                  <span>Diagnóstico Completo de Tabelas e Permissões</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Verifica a existência, permissões RLS e contagem de registros em cada uma das 11 tabelas do Supabase.
                </p>
              </div>
              <button
                onClick={handleRunFullDiagnostics}
                disabled={diagnosing}
                className="px-3.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-black font-bold text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${diagnosing ? 'animate-spin' : ''}`} />
                <span>{diagnosing ? 'A Verificar...' : 'Executar Diagnóstico'}</span>
              </button>
            </div>

            {/* Checklist Table */}
            <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#111111] shadow-xl">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#171717] text-neutral-400 uppercase text-[10px] tracking-wider font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="p-3">Tabela</th>
                    <th className="p-3">Nome Técnico</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Leitura / RLS</th>
                    <th className="p-3 text-center">Registos na Nuvem</th>
                    <th className="p-3">Diagnóstico / Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202020] font-medium text-xs">
                  {tableMatrix.map((tbl) => {
                    const diag = tableDiagnostics.tables[tbl.name];
                    return (
                      <tr key={tbl.name} className="hover:bg-[#181818] transition-colors">
                        <td className="p-3 font-bold text-white flex items-center space-x-2">
                          <tbl.icon className="w-3.5 h-3.5 text-[#c5a47e]" />
                          <span>{tbl.label}</span>
                        </td>
                        <td className="p-3 font-mono text-neutral-400">{tbl.name}</td>
                        <td className="p-3 text-center">
                          {diag?.exists ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Pronta
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Não Criada
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {diag?.canRead ? (
                            <span className="text-emerald-400 font-semibold text-xs">✅ OK</span>
                          ) : (
                            <span className="text-rose-400 font-semibold text-xs">❌ Bloqueado</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-[#c5a47e]">
                          {diag ? diag.rowCount : '-'}
                        </td>
                        <td className="p-3 text-xs text-neutral-300">
                          {diag?.exists ? (
                            <span className="text-neutral-400">Tabela operacional no Supabase</span>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-amber-400">Necessita de executar o script SQL</span>
                              <button
                                onClick={handleCopySql}
                                className="px-2 py-0.5 bg-[#222] hover:bg-[#333] text-white border border-[#444] rounded text-[10px] cursor-pointer"
                              >
                                Copiar SQL
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: REAL-TIME MONITOR */}
        {activeTab === 'realtime' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Motor de Sincronização Bidirecional em Tempo Real</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                      postgres_changes (ALL)
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Qualquer alteração feita no Supabase (incluindo <strong>DELETE</strong>) é instantaneamente propagada e refletida aqui.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={reconnectSupabaseRealtime}
                  className="px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#282828] text-white border border-[#333] rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Reconectar Canal</span>
                </button>
              </div>
            </div>

            {/* Logs Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-neutral-400" />
                <span className="text-xs font-semibold text-neutral-300">Filtrar Eventos:</span>
                {(['ALL', 'INSERT', 'UPDATE', 'DELETE', 'ERROR'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLogFilter(filter)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      logFilter === filter
                        ? 'bg-[#c5a47e] text-black'
                        : 'bg-[#141414] text-neutral-400 hover:text-white border border-[#262626]'
                    }`}
                  >
                    {filter === 'ALL' ? 'Todos' : filter}
                  </button>
                ))}
              </div>

              <div className="text-xs text-neutral-500 font-mono">
                {filteredLogs.length} eventos gravados na sessão
              </div>
            </div>

            {/* Logs Table */}
            <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#111111] shadow-xl">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#171717] text-neutral-400 uppercase text-[10px] tracking-wider font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="p-3">Hora</th>
                    <th className="p-3">Ação</th>
                    <th className="p-3">Tabela</th>
                    <th className="p-3">Origem</th>
                    <th className="p-3">Descrição do Evento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202020] font-mono text-[11px]">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-500">
                        Nenhum evento registrado ainda. Efetue ações no sistema ou altere dados no Supabase para ver eventos em direto.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#181818] transition-colors">
                        <td className="p-3 text-neutral-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              log.action === 'INSERT'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : log.action === 'UPDATE'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : log.action === 'DELETE'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : log.action === 'ERROR'
                                ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-[#c5a47e] whitespace-nowrap">
                          {log.table}
                        </td>
                        <td className="p-3 text-neutral-400 whitespace-nowrap">
                          {log.origin === 'SUPABASE_REALTIME' ? (
                            <span className="text-emerald-400 flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                              <span>Supabase Cloud</span>
                            </span>
                          ) : (
                            <span className="text-neutral-400">Aplicação Local</span>
                          )}
                        </td>
                        <td className="p-3 text-neutral-200 font-sans text-xs">
                          {log.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: USUÁRIOS CRUD */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Pesquisar por nome, email ou cargo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#121212] border border-[#262626] rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleOpenCreate}
                    className="px-3 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-black font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Novo Usuário</span>
                  </button>
                </div>
              </div>

              <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#111111] shadow-xl">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-[#171717] text-neutral-400 uppercase text-[10px] tracking-wider font-semibold border-b border-[#262626]">
                    <tr>
                      <th className="p-3">Usuário</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Telefone / NIF</th>
                      <th className="p-3">Cargo</th>
                      <th className="p-3 text-center">Senha / Palavra-passe</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202020] font-medium">
                    {filteredUsuarios.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-500">
                          {loading ? (
                            <div className="flex items-center justify-center space-x-2">
                              <RefreshCw className="w-4 h-4 animate-spin text-[#c5a47e]" />
                              <span>A carregar registros do Supabase...</span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p>Nenhum usuário encontrado na tabela "usuarios".</p>
                              <button
                                onClick={handleOpenCreate}
                                className="px-3 py-1.5 bg-[#c5a47e] text-black rounded-lg hover:bg-[#b5946e] font-bold text-xs cursor-pointer"
                              >
                                + Criar Primeiro Usuário
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredUsuarios.map((u) => {
                        const userKey = String(u.id || u.email);
                        const isPasswordVisible = !!showPasswordMap[userKey];
                        const userPass = u.password || u.senha || u.pin || (u.cargo === 'Administrador' ? 'admin' : '1234');
                        const isCopied = copiedPasswordUserId === (u.id || u.email);

                        return (
                          <tr key={userKey} className="hover:bg-[#181818] transition-colors">
                            <td className="p-3 font-bold text-white">
                              <div className="flex items-center space-x-2.5">
                                <img
                                  src={
                                    u.avatar_url ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      u.nome
                                    )}&background=c5a47e&color=000`
                                  }
                                  alt={u.nome}
                                  className="w-7 h-7 rounded-full object-cover border border-[#333]"
                                />
                                <div>
                                  <span>{u.nome}</span>
                                  {u.id && (
                                    <span className="block text-[9px] text-neutral-500 font-mono">
                                      ID: {String(u.id).substring(0, 8)}...
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-neutral-300 font-mono">{u.email}</td>
                            <td className="p-3 text-neutral-400">
                              <div>{u.telefone || '-'}</div>
                              {u.nif && <div className="text-[10px] text-neutral-500 font-mono">NIF: {u.nif}</div>}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#222] text-[#c5a47e] border border-[#333]">
                                {u.cargo || 'Operador'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center justify-center space-x-1.5 bg-[#0a0a0a] px-2.5 py-1 rounded-lg border border-[#262626]">
                                <span className="font-mono text-xs font-semibold text-neutral-200">
                                  {isPasswordVisible ? userPass : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPasswordMap((prev) => ({ ...prev, [userKey]: !prev[userKey] }));
                                  }}
                                  className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded transition-colors cursor-pointer"
                                  title={isPasswordVisible ? 'Ocultar palavra-passe' : 'Ver palavra-passe'}
                                >
                                  {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5 text-[#c5a47e]" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(userPass);
                                    setCopiedPasswordUserId(u.id || u.email);
                                    notify(`Senha de ${u.nome} copiada!`, 'success');
                                    setTimeout(() => setCopiedPasswordUserId(null), 2000);
                                  }}
                                  className={`p-1 rounded transition-colors cursor-pointer ${
                                    isCopied
                                      ? 'text-emerald-400 bg-emerald-500/20'
                                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                                  }`}
                                  title="Copiar palavra-passe"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  u.ativo !== false
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {u.ativo !== false ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => handleOpenEdit(u)}
                                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#262626] rounded-md transition-colors cursor-pointer"
                                  title="Editar Usuário"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(u)}
                                  className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-[#262626] rounded-md transition-colors cursor-pointer"
                                  title="Eliminar do Supabase"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        )}

        {/* TAB: SQL SCHEMA */}
        {activeTab === 'sql' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-[#c5a47e]" />
                  <h3 className="text-sm font-bold text-white">Script SQL Completo para o Supabase</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={sqlEditorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-[#1f1f1f] text-white border border-[#333] font-bold text-xs rounded-lg flex items-center space-x-1.5 hover:bg-[#2a2a2a]"
                  >
                    <span>Abrir SQL Editor no Supabase</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={handleCopySql}
                    className="px-3 py-1.5 bg-[#c5a47e] text-black font-bold text-xs rounded-lg flex items-center space-x-1.5 hover:bg-[#b5946e] cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-neutral-400">
                Execute o script abaixo diretamente no <strong>SQL Editor</strong> do Supabase. Inclui tabelas completas, chaves primárias e <strong>REPLICA IDENTITY FULL</strong> para suporte total à sincronização de eliminações (DELETE).
              </p>
            </div>

            <div className="relative bg-[#0d0d0d] border border-[#262626] rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-[500px]">
              <pre>{SUPABASE_SQL_SCHEMA}</pre>
            </div>
          </div>
        )}

        {/* TAB: CREDENCIAIS & CONFIGURAÇÃO */}
        {activeTab === 'config' && (
          <div className="space-y-4 max-w-2xl">
            <div className="p-5 bg-[#141414] border border-[#262626] rounded-xl space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#c5a47e]/10 border border-[#c5a47e]/30 rounded-xl text-[#c5a47e]">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Configuração de Credenciais Supabase</h3>
                  <p className="text-xs text-neutral-400">
                    Altere a URL e a Anon Public Key se desejar conectar a outro projeto Supabase.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1 font-semibold">Supabase Project URL *</label>
                  <input
                    type="url"
                    required
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://xyz.supabase.co"
                    className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white font-mono placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1 font-semibold">Supabase Anon Public Key *</label>
                  <textarea
                    rows={3}
                    required
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white font-mono placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-black font-bold rounded-lg text-xs cursor-pointer shadow-md"
                  >
                    Guardar e Testar Conexão
                  </button>
                  <button
                    type="button"
                    onClick={handleResetConfig}
                    className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white border border-[#333] rounded-lg text-xs cursor-pointer"
                  >
                    Restaurar Padrão
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Relatório de Sincronização / Carregamento */}
      {syncReport && syncReport.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] text-[#e5e5e5] rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-[#c5a47e]" />
                <h3 className="text-base font-serif font-bold text-white">{syncReport.title}</h3>
              </div>
              <button
                onClick={() => setSyncReport(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#333] text-xs">
              <div className="font-bold text-sm text-white flex items-center justify-between">
                <span>Total de Registos Processados:</span>
                <span className="text-[#c5a47e] font-mono text-base">{syncReport.totalSuccess}</span>
              </div>
              {syncReport.errors.length > 0 && (
                <div className="mt-2 text-rose-400 font-semibold">
                  ⚠️ {syncReport.errors.length} tabela(s) reportaram avisos ou ainda não foram criadas.
                </div>
              )}
            </div>

            {/* Checklist per table */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {Object.entries(syncReport.results).map(([table, res]: [string, any]) => (
                <div
                  key={table}
                  className="p-2.5 bg-[#0f0f0f] border border-[#222] rounded-lg text-xs flex items-center justify-between"
                >
                  <span className="font-mono font-bold text-neutral-300">{table}</span>
                  {res.status === 'ok' ? (
                    <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{res.count} enviados</span>
                    </span>
                  ) : res.status === 'empty' ? (
                    <span className="text-neutral-500">0 registos locais</span>
                  ) : (
                    <span className="text-rose-400 font-semibold flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px]" title={res.error}>
                        {res.error || 'Erro'}
                      </span>
                    </span>
                  )}
                </div>
              ))}
            </div>

            {syncReport.errors.length > 0 && (
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg text-xs space-y-2">
                <p className="text-amber-200">
                  Para corrigir qualquer erro de tabela inexistente, copie o script SQL e execute no Supabase SQL Editor.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopySql}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-xs cursor-pointer"
                  >
                    Copiar SQL
                  </button>
                  <a
                    href={sqlEditorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-[#222] hover:bg-[#333] text-white border border-[#444] rounded text-xs"
                  >
                    Abrir SQL Editor
                  </a>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-[#262626] flex justify-end">
              <button
                onClick={() => setSyncReport(null)}
                className="px-4 py-2 bg-[#c5a47e] text-black font-bold rounded-lg text-xs hover:bg-[#b5946e] cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Criar / Editar Usuário no Supabase */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] text-[#e5e5e5] rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-[#c5a47e]" />
                <h3 className="text-base font-serif font-bold text-white">
                  {editingId ? 'Editar Usuário (Supabase)' : 'Novo Usuário (Supabase)'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="ex: Carlos Silva"
                  className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="carlos@empresa.com"
                  className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Telefone</label>
                  <input
                    type="text"
                    value={formData.telefone || ''}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="+351 912 345 678"
                    className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">NIF</label>
                  <input
                    type="text"
                    value={formData.nif || ''}
                    onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                    placeholder="234567890"
                    className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Cargo</label>
                  <select
                    value={formData.cargo || 'Operador'}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white focus:outline-hidden focus:border-[#c5a47e]"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Operador">Operador</option>
                    <option value="Caixa">Caixa</option>
                    <option value="Financeiro">Financeiro</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Estado</label>
                  <select
                    value={formData.ativo ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.value === 'true' })}
                    className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white focus:outline-hidden focus:border-[#c5a47e]"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-[#181818] border border-[#282828] rounded-xl">
                <div>
                  <label className="text-neutral-300 block mb-1 font-semibold flex items-center space-x-1.5">
                    <Key className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>Senha / Palavra-passe</span>
                  </label>
                  <input
                    type="text"
                    value={formData.password || formData.senha || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value, senha: e.target.value })}
                    placeholder="ex: admin ou 1234"
                    className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e] font-mono"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">Acesso ao portal e web</span>
                </div>
                <div>
                  <label className="text-neutral-300 block mb-1 font-semibold flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>PIN POS (4 dígitos)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pin || ''}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="ex: 1234"
                    className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#2c2c2c] rounded-lg text-white placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e] font-mono"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">Código de desbloqueio rápido no POS</span>
                </div>
              </div>

              <div className="flex space-x-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-[#1c1c1c] text-neutral-300 rounded-lg hover:bg-[#252525] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-black font-bold rounded-lg shadow-md uppercase tracking-wider cursor-pointer"
                >
                  {loading ? 'A guardar...' : editingId ? 'Salvar no Supabase' : 'Inserir no Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

