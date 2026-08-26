import { supabase, isValidHttpUrl, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from './supabase';
import {
  Product,
  Customer,
  Supplier,
  ProductCategory,
  Sale,
  User,
  Warehouse,
  StockItem,
  AccountPayable,
  AccountReceivable,
  CashShift,
} from '../types';

export interface SupabaseSyncLog {
  id: string;
  timestamp: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'PULL' | 'PUSH' | 'ERROR';
  origin: 'SUPABASE_REALTIME' | 'LOCAL_APP';
  description: string;
  status: 'success' | 'error' | 'info';
  data?: any;
}

export type TableSyncName =
  | 'produtos'
  | 'clientes'
  | 'fornecedores'
  | 'categorias'
  | 'vendas'
  | 'usuarios'
  | 'armazens'
  | 'stock'
  | 'contas_pagar'
  | 'contas_receber'
  | 'turnos_caixa';

export interface RealtimeSyncCallbacks {
  onProductChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', item: Partial<Product>, rawOld?: any) => void;
  onCustomerChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', item: Partial<Customer>, rawOld?: any) => void;
  onSupplierChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', item: Partial<Supplier>, rawOld?: any) => void;
  onCategoryChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', item: Partial<ProductCategory>, rawOld?: any) => void;
  onSaleChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', item: Partial<Sale>, rawOld?: any) => void;
  onUserChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', item: Partial<User>, rawOld?: any) => void;
  onWarehouseChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', item: Partial<Warehouse>, rawOld?: any) => void;
  onStockChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', item: Partial<StockItem>, rawOld?: any) => void;
  onAccountPayableChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', item: Partial<AccountPayable>, rawOld?: any) => void;
  onAccountReceivableChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', item: Partial<AccountReceivable>, rawOld?: any) => void;
  onShiftChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', item: Partial<CashShift>, rawOld?: any) => void;
  onStatusChange?: (status: 'connected' | 'connecting' | 'disconnected' | 'error', errorMsg?: string) => void;
  onLogAdded?: (log: SupabaseSyncLog) => void;
}

let activeChannel: any = null;
let currentCallbacks: RealtimeSyncCallbacks = {};
const syncLogs: SupabaseSyncLog[] = [];
const MAX_LOGS = 150;

function addSyncLog(log: Omit<SupabaseSyncLog, 'id' | 'timestamp'>) {
  const newLog: SupabaseSyncLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
  syncLogs.unshift(newLog);
  if (syncLogs.length > MAX_LOGS) {
    syncLogs.pop();
  }
  if (currentCallbacks.onLogAdded) {
    currentCallbacks.onLogAdded(newLog);
  }
}

export function getSyncLogs(): SupabaseSyncLog[] {
  return [...syncLogs];
}

export function clearSyncLogs() {
  syncLogs.length = 0;
}

/**
 * Mapeamentos entre o Modelo da Aplicação e as Tabelas do Supabase
 */

export function mapProductToSupabase(p: Partial<Product>) {
  return {
    id: p.id,
    company_id: p.companyId || 'comp-1',
    sku: p.sku || '',
    barcode: p.barcode || '',
    name: p.name || '',
    category: p.category || '',
    price: p.price || 0,
    cost_price: p.costPrice || 0,
    tax_rate: p.taxRate !== undefined ? p.taxRate : 16,
    unit: p.unit || 'un',
    min_stock: p.minStock || 0,
    max_stock: p.maxStock || 0,
    image_url: p.imageUrl || null,
    has_batch_control: !!p.hasBatchControl,
    supplier_id: p.supplierId || null,
    description: p.description || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapSupabaseToProduct(row: any): Product {
  return {
    id: String(row.id),
    companyId: row.company_id || 'comp-1',
    sku: row.sku || '',
    barcode: row.barcode || '',
    name: row.name || 'Artigo sem nome',
    category: row.category || 'Geral',
    price: Number(row.price) || 0,
    costPrice: Number(row.cost_price) || 0,
    taxRate: Number(row.tax_rate) !== undefined ? Number(row.tax_rate) : 16,
    unit: row.unit || 'un',
    minStock: Number(row.min_stock) || 0,
    maxStock: Number(row.max_stock) || 0,
    imageUrl: row.image_url || undefined,
    hasBatchControl: !!row.has_batch_control,
    supplierId: row.supplier_id || undefined,
    description: row.description || undefined,
  };
}

export function mapCustomerToSupabase(c: Partial<Customer>) {
  return {
    id: c.id,
    company_id: c.companyId || 'comp-1',
    name: c.name || '',
    tax_number: c.taxNumber || '',
    email: c.email || '',
    phone: c.phone || '',
    address: c.address || '',
    city: c.city || '',
    postal_code: c.postalCode || '',
    loyalty_points: c.loyaltyPoints || 0,
    loyalty_tier: c.loyaltyTier || 'Bronze',
    total_spent: c.totalSpent || 0,
    credit_limit: c.creditLimit || 0,
    current_credit: c.currentCredit || 0,
    notes: c.notes || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapSupabaseToCustomer(row: any): Customer {
  return {
    id: String(row.id),
    companyId: row.company_id || 'comp-1',
    name: row.name || 'Cliente',
    taxNumber: row.tax_number || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    postalCode: row.postal_code || '',
    loyaltyPoints: Number(row.loyalty_points) || 0,
    loyaltyTier: row.loyalty_tier || 'Bronze',
    totalSpent: Number(row.total_spent) || 0,
    creditLimit: Number(row.credit_limit) || 0,
    currentCredit: Number(row.current_credit) || 0,
    createdAt: row.created_at || new Date().toISOString(),
    notes: row.notes || undefined,
  };
}

export function mapSupplierToSupabase(s: Partial<Supplier>) {
  return {
    id: s.id,
    company_id: s.companyId || 'comp-1',
    code: s.code || '',
    name: s.name || '',
    trade_name: s.tradeName || '',
    tax_number: s.taxNumber || '',
    email: s.email || '',
    phone: s.phone || '',
    address: s.address || '',
    payment_terms: s.paymentTerms || '',
    iban: s.iban || '',
    rating: s.rating || 5,
    categories: s.categories || [],
    updated_at: new Date().toISOString(),
  };
}

export function mapSupabaseToSupplier(row: any): Supplier {
  return {
    id: String(row.id),
    companyId: row.company_id || 'comp-1',
    code: row.code || '',
    name: row.name || '',
    tradeName: row.trade_name || '',
    taxNumber: row.tax_number || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    paymentTerms: row.payment_terms || 'Pronto Pagamento',
    iban: row.iban || '',
    rating: Number(row.rating) || 5,
    categories: Array.isArray(row.categories) ? row.categories : [],
  };
}

export function mapCategoryToSupabase(cat: Partial<ProductCategory>) {
  return {
    id: cat.id,
    name: cat.name || '',
    icon: cat.icon || null,
    color: cat.color || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapSupabaseToCategory(row: any): ProductCategory {
  return {
    id: String(row.id),
    name: row.name || 'Geral',
    icon: row.icon || undefined,
    color: row.color || undefined,
  };
}

export function mapSaleToSupabase(s: Partial<Sale>) {
  return {
    id: s.id,
    company_id: s.companyId || 'comp-1',
    store_id: s.storeId || 'store-1',
    terminal_id: s.terminalId || 'term-1',
    invoice_number: s.invoiceNumber || '',
    invoice_type: s.invoiceType || 'FS',
    date: s.date || new Date().toISOString(),
    customer_id: s.customerId || null,
    customer_name: s.customerName || null,
    customer_tax_number: s.customerTaxNumber || s.customerNif || null,
    items: s.items || [],
    subtotal: s.subtotal || 0,
    discount_total: s.discountTotal || 0,
    tax_total: s.taxTotal || 0,
    total: s.total || 0,
    payments: s.payments || [],
    change_amount: s.changeAmount || 0,
    operator_id: s.operatorId || '',
    operator_name: s.operatorName || '',
    shift_id: s.shiftId || '',
    fiscal_hash: s.fiscalHash || '',
    previous_hash: s.previousHash || '',
    atcud: s.atcud || null,
    notes: s.notes || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapSupabaseToSale(row: any): Sale {
  return {
    id: String(row.id),
    companyId: row.company_id || 'comp-1',
    storeId: row.store_id || 'store-1',
    terminalId: row.terminal_id || 'term-1',
    invoiceNumber: row.invoice_number || 'FS 0/0',
    invoiceType: row.invoice_type || 'FS',
    date: row.date || new Date().toISOString(),
    customerId: row.customer_id || undefined,
    customerName: row.customer_name || undefined,
    customerTaxNumber: row.customer_tax_number || undefined,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: Number(row.subtotal) || 0,
    discountTotal: Number(row.discount_total) || 0,
    taxTotal: Number(row.tax_total) || 0,
    total: Number(row.total) || 0,
    payments: Array.isArray(row.payments) ? row.payments : [],
    changeAmount: Number(row.change_amount) || 0,
    operatorId: row.operator_id || 'usr-1',
    operatorName: row.operator_name || 'Operador',
    shiftId: row.shift_id || '',
    fiscalHash: row.fiscal_hash || '',
    previousHash: row.previous_hash || '',
    isSynced: true,
    atcud: row.atcud || undefined,
    notes: row.notes || undefined,
  };
}

export function mapUserToSupabase(u: Partial<User>) {
  return {
    id: u.id,
    company_id: u.companyId || 'comp-1',
    store_id: u.storeId || 'store-1',
    nome: u.name || '',
    name: u.name || '',
    email: u.email || '',
    cargo: u.role || 'caixa',
    role: u.role || 'caixa',
    pin: u.pin || '1234',
    telefone: u.phone || null,
    phone: u.phone || null,
    ativo: u.isActive !== undefined ? u.isActive : true,
    is_active: u.isActive !== undefined ? u.isActive : true,
    avatar_url: u.avatarUrl || null,
    permissions: u.permissions || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapSupabaseToUser(row: any): User {
  return {
    id: String(row.id),
    companyId: row.company_id || 'comp-1',
    storeId: row.store_id || 'store-1',
    name: row.name || row.nome || 'Utilizador',
    username: row.username || (row.email ? row.email.split('@')[0] : 'user'),
    email: row.email || '',
    role: (row.role || row.cargo || 'caixa').toLowerCase(),
    pin: row.pin || '1234',
    phone: row.phone || row.telefone || '',
    isActive: row.is_active !== undefined ? !!row.is_active : row.ativo !== undefined ? !!row.ativo : true,
    avatarUrl: row.avatar_url || '',
    createdAt: row.created_at || new Date().toISOString().split('T')[0],
    permissions: row.permissions || undefined,
  };
}

export function mapWarehouseToSupabase(w: Partial<Warehouse>) {
  return {
    id: w.id,
    company_id: w.companyId || 'comp-1',
    store_id: w.storeId || null,
    name: w.name || '',
    code: w.code || '',
    location: w.location || '',
    is_default: !!w.isDefault,
    updated_at: new Date().toISOString(),
  };
}

export function mapSupabaseToWarehouse(row: any): Warehouse {
  return {
    id: String(row.id),
    companyId: row.company_id || 'comp-1',
    storeId: row.store_id || undefined,
    name: row.name || '',
    code: row.code || '',
    location: row.location || '',
    isDefault: !!row.is_default,
  };
}

export function mapAccountPayableToSupabase(a: Partial<AccountPayable>) {
  return {
    id: a.id,
    company_id: a.companyId || 'comp-1',
    supplier_id: a.supplierId || '',
    supplier_name: a.supplierName || '',
    document_number: a.documentNumber || '',
    date: a.date || new Date().toISOString().split('T')[0],
    due_date: a.dueDate || new Date().toISOString().split('T')[0],
    amount: a.amount || 0,
    paid_amount: a.paidAmount || 0,
    status: a.status || 'pendente',
    payment_date: a.paymentDate || null,
    notes: a.notes || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapSupabaseToAccountPayable(row: any): AccountPayable {
  return {
    id: String(row.id),
    companyId: row.company_id || 'comp-1',
    supplierId: row.supplier_id || '',
    supplierName: row.supplier_name || '',
    documentNumber: row.document_number || '',
    date: row.date || new Date().toISOString().split('T')[0],
    dueDate: row.due_date || new Date().toISOString().split('T')[0],
    amount: Number(row.amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    status: row.status || 'pendente',
    paymentDate: row.payment_date || undefined,
    notes: row.notes || undefined,
  };
}

export function mapAccountReceivableToSupabase(a: Partial<AccountReceivable>) {
  return {
    id: a.id,
    company_id: a.companyId || 'comp-1',
    customer_id: a.customerId || '',
    customer_name: a.customerName || '',
    document_number: a.documentNumber || '',
    date: a.date || new Date().toISOString().split('T')[0],
    due_date: a.dueDate || new Date().toISOString().split('T')[0],
    amount: a.amount || 0,
    received_amount: a.receivedAmount || 0,
    status: a.status || 'pendente',
    receipt_date: a.receiptDate || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapSupabaseToAccountReceivable(row: any): AccountReceivable {
  return {
    id: String(row.id),
    companyId: row.company_id || 'comp-1',
    customerId: row.customer_id || '',
    customerName: row.customer_name || '',
    documentNumber: row.document_number || '',
    date: row.date || new Date().toISOString().split('T')[0],
    dueDate: row.due_date || new Date().toISOString().split('T')[0],
    amount: Number(row.amount) || 0,
    receivedAmount: Number(row.received_amount) || 0,
    status: row.status || 'pendente',
    receiptDate: row.receipt_date || undefined,
  };
}

export function mapStockToSupabase(s: Partial<StockItem>) {
  return {
    id: s.id,
    product_id: s.productId,
    warehouse_id: s.warehouseId,
    quantity: s.quantity || 0,
    reserved: s.reserved || 0,
    avg_cost: s.avgCost || 0,
    batch_number: s.batchNumber || null,
    expiry_date: s.expiryDate || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapSupabaseToStock(row: any): StockItem {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    warehouseId: String(row.warehouse_id),
    quantity: Number(row.quantity) || 0,
    reserved: Number(row.reserved) || 0,
    avgCost: Number(row.avg_cost) || 0,
    batchNumber: row.batch_number || undefined,
    expiryDate: row.expiry_date || undefined,
  };
}

export function mapShiftToSupabase(s: Partial<CashShift>) {
  return {
    id: s.id,
    company_id: s.companyId || 'comp-1',
    store_id: s.storeId || 'store-1',
    terminal_id: s.terminalId || 'term-1',
    operator_id: s.operatorId || '',
    operator_name: s.operatorName || '',
    opened_at: s.openedAt || new Date().toISOString(),
    closed_at: s.closedAt || null,
    status: s.status || 'aberto',
    initial_cash: s.initialCash || 0,
    final_cash_reported: s.finalCashReported || null,
    final_cash_system: s.finalCashSystem || null,
    cash_difference: s.cashDifference || 0,
    total_sales: s.totalSales || 0,
    total_cash: s.totalCash || 0,
    total_cards: s.totalCards || 0,
    total_mbway: s.totalMbway || 0,
    total_transfers: s.totalTransfers || 0,
    total_vouchers: s.totalVouchers || 0,
    sangria_total: s.sangriaTotal || 0,
    suprimento_total: s.suprimentoTotal || 0,
    movements: s.movements || [],
    z_report_number: s.zReportNumber || null,
    notes: s.notes || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapSupabaseToShift(row: any): CashShift {
  return {
    id: String(row.id),
    companyId: row.company_id || 'comp-1',
    storeId: row.store_id || 'store-1',
    terminalId: row.terminal_id || 'term-1',
    operatorId: row.operator_id || '',
    operatorName: row.operator_name || '',
    openedAt: row.opened_at || new Date().toISOString(),
    closedAt: row.closed_at || undefined,
    status: row.status || 'aberto',
    initialCash: Number(row.initial_cash) || 0,
    finalCashReported: row.final_cash_reported !== null ? Number(row.final_cash_reported) : undefined,
    finalCashSystem: row.final_cash_system !== null ? Number(row.final_cash_system) : undefined,
    cashDifference: Number(row.cash_difference) || 0,
    totalSales: Number(row.total_sales) || 0,
    totalCash: Number(row.total_cash) || 0,
    totalCards: Number(row.total_cards) || 0,
    totalMbway: Number(row.total_mbway) || 0,
    totalTransfers: Number(row.total_transfers) || 0,
    totalVouchers: Number(row.total_vouchers) || 0,
    sangriaTotal: Number(row.sangria_total) || 0,
    suprimentoTotal: Number(row.suprimento_total) || 0,
    movements: Array.isArray(row.movements) ? row.movements : [],
    zReportNumber: row.z_report_number || undefined,
    notes: row.notes || undefined,
  };
}

/**
 * ============================================================================
 * SINCRONIZAÇÃO BIDIRECIONAL EM TEMPO REAL (REALTIME SUBSCRIBER)
 * ============================================================================
 */

export function startSupabaseRealtimeSync(callbacks: RealtimeSyncCallbacks) {
  currentCallbacks = callbacks;

  if (activeChannel) {
    try {
      supabase.removeChannel(activeChannel);
    } catch {}
    activeChannel = null;
  }

  if (callbacks.onStatusChange) {
    callbacks.onStatusChange('connecting');
  }

  addSyncLog({
    table: 'ALL',
    action: 'PULL',
    origin: 'LOCAL_APP',
    description: 'A iniciar conexão e escuta Realtime com o Supabase...',
    status: 'info',
  });

  const channel = supabase.channel('erp-pos-realtime-master');

  const registeredTables: TableSyncName[] = [
    'produtos',
    'clientes',
    'fornecedores',
    'categorias',
    'vendas',
    'usuarios',
    'armazens',
    'stock',
    'contas_pagar',
    'contas_receber',
    'turnos_caixa',
  ];

  registeredTables.forEach((tableName) => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      (payload: any) => {
        handleRealtimeEvent(tableName, payload);
      }
    );
  });

  channel.subscribe((status: string, err: any) => {
    if (status === 'SUBSCRIBED') {
      if (currentCallbacks.onStatusChange) {
        currentCallbacks.onStatusChange('connected');
      }
      addSyncLog({
        table: 'ALL',
        action: 'PULL',
        origin: 'SUPABASE_REALTIME',
        description: '🟢 Canal Realtime conectado e sincronizado em direto com o Supabase!',
        status: 'success',
      });
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      if (currentCallbacks.onStatusChange) {
        currentCallbacks.onStatusChange('error', err?.message || 'Conexão Realtime interrompida');
      }
      addSyncLog({
        table: 'ALL',
        action: 'ERROR',
        origin: 'SUPABASE_REALTIME',
        description: `Canal Realtime: ${status} (${err?.message || 'A aguardar reconexão'})`,
        status: 'error',
      });
    }
  });

  activeChannel = channel;
  return activeChannel;
}

export function stopSupabaseRealtimeSync() {
  if (activeChannel) {
    try {
      supabase.removeChannel(activeChannel);
    } catch {}
    activeChannel = null;
  }
  if (currentCallbacks.onStatusChange) {
    currentCallbacks.onStatusChange('disconnected');
  }
}

function handleRealtimeEvent(tableName: TableSyncName, payload: any) {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  const rawId = (oldRecord && oldRecord.id) || (newRecord && newRecord.id);

  addSyncLog({
    table: tableName,
    action: eventType as any,
    origin: 'SUPABASE_REALTIME',
    description: `Evento Realtime [${eventType}] na tabela "${tableName}" (ID: ${rawId || 'desconhecido'})`,
    status: 'info',
    data: eventType === 'DELETE' ? oldRecord : newRecord,
  });

  switch (tableName) {
    case 'produtos':
      if (currentCallbacks.onProductChange) {
        const item = eventType === 'DELETE' ? { id: String(rawId) } : mapSupabaseToProduct(newRecord);
        currentCallbacks.onProductChange(eventType, item, oldRecord);
      }
      break;

    case 'clientes':
      if (currentCallbacks.onCustomerChange) {
        const item = eventType === 'DELETE' ? { id: String(rawId) } : mapSupabaseToCustomer(newRecord);
        currentCallbacks.onCustomerChange(eventType, item, oldRecord);
      }
      break;

    case 'fornecedores':
      if (currentCallbacks.onSupplierChange) {
        const item = eventType === 'DELETE' ? { id: String(rawId) } : mapSupabaseToSupplier(newRecord);
        currentCallbacks.onSupplierChange(eventType, item, oldRecord);
      }
      break;

    case 'categorias':
      if (currentCallbacks.onCategoryChange) {
        const item = eventType === 'DELETE' ? { id: String(rawId) } : mapSupabaseToCategory(newRecord);
        currentCallbacks.onCategoryChange(eventType, item, oldRecord);
      }
      break;

    case 'vendas':
      if (currentCallbacks.onSaleChange) {
        const item = eventType === 'DELETE' ? { id: String(rawId) } : mapSupabaseToSale(newRecord);
        currentCallbacks.onSaleChange(eventType, item, oldRecord);
      }
      break;

    case 'usuarios':
      if (currentCallbacks.onUserChange) {
        const item = eventType === 'DELETE' ? { id: String(rawId) } : mapSupabaseToUser(newRecord);
        currentCallbacks.onUserChange(eventType, item, oldRecord);
      }
      break;

    case 'armazens':
      if (currentCallbacks.onWarehouseChange) {
        const item = eventType === 'DELETE' ? { id: String(rawId) } : mapSupabaseToWarehouse(newRecord);
        currentCallbacks.onWarehouseChange(eventType, item, oldRecord);
      }
      break;

    case 'stock':
      if (currentCallbacks.onStockChange) {
        const item = eventType === 'DELETE' ? { id: String(rawId) } : mapSupabaseToStock(newRecord);
        currentCallbacks.onStockChange(eventType, item, oldRecord);
      }
      break;

    case 'contas_pagar':
      if (currentCallbacks.onAccountPayableChange) {
        const item = eventType === 'DELETE' ? { id: String(rawId) } : mapSupabaseToAccountPayable(newRecord);
        currentCallbacks.onAccountPayableChange(eventType, item, oldRecord);
      }
      break;

    case 'contas_receber':
      if (currentCallbacks.onAccountReceivableChange) {
        const item = eventType === 'DELETE' ? { id: String(rawId) } : mapSupabaseToAccountReceivable(newRecord);
        currentCallbacks.onAccountReceivableChange(eventType, item, oldRecord);
      }
      break;

    case 'turnos_caixa':
      if (currentCallbacks.onShiftChange) {
        const item = eventType === 'DELETE' ? { id: String(rawId) } : mapSupabaseToShift(newRecord);
        currentCallbacks.onShiftChange(eventType, item, oldRecord);
      }
      break;
  }
}

/**
 * ============================================================================
 * ENVIO DE AÇÕES LOCAIS PARA O SUPABASE (PUSH CRUD)
 * ============================================================================
 */

export async function pushRecordToSupabase(
  table: TableSyncName,
  action: 'insert' | 'update' | 'upsert' | 'delete',
  record: any
): Promise<{ success: boolean; error?: any }> {
  try {
    let payload: any = record;

    if (action === 'delete') {
      const id = record?.id || record;
      if (!id) return { success: false, error: 'ID ausente para exclusão' };

      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        // If table doesn't exist yet, don't crash
        if (error.code === '42P01') {
          return { success: false, error: 'Tabela ainda não criada no Supabase' };
        }
        addSyncLog({
          table,
          action: 'DELETE',
          origin: 'LOCAL_APP',
          description: `Erro ao eliminar registo "${id}" no Supabase: ${error.message}`,
          status: 'error',
        });
        return { success: false, error };
      }

      addSyncLog({
        table,
        action: 'DELETE',
        origin: 'LOCAL_APP',
        description: `Registo "${id}" eliminado com sucesso no Supabase`,
        status: 'success',
      });
      return { success: true };
    }

    // Map according to table
    switch (table) {
      case 'produtos':
        payload = mapProductToSupabase(record);
        break;
      case 'clientes':
        payload = mapCustomerToSupabase(record);
        break;
      case 'fornecedores':
        payload = mapSupplierToSupabase(record);
        break;
      case 'categorias':
        payload = mapCategoryToSupabase(record);
        break;
      case 'vendas':
        payload = mapSaleToSupabase(record);
        break;
      case 'usuarios':
        payload = mapUserToSupabase(record);
        break;
      case 'armazens':
        payload = mapWarehouseToSupabase(record);
        break;
      case 'stock':
        payload = mapStockToSupabase(record);
        break;
      case 'contas_pagar':
        payload = mapAccountPayableToSupabase(record);
        break;
      case 'contas_receber':
        payload = mapAccountReceivableToSupabase(record);
        break;
      case 'turnos_caixa':
        payload = mapShiftToSupabase(record);
        break;
    }

    if (action === 'insert') {
      const { error } = await supabase.from(table).insert([payload]);
      if (error) throw error;
    } else if (action === 'update') {
      const { error } = await supabase.from(table).update(payload).eq('id', payload.id);
      if (error) throw error;
    } else {
      // Upsert
      const { error } = await supabase.from(table).upsert(payload);
      if (error) throw error;
    }

    addSyncLog({
      table,
      action: action.toUpperCase() as any,
      origin: 'LOCAL_APP',
      description: `Registo "${payload.name || payload.code || payload.id}" sincronizado no Supabase`,
      status: 'success',
    });

    return { success: true };
  } catch (error: any) {
    // If table doesn't exist yet, handle gracefully
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return { success: false, error: 'Tabela ainda não configurada no Supabase' };
    }
    console.warn(`Erro ao sincronizar com Supabase na tabela ${table}:`, error);
    addSyncLog({
      table,
      action: action.toUpperCase() as any,
      origin: 'LOCAL_APP',
      description: `Erro ao enviar para o Supabase: ${error?.message || error}`,
      status: 'error',
    });
    return { success: false, error };
  }
}

/**
 * ============================================================================
 * PUXAR UMA TABELA ESPECÍFICA DO SUPABASE (SINGLE TABLE PULL)
 * ============================================================================
 */
export async function pullTableFromSupabase(table: TableSyncName): Promise<{
  success: boolean;
  data: any[];
  count: number;
  error?: string;
}> {
  let mapper: (row: any) => any = (r) => r;
  switch (table) {
    case 'produtos': mapper = mapSupabaseToProduct; break;
    case 'clientes': mapper = mapSupabaseToCustomer; break;
    case 'fornecedores': mapper = mapSupabaseToSupplier; break;
    case 'categorias': mapper = mapSupabaseToCategory; break;
    case 'vendas': mapper = mapSupabaseToSale; break;
    case 'usuarios': mapper = mapSupabaseToUser; break;
    case 'armazens': mapper = mapSupabaseToWarehouse; break;
    case 'stock': mapper = mapSupabaseToStock; break;
    case 'contas_pagar': mapper = mapSupabaseToAccountPayable; break;
    case 'contas_receber': mapper = mapSupabaseToAccountReceivable; break;
    case 'turnos_caixa': mapper = mapSupabaseToShift; break;
  }

  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      const errorMsg = error.code === '42P01' || error.message?.includes('does not exist')
        ? `Tabela "${table}" ainda não existe no Supabase. Execute o script SQL no Supabase.`
        : `Erro ao ler "${table}": ${error.message}`;
      
      addSyncLog({
        table,
        action: 'ERROR',
        origin: 'LOCAL_APP',
        description: errorMsg,
        status: 'error',
      });
      return { success: false, data: [], count: 0, error: errorMsg };
    }

    const mapped = Array.isArray(data) ? data.map(mapper) : [];
    addSyncLog({
      table,
      action: 'PULL',
      origin: 'LOCAL_APP',
      description: `Puxados ${mapped.length} registos da tabela "${table}" do Supabase com sucesso.`,
      status: 'success',
    });
    return { success: true, data: mapped, count: mapped.length };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    return { success: false, data: [], count: 0, error: errorMsg };
  }
}

/**
 * ============================================================================
 * ENVIAR UMA TABELA ESPECÍFICA PARA O SUPABASE (SINGLE TABLE PUSH)
 * ============================================================================
 */
export async function pushTableToSupabase(table: TableSyncName, items: any[]): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  if (!items || items.length === 0) {
    return { success: true, count: 0 };
  }

  let mapper: (item: any) => any = (i) => i;
  switch (table) {
    case 'produtos': mapper = mapProductToSupabase; break;
    case 'clientes': mapper = mapCustomerToSupabase; break;
    case 'fornecedores': mapper = mapSupplierToSupabase; break;
    case 'categorias': mapper = mapCategoryToSupabase; break;
    case 'vendas': mapper = mapSaleToSupabase; break;
    case 'usuarios': mapper = mapUserToSupabase; break;
    case 'armazens': mapper = mapWarehouseToSupabase; break;
    case 'stock': mapper = mapStockToSupabase; break;
    case 'contas_pagar': mapper = mapAccountPayableToSupabase; break;
    case 'contas_receber': mapper = mapAccountReceivableToSupabase; break;
    case 'turnos_caixa': mapper = mapShiftToSupabase; break;
  }

  try {
    const payload = items.map(mapper);
    // Batch in chunks of 50 to avoid request size limits
    const CHUNK_SIZE = 50;
    let uploadedCount = 0;

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from(table).upsert(chunk);
      if (error) {
        let cleanMsg = error.message;
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          cleanMsg = `Tabela "${table}" não existe no Supabase. Crie as tabelas com o script SQL.`;
        } else if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('policy')) {
          cleanMsg = `Bloqueado por RLS na tabela "${table}". Verifique as políticas de acesso no Supabase.`;
        }
        addSyncLog({
          table,
          action: 'ERROR',
          origin: 'LOCAL_APP',
          description: `Erro ao enviar para "${table}": ${cleanMsg}`,
          status: 'error',
        });
        return { success: false, count: uploadedCount, error: cleanMsg };
      }
      uploadedCount += chunk.length;
    }

    addSyncLog({
      table,
      action: 'PUSH',
      origin: 'LOCAL_APP',
      description: `Enviados ${uploadedCount} registos da tabela "${table}" para o Supabase com sucesso.`,
      status: 'success',
    });

    return { success: true, count: uploadedCount };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    return { success: false, count: 0, error: errorMsg };
  }
}

/**
 * ============================================================================
 * PUXAR TODAS AS TABELAS DO SUPABASE (FULL PULL RECONCILIATION)
 * ============================================================================
 */

export async function pullAllFromSupabase(): Promise<{
  success: boolean;
  counts: Record<string, number>;
  data: {
    products?: Product[];
    customers?: Customer[];
    suppliers?: Supplier[];
    categories?: ProductCategory[];
    sales?: Sale[];
    users?: User[];
    warehouses?: Warehouse[];
    stock?: StockItem[];
    accountsPayable?: AccountPayable[];
    accountsReceivable?: AccountReceivable[];
    shifts?: CashShift[];
  };
  errors: string[];
  tableResults: Record<string, { count: number; error?: string; status: 'ok' | 'error' | 'empty' }>;
}> {
  const result: any = {
    success: true,
    counts: {},
    data: {},
    errors: [],
    tableResults: {},
  };

  const fetchTable = async (table: TableSyncName, mapper: (row: any) => any, key: string) => {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        const errorMsg = (error.code === '42P01' || error.message?.includes('does not exist'))
          ? `Tabela "${table}" ainda não existe no Supabase (execute o script SQL).`
          : `Erro na tabela "${table}": ${error.message}`;
        result.errors.push(errorMsg);
        result.counts[table] = 0;
        result.tableResults[table] = { count: 0, error: errorMsg, status: 'error' };
        return;
      }
      if (Array.isArray(data)) {
        result.data[key] = data.map(mapper);
        result.counts[table] = data.length;
        result.tableResults[table] = {
          count: data.length,
          status: data.length > 0 ? 'ok' : 'empty',
        };
      }
    } catch (e: any) {
      const errTxt = `Falha ao ler ${table}: ${e.message || e}`;
      result.errors.push(errTxt);
      result.tableResults[table] = { count: 0, error: errTxt, status: 'error' };
    }
  };

  await Promise.all([
    fetchTable('usuarios', mapSupabaseToUser, 'users'),
    fetchTable('categorias', mapSupabaseToCategory, 'categories'),
    fetchTable('produtos', mapSupabaseToProduct, 'products'),
    fetchTable('clientes', mapSupabaseToCustomer, 'customers'),
    fetchTable('fornecedores', mapSupabaseToSupplier, 'suppliers'),
    fetchTable('armazens', mapSupabaseToWarehouse, 'warehouses'),
    fetchTable('stock', mapSupabaseToStock, 'stock'),
    fetchTable('vendas', mapSupabaseToSale, 'sales'),
    fetchTable('contas_pagar', mapSupabaseToAccountPayable, 'accountsPayable'),
    fetchTable('contas_receber', mapSupabaseToAccountReceivable, 'accountsReceivable'),
    fetchTable('turnos_caixa', mapSupabaseToShift, 'shifts'),
  ]);

  result.success = result.errors.length === 0;

  addSyncLog({
    table: 'ALL',
    action: 'PULL',
    origin: 'LOCAL_APP',
    description: result.success
      ? `Sincronização completa concluída com sucesso (${Object.values(result.counts).reduce((a: any, b: any) => a + b, 0)} registos obtidos).`
      : `Sincronização concluída com avisos em ${result.errors.length} tabelas.`,
    status: result.success ? 'success' : 'info',
  });

  return result;
}

/**
 * ============================================================================
 * ENVIAR TODOS OS DADOS LOCAIS PARA O SUPABASE (FULL PUSH)
 * ============================================================================
 */

export async function pushAllToSupabase(localData: {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  categories: ProductCategory[];
  sales: Sale[];
  users: User[];
  warehouses: Warehouse[];
  stock: StockItem[];
  accountsPayable: AccountPayable[];
  accountsReceivable: AccountReceivable[];
  shifts: CashShift[];
}): Promise<{
  success: boolean;
  uploaded: Record<string, number>;
  errors: string[];
  tableResults: Record<string, { count: number; error?: string; status: 'ok' | 'error' | 'empty' }>;
}> {
  const result = {
    success: true,
    uploaded: {} as Record<string, number>,
    errors: [] as string[],
    tableResults: {} as Record<string, { count: number; error?: string; status: 'ok' | 'error' | 'empty' }>,
  };

  const uploadBatch = async (table: TableSyncName, items: any[], mapper: (item: any) => any) => {
    if (!items || items.length === 0) {
      result.uploaded[table] = 0;
      result.tableResults[table] = { count: 0, status: 'empty' };
      return;
    }
    try {
      const payload = items.map(mapper);
      const CHUNK_SIZE = 50;
      let totalForTable = 0;

      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from(table).upsert(chunk);
        if (error) {
          let errorMsg = `Erro na tabela "${table}": ${error.message}`;
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            errorMsg = `Tabela "${table}" ainda não existe no Supabase. Execute o script SQL no Supabase.`;
          } else if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('policy')) {
            errorMsg = `Permissão negada (RLS) na tabela "${table}". Verifique as políticas de segurança.`;
          }
          result.errors.push(errorMsg);
          result.uploaded[table] = totalForTable;
          result.tableResults[table] = { count: totalForTable, error: errorMsg, status: 'error' };
          return;
        }
        totalForTable += chunk.length;
      }

      result.uploaded[table] = totalForTable;
      result.tableResults[table] = { count: totalForTable, status: 'ok' };
    } catch (e: any) {
      const errTxt = `Erro ao exportar ${table}: ${e.message || e}`;
      result.errors.push(errTxt);
      result.uploaded[table] = 0;
      result.tableResults[table] = { count: 0, error: errTxt, status: 'error' };
    }
  };

  // Upload in logical sequence: references first
  await uploadBatch('usuarios', localData.users, mapUserToSupabase);
  await uploadBatch('categorias', localData.categories, mapCategoryToSupabase);
  await uploadBatch('armazens', localData.warehouses, mapWarehouseToSupabase);
  await uploadBatch('fornecedores', localData.suppliers, mapSupplierToSupabase);
  await uploadBatch('clientes', localData.customers, mapCustomerToSupabase);
  await uploadBatch('produtos', localData.products, mapProductToSupabase);
  await uploadBatch('stock', localData.stock, mapStockToSupabase);
  await uploadBatch('vendas', localData.sales, mapSaleToSupabase);
  await uploadBatch('contas_pagar', localData.accountsPayable, mapAccountPayableToSupabase);
  await uploadBatch('contas_receber', localData.accountsReceivable, mapAccountReceivableToSupabase);
  await uploadBatch('turnos_caixa', localData.shifts, mapShiftToSupabase);

  result.success = result.errors.length === 0;

  const totalCount = Object.values(result.uploaded).reduce((a, b) => a + b, 0);
  addSyncLog({
    table: 'ALL',
    action: 'PUSH',
    origin: 'LOCAL_APP',
    description: result.success
      ? `Exportação total para o Supabase concluída com sucesso (${totalCount} registos enviados em 11 tabelas).`
      : `Exportação para o Supabase concluída com ${result.errors.length} erro(s). ${totalCount} registos enviados.`,
    status: result.success ? 'success' : 'error',
  });

  return result;
}
