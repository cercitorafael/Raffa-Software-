import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Company, Store, InvoiceTemplateConfig } from '../types';
import { formatCurrency, formatDate } from './crypto';
import { defaultInvoiceTemplates } from '../mockData';

/**
 * Resolves the strictly active template for a company with fallback support
 */
export function getActiveInvoiceTemplate(
  company: Company,
  templateOverride?: InvoiceTemplateConfig | string,
  sale?: Sale
): InvoiceTemplateConfig {
  const templates =
    company.invoiceTemplates && company.invoiceTemplates.length > 0
      ? company.invoiceTemplates
      : defaultInvoiceTemplates;

  if (typeof templateOverride === 'object' && templateOverride !== null) {
    return templateOverride;
  }

  if (typeof templateOverride === 'string') {
    const found = templates.find((t) => t.id === templateOverride);
    if (found) return found;
  }

  // If a sale object is provided and has a specific invoiceTemplateId recorded at emission
  if (sale?.invoiceTemplateId) {
    const found = templates.find((t) => t.id === sale.invoiceTemplateId);
    if (found) return found;
  }

  if (company.activeInvoiceTemplateId) {
    const found = templates.find((t) => t.id === company.activeInvoiceTemplateId);
    if (found) return found;
  }

  const defaultTpl = templates.find((t) => t.isDefault);
  if (defaultTpl) return defaultTpl;

  return templates[0] || defaultInvoiceTemplates[0];
}

/**
 * Returns user-friendly Portuguese/Mozambican document titles
 */
export function getDocumentTitle(invoiceType?: string, uppercase: boolean = false): string {
  const type = (invoiceType || 'FT').toUpperCase();
  let title = 'Fatura';

  switch (type) {
    case 'FT':
      title = 'Fatura';
      break;
    case 'FS':
      title = 'Fatura Simplificada';
      break;
    case 'FR':
      title = 'Fatura-Recibo';
      break;
    case 'NC':
      title = 'Nota de Crédito';
      break;
    case 'ND':
      title = 'Nota de Débito';
      break;
    case 'ORC':
    case 'PF':
    case 'FP':
      title = 'Fatura Proforma';
      break;
    case 'GT':
      title = 'Guia de Transporte';
      break;
    case 'GR':
      title = 'Guia de Remessa';
      break;
    case 'RC':
      title = 'Recibo de Quitação';
      break;
    case 'VD':
      title = 'Venda a Dinheiro';
      break;
    default:
      title = type.length > 2 ? type : 'Fatura';
      break;
  }

  return uppercase ? title.toUpperCase() : title;
}

/**
 * Direct print thermal receipt via hidden iframe with fallback
 */
