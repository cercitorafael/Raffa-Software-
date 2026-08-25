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

export const SupabaseUserManager: React.FC = () => {
  const { notify } = useApp();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
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

  const [activeTab, setActiveTab] = useState<'usuarios' | 'sql' | 'codigo' | 'config'>('usuarios');
  const [searchQuery, setSearchQuery] = useState('');
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
  const apiSettingsUrl = `https://supabase.com/dashboard/project/${projectRef}/settings/api`;

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
    saveSupabaseCredentials(inputUrl.trim(), inputKey.trim());
    notify('Credenciais atualizadas com sucesso!', 'success');
    handleTestConnection();
  };

  const handleResetConfig = () => {
    resetSupabaseCredentials();
    const defaultCreds = getSupabaseCredentials();
    setInputUrl(defaultCreds.url);
    setInputKey(defaultCreds.key);
    notify('Restaurado para as credenciais padrão!', 'info');
    handleTestConnection();
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

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    notify('Script SQL copiado para a área de transferência!', 'success');
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
// 2. SERVER-SIDE & SSR (Next.js, Remix, Express)
// Instalação: npm install @supabase/ssr @supabase/supabase-js
// ==========================================
import { createServerClient } from '@supabase/ssr';

export function criarClienteServidor(cookiesReq: { get: (name: string) => string | undefined, set: (name: string, value: string) => void }) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return cookiesReq.get(name);
      },
      set(name, value, options) {
        cookiesReq.set(name, value);
      },
      remove(name, options) {
        cookiesReq.set(name, '');
      }
    }
  });
}

// ==========================================
// 3. OPERAÇÕES CRUD NA TABELA 'usuarios'
// ==========================================

