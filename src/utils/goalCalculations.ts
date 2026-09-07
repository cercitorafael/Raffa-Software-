import { z } from 'zod';

export interface MetaMensalItem {
  mes: number;
  nomeMes: string;
  pesoPercentual: number;
  valorMeta: number;
}

export interface ResultadoMetasComerciais {
  anoReferencia: number;
  metaAnualTotal: number;
  metasMensais: MetaMensalItem[];
  estrategia?: 'HISTORICO' | 'MANUAL' | 'LINEAR' | 'CRESCIMENTO';
  source?: string;
  sourceFallbackReason?: string;
  note?: string;
}

export const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Zod Schema para validação estrita de requisições de metas comerciais
 */
export const SalesGoalsRequestSchema = z.object({
  anoReferencia: z.number().int().min(2000).max(2100).default(2027),
  metaAnualTotal: z.number().nonnegative().default(1200000),
  estrategia: z.enum(['HISTORICO', 'MANUAL', 'LINEAR', 'CRESCIMENTO']).default('HISTORICO'),
  historicoAnoAnterior: z.array(z.number().nonnegative()).length(12).optional(),
  valoresManuais: z.array(z.number().nonnegative()).length(12).optional(),
  taxaCrescimentoPercentual: z.number().min(-100).max(1000).default(10),
});

export type SalesGoalsRequest = z.infer<typeof SalesGoalsRequestSchema>;

/**
 * Converte valor float em centavos inteiros para cálculo sem resíduos IEEE 754
 */
export function toCents(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round(Math.max(0, val) * 100);
}

/**
 * Converte centavos inteiros em número com 2 casas decimais
 */
export function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

/**
 * Conciliação contábil estrita de centavos (Largest Remainder Method).
 * Garante que sum(metasMensais.valorMeta) seja ESTRITAMENTE IGUAL a metaAnualTotal.
 */
export function reconciliarCentavos(
  itens: { mes: number; nomeMes: string; pesoPercentual: number; valorMeta: number }[],
  metaAnualTotal: number
): MetaMensalItem[] {
  const metaAnualCents = toCents(metaAnualTotal);
  if (metaAnualCents === 0) {
    return itens.map((item) => ({
      ...item,
      valorMeta: 0,
      pesoPercentual: 0,
    }));
  }

  // Centavos de cada item
  const itensCents = itens.map((it) => toCents(it.valorMeta));
  const somaCents = itensCents.reduce((acc, c) => acc + c, 0);
  let diferencaCents = metaAnualCents - somaCents;

  const resultadoCents = [...itensCents];

  // Se houver discrepância por arredondamento, ajusta nos meses de maior meta
  if (diferencaCents !== 0) {
    // Índices ordenados do maior valor para o menor
    const indicesOrdenados = resultadoCents
      .map((cents, idx) => ({ cents, idx }))
      .sort((a, b) => b.cents - a.cents)
      .map((obj) => obj.idx);

    let step = diferencaCents > 0 ? 1 : -1;
    let idxPointer = 0;
    while (diferencaCents !== 0 && idxPointer < indicesOrdenados.length * 5) {
      const targetIdx = indicesOrdenados[idxPointer % indicesOrdenados.length];
      if (step < 0 && resultadoCents[targetIdx] <= 0) {
        idxPointer++;
        continue;
      }
      resultadoCents[targetIdx] += step;
      diferencaCents -= step;
      idxPointer++;
    }
  }

  // Recalcula os pesos percentuais com base nos centavos conciliados
  return itens.map((it, idx) => {
    const valorMeta = fromCents(resultadoCents[idx]);
    const pesoPercentual = Number(((resultadoCents[idx] / metaAnualCents) * 100).toFixed(2));
    return {
      mes: it.mes,
      nomeMes: it.nomeMes,
      pesoPercentual,
      valorMeta,
    };
  });
}

/**
 * Distribuição Linear Exata (12 meses com rateio de centavos perfeitamente balanceado)
 */
export function distribuirMetaLinear(
  totalMetaAnual: number,
  monthNames: string[] = MONTH_NAMES_PT
): MetaMensalItem[] {
  const totalCents = toCents(totalMetaAnual);
  if (totalCents === 0) {
    return monthNames.map((nomeMes, i) => ({
      mes: i + 1,
      nomeMes,
      pesoPercentual: 0,
      valorMeta: 0,
    }));
  }

  const baseCentsPerMonth = Math.floor(totalCents / 12);
  const remainderCents = totalCents % 12;

  const itens: MetaMensalItem[] = monthNames.map((nomeMes, index) => {
    // Distribui os centavos restantes nos primeiros meses
    const monthCents = baseCentsPerMonth + (index < remainderCents ? 1 : 0);
    const valorMeta = fromCents(monthCents);
    const pesoPercentual = Number(((monthCents / totalCents) * 100).toFixed(2));

    return {
      mes: index + 1,
      nomeMes,
      pesoPercentual,
      valorMeta,
    };
  });

  return reconciliarCentavos(itens, totalMetaAnual);
}

