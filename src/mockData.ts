import {
  Role,
  RoleDefinition,
  UserPermissions,
  Company,
  Store,
  Terminal,
  User,
  ProductCategory,
  Product,
  Warehouse,
  StockItem,
  Supplier,
  Customer,
  Employee,
  EmployeeShift,
  BankTransaction,
  FiscalSeries,
  ChartOfAccounts,
  AccountPayable,
  AccountReceivable,
  Invoice,
  CashShift,
  SystemEvent,
  PurchaseOrder,
  PurchaseRequisition,
  TimeClockEntry,
  PayrollSlip,
  LeadOpportunity,
  LotBatch,
  OmnichannelOrder,
  InvoiceTemplateConfig,
  CallLog,
  VatRate,
} from './types';

export const defaultVatRates: VatRate[] = [
  {
    id: 'vat-normal-16',
    name: 'Taxa Normal (16%)',
    rate: 16,
    code: 'NOR',
    isDefault: true,
    isActive: true,
    description: 'Taxa padrão de IVA em Moçambique',
  },
  {
    id: 'vat-isento-0',
    name: 'Taxa Isenta / Zero (0%)',
    rate: 0,
    code: 'ISE',
    isDefault: false,
    isActive: true,
    exemptionReason: 'Artigo 9.º do Código do IVA (Bens Essenciais / Isenção Legal)',
    description: 'Produtos de primeira necessidade, medicamentos e exportações',
  },
  {
    id: 'vat-reduzida-5',
    name: 'Taxa Reduzida (5%)',
    rate: 5,
    code: 'RED',
    isDefault: false,
    isActive: true,
    description: 'Taxa reduzida aplicável a bens ou serviços especiais',
  },
  {
    id: 'vat-intermedia-10',
    name: 'Taxa Intermédia (10%)',
    rate: 10,
    code: 'INT',
    isDefault: false,
    isActive: true,
    description: 'Taxa intermédia setorial',
  },
  {
    id: 'vat-pt-normal-23',
    name: 'Taxa Normal PT (23%)',
    rate: 23,
    code: 'NOR_PT',
    isDefault: false,
    isActive: false,
    description: 'Taxa normal em Portugal continental',
  },
  {
    id: 'vat-pt-reduzida-6',
    name: 'Taxa Reduzida PT (6%)',
    rate: 6,
    code: 'RED_PT',
    isDefault: false,
    isActive: false,
    description: 'Taxa reduzida em Portugal continental',
  },
  {
    id: 'vat-pt-intermedia-13',
    name: 'Taxa Intermédia PT (13%)',
    rate: 13,
    code: 'INT_PT',
    isDefault: false,
    isActive: false,
    description: 'Taxa intermédia em Portugal continental',
  },
];

export const defaultInvoiceTemplates: InvoiceTemplateConfig[] = [
  {
    id: 'tmpl-agro-vendus',
    name: 'Modelo Padrão Facturação (A4)',
    style: 'agro_mz',
    paperSize: 'A4',
    accentColor: '#166534',
    primaryColor: '#166534',
    showLogo: true,
    logoPosition: 'left',
    showWatermark: true,
    watermarkText: 'ORIGINAL',
    showQRCode: true,
    showPaymentInfo: true,
    iban: '',
    bankIban: '',
    bankName: '',
    accountNumber: '',
    swiftBic: '',
    headerNotes: '',
    footerNotes: 'Obrigado pela sua preferência!',
    legalNotice: 'Processado por programa de computador certificado',
    fontFamily: 'sans',
    isDefault: true,
  },
  {
    id: 'tmpl-modern-mz',
    name: 'Moderno Corporativo (A4)',
    style: 'corporate',
    paperSize: 'A4',
    accentColor: '#0284c7',
    primaryColor: '#0284c7',
    showLogo: true,
    logoPosition: 'left',
    showWatermark: false,
    watermarkText: '',
    showQRCode: true,
    showPaymentInfo: true,
    iban: '',
    bankIban: '',
    bankName: '',
    accountNumber: '',
    swiftBic: '',
    headerNotes: '',
    footerNotes: 'Documento processado por computador.',
    legalNotice: 'Imposto Discriminado nos termos da legislação em vigor',
    fontFamily: 'sans',
    isDefault: false,
  },
  {
    id: 'tmpl-thermal',
    name: 'Talão Térmico POS (80mm)',
    style: 'thermal',
    paperSize: '80mm',
    accentColor: '#171717',
    primaryColor: '#171717',
    showLogo: false,
    logoPosition: 'center',
    showWatermark: false,
    showQRCode: true,
    showPaymentInfo: false,
    headerNotes: 'Talão de Venda a Balcão / POS',
    footerNotes: 'Conserve este talão. Obrigado pela visita!',
    legalNotice: 'Fatura Simplificada emitida nos termos da lei.',
    fontFamily: 'mono',
    isDefault: false,
  },
];

