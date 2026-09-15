/**
 * Gestão e Invalidação Permanente de Empresas Eliminadas e Credenciais Revogadas
 * 
 * Garante que:
 * 1. Qualquer empresa eliminada é imediatamente adicionada a uma lista negra persistente (tombstone).
 * 2. A empresa eliminada não aparece em nenhum seletor, listagem, ecrã de login ou sincronização.
 * 3. Todas as credenciais (utilizadores, passwords, PINs) da empresa eliminada deixam de funcionar imediatamente.
 * 4. Puxadas de dados do Supabase ou IndexedDB descartam sumariamente qualquer registo de empresas eliminadas.
 */

import { Company, User } from '../types';

const DELETED_COMPANIES_STORAGE_KEY = 'erp_deleted_companies_blacklist';

export interface DeletedCompanyRecord {
  id: string;
  name?: string;
  tradeName?: string;
  deletedAt: string;
}

/**
 * Retorna a lista completa de empresas eliminadas do localStorage
 */
export function getDeletedCompaniesList(): DeletedCompanyRecord[] {
  try {
    const raw = localStorage.getItem(DELETED_COMPANIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === 'string') {
          return { id: item, deletedAt: new Date().toISOString() };
        }
        return item;
      });
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Retorna todos os identificadores (IDs em minúsculas e nomes) de empresas eliminadas
 */
export function getDeletedCompanyIdentifiers(): string[] {
  const list = getDeletedCompaniesList();
  const ids = new Set<string>();
  for (const item of list) {
    if (item.id) ids.add(item.id.trim().toLowerCase());
    if (item.name) ids.add(item.name.trim().toLowerCase());
    if (item.tradeName) ids.add(item.tradeName.trim().toLowerCase());
  }
  return Array.from(ids);
}

/**
 * Verifica se um determinado ID ou nome de empresa pertence a uma empresa eliminada
 */
export function isCompanyDeleted(companyId?: string, companyName?: string): boolean {
  if (!companyId && !companyName) return false;
  const identifiers = getDeletedCompanyIdentifiers();
  if (identifiers.length === 0) return false;

  const cleanId = String(companyId || '').trim().toLowerCase();
  const cleanName = String(companyName || '').trim().toLowerCase();

  for (const ident of identifiers) {
    if (!ident) continue;
    if (cleanId && (cleanId === ident || cleanId.startsWith(`${ident}-`) || ident.startsWith(`${cleanId}-`))) {
      return true;
    }
    if (cleanName && (cleanName === ident || cleanName.includes(ident) || ident.includes(cleanName))) {
      return true;
    }
  }
  return false;
}

/**
 * Marca uma empresa como eliminada na lista negra e purga as credenciais associadas
 */
export function markCompanyAsDeleted(companyId: string, companyName?: string, tradeName?: string): void {
  if (!companyId) return;
  try {
    const list = getDeletedCompaniesList();
    const cleanId = companyId.trim().toLowerCase();
    const existingIndex = list.findIndex((c) => c.id.toLowerCase() === cleanId);
    const newRecord: DeletedCompanyRecord = {
      id: companyId,
      name: companyName?.trim(),
      tradeName: tradeName?.trim(),
      deletedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...newRecord };
    } else {
      list.push(newRecord);
    }
    localStorage.setItem(DELETED_COMPANIES_STORAGE_KEY, JSON.stringify(list));

    // Purgar credenciais e caches locais desta empresa
    purgeDeletedCompanyFromLocalStorage(companyId);
  } catch (e) {
    console.error('Erro ao marcar empresa como eliminada:', e);
  }
}

/**
 * Remove uma empresa da lista negra (usado em restauro de backup autorizado ou novo registo)
 */
