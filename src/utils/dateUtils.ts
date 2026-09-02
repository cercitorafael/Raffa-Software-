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
