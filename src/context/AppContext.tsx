import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  ShiftType,
  VatMode,
  VatRate,
  StockTransfer,
  StockTransferItem,
  StockTransferStatus,
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
  initialShiftTypes,
} from '../mockData';
import {
  generateFiscalHash,
  formatCurrency,
  getCurrencyDefinition,
  setActiveAppCurrency,
  setActiveAppCompany,
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
  SalesGoalRecord,
  closeAllOpenShiftsInSupabase,
  fetchLatestShiftFromSupabase,
  flushPendingSyncQueue,
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
import { getTodayDateStr } from '../utils/dateUtils';
import { isEffectiveSale, calculateShiftSalesTotals } from '../utils/documentUtils';

export interface CartItem extends SaleItem {
  image?: string;
}

export function computeCartItemTotals(
  unitPrice: number,
  quantity: number,
  discountPercent: number,
  taxRate: number,
  vatMode: VatMode = 'acrescido'
): { discountAmount: number; taxAmount: number; total: number } {
  const gross = Number(quantity || 0) * Number(unitPrice || 0);
  const discountPct = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  const discountAmount = Number(((gross * discountPct) / 100).toFixed(2));
  const netBase = Math.max(0, gross - discountAmount);
  const rate = Math.max(0, Number(taxRate) || 0);

  if (vatMode === 'acrescido') {
    // Preço é o valor líquido s/ IVA. O IVA SOMA ao total da fatura!
    const taxAmount = Number(((netBase * rate) / 100).toFixed(2));
    const total = Number((netBase + taxAmount).toFixed(2));
    return { discountAmount, taxAmount, total };
  } else if (vatMode === 'isento') {
    return { discountAmount, taxAmount: 0, total: Number(netBase.toFixed(2)) };
  } else {
    // 'incluido': Preço tem IVA incluído (PVP)
    const total = Number(netBase.toFixed(2));
    const base = rate > 0 ? total / (1 + rate / 100) : total;
    const taxAmount = Number((total - base).toFixed(2));
    return { discountAmount, taxAmount, total };
  }
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
  addProduct: (product: Omit<Product, 'id'>) => boolean;
  updateProduct: (id: string, product: Partial<Product>) => boolean;
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
    mode?: 'merge' | 'replace' | 'skip_existing'
  ) => { added: number; updated: number };

  warehouses: Warehouse[];
  addWarehouse: (wh: Omit<Warehouse, 'id'>) => void;
  updateWarehouse: (id: string, wh: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;

  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<any[]>>;
  getAvailableStock: (productId: string, warehouseId?: string) => number;
  lots: LotBatch[];
  addLot: (lot: Omit<LotBatch, 'id'>) => void;
  updateLot: (id: string, lot: Partial<LotBatch>) => void;
  deleteLot: (id: string) => void;

  stockMovements: StockMovement[];
  recordStockMovement: (
    mov: Omit<StockMovement, 'id' | 'timestamp'> & {
      id?: string;
      timestamp?: string;
      date?: string;
      createdAt?: string;
      movementNumber?: string;
    }
  ) => void;
  deleteStockMovement: (id: string) => void;
  createStockAdjustment: (productId: string, warehouseId: string, newQty: number, reason: string) => void;
  transferStock: (productId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number) => void;
  stockTransfers: StockTransfer[];
  requestStockTransfer: (
    originWarehouseId: string,
    destinationWarehouseId: string,
    items: Array<{ productId: string; quantity: number }>,
    notes?: string
  ) => Promise<StockTransfer>;
  approveStockTransfer: (
    transferId: string,
    approvedItems?: Array<{ productId: string; quantity: number }>,
    notes?: string
  ) => Promise<{ success: boolean; verificationCode?: string; error?: string }>;
  confirmStockTransfer: (
    transferId: string,
    code: string
  ) => Promise<{ success: boolean; error?: string; remainingAttempts?: number }>;
  rejectStockTransfer: (transferId: string, reason?: string) => Promise<void>;
  cancelStockTransfer: (transferId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  deductStockForItems: (
    items: Array<{ productId: string; quantity: number; unitPrice?: number }>,
    warehouseId?: string,
    referenceDoc?: string,
    reason?: string,
    customTimestamp?: string
  ) => void;
  replenishStockForItems: (
    items: Array<{ productId: string; quantity: number; unitPrice?: number }>,
    warehouseId?: string,
    referenceDoc?: string,
    reason?: string,
    customTimestamp?: string
  ) => void;

  // POS & Turnos
  shiftTypes: ShiftType[];
  defaultShiftType: ShiftType;
  addShiftType: (type: Omit<ShiftType, 'id'>) => void;
  updateShiftType: (id: string, updates: Partial<ShiftType>) => void;
  deleteShiftType: (id: string) => void;
  setDefaultShiftType: (id: string) => void;
  activeShift: CashShift | null;
  shiftsHistory: CashShift[];
  openShift: (initialCash: number, shiftTypeId?: string) => void;
  closeShift: (notesOrCounted?: string | number, notes?: string) => CashShift | null;
  registerCashMovement: (type: 'sangria' | 'suprimento', amount: number, reason: string) => void;
  syncActiveShiftWithTodaySales: () => void;
  reconcileActiveShift: (companyId?: string) => Promise<void>;
  cart: CartItem[];
  posVatMode: VatMode;
  setPosVatMode: (mode: VatMode) => void;
  posDefaultTaxRate: number;
  setPosDefaultTaxRate: (rate: number) => void;
  addToCart: (product: Product, quantity?: number, customTaxRate?: number, customVatMode?: VatMode) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantityOrDelta: number, isDelta?: boolean) => void;
  updateCartDiscount: (productId: string, discount: number) => void;
  updateCartTaxRate: (productId: string, taxRate: number) => void;
  updateCartItemVat: (productId: string, taxRate: number, vatMode?: VatMode) => void;
  applyVatRateToCart: (taxRate: number, vatMode?: VatMode) => void;
  globalDiscount: number;
  setGlobalDiscount: (d: number) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (c: Customer | null) => void;
  clearCart: () => void;
  completeSale: (
    paymentMethods: PaymentRecord[],
    invoiceType?: InvoiceType,
    customerTaxNumber?: string,
    customerName?: string,
    customerPhone?: string,
    customerAddress?: string,
    saleVatMode?: VatMode
  ) => Promise<Sale>;
  registerDocSaleInShift: (amount: number, paymentMethod?: string) => void;
  salesHistory: Sale[];
  setSalesHistory: React.Dispatch<React.SetStateAction<Sale[]>>;
  addFiscalDocument: (doc: Sale) => Promise<Sale>;
  cancelInvoice: (invoiceId: string, reason: string, restockStock?: boolean) => void;
  updateDocument: (id: string, updates: Partial<Sale>) => void;
  deleteDocument: (id: string, restockStock?: boolean) => void;
  clearSalesHistory: (idsOrScope?: string[] | 'all', restockStock?: boolean) => void;
  convertQuoteToInvoice: (quoteId: string, targetType?: InvoiceType, paymentMethod?: string) => Promise<Sale | null>;
  updateDocumentStatus: (id: string, status: 'emitido' | 'anulado' | 'pago' | 'pendente' | 'aprovado' | 'recusado' | 'convertido' | 'cancelado' | (string & {})) => void;

  // Finance
  accountsPayable: AccountPayable[];
  createAccountPayable: (ap: Omit<AccountPayable, 'id'>) => void;
  updateAccountPayable: (id: string, ap: Partial<AccountPayable>) => void;
  deleteAccountPayable: (id: string) => void;
  payAccountPayable: (id: string, methodOrAmount?: string | number, method?: string) => void;

  accountsReceivable: AccountReceivable[];
  createAccountReceivable: (ar: Omit<AccountReceivable, 'id'>) => void;
  updateAccountReceivable: (id: string, ar: Partial<AccountReceivable>) => void;
  deleteAccountReceivable: (id: string) => void;
  receiveAccountReceivable: (id: string, amount?: number) => void;

  chartOfAccounts: ChartOfAccounts[];
  addChartAccount: (acc: ChartOfAccounts) => void;
  updateChartAccount: (code: string, acc: Partial<ChartOfAccounts>) => void;
  deleteChartAccount: (code: string) => void;
  addAccount: (acc: ChartOfAccounts) => void;
  updateAccount: (codeOrId: string, acc: Partial<ChartOfAccounts>) => void;
  deleteAccount: (codeOrId: string) => void;

  ledgerEntries: LedgerEntry[];
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id'> | Omit<LedgerEntry, 'id' | 'entryNumber'> | any) => void;
  updateLedgerEntry: (id: string, entry: Partial<LedgerEntry>) => void;
  deleteLedgerEntry: (id: string) => void;
  generateSaftXml: (startDate?: string, endDate?: string) => string;

  bankTransactions: BankTransaction[];
  addBankTransaction: (tx: Omit<BankTransaction, 'id'>) => void;
  updateBankTransaction: (id: string, tx: Partial<BankTransaction>) => void;
  deleteBankTransaction: (id: string) => void;
  reconcileBankTransaction: (id: string, matchDoc?: string) => void;

  // Procurement
  suppliers: Supplier[];
  addSupplier: (sup: Omit<Supplier, 'id' | 'code'> & { code?: string; tradeName?: string; isActive?: boolean }) => void;
  updateSupplier: (id: string, sup: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  purchaseRequisitions: PurchaseRequisition[];
  addPurchaseRequisition: (req: Omit<PurchaseRequisition, 'id' | 'code' | 'date'>) => void;
  updatePurchaseRequisition: (id: string, req: Partial<PurchaseRequisition>) => void;
  deletePurchaseRequisition: (id: string) => void;
  approvePurchaseRequisition: (id: string) => void;
  approveRequisition: (id: string) => void;
  rejectPurchaseRequisition: (id: string, reason?: string) => void;
  rejectRequisition: (id: string, reason?: string) => void;

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
  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt' | 'ordersCount' | 'totalSpent'> & { id?: string }) => Customer;
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
    isDanger?: boolean;
    variant?: string;
    type?: string;
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
 * Remove duplicatas de um array mantendo apenas a primeira ocorrência pelo campo 'id'
 */
export function deduplicateById<T extends { id?: any }>(items: T[]): T[] {
  if (!Array.isArray(items)) return items;
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!item) continue;
    const strId = item.id !== undefined && item.id !== null ? String(item.id).trim() : '';
    if (strId) {
      if (seen.has(strId)) continue;
      seen.add(strId);
    }
    result.push(item);
  }
  return result;
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

  // Helper to ensure company address and slogan placeholders are kept clean/empty for the operator
  const sanitizeCompanyData = (comp: Company): Company => {
    if (!comp) return comp;
    const isOldDefaultAddress =
      comp.address === 'Av. 24 de Julho, Nº 1420' ||
      comp.address === 'Vila de Ribaue, Namiconha';
    const cleanedTemplates = (comp.invoiceTemplates || []).map((tmpl) => {
      if (tmpl.headerNotes === 'FOCO NO AGRO, GANHO NO CAMPO') {
        return { ...tmpl, headerNotes: '' };
      }
      return tmpl;
    });
    return {
      ...comp,
      address: isOldDefaultAddress ? '' : comp.address,
      invoiceTemplates: cleanedTemplates.length ? cleanedTemplates : comp.invoiceTemplates,
    };
  };

  // Multi-Tenancy & User
  const [companies, setCompanies] = useState<Company[]>(() => {
    const raw = deduplicateById(loadFromStorage('companies', initialCompanies));
    return raw.map(sanitizeCompanyData);
  });
  const [currentCompany, setCurrentCompany] = useState<Company>(() => {
    const rawComp = loadFromStorage('company', initialCompanies[0]);
    const comp = sanitizeCompanyData(rawComp);
    if (comp) {
      setActiveAppCompany(comp);
      setActiveAppCurrency(comp.currencySymbol || comp.currency);
    }
    return comp;
  });
  const currentCompanyRef = useRef<Company>(currentCompany);
  useEffect(() => {
    currentCompanyRef.current = currentCompany;
  }, [currentCompany]);

  const [stores, setStores] = useState<Store[]>(() =>
    deduplicateById(loadFromStorage('stores', initialStores))
  );
  const [currentStore, setCurrentStore] = useState<Store>(() => {
    const storedCompany = loadFromStorage<Company>('company', initialCompanies[0]);
    const storedStore = loadFromStorage<Store | null>('store', null);
    const allStoredStores = deduplicateById(loadFromStorage<Store[]>('stores', initialStores));
    if (storedStore && storedCompany && storedStore.companyId === storedCompany.id) {
      return storedStore;
    }
    if (storedCompany) {
      const match = allStoredStores.find((s) => s.companyId === storedCompany.id);
      if (match) return match;
    }
    return initialStores[0];
  });

  const [terminals, setTerminals] = useState<Terminal[]>(() =>
    deduplicateById(loadFromStorage('terminals', initialTerminals))
  );
  const [currentTerminal, setCurrentTerminal] = useState<Terminal>(() => {
    const storedStore = loadFromStorage<Store | null>('store', null);
    const storedTerm = loadFromStorage<Terminal | null>('terminal', null);
    const allStoredTerminals = deduplicateById(loadFromStorage<Terminal[]>('terminals', initialTerminals));
    if (storedStore && storedTerm && storedTerm.storeId === storedStore.id) {
      return storedTerm;
    }
    if (storedStore) {
      const match = allStoredTerminals.find((t) => t.storeId === storedStore.id);
      if (match) return match;
    }
    return initialTerminals[0];
  });

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
    const baseList = (Array.isArray(loaded) ? loaded : initialProducts).map((p: Product) => ({
      ...p,
      companyId: p.companyId || 'comp-1',
    }));
    return sortProductsAlphabetically(baseList);
  });
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    const loaded = loadFromStorage<Warehouse[]>('warehouses', initialWarehouses);
    return (Array.isArray(loaded) ? loaded : initialWarehouses).map((w: Warehouse) => ({
      ...w,
      companyId: w.companyId || 'comp-1',
    }));
  });
  const [stock, setStockState] = useState<StockItem[]>(() => {
    const loaded = loadFromStorage<StockItem[]>('stock', initialStock);
    return (Array.isArray(loaded) ? loaded : initialStock).map((s: StockItem) => ({
      ...s,
      companyId: s.companyId || 'comp-1',
    }));
  });

  const setStock: React.Dispatch<React.SetStateAction<any[]>> = useCallback((action) => {
    setStockState((prev) => {
      const next = typeof action === 'function' ? (action as any)(prev) : action;
      if (!Array.isArray(next)) return prev;
      const normalized: StockItem[] = next.map((item: any) => ({
        id: String(item.id || `stk-${item.product_id || item.productId}-${item.warehouse_id || item.warehouseId}`),
        companyId: item.company_id || item.companyId || 'comp-1',
        productId: item.product_id || item.productId,
        warehouseId: item.warehouse_id || item.warehouseId,
        quantity: Number(item.quantity) || 0,
        reserved: Number(item.reserved) || 0,
        avgCost: Number(item.avg_cost ?? item.avgCost ?? 0),
        minStock: item.min_stock ?? item.minStock,
        maxStock: item.max_stock ?? item.maxStock,
      }));
      saveToStorage('stock', normalized);
      return normalized;
    });
  }, []);
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

  const stockRef = useRef<StockItem[]>(stock);
  useEffect(() => {
    stockRef.current = stock;
  }, [stock]);

  const stockMovementsRef = useRef<StockMovement[]>(stockMovements);
  useEffect(() => {
    stockMovementsRef.current = stockMovements;
  }, [stockMovements]);

  // Transferências entre Lojas com Código de Aceitação
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>(() => {
    const loaded = loadFromStorage<StockTransfer[]>('stockTransfers', []);
    return Array.isArray(loaded) ? loaded : [];
  });
  const stockTransfersRef = useRef<StockTransfer[]>(stockTransfers);
  useEffect(() => {
    stockTransfersRef.current = stockTransfers;
  }, [stockTransfers]);

  // POS & Turnos
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>(() => {
    const stored = loadFromStorage<ShiftType[]>('shiftTypes', initialShiftTypes);
    return Array.isArray(stored) && stored.length > 0 ? stored : initialShiftTypes;
  });

  const defaultShiftType = useMemo(() => {
    return shiftTypes.find((st) => st.isDefault) || shiftTypes[0] || initialShiftTypes[0];
  }, [shiftTypes]);

  const [activeShift, setActiveShift] = useState<CashShift | null>(() => {
    const stored = loadFromStorage<CashShift | null>('activeShift', null);
    const initialComp = loadFromStorage<Company>('company', initialCompanies[0]);
    // Explicit rule: Upon first session or if closed in previous day, register must be CLOSED (null).
    // Only remains open if a user explicitly opened it and status is 'aberto' AND matches the active company.
    if (stored && stored.status === 'aberto' && typeof stored.initialCash === 'number') {
      if (stored.companyId && initialComp?.id && stored.companyId !== initialComp.id) {
        return null;
      }
      // Se o turno armazenado foi aberto num dia anterior ou tem mais de 18 horas, não manter aberto
      if (stored.openedAt) {
        const openedDate = new Date(stored.openedAt);
        const todayStr = new Date().toDateString();
        const diffHours = (Date.now() - openedDate.getTime()) / (1000 * 60 * 60);
        if (openedDate.toDateString() !== todayStr || diffHours > 18) {
          saveToStorage('activeShift', null);
          return null;
        }
      }
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
  const [posVatMode, setPosVatModeState] = useState<VatMode>(() => {
    return loadFromStorage<VatMode>('pos_vat_mode', currentCompany?.defaultVatMode || 'acrescido');
  });
  const [posDefaultTaxRate, setPosDefaultTaxRateState] = useState<number>(() => {
    const stored = loadFromStorage<number>('pos_default_tax_rate', null as any);
    if (typeof stored === 'number') return stored;
    return typeof currentCompany?.defaultTaxRate === 'number' ? currentCompany.defaultTaxRate : 16;
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [salesHistory, setSalesHistory] = useState<Sale[]>(() => {
    const stored = loadFromStorage<Sale[]>('salesHistory', initialSales);
    const rawSales = Array.isArray(stored) ? stored : initialSales;
    // Auto-heal any sales where payments recorded the cash tendered instead of invoice amount
    return rawSales.map((s) => {
      if (!Array.isArray(s.payments) || s.payments.length === 0) return s;
      let hasFixedPayment = false;
      const healedPayments = s.payments.map((p) => {
        if (s.total > 0 && Number(p.amount) > s.total && p.method === 'dinheiro') {
          hasFixedPayment = true;
          return {
            ...p,
            tenderedAmount: p.tenderedAmount || Number(p.amount),
            changeAmount: p.changeAmount !== undefined ? p.changeAmount : Number((Number(p.amount) - s.total).toFixed(2)),
            amount: s.total,
          };
        }
        return p;
      });
      if (hasFixedPayment) {
        return {
          ...s,
          changeAmount: s.changeAmount !== undefined ? s.changeAmount : Number((Number(s.payments[0].amount) - s.total).toFixed(2)),
          payments: healedPayments,
        };
      }
      return s;
    });
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
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const raw = loadFromStorage<Customer[]>('customers', initialCustomers);
    return Array.isArray(raw)
      ? raw.map((c) => ({
          ...c,
          taxNumber: c.taxNumber === '999999990' ? '' : (c.taxNumber || ''),
          email: c.email && (c.email.endsWith('@email.mz') || c.email.endsWith('@exemplo.mz')) ? '' : (c.email || ''),
          address: c.address === 'Balcão / Loja Principal' || c.address === 'Balcão / Loja' ? '' : (c.address || ''),
        }))
      : [];
  });
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
      isDanger?: boolean;
      variant?: string;
      type?: string;
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
        isDanger: options.isDanger,
        variant: options.variant,
        type: options.type,
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
        message: 'Ligação à internet restaurada. A sincronizar dados offline com o servidor...',
      });
      sound.playSuccessChime();
      // Immediately push offline-created records and flush pending queue
      flushPendingSyncQueue().catch(() => {});
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

  // Sync state to localStorage & currency engine
  useEffect(() => {
    if (currentCompany) {
      setActiveAppCompany(currentCompany);
      setActiveAppCurrency(currentCompany.currencySymbol || currentCompany.currency);
    }
  }, [
    currentCompany?.currency,
    currentCompany?.currencySymbol,
    currentCompany?.currencyPosition,
    currentCompany?.currencyDecimals,
  ]);

  // One-time startup purge of any duplicated IDs in localStorage/state
  useEffect(() => {
    setTerminals((prev) => {
      const clean = deduplicateById(prev);
      if (clean.length !== prev.length) {
        saveToStorage('terminals', clean);
        return clean;
      }
      return prev;
    });
    setStores((prev) => {
      const clean = deduplicateById(prev);
      if (clean.length !== prev.length) {
        saveToStorage('stores', clean);
        return clean;
      }
      return prev;
    });
    setCompanies((prev) => {
      const clean = deduplicateById(prev);
      if (clean.length !== prev.length) {
        saveToStorage('companies', clean);
        return clean;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    saveToStorage('companies', deduplicateById(companies));
    saveToStorage('company', currentCompany);
    saveToStorage('stores', deduplicateById(stores));
    saveToStorage('store', currentStore);
    saveToStorage('terminals', deduplicateById(terminals));
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

  // Auto-reconcile active shift with actual existing non-annulled sales
  // Guarantees that if any sale document is deleted or voided, the cash register never retains phantom amounts
  useEffect(() => {
    if (!activeShift || activeShift.status !== 'aberto') return;
    const computed = calculateShiftSalesTotals(activeShift, salesHistory);
    const hasDiscrepancy =
      Math.abs((activeShift.totalSales || 0) - computed.totalSales) > 0.009 ||
      Math.abs((activeShift.totalCash || 0) - computed.totalCash) > 0.009 ||
      Math.abs((activeShift.totalCards || 0) - computed.totalCards) > 0.009 ||
      Math.abs((activeShift.totalMbway || 0) - computed.totalMbway) > 0.009 ||
      Math.abs((activeShift.totalTransfers || 0) - computed.totalTransfers) > 0.009 ||
      Math.abs((activeShift.totalVouchers || 0) - computed.totalVouchers) > 0.009;

    if (hasDiscrepancy) {
      setActiveShift((prev) => {
        if (!prev || prev.status !== 'aberto') return prev;
        const reconciled: CashShift = {
          ...prev,
          totalSales: computed.totalSales,
          totalCash: computed.totalCash,
          totalCards: computed.totalCards,
          totalMbway: computed.totalMbway,
          totalTransfers: computed.totalTransfers,
          totalVouchers: computed.totalVouchers,
        };
        saveToStorage('activeShift', reconciled);
        pushRecordToSupabase('turnos_caixa', 'upsert', reconciled);
        return reconciled;
      });
    }
  }, [salesHistory, activeShift?.id, activeShift?.status, activeShift?.totalSales, activeShift?.totalCash]);

  // Reconciliação automática da data e hora exata dos movimentos de stock associados a vendas/faturas
  useEffect(() => {
    if (!salesHistory || salesHistory.length === 0 || !stockMovements || stockMovements.length === 0) return;

    const salesMap = new Map<string, Sale>();
    salesHistory.forEach((s) => {
      if (s.invoiceNumber) {
        salesMap.set(s.invoiceNumber.trim().toUpperCase(), s);
      }
    });

    let hasChanges = false;
    const reconciledMovements = stockMovements.map((mov) => {
      const ref = (mov.referenceDoc || '').trim().toUpperCase();
      const sale = ref ? salesMap.get(ref) : undefined;
      if (sale) {
        const exactSaleDate = sale.date || (sale as any).createdAt || (sale as any).timestamp;
        if (exactSaleDate && (mov.timestamp !== exactSaleDate || mov.date !== exactSaleDate)) {
          hasChanges = true;
          return {
            ...mov,
            timestamp: exactSaleDate,
            date: exactSaleDate,
            createdAt: mov.createdAt || exactSaleDate,
          };
        }
      }
      return mov;
    });

    if (hasChanges) {
      setStockMovements(reconciledMovements);
      stockMovementsRef.current = reconciledMovements;
      saveToStorage('stockMovements', reconciledMovements);
    }
  }, [salesHistory]);

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
            if (String(prev.id) === String(item.id)) {
              return { ...prev, ...item } as Company;
            }
            return prev;
          });
        }
      },
      onStoreChange: (event, item, rawOld) => {
        const storeItem = item as Store;
        const currentCompId = currentCompanyRef.current?.id;
        // Multi-tenant isolation: Ignore stores from other companies
        if (storeItem.companyId && currentCompId && storeItem.companyId !== currentCompId) {
          return;
        }

        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setStores((prev) => prev.filter((s) => String(s.id) !== String(idToDelete)));
            notify(`🗑️ Loja removida no Supabase (${rawOld?.name || idToDelete})`, 'info');
          }
        } else if (item.id) {
          setStores((prev) => {
            const exists = prev.some((s) => String(s.id) === String(storeItem.id));
            if (exists) {
              return prev.map((s) => (String(s.id) === String(storeItem.id) ? ({ ...s, ...storeItem } as Store) : s));
            }
            return [...prev, storeItem];
          });
          setCurrentStore((prev) => {
            if (String(prev.id) === String(storeItem.id)) {
              return { ...prev, ...storeItem };
            }
            return prev;
          });
        }
      },
      onProductChange: (event, item, rawOld) => {
        const prodItem = item as Product;
        const currentCompId = currentCompanyRef.current?.id;
        if (prodItem.companyId && currentCompId && prodItem.companyId !== currentCompId) {
          return;
        }
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
        const custItem = item as Customer;
        const currentCompId = currentCompanyRef.current?.id;
        if (custItem.companyId && currentCompId && custItem.companyId !== currentCompId) {
          return;
        }
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
        const suppItem = item as Supplier;
        const currentCompId = currentCompanyRef.current?.id;
        if (suppItem.companyId && currentCompId && suppItem.companyId !== currentCompId) {
          return;
        }
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
        const saleItem = item as Sale;
        const currentCompId = currentCompanyRef.current?.id;
        if (saleItem.companyId && currentCompId && saleItem.companyId !== currentCompId) {
          return;
        }
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
        const userItem = item as User;
        const currentCompId = currentCompanyRef.current?.id;
        if (userItem.companyId && currentCompId && userItem.companyId !== currentCompId) {
          return;
        }
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
        const whItem = item as Warehouse;
        const currentCompId = currentCompanyRef.current?.id;
        if (whItem.companyId && currentCompId && whItem.companyId !== currentCompId) {
          return;
        }
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
            setStock((prev) => {
              const updated = prev.filter((s) => String(s.id) !== String(idToDelete));
              stockRef.current = updated;
              saveToStorage('stock', updated);
              return updated;
            });
          }
        } else if (item.id) {
          setStock((prev) => {
            const exists = prev.some((s) => String(s.id) === String(item.id));
            let updated: StockItem[];
            if (exists) {
              updated = prev.map((s) => (String(s.id) === String(item.id) ? ({ ...s, ...item } as StockItem) : s));
            } else {
              updated = [...prev, item as StockItem];
            }
            stockRef.current = updated;
            saveToStorage('stock', updated);
            return updated;
          });
        }
      },
      onAccountPayableChange: (event, item, rawOld) => {
        const apItem = item as AccountPayable;
        const currentCompId = currentCompanyRef.current?.id;
        if (apItem.companyId && currentCompId && apItem.companyId !== currentCompId) {
          return;
        }
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
        const arItem = item as AccountReceivable;
        const currentCompId = currentCompanyRef.current?.id;
        if (arItem.companyId && currentCompId && arItem.companyId !== currentCompId) {
          return;
        }
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
        const shiftItem = item as CashShift;
        const currentCompId = currentCompanyRef.current?.id;

        // MULTI-TENANT ISOLATION:
        // Strictly ignore shifts belonging to other companies (e.g. operators like Efigenia from another company)
        if (shiftItem.companyId && currentCompId && shiftItem.companyId !== currentCompId) {
          return;
        }

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
          setShiftsHistory((prev) => {
            const exists = prev.some((s) => String(s.id) === String(shiftItem.id));
            if (exists) {
              return prev.map((s) => (String(s.id) === String(shiftItem.id) ? shiftItem : s));
            }
            return [shiftItem, ...prev];
          });

          // Multi-device sync for active cash register in THIS company
          if (shiftItem.status === 'aberto') {
            setActiveShift((curr) => {
              if (shiftItem.companyId && currentCompId && shiftItem.companyId !== currentCompId) {
                return curr;
              }
              if (!curr || String(curr.id) === String(shiftItem.id) || new Date(shiftItem.openedAt) > new Date(curr.openedAt)) {
                saveToStorage('activeShift', shiftItem);
                return shiftItem;
              }
              return curr;
            });
          } else if (shiftItem.status === 'fechado') {
            setActiveShift((curr) => {
              // Se o turno recebido for fechado e pertencer a esta empresa:
              // Se tiver o mesmo ID, ou se o turno atual pertencer a esta mesma empresa, fechar o caixa imediatamente.
              if (
                !curr ||
                String(curr.id) === String(shiftItem.id) ||
                !curr.companyId ||
                curr.companyId === shiftItem.companyId
              ) {
                saveToStorage('activeShift', null);
                return null;
              }
              return curr;
            });
          }
        }
      },
      onEmployeeChange: (event, item, rawOld) => {
        const empItem = item as Employee;
        const currentCompId = currentCompanyRef.current?.id;
        if (empItem.companyId && currentCompId && empItem.companyId !== currentCompId) {
          return;
        }
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setEmployees((prev) => prev.filter((e) => String(e.id) !== String(idToDelete)));
          }
        } else if (item.id) {
          setEmployees((prev) => {
            const exists = prev.some((e) => String(e.id) === String(empItem.id));
            if (exists) {
              return prev.map((e) => (String(e.id) === String(empItem.id) ? { ...e, ...empItem } : e));
            }
            return [empItem, ...prev];
          });
        }
      },
      onTimeEntryChange: (event, item, rawOld) => {
        const timeItem = item as TimeClockEntry;
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setTimeEntries((prev) => prev.filter((t) => String(t.id) !== String(idToDelete)));
          }
        } else if (item.id) {
          setTimeEntries((prev) => {
            const exists = prev.some((t) => String(t.id) === String(timeItem.id));
            if (exists) {
              return prev.map((t) => (String(t.id) === String(timeItem.id) ? { ...t, ...timeItem } : t));
            }
            return [timeItem, ...prev];
          });
        }
      },
      onPayrollChange: (event, item, rawOld) => {
        const payItem = item as PayrollSlip;
        const currentCompId = currentCompanyRef.current?.id;
        if (payItem.companyId && currentCompId && payItem.companyId !== currentCompId) {
          return;
        }
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setPayrolls((prev) => prev.filter((p) => String(p.id) !== String(idToDelete)));
          }
        } else if (item.id) {
          setPayrolls((prev) => {
            const exists = prev.some((p) => String(p.id) === String(payItem.id));
            if (exists) {
              return prev.map((p) => (String(p.id) === String(payItem.id) ? { ...p, ...payItem } : p));
            }
            return [payItem, ...prev];
          });
        }
      },
      onEmployeeShiftChange: (event, item, rawOld) => {
        const shiftItem = item as EmployeeShift;
        const currentCompId = currentCompanyRef.current?.id;
        if (shiftItem.companyId && currentCompId && shiftItem.companyId !== currentCompId) {
          return;
        }
        if (event === 'DELETE') {
          const idToDelete = item.id || rawOld?.id;
          if (idToDelete) {
            setEmployeeShifts((prev) => prev.filter((s) => String(s.id) !== String(idToDelete)));
          }
        } else if (item.id) {
          setEmployeeShifts((prev) => {
            const exists = prev.some((s) => String(s.id) === String(shiftItem.id));
            if (exists) {
              return prev.map((s) => (String(s.id) === String(shiftItem.id) ? { ...s, ...shiftItem } : s));
            }
            return [shiftItem, ...prev];
          });
        }
      },
      onSalesGoalChange: (event, item, rawOld) => {
        const goalItem = item as SalesGoalRecord;
        const currentCompId = currentCompanyRef.current?.id;
        if (goalItem.companyId && currentCompId && goalItem.companyId !== currentCompId) {
          return;
        }
        const ano = goalItem.anoReferencia || goalItem.ano_referencia;
        if (event === 'DELETE') {
          if (ano) {
            localStorage.removeItem(`agro_sales_goals_v2_${ano}`);
            window.dispatchEvent(new CustomEvent('agro_sales_goals_updated', { detail: { anoReferencia: ano, deleted: true } }));
          }
        } else if (item.id) {
          if (ano) {
            const dados = {
              anoReferencia: ano,
              metaAnualTotal: goalItem.metaAnualTotal || goalItem.meta_anual_total,
              estrategia: goalItem.estrategia || 'MANUAL',
              metasMensais: goalItem.metasMensais || goalItem.metas_mensais || [],
              valoresManuais: goalItem.valoresManuais || goalItem.valores_manuais || [],
              historicoValores: goalItem.historicoValores || goalItem.historico_valores || [],
              vendasRealizadas: goalItem.vendasRealizadas || goalItem.vendas_realizadas || [],
              savedAt: goalItem.savedAt || goalItem.saved_at || new Date().toISOString(),
              source: goalItem.source || 'Sincronizado Supabase',
              isManuallyEdited: goalItem.isManuallyEdited ?? goalItem.is_manually_edited ?? true,
            };
            localStorage.setItem(`agro_sales_goals_v2_${ano}`, JSON.stringify(dados));
            window.dispatchEvent(new CustomEvent('agro_sales_goals_updated', { detail: { anoReferencia: ano, goal: dados } }));
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
        const compId = currentCompanyRef.current?.id || currentCompany?.id;
        if (!compId) return;
        const res = await pullAllFromSupabase({ companyId: compId });
        if (res.data) {
          if (res.data.companies && res.data.companies.length > 0) {
            setCompanies((prev) => {
              const updated = [...prev];
              res.data.companies!.forEach((c) => {
                const idx = updated.findIndex((item) => item.id === c.id);
                if (idx >= 0) updated[idx] = c;
                else updated.push(c);
              });
              return updated;
            });
          }
          if (res.data.stores && res.data.stores.length > 0) {
            const compStores = res.data.stores.filter((s) => s.companyId === compId);
            if (compStores.length > 0) {
              setStores((prev) => {
                const other = prev.filter((s) => s.companyId !== compId);
                return [...compStores, ...other];
              });
              setCurrentStore((prev) => {
                if (prev.companyId === compId) {
                  const matched = compStores.find((s) => s.id === prev.id);
                  return matched || prev;
                }
                return compStores[0] || prev;
              });
            }
          }
          if (res.data.products && res.data.products.length > 0) {
            const compProds = res.data.products.filter((p) => p.companyId === compId);
            setProducts((prev) => {
              const updated = [...prev];
              compProds.forEach((remoteProd) => {
                const idx = updated.findIndex((item) => String(item.id) === String(remoteProd.id));
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], ...remoteProd };
                } else {
                  updated.unshift(remoteProd);
                }
              });
              return updated;
            });
          }
          if (res.data.customers && res.data.customers.length > 0) {
            const compCust = res.data.customers.filter((c) => c.companyId === compId);
            setCustomers((prev) => {
              const updated = [...prev];
              compCust.forEach((remoteCust) => {
                const idx = updated.findIndex((item) => String(item.id) === String(remoteCust.id));
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], ...remoteCust };
                } else {
                  updated.unshift(remoteCust);
                }
              });
              return updated;
            });
          }
          if (res.data.suppliers && res.data.suppliers.length > 0) {
            const compSupp = res.data.suppliers.filter((s) => s.companyId === compId);
            setSuppliers((prev) => {
              const updated = [...prev];
              compSupp.forEach((remoteSupp) => {
                const idx = updated.findIndex((item) => String(item.id) === String(remoteSupp.id));
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], ...remoteSupp };
                } else {
                  updated.unshift(remoteSupp);
                }
              });
              return updated;
            });
          }
          if (res.data.categories && res.data.categories.length > 0) {
            setCategories(res.data.categories);
          }
          if (res.data.sales && res.data.sales.length > 0) {
            const compSales = res.data.sales.filter((s) => s.companyId === compId);
            setSalesHistory((prev) => [...compSales, ...prev.filter((s) => s.companyId !== compId)]);
          }
          if (res.data.users && res.data.users.length > 0) {
            const compUsers = res.data.users.filter((u) => u.companyId === compId);
            setUsers((prev) => [...compUsers, ...prev.filter((u) => u.companyId !== compId)]);
          }
          if (res.data.warehouses && res.data.warehouses.length > 0) {
            const compWh = res.data.warehouses.filter((w) => w.companyId === compId);
            setWarehouses((prev) => [...compWh, ...prev.filter((w) => w.companyId !== compId)]);
          }
          if (res.data.stock && res.data.stock.length > 0) {
            setStock((localPrev) => {
              const localMap = new Map(localPrev.map((s) => [s.id, s]));
              res.data.stock.forEach((remoteStk: StockItem) => {
                localMap.set(remoteStk.id, {
                  ...remoteStk,
                  quantity: Number(remoteStk.quantity) || 0,
                  reserved: Number(remoteStk.reserved) || 0,
                  avgCost: Number(remoteStk.avgCost) || 0,
                });
              });
              const merged = Array.from(localMap.values());
              stockRef.current = merged;
              saveToStorage('stock', merged);
              return merged;
            });
          }
          if (res.data.accountsPayable && res.data.accountsPayable.length > 0) {
            const compAP = res.data.accountsPayable.filter((a) => a.companyId === compId);
            setAccountsPayable((prev) => [...compAP, ...prev.filter((a) => a.companyId !== compId)]);
          }
          if (res.data.accountsReceivable && res.data.accountsReceivable.length > 0) {
            const compAR = res.data.accountsReceivable.filter((a) => a.companyId === compId);
            setAccountsReceivable((prev) => [...compAR, ...prev.filter((a) => a.companyId !== compId)]);
          }
          if (res.data.shifts) {
            const compShifts = res.data.shifts.filter((s: CashShift) => s.companyId === compId);
            if (compShifts.length > 0) {
              setShiftsHistory((prev) => {
                const other = prev.filter((s) => s.companyId !== compId);
                return [...compShifts, ...other];
              });
              // Reconciliação robusta do caixa ativo estritamente para ESTA empresa
              // Ordena por data de abertura (o turno mais recente em primeiro)
              const sortedCompShifts = [...compShifts].sort(
                (a, b) => new Date(b.openedAt || 0).getTime() - new Date(a.openedAt || 0).getTime()
              );
              const latestShift = sortedCompShifts[0];

              if (latestShift && latestShift.status === 'aberto' && !latestShift.closedAt) {
                setActiveShift(latestShift);
                saveToStorage('activeShift', latestShift);
              } else {
                // Se o turno mais recente foi encerrado, o caixa está FECHADO em todos os dispositivos!
                setActiveShift(null);
                saveToStorage('activeShift', null);
              }
            } else {
              // Não existem turnos para esta empresa no Supabase -> Caixa fechado
              setActiveShift((curr) => {
                if (curr && curr.companyId === compId) {
                  saveToStorage('activeShift', null);
                  return null;
                }
                return curr;
              });
            }
          }
          if (res.data.employees && res.data.employees.length > 0) {
            const compEmployees = res.data.employees.filter((e) => !e.companyId || e.companyId === compId);
            setEmployees((prev) => {
              const updated = [...prev];
              compEmployees.forEach((remote) => {
                const idx = updated.findIndex((item) => String(item.id) === String(remote.id));
                if (idx >= 0) updated[idx] = { ...updated[idx], ...remote };
                else updated.push(remote);
              });
              return updated;
            });
          }
          if (res.data.timeEntries && res.data.timeEntries.length > 0) {
            setTimeEntries((prev) => {
              const updated = [...prev];
              res.data.timeEntries!.forEach((remote) => {
                const idx = updated.findIndex((item) => String(item.id) === String(remote.id));
                if (idx >= 0) updated[idx] = { ...updated[idx], ...remote };
                else updated.push(remote);
              });
              return updated;
            });
          }
          if (res.data.payrolls && res.data.payrolls.length > 0) {
            const compPayrolls = res.data.payrolls.filter((p) => !p.companyId || p.companyId === compId);
            setPayrolls((prev) => {
              const updated = [...prev];
              compPayrolls.forEach((remote) => {
                const idx = updated.findIndex((item) => String(item.id) === String(remote.id));
                if (idx >= 0) updated[idx] = { ...updated[idx], ...remote };
                else updated.push(remote);
              });
              return updated;
            });
          }
          if (res.data.employeeShifts && res.data.employeeShifts.length > 0) {
            const compShifts = res.data.employeeShifts.filter((s) => !s.companyId || s.companyId === compId);
            setEmployeeShifts((prev) => {
              const updated = [...prev];
              compShifts.forEach((remote) => {
                const idx = updated.findIndex((item) => String(item.id) === String(remote.id));
                if (idx >= 0) updated[idx] = { ...updated[idx], ...remote };
                else updated.push(remote);
              });
              return updated;
            });
          }
          if (res.data.salesGoals && res.data.salesGoals.length > 0) {
            const compGoals = res.data.salesGoals.filter((g) => !g.companyId || g.companyId === compId);
            compGoals.forEach((goal) => {
              const ano = goal.anoReferencia || goal.ano_referencia;
              if (ano) {
                const dados = {
                  anoReferencia: ano,
                  metaAnualTotal: goal.metaAnualTotal || goal.meta_anual_total,
                  estrategia: goal.estrategia || 'MANUAL',
                  metasMensais: goal.metasMensais || goal.metas_mensais || [],
                  valoresManuais: goal.valoresManuais || goal.valores_manuais || [],
                  historicoValores: goal.historicoValores || goal.historico_valores || [],
                  vendasRealizadas: goal.vendasRealizadas || goal.vendas_realizadas || [],
                  savedAt: goal.savedAt || goal.saved_at || new Date().toISOString(),
                  source: goal.source || 'Sincronizado Supabase',
                  isManuallyEdited: goal.isManuallyEdited ?? goal.is_manually_edited ?? true,
                };
                localStorage.setItem(`agro_sales_goals_v2_${ano}`, JSON.stringify(dados));
                window.dispatchEvent(new CustomEvent('agro_sales_goals_updated', { detail: { anoReferencia: ano, goal: dados } }));
              }
            });
          }
        }
      } catch {
        // Silent failure in background - Realtime will continue to deliver deltas
      }
    };

    // Run silent pull 200ms after app boot for instant multi-device alignment
    const bootTimer = setTimeout(executeSilentPull, 200);
    // And periodically every 30 seconds
    timer = setInterval(executeSilentPull, 30000);

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
    const targetCompId = options?.companyId || currentCompany?.id || 'ALL';
    const scopeTxt = targetCompId && targetCompId !== 'ALL' ? ` para a empresa [${targetCompId}]` : '';
    notify(`A sincronizar dados a partir do Supabase${scopeTxt}...`, 'info');
    const res = await pullAllFromSupabase(options);
    if (res.data.companies && res.data.companies.length > 0) {
      setCompanies((prev) => {
        const merged = [...prev];
        res.data.companies!.forEach((c) => {
          const idx = merged.findIndex((m) => m.id === c.id);
          if (idx >= 0) merged[idx] = c;
          else merged.push(c);
        });
        return merged;
      });
      const matched = res.data.companies.find((c) => c.id === currentCompany.id) || res.data.companies[0];
      if (matched) setCurrentCompany(matched);
    }
    if (res.data.stores && res.data.stores.length > 0) {
      const compStores = res.data.stores.filter((s) => targetCompId === 'ALL' || s.companyId === targetCompId);
      if (compStores.length > 0) {
        setStores((prev) => {
          const other = prev.filter((s) => targetCompId !== 'ALL' && s.companyId !== targetCompId);
          return [...compStores, ...other];
        });
        const matchedStore = compStores.find((s) => s.id === currentStore.id) || compStores[0];
        if (matchedStore) setCurrentStore(matchedStore);
      }
    }
    if (res.data.products && res.data.products.length > 0) {
      const compProds = res.data.products.filter((p) => targetCompId === 'ALL' || p.companyId === targetCompId);
      setProducts((prev) => {
        const mergedMap = new Map<string, Product>();
        // 1. Keep all existing local products (including those created offline)
        prev.forEach((p) => mergedMap.set(String(p.id), p));
        // 2. Merge remote products (updates existing, adds new)
        compProds.forEach((remoteProd) => {
          const existing = mergedMap.get(String(remoteProd.id));
          mergedMap.set(String(remoteProd.id), {
            ...(existing || {}),
            ...remoteProd,
          });
        });
        const merged = Array.from(mergedMap.values());
        saveToStorage('products', merged);
        return sortProductsAlphabetically(merged);
      });
    }
    if (res.data.customers && res.data.customers.length > 0) {
      const compCust = res.data.customers.filter((c) => targetCompId === 'ALL' || c.companyId === targetCompId);
      setCustomers((prev) => {
        const mergedMap = new Map<string, Customer>();
        prev.forEach((c) => mergedMap.set(String(c.id), c));
        compCust.forEach((remoteCust) => {
          const existing = mergedMap.get(String(remoteCust.id));
          mergedMap.set(String(remoteCust.id), {
            ...(existing || {}),
            ...remoteCust,
          });
        });
        const merged = Array.from(mergedMap.values());
        saveToStorage('customers', merged);
        return merged;
      });
    }
    if (res.data.suppliers && res.data.suppliers.length > 0) {
      const compSupp = res.data.suppliers.filter((s) => targetCompId === 'ALL' || s.companyId === targetCompId);
      setSuppliers((prev) => {
        const mergedMap = new Map<string, Supplier>();
        prev.forEach((s) => mergedMap.set(String(s.id), s));
        compSupp.forEach((remoteSupp) => {
          const existing = mergedMap.get(String(remoteSupp.id));
          mergedMap.set(String(remoteSupp.id), {
            ...(existing || {}),
            ...remoteSupp,
          });
        });
        const merged = Array.from(mergedMap.values());
        saveToStorage('suppliers', merged);
        return merged;
      });
    }
    if (res.data.categories && res.data.categories.length > 0) setCategories(res.data.categories);
    if (res.data.sales && res.data.sales.length > 0) {
      const compSales = res.data.sales.filter((s) => targetCompId === 'ALL' || s.companyId === targetCompId);
      setSalesHistory((prev) => {
        const mergedMap = new Map<string, Sale>();
        prev.forEach((s) => mergedMap.set(String(s.id), s));
        compSales.forEach((remoteSale) => {
          const existing = mergedMap.get(String(remoteSale.id));
          mergedMap.set(String(remoteSale.id), {
            ...(existing || {}),
            ...remoteSale,
          });
        });
        const merged = Array.from(mergedMap.values());
        saveToStorage('salesHistory', merged);
        return merged;
      });
    }
    if (res.data.users && res.data.users.length > 0) {
      const compUsers = res.data.users.filter((u) => targetCompId === 'ALL' || u.companyId === targetCompId);
      setUsers((prev) => {
        const mergedMap = new Map<string, User>();
        prev.forEach((u) => mergedMap.set(String(u.id), u));
        compUsers.forEach((remoteUser) => {
          const existing = mergedMap.get(String(remoteUser.id));
          mergedMap.set(String(remoteUser.id), {
            ...(existing || {}),
            ...remoteUser,
          });
        });
        const merged = Array.from(mergedMap.values());
        saveToStorage('users', merged);
        return merged;
      });
    }
    if (res.data.warehouses && res.data.warehouses.length > 0) {
      const compWh = res.data.warehouses.filter((w) => targetCompId === 'ALL' || w.companyId === targetCompId);
      setWarehouses((prev) => {
        const mergedMap = new Map<string, Warehouse>();
        prev.forEach((w) => mergedMap.set(String(w.id), w));
        compWh.forEach((remoteWh) => {
          const existing = mergedMap.get(String(remoteWh.id));
          mergedMap.set(String(remoteWh.id), {
            ...(existing || {}),
            ...remoteWh,
          });
        });
        const merged = Array.from(mergedMap.values());
        saveToStorage('warehouses', merged);
        return merged;
      });
    }
    if (res.data.stock && res.data.stock.length > 0) {
      setStock((localPrev) => {
        const localMap = new Map(localPrev.map((s) => [s.id, s]));
        res.data.stock.forEach((remoteStk: StockItem) => {
          localMap.set(remoteStk.id, {
            ...remoteStk,
            quantity: Number(remoteStk.quantity) || 0,
            reserved: Number(remoteStk.reserved) || 0,
            avgCost: Number(remoteStk.avgCost) || 0,
          });
        });
        const merged = Array.from(localMap.values());
        stockRef.current = merged;
        saveToStorage('stock', merged);
        return merged;
      });
    }
    if (res.data.accountsPayable && res.data.accountsPayable.length > 0) {
      const compAP = res.data.accountsPayable.filter((a) => targetCompId === 'ALL' || a.companyId === targetCompId);
      setAccountsPayable((prev) => {
        const mergedMap = new Map<string, AccountPayable>();
        prev.forEach((a) => mergedMap.set(String(a.id), a));
        compAP.forEach((remoteAP) => {
          const existing = mergedMap.get(String(remoteAP.id));
          mergedMap.set(String(remoteAP.id), {
            ...(existing || {}),
            ...remoteAP,
          });
        });
        const merged = Array.from(mergedMap.values());
        saveToStorage('accountsPayable', merged);
        return merged;
      });
    }
    if (res.data.accountsReceivable && res.data.accountsReceivable.length > 0) {
      const compAR = res.data.accountsReceivable.filter((a) => targetCompId === 'ALL' || a.companyId === targetCompId);
      setAccountsReceivable((prev) => {
        const mergedMap = new Map<string, AccountReceivable>();
        prev.forEach((a) => mergedMap.set(String(a.id), a));
        compAR.forEach((remoteAR) => {
          const existing = mergedMap.get(String(remoteAR.id));
          mergedMap.set(String(remoteAR.id), {
            ...(existing || {}),
            ...remoteAR,
          });
        });
        const merged = Array.from(mergedMap.values());
        saveToStorage('accountsReceivable', merged);
        return merged;
      });
    }
    if (res.data.shifts) {
      const compShifts = res.data.shifts.filter((s: CashShift) => targetCompId === 'ALL' || s.companyId === targetCompId);
      if (compShifts.length > 0) {
        setShiftsHistory((prev) => {
          const other = prev.filter((s) => targetCompId !== 'ALL' && s.companyId !== targetCompId);
          return [...compShifts, ...other];
        });
        const sortedCompShifts = [...compShifts].sort(
          (a, b) => new Date(b.openedAt || 0).getTime() - new Date(a.openedAt || 0).getTime()
        );
        const latestShift = sortedCompShifts[0];
        if (latestShift && latestShift.status === 'aberto' && !latestShift.closedAt) {
          setActiveShift(latestShift);
          saveToStorage('activeShift', latestShift);
        } else {
          setActiveShift(null);
          saveToStorage('activeShift', null);
        }
      } else if (targetCompId !== 'ALL') {
        setActiveShift(null);
        saveToStorage('activeShift', null);
      }
    }
    if (res.data.employees && res.data.employees.length > 0) {
      const compEmployees = res.data.employees.filter((e) => targetCompId === 'ALL' || !e.companyId || e.companyId === targetCompId);
      setEmployees((prev) => [...compEmployees, ...prev.filter((e) => targetCompId !== 'ALL' && e.companyId && e.companyId !== targetCompId)]);
    }
    if (res.data.timeEntries && res.data.timeEntries.length > 0) {
      setTimeEntries((prev) => {
        const updated = [...prev];
        res.data.timeEntries!.forEach((remote) => {
          const idx = updated.findIndex((item) => String(item.id) === String(remote.id));
          if (idx >= 0) updated[idx] = { ...updated[idx], ...remote };
          else updated.push(remote);
        });
        return updated;
      });
    }
    if (res.data.payrolls && res.data.payrolls.length > 0) {
      const compPayrolls = res.data.payrolls.filter((p) => targetCompId === 'ALL' || !p.companyId || p.companyId === targetCompId);
      setPayrolls((prev) => [...compPayrolls, ...prev.filter((p) => targetCompId !== 'ALL' && p.companyId && p.companyId !== targetCompId)]);
    }
    if (res.data.employeeShifts && res.data.employeeShifts.length > 0) {
      const compShifts = res.data.employeeShifts.filter((s) => targetCompId === 'ALL' || !s.companyId || s.companyId === targetCompId);
      setEmployeeShifts((prev) => [...compShifts, ...prev.filter((s) => targetCompId !== 'ALL' && s.companyId && s.companyId !== targetCompId)]);
    }
    if (res.data.salesGoals && res.data.salesGoals.length > 0) {
      const compGoals = res.data.salesGoals.filter((g) => targetCompId === 'ALL' || !g.companyId || g.companyId === targetCompId);
      compGoals.forEach((goal) => {
        const ano = goal.anoReferencia || goal.ano_referencia;
        if (ano) {
          const dados = {
            anoReferencia: ano,
            metaAnualTotal: goal.metaAnualTotal || goal.meta_anual_total,
            estrategia: goal.estrategia || 'MANUAL',
            metasMensais: goal.metasMensais || goal.metas_mensais || [],
            valoresManuais: goal.valoresManuais || goal.valores_manuais || [],
            historicoValores: goal.historicoValores || goal.historico_valores || [],
            vendasRealizadas: goal.vendasRealizadas || goal.vendas_realizadas || [],
            savedAt: goal.savedAt || goal.saved_at || new Date().toISOString(),
            source: goal.source || 'Sincronizado Supabase',
            isManuallyEdited: goal.isManuallyEdited ?? goal.is_manually_edited ?? true,
          };
          localStorage.setItem(`agro_sales_goals_v2_${ano}`, JSON.stringify(dados));
          window.dispatchEvent(new CustomEvent('agro_sales_goals_updated', { detail: { anoReferencia: ano, goal: dados } }));
        }
      });
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

    // Read local sales goals for push
    const localSalesGoals: SalesGoalRecord[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('agro_sales_goals_v2_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const ano = parsed.anoReferencia || parseInt(key.replace('agro_sales_goals_v2_', ''), 10);
            if (ano) {
              localSalesGoals.push({
                id: `meta-${options?.companyId || currentCompany?.id || 'comp-1'}-${ano}`,
                companyId: options?.companyId || currentCompany?.id || 'comp-1',
                anoReferencia: ano,
                metaAnualTotal: parsed.metaAnualTotal || 0,
                estrategia: parsed.estrategia || 'MANUAL',
                metasMensais: parsed.metasMensais || [],
                valoresManuais: parsed.valoresManuais || [],
                historicoValores: parsed.historicoValores || [],
                vendasRealizadas: parsed.vendasRealizadas || [],
                savedAt: parsed.savedAt || new Date().toISOString(),
                source: parsed.source || 'Local App',
                isManuallyEdited: parsed.isManuallyEdited ?? true,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao ler metas locais:', e);
    }

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
      employees: filterByCompany(employees),
      timeEntries: timeEntries,
      payrolls: filterByCompany(payrolls),
      employeeShifts: filterByCompany(employeeShifts),
      salesGoals: localSalesGoals,
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

  const reconcileActiveShift = useCallback(async (companyId?: string) => {
    const compId = companyId || currentCompanyRef.current?.id;
    if (!compId) return;
    try {
      const latest = await fetchLatestShiftFromSupabase(compId);
      if (latest && latest.status === 'aberto' && !latest.closedAt) {
        setActiveShift(latest);
        saveToStorage('activeShift', latest);
      } else {
        setActiveShift(null);
        saveToStorage('activeShift', null);
      }
    } catch {
      // Ignorar erros transitórios de rede
    }
  }, []);

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
      reconcileActiveShift(targetCompanyId);
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
      reconcileActiveShift(targetCompanyId);
      notify(`Operador autenticado: ${user.name} (${user.role.toUpperCase()})`, 'success');
      return { success: true };
    },
    [users, companies, stores, terminals, currentCompany.id, notify, reconcileActiveShift]
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
      reconcileActiveShift(targetCompanyId);
      notify(`Sessão iniciada como ${user.name}`, 'success');
    },
    [companies, stores, terminals, currentCompany.id, notify, reconcileActiveShift]
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
        const merged = { ...currentCompany, ...updates };
        setCurrentCompany(merged);
        setActiveAppCompany(merged);
        setActiveAppCurrency(merged.currencySymbol || merged.currency);
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
      setCurrentCompany(updatedObj);
      setActiveAppCompany(updatedObj);
      setActiveAppCurrency(updatedObj.currencySymbol || updatedObj.currency);
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
          currencySymbol: (params.company as any).currencySymbol || getCurrencyDefinition(params.company.currency || 'MZN').symbol || 'Mt',
          currencyPosition: (params.company as any).currencyPosition || getCurrencyDefinition(params.company.currency || 'MZN').position || 'suffix',
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

        // 6. Categorias baseadas no ramo de negócio (Catálogo de produtos inicia limpo sob controlo estrito do utilizador)
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

        // Rigor estrito: Não adicionar produtos automaticamente ao registar a empresa
        const initialIndustryProducts: Product[] = [];
        const initialStockItems: StockItem[] = [];

        // Reset active shift and transactional session to isolate the newly registered company
        setActiveShift(null);
        saveToStorage('activeShift', null);
        setCart([]);
        saveToStorage('cart', []);
        setSelectedCustomer(null);
        setGlobalDiscount(0);

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

        // Sincronização automática completa para o Supabase (empresas, lojas, armazens, usuarios, profiles, categorias)
        try {
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
            categories: newCategories,
            products: initialIndustryProducts,
            stock: initialStockItems,
          });

          // Garantir enfileiramento e logs para sincronização redundante / offline
          pushRecordToSupabase('empresas', 'upsert', newComp);
          pushRecordToSupabase('lojas', 'upsert', newStore);
          pushRecordToSupabase('armazens', 'upsert', newWarehouse);
          pushRecordToSupabase('usuarios', 'upsert', newUser);
          newCategories.forEach((cat) => pushRecordToSupabase('categorias', 'upsert', cat));
        } catch (syncErr) {
          console.warn('Erro na sincronização de nova empresa para o Supabase:', syncErr);
        }

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
          saveToStorage('terminal', newTerminal);
          saveToStorage('activeShift', null);
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

    // Padronização restrita exclusivamente às categorias (nunca altera produtos automaticamente)
    setCategories(updatedCategories);
    sound.playSuccessChime();
    notify(
      changed > 0
        ? `Foram padronizadas e corrigidas ${changed} designações de categorias no sistema!`
        : 'Todas as categorias já se encontram devidamente escritas e padronizadas.',
      'success'
    );
  };

  const addProduct = (prodData: Omit<Product, 'id'>): boolean => {
    // 1. Verificação rigorosa de permissões
    if (!hasPermission('stock', 'create')) {
      notify('Acesso Negado: Não possui permissão para registar artigos no catálogo.', 'error');
      return false;
    }

    // 2. Validação rigorosa do Nome do Artigo
    const name = (prodData.name || '').trim();
    if (!name || name.length < 2) {
      notify('Rigor de Validação: O nome do artigo é obrigatório e deve ter no mínimo 2 caracteres.', 'error');
      return false;
    }

    // 3. Validação rigorosa de SKU
    const sku = (prodData.sku || '').trim();
    if (!sku) {
      notify('Rigor de Validação: O código de referência / SKU é obrigatório.', 'error');
      return false;
    }

    const compId = prodData.companyId || currentCompany?.id || 'comp-1';

    // 4. Prevenção estrita de duplicados de SKU na mesma empresa
    const existingWithSku = products.find(
      (p) => p.companyId === compId && p.sku.trim().toLowerCase() === sku.toLowerCase()
    );
    if (existingWithSku) {
      notify(`Rigor de Catálogo: Já existe um artigo ("${existingWithSku.name}") com o mesmo SKU "${sku}".`, 'error');
      return false;
    }

    // 5. Prevenção estrita de duplicados de Código de Barras (se fornecido)
    const barcode = (prodData.barcode || '').trim();
    if (barcode) {
      const existingWithBarcode = products.find(
        (p) => p.companyId === compId && p.barcode && p.barcode.trim() === barcode
      );
      if (existingWithBarcode) {
        notify(`Rigor de Catálogo: O código de barras "${barcode}" já está atribuído a "${existingWithBarcode.name}".`, 'error');
        return false;
      }
    }

    // 6. Validação rigorosa de Preço de Venda e Custo
    const price = Number(prodData.price);
    if (isNaN(price) || price < 0) {
      notify('Rigor Financeiro: O preço de venda deve ser um número válido maior ou igual a zero.', 'error');
      return false;
    }

    const costPrice = Number(prodData.costPrice ?? 0);
    if (isNaN(costPrice) || costPrice < 0) {
      notify('Rigor Financeiro: O preço de custo (CMP) deve ser um número válido maior ou igual a zero.', 'error');
      return false;
    }

    // 7. Validação de limites de stock
    const minStock = Number(prodData.minStock ?? 0);
    const maxStock = Number(prodData.maxStock ?? 0);
    if (minStock < 0 || maxStock < 0) {
      notify('Rigor Operacional: Os limites de stock mínimo e máximo não podem ser negativos.', 'error');
      return false;
    }
    if (maxStock > 0 && minStock > maxStock) {
      notify('Rigor Operacional: O stock mínimo não pode ser superior ao stock máximo configurado.', 'error');
      return false;
    }

    const newId = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...prodData,
      id: newId,
      name,
      sku,
      barcode,
      price,
      costPrice,
      minStock,
      maxStock,
      companyId: compId,
    };

    // Initialize stock record in current store's default warehouse
    const targetWhId = currentStore?.defaultWarehouseId || warehouses.find((w) => w.companyId === compId)?.id || warehouses[0]?.id || 'wh-default';
    const newStockRecord: StockItem = {
      id: `stk-${Date.now()}`,
      companyId: compId,
      productId: newId,
      warehouseId: targetWhId,
      quantity: 0,
      reserved: 0,
      avgCost: newProduct.costPrice,
    };

    // 1. Update React state and write to storage immediately
    setProducts((prev) => {
      const updated = sortProductsAlphabetically([newProduct, ...prev]);
      saveToStorage('products', updated);
      return updated;
    });

    // 2. Cache directly in IndexedDB for offline resilience
    offlineDB.saveOfflineProduct(newProduct).catch(() => {});

    // 3. Update stock
    setStock((prev) => {
      const updated = [...prev, newStockRecord];
      stockRef.current = updated;
      saveToStorage('stock', updated);
      return updated;
    });

    // 4. Push to Supabase queue (safe offline or online)
    pushRecordToSupabase('stock', 'upsert', newStockRecord);
    pushRecordToSupabase('produtos', 'insert', newProduct);

    emitEvent('Stock', 'stock.product.created', {
      companyId: compId,
      productId: newId,
      name: newProduct.name,
      sku: newProduct.sku,
      price: newProduct.price,
    });
    sound.playSuccessChime();
    notify(`Artigo "${newProduct.name}" (${newProduct.sku}) registado com sucesso com validação estrita.`, 'success');
    return true;
  };

  const updateProduct = (id: string, updates: Partial<Product>): boolean => {
    // 1. Verificação rigorosa de permissões
    if (!hasPermission('stock', 'edit')) {
      notify('Acesso Negado: Não tem permissão para alterar artigos do inventário.', 'error');
      return false;
    }

    const target = products.find((p) => p.id === id);
    if (!target) {
      notify('Erro de Catálogo: Artigo não encontrado para alteração.', 'error');
      return false;
    }

    const compId = target.companyId || currentCompany?.id || 'comp-1';

    // 2. Validação rigorosa de Nome se alterado
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName || trimmedName.length < 2) {
        notify('Rigor de Validação: O nome do artigo deve ter no mínimo 2 caracteres.', 'error');
        return false;
      }
      updates.name = trimmedName;
    }

    // 3. Validação rigorosa de SKU se alterado
    if (updates.sku !== undefined) {
      const trimmedSku = updates.sku.trim();
      if (!trimmedSku) {
        notify('Rigor de Validação: O SKU não pode ficar em branco.', 'error');
        return false;
      }
      const duplicateSku = products.find(
        (p) => p.id !== id && p.companyId === compId && p.sku.trim().toLowerCase() === trimmedSku.toLowerCase()
      );
      if (duplicateSku) {
        notify(`Rigor de Catálogo: Já existe outro artigo ("${duplicateSku.name}") com o SKU "${trimmedSku}".`, 'error');
        return false;
      }
      updates.sku = trimmedSku;
    }

    // 4. Validação rigorosa de Código de Barras se alterado
    if (updates.barcode !== undefined && updates.barcode.trim()) {
      const trimmedBarcode = updates.barcode.trim();
      const duplicateBarcode = products.find(
        (p) => p.id !== id && p.companyId === compId && p.barcode && p.barcode.trim() === trimmedBarcode
      );
      if (duplicateBarcode) {
        notify(`Rigor de Catálogo: O código de barras "${trimmedBarcode}" já está atribuído a "${duplicateBarcode.name}".`, 'error');
        return false;
      }
      updates.barcode = trimmedBarcode;
    }

    // 5. Validação de Preço de Venda
    if (updates.price !== undefined) {
      const price = Number(updates.price);
      if (isNaN(price) || price < 0) {
        notify('Rigor Financeiro: O preço de venda deve ser um número válido maior ou igual a zero.', 'error');
        return false;
      }
      updates.price = price;
    }

    // 6. Validação de Preço de Custo
    if (updates.costPrice !== undefined) {
      const costPrice = Number(updates.costPrice);
      if (isNaN(costPrice) || costPrice < 0) {
        notify('Rigor Financeiro: O preço de custo deve ser um número válido maior ou igual a zero.', 'error');
        return false;
      }
      updates.costPrice = costPrice;
    }

    setProducts((prev) => {
      const updatedList = sortProductsAlphabetically(
        prev.map((p) => {
          if (p.id === id) {
            const updated = {
              ...p,
              ...updates,
              companyId: p.companyId || compId,
            };
            offlineDB.saveOfflineProduct(updated).catch(() => {});
            pushRecordToSupabase('produtos', 'update', updated);
            return updated;
          }
          return p;
        })
      );
      saveToStorage('products', updatedList);
      return updatedList;
    });
    emitEvent('Stock', 'stock.product.updated', { productId: id, updates, companyId: compId });
    sound.playSuccessChime();
    notify(`Artigo atualizado com sucesso e validação de rigor confirmada.`, 'success');
    return true;
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      saveToStorage('products', updated);
      return updated;
    });
    setStock((prev) => {
      const updated = prev.filter((s) => s.productId !== id);
      stockRef.current = updated;
      saveToStorage('stock', updated);
      return updated;
    });
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
    mode: 'merge' | 'replace' | 'skip_existing' = 'merge'
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
      if (mode === 'merge' || mode === 'skip_existing') {
        currentCompanyProducts.forEach((p) => {
          if (p.sku) productMap.set(p.sku.toLowerCase().trim(), p);
          if (p.barcode) productMap.set(p.barcode.trim(), p);
        });
      }

      const updatedCompanyList = mode === 'replace' ? [] : [...currentCompanyProducts];
      const newStockItems: StockItem[] = [];

      items.forEach((item, index) => {
        const existing =
          productMap.get(item.sku.toLowerCase().trim()) ||
          (item.barcode ? productMap.get(item.barcode.trim()) : undefined);

        if (existing) {
          if (mode === 'skip_existing') {
            // Rigor: Não altera produto existente quando em modo skip_existing
            return;
          }
          if (mode === 'merge') {
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
    setStock((prev) => {
      const updated = prev.filter((s) => s.warehouseId !== id);
      stockRef.current = updated;
      saveToStorage('stock', updated);
      return updated;
    });
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

  const recordStockMovement = (
    mov: Omit<StockMovement, 'id' | 'timestamp'> & {
      id?: string;
      timestamp?: string;
      date?: string;
      createdAt?: string;
      movementNumber?: string;
    }
  ) => {
    const compId = mov.companyId || currentCompanyRef.current?.id || currentCompany?.id || 'comp-1';
    const nowIso = new Date().toISOString();
    let exactTimestamp = mov.timestamp || (mov as any).date || (mov as any).createdAt;
    if (!exactTimestamp && mov.referenceDoc) {
      const ref = (mov.referenceDoc || '').trim().toUpperCase();
      const matchedSale = salesHistory.find((s) => (s.invoiceNumber || '').trim().toUpperCase() === ref);
      if (matchedSale && (matchedSale.date || (matchedSale as any).createdAt)) {
        exactTimestamp = matchedSale.date || (matchedSale as any).createdAt;
      }
    }
    if (!exactTimestamp) {
      exactTimestamp = nowIso;
    }
    const d = new Date(exactTimestamp);
    const validD = isNaN(d.getTime()) ? new Date() : d;
    const y = validD.getFullYear();
    const m = String(validD.getMonth() + 1).padStart(2, '0');
    const day = String(validD.getDate()).padStart(2, '0');
    const hh = String(validD.getHours()).padStart(2, '0');
    const mm = String(validD.getMinutes()).padStart(2, '0');
    const ss = String(validD.getSeconds()).padStart(2, '0');
    const dateFormatted = `${y}-${m}-${day}`;
    const seq = Math.floor(1000 + Math.random() * 9000);
    const movementNumber =
      mov.movementNumber ||
      `MOV-${y}${m}${day}-${hh}${mm}${ss}-${seq}`;

    const newMov: StockMovement = {
      ...mov,
      companyId: compId,
      id: mov.id || `mov-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      timestamp: exactTimestamp,
      date: mov.date || dateFormatted,
      createdAt: mov.createdAt || exactTimestamp,
      movementNumber,
    };
    setStockMovements((prev) => {
      const updated = [newMov, ...prev];
      stockMovementsRef.current = updated;
      saveToStorage('stockMovements', updated);
      return updated;
    });
  };

  const deleteStockMovement = (id: string) => {
    setStockMovements((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      stockMovementsRef.current = updated;
      saveToStorage('stockMovements', updated);
      return updated;
    });
    emitEvent('Stock', 'stock.movement.deleted', { movementId: id });
  };

  const createStockAdjustment = (
    productId: string,
    warehouseId: string,
    newQty: number,
    reason: string
  ) => {
    const compId = currentCompanyRef.current?.id || currentCompany?.id || 'comp-1';
    const currentStockList = (stockRef.current && stockRef.current.length > 0 ? stockRef.current : stock).map(
      (s) => ({
        ...s,
        quantity: Number(s.quantity) || 0,
        reserved: Number(s.reserved) || 0,
        avgCost: Number(s.avgCost) || 0,
      })
    );

    const existing = currentStockList.find(
      (s) => s.productId === productId && s.warehouseId === warehouseId
    );
    const oldQty = existing ? existing.quantity : 0;
    const diff = newQty - oldQty;
    const prod = products.find((p) => p.id === productId);

    let updatedStockRecord: StockItem;
    if (existing) {
      existing.quantity = Math.max(0, newQty);
      existing.companyId = existing.companyId || compId;
      updatedStockRecord = { ...existing };
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
      currentStockList.push(updatedStockRecord);
    }

    stockRef.current = currentStockList;
    setStock(currentStockList);
    saveToStorage('stock', currentStockList);
    offlineDB.cacheStock(currentStockList).catch(() => {});
    pushRecordToSupabase('stock', 'upsert', updatedStockRecord);

    recordStockMovement({
      companyId: compId,
      type: 'ajuste',
      productId,
      targetWarehouseId: warehouseId,
      quantity: Math.abs(diff),
      unitCost: prod?.costPrice || 0,
      reason: `${reason} (Ajuste de ${oldQty} para ${newQty})`,
      operatorId: currentUser?.id || 'user-1',
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
    const compId = currentCompanyRef.current?.id || currentCompany?.id || 'comp-1';
    const prod = products.find((p) => p.id === productId);

    const currentStockList = (stockRef.current && stockRef.current.length > 0 ? stockRef.current : stock).map(
      (s) => ({
        ...s,
        quantity: Number(s.quantity) || 0,
        reserved: Number(s.reserved) || 0,
        avgCost: Number(s.avgCost) || 0,
      })
    );

    let updatedFrom: StockItem | undefined;
    let updatedTo: StockItem | undefined;

    const fromItem = currentStockList.find(
      (s) => s.productId === productId && s.warehouseId === fromWarehouseId
    );
    if (fromItem) {
      fromItem.quantity = Math.max(0, fromItem.quantity - quantity);
      fromItem.companyId = fromItem.companyId || compId;
      updatedFrom = { ...fromItem };
    }

    const toItem = currentStockList.find(
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
      currentStockList.push(newTo);
      updatedTo = newTo;
    }

    stockRef.current = currentStockList;
    setStock(currentStockList);
    saveToStorage('stock', currentStockList);
    offlineDB.cacheStock(currentStockList).catch(() => {});

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
      operatorId: currentUser?.id || 'user-1',
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

  // 1. SOLICITAÇÃO: Destino pede à Origem (Status: PENDENTE)
  const requestStockTransfer = async (
    originWarehouseId: string,
    destinationWarehouseId: string,
    items: Array<{ productId: string; quantity: number }>,
    notes?: string
  ): Promise<StockTransfer> => {
    const compId = currentCompanyRef.current?.id || currentCompany?.id || 'comp-1';
    const year = new Date().getFullYear();
    const count = stockTransfersRef.current.length + 1;
    const transferNumber = `TRF-${year}-${String(count).padStart(4, '0')}`;

    const transferItems: StockTransferItem[] = items.map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      return {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: it.productId,
        productName: prod?.name || 'Artigo',
        productSku: prod?.sku || '',
        quantityRequested: it.quantity,
        quantityApproved: it.quantity,
        unitCost: prod?.costPrice || 0,
      };
    });

    const newTransfer: StockTransfer = {
      id: `trf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      companyId: compId,
      transferNumber,
      originWarehouseId,
      destinationWarehouseId,
      status: 'PENDENTE',
      items: transferItems,
      failedAttempts: 0,
      maxAttempts: 5,
      notes: notes || '',
      requestedBy: currentUser?.id || 'user-1',
      requestedByName: currentUser?.name || 'Operador',
      createdAt: new Date().toISOString(),
    };

    const updated = [newTransfer, ...stockTransfersRef.current];
    stockTransfersRef.current = updated;
    setStockTransfers(updated);
    saveToStorage('stockTransfers', updated);

    emitEvent('Stock', 'stock.transfer.requested', {
      transferNumber,
      originWarehouseId,
      destinationWarehouseId,
      itemCount: items.length,
    });
    sound.playSuccessChime();
    notify(`Solicitação de transferência ${transferNumber} criada com sucesso! Aguarda aprovação da Origem.`, 'success');
    return newTransfer;
  };

  // 2. APROVAÇÃO: Origem analisa, abate o stock e gera Código de 6 dígitos (Status: APROVADO)
  const approveStockTransfer = async (
    transferId: string,
    approvedItems?: Array<{ productId: string; quantity: number }>,
    notes?: string
  ): Promise<{ success: boolean; verificationCode?: string; error?: string }> => {
    const transfer = stockTransfersRef.current.find((t) => t.id === transferId);
    if (!transfer) return { success: false, error: 'Transferência não encontrada.' };
    if (transfer.status !== 'PENDENTE') return { success: false, error: `Estado inválido para aprovação: ${transfer.status}` };

    // Controlo de Acessos Rigoroso (Estilo Alidata ERP) - Validação na Origem:
    const originWh = warehouses.find((w) => w.id === transfer.originWarehouseId);
    const userRole = currentUser?.role;
    const isGlobalAdmin = userRole === 'admin' || userRole === 'superadmin';

    if (!isGlobalAdmin && currentUser) {
      const allowedWarehouseIds = [currentUser.warehouseId, ...(currentUser.warehouseIds || [])].filter(Boolean);
      const allowedStoreIds = [currentUser.storeId, ...(currentUser.storeIds || [])].filter(Boolean);

      const hasOriginWhAccess = allowedWarehouseIds.includes(transfer.originWarehouseId);
      const hasOriginStoreAccess = originWh?.storeId && allowedStoreIds.includes(originWh.storeId);

      if ((allowedWarehouseIds.length > 0 || allowedStoreIds.length > 0) && !hasOriginWhAccess && !hasOriginStoreAccess) {
        const errMsg = 'Acesso Negado: O utilizador não tem autorização para expedir stock do armazém de origem deste pedido.';
        notify(errMsg, 'error');
        sound.playError();
        return { success: false, error: errMsg };
      }
    }

    const compId = currentCompanyRef.current?.id || currentCompany?.id || 'comp-1';

    // Validar disponibilidade de stock no armazém de origem
    const currentStockList = (stockRef.current && stockRef.current.length > 0 ? stockRef.current : stock).map(
      (s) => ({
        ...s,
        quantity: Number(s.quantity) || 0,
        reserved: Number(s.reserved) || 0,
        avgCost: Number(s.avgCost) || 0,
      })
    );

    const itemsToApprove = approvedItems || transfer.items.map((i) => ({ productId: i.productId, quantity: i.quantityRequested }));

    for (const item of itemsToApprove) {
      const originStock = currentStockList.find(
        (s) => s.productId === item.productId && s.warehouseId === transfer.originWarehouseId
      );
      const available = originStock ? Math.max(0, originStock.quantity - originStock.reserved) : 0;
      if (available < item.quantity) {
        const prod = products.find((p) => p.id === item.productId);
        const errMsg = `Stock insuficiente no armazém de origem para "${prod?.name || item.productId}". Solicitado: ${item.quantity}, Disponível: ${available}`;
        notify(errMsg, 'error');
        return { success: false, error: errMsg };
      }
    }

    // Abater stock físico no armazém de origem
    const updatedStockItems: StockItem[] = [];
    for (const item of itemsToApprove) {
      const fromItem = currentStockList.find(
        (s) => s.productId === item.productId && s.warehouseId === transfer.originWarehouseId
      );
      if (fromItem) {
        fromItem.quantity = Math.max(0, fromItem.quantity - item.quantity);
        updatedStockItems.push({ ...fromItem });
      }

      const prod = products.find((p) => p.id === item.productId);
      recordStockMovement({
        companyId: compId,
        type: 'transferencia',
        productId: item.productId,
        originWarehouseId: transfer.originWarehouseId,
        targetWarehouseId: transfer.destinationWarehouseId,
        quantity: item.quantity,
        unitCost: prod?.costPrice || 0,
        referenceDoc: transfer.transferNumber,
        reason: `Saída p/ Transferência ${transfer.transferNumber} (Aprovado e Expedido)`,
        operatorId: currentUser?.id || 'user-1',
      });
    }

    stockRef.current = currentStockList;
    setStock(currentStockList);
    saveToStorage('stock', currentStockList);
    offlineDB.cacheStock(currentStockList).catch(() => {});
    if (updatedStockItems.length > 0) {
      pushBatchRecordsToSupabase('stock', 'upsert', updatedStockItems);
    }

    // Gerar Código de 6 Dígitos Único e expiração em 7 dias (168h)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    const updatedTransfers = stockTransfersRef.current.map((t) => {
      if (t.id !== transferId) return t;
      return {
        ...t,
        status: 'APROVADO' as StockTransferStatus,
        verificationCode,
        verificationExpiresAt,
        approvedBy: currentUser?.id || 'user-1',
        approvedByName: currentUser?.name || 'Operador',
        approvedByIp: '192.168.1.45 (Terminal Origem)',
        approvedAt: new Date().toISOString(),
        notes: notes ? `${t.notes ? t.notes + ' | ' : ''}${notes}` : t.notes,
        items: t.items.map((it) => {
          const match = itemsToApprove.find((a) => a.productId === it.productId);
          return match ? { ...it, quantityApproved: match.quantity } : it;
        }),
      };
    });

    stockTransfersRef.current = updatedTransfers;
    setStockTransfers(updatedTransfers);
    saveToStorage('stockTransfers', updatedTransfers);

    emitEvent('Stock', 'stock.transfer.approved', {
      transferNumber: transfer.transferNumber,
      verificationCode,
    });
    sound.playSuccessChime();
    notify(`Transferência ${transfer.transferNumber} aprovada! Código de Aceitação: ${verificationCode}`, 'success');

    return { success: true, verificationCode };
  };

  // 3 & 4. CONFIRMAÇÃO E DESCARGA: Destino insere Código de Aceitação (Status: CONCLUIDO)
  const confirmStockTransfer = async (
    transferId: string,
    code: string
  ): Promise<{ success: boolean; error?: string; remainingAttempts?: number }> => {
    const transfer = stockTransfersRef.current.find((t) => t.id === transferId);
    if (!transfer) return { success: false, error: 'Transferência não encontrada.' };
    if (transfer.status !== 'APROVADO') return { success: false, error: `Transferência não está pronta para descarga (${transfer.status}).` };

    // Controlo de Acessos Rigoroso (Estilo Alidata ERP) - Validação no Destino:
    const destWh = warehouses.find((w) => w.id === transfer.destinationWarehouseId);
    const userRole = currentUser?.role;
    const isGlobalAdmin = userRole === 'admin' || userRole === 'superadmin';

    if (!isGlobalAdmin && currentUser) {
      const allowedWarehouseIds = [currentUser.warehouseId, ...(currentUser.warehouseIds || [])].filter(Boolean);
      const allowedStoreIds = [currentUser.storeId, ...(currentUser.storeIds || [])].filter(Boolean);

      const hasDestWhAccess = allowedWarehouseIds.includes(transfer.destinationWarehouseId);
      const hasDestStoreAccess = destWh?.storeId && allowedStoreIds.includes(destWh.storeId);

      if ((allowedWarehouseIds.length > 0 || allowedStoreIds.length > 0) && !hasDestWhAccess && !hasDestStoreAccess) {
        const errMsg = 'Acesso Negado: O utilizador não pertence à loja de destino deste pedido.';
        notify(errMsg, 'error');
        sound.playError();
        return { success: false, error: errMsg };
      }
    }

    const compId = currentCompanyRef.current?.id || currentCompany?.id || 'comp-1';

    // 1. Validar Expiração
    if (transfer.verificationExpiresAt && new Date() > new Date(transfer.verificationExpiresAt)) {
      const updated = stockTransfersRef.current.map((t) =>
        t.id === transferId ? { ...t, status: 'EXPIRADO' as StockTransferStatus } : t
      );
      stockTransfersRef.current = updated;
      setStockTransfers(updated);
      saveToStorage('stockTransfers', updated);
      return { success: false, error: 'O código de aceitação expirou (limite de 7 dias excedido).' };
    }

    // 2. Validar Limite de Tentativas
    if (transfer.failedAttempts >= transfer.maxAttempts) {
      return { success: false, error: 'Número máximo de tentativas excedido. Transferência bloqueada.' };
    }

    // 3. Validar Código
    const cleanInput = (code || '').trim().replace(/\s+/g, '');
    const cleanStored = (transfer.verificationCode || '').trim().replace(/\s+/g, '');

    if (cleanInput !== cleanStored) {
      const newFailed = transfer.failedAttempts + 1;
      const remaining = Math.max(0, transfer.maxAttempts - newFailed);
      const isNowBlocked = remaining === 0;

      const updated = stockTransfersRef.current.map((t) =>
        t.id === transferId
          ? {
              ...t,
              failedAttempts: newFailed,
              status: isNowBlocked ? ('EXPIRADO' as StockTransferStatus) : t.status,
            }
          : t
      );
      stockTransfersRef.current = updated;
      setStockTransfers(updated);
      saveToStorage('stockTransfers', updated);

      const errorMsg = isNowBlocked
        ? 'Código incorreto! Limite máximo de tentativas esgotado. Pedido bloqueado.'
        : `Código incorreto. Restam ${remaining} tentativa(s).`;
      notify(errorMsg, 'error');
      sound.playError();
      return { success: false, error: errorMsg, remainingAttempts: remaining };
    }

    // 4. Se o Código for Válido -> Adicionar Stock ao Armazém de Destino!
    const currentStockList = (stockRef.current && stockRef.current.length > 0 ? stockRef.current : stock).map(
      (s) => ({
        ...s,
        quantity: Number(s.quantity) || 0,
        reserved: Number(s.reserved) || 0,
        avgCost: Number(s.avgCost) || 0,
      })
    );

    const updatedStockItems: StockItem[] = [];

    for (const item of transfer.items) {
      const qty = item.quantityApproved !== undefined ? item.quantityApproved : item.quantityRequested;
      const toItem = currentStockList.find(
        (s) => s.productId === item.productId && s.warehouseId === transfer.destinationWarehouseId
      );

      const prod = products.find((p) => p.id === item.productId);

      if (toItem) {
        toItem.quantity += qty;
        toItem.companyId = toItem.companyId || compId;
        updatedStockItems.push({ ...toItem });
      } else {
        const newTo: StockItem = {
          id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          companyId: compId,
          productId: item.productId,
          warehouseId: transfer.destinationWarehouseId,
          quantity: qty,
          reserved: 0,
          avgCost: prod?.costPrice || 0,
        };
        currentStockList.push(newTo);
        updatedStockItems.push(newTo);
      }

      recordStockMovement({
        companyId: compId,
        type: 'entrada',
        productId: item.productId,
        originWarehouseId: transfer.originWarehouseId,
        targetWarehouseId: transfer.destinationWarehouseId,
        quantity: qty,
        unitCost: prod?.costPrice || 0,
        referenceDoc: transfer.transferNumber,
        reason: `Entrada por Transferência ${transfer.transferNumber} (Código Validado)`,
        operatorId: currentUser?.id || 'user-1',
      });
    }

    stockRef.current = currentStockList;
    setStock(currentStockList);
    saveToStorage('stock', currentStockList);
    offlineDB.cacheStock(currentStockList).catch(() => {});
    if (updatedStockItems.length > 0) {
      pushBatchRecordsToSupabase('stock', 'upsert', updatedStockItems);
    }

    // 5. Concluir a Transferência
    const updatedTransfers = stockTransfersRef.current.map((t) => {
      if (t.id !== transferId) return t;
      return {
        ...t,
        status: 'CONCLUIDO' as StockTransferStatus,
        receivedBy: currentUser?.id || 'user-1',
        receivedByName: currentUser?.name || 'Operador',
        receivedByIp: '192.168.2.112 (Terminal Destino)',
        completedAt: new Date().toISOString(),
      };
    });

    stockTransfersRef.current = updatedTransfers;
    setStockTransfers(updatedTransfers);
    saveToStorage('stockTransfers', updatedTransfers);

    emitEvent('Stock', 'stock.transfer.completed', {
      transferNumber: transfer.transferNumber,
      destinationWarehouseId: transfer.destinationWarehouseId,
    });
    sound.playSuccessChime();
    notify(`Transferência ${transfer.transferNumber} concluída! Stock creditado na loja destino com sucesso.`, 'success');

    return { success: true };
  };

  // 5. REJEIÇÃO: Origem rejeita a solicitação pendente
  const rejectStockTransfer = async (transferId: string, reason?: string) => {
    const updated = stockTransfersRef.current.map((t) => {
      if (t.id !== transferId) return t;
      return {
        ...t,
        status: 'REJEITADO' as StockTransferStatus,
        rejectionReason: reason || 'Rejeitado pelo operador de origem',
        rejectedAt: new Date().toISOString(),
      };
    });
    stockTransfersRef.current = updated;
    setStockTransfers(updated);
    saveToStorage('stockTransfers', updated);
    notify(`Transferência rejeitada com sucesso.`, 'info');
  };

  // 6. CANCELAMENTO COM ESTORNO DE STOCK (Se já estava APROVADO)
  const cancelStockTransfer = async (transferId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    const transfer = stockTransfersRef.current.find((t) => t.id === transferId);
    if (!transfer) return { success: false, error: 'Transferência não encontrada.' };

    const compId = currentCompanyRef.current?.id || currentCompany?.id || 'comp-1';

    // Se estava APROVADO, o stock foi retirado da origem -> ESTORNAR!
    if (transfer.status === 'APROVADO') {
      const currentStockList = (stockRef.current && stockRef.current.length > 0 ? stockRef.current : stock).map(
        (s) => ({
          ...s,
          quantity: Number(s.quantity) || 0,
          reserved: Number(s.reserved) || 0,
          avgCost: Number(s.avgCost) || 0,
        })
      );

      const updatedStockItems: StockItem[] = [];

      for (const item of transfer.items) {
        const qty = item.quantityApproved !== undefined ? item.quantityApproved : item.quantityRequested;
        const fromItem = currentStockList.find(
          (s) => s.productId === item.productId && s.warehouseId === transfer.originWarehouseId
        );
        if (fromItem) {
          fromItem.quantity += qty;
          updatedStockItems.push({ ...fromItem });
        }

        const prod = products.find((p) => p.id === item.productId);
        recordStockMovement({
          companyId: compId,
          type: 'entrada',
          productId: item.productId,
          originWarehouseId: transfer.destinationWarehouseId,
          targetWarehouseId: transfer.originWarehouseId,
          quantity: qty,
          unitCost: prod?.costPrice || 0,
          referenceDoc: transfer.transferNumber,
          reason: `Estorno de Transferência ${transfer.transferNumber} (Cancelada)`,
          operatorId: currentUser?.id || 'user-1',
        });
      }

      stockRef.current = currentStockList;
      setStock(currentStockList);
      saveToStorage('stock', currentStockList);
      offlineDB.cacheStock(currentStockList).catch(() => {});
      if (updatedStockItems.length > 0) {
        pushBatchRecordsToSupabase('stock', 'upsert', updatedStockItems);
      }
    }

    const updated = stockTransfersRef.current.map((t) => {
      if (t.id !== transferId) return t;
      return {
        ...t,
        status: 'CANCELADO' as StockTransferStatus,
        rejectionReason: reason || 'Cancelado',
        cancelledAt: new Date().toISOString(),
      };
    });

    stockTransfersRef.current = updated;
    setStockTransfers(updated);
    saveToStorage('stockTransfers', updated);
    notify(`Transferência ${transfer.transferNumber} cancelada${transfer.status === 'APROVADO' ? ' e stock devolvido à origem' : ''}.`, 'info');
    return { success: true };
  };

  const deductStockForItems = (
    items: Array<{ productId: string; quantity: number; unitPrice?: number }>,
    warehouseId?: string,
    referenceDoc?: string,
    reason?: string,
    customTimestamp?: string
  ) => {
    if (!items || items.length === 0) return;

    const compId = currentCompanyRef.current?.id || currentCompany?.id || 'comp-1';
    const companyWarehouses = warehouses.filter((w) => w.companyId === compId);
    const companyWhIds = new Set(companyWarehouses.map((w) => w.id));
    const targetWhId =
      warehouseId ||
      currentStore?.defaultWarehouseId ||
      companyWarehouses[0]?.id ||
      warehouses[0]?.id ||
      'wh-default';

    // Synchronous authoritative clone of current stock
    const currentStockList = (stockRef.current && stockRef.current.length > 0 ? stockRef.current : stock).map(
      (s) => ({
        ...s,
        quantity: Number(s.quantity) || 0,
        reserved: Number(s.reserved) || 0,
        avgCost: Number(s.avgCost) || 0,
      })
    );

    const affectedStockMap = new Map<string, StockItem>();
    const newMovements: StockMovement[] = [];
    const nowIso = customTimestamp || new Date().toISOString();
    const opId = currentUser?.id || 'user-1';

    items.forEach((item) => {
      if (!item.productId || item.productId.startsWith('custom-')) return;
      let qtyToDeduct = Number(item.quantity) || 0;
      if (qtyToDeduct <= 0) return;

      const prod = products.find((p) => p.id === item.productId);
      const unitCost = Number(item.unitPrice || prod?.costPrice || 0);

      // Phase 1: Deduct from all matching stock records in the target warehouse
      const targetRows = currentStockList.filter(
        (s) => s.productId === item.productId && s.warehouseId === targetWhId
      );

      for (const targetStock of targetRows) {
        if (qtyToDeduct <= 0) break;
        if (targetStock.quantity > 0) {
          const deductAmount = Math.min(targetStock.quantity, qtyToDeduct);
          targetStock.quantity = Math.max(0, targetStock.quantity - deductAmount);
          targetStock.companyId = targetStock.companyId || compId;
          affectedStockMap.set(targetStock.id, { ...targetStock });
          qtyToDeduct -= deductAmount;

          const seqP1 = Math.floor(1000 + Math.random() * 9000);
          newMovements.push({
            id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            movementNumber: `MOV-${nowIso.replace(/[-:T.Z]/g, '').slice(0, 14)}-${seqP1}`,
            companyId: compId,
            type: 'saida',
            productId: item.productId,
            originWarehouseId: targetWhId,
            quantity: deductAmount,
            unitCost,
            referenceDoc: referenceDoc || 'Venda',
            reason: reason || 'Venda / Saída de stock',
            operatorId: opId,
            timestamp: nowIso,
            date: nowIso,
            createdAt: nowIso,
          });
        }
      }

      // Phase 2: If remaining quantity > 0, deduct from other company warehouses with stock
      if (qtyToDeduct > 0) {
        const otherStockWithQty = currentStockList
          .filter(
            (s) =>
              s.productId === item.productId &&
              s.warehouseId !== targetWhId &&
              s.quantity > 0 &&
              (s.companyId === compId || companyWhIds.has(s.warehouseId) || !s.companyId)
          )
          .sort((a, b) => b.quantity - a.quantity);

        for (const otherStock of otherStockWithQty) {
          if (qtyToDeduct <= 0) break;
          const deductFromOther = Math.min(otherStock.quantity, qtyToDeduct);
          otherStock.quantity = Math.max(0, otherStock.quantity - deductFromOther);
          otherStock.companyId = otherStock.companyId || compId;
          affectedStockMap.set(otherStock.id, { ...otherStock });
          qtyToDeduct -= deductFromOther;

          const whName = warehouses.find((w) => w.id === otherStock.warehouseId)?.name || otherStock.warehouseId;
          const seqP2 = Math.floor(1000 + Math.random() * 9000);
          newMovements.push({
            id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            movementNumber: `MOV-${nowIso.replace(/[-:T.Z]/g, '').slice(0, 14)}-${seqP2}`,
            companyId: compId,
            type: 'saida',
            productId: item.productId,
            originWarehouseId: otherStock.warehouseId,
            quantity: deductFromOther,
            unitCost,
            referenceDoc: referenceDoc || 'Venda',
            reason: `${reason || 'Venda'} (Armazém: ${whName})`,
            operatorId: opId,
            timestamp: nowIso,
            date: nowIso,
            createdAt: nowIso,
          });
        }
      }

      // Phase 3: If still remaining quantity to deduct (stock was 0 or deficit sale),
      // strictly record the deficit and ensure the preferred warehouse reflects 0
      if (qtyToDeduct > 0) {
        let preferredStk = currentStockList.find(
          (s) => s.productId === item.productId && s.warehouseId === targetWhId
        );
        if (!preferredStk) {
          preferredStk = {
            id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            companyId: compId,
            productId: item.productId,
            warehouseId: targetWhId,
            quantity: 0,
            reserved: 0,
            avgCost: unitCost,
          };
          currentStockList.push(preferredStk);
        } else {
          preferredStk.quantity = 0;
          preferredStk.companyId = preferredStk.companyId || compId;
        }
        affectedStockMap.set(preferredStk.id, { ...preferredStk });

        const seqP3 = Math.floor(1000 + Math.random() * 9000);
        newMovements.push({
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          movementNumber: `MOV-${nowIso.replace(/[-:T.Z]/g, '').slice(0, 14)}-${seqP3}`,
          companyId: compId,
          type: 'saida',
          productId: item.productId,
          originWarehouseId: targetWhId,
          quantity: qtyToDeduct,
          unitCost,
          referenceDoc: referenceDoc || 'Venda',
          reason: `${reason || 'Venda'} (Saída em rutura/sem stock)`,
          operatorId: opId,
          timestamp: nowIso,
          date: nowIso,
          createdAt: nowIso,
        });
      }
    });

    const affectedStockList = Array.from(affectedStockMap.values());

    // 1. Immediately apply to synchronized ref and React state
    stockRef.current = currentStockList;
    setStock(currentStockList);
    saveToStorage('stock', currentStockList);
    offlineDB.cacheStock(currentStockList).catch(() => {});

    // 2. Immediately record stock movements
    if (newMovements.length > 0) {
      setStockMovements((prev) => {
        const updatedMovements = [...newMovements, ...prev];
        stockMovementsRef.current = updatedMovements;
        saveToStorage('stockMovements', updatedMovements);
        return updatedMovements;
      });
    }

    // 3. Decrement lots if applicable
    setLots((lotPrev) => {
      let updatedLots = [...lotPrev];
      items.forEach((item) => {
        if (!item.productId || item.productId.startsWith('custom-')) return;
        let qtyToDeduct = Number(item.quantity) || 0;
        if (qtyToDeduct <= 0) return;
        for (let i = 0; i < updatedLots.length; i++) {
          if (updatedLots[i].productId === item.productId && updatedLots[i].currentQuantity > 0) {
            const dec = Math.min(updatedLots[i].currentQuantity, qtyToDeduct);
            updatedLots[i] = {
              ...updatedLots[i],
              currentQuantity: Math.max(0, updatedLots[i].currentQuantity - dec),
            };
            qtyToDeduct -= dec;
            if (qtyToDeduct <= 0) break;
          }
        }
      });
      saveToStorage('lots', updatedLots);
      return updatedLots;
    });

    // 4. Push updated stock to Supabase immediately
    if (affectedStockList.length > 0) {
      pushBatchRecordsToSupabase('stock', 'upsert', affectedStockList);
    }
  };

  const replenishStockForItems = (
    items: Array<{ productId: string; quantity: number; unitPrice?: number }>,
    warehouseId?: string,
    referenceDoc?: string,
    reason?: string,
    customTimestamp?: string
  ) => {
    if (!items || items.length === 0) return;

    const compId = currentCompanyRef.current?.id || currentCompany?.id || 'comp-1';
    const targetWhId =
      warehouseId ||
      currentStore?.defaultWarehouseId ||
      warehouses.find((w) => w.companyId === compId)?.id ||
      warehouses[0]?.id ||
      'wh-default';

    const currentStockList = (stockRef.current && stockRef.current.length > 0 ? stockRef.current : stock).map(
      (s) => ({
        ...s,
        quantity: Number(s.quantity) || 0,
        reserved: Number(s.reserved) || 0,
        avgCost: Number(s.avgCost) || 0,
      })
    );

    const affectedStockMap = new Map<string, StockItem>();
    const newMovements: StockMovement[] = [];
    const nowIso = customTimestamp || new Date().toISOString();
    const opId = currentUser?.id || 'user-1';

    items.forEach((item) => {
      if (!item.productId || item.productId.startsWith('custom-')) return;
      const qtyToAdd = Number(item.quantity) || 0;
      if (qtyToAdd <= 0) return;

      const prod = products.find((p) => p.id === item.productId);
      const unitCost = Number(item.unitPrice || prod?.costPrice || 0);

      let stk = currentStockList.find(
        (s) => s.productId === item.productId && s.warehouseId === targetWhId
      );

      if (stk) {
        stk.quantity = stk.quantity + qtyToAdd;
        stk.companyId = stk.companyId || compId;
        affectedStockMap.set(stk.id, { ...stk });
      } else {
        const newStk: StockItem = {
          id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          companyId: compId,
          productId: item.productId,
          warehouseId: targetWhId,
          quantity: qtyToAdd,
          reserved: 0,
          avgCost: prod?.costPrice || item.unitPrice || 0,
        };
        currentStockList.push(newStk);
        affectedStockMap.set(newStk.id, newStk);
      }

      const seqRep = Math.floor(1000 + Math.random() * 9000);
      newMovements.push({
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        movementNumber: `MOV-${nowIso.replace(/[-:T.Z]/g, '').slice(0, 14)}-${seqRep}`,
        companyId: compId,
        type: 'devolucao',
        productId: item.productId,
        targetWarehouseId: targetWhId,
        quantity: qtyToAdd,
        unitCost,
        referenceDoc: referenceDoc || 'Devolução/Estorno',
        reason: reason || 'Devolução de stock por estorno',
        operatorId: opId,
        timestamp: nowIso,
        date: nowIso,
        createdAt: nowIso,
      });
    });

    const affectedStockList = Array.from(affectedStockMap.values());

    stockRef.current = currentStockList;
    setStock(currentStockList);
    saveToStorage('stock', currentStockList);
    offlineDB.cacheStock(currentStockList).catch(() => {});

    if (newMovements.length > 0) {
      setStockMovements((prev) => {
        const updatedMovements = [...newMovements, ...prev];
        stockMovementsRef.current = updatedMovements;
        saveToStorage('stockMovements', updatedMovements);
        return updatedMovements;
      });
    }

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
      saveToStorage('lots', updatedLots);
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
      // 1. Flush the general pending Supabase queue (includes produtos, stock, etc.)
      const flushedCount = await flushPendingSyncQueue();

      // 2. Process IndexedDB sync queue
      const idbQueue = await offlineDB.getPendingSyncQueue();
      const combinedQueue = [...syncQueue];
      idbQueue.forEach((idbItem) => {
        if (!combinedQueue.some((q) => q.id === idbItem.id)) {
          combinedQueue.push(idbItem);
        }
      });

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
        } else if (item.action === 'create_product') {
          await offlineDB.removeSyncQueueItem(item.id);
        }
      }

      setSyncQueue([]);
      await refreshDBStats();
      sound.playSuccessChime();

      const totalSynced = flushedCount + combinedQueue.length;
      if (totalSynced > 0) {
        notify(`Sincronização concluída: ${totalSynced} operações sincronizadas com o servidor.`, 'success');
      }
    } catch (e) {
      console.error('Sync failed:', e);
      emitEvent('POS', 'sync.failed', {
        error: String(e),
        timestamp: new Date().toISOString(),
      });
      notify('Sincronização offline pendente: os dados estão salvos e serão reenviados assim que a ligação estabilizar.', 'warning');
    } finally {
      setIsSyncing(false);
    }
  };

  // ==================== POS & GESTÃO DE TURNOS ====================
  const addShiftType = useCallback((typeData: Omit<ShiftType, 'id'>) => {
    const newId = `shift-type-${Date.now()}`;
    const newType: ShiftType = {
      ...typeData,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    setShiftTypes((prev) => {
      let updated = [...prev];
      if (newType.isDefault) {
        updated = updated.map((t) => ({ ...t, isDefault: false }));
      }
      updated.push(newType);
      saveToStorage('shiftTypes', updated);
      return updated;
    });
    notify(`Tipo de turno "${newType.name}" criado com sucesso!`, 'success');
  }, [notify]);

  const updateShiftType = useCallback((id: string, updates: Partial<ShiftType>) => {
    setShiftTypes((prev) => {
      const updated = prev.map((t) => {
        if (t.id === id) {
          return { ...t, ...updates };
        }
        if (updates.isDefault && t.id !== id) {
          return { ...t, isDefault: false };
        }
        return t;
      });
      saveToStorage('shiftTypes', updated);
      return updated;
    });
    notify('Definições do tipo de turno atualizadas com sucesso!', 'success');
  }, [notify]);

  const deleteShiftType = useCallback((id: string) => {
    setShiftTypes((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      if (target.isDefault && prev.length > 1) {
        notify('Não é possível excluir o turno padrão ativo. Defina outro turno como padrão antes.', 'warning');
        return prev;
      }
      const updated = prev.filter((t) => t.id !== id);
      if (updated.length > 0 && !updated.some((t) => t.isDefault)) {
        updated[0].isDefault = true;
      }
      saveToStorage('shiftTypes', updated);
      notify(`Tipo de turno "${target.name}" removido com sucesso.`, 'info');
      return updated;
    });
  }, [notify]);

  const setDefaultShiftType = useCallback((id: string) => {
    setShiftTypes((prev) => {
      const updated = prev.map((t) => ({
        ...t,
        isDefault: t.id === id,
      }));
      saveToStorage('shiftTypes', updated);
      const chosen = updated.find((t) => t.id === id);
      notify(`Turno padrão alterado para "${chosen?.name || 'Turno Selecionado'}".`, 'success');
      return updated;
    });
  }, [notify]);

  const openShift = (initialCash: number, shiftTypeId?: string) => {
    const safeInitialCash = Math.max(0, Number(initialCash) || 0);
    const chosenType = shiftTypes.find((s) => s.id === shiftTypeId) || defaultShiftType;
    const now = new Date();
    const plannedHours = chosenType?.durationHours ?? 8;
    const expectedClose = plannedHours > 0
      ? new Date(now.getTime() + plannedHours * 60 * 60 * 1000).toISOString()
      : undefined;

    const shift: CashShift = {
      id: `shift-${Date.now()}`,
      companyId: currentCompany.id,
      storeId: currentStore.id,
      terminalId: currentTerminal.id,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      openedAt: now.toISOString(),
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
      shiftTypeId: chosenType?.id,
      shiftTypeName: chosenType?.name,
      plannedDurationHours: plannedHours,
      expectedCloseAt: expectedClose,
    };
    // Fechar previamente qualquer turno que possa ter ficado como aberto órfão no Supabase
    closeAllOpenShiftsInSupabase(currentCompany.id, now.toISOString());
    setActiveShift(shift);
    saveToStorage('activeShift', shift);
    pushRecordToSupabase('turnos_caixa', 'upsert', shift);
    emitEvent('POS', 'pos.shift.opened', {
      shiftId: shift.id,
      terminal: currentTerminal.code,
      operator: currentUser.name,
      initialCash: safeInitialCash,
      shiftType: chosenType?.name,
      plannedHours,
    });
    sound.playSuccessChime();
    notify(
      `Caixa aberto com sucesso (${chosenType?.name || 'Turno'}). Fundo Inicial: ${formatCurrency(safeInitialCash)}. Pronto para vendas!`,
      'success'
    );
  };

  const closeShift = (notesOrCounted?: string | number, notes?: string) => {
    if (!activeShift) return null;
    const counted = typeof notesOrCounted === 'number' ? notesOrCounted : undefined;
    const noteText = typeof notesOrCounted === 'string' ? notesOrCounted : (notes || '');
    const expectedCash =
      activeShift.initialCash +
      activeShift.totalCash -
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

    // 1. Limpar o caixa imediatamente no dispositivo local
    setActiveShift(null);
    saveToStorage('activeShift', null);

    // 2. Atualizar o histórico local
    setShiftsHistory((prev) => [
      closed,
      ...prev.map((s) =>
        s.companyId === closed.companyId && s.status === 'aberto'
          ? { ...s, status: 'fechado' as const, closedAt: closed.closedAt }
          : s
      ),
    ]);

    // 3. Enviar o turno fechado para o Supabase
    pushRecordToSupabase('turnos_caixa', 'upsert', closed);

    // 4. Fechar em definitivo quaisquer turnos abertos desta empresa no Supabase
    // Isso garante que nenhum outro dispositivo que consulte o Supabase encontre um turno aberto!
    closeAllOpenShiftsInSupabase(closed.companyId, closed.closedAt);

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

  const syncActiveShiftWithTodaySales = useCallback(() => {
    if (!activeShift) {
      notify('Não há sessão de caixa aberta para sincronizar.', 'warning');
      return;
    }

    const todayStr = getTodayDateStr();
    const newTotals = calculateShiftSalesTotals(activeShift, salesHistory);

    const updatedShift: CashShift = {
      ...activeShift,
      totalSales: newTotals.totalSales,
      totalCash: newTotals.totalCash,
      totalCards: newTotals.totalCards,
      totalMbway: newTotals.totalMbway,
      totalTransfers: newTotals.totalTransfers,
      totalVouchers: newTotals.totalVouchers,
    };

    // Atribui o shiftId a essas vendas de hoje se não tiverem
    setSalesHistory((prev) => {
      const mapped = prev.map((s) => {
        if (s.date && s.date.substring(0, 10) === todayStr && (!s.shiftId || s.shiftId === 'no-shift')) {
          return { ...s, shiftId: activeShift.id };
        }
        return s;
      });
      saveToStorage('salesHistory', mapped);
      return mapped;
    });

    setActiveShift(updatedShift);
    saveToStorage('activeShift', updatedShift);
    pushRecordToSupabase('turnos_caixa', 'upsert', updatedShift);
    sound.playSuccessChime();
    notify(
      `Caixa sincronizada! Vendas reconciliadas com sucesso (${formatCurrency(newTotals.totalSales)}).`,
      'success'
    );
  }, [activeShift, salesHistory, notify]);

  const getAvailableStock = useCallback(
    (productId: string, warehouseId?: string): number => {
      if (!productId || productId.startsWith('custom-')) return 999999;
      const compId = currentCompanyRef.current?.id || currentCompany?.id || 'comp-1';
      const companyWarehouses = warehouses.filter((w) => w.companyId === compId);
      const companyWhIds = new Set(companyWarehouses.map((w) => w.id));

      const targetWhId =
        warehouseId ||
        currentStore?.defaultWarehouseId ||
        companyWarehouses[0]?.id;

      const currentStockList = (stockRef.current && stockRef.current.length > 0 ? stockRef.current : stock);

      // 1. If warehouse was explicitly provided or determined from store
      if (targetWhId) {
        const matchingTargetItems = currentStockList.filter(
          (s) => s.productId === productId && s.warehouseId === targetWhId
        );
        if (matchingTargetItems.length > 0) {
          const whAvailable = matchingTargetItems.reduce(
            (sum, s) => sum + Math.max(0, (Number(s.quantity) || 0) - (Number(s.reserved) || 0)),
            0
          );
          return Math.max(0, whAvailable);
        }
      }

      // 2. If no record exists for that warehouse, aggregate across all company warehouses
      const allCompanyItems = currentStockList.filter(
        (s) =>
          s.productId === productId &&
          (s.companyId === compId || companyWhIds.has(s.warehouseId) || companyWhIds.size === 0)
      );

      if (allCompanyItems.length > 0) {
        const totalAvailable = allCompanyItems.reduce(
          (sum, s) => sum + Math.max(0, (Number(s.quantity) || 0) - (Number(s.reserved) || 0)),
          0
        );
        return Math.max(0, totalAvailable);
      }

      return 0;
    },
    [stock, currentStore?.defaultWarehouseId, warehouses, currentCompany?.id]
  );

  const setPosVatMode = (mode: VatMode) => {
    setPosVatModeState(mode);
    saveToStorage('pos_vat_mode', mode);
    setCart((prev) =>
      prev.map((item) => {
        const discountPct = Number(item.discountPercent ?? item.discount ?? 0);
        const unitPrice = Number(item.unitPrice || 0);
        const rate = typeof item.taxRate === 'number' ? item.taxRate : posDefaultTaxRate;
        const calc = computeCartItemTotals(unitPrice, item.quantity, discountPct, rate, mode);
        return {
          ...item,
          vatMode: mode,
          taxAmount: calc.taxAmount,
          total: calc.total,
          discountAmount: calc.discountAmount,
        };
      })
    );
  };

  const setPosDefaultTaxRate = (rate: number) => {
    setPosDefaultTaxRateState(rate);
    saveToStorage('pos_default_tax_rate', rate);
  };

  const updateCartTaxRate = (productId: string, taxRate: number) => {
    updateCartItemVat(productId, taxRate);
  };

  const updateCartItemVat = (productId: string, taxRate: number, itemVatMode?: VatMode) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const mode = itemVatMode || item.vatMode || posVatMode;
          const discountPct = Number(item.discountPercent ?? item.discount ?? 0);
          const unitPrice = Number(item.unitPrice || 0);
          const calc = computeCartItemTotals(unitPrice, item.quantity, discountPct, taxRate, mode);
          return {
            ...item,
            taxRate,
            vatMode: mode,
            taxAmount: calc.taxAmount,
            total: calc.total,
            discountAmount: calc.discountAmount,
          };
        }
        return item;
      })
    );
  };

  const applyVatRateToCart = (taxRate: number, modeOverride?: VatMode) => {
    const targetMode = modeOverride || posVatMode;
    setCart((prev) =>
      prev.map((item) => {
        const discountPct = Number(item.discountPercent ?? item.discount ?? 0);
        const unitPrice = Number(item.unitPrice || 0);
        const calc = computeCartItemTotals(unitPrice, item.quantity, discountPct, taxRate, targetMode);
        return {
          ...item,
          taxRate,
          vatMode: targetMode,
          taxAmount: calc.taxAmount,
          total: calc.total,
          discountAmount: calc.discountAmount,
        };
      })
    );
  };

  const addToCart = (product: Product, quantity = 1, customTaxRate?: number, customVatMode?: VatMode) => {
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
      const mode = customVatMode || posVatMode;
      const targetTaxRate =
        typeof customTaxRate === 'number'
          ? customTaxRate
          : typeof product.taxRate === 'number'
          ? product.taxRate
          : typeof currentCompany?.defaultTaxRate === 'number'
          ? currentCompany.defaultTaxRate
          : posDefaultTaxRate;

      if (idx >= 0) {
        const item = prev[idx];
        const newQty = targetQty;
        const discountPct = Number(item.discountPercent ?? item.discount ?? 0);
        const unitPrice = Number(item.unitPrice || product.price || 0);
        const rate = typeof item.taxRate === 'number' ? item.taxRate : targetTaxRate;
        const itemMode = item.vatMode || mode;
        const calc = computeCartItemTotals(unitPrice, newQty, discountPct, rate, itemMode);

        const updated = [...prev];
        updated[idx] = {
          ...item,
          quantity: newQty,
          unitPrice,
          taxRate: rate,
          taxAmount: calc.taxAmount,
          discountPercent: discountPct,
          discount: discountPct,
          discountAmount: calc.discountAmount,
          total: calc.total,
          vatMode: itemMode,
        };
        return updated;
      }

      const unitPrice = Number(product.price || 0);
      const calc = computeCartItemTotals(unitPrice, quantity, 0, targetTaxRate, mode);

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity,
          unitPrice,
          taxRate: targetTaxRate,
          taxAmount: calc.taxAmount,
          discountPercent: 0,
          discount: 0,
          discountAmount: 0,
          total: calc.total,
          vatMode: mode,
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
          const rate = typeof item.taxRate === 'number' ? item.taxRate : posDefaultTaxRate;
          const mode = item.vatMode || posVatMode;
          const calc = computeCartItemTotals(unitPrice, newQty, discountPct, rate, mode);
          return {
            ...item,
            quantity: newQty,
            discountPercent: discountPct,
            discount: discountPct,
            discountAmount: calc.discountAmount,
            taxAmount: calc.taxAmount,
            total: calc.total,
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
          const rate = typeof item.taxRate === 'number' ? item.taxRate : posDefaultTaxRate;
          const mode = item.vatMode || posVatMode;
          const calc = computeCartItemTotals(unitPrice, item.quantity, discountPct, rate, mode);
          return {
            ...item,
            discount: discountPct,
            discountPercent: discountPct,
            discountAmount: calc.discountAmount,
            taxAmount: calc.taxAmount,
            total: calc.total,
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
    paymentMethods: PaymentRecord[],
    invoiceType: InvoiceType = 'FS',
    customerTaxNumber?: string,
    customerName?: string,
    customerPhone?: string,
    customerAddress?: string,
    saleVatMode?: VatMode
  ): Promise<Sale> => {
    if (!cart || cart.length === 0) throw new Error('Carrinho vazio');

    const currentVatMode = saleVatMode || posVatMode;
    const subtotalRaw = cart.reduce((acc, item) => acc + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
    const itemDiscounts = cart.reduce((acc, item) => acc + Number(item.discountAmount || 0), 0);
    const globalDiscountAmt = ((subtotalRaw - itemDiscounts) * Number(globalDiscount || 0)) / 100;
    const totalDiscount = Number((itemDiscounts + globalDiscountAmt).toFixed(2));
    const netBase = Math.max(0, subtotalRaw - totalDiscount);

    let subtotal = Number(subtotalRaw.toFixed(2));
    let taxTotal = 0;
    let finalTotal = 0;

    const globalDiscountFactor = 1 - Number(globalDiscount || 0) / 100;
    const taxSummary: Record<number, { base: number; tax: number }> = {};

    if (currentVatMode === 'acrescido') {
      // Preço é valor líquido sem IVA. O IVA SOMA ao total da fatura!
      cart.forEach((i) => {
        const rate = typeof i.taxRate === 'number' ? i.taxRate : posDefaultTaxRate;
        const itemNetBase = Math.max(0, Number(i.unitPrice || 0) * Number(i.quantity || 0) - Number(i.discountAmount || 0)) * globalDiscountFactor;
        const itemTax = Number(((itemNetBase * rate) / 100).toFixed(2));
        if (!taxSummary[rate]) taxSummary[rate] = { base: 0, tax: 0 };
        taxSummary[rate].base += itemNetBase;
        taxSummary[rate].tax += itemTax;
      });
      taxTotal = Object.values(taxSummary).reduce((acc, t) => acc + t.tax, 0);
      taxTotal = Number(taxTotal.toFixed(2));
      finalTotal = Number((netBase + taxTotal).toFixed(2));
      subtotal = Number(subtotalRaw.toFixed(2));
    } else if (currentVatMode === 'isento') {
      taxTotal = 0;
      finalTotal = Math.max(0, Number((subtotalRaw - totalDiscount).toFixed(2)));
      subtotal = Number(subtotalRaw.toFixed(2));
    } else {
      // 'incluido': Preço tem IVA incluído (PVP)
      cart.forEach((i) => {
        const rate = typeof i.taxRate === 'number' ? i.taxRate : posDefaultTaxRate;
        const itemGross = Math.max(0, Number(i.unitPrice || 0) * Number(i.quantity || 0) - Number(i.discountAmount || 0)) * globalDiscountFactor;
        const itemBase = rate > 0 ? itemGross / (1 + rate / 100) : itemGross;
        const itemTax = itemGross - itemBase;
        if (!taxSummary[rate]) taxSummary[rate] = { base: 0, tax: 0 };
        taxSummary[rate].base += itemBase;
        taxSummary[rate].tax += itemTax;
      });
      taxTotal = Object.values(taxSummary).reduce((acc, t) => acc + t.tax, 0);
      taxTotal = Number(taxTotal.toFixed(2));
      finalTotal = Math.max(0, Number((subtotalRaw - totalDiscount).toFixed(2)));
      subtotal = Number((finalTotal - taxTotal).toFixed(2));
    }

    const dateStr = new Date().toISOString();

    const seq = salesHistory.length + 1;
    const invType = invoiceType || 'FS';
    const invNumber = `${invType} 2026/${String(seq).padStart(4, '0')}`;
    const prevSale = salesHistory[0];
    const prevHash = prevSale ? prevSale.fiscalHash : '';
    const fiscalHash = generateFiscalHash(dateStr, invNumber, finalTotal, prevHash);

    const totalPaid = paymentMethods.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalTendered = paymentMethods.reduce(
      (sum, p) => sum + Number(p.tenderedAmount !== undefined ? p.tenderedAmount : p.amount || 0),
      0
    );
    const explicitChange = paymentMethods.reduce((sum, p) => sum + Number(p.changeAmount || 0), 0);
    const changeAmount = Math.max(0, explicitChange || Number((totalTendered - finalTotal).toFixed(2)) || Number((totalPaid - finalTotal).toFixed(2)));

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
      vatMode: currentVatMode,
      changeAmount,
      payments: paymentMethods.map((p) => {
        const rawAmount = Number(p.amount || 0);
        // Ensure applied amount strictly matches invoice value, never inflated by tendered cash
        const safeAmount = finalTotal > 0 ? Math.min(rawAmount, finalTotal) : rawAmount;
        const pTendered = p.tenderedAmount !== undefined ? Number(p.tenderedAmount) : (p.method === 'dinheiro' && rawAmount > finalTotal ? rawAmount : safeAmount);
        const pChange = p.changeAmount !== undefined ? Number(p.changeAmount) : Math.max(0, Number((pTendered - safeAmount).toFixed(2)));

        return {
          id: p.id || `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          method: p.method as any,
          amount: safeAmount,
          tenderedAmount: pTendered,
          changeAmount: pChange,
          reference: p.reference,
          status: 'concluido',
        };
      }),
      customerNif: customerTaxNumber || selectedCustomer?.taxNumber || '999999990',
      customerTaxNumber: customerTaxNumber || selectedCustomer?.taxNumber || '999999990',
      customerName: customerName || selectedCustomer?.name || 'Consumidor Final',
      customerPhone: customerPhone || selectedCustomer?.phone || undefined,
      customerAddress: customerAddress || selectedCustomer?.address || undefined,
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
      `Venda a balcão POS (${invNumber})`,
      dateStr
    );

    // 2. Update Active Shift stats
    if (activeShift) {
      // For cash in drawer, add net cash that stays in drawer for this sale (capped at finalTotal)
      const cashAmt = paymentMethods
        .filter((p) => (p.method as string) === 'dinheiro' || (p.method as string) === 'numerario')
        .reduce((sum, p) => sum + Math.min(Number(p.amount || 0), finalTotal), 0);
      const cardAmt = paymentMethods
        .filter((p) => (p.method as string) === 'cartao' || (p.method as string) === 'tpa')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const mbwayAmt = paymentMethods
        .filter((p) => (p.method as string) === 'mbway' || (p.method as string) === 'mpesa' || (p.method as string) === 'emola')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const transferAmt = paymentMethods
        .filter((p) => (p.method as string) === 'transferencia')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const voucherAmt = paymentMethods
        .filter((p) => (p.method as string) === 'vale' || (p.method as string) === 'voucher')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const updatedShift: CashShift = {
        ...activeShift,
        totalSales: Number(activeShift.totalSales || 0) + finalTotal,
        totalCash: Number(activeShift.totalCash || 0) + cashAmt,
        totalCards: Number(activeShift.totalCards || 0) + cardAmt,
        totalMbway: Number(activeShift.totalMbway || 0) + mbwayAmt,
        totalTransfers: Number(activeShift.totalTransfers || 0) + transferAmt,
        totalVouchers: Number(activeShift.totalVouchers || 0) + voucherAmt,
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

  const registerDocSaleInShift = (amount: number, paymentMethod: string = 'dinheiro') => {
    if (!activeShift || amount <= 0) return;
    const isCash = paymentMethod === 'dinheiro';
    const isCard = paymentMethod === 'cartao' || paymentMethod === 'tpa';
    const isMbway = paymentMethod === 'mbway' || paymentMethod === 'mpesa' || paymentMethod === 'emola';

    const updatedShift: CashShift = {
      ...activeShift,
      totalSales: Number(activeShift.totalSales || 0) + amount,
      totalCash: isCash ? Number(activeShift.totalCash || 0) + amount : Number(activeShift.totalCash || 0),
      totalCards: isCard ? Number(activeShift.totalCards || 0) + amount : Number(activeShift.totalCards || 0),
      totalMbway: isMbway ? Number(activeShift.totalMbway || 0) + amount : Number(activeShift.totalMbway || 0),
    };

    setActiveShift(updatedShift);
    saveToStorage('activeShift', updatedShift);
    pushRecordToSupabase('turnos_caixa', 'upsert', updatedShift);
  };

  const addFiscalDocument = async (doc: Sale): Promise<Sale> => {
    const compId = doc.companyId || currentCompany?.id || 'comp-1';
    const storeId = doc.storeId || currentStore?.id || 'store-1';
    const termId = doc.terminalId || currentTerminal?.id || 'term-1';

    const prevSale = salesHistory[0];
    const prevHash = prevSale ? prevSale.fiscalHash : '0000000000000000';
    const fiscalHash =
      doc.fiscalHash && !doc.fiscalHash.startsWith('HASH-')
        ? doc.fiscalHash
        : generateFiscalHash(doc.date, doc.invoiceNumber, doc.total, prevHash);

    const fullDoc: Sale = {
      ...doc,
      companyId: compId,
      storeId,
      terminalId: termId,
      fiscalHash,
      previousHash: prevHash,
      atcud: doc.atcud || `ATCUD-${currentCompany?.taxNumber || '400123987'}-${doc.invoiceNumber}`,
      isSynced: isOnline,
    };

    // 1. Atomically persist to salesHistory state & localStorage
    setSalesHistory((prev) => {
      const updated = [fullDoc, ...prev.filter((s) => s.id !== fullDoc.id)];
      saveToStorage('salesHistory', updated);
      return updated;
    });

    // 2. Persist to Supabase
    pushRecordToSupabase('vendas', 'insert', fullDoc);

    // 3. Persist to IndexedDB offline storage
    try {
      await offlineDB.saveSale(fullDoc);
    } catch (e) {
      console.warn('Could not save to IndexedDB', e);
    }

    // 4. Enqueue for background sync if offline
    if (!isOnline) {
      const syncItem: OfflineSyncQueueItem = {
        id: `sync-${Date.now()}`,
        action: 'create_sale',
        entity: 'Sale',
        data: fullDoc,
        timestamp: fullDoc.date,
        retryCount: 0,
        status: 'pending',
      };
      setSyncQueue((prev) => [...prev, syncItem]);
      await offlineDB.addSyncQueueItem(syncItem);
      requestBackgroundSync();
    }

    // 5. Emit audit event
    emitEvent('Financeiro', 'document.emitted', {
      invoiceNumber: fullDoc.invoiceNumber,
      invoiceType: fullDoc.invoiceType,
      total: fullDoc.total,
      customer: fullDoc.customerName,
      fiscalHash: fullDoc.fiscalHash,
    });

    return fullDoc;
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

    const updatedInv: Sale = {
      ...inv,
      status: 'anulado',
      notes: `${inv.notes || ''} [ANULADO / ESTORNADO via ${ncNumber}: Motivo - ${reason}]`.trim(),
    };

    const ncSale: Sale = {
      ...inv,
      id: `sale-nc-${Date.now()}`,
      invoiceNumber: ncNumber,
      invoiceType: 'NC',
      status: 'emitido',
      shiftId: activeShift?.id || inv.shiftId || 'no-shift',
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

    const updatedHistory = [ncSale, ...salesHistory.map((s) => (s.id === inv.id ? updatedInv : s))];
    setSalesHistory(updatedHistory);
    saveToStorage('salesHistory', updatedHistory);
    pushRecordToSupabase('vendas', 'update', updatedInv);
    pushRecordToSupabase('vendas', 'insert', ncSale);

    // Instantly cancel/deduct from cash shift if an active shift is open
    if (activeShift) {
      const newTotals = calculateShiftSalesTotals(activeShift, updatedHistory);
      const updatedShift: CashShift = {
        ...activeShift,
        totalSales: newTotals.totalSales,
        totalCash: newTotals.totalCash,
        totalCards: newTotals.totalCards,
        totalMbway: newTotals.totalMbway,
        totalTransfers: newTotals.totalTransfers,
        totalVouchers: newTotals.totalVouchers,
      };
      setActiveShift(updatedShift);
      saveToStorage('activeShift', updatedShift);
      pushRecordToSupabase('turnos_caixa', 'upsert', updatedShift);
    }

    if (lastCompletedSale?.id === invoiceId) {
      setLastCompletedSale(null);
    }

    emitEvent('Financeiro', 'finance.invoice.annulled', {
      originalInvoice: inv.invoiceNumber,
      creditNote: ncNumber,
      total: inv.total,
      reason,
      restocked: restockStock,
    });
    sound.playSuccessChime();
    notify(`Fatura ${inv.invoiceNumber} anulada com sucesso. Valor cancelado/estornado do caixa.`, 'success');
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

    const updated = salesHistory.filter((s) => s.id !== id);
    setSalesHistory(updated);
    saveToStorage('salesHistory', updated);
    pushRecordToSupabase('vendas', 'delete', { id });

    // Instantly cancel/deduct from cash shift if an active shift is open
    if (activeShift) {
      const newTotals = calculateShiftSalesTotals(activeShift, updated);
      const updatedShift: CashShift = {
        ...activeShift,
        totalSales: newTotals.totalSales,
        totalCash: newTotals.totalCash,
        totalCards: newTotals.totalCards,
        totalMbway: newTotals.totalMbway,
        totalTransfers: newTotals.totalTransfers,
        totalVouchers: newTotals.totalVouchers,
      };
      setActiveShift(updatedShift);
      saveToStorage('activeShift', updatedShift);
      pushRecordToSupabase('turnos_caixa', 'upsert', updatedShift);
    }

    if (lastCompletedSale?.id === id) {
      setLastCompletedSale(null);
    }

    emitEvent('Financeiro', 'document.deleted', {
      documentId: id,
      invoiceNumber: doc.invoiceNumber,
      type: doc.invoiceType,
    });
    sound.playSuccessChime();
    notify(`Documento ${doc.invoiceNumber} eliminado com sucesso. O valor correspondente foi cancelado do caixa.`, 'success');
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

    const updated = (!idsOrScope || idsOrScope === 'all')
      ? []
      : salesHistory.filter((s) => !idsOrScope.includes(s.id));
    setSalesHistory(updated);
    saveToStorage('salesHistory', updated);

    toDelete.forEach((doc) => {
      pushRecordToSupabase('vendas', 'delete', { id: doc.id });
    });

    // Instantly cancel/deduct from cash shift if an active shift is open
    if (activeShift) {
      const newTotals = calculateShiftSalesTotals(activeShift, updated);
      const updatedShift: CashShift = {
        ...activeShift,
        totalSales: newTotals.totalSales,
        totalCash: newTotals.totalCash,
        totalCards: newTotals.totalCards,
        totalMbway: newTotals.totalMbway,
        totalTransfers: newTotals.totalTransfers,
        totalVouchers: newTotals.totalVouchers,
      };
      setActiveShift(updatedShift);
      saveToStorage('activeShift', updatedShift);
      pushRecordToSupabase('turnos_caixa', 'upsert', updatedShift);
    }

    if (lastCompletedSale && (!idsOrScope || idsOrScope === 'all' || idsOrScope.includes(lastCompletedSale.id))) {
      setLastCompletedSale(null);
    }

    emitEvent('Financeiro', 'documents.cleared', {
      count: toDelete.length,
      timestamp: new Date().toISOString(),
    });

    sound.playSuccessChime();
    notify(`${toDelete.length} documento(s) fiscal(ais) eliminado(s) com sucesso. Valores cancelados do caixa.`, 'success');
  };

  const updateDocumentStatus = (
    id: string,
    status: 'emitido' | 'anulado' | 'pago' | 'pendente' | 'aprovado' | 'recusado' | 'convertido'
  ) => {
    let updatedHistory: Sale[] = [];
    setSalesHistory((prev) => {
      updatedHistory = prev.map((doc) => {
        if (doc.id === id) {
          const updated: Sale = { ...doc, status };
          pushRecordToSupabase('vendas', 'update', updated);
          return updated;
        }
        return doc;
      });
      saveToStorage('salesHistory', updatedHistory);
      return updatedHistory;
    });

    // Instantly cancel/deduct from cash shift if an active shift is open
    if (activeShift) {
      const newTotals = calculateShiftSalesTotals(activeShift, updatedHistory);
      const updatedShift: CashShift = {
        ...activeShift,
        totalSales: newTotals.totalSales,
        totalCash: newTotals.totalCash,
        totalCards: newTotals.totalCards,
        totalMbway: newTotals.totalMbway,
        totalTransfers: newTotals.totalTransfers,
        totalVouchers: newTotals.totalVouchers,
      };
      setActiveShift(updatedShift);
      saveToStorage('activeShift', updatedShift);
      pushRecordToSupabase('turnos_caixa', 'upsert', updatedShift);
    }

    if (status === 'anulado' && lastCompletedSale?.id === id) {
      setLastCompletedSale(null);
    }

    sound.playSuccessChime();
    notify(`Estado do documento alterado para "${status}" e valores de caixa reconciliados.`, 'success');
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
      `Conversão de ${docLabel} ${quote.invoiceNumber} em ${targetType} ${newInvNumber}`,
      dateStr
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

  const payAccountPayable = (id: string, methodOrAmount?: string | number, method = 'transferencia') => {
    const finalMethod = typeof methodOrAmount === 'string' ? methodOrAmount : method;
    setAccountsPayable((prev) =>
      prev.map((ap) => {
        if (ap.id === id) {
          const updated: AccountPayable = {
            ...ap,
            status: 'pago',
            paidAmount: ap.amount,
            paymentDate: new Date().toISOString(),
            paymentMethod: finalMethod as any,
          };
          pushRecordToSupabase('contas_pagar', 'update', updated);
          return updated;
        }
        return ap;
      })
    );
    emitEvent('Financeiro', 'finance.payable.paid', { id, method: finalMethod });
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

  const receiveAccountReceivable = (id: string, amount?: number) => {
    setAccountsReceivable((prev) =>
      prev.map((ar) => {
        if (ar.id === id) {
          const newReceived = amount !== undefined ? Math.min(ar.amount, (ar.receivedAmount || 0) + amount) : ar.amount;
          const isFullyPaid = newReceived >= ar.amount;
          const updated: AccountReceivable = {
            ...ar,
            status: isFullyPaid ? 'pago' : 'parcial',
            receivedAmount: newReceived,
            receiptDate: new Date().toISOString(),
          };
          pushRecordToSupabase('contas_receber', 'update', updated);
          return updated;
        }
        return ar;
      })
    );
    emitEvent('Financeiro', 'finance.receivable.received', { id, amount });
    sound.playSuccessChime();
  };

  const addChartAccount = (acc: ChartOfAccounts) => {
    setChartOfAccounts((prev) => [...prev, acc]);
    emitEvent('Financeiro', 'finance.chart.created', { code: acc.code, name: acc.name });
    sound.playSuccessChime();
  };

  const updateChartAccount = (code: string, updates: Partial<ChartOfAccounts>) => {
    setChartOfAccounts((prev) =>
      prev.map((c) => (c.code === code || c.id === code ? { ...c, ...updates } : c))
    );
    emitEvent('Financeiro', 'finance.chart.updated', { code, updates });
    sound.playSuccessChime();
  };

  const deleteChartAccount = (code: string) => {
    setChartOfAccounts((prev) => prev.filter((c) => c.code !== code && c.id !== code));
    emitEvent('Financeiro', 'finance.chart.deleted', { code });
    sound.playSuccessChime();
  };

  const addAccount = addChartAccount;
  const updateAccount = updateChartAccount;
  const deleteAccount = deleteChartAccount;

  const addLedgerEntry = (entry: any) => {
    const entrySeq = ledgerEntries.length + 1;
    const defaultEntryNumber = `LC-2026-${String(entrySeq).padStart(3, '0')}`;
    const newEntry: LedgerEntry = {
      ...entry,
      id: `led-${Date.now()}`,
      entryNumber: entry.entryNumber || defaultEntryNumber,
    };
    setLedgerEntries((prev) => [newEntry, ...prev]);
    emitEvent('Financeiro', 'finance.ledger.manual_entry', {
      entryNumber: newEntry.entryNumber,
      description: entry.description,
      total: entry.debitTotal,
    });
    sound.playSuccessChime();
  };

  const updateLedgerEntry = (id: string, entry: Partial<LedgerEntry>) => {
    setLedgerEntries((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...entry } : l))
    );
  };

  const generateSaftXml = (startDate?: string, endDate?: string) => {
    return `<?xml version="1.0" encoding="Windows-1252"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01">
  <Header>
    <AuditFileVersion>1.04_01</AuditFileVersion>
    <CompanyID>${currentCompany.taxNumber}</CompanyID>
    <TaxRegistrationNumber>${currentCompany.taxNumber}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${currentCompany.name}</CompanyName>
    <BusinessName>${currentCompany.tradeName || currentCompany.name}</BusinessName>
    <CompanyAddress>
      <AddressDetail>${currentCompany.address}</AddressDetail>
      <City>${currentCompany.city}</City>
      <PostalCode>${currentCompany.postalCode}</PostalCode>
      <Country>${currentCompany.country}</Country>
    </CompanyAddress>
    <FiscalYear>${new Date().getFullYear()}</FiscalYear>
    <StartDate>${startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]}</StartDate>
    <EndDate>${endDate || new Date().toISOString().split('T')[0]}</EndDate>
    <CurrencyCode>${currentCompany.currency || 'EUR'}</CurrencyCode>
    <DateCreated>${new Date().toISOString().split('T')[0]}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductCompanyID>Google AI Studio POS ERP</ProductCompanyID>
    <SoftwareCertificateNumber>${currentCompany.softwareCertNumber || '3412/AT'}</SoftwareCertificateNumber>
  </Header>
  <MasterFiles />
  <SourceDocuments />
</AuditFile>`;
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

  const rejectRequisition = rejectPurchaseRequisition;

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
    pushRecordToSupabase('colaboradores', 'upsert', newEmp);
    emitEvent('RH', 'hr.employee.created', { employeeId: id, name: newEmp.name, role: newEmp.role });
    sound.playSuccessChime();
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const updated = { ...e, ...updates };
          pushRecordToSupabase('colaboradores', 'upsert', updated);
          return updated;
        }
        return e;
      })
    );
    emitEvent('RH', 'hr.employee.updated', { employeeId: id, updates });
    sound.playSuccessChime();
  };

  const deleteEmployee = (id: string) => {
    const target = employees.find((e) => e.id === id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    pushRecordToSupabase('colaboradores', 'delete', { id });
    emitEvent('RH', 'hr.employee.deleted', { employeeId: id, name: target?.name, companyId: target?.companyId });
    sound.playSuccessChime();
    notify(`Colaborador "${target?.name || id}" eliminado com sucesso.`, 'success');
  };

  const addTimeEntry = (entry: Omit<TimeClockEntry, 'id'>) => {
    const id = `tc-${Date.now()}`;
    const newEntry: TimeClockEntry = { ...entry, id };
    setTimeEntries((prev) => [newEntry, ...prev]);
    pushRecordToSupabase('registos_ponto', 'upsert', newEntry);
    emitEvent('RH', 'hr.timeclock.manual_entry', { entryId: id, employee: entry.employeeName });
    sound.playSuccessChime();
    notify(`Ponto de ${entry.employeeName} registado com sucesso.`, 'success');
  };

  const updateTimeEntry = (id: string, updates: Partial<TimeClockEntry>) => {
    setTimeEntries((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, ...updates };
          pushRecordToSupabase('registos_ponto', 'upsert', updated);
          return updated;
        }
        return t;
      })
    );
    emitEvent('RH', 'hr.timeclock.updated', { entryId: id, updates });
    sound.playSuccessChime();
    notify('Registo de ponto atualizado com sucesso.', 'success');
  };

  const deleteTimeEntry = (id: string) => {
    const target = timeEntries.find((t) => t.id === id);
    setTimeEntries((prev) => prev.filter((t) => t.id !== id));
    pushRecordToSupabase('registos_ponto', 'delete', { id });
    emitEvent('RH', 'hr.timeclock.deleted', { entryId: id, employee: target?.employeeName });
    sound.playSuccessChime();
    notify('Registo de ponto eliminado com sucesso.', 'success');
  };

  const approveTimeEntry = (id: string, approvedBy = 'Diretor RH') => {
    setTimeEntries((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = {
            ...t,
            status: 'aprovado' as const,
            approvedBy: approvedBy || 'Diretor RH',
          };
          pushRecordToSupabase('registos_ponto', 'upsert', updated);
          return updated;
        }
        return t;
      })
    );
    emitEvent('RH', 'hr.timeclock.approved', { entryId: id, approvedBy });
    sound.playSuccessChime();
    notify('Registo de ponto aprovado com sucesso.', 'success');
  };

  const clockInEmployee = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
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
    pushRecordToSupabase('registos_ponto', 'upsert', newEntry);
    emitEvent('RH', 'hr.timeclock.clock_in', { employee: emp.name, time: timeStr, exactTimestamp: now.toISOString() });
    sound.playSuccessChime();
    notify(`Picagem de Entrada registada para ${emp.name} às ${timeStr}.`, 'success');
  };

  const clockOutEmployee = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setTimeEntries((prev) =>
      prev.map((t) => {
        if (t.employeeId === employeeId && t.status === 'em_curso') {
          // Calculate exact elapsed hours with second precision
          let calcHours = 8.0;
          if (t.clockIn) {
            const inParts = t.clockIn.split(':').map(Number);
            const inDate = new Date(now);
            inDate.setHours(inParts[0] || 0, inParts[1] || 0, inParts[2] || 0, 0);
            const elapsedMs = Math.max(0, now.getTime() - inDate.getTime());
            const hours = Number((elapsedMs / (1000 * 60 * 60)).toFixed(2));
            if (hours > 0 && hours <= 24) {
              calcHours = hours;
            }
          }

          const updated = {
            ...t,
            clockOut: timeStr,
            totalHours: calcHours,
            status: 'concluido' as const,
          };
          pushRecordToSupabase('registos_ponto', 'upsert', updated);
          return updated;
        }
        return t;
      })
    );
    emitEvent('RH', 'hr.timeclock.clock_out', { employeeId, time: timeStr, exactTimestamp: now.toISOString() });
    sound.playSuccessChime();
    notify(`Picagem de Saída registada para ${emp?.name || 'Colaborador'} às ${timeStr}.`, 'success');
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
    pushRecordToSupabase('recibos_salario', 'upsert', newSlip);
    emitEvent('RH', 'hr.payroll.created', { payrollId: id, employee: slip.employeeName, companyId: compId });
    sound.playSuccessChime();
    notify(`Recibo de vencimento de ${slip.employeeName} criado com sucesso.`, 'success');
  };

  const updatePayrollSlip = (id: string, updates: Partial<PayrollSlip>) => {
    setPayrolls((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          pushRecordToSupabase('recibos_salario', 'upsert', updated);
          return updated;
        }
        return p;
      })
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
    pushRecordToSupabase('recibos_salario', 'delete', { id });
    emitEvent('RH', 'hr.payroll.deleted', { payrollId: id, employee: target?.employeeName });
    sound.playSuccessChime();
    notify(`Recibo de vencimento ${target?.employeeName ? `de ${target.employeeName}` : ''} eliminado com sucesso.`, 'success');
  };

  const clearAllPayrolls = () => {
    const count = payrolls.length;
    payrolls.forEach((p) => pushRecordToSupabase('recibos_salario', 'delete', { id: p.id }));
    setPayrolls([]);
    saveToStorage('payrolls', []);
    emitEvent('RH', 'hr.payroll.cleared', { count });
    sound.playSuccessChime();
    notify(`Todos os ${count} recibos de vencimento foram eliminados.`, 'success');
  };

  const markPayrollPaid = (id: string) => {
    const target = payrolls.find((p) => p.id === id);
    setPayrolls((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = {
            ...p,
            status: 'pago' as const,
            paymentDate: new Date().toISOString().split('T')[0],
          };
          pushRecordToSupabase('recibos_salario', 'upsert', updated);
          return updated;
        }
        return p;
      })
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
        status: 'pendente' as const,
      };
    });

    setPayrolls((prev) => [...newSlips, ...prev]);
    pushBatchRecordsToSupabase('recibos_salario', 'upsert', newSlips);
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
    pushRecordToSupabase('escalas_trabalho', 'upsert', newShift);
    emitEvent('RH', 'hr.shift.created', { shiftId: id, companyId: compId });
    sound.playSuccessChime();
    notify('Escala de turno agendada com sucesso.', 'success');
  };

  const updateEmployeeShift = (id: string, updates: Partial<EmployeeShift>) => {
    setEmployeeShifts((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...updates };
          pushRecordToSupabase('escalas_trabalho', 'upsert', updated);
          return updated;
        }
        return s;
      })
    );
    emitEvent('RH', 'hr.shift.updated', { shiftId: id, updates });
    sound.playSuccessChime();
    notify('Turno atualizado com sucesso.', 'success');
  };

  const deleteEmployeeShift = (id: string) => {
    setEmployeeShifts((prev) => prev.filter((s) => s.id !== id));
    pushRecordToSupabase('escalas_trabalho', 'delete', { id });
    emitEvent('RH', 'hr.shift.deleted', { shiftId: id });
    sound.playSuccessChime();
    notify('Turno de serviço eliminado com sucesso.', 'success');
  };

  // ==================== CRM & CLIENTES CRUD ====================
  const addCustomer = (cust: Omit<Customer, 'id' | 'createdAt' | 'ordersCount' | 'totalSpent'> & { id?: string }): Customer => {
    const id = cust.id || `cust-${Date.now()}`;
    const newCust: Customer = {
      ordersCount: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      loyaltyTier: 'Bronze',
      creditLimit: 0,
      currentCredit: 0,
      createdAt: new Date().toISOString().split('T')[0],
      ...cust,
      id,
      companyId: cust.companyId || currentCompany.id,
    };
    setCustomers((prev) => [newCust, ...prev.filter((c) => c.id !== id)]);
    pushRecordToSupabase('clientes', 'upsert', newCust);
    emitEvent('CRM', 'crm.customer.created', { customerId: id, name: newCust.name });
    sound.playSuccessChime();
    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updates };
          pushRecordToSupabase('clientes', 'upsert', updated);
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
          const updated = { ...c, loyaltyPoints: newPts, loyaltyTier: tier };
          pushRecordToSupabase('clientes', 'upsert', updated);
          return updated;
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
      `Venda de Encomenda ${order.orderNumber}`,
      dateStr
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
    return users.filter((u) => u.companyId === compId);
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

  const scopedStockTransfers = useMemo(() => {
    const compId = currentCompany?.id || 'comp-1';
    return stockTransfers.filter((t) => !t.companyId || t.companyId === compId);
  }, [stockTransfers, currentCompany?.id]);

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

  const scopedActiveShift = useMemo(() => {
    if (!activeShift) return null;
    const compId = currentCompany?.id || 'comp-1';
    if (activeShift.companyId && activeShift.companyId !== compId) {
      return null;
    }
    return activeShift;
  }, [activeShift, currentCompany?.id]);

  // Continuous Multi-Tenant Isolation: Guard activeShift, store and terminal
  useEffect(() => {
    if (!currentCompany?.id) return;
    const compId = currentCompany.id;

    // 1. Foreign active shift purge
    if (activeShift && activeShift.companyId && activeShift.companyId !== compId) {
      setActiveShift(null);
      saveToStorage('activeShift', null);
    }

    // 2. Ensure currentStore belongs to currentCompany
    if (currentStore.companyId !== compId) {
      const matchStore = stores.find((s) => s.companyId === compId);
      if (matchStore) {
        setCurrentStore(matchStore);
        saveToStorage('store', matchStore);
      } else {
        const defaultStoreId = `store-${compId}-sede`;
        const existingStore = stores.find((s) => s.id === defaultStoreId);
        if (existingStore) {
          setCurrentStore(existingStore);
          saveToStorage('store', existingStore);
        } else {
          const defaultStore: Store = {
            id: defaultStoreId,
            companyId: compId,
            code: 'LOJA-01',
            name: 'Loja Principal',
            address: currentCompany.address || 'Sede Principal',
            city: currentCompany.city || 'Maputo',
            phone: currentCompany.phone || '',
            managerId: currentUser?.id || 'usr-admin',
            defaultWarehouseId: `wh-${compId}-default`,
            terminalsCount: 1,
          };
          setStores((prev) => {
            if (prev.some((s) => s.id === defaultStore.id)) return prev;
            const updated = [...prev, defaultStore];
            saveToStorage('stores', deduplicateById(updated));
            return updated;
          });
          setCurrentStore(defaultStore);
          saveToStorage('store', defaultStore);
        }
      }
    }
  }, [currentCompany?.id, activeShift, currentStore.companyId, stores, currentCompany?.address, currentCompany?.city, currentCompany?.phone, currentUser?.id]);

  useEffect(() => {
    if (!currentStore?.id) return;
    // 3. Ensure currentTerminal belongs to currentStore
    if (currentTerminal.storeId !== currentStore.id) {
      const matchTerm = terminals.find((t) => t.storeId === currentStore.id);
      if (matchTerm) {
        setCurrentTerminal(matchTerm);
        saveToStorage('terminal', matchTerm);
      } else {
        const defaultTermId = `term-${currentStore.id}-01`;
        const existingTerm = terminals.find((t) => t.id === defaultTermId);
        if (existingTerm) {
          setCurrentTerminal(existingTerm);
          saveToStorage('terminal', existingTerm);
        } else {
          const defaultTerm: Terminal = {
            id: defaultTermId,
            storeId: currentStore.id,
            code: 'POS-01',
            description: 'Caixa Balcão Principal',
            isActive: true,
            currentShiftId: null,
          };
          setTerminals((prev) => {
            if (prev.some((t) => t.id === defaultTerm.id)) return prev;
            const updated = [...prev, defaultTerm];
            saveToStorage('terminals', deduplicateById(updated));
            return updated;
          });
          setCurrentTerminal(defaultTerm);
          saveToStorage('terminal', defaultTerm);
        }
      }
    }
  }, [currentStore?.id, currentTerminal.storeId, terminals]);

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
        setStock,
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
        stockTransfers: scopedStockTransfers,
        requestStockTransfer,
        approveStockTransfer,
        confirmStockTransfer,
        rejectStockTransfer,
        cancelStockTransfer,
        deductStockForItems,
        replenishStockForItems,
        shiftTypes,
        defaultShiftType,
        addShiftType,
        updateShiftType,
        deleteShiftType,
        setDefaultShiftType,
        activeShift: scopedActiveShift,
        shiftsHistory: scopedShiftsHistory,
        openShift,
        closeShift,
        registerCashMovement,
        syncActiveShiftWithTodaySales,
        reconcileActiveShift,
        cart,
        posVatMode,
        setPosVatMode,
        posDefaultTaxRate,
        setPosDefaultTaxRate,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartDiscount,
        updateCartTaxRate,
        updateCartItemVat,
        applyVatRateToCart,
        globalDiscount,
        setGlobalDiscount,
        selectedCustomer,
        setSelectedCustomer,
        clearCart,
        completeSale,
        registerDocSaleInShift,
        salesHistory: scopedSalesHistory,
        setSalesHistory,
        addFiscalDocument,
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
        addAccount,
        updateAccount,
        deleteAccount,
        ledgerEntries,
        addLedgerEntry,
        updateLedgerEntry,
        deleteLedgerEntry,
        generateSaftXml,
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
        rejectRequisition,
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
        approveTimeEntry,
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