// Empresa virgem pronta para ser configurada pelo utilizador
export const initialCompanies: Company[] = [
  {
    id: 'comp-1',
    name: 'A Minha Empresa, Lda.',
    tradeName: '',
    taxNumber: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Moçambique',
    currency: 'MZN',
    currencySymbol: 'Mt',
    currencyPosition: 'suffix',
    currencyDecimals: 2,
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    softwareCertNumber: '0000/AT',
    saftVersion: '1.04_01',
    shareCapital: '',
    commercialRegistryNumber: '',
    defaultIban: '',
    defaultBank: '',
    activeInvoiceTemplateId: 'tmpl-agro-vendus',
    invoiceTemplates: defaultInvoiceTemplates,
    defaultTaxRate: 16,
    vatRates: defaultVatRates,
  },
];

export const initialStores: Store[] = [
  {
    id: 'store-1',
    companyId: 'comp-1',
    code: 'LOJA-01',
    name: 'Loja Principal',
    address: '',
    city: '',
    phone: '',
    managerId: 'usr-admin',
    defaultWarehouseId: 'wh-1',
    terminalsCount: 1,
  },
];

export const initialTerminals: Terminal[] = [
  {
    id: 'term-1',
    storeId: 'store-1',
    code: 'POS-01',
    description: 'Caixa Balcão',
    isActive: true,
    currentShiftId: null,
    printerModel: 'Impressora Térmica 80mm',
  },
];

export { initialSales } from './data/mockSales';

