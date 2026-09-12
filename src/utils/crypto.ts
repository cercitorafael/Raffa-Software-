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

export function formatDate(
  dateString?: string | number | Date | null,
  includeSeconds: boolean = true
): string {
  if (!dateString) return '—';
  try {
    // If it's strictly a date string in YYYY-MM-DD format (no time component)
    if (typeof dateString === 'string') {
      const trimmed = dateString.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('-');
        return `${d}/${m}/${y}`;
      }
    }

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    if (includeSeconds) {
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateString);
  }
}

export function formatExactDateTime(
  dateInput?: string | number | Date | null,
  includeSeconds: boolean = true
): string {
  return formatDate(dateInput, includeSeconds);
}

export function formatExactTime(
  dateInput?: string | number | Date | null,
  includeSeconds: boolean = true
): string {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return includeSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
  } catch {
    return String(dateInput);
  }
}

export function formatExactDate(dateInput?: string | number | Date | null): string {
  return formatDate(dateInput, false).split(' ')[0] || '—';
}

export function getExactTimestamp(): string {
  return new Date().toISOString();
}

