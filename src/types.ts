// Types for the Sistema Integrado POS/ERP Empresarial

export type Role = 'caixa' | 'gerente' | 'financeiro' | 'rh' | 'comprador' | 'admin';

export type AppTheme = 'dark' | 'light' | 'midnight' | 'emerald';

export type Language = 'pt' | 'en';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  country: string;
  dateFormat: string;
  description: string;
}

export interface ModulePermission {
  read: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  fiscal?: boolean;
}

export interface UserPermissions {
  pos: ModulePermission;
  documents: ModulePermission;
  stores: ModulePermission;
  stock: ModulePermission;
  finance: ModulePermission;
  hr: ModulePermission;
  procurement: ModulePermission;
  crm: ModulePermission;
  orders: ModulePermission;
  events: ModulePermission;
  settings: ModulePermission;
  users: ModulePermission;
  analytics?: ModulePermission;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: Role;
  roleId?: string;
  storeId?: string;
  storeIds?: string[];
  companyId?: string;
  pin: string;
  avatarUrl?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
  permissions?: UserPermissions;
}

export interface RoleDefinition {
  id: Role;
  name: string;
  description: string;
  badge: string;
  color: string;
  permissions: UserPermissions;
}

export interface FiscalSeries {
  id: string;
  companyId: string;
  code: string; // e.g. "2026A", "POS1"
  description: string;
  documentType: 'FT' | 'FS' | 'FR' | 'NC' | 'TODOS';
  currentSequence: number;
  isActive: boolean;
  atValidationCode?: string;
  startingDate: string;
  closingDate?: string;
}

export interface InvoiceTemplateConfig {
  id: string;
  name: string; // e.g. "Clássico Executivo", "Moderno Minimalista", "Modelo Agro / Vendus MZ", "Talão Térmico POS 80mm"
  style: 'classic' | 'modern' | 'corporate' | 'thermal' | 'agro_mz' | 'vendus_mz';
  paperSize: 'A4' | 'A5' | '80mm';
  accentColor: string; // Hex color code (e.g. #c5a47e, #2563eb, #166534, #171717, #831843)
  primaryColor?: string;
  showLogo: boolean;
  logoPosition: 'left' | 'center' | 'right';
  showWatermark: boolean;
  watermarkText?: string;
  showQRCode: boolean;
  showQrCode?: boolean;
  showPaymentInfo: boolean;
  iban?: string;
  bankIban?: string;
  bankName?: string;
  accountNumber?: string;
  swiftBic?: string;
  headerNotes?: string;
  footerNotes?: string;
  legalNotice?: string;
  fontFamily: 'serif' | 'sans' | 'mono';
  isDefault?: boolean;
}

export interface CurrencyDefinition {
  code: string;
  symbol: string;
  name: string;
  country: string;
  flag: string;
  position: 'prefix' | 'suffix';
  spaceBetween: boolean;
  decimalPlaces: number;
  decimalSeparator: ',' | '.' | '$';
  thousandsSeparator: '.' | ',' | ' ' | '' | "'";
}

export interface Company {
  id: string;
  name: string;
  tradeName: string;
  taxNumber: string; // NIF / NIPC / NUIT
  address: string;
  city: string;
  postalCode: string;
  country: string;
  currency: string; // e.g. 'MZN', 'EUR', 'USD', 'AOA', 'BRL', 'CVE', 'STN', 'ZAR', 'GBP', 'CHF'
  currencySymbol?: string; // e.g. 'Mt', '€', '$', 'Kz'
  currencyPosition?: 'prefix' | 'suffix';
  currencyDecimals?: number;
  phone: string;
  mobile?: string;
  email: string;
  website?: string;
  logoUrl?: string; // Logótipo da Empresa (URL / Base64)
  softwareCertNumber: string; // ex: 3412/AT ou Autoridade Tributária local
  saftVersion: string;
  shareCapital?: string;
  commercialRegistryNumber?: string;
  defaultIban?: string;
  defaultBank?: string;
  activeInvoiceTemplateId?: string;
  invoiceTemplates?: InvoiceTemplateConfig[];
}

export interface Store {
  id: string;
  companyId: string;
  code: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  managerId: string;
  defaultWarehouseId: string;
  terminalsCount: number;
}

