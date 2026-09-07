import React, { useState, useMemo } from 'react';
import {
  Target,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart as PieChartIcon,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  Info,
  ChevronRight,
  Cpu,
  Code2,
  Copy,
  Check,
  X,
  Clock,
  Hourglass,
  BarChart3,
  CheckSquare,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import * as XLSX from 'xlsx';

export interface MonthlyGoalItem {
  mes: number;
  nomeMes: string;
  pesoPercentual: number;
  valorMeta: number;
}

export type SalesGoalStrategy = 'HISTORICO' | 'MANUAL' | 'LINEAR';

export interface GeneratedGoalsResponse {
  anoReferencia: number;
  metaAnualTotal: number;
  metasMensais: MonthlyGoalItem[];
  source?: string;
  estrategia?: 'HISTORICO' | 'MANUAL' | 'LINEAR' | 'CRESCIMENTO';
  sourceFallbackReason?: string;
  note?: string;
}

interface AnalyticsSalesGoalsTabProps {
  salesHistory: any[];
  formatCurrency: (value: number) => string;
  notify?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const DEFAULT_HISTORICO = [80000, 75000, 90000, 85000, 110000, 95000, 100000, 105000, 90000, 115000, 120000, 135000];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const AnalyticsSalesGoalsTab: React.FC<AnalyticsSalesGoalsTabProps> = ({
  salesHistory,
  formatCurrency,
  notify,
}) => {
  // Input parameters
  const [anoReferencia, setAnoReferencia] = useState<number>(2027);
  const [metaAnualTotal, setMetaAnualTotal] = useState<number>(1200000);
  const [estrategia, setEstrategia] = useState<SalesGoalStrategy>('HISTORICO');
  const [historicoValores, setHistoricoValores] = useState<number[]>([...DEFAULT_HISTORICO]);
  const [valoresManuais, setValoresManuais] = useState<number[]>([...DEFAULT_HISTORICO]);
  const [showEditHistorico, setShowEditHistorico] = useState<boolean>(false);
  const [showEditManual, setShowEditManual] = useState<boolean>(true);

  // Realized Sales tracking (12 months) - To monitor "Meta em Falta / Por Realizar"
  const [vendasRealizadas, setVendasRealizadas] = useState<number[]>(() => {
    const monthlySum = new Array(12).fill(0);
    let count = 0;
    salesHistory.forEach((sale) => {
      if (!sale.date) return;
      const d = new Date(sale.date);
      if (d.getFullYear() === 2027) {
        monthlySum[d.getMonth()] += (sale.total || sale.subtotal || 0);
        count++;
      }
    });
    if (count > 0) return monthlySum.map((v) => Math.round(v));
    // Default demonstration tracking: Jan-Jun with partial sales, Jul-Dec pending
    return [78000, 72000, 84000, 79000, 105000, 48000, 0, 0, 0, 0, 0, 0];
  });
  const [showEditRealizado, setShowEditRealizado] = useState<boolean>(false);

  // Execution state
  const [loading, setLoading] = useState<boolean>(false);
  const [resultado, setResultado] = useState<GeneratedGoalsResponse | null>({
    anoReferencia: 2027,
    metaAnualTotal: 1200000,
    metasMensais: [
      { mes: 1, nomeMes: 'Janeiro', pesoPercentual: 6.67, valorMeta: 80000 },
      { mes: 2, nomeMes: 'Fevereiro', pesoPercentual: 6.25, valorMeta: 75000 },
      { mes: 3, nomeMes: 'Março', pesoPercentual: 7.5, valorMeta: 90000 },
      { mes: 4, nomeMes: 'Abril', pesoPercentual: 7.08, valorMeta: 85000 },
      { mes: 5, nomeMes: 'Maio', pesoPercentual: 9.17, valorMeta: 110000 },
      { mes: 6, nomeMes: 'Junho', pesoPercentual: 7.92, valorMeta: 95000 },
      { mes: 7, nomeMes: 'Julho', pesoPercentual: 8.33, valorMeta: 100000 },
      { mes: 8, nomeMes: 'Agosto', pesoPercentual: 8.75, valorMeta: 105000 },
      { mes: 9, nomeMes: 'Setembro', pesoPercentual: 7.5, valorMeta: 90000 },
      { mes: 10, nomeMes: 'Outubro', pesoPercentual: 9.58, valorMeta: 115000 },
      { mes: 11, nomeMes: 'Novembro', pesoPercentual: 10.0, valorMeta: 120000 },
      { mes: 12, nomeMes: 'Dezembro', pesoPercentual: 11.25, valorMeta: 135000 },
    ],
    source: 'gemini-3.8-flash',
    estrategia: 'HISTORICO',
  });
  const [lastExecutionTime, setLastExecutionTime] = useState<string>('Execução inicial predefinida');
  const [showDartModal, setShowDartModal] = useState<boolean>(false);
  const [copiedDart, setCopiedDart] = useState<boolean>(false);

  // Sum of current historical inputs
  const totalHistorico = useMemo(() => {
    return historicoValores.reduce((acc, v) => acc + (Number(v) || 0), 0);
  }, [historicoValores]);

  // Sum of operator manual inputs
  const totalManual = useMemo(() => {
    return valoresManuais.reduce((acc, v) => acc + (Number(v) || 0), 0);
  }, [valoresManuais]);

  // Sum of Realized Sales
  const totalRealizado = useMemo(() => {
    return vendasRealizadas.reduce((acc, v) => acc + (Number(v) || 0), 0);
  }, [vendasRealizadas]);

  const metaAnualEfetiva = useMemo(() => {
    return resultado
      ? resultado.metaAnualTotal
      : (estrategia === 'MANUAL' && totalManual > 0 ? totalManual : metaAnualTotal);
  }, [resultado, estrategia, totalManual, metaAnualTotal]);

  // Meta em Falta / Por Realizar Global
  const metaEmFaltaTotal = useMemo(() => {
    return Math.max(0, metaAnualEfetiva - totalRealizado);
  }, [metaAnualEfetiva, totalRealizado]);

  const percentualRealizadoTotal = useMemo(() => {
    if (metaAnualEfetiva <= 0) return 0;
    return (totalRealizado / metaAnualEfetiva) * 100;
  }, [totalRealizado, metaAnualEfetiva]);

  const percentualEmFaltaTotal = useMemo(() => {
    if (metaAnualEfetiva <= 0) return 0;
    return Math.max(0, 100 - percentualRealizadoTotal);
  }, [metaAnualEfetiva, percentualRealizadoTotal]);

  const superavitTotal = useMemo(() => {
    return Math.max(0, totalRealizado - metaAnualEfetiva);
  }, [totalRealizado, metaAnualEfetiva]);

  // Realized Sales Actions
  const puxarVendasReaisERPParaRealizado = () => {
    const monthlySum = new Array(12).fill(0);
    let count = 0;
    salesHistory.forEach((sale) => {
      if (!sale.date) return;
      const d = new Date(sale.date);
      if (d.getFullYear() === anoReferencia) {
        monthlySum[d.getMonth()] += (sale.total || sale.subtotal || 0);
        count++;
      }
    });

    if (count > 0) {
      setVendasRealizadas(monthlySum.map((v) => Math.round(v)));
      if (notify) notify(`Carregadas ${count} vendas realizadas de ${anoReferencia} do ERP.`, 'success');
    } else {
      const anoAtual = new Date().getFullYear();
      let countAtual = 0;
      const monthlyAtual = new Array(12).fill(0);
      salesHistory.forEach((sale) => {
        if (!sale.date) return;
        const d = new Date(sale.date);
        if (d.getFullYear() === anoAtual) {
          monthlyAtual[d.getMonth()] += (sale.total || sale.subtotal || 0);
          countAtual++;
        }
      });
      if (countAtual > 0) {
        setVendasRealizadas(monthlyAtual.map((v) => Math.round(v)));
        if (notify) notify(`Sem vendas para ${anoReferencia}. Carregadas ${countAtual} vendas do ano atual (${anoAtual}) do ERP.`, 'info');
      } else {
        if (notify) notify(`Nenhuma venda registada no ERP para ${anoReferencia}.`, 'warning');
      }
    }
  };

  const zerarVendasRealizadas = () => {
    setVendasRealizadas(new Array(12).fill(0));
    if (notify) notify('Vendas realizadas zeradas. Meta 100% em falta / por realizar.', 'info');
  };

  const carregarExemploRealizado = () => {
    setVendasRealizadas([78000, 72000, 84000, 79000, 105000, 48000, 0, 0, 0, 0, 0, 0]);
    if (notify) notify('Exemplo de acompanhamento de vendas recarregado (faturamento parcial Jan-Jun).', 'info');
  };

  // Handler to pull actual real sales data from ERP salesHistory for the prior year
  const carregarVendasReaisERP = () => {
    const anoAnterior = anoReferencia - 1;
    const monthlySum = new Array(12).fill(0);
    let count = 0;

    salesHistory.forEach((sale) => {
      if (!sale.date) return;
      const d = new Date(sale.date);
      if (d.getFullYear() === anoAnterior) {
        const m = d.getMonth();
        const val = sale.total || sale.subtotal || 0;
        monthlySum[m] += val;
        count++;
      }
    });

    const hasRealSales = monthlySum.some((v) => v > 0);
    if (hasRealSales) {
      setHistoricoValores(monthlySum.map((v) => Math.round(v)));
      if (notify) {
        notify(`Carregadas ${count} vendas reais do ano ${anoAnterior} do ERP.`, 'success');
      }
    } else {
      setHistoricoValores(new Array(12).fill(0));
      if (notify) {
        notify(`A empresa não possui vendas reais registadas para ${anoAnterior} no ERP. O histórico foi definido como zero (0 MT).`, 'warning');
      }
    }
  };

  // Reset to prompt example
  const carregarExemploPadrao = () => {
    setAnoReferencia(2027);
    setMetaAnualTotal(1200000);
    setEstrategia('HISTORICO');
    setHistoricoValores([...DEFAULT_HISTORICO]);
    setValoresManuais([...DEFAULT_HISTORICO]);
    if (notify) {
      notify('Exemplo padrão (Ano 2027, Meta 1.200.000 MT, Histórico demonstrativo) recarregado com sucesso.', 'info');
    }
  };

  // Call the server API endpoint that integrates GoogleGenAI / Gemini
  const handleGerarMetas = async () => {
    setLoading(true);
    try {
      const effectiveMetaAnual = estrategia === 'MANUAL' ? totalManual : metaAnualTotal;
      const payload = {
        anoReferencia,
        metaAnualTotal: effectiveMetaAnual,
        estrategia,
        valoresManuais: estrategia === 'MANUAL' ? valoresManuais : undefined,
        historicoAnoAnterior: historicoValores,
      };

      const res = await fetch('/api/metas/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Erro na chamada da API: ${res.statusText}`);
      }

      const data: GeneratedGoalsResponse = await res.json();
      setResultado(data);
      if (estrategia === 'MANUAL' && data.metaAnualTotal) {
        setMetaAnualTotal(data.metaAnualTotal);
      }
      setLastExecutionTime(new Date().toLocaleTimeString('pt-PT'));

      if (notify) {
        if (estrategia === 'HISTORICO' && totalHistorico === 0) {
          notify(
            `Atenção: A empresa não possui histórico de vendas. Conforme a regra, as metas calculadas ficaram a zero (0 MT). Utilize LINEAR ou MANUAL para definir metas sem histórico.`,
            'info'
          );
        } else {
          notify(
            `Metas comerciais para ${data.anoReferencia} calculadas com sucesso via ${data.source || 'Motor IA'} (${data.estrategia || estrategia})!`,
            'success'
          );
        }
      }
    } catch (err: any) {
      console.error('Falha ao gerar metas:', err);
      if (notify) {
        notify(`Falha ao calcular metas: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const exportarParaExcel = () => {
    if (!resultado || !resultado.metasMensais) return;

    const dataRows = resultado.metasMensais.map((item, idx) => {
      const real = vendasRealizadas[idx] || 0;
      const emFalta = Math.max(0, item.valorMeta - real);
      const pctAtingido = item.valorMeta > 0 ? (real / item.valorMeta) * 100 : 0;
      let situacao = 'Pendente (100% em falta)';
      if (item.valorMeta === 0) situacao = 'Sem Meta';
      else if (real >= item.valorMeta) situacao = `Meta Atingida ✓ (+${(real - item.valorMeta).toFixed(0)} MT)`;
      else if (real > 0) situacao = `Em Falta (${(100 - pctAtingido).toFixed(1)}% pendente)`;

      return {
        Mês: item.mes,
        'Nome do Mês': item.nomeMes,
        'Peso Sazonal (%)': `${item.pesoPercentual.toFixed(2)}%`,
        'Meta Mensal (MT)': item.valorMeta,
        'Vendas Realizadas (MT)': real,
        'Meta em Falta / Por Realizar (MT)': emFalta,
        'Atingimento (%)': `${pctAtingido.toFixed(1)}%`,
        'Situação': situacao,
        'Média Diária Recomendada (MT/dia)': Number((item.valorMeta / 30).toFixed(2)),
        'Histórico Base (MT)': historicoValores[idx] || 0,
        'Variação vs Histórico (MT)': Number((item.valorMeta - (historicoValores[idx] || 0)).toFixed(2)),
      };
    });

    // Add summary row
    dataRows.push({
      Mês: 0,
      'Nome do Mês': 'TOTAL ANUAL',
      'Peso Sazonal (%)': '100.00%',
      'Meta Mensal (MT)': resultado.metaAnualTotal,
      'Vendas Realizadas (MT)': totalRealizado,
      'Meta em Falta / Por Realizar (MT)': metaEmFaltaTotal,
      'Atingimento (%)': `${percentualRealizadoTotal.toFixed(1)}%`,
      'Situação': metaEmFaltaTotal === 0 ? 'Meta 100% Atingida!' : `Em Falta: ${metaEmFaltaTotal.toFixed(0)} MT (${percentualEmFaltaTotal.toFixed(1)}%)`,
      'Média Diária Recomendada (MT/dia)': Number((resultado.metaAnualTotal / 365).toFixed(2)),
      'Histórico Base (MT)': totalHistorico,
      'Variação vs Histórico (MT)': Number((resultado.metaAnualTotal - totalHistorico).toFixed(2)),
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Metas_${resultado.anoReferencia}`);
    XLSX.writeFile(workbook, `Metas_Comerciais_${resultado.anoReferencia}_${resultado.estrategia}.xlsx`);

    if (notify) {
      notify('Ficheiro Excel com metas e valores por realizar exportado com sucesso!', 'success');
    }
  };

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!resultado || !resultado.metasMensais) return [];
    return resultado.metasMensais.map((m, idx) => {
      const real = vendasRealizadas[idx] || 0;
      const emFalta = Math.max(0, m.valorMeta - real);
      const pct = m.valorMeta > 0 ? (real / m.valorMeta) * 100 : 0;
      return {
        mes: m.nomeMes.substring(0, 3),
        nomeCompleto: m.nomeMes,
        meta: m.valorMeta,
        realizado: real,
        emFalta: emFalta,
        pct: Number(pct.toFixed(1)),
        historico: historicoValores[idx] || 0,
        peso: m.pesoPercentual,
      };
    });
  }, [resultado, historicoValores, vendasRealizadas]);

  // Best and lowest month
  const { mesMaior, mesMenor } = useMemo(() => {
    if (!resultado?.metasMensais || resultado.metasMensais.length === 0) {
      return { mesMaior: null, mesMenor: null };
    }
    let maior = resultado.metasMensais[0];
    let menor = resultado.metasMensais[0];
    resultado.metasMensais.forEach((item) => {
      if (item.valorMeta > maior.valorMeta) maior = item;
      if (item.valorMeta < menor.valorMeta) menor = item;
    });
    return { mesMaior: maior, mesMenor: menor };
  }, [resultado]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Engine Introduction */}
      <div className="bg-gradient-to-r from-[#171717] via-[#1a1815] to-[#171717] border border-[#332b21] rounded-2xl p-5 lg:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-52 h-52 bg-[#c5a47e]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-[#c5a47e] text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-[#c5a47e] animate-pulse" />
              <span>Motor Inteligente de Planeamento Comercial</span>
              <span className="bg-[#c5a47e]/20 text-[#c5a47e] px-2 py-0.5 rounded-full border border-[#c5a47e]/30 text-[10px] font-mono">
                Gemini 2.5/3.8 Flash Engine
              </span>
            </div>
            <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight">
              Geração e Distribuição de Metas Comerciais
            </h2>
            <p className="text-xs lg:text-sm text-neutral-400 mt-1 max-w-2xl">
              Calcule metas anuais e mensais com inteligência artificial estruturada. Suporta as estratégias comerciais:{' '}
              <strong className="text-neutral-200">HISTORICO</strong> (projeção proporcional), <strong className="text-neutral-200">MANUAL</strong> (definido pelo operador por mês) ou <strong className="text-neutral-200">LINEAR</strong> (divisão igual por 12).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <button
              onClick={() => {
                const el = document.getElementById('painel-meta-anual');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#c5a47e]/15 hover:bg-[#c5a47e]/25 text-[#c5a47e] border border-[#c5a47e]/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
              title="Ir para o painel de definição da meta anual"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Meta Anual: {formatCurrency(metaAnualTotal)}</span>
            </button>
            <button
              onClick={() => setShowDartModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border border-blue-700/50 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              title="Visualizar e copiar código Dart / Flutter com Gemini AI"
            >
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Código Dart (Flutter)</span>
            </button>
            <button
              onClick={carregarExemploPadrao}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#262626] hover:bg-[#303030] text-neutral-300 hover:text-white rounded-lg border border-[#3a3a3a] text-xs font-semibold transition-all cursor-pointer"
              title="Recarregar parâmetros do exemplo: 2027, 1.200.000 MT, Histórico"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>Exemplo Padrão</span>
            </button>
            <button
              onClick={exportarParaExcel}
              disabled={!resultado}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              title="Descarregar folha de cálculo Excel com a projeção mensal"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Engine Calculation Rules summary */}
        <div className="mt-4 pt-4 border-t border-[#2d2822] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div
            onClick={() => setEstrategia('HISTORICO')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              estrategia === 'HISTORICO'
                ? 'bg-[#c5a47e]/15 border-[#c5a47e]/50 ring-1 ring-[#c5a47e]/30'
                : 'bg-[#1e1e1e]/60 border-[#2a2a2a] hover:border-[#444] text-neutral-400'
            }`}
          >
            <div className="font-bold flex items-center justify-between mb-1 text-white">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#c5a47e]" />
                <span className="font-mono text-[11px] text-[#c5a47e]">"HISTORICO"</span>
              </div>
              {estrategia === 'HISTORICO' && (
                <span className="text-[10px] text-[#c5a47e] font-semibold bg-[#c5a47e]/10 px-1.5 py-0.5 rounded">Ativo</span>
              )}
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Puxa o array de vendas reais passadas e projeta proporcionalmente sobre a nova meta. Se a empresa não tiver histórico, os valores ficam em zero (0 MT).
            </p>
          </div>

          <div
            onClick={() => {
              setEstrategia('MANUAL');
              setShowEditManual(true);
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              estrategia === 'MANUAL'
                ? 'bg-[#c5a47e]/15 border-[#c5a47e]/50 ring-1 ring-[#c5a47e]/30'
                : 'bg-[#1e1e1e]/60 border-[#2a2a2a] hover:border-[#444] text-neutral-400'
            }`}
          >
            <div className="font-bold flex items-center justify-between mb-1 text-white">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-mono text-[11px] text-emerald-400">"MANUAL"</span>
              </div>
              {estrategia === 'MANUAL' && (
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">Ativo</span>
              )}
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Aceita os valores definidos diretamente pelo operador para cada mês e apenas consolida a meta anual total.
            </p>
          </div>

          <div
            onClick={() => setEstrategia('LINEAR')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              estrategia === 'LINEAR'
                ? 'bg-[#c5a47e]/15 border-[#c5a47e]/50 ring-1 ring-[#c5a47e]/30'
                : 'bg-[#1e1e1e]/60 border-[#2a2a2a] hover:border-[#444] text-neutral-400'
            }`}
          >
            <div className="font-bold flex items-center justify-between mb-1 text-white">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="font-mono text-[11px] text-blue-400">"LINEAR"</span>
              </div>
              {estrategia === 'LINEAR' && (
                <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-1.5 py-0.5 rounded">Ativo</span>
              )}
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Divide a meta anual igualmente por 12 parcelas idênticas (8,33% ao mês).
            </p>
          </div>
        </div>
      </div>

      {/* 2. Control Form: Setup Parameters */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-[#c5a47e]" />
            <span>Configuração dos Parâmetros de Entrada</span>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 bg-[#c5a47e]/15 text-[#c5a47e] rounded-lg border border-[#c5a47e]/30 font-bold">
            Meta Anual Ativa: {formatCurrency(estrategia === 'MANUAL' && totalManual > 0 && totalManual !== metaAnualTotal ? totalManual : metaAnualTotal)}
          </span>
        </h3>

        {/* PAINEL DESTACADO: DEFINIR META ANUAL */}
        <div id="painel-meta-anual" className="mb-5 p-4 rounded-xl bg-gradient-to-r from-[#1d1812] via-[#161616] to-[#131313] border-2 border-[#c5a47e]/40 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#c5a47e]/20 border border-[#c5a47e]/50 flex items-center justify-center text-[#c5a47e] shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Definir Meta Anual Desejada ({anoReferencia})
                  </h4>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                    {formatCurrency(metaAnualTotal)}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 mt-0.5">
                  Especifique a meta anual total que a empresa pretende alcançar em {anoReferencia}. O motor distribuirá este valor conforme a estratégia escolhida.
                </p>
              </div>
            </div>

            {/* Ajustes rápidos +/- */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-neutral-400 mr-1">Ajuste Rápido:</span>
              {[-100000, -50000, 50000, 100000, 500000].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => {
                    const novoValor = Math.max(0, metaAnualTotal + delta);
                    setMetaAnualTotal(novoValor);
                    if (notify) {
                      notify(`Meta anual ajustada para ${formatCurrency(novoValor)}.`, 'info');
                    }
                  }}
                  className="px-2 py-1 bg-[#222] hover:bg-[#2e2e2e] text-neutral-200 hover:text-white rounded border border-[#383838] text-[11px] font-mono font-medium transition-colors cursor-pointer"
                  title={`${delta > 0 ? 'Aumentar' : 'Reduzir'} ${formatCurrency(Math.abs(delta))}`}
                >
                  {delta > 0 ? `+${(delta / 1000).toFixed(0)}k` : `${(delta / 1000).toFixed(0)}k`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            {/* Input Principal da Meta Anual */}
            <div className="lg:col-span-5">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#c5a47e] font-mono pointer-events-none">
                  MT
                </span>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={metaAnualTotal}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setMetaAnualTotal(val);
                  }}
                  placeholder="Ex: 1200000"
                  className="w-full pl-12 pr-4 py-2.5 bg-[#0a0a0a] border-2 border-[#c5a47e]/60 rounded-xl text-white font-mono text-lg font-extrabold focus:border-[#c5a47e] focus:ring-2 focus:ring-[#c5a47e]/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Presets / Atalhos de Metas Anuais */}
            <div className="lg:col-span-7 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-neutral-400 mr-1">Atalhos:</span>
              {[
                { label: '500 mil', val: 500000 },
                { label: '1 Milhão', val: 1000000 },
                { label: '1.2 Milhão', val: 1200000 },
                { label: '1.5 Milhão', val: 1500000 },
                { label: '2 Milhões', val: 2000000 },
                { label: '3 Milhões', val: 3000000 },
                { label: '5 Milhões', val: 5000000 },
                { label: '10 Milhões', val: 10000000 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => {
                    setMetaAnualTotal(item.val);
                    if (notify) notify(`Meta anual definida para ${formatCurrency(item.val)}.`, 'info');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                    metaAnualTotal === item.val
                      ? 'bg-[#c5a47e] text-black border-[#c5a47e] shadow'
                      : 'bg-[#1f1f1f] hover:bg-[#2c2c2c] text-neutral-200 border-[#383838]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Integração especial para a estratégia MANUAL */}
          {estrategia === 'MANUAL' && (
            <div className="mt-3 pt-3 border-t border-[#2e261f] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-neutral-300">
                <span className="text-emerald-400 font-bold">Estratégia MANUAL:</span>
                <span>Meta Anual Alvo: <strong>{formatCurrency(metaAnualTotal)}</strong></span>
                <span className="text-neutral-500">|</span>
                <span>Soma dos 12 Meses: <strong className="text-white">{formatCurrency(totalManual)}</strong></span>
                {totalManual === metaAnualTotal ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                    ✓ Equilibrado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[11px] font-semibold border border-amber-500/30">
                    Diferença: {formatCurrency(totalManual - metaAnualTotal)}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const equalPart = Math.round(metaAnualTotal / 12);
                    setValoresManuais(new Array(12).fill(equalPart));
                    if (notify) notify(`Meta anual de ${formatCurrency(metaAnualTotal)} dividida igualmente nos 12 meses (${formatCurrency(equalPart)}/mês).`, 'success');
                  }}
                  className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-700/60 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  title="Dividir a meta anual total igualmente nos 12 meses"
                >
                  Distribuir nos 12 Meses (1/12)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMetaAnualTotal(totalManual);
                    if (notify) notify(`Meta anual atualizada para a soma atual dos 12 meses (${formatCurrency(totalManual)}).`, 'success');
                  }}
                  className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#2f2f2f] text-neutral-300 border border-[#3a3a3a] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  title="Copiar a soma atual dos meses para o campo de meta anual"
                >
                  Usar Soma dos Meses
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ano Referência */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Ano de Referência
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#c5a47e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="number"
                min={2020}
                max={2050}
                value={anoReferencia}
                onChange={(e) => setAnoReferencia(Number(e.target.value) || 2027)}
                className="w-full pl-9 pr-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-white font-mono text-sm focus:border-[#c5a47e] focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">Ano para o qual as metas são projetadas</p>
          </div>

          {/* Meta Anual Total */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-400">
                Meta Anual (MT)
              </label>
              <span className="text-[10px] font-mono text-[#c5a47e] font-bold">
                {formatCurrency(metaAnualTotal)}
              </span>
            </div>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-[#c5a47e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="number"
                min={0}
                step={10000}
                value={metaAnualTotal}
                onChange={(e) => setMetaAnualTotal(Math.max(0, Number(e.target.value) || 0))}
                className="w-full pl-9 pr-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-white font-mono text-sm font-bold focus:border-[#c5a47e] focus:outline-none transition-colors"
                placeholder="Ex: 1200000"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">
              {estrategia === 'MANUAL'
                ? `Meta alvo desejada (Soma dos meses: ${formatCurrency(totalManual)})`
                : 'Valor anual consolidado desejado pela organização'}
            </p>
          </div>

          {/* Estratégia de Distribuição */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Estratégia de Distribuição
            </label>
            <select
              value={estrategia}
              onChange={(e) => {
                const next = e.target.value as SalesGoalStrategy;
                setEstrategia(next);
                if (next === 'MANUAL') {
                  setShowEditManual(true);
                }
              }}
              className="w-full px-3 py-2 bg-[#1c1c1c] border border-[#333] rounded-lg text-white text-sm focus:border-[#c5a47e] focus:outline-none transition-colors cursor-pointer"
            >
              <option value="HISTORICO">"HISTORICO" - Projeção proporcional via histórico</option>
              <option value="MANUAL">"MANUAL" - Definido pelo operador por mês (consolida total)</option>
              <option value="LINEAR">"LINEAR" - Divide a meta anual igualmente por 12</option>
            </select>
            <p className="text-[10px] text-neutral-500 mt-1">Regra de cálculo selecionada</p>
          </div>

          {/* Coluna 4 Dinâmica de acordo com a Estratégia */}
          {estrategia === 'HISTORICO' && (
            <div className="flex flex-col justify-end">
              <div className="text-[11px] text-neutral-400 mb-1 flex items-center justify-between">
                <span>Histórico Base ({anoReferencia - 1}):</span>
                <span className="font-mono text-white font-semibold">{formatCurrency(totalHistorico)}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEditHistorico(!showEditHistorico)}
                className="w-full py-2 px-3 bg-[#1e1e1e] hover:bg-[#252525] text-neutral-300 rounded-lg text-xs font-medium border border-[#333] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>{showEditHistorico ? 'Ocultar Histórico Mensal' : 'Ver / Ajustar Vendas Passadas'}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showEditHistorico ? 'rotate-90' : ''}`} />
              </button>
            </div>
          )}

          {estrategia === 'MANUAL' && (
            <div className="flex flex-col justify-end">
              <div className="text-[11px] text-neutral-400 mb-1 flex items-center justify-between">
                <span>Soma dos 12 Meses:</span>
                <span className="font-mono text-emerald-400 font-bold">{formatCurrency(totalManual)}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEditManual(!showEditManual)}
                className="w-full py-2 px-3 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-800/50 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>{showEditManual ? 'Ocultar Painel Mensal' : 'Editar 12 Meses Manuais'}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showEditManual ? 'rotate-90' : ''}`} />
              </button>
            </div>
          )}

          {estrategia === 'LINEAR' && (
            <div className="flex flex-col justify-end">
              <div className="text-[11px] text-neutral-400 mb-1 flex items-center justify-between">
                <span>Parcela Mensal Fixa:</span>
                <span className="font-mono text-blue-400 font-semibold">{formatCurrency(metaAnualTotal / 12)}</span>
              </div>
              <div className="py-2 px-3 bg-[#1a1a1a] text-neutral-400 rounded-lg text-xs font-medium border border-[#2b2b2b] text-center">
                12 meses iguais (8,33% ao mês)
              </div>
            </div>
          )}
        </div>

        {/* Panel 1: Monthly Manual Inputs for "MANUAL" Strategy */}
        {estrategia === 'MANUAL' && showEditManual && (
          <div className="mt-4 pt-4 border-t border-[#262626] bg-[#121212] p-4 rounded-xl border border-emerald-900/30">
            {/* Barra Rápida de Definição de Meta Anual no Painel Manual */}
            <div className="mb-3.5 p-3 rounded-xl bg-[#181818] border border-emerald-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Definir Meta Anual Alvo para os 12 Meses
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Defina o total anual e aplique a divisão instantaneamente
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-emerald-400 pointer-events-none">
                    MT
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={metaAnualTotal}
                    onChange={(e) => setMetaAnualTotal(Math.max(0, Number(e.target.value) || 0))}
                    className="w-36 pl-9 pr-2 py-1.5 bg-[#0f0f0f] border border-emerald-600/50 rounded-lg text-white font-mono text-xs font-bold focus:border-emerald-400 focus:outline-none"
                    placeholder="Meta anual"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const equalVal = Math.round(metaAnualTotal / 12);
                    setValoresManuais(new Array(12).fill(equalVal));
                    if (notify) notify(`Meta anual de ${formatCurrency(metaAnualTotal)} dividida igualmente nos 12 meses (${formatCurrency(equalVal)}/mês).`, 'success');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer"
                  title="Dividir a meta anual em 12 parcelas iguais"
                >
                  Aplicar nos 12 Meses (1/12)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (totalManual === 0) return;
                    const next = valoresManuais.map((v) => Math.round((v / totalManual) * metaAnualTotal));
                    const diff = metaAnualTotal - next.reduce((a, b) => a + b, 0);
                    next[11] += diff;
                    setValoresManuais(next);
                    if (notify) notify(`Meta anual de ${formatCurrency(metaAnualTotal)} distribuída mantendo as proporções mensais.`, 'success');
                  }}
                  disabled={totalManual === 0}
                  className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#303030] text-neutral-200 border border-[#444] rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
                  title="Distribuir mantendo as proporções relativas entre os meses"
                >
                  Distribuir Proporcional
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold text-white">
                    Valores Definidos Diretamente pelo Operador para Cada Mês ({anoReferencia})
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                    Soma: {formatCurrency(totalManual)}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Informe diretamente os valores desejados para cada um dos 12 meses. O motor apenas consolida a meta anual total.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setValoresManuais([...historicoValores])}
                  className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#2f2f2f] text-neutral-300 rounded text-xs font-medium border border-[#3a3a3a] transition-colors cursor-pointer"
                  title="Copiar os valores do histórico base para os 12 meses"
                >
                  Copiar do Histórico
                </button>
                <button
                  type="button"
                  onClick={carregarVendasReaisERP}
                  className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#2f2f2f] text-neutral-300 rounded text-xs font-medium border border-[#3a3a3a] transition-colors cursor-pointer"
                  title="Puxar vendas reais do ano anterior para preenchimento rápido"
                >
                  Puxar Vendas Reais
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {MONTH_NAMES.map((name, idx) => (
                <div key={idx} className="bg-[#181818] p-2 rounded-lg border border-[#2b2b2b] focus-within:border-emerald-500/60 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">
                      {idx + 1}. {name}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {totalManual > 0 ? `${(((valoresManuais[idx] || 0) / totalManual) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={valoresManuais[idx] || 0}
                    onChange={(e) => {
                      const next = [...valoresManuais];
                      next[idx] = Number(e.target.value) || 0;
                      setValoresManuais(next);
                    }}
                    className="w-full px-2 py-1 bg-[#121212] border border-[#333] rounded text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panel 2: Monthly Historical Inputs for "HISTORICO" Strategy */}
        {estrategia === 'HISTORICO' && showEditHistorico && (
          <div className="mt-4 pt-4 border-t border-[#262626] bg-[#121212] p-4 rounded-xl border border-[#c5a47e]/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-bold text-neutral-200">
                  Histórico de Vendas Reais Passadas ({anoReferencia - 1}) - 12 Meses
                </h4>
                <p className="text-[11px] text-neutral-400">
                  O motor calcula a sazonalidade e peso percentual de cada mês com base neste histórico e projeta proporcionalmente sobre a nova meta anual ({formatCurrency(metaAnualTotal)}).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={carregarVendasReaisERP}
                  className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#2f2f2f] text-neutral-300 rounded text-xs font-medium border border-[#3a3a3a] transition-colors cursor-pointer"
                  title="Puxar vendas reais do ano anterior do ERP"
                >
                  Puxar Vendas Reais {anoReferencia - 1}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHistoricoValores(new Array(12).fill(0));
                    if (notify) {
                      notify('Histórico zerado: empresa sem histórico anterior. As metas nesta estratégia ficarão a zero.', 'info');
                    }
                  }}
                  className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-300 rounded text-xs font-medium border border-red-800/40 transition-colors cursor-pointer"
                  title="Definir empresa sem histórico (todos os meses zerados: 0 MT)"
                >
                  Zerar Histórico (0 MT)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHistoricoValores([...DEFAULT_HISTORICO]);
                    if (notify) {
                      notify('Exemplo de histórico demonstrativo recarregado.', 'info');
                    }
                  }}
                  className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#2f2f2f] text-neutral-300 rounded text-xs font-medium border border-[#3a3a3a] transition-colors cursor-pointer"
                  title="Carregar exemplo demonstrativo"
                >
                  Exemplo Demo
                </button>
              </div>
            </div>

            {totalHistorico === 0 && (
              <div className="mb-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-amber-200">Atenção: A empresa não possui histórico de vendas (soma = 0 MT).</strong> Na estratégia <em>HISTORICO</em>, todas as metas mensais e anuais calculadas ficarão rigorosamente a <strong>ZERO (0 MT)</strong>. Se deseja estipular metas sem ter histórico, utilize a estratégia <strong>"LINEAR"</strong> ou <strong>"MANUAL"</strong>.
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {MONTH_NAMES.map((name, idx) => (
                <div key={idx} className="bg-[#181818] p-2 rounded-lg border border-[#2b2b2b]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">
                      {idx + 1}. {name}
                    </span>
                    <span className="text-[10px] font-mono text-[#c5a47e]">
                      {totalHistorico > 0 ? `${(((historicoValores[idx] || 0) / totalHistorico) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={historicoValores[idx] || 0}
                    onChange={(e) => {
                      const next = [...historicoValores];
                      next[idx] = Number(e.target.value) || 0;
                      setHistoricoValores(next);
                    }}
                    className="w-full px-2 py-1 bg-[#121212] border border-[#333] rounded text-white font-mono text-xs focus:border-[#c5a47e] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button Action Bar */}
        <div className="mt-5 pt-4 border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-neutral-400">
            <Cpu className="w-4 h-4 text-[#c5a47e]" />
            <span>
              Motor ativo:{' '}
              <strong className="text-white font-mono">{resultado?.source || 'gemini-3.8-flash'}</strong>{' '}
              ({lastExecutionTime})
            </span>
          </div>

          <button
            type="button"
            onClick={handleGerarMetas}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#c5a47e] to-[#ab875e] hover:from-[#d6b793] hover:to-[#be986c] text-neutral-950 font-bold rounded-xl text-sm shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                <span>Calculando com Gemini AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-neutral-950" />
                <span>Calcular Metas com Gemini AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Zero History Notice when results are zero */}
      {resultado && resultado.metaAnualTotal === 0 && resultado.estrategia === 'HISTORICO' && (
        <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-4 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-white">Metas a Zero (0 MT) - Empresa Sem Histórico de Vendas</div>
              <p className="text-neutral-300 text-xs mt-0.5 leading-relaxed">
                Como a empresa não possui histórico de vendas para o período anterior, todas as metas mensais e a meta anual projetada ficaram estritamente em zero.
                Para definir metas sem histórico, utilize a estratégia <strong>"LINEAR"</strong> (divisão igual por 12) ou <strong>"MANUAL"</strong> (valores definidos pelo operador).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEstrategia('LINEAR');
              setMetaAnualTotal(1200000);
            }}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer shadow"
          >
            Mudar para "LINEAR"
          </button>
        </div>
      )}

      {/* 3. Executive KPI Cards: Results Summary */}
      {resultado && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Anual */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#383838] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400">Meta Anual Consolidada</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#c5a47e]/15 text-[#c5a47e] border border-[#c5a47e]/30">
                {resultado.anoReferencia}
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-white tracking-tight font-mono">
              {formatCurrency(resultado.metaAnualTotal)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-neutral-400">Média Mensal:</span>
              <span className="text-[#c5a47e] font-semibold font-mono">
                {formatCurrency(Number((resultado.metaAnualTotal / 12).toFixed(2)))}
              </span>
            </div>
          </div>

          {/* Mês de Pico / Maior Meta */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#383838] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400">Mês de Maior Meta</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Pico
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-400 tracking-tight font-mono">
              {mesMaior ? formatCurrency(mesMaior.valorMeta) : '-'}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-neutral-300 font-medium">
                {resultado.metaAnualTotal === 0 ? 'Sem metas ativas' : (mesMaior?.nomeMes || '-')}
              </span>
              <span className="text-emerald-400 font-bold font-mono">
                {mesMaior && resultado.metaAnualTotal > 0 ? `${mesMaior.pesoPercentual.toFixed(2)}%` : '0%'}
              </span>
            </div>
          </div>

          {/* Mês Mais Conservador */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#383838] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400">Mês Mais Conservador</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Mínimo
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-amber-300 tracking-tight font-mono">
              {mesMenor ? formatCurrency(mesMenor.valorMeta) : '-'}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-neutral-300 font-medium">
                {resultado.metaAnualTotal === 0 ? 'Sem metas ativas' : (mesMenor?.nomeMes || '-')}
              </span>
              <span className="text-amber-300 font-bold font-mono">
                {mesMenor && resultado.metaAnualTotal > 0 ? `${mesMenor.pesoPercentual.toFixed(2)}%` : '0%'}
              </span>
            </div>
          </div>

          {/* Média Diária Geral */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#383838] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400">Média Diária Recomendada</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
                365 dias
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-blue-300 tracking-tight font-mono">
              {formatCurrency(Number((resultado.metaAnualTotal / 365).toFixed(2)))}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-neutral-400">Base comercial 30d/mês:</span>
              <span className="text-neutral-200 font-medium font-mono">
                ~{formatCurrency(Number((resultado.metaAnualTotal / 360).toFixed(2)))}/dia
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Visual Chart: Monthly Distribution vs History */}
      {resultado && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-sm lg:text-base font-bold text-white flex items-center space-x-2">
                <BarChart3Icon className="w-4 h-4 text-[#c5a47e]" />
                <span>Distribuição Mensal das Metas ({resultado.anoReferencia}) vs Histórico</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Valores em Meticais (MT) nas barras e peso sazonal (%) na linha
              </p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-medium">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-[#c5a47e]" />
                <span className="text-neutral-300">Meta {resultado.anoReferencia} (MT)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-[#404040]" />
                <span className="text-neutral-400">Histórico Base (MT)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-1 bg-emerald-400" />
                <span className="text-emerald-400">Peso %</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252525" vertical={false} />
                <XAxis
                  dataKey="mes"
                  stroke="#737373"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#333' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#737373"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#333' }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#10b981' }}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.25)]}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-[#1c1c1c] border border-[#333] p-3 rounded-lg shadow-xl text-xs space-y-1">
                        <div className="font-bold text-white text-sm mb-1">{item.nomeCompleto}</div>
                        <div className="flex items-center justify-between space-x-4">
                          <span className="text-[#c5a47e] font-medium">Meta Projetada:</span>
                          <span className="font-mono font-bold text-white">{formatCurrency(item.meta)}</span>
                        </div>
                        <div className="flex items-center justify-between space-x-4">
                          <span className="text-neutral-400">Histórico Anterior:</span>
                          <span className="font-mono text-neutral-300">{formatCurrency(item.historico)}</span>
                        </div>
                        <div className="flex items-center justify-between space-x-4">
                          <span className="text-emerald-400">Peso Percentual:</span>
                          <span className="font-mono font-bold text-emerald-400">{item.peso}%</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar yAxisId="left" dataKey="historico" fill="#3a3a3a" radius={[4, 4, 0, 0]} name="Histórico" />
                <Bar yAxisId="left" dataKey="meta" fill="#c5a47e" radius={[4, 4, 0, 0]} name="Meta" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="peso"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 4 }}
                  name="Peso %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 5. Detailed Table: Month by Month Breakdown */}
      {resultado && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 lg:p-5 border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm lg:text-base font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#c5a47e]" />
                <span>Detalhamento Consolidado das Metas Mensais ({resultado.anoReferencia})</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Estrutura de 12 meses gerada pelo motor com pesos percentuais e metas operacionais recomendadas
              </p>
            </div>
            <span className="text-xs font-mono text-[#c5a47e] bg-[#c5a47e]/10 px-2.5 py-1 rounded-md border border-[#c5a47e]/20 self-start sm:self-center">
              Estratégia: {resultado.estrategia || estrategia}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1a1a1a] text-neutral-400 font-semibold uppercase tracking-wider border-b border-[#262626]">
                <tr>
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4">Mês de Referência</th>
                  <th className="py-3 px-4 text-right">Peso Sazonal (%)</th>
                  <th className="py-3 px-4 text-right text-white">Meta Mensal (MT)</th>
                  <th className="py-3 px-4 text-right text-neutral-400">Média Diária (MT)</th>
                  <th className="py-3 px-4 text-right text-neutral-400">Histórico Base</th>
                  <th className="py-3 px-4 text-right">Variação vs Histórico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {resultado.metasMensais.map((item, idx) => {
                  const hist = historicoValores[idx] || 0;
                  const delta = item.valorMeta - hist;
                  const deltaPct = hist > 0 ? ((delta / hist) * 100).toFixed(1) : '0';
                  const isPositive = delta >= 0;

                  return (
                    <tr key={item.mes} className="hover:bg-[#1a1a1a]/60 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-neutral-500">
                        {String(item.mes).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-4 font-medium text-white flex items-center space-x-2">
                        <span>{item.nomeMes}</span>
                        {item.valorMeta === mesMaior?.valorMeta && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300">
                            Maior
                          </span>
                        )}
                        {item.valorMeta === mesMenor?.valorMeta && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300">
                            Menor
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {item.pesoPercentual.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white text-sm">
                        {formatCurrency(item.valorMeta)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-300">
                        {formatCurrency(Number((item.valorMeta / 30).toFixed(2)))}/dia
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-400">
                        {formatCurrency(hist)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className={`inline-flex items-center space-x-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          <span>{isPositive ? '+' : ''}{formatCurrency(delta)}</span>
                          <span className="text-[10px] text-neutral-400 font-sans">({isPositive ? '+' : ''}{deltaPct}%)</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#1a1a1a] font-bold text-white border-t border-[#333]">
                <tr>
                  <td colSpan={2} className="py-3.5 px-4 text-left uppercase text-[#c5a47e]">
                    Total Consolidado ({resultado.anoReferencia})
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400">100.00%</td>
                  <td className="py-3.5 px-4 text-right font-mono text-base text-[#c5a47e]">
                    {formatCurrency(resultado.metaAnualTotal)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-neutral-300">
                    {formatCurrency(Number((resultado.metaAnualTotal / 365).toFixed(2)))}/dia
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-neutral-300">
                    {formatCurrency(totalHistorico)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="text-emerald-400">
                      +{formatCurrency(resultado.metaAnualTotal - totalHistorico)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Código Dart / Flutter (Gemini AI) */}
      {showDartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#181818] border border-[#333] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] bg-[#141414]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Código Dart / Flutter (Google Generative AI)
                    <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                      gemini-2.5-flash
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Implementação oficial em Dart com package:google_generative_ai e Structured Output JSON.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDartModal(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-[#252525] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Code Block */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-neutral-400">lib/services/gemini_metas.dart</span>
                <button
                  type="button"
                  onClick={() => {
                    const dartCode = `import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';

Future<void> gerarMetas() async {
  final apiKey = 'SUA_CHAVE_API_AQUI';
  
  final schema = Schema.object(
    properties: {
      'anoReferencia': Schema.integer(),
      'metaAnualTotal': Schema.number(),
      'metasMensais': Schema.array(
        items: Schema.object(
          properties: {
            'mes': Schema.integer(),
            'nomeMes': Schema.string(),
            'pesoPercentual': Schema.number(),
            'valorMeta': Schema.number(),
          },
          requiredProperties: ['mes', 'nomeMes', 'pesoPercentual', 'valorMeta'],
        ),
      ),
    },
    requiredProperties: ['metaAnualTotal', 'metasMensais'],
  );

  final model = GenerativeModel(
    model: 'gemini-2.5-flash',
    apiKey: apiKey,
    systemInstruction: Content.system(
      'Você é um motor de cálculo de metas comerciais para sistemas ERP/POS. '
      'Calcule as metas mensais com base na estratégia solicitada e retorne um JSON.'
    ),
    generationConfig: GenerationConfig(
      responseMimeType: 'application/json',
      responseSchema: schema,
    ),
  );

  final prompt = '''
  Gere a estrutura de metas com os seguintes dados:
  - Meta Anual Desejada: 1200000
  - Estratégia: HISTORICO
  - Histórico do Ano Anterior: [80000, 75000, 90000, 85000, 110000, 95000, 100000, 105000, 90000, 115000, 120000, 135000]
  ''';

  final response = await model.generateContent([Content.text(prompt)]);
  
  if (response.text != null) {
    Map<String, dynamic> metasJson = jsonDecode(response.text!);
    print(metasJson);
  }
}`;
                    navigator.clipboard.writeText(dartCode);
                    setCopiedDart(true);
                    setTimeout(() => setCopiedDart(false), 2500);
                    if (notify) notify('Código Dart copiado para a área de transferência!', 'success');
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#262626] hover:bg-[#303030] text-neutral-200 border border-[#404040] rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  {copiedDart ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-blue-400" />
                      <span>Copiar Código</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-[#2d2d2d] bg-[#0d0d0d]">
                <pre className="p-4 text-xs font-mono text-neutral-200 overflow-x-auto leading-relaxed select-all">
{`import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';

Future<void> gerarMetas() async {
  final apiKey = 'SUA_CHAVE_API_AQUI';
  
  final schema = Schema.object(
    properties: {
      'anoReferencia': Schema.integer(),
      'metaAnualTotal': Schema.number(),
      'metasMensais': Schema.array(
        items: Schema.object(
          properties: {
            'mes': Schema.integer(),
            'nomeMes': Schema.string(),
            'pesoPercentual': Schema.number(),
            'valorMeta': Schema.number(),
          },
          requiredProperties: ['mes', 'nomeMes', 'pesoPercentual', 'valorMeta'],
        ),
      ),
    },
    requiredProperties: ['metaAnualTotal', 'metasMensais'],
  );

  final model = GenerativeModel(
    model: 'gemini-2.5-flash',
    apiKey: apiKey,
    systemInstruction: Content.system(
      'Você é um motor de cálculo de metas comerciais para sistemas ERP/POS. '
      'Calcule as metas mensais com base na estratégia solicitada e retorne um JSON.'
    ),
    generationConfig: GenerationConfig(
      responseMimeType: 'application/json',
      responseSchema: schema,
    ),
  );

  final prompt = '''
  Gere a estrutura de metas com os seguintes dados:
  - Meta Anual Desejada: 1200000
  - Estratégia: HISTORICO
  - Histórico do Ano Anterior: [80000, 75000, 90000, 85000, 110000, 95000, 100000, 105000, 90000, 115000, 120000, 135000]
  ''';

  final response = await model.generateContent([Content.text(prompt)]);
  
  if (response.text != null) {
    Map<String, dynamic> metasJson = jsonDecode(response.text!);
    print(metasJson);
  }
}`}
                </pre>
              </div>

              <div className="p-3 bg-neutral-900/60 border border-[#2a2a2a] rounded-xl text-xs text-neutral-400 space-y-1">
                <div className="font-semibold text-neutral-300">Como usar no seu projeto Flutter:</div>
                <ol className="list-decimal list-inside space-y-0.5 text-neutral-400">
                  <li>Adicione ao <code className="text-blue-400 font-mono">pubspec.yaml</code>: <code className="text-white font-mono">google_generative_ai: ^0.4.0</code></li>
                  <li>Execute <code className="text-white font-mono">flutter pub get</code></li>
                  <li>Substitua <code className="text-amber-400 font-mono">'SUA_CHAVE_API_AQUI'</code> pela sua Gemini API Key</li>
                </ol>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#2a2a2a] bg-[#141414] flex justify-end">
              <button
                type="button"
                onClick={() => setShowDartModal(false)}
                className="px-4 py-2 bg-[#252525] hover:bg-[#303030] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function BarChart3Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}
