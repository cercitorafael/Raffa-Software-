/**
 * Utilitários de manipulação de datas no fuso horário local
 * Garante consistência em filtros de 'Hoje', 'Ontem', 'Este Mês', 'Mês Anterior', etc.
 */

export const getTodayDateStr = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getYesterdayDateStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getCurrentMonthStr = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const getPrevMonthStr = (): string => {
  const d = new Date();
  d.setDate(1); // Evita overflow em meses de 31 dias
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const getMonthBounds = (monthStr: string): { start: string; end: string } => {
  if (!monthStr || !monthStr.includes('-')) {
    const curr = getCurrentMonthStr();
    return getMonthBounds(curr);
  }
  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${monthStr}-01`,
    end: `${monthStr}-${String(lastDay).padStart(2, '0')}`,
  };
};

export const getDaysAgoStr = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getCurrentWeekBounds = (): { start: string; end: string } => {
  const d = new Date();
  const dayOfWeek = (d.getDay() + 6) % 7; // Segunda-feira = 0, Domingo = 6
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    start: format(monday),
    end: format(sunday),
  };
};

export const getPrevWeekBounds = (): { start: string; end: string } => {
  const d = new Date();
  const dayOfWeek = (d.getDay() + 6) % 7;
  const prevMonday = new Date(d);
  prevMonday.setDate(d.getDate() - dayOfWeek - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);

  const format = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    start: format(prevMonday),
    end: format(prevSunday),
  };
};

export const getCurrentYearBounds = (): { start: string; end: string } => {
  const y = new Date().getFullYear();
  return {
    start: `${y}-01-01`,
    end: `${y}-12-31`,
  };
};

export const getPrevYearBounds = (): { start: string; end: string } => {
  const y = new Date().getFullYear() - 1;
  return {
    start: `${y}-01-01`,
    end: `${y}-12-31`,
  };
};

export const getMonthNamePT = (monthStr: string): string => {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const monthsNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const mIndex = parseInt(month, 10) - 1;
  const monthName = monthsNames[mIndex] || month;
  return `${monthName} de ${year}`;
};

export interface WeekInfo {
  weekKey: string;
  weekNumber: number;
  year: number;
  label: string;
  startDate: string;
  endDate: string;
}

export const getWeekInfo = (dateStr: string): WeekInfo => {
  if (!dateStr) {
    const today = getTodayDateStr();
    return getWeekInfo(today);
  }
  const cleanStr = dateStr.substring(0, 10);
  const [y, m, d] = cleanStr.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);

  // ISO 8601 week calculation
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7; // Segunda = 0, Domingo = 6
  target.setDate(target.getDate() - dayNr + 3); // Quinta-feira
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const isoYear = new Date(firstThursday).getFullYear();

  // Início (Segunda) e Fim (Domingo)
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayNr);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (dt: Date) => {
    const yr = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  const startStr = fmt(monday);
  const endStr = fmt(sunday);
  const startDayMo = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}`;
  const endDayMo = `${String(sunday.getDate()).padStart(2, '0')}/${String(sunday.getMonth() + 1).padStart(2, '0')}`;

  return {
    weekKey: `${isoYear}-W${String(weekNumber).padStart(2, '0')}`,
    weekNumber,
    year: isoYear,
    label: `Semana ${weekNumber} (${startDayMo} a ${endDayMo})`,
    startDate: startStr,
    endDate: endStr,
  };
};

export {
  formatDate,
  formatExactDateTime,
  formatExactTime,
  formatExactDate,
  getExactTimestamp,
} from './crypto';

export interface DetailedMovementTimestamp {
  dateStr: string;
  timeStr: string;
  formatted: string;
  iso: string;
}

export const formatMovementTimestampDetailed = (
  raw?: string | number | Date | null
): DetailedMovementTimestamp => {
  if (!raw) {
    return { dateStr: '—', timeStr: '—', formatted: '—', iso: '' };
  }
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      return { dateStr: String(raw), timeStr: '—', formatted: String(raw), iso: String(raw) };
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    const dateStr = `${day}/${month}/${year}`;
    const timeStr = `${hours}:${minutes}:${seconds}`;
    return {
      dateStr,
      timeStr,
      formatted: `${dateStr} ${timeStr}`,
      iso: d.toISOString(),
    };
  } catch {
    return { dateStr: String(raw), timeStr: '—', formatted: String(raw), iso: String(raw) };
  }
};