export interface Terminal {
  id: string;
  storeId: string;
  code: string; // ex: "POS-01"
  description: string;
  isActive: boolean;
  currentShiftId: string | null;
  printerModel?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface Product {
  id: string;
  companyId: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  price: number; // PVP com IVA
  costPrice: number; // Preço de Custo
  taxRate: number; // ex: 23, 13, 6, 0 (%)
  unit: string; // "un", "kg", "l", "cx"
  minStock: number;
  maxStock: number;
  imageUrl?: string;
  hasBatchControl: boolean;
  supplierId?: string;
  description?: string;
}

export interface Warehouse {
  id: string;
  companyId: string;
  storeId?: string;
  name: string;
  code: string;
  location: string;
  isDefault: boolean;
}

export interface StockItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reserved: number;
  avgCost: number; // Custo Médio Ponderado
  batchNumber?: string;
  expiryDate?: string;
}

export type MovementType = 'entrada' | 'saida' | 'transferencia' | 'ajuste' | 'quebra' | 'venda' | 'devolucao';

export interface StockMovement {
  id: string;
  companyId: string;
  movementNumber?: string;
  date?: string;
  timestamp?: string;
  type: MovementType;
  productId: string;
  sourceWarehouseId?: string;
  originWarehouseId?: string;
  targetWarehouseId?: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  referenceDoc?: string; // ex: "FT 2026/0142" or "RC 2026/001"
  reason?: string;
  operatorId: string;
}

export interface LotBatch {
  id: string;
  productId: string;
  warehouseId: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  initialQuantity: number;
  currentQuantity: number;
  supplierId?: string;
}

export interface PhysicalCount {
  id: string;
  companyId: string;
  warehouseId: string;
  date: string;
  title: string;
  status: 'rascunho' | 'em_contagem' | 'fechado' | 'cancelado';
  responsibleId: string;
  notes?: string;
  items: {
    productId: string;
    systemQuantity: number;
    countedQuantity: number;
    difference: number;
    unitCost: number;
  }[];
}

export type PaymentMethod = 'dinheiro' | 'cartao' | 'mbway' | 'transferencia' | 'vale';

export interface PaymentRecord {
  id?: string;
  method: PaymentMethod;
  amount: number;
  reference?: string; // TPA Auth or MB Way transaction ref
  status?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  unit?: string;
  lotNumber?: string;
  batchNumber?: string;
}

export interface Sale {
  id: string;
  companyId: string;
  storeId: string;
  terminalId: string;
  invoiceNumber: string; // ex: "FS 2026/0001"
  invoiceType: 'FS' | 'FT' | 'FR' | 'NC'; // Fatura Simplificada, Fatura, Fatura-Recibo, Nota de Crédito
  date: string;
  dueDate?: string;
  customerId?: string;
  customerName?: string;
  customerTaxNumber?: string; // NIF
  customerNif?: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  payments: PaymentRecord[];
  changeAmount?: number; // Troco
  operatorId: string;
  operatorName: string;
  shiftId: string;
  fiscalHash: string; // SHA-256 digital signature
  previousHash: string;
  isSynced: boolean; // For offline sync tracking
  isOfflineCreated?: boolean;
  isOffline?: boolean;
  atcud?: string;
  invoiceTemplateId?: string; // ID do modelo de fatura escolhido na emissão
  notes?: string;
}

export interface CashShift {
  id: string;
  companyId: string;
  storeId: string;
  terminalId: string;
  operatorId: string;
  operatorName: string;
  openedAt: string;
  closedAt?: string;
  status: 'aberto' | 'fechado';
  initialCash: number; // Fundo de Maneio
  finalCashReported?: number;
  finalCashSystem?: number;
  cashDifference?: number;
  totalSales: number;
  totalCash: number;
  totalCards: number;
  totalMbway: number;
  totalTransfers: number;
  totalVouchers: number;
  sangriaTotal: number; // Cash withdrawals
  suprimentoTotal: number; // Cash additions
  movements: {
    id: string;
    type: 'sangria' | 'suprimento';
    amount: number;
    reason: string;
    timestamp: string;
    authorizedBy?: string;
  }[];
  zReportNumber?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  taxNumber: string; // NIF
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country?: string;
  segment?: 'vip' | 'recorrente' | 'novo' | 'em_risco';
  loyaltyPoints: number;
  loyaltyTier: 'Bronze' | 'Prata' | 'Ouro' | 'Platina' | 'bronze' | 'prata' | 'ouro' | 'platina';
  totalSpent: number;
  ordersCount?: number;
  creditLimit?: number;
  currentCredit?: number;
  createdAt: string;
  notes?: string;
}

