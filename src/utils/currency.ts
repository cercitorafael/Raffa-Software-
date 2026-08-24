import { CurrencyDefinition } from '../types';

export const SUPPORTED_CURRENCIES: CurrencyDefinition[] = [
  {
    code: 'MZN',
    symbol: 'Mt',
    name: 'Metical Moçambicano',
    country: 'Moçambique',
    flag: '🇲🇿',
    position: 'suffix',
    spaceBetween: true,
    decimalPlaces: 2,
    decimalSeparator: ',',
    thousandsSeparator: ' ',
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    country: 'Portugal / União Europeia',
    flag: '🇵🇹',
    position: 'suffix',
    spaceBetween: true,
    decimalPlaces: 2,
    decimalSeparator: ',',
    thousandsSeparator: '.',
  },
  {
    code: 'USD',
    symbol: '$',
    name: 'Dólar Americano',
    country: 'Estados Unidos / Global',
    flag: '🇺🇸',
    position: 'prefix',
    spaceBetween: false,
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  {
    code: 'AOA',
    symbol: 'Kz',
    name: 'Kwanza Angolano',
    country: 'Angola',
    flag: '🇦🇴',
    position: 'suffix',
    spaceBetween: true,
    decimalPlaces: 2,
    decimalSeparator: ',',
    thousandsSeparator: '.',
  },
  {
    code: 'BRL',
    symbol: 'R$',
    name: 'Real Brasileiro',
    country: 'Brasil',
    flag: '🇧🇷',
    position: 'prefix',
    spaceBetween: true,
    decimalPlaces: 2,
    decimalSeparator: ',',
    thousandsSeparator: '.',
  },
  {
    code: 'CVE',
    symbol: 'Esc',
    name: 'Escudo Cabo-Verdiano',
    country: 'Cabo Verde',
    flag: '🇨🇻',
    position: 'suffix',
    spaceBetween: true,
    decimalPlaces: 2,
    decimalSeparator: ',',
    thousandsSeparator: '.',
  },
  {
    code: 'STN',
    symbol: 'Db',
    name: 'Dobra Santomense',
    country: 'São Tomé e Príncipe',
    flag: '🇸🇹',
    position: 'suffix',
    spaceBetween: true,
    decimalPlaces: 2,
    decimalSeparator: ',',
    thousandsSeparator: '.',
  },
  {
    code: 'ZAR',
    symbol: 'R',
    name: 'Rand Sul-Africano',
    country: 'África do Sul / Austral',
    flag: '🇿🇦',
    position: 'prefix',
    spaceBetween: true,
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ' ',
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'Libra Esterlina',
    country: 'Reino Unido',
    flag: '🇬🇧',
    position: 'prefix',
    spaceBetween: false,
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Franco Suíço',
    country: 'Suíça',
    flag: '🇨🇭',
    position: 'suffix',
    spaceBetween: true,
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: "'",
  },
];

let globalActiveCurrencyCode = 'MZN';

// Try to initialize from cached company in localStorage
try {
  const savedComp = localStorage.getItem('erp_company') || localStorage.getItem('company');
  if (savedComp) {
    const parsed = JSON.parse(savedComp);
    if (parsed.currency) {
      globalActiveCurrencyCode = parsed.currency;
    }
  }
} catch {
  // safe fallback
}

export function setActiveAppCurrency(codeOrSymbol: string): void {
  if (codeOrSymbol) {
    globalActiveCurrencyCode = codeOrSymbol;
  }
}

export function getActiveAppCurrencyCode(): string {
  return globalActiveCurrencyCode || 'MZN';
}

export function getActiveCompanyCustomSettings(): Partial<CurrencyDefinition> | null {
  try {
    const savedComp = localStorage.getItem('erp_company') || localStorage.getItem('company');
    if (savedComp) {
      const parsed = JSON.parse(savedComp);
      const opts: Partial<CurrencyDefinition> = {};
      if (parsed.currencySymbol) opts.symbol = parsed.currencySymbol;
      if (parsed.currencyPosition) opts.position = parsed.currencyPosition;
      if (parsed.currencyDecimals !== undefined && parsed.currencyDecimals !== null) {
        opts.decimalPlaces = Number(parsed.currencyDecimals);
      }
      return Object.keys(opts).length > 0 ? opts : null;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getCurrencyDefinition(codeOrSymbol?: string): CurrencyDefinition {
  const target = (codeOrSymbol || globalActiveCurrencyCode || 'EUR').trim().toUpperCase();

  // Special matchers for Mozambique Metical
  if (target === 'MZN' || target === 'MT' || target === 'MTN' || target === 'MOÇAMBIQUE' || target === 'MOCAMBIQUE') {
    return SUPPORTED_CURRENCIES[0]; // MZN - Mt
  }

  // Special matchers for Euro
  if (target === 'EUR' || target === '€' || target === 'EURO' || target === 'PORTUGAL') {
    return SUPPORTED_CURRENCIES[1]; // EUR - €
  }

  // Special matchers for USD
  if (target === 'USD' || target === '$' || target === 'DOLAR' || target === 'DÓLAR') {
    return SUPPORTED_CURRENCIES[2]; // USD - $
  }

  // Special matchers for Kwanza
  if (target === 'AOA' || target === 'KZ' || target === 'KWANZA' || target === 'ANGOLA') {
    return SUPPORTED_CURRENCIES[3]; // AOA - Kz
  }

  // Special matchers for Real
  if (target === 'BRL' || target === 'R$' || target === 'REAL' || target === 'BRASIL') {
    return SUPPORTED_CURRENCIES[4]; // BRL - R$
  }

  // Special matchers for Escudo
  if (target === 'CVE' || target === 'ESC' || target === 'CABO VERDE') {
    return SUPPORTED_CURRENCIES[5]; // CVE - Esc
  }

  // Special matchers for Dobra
  if (target === 'STN' || target === 'DB' || target === 'SAO TOME' || target === 'SÃO TOMÉ') {
    return SUPPORTED_CURRENCIES[6]; // STN - Db
  }

  // Special matchers for Rand
  if (target === 'ZAR' || target === 'RAND' || target === 'AFRICA DO SUL') {
    return SUPPORTED_CURRENCIES[7]; // ZAR - R
  }

  // Special matchers for GBP
  if (target === 'GBP' || target === '£' || target === 'POUND' || target === 'LIBRA') {
    return SUPPORTED_CURRENCIES[8]; // GBP - £
  }

  // Special matchers for CHF
  if (target === 'CHF' || target === 'FRANCO' || target === 'SUICA' || target === 'SUÍÇA') {
    return SUPPORTED_CURRENCIES[9]; // CHF
  }

  // Direct code match
  const found = SUPPORTED_CURRENCIES.find(
    (c) => c.code.toUpperCase() === target || c.symbol.toUpperCase() === target
  );

  if (found) {
    return found;
  }

  // Fallback graceful custom currency definition
  return {
    code: codeOrSymbol || 'EUR',
    symbol: codeOrSymbol || '€',
    name: codeOrSymbol || 'Moeda Personalizada',
    country: 'Geral',
    flag: '🌐',
    position: 'suffix',
    spaceBetween: true,
    decimalPlaces: 2,
    decimalSeparator: ',',
    thousandsSeparator: ' ',
  };
}

export function formatCurrency(
  amount: number,
  currencyCodeOrCustom?: string,
  customOptions?: Partial<CurrencyDefinition>
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }

  const def = getCurrencyDefinition(currencyCodeOrCustom);
  const companyCustom = !customOptions ? getActiveCompanyCustomSettings() : null;
  const finalDef: CurrencyDefinition = { ...def, ...companyCustom, ...customOptions };

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const decimals = typeof finalDef.decimalPlaces === 'number' ? finalDef.decimalPlaces : 2;
  const fixed = absAmount.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');

  // Insert thousands separator
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, finalDef.thousandsSeparator || ' ');
  const numStr =
    decPart !== undefined && decimals > 0
      ? `${formattedInt}${finalDef.decimalSeparator || ','}${decPart}`
      : formattedInt;

  const sign = isNegative ? '-' : '';
  const space = finalDef.spaceBetween ? ' ' : '';

  if (finalDef.position === 'prefix') {
    return `${sign}${finalDef.symbol}${space}${numStr}`;
  } else {
    return `${sign}${numStr}${space}${finalDef.symbol}`;
  }
}

export function formatCurrencyCompact(amount: number, currencyCodeOrCustom?: string): string {
  const def = getCurrencyDefinition(currencyCodeOrCustom);
  const companyCustom = getActiveCompanyCustomSettings();
  const finalDef: CurrencyDefinition = { ...def, ...companyCustom };
  const absAmount = Math.abs(amount || 0);
  const sign = amount < 0 ? '-' : '';

  let numFormatted = '';
  if (absAmount >= 1_000_000) {
    numFormatted = `${(absAmount / 1_000_000).toFixed(1)}M`;
  } else if (absAmount >= 1_000) {
    numFormatted = `${(absAmount / 1_000).toFixed(1)}k`;
  } else {
    numFormatted = absAmount.toFixed(0);
  }

  const space = finalDef.spaceBetween ? ' ' : '';
  if (finalDef.position === 'prefix') {
    return `${sign}${finalDef.symbol}${space}${numFormatted}`;
  } else {
    return `${sign}${numFormatted}${space}${finalDef.symbol}`;
  }
}