export const defaultPermissionsByRole: Record<Role, UserPermissions> = {
  admin: {
    pos: { read: true, create: true, edit: true, delete: true, fiscal: true },
    documents: { read: true, create: true, edit: true, delete: true, fiscal: true },
    stores: { read: true, create: true, edit: true, delete: true, fiscal: true },
    stock: { read: true, create: true, edit: true, delete: true, fiscal: true },
    finance: { read: true, create: true, edit: true, delete: true, fiscal: true },
    hr: { read: true, create: true, edit: true, delete: true, fiscal: true },
    procurement: { read: true, create: true, edit: true, delete: true, fiscal: true },
    crm: { read: true, create: true, edit: true, delete: true, fiscal: true },
    orders: { read: true, create: true, edit: true, delete: true, fiscal: true },
    events: { read: true, create: true, edit: true, delete: true, fiscal: true },
    settings: { read: true, create: true, edit: true, delete: true, fiscal: true },
    users: { read: true, create: true, edit: true, delete: true, fiscal: true },
    analytics: { read: true, create: true, edit: true, delete: true, fiscal: true },
  },
  gerente: {
    pos: { read: true, create: true, edit: true, delete: true, fiscal: true },
    documents: { read: true, create: true, edit: true, delete: true, fiscal: true },
    stores: { read: true, create: true, edit: true, delete: false, fiscal: true },
    stock: { read: true, create: true, edit: true, delete: true, fiscal: false },
    finance: { read: true, create: true, edit: true, delete: false, fiscal: true },
    hr: { read: true, create: true, edit: true, delete: false, fiscal: false },
    procurement: { read: true, create: true, edit: true, delete: false, fiscal: false },
    crm: { read: true, create: true, edit: true, delete: true, fiscal: false },
    orders: { read: true, create: true, edit: true, delete: true, fiscal: false },
    events: { read: true, create: true, edit: false, delete: false, fiscal: false },
    settings: { read: true, create: true, edit: true, delete: false, fiscal: true },
    users: { read: true, create: true, edit: true, delete: false, fiscal: false },
    analytics: { read: true, create: true, edit: true, delete: false, fiscal: true },
  },
  caixa: {
    pos: { read: true, create: true, edit: false, delete: false, fiscal: true },
    documents: { read: true, create: true, edit: false, delete: false, fiscal: true },
    stores: { read: false, create: false, edit: false, delete: false, fiscal: false },
    stock: { read: true, create: false, edit: false, delete: false, fiscal: false },
    finance: { read: false, create: false, edit: false, delete: false, fiscal: false },
    hr: { read: false, create: false, edit: false, delete: false, fiscal: false },
    procurement: { read: false, create: false, edit: false, delete: false, fiscal: false },
    crm: { read: true, create: true, edit: false, delete: false, fiscal: false },
    orders: { read: true, create: true, edit: true, delete: false, fiscal: false },
    events: { read: false, create: false, edit: false, delete: false, fiscal: false },
    settings: { read: false, create: false, edit: false, delete: false, fiscal: false },
    users: { read: false, create: false, edit: false, delete: false, fiscal: false },
    analytics: { read: true, create: false, edit: false, delete: false, fiscal: false },
  },
  financeiro: {
    pos: { read: true, create: false, edit: false, delete: false, fiscal: true },
    documents: { read: true, create: true, edit: true, delete: true, fiscal: true },
    stores: { read: true, create: false, edit: false, delete: false, fiscal: false },
    stock: { read: true, create: false, edit: false, delete: false, fiscal: false },
    finance: { read: true, create: true, edit: true, delete: true, fiscal: true },
    hr: { read: true, create: false, edit: false, delete: false, fiscal: false },
    procurement: { read: true, create: true, edit: true, delete: false, fiscal: false },
    crm: { read: true, create: false, edit: false, delete: false, fiscal: false },
    orders: { read: true, create: false, edit: false, delete: false, fiscal: false },
    events: { read: true, create: false, edit: false, delete: false, fiscal: false },
    settings: { read: true, create: false, edit: false, delete: false, fiscal: true },
    users: { read: false, create: false, edit: false, delete: false, fiscal: false },
    analytics: { read: true, create: true, edit: true, delete: true, fiscal: true },
  },
  rh: {
    pos: { read: false, create: false, edit: false, delete: false, fiscal: false },
    documents: { read: false, create: false, edit: false, delete: false, fiscal: false },
    stores: { read: false, create: false, edit: false, delete: false, fiscal: false },
    stock: { read: false, create: false, edit: false, delete: false, fiscal: false },
    finance: { read: false, create: false, edit: false, delete: false, fiscal: false },
    hr: { read: true, create: true, edit: true, delete: true, fiscal: false },
    procurement: { read: false, create: false, edit: false, delete: false, fiscal: false },
    crm: { read: false, create: false, edit: false, delete: false, fiscal: false },
    orders: { read: false, create: false, edit: false, delete: false, fiscal: false },
    events: { read: false, create: false, edit: false, delete: false, fiscal: false },
    settings: { read: false, create: false, edit: false, delete: false, fiscal: false },
    users: { read: false, create: false, edit: false, delete: false, fiscal: false },
    analytics: { read: false, create: false, edit: false, delete: false, fiscal: false },
  },
  comprador: {
    pos: { read: false, create: false, edit: false, delete: false, fiscal: false },
    documents: { read: true, create: false, edit: false, delete: false, fiscal: false },
    stores: { read: false, create: false, edit: false, delete: false, fiscal: false },
    stock: { read: true, create: true, edit: true, delete: false, fiscal: false },
    finance: { read: true, create: false, edit: false, delete: false, fiscal: false },
    hr: { read: false, create: false, edit: false, delete: false, fiscal: false },
    procurement: { read: true, create: true, edit: true, delete: true, fiscal: false },
    crm: { read: false, create: false, edit: false, delete: false, fiscal: false },
    orders: { read: true, create: false, edit: false, delete: false, fiscal: false },
    events: { read: false, create: false, edit: false, delete: false, fiscal: false },
    settings: { read: false, create: false, edit: false, delete: false, fiscal: false },
    users: { read: false, create: false, edit: false, delete: false, fiscal: false },
    analytics: { read: true, create: false, edit: false, delete: false, fiscal: false },
  },
};

