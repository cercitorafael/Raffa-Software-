import {
  Company,
  Store,
  Terminal,
  Warehouse,
  User,
  ProductCategory,
  Product,
  StockItem,
  Sale,
  Customer,
  Supplier,
  AccountPayable,
  AccountReceivable,
  CashShift,
  Employee,
} from '../types';
import { defaultPermissionsByRole } from '../mockData';

export interface CompanySafetyDump {
  format: 'RAFFA_POS_COMPANY_SAFETY_DUMP';
  version: '1.0';
  exportedAt: string;
  companyId: string;
  companyName: string;
  summary: {
    storesCount: number;
    terminalsCount: number;
    warehousesCount: number;
    usersCount: number;
    categoriesCount: number;
    productsCount: number;
    stockItemsCount: number;
    salesCount: number;
    customersCount: number;
    suppliersCount: number;
    accountsPayableCount: number;
    accountsReceivableCount: number;
    shiftsCount: number;
    employeesCount: number;
    totalRecords: number;
  };
  data: {
    company: Company;
    stores: Store[];
    terminals: Terminal[];
    warehouses: Warehouse[];
    users: User[];
    categories: ProductCategory[];
    products: Product[];
    stock: StockItem[];
    salesHistory: Sale[];
    customers: Customer[];
    suppliers: Supplier[];
    accountsPayable: AccountPayable[];
    accountsReceivable: AccountReceivable[];
    shiftsHistory: CashShift[];
    employees: Employee[];
  };
}

export interface AppStateDataForBackup {
  companies: Company[];
  stores: Store[];
  terminals: Terminal[];
  warehouses: Warehouse[];
  users: User[];
  categories: ProductCategory[];
  products: Product[];
  stock: StockItem[];
  salesHistory: Sale[];
  customers: Customer[];
  suppliers: Supplier[];
  accountsPayable: AccountPayable[];
  accountsReceivable: AccountReceivable[];
  shiftsHistory: CashShift[];
  employees: Employee[];
}

/**
 * Cria o objeto completo de dump de segurança de todas as tabelas vinculadas à empresa
 */
export function generateCompanySafetyDump(
  companyId: string,
  state: AppStateDataForBackup
): CompanySafetyDump {
  const company =
    state.companies.find((c) => c.id === companyId) || {
      id: companyId,
      name: 'Empresa',
      tradeName: 'Empresa',
      taxNumber: '400000000',
    } as Company;

  const stores = state.stores.filter((s) => s.companyId === companyId);
  const storeIds = new Set(stores.map((s) => s.id));
  const terminals = state.terminals.filter((t) => storeIds.has(t.storeId));
  const warehouses = state.warehouses.filter((w) => w.companyId === companyId);
  const users = state.users.filter((u) => u.companyId === companyId);
  const categories = state.categories.filter((cat) => cat.companyId === companyId);
  const products = state.products.filter((p) => p.companyId === companyId);
  const stock = state.stock.filter((s) => s.companyId === companyId);
  const salesHistory = state.salesHistory.filter((s) => s.companyId === companyId);
  const customers = state.customers.filter((c) => c.companyId === companyId);
  const suppliers = state.suppliers.filter((s) => s.companyId === companyId);
  const accountsPayable = state.accountsPayable.filter((a) => a.companyId === companyId);
  const accountsReceivable = state.accountsReceivable.filter((a) => a.companyId === companyId);
  const shiftsHistory = state.shiftsHistory.filter((s) => s.companyId === companyId);
  const employees = state.employees.filter((e) => e.companyId === companyId);

  const totalRecords =
    1 +
    stores.length +
    terminals.length +
    warehouses.length +
    users.length +
    categories.length +
    products.length +
    stock.length +
    salesHistory.length +
    customers.length +
    suppliers.length +
    accountsPayable.length +
    accountsReceivable.length +
    shiftsHistory.length +
    employees.length;

  return {
    format: 'RAFFA_POS_COMPANY_SAFETY_DUMP',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    companyId,
    companyName: company.name || company.tradeName || companyId,
    summary: {
      storesCount: stores.length,
      terminalsCount: terminals.length,
      warehousesCount: warehouses.length,
      usersCount: users.length,
      categoriesCount: categories.length,
      productsCount: products.length,
      stockItemsCount: stock.length,
      salesCount: salesHistory.length,
      customersCount: customers.length,
      suppliersCount: suppliers.length,
      accountsPayableCount: accountsPayable.length,
      accountsReceivableCount: accountsReceivable.length,
      shiftsCount: shiftsHistory.length,
      employeesCount: employees.length,
      totalRecords,
    },
    data: {
      company,
      stores,
      terminals,
      warehouses,
      users,
      categories,
      products,
      stock,
      salesHistory,
      customers,
      suppliers,
      accountsPayable,
      accountsReceivable,
      shiftsHistory,
      employees,
    },
  };
}

/**
 * Dispara o download de um arquivo JSON contendo o dump de segurança no navegador
 */
