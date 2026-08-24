import React from 'react';
import { Sale, Company, Store } from '../../types';
import { formatCurrency, formatDate } from '../../utils/crypto';
import { printThermalReceipt, downloadReceiptPdf, printInvoiceDocument, downloadInvoicePdf } from '../../utils/print';
import { Printer, X, CheckCircle2, Copy, Download, ArrowRight, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReceiptModalProps {
  sale: Sale;
  company: Company;
  store: Store;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, company, store, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // Confetti fallback
    }
  }, []);

  const handlePrint = () => {
    printThermalReceipt(sale, company, store);
  };

  const handleDownload = () => {
    downloadReceiptPdf(sale, company, store);
  };

  const handleCopyText = () => {
    const text = `
------------------------------------------------
${company.name}
NUIT / NIF: ${company.taxNumber || ''}
${store.name} - ${store.address || ''}
------------------------------------------------
${sale.invoiceType === 'FS' ? 'FATURA SIMPLIFICADA' : sale.invoiceType === 'FT' ? 'FATURA' : 'FATURA-RECIBO'}
Nº: ${sale.invoiceNumber}
Data: ${formatDate(sale.date)}
Cliente: ${sale.customerName || 'Consumidor Final'} (NIF: ${sale.customerTaxNumber || sale.customerNif || 'Consumidor'})
Operador: ${sale.operatorName || 'Caixa'}
------------------------------------------------
${sale.items.map((i) => `${i.productName.padEnd(24, ' ')} x${i.quantity}  ${formatCurrency(i.total)}`).join('\n')}
------------------------------------------------
Subtotal: ${formatCurrency(sale.subtotal)}
Descontos: -${formatCurrency(sale.discountTotal)}
IVA Incluído: ${formatCurrency(sale.taxTotal)}
TOTAL: ${formatCurrency(sale.total)}
------------------------------------------------
Meios de Pagamento:
${sale.payments.map((p) => `- ${p.method.toUpperCase()}: ${formatCurrency(p.amount)}`).join('\n')}
${sale.changeAmount > 0 ? `Troco: ${formatCurrency(sale.changeAmount)}` : ''}
------------------------------------------------
Hash Fiscal: ${sale.fiscalHash || ''}
------------------------------------------------
Obrigado pela sua preferência!
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#262626] rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] text-[#e5e5e5] animate-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-[#c5a47e]" />
            <div>
              <h3 className="text-sm font-serif font-bold text-[#c5a47e]">Venda Concluída com Sucesso</h3>
              <p className="text-[11px] text-neutral-400 font-mono">{sale.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a] flex justify-center">
          <div
            id="thermal-receipt"
            className="w-80 bg-[#121212] p-5 rounded-md shadow-lg border border-[#262626] font-mono text-[11px] text-neutral-200 leading-relaxed"
          >
            {/* Store & Header */}
            <div className="text-center pb-3 border-b border-dashed border-[#333333]">
              <h4 className="font-bold text-xs uppercase tracking-tight text-[#e5e5e5]">{company.name}</h4>
              <p className="text-[10px] text-neutral-400">{company.address}, {company.city}</p>
              <p className="text-[10px] font-semibold text-[#c5a47e]">NUIT / NIF: {company.taxNumber}</p>
              <p className="text-[10px] text-neutral-400">{store.name} ({store.code})</p>
            </div>

            {/* Document Header */}
            <div className="py-2.5 border-b border-dashed border-[#333333] space-y-0.5">
              <div className="flex justify-between font-bold text-xs text-[#c5a47e]">
                <span>
                  {sale.invoiceType === 'FS'
                    ? 'FATURA SIMPLIFICADA'
                    : sale.invoiceType === 'FT'
                    ? 'FATURA'
                    : 'FATURA-RECIBO'}
                </span>
                <span>{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>Data/Hora:</span>
                <span>{formatDate(sale.date)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>Cliente:</span>
                <span className="font-medium text-neutral-200">{sale.customerName || 'Consumidor Final'}</span>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>NUIT/NIF:</span>
                <span className="font-medium text-neutral-200">{sale.customerTaxNumber || sale.customerNif || 'Consumidor'}</span>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>Operador:</span>
                <span>{sale.operatorName || 'Caixa'}</span>
              </div>
            </div>

            {/* Itemized list */}
            <div className="py-2.5 border-b border-dashed border-[#333333] space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase border-b border-[#262626] pb-1">
                <span>Artigo / Qtd</span>
                <span>Total</span>
              </div>
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-neutral-200">{item.productName}</div>
                    <div className="text-[9px] text-neutral-400">
                      {item.quantity} x {formatCurrency(item.unitPrice)} (IVA {item.taxRate}%)
                      {item.discountPercent > 0 && ` -${item.discountPercent}%`}
                    </div>
                  </div>
                  <span className="font-bold text-[#c5a47e]">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="py-2.5 border-b border-dashed border-[#333333] space-y-1 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-rose-400 font-medium">
                  <span>Descontos:</span>
                  <span>-{formatCurrency(sale.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-400">
                <span>Total IVA Incluído:</span>
                <span>{formatCurrency(sale.taxTotal)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-[#c5a47e] pt-1 border-t border-[#262626]">
                <span>TOTAL A PAGAR:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="py-2 border-b border-dashed border-[#333333] space-y-0.5 text-[10px]">
              <span className="font-bold text-neutral-400 block mb-1">PAGAMENTO:</span>
              {sale.payments.map((p, i) => (
                <div key={i} className="flex justify-between text-neutral-300">
                  <span className="capitalize">{p.method === 'cartao' ? 'Cartão TPA' : p.method === 'mbway' ? 'M-Pesa / Móvel' : p.method}</span>
                  <span className="font-bold text-[#c5a47e]">{formatCurrency(p.amount)}</span>
                </div>
              ))}
              {sale.changeAmount > 0 && (
                <div className="flex justify-between font-bold text-emerald-400 pt-0.5">
                  <span>Troco Entregue:</span>
                  <span>{formatCurrency(sale.changeAmount)}</span>
                </div>
              )}
            </div>

            {/* Digital Signature Block */}
            <div className="pt-3 text-center text-[9px] text-neutral-400 space-y-1">
              <div className="bg-[#0d0d0d] p-2 rounded-xs border border-[#262626] text-left font-mono">
                <p className="font-bold text-neutral-300">
                  Assinatura Digital: {sale.fiscalHash.substring(0, 8)}
                </p>
                <p className="text-[8px] text-neutral-500 break-all">
                  Hash: {sale.fiscalHash}
                </p>
              </div>

              {/* QR Code Graphic Box */}
              <div className="flex justify-center my-2">
                <div className="w-16 h-16 bg-white border border-[#262626] p-1 flex flex-col items-center justify-center text-center">
                  <div className="grid grid-cols-5 gap-0.5 w-full h-full p-1 bg-black">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`${(i * 7) % 3 === 0 ? 'bg-white' : 'bg-black'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="font-medium text-neutral-300 mt-1">Obrigado pela preferência e volte sempre!</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-[#0d0d0d] border-t border-[#262626] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#c5a47e] hover:bg-[#d4b896] text-neutral-950 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Talão 80mm</span>
            </button>

            <button
              onClick={() => printInvoiceDocument(sale, company)}
              type="button"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#1a1a1a] hover:bg-[#252525] text-[#c5a47e] border border-[#c5a47e]/40 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Imprimir A4</span>
            </button>

            <button
              onClick={() => downloadInvoicePdf(sale, company)}
              type="button"
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 border border-[#262626] rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>PDF A4</span>
            </button>

            <button
              onClick={handleCopyText}
              type="button"
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#141414] hover:bg-[#1f1f1f] text-neutral-300 border border-[#262626] rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white border border-[#333] rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Nova Venda</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

