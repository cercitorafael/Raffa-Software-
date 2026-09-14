import React, { useState, useEffect } from 'react';
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
  Hash,
  RefreshCw,
  Trash2,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/crypto';
import { OfflineSyncQueueItem } from '../../types';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    isOnline,
    setIsOnline,
    syncQueue,
    nextRetryTime,
    triggerManualSync,
    retryFailedOfflineOperations,
    clearSyncedOfflineQueue,
    verifyOfflineQueueIntegrity,
    refreshOfflineQueue,
    isSyncing,
    dbStats,
    salesHistory,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'queue' | 'db' | 'sw'>('queue');
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'failed' | 'synced'>('all');
  const [integrityState, setIntegrityState] = useState<{ checked: boolean; valid: boolean; total: number; corrupted: number } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (isOpen) {
      refreshOfflineQueue();
      const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, refreshOfflineQueue]);

  if (!isOpen) return null;

  const handleSyncNow = async (forceImmediate = true) => {
    setSyncStatusMsg('A estabelecer sincronização com Supabase (validação de Checksums & Sequência FIFO)...');
    try {
      await triggerManualSync({ ignoreBackoff: forceImmediate });
      setSyncStatusMsg('Sincronização concluída com sucesso! Todos os registos foram persistidos.');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch {
      setSyncStatusMsg('Erro ao sincronizar. O mecanismo de retry exponencial reagendará a tentativa automaticamente.');
    }
  };

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyOfflineQueueIntegrity();
      setIntegrityState({ checked: true, ...result });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRetryFailed = async () => {
    const count = await retryFailedOfflineOperations();
    setSyncStatusMsg(`${count} operações com falha foram redefinidas para nova tentativa.`);
    setTimeout(() => setSyncStatusMsg(null), 4000);
  };

  const handleClearSynced = async () => {
    const count = await clearSyncedOfflineQueue();
    setSyncStatusMsg(`${count} operações sincronizadas foram limpas da fila local.`);
    setTimeout(() => setSyncStatusMsg(null), 4000);
  };

  const offlineSalesCount = salesHistory.filter((s) => s.isOfflineCreated).length;

  const pendingCount = syncQueue.filter((q) => q.status === 'pending' || !q.status).length;
  const failedCount = syncQueue.filter((q) => q.status === 'failed').length;
  const syncedCount = syncQueue.filter((q) => q.status === 'synced').length;

  const filteredQueue = syncQueue.filter((item) => {
    if (filterStatus === 'pending') return item.status === 'pending' || !item.status;
    if (filterStatus === 'failed') return item.status === 'failed';
    if (filterStatus === 'synced') return item.status === 'synced';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#262626] rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] text-[#e5e5e5] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-serif font-bold text-[#c5a47e]">Fila Local IndexedDB & Sincronização Supabase</h3>
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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Rigor: SHA-256 + FIFO
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                Garantia de integridade transacional, hash criptográfico e reenvio ordenado para Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-[#262626] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Diagnostic Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#0a0a0a] border-b border-[#262626] text-xs">
          <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center space-x-2.5">
            <Radio className={`w-4 h-4 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Estado da Rede</div>
              <div className="font-mono font-bold text-[#e5e5e5]">{isOnline ? 'Ligado ao Supabase' : 'Modo Desconectado'}</div>
            </div>
          </div>

          <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center space-x-2.5">
            <Layers className="w-4 h-4 text-[#c5a47e]" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Fila IndexedDB</div>
              <div className="font-mono font-bold text-[#c5a47e]">
                {pendingCount} pendentes {failedCount > 0 && <span className="text-red-400">({failedCount} falhas)</span>}
              </div>
            </div>
          </div>

          <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center space-x-2.5">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Catálogo Cacheado</div>
              <div className="font-mono font-bold text-cyan-400">{dbStats?.productsCount || 0} produtos</div>
            </div>
          </div>

          <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Vendas Offline</div>
              <div className="font-mono font-bold text-emerald-400">{offlineSalesCount} emitidas</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#262626] px-4 bg-[#0d0d0d] gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'queue'
                ? 'border-[#c5a47e] text-[#c5a47e]'
                : 'border-transparent text-neutral-400 hover:text-[#e5e5e5]'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Fila de Sincronização ({syncQueue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('db')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'db'
                ? 'border-[#c5a47e] text-[#c5a47e]'
                : 'border-transparent text-neutral-400 hover:text-[#e5e5e5]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Estrutura IndexedDB (v2)</span>
          </button>

          <button
            onClick={() => setActiveTab('sw')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'sw'
                ? 'border-[#c5a47e] text-[#c5a47e]'
                : 'border-transparent text-neutral-400 hover:text-[#e5e5e5]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Service Worker & Cache PWA</span>
          </button>
        </div>

        {/* Status notification if any */}
        {syncStatusMsg && (
          <div className="bg-[#c5a47e]/10 border-b border-[#c5a47e]/30 px-4 py-2 text-xs text-[#c5a47e] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{syncStatusMsg}</span>
            </div>
            <button onClick={() => setSyncStatusMsg(null)} className="text-[#c5a47e] hover:text-white">
              &times;
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#0d0d0d] p-3 rounded-lg border border-[#262626]">
                <div>
                  <h4 className="text-xs font-serif font-bold text-[#e5e5e5]">Fila Transacional Ordenada (IndexedDB)</h4>
                  <p className="text-[11px] text-neutral-400">
                    Operações ordenadas por número sequencial monotónico (FIFO) com verificação de integridade via checksum SHA-256.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleVerifyIntegrity}
                    disabled={isVerifying || syncQueue.length === 0}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#333] hover:bg-[#262626] text-neutral-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title="Verificar checksums de todas as operações na fila"
                  >
                    <FileCheck className={`w-3.5 h-3.5 text-cyan-400 ${isVerifying ? 'animate-pulse' : ''}`} />
                    <span>{isVerifying ? 'A verificar...' : 'Validar Checksums'}</span>
                  </button>

                  {failedCount > 0 && (
                    <button
                      onClick={handleRetryFailed}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-950/40 border border-red-800 text-red-300 hover:bg-red-900/50 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reprocessar Falhas ({failedCount})</span>
                    </button>
                  )}

                  {syncedCount > 0 && (
                    <button
                      onClick={handleClearSynced}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar Sincronizados ({syncedCount})</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsOnline(!isOnline)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
                      isOnline
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {isOnline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                    <span>{isOnline ? 'Simular Offline' : 'Restaurar Online'}</span>
                  </button>

                  <button
                    disabled={isSyncing || pendingCount === 0}
                    onClick={() => handleSyncNow(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                      pendingCount > 0
                        ? 'bg-[#c5a47e] hover:bg-[#d4b896] text-black shadow-xs cursor-pointer'
                        : 'bg-[#262626] text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'A sincronizar...' : `Sincronizar (${pendingCount})`}</span>
                  </button>
                </div>
              </div>

              {/* Integrity status card if verified */}
              {integrityState && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                    integrityState.valid
                      ? 'bg-emerald-950/20 border-emerald-800 text-emerald-300'
                      : 'bg-red-950/20 border-red-800 text-red-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {integrityState.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    <span>
                      {integrityState.valid
                        ? `Validação de integridade concluída: ${integrityState.total} registos com hash SHA-256 válido e ordenação intacta.`
                        : `Alerta: ${integrityState.corrupted} de ${integrityState.total} registos apresentam discrepâncias no checksum.`}
                    </span>
                  </div>
                  <button
                    onClick={() => setIntegrityState(null)}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Status Filter Bar */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-1 bg-[#0d0d0d] p-1 rounded-lg border border-[#262626]">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      filterStatus === 'all'
                        ? 'bg-[#262626] text-white font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Todos ({syncQueue.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      filterStatus === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Pendentes ({pendingCount})
                  </button>
                  {failedCount > 0 && (
                    <button
                      onClick={() => setFilterStatus('failed')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        filterStatus === 'failed'
                          ? 'bg-red-500/20 text-red-300 font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Com Falha ({failedCount})
                    </button>
                  )}
                  {syncedCount > 0 && (
                    <button
                      onClick={() => setFilterStatus('synced')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        filterStatus === 'synced'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Sincronizados ({syncedCount})
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-neutral-500 font-mono">
                  IndexedDB: sync_queue &bull; Auto-Retry &bull; FIFO
                </div>
              </div>

              {/* Exponential Retry Scheduler Active Banner */}
              {failedCount > 0 && isOnline && nextRetryTime && nextRetryTime > currentTime && (
                <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                    <span>
                      <strong>Retry Exponencial Ativo:</strong> Próxima tentativa automática agendada em{' '}
                      <span className="font-mono font-bold text-amber-200">
                        {Math.max(1, Math.ceil((nextRetryTime - currentTime) / 1000))}s
                      </span>{' '}
                      (Base 1.5s &bull; Fator 2x &bull; Jitter 20% &bull; Teto 32s).
                    </span>
                  </div>
                  <button
                    onClick={() => handleSyncNow(true)}
                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-amber-200 transition-colors shrink-0 ml-2 cursor-pointer"
                  >
                    Tentar Agora
                  </button>
                </div>
              )}

              {filteredQueue.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[#262626] rounded-xl bg-[#0d0d0d]/40">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <h5 className="text-sm font-serif font-bold text-[#e5e5e5]">Nenhuma operação nesta vista</h5>
                  <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                    {syncQueue.length === 0
                      ? 'Todas as transações do POS e turnos de caixa foram sincronizados com o Supabase com garantia de integridade.'
                      : 'Não há registos correspondentes ao filtro selecionado.'}
                  </p>
                </div>
              ) : (
                <div className="border border-[#262626] rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-[#0d0d0d] text-neutral-400 font-mono text-[10px] uppercase border-b border-[#262626]">
                      <tr>
                        <th className="p-2.5 w-12 text-center">FIFO</th>
                        <th className="p-2.5">ID / Documento</th>
                        <th className="p-2.5">Tabela Supabase</th>
                        <th className="p-2.5">Data/Hora</th>
                        <th className="p-2.5">Operação / Detalhes</th>
                        <th className="p-2.5 text-center">Checksum</th>
                        <th className="p-2.5 text-right">Valor</th>
                        <th className="p-2.5 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626] font-mono">
                      {filteredQueue.map((item) => {
                        const sale = item.action === 'create_sale' ? (item.data as any) : null;
                        const shift = item.table === 'turnos_caixa' ? (item.data as any) : null;
                        const status = item.status || 'pending';

                        return (
                          <tr key={item.id} className="hover:bg-[#1a1a1a]/60 text-neutral-300">
                            <td className="p-2.5 text-center text-neutral-400 font-bold">
                              {item.sequence !== undefined ? `#${item.sequence}` : '—'}
                            </td>
                            <td className="p-2.5 font-bold text-[#c5a47e]">
                              {sale ? sale.invoiceNumber : shift ? `Turno ${shift.id.slice(0, 8)}` : item.id.slice(0, 16)}
                            </td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded-sm bg-neutral-800 text-[10px] text-cyan-300 border border-neutral-700">
                                {item.table || (sale ? 'vendas' : 'sistema')}
                              </span>
                            </td>
                            <td className="p-2.5 text-neutral-400">{formatDate(item.timestamp)}</td>
                            <td className="p-2.5 text-[#e5e5e5]">
                              {sale
                                ? `${sale.customerName || 'Consumidor Final'} (${sale.items?.length || 0} itens)`
                                : shift
                                ? `Operador: ${shift.operatorName || 'Caixa'} (${shift.status})`
                                : item.action}
                              {item.errorMessage && (
                                <div className="text-[10px] text-red-400 flex items-center space-x-1 mt-0.5">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>{item.errorMessage}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-mono text-[10px] text-neutral-400">
                              {item.checksum ? (
                                <span
                                  className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-emerald-400"
                                  title={`Checksum SHA-256 completo: ${item.checksum}`}
                                >
                                  {item.checksum.slice(0, 8)}…
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-400">
                              {sale ? formatCurrency(sale.total) : '—'}
                            </td>
                            <td className="p-2.5 text-center">
                              {status === 'pending' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  PENDENTE
                                </span>
                              )}
                              {status === 'syncing' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center space-x-1 justify-center">
                                  <RotateCw className="w-2.5 h-2.5 animate-spin" />
                                  <span>A ENVIAR</span>
                                </span>
                              )}
                              {status === 'synced' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  SINCRONIZADO
                                </span>
                              )}
                              {status === 'failed' && (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/30"
                                    title={`Tentativas: ${item.retryCount || 0} | Delay calculado: ${item.backoffDelayMs ? (item.backoffDelayMs / 1000).toFixed(1) + 's' : '—'}`}
                                  >
                                    FALHA ({item.retryCount || 0})
                                  </span>
                                  {item.nextRetryTimestamp && isOnline && (
                                    <span className="text-[9px] font-mono text-amber-400/90 whitespace-nowrap">
                                      {item.nextRetryTimestamp > currentTime
                                        ? `Retry em ${Math.max(1, Math.ceil((item.nextRetryTimestamp - currentTime) / 1000))}s`
                                        : 'Aguardando retry'}
                                    </span>
                                  )}
                                  {!isOnline && (
                                    <span className="text-[9px] font-mono text-neutral-400 whitespace-nowrap">
                                      Ao reconectar
                                    </span>
                                  )}
                                </div>
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

          {activeTab === 'db' && (
            <div className="space-y-4">
              <div className="bg-[#0d0d0d] p-3 rounded-lg border border-[#262626] text-xs">
                <div className="flex items-center space-x-2 text-[#c5a47e] font-serif font-bold mb-1">
                  <Database className="w-4 h-4" />
                  <span>Base de Dados Local: OmniPOS_OfflineDB (v2)</span>
                </div>
                <p className="text-neutral-400 text-[11px]">
                  Os dados essenciais são armazenados no motor IndexedDB do browser com esquema relacional local, permitindo que a pesquisa de artigos, consulta de stock, emissão fiscal encadeada e turnos ocorram sem latência mesmo com falha total de internet.
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
                    Índices: sku, barcode, category, name. Suporta leitura por scanner de código de barras em milissegundos.
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
                      <span>ObjectStore: sync_queue (v2 Rigoroso)</span>
                    </span>
                    <span className="font-mono font-bold text-amber-400">{syncQueue.length} operações enfileiradas</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Controle estrito com índice sequencial `sequence` (FIFO), `checksum` SHA-256 e status de reenvio.
                  </div>
                </div>

                <div className="bg-[#0d0d0d] p-3.5 rounded-xl border border-[#262626] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>ObjectStore: shifts</span>
                    </span>
                    <span className="font-mono font-bold text-purple-400">Turnos de Caixa Ativos</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Persistência de aberturas, fechos e movimentos de caixa (sangrias/suprimentos) mesmo sem conexão.
                  </div>
                </div>

                <div className="bg-[#0d0d0d] p-3.5 rounded-xl border border-[#262626] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 flex items-center space-x-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ObjectStore: sales</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{dbStats?.salesCount || 0} faturas</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Assinatura fiscal encadeada RSA com hash precedente preservado integralmente para validação da AT.
                  </div>
                </div>

                <div className="sm:col-span-2 bg-[#0d0d0d] p-3.5 rounded-xl border border-amber-500/30 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-amber-300 font-bold flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Algoritmo de Retry Exponencial & Recuperação Automática</span>
                    </span>
                    <span className="font-mono text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60">
                      Base 1.5s &bull; Max 32s &bull; Jitter 20%
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 leading-relaxed">
                    Quando a sincronização com o Supabase falha por oscilação de rede, cada transação entra em retenção com backoff exponencial truncado: <code className="text-amber-300">delay = min(baseDelay * (2^attempts) + jitter, 32s)</code>. Ao ser restabelecida a ligação à internet ou confirmada a acessibilidade do Supabase via health-check, os temporizadores são resetados imediatamente para envio prioritário de todas as transações pendentes respeitando a ordem FIFO estrita.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sw' && (
            <div className="space-y-4">
              <div className="bg-[#0d0d0d] p-3 rounded-lg border border-[#262626] text-xs space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-serif font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>Service Worker Ativo: omnipos-cache-v1</span>
                </div>
                <p className="text-neutral-400 text-[11px]">
                  O Service Worker interceta todos os pedidos de ficheiros (HTML, CSS, JavaScript, fontes e assets) e serve-os a partir da Cache API quando a ligação à internet falha.
                </p>
              </div>

              <div className="border border-[#262626] rounded-xl p-4 bg-[#0d0d0d] space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-[#262626] pb-2">
                  <span className="text-neutral-400">Estratégia de Cache para SPA:</span>
                  <span className="font-mono text-emerald-400 font-bold">Network-First (Fallback to Cache)</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#262626] pb-2">
                  <span className="text-neutral-400">Estratégia para Ativos Estáticos / Fontes:</span>
                  <span className="font-mono text-cyan-400 font-bold">Stale-While-Revalidate</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#262626] pb-2">
                  <span className="text-neutral-400">Background Sync Manager:</span>
                  <span className="font-mono text-[#c5a47e] font-bold">Ativado (tag: sync-pos-sales)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Suporte a Instalação PWA:</span>
                  <span className="font-mono text-emerald-400 font-bold">Manifest.json Configurado</span>
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
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