export function unmarkCompanyAsDeleted(companyId: string, companyName?: string, tradeName?: string): void {
  if (!companyId) return;
  try {
    const list = getDeletedCompaniesList();
    const cleanId = companyId.trim().toLowerCase();
    const cleanName = companyName?.trim().toLowerCase();
    const cleanTrade = tradeName?.trim().toLowerCase();
    const filtered = list.filter((c) => {
      if (c.id.toLowerCase() === cleanId) return false;
      if (cleanName && c.name && c.name.toLowerCase() === cleanName) return false;
      if (cleanTrade && c.tradeName && c.tradeName.toLowerCase() === cleanTrade) return false;
      return true;
    });
    localStorage.setItem(DELETED_COMPANIES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Erro ao desmarcar empresa eliminada:', e);
  }
}

/**
 * Purgar completamente do localStorage qualquer dado ou credencial associada a uma empresa eliminada
 */
export function purgeDeletedCompanyFromLocalStorage(companyId: string, companyName?: string): void {
  try {
    const cleanId = companyId.trim().toLowerCase();
    const cleanName = companyName?.trim().toLowerCase();

    // 1. Purgar de erp_companies
    const rawCompanies = localStorage.getItem('erp_companies');
    if (rawCompanies) {
      try {
        const comps = JSON.parse(rawCompanies);
        if (Array.isArray(comps)) {
          const filtered = comps.filter((c: any) => {
            if (!c) return false;
            if (String(c.id).toLowerCase() === cleanId) return false;
            if (cleanName && (c.name?.toLowerCase() === cleanName || c.tradeName?.toLowerCase() === cleanName)) return false;
            return true;
          });
          localStorage.setItem('erp_companies', JSON.stringify(filtered));
        }
      } catch {}
    }

    // 2. Se a empresa ativa no erp_company for a eliminada, remover
    const rawActiveCompany = localStorage.getItem('erp_company');
    if (rawActiveCompany) {
      try {
        const activeComp = JSON.parse(rawActiveCompany);
        if (activeComp && String(activeComp.id).toLowerCase() === cleanId) {
          localStorage.removeItem('erp_company');
        }
      } catch {}
    }

    // 3. Purgar utilizadores vinculados a esta empresa em erp_users (invalidar credenciais)
    const rawUsers = localStorage.getItem('erp_users');
    if (rawUsers) {
      try {
        const users = JSON.parse(rawUsers);
        if (Array.isArray(users)) {
          const filtered = users.filter((u: any) => u && String(u.companyId || u.company_id).toLowerCase() !== cleanId);
          localStorage.setItem('erp_users', JSON.stringify(filtered));
        }
      } catch {}
    }

    // 4. Se o utilizador logado pertence a esta empresa, invalidar sessão imediatamente
    const rawActiveUser = localStorage.getItem('erp_user');
    if (rawActiveUser) {
      try {
        const activeUser = JSON.parse(rawActiveUser);
        if (activeUser && String(activeUser.companyId || activeUser.company_id).toLowerCase() === cleanId) {
          localStorage.removeItem('erp_user');
          localStorage.setItem('erp_isAuthenticated', 'false');
        }
      } catch {}
    }

    // 5. Encerrar sessão e limpar estado transacional
    localStorage.setItem('erp_isAuthenticated', 'false');
    localStorage.removeItem('erp_activeShift');
    localStorage.removeItem('erp_cart');

    // 6. Purgar lojas
    const rawStores = localStorage.getItem('erp_stores');
    if (rawStores) {
      try {
        const stores = JSON.parse(rawStores);
        if (Array.isArray(stores)) {
          const filtered = stores.filter((s: any) => s && String(s.companyId || s.company_id).toLowerCase() !== cleanId);
          localStorage.setItem('erp_stores', JSON.stringify(filtered));
        }
      } catch {}
    }

    // 7. Purgar armazéns
    const rawWarehouses = localStorage.getItem('erp_warehouses');
    if (rawWarehouses) {
      try {
        const warehouses = JSON.parse(rawWarehouses);
        if (Array.isArray(warehouses)) {
          const filtered = warehouses.filter((w: any) => w && String(w.companyId || w.company_id).toLowerCase() !== cleanId);
          localStorage.setItem('erp_warehouses', JSON.stringify(filtered));
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Erro ao limpar dados locais da empresa eliminada:', err);
  }
}

/**
 * Filtra uma lista de empresas removendo qualquer empresa eliminada
 */
export function filterActiveCompanies(companies: Company[]): Company[] {
  if (!Array.isArray(companies)) return [];
  return companies.filter((c) => c && c.id && !isCompanyDeleted(c.id, c.name));
}

/**
 * Filtra uma lista de utilizadores removendo utilizadores de empresas eliminadas
 * e garantindo que a empresa do utilizador ainda existe na lista de empresas ativas
 */
export function filterActiveUsers(users: User[], activeCompanies?: Company[]): User[] {
  if (!Array.isArray(users)) return [];
  return users.filter((u) => {
    if (!u || !u.id) return false;
    if (isCompanyDeleted(u.companyId)) return false;
    if (activeCompanies && activeCompanies.length > 0) {
      const companyExists = activeCompanies.some((c) => c.id === u.companyId && !isCompanyDeleted(c.id, c.name));
      if (!companyExists) return false;
    }
    return true;
  });
}

/**
 * Cria uma nova empresa inicial vazia com ID único caso todas as empresas tenham sido eliminadas
 */
export function createFreshDefaultCompany(): Company {
  const newId = `comp-${Date.now()}`;
  return {
    id: newId,
    name: 'Empresa Principal',
    tradeName: 'Empresa Principal',
    slogan: '',
    taxNumber: '',
    address: 'Sede Comercial',
    city: 'Maputo',
    postalCode: '1100',
    country: 'Moçambique',
    currency: 'MZN',
    currencySymbol: 'Mt',
    currencyPosition: 'suffix',
    currencyDecimals: 2,
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    softwareCertNumber: '4120/AT',
    saftVersion: '1.04_01',
    shareCapital: '',
    commercialRegistryNumber: '',
    defaultIban: '',
    defaultBank: '',
    activeInvoiceTemplateId: 'tmpl-agro-vendus',
    invoiceTemplates: [],
    defaultTaxRate: 16,
    vatRates: [],
    status: 'active',
    billingCycle: 'monthly',
  };
}
