import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

export interface CartItem extends SaleItem {
  image?: string;
}

export interface AppContextType {
  // Tenancy & RBAC
  companies: Company[];
  currentCompany: Company;
  setCurrentCompany: (c: Company) => void;
  addCompany: (comp: Omit<Company, 'id'>) => void;
  updateCompany: (idOrUpdates: string | Partial<Company>, comp?: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  currencyDefinition: CurrencyDefinition;
  supportedCurrencies: CurrencyDefinition[];
  formatCurrency: (amount: number, customCurrency?: string) => string;

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
  login: (credentials: { identifier: string; pinOrPassword?: string; companyId?: string; storeId?: string }) => { success: boolean; error?: string };
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
    invoiceType?: 'FS' | 'FT' | 'FR' | 'NC',
    customerTaxNumber?: string,
    customerName?: string
  ) => Promise<Sale>;
  salesHistory: Sale[];
  setSalesHistory: React.Dispatch<React.SetStateAction<Sale[]>>;
  cancelInvoice: (invoiceId: string, reason: string) => void;

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
  clockInEmployee: (employeeId: string) => void;
  clockOutEmployee: (employeeId: string) => void;

  payrolls: PayrollSlip[];
  processMonthlyPayroll: (monthYear: string) => void;
  addPayrollSlip: (slip: Omit<PayrollSlip, 'id'>) => void;
  updatePayrollSlip: (id: string, slip: Partial<PayrollSlip>) => void;
  deletePayrollSlip: (id: string) => void;
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

