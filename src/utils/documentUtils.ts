import { Sale, InvoiceType, CashShift, InvoiceTemplateConfig, Company, InvoiceBankAccount } from '../types';

/**
 * Checks whether a document or document type is an effective completed sale / invoice.
 *
 * CRITICAL BUSINESS RULE:
 * - 'PF' (Fatura Proforma), 'GT' (Guia de Transporte),
 *   'GR' (Guia de Remessa) and 'RC' (Recibo) are NEVER considered sales.
 * - They MUST NOT advance revenue, contribute to sales history reports, DRE,
 *   analytics charts, or cash shift totals.
 */
export function isEffectiveSaleType(invoiceType?: string): boolean {
  if (!invoiceType) return true;
  const t = invoiceType.toUpperCase();
  return ['FT', 'FS', 'FR', 'VD', 'ND'].includes(t);
}

export function isEffectiveSale(sale: Sale | { invoiceType?: string; status?: string }): boolean {
  if (!sale) return false;
  if (sale.status === 'anulado' || sale.status === 'cancelado') return false;
  return isEffectiveSaleType(sale.invoiceType);
}

export function isQuoteOrEstimate(invoiceType?: string): boolean {
  if (!invoiceType) return false;
  const t = invoiceType.trim().toUpperCase();
  return (
    ['ORC', 'PF', 'FP', 'COT', 'OR', 'QUOTATION', 'PROFORMA', 'COTAÇÃO', 'COTACAO', 'ORÇAMENTO', 'ORCAMENTO'].includes(t) ||
    t.startsWith('PF ') ||
    t.startsWith('PF/') ||
    t.startsWith('COT ') ||
    t.startsWith('ORC ') ||
    t.includes('PROFORMA') ||
    t.includes('COTAÇ') ||
    t.includes('COTAC') ||
    t.includes('ORÇAM') ||
    t.includes('ORCAM')
  );
}

export function isTransportDocument(invoiceType?: string): boolean {
  if (!invoiceType) return false;
  const t = invoiceType.trim().toUpperCase();
  return (
    ['GT', 'GR'].includes(t) ||
    t.startsWith('GT ') ||
    t.startsWith('GR ') ||
    t.includes('TRANSPORTE') ||
    t.includes('REMESSA')
  );
}

export function isCreditNote(invoiceType?: string): boolean {
  if (!invoiceType) return false;
  return invoiceType.toUpperCase() === 'NC';
}

/**
 * Returns only the sales records that qualify as commercial sales / revenue,
 * strictly excluding quotations, proformas, transport guides, and voided docs.
 */
export function getCommercialSales(sales: Sale[]): Sale[] {
  return sales.filter((s) => isEffectiveSale(s));
}

/**
 * Calculates net revenue from sales (sum of sales minus credit notes).
 * Strictly ignores Proformas (PF) and Logistics (GT/GR).
 */
export function calculateNetSalesRevenue(sales: Sale[]): number {
  return sales.reduce((acc, s) => {
    if (s.status === 'anulado' || s.status === 'cancelado') return acc;
    const t = (s.invoiceType || 'FT').toUpperCase();
    if (['FT', 'FS', 'FR', 'VD', 'ND'].includes(t)) {
      return acc + (s.total || 0);
    }
    if (t === 'NC') {
      return acc - (s.total || 0);
    }
    return acc;
  }, 0);
}

/**
 * Calculates net subtotal (before tax) for sales.
 */
export function calculateNetSubtotal(sales: Sale[]): number {
  return sales.reduce((acc, s) => {
    if (s.status === 'anulado' || s.status === 'cancelado') return acc;
    const t = (s.invoiceType || 'FT').toUpperCase();
    if (['FT', 'FS', 'FR', 'VD', 'ND'].includes(t)) {
      return acc + (s.subtotal || 0);
    }
    if (t === 'NC') {
      return acc - (s.subtotal || 0);
    }
    return acc;
  }, 0);
}

/**
 * Calculates net tax collected from sales.
 */
export function calculateNetTax(sales: Sale[]): number {
  return sales.reduce((acc, s) => {
    if (s.status === 'anulado' || s.status === 'cancelado') return acc;
    const t = (s.invoiceType || 'FT').toUpperCase();
    if (['FT', 'FS', 'FR', 'VD', 'ND'].includes(t)) {
      return acc + (s.taxTotal || 0);
    }
    if (t === 'NC') {
      return acc - (s.taxTotal || 0);
    }
    return acc;
  }, 0);
}

/**
 * Checks if a document can be edited (e.g. Proformas, drafts).
 * Official finalized fiscal invoices (FT, FS, FR, NC) are immutable under tax law.
 */
