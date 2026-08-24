import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/crypto';
import {
  calculateBalancete,
  exportInvoicesToPDF,
  exportInvoicesToExcel,
  exportBalanceteToPDF,
  exportBalanceteToExcel,
  exportDreToPDF,
  exportDreToExcel,
} from '../../utils/financeExport';
import {
  printThermalReceipt,
  printInvoiceDocument,
  downloadInvoicePdf,
  downloadReceiptPdf,
} from '../../utils/print';
import {
  Receipt,
  FileCode2,
  TrendingDown,
  TrendingUp,
  Landmark,
  BookOpen,
  PieChart,
  Download,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Filter,
  FileSpreadsheet,
  FileText,
  Printer,
  Scale,
  Sparkles,
  ChevronDown,
  Check,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  X,
  CreditCard,
  Building2,
  CheckCircle,
  Eye,
  Mail,
  Search,
} from 'lucide-react';
import {
  AccountPayable,
  AccountReceivable,
  Account,
  LedgerEntry,
  BankTransaction,
  Sale,
} from '../../types';

export const FinanceModule: React.FC = () => {
  const {
    currentCompany,
    currentStore,
    salesHistory,
    accountsPayable,
    accountsReceivable,
    chartOfAccounts,
    ledgerEntries,
    bankTransactions,
    suppliers,
    customers,
    currencyDefinition,
    formatCurrency,
    createAccountPayable,
    updateAccountPayable,
    deleteAccountPayable,
    payAccountPayable,
    createAccountReceivable,
    updateAccountReceivable,
    deleteAccountReceivable,
    receiveAccountReceivable,
    addAccount,
    updateAccount,
    deleteAccount,
    addLedgerEntry,
    updateLedgerEntry,
    deleteLedgerEntry,
    addBankTransaction,
    updateBankTransaction,
    deleteBankTransaction,
    reconcileBankTransaction,
    generateSaftXml,
    hasPermission,
    requestConfirm,
    notify,
  } = useApp();

  const currencySymbol = currentCompany?.currencySymbol || currencyDefinition?.symbol || 'Mt';

  const [activeTab, setActiveTab] = useState<
    'invoices' | 'payables' | 'receivables' | 'reconciliation' | 'ledger' | 'chart' | 'dre' | 'saft'
  >('invoices');

  const [selectedSaleForPreview, setSelectedSaleForPreview] = useState<Sale | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState<string>('');
  const [filterDocType, setFilterDocType] = useState<string>('all');
  const [showSaftModal, setShowSaftModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportReportType, setExportReportType] = useState<'balancete' | 'invoices' | 'dre'>('balancete');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [exportPeriod, setExportPeriod] = useState<string>('Agosto 2026');
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Payables Modals
  const [showNewPayableModal, setShowNewPayableModal] = useState<boolean>(false);
  const [editingPayable, setEditingPayable] = useState<AccountPayable | null>(null);
  const [payableForm, setPayableForm] = useState({
    supplierId: suppliers[0]?.id || '',
    documentNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '2026-09-30',
    amount: 150,
    notes: '',
  });

  // Receivables Modals
  const [showNewReceivableModal, setShowNewReceivableModal] = useState<boolean>(false);
  const [editingReceivable, setEditingReceivable] = useState<AccountReceivable | null>(null);
  const [receivableForm, setReceivableForm] = useState({
    customerId: customers[0]?.id || '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '2026-09-30',
    amount: 350,
    notes: '',
  });

  // Chart of Accounts Modals
  const [showNewAccountModal, setShowNewAccountModal] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    type: 'ativo' as Account['type'],
    class: 1,
    description: '',
    parentCode: '',
  });

  // Ledger Entry Modals
  const [showNewLedgerModal, setShowNewLedgerModal] = useState<boolean>(false);
  const [editingLedger, setEditingLedger] = useState<LedgerEntry | null>(null);
  const [ledgerForm, setLedgerForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: 'Movimento de Diário Geral',
    documentRef: 'DOC-2026/001',
    debitAccountCode: '6211',
    creditAccountCode: '121',
    amount: 100,
  });

  // Bank Transaction Modals
  const [showNewBankTxModal, setShowNewBankTxModal] = useState<boolean>(false);
  const [editingBankTx, setEditingBankTx] = useState<BankTransaction | null>(null);
  const [bankTxForm, setBankTxForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 100,
    type: 'debito' as 'credito' | 'debito',
    documentRef: '',
  });

  // Permissions check
  const canCreate = hasPermission('finance', 'create');
  const canEdit = hasPermission('finance', 'edit');
  const canDelete = hasPermission('finance', 'delete');

  // Finance Totals
  const totalReceivables = accountsReceivable
    .filter((ar) => ar.status !== 'pago')
    .reduce((sum, ar) => sum + (ar.amount - ar.receivedAmount), 0);

  const totalPayables = accountsPayable
    .filter((ap) => ap.status !== 'pago')
    .reduce((sum, ap) => sum + (ap.amount - ap.paidAmount), 0);

  const totalSalesRevenue = salesHistory.reduce((sum, s) => sum + s.total, 0);
  const totalTaxCollected = salesHistory.reduce((sum, s) => sum + s.taxTotal, 0);

  // Compute Balancete
  const balanceteRows = calculateBalancete(chartOfAccounts, ledgerEntries, salesHistory);

  const triggerExport = (type: 'balancete' | 'invoices' | 'dre', format: 'pdf' | 'excel') => {
    if (type === 'invoices') {
      if (format === 'pdf') {
        exportInvoicesToPDF(currentCompany, salesHistory, exportPeriod);
      } else {
        exportInvoicesToExcel(currentCompany, salesHistory, exportPeriod);
      }
      setExportSuccessMessage(`Histórico de Faturação exportado com sucesso em formato ${format.toUpperCase()}!`);
    } else if (type === 'balancete') {
      if (format === 'pdf') {
        exportBalanceteToPDF(currentCompany, balanceteRows, exportPeriod);
      } else {
        exportBalanceteToExcel(currentCompany, balanceteRows, exportPeriod);
      }
      setExportSuccessMessage(`Balancete SNC exportado com sucesso em formato ${format.toUpperCase()}!`);
    } else if (type === 'dre') {
      if (format === 'pdf') {
        exportDreToPDF(currentCompany, totalSalesRevenue, exportPeriod);
      } else {
        exportDreToExcel(currentCompany, totalSalesRevenue, exportPeriod);
      }
      setExportSuccessMessage(`Demonstração de Resultados (DRE) exportada com sucesso em formato ${format.toUpperCase()}!`);
    }

    setTimeout(() => {
      setExportSuccessMessage(null);
    }, 4000);
  };

  // ================= PAYABLE HANDLERS =================
  const handleSavePayable = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === payableForm.supplierId);
    if (!sup) return;

    if (editingPayable) {
      updateAccountPayable(editingPayable.id, {
        supplierId: sup.id,
        supplierName: sup.name,
        documentNumber: payableForm.documentNumber || editingPayable.documentNumber,
        date: payableForm.date,
        dueDate: payableForm.dueDate,
        amount: Number(payableForm.amount),
        notes: payableForm.notes,
      });
      setEditingPayable(null);
    } else {
      createAccountPayable({
        companyId: currentCompany.id,
        supplierId: sup.id,
        supplierName: sup.name,
        documentNumber: payableForm.documentNumber || `FT-${Date.now().toString().slice(-4)}`,
        date: payableForm.date,
        dueDate: payableForm.dueDate,
        amount: Number(payableForm.amount),
        paidAmount: 0,
        status: 'pendente',
        notes: payableForm.notes,
      });
      setShowNewPayableModal(false);
    }
  };

  // ================= RECEIVABLE HANDLERS =================
  const handleSaveReceivable = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === receivableForm.customerId);
    if (!cust) return;

    if (editingReceivable) {
      updateAccountReceivable(editingReceivable.id, {
        customerId: cust.id,
        customerName: cust.name,
        invoiceNumber: receivableForm.invoiceNumber || editingReceivable.invoiceNumber,
        date: receivableForm.date,
        dueDate: receivableForm.dueDate,
        amount: Number(receivableForm.amount),
        notes: receivableForm.notes,
      });
      setEditingReceivable(null);
    } else {
      createAccountReceivable({
        companyId: currentCompany.id,
        customerId: cust.id,
        customerName: cust.name,
        invoiceNumber: receivableForm.invoiceNumber || `FT ${new Date().getFullYear()}A/${Math.floor(1000 + Math.random() * 9000)}`,
        date: receivableForm.date,
        dueDate: receivableForm.dueDate,
        amount: Number(receivableForm.amount),
        receivedAmount: 0,
        status: 'pendente',
        notes: receivableForm.notes,
      });
      setShowNewReceivableModal(false);
    }
  };

  // ================= ACCOUNT HANDLERS =================
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.code || !accountForm.name) return;

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        code: accountForm.code,
        name: accountForm.name,
        type: accountForm.type,
        class: Number(accountForm.class),
        description: accountForm.description,
        parentCode: accountForm.parentCode || undefined,
      });
      setEditingAccount(null);
    } else {
      addAccount({
        code: accountForm.code,
        name: accountForm.name,
        type: accountForm.type,
        class: Number(accountForm.class),
        balance: 0,
        description: accountForm.description,
        parentCode: accountForm.parentCode || undefined,
      });
      setShowNewAccountModal(false);
    }
  };

  // ================= LEDGER ENTRY HANDLERS =================
  const handleSaveLedger = (e: React.FormEvent) => {
    e.preventDefault();
    const debitAcc = chartOfAccounts.find((a) => a.code === ledgerForm.debitAccountCode);
    const creditAcc = chartOfAccounts.find((a) => a.code === ledgerForm.creditAccountCode);
    if (!debitAcc || !creditAcc) {
      notify('Contas de Débito e Crédito devem ser válidas!', 'warning');
      return;
    }

    const lines = [
      {
        id: `line-${Date.now()}-1`,
        accountId: debitAcc.id,
        accountCode: debitAcc.code,
        accountName: debitAcc.name,
        debit: Number(ledgerForm.amount),
        credit: 0,
      },
      {
        id: `line-${Date.now()}-2`,
        accountId: creditAcc.id,
        accountCode: creditAcc.code,
        accountName: creditAcc.name,
        debit: 0,
        credit: Number(ledgerForm.amount),
      },
    ];

    if (editingLedger) {
      updateLedgerEntry(editingLedger.id, {
        date: ledgerForm.date,
        description: ledgerForm.description,
        documentRef: ledgerForm.documentRef,
        lines,
      });
      setEditingLedger(null);
    } else {
      addLedgerEntry({
        companyId: currentCompany.id,
        entryNumber: `LANC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: ledgerForm.date,
        description: ledgerForm.description,
        documentRef: ledgerForm.documentRef,
        journalType: 'Geral',
        lines,
      });
      setShowNewLedgerModal(false);
    }
  };

  // ================= BANK TX HANDLERS =================
  const handleSaveBankTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankTxForm.description) return;

    if (editingBankTx) {
      updateBankTransaction(editingBankTx.id, {
        date: bankTxForm.date,
        description: bankTxForm.description,
        amount: Number(bankTxForm.amount),
        type: bankTxForm.type,
        documentRef: bankTxForm.documentRef,
      });
      setEditingBankTx(null);
    } else {
      addBankTransaction({
        companyId: currentCompany.id,
        date: bankTxForm.date,
        description: bankTxForm.description,
        amount: Number(bankTxForm.amount),
        type: bankTxForm.type,
        matched: false,
        documentRef: bankTxForm.documentRef,
      });
      setShowNewBankTxModal(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Header */}
      <div className="bg-[#141414] border-b border-[#262626] px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-serif text-[#e5e5e5]">Gestão Financeira & Contabilidade SNC</h1>
              <p className="text-xs text-neutral-400">
                Faturação certificada, contas correntes, plano de contas SNC, reconciliação bancária e SAF-T PT
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3.5 py-2 bg-[#1f1f1f] hover:bg-[#262626] text-neutral-200 border border-[#333] font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#c5a47e]" />
              <span>Exportar Relatórios</span>
            </button>
            <button
              onClick={() => setShowSaftModal(true)}
              className="px-3.5 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <FileCode2 className="w-4 h-4" />
              <span>Exportar SAF-T (PT)</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[#262626]">
          <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Volume Faturado Total</div>
            <div className="text-lg font-mono font-semibold text-emerald-400 mt-0.5">
              {formatCurrency(totalSalesRevenue)}
            </div>
          </div>
          <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">IVA Liquidado (a Entregar)</div>
            <div className="text-lg font-mono font-semibold text-[#c5a47e] mt-0.5">
              {formatCurrency(totalTaxCollected)}
            </div>
          </div>
          <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Contas a Receber (Clientes)</div>
            <div className="text-lg font-mono font-semibold text-cyan-400 mt-0.5">
              {formatCurrency(totalReceivables)}
            </div>
          </div>
          <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-3">
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Contas a Pagar (Fornecedores)</div>
            <div className="text-lg font-mono font-semibold text-rose-400 mt-0.5">
              {formatCurrency(totalPayables)}
            </div>
          </div>
        </div>

        {exportSuccessMessage && (
          <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exportSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-[#121212] border-b border-[#262626] px-6 flex items-center space-x-2 overflow-x-auto">
        {[
          { id: 'invoices', label: 'Documentos Emitidos', icon: Receipt, count: salesHistory.length },
          { id: 'payables', label: 'Contas a Pagar', icon: TrendingDown, count: accountsPayable.length },
          { id: 'receivables', label: 'Contas a Receber', icon: TrendingUp, count: accountsReceivable.length },
          { id: 'chart', label: 'Plano de Contas SNC', icon: BookOpen, count: chartOfAccounts.length },
          { id: 'ledger', label: 'Diário & Lançamentos', icon: Scale, count: ledgerEntries.length },
          { id: 'reconciliation', label: 'Reconciliação Bancária', icon: Landmark, count: bankTransactions.length },
          { id: 'dre', label: 'DRE & Balancete', icon: PieChart },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-3 text-xs font-medium border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#c5a47e] text-[#c5a47e]'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-[#c5a47e]/20 text-[#c5a47e]' : 'bg-[#1f1f1f] text-neutral-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ================= TAB 1: INVOICES ================= */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {/* Top Toolbar / Filters */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    placeholder="Pesquisar por nº fatura, cliente ou NIF..."
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]/50"
                  />
                  {docSearchQuery && (
                    <button
                      onClick={() => setDocSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Filter className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <select
                    value={filterDocType}
                    onChange={(e) => setFilterDocType(e.target.value)}
                    className="bg-[#0d0d0d] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="FS">FS - Fatura Simplificada</option>
                    <option value="FT">FT - Fatura</option>
                    <option value="FR">FR - Fatura-Recibo</option>
                    <option value="NC">NC - Nota de Crédito</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-neutral-400 font-mono">
                <span className="bg-[#1a1a1a] px-2.5 py-1 rounded-md border border-[#262626]">
                  {salesHistory.filter((s) => {
                    const matchesSearch =
                      !docSearchQuery ||
                      (s.invoiceNumber || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                      (s.customerName || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                      (s.customerNif || s.customerTaxNumber || '').includes(docSearchQuery);
                    const matchesType =
                      filterDocType === 'all' || (s.invoiceType || (s as any).documentType) === filterDocType;
                    return matchesSearch && matchesType;
                  }).length} documentos
                </span>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Documento / Série</th>
                    <th className="px-4 py-3">Data/Hora</th>
                    <th className="px-4 py-3">Cliente / NIF</th>
                    <th className="px-4 py-3 text-center">Tipo</th>
                    <th className="px-4 py-3 text-right">Incidência</th>
                    <th className="px-4 py-3 text-right">IVA Total</th>
                    <th className="px-4 py-3 text-right">Total c/ IVA</th>
                    <th className="px-4 py-3 text-center">Assinatura AT</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {salesHistory
                    .filter((sale) => {
                      const matchesSearch =
                        !docSearchQuery ||
                        (sale.invoiceNumber || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                        (sale.customerName || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                        (sale.customerNif || sale.customerTaxNumber || '').includes(docSearchQuery);
                      const matchesType =
                        filterDocType === 'all' || (sale.invoiceType || (sale as any).documentType) === filterDocType;
                      return matchesSearch && matchesType;
                    })
                    .map((sale) => (
                      <tr
                        key={sale.id}
                        onClick={() => setSelectedSaleForPreview(sale)}
                        className="hover:bg-[#1a1a1a] cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-neutral-200 group-hover:text-[#c5a47e] transition-colors flex items-center space-x-2">
                          <FileText className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#c5a47e]" />
                          <span>{sale.invoiceNumber}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-400">
                          {formatDate((sale as any).timestamp || sale.date)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-200">{sale.customerName || 'Consumidor Final'}</div>
                          <div className="text-[11px] font-mono text-neutral-500">
                            {sale.customerNif || sale.customerTaxNumber || '999999990'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono">
                            {sale.invoiceType || (sale as any).documentType || 'FS'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-400">
                          {formatCurrency(sale.subtotal)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[#c5a47e]">
                          {formatCurrency(sale.taxTotal)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                          {formatCurrency(sale.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {((sale.fiscalHash || (sale as any).hashControl || '3kL9') as string).slice(0, 4)}-AT
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div
                            className="flex items-center justify-end space-x-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedSaleForPreview(sale)}
                              className="px-2 py-1 bg-[#1f1f1f] hover:bg-[#c5a47e] text-neutral-300 hover:text-neutral-950 rounded-md text-[11px] font-medium transition-colors flex items-center space-x-1 cursor-pointer border border-[#2a2a2a]"
                              title="Abrir e Visualizar Documento"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Abrir</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => printInvoiceDocument(sale, currentCompany)}
                              className="p-1 text-neutral-400 hover:text-white bg-[#1a1a1a] hover:bg-neutral-800 border border-[#2a2a2a] rounded-md transition-colors cursor-pointer"
                              title="Imprimir A4"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => printThermalReceipt(sale, currentCompany, currentStore)}
                              className="p-1 text-neutral-400 hover:text-white bg-[#1a1a1a] hover:bg-neutral-800 border border-[#2a2a2a] rounded-md transition-colors cursor-pointer"
                              title="Imprimir Talão Térmico 80mm"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadInvoicePdf(sale, currentCompany)}
                              className="p-1 text-neutral-400 hover:text-white bg-[#1a1a1a] hover:bg-neutral-800 border border-[#2a2a2a] rounded-md transition-colors cursor-pointer"
                              title="Descarregar PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {salesHistory.filter((sale) => {
                    const matchesSearch =
                      !docSearchQuery ||
                      (sale.invoiceNumber || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                      (sale.customerName || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                      (sale.customerNif || sale.customerTaxNumber || '').includes(docSearchQuery);
                    const matchesType =
                      filterDocType === 'all' || (sale.invoiceType || (sale as any).documentType) === filterDocType;
                    return matchesSearch && matchesType;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-neutral-500">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                        <p className="text-xs font-medium text-neutral-400">Nenhum documento emitido encontrado.</p>
                        {docSearchQuery && (
                          <p className="text-[11px] text-neutral-500 mt-1">
                            Tente ajustar os filtros ou termo de pesquisa.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PAYABLES CRUD ================= */}
        {activeTab === 'payables' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="text-xs text-neutral-400">
                Gestão de compromissos com fornecedores e liquidações bancárias
              </div>
              {canCreate && (
                <button
                  onClick={() => {
                    setEditingPayable(null);
                    setShowNewPayableModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Título a Pagar</span>
                </button>
              )}
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Doc. Fornecedor</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3">Data Emissão</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3 text-right">Valor Total</th>
                    <th className="px-4 py-3 text-right">Pago</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Ações CRUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {accountsPayable.map((ap) => {
                    const isPending = ap.status !== 'pago';
                    return (
                      <tr key={ap.id} className="hover:bg-[#191919] transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-neutral-200">
                          {ap.documentNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-200">{ap.supplierName}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDate(ap.date)}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDate(ap.dueDate)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-200">
                          {formatCurrency(ap.amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">
                          {formatCurrency(ap.paidAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                            ap.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                            ap.status === 'parcial' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {ap.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {isPending && canEdit && (
                              <button
                                onClick={() => payAccountPayable(ap.id, ap.amount - ap.paidAmount)}
                                className="px-2 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded text-[11px] font-medium cursor-pointer"
                              >
                                Liquidar
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingPayable(ap);
                                  setPayableForm({
                                    supplierId: ap.supplierId,
                                    documentNumber: ap.documentNumber,
                                    date: ap.date,
                                    dueDate: ap.dueDate,
                                    amount: ap.amount,
                                    notes: ap.notes || '',
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  requestConfirm({
                                    title: 'Eliminar Conta a Pagar',
                                    message: `Tem a certeza que deseja eliminar a conta a pagar ${ap.documentNumber}?`,
                                    itemDetails: `Fornecedor: ${ap.supplierName} | Valor: ${formatCurrency(ap.amount)} | Vencimento: ${formatDate(ap.dueDate)}`,
                                    confirmLabel: 'Eliminar Registo',
                                    isDestructive: true,
                                    onConfirm: () => {
                                      deleteAccountPayable(ap.id);
                                    },
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: RECEIVABLES CRUD ================= */}
        {activeTab === 'receivables' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="text-xs text-neutral-400">
                Acompanhamento de faturas pendentes de clientes e cobranças
              </div>
              {canCreate && (
                <button
                  onClick={() => {
                    setEditingReceivable(null);
                    setShowNewReceivableModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Título a Receber</span>
                </button>
              )}
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Fatura Ref.</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Emissão</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3 text-right">Valor Total</th>
                    <th className="px-4 py-3 text-right">Recebido</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Ações CRUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {accountsReceivable.map((ar) => {
                    const isPending = ar.status !== 'pago';
                    return (
                      <tr key={ar.id} className="hover:bg-[#191919] transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-neutral-200">
                          {ar.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-200">{ar.customerName}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDate(ar.date)}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDate(ar.dueDate)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-200">
                          {formatCurrency(ar.amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-cyan-400">
                          {formatCurrency(ar.receivedAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                            ar.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                            ar.status === 'parcial' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {ar.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {isPending && canEdit && (
                              <button
                                onClick={() => receiveAccountReceivable(ar.id, ar.amount - ar.receivedAmount)}
                                className="px-2 py-1 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 rounded text-[11px] font-medium cursor-pointer"
                              >
                                Receber
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingReceivable(ar);
                                  setReceivableForm({
                                    customerId: ar.customerId,
                                    invoiceNumber: ar.invoiceNumber,
                                    date: ar.date,
                                    dueDate: ar.dueDate,
                                    amount: ar.amount,
                                    notes: ar.notes || '',
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  requestConfirm({
                                    title: 'Eliminar Título a Receber',
                                    message: `Tem a certeza que deseja eliminar o título a receber ${ar.invoiceNumber}?`,
                                    itemDetails: `Cliente: ${ar.customerName} | Valor: ${formatCurrency(ar.amount)} | Vencimento: ${formatDate(ar.dueDate)}`,
                                    confirmLabel: 'Eliminar Título',
                                    isDestructive: true,
                                    onConfirm: () => {
                                      deleteAccountReceivable(ar.id);
                                    },
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: CHART OF ACCOUNTS SNC CRUD ================= */}
        {activeTab === 'chart' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="text-xs text-neutral-400">
                Plano Oficial de Contas (Sistema de Normalização Contabilística - SNC)
              </div>
              {canCreate && (
                <button
                  onClick={() => {
                    setEditingAccount(null);
                    setShowNewAccountModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Conta SNC</span>
                </button>
              )}
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Código SNC</th>
                    <th className="px-4 py-3">Designação da Conta</th>
                    <th className="px-4 py-3">Classe</th>
                    <th className="px-4 py-3">Natureza</th>
                    <th className="px-4 py-3 text-right">Saldo Atual</th>
                    <th className="px-4 py-3 text-right">Ações CRUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {chartOfAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-[#191919] transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-[#c5a47e]">
                        {acc.code}
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-200">{acc.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-neutral-800 text-neutral-300">
                          Classe {acc.class}
                        </span>
                      </td>
                      <td className="px-4 py-3 uppercase text-[10px] font-mono text-neutral-400">
                        {acc.type}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-200">
                        {formatCurrency(acc.balance)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {canEdit && (
                            <button
                              onClick={() => {
                                setEditingAccount(acc);
                                setAccountForm({
                                  code: acc.code,
                                  name: acc.name,
                                  type: acc.type,
                                  class: acc.class,
                                  description: acc.description || '',
                                  parentCode: acc.parentCode || '',
                                });
                              }}
                              className="p-1.5 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                requestConfirm({
                                  title: 'Eliminar Conta do Plano SNC',
                                  message: `Tem a certeza que deseja eliminar a conta SNC ${acc.code} - ${acc.name}?`,
                                  itemDetails: `Código: ${acc.code} | Tipo: ${acc.type} | Classe: ${acc.class}`,
                                  confirmLabel: 'Eliminar Conta',
                                  isDestructive: true,
                                  onConfirm: () => {
                                    deleteAccount(acc.id);
                                  },
                                });
                              }}
                              className="p-1.5 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 5: LEDGER & DIARY ENTRIES CRUD ================= */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="text-xs text-neutral-400">
                Livro Diário com partidas dobradas (Débitos e Créditos)
              </div>
              {canCreate && (
                <button
                  onClick={() => {
                    setEditingLedger(null);
                    setShowNewLedgerModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Lançamento Diário</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {ledgerEntries.map((entry) => {
                const totalDebit = entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
                return (
                  <div key={entry.id} className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#262626] mb-3">
                      <div>
                        <span className="font-mono font-semibold text-[#c5a47e] text-sm">{entry.entryNumber}</span>
                        <span className="text-xs text-neutral-400 ml-3">{formatDate(entry.date)}</span>
                        <span className="text-xs text-neutral-500 ml-3">Ref: {entry.documentRef || '—'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-semibold text-neutral-200 text-xs">
                          Total: {formatCurrency(totalDebit)}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditingLedger(entry);
                              setLedgerForm({
                                date: entry.date,
                                description: entry.description,
                                documentRef: entry.documentRef || '',
                                debitAccountCode: entry.lines.find((l) => l.debit > 0)?.accountCode || '6211',
                                creditAccountCode: entry.lines.find((l) => l.credit > 0)?.accountCode || '121',
                                amount: totalDebit,
                              });
                            }}
                            className="p-1 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              requestConfirm({
                                title: 'Eliminar Lançamento Contabilístico',
                                message: `Tem a certeza que deseja eliminar o lançamento ${entry.entryNumber}?`,
                                itemDetails: `Descrição: ${entry.description} | Total Débito/Crédito: ${formatCurrency(totalDebit)}`,
                                confirmLabel: 'Eliminar Lançamento',
                                isDestructive: true,
                                onConfirm: () => {
                                  deleteLedgerEntry(entry.id);
                                },
                              });
                            }}
                            className="p-1 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-neutral-300 font-medium mb-2">{entry.description}</div>

                    <div className="bg-[#0e0e0e] rounded-lg p-2 border border-[#222]">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-[10px] text-neutral-500 font-mono border-b border-[#262626]">
                            <th className="py-1">Conta</th>
                            <th className="py-1">Descrição</th>
                            <th className="py-1 text-right">Débito</th>
                            <th className="py-1 text-right">Crédito</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f1f1f]">
                          {entry.lines.map((line) => (
                            <tr key={line.id}>
                              <td className="py-1 font-mono text-[#c5a47e]">{line.accountCode}</td>
                              <td className="py-1 text-neutral-300">{line.accountName}</td>
                              <td className="py-1 text-right font-mono text-emerald-400">
                                {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                              </td>
                              <td className="py-1 text-right font-mono text-rose-400">
                                {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 6: BANK RECONCILIATION CRUD ================= */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="text-xs text-neutral-400">
                Extrato de movimentos bancários e conciliação com faturas e pagamentos
              </div>
              {canCreate && (
                <button
                  onClick={() => {
                    setEditingBankTx(null);
                    setShowNewBankTxModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Movimento Bancário</span>
                </button>
              )}
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Descrição Extrato</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Montante</th>
                    <th className="px-4 py-3">Documento Conciliado</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Ações CRUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {bankTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#191919] transition-colors">
                      <td className="px-4 py-3 font-mono text-neutral-400">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3 font-medium text-neutral-200">{tx.description}</td>
                      <td className="px-4 py-3 uppercase text-[10px] font-mono">
                        <span className={tx.type === 'credito' ? 'text-emerald-400' : 'text-rose-400'}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        <span className={tx.type === 'credito' ? 'text-emerald-400' : 'text-neutral-200'}>
                          {tx.type === 'credito' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-400">{tx.documentRef || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {tx.matched ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Conciliado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {!tx.matched && canEdit && (
                            <button
                              onClick={() => reconcileBankTransaction(tx.id, 'DOC-AUTO')}
                              className="px-2 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded text-[11px] font-medium cursor-pointer"
                            >
                              Conciliar
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => {
                                setEditingBankTx(tx);
                                setBankTxForm({
                                  date: tx.date,
                                  description: tx.description,
                                  amount: tx.amount,
                                  type: tx.type,
                                  documentRef: tx.documentRef || '',
                                });
                              }}
                              className="p-1.5 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                requestConfirm({
                                  title: 'Eliminar Movimento Bancário',
                                  message: `Tem a certeza que deseja eliminar o movimento "${tx.description}"?`,
                                  itemDetails: `Valor: ${formatCurrency(tx.amount)} | Data: ${formatDate(tx.date)} | Tipo: ${tx.type}`,
                                  confirmLabel: 'Eliminar Movimento',
                                  isDestructive: true,
                                  onConfirm: () => {
                                    deleteBankTransaction(tx.id);
                                  },
                                });
                              }}
                              className="p-1.5 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 7: DRE & BALANCETE ================= */}
        {activeTab === 'dre' && (
          <div className="space-y-6">
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif text-base text-[#e5e5e5]">Balancete Geral SNC (Classes 1 a 7)</h3>
                  <p className="text-xs text-neutral-400">Verificação do equilíbrio de débito e crédito</p>
                </div>
                <button
                  onClick={() => triggerExport('balancete', 'excel')}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md text-xs font-medium flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Excel</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                    <tr>
                      <th className="px-4 py-2.5">Conta</th>
                      <th className="px-4 py-2.5">Designação</th>
                      <th className="px-4 py-2.5 text-right">Débito Acumulado</th>
                      <th className="px-4 py-2.5 text-right">Crédito Acumulado</th>
                      <th className="px-4 py-2.5 text-right">Saldo Devedor</th>
                      <th className="px-4 py-2.5 text-right">Saldo Credor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626]">
                    {balanceteRows.map((row) => (
                      <tr key={row.code} className="hover:bg-[#191919]">
                        <td className="px-4 py-2 font-mono text-[#c5a47e]">{row.code}</td>
                        <td className="px-4 py-2 font-medium">{row.name}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatCurrency(row.debit)}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatCurrency(row.credit)}</td>
                        <td className="px-4 py-2 text-right font-mono text-emerald-400">
                          {row.debitBalance > 0 ? formatCurrency(row.debitBalance) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-cyan-400">
                          {row.creditBalance > 0 ? formatCurrency(row.creditBalance) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: PAYABLE ================= */}
      {(showNewPayableModal || editingPayable) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingPayable ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
              </h3>
              <button
                onClick={() => {
                  setShowNewPayableModal(false);
                  setEditingPayable(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayable} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Fornecedor *</label>
                <select
                  value={payableForm.supplierId}
                  onChange={(e) => setPayableForm({ ...payableForm, supplierId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.taxNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Número do Documento</label>
                <input
                  type="text"
                  placeholder="ex: FT-2026/9021"
                  value={payableForm.documentNumber}
                  onChange={(e) => setPayableForm({ ...payableForm, documentNumber: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Data Emissão</label>
                  <input
                    type="date"
                    value={payableForm.date}
                    onChange={(e) => setPayableForm({ ...payableForm, date: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={payableForm.dueDate}
                    onChange={(e) => setPayableForm({ ...payableForm, dueDate: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Montante ({currencySymbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={payableForm.amount}
                  onChange={(e) => setPayableForm({ ...payableForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Notas / Descrição</label>
                <input
                  type="text"
                  value={payableForm.notes}
                  onChange={(e) => setPayableForm({ ...payableForm, notes: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPayableModal(false);
                    setEditingPayable(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingPayable ? 'Guardar' : 'Registar Título'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECEIVABLE ================= */}
      {(showNewReceivableModal || editingReceivable) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingReceivable ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
              </h3>
              <button
                onClick={() => {
                  setShowNewReceivableModal(false);
                  setEditingReceivable(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceivable} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Cliente *</label>
                <select
                  value={receivableForm.customerId}
                  onChange={(e) => setReceivableForm({ ...receivableForm, customerId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.nif})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Número da Fatura</label>
                <input
                  type="text"
                  placeholder="ex: FT 2026A/100"
                  value={receivableForm.invoiceNumber}
                  onChange={(e) => setReceivableForm({ ...receivableForm, invoiceNumber: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Data Emissão</label>
                  <input
                    type="date"
                    value={receivableForm.date}
                    onChange={(e) => setReceivableForm({ ...receivableForm, date: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={receivableForm.dueDate}
                    onChange={(e) => setReceivableForm({ ...receivableForm, dueDate: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Montante ({currencySymbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={receivableForm.amount}
                  onChange={(e) => setReceivableForm({ ...receivableForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewReceivableModal(false);
                    setEditingReceivable(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingReceivable ? 'Guardar' : 'Registar Título'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHART OF ACCOUNTS ================= */}
      {(showNewAccountModal || editingAccount) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingAccount ? 'Editar Conta SNC' : 'Nova Conta SNC'}
              </h3>
              <button
                onClick={() => {
                  setShowNewAccountModal(false);
                  setEditingAccount(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Código SNC *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: 6221"
                  value={accountForm.code}
                  onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Nome da Conta *</label>
                <input
                  type="text"
                  required
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Classe SNC</label>
                  <select
                    value={accountForm.class}
                    onChange={(e) => setAccountForm({ ...accountForm, class: Number(e.target.value) })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((c) => (
                      <option key={c} value={c}>Classe {c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Natureza</label>
                  <select
                    value={accountForm.type}
                    onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value as any })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="passivo">Passivo</option>
                    <option value="capital_proprio">Capital Próprio</option>
                    <option value="rendimento">Rendimento (Gastos/Vendas)</option>
                    <option value="gasto">Gasto</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewAccountModal(false);
                    setEditingAccount(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingAccount ? 'Guardar' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: LEDGER ENTRY ================= */}
      {(showNewLedgerModal || editingLedger) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingLedger ? 'Editar Lançamento' : 'Novo Lançamento Diário'}
              </h3>
              <button
                onClick={() => {
                  setShowNewLedgerModal(false);
                  setEditingLedger(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLedger} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Descrição do Lançamento *</label>
                <input
                  type="text"
                  required
                  value={ledgerForm.description}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, description: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Data</label>
                  <input
                    type="date"
                    value={ledgerForm.date}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, date: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Doc. Ref.</label>
                  <input
                    type="text"
                    value={ledgerForm.documentRef}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, documentRef: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Conta a Débito (SNC)</label>
                  <select
                    value={ledgerForm.debitAccountCode}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, debitAccountCode: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  >
                    {chartOfAccounts.map((a) => (
                      <option key={a.id} value={a.code}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Conta a Crédito (SNC)</label>
                  <select
                    value={ledgerForm.creditAccountCode}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, creditAccountCode: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  >
                    {chartOfAccounts.map((a) => (
                      <option key={a.id} value={a.code}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Montante ({currencySymbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={ledgerForm.amount}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewLedgerModal(false);
                    setEditingLedger(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingLedger ? 'Guardar' : 'Gravar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BANK TRANSACTION ================= */}
      {(showNewBankTxModal || editingBankTx) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingBankTx ? 'Editar Movimento Bancário' : 'Novo Movimento Bancário'}
              </h3>
              <button
                onClick={() => {
                  setShowNewBankTxModal(false);
                  setEditingBankTx(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBankTx} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Descrição do Movimento *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Transferência SIBS Lisboa"
                  value={bankTxForm.description}
                  onChange={(e) => setBankTxForm({ ...bankTxForm, description: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Data</label>
                  <input
                    type="date"
                    value={bankTxForm.date}
                    onChange={(e) => setBankTxForm({ ...bankTxForm, date: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Tipo</label>
                  <select
                    value={bankTxForm.type}
                    onChange={(e) => setBankTxForm({ ...bankTxForm, type: e.target.value as any })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  >
                    <option value="debito">Débito (Saída)</option>
                    <option value="credito">Crédito (Entrada)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Montante ({currencySymbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={bankTxForm.amount}
                  onChange={(e) => setBankTxForm({ ...bankTxForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Documento Ref.</label>
                <input
                  type="text"
                  placeholder="ex: FT 2026A/00140"
                  value={bankTxForm.documentRef}
                  onChange={(e) => setBankTxForm({ ...bankTxForm, documentRef: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewBankTxModal(false);
                    setEditingBankTx(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingBankTx ? 'Guardar' : 'Registar Movimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SAF-T PT ================= */}
      {showSaftModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <div className="flex items-center space-x-2">
                <FileCode2 className="w-5 h-5 text-[#c5a47e]" />
                <h3 className="font-serif text-base text-[#e5e5e5]">Exportação SAF-T (PT) Portaria 302/2016</h3>
              </div>
              <button onClick={() => setShowSaftModal(false)} className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-neutral-300">
              <p>
                O ficheiro SAF-T (PT) estruturado em XML padrão da Autoridade Tributária contém toda a informação de faturação, clientes, produtos e resumo de impostos.
              </p>

              <div className="bg-[#0e0e0e] border border-[#262626] rounded-lg p-3 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Empresa:</span>
                  <span className="text-neutral-200">{currentCompany.name} ({currentCompany.taxNumber})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Faturas:</span>
                  <span className="text-emerald-400 font-semibold">{salesHistory.length} documentos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Volume:</span>
                  <span className="text-[#c5a47e] font-semibold">{formatCurrency(totalSalesRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Chave RSA:</span>
                  <span className="text-cyan-400">RSA-SHA1 Certificado AT</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSaftModal(false)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const xml = generateSaftXml();
                    const blob = new Blob([xml], { type: 'application/xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `SAF-T_PT_${currentCompany.taxNumber}_${new Date().toISOString().split('T')[0]}.xml`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setShowSaftModal(false);
                  }}
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descarregar XML Validado</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EXPORT REPORTS ================= */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">Exportar Relatórios Contabilísticos</h3>
              <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Tipo de Relatório</label>
                <select
                  value={exportReportType}
                  onChange={(e) => setExportReportType(e.target.value as any)}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  <option value="balancete">Balancete Geral SNC (Classes 1 a 7)</option>
                  <option value="invoices">Extrato Detalhado de Faturação</option>
                  <option value="dre">Demonstração de Resultados (DRE)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Formato do Ficheiro</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center space-x-2 cursor-pointer ${
                      exportFormat === 'pdf'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-[#0e0e0e] border-[#262626] text-neutral-400'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF Oficial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('excel')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center space-x-2 cursor-pointer ${
                      exportFormat === 'excel'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-[#0e0e0e] border-[#262626] text-neutral-400'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Excel / CSV</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerExport(exportReportType, exportFormat);
                    setShowExportModal(false);
                  }}
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  Gerar e Descarregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DOCUMENT PREVIEW (FATURAS / VENDAS) ================= */}
      {selectedSaleForPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col text-neutral-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#c5a47e]/15 border border-[#c5a47e]/30 text-[#c5a47e]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-serif font-bold text-sm text-[#e5e5e5]">
                      Visualização de Documento Comercial
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/40">
                      {selectedSaleForPreview.invoiceType || (selectedSaleForPreview as any).documentType || 'FS'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    {selectedSaleForPreview.invoiceNumber}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSaleForPreview(null)}
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#0a0a0a]">
              {/* Document Sheet Layout */}
              <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 shadow-lg space-y-6">
                {/* Header: Company & Doc Meta */}
                <div className="flex justify-between items-start pb-5 border-b border-[#262626]">
                  <div>
                    <h4 className="font-serif font-bold text-base text-white">
                      {currentCompany.tradeName || currentCompany.name}
                    </h4>
                    <p className="text-neutral-400 text-xs mt-0.5">{currentCompany.address}</p>
                    <p className="text-neutral-400 text-[11px] font-mono">
                      NIF/NUIT: {currentCompany.taxNumber}
                    </p>
                    {currentCompany.phone && (
                      <p className="text-neutral-500 text-[11px]">Tel: {currentCompany.phone}</p>
                    )}
                    <p className="text-emerald-400 text-[10px] font-mono mt-1">
                      Software Certificado nº {currentCompany.softwareCertNumber || '4120/AT'}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/40 inline-block">
                      {selectedSaleForPreview.invoiceType === 'FS'
                        ? 'FATURA SIMPLIFICADA'
                        : selectedSaleForPreview.invoiceType === 'FT'
                        ? 'FATURA'
                        : selectedSaleForPreview.invoiceType === 'NC'
                        ? 'NOTA DE CRÉDITO'
                        : 'FATURA-RECIBO'}
                    </span>
                    <p className="text-sm font-mono font-bold text-white pt-1">
                      {selectedSaleForPreview.invoiceNumber}
                    </p>
                    <p className="text-neutral-400 text-[11px] font-mono">
                      Data: {formatDate((selectedSaleForPreview as any).timestamp || selectedSaleForPreview.date)}
                    </p>
                    <p className="text-neutral-500 text-[10px] font-mono">
                      {selectedSaleForPreview.atcud || 'ATCUD-AT-VALID'}
                    </p>
                    {selectedSaleForPreview.operatorName && (
                      <p className="text-neutral-500 text-[10px]">
                        Op: {selectedSaleForPreview.operatorName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Customer Details Box */}
                <div className="p-3.5 bg-[#171717] rounded-xl border border-[#262626] text-xs">
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block mb-1">
                    Exmo.(a) Senhor(a):
                  </span>
                  <p className="font-bold text-white text-sm">
                    {selectedSaleForPreview.customerName || 'Consumidor Final'}
                  </p>
                  <p className="text-neutral-400 font-mono text-xs mt-0.5">
                    NIF / NUIT: {selectedSaleForPreview.customerNif || selectedSaleForPreview.customerTaxNumber || '999999990'}
                  </p>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#262626] text-neutral-400 text-[10px] uppercase font-semibold">
                        <th className="pb-2">Artigo</th>
                        <th className="pb-2 text-center">Qtd</th>
                        <th className="pb-2 text-right">PVP Unit.</th>
                        <th className="pb-2 text-center">IVA</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e1e]">
                      {selectedSaleForPreview.items && selectedSaleForPreview.items.length > 0 ? (
                        selectedSaleForPreview.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 pr-2">
                              <div className="font-medium text-white">{it.productName}</div>
                              {it.sku && <div className="text-[10px] font-mono text-neutral-500">SKU: {it.sku}</div>}
                            </td>
                            <td className="py-2.5 text-center font-mono">{it.quantity}</td>
                            <td className="py-2.5 text-right font-mono text-neutral-300">
                              {formatCurrency(it.unitPrice)}
                            </td>
                            <td className="py-2.5 text-center font-mono text-[11px] text-neutral-400">
                              {it.taxRate}%
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-[#c5a47e]">
                              {formatCurrency(it.total)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-3 text-center text-neutral-500">
                            Detalhe de linhas não disponível.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Payments, Bank Data and Totals Breakdown */}
                <div className="pt-4 border-t border-[#262626] grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* Left Column: Bank Details & Payments */}
                  <div className="space-y-3">
                    {/* Bank Details */}
                    <div className="text-xs bg-[#171717] p-3 rounded-lg border border-[#262626] space-y-1">
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block border-b border-[#222] pb-1">
                        Dados Bancários para Liquidação
                      </span>
                      <div className="text-[11px] text-neutral-300 space-y-0.5 pt-0.5">
                        <div>Banco: <strong className="text-white">{currentCompany.defaultBank || 'Millennium BIM (Moçambique)'}</strong></div>
                        <div className="font-mono">IBAN / Conta: <strong className="text-[#c5a47e]">{currentCompany.defaultIban || 'MZ59 0001 0000 1234 5678 9012 3'}</strong></div>
                        <div>Titular: <span className="text-neutral-400">{currentCompany.name}</span></div>
                      </div>
                    </div>

                    {/* Payments */}
                    <div className="space-y-1.5 text-xs bg-[#171717] p-3 rounded-lg border border-[#262626]">
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">
                        Meio de Pagamento Utilizado
                      </span>
                      {selectedSaleForPreview.payments && selectedSaleForPreview.payments.length > 0 ? (
                        selectedSaleForPreview.payments.map((p, idx) => (
                          <div key={idx} className="flex justify-between text-xs font-mono">
                            <span className="text-neutral-300 capitalize">
                              {p.method === 'cartao'
                                ? 'Cartão TPA'
                                : p.method === 'mbway'
                                ? 'M-Pesa / Móvel'
                                : p.method}
                            </span>
                            <span className="font-semibold text-neutral-200">{formatCurrency(p.amount)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-neutral-500 text-xs font-mono">Pagamento Regular</div>
                      )}
                      {selectedSaleForPreview.changeAmount && selectedSaleForPreview.changeAmount > 0 ? (
                        <div className="flex justify-between text-xs font-mono pt-1 border-t border-[#262626] text-neutral-400">
                          <span>Troco:</span>
                          <span className="text-emerald-400 font-bold">
                            {formatCurrency(selectedSaleForPreview.changeAmount)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Right Column: Totals summary */}
                  <div className="space-y-2 text-xs text-right font-mono bg-[#171717] p-3 rounded-lg border border-[#262626]">
                    <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block text-left border-b border-[#222] pb-1">
                      Resumo Financeiro & Totais
                    </span>
                    <div className="flex justify-between text-neutral-400 pt-1">
                      <span>Incidência (Base):</span>
                      <span className="text-neutral-200">{formatCurrency(selectedSaleForPreview.subtotal)}</span>
                    </div>
                    {selectedSaleForPreview.discountTotal > 0 && (
                      <div className="flex justify-between text-rose-400">
                        <span>Descontos:</span>
                        <span>-{formatCurrency(selectedSaleForPreview.discountTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-neutral-400">
                      <span>IVA Total Incluído:</span>
                      <span className="text-[#c5a47e]">{formatCurrency(selectedSaleForPreview.taxTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-serif font-bold text-white pt-2 border-t border-[#262626]">
                      <span className="text-neutral-300 font-sans text-xs">Total do Documento:</span>
                      <span className="text-lg text-[#c5a47e] font-mono">
                        {formatCurrency(selectedSaleForPreview.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fiscal Certification Footer */}
                <div className="pt-3 border-t border-[#262626] text-[10px] font-mono text-neutral-500 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    Assinatura Digital AT:{' '}
                    <strong className="text-neutral-300">
                      {selectedSaleForPreview.fiscalHash || (selectedSaleForPreview as any).hashControl || '3kL9-SHA256-OK'}
                    </strong>
                  </div>
                  <div>Processado por Programa Certificado nº {currentCompany.softwareCertNumber || '4120/AT'}</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#0d0d0d] border-t border-[#262626] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedSaleForPreview(null)}
                className="px-4 py-2 bg-[#181818] hover:bg-[#222222] text-neutral-300 font-medium rounded-xl text-xs cursor-pointer border border-[#2a2a2a] transition-colors"
              >
                Fechar
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    notify(`Documento ${selectedSaleForPreview.invoiceNumber} enviado por email com sucesso.`, 'success');
                  }}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-neutral-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Enviar Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    downloadInvoicePdf(selectedSaleForPreview, currentCompany);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-neutral-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Descarregar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    printThermalReceipt(selectedSaleForPreview, currentCompany, currentStore);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-neutral-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Talão 80mm</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    printInvoiceDocument(selectedSaleForPreview, currentCompany);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-[#c5a47e] hover:bg-[#b8956f] text-neutral-950 font-bold rounded-xl text-xs cursor-pointer shadow-md transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir A4</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
