/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase fornecida
export const DEFAULT_SUPABASE_URL = 'https://qfreeubflnyqrwtnhzcm.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable__qMK0CSgZL12sldy20MS7A_pqdTnQYs';

export function isValidHttpUrl(stringToTest: string | null | undefined): boolean {
  if (!stringToTest || typeof stringToTest !== 'string') return false;
  const trimmed = stringToTest.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getSupabaseCredentials(): { url: string; key: string } {
  let customUrl: string | null = null;
  let customKey: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      customUrl = localStorage.getItem('custom_supabase_url');
      customKey = localStorage.getItem('custom_supabase_anon_key');
    } catch {}
  }

  let envUrl: string | undefined;
  let envKey: string | undefined;
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      envUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      envKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
    }
  } catch {}

  let url = DEFAULT_SUPABASE_URL;
  if (isValidHttpUrl(customUrl)) {
    url = customUrl!.trim();
  } else if (isValidHttpUrl(envUrl)) {
    url = envUrl!.trim();
  }

  // Safety fallback if URL is still invalid
  if (!isValidHttpUrl(url)) {
    url = DEFAULT_SUPABASE_URL;
  }

  let key = DEFAULT_SUPABASE_ANON_KEY;
  if (customKey && customKey.trim().length > 0) {
    key = customKey.trim();
  } else if (envKey && envKey.trim().length > 0) {
    key = envKey.trim();
  }
  if (!key || key.trim().length === 0) {
    key = DEFAULT_SUPABASE_ANON_KEY;
  }

  return { url: url.trim(), key: key.trim() };
}

export function saveSupabaseCredentials(url: string, key: string): { success: boolean; message?: string } {
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'https://' + formattedUrl;
  }
  if (!isValidHttpUrl(formattedUrl)) {
    return { success: false, message: 'URL do Supabase inválida. Deve ser um endereço HTTP ou HTTPS válido.' };
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('custom_supabase_url', formattedUrl);
      localStorage.setItem('custom_supabase_anon_key', key.trim());
    } catch {}
    reinitSupabase();
  }
  return { success: true };
}

export function resetSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('custom_supabase_url');
      localStorage.removeItem('custom_supabase_anon_key');
    } catch {}
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

