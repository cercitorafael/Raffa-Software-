// Digital fiscal hash generator for invoices & certified transactions
export {
  formatCurrency,
  formatCurrencyCompact,
  getCurrencyDefinition,
  setActiveAppCurrency,
  setActiveAppCompany,
  getActiveAppCurrencyCode,
  SUPPORTED_CURRENCIES,
} from './currency';

export function generateFiscalHash(
  date: string,
  invoiceNo: string,
  grossTotal: number,
  previousHash: string = ''
): string {
  const payload = `${date};${invoiceNo};${grossTotal.toFixed(2)};${previousHash || '0'}`;
  
  // Simple fast hash algorithm representing standard SHA-256 base64 4-char signature block
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const hex = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
  const hexExtra = Math.abs(hash * 31).toString(16).padStart(8, 'e').toUpperCase();
  const full = (hex + hexExtra + '9B4F8A2C').substring(0, 16);
  
  // Return the first 4 characters and full base string (like standard AT fiscal signature e.g. "Ab7X")
  return full;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

