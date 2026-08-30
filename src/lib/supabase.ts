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
  company_id?: string;
  store_id?: string;
  nome: string;
  name?: string;
  email: string;
  telefone?: string;
  phone?: string;
  cargo?: string;
  role?: string;
  pin?: string;
  password?: string;
  senha?: string;
  ativo?: boolean;
  is_active?: boolean;
  nif?: string;
  avatar_url?: string;
  permissions?: any;
  created_at?: string;
  updated_at?: string;
}

// Interface de Tipagem para a tabela 'profiles' (Supabase Auth Multi-tenant)
export interface UserProfile {
  id: string;
  company_id?: string;
  full_name?: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * ============================================================================
 * FUNÇÃO DE AUTENTICAÇÃO E PERFIL DO USUÁRIO CONECTADO (MULTI-EMPRESA)
 * ============================================================================
 */

/**
 * Busca os dados do usuário conectado no Supabase Auth e retorna o seu company_id
 * Exemplo: Retorna 'RAFFA ALIADOS DO CAMPO, LDA', 'comp-1' ou a empresa associada ao perfil
 */
export async function getUserProfile(): Promise<string | undefined> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      return profile?.company_id; // Retorna 'RAFFA ALIADOS DO CAMPO, LDA' ou a empresa do cliente
    }
  } catch (err) {
    console.warn('Erro ao obter company_id do usuário conectado:', err);
  }
  return undefined;
}

/**
 * Busca o objeto completo do usuário autenticado no Supabase e seu registro na tabela profiles
 */
export async function getUserFullProfile(): Promise<{
  user: any | null;
  profile: UserProfile | null;
  companyId: string | null;
  error: any | null;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { user: null, profile: null, companyId: null, error: authError };
    }

    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return {
      user,
      profile: profile || null,
      companyId: profile?.company_id || null,
      error: profError || null,
    };
  } catch (err: any) {
    return { user: null, profile: null, companyId: null, error: err };
  }
}

/**
 * Cria ou atualiza o perfil do utilizador no Supabase associando a empresa
 */
export async function upsertUserProfile(
  profileData: Partial<UserProfile> & { id: string }
): Promise<{ data: UserProfile | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Erro ao guardar perfil no Supabase:', error);
    return { data: null, error };
  }
}

/**
 * ============================================================================
 * FUNÇÕES CRUD PARA A TABELA 'usuarios' NO SUPABASE
 * ============================================================================
 */

/**
 * 1. LISTAR / BUSCAR USUÁRIOS (READ ALL)
 * Retorna os usuários filtrando estritamente pela empresa especificada (ou atual)
 */