function createSafeSupabaseClient(targetUrl: string, targetKey: string) {
  const safeUrl = isValidHttpUrl(targetUrl) ? targetUrl.trim() : DEFAULT_SUPABASE_URL;
  const safeKey = targetKey && targetKey.trim().length > 0 ? targetKey.trim() : DEFAULT_SUPABASE_ANON_KEY;
  try {
    return createClient(safeUrl, safeKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('Erro ao inicializar cliente Supabase com credenciais personalizadas, a usar fallback padrão:', err);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
}

const currentCreds = getSupabaseCredentials();
export let SUPABASE_URL = currentCreds.url;
export let SUPABASE_ANON_KEY = currentCreds.key;

// Inicialização segura do cliente Supabase
export let supabase = createSafeSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function reinitSupabase() {
  const creds = getSupabaseCredentials();
  SUPABASE_URL = creds.url;
  SUPABASE_ANON_KEY = creds.key;
  supabase = createSafeSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
 * TESTE DE CONEXÃO AO SUPABASE E DIAGNÓSTICO
 */
export async function testarConexaoSupabase(): Promise<{
  conectado: boolean;
  mensagem: string;
  tabelaExiste?: boolean;
  detalhes?: {
    urlValida: boolean;
    chaveValida: boolean;
    pingOk: boolean;
    erro?: string;
  };
}> {
  const creds = getSupabaseCredentials();
  if (!isValidHttpUrl(creds.url)) {
    return {
      conectado: false,
      mensagem: 'A URL do Supabase é inválida ou está mal formatada.',
      detalhes: { urlValida: false, chaveValida: false, pingOk: false, erro: 'URL inválida' },
    };
  }

  if (!creds.key || creds.key.trim().length < 10) {
    return {
      conectado: false,
      mensagem: 'A chave anon do Supabase parece inválida ou demasiado curta.',
      detalhes: { urlValida: true, chaveValida: false, pingOk: false, erro: 'Chave inválida' },
    };
  }

  try {
    const { data, error } = await supabase.from('usuarios').select('id').limit(1);

    if (error) {
      // Código 42P01 indica que o banco está acessível mas a tabela ainda não foi criada
      if (error.code === '42P01' || error.message?.includes('relation "usuarios" does not exist') || error.message?.includes('does not exist')) {
        return {
          conectado: true,
          mensagem: 'Conectado ao Supabase! Porém as tabelas ainda precisam de ser criadas (execute o script SQL).',
          tabelaExiste: false,
          detalhes: { urlValida: true, chaveValida: true, pingOk: true, erro: 'Tabelas não criadas (42P01)' },
        };
      }

      // Erro de autorização / RLS / Key inválida
      if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('apikey') || error.message?.includes('unauthorized')) {
        return {
          conectado: false,
          mensagem: `Chave de API inválida ou expirada: ${error.message}`,
          detalhes: { urlValida: true, chaveValida: false, pingOk: false, erro: error.message },
        };
      }

      return {
        conectado: false,
        mensagem: `Erro na resposta do Supabase: ${error.message} (Código: ${error.code || 'N/A'})`,
        detalhes: { urlValida: true, chaveValida: true, pingOk: false, erro: error.message },
      };
    }

    return {
      conectado: true,
      mensagem: 'Conexão ativa com o Supabase e tabela "usuarios" operacional!',
      tabelaExiste: true,
      detalhes: { urlValida: true, chaveValida: true, pingOk: true },
    };
  } catch (err: any) {
    return {
      conectado: false,
      mensagem: `Falha de rede ao conectar ao Supabase: ${err.message || err}`,
      detalhes: { urlValida: true, chaveValida: true, pingOk: false, erro: err?.message || String(err) },
    };
  }
}

export interface TableDiagnosticResult {
  table: string;
  label: string;
  exists: boolean;
  canRead: boolean;
  canWrite: boolean;
  rowCount: number;
  error?: string;
}

export async function diagnosticarTodasTabelasSupabase(): Promise<{
  allPassed: boolean;
  totalTables: number;
  existingTables: number;
  tables: Record<string, TableDiagnosticResult>;
  summaryMessage: string;
}> {
  const tableList: { name: string; label: string }[] = [
    { name: 'empresas', label: 'Empresa & Logótipo' },
    { name: 'lojas', label: 'Lojas & Filiais' },
    { name: 'usuarios', label: 'Utilizadores' },
    { name: 'categorias', label: 'Categorias' },
    { name: 'produtos', label: 'Produtos / Artigos' },
    { name: 'clientes', label: 'Clientes' },
    { name: 'fornecedores', label: 'Fornecedores' },
    { name: 'armazens', label: 'Armazéns' },
    { name: 'stock', label: 'Stock / Inventário' },
    { name: 'vendas', label: 'Vendas & Faturação' },
    { name: 'contas_pagar', label: 'Contas a Pagar' },
    { name: 'contas_receber', label: 'Contas a Receber' },
    { name: 'turnos_caixa', label: 'Turnos de Caixa' },
  ];

  const results: Record<string, TableDiagnosticResult> = {};
  let existingCount = 0;

  for (const t of tableList) {
    try {
      const { data, error, count } = await supabase
        .from(t.name)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          results[t.name] = {
            table: t.name,
            label: t.label,
            exists: false,
            canRead: false,
            canWrite: false,
            rowCount: 0,
            error: 'Tabela ainda não criada no banco de dados (execute o script SQL no Supabase).',
          };
        } else {
          results[t.name] = {
            table: t.name,
            label: t.label,
            exists: true, // table might exist but RLS blocked
            canRead: false,
            canWrite: false,
            rowCount: 0,
            error: `Erro ao ler: ${error.message} (Verifique as políticas RLS no Supabase)`,
          };
          existingCount++;
        }
      } else {
        results[t.name] = {
          table: t.name,
          label: t.label,
          exists: true,
          canRead: true,
          canWrite: true,
          rowCount: typeof count === 'number' ? count : (Array.isArray(data) ? (data as any[]).length : 0),
        };
        existingCount++;
      }
    } catch (e: any) {
      results[t.name] = {
        table: t.name,
        label: t.label,
        exists: false,
        canRead: false,
        canWrite: false,
        rowCount: 0,
        error: e.message || 'Erro inesperado na verificação',
      };
    }
  }

  const allPassed = existingCount === tableList.length && Object.values(results).every((r) => r.canRead);
  const summaryMessage = allPassed
    ? `Todas as ${tableList.length} tabelas do OmniERP & POS estão criadas e operacionais no Supabase!`
    : `${existingCount} de ${tableList.length} tabelas estão acessíveis. ${tableList.length - existingCount} precisam de ser criadas executando o script SQL.`;

  return {
    allPassed,
    totalTables: tableList.length,
    existingTables: existingCount,
    tables: results,
    summaryMessage,
  };
}