export function printThermalReceipt(sale: Sale, company: Company, store: Store): void {
  const currency = company.currencySymbol || company.currency || 'Mt';

  const itemsHtml = sale.items
    .map(
      (item) => `
    <tr>
      <td style="text-align: left; padding: 2px 0;">
        <div style="font-weight: bold;">${item.productName}</div>
        <div style="font-size: 9px; color: #555;">
          ${item.quantity} x ${formatCurrency(item.unitPrice, company.currency)} (IVA ${item.taxRate}%)
          ${item.discountPercent ? ` -${item.discountPercent}%` : ''}
        </div>
      </td>
      <td style="text-align: right; vertical-align: top; font-weight: bold; padding: 2px 0;">
        ${formatCurrency(item.total, company.currency)}
      </td>
    </tr>
  `
    )
    .join('');

  const paymentsHtml = sale.payments
    .map(
      (p) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
      <span style="text-transform: capitalize;">${
        p.method === 'cartao'
          ? 'Cartão TPA'
          : p.method === 'mbway'
          ? 'M-Pesa / Móvel'
          : p.method
      }</span>
      <span style="font-weight: bold;">${formatCurrency(p.amount, company.currency)}</span>
    </div>
  `
    )
    .join('');

  const docTitle = getDocumentTitle(sale.invoiceType, true);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${sale.invoiceNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          @media print {
            body {
              margin: 0;
              padding: 4mm;
            }
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 4mm;
            color: #000000;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.3;
            box-sizing: border-box;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="center">
          <div style="font-size: 14px; font-weight: bold; text-transform: uppercase;">${company.name}</div>
          <div style="font-size: 10px;">${company.address || ''} ${company.city ? `- ${company.city}` : ''}</div>
          <div style="font-size: 10px; font-weight: bold;">NUIT / NIF: ${company.taxNumber || ''}</div>
          <div style="font-size: 10px;">${store.name} (${store.code || ''})</div>
        </div>

        <div class="divider"></div>

        <div class="row bold">
          <span>${docTitle}</span>
          <span>${sale.invoiceNumber}</span>
        </div>
        <div class="row" style="font-size: 10px;">
          <span>Data/Hora:</span>
          <span>${formatDate(sale.date)}</span>
        </div>
        <div class="row" style="font-size: 10px;">
          <span>Cliente:</span>
          <span class="bold">${sale.customerName || 'Consumidor Final'}</span>
        </div>
        <div class="row" style="font-size: 10px;">
          <span>NUIT/NIF:</span>
          <span>${sale.customerTaxNumber || sale.customerNif || 'Consumidor'}</span>
        </div>
        <div class="row" style="font-size: 10px;">
          <span>Operador:</span>
          <span>${sale.operatorName || 'Caixa'}</span>
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000; font-size: 10px;">
              <th style="text-align: left; padding-bottom: 2px;">ARTIGO / QTD</th>
              <th style="text-align: right; padding-bottom: 2px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="row">
          <span>Subtotal:</span>
          <span>${formatCurrency(sale.subtotal, company.currency)}</span>
        </div>
        ${
          sale.discountTotal > 0
            ? `<div class="row" style="color: #000;">
                 <span>Descontos:</span>
                 <span>-${formatCurrency(sale.discountTotal, company.currency)}</span>
               </div>`
            : ''
        }
        <div class="row">
          <span>IVA Total Incluído:</span>
          <span>${formatCurrency(sale.taxTotal, company.currency)}</span>
        </div>
        <div class="double-divider"></div>
        <div class="row bold" style="font-size: 13px;">
          <span>TOTAL A PAGAR:</span>
          <span>${formatCurrency(sale.total, company.currency)}</span>
        </div>
        <div class="double-divider"></div>

        <div style="font-size: 10px; font-weight: bold; margin-top: 4px; margin-bottom: 2px;">FORMA DE PAGAMENTO:</div>
        ${paymentsHtml}
        ${
          sale.changeAmount > 0
            ? `<div class="row bold" style="margin-top: 4px;">
                 <span>Troco:</span>
                 <span>${formatCurrency(sale.changeAmount, company.currency)}</span>
               </div>`
            : ''
        }

        <div class="divider"></div>

        <div class="center" style="font-size: 9px; margin-top: 6px;">
          <div class="bold">Hash Fiscal: ${sale.fiscalHash || ''}</div>
          <div style="margin-top: 4px;">Obrigado pela sua preferência!</div>
          <div>Processado por Sistema Integrado de Gestão Comercial</div>
        </div>
      </body>
    </html>
  `;

  // Try printing via hidden iframe
  try {
    const existingIframe = document.getElementById('receipt-print-frame');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'receipt-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          // Fallback to window.open if iframe print restricted
          openPrintWindow(html);
        }
      }, 250);
      return;
    }
  } catch {
    // Fallback
  }

  openPrintWindow(html);
}

function openPrintWindow(html: string) {
  try {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  } catch {
    window.print();
  }
}

/**
 * Generate and download thermal receipt as PDF
 */