export const initialRoles: RoleDefinition[] = [
  {
    id: 'admin',
    name: 'Administrador Geral',
    description: 'Acesso total a todos os módulos, parametrizações fiscais e gestão global de utilizadores',
    badge: 'ADMIN',
    color: 'border-red-500/30 text-red-400 bg-red-500/10',
    permissions: defaultPermissionsByRole.admin,
  },
  {
    id: 'gerente',
    name: 'Gerente de Loja',
    description: 'Gestão operacional de loja, supervisão de caixa, stocks, inventário e relatórios de vendas',
    badge: 'GERENTE',
    color: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    permissions: defaultPermissionsByRole.gerente,
  },
  {
    id: 'caixa',
    name: 'Operador de Caixa (POS)',
    description: 'Operações de caixa, emissão de faturas simplificadas, abertura/fecho de turno e fidelização',
    badge: 'POS / CAIXA',
    color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    permissions: defaultPermissionsByRole.caixa,
  },
  {
    id: 'financeiro',
    name: 'Responsável Financeiro & Contabilista',
    description: 'Contabilidade, tesouraria, reconciliação bancária, apuramento de IVA e relatórios fiscais',
    badge: 'FINANCEIRO',
    color: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
    permissions: defaultPermissionsByRole.financeiro,
  },
  {
    id: 'rh',
    name: 'Recursos Humanos',
    description: 'Gestão de colaboradores, assiduidade, controlo de turnos e processamento de salários',
    badge: 'RECURSOS HUMANOS',
    color: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
    permissions: defaultPermissionsByRole.rh,
  },
  {
    id: 'comprador',
    name: 'Gestor de Compras & Procurement',
    description: 'Gestão de fornecedores, requisições de compra, ordens de encomenda e receção de mercadorias',
    badge: 'COMPRAS',
    color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
    permissions: defaultPermissionsByRole.comprador,
  },
];

export const initialUsers: User[] = [
  {
    id: 'usr-admin',
    name: 'Administrador',
    username: 'admin',
    email: 'admin@empresa.com',
    password: 'admin',
    role: 'admin',
    storeId: 'store-1',
    companyId: 'comp-1',
    pin: '1234',
    phone: '',
    isActive: true,
    createdAt: new Date().toISOString().split('T')[0],
    avatarUrl: '',
    permissions: defaultPermissionsByRole.admin,
  },
  {
    id: 'usr-caixa',
    name: 'Operador de Caixa',
    username: 'caixa',
    email: 'caixa@empresa.com',
    password: '1234',
    role: 'caixa',
    storeId: 'store-1',
    companyId: 'comp-1',
    pin: '1111',
    phone: '',
    isActive: true,
    createdAt: new Date().toISOString().split('T')[0],
    avatarUrl: '',
    permissions: defaultPermissionsByRole.caixa,
  },
];

