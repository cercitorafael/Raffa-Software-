import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Save,
  Edit3,
  Sliders,
  Eye,
  RefreshCw,
  ShieldAlert,
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
import {
  distribuirMetaLinear,
  distribuirMetaSazonal,
  distribuirMetaManual,
  reconciliarCentavos,
  toCents,
  fromCents,
} from '../../utils/goalCalculations';

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

  // Persistence and view mode state
  const STORAGE_KEY_PREFIX = 'agro_sales_goals_v2_';
  const BACKUP_KEY_PREFIX = 'agro_sales_goals_backup_';

  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isManuallyCustomized, setIsManuallyCustomized] = useState<boolean>(false);
  const [chartViewMode, setChartViewMode] = useState<'acompanhamento' | 'planeamento'>('acompanhamento');

  // Proteção contra sobrescrita acidental
  const [hasManualBackup, setHasManualBackup] = useState<boolean>(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<{
    titulo: string;
    descricao: string;
    executar: () => void;
  } | null>(null);

  const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate persisted goals on mount or when anoReferencia changes
  useEffect(() => {
    try {
      // Verifica se existe backup manual salvo para este ano
      const hasBackup = Boolean(localStorage.getItem(`${BACKUP_KEY_PREFIX}${anoReferencia}`));
      setHasManualBackup(hasBackup);

      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${anoReferencia}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.metasMensais) && parsed.metasMensais.length === 12) {
          setMetaAnualTotal(parsed.metaAnualTotal || 1200000);
          if (parsed.estrategia) setEstrategia(parsed.estrategia);
          if (Array.isArray(parsed.valoresManuais)) setValoresManuais(parsed.valoresManuais);
          if (Array.isArray(parsed.historicoValores)) setHistoricoValores(parsed.historicoValores);
          if (Array.isArray(parsed.vendasRealizadas)) setVendasRealizadas(parsed.vendasRealizadas);
          setResultado({
            anoReferencia,
            metaAnualTotal: parsed.metaAnualTotal,
            metasMensais: parsed.metasMensais,
            source: parsed.source || 'Ajuste Manual Salvo',
            estrategia: parsed.estrategia || 'MANUAL',
          });
          setLastSavedTimestamp(parsed.savedAt || null);
          setLastExecutionTime(`Metas salvas carregadas (${parsed.savedAt || 'local'})`);
          setIsManuallyCustomized(Boolean(parsed.isManuallyEdited || parsed.estrategia === 'MANUAL'));
        }
      }
    } catch (e) {
      console.error('Erro ao ler metas do localStorage:', e);
    }
  }, [anoReferencia]);

  // Limpa o timer de debounce se o componente for desmontado
  useEffect(() => {
    return () => {
      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
      }
    };
  }, []);

  // Cria backup de segurança das edições manuais
  const criarBackupManual = () => {
    try {
      const agora = new Date();
      const dataHoraStr = agora.toLocaleDateString('pt-PT') + ' às ' + agora.toLocaleTimeString('pt-PT');
      const backupData = {
        anoReferencia,
        metaAnualTotal,
        estrategia,
        valoresManuais: [...valoresManuais],
        vendasRealizadas: [...vendasRealizadas],
        historicoValores: [...historicoValores],
        resultado,
        savedAt: dataHoraStr,
      };
      localStorage.setItem(`${BACKUP_KEY_PREFIX}${anoReferencia}`, JSON.stringify(backupData));
      setHasManualBackup(true);
    } catch (e) {
      console.error('Erro ao criar backup manual:', e);
    }
  };

  // Restaura o backup manual gravado
  const restaurarBackupManual = () => {
    try {
      const raw = localStorage.getItem(`${BACKUP_KEY_PREFIX}${anoReferencia}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (Array.isArray(parsed.valoresManuais)) setValoresManuais(parsed.valoresManuais);
        if (Array.isArray(parsed.vendasRealizadas)) setVendasRealizadas(parsed.vendasRealizadas);
        if (Array.isArray(parsed.historicoValores)) setHistoricoValores(parsed.historicoValores);
        if (parsed.resultado) setResultado(parsed.resultado);
        if (parsed.metaAnualTotal) setMetaAnualTotal(parsed.metaAnualTotal);
        setEstrategia('MANUAL');
        setIsManuallyCustomized(true);

        salvarMetasLocalmenteSincrono(
          parsed.resultado,
          parsed.valoresManuais,
          parsed.vendasRealizadas,
          parsed.historicoValores,
          anoReferencia,
          'MANUAL',
          `Rascunho manual restaurado com sucesso (${parsed.savedAt || 'backup'}).`
        );
      }
    } catch (e) {
      console.error('Erro ao restaurar backup:', e);
    }
  };

  // Gravação síncrona imediata (botão explícito ou restauração)
  const salvarMetasLocalmenteSincrono = (
    resAtual: GeneratedGoalsResponse | null,
    manuais: number[],
    realizadas: number[],
    hist: number[],
    ano: number,
    strat: SalesGoalStrategy,
    msgNotif?: string
  ) => {
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }
    try {
      setSaveStatus('saving');
      const agora = new Date();
      const dataHoraStr = agora.toLocaleDateString('pt-PT') + ' às ' + agora.toLocaleTimeString('pt-PT');
      const dados = {
        anoReferencia: ano,
        metaAnualTotal: resAtual?.metaAnualTotal || metaAnualTotal,
        estrategia: strat,
        metasMensais: resAtual?.metasMensais || [],
        valoresManuais: manuais,
        historicoValores: hist,
        vendasRealizadas: realizadas,
        savedAt: dataHoraStr,
        source: resAtual?.source || 'Manual / Ajuste Local',
        isManuallyEdited: true,
      };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${ano}`, JSON.stringify(dados));
      setLastSavedTimestamp(dataHoraStr);
      setSaveStatus('saved');
      setIsManuallyCustomized(true);
      if (msgNotif && notify) {
        notify(msgNotif, 'success');
      }
    } catch (e) {
      console.error('Erro ao salvar metas no localStorage:', e);
      setSaveStatus('idle');
    }
  };

  // Gravação com debounce de 400ms para evitar microbloqueios em inputs rápidos (POS/ERP Architecture)
  const salvarMetasLocalmenteDebounced = (
    resAtual: GeneratedGoalsResponse | null,
    manuais: number[],
    realizadas: number[],
    hist: number[],
    ano: number,
    strat: SalesGoalStrategy
  ) => {
    setSaveStatus('saving');
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }

    saveDebounceTimerRef.current = setTimeout(() => {
      try {
        const agora = new Date();
        const dataHoraStr = agora.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dados = {
          anoReferencia: ano,
          metaAnualTotal: resAtual?.metaAnualTotal || metaAnualTotal,
          estrategia: strat,
          metasMensais: resAtual?.metasMensais || [],
          valoresManuais: manuais,
          historicoValores: hist,
          vendasRealizadas: realizadas,
          savedAt: dataHoraStr,
          source: resAtual?.source || 'Manual / Ajuste Local',
          isManuallyEdited: true,
        };
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${ano}`, JSON.stringify(dados));
        setLastSavedTimestamp(dataHoraStr);
        setSaveStatus('saved');
        setIsManuallyCustomized(true);
      } catch (e) {
        console.error('Erro ao persistir debounced no localStorage:', e);
        setSaveStatus('idle');
      }
    }, 400);
  };

  // Edição direta de meta mensal com aritmética rigorosa ao centavo (Zero Penny Discrepancy)
  const handleAlterarMetaMes = (idx: number, novoValor: number) => {
    const val = Math.max(0, novoValor);
    const nextValoresManuais = [...valoresManuais];
    nextValoresManuais[idx] = val;
    setValoresManuais(nextValoresManuais);

    // Motor de cálculo de domínio puro com reconciliação contábil
    const { totalMetaAnual, metasMensais } = distribuirMetaManual(nextValoresManuais);

    const novoResultado: GeneratedGoalsResponse = {
      anoReferencia,
      metaAnualTotal,
      metasMensais,
      source: 'Ajuste Manual Salvo',
      estrategia: 'MANUAL',
    };

    setResultado(novoResultado);
    setMetaAnualTotal(totalMetaAnual);
    setEstrategia('MANUAL');
    setIsManuallyCustomized(true);

    salvarMetasLocalmenteDebounced(novoResultado, nextValoresManuais, vendasRealizadas, historicoValores, anoReferencia, 'MANUAL');
  };

  // Edição direta de vendas realizadas com debounce
  const handleAlterarRealizadoMes = (idx: number, novoValor: number) => {
    const val = Math.max(0, novoValor);
    const nextRealizadas = [...vendasRealizadas];
    nextRealizadas[idx] = val;
    setVendasRealizadas(nextRealizadas);
    salvarMetasLocalmenteDebounced(resultado, valoresManuais, nextRealizadas, historicoValores, anoReferencia, estrategia);
  };

  const handleSalvarManualExplicit = () => {
    salvarMetasLocalmenteSincrono(
      resultado,
      valoresManuais,
      vendasRealizadas,
      historicoValores,
      anoReferencia,
      estrategia,
      `Metas de ${anoReferencia} guardadas permanentemente com sucesso!`
    );
  };

  const resetarParaPadrao = () => {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${anoReferencia}`);
      setLastSavedTimestamp(null);
      setIsManuallyCustomized(false);
      carregarExemploPadrao();
      if (notify) notify('Metas restauradas para a configuração padrão.', 'info');
    } catch (e) {
      console.error(e);
    }
  };

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

  const { mesesAtingidos, mesesEmFalta, mesesSemVendas } = useMemo(() => {
    if (!resultado?.metasMensais) return { mesesAtingidos: 0, mesesEmFalta: 0, mesesSemVendas: 0 };
    let atingidos = 0;
    let emFalta = 0;
    let semVendas = 0;
    resultado.metasMensais.forEach((m, idx) => {
      const real = vendasRealizadas[idx] || 0;
      if (m.valorMeta <= 0) return;
      if (real === 0) {
        semVendas++;
        emFalta++;
      } else if (real >= m.valorMeta) {
        atingidos++;
      } else {
        emFalta++;
      }
    });
    return { mesesAtingidos: atingidos, mesesEmFalta: emFalta, mesesSemVendas: semVendas };
  }, [resultado, vendasRealizadas]);

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

  // Executa o cálculo via API com o Gemini AI ou fallback seguro do backend
  const executarGerarMetas = async () => {
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

  // Intercepta a geração para proteger alterações manuais salvas
  const handleGerarMetas = () => {
    if (isManuallyCustomized && estrategia === 'MANUAL') {
      setPendingAction({
        titulo: 'Substituir metas manuais pela projeção da IA?',
        descricao: `Você possui metas mensais editadas manualmente para ${anoReferencia}. Recalcular agora substituirá esses valores pela projeção automática. Um backup de segurança será gravado automaticamente e poderá ser restaurado a qualquer momento.`,
        executar: () => {
          criarBackupManual();
          executarGerarMetas();
        },
      });
      setShowOverwriteModal(true);
    } else {
      executarGerarMetas();
    }
  };

  // Intercepta a troca de estratégia para alertar sobre perdas de dados manuais
  const solicitarMudancaEstrategia = (novaEstrategia: SalesGoalStrategy) => {
    if (novaEstrategia === estrategia) return;

    if (isManuallyCustomized && estrategia === 'MANUAL') {
      setPendingAction({
        titulo: `Mudar estratégia de distribuição para "${novaEstrategia}"?`,
        descricao: `Você possui metas mensais personalizadas manualmente. Ao mudar para a estratégia "${novaEstrategia}", os valores serão recalculados de acordo com essa regra. Um backup dos seus valores manuais será mantido para restauração.`,
        executar: () => {
          criarBackupManual();
          setEstrategia(novaEstrategia);
          setIsManuallyCustomized(false);
        },
      });
      setShowOverwriteModal(true);
    } else {
      setEstrategia(novaEstrategia);
      if (novaEstrategia === 'MANUAL') {
        setShowEditManual(true);
      }
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
            {saveStatus === 'saving' && (
              <span className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-mono animate-pulse">
                <Hourglass className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>A gravar...</span>
              </span>
            )}
            {saveStatus !== 'saving' && lastSavedTimestamp && (
              <span className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-lg text-xs font-mono">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Salvo: {lastSavedTimestamp}</span>
              </span>
            )}
            {hasManualBackup && (
              <button
                type="button"
                onClick={restaurarBackupManual}
                className="flex items-center space-x-1.5 px-3 py-2 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-600/40 rounded-lg text-xs font-semibold transition-all shadow cursor-pointer"
                title="Restaurar backup anterior das metas manuais"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Restaurar Rascunho Manual</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSalvarManualExplicit}
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer"
              title="Salvar metas e vendas realizadas permanentemente no navegador"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Metas</span>
            </button>
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
              onClick={resetarParaPadrao}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#262626] hover:bg-[#303030] text-neutral-300 hover:text-white rounded-lg border border-[#3a3a3a] text-xs font-semibold transition-all cursor-pointer"
              title="Restaurar parâmetros padrão e limpar alterações locais"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>Restaurar Padrão</span>
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
            onClick={() => solicitarMudancaEstrategia('HISTORICO')}
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
            onClick={() => solicitarMudancaEstrategia('MANUAL')}
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
            onClick={() => solicitarMudancaEstrategia('LINEAR')}
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
                    const parcelas = distribuirMetaLinear(metaAnualTotal);
                    setValoresManuais(parcelas.map((p) => p.valorMeta));
                    if (notify) notify(`Meta anual de ${formatCurrency(metaAnualTotal)} dividida igualmente nos 12 meses com reconciliação contábil ao centavo.`, 'success');
                  }}
                  className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-700/60 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  title="Dividir a meta anual total igualmente nos 12 meses com balanceamento exato de centavos"
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
                solicitarMudancaEstrategia(next);
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
                    const parcelas = distribuirMetaLinear(metaAnualTotal);
                    setValoresManuais(parcelas.map((p) => p.valorMeta));
                    if (notify) notify(`Meta anual de ${formatCurrency(metaAnualTotal)} dividida igualmente nos 12 meses (${formatCurrency(metaAnualTotal / 12)}/mês) sem discrepâncias de centavos.`, 'success');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer"
                  title="Dividir a meta anual em 12 parcelas com distribuição balanceada de centavos"
                >
                  Aplicar nos 12 Meses (1/12)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (totalManual === 0) return;
                    const parcelas = distribuirMetaSazonal(metaAnualTotal, valoresManuais);
                    setValoresManuais(parcelas.map((p) => p.valorMeta));
                    if (notify) notify(`Meta anual de ${formatCurrency(metaAnualTotal)} distribuída proporcionalmente via Método dos Maiores Restos (sem resíduo no último mês).`, 'success');
                  }}
                  disabled={totalManual === 0}
                  className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#303030] text-neutral-200 border border-[#444] rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
                  title="Distribuir proporcionalmente com o Método dos Maiores Restos (accounting standard)"
                >
                  Distribuir Proporcional (Reconciliado)
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
                      handleAlterarMetaMes(idx, Number(e.target.value) || 0);
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
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-[#c5a47e]" />
              <span>
                Motor ativo:{' '}
                <strong className="text-white font-mono">{resultado?.source || 'gemini-3.8-flash'}</strong>
              </span>
            </div>
            {saveStatus === 'saving' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-mono flex items-center space-x-1 animate-pulse">
                <Hourglass className="w-3 h-3 text-amber-400 animate-spin" />
                <span>A gravar alterações...</span>
              </span>
            ) : lastSavedTimestamp ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[11px] font-mono flex items-center space-x-1">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Salvo em {lastSavedTimestamp}</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[#202020] text-neutral-400 border border-[#333] text-[11px]">
                Salvamento automático ativo
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSalvarManualExplicit}
              className="px-4 py-2.5 bg-[#222] hover:bg-[#2c2c2c] text-neutral-200 border border-[#444] font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
              title="Guardar alterações das metas e vendas permanentemente"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Guardar Alterações</span>
            </button>

            <button
              type="button"
              onClick={handleGerarMetas}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#c5a47e] to-[#ab875e] hover:from-[#d6b793] hover:to-[#be986c] text-neutral-950 font-bold rounded-xl text-xs shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  <span>Calculando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-neutral-950" />
                  <span>Calcular Metas com Gemini AI</span>
                </>
              )}
            </button>
          </div>
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

      {/* 3. Executive KPI Cards: Results Summary & Tracking */}
      {resultado && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Meta Anual Consolidada */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#383838] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Meta Anual Estabelecida</span>
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

            {/* 2. Vendas Realizadas (Faturamento) */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#383838] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Vendas Realizadas</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Faturado
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-400 tracking-tight font-mono">
                {formatCurrency(totalRealizado)}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Atingimento Global:</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {percentualRealizadoTotal.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* 3. META EM FALTA / POR REALIZAR (DESTAQUE PRINCIPAL) */}
            <div className="bg-gradient-to-br from-[#1a1610] to-[#141414] border-2 border-amber-500/40 rounded-xl p-4 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                  <Hourglass className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Meta em Falta / Por Realizar</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {percentualEmFaltaTotal.toFixed(1)}% Pendente
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-300 tracking-tight font-mono relative z-10">
                {formatCurrency(metaEmFaltaTotal)}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs relative z-10">
                <span className="text-neutral-400">Média p/ bater:</span>
                <span className="text-amber-300 font-medium font-mono">
                  {metaEmFaltaTotal === 0 ? '✓ Meta 100% Batida!' : `~${formatCurrency(Math.round(metaEmFaltaTotal / 365))}/dia`}
                </span>
              </div>
            </div>

            {/* 4. Progresso & Taxa de Conclusão */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#383838] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Taxa de Conclusão</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  percentualRealizadoTotal >= 100
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                }`}>
                  {percentualRealizadoTotal >= 100 ? 'Superada' : 'Em Curso'}
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-blue-300 tracking-tight font-mono">
                {percentualRealizadoTotal.toFixed(1)}%
              </div>
              <div className="mt-1.5 w-full bg-[#202020] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, percentualRealizadoTotal)}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
                <span>Saldo vs Meta:</span>
                <span className={`font-mono font-bold ${totalRealizado >= resultado.metaAnualTotal ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {totalRealizado >= resultado.metaAnualTotal ? '+' : '-'}{formatCurrency(Math.abs(totalRealizado - resultado.metaAnualTotal))}
                </span>
              </div>
            </div>

            {/* 5. Meses Concluídos / Em Falta */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 shadow-sm hover:border-[#383838] transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Status por Meses</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral-800 text-neutral-300 border border-[#333]">
                  12 Meses
                </span>
              </div>
              <div className="mt-2 text-xl font-black text-white tracking-tight font-mono flex items-center space-x-2">
                <span className="text-emerald-400">{mesesAtingidos} Batidos</span>
                <span className="text-neutral-500 text-sm">/</span>
                <span className="text-amber-300">{mesesEmFalta} Falta</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Mês de Pico:</span>
                <span className="text-[#c5a47e] font-semibold">
                  {mesMaior?.nomeMes || '-'} ({mesMaior ? `${mesMaior.pesoPercentual.toFixed(1)}%` : '0%'})
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Progresso Executiva de Acompanhamento (Meta vs Realizado vs Em Falta) */}
          <div className="bg-[#171717] border border-[#2b2b2b] rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center space-x-2 text-xs">
                <BarChart3 className="w-4 h-4 text-[#c5a47e]" />
                <span className="font-bold text-white">Progresso Acumulado da Meta Anual</span>
                <span className="text-neutral-400">
                  ({formatCurrency(totalRealizado)} realizado de {formatCurrency(resultado.metaAnualTotal)})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center space-x-1.5 text-emerald-400 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Realizado: {percentualRealizadoTotal.toFixed(1)}%</span>
                </span>
                <span className="flex items-center space-x-1.5 text-amber-300 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Em Falta: {percentualEmFaltaTotal.toFixed(1)}% ({formatCurrency(metaEmFaltaTotal)})</span>
                </span>
                {lastSavedTimestamp && (
                  <span className="text-[11px] text-neutral-400 flex items-center space-x-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Valores mantidos localmente</span>
                  </span>
                )}
              </div>
            </div>

            {/* Barra Visual Proporcional Bicolor */}
            <div className="w-full bg-[#111] h-3.5 rounded-full overflow-hidden flex border border-[#333]">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, percentualRealizadoTotal)}%` }}
                title={`Vendas Realizadas: ${formatCurrency(totalRealizado)} (${percentualRealizadoTotal.toFixed(1)}%)`}
              />
              <div
                className="bg-amber-500/80 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, percentualEmFaltaTotal)}%` }}
                title={`Meta em Falta / Por Realizar: ${formatCurrency(metaEmFaltaTotal)} (${percentualEmFaltaTotal.toFixed(1)}%)`}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Visual Chart: Monthly Tracking and Planning */}
      {resultado && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-sm lg:text-base font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-[#c5a47e]" />
                <span>
                  {chartViewMode === 'acompanhamento'
                    ? `Acompanhamento Comercial: Meta vs Vendas Realizadas vs Em Falta (${resultado.anoReferencia})`
                    : `Distribuição Sazonal das Metas (${resultado.anoReferencia}) vs Histórico Base`}
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {chartViewMode === 'acompanhamento'
                  ? 'Comparação direta mês a mês: Meta estabelecida, faturamento realizado e meta em falta por realizar'
                  : 'Valores em Meticais (MT) nas barras e peso percentual de sazonalidade (%) na linha'}
              </p>
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center space-x-1.5 bg-[#1e1e1e] p-1 rounded-lg border border-[#333]">
              <button
                type="button"
                onClick={() => setChartViewMode('acompanhamento')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  chartViewMode === 'acompanhamento'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Meta vs Realizado vs Em Falta
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('planeamento')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  chartViewMode === 'planeamento'
                    ? 'bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Meta vs Histórico Base
              </button>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium mb-4 pb-3 border-b border-[#222]">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-[#c5a47e]" />
              <span className="text-neutral-300">Meta Estabelecida (MT)</span>
            </div>
            {chartViewMode === 'acompanhamento' ? (
              <>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-emerald-400">Vendas Realizadas (MT)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500" />
                  <span className="text-amber-300">Meta em Falta / Por Realizar (MT)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-1 bg-sky-400" />
                  <span className="text-sky-400">% Atingimento</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-[#404040]" />
                  <span className="text-neutral-400">Histórico Anterior (MT)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-1 bg-emerald-400" />
                  <span className="text-emerald-400">Peso Sazonal %</span>
                </div>
              </>
            )}
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
                  stroke={chartViewMode === 'acompanhamento' ? '#38bdf8' : '#10b981'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: chartViewMode === 'acompanhamento' ? '#38bdf8' : '#10b981' }}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax * 1.2))]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-[#1c1c1c] border border-[#333] p-3 rounded-lg shadow-xl text-xs space-y-1.5">
                        <div className="font-bold text-white text-sm mb-1">{item.nomeCompleto}</div>
                        <div className="flex items-center justify-between space-x-4">
                          <span className="text-[#c5a47e] font-medium">Meta do Mês:</span>
                          <span className="font-mono font-bold text-white">{formatCurrency(item.meta)}</span>
                        </div>
                        <div className="flex items-center justify-between space-x-4">
                          <span className="text-emerald-400 font-medium">Vendas Realizadas:</span>
                          <span className="font-mono font-bold text-emerald-400">{formatCurrency(item.realizado)}</span>
                        </div>
                        <div className="flex items-center justify-between space-x-4">
                          <span className="text-amber-300 font-medium">Meta em Falta:</span>
                          <span className="font-mono font-bold text-amber-300">{formatCurrency(item.emFalta)}</span>
                        </div>
                        <div className="flex items-center justify-between space-x-4">
                          <span className="text-sky-400 font-medium">Atingimento:</span>
                          <span className="font-mono font-bold text-sky-400">{item.pct}%</span>
                        </div>
                        {chartViewMode === 'planeamento' && (
                          <div className="flex items-center justify-between space-x-4 pt-1 border-t border-[#333]">
                            <span className="text-neutral-400">Histórico Base:</span>
                            <span className="font-mono text-neutral-300">{formatCurrency(item.historico)}</span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                {chartViewMode === 'acompanhamento' ? (
                  <>
                    <Bar yAxisId="left" dataKey="meta" fill="#c5a47e" radius={[4, 4, 0, 0]} name="Meta" />
                    <Bar yAxisId="left" dataKey="realizado" fill="#10b981" radius={[4, 4, 0, 0]} name="Realizado" />
                    <Bar yAxisId="left" dataKey="emFalta" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Em Falta" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="pct"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ fill: '#38bdf8', r: 4 }}
                      name="% Atingido"
                    />
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 5. Detailed Table: Month by Month Breakdown with Inline Editing and Explicit "Meta em Falta" */}
      {resultado && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 lg:p-5 border-b border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#171717]">
            <div>
              <h3 className="text-sm lg:text-base font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#c5a47e]" />
                <span>Detalhamento e Acompanhamento Mensal das Metas ({resultado.anoReferencia})</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Edite diretamente os valores de <strong>Meta Mensal</strong> ou <strong>Vendas Realizadas</strong> nas células abaixo. As alterações manuais são mantidas e guardadas automaticamente.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={puxarVendasReaisERPParaRealizado}
                className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#2e2e2e] text-neutral-300 rounded-lg text-xs font-medium border border-[#3a3a3a] transition-colors cursor-pointer"
                title="Puxar vendas do ERP para atualizar coluna de Vendas Realizadas"
              >
                Puxar Vendas ERP
              </button>
              <button
                type="button"
                onClick={carregarExemploRealizado}
                className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#2e2e2e] text-neutral-300 rounded-lg text-xs font-medium border border-[#3a3a3a] transition-colors cursor-pointer"
                title="Carregar exemplo de acompanhamento (Jan-Jun)"
              >
                Exemplo Demo
              </button>
              <button
                type="button"
                onClick={zerarVendasRealizadas}
                className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#2e2e2e] text-neutral-400 hover:text-amber-300 rounded-lg text-xs font-medium border border-[#3a3a3a] transition-colors cursor-pointer"
                title="Zerar vendas realizadas para ver 100% da meta em falta"
              >
                Zerar Realizado
              </button>
              <button
                type="button"
                onClick={handleSalvarManualExplicit}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center space-x-1 cursor-pointer"
                title="Salvar alterações manuais permanentemente"
              >
                <Save className="w-3 h-3" />
                <span>Guardar</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1c1c1c] text-neutral-400 font-semibold uppercase tracking-wider border-b border-[#2b2b2b]">
                <tr>
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-3">Mês de Referência</th>
                  <th className="py-3 px-3 text-right">Peso Sazonal</th>
                  <th className="py-3 px-3 text-right text-[#c5a47e] font-bold">
                    Meta Mensal (MT)
                    <span className="block text-[9px] text-neutral-400 font-normal">Edição manual livre</span>
                  </th>
                  <th className="py-3 px-3 text-right text-emerald-400 font-bold">
                    Vendas Realizadas (MT)
                    <span className="block text-[9px] text-neutral-400 font-normal">Faturamento real</span>
                  </th>
                  <th className="py-3 px-3 text-right text-amber-300 font-bold bg-amber-500/5 border-x border-amber-500/20">
                    Meta em Falta / Por Realizar (MT)
                    <span className="block text-[9px] text-amber-400/80 font-normal">Gap para atingir</span>
                  </th>
                  <th className="py-3 px-3 text-center">Progresso</th>
                  <th className="py-3 px-3 text-right text-neutral-400">Média Diária Falta</th>
                  <th className="py-3 px-3 text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {resultado.metasMensais.map((item, idx) => {
                  const real = vendasRealizadas[idx] || 0;
                  const emFalta = Math.max(0, item.valorMeta - real);
                  const pctAtingido = item.valorMeta > 0 ? (real / item.valorMeta) * 100 : 0;
                  const superavitMes = Math.max(0, real - item.valorMeta);
                  const atingida = real >= item.valorMeta && item.valorMeta > 0;

                  return (
                    <tr key={item.mes} className="hover:bg-[#1a1a1a]/80 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-neutral-500">
                        {String(item.mes).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white">
                        <div className="flex items-center space-x-1.5">
                          <span>{item.nomeMes}</span>
                          {item.valorMeta === mesMaior?.valorMeta && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Maior
                            </span>
                          )}
                          {item.valorMeta === mesMenor?.valorMeta && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Menor
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {item.pesoPercentual.toFixed(2)}%
                      </td>

                      {/* Meta Mensal (MT) - Campo Editável Manualmente */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end">
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={item.valorMeta}
                            onChange={(e) => handleAlterarMetaMes(idx, Number(e.target.value) || 0)}
                            className="w-28 px-2 py-1 bg-[#121212] border border-[#3a3a3a] hover:border-[#c5a47e] focus:border-[#c5a47e] focus:outline-none rounded text-right font-mono text-white text-xs font-bold transition-colors"
                            title="Clique para alterar a meta deste mês manualmente (salvamento automático)"
                          />
                        </div>
                      </td>

                      {/* Vendas Realizadas (MT) - Campo Editável Manualmente */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end">
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={vendasRealizadas[idx] || 0}
                            onChange={(e) => handleAlterarRealizadoMes(idx, Number(e.target.value) || 0)}
                            className="w-28 px-2 py-1 bg-[#121212] border border-[#3a3a3a] hover:border-emerald-500 focus:border-emerald-500 focus:outline-none rounded text-right font-mono text-emerald-400 text-xs font-semibold transition-colors"
                            title="Clique para alterar as vendas realizadas deste mês"
                          />
                        </div>
                      </td>

                      {/* META EM FALTA / POR REALIZAR (MT) - DESTAQUE VISUAL CLARO */}
                      <td className="py-2.5 px-3 text-right bg-amber-500/5 border-x border-amber-500/20 font-mono">
                        {item.valorMeta === 0 ? (
                          <span className="text-neutral-500">0 MT</span>
                        ) : atingida ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-bold text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                              0 MT
                            </span>
                            {superavitMes > 0 && (
                              <span className="text-[10px] text-emerald-400/80 mt-0.5">
                                +{formatCurrency(superavitMes)} superávit
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-amber-300 bg-amber-500/15 border border-amber-500/30 font-bold text-xs">
                              <Hourglass className="w-3 h-3 mr-1 text-amber-400" />
                              {formatCurrency(emFalta)}
                            </span>
                            <span className="text-[10px] text-amber-400/80 mt-0.5">
                              {(((emFalta) / item.valorMeta) * 100).toFixed(0)}% por realizar
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Progresso Visual */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="w-24 mx-auto space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className={atingida ? 'text-emerald-400 font-bold' : 'text-neutral-300'}>
                              {pctAtingido.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-[#242424] h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                atingida ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, pctAtingido)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Média Diária em Falta */}
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-300">
                        {emFalta === 0 ? (
                          <span className="text-emerald-400 text-[11px]">Concluído</span>
                        ) : (
                          <span>~{formatCurrency(Math.round(emFalta / 30))}/dia</span>
                        )}
                      </td>

                      {/* Situação */}
                      <td className="py-2.5 px-3 text-center">
                        {item.valorMeta === 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-[#333]">
                            Sem Meta
                          </span>
                        ) : atingida ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Atingida ✓
                          </span>
                        ) : real > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Em Falta
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-300 border border-[#333]">
                            Pendente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Linha de Total Consolidado Anual com Totais Explícitos */}
              <tfoot className="bg-[#181818] font-bold text-white border-t-2 border-[#333]">
                <tr>
                  <td colSpan={2} className="py-4 px-3 text-left uppercase text-[#c5a47e] text-xs">
                    TOTAL CONSOLIDADO ({resultado.anoReferencia})
                  </td>
                  <td className="py-4 px-3 text-right font-mono text-emerald-400 text-xs">
                    100.00%
                  </td>
                  <td className="py-4 px-3 text-right font-mono text-sm text-[#c5a47e]">
                    {formatCurrency(resultado.metaAnualTotal)}
                  </td>
                  <td className="py-4 px-3 text-right font-mono text-sm text-emerald-400">
                    {formatCurrency(totalRealizado)}
                  </td>
                  {/* TOTAL EM FALTA / POR REALIZAR */}
                  <td className="py-4 px-3 text-right font-mono text-sm text-amber-300 bg-amber-500/10 border-x border-amber-500/30">
                    <div className="flex flex-col items-end">
                      <span className="text-base font-black text-amber-300">
                        {formatCurrency(metaEmFaltaTotal)}
                      </span>
                      <span className="text-[10px] text-amber-400/90 font-normal">
                        {percentualEmFaltaTotal.toFixed(1)}% por realizar
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-3 text-center font-mono text-blue-300 text-xs">
                    {percentualRealizadoTotal.toFixed(1)}%
                  </td>
                  <td className="py-4 px-3 text-right font-mono text-neutral-300 text-xs">
                    {metaEmFaltaTotal === 0 ? 'Concluído' : `~${formatCurrency(Math.round(metaEmFaltaTotal / 365))}/dia`}
                  </td>
                  <td className="py-4 px-3 text-center text-xs">
                    {metaEmFaltaTotal === 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        100% Batida!
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Em Falta
                      </span>
                    )}
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
                      gemini-3.6-flash
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
    model: 'gemini-3.6-flash',
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
    model: 'gemini-3.6-flash',
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

      {/* Modal de Proteção contra Sobrescrita Acidental de Metas Manuais */}
      {showOverwriteModal && pendingAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-amber-600/40 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#2a2a2a] flex items-start space-x-3.5 bg-gradient-to-r from-amber-950/30 to-[#181818]">
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white leading-tight">
                  {pendingAction.titulo}
                </h3>
                <span className="text-[11px] font-mono text-amber-400 font-semibold block mt-0.5">
                  Segurança de Dados • Módulo Comercial POS/ERP
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowOverwriteModal(false);
                  setPendingAction(null);
                }}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-[#252525] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3.5 text-xs text-neutral-300">
              <p className="leading-relaxed">
                {pendingAction.descricao}
              </p>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1 text-emerald-300">
                <div className="font-bold flex items-center space-x-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Backup Automático de Segurança</span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-normal">
                  Seus valores manuais serão arquivados na chave de backup local do ano {anoReferencia}. Poderá restaurá-los a qualquer momento clicando no botão <strong>"Restaurar Rascunho Manual"</strong> no topo da página.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-3.5 border-t border-[#2a2a2a] bg-[#141414] flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowOverwriteModal(false);
                  setPendingAction(null);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-[#252525] hover:bg-[#303030] text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar e Manter Valores Manuais
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = pendingAction.executar;
                  setShowOverwriteModal(false);
                  setPendingAction(null);
                  action();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-[#c5a47e] hover:from-amber-400 hover:to-[#d6b793] text-black font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-black" />
                <span>Substituir e Prosseguir</span>
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