export function downloadReceiptPdf(sale: Sale, company: Company, store: Store): void {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200 + sale.items.length * 10],
  });

  const pageWidth = 80;
  let y = 8;

  // Header
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.text(company.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  if (company.address) {
    doc.text(`${company.address}${company.city ? `, ${company.city}` : ''}`, pageWidth / 2, y, { align: 'center' });
    y += 3.5;
  }
  doc.text(`NUIT/NIF: ${company.taxNumber || ''}`, pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.text(`${store.name} (${store.code || ''})`, pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Divider
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, pageWidth - 4, y);
  y += 4;

  // Doc Info
  const docTitle = getDocumentTitle(sale.invoiceType, true);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(docTitle, 4, y);
  doc.text(sale.invoiceNumber, pageWidth - 4, y, { align: 'right' });
  y += 4;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text(`Data: ${formatDate(sale.date)}`, 4, y);
  y += 3.5;
  doc.text(`Cliente: ${sale.customerName || 'Consumidor Final'}`, 4, y);
  y += 3.5;
  doc.text(`NIF/NUIT: ${sale.customerTaxNumber || sale.customerNif || 'Consumidor'}`, 4, y);
  y += 3.5;
  doc.text(`Operador: ${sale.operatorName || 'Caixa'}`, 4, y);
  y += 4;

  // Divider
  doc.line(4, y, pageWidth - 4, y);
  y += 4;

  // Items
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text('ARTIGO / QTD', 4, y);
  doc.text('TOTAL', pageWidth - 4, y, { align: 'right' });
  y += 4;

  doc.setFont('courier', 'normal');
  sale.items.forEach((item) => {
    doc.text(item.productName.substring(0, 24), 4, y);
    doc.text(formatCurrency(item.total, company.currency), pageWidth - 4, y, { align: 'right' });
    y += 3;
    doc.setFontSize(7);
    doc.text(`${item.quantity} x ${formatCurrency(item.unitPrice, company.currency)} (IVA ${item.taxRate}%)`, 4, y);
    doc.setFontSize(8);
    y += 4;
  });

  // Divider
  doc.line(4, y, pageWidth - 4, y);
  y += 4;

  // Totals
  doc.text('Subtotal:', 4, y);
  doc.text(formatCurrency(sale.subtotal, company.currency), pageWidth - 4, y, { align: 'right' });
  y += 3.5;

  if (sale.discountTotal > 0) {
    doc.text('Descontos:', 4, y);
    doc.text(`-${formatCurrency(sale.discountTotal, company.currency)}`, pageWidth - 4, y, { align: 'right' });
    y += 3.5;
  }

  doc.text('IVA Total Incluído:', 4, y);
  doc.text(formatCurrency(sale.taxTotal, company.currency), pageWidth - 4, y, { align: 'right' });
  y += 4;

  doc.setLineDashPattern([], 0);
  doc.setLineWidth(0.4);
  doc.line(4, y, pageWidth - 4, y);
  y += 4;

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL A PAGAR:', 4, y);
  doc.text(formatCurrency(sale.total, company.currency), pageWidth - 4, y, { align: 'right' });
  y += 5;
  doc.line(4, y, pageWidth - 4, y);
  y += 4;

  // Payments
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text('PAGAMENTO:', 4, y);
  y += 3.5;
  sale.payments.forEach((p) => {
    doc.text(`- ${p.method.toUpperCase()}:`, 4, y);
    doc.text(formatCurrency(p.amount, company.currency), pageWidth - 4, y, { align: 'right' });
    y += 3.5;
  });

  if (sale.changeAmount > 0) {
    doc.setFont('courier', 'bold');
    doc.text('Troco:', 4, y);
    doc.text(formatCurrency(sale.changeAmount, company.currency), pageWidth - 4, y, { align: 'right' });
    y += 4;
  }

  // Footer
  y += 2;
  doc.setLineDashPattern([1, 1], 0);
  doc.setLineWidth(0.2);
  doc.line(4, y, pageWidth - 4, y);
  y += 4;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.text(`Hash Fiscal: ${sale.fiscalHash || ''}`, pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.text('Obrigado pela sua preferência!', pageWidth / 2, y, { align: 'center' });

  doc.save(`Talao_${sale.invoiceNumber.replace(/[\/\s]/g, '_')}.pdf`);
}

/**
 * Print Formal A4 Document using the chosen Invoice Template
 */
export function printInvoiceDocument(
  sale: Sale,
  company: Company,
  templateOverride?: InvoiceTemplateConfig | string
): void {
  const activeTemplate = getActiveInvoiceTemplate(company, templateOverride, sale);
  const currency = company.currencySymbol || company.currency || 'Mt';

  const docTitle = getDocumentTitle(sale.invoiceType, true);

  // Tax rates breakdown calculation
  const taxMap = new Map<number, { base: number; tax: number; total: number }>();
  sale.items.forEach((it) => {
    const rate = it.taxRate ?? 0;
    const current = taxMap.get(rate) || { base: 0, tax: 0, total: 0 };
    const itemTotal = it.total;
    const base = rate === 0 ? itemTotal : itemTotal / (1 + rate / 100);
    const tax = itemTotal - base;
    current.base += base;
    current.tax += tax;
    current.total += itemTotal;
    taxMap.set(rate, current);
  });

  const primaryColor = activeTemplate?.primaryColor || activeTemplate?.accentColor || '#166534';
  const secondaryColor = activeTemplate?.accentColor || '#c5a47e';
  const bankName = activeTemplate?.bankName || company.defaultBank || 'Millennium BIM (Moçambique)';
  const bankIban = activeTemplate?.bankIban || activeTemplate?.iban || company.defaultIban || '000100000119090246657';
  const headerSlogan = activeTemplate?.headerNotes || 'FOCO NO AGRO, GANHO NO CAMPO';
  const footerNotes = activeTemplate?.footerNotes || `${company.city || 'Nampula'}, ${company.country || 'Moçambique'}. Obrigado pela preferência, volte sempre!`;
  const legalNotice = activeTemplate?.legalNotice || '(1) Não sujeito; não tributado ou similar ao abrigo do Código do IVA';
  const watermark = activeTemplate?.showWatermark ? (activeTemplate.watermarkText || 'ORIGINAL') : '';
  const fontFamily =
    activeTemplate?.fontFamily === 'serif'
      ? '"Georgia", "Times New Roman", serif'
      : activeTemplate?.fontFamily === 'mono'
      ? '"Courier New", Courier, monospace'
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  const formattedDate = new Date(sale.date).toISOString().split('T')[0];
  const dueDate = sale.dueDate ? new Date(sale.dueDate).toISOString().split('T')[0] : formattedDate;

  // Items table rows
  const itemRows = sale.items
    .map(
      (it, idx) => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 10px;">
        <div style="font-weight: 600; color: #111827;">${it.sku || `ART-${String(idx + 1).padStart(3, '0')}`}</div>
        ${it.lotNumber ? `<div style="font-size: 9px; color: #6b7280;">Lote: ${it.lotNumber}</div>` : ''}
      </td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">
        ${it.productName}
      </td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">
        ${formatCurrency(it.unitPrice, company.currency)}
      </td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-family: monospace;">
        ${it.unit || 'UNI'}
      </td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-family: monospace; font-weight: bold;">
        ${it.quantity}
      </td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-family: monospace;">
        ${it.taxRate ?? 0}% ${Number(it.taxRate ?? 0) === 0 ? '(1)' : ''}
      </td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; font-family: monospace;">
        ${formatCurrency(it.total, company.currency)}
      </td>
    </tr>
  `
    )
    .join('');

  // Tax breakdown rows
  const taxRows = Array.from(taxMap.entries())
    .map(
      ([rate, val]) => `
    <tr>
      <td style="padding: 3px 6px; border: 1px solid #d1d5db; text-align: left; font-family: monospace;">${rate}%</td>
      <td style="padding: 3px 6px; border: 1px solid #d1d5db; text-align: right; font-family: monospace;">${formatCurrency(val.base, company.currency)}</td>
      <td style="padding: 3px 6px; border: 1px solid #d1d5db; text-align: right; font-family: monospace;">${formatCurrency(val.tax, company.currency)}</td>
      <td style="padding: 3px 6px; border: 1px solid #d1d5db; text-align: right; font-family: monospace; font-weight: 600;">${formatCurrency(val.total, company.currency)}</td>
    </tr>
  `
    )
    .join('');

  // Payments text
  const paymentsText =
    sale.payments && sale.payments.length > 0
      ? sale.payments
          .map(
            (p) =>
              `${p.method === 'mbway' ? 'M-Pesa / Móvel' : p.method === 'cartao' ? 'Cartão TPA' : p.method === 'transferencia' ? 'Transferência Bancária' : 'Numerário / Dinheiro'}: ${formatCurrency(p.amount, company.currency)}`
          )
          .join(' | ')
      : `Numerário: ${formatCurrency(sale.total, company.currency)}`;

  const isAgroMz =
    activeTemplate.style === 'agro_mz' ||
    activeTemplate.style === 'vendus_mz' ||
    activeTemplate.id.includes('agro');

  const invoiceHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${sale.invoiceNumber} - ${company.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          @media print {
            html, body {
              width: 210mm;
              height: 297mm;
              margin: 0;
              padding: 0;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .a4-page {
              box-sizing: border-box;
              width: 100%;
              min-height: 275mm;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 0;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: ${fontFamily};
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 8mm 10mm;
            font-size: 11px;
            line-height: 1.35;
            position: relative;
          }
          ${
            watermark
              ? `
          body::before {
            content: "${watermark}";
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 80px;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.04);
            pointer-events: none;
            z-index: 0;
            letter-spacing: 0.15em;
            text-transform: uppercase;
          }
          `
              : ''
          }
          .a4-page {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 274mm;
            width: 100%;
            background: #ffffff;
            position: relative;
            z-index: 1;
          }
          .top-section {
            flex: 1 0 auto;
          }
          .header-flex {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 10px;
            border-bottom: 2px solid ${primaryColor};
          }
          .company-info {
            max-width: 58%;
          }
          .company-logo {
            margin-bottom: 8px;
          }
          .company-logo img {
            max-height: 75px;
            max-width: 220px;
            object-fit: contain;
            display: block;
          }
          .company-name {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: -0.01em;
            line-height: 1.2;
          }
          .company-slogan {
            font-size: 9.5px;
            font-weight: 700;
            color: ${primaryColor};
            margin: 2px 0 5px 0;
            letter-spacing: 0.04em;
          }
          .company-details {
            font-size: 10px;
            color: #374151;
            line-height: 1.4;
          }
          .customer-section {
            text-align: right;
            font-size: 11px;
            padding-top: 4px;
            max-width: 40%;
          }
          .customer-label {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            color: #6b7280;
          }
          .customer-title {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
          }
          .doc-title-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 12px;
            padding-bottom: 4px;
          }
          .doc-meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border-top: 1px solid #1f2937;
            border-bottom: 1px solid #1f2937;
            padding: 5px 0;
            margin-bottom: 8px;
            font-size: 10px;
            background: #fafafa;
          }
          .doc-meta-grid .meta-col {
            padding: 0 6px;
          }
          .doc-meta-grid .meta-label {
            font-weight: 700;
            color: #111827;
          }
          .doc-meta-grid .meta-val {
            color: #374151;
            font-family: monospace;
            font-size: 10px;
            margin-top: 1px;
          }
          table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
          table.items-table th {
            border-bottom: 1.5px solid ${primaryColor};
            background: #f8fafc;
            text-align: left;
            padding: 6px 8px;
            font-size: 9.5px;
            font-weight: 700;
            color: #111827;
            line-height: 1.2;
          }
          table.items-table th span.en {
            font-size: 8.5px;
            font-weight: normal;
            color: #6b7280;
          }
          .bottom-section {
            flex-shrink: 0;
            margin-top: 16px;
            border-top: 1px solid #9ca3af;
            padding-top: 10px;
          }
          .bottom-grid {
            display: grid;
            grid-template-columns: 1.25fr 0.85fr;
            gap: 16px;
            align-items: start;
          }
          .tax-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }
          .tax-table th {
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            padding: 3px 5px;
            font-size: 8.5px;
            color: #374151;
          }
          .summary-box {
            font-size: 10.5px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
            color: #374151;
          }
          .total-amount-box {
            border-top: 2px solid ${primaryColor};
            border-bottom: 2px solid ${primaryColor};
            padding: 6px 0;
            margin-top: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            background: #fdfdfd;
          }
          .footer-info {
            margin-top: 12px;
            padding-top: 6px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            font-size: 8.5px;
            color: #6b7280;
          }
          .footer-slogan {
            text-align: center;
            font-size: 9px;
            color: #4b5563;
            margin-top: 3px;
          }
        </style>
      </head>
      <body>
        <div class="a4-page">
          <div class="top-section">
            <!-- Header Top -->
            <div class="header-flex">
              <div class="company-info">
                ${
                  activeTemplate.showLogo && company.logoUrl
                    ? `<div class="company-logo"><img src="${company.logoUrl}" alt="Logo" /></div>`
                    : activeTemplate.showLogo
                    ? `<div class="company-logo" style="font-size: 26px;">🌱</div>`
                    : ''
                }
                <div class="company-name">${company.tradeName || company.name}</div>
                ${headerSlogan ? `<div class="company-slogan">${headerSlogan}</div>` : ''}
                <div class="company-details">
                  <div>${company.address || ''}${company.city ? `, ${company.city}` : ''}</div>
                  <div>NUIT / Contribuinte: <strong style="font-family: monospace;">${company.taxNumber || ''}</strong></div>
                  <div>E-mail: ${company.email || ''} ${company.phone ? `| Tel: ${company.phone}` : ''} ${company.mobile ? `| Tlm: ${company.mobile}` : ''}</div>
                </div>
              </div>

              <div class="customer-section">
                <div class="customer-label">Exmo.(a) Sr.(a) / Cliente:</div>
                <div class="customer-title">${sale.customerName || 'Consumidor Final'}</div>
                <div style="color: #4b5563;">${company.country || 'Moçambique'}</div>
                ${
                  sale.customerTaxNumber || sale.customerNif
                    ? `<div style="font-family: monospace; font-size: 10px; margin-top: 2px;">NUIT: <strong>${sale.customerTaxNumber || sale.customerNif}</strong></div>`
                    : ''
                }
              </div>
            </div>

            <!-- Document Title & 4-Column Bar -->
            <div class="doc-title-bar">
              <span style="color: ${primaryColor};">${docTitle} n.º ${sale.invoiceNumber}</span>
              <span style="font-size: 11px; font-weight: normal; color: #4b5563;">Original &bull; ${activeTemplate.name}</span>
            </div>

            <div class="doc-meta-grid">
              <div class="meta-col">
                <div class="meta-label">Data <span style="font-weight: normal; color: #6b7280;">(Date)</span></div>
                <div class="meta-val">${formattedDate}</div>
              </div>
              <div class="meta-col">
                <div class="meta-label">Vencimento <span style="font-weight: normal; color: #6b7280;">(Due)</span></div>
                <div class="meta-val">${dueDate}</div>
              </div>
              <div class="meta-col">
                <div class="meta-label">Contribuinte <span style="font-weight: normal; color: #6b7280;">(VAT NR)</span></div>
                <div class="meta-val">${sale.customerTaxNumber || sale.customerNif || '---------'}</div>
              </div>
              <div class="meta-col">
                <div class="meta-label">V/ Ref. <span style="font-weight: normal; color: #6b7280;">(Your Ref.)</span></div>
                <div class="meta-val">${sale.invoiceNumber}</div>
              </div>
            </div>

            <!-- Items Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 120px;">Código <span class="en">(Code)</span></th>
                  <th>Descrição <span class="en">(Description)</span></th>
                  <th style="text-align: right; width: 85px;">P. Uni. <span class="en">(Unit Price)</span></th>
                  <th style="text-align: center; width: 45px;">Uni. <span class="en">(Unit)</span></th>
                  <th style="text-align: center; width: 45px;">Qtd <span class="en">(Qty)</span></th>
                  <th style="text-align: center; width: 60px;">IVA <span class="en">(VAT)</span></th>
                  <th style="text-align: right; width: 95px;">Total <span class="en">(Total)</span></th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
            </table>
          </div>

          <!-- Bottom Section (Taxes, Payments, Bank, Totals) -->
          <div class="bottom-section">
            <div class="bottom-grid">
              <!-- Left: Taxes, Payments, Bank -->
              <div>
                <table class="tax-table">
                  <thead>
                    <tr>
                      <th style="text-align: left;">Taxa (Tax)</th>
                      <th style="text-align: right;">Base (Net Amount)</th>
                      <th style="text-align: right;">IVA (VAT)</th>
                      <th style="text-align: right;">Total (Total)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${taxRows}
                  </tbody>
                </table>
                <div style="font-size: 8.5px; color: #6b7280; font-style: italic; margin-top: 3px;">
                  ${legalNotice}
                </div>

                <div style="margin-top: 8px; font-size: 9.5px;">
                  <div style="font-weight: 700; color: #111827; margin-bottom: 2px;">Meio de Pagamento <span style="font-weight: normal; color: #6b7280;">(Payment Method)</span></div>
                  <div style="font-family: monospace; color: #374151;">
                    ${paymentsText}
                  </div>
                </div>

                ${
                  activeTemplate.showPaymentInfo && (bankIban || bankName)
                    ? `
                <div style="margin-top: 8px; font-size: 9px;">
                  <div style="font-weight: 700; color: #111827; margin-bottom: 2px;">Dados Bancários <span style="font-weight: normal; color: #6b7280;">(Bank Details)</span></div>
                  <div style="font-family: monospace; color: #374151; line-height: 1.35;">
                    <div>Banco: <strong>${bankName}</strong></div>
                    <div>IBAN / NIB: <strong>${bankIban}</strong></div>
                  </div>
                </div>
                `
                    : ''
                }
              </div>

              <!-- Right: Summary & Amount -->
              <div>
                <div class="summary-box">
                  <div style="font-weight: 700; font-size: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 4px;">
                    Sumário <span style="font-weight: normal; color: #6b7280;">(Resume)</span>
                  </div>
                  <div class="summary-row">
                    <span>S/IVA (Net Value)</span>
                    <span style="font-family: monospace;">${formatCurrency(sale.subtotal, company.currency)}</span>
                  </div>
                  ${
                    sale.discountTotal > 0
                      ? `
                  <div class="summary-row" style="color: #dc2626;">
                    <span>Desconto</span>
                    <span style="font-family: monospace;">-${formatCurrency(sale.discountTotal, company.currency)}</span>
                  </div>
                  `
                      : ''
                  }
                  <div class="summary-row">
                    <span>IVA (VAT)</span>
                    <span style="font-family: monospace;">${formatCurrency(sale.taxTotal, company.currency)}</span>
                  </div>
                </div>

                <div class="total-amount-box">
                  <span>Total (Amount)</span>
                  <span style="font-family: monospace; font-size: 15px; color: ${primaryColor};">${formatCurrency(sale.total, company.currency)}</span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer-info">
              <span>Assinatura Digital AT: ${sale.fiscalHash || 'HASH-PROCESSADO'} &bull; Software Certificado nº ${company.softwareCertNumber || '4120/AT'}</span>
              <span>Modelo: ${activeTemplate.name}</span>
            </div>
            <div class="footer-slogan">
              ${footerNotes}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  openPrintWindow(invoiceHtml);
}

/**
 * Generate A4 Invoice PDF matching the active template design
 */
export function downloadInvoicePdf(
  sale: Sale,
  company: Company,
  templateOverride?: InvoiceTemplateConfig | string
): void {
  const activeTemplate = getActiveInvoiceTemplate(company, templateOverride, sale);
  const currency = company.currencySymbol || company.currency || 'Mt';

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const formattedDate = new Date(sale.date).toISOString().split('T')[0];
  const dueDate = sale.dueDate ? new Date(sale.dueDate).toISOString().split('T')[0] : formattedDate;

  // Convert hex color to RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    const cleanHex = hex.replace('#', '');
    const num = parseInt(cleanHex, 16);
    if (cleanHex.length === 6) {
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
    return [22, 101, 52];
  };

  const primaryRgb = hexToRgb(activeTemplate.primaryColor || activeTemplate.accentColor || '#166534');

  // Top Accent Bar
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(14, 10, 182, 2, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(company.tradeName || company.name, 14, 20);

  // Slogan / Header notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(activeTemplate.headerNotes || 'FOCO NO AGRO, GANHO NO CAMPO', 14, 24.5);

  // Company details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text(`${company.address || ''}${company.city ? `, ${company.city}` : ''}`, 14, 29);
  doc.text(`NUIT / NIF: ${company.taxNumber || ''}`, 14, 33);
  doc.text(`E-mail: ${company.email || ''} | Tel: ${company.phone || company.mobile || ''}`, 14, 37);

  // Customer Right Top
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(sale.customerName || 'Consumidor Final', 196, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(company.country || 'Moçambique', 196, 25, { align: 'right' });
  if (sale.customerTaxNumber || sale.customerNif) {
    doc.text(`NUIT: ${sale.customerTaxNumber || sale.customerNif}`, 196, 29.5, { align: 'right' });
  }

  // Document Title
  const docTypeName = getDocumentTitle(sale.invoiceType, false);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(`${docTypeName} n.º ${sale.invoiceNumber}`, 14, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Original • ${activeTemplate.name}`, 196, 46, { align: 'right' });

  // 4-Column Bar
  doc.setDrawColor(31, 41, 55);
  doc.setLineWidth(0.3);
  doc.line(14, 49, 196, 49);
  doc.line(14, 59, 196, 59);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  doc.text('Data (Date)', 16, 53);
  doc.text('Vencimento (Due)', 62, 53);
  doc.text('Contribuinte (VAT NR)', 108, 53);
  doc.text('V/ Ref. (Your Ref.)', 154, 53);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text(formattedDate, 16, 57);
  doc.text(dueDate, 62, 57);
  doc.text(sale.customerTaxNumber || sale.customerNif || '---------', 108, 57);
  doc.text(sale.invoiceNumber, 154, 57);

  // Items Table
  const tableData = sale.items.map((it, idx) => [
    `${it.sku || `ART-${String(idx + 1).padStart(3, '0')}`}${it.lotNumber ? `\nLote: ${it.lotNumber}` : ''}`,
    it.productName,
    formatCurrency(it.unitPrice, company.currency),
    it.unit || 'UNI',
    it.quantity,
    `${it.taxRate ?? 0}% ${Number(it.taxRate ?? 0) === 0 ? '(1)' : ''}`,
    formatCurrency(it.total, company.currency),
  ]);

  autoTable(doc, {
    startY: 62,
    head: [['Código (Code)', 'Descrição (Description)', 'P. Uni. (Unit Price)', 'Uni. (Unit)', 'Qtd (Qty)', 'IVA (VAT)', 'Total (Total)']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [17, 24, 39],
      fontStyle: 'bold',
      fontSize: 7.5,
      lineWidth: { bottom: 0.3 },
      lineColor: [primaryRgb[0], primaryRgb[1], primaryRgb[2]],
    },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, lineColor: [229, 231, 235], lineWidth: { bottom: 0.1 } },
    columnStyles: {
      0: { halign: 'left', cellWidth: 32 },
      1: { halign: 'left' },
      2: { halign: 'right', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 28 },
    },
  });

  const tableFinalY = (doc as any).lastAutoTable?.finalY || 150;
  const bottomY = Math.max(tableFinalY + 8, 220);

  // Divider before bottom section
  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.2);
  doc.line(14, bottomY - 2, 196, bottomY - 2);

  // Tax breakdown calculation
  const taxMap = new Map<number, { base: number; tax: number; total: number }>();
  sale.items.forEach((it) => {
    const rate = it.taxRate ?? 0;
    const current = taxMap.get(rate) || { base: 0, tax: 0, total: 0 };
    const itemTotal = it.total;
    const base = rate === 0 ? itemTotal : itemTotal / (1 + rate / 100);
    const tax = itemTotal - base;
    current.base += base;
    current.tax += tax;
    current.total += itemTotal;
    taxMap.set(rate, current);
  });

  const taxBody = Array.from(taxMap.entries()).map(([rate, val]) => [
    `${rate}%`,
    formatCurrency(val.base, company.currency),
    formatCurrency(val.tax, company.currency),
    formatCurrency(val.total, company.currency),
  ]);

  autoTable(doc, {
    startY: bottomY,
    margin: { left: 14 },
    tableWidth: 95,
    head: [['Taxa (Tax)', 'Base (Net Amount)', 'IVA (VAT)', 'Total (Total)']],
    body: taxBody,
    theme: 'grid',
    headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 1.5 },
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.5 },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
  });

  const taxTableFinalY = (doc as any).lastAutoTable?.finalY || bottomY + 20;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  doc.text(activeTemplate.legalNotice || '(1) Não sujeito; não tributado ou similar', 14, taxTableFinalY + 4);

  // Payment method
  const payStr =
    sale.payments && sale.payments[0]
      ? sale.payments[0].method === 'mbway'
        ? 'M-Pesa / Móvel'
        : sale.payments[0].method === 'cartao'
        ? 'Cartão TPA'
        : 'Numerário'
      : 'Numerário';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  doc.text('Meio de Pagamento (Payment Method)', 14, taxTableFinalY + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text(payStr, 14, taxTableFinalY + 13);
  doc.text(formatCurrency(sale.total, company.currency), 60, taxTableFinalY + 13);

  // Bank Details
  if (activeTemplate.showPaymentInfo) {
    const bName = activeTemplate.bankName || company.defaultBank || 'Millennium BIM';
    const bIban = activeTemplate.bankIban || activeTemplate.iban || company.defaultIban || '000100000119090246657';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(17, 24, 39);
    doc.text('Dados Bancários (Bank Details)', 14, taxTableFinalY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(55, 65, 81);
    doc.text(`Banco: ${bName}`, 14, taxTableFinalY + 22);
    doc.text(`IBAN: ${bIban}`, 14, taxTableFinalY + 26);
  }

  // Right: Summary & Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text('Sumário (Resume)', 120, bottomY + 3);
  doc.setDrawColor(229, 231, 235);
  doc.line(120, bottomY + 5, 196, bottomY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text('S/IVA (Net Value)', 120, bottomY + 10);
  doc.text(formatCurrency(sale.subtotal, company.currency), 196, bottomY + 10, { align: 'right' });
  if (sale.discountTotal > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text('Desconto Comercial', 120, bottomY + 14);
    doc.text(`-${formatCurrency(sale.discountTotal, company.currency)}`, 196, bottomY + 14, { align: 'right' });
    doc.setTextColor(55, 65, 81);
  }
  doc.text('IVA (VAT)', 120, bottomY + (sale.discountTotal > 0 ? 18 : 15));
  doc.text(formatCurrency(sale.taxTotal, company.currency), 196, bottomY + (sale.discountTotal > 0 ? 18 : 15), { align: 'right' });

  // Total box
  const totalBoxY = bottomY + (sale.discountTotal > 0 ? 23 : 20);
  doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setLineWidth(0.4);
  doc.line(120, totalBoxY, 196, totalBoxY);
  doc.line(120, totalBoxY + 10, 196, totalBoxY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Total (Amount)', 120, totalBoxY + 6.5);
  doc.setFontSize(11.5);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(formatCurrency(sale.total, company.currency), 196, totalBoxY + 6.5, { align: 'right' });

  // Bottom Slogan & Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text(`Assinatura AT: ${sale.fiscalHash || 'HASH-PROCESSADO'} • Cert. ${company.softwareCertNumber || '4120/AT'}`, 14, 284);
  doc.text(`Modelo: ${activeTemplate.name}`, 196, 284, { align: 'right' });
  doc.text(activeTemplate.footerNotes || `${company.city || ''} ${company.country || ''}. Obrigado pela preferência, volte sempre!`, 105, 288, { align: 'center' });

  doc.save(`Fatura_${sale.invoiceNumber.replace(/[\/\s]/g, '_')}.pdf`);
}