export function canEditDocument(doc: Sale): boolean {
  if (doc.status === 'anulado' || doc.status === 'convertido') return false;
  const t = (doc.invoiceType || '').toUpperCase();
  return ['PF', 'ORC', 'FP'].includes(t);
}

/**
 * Checks if a document can be deleted directly (e.g. Proformas or drafts).
 */
export function canDeleteDocument(doc: Sale): boolean {
  if (doc.status === 'convertido') return false;
  const t = (doc.invoiceType || '').toUpperCase();
  return ['PF', 'ORC', 'FP'].includes(t);
}

/**
 * Calculates the real-time financial totals for an active cash shift based strictly
 * on existing, non-annulled sales and credit notes recorded during the shift session.
 * 
 * If a sale was deleted, voided, or cancelled, it will not contribute to the shift,
 * ensuring the physical drawer and shift metrics never retain phantom or voided sales.
 */
export function calculateShiftSalesTotals(
  shift: CashShift | null,
  sales: Sale[]
): {
  totalSales: number;
  totalCash: number;
  totalCards: number;
  totalMbway: number;
  totalTransfers: number;
  totalVouchers: number;
} {
  if (!shift) {
    return { totalSales: 0, totalCash: 0, totalCards: 0, totalMbway: 0, totalTransfers: 0, totalVouchers: 0 };
  }

  const shiftDay = shift.openedAt ? shift.openedAt.substring(0, 10) : '';

  // Filter sales that took place in this shift session
  const shiftSales = sales.filter((s) => {
    if (s.companyId && shift.companyId && s.companyId !== shift.companyId) return false;
    // Anulled or cancelled sales have zero contribution to shift
    if (s.status === 'anulado' || s.status === 'cancelado') return false;

    // Direct shift match
    if (s.shiftId && s.shiftId === shift.id) return true;

    // If shiftId is absent or generic ('no-shift' / 'shift-doc'), check time and date
    if (!s.shiftId || s.shiftId === 'no-shift' || s.shiftId === 'shift-doc') {
      if (shift.openedAt && s.date && s.date >= shift.openedAt) {
        const saleDay = s.date.substring(0, 10);
        if (saleDay === shiftDay) return true;
      }
    }

    return false;
  });

  let totalSales = 0;
  let totalCash = 0;
  let totalCards = 0;
  let totalMbway = 0;
  let totalTransfers = 0;
  let totalVouchers = 0;

  shiftSales.forEach((s) => {
    const invType = (s.invoiceType || '').toUpperCase();
    const isSale = ['FT', 'FS', 'FR', 'VD', 'ND'].includes(invType);
    const isNC = invType === 'NC';
    if (!isSale && !isNC) return; // ignore Proformas, Quotes, Guides

    let mult = 1;
    if (isNC) {
      mult = -1;
      // If the original invoice it refers to was already marked 'anulado' or eliminated,
      // it is already excluded, so NC shouldn't double-subtract.
      if (s.notes) {
        const match = s.notes.match(/referente a ([A-Z0-9\/\s\-]+?)\./i);
        if (match && match[1]) {
          const origNum = match[1].trim();
          const origDoc = sales.find((orig) => orig.invoiceNumber === origNum);
          if (origDoc && (origDoc.status === 'anulado' || origDoc.status === 'cancelado')) {
            mult = 0; // already excluded
          }
        }
      }
    }

    if (mult === 0) return;

    totalSales += mult * (s.total || 0);

    // Payments breakdown
    if (Array.isArray(s.payments) && s.payments.length > 0) {
      s.payments.forEach((p) => {
        const rawAmt = Number(p.amount) || 0;
        const safeAmt = s.total > 0 && rawAmt > s.total ? s.total : rawAmt;
        const amt = mult * safeAmt;
        const method = (p.method || '').toLowerCase();
        if (method === 'dinheiro' || method === 'numerario') {
          totalCash += amt;
        } else if (method === 'cartao' || method === 'tpa' || method === 'visa' || method === 'mastercard') {
          totalCards += amt;
        } else if (method === 'mbway' || method === 'mpesa' || method === 'emola') {
          totalMbway += amt;
        } else if (method === 'transferencia') {
          totalTransfers += amt;
        } else if (method === 'vale' || method === 'voucher') {
          totalVouchers += amt;
        } else {
          totalCash += amt;
        }
      });
    } else {
      // If no payments specified:
      // In immediate payment documents (FR, FS, VD) that are not 'pendente', treat as cash
      if (['FR', 'FS', 'VD'].includes(invType) && s.status !== 'pendente') {
        totalCash += mult * (s.total || 0);
      }
    }
  });

  return {
    totalSales: Math.max(0, Number(totalSales.toFixed(2))),
    totalCash: Math.max(0, Number(totalCash.toFixed(2))),
    totalCards: Math.max(0, Number(totalCards.toFixed(2))),
    totalMbway: Math.max(0, Number(totalMbway.toFixed(2))),
    totalTransfers: Math.max(0, Number(totalTransfers.toFixed(2))),
    totalVouchers: Math.max(0, Number(totalVouchers.toFixed(2))),
  };
}