export interface CallLog {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  timestamp: string;
  durationSeconds: number;
  outcome: 'venda_realizada' | 'contacto_positivo' | 'agendamento' | 'nao_atendeu' | 'ocupado' | 'reclamacao' | 'informacao';
  notes?: string;
  operatorName?: string;
  direction?: 'saida' | 'entrada';
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  validUntil: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
}

export interface LeadOpportunity {
  id: string;
  companyId: string;
  title: string;
  contactName: string;
  companyName: string;
  email: string;
  phone: string;
  expectedValue: number;
  stage: 'lead' | 'contacto' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';
  probability: number; // 0 - 100%
  assignedTo: string;
  createdAt: string;
  nextFollowUp?: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  code: string;
  name: string;
  tradeName: string;
  taxNumber: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string; // ex: "30 dias", "Pronto Pagamento", "60 dias"
  iban: string;
  rating: number; // 1-5
  categories: string[];
}

export interface PurchaseRequisition {
  id: string;
  companyId: string;
  code: string; // ex: "RC-2026-001"
  date: string;
  requesterId: string;
  requesterName: string;
  department: string;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'convertido_em_ordem';
  approvedBy?: string;
  approvalDate?: string;
  notes?: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    estimatedUnitCost: number;
    total: number;
  }[];
  totalEstimated: number;
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  code?: string; // ex: "OC-2026-004"
  orderNumber?: string;
  date?: string;
  createdAt?: string;
  supplierId: string;
  supplierName: string;
  warehouseId?: string;
  destinationWarehouseId?: string;
  status?: 'rascunho' | 'emitida' | 'enviada' | 'recebida' | 'recebida_parcial' | 'recebida_total' | 'cancelada';
  deliveryDateExpected?: string;
  expectedDeliveryDate?: string;
  paymentTerms?: string;
  items: {
    productId: string;
    productName: string;
    sku?: string;
    quantity?: number;
    quantityOrdered?: number;
    quantityReceived?: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }[];
  subtotal: number;
  taxTotal: number;
  total: number;
  notes?: string;
}

export interface GoodsReceipt {
  id: string;
  companyId: string;
  receiptNumber: string; // ex: "RM-2026-001"
  date: string;
  purchaseOrderId: string;
  supplierId: string;
  warehouseId: string;
  supplierDocNumber: string; // Guia de Remessa do Fornecedor
  items: {
    productId: string;
    productName: string;
    quantityReceived: number;
    batchNumber?: string;
    expiryDate?: string;
    unitCost: number;
  }[];
  operatorId: string;
  createsPayable: boolean;
}

export interface Invoice {
  id: string;
  companyId: string;
  type: 'FT' | 'FS' | 'FR' | 'NC';
  series: string; // ex: "2026A"
  number: number;
  fullNumber: string; // ex: "FT 2026A/00142"
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerTaxNumber: string;
  customerAddress: string;
  items: SaleItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  status: 'emitida' | 'paga' | 'anulada' | 'vencida';
  fiscalSignature: string;
  atcud?: string;
  qrCodeData: string;
  referenceDocId?: string; // For NCs
}