export const initialFiscalSeries: FiscalSeries[] = [
  {
    id: 'ser-2026a',
    companyId: 'comp-1',
    code: '2026A',
    description: 'Série Geral de Faturação 2026',
    documentType: 'TODOS',
    currentSequence: 0,
    isActive: true,
    atValidationCode: 'AT-VAL-2026-A',
    startingDate: '2026-01-01',
  },
  {
    id: 'ser-pos1',
    companyId: 'comp-1',
    code: 'POS1',
    description: 'Série Balcão POS (Faturas Simplificadas)',
    documentType: 'FS',
    currentSequence: 0,
    isActive: true,
    atValidationCode: 'AT-VAL-2026-POS1',
    startingDate: '2026-01-01',
  },
  {
    id: 'ser-nc',
    companyId: 'comp-1',
    code: 'NC26',
    description: 'Série de Notas de Crédito',
    documentType: 'NC',
    currentSequence: 0,
    isActive: true,
    atValidationCode: 'AT-VAL-2026-NC',
    startingDate: '2026-01-01',
  },
];

export const initialCategories: ProductCategory[] = [];

export const initialWarehouses: Warehouse[] = [
  {
    id: 'wh-1',
    companyId: 'comp-1',
    storeId: 'store-1',
    name: 'Armazém Principal',
    code: 'ARM-01',
    location: 'Sede',
    isDefault: true,
  },
];

export const initialProducts: Product[] = [];

export const initialStock: StockItem[] = [];

export const initialLots: LotBatch[] = [];

export const initialSuppliers: Supplier[] = [];

// Lista de clientes limpa (sem registos prévios)
export const initialCustomers: Customer[] = [];

export const initialChartOfAccounts: ChartOfAccounts[] = [
  { code: '11', name: 'Caixa', type: 'ativo', level: 1 },
  { code: '11.1', name: 'Caixa Principal', type: 'ativo', level: 2, parentCode: '11' },
  { code: '11.2', name: 'Caixa POS', type: 'ativo', level: 2, parentCode: '11' },
  { code: '12', name: 'Depósitos à Ordem (Bancos)', type: 'ativo', level: 1 },
  { code: '21', name: 'Clientes', type: 'ativo', level: 1 },
  { code: '21.1', name: 'Clientes Conta Corrente', type: 'ativo', level: 2, parentCode: '21' },
  { code: '22', name: 'Fornecedores', type: 'passivo', level: 1 },
  { code: '22.1', name: 'Fornecedores Conta Corrente', type: 'passivo', level: 2, parentCode: '22' },
  { code: '24', name: 'Estado e Outros Entes Públicos', type: 'passivo', level: 1 },
  { code: '24.3', name: 'IVA Liquidado (Vendas)', type: 'passivo', level: 2, parentCode: '24' },
  { code: '24.2', name: 'IVA Dedutível (Compras)', type: 'ativo', level: 2, parentCode: '24' },
  { code: '31', name: 'Compras de Mercadorias', type: 'gasto', level: 1 },
  { code: '61', name: 'Custo das Mercadorias Vendidas (CMVMC)', type: 'gasto', level: 1 },
  { code: '62', name: 'Fornecimentos e Serviços Externos (FSE)', type: 'gasto', level: 1 },
  { code: '63', name: 'Gastos com o Pessoal', type: 'gasto', level: 1 },
  { code: '71', name: 'Vendas de Mercadorias', type: 'rendimento', level: 1 },
];

export const initialAccountsPayable: AccountPayable[] = [];

export const initialAccountsReceivable: AccountReceivable[] = [];

export const initialEmployees: Employee[] = [];

export const initialTimeEntries: TimeClockEntry[] = [];

export const initialPayrolls: PayrollSlip[] = [];

export const initialPurchaseRequisitions: PurchaseRequisition[] = [];

export const initialPurchaseOrders: PurchaseOrder[] = [];

export const initialLeads: LeadOpportunity[] = [];

export const initialActiveShift: CashShift | null = null;

export const initialClosedShifts: CashShift[] = [];

export const initialCallLogs: CallLog[] = [];

export const initialEvents: SystemEvent[] = [];

export const initialOmnichannelOrders: OmnichannelOrder[] = [];

export const initialBankTransactions: BankTransaction[] = [];
export const initialEmployeeShifts: EmployeeShift[] = [];