export const POPULAR_BANKS_PRESETS = [
  { name: 'Millennium BIM', ibanPrefix: '000100000', defaultAccount: '1190902466', defaultIban: '000100000119090246657' },
  { name: 'BCI (Banco Comercial e de Investimentos)', ibanPrefix: '000800000', defaultAccount: '0023489112', defaultIban: '000800000023489112341' },
  { name: 'Standard Bank Moçambique', ibanPrefix: '000300000', defaultAccount: '9283741102', defaultIban: '000300000928374110298' },
  { name: 'Moza Banco', ibanPrefix: '003400000', defaultAccount: '3819204812', defaultIban: '003400000381920481234' },
  { name: 'Absa Bank Moçambique', ibanPrefix: '000200000', defaultAccount: '5819382109', defaultIban: '000200000581938210982' },
  { name: 'Nedbank Moçambique', ibanPrefix: '003600000', defaultAccount: '2948102948', defaultIban: '003600000294810294810' },
  { name: 'FNB Moçambique', ibanPrefix: '000500000', defaultAccount: '4820194820', defaultIban: '000500000482019482019' },
  { name: 'M-Pesa (Vodacom)', ibanPrefix: '', defaultAccount: '+258 84 123 4567', defaultIban: 'Carteira Móvel / M-Pesa: 841234567' },
  { name: 'E-Mola (Movitel)', ibanPrefix: '', defaultAccount: '+258 86 123 4567', defaultIban: 'Carteira Móvel / E-Mola: 861234567' },
  { name: 'Millennium BCP (Portugal)', ibanPrefix: 'PT50 0033', defaultAccount: '0000 1234 5678 9', defaultIban: 'PT50 0033 0000 1234 5678 9015 4' },
  { name: 'Caixa Geral de Depósitos (CGD)', ibanPrefix: 'PT50 0035', defaultAccount: '0000 9876 5432 1', defaultIban: 'PT50 0035 0000 9876 5432 1018 7' },
  { name: 'Santander Totta', ibanPrefix: 'PT50 0018', defaultAccount: '0000 5544 3322 1', defaultIban: 'PT50 0018 0000 5544 3322 1012 3' },
];

export function getTemplateBankAccounts(
  tmpl?: InvoiceTemplateConfig | null,
  company?: Company | null
): InvoiceBankAccount[] {
  if (tmpl?.bankAccounts && tmpl.bankAccounts.length > 0) {
    return tmpl.bankAccounts;
  }

  const list: InvoiceBankAccount[] = [];

  // Primary bank
  const pName = tmpl?.bankName || company?.defaultBank || 'Millennium BIM (Moçambique)';
  const pIban = tmpl?.bankIban || tmpl?.iban || company?.defaultIban || '000100000119090246657';
  const pAcc = tmpl?.accountNumber || '1190902466';

  if (pName || pIban) {
    list.push({
      id: 'bank-1',
      bankName: pName,
      iban: pIban,
      accountNumber: pAcc,
      isPrimary: true,
    });
  }

  // Secondary bank
  if (tmpl?.secondaryBankName || tmpl?.secondaryBankIban) {
    list.push({
      id: 'bank-2',
      bankName: tmpl.secondaryBankName || 'BCI (Banco Comercial e de Investimentos)',
      iban: tmpl.secondaryBankIban || '000800000023489112341',
      accountNumber: tmpl.secondaryAccountNumber || '0023489112',
      isPrimary: false,
    });
  }

  // Tertiary bank
  if (tmpl?.tertiaryBankName || tmpl?.tertiaryBankIban) {
    list.push({
      id: 'bank-3',
      bankName: tmpl.tertiaryBankName || 'Standard Bank Moçambique',
      iban: tmpl.tertiaryBankIban || '000300000928374110298',
      accountNumber: tmpl.tertiaryAccountNumber || '9283741102',
      isPrimary: false,
    });
  }

  // If no banks were configured at all, add default primary and secondary
  if (list.length === 0) {
    list.push({
      id: 'bank-default-1',
      bankName: 'Millennium BIM',
      iban: '000100000119090246657',
      accountNumber: '1190902466',
      isPrimary: true,
    });
    list.push({
      id: 'bank-default-2',
      bankName: 'BCI (Banco Comercial e de Investimentos)',
      iban: '000800000023489112341',
      accountNumber: '0023489112',
      isPrimary: false,
    });
  }

  return list;
}