// LISTAR (READ)
export async function listarUsuarios() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// CRIAR (CREATE)
export async function criarUsuario(usuario) {
  const { data, error } = await supabase
    .from('usuarios')
    .insert([usuario])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ATUALIZAR (UPDATE)
export async function atualizarUsuario(id, dados) {
  const { data, error } = await supabase
    .from('usuarios')
    .update(dados)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ELIMINAR (DELETE)
export async function eliminarUsuario(id) {
  const { error } = await supabase
    .from('usuarios')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(nodeSnippet);
    setCopiedCode(true);
    notify('Código JavaScript / TypeScript copiado!', 'success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const filteredUsuarios = usuarios.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.nome || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.cargo || '').toLowerCase().includes(q) ||
      (u.nif || '').includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Header */}
      <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-serif font-bold text-white">Integração Supabase</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Project ID: {projectRef}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Gestão da tabela <span className="font-mono text-[#c5a47e]">usuarios</span> & cliente PostgreSQL Cloud
            </p>
          </div>
        </div>

        {/* Quick Connection Status Badge & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          <div
            className={`px-3 py-1.5 rounded-lg border text-xs flex items-center space-x-2 ${
              connStatus.conectado
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connStatus.conectado ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="font-medium text-[11px]">
              {connStatus.conectado ? 'Supabase Conectado' : 'Desconectado'}
            </span>
          </div>

          <a
            href={dashboardProjectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#c5a47e] hover:text-white border border-[#333] rounded-lg text-xs flex items-center space-x-1.5 transition-all"
            title="Abrir Dashboard no Supabase.com"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Abrir Painel Supabase</span>
          </a>

          <button
            onClick={handleTestConnection}
            disabled={loading}
            className="p-2 bg-[#1a1a1a] hover:bg-[#252525] text-neutral-200 border border-[#333] rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Testar Conexão e Recarregar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#c5a47e]' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-3 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-black font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 bg-[#0e0e0e] border-b border-[#262626] flex space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'usuarios'
              ? 'border-[#c5a47e] text-[#c5a47e]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Tabela Usuarios ({usuarios.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`py-3 text-xs font-semibold border-b-2 flex items-center space-x-2 shrink-0 transition-all cursor-pointer ${
            activeTab === 'config'
              ? 'border-[#c5a47e] text-[#c5a47e]'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Guia & Como Visualizar no Supabase</span>
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
          <span>Esquema SQL (Criar Tabela)</span>
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
          <span>Código Cliente & CRUD</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: USUÁRIOS */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4">
            {/* If table does not exist warning banner */}
            {connStatus.tested && connStatus.tabelaExiste === false && (
              <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-200">A tabela "usuarios" ainda não foi criada no Supabase</h4>
                    <p className="text-amber-300/80 mt-1">
                      A conexão está ativa, mas a tabela no PostgreSQL ainda não existe no seu projeto <strong>{projectRef}</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={sqlEditorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-amber-500 text-black font-bold rounded-lg shrink-0 hover:bg-amber-400 flex items-center space-x-1"
                  >
                    <span>Abrir SQL Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => setActiveTab('sql')}
                    className="px-3 py-1.5 bg-[#222] text-white border border-[#444] rounded-lg shrink-0 hover:bg-[#333]"
                  >
                    Ver Script
                  </button>
                </div>
              </div>
            )}

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
              <div className="flex items-center space-x-2 text-xs text-neutral-400">
                <span>URL Ativa:</span>
                <span className="font-mono text-[#c5a47e] bg-[#141414] px-2 py-1 rounded border border-[#262626] max-w-[240px] truncate">
                  {SUPABASE_URL}
                </span>
                <button
                  onClick={() => setActiveTab('config')}
                  className="text-[#c5a47e] hover:underline text-[11px] font-semibold"
                >
                  Alterar
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
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={handleOpenCreate}
                                className="px-3 py-1.5 bg-[#c5a47e] text-black rounded-lg hover:bg-[#b5946e] font-bold text-xs cursor-pointer"
                              >
                                + Criar Primeiro Usuário
                              </button>
                              <button
                                onClick={() => setActiveTab('config')}
                                className="px-3 py-1.5 bg-[#1c1c1c] text-neutral-300 border border-[#333] rounded-lg hover:bg-[#252525] text-xs cursor-pointer"
                              >
                                Como Acessar Meu Projeto Supabase
                              </button>
                            </div>
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
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#222] border border-[#333] text-[#c5a47e]">
                            {u.cargo || 'Operador'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.ativo !== false
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'
                            }`}
                          >
                            {u.ativo !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 bg-[#1c1c1c] hover:bg-[#c5a47e] hover:text-black text-[#c5a47e] border border-[#333] rounded-md transition-colors"
                              title="Editar Usuário"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              className="p-1.5 bg-[#1c1c1c] hover:bg-rose-600 hover:text-white text-neutral-400 border border-[#333] rounded-md transition-colors"
                              title="Eliminar Usuário"
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

        {/* TAB 2: GUIA & COMO VISUALIZAR NO SUPABASE */}
        {activeTab === 'config' && (
          <div className="space-y-6 max-w-4xl">
            {/* Direct Links Card */}
            <div className="p-5 bg-[#141414] border border-[#262626] rounded-xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                <div className="flex items-center space-x-2.5">
                  <ExternalLink className="w-5 h-5 text-[#c5a47e]" />
                  <h3 className="text-sm font-bold text-white">Atalhos Diretos para o seu Supabase</h3>
                </div>
                <span className="text-xs font-mono text-[#c5a47e] bg-[#1a1a1a] px-2 py-1 rounded border border-[#333]">
                  Project ID: {projectRef}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <a
                  href={dashboardProjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#c5a47e]/50 rounded-lg text-xs space-y-1 transition-all group block"
                >
                  <div className="font-bold text-white group-hover:text-[#c5a47e] flex items-center justify-between">
                    <span>1. Dashboard</span>
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#c5a47e]" />
                  </div>
                  <p className="text-[11px] text-neutral-400">Visão geral do projeto e métricas</p>
                </a>

                <a
                  href={tableEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#c5a47e]/50 rounded-lg text-xs space-y-1 transition-all group block"
                >
                  <div className="font-bold text-white group-hover:text-[#c5a47e] flex items-center justify-between">
                    <span>2. Table Editor</span>
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#c5a47e]" />
                  </div>
                  <p className="text-[11px] text-neutral-400">Ver e gerenciar tabelas e linhas</p>
                </a>

                <a
                  href={sqlEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#c5a47e]/50 rounded-lg text-xs space-y-1 transition-all group block"
                >
                  <div className="font-bold text-white group-hover:text-[#c5a47e] flex items-center justify-between">
                    <span>3. SQL Editor</span>
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#c5a47e]" />
                  </div>
                  <p className="text-[11px] text-neutral-400">Executar scripts para criar tabelas</p>
                </a>

                <a
                  href={apiSettingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#c5a47e]/50 rounded-lg text-xs space-y-1 transition-all group block"
                >
                  <div className="font-bold text-white group-hover:text-[#c5a47e] flex items-center justify-between">
                    <span>4. Chaves de API</span>
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#c5a47e]" />
                  </div>
                  <p className="text-[11px] text-neutral-400">Project URL e anon/public key</p>
                </a>
              </div>
            </div>

            {/* Diagnostic / Step-by-step why you can't view it */}
            <div className="p-5 bg-[#141414] border border-[#262626] rounded-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Info className="w-4 h-4 text-[#c5a47e]" />
                <span>Por que não consegue visualizar o projeto no Supabase? (Guia de Solução)</span>
              </h3>

              <div className="space-y-3 text-xs text-neutral-300">
                <div className="p-3 bg-[#0d0d0d] border border-[#262626] rounded-lg space-y-1">
                  <div className="font-bold text-[#c5a47e] flex items-center space-x-1.5">
                    <span>Motivo 1: Está logado numa conta diferente no Supabase</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed">
                    A chave que forneceu pertence ao projeto com ID <code className="text-white font-mono bg-[#1a1a1a] px-1.5 py-0.5 rounded">{projectRef}</code>.
                    Se aceder a <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[#c5a47e] underline">supabase.com/dashboard</a> e não vir este projeto, certifique-se de que fez login com o mesmo e-mail ou conta do GitHub onde o projeto foi criado.
                  </p>
                </div>

                <div className="p-3 bg-[#0d0d0d] border border-[#262626] rounded-lg space-y-1">
                  <div className="font-bold text-[#c5a47e] flex items-center space-x-1.5">
                    <span>Motivo 2: Criou um NOVO projeto no Supabase com outra URL</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed">
                    Se criou um projeto novo no seu painel, ele terá uma URL diferente (ex: <code className="text-white font-mono bg-[#1a1a1a] px-1.5 py-0.5 rounded">https://xyz.supabase.co</code>).
                    Basta copiar a <strong>Project URL</strong> e a <strong>Anon public Key</strong> em <em>Project Settings &gt; API</em> e colá-las no formulário abaixo!
                  </p>
                </div>

                <div className="p-3 bg-[#0d0d0d] border border-[#262626] rounded-lg space-y-1">
                  <div className="font-bold text-[#c5a47e] flex items-center space-x-1.5">
                    <span>Motivo 3: O projeto existe, mas a tabela "usuarios" não foi criada</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed">
                    O Supabase não cria tabelas automaticamente. Vá a <strong>SQL Editor</strong> no Supabase, copie o código do separador <strong>Esquema SQL</strong> deste aplicativo e clique em <strong>Run</strong>. A tabela aparecerá imediatamente no <strong>Table Editor</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Connection Settings Form */}
            <div className="p-5 bg-[#141414] border border-[#262626] rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-[#c5a47e]" />
                  <h3 className="text-sm font-bold text-white">Configurar Outro Projeto do Supabase</h3>
                </div>
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
                >
                  Restaurar Padrão
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    required
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://seu-projeto.supabase.co"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-white font-mono placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Encontra em: Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Supabase Anon / Public Key
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-white font-mono text-[11px] placeholder-neutral-600 focus:outline-hidden focus:border-[#c5a47e]"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Encontra em: Supabase Dashboard &gt; Project Settings &gt; API &gt; Project API keys &gt; anon public
                  </span>
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
                    onClick={handleTestConnection}
                    className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white border border-[#333] rounded-lg text-xs cursor-pointer"
                  >
                    Testar Conexão Atual
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: SQL SCHEMA */}
        {activeTab === 'sql' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-[#c5a47e]" />
                  <h3 className="text-sm font-bold text-white">Script SQL de Inicialização da Tabela</h3>
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
                Execute o script abaixo diretamente no painel <strong>SQL Editor</strong> do seu Supabase Dashboard para criar a tabela com suporte a RLS (Row Level Security).
              </p>
            </div>

            <div className="relative bg-[#0d0d0d] border border-[#262626] rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
              <pre>{SUPABASE_SQL_SCHEMA}</pre>
            </div>
          </div>
        )}

        {/* TAB 4: CODE SNIPPETS */}
        {activeTab === 'codigo' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Code className="w-4 h-4 text-[#c5a47e]" />
                  <span>Código de Inicialização e CRUD Supabase (JS/TS/React/Node)</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Cliente configurado com a URL e chave anónima fornecidas.
                </p>
              </div>
              <button
                onClick={handleCopyCode}
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
                className="text-neutral-400 hover:text-white p-1 rounded-md"
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
                  className="flex-1 py-2 bg-[#1c1c1c] text-neutral-300 rounded-lg hover:bg-[#252525]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-black font-bold rounded-lg shadow-md uppercase tracking-wider"
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
