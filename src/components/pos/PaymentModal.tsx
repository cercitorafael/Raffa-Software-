import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod, PaymentRecord } from '../../types';
import {
  Banknote,
  CreditCard,
  Smartphone,
  Building,
  Gift,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  WifiOff,
  Edit2,
  Check,
} from 'lucide-react';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onSuccess }) => {
  const {
    cart,
    globalDiscount,
    selectedCustomer,
    completeSale,
    isOnline,
    currentCompany,
    currencyDefinition,
    formatCurrency,
  } = useApp();

  const [invoiceType, setInvoiceType] = useState<'FS' | 'FT' | 'FR'>('FS');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('dinheiro');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Customer custom info on invoice
  const [isEditingCustomerInfo, setIsEditingCustomerInfo] = useState(false);
  const [customCustomerName, setCustomCustomerName] = useState<string>(
    selectedCustomer?.name || 'Consumidor Final'
  );
  const [customCustomerNif, setCustomCustomerNif] = useState<string>(
    selectedCustomer?.taxNumber || '999999990'
  );

  const currencySymbol = currentCompany?.currencySymbol || currencyDefinition.symbol || 'Mt';

  // Calculate gross total
  const subtotal = cart.reduce((sum, i) => sum + Number(i.unitPrice || 0) * Number(i.quantity || 0), 0);
  const itemDiscounts = cart.reduce((sum, i) => sum + Number(i.discountAmount || 0), 0);
  const globalDiscountAmt = ((subtotal - itemDiscounts) * Number(globalDiscount || 0)) / 100;
  const totalDiscount = itemDiscounts + globalDiscountAmt;
  const totalToPay = Math.max(0, subtotal - totalDiscount);

  // Remaining to pay in case of split payments
  const totalPaidSoFar = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remaining = Math.max(0, Number((totalToPay - totalPaidSoFar).toFixed(2)));

  // Set initial cash amount to remaining
  React.useEffect(() => {
    if (cashTendered === 0 && totalToPay > 0) {
      setCashTendered(totalToPay);
    }
  }, [totalToPay]);

  const handleAddSplitPayment = () => {
    if (remaining <= 0) return;
    const amount = selectedMethod === 'dinheiro' ? Math.min(cashTendered, remaining) : remaining;
    if (amount <= 0) return;

    setPayments((prev) => [...prev, { method: selectedMethod, amount }]);
  };

  const handleRemovePayment = (idx: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuickCash = (amountToAdd: number) => {
    setCashTendered((prev) => Number(((prev || 0) + amountToAdd).toFixed(2)));
  };

  const handleSetExactCash = () => {
    setCashTendered(remaining > 0 ? remaining : totalToPay);
  };

  const calculateChange = () => {
    if (payments.length > 0) {
      const cashPayments = payments.filter((p) => p.method === 'dinheiro').reduce((s, p) => s + p.amount, 0);
      const otherPayments = payments.filter((p) => p.method !== 'dinheiro').reduce((s, p) => s + p.amount, 0);
      const totalCovered = cashPayments + otherPayments;
      return Math.max(0, totalCovered - totalToPay);
    } else {
      if (selectedMethod === 'dinheiro') {
        return Math.max(0, (cashTendered || 0) - totalToPay);
      }
      return 0;
    }
  };

  const handleFinalize = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let finalPayments: PaymentRecord[] = [];

      if (payments.length > 0) {
        finalPayments = payments;
      } else {
        // Single payment method
        finalPayments = [
          {
            method: selectedMethod,
            amount:
              selectedMethod === 'dinheiro'
                ? Math.max(cashTendered || totalToPay, totalToPay)
                : totalToPay,
          },
        ];
      }

      await completeSale(
        finalPayments,
        invoiceType,
        customCustomerNif.trim() || selectedCustomer?.taxNumber || '999999990',
        customCustomerName.trim() || selectedCustomer?.name || 'Consumidor Final'
      );
      onSuccess();
    } catch (err: any) {
      console.error('Error completing sale:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const change = calculateChange();
  const canComplete =
    !isProcessing &&
    (payments.length > 0
      ? totalPaidSoFar >= totalToPay - 0.001
      : selectedMethod === 'dinheiro'
      ? (cashTendered || 0) >= totalToPay - 0.001
      : true);

  const quickDenominations =
    currencyDefinition.code === 'MZN' || currencyDefinition.code === 'AOA' || currencyDefinition.symbol === 'Mt' || currencyDefinition.symbol === 'Kz'
      ? [20, 50, 100, 200, 500, 1000]
      : [5, 10, 20, 50, 100, 200];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#262626] rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[95vh] text-[#e5e5e5] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between">
          <div className="flex-1 pr-4">
            <h3 className="text-base font-serif font-bold text-[#c5a47e]">Finalizar Venda & Pagamento</h3>
            
            {/* Customer info display or inline editor */}
            {!isEditingCustomerInfo ? (
              <div className="flex items-center space-x-2 mt-0.5">
                <p className="text-xs text-neutral-300">
                  Cliente: <span className="font-bold text-white">{customCustomerName}</span>{' '}
                  <span className="font-mono text-[#c5a47e]">(NIF {customCustomerNif})</span>
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditingCustomerInfo(true)}
                  className="px-1.5 py-0.5 bg-[#1f1f1f] hover:bg-[#c5a47e] hover:text-black text-[#c5a47e] text-[10px] rounded flex items-center space-x-1 border border-[#333] cursor-pointer"
                  title="Editar NIF / Nome para a Fatura"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  <span>Editar</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="text"
                  value={customCustomerName}
                  onChange={(e) => setCustomCustomerName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="px-2 py-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded text-xs text-white"
                />
                <input
                  type="text"
                  value={customCustomerNif}
                  onChange={(e) => setCustomCustomerNif(e.target.value)}
                  placeholder="NIF / NUIT"
                  className="px-2 py-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded text-xs text-[#c5a47e] font-mono w-28"
                />
                <button
                  type="button"
                  onClick={() => setIsEditingCustomerInfo(false)}
                  className="p-1 bg-[#c5a47e] hover:bg-[#b5946e] text-black rounded cursor-pointer"
                  title="Confirmar"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-md cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Top Banner: Total to Pay */}
          <div className="bg-[#0d0d0d] border border-[#262626] rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase text-neutral-400 tracking-widest">Total a Cobrar</span>
              <div className="text-3xl font-serif font-bold text-[#c5a47e]">{formatCurrency(totalToPay)}</div>
            </div>

            {/* Document Type Selector */}
            <div className="flex bg-[#141414] rounded-lg border border-[#262626] p-1 space-x-1">
              {[
                { id: 'FS', label: 'FS (Simplificada)' },
                { id: 'FT', label: 'FT (Fatura)' },
                { id: 'FR', label: 'FR (Fatura-Recibo)' },
              ].map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setInvoiceType(doc.id as any)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    invoiceType === doc.id
                      ? 'bg-[#c5a47e] text-black shadow-xs'
                      : 'text-neutral-400 hover:text-[#e5e5e5] hover:bg-[#262626]'
                  }`}
                >
                  {doc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selector Grid */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-2">
              Escolher Meio de Pagamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                { id: 'cartao', label: 'Cartão / POS', icon: CreditCard },
                { id: 'mbway', label: 'M-Pesa / MB WAY', icon: Smartphone },
                { id: 'transferencia', label: 'Transf. Bancária', icon: Building },
                { id: 'vale', label: 'Vale / Cheque', icon: Gift },
              ].map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id as PaymentMethod)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#c5a47e] bg-[#c5a47e]/15 text-[#c5a47e] shadow-xs'
                        : 'border-[#262626] hover:border-neutral-600 bg-[#0d0d0d] text-neutral-300'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-1.5 ${isSelected ? 'text-[#c5a47e]' : 'text-neutral-400'}`} />
                    <span className="text-xs font-bold">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Calculator (When Cash is selected or splitting) */}
          {selectedMethod === 'dinheiro' && (
            <div className="bg-[#0d0d0d] border border-[#262626] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Valor Entregue pelo Cliente</span>
                <span className="text-xs text-neutral-300 font-medium">Troco: <strong className="text-sm font-serif font-bold text-[#c5a47e]">{formatCurrency(change)}</strong></span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-sm">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashTendered || ''}
                    onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-3 py-2.5 bg-[#141414] border border-[#262626] rounded-lg text-lg font-mono font-bold text-[#e5e5e5] focus:outline-hidden focus:border-[#c5a47e]"
                    placeholder="0.00"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSetExactCash}
                  className="px-3.5 py-2.5 bg-[#1a1a1a] border border-[#262626] hover:bg-[#262626] text-[#c5a47e] rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Exato ({formatCurrency(remaining > 0 ? remaining : totalToPay)})
                </button>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {quickDenominations.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickCash(amt)}
                    className="px-3 py-1.5 bg-[#141414] border border-[#262626] hover:bg-[#c5a47e]/20 hover:text-[#c5a47e] text-neutral-300 font-bold text-xs rounded-md transition-colors cursor-pointer"
                  >
                    +{amt} {currencySymbol}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Split Payment Section */}
          <div className="pt-2 border-t border-[#262626]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Pagamento Fracionado (Multimeios)</span>
              {remaining > 0 && (
                <button
                  onClick={handleAddSplitPayment}
                  className="flex items-center space-x-1 text-xs text-[#c5a47e] hover:text-[#d4b896] font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Meio ({formatCurrency(remaining)} pendente)</span>
                </button>
              )}
            </div>

            {payments.length > 0 && (
              <div className="space-y-1.5 bg-[#0d0d0d] p-2.5 rounded-lg border border-[#262626]">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-[#141414] px-3 py-2 rounded-md border border-[#262626]">
                    <span className="font-semibold capitalize text-neutral-200">{p.method}</span>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-[#c5a47e]">{formatCurrency(p.amount)}</span>
                      <button
                        onClick={() => handleRemovePayment(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0d0d0d] border-t border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-[#141414] border border-[#262626] hover:bg-[#1a1a1a] text-neutral-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            {!isOnline && (
              <div className="hidden sm:flex items-center space-x-1.5 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                <WifiOff className="w-3 h-3" />
                <span>Offline: Fatura gravada no IndexedDB</span>
              </div>
            )}
          </div>

          <button
            onClick={handleFinalize}
            disabled={!canComplete}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              canComplete
                ? 'bg-[#c5a47e] hover:bg-[#d4b896] text-black active:scale-98 shadow-md cursor-pointer'
                : 'bg-[#1a1a1a] text-neutral-500 border border-[#262626] cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isProcessing ? 'A Emitir...' : 'Emitir Fatura & Concluir (F12)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