/**
 * Distribuição Sazonal Baseada em Histórico com Algoritmo Largest Remainder
 */
export function distribuirMetaSazonal(
  totalMetaAnual: number,
  historico: number[],
  monthNames: string[] = MONTH_NAMES_PT
): MetaMensalItem[] {
  const totalCents = toCents(totalMetaAnual);
  const histSanitizado = (historico || []).slice(0, 12).map((v) => Math.max(0, Number(v) || 0));
  const somaHistoricoCents = histSanitizado.reduce((acc, v) => acc + toCents(v), 0);

  // Regra de Negócio POS/ERP: Se não há histórico, meta fica estritamente zerada
  if (somaHistoricoCents === 0 || totalCents === 0) {
    return monthNames.map((nomeMes, i) => ({
      mes: i + 1,
      nomeMes,
      pesoPercentual: 0,
      valorMeta: 0,
    }));
  }

  let centavosAlocados = 0;
  const mesesCalculados = monthNames.map((nomeMes, i) => {
    const histCents = toCents(histSanitizado[i] || 0);
    const proporcao = histCents / somaHistoricoCents;
    const exatoCents = totalCents * proporcao;
    const baseCents = Math.floor(exatoCents);
    const resto = exatoCents - baseCents;
    centavosAlocados += baseCents;

    return {
      mes: i + 1,
      nomeMes,
      proporcao,
      baseCents,
      resto,
    };
  });

  // Distribui os centavos residuais nos meses com maior resíduo fracionário
  let centavosRestantes = totalCents - centavosAlocados;
  const ordenadosPorResto = [...mesesCalculados].sort((a, b) => b.resto - a.resto);

  for (let i = 0; i < centavosRestantes && i < ordenadosPorResto.length; i++) {
    ordenadosPorResto[i].baseCents += 1;
  }

  const itens: MetaMensalItem[] = mesesCalculados.map((m) => {
    const valorMeta = fromCents(m.baseCents);
    const pesoPercentual = Number(((m.baseCents / totalCents) * 100).toFixed(2));
    return {
      mes: m.mes,
      nomeMes: m.nomeMes,
      pesoPercentual,
      valorMeta,
    };
  });

  return reconciliarCentavos(itens, totalMetaAnual);
}

/**
 * Distribuição por Taxa de Crescimento sobre Histórico Anterior
 */
export function distribuirMetaCrescimento(
  historico: number[],
  taxaPercentual: number = 10,
  monthNames: string[] = MONTH_NAMES_PT
): { totalMetaAnual: number; metasMensais: MetaMensalItem[] } {
  const taxaFator = 1 + Math.max(-1, taxaPercentual / 100);
  const histSanitizado = (historico || []).slice(0, 12).map((v) => Math.max(0, Number(v) || 0));
  const somaHistorico = histSanitizado.reduce((acc, v) => acc + v, 0);

  if (somaHistorico === 0) {
    return {
      totalMetaAnual: 0,
      metasMensais: monthNames.map((nomeMes, i) => ({
        mes: i + 1,
        nomeMes,
        pesoPercentual: 0,
        valorMeta: 0,
      })),
    };
  }

  const mesesCents = histSanitizado.map((v) => Math.round(toCents(v) * taxaFator));
  const totalCents = mesesCents.reduce((acc, c) => acc + c, 0);
  const totalMetaAnual = fromCents(totalCents);

  const itens: MetaMensalItem[] = monthNames.map((nomeMes, i) => {
    const valorMeta = fromCents(mesesCents[i]);
    const pesoPercentual = totalCents > 0 ? Number(((mesesCents[i] / totalCents) * 100).toFixed(2)) : 8.33;
    return {
      mes: i + 1,
      nomeMes,
      pesoPercentual,
      valorMeta,
    };
  });

  return {
    totalMetaAnual,
    metasMensais: reconciliarCentavos(itens, totalMetaAnual),
  };
}

/**
 * Sanitização e cálculo a partir de valores definidos manualmente
 */
export function distribuirMetaManual(
  valoresManuais: number[],
  monthNames: string[] = MONTH_NAMES_PT
): { totalMetaAnual: number; metasMensais: MetaMensalItem[] } {
  const sanitizados = monthNames.map((_, i) => {
    const val = Number(valoresManuais?.[i]);
    return isNaN(val) || !isFinite(val) ? 0 : Math.max(0, val);
  });

  const totalCents = sanitizados.reduce((acc, v) => acc + toCents(v), 0);
  const totalMetaAnual = fromCents(totalCents);

  const metasMensais: MetaMensalItem[] = monthNames.map((nomeMes, i) => {
    const val = sanitizados[i];
    const itemCents = toCents(val);
    const pesoPercentual = totalCents > 0 ? Number(((itemCents / totalCents) * 100).toFixed(2)) : 0;
    return {
      mes: i + 1,
      nomeMes,
      pesoPercentual,
      valorMeta: fromCents(itemCents),
    };
  });

  return {
    totalMetaAnual,
    metasMensais,
  };
}
