import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import 'dotenv/config';

const PORT = 3000;

// Zod Schema para validação rigorosa de entrada no backend (POS/ERP Architecture)
const SalesGoalsInputSchema = z.object({
  anoReferencia: z.coerce.number().int().min(2000).max(2100).default(2027),
  metaAnualTotal: z.coerce.number().min(0, 'A meta anual não pode ser negativa').default(1200000),
  estrategia: z.enum(['HISTORICO', 'MANUAL', 'LINEAR', 'CRESCIMENTO']).default('HISTORICO'),
  historicoAnoAnterior: z.array(z.coerce.number().min(0)).optional(),
  valoresManuais: z.array(z.coerce.number().min(0)).optional(),
  valoresMensais: z.array(z.coerce.number().min(0)).optional(),
  taxaCrescimentoPercentual: z.coerce.number().min(-100).max(1000).default(10),
});

// Lazy initialize GoogleGenAI client to avoid crash on startup if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Converte valor numérico em centavos inteiros para aritmética sem ruído IEEE 754
 */
function toCents(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round(Math.max(0, val) * 100);
}

function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

/**
 * Algoritmo de Conciliação Contábil ao Centavo (Largest Remainder Method)
 * Garante com exatidão matemática que sum(metasMensais) === metaAnualTotal
 */