export interface AccountPayable {
  id: string;
  companyId: string;
  supplierId: string;
  supplierName: string;
  documentNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  status?: 'pendente' | 'pago' | 'parcial' | 'vencido';
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface AccountReceivable {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  documentNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  receivedAmount: number;
  status: 'pendente' | 'pago' | 'parcial' | 'vencido';
  receiptDate?: string;
}

export interface ChartOfAccounts {
  code: string; // ex: "11", "21", "31", "61", "71"
  name: string;
  type: 'ativo' | 'passivo' | 'capital_proprio' | 'rendimento' | 'gasto';
  level: number;
  parentCode?: string;
}

export interface LedgerEntry {
  id: string;
  companyId: string;
  entryNumber: string;
  date: string;
  description: string;
  sourceDoc: string; // ex: "Venda POS #1024" or "Fatura FT 2026A/12"
  lines: {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }[];
  totalDebit?: number;
  totalCredit?: number;
  debitTotal?: number;
  creditTotal?: number;
}

export interface BankTransaction {
  id: string;
  companyId: string;
  date: string;
  description: string;
  amount: number;
  type: 'credito' | 'debito';
  reconciled: boolean;
  matchedEntityDoc?: string;
}

export interface Employee {
  id: string;
  companyId: string;
  code: string;
  name: string;
  role: string;
  department: string;
  storeId: string;
  taxNumber: string; // NIF
  socialSecurityNumber: string; // NISS
  email: string;
  phone: string;
  baseSalary: number;
  mealAllowanceDaily: number;
  contractType: 'sem_termo' | 'termo_certo' | 'estagio';
  admissionDate: string;
  status: 'ativo' | 'ferias' | 'licenca' | 'inativo';
  avatarUrl?: string;
}

export interface EmployeeShift {
  id: string;
  employeeId: string;
  storeId: string;
  date: string;
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  breakDurationMinutes: number;
  roleAssigned: string;
  status: 'planeado' | 'cumprido' | 'falta' | 'troca';
}

export interface TimeClockEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  storeId: string;
  date: string;
  clockIn: string; // "08:58"
  lunchOut?: string; // "13:00"
  lunchIn?: string; // "14:00"
  clockOut?: string; // "18:05"
  totalHours: number;
  overtimeHours: number;
  status: 'completo' | 'em_curso' | 'anomalia';
}

export interface PayrollSlip {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  taxNumber: string;
  monthYear: string; // "08/2026"
  baseSalary: number;
  mealAllowance: number; // 22 dias * valor diario
  overtimePay: number;
  bonus: number;
  grossTotal: number;
  socialSecurityDeduction: number; // 11% trabalhador
  irsRetention: number; // % retenção na fonte
  netSalary: number;
  companySocialSecurity: number; // 23.75% TSU
  totalEmployerCost: number;
  status: 'processado' | 'pago';
  paymentDate?: string;
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  service: 'POS' | 'Stock' | 'Financeiro' | 'RH' | 'Compras' | 'CRM' | 'IAM' | 'EventBus';
  eventType: string; // ex: "pos.sale.completed", "stock.decremented", "finance.ledger.recorded"
  tenantId: string;
  payload: Record<string, any>;
  status: 'published' | 'processed' | 'failed';
}

export interface OfflineSyncQueueItem {
  id: string;
  timestamp: string;
  action: 'create_sale' | 'update_stock' | 'close_shift' | 'create_customer' | string;
  data: any;
  entity?: string;
  status: 'pending' | 'syncing' | 'synced' | 'conflict';
  retryCount: number;
}

export type OmnichannelOrderStatus =
  | 'pendente'
  | 'em_preparacao'
  | 'pronto_levantamento'
  | 'expedido'
  | 'concluido'
  | 'entregue'
  | 'cancelado';

export interface OmnichannelOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OmnichannelOrder {
  id: string;
  orderNumber: string; // ex: "ENC-2026/089"
  channel: 'ecommerce' | 'app_mobile' | 'click_collect' | 'telefone';
  customerName: string;
  customerNif: string;
  customerEmail: string;
  customerPhone: string;
  deliveryType: 'levantamento_loja' | 'entrega_domicilio' | 'expresso_2h';
  pickupStoreId?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryPostalCode?: string;
  items: OmnichannelOrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: 'mbway' | 'multibanco' | 'cartao' | 'pagamento_na_loja';
  paymentStatus: 'pago' | 'pendente' | 'reembolsado';
  status: OmnichannelOrderStatus;
  createdAt: string;
  estimatedDelivery?: string;
  invoiceId?: string;
  notes?: string;
}

// Aliases for compatibility
export type Account = ChartOfAccounts;
export type TimeEntry = TimeClockEntry;
export type Payroll = PayrollSlip;
export type POSTerminal = Terminal;

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  itemDetails?: string;
  onConfirm: () => void;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}
