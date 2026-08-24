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
  ArrowUpRight,
  ShieldCheck,
  HardDrive,
  Cpu,
  Clock,
  Radio,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/crypto';

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
    isSyncing,
    dbStats,
    salesHistory,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'queue' | 'db' | 'sw'>('queue');
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    setSyncStatusMsg('A estabelecer ligação TLS com o servidor central...');
    try {
      await triggerManualSync();
      setSyncStatusMsg('Sincronização concluída com sucesso! Todos os registos foram persistidos.');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch {
      setSyncStatusMsg('Erro ao sincronizar. A fila permanece intacta no IndexedDB.');
    }
  };

  const offlineSalesCount = salesHistory.filter((s) => s.isOfflineCreated).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#262626] rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh] text-[#e5e5e5] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-serif font-bold text-[#c5a47e]">Gestor de Resiliência Offline & IndexedDB</h3>
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
                Sincronização bidirecional &bull; Portaria 302/2016 AT
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
              <div className="font-mono font-bold text-[#e5e5e5]">{isOnline ? 'Ligado' : 'Desconectado'}</div>
            </div>
          </div>

          <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center space-x-2.5">
            <Layers className="w-4 h-4 text-[#c5a47e]" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Fila Pendente</div>
              <div className="font-mono font-bold text-[#c5a47e]">{syncQueue.length} operações</div>
            </div>
          </div>

          <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center space-x-2.5">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Artigos no Cache</div>
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
            <span>Estrutura IndexedDB</span>
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
                  <h4 className="text-xs font-serif font-bold text-[#e5e5e5]">Operações Gravadas Localmente</h4>
                  <p className="text-[11px] text-neutral-400">
                    Quando offline, as faturas são assinadas via SHA-1/RSA local e enfileiradas no IndexedDB.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsOnline(!isOnline)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                      syncQueue.length > 0
                        ? 'bg-[#c5a47e] hover:bg-[#d4b896] text-black shadow-xs cursor-pointer'
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
                    Todas as transações do POS, movimentos de stock e fechos de caixa foram confirmados e sincronizados com a nuvem central.
                  </p>
                </div>
              ) : (
                <div className="border border-[#262626] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d0d0d] text-neutral-400 font-mono text-[10px] uppercase border-b border-[#262626]">
                      <tr>
                        <th className="p-2.5">ID / Documento</th>
                        <th className="p-2.5">Data/Hora</th>
                        <th className="p-2.5">Ação</th>
                        <th className="p-2.5">Cliente / Detalhes</th>
                        <th className="p-2.5 text-right">Valor</th>
                        <th className="p-2.5 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626] font-mono">
                      {syncQueue.map((item) => {
                        const sale = item.action === 'create_sale' ? (item.data as any) : null;
                        return (
                          <tr key={item.id} className="hover:bg-[#1a1a1a]/60 text-neutral-300">
                            <td className="p-2.5 font-bold text-[#c5a47e]">
                              {sale ? sale.invoiceNumber : item.id.slice(0, 12)}
                            </td>
                            <td className="p-2.5 text-neutral-400">{formatDate(item.timestamp)}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded-sm bg-neutral-800 text-[10px] text-neutral-300">
                                {item.action}
                              </span>
                            </td>
                            <td className="p-2.5 text-[#e5e5e5]">
                              {sale ? `${sale.customerName} (${sale.customerTaxNumber})` : 'Operação de Sistema'}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-400">
                              {sale ? formatCurrency(sale.total) : '—'}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                PENDENTE
                              </span>
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
                  <span>Base de Dados Local: OmniPOS_OfflineDB (v1)</span>
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

          {activeTab === 'sw' && (
            <div className="space-y-4">
              <div className="bg-[#0d0d0d] p-3 rounded-lg border border-[#262626] text-xs space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-serif font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>Service Worker Ativo: omnipos-cache-v1</span>
                </div>
                <p className="text-neutral-400 text-[11px]">
                  O Service Worker interceta todos os pedidos de ficheiros (HTML, CSS, JavaScript, fontes do Google e assets) e serve-os a partir da Cache API quando a ligação à internet falha.
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
            className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
