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
  SUPABASE_SQL_SCHEMA,
  extractProjectRef,
  getSupabaseCredentials,
  saveSupabaseCredentials,
  resetSupabaseCredentials,
} from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { SupabaseSyncLog, TableSyncName } from '../../lib/supabaseSync';

export const SupabaseUserManager: React.FC = () => {
  const {
    notify,
    supabaseRealtimeStatus,
    supabaseSyncLogs,
    reconnectSupabaseRealtime,
    pullFromSupabase,
    pushToSupabase,
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

  const [activeTab, setActiveTab] = useState<'realtime' | 'usuarios' | 'tabelas' | 'sql' | 'config' | 'codigo'>('realtime');
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ERROR'>('ALL');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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

  const fetchUsuarios = async () => {
    setLoading(true);
    const { data, error } = await listarUsuarios();
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
  }, []);

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
    reconnectSupabaseRealtime();
  };

  const handleResetConfig = () => {
    resetSupabaseCredentials();
    const defaultCreds = getSupabaseCredentials();
    setInputUrl(defaultCreds.url);
    setInputKey(defaultCreds.key);
    notify('Restaurado para as credenciais padrão!', 'info');
    handleTestConnection();
    reconnectSupabaseRealtime();
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cargo: 'Operador',
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

  const handlePullFromSupabase = async () => {
    setSyncingAll(true);
    try {
      await pullFromSupabase();
      await fetchUsuarios();
    } finally {
      setSyncingAll(false);
    }
  };

  const handlePushToSupabase = async () => {
    if (
      !confirm(
        'Deseja enviar todos os dados locais atuais (Produtos, Clientes, Categorias, Armazéns, etc.) para o Supabase?'
      )
    ) {
      return;
    }
    setPushingAll(true);
    try {
      await pushToSupabase();
      await fetchUsuarios();
    } finally {
      setPushingAll(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    notify('Script SQL completo copiado para a área de transferência!', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const nodeSnippet = `// ==========================================
// 1. CLIENTE PADRÃO (Browser, React, Node.js)
// Instalação: npm install @supabase/supabase-js
// ==========================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = '${SUPABASE_URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. ESCUTA REAL-TIME (INSERT, UPDATE, DELETE)
// ==========================================
export function subscribeToRealtime(tableName, onInsert, onUpdate, onDelete) {
  const channel = supabase
    .channel('erp-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: tableName },
      (payload) => onInsert(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: tableName },
      (payload) => onUpdate(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: tableName },
      (payload) => onDelete(payload.old)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
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
    localCount: number;
  }[] = [
    { name: 'produtos', label: 'Produtos & Artigos', icon: Boxes, localCount: products.length },
    { name: 'clientes', label: 'Clientes & CRM', icon: UsersIcon, localCount: customers.length },
    { name: 'fornecedores', label: 'Fornecedores', icon: Truck, localCount: suppliers.length },
    { name: 'categorias', label: 'Categorias de Produtos', icon: Layers, localCount: categories.length },
    { name: 'vendas', label: 'Vendas & Faturas', icon: ShoppingBag, localCount: salesHistory.length },
    { name: 'armazens', label: 'Armazéns & Lojas', icon: StoreIcon, localCount: warehouses.length },
    { name: 'stock', label: 'Itens em Stock', icon: Boxes, localCount: stock.length },
    { name: 'contas_pagar', label: 'Contas a Pagar', icon: Receipt, localCount: accountsPayable.length },
    { name: 'contas_receber', label: 'Contas a Receber', icon: Receipt, localCount: accountsReceivable.length },
    { name: 'turnos_caixa', label: 'Turnos de Caixa', icon: Activity, localCount: employeeShifts.length },
    { name: 'usuarios', label: 'Usuários do Sistema', icon: UsersIcon, localCount: users.length },
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
              Sincronização bidirecional em tempo real (INSERT, UPDATE, DELETE) & PostgreSQL Cloud
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
                ? 'Realtime Conectado (Live)'
                : supabaseRealtimeStatus === 'connecting'
                ? 'A Conectar...'
                : 'Desconectado'}
            </span>
          </div>

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
            className="px-3 py-1.5 bg-[#171717] hover:bg-[#222222] text-neutral-300 hover:text-white border border-[#333] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Enviar todos os dados locais atuais para o Supabase"
          >
            <ArrowUpFromLine className={`w-3.5 h-3.5 ${pushingAll ? 'animate-bounce' : ''}`} />
            <span>{pushingAll ? 'A Enviar...' : 'Enviar para Nuvem (Push)'}</span>
          </button>

          {/* Reconnect Realtime */}
          <button
            onClick={reconnectSupabaseRealtime}
            className="p-2 bg-[#171717] hover:bg-[#222222] text-neutral-300 hover:text-white border border-[#333] rounded-lg text-xs flex items-center transition-all cursor-pointer"
            title="Reconectar Canal Realtime"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {/* Open Supabase Dashboard */}
          <a
            href={dashboardProjectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-[#171717] hover:bg-[#222222] text-[#c5a47e] border border-[#333] rounded-lg text-xs flex items-center space-x-1.5 transition-all"
            title="Abrir Dashboard no Supabase.com"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Supabase.com</span>
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 bg-[#0e0e0e] border-b border-[#262626] flex space-x-4 overflow-x-auto shrink-0">
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
          onClick={() => setActiveTab('tabelas')}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'tabelas'
              ? 'border-[#c5a47e] text-[#c5a47e]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Matriz de Tabelas ERP (11 Tabelas)</span>
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
          <span>Esquema SQL & REPLICA IDENTITY</span>
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

        <button
          onClick={() => setActiveTab('codigo')}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'codigo'
              ? 'border-[#c5a47e] text-[#c5a47e]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Snippets de Código</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: REAL-TIME MONITOR & LIVE STREAM */}
        {activeTab === 'realtime' && (
          <div className="space-y-4">
            {/* Realtime Engine Status Banner */}
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
                <button
                  onClick={handlePullFromSupabase}
                  disabled={syncingAll}
                  className="px-3 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-black font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>{syncingAll ? 'A Sincronizar...' : 'Sincronizar Tudo Agora'}</span>
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

            {/* Realtime Event Stream Log Table */}
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

        {/* TAB 2: USUÁRIOS CRUD */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4">
            {/* Filter and stats */}
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

            {/* Users Table */}
            <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#111111] shadow-xl">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#171717] text-neutral-400 uppercase text-[10px] tracking-wider font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="p-3">Usuário</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Telefone / NIF</th>
                    <th className="p-3">Cargo</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202020] font-medium">
                  {filteredUsuarios.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-500">
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
                    filteredUsuarios.map((u) => (
                      <tr key={String(u.id || u.email)} className="hover:bg-[#181818] transition-colors">
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MATRIZ DE TABELAS ERP */}
        {activeTab === 'tabelas' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#c5a47e]" />
                  <span>Matriz de Sincronização de Tabelas ERP</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Visão consolidada de todas as entidades do sistema com sincronização ativa na Supabase.
                </p>
              </div>
              <button
                onClick={handlePullFromSupabase}
                disabled={syncingAll}
                className="px-3 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-black font-bold text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>{syncingAll ? 'A Sincronizar...' : 'Sincronizar Todas as Tabelas'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tableMatrix.map((tbl) => {
                const Icon = tbl.icon;
                return (
                  <div
                    key={tbl.name}
                    className="p-4 bg-[#111111] border border-[#262626] rounded-xl hover:border-[#383838] transition-all space-y-3"
                  >
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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {tbl.localCount} regs
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#202020] text-[11px] text-neutral-400">
                      <span>Replica Identity: FULL</span>
                      <span className="text-emerald-400 font-semibold">Realtime Ativo</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: SQL SCHEMA */}
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

        {/* TAB 5: CREDENCIAIS & CONFIGURAÇÃO */}
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

        {/* TAB 6: CODE SNIPPETS */}
        {activeTab === 'codigo' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Code className="w-4 h-4 text-[#c5a47e]" />
                  <span>Código de Conexão e CRUD Supabase</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Exemplo de inicialização e subscrição em tempo real com @supabase/supabase-js.
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(nodeSnippet);
                  setCopiedCode(true);
                  notify('Código copiado!', 'success');
                  setTimeout(() => setCopiedCode(false), 2500);
                }}
                className="px-3 py-1.5 bg-[#c5a47e] text-black font-bold text-xs rounded-lg flex items-center space-x-1.5 hover:bg-[#b5946e] cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>

            <div className="bg-[#0d0d0d] border border-[#262626] rounded-xl p-4 font-mono text-xs text-neutral-300 overflow-x-auto">
              <pre>{nodeSnippet}</pre>
            </div>
          </div>
        )}
      </div>

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
