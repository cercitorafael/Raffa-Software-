import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Activity,
  Radio,
  Trash2,
  Maximize2,
  Terminal,
  Layers,
} from 'lucide-react';

export const EventDrawer: React.FC = () => {
  const {
    showEventDrawer,
    setShowEventDrawer,
    events,
    clearEvents,
    setActiveNavTab,
  } = useApp();

  if (!showEventDrawer) return null;

  const getServiceColor = (service: string) => {
    switch (service) {
      case 'POS':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Stock':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Financeiro':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'RH':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'Compras':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'CRM':
        return 'text-pink-400 bg-pink-500/10 border-pink-500/30';
      default:
        return 'text-neutral-300 bg-neutral-800 border-neutral-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setShowEventDrawer(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0e0e0e] border-l border-[#262626] text-[#e5e5e5] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-[#262626] flex items-center justify-between bg-[#121212]">
            <div className="flex items-center space-x-2.5">
              <Activity className="w-4 h-4 text-[#c5a47e]" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                Live Event Bus Feed
              </h2>
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                <span>Active</span>
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  setShowEventDrawer(false);
                  setActiveNavTab('events');
                }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1f1f1f] transition-all cursor-pointer"
                title="Abrir Módulo Completo"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={clearEvents}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-[#1f1f1f] transition-all cursor-pointer"
                title="Limpar Eventos"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowEventDrawer(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1f1f1f] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Events Live Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-[#1c1c1c]">
            {events.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-xs">
                Nenhum evento no barramento. Realize uma operação no POS ou Stock para visualizar.
              </div>
            ) : (
              events.map((evt) => (
                <div key={evt.id} className="pt-2.5 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded font-mono font-bold border ${getServiceColor(evt.service)}`}>
                      {evt.service}
                    </span>
                    <span className="font-mono text-neutral-400">
                      {new Date(evt.timestamp).toLocaleTimeString('pt-PT')}
                    </span>
                  </div>

                  <p className="text-xs font-mono font-bold text-white">
                    {evt.eventType}
                  </p>

                  <div className="p-2 rounded bg-[#080808] border border-[#222222] text-[10px] font-mono text-emerald-300/90 overflow-x-auto max-h-24">
                    <pre>{JSON.stringify(evt.payload, null, 2)}</pre>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className="p-3 bg-[#121212] border-t border-[#262626] text-[10px] text-neutral-400 flex items-center justify-between">
            <span>Total capturado: {events.length} msgs</span>
            <span className="text-[#c5a47e]">EDA Sourcing v1.04</span>
          </div>
        </div>
      </div>
    </div>
  );
};
