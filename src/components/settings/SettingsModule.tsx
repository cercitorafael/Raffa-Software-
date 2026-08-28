import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatDate,
  formatCurrency,
  formatCurrencyCompact,
  getCurrencyDefinition,
  SUPPORTED_CURRENCIES,
} from '../../utils/crypto';
import {
  Settings,
  ShieldCheck,
  ShieldAlert,
  Building,
  Terminal as TerminalIcon,
  Activity,
  Wifi,
  WifiOff,
  RotateCw,
  Database,
  Printer,
  CheckCircle,
  FileCode,
  Users,
  Key,
  Plus,
  Edit2,
  Trash2,
  X,
  Download,
  Upload,
  Check,
  Lock,
  FileSpreadsheet,
  Sun,
  Moon,
  Palette,
  Sparkles,
  Monitor,
  Image as ImageIcon,
  Sliders,
  Coins,
  DollarSign,
  Globe,
  ArrowRightLeft,
  Info,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';
import { User, Store, POSTerminal, Role, AppTheme } from '../../types';
import { CompanyBrandingSection } from './CompanyBrandingSection';
import { InvoiceTemplatesSection } from './InvoiceTemplatesSection';
import { UserPermissionsMatrix } from './UserPermissionsMatrix';
import { VatSettingsSection } from './VatSettingsSection';
import { RegisterCompanyModal } from '../auth/RegisterCompanyModal';
import { OwnerSecurityGate } from '../auth/OwnerSecurityGate';

interface SettingsModuleProps {
  initialTab?: 'company' | 'vat' | 'branding' | 'templates' | 'saft' | 'users' | 'roles' | 'stores' | 'sync' | 'theme' | 'language';
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ initialTab = 'company' }) => {
  const [showRegisterCompanyModal, setShowRegisterCompanyModal] = useState(false);
  const {
    currentCompany,
    updateCompany,
    currentStore,
    currentTerminal,
    stores,
    addStore,
    updateStore,
    deleteStore,
    terminals,
    addTerminal,
    updateTerminal,
    deleteTerminal,
    users,
    currentUser,
    setCurrentUser,
    addUser,
    updateUser,
    deleteUser,
    roles,
    updateRolePermissions,
    events,
    isOnline,
    setIsOnline,
    syncQueue,
    triggerManualSync,
    salesHistory = [],
    products,
    customers,
    accountsPayable,
    accountsReceivable,
    hasPermission,
    setActiveNavTab,
    theme,
    setTheme,
    toggleTheme,
    language,
    setLanguage,
    toggleLanguage,
    t,
    languages,
    currentLanguageOption,
    requestConfirm,
    notify,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'company' | 'vat' | 'branding' | 'templates' | 'saft' | 'users' | 'roles' | 'stores' | 'sync' | 'theme' | 'language'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Company Form State
  const [companyForm, setCompanyForm] = useState({
    name: currentCompany?.name || '',
    tradeName: currentCompany?.tradeName || '',
    taxNumber: currentCompany?.taxNumber || '',
    address: currentCompany?.address || '',
    city: currentCompany?.city || '',
    postalCode: currentCompany?.postalCode || '',
    country: currentCompany?.country || 'Portugal',
    currency: currentCompany?.currency || 'EUR',
    currencySymbol: currentCompany?.currencySymbol || '',
    currencyPosition: currentCompany?.currencyPosition || 'suffix',
    currencyDecimals: currentCompany?.currencyDecimals ?? 2,
    shareCapital: currentCompany?.shareCapital || '50.000,00 €',
    softwareCertNumber: currentCompany?.softwareCertNumber || '3024/AT',
    saftVersion: currentCompany?.saftVersion || '1.04_01',
  });

  useEffect(() => {
    if (currentCompany) {
      setCompanyForm({
        name: currentCompany.name || '',
        tradeName: currentCompany.tradeName || '',
        taxNumber: currentCompany.taxNumber || '',
        address: currentCompany.address || '',
        city: currentCompany.city || '',
        postalCode: currentCompany.postalCode || '',
        country: currentCompany.country || 'Portugal',
        currency: currentCompany.currency || 'EUR',
        currencySymbol: currentCompany.currencySymbol || '',
        currencyPosition: currentCompany.currencyPosition || 'suffix',
        currencyDecimals: currentCompany.currencyDecimals ?? 2,
        shareCapital: currentCompany.shareCapital || '50.000,00 €',
        softwareCertNumber: currentCompany.softwareCertNumber || '3024/AT',
        saftVersion: currentCompany.saftVersion || '1.04_01',
      });
    }
  }, [currentCompany]);

  // Theme Configuration Options
  const themeOptions: {
    id: AppTheme;
    name: string;
    description: string;
    badge: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    colors: {
      bg: string;
      card: string;
      border: string;
      text: string;
      accent: string;
    };
  }[] = [
    {
      id: 'dark',
      name: 'Noir Dourado',
      description: 'Tema escuro premium com contrastes em ouro champanhe. Reduz a fadiga ocular em turnos noturnos e no POS.',
      badge: 'PADRÃO LUXO',
      icon: Moon,
      accentColor: '#c5a47e',
      colors: {
        bg: '#0a0a0a',
        card: '#141414',
        border: '#262626',
        text: '#e5e5e5',
        accent: '#c5a47e',
      },
    },
    {
      id: 'light',
      name: 'Executivo Claro',
      description: 'Tema luminoso de elevado contraste. Excelente legibilidade para contabilidade, escritórios e luz solar intensa.',
      badge: 'ALTO CONTRASTE',
      icon: Sun,
      accentColor: '#b45309',
      colors: {
        bg: '#f3f4f6',
        card: '#ffffff',
        border: '#e5e7eb',
        text: '#111827',
        accent: '#b45309',
      },
    },
    {
      id: 'midnight',
      name: 'Azul Meia-Noite',
      description: 'Paleta safira profunda com realces a azul celeste. Ideal para dashboards de auditoria, eventos e compras.',
      badge: 'SAFIRA NAVY',
      icon: Sparkles,
      accentColor: '#38bdf8',
      colors: {
        bg: '#060c18',
        card: '#0f1c33',
        border: '#1e3256',
        text: '#f1f5f9',
        accent: '#38bdf8',
      },
    },
    {
      id: 'emerald',
      name: 'Verde Esmeralda',
      description: 'Tons botânicos de esmeralda e floresta. Foco em equilíbrio visual e serenidade para operadores de ERP e tesouraria.',
      badge: 'BOTÂNICO ERP',
      icon: Palette,
      accentColor: '#10b981',
      colors: {
        bg: '#04100c',
        card: '#0a261d',
        border: '#174a3b',
        text: '#ecfdf5',
        accent: '#10b981',
      },
    },
  ];

  // User Management Modals
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedPasswordUserId, setCopiedPasswordUserId] = useState<string | null>(null);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    roleId: roles?.[0]?.id || 'admin',
    storeIds: [currentStore?.id || 'store-lis-1'],
    pin: '1234',
    isActive: true,
  });

  // Store Management Modals
  const [showNewStoreModal, setShowNewStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeForm, setStoreForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    postalCode: '1000-001',
    phone: '+351 210 000 000',
    defaultWarehouseId: 'arm-01',
    isActive: true,
  });

  // Terminal Management Modals
  const [showNewTerminalModal, setShowNewTerminalModal] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<POSTerminal | null>(null);
  const [terminalForm, setTerminalForm] = useState({
    name: '',
    code: '',
    storeId: currentStore?.id || 'store-lis-1',
    series: 'FS 2026',
    currentSequence: 1,
    isActive: true,
  });

  // SAF-T State
  const [saftMonth, setSaftMonth] = useState('2026-08');
  const [saftGeneratedXml, setSaftGeneratedXml] = useState<string | null>(null);

  // Permissions check
  const canReadSettings = hasPermission('settings', 'read');
  const canEditSettings = hasPermission('settings', 'edit');

  if (!canReadSettings) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a0a] text-center space-y-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-base font-serif font-bold text-white">
            Acesso Restrito às Definições do Sistema
          </h3>
          <p className="text-xs text-neutral-400">
            O seu perfil de utilizador atual (<strong>{currentUser.name}</strong> &bull; {currentUser.role.toUpperCase()}) não possui privilégios para consultar ou alterar as configurações da empresa e permissões.
          </p>
        </div>
        <div className="pt-2 flex items-center space-x-3">
          <button
            onClick={() => setActiveNavTab('pos')}
            className="px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-xl cursor-pointer shadow-md transition-colors"
          >
            Voltar ao Ponto de Venda
          </button>
        </div>
      </div>
    );
  }

  // ================= COMPANY HANDLER =================
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany(companyForm);
    notify('Definições da Empresa atualizadas com sucesso!', 'success');
  };

  // ================= USER HANDLERS =================
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.username) return;

    if (editingUser) {
      updateUser(editingUser.id, {
        name: userForm.name,
        username: userForm.username,
        email: userForm.email,
        password: userForm.password || editingUser.password || '123456',
        role: userForm.roleId as Role,
        roleId: userForm.roleId,
        storeId: userForm.storeIds?.[0] || currentStore?.id || 'store-lis-1',
        storeIds: userForm.storeIds,
        pin: userForm.pin,
        isActive: userForm.isActive,
      });
      setEditingUser(null);
      notify(`Utilizador "${userForm.name}" atualizado com sucesso.`, 'success');
    } else {
      addUser({
        companyId: currentCompany?.id || 'comp-main',
        name: userForm.name,
        username: userForm.username,
        email: userForm.email || `${userForm.username}@empresa.pt`,
        password: userForm.password || '123456',
        role: userForm.roleId as Role,
        roleId: userForm.roleId,
        storeId: userForm.storeIds?.[0] || currentStore?.id || 'store-lis-1',
        storeIds: userForm.storeIds,
        pin: userForm.pin || '1234',
        isActive: userForm.isActive,
      } as any);
      setShowNewUserModal(false);
      notify(`Utilizador "${userForm.name}" criado com sucesso.`, 'success');
    }
  };

  // ================= STORE HANDLERS =================
  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.name || !storeForm.code) return;

    if (editingStore) {
      updateStore(editingStore.id, {
        name: storeForm.name,
        code: storeForm.code,
        address: storeForm.address,
        city: storeForm.city,
        postalCode: storeForm.postalCode,
        phone: storeForm.phone,
        defaultWarehouseId: storeForm.defaultWarehouseId,
        isActive: storeForm.isActive,
      });
      setEditingStore(null);
    } else {
      addStore({
        companyId: currentCompany.id,
        name: storeForm.name,
        code: storeForm.code,
        address: storeForm.address,
        city: storeForm.city,
        postalCode: storeForm.postalCode,
        phone: storeForm.phone,
        defaultWarehouseId: storeForm.defaultWarehouseId,
        isActive: storeForm.isActive,
      });
      setShowNewStoreModal(false);
    }
  };

  // ================= TERMINAL HANDLERS =================
  const handleSaveTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalForm.name || !terminalForm.code) return;

    if (editingTerminal) {
      updateTerminal(editingTerminal.id, {
        name: terminalForm.name,
        code: terminalForm.code,
        storeId: terminalForm.storeId,
        series: terminalForm.series,
        currentSequence: Number(terminalForm.currentSequence),
        isActive: terminalForm.isActive,
      });
      setEditingTerminal(null);
    } else {
      addTerminal({
        storeId: terminalForm.storeId,
        name: terminalForm.name,
        code: terminalForm.code,
        series: terminalForm.series,
        currentSequence: Number(terminalForm.currentSequence),
        isActive: terminalForm.isActive,
      });
      setShowNewTerminalModal(false);
    }
  };

  // ================= SAF-T PT GENERATOR =================
  const handleGenerateSaftXml = () => {
    const xml = `<?xml version="1.0" encoding="Windows-1252"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01">
  <Header>
    <AuditFileVersion>1.04_01</AuditFileVersion>
    <CompanyID>${currentCompany.taxNumber}</CompanyID>
    <TaxRegistrationNumber>${currentCompany.taxNumber}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${currentCompany.name}</CompanyName>
    <BusinessName>${currentCompany.tradeName}</BusinessName>
    <CompanyAddress>
      <AddressDetail>${currentCompany.address}</AddressDetail>
      <City>${currentCompany.city}</City>
      <PostalCode>${currentCompany.postalCode}</PostalCode>
      <Country>${currentCompany.country}</Country>
    </CompanyAddress>
    <FiscalYear>2026</FiscalYear>
    <StartDate>2026-08-01</StartDate>
    <EndDate>2026-08-31</EndDate>
    <CurrencyCode>EUR</CurrencyCode>
    <DateCreated>${new Date().toISOString().split('T')[0]}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductCompanyID>DeepMind Technologies</ProductCompanyID>
    <ProductID>ERP Enterprise Retail Suite</ProductID>
    <ProductVersion>4.2.0</ProductVersion>
    <SoftwareCertificateNumber>${currentCompany.softwareCertNumber}</SoftwareCertificateNumber>
  </Header>
  <MasterFiles>
    <Customer>
      ${customers.map((c) => `
      <CustomerID>${c.id}</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>${c.taxNumber}</CustomerTaxID>
      <CompanyName>${c.name}</CompanyName>
      <BillingAddress>
        <AddressDetail>${c.address}</AddressDetail>
        <City>${c.city}</City>
        <PostalCode>${c.postalCode}</PostalCode>
        <Country>${c.country}</Country>
      </BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>`).join('\n')}
    </Customer>
    <Product>
      ${products.map((p) => `
      <ProductType>P</ProductType>
      <ProductCode>${p.sku}</ProductCode>
      <ProductGroup>${p.category}</ProductGroup>
      <ProductDescription>${p.name}</ProductDescription>
      <ProductNumberCode>${p.barcode}</ProductNumberCode>`).join('\n')}
    </Product>
  </MasterFiles>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${salesHistory.length}</NumberOfEntries>
      <TotalPartnerDiscount>0.00</TotalPartnerDiscount>
      <TotalQuantity>${salesHistory.reduce((s, i) => s + (i.items?.reduce((x, y) => x + y.quantity, 0) || 1), 0)}</TotalQuantity>
      <TotalCredit>${salesHistory.reduce((s, i) => s + (i.total || 0), 0).toFixed(2)}</TotalCredit>
      <TotalDebit>0.00</TotalDebit>
      ${salesHistory.map((inv) => `
      <Invoice>
        <InvoiceNo>${inv.invoiceNumber}</InvoiceNo>
        <ATCUD>0</ATCUD>
        <DocumentStatus>
          <InvoiceStatus>N</InvoiceStatus>
          <InvoiceStatusDate>${inv.date || new Date().toISOString()}</InvoiceStatusDate>
          <SourceID>${inv.operatorName || 'Caixa'}</SourceID>
          <SourceBilling>P</SourceBilling>
        </DocumentStatus>
        <Hash>${inv.fiscalHash || '0'}</Hash>
        <HashControl>1</HashControl>
        <Period>8</Period>
        <InvoiceDate>${(inv.date || new Date().toISOString()).split('T')[0]}</InvoiceDate>
        <InvoiceType>${inv.invoiceType || 'FS'}</InvoiceType>
        <SpecialRegimes>
          <SelfBillingIndicator>0</SelfBillingIndicator>
          <CashVATSchemeIndicator>0</CashVATSchemeIndicator>
          <ThirdPartiesBillingIndicator>0</ThirdPartiesBillingIndicator>
        </SpecialRegimes>
        <SourceID>${inv.operatorName || 'Caixa'}</SourceID>
        <CustomerID>${inv.customerTaxNumber || inv.customerId || 'CONSUMIDOR_FINAL'}</CustomerID>
        <DocumentTotals>
          <TaxPayable>${(inv.taxTotal || 0).toFixed(2)}</TaxPayable>
          <NetTotal>${(inv.subtotal || 0).toFixed(2)}</NetTotal>
          <GrossTotal>${(inv.total || 0).toFixed(2)}</GrossTotal>
        </DocumentTotals>
      </Invoice>`).join('\n')}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;

    setSaftGeneratedXml(xml);
  };

  const handleDownloadSaft = () => {
    if (!saftGeneratedXml) return;
    const blob = new Blob([saftGeneratedXml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAF-T_PT_${currentCompany.taxNumber}_${saftMonth}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Header */}
      <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-[#c5a47e]" />
          <div>
            <h3 className="text-sm font-serif font-bold text-[#e5e5e5]">Configurações Gerais, SAF-T PT & Utilizadores (RBAC)</h3>
            <p className="text-[11px] text-neutral-400">Parametrização fiscal, controlo de acessos, multi-loja e persistência</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick Language Switcher Pill */}
          <div className="flex items-center bg-[#141414] border border-[#262626] rounded-lg p-1 space-x-1">
            <span className="text-[10px] font-mono text-neutral-400 px-1.5 uppercase hidden xl:inline flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#c5a47e]" />
              {t('header.languageToggle')}:
            </span>
            {languages.map((l) => {
              const isSelected = language === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => {
                    setLanguage(l.code);
                    notify({
                      type: 'info',
                      title: l.name,
                      message: t('settings.languageSection.toastChanged', { lang: l.name }),
                    });
                  }}
                  title={`${l.nativeName} (${l.country})`}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#c5a47e] text-black shadow-xs font-bold'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1f1f1f]'
                  }`}
                >
                  <span className="text-xs">{l.flag}</span>
                  <span className="font-mono text-[11px] uppercase font-bold">{l.code}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Theme Switcher Pill */}
          <div className="flex items-center bg-[#141414] border border-[#262626] rounded-lg p-1 space-x-1">
            <span className="text-[10px] font-mono text-neutral-400 px-2 uppercase hidden xl:inline">Tema:</span>
            {themeOptions.map((tOpt) => {
              const Icon = tOpt.icon;
              const isSelected = theme === tOpt.id;
              return (
                <button
                  key={tOpt.id}
                  onClick={() => setTheme(tOpt.id)}
                  title={`Mudar para tema ${tOpt.name}`}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#c5a47e] text-black shadow-xs font-bold'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1f1f1f]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tOpt.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isOnline
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse'
            }`}
          >
            {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-rose-400" />}
            <span>{isOnline ? 'Online (Nuvem Ativa)' : 'Offline (Modo Local)'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 bg-[#0d0d0d] border-b border-[#262626] flex space-x-1 overflow-x-auto">
        {[
          { id: 'company', label: t('settings.tabs.company') },
          { id: 'vat', label: 'Impostos & IVA', badge: '%' },
          { id: 'branding', label: t('settings.tabs.branding') },
          { id: 'templates', label: t('settings.tabs.templates') },
          { id: 'roles', label: t('settings.tabs.roles') },
          { id: 'saft', label: t('settings.tabs.saft') },
          { id: 'language', label: t('settings.tabs.language'), badge: currentLanguageOption.flag },
          { id: 'theme', label: t('settings.tabs.theme') },
          { id: 'users', label: t('settings.tabs.users'), count: users.length },
          { id: 'stores', label: t('settings.tabs.stores'), count: stores.length },
          { id: 'sync', label: t('settings.tabs.sync') },
        ].map((tab: any) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-3 px-3.5 text-xs font-medium border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#c5a47e] text-[#c5a47e]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.badge && <span className="text-xs">{tab.badge}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-[#c5a47e]/20 text-[#c5a47e]' : 'bg-[#1f1f1f] text-neutral-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* ================= TAB 1: COMPANY SETTINGS ================= */}
        {activeTab === 'company' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#141414] rounded-xl border border-[#262626] p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
                <div className="flex items-center space-x-2">
                  <Building className="w-5 h-5 text-[#c5a47e]" />
                  <div>
                    <h4 className="text-sm font-serif font-bold text-[#e5e5e5]">Identificação da Entidade Fiscal</h4>
                    <p className="text-xs text-neutral-400">Dados legais impressos nos documentos fiscais e exportação SAF-T</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegisterCompanyModal(true)}
                  className="px-3.5 py-1.5 bg-[#c5a47e]/15 hover:bg-[#c5a47e]/25 text-[#c5a47e] border border-[#c5a47e]/40 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Cadastrar Nova Empresa Cliente</span>
                </button>
              </div>

              <form onSubmit={handleSaveCompany} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-neutral-400 font-semibold block mb-1">Razão Social *</label>
                    <input
                      type="text"
                      required
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg font-bold text-[#e5e5e5] focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 font-semibold block mb-1">Nome Comercial (Insígnia)</label>
                    <input
                      type="text"
                      value={companyForm.tradeName}
                      onChange={(e) => setCompanyForm({ ...companyForm, tradeName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-neutral-300 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 font-semibold block mb-1">NIF da Empresa *</label>
                    <input
                      type="text"
                      required
                      value={companyForm.taxNumber}
                      onChange={(e) => setCompanyForm({ ...companyForm, taxNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg font-mono font-bold text-[#c5a47e] focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 font-semibold block mb-1">Capital Social</label>
                    <input
                      type="text"
                      value={companyForm.shareCapital}
                      onChange={(e) => setCompanyForm({ ...companyForm, shareCapital: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg font-bold text-neutral-300 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-neutral-400 font-semibold block mb-1">Sede Fiscal / Morada *</label>
                    <input
                      type="text"
                      required
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-neutral-300 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 font-semibold block mb-1">Código Postal</label>
                    <input
                      type="text"
                      value={companyForm.postalCode}
                      onChange={(e) => setCompanyForm({ ...companyForm, postalCode: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-neutral-300 font-mono focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 font-semibold block mb-1">País / Jurisdição Fiscal</label>
                    <input
                      type="text"
                      value={companyForm.country}
                      onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                      placeholder="Moçambique, Portugal, etc."
                      className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-neutral-300 focus:outline-hidden focus:border-[#c5a47e]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#262626] flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer hover:bg-[#b5946e] transition-colors"
                  >
                    Guardar Alterações Fiscais
                  </button>
                </div>
              </form>
            </div>

            {/* ================= CURRENCY & MONETARY CONFIGURATION ================= */}
            <div className="bg-[#141414] rounded-xl border border-[#262626] p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
                <div className="flex items-center space-x-2">
                  <Coins className="w-5 h-5 text-[#c5a47e]" />
                  <div>
                    <h4 className="text-sm font-serif font-bold text-[#e5e5e5]">
                      Moeda da Empresa & Tipos de Moeda (Mt / € / $ / Kz)
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Configure a moeda principal utilizada no Ponto de Venda (POS), emissão de faturas, inventário e tesouraria
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#c5a47e]/15 text-[#c5a47e] border border-[#c5a47e]/30">
                    Ativa: {companyForm.currencySymbol || getCurrencyDefinition(companyForm.currency).symbol} ({companyForm.currency || 'EUR'})
                  </span>
                </div>
              </div>

              {/* Currency Presets Grid */}
              <div className="mt-6">
                <label className="text-xs font-bold text-neutral-300 block mb-3">
                  Selecione um Tipo de Moeda Pré-definido:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SUPPORTED_CURRENCIES.map((curr) => {
                    const isSelected = (companyForm.currency || 'EUR').toUpperCase() === curr.code.toUpperCase();
                    return (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...companyForm,
                            currency: curr.code,
                            currencySymbol: curr.symbol,
                            currencyPosition: curr.position,
                            currencyDecimals: curr.decimalPlaces,
                            country: curr.country || companyForm.country,
                          };
                          setCompanyForm(updated);
                          updateCompany(updated);
                          notify(`Moeda da empresa alterada para ${curr.name} (${curr.symbol})!`, 'success');
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#c5a47e]/10 border-[#c5a47e] ring-1 ring-[#c5a47e]/50 shadow-md'
                            : 'bg-[#0d0d0d] border-[#262626] hover:border-neutral-600 hover:bg-[#171717]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2.5">
                            <span className="text-2xl" role="img" aria-label={curr.country}>
                              {curr.flag}
                            </span>
                            <div>
                              <div className="font-bold text-xs text-[#e5e5e5] flex items-center space-x-1.5">
                                <span>{curr.name}</span>
                                <span className="font-mono text-[10px] px-1.5 py-0.2 bg-[#222] text-[#c5a47e] rounded font-bold">
                                  {curr.symbol}
                                </span>
                              </div>
                              <div className="text-[11px] text-neutral-400 mt-0.5">
                                {curr.country} &bull; <span className="font-mono">{curr.code}</span>
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[#c5a47e] text-neutral-950 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#222222] flex items-center justify-between text-[11px]">
                          <span className="text-neutral-500">Exemplo formatado:</span>
                          <span className="font-mono font-bold text-[#c5a47e]">
                            {formatCurrency(1250, curr.code)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Custom Currency Settings & Real-Time Preview */}
              <div className="mt-6 pt-5 border-t border-[#262626] grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Customization Fields */}
                <div className="lg:col-span-7 space-y-4">
                  <h5 className="text-xs font-bold text-neutral-200 flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4 text-[#c5a47e]" />
                    <span>Personalização de Símbolo & Formatação Monetária</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-neutral-400 font-semibold block mb-1">
                        Código ISO da Moeda *
                      </label>
                      <input
                        type="text"
                        value={companyForm.currency}
                        onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value.toUpperCase() })}
                        placeholder="Ex: MZN, EUR, USD"
                        className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg font-mono font-bold text-[#c5a47e] focus:outline-hidden focus:border-[#c5a47e]"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">
                        Código bancário de 3 letras (ex: MZN = Metical Moçambique)
                      </span>
                    </div>

                    <div>
                      <label className="text-neutral-400 font-semibold block mb-1">
                        Símbolo Gráfico da Moeda *
                      </label>
                      <input
                        type="text"
                        value={companyForm.currencySymbol}
                        onChange={(e) => setCompanyForm({ ...companyForm, currencySymbol: e.target.value })}
                        placeholder="Ex: Mt, MT, €, $, Kz"
                        className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg font-mono font-bold text-white focus:outline-hidden focus:border-[#c5a47e]"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">
                        Texto ou símbolo exibido nos ecrãs (ex: Mt, €, $, Kz)
                      </span>
                    </div>

                    <div>
                      <label className="text-neutral-400 font-semibold block mb-1">
                        Posição do Símbolo
                      </label>
                      <select
                        value={companyForm.currencyPosition || 'suffix'}
                        onChange={(e) => setCompanyForm({ ...companyForm, currencyPosition: e.target.value as any })}
                        className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-neutral-300 focus:outline-hidden focus:border-[#c5a47e]"
                      >
                        <option value="suffix">Sufixo após o valor (Ex: 1 250,00 Mt)</option>
                        <option value="prefix">Prefixo antes do valor (Ex: Mt 1 250,00)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-neutral-400 font-semibold block mb-1">
                        Casas Decimais (Cêntimos)
                      </label>
                      <select
                        value={companyForm.currencyDecimals ?? 2}
                        onChange={(e) => setCompanyForm({ ...companyForm, currencyDecimals: parseInt(e.target.value, 10) })}
                        className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-neutral-300 focus:outline-hidden focus:border-[#c5a47e]"
                      >
                        <option value={2}>2 Casas Decimais (Padrão: 1 250,50)</option>
                        <option value={0}>0 Casas Decimais (Sem cêntimos: 1 251)</option>
                        <option value={3}>3 Casas Decimais (Combustíveis: 1 250,500)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      onClick={() => {
                        updateCompany(companyForm);
                        notify('Definições de moeda guardadas e sincronizadas!', 'success');
                      }}
                      className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-bold text-xs rounded-lg cursor-pointer hover:bg-[#b5946e] transition-colors flex items-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Guardar Definições de Moeda</span>
                    </button>
                  </div>
                </div>

                {/* Right: Live Simulation Preview */}
                <div className="lg:col-span-5 bg-[#0d0d0d] border border-[#262626] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#222222] pb-2">
                    <div className="text-xs font-bold text-neutral-300 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#c5a47e]" />
                      <span>Simulação em Tempo Real</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">Live Preview</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222] flex items-center justify-between">
                      <span className="text-neutral-400">Preço de Artigo (POS):</span>
                      <span className="font-mono font-bold text-[#e5e5e5]">
                        {formatCurrency(1250, companyForm.currency)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222] flex items-center justify-between">
                      <span className="text-neutral-400">Faturação Bruta / Total:</span>
                      <span className="font-mono font-bold text-[#c5a47e]">
                        {formatCurrency(8490.50, companyForm.currency)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222] flex items-center justify-between">
                      <span className="text-neutral-400">Troco a Entregar:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatCurrency(150.00, companyForm.currency)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222] flex items-center justify-between">
                      <span className="text-neutral-400">Volume de Vendas Anual:</span>
                      <span className="font-mono font-bold text-neutral-300">
                        {formatCurrencyCompact(2450000, companyForm.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#171717] rounded-lg border border-[#262626] text-[11px] text-neutral-400 flex items-start space-x-2">
                    <Info className="w-4 h-4 text-[#c5a47e] shrink-0 mt-0.5" />
                    <span>
                      Ao alterar a moeda, todos os ecrãs do POS, inventário, tesouraria e talões adotarão automaticamente esta formatação.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* VAT Rates Configuration in Company Settings */}
            <VatSettingsSection />

            {/* Quick Theme Selector in Company Tab */}
            <div className="bg-[#141414] rounded-xl border border-[#262626] p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
                <div className="flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-[#c5a47e]" />
                  <div>
                    <h4 className="text-sm font-serif font-bold text-[#e5e5e5]">Aparência & Tema do Sistema</h4>
                    <p className="text-xs text-neutral-400">Escolha o tema visual para os ecrãs do POS, inventário e relatórios</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="px-3 py-1.5 bg-[#c5a47e]/15 hover:bg-[#c5a47e]/25 text-[#c5a47e] border border-[#c5a47e]/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Alternar Tema</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {themeOptions.map((t) => {
                  const Icon = t.icon;
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#c5a47e]/10 border-[#c5a47e] ring-2 ring-[#c5a47e]/30 shadow-md'
                          : 'bg-[#0d0d0d] border-[#262626] hover:border-neutral-600 hover:bg-[#121212]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 rounded-lg bg-[#141414] border border-[#262626] text-[#c5a47e]">
                            <Icon className="w-4 h-4" />
                          </div>
                          {isSelected && (
                            <span className="flex items-center space-x-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#c5a47e] text-black">
                              <Check className="w-3 h-3" />
                              <span>Ativo</span>
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-bold text-neutral-200">{t.name}</h5>
                        <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">{t.description}</p>
                      </div>

                      <div className="flex items-center space-x-1.5 mt-3 pt-3 border-t border-[#262626]/60">
                        <span className="w-3.5 h-3.5 rounded-full border border-neutral-700" style={{ backgroundColor: t.colors.bg }} title="Fundo" />
                        <span className="w-3.5 h-3.5 rounded-full border border-neutral-700" style={{ backgroundColor: t.colors.card }} title="Cartão" />
                        <span className="w-3.5 h-3.5 rounded-full border border-neutral-700" style={{ backgroundColor: t.colors.accent }} title="Destaque" />
                        <span className="text-[10px] text-neutral-500 font-mono ml-auto">{t.badge}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: VAT / TAX RATES ================= */}
        {activeTab === 'vat' && (
          <div className="max-w-5xl mx-auto">
            <VatSettingsSection />
          </div>
        )}

        {/* ================= TAB: BRANDING & LOGO ================= */}
        {activeTab === 'branding' && (
          <div className="max-w-5xl mx-auto">
            <CompanyBrandingSection />
          </div>
        )}

        {/* ================= TAB: INVOICE TEMPLATES ================= */}
        {activeTab === 'templates' && (
          <div className="max-w-6xl mx-auto">
            <InvoiceTemplatesSection />
          </div>
        )}

        {/* ================= TAB 2: SAF-T PT ================= */}
        {activeTab === 'saft' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#141414] rounded-xl border border-[#262626] p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-[#262626]">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-serif font-bold text-[#e5e5e5]">Certificação de Software AT & SAF-T (PT) 1.04_01</h4>
                  <p className="text-xs text-neutral-400">Portaria nº 302/2016 e Artigo 123º do Código do IRC</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-[#0d0d0d] p-3.5 rounded-lg border border-[#262626]">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                    Nº Certificado de Software AT
                  </span>
                  <span className="text-base font-mono font-bold text-[#c5a47e]">
                    {currentCompany.softwareCertNumber}
                  </span>
                </div>

                <div className="bg-[#0d0d0d] p-3.5 rounded-lg border border-[#262626]">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                    Versão Estrutura XML SAF-T
                  </span>
                  <span className="text-base font-mono font-bold text-emerald-400">
                    {currentCompany.saftVersion}
                  </span>
                </div>

                <div className="bg-[#0d0d0d] p-3.5 rounded-lg border border-[#262626]">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                    Cadeia de Criptografia RSA
                  </span>
                  <span className="text-base font-mono font-bold text-blue-400">
                    Chave Privada 1024-bit
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#262626] space-y-4">
                <h5 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">Exportar Ficheiro SAF-T PT Mensal</h5>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="month"
                    value={saftMonth}
                    onChange={(e) => setSaftMonth(e.target.value)}
                    className="bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs font-mono text-neutral-200"
                  />
                  <button
                    onClick={handleGenerateSaftXml}
                    className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-md cursor-pointer hover:bg-[#b5946e]"
                  >
                    Gerar e Validar Ficheiro XML
                  </button>
                  {saftGeneratedXml && (
                    <button
                      onClick={handleDownloadSaft}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-md flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descarregar SAF-T (XML)</span>
                    </button>
                  )}
                </div>

                {saftGeneratedXml && (
                  <div className="mt-4">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1">Pré-visualização do Ficheiro XML:</span>
                    <pre className="p-4 bg-[#080808] border border-[#262626] rounded-lg font-mono text-[11px] text-emerald-400 max-h-72 overflow-y-auto">
                      {saftGeneratedXml}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: THEME CUSTOMIZER ================= */}
        {activeTab === 'theme' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Theme Hero Banner */}
            <div className="bg-[#141414] rounded-xl border border-[#262626] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-[#c5a47e]/20 border border-[#c5a47e]/40 flex items-center justify-center text-[#c5a47e]">
                  <Palette className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-serif font-bold text-[#e5e5e5]">Aparência e Gestão de Temas</h4>
                  <p className="text-xs text-neutral-400">
                    Tema ativo no sistema: <span className="text-[#c5a47e] font-bold">{themeOptions.find((t) => t.id === theme)?.name}</span> &bull; Persistência imediata
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleTheme}
                  className="px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-lg flex items-center space-x-2 transition-all cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Alternar Próximo Tema</span>
                </button>
              </div>
            </div>

            {/* Themes Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {themeOptions.map((t) => {
                const Icon = t.icon;
                const isSelected = theme === t.id;
                return (
                  <div
                    key={t.id}
                    className={`bg-[#141414] rounded-xl border p-5 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#c5a47e] ring-2 ring-[#c5a47e]/30 shadow-lg'
                        : 'border-[#262626] hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className="p-2.5 rounded-lg border flex items-center justify-center"
                            style={{
                              backgroundColor: t.colors.card,
                              borderColor: t.colors.border,
                              color: t.accentColor,
                            }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-neutral-200">{t.name}</h5>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                              {t.badge}
                            </span>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full bg-[#c5a47e] text-black">
                            <Check className="w-3.5 h-3.5" />
                            <span>Tema Ativo</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => setTheme(t.id)}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            Ativar Tema
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-neutral-400 mb-4">{t.description}</p>

                      {/* Visual Color Palette Preview */}
                      <div className="bg-[#0d0d0d] p-3 rounded-lg border border-[#262626] space-y-2">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                          Amostra de Cores do Tema:
                        </span>
                        <div className="grid grid-cols-5 gap-2 text-center">
                          <div className="space-y-1">
                            <div className="h-6 rounded-sm border border-neutral-700" style={{ backgroundColor: t.colors.bg }} />
                            <span className="text-[9px] text-neutral-500 block font-mono">Fundo</span>
                          </div>
                          <div className="space-y-1">
                            <div className="h-6 rounded-sm border border-neutral-700" style={{ backgroundColor: t.colors.card }} />
                            <span className="text-[9px] text-neutral-500 block font-mono">Cartão</span>
                          </div>
                          <div className="space-y-1">
                            <div className="h-6 rounded-sm border border-neutral-700" style={{ backgroundColor: t.colors.border }} />
                            <span className="text-[9px] text-neutral-500 block font-mono">Bordas</span>
                          </div>
                          <div className="space-y-1">
                            <div className="h-6 rounded-sm border border-neutral-700" style={{ backgroundColor: t.colors.accent }} />
                            <span className="text-[9px] text-neutral-500 block font-mono">Acento</span>
                          </div>
                          <div className="space-y-1">
                            <div className="h-6 rounded-sm border border-neutral-700" style={{ backgroundColor: t.colors.text }} />
                            <span className="text-[9px] text-neutral-500 block font-mono">Texto</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#262626] flex items-center justify-between">
                      <span className="text-[11px] text-neutral-500 font-mono">WCAG 2.1 AA Compliant</span>
                      <button
                        onClick={() => setTheme(t.id)}
                        disabled={isSelected}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                          isSelected
                            ? 'text-[#c5a47e] bg-[#c5a47e]/10 border border-[#c5a47e]/30 cursor-default'
                            : 'text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer'
                        }`}
                      >
                        {isSelected ? '✓ Selecionado' : 'Selecionar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Real-time UI Component Sandbox */}
            <div className="bg-[#141414] rounded-xl border border-[#262626] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                <div className="flex items-center space-x-2">
                  <Monitor className="w-5 h-5 text-[#c5a47e]" />
                  <div>
                    <h5 className="text-sm font-serif font-bold text-[#e5e5e5]">Pré-visualização em Tempo Real de Elementos do POS & ERP</h5>
                    <p className="text-xs text-neutral-400">Verifique a legibilidade dos botões, tabelas e avisos fiscais com o tema atual</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-[#c5a47e] bg-[#c5a47e]/15 px-2.5 py-1 rounded-md border border-[#c5a47e]/30 font-bold uppercase">
                  {theme.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#262626] space-y-2">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase block">Botões & Ações POS</span>
                  <button className="w-full py-2 bg-[#c5a47e] text-black font-bold text-xs rounded-lg shadow-sm">
                    Finalizar Venda (F10)
                  </button>
                  <button className="w-full py-2 bg-[#1a1a1a] border border-[#262626] text-neutral-300 font-medium text-xs rounded-lg">
                    Aplicar Desconto
                  </button>
                </div>

                <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#262626] space-y-2">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase block">Crachás & Selos Fiscais</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-2 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-md text-[11px] font-bold">
                      ✓ Certificado AT
                    </span>
                    <span className="px-2 py-1 bg-[#c5a47e]/15 text-[#c5a47e] border border-[#c5a47e]/30 rounded-md text-[11px] font-bold">
                      IVA 23% Normal
                    </span>
                    <span className="px-2 py-1 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-md text-[11px] font-bold">
                      Série FS 2026
                    </span>
                  </div>
                </div>

                <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#262626] space-y-2">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase block">Indicador Financeiro</span>
                  <div className="text-xl font-bold font-mono text-[#c5a47e]">1.450,80 €</div>
                  <p className="text-[11px] text-neutral-400">Total Faturado no Turno Atual</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: USER MANAGEMENT (CRUD) ================= */}
        {activeTab === 'users' && (
          <OwnerSecurityGate
            title="Gestão de Utilizadores do Sistema"
            subtitle="Introduza o código mestre do proprietário para aceder à listagem, credenciais, PINs e perfis dos utilizadores."
            moduleName="Gestão de Utilizadores"
          >
            <div className="space-y-4">
              {/* Active Session Banner */}
              <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#c5a47e]/20 border border-[#c5a47e]/40 flex items-center justify-center text-[#c5a47e] font-bold text-sm">
                    {(currentUser?.name || 'Admin').charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-neutral-400 font-medium">Sessão Ativa:</span>
                      <span className="text-sm font-bold text-[#e5e5e5]">{currentUser?.name || 'Utilizador'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#c5a47e] text-black uppercase">
                        {currentUser?.role || 'admin'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Utilizador com sessão iniciada: <span className="text-[#c5a47e]">@{currentUser?.username || 'admin'}</span> &bull; Loja: {currentStore?.name || 'Loja Principal'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setUserForm({
                        name: '',
                        username: '',
                        email: '',
                        roleId: roles?.[0]?.id || 'admin',
                        storeIds: [currentStore?.id || 'store-lis-1'],
                        pin: '1234',
                        isActive: true,
                      });
                      setShowNewUserModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-md cursor-pointer hover:bg-[#b5946e] flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Utilizador</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                    <tr>
                      <th className="px-4 py-3">Nome / Utilizador</th>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Perfil de Acesso</th>
                      <th className="px-4 py-3">Lojas Autorizadas</th>
                      <th className="px-4 py-3 text-center">Senha / Palavra-passe</th>
                      <th className="px-4 py-3 text-center">PIN POS</th>
                      <th className="px-4 py-3 text-center">Estado / Sessão</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626]">
                    {(users || []).map((u) => {
                      const role = (roles || []).find((r) => r.id === u.roleId || r.id === u.role);
                      const isCurrent = currentUser?.id === u.id;
                      const userStores = u.storeIds && u.storeIds.length > 0
                        ? u.storeIds
                        : u.storeId
                        ? [u.storeId]
                        : [currentStore?.id || 'store-lis-1'];
                      const displayUsername = u.username || (u.name || 'user').toLowerCase().replace(/\s+/g, '.');
                      const userPass = u.password || (u.role === 'admin' ? 'admin' : u.pin || '1234');
                      const isPasswordVisible = !!showPasswordMap[u.id];

                      return (
                        <tr
                          key={u.id}
                          className={`transition-colors ${
                            isCurrent ? 'bg-[#c5a47e]/10 border-l-2 border-l-[#c5a47e]' : 'hover:bg-[#191919]'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#262626] text-neutral-300 flex items-center justify-center font-bold text-xs">
                                {(u?.name || 'U').charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-neutral-200 flex items-center space-x-1.5">
                                  <span>{u.name}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-xs font-bold uppercase">
                                      Sessão Atual
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-neutral-500 font-mono">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[#c5a47e]">@{displayUsername}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              {role?.name || u.roleId || u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-400">
                            {userStores.map((sid) => (stores || []).find((s) => s.id === sid)?.name || sid).join(', ')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center justify-center space-x-1.5 bg-[#0a0a0a] px-2.5 py-1 rounded-lg border border-[#262626]">
                              <span className="font-mono text-xs font-semibold text-neutral-200">
                                {isPasswordVisible ? userPass : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowPasswordMap((prev) => ({ ...prev, [u.id]: !prev[u.id] }));
                                }}
                                className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded transition-colors cursor-pointer"
                                title={isPasswordVisible ? 'Ocultar palavra-passe' : 'Ver palavra-passe'}
                              >
                                {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(userPass);
                                  setCopiedPasswordUserId(u.id);
                                  notify(`Palavra-passe de ${u.name} copiada!`, 'success');
                                  setTimeout(() => setCopiedPasswordUserId(null), 2000);
                                }}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  copiedPasswordUserId === u.id
                                    ? 'text-emerald-400 bg-emerald-500/20'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                                }`}
                                title="Copiar palavra-passe"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-neutral-400">
                            <span className="bg-[#0a0a0a] px-2 py-0.5 rounded border border-[#262626] text-[11px]">
                              {u.pin || '••••'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                              u.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {u.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {isCurrent && (
                                <span className="text-[11px] text-emerald-400 font-medium px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                  Sessão Ativa
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setUserForm({
                                    name: u.name,
                                    username: displayUsername,
                                    email: u.email,
                                    password: u.password || (u.role === 'admin' ? 'admin' : u.pin || '1234'),
                                    roleId: u.roleId || u.role || 'caixa',
                                    storeIds: userStores,
                                    pin: u.pin || '1234',
                                    isActive: u.isActive,
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                                title="Editar Utilizador"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  requestConfirm({
                                    title: 'Eliminar Utilizador',
                                    message: `Tem a certeza que deseja eliminar o utilizador "${u.name}" (@${displayUsername})?`,
                                    itemDetails: `Email: ${u.email || 'N/A'} | Perfil: ${u.roleId || u.role}`,
                                    confirmLabel: 'Eliminar Utilizador',
                                    isDestructive: true,
                                    onConfirm: () => {
                                      deleteUser(u.id);
                                    },
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                                title="Eliminar Utilizador"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </OwnerSecurityGate>
        )}

        {/* ================= TAB 4: RBAC PERMISSIONS & RESTRICTIONS ================= */}
        {activeTab === 'roles' && (
          <div className="max-w-6xl mx-auto">
            <UserPermissionsMatrix />
          </div>
        )}

        {/* ================= TAB 5: STORES & TERMINALS ================= */}
        {activeTab === 'stores' && (
          <div className="space-y-6">
            {/* Stores Section */}
            <div>
              <div className="flex justify-between items-center bg-[#141414] p-3 rounded-lg border border-[#262626] mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Lojas & Unidades Físicas</h4>
                <button
                  onClick={() => {
                    setEditingStore(null);
                    setStoreForm({
                      name: '',
                      code: '',
                      address: '',
                      city: '',
                      postalCode: '1000-001',
                      phone: '+351 210 000 000',
                      defaultWarehouseId: 'arm-01',
                      isActive: true,
                    });
                    setShowNewStoreModal(true);
                  }}
                  className="px-3 py-1.5 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-md cursor-pointer hover:bg-[#b5946e]"
                >
                  + Nova Loja
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stores.map((st) => (
                  <div key={st.id} className="bg-[#141414] rounded-xl border border-[#262626] p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <Building className="w-5 h-5 text-[#c5a47e]" />
                        <div>
                          <h4 className="font-semibold text-sm text-[#e5e5e5]">{st.name}</h4>
                          <span className="text-[10px] text-neutral-500 font-mono">Código: {st.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingStore(st);
                            setStoreForm({
                              name: st.name,
                              code: st.code,
                              address: st.address,
                              city: st.city,
                              postalCode: st.postalCode,
                              phone: st.phone,
                              defaultWarehouseId: st.defaultWarehouseId,
                              isActive: st.isActive,
                            });
                          }}
                          className="p-1.5 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            requestConfirm({
                              title: 'Eliminar Loja',
                              message: `Tem a certeza que deseja eliminar a loja "${st.name}" (${st.code})?`,
                              itemDetails: `Morada: ${st.address}, ${st.city} | Armazém: ${st.defaultWarehouseId}`,
                              confirmLabel: 'Eliminar Loja',
                              isDestructive: true,
                              onConfirm: () => {
                                deleteStore(st.id);
                              },
                            });
                          }}
                          className="p-1.5 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#0d0d0d] p-3 rounded-lg border border-[#262626] text-xs space-y-1 font-mono text-neutral-400">
                      <div>Morada: {st.address}, {st.city}</div>
                      <div>Telefone: {st.phone}</div>
                      <div>Armazém Principal: {st.defaultWarehouseId}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Terminals Section */}
            <div className="pt-4 border-t border-[#262626]">
              <div className="flex justify-between items-center bg-[#141414] p-3 rounded-lg border border-[#262626] mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Terminais POS & Caixas</h4>
                <button
                  onClick={() => {
                    setEditingTerminal(null);
                    setTerminalForm({
                      name: '',
                      code: '',
                      storeId: currentStore?.id || 'store-lis-1',
                      series: 'FS 2026',
                      currentSequence: 1,
                      isActive: true,
                    });
                    setShowNewTerminalModal(true);
                  }}
                  className="px-3 py-1.5 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-md cursor-pointer hover:bg-[#b5946e]"
                >
                  + Novo Terminal POS
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(terminals || []).map((t) => (
                  <div key={t.id} className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono font-semibold text-[#c5a47e]">{t.code}</span>
                        <h5 className="font-semibold text-neutral-200 text-sm">{t.name || (t as any).description || t.code}</h5>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingTerminal(t);
                            setTerminalForm({
                              name: t.name || (t as any).description || '',
                              code: t.code,
                              storeId: t.storeId,
                              series: (t as any).series || 'FS 2026',
                              currentSequence: (t as any).currentSequence || 1,
                              isActive: t.isActive !== false,
                            });
                          }}
                          className="p-1 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            requestConfirm({
                              title: 'Eliminar Terminal POS',
                              message: `Tem a certeza que deseja eliminar o terminal "${t.name || (t as any).description || t.code}" (${t.code})?`,
                              itemDetails: `Código: ${t.code} | Série: ${(t as any).series || 'FS 2026'}`,
                              confirmLabel: 'Eliminar Terminal',
                              isDestructive: true,
                              onConfirm: () => {
                                deleteTerminal(t.id);
                              },
                            });
                          }}
                          className="p-1 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-400 font-mono space-y-0.5">
                      <div>Série Faturação: {(t as any).series || 'FS 2026'}</div>
                      <div>Último Nº Emitido: #{(t as any).currentSequence || 1}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 6: SYNC & PERSISTENCE ================= */}
        {activeTab === 'sync' && (
          <div className="max-w-2xl mx-auto bg-[#141414] rounded-xl border border-[#262626] p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#262626]">
              <Database className="w-5 h-5 text-[#c5a47e]" />
              <div>
                <h4 className="text-sm font-serif font-bold text-[#e5e5e5]">Motor de Sincronização e Persistência Local</h4>
                <p className="text-xs text-neutral-400">Armazenamento dual (IndexedDB + LocalStorage) com sincronização em fila</p>
              </div>
            </div>

            <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#262626] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Estado de Conexão:</span>
                <span className={`font-bold ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isOnline ? 'Ligado ao Servidor Central (Online)' : 'Modo Autónomo Offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Eventos Pendentes de Sincronização:</span>
                <span className="font-bold font-mono text-[#c5a47e]">{(syncQueue?.length || 0)} eventos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Faturas Emitidas Locais:</span>
                <span className="font-bold font-mono text-neutral-200">{salesHistory?.length || 0} faturas</span>
              </div>
            </div>

            <button
              onClick={() => {
                triggerManualSync();
                notify('Todos os eventos e documentos foram sincronizados com o servidor central!', 'success');
              }}
              className="w-full py-2.5 bg-[#c5a47e] hover:bg-[#d4b896] text-black font-bold uppercase tracking-wider rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Forçar Sincronização com a Nuvem</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= MODAL: USER ================= */}
      {(showNewUserModal || editingUser) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingUser ? 'Editar Utilizador' : 'Novo Utilizador'}
              </h3>
              <button
                onClick={() => {
                  setShowNewUserModal(false);
                  setEditingUser(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Nome de Utilizador (Login) *</label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="ex: manuel.silva"
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Palavra-passe / Senha *</label>
                  <div className="relative">
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      required
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="Palavra-passe de login"
                      className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md pl-3 pr-8 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                      title={showFormPassword ? 'Ocultar palavra-passe' : 'Ver palavra-passe'}
                    >
                      {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">PIN POS (4 dígitos)</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={userForm.pin}
                    onChange={(e) => setUserForm({ ...userForm, pin: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Perfil / Função (Role)</label>
                <select
                  value={userForm.roleId}
                  onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {(roles || []).map((r) => (
                    <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewUserModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingUser ? 'Guardar' : 'Criar Utilizador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: STORE ================= */}
      {(showNewStoreModal || editingStore) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingStore ? 'Editar Loja' : 'Nova Loja'}
              </h3>
              <button
                onClick={() => {
                  setShowNewStoreModal(false);
                  setEditingStore(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStore} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Nome da Loja *</label>
                <input
                  type="text"
                  required
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Código Loja *</label>
                  <input
                    type="text"
                    required
                    value={storeForm.code}
                    onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Morada</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={storeForm.city}
                    onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Código Postal</label>
                  <input
                    type="text"
                    value={storeForm.postalCode}
                    onChange={(e) => setStoreForm({ ...storeForm, postalCode: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewStoreModal(false);
                    setEditingStore(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingStore ? 'Guardar' : 'Criar Loja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TERMINAL ================= */}
      {(showNewTerminalModal || editingTerminal) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingTerminal ? 'Editar Terminal' : 'Novo Terminal POS'}
              </h3>
              <button
                onClick={() => {
                  setShowNewTerminalModal(false);
                  setEditingTerminal(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTerminal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Nome do Terminal *</label>
                <input
                  type="text"
                  required
                  value={terminalForm.name}
                  onChange={(e) => setTerminalForm({ ...terminalForm, name: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Código Terminal *</label>
                  <input
                    type="text"
                    required
                    value={terminalForm.code}
                    onChange={(e) => setTerminalForm({ ...terminalForm, code: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Série Faturação</label>
                  <input
                    type="text"
                    value={terminalForm.series}
                    onChange={(e) => setTerminalForm({ ...terminalForm, series: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Loja Afeta</label>
                <select
                  value={terminalForm.storeId}
                  onChange={(e) => setTerminalForm({ ...terminalForm, storeId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTerminalModal(false);
                    setEditingTerminal(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingTerminal ? 'Guardar' : 'Criar Terminal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <RegisterCompanyModal
        isOpen={showRegisterCompanyModal}
        onClose={() => setShowRegisterCompanyModal(false)}
      />
    </div>
  );
};
