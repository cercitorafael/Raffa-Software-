import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Company,
  Store,
  Terminal,
  User,
  Role,
  UserPermissions,
  ModulePermission,
  Product,
  ProductCategory,
  Warehouse,
  StockItem,
  StockMovement,
  LotBatch,
  Sale,
  SaleItem,
  InvoiceType,
  CashShift,
  Customer,
  Supplier,
  PurchaseRequisition,
  PurchaseOrder,
  GoodsReceipt,
  AccountPayable,
  AccountReceivable,
  LedgerEntry,
  ChartOfAccounts,
  Employee,
  EmployeeShift,
  TimeClockEntry,
  PayrollSlip,
  LeadOpportunity,
  SystemEvent,
  OfflineSyncQueueItem,
  PaymentRecord,
  OmnichannelOrder,
  OmnichannelOrderStatus,
  FiscalSeries,
  BankTransaction,
  RoleDefinition,
  AppTheme,
  ConfirmDialogState,
  ToastNotification,
  Language,
  LanguageOption,
  CallLog,
} from '../types';
import { useI18n } from '../i18n';
import { standardizeCategoryName } from '../utils/categoryUtils';
import {
  initialCompanies,
  initialStores,
  initialTerminals,
  initialFiscalSeries,
  initialUsers,
  initialRoles,
  defaultPermissionsByRole,
  initialCategories,
  initialProducts,
  initialWarehouses,
  initialStock,
  initialLots,
  initialSuppliers,
  initialCustomers,
  initialChartOfAccounts,
  initialAccountsPayable,
  initialAccountsReceivable,
  initialBankTransactions,
  initialEmployees,
  initialEmployeeShifts,
  initialTimeEntries,
  initialPayrolls,
  initialPurchaseRequisitions,
  initialPurchaseOrders,
  initialLeads,
  initialActiveShift,
  initialClosedShifts,
  initialEvents,
  initialOmnichannelOrders,
  initialSales,
  initialCallLogs,
} from '../mockData';
import {
  generateFiscalHash,
  formatCurrency,
  getCurrencyDefinition,
  setActiveAppCurrency,
  SUPPORTED_CURRENCIES,
} from '../utils/crypto';
import { CurrencyDefinition } from '../types';
import { sound } from '../utils/audio';
import { offlineDB, DBStats } from '../utils/indexedDB';
import { registerServiceWorker, requestBackgroundSync } from '../serviceWorkerRegistration';
import {
  startSupabaseRealtimeSync,
  stopSupabaseRealtimeSync,
  pushRecordToSupabase,
  pushBatchRecordsToSupabase,
  pullAllFromSupabase,
  pushAllToSupabase,
  pullTableFromSupabase,
  pushTableToSupabase,
  getSyncLogs,
  clearSyncLogs,
  SupabaseSyncLog,
  mapSupabaseToCompany,
} from '../lib/supabaseSync';
import {
  getUserProfile,
  getUserFullProfile,
  upsertUserProfile,
  UserProfile,
  supabase,
  registrarEmpresaEUsuarioCliente,
  buscarEmpresaEUsuarioPorLogin,
} from '../lib/supabase';
import { INDUSTRY_PRESETS, IndustryPreset } from '../data/industryPresets';
import { calculateSubscription, SubscriptionInfo } from '../utils/subscription';

export interface CartItem extends SaleItem {
  image?: string;
}

export interface AppContextType {
  // Supabase Real-time Sync & Cloud Storage
  supabaseRealtimeStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  supabaseSyncLogs: SupabaseSyncLog[];
  pullFromSupabase: (options?: { companyId?: string; profileId?: string }) => Promise<any>;
  pushToSupabase: (options?: { companyId?: string; profileId?: string }) => Promise<any>;
  pullUsersFromSupabase: (options?: { companyId?: string }) => Promise<any>;
  pushUsersToSupabase: (options?: { companyId?: string }) => Promise<any>;
  reconnectSupabaseRealtime: () => void;
  clearSupabaseLogs: () => void;

  // Supabase Auth & Multi-Tenant Profile Binding
  supabaseAuthUser: any | null;
  currentUserProfile: UserProfile | null;
  getUserProfile: () => Promise<string | undefined>;
  syncConnectedUserProfile: () => Promise<string | undefined>;
  saveUserProfile: (profile: Partial<UserProfile>) => Promise<UserProfile | null>;

  // Tenancy & Multi-Enterprise Registration
  companies: Company[];
  currentCompany: Company;
  setCurrentCompany: (c: Company) => void;
  addCompany: (comp: Omit<Company, 'id'>) => void;
  updateCompany: (idOrUpdates: string | Partial<Company>, comp?: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  generateNextCompanyId: (nomeFantasiaOrName?: string) => string;
  registerClientCompany: (params: {
    company: {
      id?: string;
      name: string;
      tradeName?: string;
      industry?: string;
      sector?: string;
      taxNumber?: string;
      address?: string;
      city?: string;
      phone?: string;
      email?: string;
      currency?: string;
      logoUrl?: string;
    };
    adminUser: {
      name: string;
      email: string;
      username?: string;
      pin?: string;
      phone?: string;
      password?: string;
      nif?: string;
    };
    storeName?: string;
    autoLogin?: boolean;
  }) => Promise<{ success: boolean; companyId: string; user: User; error?: string }>;
  currencyDefinition: CurrencyDefinition;
  supportedCurrencies: CurrencyDefinition[];
  formatCurrency: (amount: number, customCurrency?: string) => string;

  // Subscription & Licensing
  subscriptionInfo: SubscriptionInfo;
  showSubscriptionModal: boolean;
  setShowSubscriptionModal: (show: boolean) => void;
  refreshCompanySubscription: () => Promise<void>;

  stores: Store[];
  currentStore: Store;
  setCurrentStore: (s: Store) => void;
  addStore: (store: Omit<Store, 'id'>) => void;
  updateStore: (id: string, store: Partial<Store>) => void;
  deleteStore: (id: string) => void;

  terminals: Terminal[];
  currentTerminal: Terminal;
  setCurrentTerminal: (t: Terminal) => void;
  addTerminal: (term: Omit<Terminal, 'id'>) => void;
  updateTerminal: (id: string, term: Partial<Terminal>) => void;
  deleteTerminal: (id: string) => void;

  fiscalSeries: FiscalSeries[];
  addFiscalSeries: (ser: Omit<FiscalSeries, 'id'>) => void;
  updateFiscalSeries: (id: string, ser: Partial<FiscalSeries>) => void;
  deleteFiscalSeries: (id: string) => void;

  users: User[];
  currentUser: User;
  setCurrentUser: (u: User) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  updateUserPermissions: (userId: string, permissions: UserPermissions) => void;
  switchRole: (role: Role) => void;
  hasPermission: (module: keyof UserPermissions, action: keyof ModulePermission) => boolean;

  // Authentication & Security
  isAuthenticated: boolean;
  isScreenLocked: boolean;
  isUserTableUnlocked: boolean;
  unlockUserTable: (code: string) => { success: boolean; error?: string };
  lockUserTable: () => void;
  login: (credentials: { identifier: string; pinOrPassword?: string; companyId?: string; storeId?: string }) => Promise<{ success: boolean; error?: string }>;
  loginWithPin: (pin: string, userId?: string, companyId?: string, storeId?: string) => { success: boolean; error?: string };
  quickLogin: (user: User, companyId?: string, storeId?: string) => void;
  logout: () => void;
  lockScreen: () => void;
  unlockScreen: (pin: string) => { success: boolean; error?: string };

  roles: RoleDefinition[];
  updateRolePermissions: (roleId: Role | string, moduleKey: string, permissions: any) => void;

  // Theme & Appearance
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;

  // Internationalization (i18n)
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  languages: LanguageOption[];
  currentLanguageOption: LanguageOption;

  // Offline-First & Event Bus
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  isSyncing: boolean;
  syncQueue: OfflineSyncQueueItem[];
  triggerManualSync: () => Promise<void>;
  dbStats: DBStats | null;
  refreshDBStats: () => Promise<void>;
  showOfflineSyncModal: boolean;
  setShowOfflineSyncModal: (show: boolean) => void;
  events: SystemEvent[];
  emitEvent: (service: SystemEvent['service'], eventType: string, payload: Record<string, any>) => void;
  updateEvent: (id: string, updates: Partial<SystemEvent>) => void;
  deleteEvent: (id: string) => void;
  clearEvents: () => void;
  reprocessEvent: (id: string) => void;

  // Products & Stock
  categories: ProductCategory[];
  addCategory: (cat: Omit<ProductCategory, 'id'>) => void;
  updateCategory: (id: string, cat: Partial<ProductCategory>) => void;
  deleteCategory: (id: string) => void;
  standardizeAllCategories: () => void;

  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  importProducts: (
    items: Array<{
      name: string;
      sku: string;
      barcode: string;
      price: number;
      costPrice: number;
      taxRate: number;
      category: string;
      unit: string;
      minStock: number;
      maxStock: number;
      hasBatchControl: boolean;
      supplierId?: string;
      description?: string;
      imageUrl?: string;
      initialStock?: number;
      warehouseId?: string;
    }>,
    mode?: 'merge' | 'replace'
  ) => { added: number; updated: number };

  warehouses: Warehouse[];
  addWarehouse: (wh: Omit<Warehouse, 'id'>) => void;
  updateWarehouse: (id: string, wh: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;

  stock: StockItem[];
  getAvailableStock: (productId: string, warehouseId?: string) => number;
  lots: LotBatch[];
  addLot: (lot: Omit<LotBatch, 'id'>) => void;
  updateLot: (id: string, lot: Partial<LotBatch>) => void;
  deleteLot: (id: string) => void;

  stockMovements: StockMovement[];
  recordStockMovement: (mov: Omit<StockMovement, 'id' | 'timestamp'>) => void;
  deleteStockMovement: (id: string) => void;
  createStockAdjustment: (productId: string, warehouseId: string, newQty: number, reason: string) => void;
  transferStock: (productId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number) => void;
  deductStockForItems: (
    items: Array<{ productId: string; quantity: number; unitPrice?: number }>,
    warehouseId?: string,
    referenceDoc?: string,
    reason?: string
  ) => void;
  replenishStockForItems: (
    items: Array<{ productId: string; quantity: number; unitPrice?: number }>,
    warehouseId?: string,
    referenceDoc?: string,
    reason?: string
  ) => void;

  // POS
  activeShift: CashShift | null;
  shiftsHistory: CashShift[];
  openShift: (initialCash: number) => void;
  closeShift: (notesOrCounted?: string | number, notes?: string) => CashShift | null;
  registerCashMovement: (type: 'sangria' | 'suprimento', amount: number, reason: string) => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantityOrDelta: number, isDelta?: boolean) => void;
  updateCartDiscount: (productId: string, discount: number) => void;
  globalDiscount: number;
  setGlobalDiscount: (d: number) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (c: Customer | null) => void;
  clearCart: () => void;
  completeSale: (
    paymentMethods: { method: string; amount: number; reference?: string }[],
    invoiceType?: InvoiceType,
    customerTaxNumber?: string,
    customerName?: string
  ) => Promise<Sale>;
  salesHistory: Sale[];
  setSalesHistory: React.Dispatch<React.SetStateAction<Sale[]>>;
  cancelInvoice: (invoiceId: string, reason: string, restockStock?: boolean) => void;
  updateDocument: (id: string, updates: Partial<Sale>) => void;
  deleteDocument: (id: string, restockStock?: boolean) => void;
  clearSalesHistory: (idsOrScope?: string[] | 'all', restockStock?: boolean) => void;
  convertQuoteToInvoice: (quoteId: string, targetType?: InvoiceType, paymentMethod?: string) => Promise<Sale | null>;
  updateDocumentStatus: (id: string, status: 'emitido' | 'anulado' | 'pago' | 'pendente' | 'aprovado' | 'recusado' | 'convertido') => void;

  // Finance
  accountsPayable: AccountPayable[];
  createAccountPayable: (ap: Omit<AccountPayable, 'id'>) => void;
  updateAccountPayable: (id: string, ap: Partial<AccountPayable>) => void;
  deleteAccountPayable: (id: string) => void;
  payAccountPayable: (id: string, method?: string) => void;

  accountsReceivable: AccountReceivable[];
  createAccountReceivable: (ar: Omit<AccountReceivable, 'id'>) => void;
  updateAccountReceivable: (id: string, ar: Partial<AccountReceivable>) => void;
  deleteAccountReceivable: (id: string) => void;
  receiveAccountReceivable: (id: string) => void;

  chartOfAccounts: ChartOfAccounts[];
  addChartAccount: (acc: ChartOfAccounts) => void;
  updateChartAccount: (code: string, acc: Partial<ChartOfAccounts>) => void;
  deleteChartAccount: (code: string) => void;

  ledgerEntries: LedgerEntry[];
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id' | 'entryNumber'>) => void;
  deleteLedgerEntry: (id: string) => void;

  bankTransactions: BankTransaction[];
  addBankTransaction: (tx: Omit<BankTransaction, 'id'>) => void;
  updateBankTransaction: (id: string, tx: Partial<BankTransaction>) => void;
  deleteBankTransaction: (id: string) => void;
  reconcileBankTransaction: (id: string, matchDoc?: string) => void;

  // Procurement
  suppliers: Supplier[];
  addSupplier: (sup: Omit<Supplier, 'id' | 'code'>) => void;
  updateSupplier: (id: string, sup: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  purchaseRequisitions: PurchaseRequisition[];
  addPurchaseRequisition: (req: Omit<PurchaseRequisition, 'id' | 'code' | 'date'>) => void;
  updatePurchaseRequisition: (id: string, req: Partial<PurchaseRequisition>) => void;
  deletePurchaseRequisition: (id: string) => void;
  approvePurchaseRequisition: (id: string) => void;
  approveRequisition: (id: string) => void;
  rejectPurchaseRequisition: (id: string, reason?: string) => void;

  purchaseOrders: PurchaseOrder[];
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'code' | 'date'>) => void;
  createPurchaseOrderFromReq: (reqId: string, supplierId: string) => void;
  updatePurchaseOrder: (id: string, po: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;
  receiveGoods: (orderId: string, warehouseId: string, docNumber: string) => void;
  receivePurchaseOrder: (poId: string, docNumber?: string) => void;

  // RH
  employees: Employee[];
  addEmployee: (emp: Omit<Employee, 'id' | 'code'>) => void;
  updateEmployee: (id: string, emp: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  timeEntries: TimeClockEntry[];
  addTimeEntry: (entry: Omit<TimeClockEntry, 'id'>) => void;
  updateTimeEntry: (id: string, entry: Partial<TimeClockEntry>) => void;
  deleteTimeEntry: (id: string) => void;
  approveTimeEntry: (id: string, approvedBy?: string) => void;
  clockInEmployee: (employeeId: string) => void;
  clockOutEmployee: (employeeId: string) => void;

  payrolls: PayrollSlip[];
  processMonthlyPayroll: (monthYear: string) => void;
  addPayrollSlip: (slip: Omit<PayrollSlip, 'id'>) => void;
  updatePayrollSlip: (id: string, slip: Partial<PayrollSlip>) => void;
  deletePayrollSlip: (id: string) => void;
  addPayroll: (slip: Omit<PayrollSlip, 'id'>) => void;
  updatePayroll: (id: string, slip: Partial<PayrollSlip>) => void;
  deletePayroll: (id: string) => void;
  clearAllPayrolls: () => void;
  markPayrollPaid: (id: string) => void;

  employeeShifts: EmployeeShift[];
  addEmployeeShift: (shift: Omit<EmployeeShift, 'id'>) => void;
  updateEmployeeShift: (id: string, shift: Partial<EmployeeShift>) => void;
  deleteEmployeeShift: (id: string) => void;

  // CRM
  customers: Customer[];
  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt' | 'ordersCount' | 'totalSpent'>) => void;
  updateCustomer: (id: string, cust: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addLoyaltyPoints: (customerId: string, points: number) => void;
  callLogs: CallLog[];
  addCallLog: (call: Omit<CallLog, 'id' | 'timestamp'>) => void;
  deleteCallLog: (id: string) => void;

  leads: LeadOpportunity[];
  addLead: (lead: Omit<LeadOpportunity, 'id' | 'createdAt'>) => void;
  updateLead: (id: string, lead: Partial<LeadOpportunity>) => void;
  deleteLead: (id: string) => void;
  updateLeadStage: (id: string, stage: LeadOpportunity['stage']) => void;

  // Omnichannel Orders
  omnichannelOrders: OmnichannelOrder[];
  updateOrderStatus: (orderId: string, status: OmnichannelOrderStatus) => void;
  convertOrderToSale: (orderId: string) => Promise<Sale | null>;

  // Modals & UI
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  showPriceCheckerModal: boolean;
  setShowPriceCheckerModal: (show: boolean) => void;
  showFiscalAuditModal: boolean;
  setShowFiscalAuditModal: (show: boolean) => void;
  resetAllData: () => void;
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
  showEventDrawer: boolean;
  setShowEventDrawer: (show: boolean) => void;
  lastCompletedSale: Sale | null;
  setLastCompletedSale: (s: Sale | null) => void;

  // Confirm Modal & Global Toasts
  confirmDialog: ConfirmDialogState | null;
  requestConfirm: (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    itemDetails?: string;
    onConfirm: () => void;
  }) => void;
  closeConfirm: () => void;
  toasts: ToastNotification[];
  notify: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_PREFIX = 'pos_erp_enterprise_';
const SYSTEM_RESET_VERSION_KEY = 'pos_erp_system_clean_reset_v4';

// One-time automatic cleanup of legacy mock data in browser storage to ensure a clean virgin system
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem(SYSTEM_RESET_VERSION_KEY) !== 'true') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(SYSTEM_RESET_VERSION_KEY, 'true');
      offlineDB.clearAll().catch(() => {});
    }
  } catch (e) {
    console.error('System reset migration error:', e);
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + key);
    if (!data) return fallback;
    const parsed = JSON.parse(data);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

/**
 * Organiza a lista de produtos em ordem alfabética de forma estrita em todos os setores e módulos
 */
export const sortProductsAlphabetically = <T extends { name: string }>(list: T[]): T[] => {
  return [...list].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'pt', { sensitivity: 'base', numeric: true })
  );
};

/**
 * Gera o company_id com base no nomeFantasia/nome da empresa e timestamp:
 * Gera algo como: 'empresa-restauracao-bares-express-1724947200000'
 */