/**
 * SCRIPT SQL COMPLETO PARA CRIAR TODAS AS TABELAS DO SISTEMA NO SQL EDITOR DO SUPABASE
 * (Inclui Realtime, RLS e suporte a REPLICA IDENTITY FULL para que exclusões sejam capturadas em tempo real)
 */
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SCHEMA COMPLETO POS & ERP ENTERPRISE PARA SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase (supabase.com/dashboard)
-- ==============================================================================

-- 1. TABELA DE EMPRESAS & CONFIGURAÇÃO FISCAL
CREATE TABLE IF NOT EXISTS public.empresas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    trade_name TEXT,
    tax_number TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Moçambique',
    currency TEXT DEFAULT 'MZN',
    currency_symbol TEXT DEFAULT 'Mt',
    currency_position TEXT DEFAULT 'suffix',
    currency_decimals NUMERIC DEFAULT 2,
    phone TEXT,
    mobile TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    software_cert_number TEXT DEFAULT '0000/AT',
    saft_version TEXT DEFAULT '1.04_01',
    share_capital TEXT,
    commercial_registry_number TEXT,
    default_iban TEXT,
    default_bank TEXT,
    active_invoice_template_id TEXT,
    invoice_templates JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE LOJAS & FILIAIS
CREATE TABLE IF NOT EXISTS public.lojas (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp-1',
    code TEXT,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    phone TEXT,
    manager_id TEXT,
    default_warehouse_id TEXT,
    terminals_count NUMERIC DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE UTILIZADORES
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp-1',
    store_id TEXT DEFAULT 'store-1',
    nome TEXT NOT NULL,
    name TEXT,
    email TEXT,
    cargo TEXT DEFAULT 'caixa',
    role TEXT DEFAULT 'caixa',
    pin TEXT DEFAULT '1234',
    telefone TEXT,
    phone TEXT,
    ativo BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categorias (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE PRODUTOS / ARTIGOS
CREATE TABLE IF NOT EXISTS public.produtos (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp-1',
    sku TEXT,
    barcode TEXT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Geral',
    price NUMERIC DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    tax_rate NUMERIC DEFAULT 16,
    unit TEXT DEFAULT 'un',
    min_stock NUMERIC DEFAULT 0,
    max_stock NUMERIC DEFAULT 0,
    image_url TEXT,
    has_batch_control BOOLEAN DEFAULT false,
    supplier_id TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp-1',
    name TEXT NOT NULL,
    tax_number TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    loyalty_points NUMERIC DEFAULT 0,
    loyalty_tier TEXT DEFAULT 'Bronze',
    total_spent NUMERIC DEFAULT 0,
    credit_limit NUMERIC DEFAULT 0,
    current_credit NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA DE FORNECEDORES
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp-1',
    code TEXT,
    name TEXT NOT NULL,
    trade_name TEXT,
    tax_number TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    payment_terms TEXT DEFAULT 'Pronto Pagamento',
    iban TEXT,
    rating NUMERIC DEFAULT 5,
    categories JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABELA DE ARMAZÉNS
CREATE TABLE IF NOT EXISTS public.armazens (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp-1',
    store_id TEXT,
    name TEXT NOT NULL,
    code TEXT,
    location TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. TABELA DE STOCK / INVENTÁRIO
CREATE TABLE IF NOT EXISTS public.stock (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    quantity NUMERIC DEFAULT 0,
    reserved NUMERIC DEFAULT 0,
    avg_cost NUMERIC DEFAULT 0,
    batch_number TEXT,
    expiry_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TABELA DE VENDAS & FATURAÇÃO
CREATE TABLE IF NOT EXISTS public.vendas (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp-1',
    store_id TEXT DEFAULT 'store-1',
    terminal_id TEXT DEFAULT 'term-1',
    invoice_number TEXT NOT NULL,
    invoice_type TEXT DEFAULT 'FS',
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_id TEXT,
    customer_name TEXT,
    customer_tax_number TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    discount_total NUMERIC DEFAULT 0,
    tax_total NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    payments JSONB DEFAULT '[]'::jsonb,
    change_amount NUMERIC DEFAULT 0,
    operator_id TEXT,
    operator_name TEXT,
    shift_id TEXT,
    fiscal_hash TEXT,
    previous_hash TEXT,
    atcud TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. TABELA DE CONTAS A PAGAR
CREATE TABLE IF NOT EXISTS public.contas_pagar (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp-1',
    supplier_id TEXT,
    supplier_name TEXT,
    document_number TEXT,
    date TEXT,
    due_date TEXT,
    amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pendente',
    payment_date TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. TABELA DE CONTAS A RECEBER
CREATE TABLE IF NOT EXISTS public.contas_receber (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp-1',
    customer_id TEXT,
    customer_name TEXT,
    document_number TEXT,
    date TEXT,
    due_date TEXT,
    amount NUMERIC DEFAULT 0,
    received_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pendente',
    receipt_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. TABELA DE TURNOS DE CAIXA
CREATE TABLE IF NOT EXISTS public.turnos_caixa (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp-1',
    store_id TEXT DEFAULT 'store-1',
    terminal_id TEXT DEFAULT 'term-1',
    operator_id TEXT,
    operator_name TEXT,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'aberto',
    initial_cash NUMERIC DEFAULT 0,
    final_cash_reported NUMERIC,
    final_cash_system NUMERIC,
    cash_difference NUMERIC DEFAULT 0,
    total_sales NUMERIC DEFAULT 0,
    total_cash NUMERIC DEFAULT 0,
    total_cards NUMERIC DEFAULT 0,
    total_mbway NUMERIC DEFAULT 0,
    total_transfers NUMERIC DEFAULT 0,
    total_vouchers NUMERIC DEFAULT 0,
    sangria_total NUMERIC DEFAULT 0,
    suprimento_total NUMERIC DEFAULT 0,
    movements JSONB DEFAULT '[]'::jsonb,
    z_report_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- REPLICA IDENTITY FULL (Essencial para receber dados completos em eventos DELETE no Realtime)
-- ==============================================================================
ALTER TABLE public.empresas REPLICA IDENTITY FULL;
ALTER TABLE public.lojas REPLICA IDENTITY FULL;
ALTER TABLE public.usuarios REPLICA IDENTITY FULL;
ALTER TABLE public.categorias REPLICA IDENTITY FULL;
ALTER TABLE public.produtos REPLICA IDENTITY FULL;
ALTER TABLE public.clientes REPLICA IDENTITY FULL;
ALTER TABLE public.fornecedores REPLICA IDENTITY FULL;
ALTER TABLE public.armazens REPLICA IDENTITY FULL;
ALTER TABLE public.stock REPLICA IDENTITY FULL;
ALTER TABLE public.vendas REPLICA IDENTITY FULL;
ALTER TABLE public.contas_pagar REPLICA IDENTITY FULL;
ALTER TABLE public.contas_receber REPLICA IDENTITY FULL;
ALTER TABLE public.turnos_caixa REPLICA IDENTITY FULL;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & POLÍTICAS DE ACESSO TOTAL (Anon / Authenticated)
-- ==============================================================================
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'empresas', 'lojas', 'usuarios', 'categorias', 'produtos', 
        'clientes', 'fornecedores', 'armazens', 'stock', 'vendas', 
        'contas_pagar', 'contas_receber', 'turnos_caixa'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Acesso total publico %s" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Acesso total publico %s" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
    END LOOP;
END $$;

-- ==============================================================================
-- HABILITAR REALTIME NO SUPABASE
-- ==============================================================================
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'empresas', 'lojas', 'usuarios', 'categorias', 'produtos', 
        'clientes', 'fornecedores', 'armazens', 'stock', 'vendas', 
        'contas_pagar', 'contas_receber', 'turnos_caixa'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
        EXCEPTION WHEN OTHERS THEN
            -- Já adicionado ou publicação existente
            NULL;
        END;
    END LOOP;
END $$;
`;

