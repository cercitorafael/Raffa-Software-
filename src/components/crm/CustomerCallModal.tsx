import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  PhoneForwarded,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
  User,
  Building,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Hash,
  Sparkles,
  ArrowRight,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { Customer, CallLog } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/crypto';
import { sound } from '../../utils/audio';

interface CustomerCallModalProps {
  customer?: Customer | null;
  initialPhoneNumber?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerCallModal: React.FC<CustomerCallModalProps> = ({
  customer,
  initialPhoneNumber = '',
  isOpen,
  onClose,
}) => {
  const { addCallLog, currentUser, notify } = useApp();

  // Call status: 'idle' | 'calling' | 'connected' | 'ended'
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('calling');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [dtmfInput, setDtmfInput] = useState<string>('');
  const [callNotes, setCallNotes] = useState<string>('');
  const [outcome, setOutcome] = useState<CallLog['outcome']>('contacto_positivo');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or reset state when opened
  useEffect(() => {
    if (isOpen) {
      const targetPhone = customer?.phone || initialPhoneNumber || '';
      setPhoneNumber(targetPhone);
      setCallDuration(0);
      setIsMuted(false);
      setShowKeypad(false);
      setDtmfInput('');
      setCallNotes('');
      setOutcome('contacto_positivo');

      // Auto start dialing
      setCallState('calling');
      sound.playRingbackTone();

      ringIntervalRef.current = setInterval(() => {
        sound.playRingbackTone();
      }, 3500);

      // Auto-connect after 3 seconds for smooth interactive demo experience
      const connectTimeout = setTimeout(() => {
        if (ringIntervalRef.current) {
          clearInterval(ringIntervalRef.current);
          ringIntervalRef.current = null;
        }
        setCallState('connected');
        sound.playSuccessChime();
      }, 3200);

      return () => {
        clearTimeout(connectTimeout);
        if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isOpen, customer, initialPhoneNumber]);

  // Duration timer when connected
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  if (!isOpen) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleHangUp = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    sound.playCallEndTone();
    setCallState('ended');
  };

  const handleDtmfPress = (digit: string) => {
    sound.playDTMF(digit);
    setDtmfInput((prev) => prev + digit);
  };

  const handleSaveAndClose = () => {
    const customerName = customer?.name || (phoneNumber ? `Contacto (${phoneNumber})` : 'Cliente Não Identificado');
    
    addCallLog({
      customerId: customer?.id,
      customerName,
      customerPhone: phoneNumber,
      durationSeconds: callDuration,
      outcome,
      notes: callNotes.trim() || undefined,
      operatorName: currentUser.name,
      direction: 'saida',
    });

    notify(`Registo da chamada guardado para ${customerName}`, 'success');
    onClose();
  };

  const handleQuickNote = (noteText: string) => {
    setCallNotes((prev) => (prev ? `${prev}. ${noteText}` : noteText));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        id="crm-call-modal"
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              callState === 'calling' ? 'bg-amber-500/20 text-amber-400 animate-pulse' :
              callState === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-slate-800 text-slate-400'
            }`}>
              {callState === 'calling' ? <PhoneCall className="w-5 h-5 animate-bounce" /> :
               callState === 'connected' ? <Phone className="w-5 h-5" /> :
               <PhoneOff className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Central Telefónica CRM</h3>
              <p className="text-xs text-slate-400">
                {callState === 'calling' && 'A estabelecer ligação...'}
                {callState === 'connected' && `Em conversação ativa • ${formatTimer(callDuration)}`}
                {callState === 'ended' && 'Chamada terminada • Resumo'}
              </p>
            </div>
          </div>

          <button
            id="close-call-modal-btn"
            onClick={callState === 'ended' ? onClose : handleHangUp}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Customer Info Card */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-900/30">
                {customer?.name ? customer.name.substring(0, 2).toUpperCase() : <User className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="text-white font-semibold text-base leading-tight">
                  {customer?.name || 'Chamada Telefónica Externa'}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    {phoneNumber || 'Sem número registado'}
                  </span>
                  {customer?.loyaltyTier && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                      Tier {customer.loyaltyTier}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Native Dial Link */}
            {phoneNumber && (
              <a
                href={`tel:${phoneNumber.replace(/\s+/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/40 px-3 py-1.5 rounded-lg border border-indigo-700/40 transition-colors"
                title="Abrir no discador nativo do telemóvel ou computador"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Discador Nativo</span>
              </a>
            )}
          </div>

          {/* Customer Financial / Sales Stats quick peek */}
          {customer && (
            <div className="grid grid-cols-3 gap-2 bg-slate-800/30 rounded-xl p-3 border border-slate-700/40 text-center">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Compras</span>
                <span className="text-sm font-semibold text-emerald-400">
                  {formatCurrency(customer.totalSpent || 0)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Pontos Clube</span>
                <span className="text-sm font-semibold text-amber-400">
                  {customer.loyaltyPoints || 0} pts
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">NIF / Fiscal</span>
                <span className="text-sm font-semibold text-slate-200">
                  {customer.taxNumber || 'Consumidor Final'}
                </span>
              </div>
            </div>
          )}

          {/* ACTIVE CALL VIEW */}
          {(callState === 'calling' || callState === 'connected') && (
            <div className="space-y-5">
              {/* Call Status Display */}
              <div className="text-center py-4">
                <div className="relative inline-flex items-center justify-center">
                  {callState === 'calling' && (
                    <span className="absolute w-24 h-24 rounded-full bg-amber-500/20 animate-ping" />
                  )}
                  {callState === 'connected' && (
                    <span className="absolute w-24 h-24 rounded-full bg-emerald-500/10 animate-pulse" />
                  )}
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                    callState === 'calling' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                  }`}>
                    {callState === 'calling' ? (
                      <PhoneCall className="w-9 h-9 animate-bounce" />
                    ) : (
                      <Phone className="w-9 h-9" />
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-2xl font-bold font-mono text-white">
                    {callState === 'calling' ? 'A Chamar...' : formatTimer(callDuration)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {callState === 'calling' ? 'Aguardando atendimento do cliente' : 'Ligação em curso com alta qualidade de áudio'}
                  </div>
                </div>
              </div>

              {/* In-Call Action Bar */}
              <div className="flex items-center justify-center gap-3">
                <button
                  id="mute-call-btn"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    isMuted
                      ? 'bg-rose-950/60 border-rose-600/60 text-rose-400'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <span className="text-[11px]">{isMuted ? 'Mudo' : 'Microfone'}</span>
                </button>

                <button
                  id="speaker-call-btn"
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    isSpeakerOn
                      ? 'bg-indigo-950/60 border-indigo-600/60 text-indigo-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  <span className="text-[11px]">Alta-voz</span>
                </button>

                <button
                  id="keypad-call-btn"
                  onClick={() => setShowKeypad(!showKeypad)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    showKeypad
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Hash className="w-5 h-5" />
                  <span className="text-[11px]">Teclado DTMF</span>
                </button>

                <button
                  id="hangup-call-btn"
                  onClick={handleHangUp}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 shadow-lg shadow-rose-950/50 transition-all font-semibold"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span className="text-[11px]">Desligar</span>
                </button>
              </div>

              {/* Interactive Keypad */}
              {showKeypad && (
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 animate-in slide-in-from-top-2 duration-150">
                  <div className="text-center font-mono text-lg text-emerald-400 tracking-widest min-h-7 mb-2 bg-slate-900/60 rounded px-2 py-1">
                    {dtmfInput || '—'}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleDtmfPress(k)}
                        className="py-2.5 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-white font-mono text-base font-bold active:scale-95 transition-transform"
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Scratchpad / Notes */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Notas da Conversa em Tempo Real:</span>
                  <span className="text-[11px] text-slate-400 font-normal">Auto-salvo no CRM</span>
                </label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Escreva apontamentos importantes da chamada (ex: solicitou proposta, confirmou visita, preferência de produtos...)"
                  rows={3}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />

                {/* Quick Suggestion Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Interessado em nova encomenda',
                    'Agendada visita à loja',
                    'Confirmada entrega',
                    'Apresentada nova promoção',
                    'Pediu contacto posterior',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickNote(preset)}
                      className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CALL ENDED / SUMMARY & OUTCOME VIEW */}
          {callState === 'ended' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-white font-semibold text-base">Chamada Concluída com Sucesso</h4>
                <p className="text-xs text-slate-400">
                  Duração total: <strong className="text-slate-200">{formatTimer(callDuration)}</strong> ({callDuration}s) • Operador: <strong className="text-slate-200">{currentUser.name}</strong>
                </p>
              </div>

              {/* Outcome Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Desfecho / Resultado da Chamada: <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'venda_realizada', label: 'Venda Concretizada', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                    { id: 'contacto_positivo', label: 'Contacto Positivo', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
                    { id: 'agendamento', label: 'Agendamento / Follow-up', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                    { id: 'informacao', label: 'Esclarecimento / Info', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
                    { id: 'nao_atendeu', label: 'Não Atendeu / Caixa', color: 'bg-slate-700 text-slate-300 border-slate-600' },
                    { id: 'reclamacao', label: 'Reclamação Tratada', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOutcome(opt.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all ${
                        outcome === opt.id
                          ? `${opt.color} ring-2 ring-indigo-500 shadow-md`
                          : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Final Notes */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Notas de Registo e Próximos Passos:
                </label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Detalhes da chamada, acordos estabelecidos, artigos solicitados..."
                  rows={3}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          {callState === 'ended' ? (
            <button
              id="save-call-log-btn"
              type="button"
              onClick={handleSaveAndClose}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-950/40 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Registo no CRM</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleHangUp}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Terminar Chamada</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