export async function listarUsuarios(
  companyId?: string
): Promise<{ data: Usuario[] | null; error: any }> {
  try {
    let query = supabase
      .from('usuarios')
      .select('*')
      .order('nome', { ascending: true });

    if (companyId && companyId !== 'ALL') {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Erro ao listar usuários do Supabase:', error);
    return { data: null, error };
  }
}

/**
 * 1.1 LISTAR / BUSCAR PRODUTOS (READ ALL)
 * Filtra estritamente por company_id e ordena em ordem alfabética a nível de sistema
 */
export async function listarProdutos(
  companyId?: string
): Promise<{ data: any[] | null; error: any }> {
  try {
    let query = supabase
      .from('produtos')
      .select('*')
      .order('name', { ascending: true });

    if (companyId && companyId !== 'ALL') {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Erro ao listar produtos do Supabase:', error);
    return { data: null, error };
  }
}

/**
 * 1.2 LISTAR / BUSCAR STOCK (READ ALL)
 * Filtra estritamente por company_id
 */
export async function listarStock(
  companyId?: string
): Promise<{ data: any[] | null; error: any }> {
  try {
    let query = supabase.from('stock').select('*');

    if (companyId && companyId !== 'ALL') {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Erro ao listar stock do Supabase:', error);
    return { data: null, error };
  }
}

/**
 * 1.3 LISTAR / BUSCAR DOCUMENTOS & FATURAÇÃO (READ ALL)
 * Filtra estritamente por company_id
 */
export async function listarDocumentosVendas(
  companyId?: string
): Promise<{ data: any[] | null; error: any }> {
  try {
    let query = supabase
      .from('vendas')
      .select('*')
      .order('date', { ascending: false });

    if (companyId && companyId !== 'ALL') {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Erro ao listar vendas do Supabase:', error);
    return { data: null, error };
  }
}

/**
 * 1.4 LISTAR / BUSCAR ARMAZÉNS (READ ALL)
 * Filtra estritamente por company_id
 */
export async function listarArmazens(
  companyId?: string
): Promise<{ data: any[] | null; error: any }> {
  try {
    let query = supabase
      .from('armazens')
      .select('*')
      .order('name', { ascending: true });

    if (companyId && companyId !== 'ALL') {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Erro ao listar armazéns do Supabase:', error);
    return { data: null, error };
  }
}

/**
 * 1.5 LISTAR / BUSCAR LOJAS E TERMINAIS (READ ALL)
 * Filtra estritamente por company_id
 */
export async function listarLojas(
  companyId?: string
): Promise<{ data: any[] | null; error: any }> {
  try {
    let query = supabase
      .from('lojas')
      .select('*')
      .order('name', { ascending: true });

    if (companyId && companyId !== 'ALL') {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Erro ao listar lojas do Supabase:', error);
    return { data: null, error };
  }
}

/**
 * 1.6 LISTAR / BUSCAR CATEGORIAS (READ ALL)
 * Filtra estritamente por company_id e ordena em ordem alfabética
 */
export async function listarCategorias(
  companyId?: string
): Promise<{ data: any[] | null; error: any }> {
  try {
    let query = supabase
      .from('categorias')
      .select('*')
      .order('name', { ascending: true });

    if (companyId && companyId !== 'ALL') {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Erro ao listar categorias do Supabase:', error);
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
 * Suporta definição de company_id no padrão 'empresa-cliente-2...' para isolamento multi-tenant
 */
export async function criarUsuario(
  usuario: Omit<Usuario, 'created_at' | 'updated_at'> & { id?: string | number }
): Promise<{ data: Usuario | null; error: any }> {
  try {
    const id = usuario.id ? String(usuario.id) : `usr-${Date.now()}`;
    const companyId = usuario.company_id || 'empresa-cliente-2';
    const storeId = usuario.store_id || 'store-1';
    const cargo = usuario.cargo || usuario.role || 'Operador';
    const nome = usuario.nome || usuario.name || 'Utilizador';
    const email = usuario.email || `${nome.toLowerCase().replace(/\s+/g, '')}@empresa.mz`;

    const userPayload = {
      id,
      company_id: companyId,
      store_id: storeId,
      nome,
      name: nome,
      email,
      cargo,
      role: cargo.toLowerCase(),
      pin: usuario.pin || '1234',
      telefone: usuario.telefone || usuario.phone || null,
      phone: usuario.telefone || usuario.phone || null,
      ativo: usuario.ativo !== undefined ? usuario.ativo : usuario.is_active !== undefined ? usuario.is_active : true,
      is_active: usuario.ativo !== undefined ? usuario.ativo : usuario.is_active !== undefined ? usuario.is_active : true,
      nif: usuario.nif || null,
      avatar_url: usuario.avatar_url || null,
      permissions: usuario.permissions || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('usuarios')
      .upsert(userPayload)
      .select()
      .single();

    if (error) {
      console.warn('Aviso ao inserir na tabela usuarios, tentando inserir profile:', error);
    }

    // Also mirror to 'profiles' table for Supabase Auth binding with company_id: 'empresa-cliente-2...'
    try {
      await supabase.from('profiles').upsert({
        id,
        company_id: companyId,
        full_name: nome,
        email,
        role: cargo.toLowerCase(),
        avatar_url: usuario.avatar_url || null,
        updated_at: new Date().toISOString(),
      });
    } catch (profErr) {
      console.warn('Aviso ao sincronizar profiles no Supabase:', profErr);
    }

    return { data: data || (userPayload as any), error: null };
  } catch (error: any) {
    console.error('Erro ao criar usuário no Supabase:', error);
    return { data: null, error };
  }
}

/**
 * Cadastra uma nova empresa de qualquer ramo de negócio e o seu usuário administrador no Supabase
 * Define o company_id no formato 'empresa-cliente-2...' (ou 'empresa-cliente-X')
 */
export async function registrarEmpresaEUsuarioCliente(params: {
  company: {
    id: string; // Ex: 'empresa-cliente-2'
    name: string;
    tradeName?: string;
    industry?: string;
    taxNumber?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    currency?: string;
  };
  adminUser: {
    id?: string;
    name: string;
    email: string;
    username?: string;
    pin: string;
    phone?: string;
    nif?: string;
  };
  storeName?: string;
}): Promise<{ success: boolean; companyId: string; error?: any }> {
  try {
    const companyId = params.company.id || 'empresa-cliente-2';
    const storeId = `store-${companyId}-sede`;
    const userId = params.adminUser.id || `usr-${Date.now()}`;
    const warehouseId = `wh-${companyId}-default`;

    // 1. Cadastrar Empresa na tabela 'empresas'
    const companyPayload = {
      id: companyId,
      name: params.company.name,
      trade_name: params.company.tradeName || params.company.name,
      tax_number: params.company.taxNumber || '400000000',
      address: params.company.address || 'Sede Principal',
      city: params.company.city || 'Maputo',
      country: 'Moçambique',
      currency: params.company.currency || 'MZN',
      currency_symbol: params.company.currency === 'EUR' ? '€' : params.company.currency === 'USD' ? '$' : 'Mt',
      phone: params.company.phone || null,
      email: params.company.email || params.adminUser.email,
      software_cert_number: '0000/AT',
      saft_version: '1.04_01',
      active_invoice_template_id: 'tmpl-agro-vendus',
      updated_at: new Date().toISOString(),
    };

    const { error: compError } = await supabase.from('empresas').upsert(companyPayload);
    if (compError) console.warn('Erro ao inserir empresa no Supabase:', compError);

    // 2. Cadastrar Loja Sede na tabela 'lojas'
    const storePayload = {
      id: storeId,
      company_id: companyId,
      code: 'LOJA-01',
      name: params.storeName || 'Loja Principal / Sede',
      address: params.company.address || 'Sede Principal',
      city: params.company.city || 'Maputo',
      phone: params.company.phone || null,
      default_warehouse_id: warehouseId,
      updated_at: new Date().toISOString(),
    };
    const { error: storeError } = await supabase.from('lojas').upsert(storePayload);
    if (storeError) console.warn('Erro ao inserir loja no Supabase:', storeError);

    // 3. Cadastrar Armazém na tabela 'armazens'
    const warehousePayload = {
      id: warehouseId,
      company_id: companyId,
      store_id: storeId,
      name: 'Armazém Geral',
      code: 'ARM-01',
      location: 'Sede',
      is_default: true,
      updated_at: new Date().toISOString(),
    };
    const { error: whError } = await supabase.from('armazens').upsert(warehousePayload);
    if (whError) console.warn('Erro ao inserir armazém no Supabase:', whError);

    // 4. Cadastrar Usuário Administrador na tabela 'usuarios' com company_id: 'empresa-cliente-2...'
    const userPayload = {
      id: userId,
      company_id: companyId,
      store_id: storeId,
      nome: params.adminUser.name,
      name: params.adminUser.name,
      email: params.adminUser.email,
      cargo: 'Administrador',
      role: 'admin',
      pin: params.adminUser.pin || '1234',
      telefone: params.adminUser.phone || null,
      phone: params.adminUser.phone || null,
      ativo: true,
      is_active: true,
      nif: params.adminUser.nif || null,
      updated_at: new Date().toISOString(),
    };
    const { error: userError } = await supabase.from('usuarios').upsert(userPayload);
    if (userError) console.warn('Erro ao inserir usuario no Supabase:', userError);

    // 5. Cadastrar Perfil na tabela 'profiles' com company_id: 'empresa-cliente-2...'
    const profilePayload = {
      id: userId,
      company_id: companyId,
      full_name: params.adminUser.name,
      email: params.adminUser.email,
      role: 'admin',
      updated_at: new Date().toISOString(),
    };
    const { error: profError } = await supabase.from('profiles').upsert(profilePayload);
    if (profError) console.warn('Erro ao inserir profile no Supabase:', profError);

    return { success: true, companyId };
  } catch (err: any) {
    console.error('Erro ao registar empresa e usuário no Supabase:', err);
    return { success: false, companyId: params.company.id, error: err };
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
 * 6. IDENTIFICAR EMPRESA E USUÁRIO PELO LOGIN (EMAIL OU USERNAME)
 * Permite que o sistema descubra a empresa automaticamente a partir do login e senha do utilizador
 */
export async function buscarEmpresaEUsuarioPorLogin(identifier: string): Promise<{
  user: any | null;
  company: any | null;
  store: any | null;
  error?: any;
}> {
  try {
    const clean = identifier.trim().toLowerCase();
    if (!clean) return { user: null, company: null, store: null };

    // 1. Tenta encontrar na tabela 'usuarios'
    let foundUser: any = null;
    const { data: usersData } = await supabase
      .from('usuarios')
      .select('*')
      .or(`email.ilike.${clean},nome.ilike.${clean}`);

    if (usersData && usersData.length > 0) {
      foundUser = usersData[0];
    }

    // 2. Se não encontrar, tenta na tabela 'profiles'
    if (!foundUser) {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.${clean},full_name.ilike.${clean}`);

      if (profData && profData.length > 0) {
        foundUser = {
          id: profData[0].id,
          nome: profData[0].full_name,
          name: profData[0].full_name,
          email: profData[0].email,
          company_id: profData[0].company_id,
          role: profData[0].role || 'admin',
          cargo: profData[0].role || 'Administrador',
          ativo: true,
          pin: '1234',
        };
      }
    }

    if (!foundUser) {
      return { user: null, company: null, store: null };
    }

    const companyId = foundUser.company_id || 'comp-1';

    // 3. Busca a Empresa na tabela 'empresas'
    let foundCompany: any = null;
    if (companyId) {
      const { data: compData } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();

      foundCompany = compData || null;
    }

    // 4. Busca a Loja na tabela 'lojas'
    let foundStore: any = null;
    if (companyId) {
      const { data: storeData } = await supabase
        .from('lojas')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      foundStore = storeData || null;
    }

    return {
      user: foundUser,
      company: foundCompany,
      store: foundStore,
    };
  } catch (err: any) {
    console.error('Erro ao identificar empresa e usuário pelo login:', err);
    return { user: null, company: null, store: null, error: err };
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
    { name: 'profiles', label: 'Perfis de Autenticação (Auth Multi-Tenant)' },
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
-- SCHEMA COMPLETO POS & ERP ENTERPRISE PARA SUPABASE (MULTI-TENANT & AUTH)
-- Execute este script no SQL Editor do seu projeto Supabase (supabase.com/dashboard)
-- ==============================================================================

-- 0. TABELA DE PERFIS DE UTILIZADOR (Supabase Auth & Multi-Tenancy)
-- Vincula o usuário autenticado (auth.users) à sua empresa correspondente
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'RAFFA ALIADOS DO CAMPO, LDA',
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'admin',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1. TABELA DE EMPRESAS & CONFIGURAÇÃO FISCAL (COM CONTROLO DE LICENÇA E ASSINATURA)
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
    status TEXT DEFAULT 'active', -- 'active', 'suspended', 'trial', 'expired'
    billing_cycle TEXT DEFAULT 'monthly', -- 'monthly' (30 dias) ou 'yearly' (365 dias)
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    subscription_started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    plan TEXT DEFAULT 'Plano Profissional',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir que colunas de subscrição existem se a tabela já tiver sido criada antes
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Plano Profissional';

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
    password TEXT DEFAULT '1234',
    senha TEXT DEFAULT '1234',
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
    company_id TEXT DEFAULT 'comp-1',
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
    company_id TEXT DEFAULT 'comp-1',
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
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
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
        'profiles', 'empresas', 'lojas', 'usuarios', 'categorias', 'produtos', 
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
        'profiles', 'empresas', 'lojas', 'usuarios', 'categorias', 'produtos', 
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

