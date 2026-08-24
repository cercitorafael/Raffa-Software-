import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SystemEvent } from '../../types';
import {
  Activity,
  Search,
  Filter,
  Trash2,
  Play,
  CheckCircle2,
  Clock,
  Terminal,
  Zap,
  Server,
  Radio,
  Layers,
  Sparkles,
  Edit2,
  Plus,
  RotateCw,
  X,
  FileJson,
} from 'lucide-react';

export const EventBusModule: React.FC = () => {
  const {
    events,
    emitEvent,
    updateEvent,
    deleteEvent,
    reprocessEvent,
    clearEvents,
    hasPermission,
    requestConfirm,
    notify,
  } = useApp();

  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(events[0] || null);
  const [serviceFilter, setServiceFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Emit / Edit Event Modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SystemEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    service: 'POS' as SystemEvent['service'],
    eventType: 'pos.sale.completed',
    payloadJson: JSON.stringify({ saleId: 'sale-001', amount: 45.50, timestamp: new Date().toISOString() }, null, 2),
  });

  const services = ['todos', 'POS', 'Stock', 'Financeiro', 'RH', 'Compras', 'CRM'];

  const filteredEvents = events.filter((evt) => {
    const matchesService = serviceFilter === 'todos' || evt.service === serviceFilter;
    const matchesSearch =
      evt.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(evt.payload).toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.service.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesService && matchesSearch;
  });

  const handleEmitTestEvent = () => {
    const sampleTypes = [
      { service: 'POS' as const, type: 'pos.terminal.heartbeat', payload: { terminalId: 'POS-01', latencyMs: 14 } },
      { service: 'Stock' as const, type: 'stock.inventory.auto_reorder_triggered', payload: { sku: 'ALIM-001', reorderQty: 50 } },
      { service: 'Financeiro' as const, type: 'finance.vat.auto_reconciled', payload: { period: '08/2026', totalIva: 450.80 } },
      { service: 'CRM' as const, type: 'crm.customer.tier_promoted', payload: { customerId: 'cust-1', newTier: 'Platina' } },
    ];
    const picked = sampleTypes[Math.floor(Math.random() * sampleTypes.length)];
    emitEvent(picked.service, picked.type, {
      ...picked.payload,
      triggeredAt: new Date().toISOString(),
      source: 'EventBus Test Console',
    });
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    let parsedPayload: any = {};
    try {
      parsedPayload = JSON.parse(eventForm.payloadJson);
    } catch (err) {
      notify('O Payload deve ser um JSON válido!', 'warning');
      return;
    }

    if (editingEvent) {
      updateEvent(editingEvent.id, {
        service: eventForm.service,
        eventType: eventForm.eventType,
        payload: parsedPayload,
      });
      setEditingEvent(null);
    } else {
      emitEvent(eventForm.service, eventForm.eventType, parsedPayload);
      setShowEventModal(false);
    }
  };

  const getServiceColor = (service: SystemEvent['service']) => {
    switch (service) {
      case 'POS':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Stock':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Financeiro':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'RH':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Compras':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'CRM':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-[#e5e5e5] overflow-hidden">
      {/* Top Header */}
      <div className="bg-[#0f0f0f] border-b border-[#262626] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-lg font-bold text-white tracking-wide">
              Barramento de Eventos Distribuído (EDA)
            </h1>
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Kafka-Compatible Broker</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Fluxo de telemetria em tempo real, sincronização assíncrona entre microsserviços e auditoria de domínio
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setEditingEvent(null);
              setEventForm({
                service: 'POS',
                eventType: 'pos.manual.event',
                payloadJson: JSON.stringify({ note: 'Evento gerado manualmente', timestamp: new Date().toISOString() }, null, 2),
              });
              setShowEventModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#262626] text-neutral-200 border border-[#333] font-medium rounded-lg text-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Emitir Evento Manual</span>
          </button>

          <button
            onClick={handleEmitTestEvent}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#c5a47e] hover:bg-[#d4b896] text-black font-semibold rounded-lg text-xs transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Disparar Evento Teste</span>
          </button>

          <button
            onClick={() => {
              requestConfirm({
                title: 'Limpar Histórico de Eventos',
                message: 'Tem a certeza que deseja limpar todo o histórico de logs do barramento de eventos?',
                itemDetails: `Total de eventos atuais: ${events.length}`,
                confirmLabel: 'Limpar Todos os Logs',
                isDestructive: true,
                onConfirm: () => {
                  clearEvents();
                },
              });
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-neutral-400 hover:text-rose-400 border border-[#262626] rounded-lg text-xs font-medium transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Logs</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="bg-[#121212] border-b border-[#262626] px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs shrink-0">
        <div className="flex items-center space-x-2.5">
          <Server className="w-4 h-4 text-[#c5a47e]" />
          <div>
            <span className="text-[10px] text-neutral-400 block">Total de Eventos:</span>
            <span className="font-mono font-bold text-white">{events.length}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2.5">
          <Zap className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="text-[10px] text-neutral-400 block">Throughput Estimado:</span>
            <span className="font-mono font-bold text-emerald-400">~120 msgs/min</span>
          </div>
        </div>
        <div className="flex items-center space-x-2.5">
          <Activity className="w-4 h-4 text-blue-400" />
          <div>
            <span className="text-[10px] text-neutral-400 block">Estado do Barramento:</span>
            <span className="font-semibold text-white">Consistente &bull; 0 Falhas</span>
          </div>
        </div>
        <div className="flex items-center space-x-2.5">
          <Layers className="w-4 h-4 text-purple-400" />
          <div>
            <span className="text-[10px] text-neutral-400 block">Tópicos Ativos:</span>
            <span className="font-mono font-bold text-white">7 Serviços</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0f0f0f] border-b border-[#262626] px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Filtrar por tipo, payload, serviço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#171717] border border-[#262626] rounded-md pl-8 pr-3 py-1 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
            />
          </div>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
          <span className="text-[11px] text-neutral-500 mr-1 flex items-center">
            <Filter className="w-3 h-3 mr-1" /> Serviço:
          </span>
          {services.map((svc) => (
            <button
              key={svc}
              onClick={() => setServiceFilter(svc)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                serviceFilter === svc
                  ? 'bg-[#c5a47e] text-black font-semibold'
                  : 'bg-[#171717] text-neutral-400 hover:text-white border border-[#262626]'
              }`}
            >
              {svc.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split-View Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Event Stream Table */}
        <div className="flex-1 overflow-y-auto border-r border-[#262626]">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-[#141414] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5">Serviço</th>
                <th className="px-4 py-2.5">Tipo de Evento</th>
                <th className="px-4 py-2.5">Carimbo Temporal</th>
                <th className="px-4 py-2.5 text-right">Ações CRUD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1c1c]">
              {filteredEvents.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id;
                return (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#1e1a14] border-l-2 border-[#c5a47e]' : 'hover:bg-[#141414]'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getServiceColor(evt.service)}`}>
                        {evt.service}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-medium text-white">
                      {evt.eventType}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-400 font-mono text-[11px]">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => reprocessEvent(evt.id)}
                          title="Reprocessar Evento"
                          className="p-1 hover:bg-neutral-800 rounded text-emerald-400 cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingEvent(evt);
                            setEventForm({
                              service: evt.service,
                              eventType: evt.eventType,
                              payloadJson: JSON.stringify(evt.payload, null, 2),
                            });
                            setShowEventModal(true);
                          }}
                          title="Editar Evento"
                          className="p-1 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            requestConfirm({
                              title: 'Eliminar Evento',
                              message: `Tem a certeza que deseja eliminar o evento "${evt.eventType}"?`,
                              itemDetails: `ID: ${evt.id} | Serviço: ${evt.service} | Hora: ${new Date(evt.timestamp).toLocaleTimeString()}`,
                              confirmLabel: 'Eliminar Evento',
                              isDestructive: true,
                              onConfirm: () => {
                                deleteEvent(evt.id);
                              },
                            });
                          }}
                          title="Eliminar Evento"
                          className="p-1 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-neutral-500">
                    Nenhum evento encontrado no barramento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Side: Payload Inspection Drawer */}
        <div className="w-96 bg-[#0c0c0c] flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-[#262626] bg-[#121212]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>Inspetor de Payload JSON</span>
            </h2>
          </div>

          {selectedEvent ? (
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1">ID do Evento:</span>
                <div className="font-mono text-xs text-neutral-300 select-all bg-[#141414] p-2 rounded border border-[#262626]">
                  {selectedEvent.id}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1">Tópico / Tipo:</span>
                <div className="font-mono text-xs text-[#c5a47e] bg-[#141414] p-2 rounded border border-[#262626]">
                  {selectedEvent.eventType}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1">Payload Estruturado:</span>
                <pre className="font-mono text-[11px] leading-relaxed text-emerald-400 bg-[#080808] p-3 rounded-lg border border-[#222] overflow-x-auto select-all">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => reprocessEvent(selectedEvent.id)}
                  className="w-full py-2 bg-[#1f1f1f] hover:bg-[#262626] text-neutral-200 border border-[#333] rounded-md text-xs font-medium flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Reprocessar no Barramento</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-neutral-500 text-xs text-center">
              Selecione um evento na lista para inspecionar os metadados e o payload.
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: EMIT / EDIT EVENT ================= */}
      {(showEventModal || editingEvent) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingEvent ? 'Editar Evento' : 'Emitir Evento Manual'}
              </h3>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setEditingEvent(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Serviço de Origem</label>
                <select
                  value={eventForm.service}
                  onChange={(e) => setEventForm({ ...eventForm, service: e.target.value as any })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  <option value="POS">POS (Ponto de Venda)</option>
                  <option value="Stock">Stock & Inventário</option>
                  <option value="Financeiro">Financeiro / Contabilidade</option>
                  <option value="RH">Recursos Humanos</option>
                  <option value="Compras">Compras & Fornecedores</option>
                  <option value="CRM">CRM & Clientes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Tipo de Evento (Tópico)</label>
                <input
                  type="text"
                  required
                  placeholder="ex: pos.sale.completed"
                  value={eventForm.eventType}
                  onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Payload (JSON Válido)</label>
                <textarea
                  rows={6}
                  required
                  value={eventForm.payloadJson}
                  onChange={(e) => setEventForm({ ...eventForm, payloadJson: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md p-3 text-xs text-emerald-400 font-mono focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventModal(false);
                    setEditingEvent(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingEvent ? 'Guardar' : 'Disparar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