export function downloadCompanyDump(dump: CompanySafetyDump): {
  filename: string;
  url: string;
  sizeInBytes: number;
} {
  const jsonStr = JSON.stringify(dump, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeName = (dump.companyName || 'Empresa')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 30);
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const filename = `Dump_Seguranca_${safeName}_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return {
    filename,
    url,
    sizeInBytes: blob.size,
  };
}

/**
 * Formata bytes legíveis (ex: 45.2 KB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Valida o conteúdo de um arquivo de dump de segurança
 */
export function validateCompanySafetyDump(parsed: any): {
  valid: boolean;
  error?: string;
  dump?: CompanySafetyDump;
} {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'O ficheiro fornecido não é um JSON válido.' };
  }

  // Verificar se possui estrutura de dados direta ou envelopada
  const data = parsed.data || parsed;
  const company = data.company || parsed.company;

  if (!company || !company.name) {
    return {
      valid: false,
      error: 'Estrutura inválida: Dados fiscais da empresa não encontrados no ficheiro de backup.',
    };
  }

  const companyId = company.id || parsed.companyId || `empresa-restaurada-${Date.now()}`;
  company.id = companyId;

  // Normalizar coleções
  const stores: Store[] = Array.isArray(data.stores) ? data.stores : [];
  const terminals: Terminal[] = Array.isArray(data.terminals) ? data.terminals : [];
  const warehouses: Warehouse[] = Array.isArray(data.warehouses) ? data.warehouses : [];
  const users: User[] = Array.isArray(data.users) ? data.users : [];
  const categories: ProductCategory[] = Array.isArray(data.categories) ? data.categories : [];
  const products: Product[] = Array.isArray(data.products) ? data.products : [];
  const stock: StockItem[] = Array.isArray(data.stock) ? data.stock : [];
  const salesHistory: Sale[] = Array.isArray(data.salesHistory) ? data.salesHistory : [];
  const customers: Customer[] = Array.isArray(data.customers) ? data.customers : [];
  const suppliers: Supplier[] = Array.isArray(data.suppliers) ? data.suppliers : [];
  const accountsPayable: AccountPayable[] = Array.isArray(data.accountsPayable) ? data.accountsPayable : [];
  const accountsReceivable: AccountReceivable[] = Array.isArray(data.accountsReceivable) ? data.accountsReceivable : [];
  const shiftsHistory: CashShift[] = Array.isArray(data.shiftsHistory) ? data.shiftsHistory : [];
  const employees: Employee[] = Array.isArray(data.employees) ? data.employees : [];

  // Se não houver usuários no backup, garantir um usuário admin padrão da empresa restaurada
  if (users.length === 0) {
    users.push({
      id: `usr-restored-${Date.now()}`,
      companyId,
      name: company.name || 'Administrador',
      email: company.email || 'admin@sistema.local',
      role: 'admin',
      roleId: 'admin',
      pin: 'KEYZOM',
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      permissions: { ...defaultPermissionsByRole.admin },
    });
  }

  // Garantir que todos os registos estejam associados a este companyId
  stores.forEach((s) => (s.companyId = companyId));
  warehouses.forEach((w) => (w.companyId = companyId));
  users.forEach((u) => (u.companyId = companyId));
  categories.forEach((c) => (c.companyId = companyId));
  products.forEach((p) => (p.companyId = companyId));
  stock.forEach((s) => (s.companyId = companyId));
  salesHistory.forEach((s) => (s.companyId = companyId));
  customers.forEach((c) => (c.companyId = companyId));
  suppliers.forEach((s) => (s.companyId = companyId));
  accountsPayable.forEach((a) => (a.companyId = companyId));
  accountsReceivable.forEach((a) => (a.companyId = companyId));
  shiftsHistory.forEach((s) => (s.companyId = companyId));
  employees.forEach((e) => (e.companyId = companyId));

  const totalRecords =
    1 +
    stores.length +
    terminals.length +
    warehouses.length +
    users.length +
    categories.length +
    products.length +
    stock.length +
    salesHistory.length +
    customers.length +
    suppliers.length +
    accountsPayable.length +
    accountsReceivable.length +
    shiftsHistory.length +
    employees.length;

  const validatedDump: CompanySafetyDump = {
    format: 'RAFFA_POS_COMPANY_SAFETY_DUMP',
    version: '1.0',
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    companyId,
    companyName: company.name,
    summary: {
      storesCount: stores.length,
      terminalsCount: terminals.length,
      warehousesCount: warehouses.length,
      usersCount: users.length,
      categoriesCount: categories.length,
      productsCount: products.length,
      stockItemsCount: stock.length,
      salesCount: salesHistory.length,
      customersCount: customers.length,
      suppliersCount: suppliers.length,
      accountsPayableCount: accountsPayable.length,
      accountsReceivableCount: accountsReceivable.length,
      shiftsCount: shiftsHistory.length,
      employeesCount: employees.length,
      totalRecords,
    },
    data: {
      company,
      stores,
      terminals,
      warehouses,
      users,
      categories,
      products,
      stock,
      salesHistory,
      customers,
      suppliers,
      accountsPayable,
      accountsReceivable,
      shiftsHistory,
      employees,
    },
  };

  return {
    valid: true,
    dump: validatedDump,
  };
}
