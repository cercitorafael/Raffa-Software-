/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase fornecida
export const DEFAULT_SUPABASE_URL = 'https://qfreeubflnyqrwtnhzcm.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable__qMK0CSgZL12sldy20MS7A_pqdTnQYs';

export function getSupabaseCredentials() {
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_url') : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_anon_key') : null;

  const url =
    customUrl ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    DEFAULT_SUPABASE_URL;

  const key =
    customKey ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    DEFAULT_SUPABASE_ANON_KEY;

  return { url: url.trim(), key: key.trim() };
}

export function saveSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('custom_supabase_url', url.trim());
    localStorage.setItem('custom_supabase_anon_key', key.trim());
    reinitSupabase();
  }
}

export function resetSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('custom_supabase_url');
    localStorage.removeItem('custom_supabase_anon_key');
    reinitSupabase();
  }
}

export function extractProjectRef(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.hostname.split('.');
    return parts[0] || 'qfreeubflnyqrwtnhzcm';
  } catch {
    return 'qfreeubflnyqrwtnhzcm';
  }
}

const currentCreds = getSupabaseCredentials();
export let SUPABASE_URL = currentCreds.url;
export let SUPABASE_ANON_KEY = currentCreds.key;

// Inicialização do cliente Supabase
export let supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function reinitSupabase() {
  const creds = getSupabaseCredentials();
  SUPABASE_URL = creds.url;
  SUPABASE_ANON_KEY = creds.key;
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return supabase;
}

// Interface de Tipagem para a tabela 'usuarios'
export interface Usuario {
  id?: string | number;
  nome: string;
  email: string;
  telefone?: string;
  cargo?: string;
  ativo?: boolean;
  nif?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * ============================================================================
 * FUNÇÕES CRUD PARA A TABELA 'usuarios' NO SUPABASE
 * ============================================================================
 */

/**
 * 1. LISTAR / BUSCAR USUÁRIOS (READ ALL)
 * Retorna todos os usuários ordenados por data de criação decrescente.
 */
export async function listarUsuarios(): Promise<{ data: Usuario[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Erro ao listar usuários do Supabase:', error);
    return { data: null, error };
  }
}

/**
 * 2. OBTER USUÁRIO POR ID (READ ONE)
 */
export async function obterUsuarioPorId(
  id: string | number
): Promise<{ data: Usuario | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error(`Erro ao buscar usuário com ID ${id}:`, error);
    return { data: null, error };
  }
}

/**
 * 3. CRIAR NOVO USUÁRIO (CREATE)
 */
export async function criarUsuario(
  usuario: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: Usuario | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .insert([
        {
          nome: usuario.nome,
          email: usuario.email,
          telefone: usuario.telefone || null,
          cargo: usuario.cargo || 'Operador',
          ativo: usuario.ativo !== undefined ? usuario.ativo : true,
          nif: usuario.nif || null,
          avatar_url: usuario.avatar_url || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Erro ao criar usuário no Supabase:', error);
    return { data: null, error };
  }
}

/**
 * 4. ATUALIZAR USUÁRIO (UPDATE)
 */
export async function atualizarUsuario(
  id: string | number,
  dadosAtualizados: Partial<Usuario>
): Promise<{ data: Usuario | null; error: any }> {
  try {
    const payload = { ...dadosAtualizados, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error(`Erro ao atualizar usuário com ID ${id}:`, error);
    return { data: null, error };
  }
}

/**
 * 5. ELIMINAR USUÁRIO (DELETE)
 */
export async function eliminarUsuario(
  id: string | number
): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase.from('usuarios').delete().eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    console.error(`Erro ao eliminar usuário com ID ${id}:`, error);
    return { success: false, error };
  }
}

/**
 * TESTE DE CONEXÃO AO SUPABASE
 */
export async function testarConexaoSupabase(): Promise<{
  conectado: boolean;
  mensagem: string;
  tabelaExiste?: boolean;
}> {
  try {
    const { data, error } = await supabase.from('usuarios').select('id').limit(1);

    if (error) {
      // Código PGRST204 ou PGRST116 ou 42P01 indica que a tabela ainda não foi criada no banco
      if (error.code === '42P01' || error.message?.includes('relation "usuarios" does not exist')) {
        return {
          conectado: true,
          mensagem: 'Conectado ao Supabase com sucesso! (A tabela "usuarios" ainda precisa de ser criada no SQL Editor).',
          tabelaExiste: false,
        };
      }
      return {
        conectado: false,
        mensagem: `Erro na resposta do Supabase: ${error.message}`,
      };
    }

    return {
      conectado: true,
      mensagem: 'Conexão ativa com o Supabase e tabela "usuarios" operacional!',
      tabelaExiste: true,
    };
  } catch (err: any) {
    return {
      conectado: false,
      mensagem: `Falha ao conectar: ${err.message || err}`,
    };
  }
}

/**
 * SCRIPT SQL PARA CRIAR A TABELA 'usuarios' NO SQL EDITOR DO SUPABASE
 */
export const SUPABASE_SQL_SCHEMA = `-- Copie e cole no SQL Editor do seu projeto Supabase:
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT,
    cargo TEXT DEFAULT 'Operador',
    ativo BOOLEAN DEFAULT true,
    nif TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) e permitir acesso público/anon para testes
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos" 
ON public.usuarios FOR SELECT USING (true);

CREATE POLICY "Permitir insercao para todos" 
ON public.usuarios FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualizacao para todos" 
ON public.usuarios FOR UPDATE USING (true);

CREATE POLICY "Permitir delecao para todos" 
ON public.usuarios FOR DELETE USING (true);
`;