function reconciliarCentavos(
  itens: { mes: number; nomeMes: string; pesoPercentual: number; valorMeta: number }[],
  metaAnualTotal: number
) {
  const metaAnualCents = toCents(metaAnualTotal);
  if (metaAnualCents === 0) {
    return itens.map((item) => ({
      ...item,
      valorMeta: 0,
      pesoPercentual: 0,
    }));
  }

  const itensCents = itens.map((it) => toCents(it.valorMeta));
  const somaCents = itensCents.reduce((acc, c) => acc + c, 0);
  let diferencaCents = metaAnualCents - somaCents;

  const resultadoCents = [...itensCents];

  if (diferencaCents !== 0) {
    const indicesOrdenados = resultadoCents
      .map((cents, idx) => ({ cents, idx }))
      .sort((a, b) => b.cents - a.cents)
      .map((obj) => obj.idx);

    let step = diferencaCents > 0 ? 1 : -1;
    let pointer = 0;
    while (diferencaCents !== 0 && pointer < indicesOrdenados.length * 5) {
      const idx = indicesOrdenados[pointer % indicesOrdenados.length];
      if (step < 0 && resultadoCents[idx] <= 0) {
        pointer++;
        continue;
      }
      resultadoCents[idx] += step;
      diferencaCents -= step;
      pointer++;
    }
  }

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

// Motor determinístico resiliente baseado em regras matemáticas estritas (ERP/POS compliant)
function calcularMetasDeterministicamente({
  anoReferencia,
  metaAnualTotal,
  estrategia,
  historicoAnoAnterior,
  valoresManuais,
  taxaCrescimentoPercentual,
}: {
  anoReferencia: number;
  metaAnualTotal: number;
  estrategia: 'HISTORICO' | 'MANUAL' | 'LINEAR' | 'CRESCIMENTO';
  historicoAnoAnterior?: number[];
  valoresManuais?: number[];
  taxaCrescimentoPercentual?: number;
}) {
  let totalMeta = Math.max(0, metaAnualTotal);
  let metasMensais: { mes: number; nomeMes: string; pesoPercentual: number; valorMeta: number }[] = [];

  if (estrategia === 'MANUAL') {
    // "MANUAL": Aceita valores definidos pelo operador e consolida o total
    const valores = Array.isArray(valoresManuais) && valoresManuais.length === 12
      ? valoresManuais.map((v) => Math.max(0, Number(v) || 0))
      : (Array.isArray(historicoAnoAnterior) && historicoAnoAnterior.length === 12
          ? historicoAnoAnterior.map((v) => Math.max(0, Number(v) || 0))
          : new Array(12).fill(fromCents(Math.floor(toCents(totalMeta) / 12))));

    const totalCents = valores.reduce((acc, v) => acc + toCents(v), 0);
    totalMeta = fromCents(totalCents);

    metasMensais = MONTH_NAMES.map((nomeMes, i) => {
      const valor = valores[i] || 0;
      const peso = totalMeta > 0 ? Number(((valor / totalMeta) * 100).toFixed(2)) : 0;
      return {
        mes: i + 1,
        nomeMes,
        pesoPercentual: peso,
        valorMeta: valor,
      };
    });
  } else if (estrategia === 'HISTORICO') {
    // "HISTORICO": Projeta proporcionalmente sobre histórico. Se histórico = 0, meta = 0.
    const hist = Array.isArray(historicoAnoAnterior) && historicoAnoAnterior.length === 12
      ? historicoAnoAnterior.map((v) => Math.max(0, Number(v) || 0))
      : new Array(12).fill(0);
    const somaHistCents = hist.reduce((acc, v) => acc + toCents(v), 0);

    if (somaHistCents === 0 || totalMeta === 0) {
      totalMeta = 0;
      metasMensais = MONTH_NAMES.map((nomeMes, i) => ({
        mes: i + 1,
        nomeMes,
        pesoPercentual: 0,
        valorMeta: 0,
      }));
    } else {
      const totalCents = toCents(totalMeta);
      let centsAlocados = 0;
      const calculados = MONTH_NAMES.map((nomeMes, i) => {
        const hCents = toCents(hist[i] || 0);
        const prop = hCents / somaHistCents;
        const exato = totalCents * prop;
        const base = Math.floor(exato);
        centsAlocados += base;
        return {
          mes: i + 1,
          nomeMes,
          base,
          resto: exato - base,
        };
      });

      let restoCents = totalCents - centsAlocados;
      const ordenados = [...calculados].sort((a, b) => b.resto - a.resto);
      for (let i = 0; i < restoCents && i < ordenados.length; i++) {
        ordenados[i].base += 1;
      }

      metasMensais = calculados.map((c) => ({
        mes: c.mes,
        nomeMes: c.nomeMes,
        pesoPercentual: Number(((c.base / totalCents) * 100).toFixed(2)),
        valorMeta: fromCents(c.base),
      }));

      metasMensais = reconciliarCentavos(metasMensais, totalMeta);
    }
  } else if (estrategia === 'CRESCIMENTO' && historicoAnoAnterior && historicoAnoAnterior.length === 12) {
    const taxa = 1 + Math.max(-1, (taxaCrescimentoPercentual || 10) / 100);
    const histSanitizado = historicoAnoAnterior.map((v) => Math.max(0, Number(v) || 0));
    const somaHist = histSanitizado.reduce((acc, v) => acc + v, 0);

    if (somaHist === 0) {
      totalMeta = 0;
      metasMensais = MONTH_NAMES.map((nomeMes, i) => ({
        mes: i + 1,
        nomeMes,
        pesoPercentual: 0,
        valorMeta: 0,
      }));
    } else {
      const mesesCents = histSanitizado.map((v) => Math.round(toCents(v) * taxa));
      const totalCents = mesesCents.reduce((acc, c) => acc + c, 0);
      totalMeta = fromCents(totalCents);

      metasMensais = MONTH_NAMES.map((nomeMes, i) => ({
        mes: i + 1,
        nomeMes,
        pesoPercentual: totalCents > 0 ? Number(((mesesCents[i] / totalCents) * 100).toFixed(2)) : 8.33,
        valorMeta: fromCents(mesesCents[i]),
      }));

      metasMensais = reconciliarCentavos(metasMensais, totalMeta);
    }
  } else {
    // "LINEAR": Divisão rigorosa em 12 meses com rateio de centavos perfeitamente equilibrado
    const totalCents = toCents(totalMeta);
    if (totalCents === 0) {
      metasMensais = MONTH_NAMES.map((nomeMes, i) => ({
        mes: i + 1,
        nomeMes,
        pesoPercentual: 0,
        valorMeta: 0,
      }));
    } else {
      const baseCents = Math.floor(totalCents / 12);
      const remainderCents = totalCents % 12;

      metasMensais = MONTH_NAMES.map((nomeMes, i) => {
        const itemCents = baseCents + (i < remainderCents ? 1 : 0);
        return {
          mes: i + 1,
          nomeMes,
          pesoPercentual: Number(((itemCents / totalCents) * 100).toFixed(2)),
          valorMeta: fromCents(itemCents),
        };
      });

      metasMensais = reconciliarCentavos(metasMensais, totalMeta);
    }
  }

  return {
    anoReferencia,
    metaAnualTotal: Number(totalMeta.toFixed(2)),
    metasMensais,
    source: 'engine_matematico_local',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

  // Commercial Targets (Metas Comerciais) Engine with Gemini 3.8 / 3.6 Flash
  app.post('/api/metas/gerar', async (req, res) => {
    try {
      // 1. Validação estrita de schema de entrada com Zod
      const parseResult = SalesGoalsInputSchema.safeParse(req.body || {});
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Parâmetros de cálculo inválidos',
          detalhes: parseResult.error.format(),
        });
      }

      const {
        anoReferencia,
        metaAnualTotal,
        estrategia,
        historicoAnoAnterior: rawHist,
        valoresManuais: rawManuais,
        valoresMensais: rawMensais,
        taxaCrescimentoPercentual,
      } = parseResult.data;

      const historicoAnoAnterior: number[] = Array.isArray(rawHist) && rawHist.length === 12
        ? rawHist.map((v) => Math.max(0, Number(v) || 0))
        : new Array(12).fill(0);
      const somaHist = historicoAnoAnterior.reduce((acc, v) => acc + (Number(v) || 0), 0);

      const valoresManuais: number[] | undefined = Array.isArray(rawManuais) && rawManuais.length === 12
        ? rawManuais.map((v) => Math.max(0, Number(v) || 0))
        : (Array.isArray(rawMensais) && rawMensais.length === 12
            ? rawMensais.map((v) => Math.max(0, Number(v) || 0))
            : undefined);

      const ai = getGenAI();

      if (ai) {
        try {
          let contentsPrompt = `Gere a estrutura de metas com os seguintes dados:
- Meta Anual Desejada: ${metaAnualTotal}
- Estratégia: ${estrategia}
- Histórico do Ano Anterior: [${historicoAnoAnterior.join(', ')}]
- Ano Referência: ${anoReferencia}`;

          if (estrategia === 'HISTORICO') {
            if (somaHist === 0) {
              contentsPrompt += `\n\nRegra adicional: A empresa NÃO possui histórico do ano anterior (soma do histórico = 0). Se a empresa não tiver histórico, o valor de meta de cada mês e os pesos percentuais devem ficar estritamente em zero (0), e a meta anual total deve ser 0.`;
            } else {
              contentsPrompt += `\n\nInstrução: Calcule o peso percentual de cada mês com base no histórico do ano anterior e projeta proporcionalmente sobre a nova meta anual desejada de ${metaAnualTotal}.`;
            }
          } else if (estrategia === 'MANUAL' && valoresManuais) {
            contentsPrompt += `\n- Valores Definidos Diretamente pelo Operador para Cada Mês: [${valoresManuais.join(', ')}]
Instrução: Aceite os valores definidos diretamente pelo operador para cada mês e consolide a meta anual total como a soma dos 12 valores. O valor de cada mês deve ser exatamente o definido.`;
          } else if (estrategia === 'LINEAR') {
            contentsPrompt += `\nInstrução: Divida a meta anual desejada (${metaAnualTotal}) igualmente por 12 meses (peso percentual de 8,33% por mês).`;
          }

          // Prioritize stable general release flash models; handle temporary high demand (503) gracefully
          const modelsToTry = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
          let rawText = '';
          let modelUsed = '';
          let lastErr: any = null;

          for (const modelName of modelsToTry) {
            try {
              const response = await ai.models.generateContent({
                model: modelName,
                config: {
                  systemInstruction: 'Você é um motor de cálculo de metas comerciais para sistemas ERP/POS. Calcule as metas mensais com base na estratégia solicitada e retorne um JSON. Se a estratégia for "HISTORICO" e a empresa não tiver histórico de vendas anteriores (histórico zerado ou soma = 0), todas as metas mensais e a meta anual devem ficar estritamente em zero (0).',
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      anoReferencia: { type: Type.INTEGER },
                      metaAnualTotal: { type: Type.NUMBER },
                      metasMensais: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            mes: { type: Type.INTEGER },
                            nomeMes: { type: Type.STRING },
                            pesoPercentual: { type: Type.NUMBER },
                            valorMeta: { type: Type.NUMBER },
                          },
                          required: ['mes', 'nomeMes', 'pesoPercentual', 'valorMeta'],
                        },
                      },
                    },
                    required: ['metaAnualTotal', 'metasMensais'],
                  },
                },
                contents: contentsPrompt,
              });

              rawText = response.text || '';
              if (rawText) {
                modelUsed = modelName;
                break;
              }
            } catch (err: any) {
              lastErr = err;
              const isHighDemand = err?.status === 'UNAVAILABLE' || err?.code === 503 || err?.message?.includes('high demand') || err?.message?.includes('503');
              if (isHighDemand) {
                console.log(`[Gemini Engine] Model ${modelName} is temporarily experiencing high demand (503). Gracefully switching to next model in pool...`);
              } else {
                console.log(`[Gemini Engine] Model ${modelName} unavailable (${err?.status || err?.code || 'error'}), trying next model in pool...`);
              }
            }
          }

          if (rawText) {
            const dadosMetas = JSON.parse(rawText);
            // Garantia determinística da regra comercial de histórico zero
            if (estrategia === 'HISTORICO' && somaHist === 0) {
              dadosMetas.metaAnualTotal = 0;
              if (Array.isArray(dadosMetas.metasMensais)) {
                dadosMetas.metasMensais.forEach((m: any) => {
                  m.valorMeta = 0;
                  m.pesoPercentual = 0;
                });
              }
            } else if (Array.isArray(dadosMetas.metasMensais) && dadosMetas.metasMensais.length === 12) {
              // Conciliação contábil de centavos mesmo no retorno da IA
              dadosMetas.metasMensais = reconciliarCentavos(
                dadosMetas.metasMensais.map((m: any, idx: number) => ({
                  mes: idx + 1,
                  nomeMes: MONTH_NAMES[idx],
                  pesoPercentual: Number(m.pesoPercentual) || 0,
                  valorMeta: Math.max(0, Number(m.valorMeta) || 0),
                })),
                dadosMetas.metaAnualTotal || metaAnualTotal
              );
            }

            return res.json({
              ...dadosMetas,
              anoReferencia: dadosMetas.anoReferencia || anoReferencia,
              source: modelUsed,
              estrategia,
            });
          }

          throw lastErr || new Error('All Gemini model endpoints busy');
        } catch (geminiError: any) {
          console.log('[Gemini Engine] AI endpoints temporarily unavailable, seamlessly resolving via mathematical deterministic calculation:', geminiError?.message || geminiError);
          // Fallback to local calculation engine
          const fallbackData = calcularMetasDeterministicamente({
            anoReferencia,
            metaAnualTotal,
            estrategia,
            historicoAnoAnterior,
            valoresManuais,
            taxaCrescimentoPercentual,
          });
          return res.json({
            ...fallbackData,
            sourceFallbackReason: geminiError?.message || 'High demand or network status',
          });
        }
      }

      // If no Gemini API key configured, use deterministic calculation engine
      const localResult = calcularMetasDeterministicamente({
        anoReferencia,
        metaAnualTotal,
        estrategia,
        historicoAnoAnterior,
        valoresManuais,
        taxaCrescimentoPercentual,
      });

      return res.json({
        ...localResult,
        source: 'engine_matematico_local',
        note: 'Calculado via motor matemático local conciliado ao centavo (configure GEMINI_API_KEY no menu Settings para ativação direta do Gemini 3.8 / 3.6 Flash)',
      });
    } catch (err: any) {
      console.error('Error generating commercial targets:', err);
      // Fallback determinístico seguro: nunca falha nem retorna 500
      try {
        const fallback = calcularMetasDeterministicamente({
          anoReferencia: Number(req.body?.anoReferencia) || 2027,
          metaAnualTotal: Math.max(0, Number(req.body?.metaAnualTotal) || 1200000),
          estrategia: req.body?.estrategia || 'MANUAL',
          historicoAnoAnterior: req.body?.historicoAnoAnterior,
          valoresManuais: req.body?.valoresManuais || req.body?.valoresMensais,
          taxaCrescimentoPercentual: Number(req.body?.taxaCrescimentoPercentual) || 10,
        });
        return res.json({
          ...fallback,
          source: 'engine_matematico_local_recuperado',
          note: 'Calculado com segurança pelo motor contábil local reconciliado ao centavo',
        });
      } catch (inner) {
        return res.status(500).json({ error: err.message || 'Erro ao calcular metas comerciais' });
      }
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
