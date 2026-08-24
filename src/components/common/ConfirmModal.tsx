import React from 'react';
import { AlertTriangle, Trash2, X, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, closeConfirm } = useApp();

  if (!confirmDialog || !confirmDialog.isOpen) return null;

  const isDestructive = confirmDialog.isDestructive !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[#e5e5e5]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#262626]">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isDestructive
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-[#c5a47e]/10 border-[#c5a47e]/30 text-[#c5a47e]'
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-neutral-100">
                {confirmDialog.title}
              </h3>
              <span className="text-[11px] font-mono text-neutral-400">
                Confirmação de Operação
              </span>
            </div>
          </div>
          <button
            onClick={closeConfirm}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-300 leading-relaxed">
            {confirmDialog.message}
          </p>

          {confirmDialog.itemDetails && (
            <div className="p-3 bg-[#0a0a0a] rounded-xl border border-[#262626] text-xs font-mono text-neutral-300">
              {confirmDialog.itemDetails}
            </div>
          )}

          {isDestructive && (
            <div className="flex items-center space-x-2 text-[11px] text-rose-400/90 bg-rose-500/5 p-2.5 rounded-lg border border-rose-500/20">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Esta operação é irreversível e atualizará a auditoria do sistema.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-4 bg-[#0e0e0e] border-t border-[#262626]">
          <button
            type="button"
            onClick={closeConfirm}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            {confirmDialog.cancelLabel || 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={confirmDialog.onConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-[#c5a47e] hover:bg-[#b5946e] text-black'
            }`}
          >
            {isDestructive ? <Trash2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            <span>{confirmDialog.confirmLabel || (isDestructive ? 'Eliminar Definitivamente' : 'Confirmar')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
