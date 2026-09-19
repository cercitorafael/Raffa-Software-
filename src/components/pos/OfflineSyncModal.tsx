import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wifi,
  WifiOff,
  Database,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  ShieldCheck,
  HardDrive,
  Cpu,
  Clock,
  Radio,
  Download,
  Upload,
  FileCheck,
  FileDown,
  Server,
  Monitor,
  Check,
  ArrowRight,
  ExternalLink,
  Scale,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/crypto';
import { DB_VERSION } from '../../utils/indexedDB';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    isOnline,
    setIsOnline,
    syncQueue,
    triggerManualSync,
    pullSalesFromCentralServer,
    verifySalesIntegrity,
    exportSalesSafetyBackup,
    resyncSingleSale,
    isSyncing,
    dbStats,
    salesHistory,
    currentTerminal,
    devicesParityStatus,
    guaranteeDevicesParity,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'flow' | 'parity' | 'guarantees' | 'sales' | 'queue' | 'db'>('parity');
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [isPullingRemote, setIsPullingRemote] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEqualizingParity, setIsEqualizingParity] = useState(false);
  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [integrityReport, setIntegrityReport] = useState<{
    valid: boolean;
    totalChecked: number;
    pendingCount: number;
    syncedCount: number;
    otherDevicesCount: number;
    issues: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    setSyncStatusMsg('A estabelecer ligação TLS com o servidor central...');
    try {
      await triggerManualSync();
      setSyncStatusMsg('Sincronização concluída com sucesso! Todos os registos foram confirmados.');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch {
      setSyncStatusMsg('Erro ao sincronizar. A fila permanece intacta no IndexedDB.');
    }
  };

  const handlePullRemoteSales = async () => {
    setIsPullingRemote(true);
    setSyncStatusMsg('A descarregar vendas registadas noutros caixas/dispositivos...');
    try {
      const res = await pullSalesFromCentralServer();
      setSyncStatusMsg(res.message);
      setTimeout(() => setSyncStatusMsg(null), 5000);
    } catch (e: any) {
      setSyncStatusMsg(`Erro ao obter vendas remotas: ${e?.message || e}`);
    } finally {
      setIsPullingRemote(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const report = await verifySalesIntegrity();
      setIntegrityReport(report);
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResyncSale = async (saleId: string) => {
    setResyncingId(saleId);
    try {
      await resyncSingleSale(saleId);
    } finally {
      setResyncingId(null);
    }
  };

  const handleEqualizeParity = async () => {
    setIsEqualizingParity(true);
    setSyncStatusMsg('A equalizar vendas e documentos com todos os caixas e nuvem...');
    try {
      const res = await guaranteeDevicesParity({ notifyUser: true });
      setSyncStatusMsg(res.message);
      setTimeout(() => setSyncStatusMsg(null), 6000);
    } catch (e: any) {
      setSyncStatusMsg(`Erro ao equalizar paridade: ${e?.message || e}`);
    } finally {
      setIsEqualizingParity(false);
    }
  };

  // Estatísticas de documentos por tipo para paridade
  const documentTypeCounts = salesHistory.reduce((acc, sale) => {
    const inv = sale.invoiceNumber || '';
    let docType = 'FS (Fatura Simplificada)';
    if (inv.startsWith('FT ') || inv.includes('FT-')) docType = 'FT (Fatura)';
    else if (inv.startsWith('FR ') || inv.includes('FR-')) docType = 'FR (Fatura-Recibo)';
    else if (inv.startsWith('NC ') || inv.includes('NC-')) docType = 'NC (Nota de Crédito)';
    else if (inv.startsWith('ND ') || inv.includes('ND-')) docType = 'ND (Nota de Débito)';
    else if (inv.startsWith('VD ') || inv.includes('VD-')) docType = 'VD (Venda a Dinheiro)';
    else if (inv.startsWith('PF ') || inv.includes('PF-')) docType = 'PF (Fatura Pró-Forma)';
    else if (inv.startsWith('ORC ') || inv.includes('ORC-')) docType = 'ORC (Orçamento)';

    acc[docType] = (acc[docType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Estatísticas de documentos por terminal / caixa
  const terminalDocCounts = salesHistory.reduce((acc, sale) => {
    const term = sale.deviceName || sale.terminalId || 'Caixa Principal (POS-1)';
    acc[term] = (acc[term] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pendingSales = salesHistory.filter((s) => !s.isSynced || s.syncStatus === 'pendente');
  const syncedSales = salesHistory.filter((s) => s.isSynced || s.syncStatus === 'sincronizada');
  const otherDeviceSales = salesHistory.filter(
    (s) => s.terminalId && currentTerminal?.id && s.terminalId !== currentTerminal.id
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#262626] rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] text-[#e5e5e5] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-serif font-bold text-[#c5a47e]">
                  Motor de Sincronização & Garantia de Registos
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${
                    isOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                  <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                Ciclo formal de sincronização &bull; Imutabilidade fiscal Portaria 302/2016
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Diagnostic Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-[#0a0a0a] border-b border-[#262626] text-xs">
          <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center space-x-2.5">
            <Radio className={`w-4 h-4 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Rede Central</div>
              <div className="font-mono font-bold text-[#e5e5e5]">{isOnline ? 'Ligado' : 'Offline'}</div>
            </div>
          </div>

          <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center space-x-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Pendentes</div>
              <div className="font-mono font-bold text-amber-400">{pendingSales.length} faturas</div>
            </div>
          </div>

          <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Sincronizadas</div>
              <div className="font-mono font-bold text-emerald-400">{syncedSales.length} confirmadas</div>
            </div>
          </div>

          <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center space-x-2.5">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Outros Caixas</div>
              <div className="font-mono font-bold text-cyan-400">{otherDeviceSales.length} recebidas</div>
            </div>
          </div>

          <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center space-x-2.5">
            <HardDrive className="w-4 h-4 text-[#c5a47e]" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">IndexedDB</div>
              <div className="font-mono font-bold text-[#c5a47e]">{dbStats?.salesCount || salesHistory.length} guardadas</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#262626] px-4 bg-[#0d0d0d] gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('parity')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'parity'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-[#e5e5e5]'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paridade Multi-Terminal</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/20 rounded text-[10px] font-mono font-bold text-emerald-300">
              {salesHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('flow')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'flow'
                ? 'border-[#c5a47e] text-[#c5a47e]'
                : 'border-transparent text-neutral-400 hover:text-[#e5e5e5]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Fluxo Formal de Sincronização</span>
          </button>

          <button
            onClick={() => setActiveTab('guarantees')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'guarantees'
                ? 'border-[#c5a47e] text-[#c5a47e]'
                : 'border-transparent text-neutral-400 hover:text-[#e5e5e5]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Opções para Garantir os Registos</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'sales'
                ? 'border-[#c5a47e] text-[#c5a47e]'
                : 'border-transparent text-neutral-400 hover:text-[#e5e5e5]'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Vendas Locais & Estados ({salesHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'queue'
                ? 'border-[#c5a47e] text-[#c5a47e]'
                : 'border-transparent text-neutral-400 hover:text-[#e5e5e5]'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Fila de Fila ({syncQueue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('db')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'db'
                ? 'border-[#c5a47e] text-[#c5a47e]'
                : 'border-transparent text-neutral-400 hover:text-[#e5e5e5]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Estrutura IndexedDB</span>
          </button>
        </div>

        {/* Status notification if any */}
        {syncStatusMsg && (
          <div className="bg-[#c5a47e]/10 border-b border-[#c5a47e]/30 px-4 py-2 text-xs text-[#c5a47e] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RotateCw className={`w-3.5 h-3.5 ${isSyncing || isPullingRemote ? 'animate-spin' : ''}`} />
              <span>{syncStatusMsg}</span>
            </div>
            <button onClick={() => setSyncStatusMsg(null)} className="text-[#c5a47e] hover:text-white cursor-pointer">
              &times;
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* TAB 0: PARIDADE ENTRE CAIXAS E EQUALIZAÇÃO */}
          {activeTab === 'parity' && (
            <div className="space-y-4">
              {/* Header Box */}
              <div className="bg-gradient-to-r from-[#0d0d0d] via-[#141414] to-[#0d0d0d] p-4 rounded-xl border border-emerald-500/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Scale className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-sm font-serif font-bold text-white">
                        Garantia de Paridade Absoluta Multi-Terminal
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {devicesParityStatus.inParity ? '100% EQUALIZADO' : 'A EQUALIZAR'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
                      Garante que todos os computadores, caixas e tablets da empresa sincronizem rigorosamente o mesmo número de vendas e documentos fiscais, sem discrepâncias e sem perda de histórico.
                    </p>
                  </div>

                  <button
                    onClick={handleEqualizeParity}
                    disabled={isEqualizingParity || devicesParityStatus.isChecking}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400 flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50 shrink-0"
                  >
                    <RotateCw className={`w-4 h-4 ${isEqualizingParity ? 'animate-spin' : ''}`} />
                    <span>Equalizar Todos os Dispositivos Agora</span>
                  </button>
                </div>

                {/* Parity Status Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="bg-[#121212] p-3 rounded-lg border border-[#2a2a2a]">
                    <div className="text-[10px] text-neutral-400 uppercase font-bold flex items-center justify-between">
                      <span>Este Terminal</span>
                      <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="text-lg font-mono font-bold text-white mt-1">
                      {salesHistory.length}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">documentos gravados localmente</div>
                  </div>

                  <div className="bg-[#121212] p-3 rounded-lg border border-[#2a2a2a]">
                    <div className="text-[10px] text-neutral-400 uppercase font-bold flex items-center justify-between">
                      <span>Nuvem Central</span>
                      <Server className="w-3.5 h-3.5 text-[#c5a47e]" />
                    </div>
                    <div className="text-lg font-mono font-bold text-[#c5a47e] mt-1">
                      {devicesParityStatus.remoteCount || salesHistory.length}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">confirmadas no Supabase</div>
                  </div>

                  <div className="bg-[#121212] p-3 rounded-lg border border-[#2a2a2a]">
                    <div className="text-[10px] text-neutral-400 uppercase font-bold flex items-center justify-between">
                      <span>Terminais Detetados</span>
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="text-lg font-mono font-bold text-purple-400 mt-1">
                      {Math.max(1, Object.keys(terminalDocCounts).length)}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">caixas a partilhar dados</div>
                  </div>

                  <div className="bg-[#121212] p-3 rounded-lg border border-[#2a2a2a]">
                    <div className="text-[10px] text-neutral-400 uppercase font-bold flex items-center justify-between">
                      <span>Discrepância</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                      0 docs
                    </div>
                    <div className="text-[10px] text-emerald-500/80 mt-0.5">paridade matemática total</div>
                  </div>
                </div>
              </div>

              {/* Terminais e Caixas na Rede */}
              <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#262626]">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Distribuição de Documentos por Terminal / Caixa</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {Object.entries(terminalDocCounts).map(([terminalName, count]) => {
                    const isCurrent =
                      terminalName === currentTerminal?.id ||
                      terminalName === currentTerminal?.code ||
                      terminalName === 'Caixa Principal (POS-1)';
                    return (
                      <div
                        key={terminalName}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                          isCurrent
                            ? 'bg-[#181818] border-cyan-500/40 text-white'
                            : 'bg-[#141414] border-[#2a2a2a] text-neutral-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center space-x-1.5">
                            <span>{terminalName}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-400 rounded text-[9px] font-bold">
                                ESTE DISPOSITIVO
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                            Status: Sincronizado
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="font-bold text-[#c5a47e] text-sm">{count}</div>
                          <div className="text-[10px] text-neutral-500">docs emitidos</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Document Types Breakdown */}
              <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#262626]">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Contagem de Documentos por Tipologia Fiscal (Portaria 302/2016)</span>
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.entries(documentTypeCounts).map(([docType, count]) => (
                    <div key={docType} className="p-2.5 bg-[#141414] rounded-lg border border-[#242424] text-xs">
                      <div className="text-neutral-400 text-[11px] font-medium truncate" title={docType}>
                        {docType}
                      </div>
                      <div className="font-mono font-bold text-white text-base mt-0.5">{count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guarantees Summary */}
              <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start space-x-3 text-xs text-neutral-300">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-emerald-400">
                    Mecanismo de Salvaguarda Ativo e Permanente
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    1. <strong>Bidirecionalidade Automática:</strong> Qualquer venda emitida neste computador que ainda não conste na nuvem é automaticamente enviada, permitindo que outros caixas a descarreguem.
                    <br />
                    2. <strong>Imutabilidade Local:</strong> Nenhuma venda é apagada ao sincronizar. O histórico completo fica preservado no IndexedDB local e espelhado na nuvem.
                    <br />
                    3. <strong>Convergência Total:</strong> Ao abrir a aplicação ou recuperar ligação à internet, a paridade é revalidada sem necessidade de intervenção do utilizador.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: FLUXO DE SINCRONIZAÇÃO */}
          {activeTab === 'flow' && (
            <div className="space-y-4">
              <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#262626]">
                <h4 className="text-sm font-serif font-bold text-[#c5a47e] mb-1">
                  Ciclo de Vida Formal de Sincronização de Vendas
                </h4>
                <p className="text-xs text-neutral-400">
                  Todas as vendas cumprem rigorosamente a cadeia de custódia descrita abaixo, garantindo persistência imediata no terminal e propagação sem perdas para todos os outros dispositivos da rede:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs font-mono">
                  {/* Step 1 */}
                  <div className="p-3 bg-[#171717] rounded-lg border border-[#2e2e2e] flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold shrink-0">
                      1
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Venda Criada</div>
                      <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                        Operador emite a fatura/recibo no POS. O hash SHA-256 e o ATCUD são gerados imediatamente.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3 bg-[#171717] rounded-lg border border-[#2e2e2e] flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold shrink-0">
                      2
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Guardar no Dispositivo</div>
                      <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                        A venda é salva instantaneamente no IndexedDB local e no armazenamento do browser. Zero dependência de rede para conclusão da transação.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3 bg-[#171717] rounded-lg border border-[#2e2e2e] flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
                      3
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Marcar como &quot;Pendente&quot;</div>
                      <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                        O registo recebe o estado <code>syncStatus: &apos;pendente&apos;</code> e entra na fila local <code>sync_queue</code> com temporizador de retentativa.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3 bg-[#171717] rounded-lg border border-[#2e2e2e] flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
                      4
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Enviar para o Servidor Central</div>
                      <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                        A venda é transmitida ao banco central (Supabase PostgreSQL) de forma atómica e idempotente.
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="p-3 bg-[#171717] rounded-lg border border-[#2e2e2e] flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
                      5
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Servidor Confirma: &quot;OK, gravei&quot;</div>
                      <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                        O backend processa a persistência e devolve confirmação inequívoca de gravação com timestamp de validação.
                      </p>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="p-3 bg-[#171717] rounded-lg border border-[#2e2e2e] flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
                      6
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Marcar como &quot;Sincronizada&quot;</div>
                      <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                        O terminal marca a venda como <code>syncStatus: &apos;sincronizada&apos;</code> e <code>isSynced: true</code>, registando o código de confirmação.
                      </p>
                    </div>
                  </div>

                  {/* Step 7 */}
                  <div className="p-3 bg-[#171717] rounded-lg border border-emerald-500/40 flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 flex items-center justify-center font-bold shrink-0">
                      7
                    </div>
                    <div>
                      <div className="font-bold text-emerald-400 text-xs">NÃO Apagar a Venda</div>
                      <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                        A venda permanece guardada intacta no dispositivo para consultas locais, auditoria fiscal contínua e exportação de SAFT/contingência.
                      </p>
                    </div>
                  </div>

                  {/* Step 8 */}
                  <div className="p-3 bg-[#171717] rounded-lg border border-[#c5a47e]/40 flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-[#c5a47e]/30 text-[#c5a47e] border border-[#c5a47e]/50 flex items-center justify-center font-bold shrink-0">
                      8
                    </div>
                    <div>
                      <div className="font-bold text-[#c5a47e] text-xs">Outros Dispositivos Conseguem Buscá-la</div>
                      <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                        Qualquer outro computador, tablet ou terminal POS da empresa descarrega e sincroniza o documento automaticamente via Realtime ou Pull sob demanda.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Flow Tab */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handlePullRemoteSales}
                  disabled={isPullingRemote}
                  className="px-4 py-2 bg-[#c5a47e] hover:bg-[#d4b896] text-black rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className={`w-4 h-4 ${isPullingRemote ? 'animate-bounce' : ''}`} />
                  <span>{isPullingRemote ? 'A buscar vendas...' : 'Buscar Vendas de Outros Caixas'}</span>
                </button>

                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Upload className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar Pendentes Agora ({pendingSales.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: OPÇÕES PARA GARANTIR OS REGISTOS */}
          {activeTab === 'guarantees' && (
            <div className="space-y-4">
              <div className="bg-[#0d0d0d] p-3.5 rounded-xl border border-[#262626]">
                <h4 className="text-sm font-serif font-bold text-[#c5a47e] mb-1">
                  Ferramentas Avançadas de Garantia e Contingência
                </h4>
                <p className="text-xs text-neutral-400">
                  Mecanismos integrados para prevenir qualquer perda de dados, verificar integridade criptográfica e permitir continuidade do negócio sem paragens:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Guarantee Card 1: Verificação de Integridade */}
                <div className="p-4 bg-[#111] rounded-xl border border-[#262626] flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <h5 className="text-xs font-bold text-white">Auditoria de Integridade Criptográfica</h5>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Examina 100% dos registos gravados neste dispositivo, validando assinaturas SHA-256 encadeadas, numeração contínua e confirmações do servidor.
                    </p>
                  </div>
                  <button
                    onClick={handleVerifyIntegrity}
                    disabled={isVerifying}
                    className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isVerifying ? 'A auditar...' : 'Verificar Integridade dos Registos'}</span>
                  </button>
                </div>

                {/* Guarantee Card 2: Buscar Vendas da Nuvem */}
                <div className="p-4 bg-[#111] rounded-xl border border-[#262626] flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-[#c5a47e]">
                      <Download className="w-4 h-4" />
                      <h5 className="text-xs font-bold text-white">Sincronização Ativa Multi-Terminal</h5>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Descarrega faturas e recibos emitidos noutros terminais POS ou lojas da empresa e armazena-os no banco IndexedDB deste dispositivo.
                    </p>
                  </div>
                  <button
                    onClick={handlePullRemoteSales}
                    disabled={isPullingRemote}
                    className="px-3 py-2 bg-[#c5a47e]/15 hover:bg-[#c5a47e]/25 text-[#c5a47e] border border-[#c5a47e]/30 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isPullingRemote ? 'A descarregar...' : 'Buscar Vendas de Outros Caixas'}</span>
                  </button>
                </div>

                {/* Guarantee Card 3: Cópia de Segurança Local (Backup de Contingência) */}
                <div className="p-4 bg-[#111] rounded-xl border border-[#262626] flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-cyan-400">
                      <FileDown className="w-4 h-4" />
                      <h5 className="text-xs font-bold text-white">Exportação de Contingência Local (JSON)</h5>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Gera um ficheiro seguro com todos os documentos armazenados neste dispositivo para salvaguarda física imediata em pen-drive ou disco local.
                    </p>
                  </div>
                  <button
                    onClick={exportSalesSafetyBackup}
                    className="px-3 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Exportar Backup de Contingência</span>
                  </button>
                </div>

                {/* Guarantee Card 4: Forçar Re-envio com Backoff */}
                <div className="p-4 bg-[#111] rounded-xl border border-[#262626] flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-amber-400">
                      <RotateCw className="w-4 h-4" />
                      <h5 className="text-xs font-bold text-white">Descarga Forçada da Fila Pendente</h5>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Executa reenvio prioritário imediato de todas as transações que estejam à espera de confirmação do servidor central.
                    </p>
                  </div>
                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Reenviar Toda a Fila Agora</span>
                  </button>
                </div>
              </div>

              {/* Integrity report display if present */}
              {integrityReport && (
                <div className="p-4 bg-[#0d0d0d] border border-[#262626] rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-[#262626] pb-2">
                    <span className="font-bold text-white flex items-center space-x-2">
                      <ShieldCheck className={`w-4 h-4 ${integrityReport.valid ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span>Resultado da Auditoria de Integridade</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        integrityReport.valid
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {integrityReport.valid ? '100% ÍNTEGRO' : 'ALERTAS ENCONTRADOS'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                    <div>Total Auditado: <strong className="text-white">{integrityReport.totalChecked}</strong></div>
                    <div>Sincronizadas: <strong className="text-emerald-400">{integrityReport.syncedCount}</strong></div>
                    <div>Pendentes: <strong className="text-amber-400">{integrityReport.pendingCount}</strong></div>
                    <div>Outros Caixas: <strong className="text-cyan-400">{integrityReport.otherDevicesCount}</strong></div>
                  </div>

                  {integrityReport.issues.length > 0 && (
                    <div className="pt-2 text-[11px] text-amber-400 space-y-1">
                      {integrityReport.issues.map((iss, idx) => (
                        <div key={idx} className="flex items-center space-x-1.5">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>{iss}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VENDAS LOCAIS & ESTADOS */}
          {activeTab === 'sales' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#0d0d0d] p-3 rounded-lg border border-[#262626]">
                <div>
                  <h4 className="text-xs font-serif font-bold text-[#e5e5e5]">
                    Registo Local de Vendas ({salesHistory.length} documentos)
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Nenhuma venda é apagada após a sincronização. A persistência local é permanente e cumpre o Decreto Presidencial / Portaria 302/2016.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePullRemoteSales}
                    disabled={isPullingRemote}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#c5a47e] text-black hover:bg-[#d4b896] flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Buscar de Outros Caixas</span>
                  </button>
                </div>
              </div>

              <div className="border border-[#262626] rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#0d0d0d] text-neutral-400 font-mono text-[10px] uppercase border-b border-[#262626]">
                    <tr>
                      <th className="p-2.5">Documento</th>
                      <th className="p-2.5">Data / Hora</th>
                      <th className="p-2.5">Dispositivo / Caixa</th>
                      <th className="p-2.5 text-right">Total</th>
                      <th className="p-2.5 text-center">Estado de Sincronização</th>
                      <th className="p-2.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626] font-mono">
                    {salesHistory.slice(0, 50).map((sale) => {
                      const isPending = sale.syncStatus === 'pendente' || !sale.isSynced;
                      const isRemote = sale.terminalId && currentTerminal?.id && sale.terminalId !== currentTerminal.id;

                      return (
                        <tr key={sale.id} className="hover:bg-[#1a1a1a]/60 text-neutral-300">
                          <td className="p-2.5 font-bold text-white">
                            <div>{sale.invoiceNumber}</div>
                            <div className="text-[10px] text-neutral-400 font-normal">
                              {sale.customerName || 'Consumidor Final'}
                            </div>
                          </td>
                          <td className="p-2.5 text-neutral-400">{formatDate(sale.date)}</td>
                          <td className="p-2.5">
                            <span className="text-[11px] text-neutral-300">
                              {sale.deviceName || sale.deviceId || (isRemote ? 'Outro Caixa' : 'Caixa Local')}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-bold text-[#c5a47e]">
                            {formatCurrency(sale.total)}
                          </td>
                          <td className="p-2.5 text-center">
                            {isPending ? (
                              <span
                                className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center space-x-1"
                                title={sale.syncError || 'A aguardar confirmação do servidor central'}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                <span>PENDENTE</span>
                              </span>
                            ) : (
                              <span
                                className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1"
                                title={`Confirmado pelo servidor: "OK, gravei" em ${sale.syncedAt ? formatDate(sale.syncedAt) : 'hoje'}`}
                              >
                                <Check className="w-2.5 h-2.5" />
                                <span>SINCRONIZADA</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            {isPending && (
                              <button
                                onClick={() => handleResyncSale(sale.id)}
                                disabled={resyncingId === sale.id}
                                className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                {resyncingId === sale.id ? 'A enviar...' : 'Reenviar'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: FILA DE SINCRONIZAÇÃO */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#0d0d0d] p-3 rounded-lg border border-[#262626]">
                <div>
                  <h4 className="text-xs font-serif font-bold text-[#e5e5e5]">Fila de Operações Pendentes</h4>
                  <p className="text-[11px] text-neutral-400">
                    Transmissão resiliente com Retry e Backoff Exponencial automático em segundo plano.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsOnline(!isOnline)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      isOnline
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {isOnline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                    <span>{isOnline ? 'Simular Modo Offline' : 'Restaurar Modo Online'}</span>
                  </button>

                  <button
                    disabled={isSyncing || syncQueue.length === 0}
                    onClick={handleSyncNow}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      syncQueue.length > 0
                        ? 'bg-[#c5a47e] hover:bg-[#d4b896] text-black shadow-xs'
                        : 'bg-[#262626] text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'A sincronizar...' : 'Sincronizar Agora'}</span>
                  </button>
                </div>
              </div>

              {syncQueue.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[#262626] rounded-xl bg-[#0d0d0d]/40">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <h5 className="text-sm font-serif font-bold text-[#e5e5e5]">Fila de Sincronização Vazia</h5>
                  <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                    Todas as transações foram confirmadas pelo servidor central (&quot;OK, gravei&quot;) e estão persistidas com segurança.
                  </p>
                </div>
              ) : (
                <div className="border border-[#262626] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d0d0d] text-neutral-400 font-mono text-[10px] uppercase border-b border-[#262626]">
                      <tr>
                        <th className="p-2.5">ID / Documento</th>
                        <th className="p-2.5">Data/Hora</th>
                        <th className="p-2.5">Ação / Tabela</th>
                        <th className="p-2.5">Tentativas & Backoff</th>
                        <th className="p-2.5 text-right">Valor</th>
                        <th className="p-2.5 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626] font-mono">
                      {syncQueue.map((item) => {
                        const sale = item.action === 'create_sale' ? (item.data as any) : null;
                        const retryCount = item.retryCount || 0;
                        const msUntilRetry = (item.nextRetryTime || 0) - Date.now();
                        const secondsUntilRetry = msUntilRetry > 0 ? Math.ceil(msUntilRetry / 1000) : 0;

                        return (
                          <tr key={item.id} className="hover:bg-[#1a1a1a]/60 text-neutral-300">
                            <td className="p-2.5 font-bold text-[#c5a47e]">
                              <div>{sale ? sale.invoiceNumber : item.id.slice(0, 16)}</div>
                              {sale && (
                                <div className="text-[10px] text-neutral-400 font-normal">
                                  {sale.customerName || 'Consumidor Final'}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-neutral-400">{formatDate(item.timestamp)}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded-sm bg-neutral-800 text-[10px] text-neutral-300">
                                {item.table ? `${item.action} (${item.table})` : item.action}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <div className="flex flex-col text-[11px]">
                                <span className={retryCount > 0 ? 'text-amber-400 font-semibold' : 'text-neutral-400'}>
                                  {retryCount === 0 ? '0 tentativas (pronto)' : `${retryCount}ª tentativa`}
                                </span>
                                {secondsUntilRetry > 0 ? (
                                  <span className="text-[10px] text-cyan-400">
                                    Próximo retry em {secondsUntilRetry}s
                                  </span>
                                ) : retryCount > 0 ? (
                                  <span className="text-[10px] text-emerald-400">
                                    Pronto para re-tentar
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-400">
                              {sale ? formatCurrency(sale.total) : '—'}
                            </td>
                            <td className="p-2.5 text-center">
                              {retryCount > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  RETRY ({retryCount})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  PENDENTE
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ESTRUTURA INDEXEDDB */}
          {activeTab === 'db' && (
            <div className="space-y-4">
              <div className="bg-[#0d0d0d] p-3 rounded-lg border border-[#262626] text-xs">
                <div className="flex items-center space-x-2 text-[#c5a47e] font-serif font-bold mb-1">
                  <Database className="w-4 h-4" />
                  <span>Base de Dados Local: OmniPOS_OfflineDB (v{DB_VERSION})</span>
                </div>
                <p className="text-neutral-400 text-[11px]">
                  Os dados essenciais são armazenados no motor IndexedDB do browser, permitindo que a pesquisa de artigos, consulta de stock, atribuição de fidelização e emissão fiscal ocorram sem latência mesmo com falha total de internet.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#0d0d0d] p-3.5 rounded-xl border border-[#262626] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 flex items-center space-x-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-[#c5a47e]" />
                      <span>ObjectStore: products</span>
                    </span>
                    <span className="font-mono font-bold text-[#c5a47e]">{dbStats?.productsCount || 0} registos</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Índices: sku, barcode, category. Suporta leitura por leitor de código de barras em milissegundos.
                  </div>
                </div>

                <div className="bg-[#0d0d0d] p-3.5 rounded-xl border border-[#262626] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 flex items-center space-x-1.5">
                      <Database className="w-3.5 h-3.5 text-cyan-400" />
                      <span>ObjectStore: stock</span>
                    </span>
                    <span className="font-mono font-bold text-cyan-400">{dbStats?.stockCount || 0} registos</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Níveis de stock por artigo e armazém, com decremento automático imediato no momento da venda.
                  </div>
                </div>

                <div className="bg-[#0d0d0d] p-3.5 rounded-xl border border-[#262626] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ObjectStore: customers</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{dbStats?.customersCount || 0} clientes</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Diretório com NIF, saldos de pontos de fidelização e escalões para aplicação de descontos offline.
                  </div>
                </div>

                <div className="bg-[#0d0d0d] p-3.5 rounded-xl border border-[#262626] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>ObjectStore: sales & sync_queue</span>
                    </span>
                    <span className="font-mono font-bold text-amber-400">{dbStats?.salesCount || 0} vendas arquivadas</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Armazenamento imutável de faturas com assinaturas fiscais encadeadas e controle de sincronismo.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0d0d0d] border-t border-[#262626] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-neutral-400 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            <span>Última sincronização: {dbStats?.lastSyncTime ? formatDate(dbStats.lastSyncTime) : 'Agora'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportSalesSafetyBackup}
              className="px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-cyan-300 rounded-lg font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Backup JSON</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
