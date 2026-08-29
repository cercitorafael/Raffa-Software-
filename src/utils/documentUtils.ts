import { Sale, InvoiceType } from '../types';

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
  const t = invoiceType.toUpperCase();
  return ['ORC', 'PF', 'FP', 'COT', 'OR'].includes(t);
}

export function isTransportDocument(invoiceType?: string): boolean {
  if (!invoiceType) return false;
  const t = invoiceType.toUpperCase();
  return ['GT', 'GR'].includes(t);
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
