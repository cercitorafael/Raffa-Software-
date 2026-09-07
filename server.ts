import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import 'dotenv/config';

const PORT = 3000;

// Lazy initialize GoogleGenAI client to avoid crash on startup if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// Deterministic calculation engine based on mathematical rules (serves as fallback or offline engine)
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
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  let totalMeta = metaAnualTotal;
  const metasMensais = [];

  if (estrategia === 'MANUAL') {
    // "MANUAL": Aceita os valores definidos diretamente pelo operador para cada mês e apenas consolida a meta anual total.
    const valores = Array.isArray(valoresManuais) && valoresManuais.length === 12
      ? valoresManuais.map((v) => Number(v) || 0)
      : (Array.isArray(historicoAnoAnterior) && historicoAnoAnterior.length === 12
          ? historicoAnoAnterior.map((v) => Number(v) || 0)
          : new Array(12).fill(Number((totalMeta / 12).toFixed(2))));

    totalMeta = valores.reduce((acc, v) => acc + v, 0);

    for (let i = 0; i < 12; i++) {
      const valor = Number((valores[i] || 0).toFixed(2));
      const peso = totalMeta > 0 ? Number(((valor / totalMeta) * 100).toFixed(2)) : Number((100 / 12).toFixed(2));
      metasMensais.push({
        mes: i + 1,
        nomeMes: monthNames[i],
        pesoPercentual: peso,
        valorMeta: valor,
      });
    }
  } else if (estrategia === 'HISTORICO') {
    // "HISTORICO": Puxa o array de vendas reais passadas e projeta proporcionalmente sobre a nova meta.
    // REGRA: Se a empresa não tiver histórico (valores zerados ou inexistentes), deve ficar ZERO.
    const hist = Array.isArray(historicoAnoAnterior) && historicoAnoAnterior.length === 12
      ? historicoAnoAnterior.map((v) => Number(v) || 0)
      : new Array(12).fill(0);
    const somaHistorico = hist.reduce((acc, v) => acc + (Number(v) || 0), 0);

    if (somaHistorico === 0) {
      // Empresa sem histórico: todas as metas mensais e a meta anual projetada ficam a ZERO.
      totalMeta = 0;
      for (let i = 0; i < 12; i++) {
        metasMensais.push({
          mes: i + 1,
          nomeMes: monthNames[i],
          pesoPercentual: 0,
          valorMeta: 0,
        });
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const vHist = hist[i] || 0;
        const peso = Number(((vHist / somaHistorico) * 100).toFixed(2));
        const valor = Number(((vHist / somaHistorico) * totalMeta).toFixed(2));
        metasMensais.push({
          mes: i + 1,
          nomeMes: monthNames[i],
          pesoPercentual: peso,
          valorMeta: valor,
        });
      }
    }
  } else if (estrategia === 'CRESCIMENTO' && historicoAnoAnterior && historicoAnoAnterior.length === 12) {
    const taxa = (taxaCrescimentoPercentual || 10) / 100;
    const valoresComCrescimento = historicoAnoAnterior.map((v) => v * (1 + taxa));
    totalMeta = valoresComCrescimento.reduce((acc, v) => acc + v, 0);

    for (let i = 0; i < 12; i++) {
      const valor = Number(valoresComCrescimento[i].toFixed(2));
      const peso = totalMeta > 0 ? Number(((valor / totalMeta) * 100).toFixed(2)) : 8.33;
      metasMensais.push({
        mes: i + 1,
        nomeMes: monthNames[i],
        pesoPercentual: peso,
        valorMeta: valor,
      });
    }
  } else {
    // "LINEAR": Divide a meta anual igualmente por 12.
    const valorMes = Number((totalMeta / 12).toFixed(2));
    for (let i = 0; i < 12; i++) {
      metasMensais.push({
        mes: i + 1,
        nomeMes: monthNames[i],
        pesoPercentual: Number((100 / 12).toFixed(2)),
        valorMeta: valorMes,
      });
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

  // Commercial Targets (Metas Comerciais) Engine with Gemini 2.5 Flash
  app.post('/api/metas/gerar', async (req, res) => {
    try {
      const body = req.body || {};
      const anoReferencia = Number(body.anoReferencia) || 2027;
      const metaAnualTotal = Number(body.metaAnualTotal) || 1200000;
      const estrategia: 'HISTORICO' | 'MANUAL' | 'LINEAR' | 'CRESCIMENTO' = body.estrategia || 'HISTORICO';
      const historicoAnoAnterior: number[] = Array.isArray(body.historicoAnoAnterior) && body.historicoAnoAnterior.length === 12
        ? body.historicoAnoAnterior.map(Number)
        : new Array(12).fill(0);
      const somaHist = historicoAnoAnterior.reduce((acc, v) => acc + (Number(v) || 0), 0);
      const valoresManuais: number[] | undefined = Array.isArray(body.valoresManuais) && body.valoresManuais.length === 12
        ? body.valoresManuais.map(Number)
        : (Array.isArray(body.valoresMensais) && body.valoresMensais.length === 12
            ? body.valoresMensais.map(Number)
            : undefined);
      const taxaCrescimentoPercentual = body.taxaCrescimentoPercentual ? Number(body.taxaCrescimentoPercentual) : undefined;

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

          const modelsToTry = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
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
              console.warn(`Model ${modelName} failed, trying next model:`, err?.message || err);
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
            }
            return res.json({
              ...dadosMetas,
              anoReferencia: dadosMetas.anoReferencia || anoReferencia,
              source: modelUsed,
              estrategia,
            });
          }

          throw lastErr || new Error('No Gemini model available');
        } catch (geminiError: any) {
          console.warn('Gemini generateContent error, falling back to deterministic calculation:', geminiError?.message || geminiError);
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
            sourceFallbackReason: geminiError?.message || 'API key limit or network error',
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
        note: 'Calculado via motor matemático local (configure GEMINI_API_KEY no menu Settings para ativação direta do Gemini 2.5 Flash)',
      });
    } catch (err: any) {
      console.error('Error generating commercial targets:', err);
      return res.status(500).json({ error: err.message || 'Erro ao calcular metas comerciais' });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