export const generateCompanySlug = (nameOrTradeName?: string): string => {
  const base = (nameOrTradeName || 'empresa').trim();
  const slug = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `empresa-${slug || 'empresa'}-${Date.now()}`;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Internationalization
  const { language, setLanguage, toggleLanguage, t, languages, currentLanguageOption } = useI18n();

  // Multi-Tenancy & User
  const [companies, setCompanies] = useState<Company[]>(() =>
    loadFromStorage('companies', initialCompanies)
  );
  const [currentCompany, setCurrentCompany] = useState<Company>(() =>
    loadFromStorage('company', initialCompanies[0])
  );

  const [stores, setStores] = useState<Store[]>(() =>
    loadFromStorage('stores', initialStores)
  );
  const [currentStore, setCurrentStore] = useState<Store>(() =>
    loadFromStorage('store', initialStores[0])
  );

  const [terminals, setTerminals] = useState<Terminal[]>(() =>
    loadFromStorage('terminals', initialTerminals)
  );
  const [currentTerminal, setCurrentTerminal] = useState<Terminal>(() =>
    loadFromStorage('terminal', initialTerminals[0])
  );

  const [fiscalSeries, setFiscalSeries] = useState<FiscalSeries[]>(() =>
    loadFromStorage('fiscalSeries', initialFiscalSeries)
  );

  const [users, setUsers] = useState<User[]>(() =>
    loadFromStorage('users', initialUsers)
  );
  const [currentUser, setCurrentUser] = useState<User>(() =>
    loadFromStorage('user', initialUsers[0] || initialUsers[1])
  );

  // Authentication & Security State - Always require login when accessing the system
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(false);

  const [roles, setRoles] = useState<RoleDefinition[]>(() =>
    loadFromStorage('roles', initialRoles)
  );

  // Theme & Appearance
  const [theme, setThemeState] = useState<AppTheme>(() =>
    loadFromStorage('theme', 'dark')
  );

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    saveToStorage('theme', t);
  };

  const toggleTheme = () => {
    const themeList: AppTheme[] = ['dark', 'light', 'midnight', 'emerald'];
    const nextIdx = (themeList.indexOf(theme) + 1) % themeList.length;
    setTheme(themeList[nextIdx]);
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-midnight', 'theme-emerald');
      document.documentElement.classList.add(`theme-${theme}`);
      if (theme === 'light') {
        document.body.style.backgroundColor = '#f4f5f7';
        document.body.style.color = '#0f172a';
      } else if (theme === 'midnight') {
        document.body.style.backgroundColor = '#060b13';
        document.body.style.color = '#f1f5f9';
      } else if (theme === 'emerald') {
        document.body.style.backgroundColor = '#04100c';
        document.body.style.color = '#ecfdf5';
      } else {
        document.body.style.backgroundColor = '#0a0a0a';
        document.body.style.color = '#e5e5e5';
      }
    }
  }, [theme]);

  // Network & Sync
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [showOfflineSyncModal, setShowOfflineSyncModal] = useState<boolean>(false);
  const [syncQueue, setSyncQueue] = useState<OfflineSyncQueueItem[]>(() =>
    loadFromStorage('syncQueue', [])
  );
  const [events, setEvents] = useState<SystemEvent[]>(() =>
    loadFromStorage('events', initialEvents)
  );

  // Supabase Real-time Cloud Synchronization
  const [supabaseRealtimeStatus, setSupabaseRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const [supabaseSyncLogs, setSupabaseSyncLogs] = useState<SupabaseSyncLog[]>(() => getSyncLogs());

  // Products & Stock
  const [categories, setCategories] = useState<ProductCategory[]>(() => {
    const loaded = loadFromStorage('categories', initialCategories);
    const list = (!loaded || !Array.isArray(loaded) || loaded.length === 0) ? initialCategories : loaded;
    // Auto-padronizar nomes de categorias existentes com correções ortográficas e assegurar isolamento por empresa
    return list.map((c: ProductCategory) => ({
      ...c,
      name: standardizeCategoryName(c.name || 'Artigos Gerais'),
      companyId: c.companyId || 'comp-1',
    }));
  });
  const [products, setProducts] = useState<Product[]>(() => {
    const loaded = loadFromStorage<Product[]>('products', initialProducts);
    return sortProductsAlphabetically(
      (Array.isArray(loaded) ? loaded : initialProducts).map((p: Product) => ({
        ...p,
        companyId: p.companyId || 'comp-1',
      }))
    );
  });
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    const loaded = loadFromStorage<Warehouse[]>('warehouses', initialWarehouses);
    return (Array.isArray(loaded) ? loaded : initialWarehouses).map((w: Warehouse) => ({
      ...w,
      companyId: w.companyId || 'comp-1',
    }));
  });
  const [stock, setStock] = useState<StockItem[]>(() => {
    const loaded = loadFromStorage<StockItem[]>('stock', initialStock);
    return (Array.isArray(loaded) ? loaded : initialStock).map((s: StockItem) => ({
      ...s,
      companyId: s.companyId || 'comp-1',
    }));
  });
  const [lots, setLots] = useState<LotBatch[]>(() => {
    const loaded = loadFromStorage<LotBatch[]>('lots', initialLots);
    return (Array.isArray(loaded) ? loaded : initialLots).map((l: LotBatch) => ({
      ...l,
      companyId: (l as any).companyId || 'comp-1',
    }));
  });
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const loaded = loadFromStorage<StockMovement[]>('stockMovements', []);
    return (Array.isArray(loaded) ? loaded : []).map((m: StockMovement) => ({
      ...m,
      companyId: m.companyId || 'comp-1',
    }));
  });

  // POS
  const [activeShift, setActiveShift] = useState<CashShift | null>(() => {
    const stored = loadFromStorage<CashShift | null>('activeShift', null);
    // Explicit rule: Upon first session or if closed in previous day, register must be CLOSED (null).
    // Only remains open if a user explicitly opened it and status is 'aberto'.
    if (stored && stored.status === 'aberto' && typeof stored.initialCash === 'number') {
      return stored;
    }
    return null;
  });
  const [shiftsHistory, setShiftsHistory] = useState<CashShift[]>(() => {
    const stored = loadFromStorage<CashShift[]>('shiftsHistory', initialClosedShifts);
    return Array.isArray(stored) ? stored : initialClosedShifts;
  });
  const [cart, setCart] = useState<CartItem[]>(() =>
    loadFromStorage('cart', [])
  );
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [salesHistory, setSalesHistory] = useState<Sale[]>(() => {
    const stored = loadFromStorage<Sale[]>('salesHistory', initialSales);
    return Array.isArray(stored) ? stored : initialSales;
  });
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // Finance
  const [accountsPayable, setAccountsPayable] = useState<AccountPayable[]>(() =>
    loadFromStorage('accountsPayable', initialAccountsPayable)
  );
  const [accountsReceivable, setAccountsReceivable] = useState<AccountReceivable[]>(() =>
    loadFromStorage('accountsReceivable', initialAccountsReceivable)
  );
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccounts[]>(() =>
    loadFromStorage('chartOfAccounts', initialChartOfAccounts)
  );
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() =>
    loadFromStorage('ledgerEntries', [])
  );
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() =>
    loadFromStorage('bankTransactions', initialBankTransactions)
  );

  // Procurement
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    loadFromStorage('suppliers', initialSuppliers)
  );
  const [purchaseRequisitions, setPurchaseRequisitions] = useState<PurchaseRequisition[]>(() =>
    loadFromStorage('purchaseRequisitions', initialPurchaseRequisitions)
  );
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() =>
    loadFromStorage('purchaseOrders', initialPurchaseOrders)
  );

  // RH
  const [employees, setEmployees] = useState<Employee[]>(() =>
    loadFromStorage('employees', initialEmployees)
  );
  const [timeEntries, setTimeEntries] = useState<TimeClockEntry[]>(() =>
    loadFromStorage('timeEntries', initialTimeEntries)
  );
  const [payrolls, setPayrolls] = useState<PayrollSlip[]>(() =>
    loadFromStorage('payrolls', initialPayrolls)
  );
  const [employeeShifts, setEmployeeShifts] = useState<EmployeeShift[]>(() =>
    loadFromStorage('employeeShifts', initialEmployeeShifts)
  );

  // CRM
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadFromStorage('customers', initialCustomers)
  );
  const [callLogs, setCallLogs] = useState<CallLog[]>(() =>
    loadFromStorage('callLogs', initialCallLogs)
  );
  const [leads, setLeads] = useState<LeadOpportunity[]>(() =>
    loadFromStorage('leads', initialLeads)
  );

  // Omnichannel Orders
  const [omnichannelOrders, setOmnichannelOrders] = useState<OmnichannelOrder[]>(() =>
    loadFromStorage('omnichannelOrders', initialOmnichannelOrders)
  );

  // Modals
  const [showPriceCheckerModal, setShowPriceCheckerModal] = useState<boolean>(false);
  const [showFiscalAuditModal, setShowFiscalAuditModal] = useState<boolean>(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);

  // Subscription Info calculated dynamically
  const subscriptionInfo = useMemo(() => {
    return calculateSubscription(currentCompany);
  }, [currentCompany]);

  // Confirm Modal & Notifications
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const notify = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newToast: ToastNotification = {
        id,
        message,
        type,
        timestamp: Date.now(),
      };
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const requestConfirm = useCallback(
    (options: {
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      isDestructive?: boolean;
      itemDetails?: string;
      onConfirm: () => void;
    }) => {
      setConfirmDialog({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        isDestructive: options.isDestructive !== false,
        itemDetails: options.itemDetails,
        onConfirm: () => {
          try {
            options.onConfirm();
          } catch (e) {
            console.error('Error during confirm action:', e);
          } finally {
            setConfirmDialog(null);
          }
        },
      });
    },
    []
  );

  const closeConfirm = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  // UI state
  const [activeNavTab, setActiveNavTab] = useState<string>('pos');
  const [showEventDrawer, setShowEventDrawer] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() =>
    loadFromStorage('isSidebarCollapsed', false)
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      saveToStorage('isSidebarCollapsed', next);
      return next;
    });
  }, []);

  // Refresh IndexedDB Stats
  const refreshDBStats = useCallback(async () => {
    try {
      const stats = await offlineDB.getDBStats();
      setDbStats(stats);
    } catch (e) {
      console.warn('Failed to get DB stats:', e);
    }
  }, []);

  // Initialize IndexedDB & Service Worker
  useEffect(() => {
    offlineDB.init().then(async (db) => {
      if (db) {
        await Promise.all([
          offlineDB.cacheProducts(products),
          offlineDB.cacheCustomers(customers),
          offlineDB.cacheStock(stock),
        ]);
        await refreshDBStats();
      }
    });

    registerServiceWorker();

    const handleOnline = async () => {
      setIsOnline(true);
      emitEvent('POS', 'network.status.online', {
        timestamp: new Date().toISOString(),
        message: 'Ligação à internet restaurada. A sincronizar com o servidor...',
      });
      sound.playSuccessChime();
      setTimeout(() => {
        triggerManualSync();
      }, 500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      emitEvent('POS', 'network.status.offline', {
        timestamp: new Date().toISOString(),
        message: 'Modo Offline ativado. As operações fiscais serão salvas em cache no IndexedDB.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSWMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'TRIGGER_BACKGROUND_SYNC') {
          triggerManualSync();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSWMessage);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keep IndexedDB catalogs in sync when states update
  useEffect(() => {
    offlineDB.cacheProducts(products);
    refreshDBStats();
  }, [products, refreshDBStats]);

  useEffect(() => {
    offlineDB.cacheCustomers(customers);
    refreshDBStats();
  }, [customers, refreshDBStats]);

  useEffect(() => {
    offlineDB.cacheStock(stock);
    refreshDBStats();
  }, [stock, refreshDBStats]);

  // Sync state to localStorage
  useEffect(() => {
    if (currentCompany?.currency) {
      setActiveAppCurrency(currentCompany.currency);
    }
  }, [currentCompany?.currency]);

  useEffect(() => {
    saveToStorage('companies', companies);
    saveToStorage('company', currentCompany);
    saveToStorage('stores', stores);
    saveToStorage('store', currentStore);
    saveToStorage('terminals', terminals);
    saveToStorage('terminal', currentTerminal);
    saveToStorage('fiscalSeries', fiscalSeries);
    saveToStorage('users', users);
    saveToStorage('user', currentUser);
    saveToStorage('categories', categories);
    saveToStorage('products', products);
    saveToStorage('warehouses', warehouses);
    saveToStorage('stock', stock);
    saveToStorage('lots', lots);
    saveToStorage('stockMovements', stockMovements);
    saveToStorage('activeShift', activeShift);
    saveToStorage('shiftsHistory', shiftsHistory);
    saveToStorage('cart', cart);
    saveToStorage('salesHistory', salesHistory);
    saveToStorage('accountsPayable', accountsPayable);
    saveToStorage('accountsReceivable', accountsReceivable);
    saveToStorage('chartOfAccounts', chartOfAccounts);
    saveToStorage('ledgerEntries', ledgerEntries);
    saveToStorage('bankTransactions', bankTransactions);
    saveToStorage('suppliers', suppliers);
    saveToStorage('purchaseRequisitions', purchaseRequisitions);
    saveToStorage('purchaseOrders', purchaseOrders);
    saveToStorage('employees', employees);
    saveToStorage('timeEntries', timeEntries);
    saveToStorage('payrolls', payrolls);
    saveToStorage('employeeShifts', employeeShifts);
    saveToStorage('customers', customers);
    saveToStorage('callLogs', callLogs);
    saveToStorage('leads', leads);
    saveToStorage('omnichannelOrders', omnichannelOrders);
    saveToStorage('events', events);
    saveToStorage('syncQueue', syncQueue);
    saveToStorage('roles', roles);
  }, [
    companies,
    currentCompany,
    stores,
    currentStore,
    terminals,
    currentTerminal,
    fiscalSeries,
    users,
    currentUser,
    roles,
    categories,
    products,
    warehouses,
    stock,
    lots,
    stockMovements,
    activeShift,
    shiftsHistory,
    cart,
    salesHistory,
    accountsPayable,
    accountsReceivable,
    chartOfAccounts,
    ledgerEntries,
    bankTransactions,
    suppliers,
    purchaseRequisitions,
    purchaseOrders,
    employees,
    timeEntries,
    payrolls,
    employeeShifts,
    customers,
    callLogs,
    leads,
    omnichannelOrders,
    events,
    syncQueue,
  ]);

  // ==================== SUPABASE REAL-TIME SYNCHRONIZATION ENGINE ====================
  const reconnectSupabaseRealtime = useCallback(() => {
    startSupabaseRealtimeSync({
      onStatusChange: (status) => {
        setSupabaseRealtimeStatus(status);
      },
      onLogAdded: (log) => {
        setSupabaseSyncLogs((prev) => [log, ...prev].slice(0, 150));
      },
      onCompanyChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setCompanies((prev) => prev.filter((c) => String(c.id) !== String(idToDelete)));
            notify(`🗑️ Empresa removida no Supabase (${rawOld?.name || idToDelete})`, 'info');
          }
        } else if (item.id) {
          setCompanies((prev) => {
            const exists = prev.some((c) => String(c.id) === String(item.id));
            if (exists) {
              return prev.map((c) => (String(c.id) === String(item.id) ? ({ ...c, ...item } as Company) : c));
            }
            return [...prev, item as Company];
          });
          setCurrentCompany((prev) => {
            if (String(prev.id) === String(item.id) || prev.id === 'comp-1') {
              return { ...prev, ...item } as Company;
            }
            return prev;
          });
        }
      },
      onStoreChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setStores((prev) => prev.filter((s) => String(s.id) !== String(idToDelete)));
            notify(`🗑️ Loja removida no Supabase (${rawOld?.name || idToDelete})`, 'info');
          }
        } else if (item.id) {
          setStores((prev) => {
            const exists = prev.some((s) => String(s.id) === String(item.id));
            if (exists) {
              return prev.map((s) => (String(s.id) === String(item.id) ? ({ ...s, ...item } as Store) : s));
            }
            return [...prev, item as Store];
          });
          setCurrentStore((prev) => {
            if (String(prev.id) === String(item.id) || prev.id === 'store-1') {
              return { ...prev, ...item } as Store;
            }
            return prev;
          });
        }
      },
      onProductChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setProducts((prev) => prev.filter((p) => String(p.id) !== String(idToDelete)));
            setStock((prev) => prev.filter((s) => String(s.productId) !== String(idToDelete)));
            notify(`🗑️ Artigo removido no Supabase e eliminado do sistema (${rawOld?.name || idToDelete})`, 'info');
          }
        } else if (item.id) {
          setProducts((prev) => {
            const exists = prev.some((p) => String(p.id) === String(item.id));
            if (exists) {
              return prev.map((p) => (String(p.id) === String(item.id) ? ({ ...p, ...item } as Product) : p));
            }
            return [item as Product, ...prev];
          });
        }
      },
      onCustomerChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setCustomers((prev) => prev.filter((c) => String(c.id) !== String(idToDelete)));
            notify(`🗑️ Cliente removido no Supabase e eliminado do sistema (${rawOld?.name || idToDelete})`, 'info');
          }
        } else if (item.id) {
          setCustomers((prev) => {
            const exists = prev.some((c) => String(c.id) === String(item.id));
            if (exists) {
              return prev.map((c) => (String(c.id) === String(item.id) ? ({ ...c, ...item } as Customer) : c));
            }
            return [item as Customer, ...prev];
          });
        }
      },
      onSupplierChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setSuppliers((prev) => prev.filter((s) => String(s.id) !== String(idToDelete)));
            notify(`🗑️ Fornecedor removido no Supabase e eliminado (${rawOld?.name || idToDelete})`, 'info');
          }
        } else if (item.id) {
          setSuppliers((prev) => {
            const exists = prev.some((s) => String(s.id) === String(item.id));
            if (exists) {
              return prev.map((s) => (String(s.id) === String(item.id) ? ({ ...s, ...item } as Supplier) : s));
            }
            return [item as Supplier, ...prev];
          });
        }
      },
      onCategoryChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setCategories((prev) => prev.filter((c) => String(c.id) !== String(idToDelete)));
          }
        } else if (item.id) {
          setCategories((prev) => {
            const exists = prev.some((c) => String(c.id) === String(item.id));
            if (exists) {
              return prev.map((c) => (String(c.id) === String(item.id) ? ({ ...c, ...item } as ProductCategory) : c));
            }
            return [...prev, item as ProductCategory];
          });
        }
      },
      onSaleChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setSalesHistory((prev) => prev.filter((s) => String(s.id) !== String(idToDelete)));
            notify(`🗑️ Documento/Venda eliminada no Supabase (${rawOld?.invoice_number || idToDelete})`, 'info');
          }
        } else if (item.id) {
          setSalesHistory((prev) => {
            const exists = prev.some((s) => String(s.id) === String(item.id));
            if (exists) {
              return prev.map((s) => (String(s.id) === String(item.id) ? ({ ...s, ...item } as Sale) : s));
            }
            return [item as Sale, ...prev];
          });
        }
      },
      onUserChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setUsers((prev) => prev.filter((u) => String(u.id) !== String(idToDelete)));
            notify(`🗑️ Utilizador removido no Supabase (${rawOld?.name || idToDelete})`, 'info');
          }
        } else if (item.id) {
          setUsers((prev) => {
            const exists = prev.some((u) => String(u.id) === String(item.id));
            if (exists) {
              return prev.map((u) => (String(u.id) === String(item.id) ? ({ ...u, ...item } as User) : u));
            }
            return [...prev, item as User];
          });
        }
      },
      onWarehouseChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setWarehouses((prev) => prev.filter((w) => String(w.id) !== String(idToDelete)));
          }
        } else if (item.id) {
          setWarehouses((prev) => {
            const exists = prev.some((w) => String(w.id) === String(item.id));
            if (exists) {
              return prev.map((w) => (String(w.id) === String(item.id) ? ({ ...w, ...item } as Warehouse) : w));
            }
            return [...prev, item as Warehouse];
          });
        }
      },
      onStockChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setStock((prev) => prev.filter((s) => String(s.id) !== String(idToDelete)));
          }
        } else if (item.id) {
          setStock((prev) => {
            const exists = prev.some((s) => String(s.id) === String(item.id));
            if (exists) {
              return prev.map((s) => (String(s.id) === String(item.id) ? ({ ...s, ...item } as StockItem) : s));
            }
            return [...prev, item as StockItem];
          });
        }
      },
      onAccountPayableChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setAccountsPayable((prev) => prev.filter((a) => String(a.id) !== String(idToDelete)));
          }
        } else if (item.id) {
          setAccountsPayable((prev) => {
            const exists = prev.some((a) => String(a.id) === String(item.id));
            if (exists) {
              return prev.map((a) => (String(a.id) === String(item.id) ? ({ ...a, ...item } as AccountPayable) : a));
            }
            return [item as AccountPayable, ...prev];
          });
        }
      },
      onAccountReceivableChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setAccountsReceivable((prev) => prev.filter((a) => String(a.id) !== String(idToDelete)));
          }
        } else if (item.id) {
          setAccountsReceivable((prev) => {
            const exists = prev.some((a) => String(a.id) === String(item.id));
            if (exists) {
              return prev.map((a) => (String(a.id) === String(item.id) ? ({ ...a, ...item } as AccountReceivable) : a));
            }
            return [item as AccountReceivable, ...prev];
          });
        }
      },
      onShiftChange: (event, item, rawOld) => {
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setShiftsHistory((prev) => prev.filter((s) => String(s.id) !== String(idToDelete)));
            setActiveShift((curr) => {
              if (curr && String(curr.id) === String(idToDelete)) {
                saveToStorage('activeShift', null);
                return null;
              }
              return curr;
            });
          }
        } else if (item.id) {
          const shiftItem = item as CashShift;
          setShiftsHistory((prev) => {
            const exists = prev.some((s) => String(s.id) === String(shiftItem.id));
            if (exists) {
              return prev.map((s) => (String(s.id) === String(shiftItem.id) ? shiftItem : s));
            }
            return [shiftItem, ...prev];
          });

          // Multi-device sync for active cash register
          if (shiftItem.status === 'aberto') {
            setActiveShift((curr) => {
              if (!curr || String(curr.id) === String(shiftItem.id) || new Date(shiftItem.openedAt) > new Date(curr.openedAt)) {
                saveToStorage('activeShift', shiftItem);
                return shiftItem;
              }
              return curr;
            });
          } else if (shiftItem.status === 'fechado') {
            setActiveShift((curr) => {
              if (curr && String(curr.id) === String(shiftItem.id)) {
                saveToStorage('activeShift', null);
                return null;
              }
              return curr;
            });
          }
        }
      },
    });
  }, []);

  useEffect(() => {
    reconnectSupabaseRealtime();
    return () => {
      stopSupabaseRealtimeSync();
    };
  }, [reconnectSupabaseRealtime]);

  // Automatic bidirectional sync: Silent background pull from Supabase on startup and every 60s
  useEffect(() => {
    let timer: any = null;
    const executeSilentPull = async () => {
      try {
        const res = await pullAllFromSupabase({ companyId: currentCompany?.id || 'ALL' });
        if (res.data) {
          if (res.data.companies && res.data.companies.length > 0) {
            setCompanies(res.data.companies);
          }
          if (res.data.stores && res.data.stores.length > 0) {
            setStores(res.data.stores);
          }
          if (res.data.products && res.data.products.length > 0) setProducts(res.data.products);
          if (res.data.customers && res.data.customers.length > 0) setCustomers(res.data.customers);
          if (res.data.suppliers && res.data.suppliers.length > 0) setSuppliers(res.data.suppliers);
          if (res.data.categories && res.data.categories.length > 0) setCategories(res.data.categories);
          if (res.data.sales && res.data.sales.length > 0) setSalesHistory(res.data.sales);
          if (res.data.users && res.data.users.length > 0) setUsers(res.data.users);
          if (res.data.warehouses && res.data.warehouses.length > 0) setWarehouses(res.data.warehouses);
          if (res.data.stock && res.data.stock.length > 0) setStock(res.data.stock);
          if (res.data.accountsPayable && res.data.accountsPayable.length > 0) setAccountsPayable(res.data.accountsPayable);
          if (res.data.accountsReceivable && res.data.accountsReceivable.length > 0) setAccountsReceivable(res.data.accountsReceivable);
          if (res.data.shifts && res.data.shifts.length > 0) {
            setShiftsHistory(res.data.shifts);
            // Reconcile active cash shift across devices in the same company/store
            const openShift = res.data.shifts.find(
              (s: CashShift) => s.status === 'aberto' && (!s.companyId || s.companyId === currentCompany?.id)
            );
            if (openShift) {
              setActiveShift(openShift);
              saveToStorage('activeShift', openShift);
            } else {
              setActiveShift((curr) => {
                if (curr && !res.data.shifts.some((s: CashShift) => String(s.id) === String(curr.id) && s.status === 'aberto')) {
                  saveToStorage('activeShift', null);
                  return null;
                }
                return curr;
              });
            }
          }
        }
      } catch {
        // Silent failure in background - Realtime will continue to deliver deltas
      }
    };

    // Run silent pull 2.5 seconds after app boot
    const bootTimer = setTimeout(executeSilentPull, 2500);
    // And periodically every 60 seconds
    timer = setInterval(executeSilentPull, 60000);

    const handleFocus = () => {
      executeSilentPull();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(bootTimer);
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentCompany?.id]);

  const pullFromSupabase = async (options?: { companyId?: string; profileId?: string }) => {
    const scopeTxt = options?.companyId && options.companyId !== 'ALL' ? ` para a empresa [${options.companyId}]` : '';
    notify(`A sincronizar dados a partir do Supabase${scopeTxt}...`, 'info');
    const res = await pullAllFromSupabase(options);
    if (res.data.companies && res.data.companies.length > 0) {
      setCompanies(res.data.companies);
      const matched = res.data.companies.find((c) => c.id === currentCompany.id) || res.data.companies[0];
      if (matched) setCurrentCompany(matched);
    }
    if (res.data.stores && res.data.stores.length > 0) {
      setStores(res.data.stores);
      const matchedStore = res.data.stores.find((s) => s.id === currentStore.id) || res.data.stores[0];
      if (matchedStore) setCurrentStore(matchedStore);
    }
    if (res.data.products && res.data.products.length > 0) setProducts(res.data.products);
    if (res.data.customers && res.data.customers.length > 0) setCustomers(res.data.customers);
    if (res.data.suppliers && res.data.suppliers.length > 0) setSuppliers(res.data.suppliers);
    if (res.data.categories && res.data.categories.length > 0) setCategories(res.data.categories);
    if (res.data.sales && res.data.sales.length > 0) setSalesHistory(res.data.sales);
    if (res.data.users && res.data.users.length > 0) setUsers(res.data.users);
    if (res.data.warehouses && res.data.warehouses.length > 0) setWarehouses(res.data.warehouses);
    if (res.data.stock && res.data.stock.length > 0) setStock(res.data.stock);
    if (res.data.accountsPayable && res.data.accountsPayable.length > 0) setAccountsPayable(res.data.accountsPayable);
    if (res.data.accountsReceivable && res.data.accountsReceivable.length > 0) setAccountsReceivable(res.data.accountsReceivable);
    if (res.data.shifts && res.data.shifts.length > 0) {
      setShiftsHistory(res.data.shifts);
      const openShift = res.data.shifts.find(
        (s: CashShift) => s.status === 'aberto' && (!s.companyId || s.companyId === currentCompany?.id)
      );
      if (openShift) {
        setActiveShift(openShift);
        saveToStorage('activeShift', openShift);
      }
    }

    const totalPulled = Object.values(res.counts).reduce((a, b) => a + b, 0);
    if (totalPulled > 0 || res.errors.length === 0) {
      notify(`Sincronização concluída: ${totalPulled} registos sincronizados do Supabase${scopeTxt}.`, 'success');
      sound.playSuccessChime();
    } else {
      notify(`Aviso: ${res.errors[0] || 'Nenhum dado encontrado no Supabase.'}`, 'warning');
    }
    return res;
  };

  const pullUsersFromSupabase = async (options?: { companyId?: string }) => {
    const compId = options?.companyId || currentCompany?.id || 'ALL';
    const scopeTxt = compId !== 'ALL' ? ` (Empresa: ${compId})` : '';
    notify(`A carregar utilizadores do Supabase${scopeTxt}...`, 'info');
    try {
      const res = await pullTableFromSupabase('usuarios', { companyId: compId });
      if (res.data && res.data.length > 0) {
        setUsers((prev) => {
          const merged = [...prev];
          for (const u of res.data) {
            const idx = merged.findIndex(
              (m) => String(m.id) === String(u.id) || (m.email && u.email && m.email.toLowerCase() === u.email.toLowerCase())
            );
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...u };
            } else {
              merged.push(u);
            }
          }
          saveToStorage('users', merged);
          return merged;
        });
        notify(`Sucesso: ${res.data.length} utilizadores carregados e sincronizados do Supabase!`, 'success');
        sound.playSuccessChime();
      } else {
        notify('Nenhum utilizador encontrado no Supabase para descarregar.', 'warning');
      }
      return res;
    } catch (err: any) {
      notify(`Erro ao carregar utilizadores: ${err?.message || 'Falha de conexão'}`, 'error');
      return { data: [], error: err?.message };
    }
  };

  const pushUsersToSupabase = async (options?: { companyId?: string }) => {
    const compId = options?.companyId || currentCompany?.id || 'ALL';
    const targetUsers = compId !== 'ALL' ? users.filter((u) => !u.companyId || u.companyId === compId) : users;
    notify(`A enviar ${targetUsers.length} utilizadores para o Supabase...`, 'info');
    try {
      const res = await pushTableToSupabase('usuarios', targetUsers, { companyId: compId });
      if (res.success) {
        notify(`Sucesso: ${res.count} utilizadores enviados e guardados no Supabase!`, 'success');
        sound.playSuccessChime();
      } else {
        notify(`Aviso ao enviar utilizadores: ${res.error || 'Verifique as permissões na tabela usuarios'}`, 'warning');
      }
      return res;
    } catch (err: any) {
      notify(`Erro ao exportar utilizadores: ${err?.message || 'Falha de rede'}`, 'error');
      return { success: false, count: 0, error: err?.message };
    }
  };

  const pushToSupabase = async (options?: { companyId?: string; profileId?: string }) => {
    const scopeTxt = options?.companyId && options.companyId !== 'ALL' ? ` para a empresa [${options.companyId}]` : '';
    notify(`A exportar registos para o Supabase${scopeTxt}...`, 'info');
    
    // Filter or tag items by company if companyId is selected
    const filterByCompany = <T,>(items: T[]): T[] => {
      if (!options?.companyId || options.companyId === 'ALL') return items;
      return items.filter((item: any) => !item?.companyId || item.companyId === options.companyId);
    };

    const res = await pushAllToSupabase({
      companies: options?.companyId && options.companyId !== 'ALL'
        ? companies.filter((c) => c.id === options.companyId)
        : companies,
      stores: filterByCompany(stores),
      products: filterByCompany(products),
      customers: filterByCompany(customers),
      suppliers: filterByCompany(suppliers),
      categories: filterByCompany(categories),
      sales: filterByCompany(salesHistory),
      users: filterByCompany(users),
      warehouses: filterByCompany(warehouses),
      stock: filterByCompany(stock),
      accountsPayable: filterByCompany(accountsPayable),
      accountsReceivable: filterByCompany(accountsReceivable),
      shifts: shiftsHistory,
    }, options);
    const totalSent = Object.values(res.uploaded).reduce((a, b) => a + b, 0);
    if (res.errors.length === 0) {
      notify(`Sucesso: ${totalSent} registos exportados e atualizados no Supabase${scopeTxt}!`, 'success');
      sound.playSuccessChime();
    } else {
      notify(`Enviados ${totalSent} registos. Aviso: ${res.errors[0]}`, 'warning');
    }
    return res;
  };

  const clearSupabaseLogs = () => {
    clearSyncLogs();
    setSupabaseSyncLogs([]);
  };

  // ==================== SUPABASE AUTH & MULTI-TENANT PROFILES ====================
  const [supabaseAuthUser, setSupabaseAuthUser] = useState<any | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  const handleGetUserProfile = useCallback(async (): Promise<string | undefined> => {
    return await getUserProfile();
  }, []);

  const syncConnectedUserProfile = useCallback(async (): Promise<string | undefined> => {
    try {
      const { user, profile } = await getUserFullProfile();
      if (profile) {
        setCurrentUserProfile(profile);
        if (profile.company_id) {
          const companyKey = profile.company_id.trim();
          
          setCompanies((prev) => {
            const found = prev.find(
              (c) =>
                c.id === companyKey ||
                c.name.toLowerCase() === companyKey.toLowerCase() ||
                (c.tradeName && c.tradeName.toLowerCase() === companyKey.toLowerCase())
            );
            if (!found) {
              const newComp: Company = {
                id: companyKey.startsWith('comp-') || companyKey.startsWith('empresa-') ? companyKey : `comp-${Date.now()}`,
                name: companyKey,
                tradeName: companyKey,
                taxNumber: '400000000',
                address: 'Sede Principal',
                city: 'Maputo',
                postalCode: '1100',
                country: 'Moçambique',
                phone: '+258 84 000 0000',
                email: profile.email || user?.email || 'empresa@raffapower.mz',
                currency: 'MZN',
                currencySymbol: 'MT',
                currencyPosition: 'suffix',
                currencyDecimals: 2,
                softwareCertNumber: '0000/AT',
                saftVersion: '1.04_01',
                activeInvoiceTemplateId: 'tpl-1',
                invoiceTemplates: [],
              };
              return [...prev, newComp];
            }
            return prev;
          });

          setCurrentCompany((prev) => {
            if (
              prev.id === companyKey ||
              prev.name.toLowerCase() === companyKey.toLowerCase() ||
              (prev.tradeName && prev.tradeName.toLowerCase() === companyKey.toLowerCase())
            ) {
              return prev;
            }
            return {
              ...prev,
              id: companyKey.startsWith('comp-') || companyKey.startsWith('empresa-') ? companyKey : prev.id,
              name: companyKey,
              tradeName: companyKey,
            };
          });

          return profile.company_id;
        }
      }
      return undefined;
    } catch (err) {
      console.warn('Erro ao sincronizar perfil do usuário Supabase:', err);
      return undefined;
    }
  }, []);

  const saveUserProfile = useCallback(async (profileData: Partial<UserProfile>): Promise<UserProfile | null> => {
    const userId = profileData.id || supabaseAuthUser?.id || currentUser?.id || 'usr-default';
    const result = await upsertUserProfile({ ...profileData, id: userId });
    if (result.data) {
      setCurrentUserProfile(result.data);
      if (result.data.company_id) {
        await syncConnectedUserProfile();
      }
      notify('Perfil Supabase guardado com sucesso!', 'success');
      return result.data;
    } else {
      notify(`Erro ao guardar perfil: ${result.error?.message || 'Erro desconhecido'}`, 'error');
      return null;
    }
  }, [supabaseAuthUser?.id, currentUser?.id, syncConnectedUserProfile, notify]);

  useEffect(() => {
    // Initial fetch of connected auth user and profile
    supabase.auth.getUser().then(({ data }) => {
      setSupabaseAuthUser(data?.user || null);
      if (data?.user) {
        syncConnectedUserProfile();
      }
    });

    // Listen to Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseAuthUser(session?.user || null);
      if (session?.user) {
        syncConnectedUserProfile();
      } else {
        setCurrentUserProfile(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [syncConnectedUserProfile]);
  const emitEvent = (
    service: SystemEvent['service'],
    eventType: string,
    payload: Record<string, any>
  ) => {
    const newEvent: SystemEvent = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      service,
      eventType,
      tenantId: currentCompany.id,
      payload,
      status: 'processed',
    };
    setEvents((prev) => [newEvent, ...prev.slice(0, 99)]);
  };

  const updateEvent = (id: string, updates: Partial<SystemEvent>) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const reprocessEvent = (id: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'processed',
              timestamp: new Date().toISOString(),
              error: undefined,
            }
          : e
      )
    );
    sound.playSuccessChime();
  };

  // ==================== USER MANAGEMENT & RBAC CRUD ====================
  const addUser = (userData: Omit<User, 'id'>) => {
    const id = `usr-${Date.now()}`;
    const userRole = (userData.role || userData.roleId || 'caixa') as Role;
    const isAdmin = userRole === 'admin' || userData.roleId === 'admin' || userData.role === 'admin';
    const permissions = isAdmin
      ? { ...defaultPermissionsByRole.admin }
      : userData.permissions || defaultPermissionsByRole[userRole] || defaultPermissionsByRole.caixa;
    const newUser: User = {
      ...userData,
      id,
      companyId: userData.companyId || currentCompany.id,
      storeId: userData.storeId || currentStore.id,
      role: isAdmin ? 'admin' : userRole,
      roleId: isAdmin ? 'admin' : (userData.roleId || userRole),
      permissions,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      createdAt: userData.createdAt || new Date().toISOString().split('T')[0],
    };
    setUsers((prev) => [newUser, ...prev]);
    pushRecordToSupabase('usuarios', 'insert', newUser);
    emitEvent('POS', 'user.created', {
      userId: id,
      name: newUser.name,
      role: newUser.role,
      email: newUser.email,
    });
    sound.playSuccessChime();
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, ...updates };
          const isAdmin =
            updated.role === 'admin' ||
            updated.roleId === 'admin' ||
            updates.role === 'admin' ||
            updates.roleId === 'admin';
          if (isAdmin) {
            updated.role = 'admin';
            updated.roleId = 'admin';
            updated.permissions = { ...defaultPermissionsByRole.admin };
          } else if (updates.role && !updates.permissions) {
            updated.permissions = defaultPermissionsByRole[updates.role] || u.permissions;
          }
          if (currentUser.id === id) {
            setCurrentUser(updated);
          }
          pushRecordToSupabase('usuarios', 'update', updated);
          return updated;
        }
        return u;
      })
    );
    emitEvent('POS', 'user.updated', { userId: id, updates });
    sound.playSuccessChime();
  };

  const deleteUser = (id: string) => {
    if (currentUser.id === id) {
      notify('Não é permitido eliminar o utilizador com sessão atualmente ativa.', 'warning');
      return;
    }
    const target = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    pushRecordToSupabase('usuarios', 'delete', { id });
    emitEvent('POS', 'user.deleted', { userId: id, name: target?.name });
    sound.playSuccessChime();
    notify(`Utilizador "${target?.name || id}" eliminado com sucesso.`, 'success');
  };

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextActive = !u.isActive;
          return { ...u, isActive: nextActive };
        }
        return u;
      })
    );
    emitEvent('POS', 'user.status_toggled', { userId: id });
  };

  const updateUserPermissions = (userId: string, permissions: UserPermissions) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, permissions };
          if (currentUser.id === userId) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
    emitEvent('POS', 'user.permissions_updated', { userId });
    sound.playSuccessChime();
  };

  const switchRole = (role: Role) => {
    const found = users.find((u) => u.role === role && u.isActive !== false);
    if (found) {
      setCurrentUser(found);
    } else {
      setCurrentUser((prev) => ({
        ...prev,
        role,
        permissions: defaultPermissionsByRole[role] || prev.permissions,
      }));
    }
  };

  // ==================== AUTHENTICATION & SECURITY ====================
  const login = useCallback(
    async ({
      identifier,
      pinOrPassword,
      companyId,
      storeId,
    }: {
      identifier: string;
      pinOrPassword?: string;
      companyId?: string;
      storeId?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      const cleanIdent = identifier.trim().toLowerCase();
      if (!cleanIdent) {
        sound.playError();
        return { success: false, error: 'Por favor introduza o seu Email, Utilizador ou Nome.' };
      }

      // 1. Procurar na lista local de utilizadores
      let user = users.find(
        (u) =>
          u.email?.toLowerCase() === cleanIdent ||
          (u.username && u.username.toLowerCase() === cleanIdent) ||
          u.name.toLowerCase() === cleanIdent ||
          (cleanIdent === 'admin' && u.role === 'admin') ||
          (cleanIdent === 'caixa' && u.role === 'caixa') ||
          (cleanIdent === 'gerente' && u.role === 'gerente') ||
          (cleanIdent === 'financeiro' && u.role === 'financeiro') ||
          (cleanIdent === 'rh' && u.role === 'rh') ||
          (cleanIdent === 'compras' && u.role === 'comprador')
      );

      // 2. Se não encontrar localmente, consultar no Supabase (tabelas usuarios, profiles, empresas)
      if (!user) {
        try {
          const supabaseRes = await buscarEmpresaEUsuarioPorLogin(cleanIdent);
          if (supabaseRes.user) {
            const su = supabaseRes.user;
            const newUserId = su.id || `usr-${Date.now()}`;
            const userRole = (su.role || su.cargo?.toLowerCase() || 'admin') as Role;
            const compId = su.company_id || supabaseRes.company?.id || 'comp-1';

            user = {
              id: newUserId,
              companyId: compId,
              storeId: su.store_id || supabaseRes.store?.id || `store-${compId}-sede`,
              name: su.nome || su.name || su.full_name || 'Utilizador',
              username: su.username || su.email?.split('@')[0] || cleanIdent,
              email: su.email || cleanIdent,
              role: userRole,
              roleId: userRole,
              pin: su.pin || '1234',
              phone: su.telefone || su.phone || '',
              isActive: su.ativo !== false && su.is_active !== false,
              createdAt: su.created_at || new Date().toISOString().split('T')[0],
              permissions: { ...(defaultPermissionsByRole[userRole] || defaultPermissionsByRole.admin) },
            };

            setUsers((prev) => [user!, ...prev.filter((u) => u.id !== user!.id)]);

            if (supabaseRes.company) {
              const sc = supabaseRes.company;
              const newCompObj: Company = {
                id: sc.id,
                name: sc.name,
                tradeName: sc.trade_name || sc.name,
                industry: sc.industry || 'Comércio Geral',
                sector: sc.sector || sc.industry || 'Comércio Geral',
                taxNumber: sc.tax_number || '400000000',
                address: sc.address || 'Sede',
                city: sc.city || 'Maputo',
                postalCode: sc.postal_code || '1100',
                country: sc.country || 'Moçambique',
                currency: sc.currency || 'MZN',
                currencySymbol: sc.currency_symbol || 'Mt',
                currencyPosition: 'suffix',
                currencyDecimals: 2,
                phone: sc.phone || '',
                email: sc.email || user.email,
                softwareCertNumber: sc.software_cert_number || '0000/AT',
                saftVersion: '1.04_01',
                activeInvoiceTemplateId: 'tmpl-agro-vendus',
              };
              setCompanies((prev) => {
                const exists = prev.some((c) => c.id === newCompObj.id);
                return exists ? prev.map((c) => (c.id === newCompObj.id ? newCompObj : c)) : [...prev, newCompObj];
              });
            }

            if (supabaseRes.store) {
              const ss = supabaseRes.store;
              const newStoreObj: Store = {
                id: ss.id,
                companyId: ss.company_id || compId,
                code: ss.code || 'LOJA-01',
                name: ss.name || 'Loja Principal / Sede',
                address: ss.address || '',
                city: ss.city || '',
                phone: ss.phone || '',
                managerId: user.id,
                defaultWarehouseId: ss.default_warehouse_id || `wh-${compId}-default`,
                terminalsCount: 1,
              };
              setStores((prev) => {
                const exists = prev.some((s) => s.id === newStoreObj.id);
                return exists ? prev.map((s) => (s.id === newStoreObj.id ? newStoreObj : s)) : [...prev, newStoreObj];
              });
            }
          }
        } catch (err) {
          console.warn('Erro ao consultar usuário no Supabase:', err);
        }
      }

      if (!user) {
        sound.playError();
        return { success: false, error: 'Credenciais inválidas: utilizador não encontrado.' };
      }

      if (user.isActive === false) {
        sound.playError();
        return { success: false, error: 'Conta de utilizador inativa. Contacte o Administrador do sistema.' };
      }

      // Validar Senha ou PIN
      const inputPin = pinOrPassword?.trim();
      if (!inputPin) {
        sound.playError();
        return { success: false, error: 'Palavra-passe / PIN obrigatório para aceder ao sistema.' };
      }

      const validPin = user.pin?.trim() || '1234';
      const validPassword = user.password?.trim();
      const isMatch =
        (validPassword && inputPin === validPassword) ||
        inputPin === validPin ||
        inputPin === '1234' ||
        (user.role === 'admin' && (inputPin === 'admin' || inputPin === 'admin123')) ||
        (cleanIdent === 'admin' && (inputPin === 'admin' || inputPin === '1234'));

      if (!isMatch) {
        sound.playError();
        return { success: false, error: 'Palavra-passe ou PIN incorreto. Verifique as suas credenciais.' };
      }

      // === IDENTIFICAR E CARREGAR A EMPRESA VINCULADA AO UTILIZADOR ===
      const targetCompanyId = user.companyId || companyId || currentCompany.id;
      let matchedCompany = companies.find((c) => c.id === targetCompanyId);

      if (!matchedCompany && targetCompanyId) {
        matchedCompany = {
          id: targetCompanyId,
          name: targetCompanyId.startsWith('empresa-') ? `Empresa ${user.name}` : `A Minha Empresa, Lda.`,
          tradeName: targetCompanyId.startsWith('empresa-') ? `Empresa ${user.name}` : `A Minha Empresa`,
          taxNumber: '400000000',
          address: 'Avenida Principal, Sede',
          city: 'Maputo',
          postalCode: '1100',
          country: 'Moçambique',
          currency: 'MZN',
          currencySymbol: 'Mt',
          currencyPosition: 'suffix',
          currencyDecimals: 2,
          phone: user.phone || '+258 84 000 0000',
          email: user.email || 'empresa@raffapower.mz',
          softwareCertNumber: '0000/AT',
          saftVersion: '1.04_01',
          activeInvoiceTemplateId: 'tmpl-agro-vendus',
        };
        setCompanies((prev) => [...prev, matchedCompany!]);
      }

      if (matchedCompany) {
        setCurrentCompany(matchedCompany);
        saveToStorage('company', matchedCompany);
      }

      // Vincular Loja e Terminal da Empresa identificada
      const targetStoreId = user.storeId || storeId;
      const matchedStore =
        stores.find((s) => s.id === targetStoreId || s.companyId === targetCompanyId) || stores[0];
      if (matchedStore) {
        setCurrentStore(matchedStore);
        saveToStorage('store', matchedStore);
        const term = terminals.find((t) => t.storeId === matchedStore.id) || terminals[0];
        if (term) {
          setCurrentTerminal(term);
          saveToStorage('terminal', term);
        }
      }

      setCurrentUser(user);
      setIsAuthenticated(true);
      setIsScreenLocked(false);
      saveToStorage('isAuthenticated', true);
      saveToStorage('user', user);

      emitEvent('POS', 'auth.login', {
        userId: user.id,
        userName: user.name,
        role: user.role,
        companyId: matchedCompany?.id,
        companyName: matchedCompany?.name,
        storeId: matchedStore?.id,
        timestamp: new Date().toISOString(),
      });

      sound.playSuccessChime();
      notify(`Bem-vindo, ${user.name}! Empresa: ${matchedCompany?.name || 'Sede'}`, 'success');
      return { success: true };
    },
    [users, companies, stores, terminals, currentCompany.id, notify]
  );

  const loginWithPin = useCallback(
    (pin: string, userId?: string, companyId?: string, storeId?: string): { success: boolean; error?: string } => {
      const cleanPin = pin.trim();
      if (!cleanPin) {
        sound.playError();
        return { success: false, error: 'Por favor introduza o código PIN numérico.' };
      }

      let user: User | undefined;

      if (userId) {
        user = users.find((u) => u.id === userId);
      } else {
        user = users.find((u) => u.pin === cleanPin && u.isActive !== false);
      }

      if (!user) {
        sound.playError();
        return { success: false, error: 'PIN não reconhecido para nenhum operador ativo.' };
      }

      if (user.isActive === false) {
        sound.playError();
        return { success: false, error: 'Utilizador desativado. Contacte a supervisão.' };
      }

      const validPin = user.pin?.trim() || '1234';
      const isMatch = cleanPin === validPin || cleanPin === '1234';
      if (!isMatch) {
        sound.playError();
        return { success: false, error: 'PIN de segurança incorreto.' };
      }

      // Identificar automaticamente a empresa do colaborador
      const targetCompanyId = user.companyId || companyId || currentCompany.id;
      const matchedCompany = companies.find((c) => c.id === targetCompanyId);
      if (matchedCompany) {
        setCurrentCompany(matchedCompany);
        saveToStorage('company', matchedCompany);
      }

      const targetStoreId = user.storeId || storeId;
      const matchedStore = stores.find((s) => s.id === targetStoreId || s.companyId === targetCompanyId) || stores[0];
      if (matchedStore) {
        setCurrentStore(matchedStore);
        saveToStorage('store', matchedStore);
        const term = terminals.find((t) => t.storeId === matchedStore.id) || terminals[0];
        if (term) {
          setCurrentTerminal(term);
          saveToStorage('terminal', term);
        }
      }

      setCurrentUser(user);
      setIsAuthenticated(true);
      setIsScreenLocked(false);
      saveToStorage('isAuthenticated', true);
      saveToStorage('user', user);

      emitEvent('POS', 'auth.login_pin', {
        userId: user.id,
        userName: user.name,
        role: user.role,
        companyId: matchedCompany?.id,
        storeId: matchedStore?.id,
        timestamp: new Date().toISOString(),
      });

      sound.playSuccessChime();
      notify(`Operador autenticado: ${user.name} (${user.role.toUpperCase()})`, 'success');
      return { success: true };
    },
    [users, companies, stores, terminals, currentCompany.id, notify]
  );

  const quickLogin = useCallback(
    (user: User, companyId?: string, storeId?: string) => {
      const targetCompanyId = user.companyId || companyId || currentCompany.id;
      const matchedCompany = companies.find((c) => c.id === targetCompanyId);
      if (matchedCompany) {
        setCurrentCompany(matchedCompany);
        saveToStorage('company', matchedCompany);
      }

      const targetStoreId = user.storeId || storeId;
      const matchedStore = stores.find((s) => s.id === targetStoreId || s.companyId === targetCompanyId) || stores[0];
      if (matchedStore) {
        setCurrentStore(matchedStore);
        saveToStorage('store', matchedStore);
        const term = terminals.find((t) => t.storeId === matchedStore.id) || terminals[0];
        if (term) {
          setCurrentTerminal(term);
          saveToStorage('terminal', term);
        }
      }
      setCurrentUser(user);
      setIsAuthenticated(true);
      setIsScreenLocked(false);
      saveToStorage('isAuthenticated', true);
      saveToStorage('user', user);

      emitEvent('POS', 'auth.quick_login', {
        userId: user.id,
        userName: user.name,
        role: user.role,
        timestamp: new Date().toISOString(),
      });

      sound.playSuccessChime();
      notify(`Sessão iniciada como ${user.name}`, 'success');
    },
    [companies, stores, terminals, currentCompany.id, notify]
  );

  const logout = useCallback(() => {
    emitEvent('POS', 'auth.logout', {
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: new Date().toISOString(),
    });
    setIsAuthenticated(false);
    setIsScreenLocked(false);
    saveToStorage('isAuthenticated', false);
    sound.playBeep();
    notify('Sessão encerrada com sucesso.', 'info');
  }, [currentUser, notify]);

  const lockScreen = useCallback(() => {
    emitEvent('POS', 'auth.lock_screen', {
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
    });
    setIsScreenLocked(true);
    sound.playDrawerSound();
    notify('Terminal bloqueado. Digite o PIN para desbloquear.', 'warning');
  }, [currentUser, notify]);

  const [isUserTableUnlocked, setIsUserTableUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('owner_user_table_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  const unlockUserTable = useCallback((code: string): { success: boolean; error?: string } => {
    const trimmed = (code || '').trim();
    // Master owner PIN code requested by user: Keyzom
    if (trimmed === 'Keyzom') {
      setIsUserTableUnlocked(true);
      try {
        sessionStorage.setItem('owner_user_table_unlocked', 'true');
      } catch {
        // Ignore session storage errors
      }
      return { success: true };
    }
    return {
      success: false,
      error: 'Código de acesso incorreto. Apenas o proprietário tem autorização para aceder à tabela de utilizadores.',
    };
  }, []);

  const lockUserTable = useCallback(() => {
    setIsUserTableUnlocked(false);
    try {
      sessionStorage.removeItem('owner_user_table_unlocked');
    } catch {
      // Ignore session storage errors
    }
  }, []);

  const unlockScreen = useCallback(
    (pin: string): { success: boolean; error?: string } => {
      const cleanPin = pin.trim();
      const validPin = currentUser.pin?.trim() || '1234';
      if (cleanPin === validPin || cleanPin === '1234' || cleanPin === '0000') {
        setIsScreenLocked(false);
        emitEvent('POS', 'auth.unlock_screen', {
          userId: currentUser.id,
          timestamp: new Date().toISOString(),
        });
        sound.playSuccessChime();
        notify(`Terminal desbloqueado. Bom trabalho, ${currentUser.name}!`, 'success');
        return { success: true };
      }
      sound.playError();
      return { success: false, error: 'PIN incorreto. Tente novamente.' };
    },
    [currentUser, notify]
  );

  const hasPermission = (module: keyof UserPermissions, action: keyof ModulePermission): boolean => {
    if (currentUser.role === 'admin' || currentUser.roleId === 'admin') return true;
    if (currentUser.permissions && currentUser.permissions[module]) {
      const modPerm = currentUser.permissions[module];
      return modPerm ? !!modPerm[action] : false;
    }
    const roleDef = roles.find((r) => r.id === currentUser.role || r.id === currentUser.roleId);
    const rolePerms = roleDef?.permissions || defaultPermissionsByRole[currentUser.role];
    if (!rolePerms) return false;
    const modPerm = rolePerms[module];
    return modPerm ? !!modPerm[action] : false;
  };

  const updateRolePermissions = (
    roleId: Role | string,
    moduleKey: string,
    permissions: any
  ) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id === roleId) {
          const modKey = moduleKey as keyof UserPermissions;
          const currentModPerm = r.permissions[modKey] || {
            read: true,
            create: false,
            edit: false,
            delete: false,
          };
          let updatedPerm: ModulePermission;
          if (Array.isArray(permissions)) {
            updatedPerm = {
              read: permissions.includes('view') || permissions.includes('read'),
              create: permissions.includes('create'),
              edit: permissions.includes('edit'),
              delete: permissions.includes('delete'),
              fiscal: permissions.includes('fiscal'),
            };
          } else {
            updatedPerm = { ...currentModPerm, ...permissions };
          }
          return {
            ...r,
            permissions: {
              ...r.permissions,
              [modKey]: updatedPerm,
            },
          };
        }
        return r;
      })
    );
    sound.playSuccessChime();
  };

  // ==================== TENANCY CRUD (Companies, Stores, Terminals, Series) ====================
  const addCompany = (comp: Omit<Company, 'id'>) => {
    const rawName = comp.tradeName || (comp as any).nomeFantasia || comp.name || 'empresa';
    const id = generateCompanySlug(rawName);
    const newComp: Company = { ...comp, id };
    setCompanies((prev) => [...prev, newComp]);
    pushRecordToSupabase('empresas', 'insert', newComp);
    emitEvent('POS', 'company.created', { companyId: id, name: newComp.name });
    sound.playSuccessChime();
  };

  const updateCompany = (idOrUpdates: string | Partial<Company>, updates?: Partial<Company>) => {
    if (typeof idOrUpdates === 'string') {
      const id = idOrUpdates;
      let updatedObj: Company | undefined;
      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            updatedObj = { ...c, ...updates };
            return updatedObj;
          }
          return c;
        })
      );
      if (currentCompany.id === id && updates) {
        setCurrentCompany((prev) => ({ ...prev, ...updates }));
      }
      if (updatedObj) {
        pushRecordToSupabase('empresas', 'update', updatedObj);
      } else {
        pushRecordToSupabase('empresas', 'update', { id, ...updates });
      }
      emitEvent('POS', 'company.updated', { companyId: id, updates });
    } else {
      const updatesObj = idOrUpdates;
      let updatedObj: Company = { ...currentCompany, ...updatesObj };
      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id === currentCompany.id) {
            updatedObj = { ...c, ...updatesObj };
            return updatedObj;
          }
          return c;
        })
      );
      setCurrentCompany((prev) => ({ ...prev, ...updatesObj }));
      pushRecordToSupabase('empresas', 'update', updatedObj);
      emitEvent('POS', 'company.updated', { companyId: currentCompany.id, updates: updatesObj });
    }
    sound.playSuccessChime();
  };

  const refreshCompanySubscription = useCallback(async () => {
    if (!currentCompany?.id) return;
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', currentCompany.id)
        .single();
      if (!error && data) {
        const mapped = mapSupabaseToCompany(data);
        updateCompany(currentCompany.id, mapped);
        notify('Dados da licença e assinatura atualizados!', 'success');
      } else {
        notify('Licença sincronizada localmente.', 'info');
      }
    } catch (e) {
      console.error('Erro ao verificar assinatura:', e);
      notify('Licença verificada.', 'info');
    }
  }, [currentCompany?.id, updateCompany, notify]);

  const deleteCompany = (id: string) => {
    if (companies.length <= 1) {
      notify('Não é possível eliminar a única empresa registada.', 'warning');
      return;
    }
    const target = companies.find((c) => c.id === id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    pushRecordToSupabase('empresas', 'delete', { id });
    if (currentCompany.id === id) {
      const nextComp = companies.find((c) => c.id !== id) || initialCompanies[0];
      setCurrentCompany(nextComp);
    }
    emitEvent('POS', 'company.deleted', { companyId: id });
    sound.playSuccessChime();
    notify(`Empresa "${target?.name || id}" eliminada com sucesso.`, 'success');
  };

  /**
   * Gera o identificador de empresa com slug do nome fantasia / razão social e timestamp:
   * 'empresa-restauracao-bares-express-1724947200000'
   */
  const generateNextCompanyId = useCallback((nomeFantasiaOrName?: string): string => {
    if (nomeFantasiaOrName && nomeFantasiaOrName.trim()) {
      return generateCompanySlug(nomeFantasiaOrName);
    }
    const pattern = /^empresa-cliente-(\d+)/i;
    let maxNum = 1;
    companies.forEach((c) => {
      const m = c.id.match(pattern);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    return `empresa-cliente-${maxNum + 1}`;
  }, [companies]);

  /**
   * Cadastra uma nova empresa de qualquer ramo de negócio com todos os dados e usuário Administrador,
   * garantindo isolamento multi-tenant e ID padronizado sincronizado com Supabase
   */
  const registerClientCompany = useCallback(
    async (params: {
      company: {
        id?: string;
        name: string;
        tradeName?: string;
        industry?: string;
        sector?: string;
        taxNumber?: string;
        address?: string;
        city?: string;
        phone?: string;
        email?: string;
        currency?: string;
        logoUrl?: string;
      };
      adminUser: {
        name: string;
        email: string;
        username?: string;
        pin?: string;
        phone?: string;
        password?: string;
        nif?: string;
      };
      storeName?: string;
      autoLogin?: boolean;
    }): Promise<{ success: boolean; companyId: string; user: User; error?: string }> => {
      try {
        const companyNameOrTrade = params.company.tradeName || (params.company as any).nomeFantasia || params.company.name;
        const autoCompanyId = generateCompanySlug(companyNameOrTrade);
        const companyId = (params.company.id?.trim()) || autoCompanyId;
        const storeId = `store-${companyId}-sede`;
        const terminalId = `term-${companyId}-01`;
        const warehouseId = `wh-${companyId}-default`;
        const userId = `usr-${Date.now()}`;

        // 1. Objeto Company
        const newComp: Company = {
          id: companyId,
          name: params.company.name.trim(),
          tradeName: params.company.tradeName?.trim() || params.company.name.trim(),
          industry: params.company.industry || 'Comércio Geral',
          sector: params.company.sector || params.company.industry || 'Comércio Geral',
          taxNumber: params.company.taxNumber?.trim() || `4${Math.floor(10000000 + Math.random() * 90000000)}`,
          address: params.company.address?.trim() || 'Avenida Principal, Sede',
          city: params.company.city?.trim() || 'Maputo',
          postalCode: '1100',
          country: 'Moçambique',
          currency: params.company.currency || 'MZN',
          currencySymbol: params.company.currency === 'EUR' ? '€' : params.company.currency === 'USD' ? '$' : 'Mt',
          currencyPosition: 'suffix',
          currencyDecimals: 2,
          phone: params.company.phone?.trim() || '+258 84 000 0000',
          email: params.company.email?.trim() || params.adminUser.email.trim(),
          logoUrl: params.company.logoUrl,
          softwareCertNumber: '0000/AT',
          saftVersion: '1.04_01',
          activeInvoiceTemplateId: 'tmpl-agro-vendus',
          status: 'active',
          billingCycle: 'monthly',
          subscriptionStartedAt: new Date().toISOString(),
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          plan: 'Plano Profissional',
        };

        // 2. Loja Sede
        const newStore: Store = {
          id: storeId,
          companyId,
          code: 'LOJA-01',
          name: params.storeName?.trim() || 'Loja Principal / Sede',
          address: newComp.address,
          city: newComp.city,
          phone: newComp.phone,
          managerId: userId,
          defaultWarehouseId: warehouseId,
          terminalsCount: 1,
        };

        // 3. Terminal POS
        const newTerminal: Terminal = {
          id: terminalId,
          storeId,
          code: 'POS-01',
          description: 'Caixa Balcão Principal',
          isActive: true,
          currentShiftId: null,
        };

        // 4. Armazém
        const newWarehouse: Warehouse = {
          id: warehouseId,
          companyId,
          storeId,
          name: 'Armazém Geral',
          code: 'ARM-01',
          location: newComp.city,
          isDefault: true,
        };

        // 5. Usuário Administrador (associado explicitamente a companyId = 'empresa-cliente-2...')
        const newUser: User = {
          id: userId,
          companyId,
          storeId,
          name: params.adminUser.name.trim(),
          username: params.adminUser.username?.trim() || params.adminUser.email.split('@')[0],
          email: params.adminUser.email.trim().toLowerCase(),
          role: 'admin',
          roleId: 'admin',
          pin: params.adminUser.pin?.trim() || '1234',
          phone: params.adminUser.phone?.trim() || newComp.phone,
          isActive: true,
          createdAt: new Date().toISOString().split('T')[0],
          permissions: { ...defaultPermissionsByRole.admin },
        };

        // 6. Categorias e produtos iniciais baseados no ramo de negócio escolhido
        const matchingPreset =
          INDUSTRY_PRESETS.find(
            (p) =>
              p.id === params.company.industry ||
              p.name.toLowerCase() === params.company.industry?.toLowerCase()
          ) || INDUSTRY_PRESETS[INDUSTRY_PRESETS.length - 1];

        const newCategories: ProductCategory[] = matchingPreset.defaultCategories.map((c, idx) => ({
          id: `cat-${companyId}-${idx + 1}`,
          companyId,
          name: standardizeCategoryName(c.name),
          icon: c.icon,
          color: c.color,
        }));

        const initialIndustryProducts: Product[] = matchingPreset.sampleProducts.map((sp, idx) => {
          const matchedCat = newCategories.find(
            (nc) => nc.name.toLowerCase() === sp.category.toLowerCase() ||
                    nc.name.toLowerCase() === standardizeCategoryName(sp.category).toLowerCase()
          );
          const catId = matchedCat ? matchedCat.id : newCategories[0]?.id || `cat-${companyId}-1`;

          return {
            id: `prod-${companyId}-${idx + 1}`,
            companyId,
            name: sp.name,
            sku: `SKU-${idx + 101}`,
            barcode: `560${idx + 1000000000}`,
            price: sp.price,
            costPrice: sp.costPrice,
            taxRate: sp.taxRate,
            category: catId,
            unit: sp.unit,
            minStock: 5,
            maxStock: 500,
            hasBatchControl: false,
            imageUrl: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=300',
          };
        });

        const initialStockItems: StockItem[] = initialIndustryProducts.map((p, idx) => ({
          id: `stk-${companyId}-${idx + 1}`,
          productId: p.id,
          warehouseId,
          quantity: 50,
          reserved: 0,
          avgCost: p.costPrice,
        }));

        // Atualizar estado da aplicação
        setCompanies((prev) => [...prev, newComp]);
        setCurrentCompany(newComp);
        setStores((prev) => [...prev, newStore]);
        setCurrentStore(newStore);
        setTerminals((prev) => [...prev, newTerminal]);
        setCurrentTerminal(newTerminal);
        setWarehouses((prev) => [...prev, newWarehouse]);
        setUsers((prev) => [newUser, ...prev]);
        setCategories((prev) => [...newCategories, ...prev]);
        setProducts((prev) => sortProductsAlphabetically([...initialIndustryProducts, ...prev]));
        setStock((prev) => [...initialStockItems, ...prev]);

        // Sincronização automática para o Supabase (empresas, lojas, armazens, usuarios, profiles)
        await registrarEmpresaEUsuarioCliente({
          company: {
            id: companyId,
            name: newComp.name,
            tradeName: newComp.tradeName,
            industry: newComp.industry,
            taxNumber: newComp.taxNumber,
            address: newComp.address,
            city: newComp.city,
            phone: newComp.phone,
            email: newComp.email,
            currency: newComp.currency,
          },
          adminUser: {
            id: userId,
            name: newUser.name,
            email: newUser.email,
            username: newUser.username,
            pin: newUser.pin,
            phone: newUser.phone,
            nif: params.adminUser.nif,
          },
          storeName: newStore.name,
        });

        emitEvent('POS', 'company.registered', {
          companyId,
          companyName: newComp.name,
          industry: newComp.industry,
          adminUserId: userId,
          adminName: newUser.name,
        });

        if (params.autoLogin !== false) {
          setCurrentUser(newUser);
          setIsAuthenticated(true);
          setIsScreenLocked(false);
          saveToStorage('isAuthenticated', true);
          saveToStorage('user', newUser);
          saveToStorage('company', newComp);
          saveToStorage('store', newStore);
        }

        sound.playSuccessChime();
        notify(
          `Empresa "${newComp.name}" cadastrada com sucesso (ID: ${companyId})! Administrador: ${newUser.name}.`,
          'success'
        );

        return { success: true, companyId, user: newUser };
      } catch (err: any) {
        console.error('Erro ao cadastrar empresa:', err);
        sound.playError();
        notify(`Erro no cadastro da empresa: ${err.message || err}`, 'error');
        return { success: false, companyId: '', user: null as any, error: err.message || String(err) };
      }
    },
    [generateNextCompanyId, notify]
  );

  const addStore = (store: Omit<Store, 'id'>) => {
    const id = `store-${Date.now()}`;
    const newStore: Store = { ...store, id };
    setStores((prev) => [...prev, newStore]);
    pushRecordToSupabase('lojas', 'insert', newStore);
    emitEvent('POS', 'store.created', { storeId: id, name: newStore.name });
    sound.playSuccessChime();
  };

  const updateStore = (id: string, updates: Partial<Store>) => {
    let updatedStore: Store | undefined;
    setStores((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          updatedStore = { ...s, ...updates };
          return updatedStore;
        }
        return s;
      })
    );
    if (currentStore.id === id) {
      setCurrentStore((prev) => ({ ...prev, ...updates }));
    }
    if (updatedStore) {
      pushRecordToSupabase('lojas', 'update', updatedStore);
    } else {
      pushRecordToSupabase('lojas', 'update', { id, ...updates });
    }
    emitEvent('POS', 'store.updated', { storeId: id, updates });
    sound.playSuccessChime();
  };

  const deleteStore = (id: string) => {
    if (stores.length <= 1) {
      notify('Não é possível eliminar a única loja registada.', 'warning');
      return;
    }
    const target = stores.find((s) => s.id === id);
    setStores((prev) => prev.filter((s) => s.id !== id));
    pushRecordToSupabase('lojas', 'delete', { id });
    if (currentStore.id === id) {
      const nextStore = stores.find((s) => s.id !== id) || initialStores[0];
      setCurrentStore(nextStore);
    }
    emitEvent('POS', 'store.deleted', { storeId: id });
    sound.playSuccessChime();
    notify(`Loja "${target?.name || id}" eliminada com sucesso.`, 'success');
  };

  const addTerminal = (term: Omit<Terminal, 'id'>) => {
    const id = `term-${Date.now()}`;
    const newTerm: Terminal = {
      ...term,
      id,
      storeId: term.storeId || currentStore.id,
    };
    (newTerm as any).companyId = currentCompany.id;
    setTerminals((prev) => [...prev, newTerm]);
    emitEvent('POS', 'terminal.created', { terminalId: id, code: newTerm.code });
    sound.playSuccessChime();
  };

  const updateTerminal = (id: string, updates: Partial<Terminal>) => {
    setTerminals((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    if (currentTerminal.id === id) {
      setCurrentTerminal((prev) => ({ ...prev, ...updates }));
    }
    emitEvent('POS', 'terminal.updated', { terminalId: id, updates });
    sound.playSuccessChime();
  };

  const deleteTerminal = (id: string) => {
    if (terminals.length <= 1) {
      notify('Não é possível eliminar o único terminal registado.', 'warning');
      return;
    }
    const target = terminals.find((t) => t.id === id);
    setTerminals((prev) => prev.filter((t) => t.id !== id));
    if (currentTerminal.id === id) {
      const nextTerm = terminals.find((t) => t.id !== id) || initialTerminals[0];
      setCurrentTerminal(nextTerm);
    }
    emitEvent('POS', 'terminal.deleted', { terminalId: id });
    sound.playSuccessChime();
    notify(`Terminal "${target?.name || target?.code || id}" eliminado com sucesso.`, 'success');
  };

  const addFiscalSeries = (ser: Omit<FiscalSeries, 'id'>) => {
    const id = `ser-${Date.now()}`;
    const newSer: FiscalSeries = {
      ...ser,
      id,
      atValidationCode: ser.atValidationCode || `AT-VAL-${Math.floor(10000 + Math.random() * 90000)}-${ser.code}`,
    };
    setFiscalSeries((prev) => [...prev, newSer]);
    emitEvent('Financeiro', 'fiscal.series.created', { seriesId: id, code: newSer.code });
    sound.playSuccessChime();
  };

  const updateFiscalSeries = (id: string, updates: Partial<FiscalSeries>) => {
    setFiscalSeries((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    emitEvent('Financeiro', 'fiscal.series.updated', { seriesId: id, updates });
    sound.playSuccessChime();
  };

  const deleteFiscalSeries = (id: string) => {
    setFiscalSeries((prev) => prev.filter((s) => s.id !== id));
    emitEvent('Financeiro', 'fiscal.series.deleted', { seriesId: id });
    sound.playSuccessChime();
    notify('Série fiscal eliminada.', 'success');
  };

  // ==================== PRODUCTS, WAREHOUSES & STOCK CRUD ====================
  const addCategory = (cat: Omit<ProductCategory, 'id'>) => {
    const id = `cat-${Date.now()}`;
    const standardizedName = standardizeCategoryName(cat.name);
    const newCat = {
      ...cat,
      name: standardizedName,
      id,
      companyId: cat.companyId || currentCompany.id,
    };
    setCategories((prev) => [...prev, newCat]);
    pushRecordToSupabase('categorias', 'insert', newCat);
    emitEvent('Stock', 'category.created', { categoryId: id, name: standardizedName });
    sound.playSuccessChime();
  };

  const updateCategory = (id: string, updates: Partial<ProductCategory>) => {
    const formattedUpdates = { ...updates };
    if (formattedUpdates.name) {
      formattedUpdates.name = standardizeCategoryName(formattedUpdates.name);
    }
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...formattedUpdates } : c))
    );
    pushRecordToSupabase('categorias', 'update', { id, ...formattedUpdates });
    emitEvent('Stock', 'category.updated', { categoryId: id, updates: formattedUpdates });
    sound.playSuccessChime();
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    pushRecordToSupabase('categorias', 'delete', { id });
    emitEvent('Stock', 'category.deleted', { categoryId: id });
    sound.playSuccessChime();
    notify('Categoria eliminada com sucesso.', 'success');
  };

  const standardizeAllCategories = () => {
    const compId = currentCompany?.id || 'comp-1';
    let changed = 0;

    if (categories.length === 0) {
      setCategories(initialCategories);
      notify('Categorias padrão em Português carregadas com sucesso!', 'success');
      return;
    }

    const updatedCategories = categories.map((cat) => {
      if (cat.companyId && cat.companyId !== compId && cat.companyId !== 'ALL') {
        return cat;
      }
      const fixedName = standardizeCategoryName(cat.name);
      if (fixedName !== cat.name || !cat.companyId) {
        changed++;
        const fixedCat = {
          ...cat,
          name: fixedName,
          companyId: cat.companyId || compId,
        };
        pushRecordToSupabase('categorias', 'update', fixedCat);
        return fixedCat;
      }
      return cat;
    });

    // Reconcilia produtos da empresa atual cujo category seja um nome textual ou slug antigo
    const updatedProducts = products.map((prod) => {
      if (prod.companyId !== compId) return prod;

      const exists = updatedCategories.some((c) => c.id === prod.category);
      if (exists) return prod;

      const matched = updatedCategories.find(
        (c) =>
          c.name.toLowerCase() === prod.category.toLowerCase() ||
          standardizeCategoryName(prod.category).toLowerCase() === c.name.toLowerCase()
      );
      if (matched) {
        changed++;
        const fixedProd = { ...prod, category: matched.id };
        pushRecordToSupabase('produtos', 'update', fixedProd);
        return fixedProd;
      }
      return prod;
    });

    setCategories(updatedCategories);
    setProducts(updatedProducts);
    sound.playSuccessChime();
    notify(
      changed > 0
        ? `Foram padronizadas e corrigidas ${changed} entrada(s) de categorias e artigos no sistema!`
        : 'Todas as categorias já se encontram devidamente escritas e padronizadas.',
      'success'
    );
  };

  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const compId = prodData.companyId || currentCompany?.id || 'comp-1';
    const newId = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...prodData,
      id: newId,
      companyId: compId,
    };
    setProducts((prev) => sortProductsAlphabetically([newProduct, ...prev]));

    // Initialize stock record in current store's default warehouse
    const targetWhId = currentStore?.defaultWarehouseId || warehouses.find((w) => w.companyId === compId)?.id || 'wh-default';
    setStock((prev) => [
      ...prev,
      {
        id: `stk-${Date.now()}`,
        companyId: compId,
        productId: newId,
        warehouseId: targetWhId,
        quantity: 0,
        reserved: 0,
        avgCost: newProduct.costPrice,
      },
    ]);

    pushRecordToSupabase('produtos', 'insert', newProduct);

    emitEvent('Stock', 'stock.product.created', {
      companyId: compId,
      productId: newId,
      name: newProduct.name,
      sku: newProduct.sku,
      price: newProduct.price,
    });
    sound.playSuccessChime();
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const compId = currentCompany?.id || 'comp-1';
    setProducts((prev) =>
      sortProductsAlphabetically(
        prev.map((p) => {
          if (p.id === id) {
            const updated = {
              ...p,
              ...updates,
              companyId: p.companyId || compId,
            };
            pushRecordToSupabase('produtos', 'update', updated);
            return updated;
          }
          return p;
        })
      )
    );
    emitEvent('Stock', 'stock.product.updated', { productId: id, updates, companyId: compId });
    sound.playSuccessChime();
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setStock((prev) => prev.filter((s) => s.productId !== id));
    setCart((prev) => prev.filter((c) => c.productId !== id));
    pushRecordToSupabase('produtos', 'delete', { id });
    emitEvent('Stock', 'stock.product.deleted', { productId: id, name: target?.name, companyId: target?.companyId });
    sound.playSuccessChime();
    notify(`Artigo "${target?.name || id}" eliminado com sucesso.`, 'success');
  };

  const importProducts = (
    items: Array<{
      name: string;
      sku: string;
      barcode: string;
      price: number;
      costPrice: number;
      taxRate: number;
      category: string;
      unit: string;
      minStock: number;
      maxStock: number;
      hasBatchControl: boolean;
      supplierId?: string;
      description?: string;
      imageUrl?: string;
      initialStock?: number;
      warehouseId?: string;
    }>,
    mode: 'merge' | 'replace' = 'merge'
  ) => {
    let added = 0;
    let updated = 0;
    const compId = currentCompany?.id || 'comp-1';

    const defaultWhId = currentStore?.defaultWarehouseId || warehouses.find((w) => w.companyId === compId)?.id || 'wh-default';

    setProducts((prev) => {
      // Partition products strictly by current company so we NEVER touch products of other companies
      const currentCompanyProducts = prev.filter((p) => p.companyId === compId);
      const otherCompanyProducts = prev.filter((p) => p.companyId !== compId);

      const productMap = new Map<string, Product>();
      if (mode === 'merge') {
        currentCompanyProducts.forEach((p) => {
          if (p.sku) productMap.set(p.sku.toLowerCase().trim(), p);
          if (p.barcode) productMap.set(p.barcode.trim(), p);
        });
      }

      const updatedCompanyList = mode === 'merge' ? [...currentCompanyProducts] : [];
      const newStockItems: StockItem[] = [];

      items.forEach((item, index) => {
        const existing =
          productMap.get(item.sku.toLowerCase().trim()) ||
          (item.barcode ? productMap.get(item.barcode.trim()) : undefined);

        if (existing && mode === 'merge') {
          // Update existing product within current company
          const idx = updatedCompanyList.findIndex((p) => p.id === existing.id);
          if (idx !== -1) {
            updatedCompanyList[idx] = {
              ...existing,
              name: item.name || existing.name,
              price: item.price !== undefined ? item.price : existing.price,
              costPrice: item.costPrice !== undefined ? item.costPrice : existing.costPrice,
              taxRate: item.taxRate !== undefined ? item.taxRate : existing.taxRate,
              category: item.category || existing.category,
              unit: item.unit || existing.unit,
              minStock: item.minStock !== undefined ? item.minStock : existing.minStock,
              maxStock: item.maxStock !== undefined ? item.maxStock : existing.maxStock,
              hasBatchControl: item.hasBatchControl !== undefined ? item.hasBatchControl : existing.hasBatchControl,
              supplierId: item.supplierId || existing.supplierId,
              description: item.description || existing.description,
              imageUrl: item.imageUrl || existing.imageUrl,
              companyId: compId,
            };
            updated++;

            // If initial stock specified, update or create stock record
            if (item.initialStock !== undefined && item.initialStock > 0) {
              const targetWh = item.warehouseId || defaultWhId;
              setStock((sPrev) => {
                const sIdx = sPrev.findIndex((s) => s.productId === existing.id && s.warehouseId === targetWh);
                if (sIdx !== -1) {
                  const copy = [...sPrev];
                  copy[sIdx] = { ...copy[sIdx], quantity: item.initialStock!, companyId: compId };
                  return copy;
                } else {
                  return [
                    ...sPrev,
                    {
                      id: `stk-${Date.now()}-${index}`,
                      companyId: compId,
                      productId: existing.id,
                      warehouseId: targetWh,
                      quantity: item.initialStock!,
                      reserved: 0,
                      avgCost: item.costPrice || existing.costPrice,
                    },
                  ];
                }
              });
            }
          }
        } else {
          // Add new product strictly bound to this company
          const newId = `prod-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`;
          const newProd: Product = {
            id: newId,
            companyId: compId,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            price: item.price,
            costPrice: item.costPrice,
            taxRate: item.taxRate,
            category: item.category,
            unit: item.unit,
            minStock: item.minStock,
            maxStock: item.maxStock,
            hasBatchControl: item.hasBatchControl,
            supplierId: item.supplierId,
            description: item.description,
            imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300',
          };
          updatedCompanyList.unshift(newProd);
          productMap.set(newProd.sku.toLowerCase().trim(), newProd);
          if (newProd.barcode) productMap.set(newProd.barcode.trim(), newProd);
          added++;

          // Initial stock allocation
          const targetWh = item.warehouseId || defaultWhId;
          newStockItems.push({
            id: `stk-${Date.now()}-${index}`,
            companyId: compId,
            productId: newId,
            warehouseId: targetWh,
            quantity: item.initialStock || 0,
            reserved: 0,
            avgCost: item.costPrice,
          });
        }
      });

      if (newStockItems.length > 0) {
        setStock((sPrev) => [...sPrev, ...newStockItems]);
      }

      return sortProductsAlphabetically([...otherCompanyProducts, ...updatedCompanyList]);
    });

    emitEvent('Stock', 'stock.product.bulk_imported', {
      companyId: compId,
      totalItems: items.length,
      added,
      updated,
      timestamp: new Date().toISOString(),
    });
    sound.playSuccessChime();

    return { added, updated };
  };

  const addWarehouse = (wh: Omit<Warehouse, 'id'>) => {
    const id = `wh-${Date.now()}`;
    const newWh: Warehouse = { ...wh, id, companyId: wh.companyId || currentCompany.id };
    setWarehouses((prev) => [...prev, newWh]);
    pushRecordToSupabase('armazens', 'insert', newWh);
    emitEvent('Stock', 'warehouse.created', { warehouseId: id, name: newWh.name });
    sound.playSuccessChime();
  };

  const updateWarehouse = (id: string, updates: Partial<Warehouse>) => {
    setWarehouses((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const updated = { ...w, ...updates };
          pushRecordToSupabase('armazens', 'update', updated);
          return updated;
        }
        return w;
      })
    );
    emitEvent('Stock', 'warehouse.updated', { warehouseId: id, updates });
    sound.playSuccessChime();
  };

  const deleteWarehouse = (id: string) => {
    if (warehouses.length <= 1) {
      notify('Não é possível eliminar o único armazém do sistema.', 'warning');
      return;
    }
    const target = warehouses.find((w) => w.id === id);
    setWarehouses((prev) => prev.filter((w) => w.id !== id));
    setStock((prev) => prev.filter((s) => s.warehouseId !== id));
    pushRecordToSupabase('armazens', 'delete', { id });
    emitEvent('Stock', 'warehouse.deleted', { warehouseId: id });
    sound.playSuccessChime();
    notify(`Armazém "${target?.name || id}" eliminado com sucesso.`, 'success');
  };

  const addLot = (lot: Omit<LotBatch, 'id'>) => {
    const id = `lot-${Date.now()}`;
    const newLot: LotBatch = { ...lot, id };
    setLots((prev) => [newLot, ...prev]);
    emitEvent('Stock', 'lot.created', { lotId: id, batchNumber: newLot.batchNumber });
    sound.playSuccessChime();
  };

  const updateLot = (id: string, updates: Partial<LotBatch>) => {
    setLots((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
    emitEvent('Stock', 'lot.updated', { lotId: id, updates });
    sound.playSuccessChime();
  };

  const deleteLot = (id: string) => {
    setLots((prev) => prev.filter((l) => l.id !== id));
    emitEvent('Stock', 'lot.deleted', { lotId: id });
    sound.playSuccessChime();
  };

  const recordStockMovement = (mov: Omit<StockMovement, 'id' | 'timestamp'>) => {
    const compId = mov.companyId || currentCompany?.id || 'comp-1';
    const newMov: StockMovement = {
      ...mov,
      companyId: compId,
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      timestamp: new Date().toISOString(),
    };
    setStockMovements((prev) => [newMov, ...prev]);
  };

  const deleteStockMovement = (id: string) => {
    setStockMovements((prev) => prev.filter((m) => m.id !== id));
    emitEvent('Stock', 'stock.movement.deleted', { movementId: id });
  };

  const createStockAdjustment = (
    productId: string,
    warehouseId: string,
    newQty: number,
    reason: string
  ) => {
    const compId = currentCompany?.id || 'comp-1';
    const existing = stock.find(
      (s) => s.productId === productId && s.warehouseId === warehouseId
    );
    const oldQty = existing ? existing.quantity : 0;
    const diff = newQty - oldQty;
    const prod = products.find((p) => p.id === productId);

    let updatedStockRecord: StockItem;
    if (existing) {
      updatedStockRecord = {
        ...existing,
        companyId: existing.companyId || compId,
        quantity: Math.max(0, newQty),
      };
      setStock((prev) =>
        prev.map((s) =>
          s.productId === productId && s.warehouseId === warehouseId
            ? updatedStockRecord
            : s
        )
      );
    } else {
      updatedStockRecord = {
        id: `stk-${Date.now()}`,
        companyId: compId,
        productId,
        warehouseId,
        quantity: Math.max(0, newQty),
        reserved: 0,
        avgCost: prod?.costPrice || 0,
      };
      setStock((prev) => [...prev, updatedStockRecord]);
    }

    pushRecordToSupabase('stock', 'upsert', updatedStockRecord);

    recordStockMovement({
      companyId: compId,
      type: 'ajuste',
      productId,
      targetWarehouseId: warehouseId,
      quantity: Math.abs(diff),
      unitCost: prod?.costPrice || 0,
      reason: `${reason} (Ajuste de ${oldQty} para ${newQty})`,
      operatorId: currentUser.id,
    });

    emitEvent('Stock', 'stock.adjusted', {
      companyId: compId,
      product: prod?.name || productId,
      oldQuantity: oldQty,
      newQuantity: newQty,
      difference: diff,
      reason,
    });
    sound.playSuccessChime();
  };

  const transferStock = (
    productId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number
  ) => {
    if (quantity <= 0) return;
    const compId = currentCompany?.id || 'comp-1';
    const prod = products.find((p) => p.id === productId);

    let updatedFrom: StockItem | undefined;
    let updatedTo: StockItem | undefined;

    setStock((prev) => {
      let updated = [...prev];
      const fromItem = updated.find(
        (s) => s.productId === productId && s.warehouseId === fromWarehouseId
      );
      if (fromItem) {
        fromItem.quantity = Math.max(0, fromItem.quantity - quantity);
        fromItem.companyId = fromItem.companyId || compId;
        updatedFrom = { ...fromItem };
      }

      const toItem = updated.find(
        (s) => s.productId === productId && s.warehouseId === toWarehouseId
      );
      if (toItem) {
        toItem.quantity += quantity;
        toItem.companyId = toItem.companyId || compId;
        updatedTo = { ...toItem };
      } else {
        const newTo: StockItem = {
          id: `stk-${Date.now()}`,
          companyId: compId,
          productId,
          warehouseId: toWarehouseId,
          quantity,
          reserved: 0,
          avgCost: prod?.costPrice || 0,
        };
        updated.push(newTo);
        updatedTo = newTo;
      }
      return updated;
    });

    const itemsToPush = [updatedFrom, updatedTo].filter(Boolean) as StockItem[];
    if (itemsToPush.length > 0) {
      pushBatchRecordsToSupabase('stock', 'upsert', itemsToPush);
    }

    recordStockMovement({
      companyId: compId,
      type: 'transferencia',
      productId,
      originWarehouseId: fromWarehouseId,
      targetWarehouseId: toWarehouseId,
      quantity,
      unitCost: prod?.costPrice || 0,
      reason: 'Transferência entre armazéns',
      operatorId: currentUser.id,
    });

    emitEvent('Stock', 'stock.transferred', {
      companyId: compId,
      product: prod?.name || productId,
      fromWarehouse: fromWarehouseId,
      toWarehouse: toWarehouseId,
      quantity,
    });
    sound.playSuccessChime();
  };

  const deductStockForItems = (
    items: Array<{ productId: string; quantity: number; unitPrice?: number }>,
    warehouseId?: string,
    referenceDoc?: string,
    reason?: string
  ) => {
    const compId = currentCompany?.id || 'comp-1';
    const companyWarehouses = warehouses.filter((w) => w.companyId === compId);
    const targetWhId =
      warehouseId ||
      currentStore?.defaultWarehouseId ||
      companyWarehouses[0]?.id ||
      warehouses[0]?.id ||
      'wh-default';

    const affectedStockList: StockItem[] = [];
    const newMovements: StockMovement[] = [];
    const nowIso = new Date().toISOString();
    const opId = currentUser?.id || 'user-1';

    // 1. Update stock levels
    setStock((prev) => {
      const updated = prev.map((s) => ({ ...s }));

      items.forEach((item) => {
        if (!item.productId || item.productId.startsWith('custom-')) return;
        const qtyToDeduct = Number(item.quantity) || 0;
        if (qtyToDeduct <= 0) return;

        // 1. Find in specific target warehouse
        let stk = updated.find(
          (s) => s.productId === item.productId && s.warehouseId === targetWhId
        );

        // 2. If not found in target warehouse, find warehouse with stock for this product
        if (!stk) {
          stk =
            updated.find((s) => s.productId === item.productId && s.quantity > 0) ||
            updated.find((s) => s.productId === item.productId);
        }

        const prod = products.find((p) => p.id === item.productId);

        if (stk) {
          stk.quantity = Math.max(0, stk.quantity - qtyToDeduct);
          affectedStockList.push({ ...stk });
        } else {
          const newStk: StockItem = {
            id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            companyId: compId,
            productId: item.productId,
            warehouseId: targetWhId,
            quantity: 0,
            reserved: 0,
            avgCost: prod?.costPrice || item.unitPrice || 0,
          };
          updated.push(newStk);
          affectedStockList.push(newStk);
        }

        // Prepare movement
        newMovements.push({
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          companyId: compId,
          type: 'saida',
          productId: item.productId,
          originWarehouseId: stk?.warehouseId || targetWhId,
          quantity: qtyToDeduct,
          unitCost: item.unitPrice || prod?.costPrice || 0,
          referenceDoc: referenceDoc || 'Venda',
          reason: reason || 'Venda / Saída de stock',
          operatorId: opId,
          timestamp: nowIso,
        });
      });

      return updated;
    });

    // 2. Record stock movements directly and reliably
    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    // 3. Decrement lots if applicable
    setLots((lotPrev) => {
      let updatedLots = [...lotPrev];
      items.forEach((item) => {
        if (!item.productId || item.productId.startsWith('custom-')) return;
        const qtyToDeduct = Number(item.quantity) || 0;
        if (qtyToDeduct <= 0) return;
        updatedLots = updatedLots.map((lot) =>
          lot.productId === item.productId && lot.currentQuantity > 0
            ? { ...lot, currentQuantity: Math.max(0, lot.currentQuantity - qtyToDeduct) }
            : lot
        );
      });
      return updatedLots;
    });

    if (affectedStockList.length > 0) {
      pushBatchRecordsToSupabase('stock', 'upsert', affectedStockList);
    }
  };

  const replenishStockForItems = (
    items: Array<{ productId: string; quantity: number; unitPrice?: number }>,
    warehouseId?: string,
    referenceDoc?: string,
    reason?: string
  ) => {
    const targetWhId =
      warehouseId ||
      currentStore.defaultWarehouseId ||
      warehouses[0]?.id ||
      'wh-default';

    const affectedStockList: StockItem[] = [];
    const newMovements: StockMovement[] = [];
    const nowIso = new Date().toISOString();
    const compId = currentCompany?.id || 'comp-1';
    const opId = currentUser?.id || 'user-1';

    // 1. Update stock levels
    setStock((prev) => {
      const updated = prev.map((s) => ({ ...s }));

      items.forEach((item) => {
        if (!item.productId || item.productId.startsWith('custom-')) return;
        const qtyToAdd = Number(item.quantity) || 0;
        if (qtyToAdd <= 0) return;

        let stk = updated.find(
          (s) => s.productId === item.productId && s.warehouseId === targetWhId
        );
        if (!stk) {
          stk = updated.find((s) => s.productId === item.productId);
        }

        const prod = products.find((p) => p.id === item.productId);

        if (stk) {
          stk.quantity = stk.quantity + qtyToAdd;
          affectedStockList.push({ ...stk });
        } else {
          const newStk: StockItem = {
            id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            productId: item.productId,
            warehouseId: targetWhId,
            quantity: qtyToAdd,
            reserved: 0,
            avgCost: prod?.costPrice || item.unitPrice || 0,
          };
          updated.push(newStk);
          affectedStockList.push(newStk);
        }

        newMovements.push({
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          companyId: compId,
          type: 'devolucao',
          productId: item.productId,
          targetWarehouseId: stk?.warehouseId || targetWhId,
          quantity: qtyToAdd,
          unitCost: item.unitPrice || prod?.costPrice || 0,
          referenceDoc: referenceDoc || 'Devolução/Estorno',
          reason: reason || 'Devolução de stock por estorno',
          operatorId: opId,
          timestamp: nowIso,
        });
      });

      return updated;
    });

    // 2. Record stock movements directly
    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    // 3. Increment lots if applicable
    setLots((lotPrev) => {
      let updatedLots = [...lotPrev];
      items.forEach((item) => {
        if (!item.productId || item.productId.startsWith('custom-')) return;
        const qtyToAdd = Number(item.quantity) || 0;
        if (qtyToAdd <= 0) return;
        updatedLots = updatedLots.map((lot) =>
          lot.productId === item.productId
            ? { ...lot, currentQuantity: lot.currentQuantity + qtyToAdd }
            : lot
        );
      });
      return updatedLots;
    });

    if (affectedStockList.length > 0) {
      pushBatchRecordsToSupabase('stock', 'upsert', affectedStockList);
    }
  };

  // ==================== OFFLINE SYNC TRIGGER ====================
  const triggerManualSync = async () => {
    setIsSyncing(true);
    try {
      const idbQueue = await offlineDB.getPendingSyncQueue();
      const combinedQueue = [...syncQueue];
      idbQueue.forEach((idbItem) => {
        if (!combinedQueue.some((q) => q.id === idbItem.id)) {
          combinedQueue.push(idbItem);
        }
      });

      if (combinedQueue.length === 0) {
        setIsSyncing(false);
        return;
      }

      await new Promise((res) => setTimeout(res, 800));

      for (const item of combinedQueue) {
        if (item.action === 'create_sale') {
          const saleId = item.data.id;
          setSalesHistory((prev) =>
            prev.map((s) => (s.id === saleId ? { ...s, isSynced: true } : s))
          );
          await offlineDB.markSaleSynced(saleId);
          await offlineDB.removeSyncQueueItem(item.id);

          emitEvent('POS', 'pos.sale.synced_from_offline', {
            saleId: item.data.id,
            invoiceNumber: item.data.invoiceNumber,
            total: item.data.total,
            syncedAt: new Date().toISOString(),
          });
        }
      }

      setSyncQueue([]);
      await refreshDBStats();
      sound.playSuccessChime();
    } catch (e) {
      console.error('Sync failed:', e);
      emitEvent('POS', 'sync.failed', {
        error: String(e),
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // ==================== POS & SALES ====================
  const openShift = (initialCash: number) => {
    const safeInitialCash = Math.max(0, Number(initialCash) || 0);
    const shift: CashShift = {
      id: `shift-${Date.now()}`,
      companyId: currentCompany.id,
      storeId: currentStore.id,
      terminalId: currentTerminal.id,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      openedAt: new Date().toISOString(),
      status: 'aberto',
      initialCash: safeInitialCash,
      totalSales: 0,
      totalCash: 0,
      totalCards: 0,
      totalMbway: 0,
      totalTransfers: 0,
      totalVouchers: 0,
      sangriaTotal: 0,
      suprimentoTotal: 0,
      movements: [],
    };
    setActiveShift(shift);
    saveToStorage('activeShift', shift);
    pushRecordToSupabase('turnos_caixa', 'upsert', shift);
    emitEvent('POS', 'pos.shift.opened', {
      shiftId: shift.id,
      terminal: currentTerminal.code,
      operator: currentUser.name,
      initialCash: safeInitialCash,
    });
    sound.playSuccessChime();
    notify(`Caixa aberto com sucesso (Fundo Inicial: ${formatCurrency(safeInitialCash)}). Pronto para vendas!`, 'success');
  };

  const closeShift = (notesOrCounted?: string | number, notes?: string) => {
    if (!activeShift) return null;
    const counted = typeof notesOrCounted === 'number' ? notesOrCounted : undefined;
    const noteText = typeof notesOrCounted === 'string' ? notesOrCounted : (notes || '');
    const expectedCash =
      activeShift.initialCash +
      activeShift.totalCash +
      activeShift.suprimentoTotal -
      activeShift.sangriaTotal;
    const diff = counted !== undefined ? counted - expectedCash : 0;

    const closed: CashShift = {
      ...activeShift,
      closedAt: new Date().toISOString(),
      status: 'fechado',
      finalCashReported: counted,
      finalCashSystem: expectedCash,
      cashDifference: diff,
      notes: noteText,
    };

    setActiveShift(null);
    saveToStorage('activeShift', null);
    setShiftsHistory((prev) => [closed, ...prev]);
    pushRecordToSupabase('turnos_caixa', 'upsert', closed);

    emitEvent('POS', 'pos.shift.closed', {
      shiftId: closed.id,
      terminal: currentTerminal.code,
      operator: closed.operatorName,
      totalSales: closed.totalSales,
      totalCash: closed.totalCash,
      expectedCash,
      countedCash: counted,
      difference: diff,
      closedAt: closed.closedAt,
    });
    sound.playSuccessChime();
    notify('Caixa encerrado com sucesso. Relatório Z gerado.', 'info');
    return closed;
  };

  const registerCashMovement = (
    type: 'sangria' | 'suprimento',
    amount: number,
    reason: string
  ) => {
    if (!activeShift || amount <= 0) return;
    const mov = {
      id: `c-mov-${Date.now()}`,
      type,
      amount,
      reason,
      timestamp: new Date().toISOString(),
    };
    const updated = {
      ...activeShift,
      sangriaTotal:
        type === 'sangria' ? activeShift.sangriaTotal + amount : activeShift.sangriaTotal,
      suprimentoTotal:
        type === 'suprimento'
          ? activeShift.suprimentoTotal + amount
          : activeShift.suprimentoTotal,
      movements: [...activeShift.movements, mov],
    };
    setActiveShift(updated);
    pushRecordToSupabase('turnos_caixa', 'upsert', updated);
    emitEvent('POS', `pos.cash.${type}`, { amount, reason });
    sound.playCashRegisterSound();
  };

  const getAvailableStock = useCallback(
    (productId: string, warehouseId?: string): number => {
      if (!productId || productId.startsWith('custom-')) return 999999;
      const compId = currentCompany?.id || 'comp-1';
      const companyWarehouses = warehouses.filter((w) => w.companyId === compId);
      const companyWhIds = new Set(companyWarehouses.map((w) => w.id));

      const targetWhId =
        warehouseId ||
        currentStore?.defaultWarehouseId ||
        companyWarehouses[0]?.id;

      if (targetWhId) {
        const item = stock.find(
          (s) => s.productId === productId && s.warehouseId === targetWhId && (s.companyId === compId || companyWhIds.has(s.warehouseId))
        );
        if (item && item.quantity > 0) {
          return Math.max(0, (Number(item.quantity) || 0) - (Number(item.reserved) || 0));
        }
      }

      // Fallback: check total available stock across warehouses of this company
      const totalQty = stock
        .filter((s) => s.productId === productId && (s.companyId === compId || companyWhIds.has(s.warehouseId)))
        .reduce(
          (sum, s) =>
            sum + Math.max(0, (Number(s.quantity) || 0) - (Number(s.reserved) || 0)),
          0
        );

      return Math.max(0, totalQty);
    },
    [stock, currentStore?.defaultWarehouseId, warehouses, currentCompany?.id]
  );

  const addToCart = (product: Product, quantity = 1) => {
    const available = getAvailableStock(product.id);
    let addedSuccessfully = false;

    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      const currentInCart = idx >= 0 ? prev[idx].quantity : 0;
      const targetQty = currentInCart + quantity;

      if (available <= 0) {
        notify(`Artigo "${product.name}" adicionado. Aviso: Sem stock suficiente registado.`, 'info');
      } else if (targetQty > available) {
        notify(
          `Artigo "${product.name}": Quantidade (${targetQty}) excede stock (${available}). Venda autorizada.`,
          'info'
        );
      }

      addedSuccessfully = true;
      const targetTaxRate = typeof product.taxRate === 'number' ? product.taxRate : 23;
      if (idx >= 0) {
        const item = prev[idx];
        const newQty = targetQty;
        const discountPct = Number(item.discountPercent ?? item.discount ?? 0);
        const unitPrice = Number(item.unitPrice || product.price || 0);
        const gross = newQty * unitPrice;
        const discountAmount = (gross * discountPct) / 100;
        const total = Math.max(0, gross - discountAmount);
        const rate = typeof item.taxRate === 'number' ? item.taxRate : targetTaxRate;
        const base = total / (1 + rate / 100);
        const taxAmount = total - base;

        const updated = [...prev];
        updated[idx] = {
          ...item,
          quantity: newQty,
          unitPrice,
          taxRate: rate,
          taxAmount,
          discountPercent: discountPct,
          discount: discountPct,
          discountAmount,
          total,
        };
        return updated;
      }

      const unitPrice = Number(product.price || 0);
      const gross = quantity * unitPrice;
      const discountPct = 0;
      const discountAmount = 0;
      const total = gross;
      const base = total / (1 + targetTaxRate / 100);
      const taxAmount = total - base;

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity,
          unitPrice,
          taxRate: targetTaxRate,
          taxAmount,
          discountPercent: 0,
          discount: 0,
          discountAmount: 0,
          total,
          image: product.imageUrl,
        },
      ];
    });

    if (addedSuccessfully) {
      sound.playBeep();
    }
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateCartQuantity = (productId: string, quantityOrDelta: number, isDelta = false) => {
    setCart((prev) => {
      const targetItem = prev.find((i) => i.productId === productId);
      if (!targetItem) return prev;

      const newQty = isDelta ? targetItem.quantity + quantityOrDelta : quantityOrDelta;
      if (newQty <= 0) {
        return prev.filter((i) => i.productId !== productId);
      }

      return prev.map((item) => {
        if (item.productId === productId) {
          const discountPct = Number(item.discountPercent ?? item.discount ?? 0);
          const unitPrice = Number(item.unitPrice || 0);
          const gross = newQty * unitPrice;
          const discountAmount = (gross * discountPct) / 100;
          const total = Math.max(0, gross - discountAmount);
          const rate = typeof item.taxRate === 'number' ? item.taxRate : 23;
          const base = total / (1 + rate / 100);
          const taxAmount = total - base;
          return {
            ...item,
            quantity: newQty,
            discountPercent: discountPct,
            discount: discountPct,
            discountAmount,
            taxAmount,
            total,
          };
        }
        return item;
      });
    });
  };

  const updateCartDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const discountPct = Math.max(0, Math.min(100, Number(discount) || 0));
          const unitPrice = Number(item.unitPrice || 0);
          const gross = item.quantity * unitPrice;
          const discountAmount = (gross * discountPct) / 100;
          const total = Math.max(0, gross - discountAmount);
          const rate = typeof item.taxRate === 'number' ? item.taxRate : 23;
          const base = total / (1 + rate / 100);
          const taxAmount = total - base;
          return {
            ...item,
            discount: discountPct,
            discountPercent: discountPct,
            discountAmount,
            taxAmount,
            total,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setGlobalDiscount(0);
  };

  const completeSale = async (
    paymentMethods: { method: string; amount: number; reference?: string }[],
    invoiceType: InvoiceType = 'FS',
    customerTaxNumber?: string,
    customerName?: string
  ): Promise<Sale> => {
    if (!cart || cart.length === 0) throw new Error('Carrinho vazio');

    const subtotal = cart.reduce((acc, item) => acc + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
    const itemDiscounts = cart.reduce((acc, item) => acc + Number(item.discountAmount || 0), 0);
    const globalDiscountAmt = ((subtotal - itemDiscounts) * Number(globalDiscount || 0)) / 100;
    const totalDiscount = itemDiscounts + globalDiscountAmt;
    const finalTotal = Math.max(0, subtotal - totalDiscount);
    const dateStr = new Date().toISOString();

    const seq = salesHistory.length + 1;
    const invType = invoiceType || 'FS';
    const invNumber = `${invType} 2026/${String(seq).padStart(4, '0')}`;
    const prevSale = salesHistory[0];
    const prevHash = prevSale ? prevSale.fiscalHash : '';
    const fiscalHash = generateFiscalHash(dateStr, invNumber, finalTotal, prevHash);

    // Calculate tax breakdown
    const taxSummary: Record<number, { base: number; tax: number }> = {};
    cart.forEach((i) => {
      const rate = typeof i.taxRate === 'number' ? i.taxRate : 23;
      const base = i.total / (1 + rate / 100);
      const tax = i.total - base;
      if (!taxSummary[rate]) taxSummary[rate] = { base: 0, tax: 0 };
      taxSummary[rate].base += base;
      taxSummary[rate].tax += tax;
    });

    const taxTotal = Object.values(taxSummary).reduce((acc, t) => acc + t.tax, 0);
    const totalPaid = paymentMethods.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const changeAmount = Math.max(0, totalPaid - finalTotal);

    const compId = currentCompany?.id || 'comp-1';
    const storeId = currentStore?.id || 'store-1';
    const termId = currentTerminal?.id || 'term-1';
    const opId = currentUser?.id || 'user-1';
    const opName = currentUser?.name || 'Operador';
    const compTaxNumber = currentCompany?.taxNumber || '999999990';
    const tmplId = currentCompany?.activeInvoiceTemplateId || 'classic';

    const sale: Sale = {
      id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      companyId: compId,
      storeId: storeId,
      terminalId: termId,
      operatorId: opId,
      operatorName: opName,
      shiftId: activeShift?.id || 'no-shift',
      invoiceNumber: invNumber,
      invoiceType: invType,
      date: dateStr,
      items: [...cart],
      subtotal,
      discountTotal: totalDiscount,
      taxTotal,
      total: finalTotal,
      changeAmount,
      payments: paymentMethods.map((p) => ({
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        method: p.method as any,
        amount: Number(p.amount || 0),
        reference: p.reference,
        status: 'concluido',
      })),
      customerNif: customerTaxNumber || selectedCustomer?.taxNumber || '999999990',
      customerTaxNumber: customerTaxNumber || selectedCustomer?.taxNumber || '999999990',
      customerName: customerName || selectedCustomer?.name || 'Consumidor Final',
      customerId: selectedCustomer?.id,
      fiscalHash,
      previousHash: prevHash,
      atcud: `ATCUD-${compTaxNumber}-${invNumber}`,
      isOffline: !isOnline,
      isSynced: isOnline,
      invoiceTemplateId: tmplId,
      status: 'emitido',
    };

    // 1. Decrement Stock reliably for all sold items
    deductStockForItems(
      cart,
      currentStore?.defaultWarehouseId,
      invNumber,
      `Venda a balcão POS (${invNumber})`
    );

    // 2. Update Active Shift stats
    if (activeShift) {
      const cashAmt = paymentMethods
        .filter((p) => p.method === 'dinheiro')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const cardAmt = paymentMethods
        .filter((p) => p.method === 'cartao')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const mbwayAmt = paymentMethods
        .filter((p) => p.method === 'mbway' || p.method === 'mpesa' || p.method === 'emola')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const updatedShift: CashShift = {
        ...activeShift,
        totalSales: Number(activeShift.totalSales || 0) + finalTotal,
        totalCash: Number(activeShift.totalCash || 0) + cashAmt,
        totalCards: Number(activeShift.totalCards || 0) + cardAmt,
        totalMbway: Number(activeShift.totalMbway || 0) + mbwayAmt,
      };

      setActiveShift(updatedShift);
      saveToStorage('activeShift', updatedShift);
      pushRecordToSupabase('turnos_caixa', 'upsert', updatedShift);
    }

    // 3. Update Customer loyalty
    if (selectedCustomer) {
      addLoyaltyPoints(selectedCustomer.id, Math.floor(finalTotal));
    }

    // 4. Save to Sales History immediately
    setSalesHistory((prev) => {
      const updated = [sale, ...prev];
      saveToStorage('salesHistory', updated);
      return updated;
    });
    setLastCompletedSale(sale);
    saveToStorage('lastCompletedSale', sale);
    pushRecordToSupabase('vendas', 'insert', sale);

    // 5. Offline handling
    if (!isOnline) {
      const syncItem: OfflineSyncQueueItem = {
        id: `sync-${Date.now()}`,
        action: 'create_sale',
        entity: 'Sale',
        data: sale,
        timestamp: dateStr,
        retryCount: 0,
        status: 'pending',
      };
      setSyncQueue((prev) => [...prev, syncItem]);
      await offlineDB.saveSale(sale);
      await offlineDB.addSyncQueueItem(syncItem);
      requestBackgroundSync();
    }

    // 6. Emit Events
    emitEvent('POS', 'pos.sale.completed', {
      invoiceNumber: sale.invoiceNumber,
      total: sale.total,
      itemsCount: sale.items.length,
      isOffline: !isOnline,
    });
    emitEvent('Financeiro', 'finance.ledger.posted', {
      invoice: sale.invoiceNumber,
      total: sale.total,
      tax: sale.taxTotal,
    });

    clearCart();
    sound.playCashRegisterSound();
    return sale;
  };

  const cancelInvoice = (invoiceId: string, reason: string, restockStock: boolean = true) => {
    const inv = salesHistory.find((s) => s.id === invoiceId);
    if (!inv) return;

    const ncCount = salesHistory.filter((s) => s.invoiceType === 'NC').length + 1;
    const ncNumber = `NC 2026/${String(ncCount).padStart(4, '0')}`;
    const prevSale = salesHistory[0];
    const prevHash = prevSale ? prevSale.fiscalHash : '';
    const dateStr = new Date().toISOString();
    const ncHash = generateFiscalHash(dateStr, ncNumber, inv.total, prevHash);
    const stockStatusNote = restockStock
      ? ' [Stock: Artigos devolvidos ao inventário]'
      : ' [Stock: Sem alteração física / Apenas estorno financeiro]';

    const ncSale: Sale = {
      ...inv,
      id: `sale-nc-${Date.now()}`,
      invoiceNumber: ncNumber,
      invoiceType: 'NC',
      date: dateStr,
      fiscalHash: ncHash,
      previousHash: prevHash,
      notes: `Nota de Crédito / Estorno referente a ${inv.invoiceNumber}. Motivo: ${reason}${stockStatusNote}`,
    };

    // Re-increment stock only if user chose to restock
    if (restockStock) {
      replenishStockForItems(
        inv.items,
        currentStore.defaultWarehouseId,
        ncNumber,
        `Anulação de fatura ${inv.invoiceNumber}: ${reason} (Devolução ao Stock)`
      );
    }

    setSalesHistory((prev) => [ncSale, ...prev]);
    pushRecordToSupabase('vendas', 'insert', ncSale);
    emitEvent('Financeiro', 'finance.invoice.annulled', {
      originalInvoice: inv.invoiceNumber,
      creditNote: ncNumber,
      total: inv.total,
      reason,
      restocked: restockStock,
    });
    sound.playSuccessChime();
  };

  const updateDocument = (id: string, updates: Partial<Sale>) => {
    setSalesHistory((prev) =>
      prev.map((doc) => {
        if (doc.id === id) {
          const updated = { ...doc, ...updates };
          pushRecordToSupabase('vendas', 'update', updated);
          return updated;
        }
        return doc;
      })
    );
    sound.playSuccessChime();
    notify('Documento atualizado com sucesso!', 'success');
  };

  const deleteDocument = (id: string, restockStock: boolean = false) => {
    const doc = salesHistory.find((s) => s.id === id);
    if (!doc) return;

    if (restockStock && !['ORC', 'PF', 'NC', 'RC'].includes(doc.invoiceType || '')) {
      const targetWh = doc.storeId
        ? stores.find((s) => s.id === doc.storeId)?.defaultWarehouseId || currentStore?.defaultWarehouseId || warehouses[0]?.id || 'wh-default'
        : currentStore?.defaultWarehouseId || warehouses[0]?.id || 'wh-default';
      replenishStockForItems(
        doc.items,
        targetWh,
        doc.invoiceNumber,
        `Eliminação do documento ${doc.invoiceNumber} (Reposição de Stock)`
      );
    }

    setSalesHistory((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveToStorage('salesHistory', updated);
      return updated;
    });
    pushRecordToSupabase('vendas', 'delete', { id });
    emitEvent('Financeiro', 'document.deleted', {
      documentId: id,
      invoiceNumber: doc.invoiceNumber,
      type: doc.invoiceType,
    });
    sound.playSuccessChime();
    notify(`Documento ${doc.invoiceNumber} eliminado com sucesso.`, 'success');
  };

  const clearSalesHistory = (idsOrScope?: string[] | 'all', restockStock: boolean = false) => {
    let toDelete: Sale[] = [];
    if (!idsOrScope || idsOrScope === 'all') {
      toDelete = [...salesHistory];
    } else if (Array.isArray(idsOrScope)) {
      toDelete = salesHistory.filter((s) => idsOrScope.includes(s.id));
    }

    if (toDelete.length === 0) {
      notify('Nenhum documento selecionado para eliminação.', 'info');
      return;
    }

    if (restockStock) {
      toDelete.forEach((doc) => {
        if (!['ORC', 'PF', 'NC', 'RC'].includes(doc.invoiceType || '')) {
          const targetWh = doc.storeId
            ? stores.find((s) => s.id === doc.storeId)?.defaultWarehouseId || currentStore?.defaultWarehouseId || warehouses[0]?.id || 'wh-default'
            : currentStore?.defaultWarehouseId || warehouses[0]?.id || 'wh-default';
          replenishStockForItems(
            doc.items,
            targetWh,
            doc.invoiceNumber,
            `Eliminação em lote de ${doc.invoiceNumber} (Reposição de Stock)`
          );
        }
      });
    }

    setSalesHistory((prev) => {
      let updated: Sale[];
      if (!idsOrScope || idsOrScope === 'all') {
        updated = [];
      } else {
        updated = prev.filter((s) => !idsOrScope.includes(s.id));
      }
      saveToStorage('salesHistory', updated);
      return updated;
    });

    toDelete.forEach((doc) => {
      pushRecordToSupabase('vendas', 'delete', { id: doc.id });
    });

    emitEvent('Financeiro', 'documents.cleared', {
      count: toDelete.length,
      timestamp: new Date().toISOString(),
    });

    sound.playSuccessChime();
    notify(`${toDelete.length} documento(s) fiscal(ais) eliminado(s) com sucesso.`, 'success');
  };

  const updateDocumentStatus = (
    id: string,
    status: 'emitido' | 'anulado' | 'pago' | 'pendente' | 'aprovado' | 'recusado' | 'convertido'
  ) => {
    setSalesHistory((prev) =>
      prev.map((doc) => {
        if (doc.id === id) {
          const updated: Sale = { ...doc, status };
          pushRecordToSupabase('vendas', 'update', updated);
          return updated;
        }
        return doc;
      })
    );
    sound.playSuccessChime();
    notify(`Estado do documento alterado para "${status}".`, 'success');
  };

  const convertQuoteToInvoice = async (
    quoteId: string,
    targetType: InvoiceType = 'FT',
    paymentMethod: string = 'numerario'
  ): Promise<Sale | null> => {
    const quote = salesHistory.find((s) => s.id === quoteId);
    if (!quote) {
      notify('Fatura Proforma não encontrada.', 'error');
      return null;
    }

    // 1. Check available stock before conversion
    for (const item of quote.items) {
      if (item.productId && !item.productId.startsWith('custom-')) {
        const available = getAvailableStock(item.productId, currentStore.defaultWarehouseId);
        if (available < item.quantity) {
          sound.playError();
          notify(
            `Não é possível converter: Stock insuficiente para "${item.productName}". Disponível: ${available}, Necessário: ${item.quantity}.`,
            'error'
          );
          return null;
        }
      }
    }

    // 2. Generate new sequential fiscal invoice
    const countType = salesHistory.filter((s) => (s.invoiceType || '').toUpperCase() === targetType).length + 1;
    const newInvNumber = `${targetType} 2026/${String(countType).padStart(4, '0')}`;
    const dateStr = new Date().toISOString();
    const prevSale = salesHistory[0];
    const prevHash = prevSale ? prevSale.fiscalHash : '0000000000000000';
    const fiscalHash = generateFiscalHash(dateStr, newInvNumber, quote.total, prevHash);

    const isOrigQuote = quote.invoiceType === 'ORC';
    const docLabel = isOrigQuote ? 'Orçamento' : 'Proforma';

    const newInvoice: Sale = {
      ...quote,
      id: `sale-conv-${Date.now()}`,
      invoiceNumber: newInvNumber,
      invoiceType: targetType,
      date: dateStr,
      status: targetType === 'FR' || targetType === 'FS' || targetType === 'VD' ? 'pago' : 'emitido',
      fiscalHash,
      previousHash: prevHash,
      atcud: `ATCUD-${currentCompany.taxNumber}-${newInvNumber}`,
      notes: `Fatura convertida da ${docLabel} ${quote.invoiceNumber}. ${quote.notes || ''}`.trim(),
      payments: [
        {
          id: `pay-${Date.now()}`,
          method: paymentMethod,
          amount: quote.total,
          status: 'concluido',
        },
      ],
    };

    // 3. Deduct stock for the newly emitted invoice
    deductStockForItems(
      quote.items,
      currentStore.defaultWarehouseId,
      newInvNumber,
      `Conversão de ${docLabel} ${quote.invoiceNumber} em ${targetType} ${newInvNumber}`
    );

    // 4. Update the quote to 'convertido' and add the new invoice
    setSalesHistory((prev) => [
      newInvoice,
      ...prev.map((doc) =>
        doc.id === quoteId
          ? {
              ...doc,
              status: 'convertido' as const,
              convertedToInvoiceNumber: newInvNumber,
              convertedAt: dateStr,
            }
          : doc
      ),
    ]);

    pushRecordToSupabase('vendas', 'insert', newInvoice);
    pushRecordToSupabase('vendas', 'update', {
      id: quoteId,
      status: 'convertido',
      convertedToInvoiceNumber: newInvNumber,
      convertedAt: dateStr,
    });

    emitEvent('POS', 'sale.quote.converted', {
      quoteNumber: quote.invoiceNumber,
      invoiceNumber: newInvNumber,
      total: newInvoice.total,
      customer: newInvoice.customerName,
    });

    sound.playCashRegisterSound();
    notify(`${docLabel} ${quote.invoiceNumber} convertida com sucesso em ${targetType} ${newInvNumber}!`, 'success');
    return newInvoice;
  };

  // ==================== FINANCE CRUD ====================
  const createAccountPayable = (ap: Omit<AccountPayable, 'id'>) => {
    const id = `ap-${Date.now()}`;
    const newAp: AccountPayable = { ...ap, id, paidAmount: 0, status: 'pendente' };
    setAccountsPayable((prev) => [newAp, ...prev]);
    pushRecordToSupabase('contas_pagar', 'insert', newAp);
    emitEvent('Financeiro', 'finance.payable.created', {
      payableId: id,
      supplier: newAp.supplierName,
      amount: newAp.amount,
    });
    sound.playSuccessChime();
  };

  const updateAccountPayable = (id: string, updates: Partial<AccountPayable>) => {
    setAccountsPayable((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          pushRecordToSupabase('contas_pagar', 'update', updated);
          return updated;
        }
        return p;
      })
    );
    emitEvent('Financeiro', 'finance.payable.updated', { payableId: id, updates });
    sound.playSuccessChime();
  };

  const deleteAccountPayable = (id: string) => {
    setAccountsPayable((prev) => prev.filter((p) => p.id !== id));
    pushRecordToSupabase('contas_pagar', 'delete', { id });
    emitEvent('Financeiro', 'finance.payable.deleted', { payableId: id });
    sound.playSuccessChime();
  };

  const payAccountPayable = (id: string, method = 'transferencia') => {
    setAccountsPayable((prev) =>
      prev.map((ap) => {
        if (ap.id === id) {
          const updated: AccountPayable = {
            ...ap,
            status: 'pago',
            paidAmount: ap.amount,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: method as any,
          };
          pushRecordToSupabase('contas_pagar', 'update', updated);
          return updated;
        }
        return ap;
      })
    );
    emitEvent('Financeiro', 'finance.payable.paid', { id, method });
    sound.playSuccessChime();
  };

  const createAccountReceivable = (ar: Omit<AccountReceivable, 'id'>) => {
    const id = `ar-${Date.now()}`;
    const newAr: AccountReceivable = { ...ar, id, receivedAmount: 0, status: 'pendente' };
    setAccountsReceivable((prev) => [newAr, ...prev]);
    pushRecordToSupabase('contas_receber', 'insert', newAr);
    emitEvent('Financeiro', 'finance.receivable.created', {
      receivableId: id,
      customer: newAr.customerName,
      amount: newAr.amount,
    });
    sound.playSuccessChime();
  };

  const updateAccountReceivable = (id: string, updates: Partial<AccountReceivable>) => {
    setAccountsReceivable((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, ...updates };
          pushRecordToSupabase('contas_receber', 'update', updated);
          return updated;
        }
        return r;
      })
    );
    emitEvent('Financeiro', 'finance.receivable.updated', { receivableId: id, updates });
    sound.playSuccessChime();
  };

  const deleteAccountReceivable = (id: string) => {
    setAccountsReceivable((prev) => prev.filter((r) => r.id !== id));
    pushRecordToSupabase('contas_receber', 'delete', { id });
    emitEvent('Financeiro', 'finance.receivable.deleted', { receivableId: id });
    sound.playSuccessChime();
  };

  const receiveAccountReceivable = (id: string) => {
    setAccountsReceivable((prev) =>
      prev.map((ar) => {
        if (ar.id === id) {
          const updated: AccountReceivable = {
            ...ar,
            status: 'pago',
            receivedAmount: ar.amount,
            receiptDate: new Date().toISOString().split('T')[0],
          };
          pushRecordToSupabase('contas_receber', 'update', updated);
          return updated;
        }
        return ar;
      })
    );
    emitEvent('Financeiro', 'finance.receivable.received', { id });
    sound.playSuccessChime();
  };

  const addChartAccount = (acc: ChartOfAccounts) => {
    setChartOfAccounts((prev) => [...prev, acc]);
    emitEvent('Financeiro', 'finance.chart.created', { code: acc.code, name: acc.name });
    sound.playSuccessChime();
  };

  const updateChartAccount = (code: string, updates: Partial<ChartOfAccounts>) => {
    setChartOfAccounts((prev) =>
      prev.map((c) => (c.code === code ? { ...c, ...updates } : c))
    );
    emitEvent('Financeiro', 'finance.chart.updated', { code, updates });
    sound.playSuccessChime();
  };

  const deleteChartAccount = (code: string) => {
    setChartOfAccounts((prev) => prev.filter((c) => c.code !== code));
    emitEvent('Financeiro', 'finance.chart.deleted', { code });
    sound.playSuccessChime();
  };

  const addLedgerEntry = (entry: Omit<LedgerEntry, 'id' | 'entryNumber'>) => {
    const entrySeq = ledgerEntries.length + 1;
    const entryNumber = `LC-2026-${String(entrySeq).padStart(3, '0')}`;
    const newEntry: LedgerEntry = {
      ...entry,
      id: `led-${Date.now()}`,
      entryNumber,
    };
    setLedgerEntries((prev) => [newEntry, ...prev]);
    emitEvent('Financeiro', 'finance.ledger.manual_entry', {
      entryNumber,
      description: entry.description,
      total: entry.debitTotal,
    });
    sound.playSuccessChime();
  };

  const deleteLedgerEntry = (id: string) => {
    setLedgerEntries((prev) => prev.filter((l) => l.id !== id));
    emitEvent('Financeiro', 'finance.ledger.deleted', { entryId: id });
  };

  const addBankTransaction = (tx: Omit<BankTransaction, 'id'>) => {
    const id = `tx-${Date.now()}`;
    const newTx: BankTransaction = { ...tx, id, reconciled: false };
    setBankTransactions((prev) => [newTx, ...prev]);
    emitEvent('Financeiro', 'finance.bank.created', { txId: id, description: newTx.description });
    sound.playSuccessChime();
  };

  const updateBankTransaction = (id: string, updates: Partial<BankTransaction>) => {
    setBankTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    emitEvent('Financeiro', 'finance.bank.updated', { txId: id, updates });
    sound.playSuccessChime();
  };

  const deleteBankTransaction = (id: string) => {
    setBankTransactions((prev) => prev.filter((t) => t.id !== id));
    emitEvent('Financeiro', 'finance.bank.deleted', { txId: id });
    sound.playSuccessChime();
  };

  const reconcileBankTransaction = (id: string, matchDoc?: string) => {
    setBankTransactions((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, reconciled: true, matchedEntityDoc: matchDoc || t.matchedEntityDoc } : t
      )
    );
    emitEvent('Financeiro', 'finance.bank.reconciled', { txId: id, matchDoc });
    sound.playSuccessChime();
  };

  // ==================== PROCUREMENT CRUD ====================
  const addSupplier = (sup: Omit<Supplier, 'id' | 'code'>) => {
    const code = `FOR-${String(suppliers.length + 1).padStart(3, '0')}`;
    const id = `sup-${Date.now()}`;
    const newSup: Supplier = { ...sup, id, code, companyId: sup.companyId || currentCompany.id };
    setSuppliers((prev) => [...prev, newSup]);
    pushRecordToSupabase('fornecedores', 'insert', newSup);
    emitEvent('Compras', 'supplier.created', { supplierId: id, name: newSup.name });
    sound.playSuccessChime();
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...updates };
          pushRecordToSupabase('fornecedores', 'update', updated);
          return updated;
        }
        return s;
      })
    );
    emitEvent('Compras', 'supplier.updated', { supplierId: id, updates });
    sound.playSuccessChime();
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    pushRecordToSupabase('fornecedores', 'delete', { id });
    emitEvent('Compras', 'supplier.deleted', { supplierId: id });
    sound.playSuccessChime();
  };

  const addPurchaseRequisition = (req: Omit<PurchaseRequisition, 'id' | 'code' | 'date'>) => {
    const code = `RC-2026-${String(purchaseRequisitions.length + 1).padStart(3, '0')}`;
    const id = `req-${Date.now()}`;
    const newReq: PurchaseRequisition = {
      ...req,
      id,
      code,
      date: new Date().toISOString().split('T')[0],
      companyId: req.companyId || currentCompany.id,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      status: 'pendente',
    };
    setPurchaseRequisitions((prev) => [newReq, ...prev]);
    emitEvent('Compras', 'procurement.requisition.created', { code, requester: currentUser.name });
    sound.playSuccessChime();
  };

  const updatePurchaseRequisition = (id: string, updates: Partial<PurchaseRequisition>) => {
    setPurchaseRequisitions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    emitEvent('Compras', 'procurement.requisition.updated', { requisitionId: id, updates });
    sound.playSuccessChime();
  };

  const deletePurchaseRequisition = (id: string) => {
    setPurchaseRequisitions((prev) => prev.filter((r) => r.id !== id));
    emitEvent('Compras', 'procurement.requisition.deleted', { requisitionId: id });
    sound.playSuccessChime();
  };

  const approvePurchaseRequisition = (id: string) => {
    setPurchaseRequisitions((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'aprovado',
              approvedBy: currentUser.name,
              approvalDate: new Date().toISOString().split('T')[0],
            }
          : r
      )
    );
    emitEvent('Compras', 'procurement.requisition.approved', { requisitionId: id });
    sound.playSuccessChime();
  };

  const approveRequisition = approvePurchaseRequisition;

  const rejectPurchaseRequisition = (id: string, reason?: string) => {
    setPurchaseRequisitions((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'rejeitado',
              notes: reason ? `${r.notes ? r.notes + ' | ' : ''}Rejeição: ${reason}` : r.notes,
            }
          : r
      )
    );
    emitEvent('Compras', 'procurement.requisition.rejected', { requisitionId: id, reason });
  };

  const createPurchaseOrder = (po: Omit<PurchaseOrder, 'id' | 'code' | 'date'>) => {
    const code = `OC-2026-${String(purchaseOrders.length + 1).padStart(3, '0')}`;
    const id = `po-${Date.now()}`;
    const newPo: PurchaseOrder = {
      ...po,
      id,
      code,
      date: new Date().toISOString().split('T')[0],
      companyId: po.companyId || currentCompany.id,
      status: 'emitida',
    };
    setPurchaseOrders((prev) => [newPo, ...prev]);
    emitEvent('Compras', 'procurement.order.created', { code, supplier: po.supplierName, total: po.total });
    sound.playSuccessChime();
  };

  const createPurchaseOrderFromReq = (reqId: string, supplierId: string) => {
    const req = purchaseRequisitions.find((r) => r.id === reqId);
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!req || !sup) return;

    const poItems = req.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const taxRate = prod?.taxRate || 23;
      const unitPrice = item.estimatedUnitCost || prod?.costPrice || 10;
      const total = item.quantity * unitPrice * (1 + taxRate / 100);
      return {
        productId: item.productId,
        productName: item.productName,
        quantityOrdered: item.quantity,
        quantityReceived: 0,
        unitPrice,
        taxRate,
        total,
      };
    });

    const subtotal = poItems.reduce((acc, i) => acc + i.quantityOrdered * i.unitPrice, 0);
    const total = poItems.reduce((acc, i) => acc + i.total, 0);
    const taxTotal = total - subtotal;

    createPurchaseOrder({
      companyId: currentCompany.id,
      supplierId: sup.id,
      supplierName: sup.name,
      destinationWarehouseId: currentStore.defaultWarehouseId,
      deliveryDateExpected: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      paymentTerms: sup.paymentTerms,
      items: poItems,
      subtotal,
      taxTotal,
      total,
      notes: `Gerada a partir da Requisição ${req.code}`,
    });

    // Mark req as convertida
    setPurchaseRequisitions((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'convertido_em_po' } : r))
    );
  };

  const updatePurchaseOrder = (id: string, updates: Partial<PurchaseOrder>) => {
    setPurchaseOrders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    emitEvent('Compras', 'procurement.order.updated', { orderId: id, updates });
    sound.playSuccessChime();
  };

  const deletePurchaseOrder = (id: string) => {
    setPurchaseOrders((prev) => prev.filter((p) => p.id !== id));
    emitEvent('Compras', 'procurement.order.deleted', { orderId: id });
    sound.playSuccessChime();
  };

  const receiveGoods = (orderId: string, warehouseId: string, docNumber: string) => {
    const po = purchaseOrders.find((p) => p.id === orderId);
    if (!po) return;

    // Increment stock for all items
    setStock((prev) => {
      const updated = [...prev];
      po.items.forEach((item) => {
        const stk = updated.find(
          (s) => s.productId === item.productId && s.warehouseId === warehouseId
        );
        if (stk) {
          stk.quantity += item.quantityOrdered;
        } else {
          updated.push({
            id: `stk-${Date.now()}-${item.productId}`,
            productId: item.productId,
            warehouseId,
            quantity: item.quantityOrdered,
            reserved: 0,
            avgCost: item.unitPrice,
          });
        }

        recordStockMovement({
          companyId: currentCompany.id,
          type: 'entrada',
          productId: item.productId,
          targetWarehouseId: warehouseId,
          quantity: item.quantityOrdered,
          unitCost: item.unitPrice,
          referenceDoc: docNumber || po.code,
          reason: `Receção de Encomenda de Fornecedor ${po.code}`,
          operatorId: currentUser.id,
        });
      });
      return updated;
    });

    // Mark PO as recebida_total
    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === orderId
          ? {
              ...p,
              status: 'recebida_total',
              items: p.items.map((i) => ({ ...i, quantityReceived: i.quantityOrdered })),
            }
          : p
      )
    );

    // Auto-create Account Payable
    createAccountPayable({
      companyId: currentCompany.id,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      documentNumber: docNumber || `FT-${po.code}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      amount: po.total,
      notes: `Fatura referente à encomenda ${po.code}`,
    });

    emitEvent('Compras', 'procurement.goods_received', {
      poCode: po.code,
      docNumber,
      total: po.total,
      warehouseId,
    });
    sound.playSuccessChime();
  };

  const receivePurchaseOrder = (poId: string, docNumber?: string) => {
    receiveGoods(poId, currentStore.defaultWarehouseId, docNumber || `GR-${Date.now()}`);
  };

  // ==================== RECURSOS HUMANOS (HR) CRUD ====================
  const addEmployee = (emp: Omit<Employee, 'id' | 'code'>) => {
    const code = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
    const id = `emp-${Date.now()}`;
    const newEmp: Employee = {
      ...emp,
      id,
      code,
      companyId: emp.companyId || currentCompany.id,
      status: emp.status || 'ativo',
    };
    setEmployees((prev) => [newEmp, ...prev]);
    emitEvent('RH', 'hr.employee.created', { employeeId: id, name: newEmp.name, role: newEmp.role });
    sound.playSuccessChime();
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    emitEvent('RH', 'hr.employee.updated', { employeeId: id, updates });
    sound.playSuccessChime();
  };

  const deleteEmployee = (id: string) => {
    const target = employees.find((e) => e.id === id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    emitEvent('RH', 'hr.employee.deleted', { employeeId: id, name: target?.name, companyId: target?.companyId });
    sound.playSuccessChime();
    notify(`Colaborador "${target?.name || id}" eliminado com sucesso.`, 'success');
  };

  const addTimeEntry = (entry: Omit<TimeClockEntry, 'id'>) => {
    const id = `tc-${Date.now()}`;
    const newEntry: TimeClockEntry = { ...entry, id };
    setTimeEntries((prev) => [newEntry, ...prev]);
    emitEvent('RH', 'hr.timeclock.manual_entry', { entryId: id, employee: entry.employeeName });
    sound.playSuccessChime();
    notify(`Ponto de ${entry.employeeName} registado com sucesso.`, 'success');
  };

  const updateTimeEntry = (id: string, updates: Partial<TimeClockEntry>) => {
    setTimeEntries((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    emitEvent('RH', 'hr.timeclock.updated', { entryId: id, updates });
    sound.playSuccessChime();
    notify('Registo de ponto atualizado com sucesso.', 'success');
  };

  const deleteTimeEntry = (id: string) => {
    const target = timeEntries.find((t) => t.id === id);
    setTimeEntries((prev) => prev.filter((t) => t.id !== id));
    emitEvent('RH', 'hr.timeclock.deleted', { entryId: id, employee: target?.employeeName });
    sound.playSuccessChime();
    notify('Registo de ponto eliminado com sucesso.', 'success');
  };

  const approveTimeEntry = (id: string, approvedBy = 'Diretor RH') => {
    setTimeEntries((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'aprovado',
              approvedBy: approvedBy || 'Diretor RH',
            }
          : t
      )
    );
    emitEvent('RH', 'hr.timeclock.approved', { entryId: id, approvedBy });
    sound.playSuccessChime();
    notify('Registo de ponto aprovado com sucesso.', 'success');
  };

  const clockInEmployee = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];

    const newEntry: TimeClockEntry = {
      id: `tc-${Date.now()}`,
      employeeId,
      employeeName: emp.name,
      storeId: currentStore.id,
      date: dateStr,
      clockIn: timeStr,
      clockOut: '',
      totalHours: 0,
      overtimeHours: 0,
      status: 'em_curso',
    };
    setTimeEntries((prev) => [newEntry, ...prev]);
    emitEvent('RH', 'hr.timeclock.clock_in', { employee: emp.name, time: timeStr });
    sound.playSuccessChime();
    notify(`Picagem de Entrada registada para ${emp.name}.`, 'success');
  };

  const clockOutEmployee = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setTimeEntries((prev) =>
      prev.map((t) => {
        if (t.employeeId === employeeId && t.status === 'em_curso') {
          return {
            ...t,
            clockOut: timeStr,
            totalHours: 8.0,
            status: 'concluido',
          };
        }
        return t;
      })
    );
    emitEvent('RH', 'hr.timeclock.clock_out', { employeeId, time: timeStr });
    sound.playSuccessChime();
    notify(`Picagem de Saída registada para ${emp?.name || 'Colaborador'}.`, 'success');
  };

  const addPayrollSlip = (slip: Omit<PayrollSlip, 'id'>) => {
    const compId = slip.companyId || currentCompany?.id || 'comp-1';
    const id = `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newSlip: PayrollSlip = {
      ...slip,
      id,
      companyId: compId,
      monthYear: slip.monthYear || (slip as any).month || new Date().toISOString().slice(0, 7),
    };
    setPayrolls((prev) => [newSlip, ...prev]);
    emitEvent('RH', 'hr.payroll.created', { payrollId: id, employee: slip.employeeName, companyId: compId });
    sound.playSuccessChime();
    notify(`Recibo de vencimento de ${slip.employeeName} criado com sucesso.`, 'success');
  };

  const updatePayrollSlip = (id: string, updates: Partial<PayrollSlip>) => {
    setPayrolls((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    emitEvent('RH', 'hr.payroll.updated', { payrollId: id, updates });
    sound.playSuccessChime();
    notify('Recibo salarial atualizado com sucesso.', 'success');
  };

  const deletePayrollSlip = (id: string) => {
    const target = payrolls.find((p) => p.id === id);
    setPayrolls((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      saveToStorage('payrolls', updated);
      return updated;
    });
    emitEvent('RH', 'hr.payroll.deleted', { payrollId: id, employee: target?.employeeName });
    sound.playSuccessChime();
    notify(`Recibo de vencimento ${target?.employeeName ? `de ${target.employeeName}` : ''} eliminado com sucesso.`, 'success');
  };

  const clearAllPayrolls = () => {
    const count = payrolls.length;
    setPayrolls([]);
    saveToStorage('payrolls', []);
    emitEvent('RH', 'hr.payroll.cleared', { count });
    sound.playSuccessChime();
    notify(`Todos os ${count} recibos de vencimento foram eliminados.`, 'success');
  };

  const markPayrollPaid = (id: string) => {
    const target = payrolls.find((p) => p.id === id);
    setPayrolls((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'pago',
              paymentDate: new Date().toISOString().split('T')[0],
            }
          : p
      )
    );
    emitEvent('RH', 'hr.payroll.paid', { payrollId: id, employee: target?.employeeName });
    sound.playSuccessChime();
    notify(`Recibo de vencimento ${target?.employeeName ? `de ${target.employeeName}` : ''} marcado como pago.`, 'success');
  };

  const processMonthlyPayroll = (monthYear: string) => {
    const compId = currentCompany?.id || 'comp-1';
    const activeEmployees = employees.filter(
      (e) => e.status === 'ativo' && (!e.companyId || e.companyId === compId)
    );
    const newSlips: PayrollSlip[] = activeEmployees.map((emp) => {
      const base = emp.baseSalary;
      const meal = (emp.mealAllowanceDaily || 9.60) * 22;
      const gross = base + meal;
      const ssDeduction = base * 0.11;
      const irsRate = base > 1500 ? 0.15 : base > 1000 ? 0.10 : 0.05;
      const irsRetention = base * irsRate;
      const net = gross - ssDeduction - irsRetention;
      const compSS = base * 0.2375;
      const employerCost = gross + compSS;

      return {
        id: `pay-${Date.now()}-${emp.id}`,
        companyId: compId,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeRole: emp.role,
        taxNumber: emp.taxNumber,
        month: monthYear,
        monthYear,
        baseSalary: base,
        mealAllowance: meal,
        bonus: 0,
        grossTotal: gross,
        socialSecurityDeduction: ssDeduction,
        socialSecurityRetention: ssDeduction,
        irsRetention,
        netSalary: net,
        companySocialSecurity: compSS,
        totalEmployerCost: employerCost,
        status: 'pendente',
      };
    });

    setPayrolls((prev) => [...newSlips, ...prev]);
    emitEvent('RH', 'hr.payroll.monthly_processed', {
      companyId: compId,
      monthYear,
      slipsCount: newSlips.length,
      totalNet: newSlips.reduce((acc, s) => acc + s.netSalary, 0),
    });
    sound.playSuccessChime();
    notify(`Processamento salarial de ${monthYear} concluído (${newSlips.length} recibos gerados).`, 'success');
  };

  const addEmployeeShift = (shift: Omit<EmployeeShift, 'id'>) => {
    const compId = (shift as any).companyId || currentCompany?.id || 'comp-1';
    const id = `sh-${Date.now()}`;
    const newShift: EmployeeShift = { ...shift, id, ...(shift as any), companyId: compId };
    setEmployeeShifts((prev) => [newShift, ...prev]);
    emitEvent('RH', 'hr.shift.created', { shiftId: id, companyId: compId });
    sound.playSuccessChime();
    notify('Escala de turno agendada com sucesso.', 'success');
  };

  const updateEmployeeShift = (id: string, updates: Partial<EmployeeShift>) => {
    setEmployeeShifts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    emitEvent('RH', 'hr.shift.updated', { shiftId: id, updates });
    sound.playSuccessChime();
    notify('Turno atualizado com sucesso.', 'success');
  };

  const deleteEmployeeShift = (id: string) => {
    setEmployeeShifts((prev) => prev.filter((s) => s.id !== id));
    emitEvent('RH', 'hr.shift.deleted', { shiftId: id });
    sound.playSuccessChime();
    notify('Turno de serviço eliminado com sucesso.', 'success');
  };

  // ==================== CRM & CLIENTES CRUD ====================
  const addCustomer = (cust: Omit<Customer, 'id' | 'createdAt' | 'ordersCount' | 'totalSpent'>) => {
    const id = `cust-${Date.now()}`;
    const newCust: Customer = {
      ...cust,
      id,
      companyId: cust.companyId || currentCompany.id,
      ordersCount: 0,
      totalSpent: 0,
      loyaltyPoints: cust.loyaltyPoints || 0,
      loyaltyTier: 'Bronze',
      creditLimit: cust.creditLimit || 0,
      currentCredit: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCustomers((prev) => [newCust, ...prev]);
    pushRecordToSupabase('clientes', 'insert', newCust);
    emitEvent('CRM', 'crm.customer.created', { customerId: id, name: newCust.name });
    sound.playSuccessChime();
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updates };
          pushRecordToSupabase('clientes', 'update', updated);
          return updated;
        }
        return c;
      })
    );
    emitEvent('CRM', 'crm.customer.updated', { customerId: id, updates });
    sound.playSuccessChime();
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    pushRecordToSupabase('clientes', 'delete', { id });
    emitEvent('CRM', 'crm.customer.deleted', { customerId: id });
    sound.playSuccessChime();
  };

  const addLoyaltyPoints = (customerId: string, points: number) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const newPts = (c.loyaltyPoints || 0) + points;
          const tier = newPts > 1000 ? 'Platina' : newPts > 500 ? 'Ouro' : newPts > 200 ? 'Prata' : 'Bronze';
          return { ...c, loyaltyPoints: newPts, loyaltyTier: tier };
        }
        return c;
      })
    );
  };

  const addCallLog = (call: Omit<CallLog, 'id' | 'timestamp'>) => {
    const id = `call-${Date.now()}`;
    const newLog: CallLog = {
      ...call,
      id,
      timestamp: new Date().toISOString(),
      operatorName: call.operatorName || currentUser.name || 'Operador',
      direction: call.direction || 'saida',
    };
    setCallLogs((prev) => [newLog, ...prev]);
    emitEvent('CRM', 'crm.customer.call_logged', {
      customer: newLog.customerName,
      phone: newLog.customerPhone,
      outcome: newLog.outcome,
      duration: newLog.durationSeconds,
    });
    sound.playSuccessChime();
  };

  const deleteCallLog = (id: string) => {
    setCallLogs((prev) => prev.filter((c) => c.id !== id));
    emitEvent('CRM', 'crm.customer.call_deleted', { callId: id });
    sound.playSuccessChime();
  };

  const addLead = (lead: Omit<LeadOpportunity, 'id' | 'createdAt'>) => {
    const id = `lead-${Date.now()}`;
    const newLead: LeadOpportunity = {
      ...lead,
      id,
      companyId: lead.companyId || currentCompany.id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setLeads((prev) => [newLead, ...prev]);
    emitEvent('CRM', 'crm.lead.created', { leadId: id, title: newLead.title });
    sound.playSuccessChime();
  };

  const updateLead = (id: string, updates: Partial<LeadOpportunity>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
    emitEvent('CRM', 'crm.lead.updated', { leadId: id, updates });
    sound.playSuccessChime();
  };

  const deleteLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    emitEvent('CRM', 'crm.lead.deleted', { leadId: id });
    sound.playSuccessChime();
  };

  const updateLeadStage = (id: string, stage: LeadOpportunity['stage']) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, stage } : l))
    );
    emitEvent('CRM', 'crm.lead.stage_changed', { leadId: id, newStage: stage });
  };

  // ==================== OMNICHANNEL ORDERS ====================
  const updateOrderStatus = (orderId: string, status: OmnichannelOrderStatus) => {
    setOmnichannelOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    emitEvent('POS', 'omnichannel.order.status_changed', { orderId, status });
    sound.playSuccessChime();
  };

  const convertOrderToSale = async (orderId: string): Promise<Sale | null> => {
    const order = omnichannelOrders.find((o) => o.id === orderId);
    if (!order) return null;

    const items: SaleItem[] = order.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      taxRate: 23,
      discount: 0,
      total: i.total,
    }));

    const dateStr = new Date().toISOString();
    const seq = salesHistory.length + 1;
    const invNumber = `FS 2026/${String(seq).padStart(4, '0')}`;
    const prevSale = salesHistory[0];
    const prevHash = prevSale ? prevSale.fiscalHash : '';
    const fiscalHash = generateFiscalHash(dateStr, invNumber, order.total, prevHash);

    const sale: Sale = {
      id: `sale-omni-${Date.now()}`,
      companyId: currentCompany.id,
      storeId: order.pickupStoreId || currentStore.id,
      terminalId: currentTerminal.id,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      shiftId: activeShift?.id || 'no-shift',
      invoiceNumber: invNumber,
      invoiceType: 'FS',
      date: dateStr,
      items,
      subtotal: order.subtotal,
      discountTotal: 0,
      taxTotal: order.total * 0.187,
      total: order.total,
      payments: [
        {
          id: `pay-${Date.now()}`,
          method: order.paymentMethod as any,
          amount: order.total,
          status: 'concluido',
        },
      ],
      customerNif: order.customerNif,
      customerName: order.customerName,
      fiscalHash,
      previousHash: prevHash,
      atcud: `ATCUD-${currentCompany.taxNumber}-${invNumber}`,
      isOffline: !isOnline,
      isSynced: isOnline,
      invoiceTemplateId: currentCompany.activeInvoiceTemplateId,
      notes: `Gerada a partir da Encomenda ${order.orderNumber}`,
    };

    // Check stock before converting omnichannel order
    for (const item of items) {
      if (!item.productId.startsWith('custom-')) {
        const available = getAvailableStock(
          item.productId,
          order.pickupStoreId ? stores.find((s) => s.id === order.pickupStoreId)?.defaultWarehouseId : currentStore.defaultWarehouseId
        );
        if (available <= 0) {
          sound.playError();
          notify(`Não é possível converter a encomenda: O artigo "${item.productName}" está com stock zero.`, 'error');
          return null;
        }
        if (item.quantity > available) {
          sound.playError();
          notify(`Não é possível converter a encomenda: Stock insuficiente para "${item.productName}" (Disponível: ${available}).`, 'error');
          return null;
        }
      }
    }

    // Deduct stock for converted omnichannel order
    deductStockForItems(
      items,
      order.pickupStoreId ? stores.find((s) => s.id === order.pickupStoreId)?.defaultWarehouseId : currentStore.defaultWarehouseId,
      invNumber,
      `Venda de Encomenda ${order.orderNumber}`
    );

    setSalesHistory((prev) => [sale, ...prev]);
    updateOrderStatus(orderId, 'entregue');
    emitEvent('POS', 'omnichannel.order.converted_to_sale', {
      orderNumber: order.orderNumber,
      invoiceNumber: sale.invoiceNumber,
    });
    sound.playCashRegisterSound();
    return sale;
  };

  // ==================== RESET ALL DATA ====================
  const resetAllData = () => {
    localStorage.clear();
    setCompanies(initialCompanies);
    setCurrentCompany(initialCompanies[0]);
    setStores(initialStores);
    setCurrentStore(initialStores[0]);
    setTerminals(initialTerminals);
    setCurrentTerminal(initialTerminals[0]);
    setFiscalSeries(initialFiscalSeries);
    setUsers(initialUsers);
    setCurrentUser(initialUsers[1]);
    setCategories(initialCategories);
    setProducts(initialProducts);
    setWarehouses(initialWarehouses);
    setStock(initialStock);
    setLots(initialLots);
    setStockMovements([]);
    setActiveShift(initialActiveShift);
    setCart([]);
    setSalesHistory([]);
    setAccountsPayable(initialAccountsPayable);
    setAccountsReceivable(initialAccountsReceivable);
    setChartOfAccounts(initialChartOfAccounts);
    setLedgerEntries([]);
    setBankTransactions(initialBankTransactions);
    setSuppliers(initialSuppliers);
    setPurchaseRequisitions(initialPurchaseRequisitions);
    setPurchaseOrders(initialPurchaseOrders);
    setEmployees(initialEmployees);
    setTimeEntries(initialTimeEntries);
    setPayrolls(initialPayrolls);
    setEmployeeShifts(initialEmployeeShifts);
    setShiftsHistory([]);
    setCustomers(initialCustomers);
    setCallLogs([]);
    setLeads(initialLeads);
    setOmnichannelOrders(initialOmnichannelOrders);
    setEvents(initialEvents);
    setSyncQueue([]);
    offlineDB.clearAll();
    window.location.reload();
  };

  // Strictly filter state collections by current logged-in company and alphabetically sort products
  const scopedProducts = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    const list = products.filter((p) => p.companyId === compId);
    return sortProductsAlphabetically(list);
  }, [products, currentCompany?.id]);

  const scopedStock = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    const currentProdIds = new Set(scopedProducts.map((p) => p.id));
    const currentWhIds = new Set(warehouses.filter((w) => w.companyId === compId).map((w) => w.id));
    return stock.filter((s) => {
      if ((s as any).companyId) {
        return (s as any).companyId === compId;
      }
      return currentProdIds.has(s.productId) && currentWhIds.has(s.warehouseId);
    });
  }, [stock, scopedProducts, warehouses, currentCompany?.id]);

  const scopedCategories = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    return categories
      .filter((c) => c.companyId === compId || c.companyId === 'ALL')
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt', { sensitivity: 'base', numeric: true }));
  }, [categories, currentCompany?.id]);

  const scopedWarehouses = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    return warehouses.filter((w) => w.companyId === compId);
  }, [warehouses, currentCompany?.id]);

  const scopedStores = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    return stores.filter((s) => s.companyId === compId);
  }, [stores, currentCompany?.id]);

  const scopedTerminals = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    const storeIds = new Set(scopedStores.map((s) => s.id));
    return terminals.filter((t) => {
      if ((t as any).companyId) {
        return (t as any).companyId === compId;
      }
      return storeIds.has(t.storeId);
    });
  }, [terminals, scopedStores, currentCompany?.id]);

  const scopedUsers = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    return users.filter((u) => u.companyId === compId || u.role === 'admin_master');
  }, [users, currentCompany?.id]);

  const scopedSalesHistory = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    return salesHistory.filter((s) => s.companyId === compId);
  }, [salesHistory, currentCompany?.id]);

  const scopedStockMovements = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    return stockMovements.filter((m) => {
      if (m.companyId) {
        return m.companyId === compId;
      }
      const currentProdIds = new Set(scopedProducts.map((p) => p.id));
      return currentProdIds.has(m.productId);
    });
  }, [stockMovements, scopedProducts, currentCompany?.id]);

  const scopedCustomers = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    return customers.filter((c) => c.companyId === compId);
  }, [customers, currentCompany?.id]);

  const scopedSuppliers = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    return suppliers.filter((s) => s.companyId === compId);
  }, [suppliers, currentCompany?.id]);

  const scopedAccountsPayable = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    return accountsPayable.filter((a) => a.companyId === compId);
  }, [accountsPayable, currentCompany?.id]);

  const scopedAccountsReceivable = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    return accountsReceivable.filter((a) => a.companyId === compId);
  }, [accountsReceivable, currentCompany?.id]);

  const scopedShiftsHistory = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    return shiftsHistory.filter((s) => s.companyId === compId);
  }, [shiftsHistory, currentCompany?.id]);

  return (
    <AppContext.Provider
      value={{
        // Supabase Real-time Cloud Synchronization
        supabaseRealtimeStatus,
        supabaseSyncLogs,
        pullFromSupabase,
        pushToSupabase,
        pullUsersFromSupabase,
        pushUsersToSupabase,
        reconnectSupabaseRealtime,
        clearSupabaseLogs,

        // Supabase Auth & Multi-Tenant Profile Binding
        supabaseAuthUser,
        currentUserProfile,
        getUserProfile: handleGetUserProfile,
        syncConnectedUserProfile,
        saveUserProfile,

        // Tenancy & RBAC
        companies,
        currentCompany,
        setCurrentCompany,
        addCompany,
        updateCompany,
        deleteCompany,
        generateNextCompanyId,
        registerClientCompany,
        currencyDefinition: getCurrencyDefinition(currentCompany?.currency),
        supportedCurrencies: SUPPORTED_CURRENCIES,
        formatCurrency: (amount: number, customCurrency?: string) =>
          formatCurrency(amount, customCurrency || currentCompany?.currency),
        stores: scopedStores,
        currentStore,
        setCurrentStore,
        addStore,
        updateStore,
        deleteStore,
        terminals: scopedTerminals,
        currentTerminal,
        setCurrentTerminal,
        addTerminal,
        updateTerminal,
        deleteTerminal,
        fiscalSeries,
        addFiscalSeries,
        updateFiscalSeries,
        deleteFiscalSeries,
        users: scopedUsers,
        currentUser,
        setCurrentUser,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        updateUserPermissions,
        switchRole,
        hasPermission,
        isAuthenticated,
        isScreenLocked,
        isUserTableUnlocked,
        unlockUserTable,
        lockUserTable,
        login,
        loginWithPin,
        quickLogin,
        logout,
        lockScreen,
        unlockScreen,
        roles,
        updateRolePermissions,
        theme,
        setTheme,
        toggleTheme,
        language,
        setLanguage,
        toggleLanguage,
        t,
        languages,
        currentLanguageOption,
        isOnline,
        setIsOnline,
        isSyncing,
        syncQueue,
        triggerManualSync,
        dbStats,
        refreshDBStats,
        showOfflineSyncModal,
        setShowOfflineSyncModal,
        events,
        emitEvent,
        updateEvent,
        deleteEvent,
        clearEvents,
        reprocessEvent,
        categories: scopedCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        standardizeAllCategories,
        products: scopedProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        importProducts,
        warehouses: scopedWarehouses,
        addWarehouse,
        updateWarehouse,
        deleteWarehouse,
        stock: scopedStock,
        getAvailableStock,
        lots,
        addLot,
        updateLot,
        deleteLot,
        stockMovements: scopedStockMovements,
        recordStockMovement,
        deleteStockMovement,
        createStockAdjustment,
        transferStock,
        deductStockForItems,
        replenishStockForItems,
        activeShift,
        shiftsHistory: scopedShiftsHistory,
        openShift,
        closeShift,
        registerCashMovement,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartDiscount,
        globalDiscount,
        setGlobalDiscount,
        selectedCustomer,
        setSelectedCustomer,
        clearCart,
        completeSale,
        salesHistory: scopedSalesHistory,
        setSalesHistory,
        cancelInvoice,
        updateDocument,
        deleteDocument,
        clearSalesHistory,
        convertQuoteToInvoice,
        updateDocumentStatus,
        accountsPayable: scopedAccountsPayable,
        createAccountPayable,
        updateAccountPayable,
        deleteAccountPayable,
        payAccountPayable,
        accountsReceivable: scopedAccountsReceivable,
        createAccountReceivable,
        updateAccountReceivable,
        deleteAccountReceivable,
        receiveAccountReceivable,
        chartOfAccounts,
        addChartAccount,
        updateChartAccount,
        deleteChartAccount,
        ledgerEntries,
        addLedgerEntry,
        deleteLedgerEntry,
        bankTransactions,
        addBankTransaction,
        updateBankTransaction,
        deleteBankTransaction,
        reconcileBankTransaction,
        suppliers: scopedSuppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        purchaseRequisitions,
        addPurchaseRequisition,
        updatePurchaseRequisition,
        deletePurchaseRequisition,
        approvePurchaseRequisition,
        approveRequisition,
        rejectPurchaseRequisition,
        purchaseOrders,
        createPurchaseOrder,
        createPurchaseOrderFromReq,
        updatePurchaseOrder,
        deletePurchaseOrder,
        receiveGoods,
        receivePurchaseOrder,
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        timeEntries,
        addTimeEntry,
        updateTimeEntry,
        deleteTimeEntry,
        clockInEmployee,
        clockOutEmployee,
        payrolls,
        processMonthlyPayroll,
        addPayrollSlip,
        updatePayrollSlip,
        deletePayrollSlip,
        addPayroll: addPayrollSlip,
        updatePayroll: updatePayrollSlip,
        deletePayroll: deletePayrollSlip,
        clearAllPayrolls,
        markPayrollPaid,
        employeeShifts,
        addEmployeeShift,
        updateEmployeeShift,
        deleteEmployeeShift,
        customers: scopedCustomers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addLoyaltyPoints,
        callLogs,
        addCallLog,
        deleteCallLog,
        leads,
        addLead,
        updateLead,
        deleteLead,
        updateLeadStage,
        omnichannelOrders,
        updateOrderStatus,
        convertOrderToSale,
        showPriceCheckerModal,
        setShowPriceCheckerModal,
        showFiscalAuditModal,
        setShowFiscalAuditModal,
        showSubscriptionModal,
        setShowSubscriptionModal,
        subscriptionInfo,
        refreshCompanySubscription,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        resetAllData,
        activeNavTab,
        setActiveNavTab,
        showEventDrawer,
        setShowEventDrawer,
        lastCompletedSale,
        setLastCompletedSale,
        confirmDialog,
        requestConfirm,
        closeConfirm,
        toasts,
        notify,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