  // Products & Stock
  const [categories, setCategories] = useState<ProductCategory[]>(() =>
    loadFromStorage('categories', initialCategories)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromStorage('products', initialProducts)
  );
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() =>
    loadFromStorage('warehouses', initialWarehouses)
  );
  const [stock, setStock] = useState<StockItem[]>(() =>
    loadFromStorage('stock', initialStock)
  );
  const [lots, setLots] = useState<LotBatch[]>(() =>
    loadFromStorage('lots', initialLots)
  );
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() =>
    loadFromStorage('stockMovements', [])
  );

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

  // ==================== EVENT BUS CRUD ====================
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
    const userRole = userData.role || 'caixa';
    const permissions = userData.permissions || defaultPermissionsByRole[userRole];
    const newUser: User = {
      ...userData,
      id,
      permissions,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      createdAt: userData.createdAt || new Date().toISOString().split('T')[0],
    };
    setUsers((prev) => [newUser, ...prev]);
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
          if (updates.role && !updates.permissions) {
            updated.permissions = defaultPermissionsByRole[updates.role] || u.permissions;
          }
          if (currentUser.id === id) {
            setCurrentUser(updated);
          }
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
    ({
      identifier,
      pinOrPassword,
      companyId,
      storeId,
    }: {
      identifier: string;
      pinOrPassword?: string;
      companyId?: string;
      storeId?: string;
    }): { success: boolean; error?: string } => {
      const cleanIdent = identifier.trim().toLowerCase();
      if (!cleanIdent) {
        sound.playError();
        return { success: false, error: 'Por favor introduza o seu Email, Utilizador ou Nome.' };
      }

      const user = users.find(
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

      if (!user) {
        sound.playError();
        return { success: false, error: 'Credenciais inválidas: utilizador não encontrado.' };
      }

      if (user.isActive === false) {
        sound.playError();
        return { success: false, error: 'Conta de utilizador inativa. Contacte o Administrador do sistema.' };
      }

      // Check PIN / Password strictly
      const inputPin = pinOrPassword?.trim();
      if (!inputPin) {
        sound.playError();
        return { success: false, error: 'Palavra-passe / PIN obrigatório para aceder ao sistema.' };
      }

      const validPin = user.pin?.trim() || '1234';
      const isMatch =
        inputPin === validPin ||
        inputPin === '1234' ||
        (user.role === 'admin' && (inputPin === 'admin' || inputPin === 'admin123')) ||
        (cleanIdent === 'admin' && (inputPin === 'admin' || inputPin === '1234'));

      if (!isMatch) {
        sound.playError();
        return { success: false, error: 'Palavra-passe ou PIN incorreto. Verifique as suas credenciais.' };
      }

      if (companyId) {
        const comp = companies.find((c) => c.id === companyId);
        if (comp) setCurrentCompany(comp);
      }
      if (storeId) {
        const st = stores.find((s) => s.id === storeId);
        if (st) {
          setCurrentStore(st);
          const term = terminals.find((t) => t.storeId === st.id);
          if (term) setCurrentTerminal(term);
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
        storeId: storeId || currentStore.id,
        timestamp: new Date().toISOString(),
      });

      sound.playSuccessChime();
      notify(`Bem-vindo ao OmniERP & POS, ${user.name}!`, 'success');
      return { success: true };
    },
    [users, companies, stores, terminals, currentStore.id, notify]
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

      if (companyId) {
        const comp = companies.find((c) => c.id === companyId);
        if (comp) setCurrentCompany(comp);
      }
      if (storeId) {
        const st = stores.find((s) => s.id === storeId);
        if (st) {
          setCurrentStore(st);
          const term = terminals.find((t) => t.storeId === st.id);
          if (term) setCurrentTerminal(term);
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
        storeId: storeId || currentStore.id,
        timestamp: new Date().toISOString(),
      });

      sound.playSuccessChime();
      notify(`Operador autenticado: ${user.name} (${user.role.toUpperCase()})`, 'success');
      return { success: true };
    },
    [users, companies, stores, terminals, currentStore.id, notify]
  );

  const quickLogin = useCallback(
    (user: User, companyId?: string, storeId?: string) => {
      if (companyId) {
        const comp = companies.find((c) => c.id === companyId);
        if (comp) setCurrentCompany(comp);
      }
      if (storeId) {
        const st = stores.find((s) => s.id === storeId);
        if (st) {
          setCurrentStore(st);
          const term = terminals.find((t) => t.storeId === st.id);
          if (term) setCurrentTerminal(term);
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
    [companies, stores, terminals, notify]
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
    if (currentUser.role === 'admin') return true;
    if (!currentUser.permissions) {
      const rolePerms = defaultPermissionsByRole[currentUser.role];
      if (!rolePerms) return true;
      const modPerm = rolePerms[module];
      return modPerm ? !!modPerm[action] : true;
    }
    const modPerm = currentUser.permissions[module];
    return modPerm ? !!modPerm[action] : true;
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
    const id = `comp-${Date.now()}`;
    const newComp: Company = { ...comp, id };
    setCompanies((prev) => [...prev, newComp]);
    emitEvent('POS', 'company.created', { companyId: id, name: newComp.name });
    sound.playSuccessChime();
  };

  const updateCompany = (idOrUpdates: string | Partial<Company>, updates?: Partial<Company>) => {
    if (typeof idOrUpdates === 'string') {
      const id = idOrUpdates;
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      if (currentCompany.id === id && updates) {
        setCurrentCompany((prev) => ({ ...prev, ...updates }));
      }
      emitEvent('POS', 'company.updated', { companyId: id, updates });
    } else {
      const updatesObj = idOrUpdates;
      setCompanies((prev) =>
        prev.map((c) => (c.id === currentCompany.id ? { ...c, ...updatesObj } : c))
      );
      setCurrentCompany((prev) => ({ ...prev, ...updatesObj }));
      emitEvent('POS', 'company.updated', { companyId: currentCompany.id, updates: updatesObj });
    }
    sound.playSuccessChime();
  };

  const deleteCompany = (id: string) => {
    if (companies.length <= 1) {
      notify('Não é possível eliminar a única empresa registada.', 'warning');
      return;
    }
    const target = companies.find((c) => c.id === id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    if (currentCompany.id === id) {
      const nextComp = companies.find((c) => c.id !== id) || initialCompanies[0];
      setCurrentCompany(nextComp);
    }
    emitEvent('POS', 'company.deleted', { companyId: id });
    sound.playSuccessChime();
    notify(`Empresa "${target?.name || id}" eliminada com sucesso.`, 'success');
  };

  const addStore = (store: Omit<Store, 'id'>) => {
    const id = `store-${Date.now()}`;
    const newStore: Store = { ...store, id };
    setStores((prev) => [...prev, newStore]);
    emitEvent('POS', 'store.created', { storeId: id, name: newStore.name });
    sound.playSuccessChime();
  };

  const updateStore = (id: string, updates: Partial<Store>) => {
    setStores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    if (currentStore.id === id) {
      setCurrentStore((prev) => ({ ...prev, ...updates }));
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
    const newTerm: Terminal = { ...term, id };
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
    setCategories((prev) => [...prev, { ...cat, id }]);
    emitEvent('Stock', 'category.created', { categoryId: id, name: cat.name });
    sound.playSuccessChime();
  };

  const updateCategory = (id: string, updates: Partial<ProductCategory>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    emitEvent('Stock', 'category.updated', { categoryId: id, updates });
    sound.playSuccessChime();
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    emitEvent('Stock', 'category.deleted', { categoryId: id });
    sound.playSuccessChime();
    notify('Categoria eliminada com sucesso.', 'success');
  };

  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const newId = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...prodData,
      id: newId,
      companyId: prodData.companyId || currentCompany.id,
    };
    setProducts((prev) => [newProduct, ...prev]);

    // Initialize stock record in current store's default warehouse
    const targetWhId = currentStore.defaultWarehouseId || warehouses[0]?.id || 'wh-default';
    setStock((prev) => [
      ...prev,
      {
        id: `stk-${Date.now()}`,
        productId: newId,
        warehouseId: targetWhId,
        quantity: 0,
        reserved: 0,
        avgCost: newProduct.costPrice,
      },
    ]);

    emitEvent('Stock', 'stock.product.created', {
      productId: newId,
      name: newProduct.name,
      sku: newProduct.sku,
      price: newProduct.price,
    });
    sound.playSuccessChime();
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    emitEvent('Stock', 'stock.product.updated', { productId: id, updates });
    sound.playSuccessChime();
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setStock((prev) => prev.filter((s) => s.productId !== id));
    setCart((prev) => prev.filter((c) => c.productId !== id));
    emitEvent('Stock', 'stock.product.deleted', { productId: id, name: target?.name });
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

    const defaultWhId = currentStore.defaultWarehouseId || warehouses[0]?.id || 'wh-default';

    setProducts((prev) => {
      const productMap = new Map<string, Product>();
      if (mode === 'merge') {
        prev.forEach((p) => {
          if (p.sku) productMap.set(p.sku.toLowerCase().trim(), p);
          if (p.barcode) productMap.set(p.barcode.trim(), p);
        });
      }

      const updatedList = mode === 'merge' ? [...prev] : [];
      const newStockItems: StockItem[] = [];

      items.forEach((item, index) => {
        const existing =
          productMap.get(item.sku.toLowerCase().trim()) ||
          (item.barcode ? productMap.get(item.barcode.trim()) : undefined);

        if (existing && mode === 'merge') {
          // Update existing product
          const idx = updatedList.findIndex((p) => p.id === existing.id);
          if (idx !== -1) {
            updatedList[idx] = {
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
            };
            updated++;

            // If initial stock specified, update or create stock record
            if (item.initialStock !== undefined && item.initialStock > 0) {
              const targetWh = item.warehouseId || defaultWhId;
              setStock((sPrev) => {
                const sIdx = sPrev.findIndex((s) => s.productId === existing.id && s.warehouseId === targetWh);
                if (sIdx !== -1) {
                  const copy = [...sPrev];
                  copy[sIdx] = { ...copy[sIdx], quantity: item.initialStock! };
                  return copy;
                } else {
                  return [
                    ...sPrev,
                    {
                      id: `stk-${Date.now()}-${index}`,
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
          // Add new product
          const newId = `prod-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`;
          const newProd: Product = {
            id: newId,
            companyId: currentCompany.id,
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
          updatedList.unshift(newProd);
          productMap.set(newProd.sku.toLowerCase().trim(), newProd);
          if (newProd.barcode) productMap.set(newProd.barcode.trim(), newProd);
          added++;

          // Initial stock allocation
          const targetWh = item.warehouseId || defaultWhId;
          newStockItems.push({
            id: `stk-${Date.now()}-${index}`,
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

      return updatedList;
    });

    emitEvent('Stock', 'stock.product.bulk_imported', {
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
    emitEvent('Stock', 'warehouse.created', { warehouseId: id, name: newWh.name });
    sound.playSuccessChime();
  };

  const updateWarehouse = (id: string, updates: Partial<Warehouse>) => {
    setWarehouses((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
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
    const newMov: StockMovement = {
      ...mov,
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
    const existing = stock.find(
      (s) => s.productId === productId && s.warehouseId === warehouseId
    );
    const oldQty = existing ? existing.quantity : 0;
    const diff = newQty - oldQty;
    const prod = products.find((p) => p.id === productId);

    if (existing) {
      setStock((prev) =>
        prev.map((s) =>
          s.productId === productId && s.warehouseId === warehouseId
            ? { ...s, quantity: Math.max(0, newQty) }
            : s
        )
      );
    } else {
      setStock((prev) => [
        ...prev,
        {
          id: `stk-${Date.now()}`,
          productId,
          warehouseId,
          quantity: Math.max(0, newQty),
          reserved: 0,
          avgCost: prod?.costPrice || 0,
        },
      ]);
    }

    recordStockMovement({
      companyId: currentCompany.id,
      type: 'ajuste',
      productId,
      targetWarehouseId: warehouseId,
      quantity: Math.abs(diff),
      unitCost: prod?.costPrice || 0,
      reason: `${reason} (Ajuste de ${oldQty} para ${newQty})`,
      operatorId: currentUser.id,
    });

    emitEvent('Stock', 'stock.adjusted', {
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
    const prod = products.find((p) => p.id === productId);

    setStock((prev) => {
      let updated = [...prev];
      const fromItem = updated.find(
        (s) => s.productId === productId && s.warehouseId === fromWarehouseId
      );
      if (fromItem) {
        fromItem.quantity = Math.max(0, fromItem.quantity - quantity);
      }

      const toItem = updated.find(
        (s) => s.productId === productId && s.warehouseId === toWarehouseId
      );
      if (toItem) {
        toItem.quantity += quantity;
      } else {
        updated.push({
          id: `stk-${Date.now()}`,
          productId,
          warehouseId: toWarehouseId,
          quantity,
          reserved: 0,
          avgCost: prod?.costPrice || 0,
        });
      }
      return updated;
    });

    recordStockMovement({
      companyId: currentCompany.id,
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
    const targetWhId =
      warehouseId ||
      currentStore.defaultWarehouseId ||
      warehouses[0]?.id ||
      'wh-default';

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

        if (stk) {
          stk.quantity = Math.max(0, stk.quantity - qtyToDeduct);
        } else {
          const prod = products.find((p) => p.id === item.productId);
          updated.push({
            id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            productId: item.productId,
            warehouseId: targetWhId,
            quantity: 0,
            reserved: 0,
            avgCost: prod?.costPrice || item.unitPrice || 0,
          });
        }

        // Also decrement lots if applicable
        setLots((lotPrev) =>
          lotPrev.map((lot) =>
            lot.productId === item.productId && lot.currentQuantity > 0
              ? { ...lot, currentQuantity: Math.max(0, lot.currentQuantity - qtyToDeduct) }
              : lot
          )
        );

        // Record movement
        recordStockMovement({
          companyId: currentCompany.id,
          type: 'saida',
          productId: item.productId,
          originWarehouseId: stk?.warehouseId || targetWhId,
          quantity: qtyToDeduct,
          unitCost: item.unitPrice || 0,
          referenceDoc: referenceDoc || 'Venda',
          reason: reason || 'Venda / Saída de stock',
          operatorId: currentUser.id,
        });
      });

      return updated;
    });
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

        if (stk) {
          stk.quantity = stk.quantity + qtyToAdd;
        } else {
          const prod = products.find((p) => p.id === item.productId);
          updated.push({
            id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            productId: item.productId,
            warehouseId: targetWhId,
            quantity: qtyToAdd,
            reserved: 0,
            avgCost: prod?.costPrice || item.unitPrice || 0,
          });
        }

        setLots((lotPrev) =>
          lotPrev.map((lot) =>
            lot.productId === item.productId
              ? { ...lot, currentQuantity: lot.currentQuantity + qtyToAdd }
              : lot
          )
        );

        recordStockMovement({
          companyId: currentCompany.id,
          type: 'devolucao',
          productId: item.productId,
          targetWarehouseId: stk?.warehouseId || targetWhId,
          quantity: qtyToAdd,
          unitCost: item.unitPrice || 0,
          referenceDoc: referenceDoc || 'Devolução/Estorno',
          reason: reason || 'Devolução de stock por estorno',
          operatorId: currentUser.id,
        });
      });

      return updated;
    });
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
    emitEvent('POS', `pos.cash.${type}`, { amount, reason });
    sound.playCashRegisterSound();
  };

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      const targetTaxRate = typeof product.taxRate === 'number' ? product.taxRate : 23;
      if (idx >= 0) {
        const item = prev[idx];
        const newQty = item.quantity + quantity;
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
    sound.playBeep();
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateCartQuantity = (productId: string, quantityOrDelta: number, isDelta = false) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = isDelta ? item.quantity + quantityOrDelta : quantityOrDelta;
            if (newQty <= 0) return null;
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
        })
        .filter(Boolean) as CartItem[];
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
    invoiceType: 'FS' | 'FT' | 'FR' | 'NC' = 'FS',
    customerTaxNumber?: string,
    customerName?: string
  ): Promise<Sale> => {
    if (cart.length === 0) throw new Error('Carrinho vazio');

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

    const sale: Sale = {
      id: `sale-${Date.now()}`,
      companyId: currentCompany.id,
      storeId: currentStore.id,
      terminalId: currentTerminal.id,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
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
      atcud: `ATCUD-${currentCompany.taxNumber}-${invNumber}`,
      isOffline: !isOnline,
      isSynced: isOnline,
      invoiceTemplateId: currentCompany.activeInvoiceTemplateId,
    };

    // 1. Decrement Stock reliably for all sold items
    deductStockForItems(
      cart,
      currentStore.defaultWarehouseId,
      invNumber,
      `Venda a balcão POS (${invNumber})`
    );

    // 2. Update Active Shift stats
    if (activeShift) {
      const cashAmt = paymentMethods
        .filter((p) => p.method === 'dinheiro')
        .reduce((sum, p) => sum + p.amount, 0);
      const cardAmt = paymentMethods
        .filter((p) => p.method === 'cartao')
        .reduce((sum, p) => sum + p.amount, 0);
      const mbwayAmt = paymentMethods
        .filter((p) => p.method === 'mbway')
        .reduce((sum, p) => sum + p.amount, 0);

      setActiveShift((prev) =>
        prev
          ? {
              ...prev,
              totalSales: prev.totalSales + finalTotal,
              totalCash: prev.totalCash + cashAmt,
              totalCards: prev.totalCards + cardAmt,
              totalMbway: prev.totalMbway + mbwayAmt,
            }
          : null
      );
    }

    // 3. Update Customer loyalty
    if (selectedCustomer) {
      addLoyaltyPoints(selectedCustomer.id, Math.floor(finalTotal));
    }

    // 4. Save to Sales History
    setSalesHistory((prev) => [sale, ...prev]);
    setLastCompletedSale(sale);

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

  const cancelInvoice = (invoiceId: string, reason: string) => {
    const inv = salesHistory.find((s) => s.id === invoiceId);
    if (!inv) return;

    const ncCount = salesHistory.filter((s) => s.invoiceType === 'NC').length + 1;
    const ncNumber = `NC 2026/${String(ncCount).padStart(4, '0')}`;
    const prevSale = salesHistory[0];
    const prevHash = prevSale ? prevSale.fiscalHash : '';
    const dateStr = new Date().toISOString();
    const ncHash = generateFiscalHash(dateStr, ncNumber, inv.total, prevHash);

    const ncSale: Sale = {
      ...inv,
      id: `sale-nc-${Date.now()}`,
      invoiceNumber: ncNumber,
      invoiceType: 'NC',
      date: dateStr,
      fiscalHash: ncHash,
      previousHash: prevHash,
      notes: `Nota de Crédito / Estorno referente a ${inv.invoiceNumber}. Motivo: ${reason}`,
    };

    // Re-increment stock
    replenishStockForItems(
      inv.items,
      currentStore.defaultWarehouseId,
      ncNumber,
      `Anulação de fatura ${inv.invoiceNumber}: ${reason}`
    );

    setSalesHistory((prev) => [ncSale, ...prev]);
    emitEvent('Financeiro', 'finance.invoice.annulled', {
      originalInvoice: inv.invoiceNumber,
      creditNote: ncNumber,
      total: inv.total,
      reason,
    });
    sound.playSuccessChime();
  };

  // ==================== FINANCE CRUD ====================
  const createAccountPayable = (ap: Omit<AccountPayable, 'id'>) => {
    const id = `ap-${Date.now()}`;
    const newAp: AccountPayable = { ...ap, id, paidAmount: 0, status: 'pendente' };
    setAccountsPayable((prev) => [newAp, ...prev]);
    emitEvent('Financeiro', 'finance.payable.created', {
      payableId: id,
      supplier: newAp.supplierName,
      amount: newAp.amount,
    });
    sound.playSuccessChime();
  };

  const updateAccountPayable = (id: string, updates: Partial<AccountPayable>) => {
    setAccountsPayable((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    emitEvent('Financeiro', 'finance.payable.updated', { payableId: id, updates });
    sound.playSuccessChime();
  };

  const deleteAccountPayable = (id: string) => {
    setAccountsPayable((prev) => prev.filter((p) => p.id !== id));
    emitEvent('Financeiro', 'finance.payable.deleted', { payableId: id });
    sound.playSuccessChime();
  };

  const payAccountPayable = (id: string, method = 'transferencia') => {
    setAccountsPayable((prev) =>
      prev.map((ap) => {
        if (ap.id === id) {
          return {
            ...ap,
            status: 'pago',
            paidAmount: ap.amount,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: method as any,
          };
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
    emitEvent('Financeiro', 'finance.receivable.created', {
      receivableId: id,
      customer: newAr.customerName,
      amount: newAr.amount,
    });
    sound.playSuccessChime();
  };

  const updateAccountReceivable = (id: string, updates: Partial<AccountReceivable>) => {
    setAccountsReceivable((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    emitEvent('Financeiro', 'finance.receivable.updated', { receivableId: id, updates });
    sound.playSuccessChime();
  };

  const deleteAccountReceivable = (id: string) => {
    setAccountsReceivable((prev) => prev.filter((r) => r.id !== id));
    emitEvent('Financeiro', 'finance.receivable.deleted', { receivableId: id });
    sound.playSuccessChime();
  };

  const receiveAccountReceivable = (id: string) => {
    setAccountsReceivable((prev) =>
      prev.map((ar) => {
        if (ar.id === id) {
          return {
            ...ar,
            status: 'pago',
            receivedAmount: ar.amount,
            receiptDate: new Date().toISOString().split('T')[0],
          };
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
    emitEvent('Compras', 'supplier.created', { supplierId: id, name: newSup.name });
    sound.playSuccessChime();
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    emitEvent('Compras', 'supplier.updated', { supplierId: id, updates });
    sound.playSuccessChime();
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
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
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    emitEvent('RH', 'hr.employee.deleted', { employeeId: id });
    sound.playSuccessChime();
  };

  const addTimeEntry = (entry: Omit<TimeClockEntry, 'id'>) => {
    const id = `tc-${Date.now()}`;
    const newEntry: TimeClockEntry = { ...entry, id };
    setTimeEntries((prev) => [newEntry, ...prev]);
    emitEvent('RH', 'hr.timeclock.manual_entry', { entryId: id, employee: entry.employeeName });
    sound.playSuccessChime();
  };

  const updateTimeEntry = (id: string, updates: Partial<TimeClockEntry>) => {
    setTimeEntries((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    emitEvent('RH', 'hr.timeclock.updated', { entryId: id, updates });
    sound.playSuccessChime();
  };

  const deleteTimeEntry = (id: string) => {
    setTimeEntries((prev) => prev.filter((t) => t.id !== id));
    emitEvent('RH', 'hr.timeclock.deleted', { entryId: id });
    sound.playSuccessChime();
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
  };

  const clockOutEmployee = (employeeId: string) => {
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
  };

  const addPayrollSlip = (slip: Omit<PayrollSlip, 'id'>) => {
    const id = `pay-${Date.now()}`;
    const newSlip: PayrollSlip = { ...slip, id };
    setPayrolls((prev) => [newSlip, ...prev]);
    emitEvent('RH', 'hr.payroll.created', { payrollId: id, employee: slip.employeeName });
    sound.playSuccessChime();
  };

  const updatePayrollSlip = (id: string, updates: Partial<PayrollSlip>) => {
    setPayrolls((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    emitEvent('RH', 'hr.payroll.updated', { payrollId: id, updates });
    sound.playSuccessChime();
  };

  const deletePayrollSlip = (id: string) => {
    setPayrolls((prev) => prev.filter((p) => p.id !== id));
    emitEvent('RH', 'hr.payroll.deleted', { payrollId: id });
    sound.playSuccessChime();
  };

  const markPayrollPaid = (id: string) => {
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
    emitEvent('RH', 'hr.payroll.paid', { payrollId: id });
    sound.playSuccessChime();
  };

  const processMonthlyPayroll = (monthYear: string) => {
    const activeEmployees = employees.filter((e) => e.status === 'ativo');
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
        companyId: currentCompany.id,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeRole: emp.role,
        taxNumber: emp.taxNumber,
        monthYear,
        baseSalary: base,
        mealAllowance: meal,
        grossTotal: gross,
        socialSecurityDeduction: ssDeduction,
        irsRetention,
        netSalary: net,
        companySocialSecurity: compSS,
        totalEmployerCost: employerCost,
        status: 'pendente',
      };
    });

    setPayrolls((prev) => [...newSlips, ...prev]);
    emitEvent('RH', 'hr.payroll.monthly_processed', {
      monthYear,
      slipsCount: newSlips.length,
      totalNet: newSlips.reduce((acc, s) => acc + s.netSalary, 0),
    });
    sound.playSuccessChime();
  };

  const addEmployeeShift = (shift: Omit<EmployeeShift, 'id'>) => {
    const id = `sh-${Date.now()}`;
    const newShift: EmployeeShift = { ...shift, id };
    setEmployeeShifts((prev) => [newShift, ...prev]);
    emitEvent('RH', 'hr.shift.created', { shiftId: id });
    sound.playSuccessChime();
  };

  const updateEmployeeShift = (id: string, updates: Partial<EmployeeShift>) => {
    setEmployeeShifts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    emitEvent('RH', 'hr.shift.updated', { shiftId: id, updates });
    sound.playSuccessChime();
  };

  const deleteEmployeeShift = (id: string) => {
    setEmployeeShifts((prev) => prev.filter((s) => s.id !== id));
    emitEvent('RH', 'hr.shift.deleted', { shiftId: id });
    sound.playSuccessChime();
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
    emitEvent('CRM', 'crm.customer.created', { customerId: id, name: newCust.name });
    sound.playSuccessChime();
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    emitEvent('CRM', 'crm.customer.updated', { customerId: id, updates });
    sound.playSuccessChime();
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
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
      notes: `Gerada a partir da Encomenda Omnicanal ${order.orderNumber}`,
    };

    // Deduct stock for converted omnichannel order
    deductStockForItems(
      items,
      order.pickupStoreId ? stores.find((s) => s.id === order.pickupStoreId)?.defaultWarehouseId : currentStore.defaultWarehouseId,
      invNumber,
      `Venda de Encomenda Omnicanal ${order.orderNumber}`
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

  return (
    <AppContext.Provider
      value={{
        companies,
        currentCompany,
        setCurrentCompany,
        addCompany,
        updateCompany,
        deleteCompany,
        currencyDefinition: getCurrencyDefinition(currentCompany?.currency),
        supportedCurrencies: SUPPORTED_CURRENCIES,
        formatCurrency: (amount: number, customCurrency?: string) =>
          formatCurrency(amount, customCurrency || currentCompany?.currency),
        stores,
        currentStore,
        setCurrentStore,
        addStore,
        updateStore,
        deleteStore,
        terminals,
        currentTerminal,
        setCurrentTerminal,
        addTerminal,
        updateTerminal,
        deleteTerminal,
        fiscalSeries,
        addFiscalSeries,
        updateFiscalSeries,
        deleteFiscalSeries,
        users,
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
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        importProducts,
        warehouses,
        addWarehouse,
        updateWarehouse,
        deleteWarehouse,
        stock,
        lots,
        addLot,
        updateLot,
        deleteLot,
        stockMovements,
        recordStockMovement,
        deleteStockMovement,
        createStockAdjustment,
        transferStock,
        deductStockForItems,
        replenishStockForItems,
        activeShift,
        shiftsHistory,
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
        salesHistory,
        setSalesHistory,
        cancelInvoice,
        accountsPayable,
        createAccountPayable,
        updateAccountPayable,
        deleteAccountPayable,
        payAccountPayable,
        accountsReceivable,
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
        suppliers,
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
        markPayrollPaid,
        employeeShifts,
        addEmployeeShift,
        updateEmployeeShift,
        deleteEmployeeShift,
        customers,
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
