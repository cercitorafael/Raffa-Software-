import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/crypto';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  AlertTriangle,
  X,
  FileSpreadsheet,
  History,
  CheckCircle2,
  Clock,
  Printer,
  FileDown,
  Receipt,
  FileText,
} from 'lucide-react';
import { printZReportA4, printZReportThermal, downloadZReportPdf } from '../../utils/print';

interface CashShiftModalProps {
  onClose: () => void;
  initialMode?: 'info' | 'open' | 'close' | 'sangria' | 'suprimento' | 'history';
}

export const CashShiftModal: React.FC<CashShiftModalProps> = ({ onClose, initialMode = 'info' }) => {
  const {
    activeShift,
    shiftsHistory,
    openShift,
    closeShift,
    registerCashMovement,
    currentUser,
    currentTerminal,
    currentStore,
    currentCompany,
    currencyDefinition,
  } = useApp();

  const currencySymbol = currentCompany?.currencySymbol || currencyDefinition.symbol || 'Mt';
  const quickShiftAmounts =
    currencyDefinition.code === 'MZN' || currencyDefinition.code === 'AOA' || currencyDefinition.symbol === 'Mt' || currencyDefinition.symbol === 'Kz'
      ? [500, 1000, 2000, 5000]
      : [50, 100, 150, 200];

  const [mode, setMode] = useState<'info' | 'open' | 'close' | 'sangria' | 'suprimento' | 'history'>(initialMode);
  const [initialCashInput, setInitialCashInput] = useState<number>(
    currencyDefinition.code === 'MZN' ? 2000 : 150
  );
  const [movementAmount, setMovementAmount] = useState<number>(
    currencyDefinition.code === 'MZN' ? 500 : 50
  );
  const [movementReason, setMovementReason] = useState<string>('');
  const [countedCashInput, setCountedCashInput] = useState<number>(0);
  const [closedZReport, setClosedZReport] = useState<any | null>(null);
  const [selectedHistoricalShift, setSelectedHistoricalShift] = useState<any | null>(null);

  const expectedCashInDrawer = activeShift
    ? activeShift.initialCash + activeShift.totalCash + activeShift.suprimentoTotal - activeShift.sangriaTotal
    : 0;

  const handleOpen = () => {
    openShift(initialCashInput);
    onClose();
  };

  const handleMovement = (type: 'sangria' | 'suprimento') => {
    if (movementAmount <= 0) return;
    registerCashMovement(type, movementAmount, movementReason || (type === 'sangria' ? 'Sangria de segurança' : 'Suprimento de trocos'));
    setMode('info');
    setMovementAmount(50);
    setMovementReason('');
  };

  const handleCloseShift = () => {
    const diff = countedCashInput - expectedCashInDrawer;
    const closed = closeShift(countedCashInput);
    if (closed) {
      setClosedZReport(closed);
    } else if (activeShift) {
      setClosedZReport({
        ...activeShift,
        closedAt: new Date().toISOString(),
        status: 'fechado',
        finalCashReported: countedCashInput,
        finalCashSystem: expectedCashInDrawer,
        cashDifference: diff,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#262626] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] text-[#e5e5e5] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-[#c5a47e]" />
            <div>
              <h3 className="text-sm font-serif font-bold text-[#c5a47e]">Gestão de Caixa & Turnos</h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                {currentStore.code} / {currentTerminal.code}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-md cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {closedZReport ? (
            /* Z-Report Summary after closing */
            <div className="space-y-4">
              <div className="p-4 bg-[#0d0d0d] border border-[#262626] rounded-lg text-center font-mono text-xs text-neutral-300">
                <FileSpreadsheet className="w-8 h-8 text-[#c5a47e] mx-auto mb-2" />
                <h4 className="font-bold text-sm text-[#c5a47e] font-serif">RELATÓRIO Z DE FECHO</h4>
                <p className="text-[11px] text-neutral-400">
                  Terminal {closedZReport.terminalId || closedZReport.terminal || currentTerminal.code} - {formatDate(closedZReport.closedAt || new Date().toISOString())}
                </p>

                <div className="my-3 py-2 border-y border-dashed border-[#333333] space-y-1 text-left">
                  <div className="flex justify-between">
                    <span>Fundo de Maneio Inicial:</span>
                    <span className="text-[#e5e5e5]">{formatCurrency(closedZReport.initialCash)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#c5a47e]">
                    <span>Total Vendas do Turno:</span>
                    <span>{formatCurrency(closedZReport.totalSales)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>- Vendas Numerário:</span>
                    <span>{formatCurrency(closedZReport.totalCash)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>- Vendas TPA / Cartão:</span>
                    <span>{formatCurrency(closedZReport.totalCards)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>- Vendas MB WAY / Móvel:</span>
                    <span>{formatCurrency(closedZReport.totalMbway)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>- Total Sangrias:</span>
                    <span className="text-rose-400">-{formatCurrency(closedZReport.sangriaTotal)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>+ Total Suprimentos:</span>
                    <span className="text-emerald-400">+{formatCurrency(closedZReport.suprimentoTotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#e5e5e5] pt-1 border-t border-[#262626]">
                    <span>Saldo Esperado em Caixa:</span>
                    <span className="text-[#c5a47e]">{formatCurrency(closedZReport.finalCashSystem || closedZReport.expectedCash)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#e5e5e5]">
                    <span>Saldo Contado / Declarado:</span>
                    <span className="text-[#c5a47e]">{formatCurrency(closedZReport.finalCashReported || closedZReport.countedCash)}</span>
                  </div>
                  <div className={`flex justify-between font-bold pt-1 ${closedZReport.cashDifference === 0 || closedZReport.difference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span>Diferença de Caixa:</span>
                    <span>{formatCurrency(closedZReport.cashDifference !== undefined ? closedZReport.cashDifference : closedZReport.difference)}</span>
                  </div>
                </div>

                <p className="text-[10px] text-neutral-400">
                  Turno encerrado por {closedZReport.operatorName || closedZReport.operator || currentUser.name}. Lançamentos fiscais gravados.
                </p>
              </div>

              {/* Action Buttons for Z-Report */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Printer className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Opções de Impressão do Relatório Z</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => printZReportA4(closedZReport, currentCompany, currentStore, currentTerminal)}
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                    title="Imprimir Relatório Z Completo em Formato A4"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir A4</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadZReportPdf(closedZReport, currentCompany, currentStore, currentTerminal)}
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-[#1a1a1a] hover:bg-[#262626] text-[#e5e5e5] border border-[#333333] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    title="Descarregar Relatório Z em PDF A4 Oficial"
                  >
                    <FileDown className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>PDF A4</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => printZReportThermal(closedZReport, currentCompany, currentStore, currentTerminal)}
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-[#1a1a1a] hover:bg-[#262626] text-[#e5e5e5] border border-[#333333] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    title="Imprimir Talão Térmico 80mm"
                  >
                    <Receipt className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Talão 80mm</span>
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer mt-2"
              >
                Concluir & Fechar
              </button>
            </div>
          ) : selectedHistoricalShift ? (
            /* Historical Shift Detail / Z-Report View */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#c5a47e]" />
                  <h4 className="font-serif font-bold text-sm text-[#c5a47e]">
                    Turno Anterior Fechado &bull; {selectedHistoricalShift.id}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedHistoricalShift(null)}
                  className="text-xs text-neutral-400 hover:text-white px-2 py-1 bg-[#1a1a1a] rounded-md border border-[#262626] cursor-pointer"
                >
                  Voltar
                </button>
              </div>

              <div className="p-4 bg-[#0d0d0d] border border-[#262626] rounded-lg text-xs space-y-2 font-mono">
                <div className="flex justify-between text-neutral-400">
                  <span>Operador:</span>
                  <span className="text-[#e5e5e5] font-bold">{selectedHistoricalShift.operatorName}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Abertura:</span>
                  <span className="text-neutral-300">{formatDate(selectedHistoricalShift.openedAt)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Fecho:</span>
                  <span className="text-neutral-300">{formatDate(selectedHistoricalShift.closedAt || selectedHistoricalShift.openedAt)}</span>
                </div>
                <div className="flex justify-between text-neutral-400 pt-2 border-t border-[#262626]">
                  <span>Fundo Inicial:</span>
                  <span className="text-[#e5e5e5]">{formatCurrency(selectedHistoricalShift.initialCash)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Total Vendas:</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(selectedHistoricalShift.totalSales)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Vendas Numerário:</span>
                  <span className="text-neutral-300">{formatCurrency(selectedHistoricalShift.totalCash)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Vendas TPA / Cartões:</span>
                  <span className="text-neutral-300">{formatCurrency(selectedHistoricalShift.totalCards)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Vendas MB WAY:</span>
                  <span className="text-neutral-300">{formatCurrency(selectedHistoricalShift.totalMbway)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Total Suprimentos:</span>
                  <span className="text-emerald-400 font-bold">+{formatCurrency(selectedHistoricalShift.suprimentoTotal || 0)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Total Sangrias:</span>
                  <span className="text-rose-400 font-bold">-{formatCurrency(selectedHistoricalShift.sangriaTotal || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-[#e5e5e5] pt-2 border-t border-[#262626]">
                  <span>Saldo Teórico:</span>
                  <span className="text-[#c5a47e]">
                    {formatCurrency(
                      (selectedHistoricalShift.initialCash || 0) +
                      (selectedHistoricalShift.totalCash || 0) +
                      (selectedHistoricalShift.suprimentoTotal || 0) -
                      (selectedHistoricalShift.sangriaTotal || 0)
                    )}
                  </span>
                </div>
                {selectedHistoricalShift.finalCashReported !== undefined && (
                  <div className="flex justify-between font-bold text-[#e5e5e5]">
                    <span>Saldo Contado / Declarado:</span>
                    <span className="text-[#c5a47e]">{formatCurrency(selectedHistoricalShift.finalCashReported)}</span>
                  </div>
                )}
                {selectedHistoricalShift.cashDifference !== undefined && (
                  <div className={`flex justify-between font-bold ${selectedHistoricalShift.cashDifference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span>Diferença:</span>
                    <span>{formatCurrency(selectedHistoricalShift.cashDifference)}</span>
                  </div>
                )}
                {selectedHistoricalShift.notes && (
                  <div className="pt-2 border-t border-[#262626] text-[11px] text-neutral-400">
                    <span className="font-bold text-neutral-300 block mb-0.5">Observações:</span>
                    <p className="italic">{selectedHistoricalShift.notes}</p>
                  </div>
                )}
              </div>

              {/* Print buttons for historical shift */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Printer className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Opções de Impressão do Relatório Z</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => printZReportA4(selectedHistoricalShift, currentCompany, currentStore, currentTerminal)}
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                    title="Imprimir Relatório Z Completo em Formato A4"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir A4</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadZReportPdf(selectedHistoricalShift, currentCompany, currentStore, currentTerminal)}
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-[#1a1a1a] hover:bg-[#262626] text-[#e5e5e5] border border-[#333333] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    title="Descarregar Relatório Z em PDF A4 Oficial"
                  >
                    <FileDown className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>PDF A4</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => printZReportThermal(selectedHistoricalShift, currentCompany, currentStore, currentTerminal)}
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-[#1a1a1a] hover:bg-[#262626] text-[#e5e5e5] border border-[#333333] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    title="Imprimir Talão Térmico 80mm"
                  >
                    <Receipt className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Talão 80mm</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedHistoricalShift(null)}
                className="w-full py-2 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-[#262626] rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Voltar à Gestão de Caixa
              </button>
            </div>
          ) : !activeShift ? (
            /* Shift Closed -> Open shift screen */
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">
                  <span>Caixa Fechado</span>
                </div>
                <h4 className="text-base font-serif font-bold text-[#c5a47e]">Abertura de Turno de Caixa</h4>
                <p className="text-xs text-neutral-400">
                  O caixa não se abre automaticamente. Introduza o Fundo de Maneio inicial para começar a registar artigos e processar pagamentos.
                </p>
              </div>

              <div className="text-left bg-[#0d0d0d] p-4 rounded-xl border border-[#262626] space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                  Fundo de Maneio Inicial ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-sm">{currencySymbol}</span>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={initialCashInput}
                    onChange={(e) => setInitialCashInput(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-base font-mono font-bold text-[#e5e5e5] focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  {quickShiftAmounts.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setInitialCashInput(val)}
                      className="px-2.5 py-1 bg-[#141414] border border-[#262626] text-xs font-semibold text-neutral-300 rounded-md hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                    >
                      {val} {currencySymbol}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-neutral-400 px-1">
                <span>Operador: <strong className="text-[#e5e5e5]">{currentUser.name}</strong></span>
                <span>Data: <strong className="text-[#e5e5e5]">{formatDate(new Date().toISOString())}</strong></span>
              </div>

              <button
                onClick={handleOpen}
                className="w-full py-3 bg-[#c5a47e] hover:bg-[#d4b896] text-black rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
              >
                <Unlock className="w-4 h-4" />
                <span>Abrir Caixa & Iniciar Vendas</span>
              </button>

              {/* History of previously closed shifts */}
              {shiftsHistory && shiftsHistory.length > 0 && (
                <div className="pt-3 border-t border-[#262626] text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center space-x-1">
                      <History className="w-3 h-3 text-[#c5a47e]" />
                      <span>Turnos Anteriores Fechados ({shiftsHistory.length})</span>
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {shiftsHistory.slice(0, 5).map((sh) => (
                      <div
                        key={sh.id}
                        onClick={() => setSelectedHistoricalShift(sh)}
                        className="p-2 bg-[#0d0d0d] hover:bg-[#181818] border border-[#262626] rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-neutral-200">{formatDate(sh.openedAt)}</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-neutral-800 text-neutral-400 rounded-xs border border-neutral-700">
                              Fechado
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            Op: {sh.operatorName} &bull; Fundo: {formatCurrency(sh.initialCash)}
                          </p>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-emerald-400 font-bold block">{formatCurrency(sh.totalSales)}</span>
                          <span className="text-[10px] text-neutral-500 underline">Ver Z</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : mode === 'sangria' || mode === 'suprimento' ? (
            /* Sangria or Suprimento screen */
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-[#262626]">
                {mode === 'sangria' ? (
                  <ArrowDownRight className="w-5 h-5 text-rose-400" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                )}
                <h4 className="font-serif font-bold text-sm text-[#c5a47e]">
                  {mode === 'sangria' ? 'Registar Sangria (Retirada de Dinheiro)' : 'Registar Suprimento (Entrada de Dinheiro)'}
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest block mb-1">Valor ({currencySymbol})</label>
                  <input
                    type="number"
                    step="5"
                    min="1"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg font-mono font-bold text-base text-[#e5e5e5] focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest block mb-1">Motivo / Justificação</label>
                  <input
                    type="text"
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    placeholder={mode === 'sangria' ? 'ex: Depósito no cofre central' : 'ex: Reforço de moedas de troco'}
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-xs text-[#e5e5e5] focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setMode('info')}
                  className="flex-1 py-2.5 bg-[#0d0d0d] hover:bg-[#1a1a1a] text-neutral-300 border border-[#262626] rounded-lg text-xs font-bold transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => handleMovement(mode)}
                  className={`flex-1 py-2.5 text-black rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    mode === 'sangria' ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-[#c5a47e] hover:bg-[#d4b896]'
                  }`}
                >
                  Confirmar {mode === 'sangria' ? 'Sangria' : 'Suprimento'}
                </button>
              </div>
            </div>
          ) : mode === 'close' ? (
            /* Close Shift Confirmation Screen */
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-[#262626]">
                <Lock className="w-5 h-5 text-rose-400" />
                <h4 className="font-serif font-bold text-sm text-[#c5a47e]">Fecho de Caixa & Emissão de Relatório Z</h4>
              </div>

              <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[#262626] space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Fundo Inicial:</span>
                  <span className="font-mono text-[#e5e5e5]">{formatCurrency(activeShift.initialCash)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Vendas em Numerário:</span>
                  <span className="font-mono text-emerald-400">+{formatCurrency(activeShift.totalCash)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Suprimentos (+):</span>
                  <span className="font-mono text-emerald-400">+{formatCurrency(activeShift.suprimentoTotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Sangrias (-):</span>
                  <span className="font-mono text-rose-400">-{formatCurrency(activeShift.sangriaTotal)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-[#e5e5e5] pt-2 border-t border-[#262626]">
                  <span>Saldo Teórico em Caixa:</span>
                  <span className="text-[#c5a47e] font-mono">{formatCurrency(expectedCashInDrawer)}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                  Contagem Física na Gaveta ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={countedCashInput || ''}
                  onChange={(e) => setCountedCashInput(parseFloat(e.target.value) || 0)}
                  placeholder="Introduza o valor total contado na gaveta"
                  className="w-full px-3 py-2.5 bg-[#0d0d0d] border border-[#262626] rounded-lg text-base font-mono font-bold text-[#e5e5e5] focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              {countedCashInput > 0 && (
                <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  countedCashInput - expectedCashInDrawer === 0
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}>
                  <span className="font-medium">Diferença de Caixa:</span>
                  <span className="font-mono font-bold text-sm">
                    {formatCurrency(countedCashInput - expectedCashInDrawer)}
                  </span>
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setMode('info')}
                  className="flex-1 py-2.5 bg-[#0d0d0d] hover:bg-[#1a1a1a] text-neutral-300 border border-[#262626] rounded-lg text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCloseShift}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-md"
                >
                  Confirmar Fecho Z
                </button>
              </div>
            </div>
          ) : (
            /* Active Shift Overview (Info) */
            <div className="space-y-4">
              {/* Active Shift Header Badge */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Caixa Aberta &bull; Em Funcionamento
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                      Operador: <strong className="text-neutral-200">{activeShift.operatorName}</strong> &bull; Aberto em: {formatDate(activeShift.openedAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block font-mono">Fundo Inicial</span>
                  <span className="text-xs font-bold font-mono text-[#c5a47e]">{formatCurrency(activeShift.initialCash)}</span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0d0d0d] p-3 rounded-lg border border-[#262626]">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Total Vendas</span>
                  <p className="text-lg font-serif font-bold text-[#c5a47e]">{formatCurrency(activeShift.totalSales)}</p>
                </div>
                <div className="bg-[#0d0d0d] p-3 rounded-lg border border-[#262626]">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Dinheiro em Gaveta</span>
                  <p className="text-lg font-serif font-bold text-[#c5a47e]">{formatCurrency(expectedCashInDrawer)}</p>
                </div>
              </div>

              {/* Payment Methods breakdown */}
              <div className="bg-[#0d0d0d] p-3.5 rounded-lg border border-[#262626] space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                  Discriminação por Meio
                </span>
                <div className="flex justify-between text-neutral-300">
                  <span>Numerário:</span>
                  <span className="font-mono font-bold text-[#e5e5e5]">{formatCurrency(activeShift.totalCash)}</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span>Cartões TPA:</span>
                  <span className="font-mono font-bold text-[#e5e5e5]">{formatCurrency(activeShift.totalCards)}</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span>MB WAY:</span>
                  <span className="font-mono font-bold text-[#e5e5e5]">{formatCurrency(activeShift.totalMbway)}</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span>Vales / Cartão Presente:</span>
                  <span className="font-mono font-bold text-[#e5e5e5]">{formatCurrency(activeShift.totalVouchers)}</span>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMode('suprimento')}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-[#0d0d0d] hover:bg-[#1a1a1a] text-neutral-300 rounded-lg text-xs font-semibold border border-[#262626] transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span>Suprimento</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('sangria')}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-[#0d0d0d] hover:bg-[#1a1a1a] text-neutral-300 rounded-lg text-xs font-semibold border border-[#262626] transition-colors cursor-pointer"
                >
                  <ArrowDownRight className="w-4 h-4 text-rose-400" />
                  <span>Sangria</span>
                </button>
              </div>

              {/* Interim / X-Report Print Options */}
              <div className="p-3 bg-[#0d0d0d] rounded-lg border border-[#262626] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center space-x-1">
                    <Printer className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>Relatório X (Posição Atual em A4)</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => printZReportA4(activeShift, currentCompany, currentStore, currentTerminal)}
                    className="flex items-center justify-center space-x-1.5 py-2 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-[#333333] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>Imprimir A4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadZReportPdf(activeShift, currentCompany, currentStore, currentTerminal)}
                    className="flex items-center justify-center space-x-1.5 py-2 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-[#333333] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 text-[#c5a47e]" />
                    <span>PDF A4</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setCountedCashInput(expectedCashInDrawer);
                  setMode('close');
                }}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Encerrar Turno (Fecho Z)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
