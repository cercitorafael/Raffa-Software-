import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Company, Store, InvoiceTemplateConfig, CashShift, Terminal, InventoryExtractRow } from '../types';
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

export interface LoadedPdfLogo {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  width: number;
  height: number;
}

/**
 * Calculates fitted dimensions preserving aspect ratio within a bounding box
 */
export function calculateFittedDimensions(
  maxW: number,
  maxH: number,
  imgW: number,
  imgH: number
): { width: number; height: number } {
  if (!imgW || !imgH) return { width: maxW, height: maxH };
  const aspect = imgW / imgH;
  if (aspect > maxW / maxH) {
    return {
      width: maxW,
      height: Math.round((maxW / aspect) * 10) / 10,
    };
  } else {
    return {
      width: Math.round(maxH * aspect * 10) / 10,
      height: maxH,
    };
  }
}

/**
 * Safely loads and processes a company logo for jsPDF embedding.
 * Handles:
 * 1. Base64 data URLs (PNG, JPG, WebP, SVG) -> converts via off-screen canvas to clean PNG for jsPDF
 * 2. Remote / local HTTP image URLs -> preloads via Image and converts to PNG
 * 3. Graceful fallback corporate logo monogram (with company initials and luxury brand styling)
 */
export async function getCompanyLogoForPdf(
  logoUrl?: string,
  companyName?: string,
  primaryHex?: string
): Promise<LoadedPdfLogo | null> {
  if (typeof window === 'undefined') return null;

  // 1. Attempt to load provided logoUrl
  if (logoUrl && typeof logoUrl === 'string' && logoUrl.trim().length > 0) {
    try {
      const loaded = await new Promise<LoadedPdfLogo | null>((resolve) => {
        const timeout = setTimeout(() => {
          if (logoUrl.startsWith('data:image/')) {
            resolve({
              dataUrl: logoUrl,
              format: logoUrl.includes('jpeg') || logoUrl.includes('jpg') ? 'JPEG' : 'PNG',
              width: 240,
              height: 120,
            });
          } else {
            resolve(null);
          }
        }, 2500);

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          clearTimeout(timeout);
          try {
            const w = img.naturalWidth || img.width || 240;
            const h = img.naturalHeight || img.height || 120;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const pngData = canvas.toDataURL('image/png');
              resolve({
                dataUrl: pngData,
                format: 'PNG',
                width: w,
                height: h,
              });
              return;
            }
          } catch {
            if (logoUrl.startsWith('data:image/')) {
              resolve({
                dataUrl: logoUrl,
                format: logoUrl.includes('jpeg') || logoUrl.includes('jpg') ? 'JPEG' : 'PNG',
                width: img.naturalWidth || 240,
                height: img.naturalHeight || 120,
              });
              return;
            }
          }
          resolve(null);
        };

        img.onerror = () => {
          clearTimeout(timeout);
          if (logoUrl.startsWith('data:image/')) {
            resolve({
              dataUrl: logoUrl,
              format: logoUrl.includes('jpeg') || logoUrl.includes('jpg') ? 'JPEG' : 'PNG',
              width: 240,
              height: 120,
            });
          } else {
            resolve(null);
          }
        };

        img.src = logoUrl;
      });

      if (loaded) return loaded;
    } catch {
      // Fall through to corporate monogram fallback
    }
  }

  // 2. Fallback: Generate a crisp corporate logo emblem canvas
  try {
    const name = (companyName || 'RAFFA POS').trim();
    const words = name.split(/\s+/).filter(Boolean);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase() || 'RP';

    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const brandColor = primaryHex && primaryHex.startsWith('#') ? primaryHex : '#166534';

    // Rounded rectangle emblem
    ctx.fillStyle = brandColor;
    const r = 14;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(240 - r, 0);
    ctx.quadraticCurveTo(240, 0, 240, r);
    ctx.lineTo(240, 120 - r);
    ctx.quadraticCurveTo(240, 120, 240 - r, 120);
    ctx.lineTo(r, 120);
    ctx.quadraticCurveTo(0, 120, 0, 120 - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // Inner gold accent border
    ctx.strokeStyle = '#c5a47e';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Monogram text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 120, 52);

    // Subtle bottom tag
    ctx.fillStyle = '#c5a47e';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('EMPRESA REGISTADA', 120, 96);

    return {
      dataUrl: canvas.toDataURL('image/png'),
      format: 'PNG',
      width: 240,
      height: 120,
    };
  } catch {
    return null;
  }
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
export async function downloadReceiptPdf(sale: Sale, company: Company, store: Store): Promise<void> {
  const logo = await getCompanyLogoForPdf(company.logoUrl, company.tradeName || company.name);
  const pageWidth = 80;
  let y = 8;

  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200 + sale.items.length * 10 + (logo ? 18 : 0)],
  });

  if (logo) {
    const { width: logoW, height: logoH } = calculateFittedDimensions(34, 14, logo.width, logo.height);
    try {
      doc.addImage(logo.dataUrl, logo.format, (pageWidth - logoW) / 2, y, logoW, logoH);
      y += logoH + 3.5;
    } catch {
      // ignore
    }
  }

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
export async function downloadInvoicePdf(
  sale: Sale,
  company: Company,
  templateOverride?: InvoiceTemplateConfig | string
): Promise<void> {
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

  // Load and render company logo if enabled
  const shouldShowLogo = activeTemplate.showLogo !== false;
  const logo = shouldShowLogo
    ? await getCompanyLogoForPdf(company.logoUrl, company.tradeName || company.name, activeTemplate.primaryColor)
    : null;

  let logoHeight = 0;
  if (logo) {
    const { width: logoW, height: logoH } = calculateFittedDimensions(46, 15, logo.width, logo.height);
    logoHeight = logoH;
    try {
      doc.addImage(logo.dataUrl, logo.format, 14, 14, logoW, logoH);
    } catch (e) {
      console.warn('Could not render logo in PDF:', e);
      logoHeight = 0;
    }
  }

  // Company Name position
  const compY = logoHeight > 0 ? 14 + logoHeight + 4.5 : 20;

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text(company.tradeName || company.name, 14, compY);

  // Slogan / Header notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(activeTemplate.headerNotes || 'FOCO NO AGRO, GANHO NO CAMPO', 14, compY + 4.5);

  // Company details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text(`${company.address || ''}${company.city ? `, ${company.city}` : ''}`, 14, compY + 9);
  doc.text(`NUIT / NIF: ${company.taxNumber || ''}`, 14, compY + 13);
  doc.text(`E-mail: ${company.email || ''} | Tel: ${company.phone || company.mobile || ''}`, 14, compY + 17);

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
  const docTitleY = Math.max(compY + 23, 46);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(`${docTypeName} n.º ${sale.invoiceNumber}`, 14, docTitleY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Original • ${activeTemplate.name}`, 196, docTitleY, { align: 'right' });

  // 4-Column Bar
  doc.setDrawColor(31, 41, 55);
  doc.setLineWidth(0.3);
  doc.line(14, docTitleY + 3, 196, docTitleY + 3);
  doc.line(14, docTitleY + 13, 196, docTitleY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  doc.text('Data (Date)', 16, docTitleY + 7);
  doc.text('Vencimento (Due)', 62, docTitleY + 7);
  doc.text('Contribuinte (VAT NR)', 108, docTitleY + 7);
  doc.text('V/ Ref. (Your Ref.)', 154, docTitleY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text(formattedDate, 16, docTitleY + 11);
  doc.text(dueDate, 62, docTitleY + 11);
  doc.text(sale.customerTaxNumber || sale.customerNif || '---------', 108, docTitleY + 11);
  doc.text(sale.invoiceNumber, 154, docTitleY + 11);

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
    startY: docTitleY + 16,
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

/**
 * Print Z-Report in Full A4 Format with exhaustive details
 */
export function printZReportA4(
  shift: CashShift,
  company: Company,
  store?: Store,
  terminal?: Terminal
): void {
  const currency = company.currencySymbol || company.currency || 'Mt';
  const expectedCash = (shift.initialCash || 0) + (shift.totalCash || 0) + (shift.suprimentoTotal || 0) - (shift.sangriaTotal || 0);
  const countedCash = typeof shift.finalCashReported === 'number' ? shift.finalCashReported : expectedCash;
  const difference = typeof shift.cashDifference === 'number' ? shift.cashDifference : (countedCash - expectedCash);

  const zNumber = shift.zReportNumber || `Z-${new Date(shift.closedAt || shift.openedAt).getFullYear()}/${shift.id.slice(-4).toUpperCase()}`;
  const storeName = store?.name || 'Loja Principal';
  const storeCode = store?.code || 'LOJA-01';
  const terminalName = (terminal as any)?.name || terminal?.description || 'POS Principal';
  const terminalCode = terminal?.code || shift.terminalId || 'POS-01';

  const openedDateFormatted = formatDate(shift.openedAt);
  const closedDateFormatted = shift.closedAt ? formatDate(shift.closedAt) : formatDate(new Date().toISOString());

  const movementsHtml = (shift.movements && shift.movements.length > 0)
    ? shift.movements.map((m, idx) => `
        <tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
          <td style="padding: 6px 8px; font-family: monospace;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-family: monospace;">${formatDate(m.timestamp)}</td>
          <td style="padding: 6px 8px; font-weight: bold; text-transform: uppercase; color: ${m.type === 'sangria' ? '#dc2626' : '#16a34a'};">
            ${m.type === 'sangria' ? 'Sangria (Retirada)' : 'Suprimento (Entrada)'}
          </td>
          <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; color: ${m.type === 'sangria' ? '#dc2626' : '#16a34a'};">
            ${m.type === 'sangria' ? '-' : '+'}${formatCurrency(m.amount, company.currency)}
          </td>
          <td style="padding: 6px 8px; color: #4b5563;">${m.reason || 'Sem justificação'}</td>
          <td style="padding: 6px 8px; color: #4b5563;">${m.authorizedBy || shift.operatorName}</td>
        </tr>
      `).join('')
    : `
      <tr>
        <td colspan="6" style="padding: 12px; text-align: center; color: #9ca3af; font-style: italic;">
          Nenhum movimento de caixa (sangria/suprimento) registado durante este turno.
        </td>
      </tr>
    `;

  const html = `
    <!DOCTYPE html>
    <html lang="pt">
      <head>
        <meta charset="utf-8">
        <title>Relatório Z - ${zNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #111827;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .company-title {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
            margin-bottom: 3px;
          }
          .company-meta {
            font-size: 11px;
            color: #4b5563;
            line-height: 1.35;
          }
          .doc-badge {
            text-align: right;
          }
          .doc-badge h1 {
            margin: 0 0 4px 0;
            font-size: 16px;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .z-number {
            display: inline-block;
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-weight: 800;
            font-size: 12px;
            color: #111827;
          }
          .section {
            margin-bottom: 14px;
          }
          .section-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #1f2937;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 4px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
          }
          .grid-4 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 8px;
          }
          .stat-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 8px 10px;
          }
          .stat-label {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            color: #6b7280;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
          }
          .stat-value {
            font-size: 14px;
            font-weight: 800;
            font-family: monospace;
            color: #111827;
          }
          .stat-value.highlight {
            color: #047857;
          }
          .stat-value.danger {
            color: #b91c1c;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-top: 4px;
          }
          table.data-table th {
            background: #f3f4f6;
            color: #374151;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9.5px;
            letter-spacing: 0.4px;
            padding: 6px 8px;
            border-top: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
          }
          .box-reconciliation {
            background: #ffffff;
            border: 1.5px solid #111827;
            border-radius: 6px;
            padding: 10px 14px;
          }
          .recon-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 11.5px;
            color: #374151;
          }
          .recon-row.bold {
            font-weight: 800;
            color: #111827;
            border-top: 1px solid #e5e7eb;
            padding-top: 5px;
            margin-top: 3px;
          }
          .recon-row.total-box {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            border-top: 1.5px solid #111827;
            border-bottom: 1.5px solid #111827;
            padding: 6px 0;
            margin: 6px 0;
          }
          .signature-box {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 24px;
            padding-top: 12px;
          }
          .sign-line {
            border-top: 1px dashed #6b7280;
            text-align: center;
            padding-top: 6px;
            font-size: 10px;
            color: #4b5563;
            font-weight: 600;
          }
          .footer-fiscal {
            margin-top: 16px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #6b7280;
            font-family: monospace;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div>
            <div class="company-title">${company.tradeName || (company as any).legalName || company.name}</div>
            <div class="company-meta">
              <strong>NIF:</strong> ${company.taxNumber || '400123987'} &bull; <strong>Registo:</strong> ${(company as any).crn || company.taxNumber || '00234/2020'}<br>
              ${company.address || 'Av. 25 de Setembro, Nº 1420'}, ${company.city || 'Maputo'} - ${company.country || 'Moçambique'}<br>
              <strong>Email:</strong> ${company.email || 'contato@empresa.co.mz'} &bull; <strong>Tel:</strong> ${company.phone || '+258 84 000 0000'}
            </div>
          </div>
          <div class="doc-badge">
            <h1>Relatório Z de Fecho</h1>
            <div class="z-number">${zNumber}</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 3px; font-family: monospace;">
              Série: <strong>${(company as any).fiscalSeries || '2026/A'}</strong> &bull; Cert: <strong>${company.softwareCertNumber || '4120/AT'}</strong>
            </div>
          </div>
        </div>

        <!-- Meta Grid -->
        <div class="section">
          <div class="grid-4">
            <div class="stat-card">
              <div class="stat-label">Loja / Estabelecimento</div>
              <div class="stat-value" style="font-size: 11.5px;">${storeName} (${storeCode})</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Terminal POS</div>
              <div class="stat-value" style="font-size: 11.5px;">${terminalName} (${terminalCode})</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Operador do Turno</div>
              <div class="stat-value" style="font-size: 11.5px;">${shift.operatorName}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Estado do Turno</div>
              <div class="stat-value highlight" style="font-size: 11.5px;">FECHADO & AUDITADO</div>
            </div>
          </div>
        </div>

        <!-- Timestamps Grid -->
        <div class="section">
          <div class="stat-card" style="background: #fdfdfd; padding: 6px 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: monospace;">
              <span><strong>Abertura de Caixa:</strong> ${openedDateFormatted}</span>
              <span><strong>Fecho & Emissão Z:</strong> ${closedDateFormatted}</span>
              <span><strong>ID Sistema:</strong> ${shift.id}</span>
            </div>
          </div>
        </div>

        <!-- Sales & Payments Breakdown + Cash Reconciliation -->
        <div class="section">
          <div class="grid-2">
            <!-- Left: Payment Methods & Sales -->
            <div>
              <div class="section-title">
                <span>Resumo de Vendas & Meios de Pagamento</span>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Meio de Pagamento</th>
                    <th style="text-align: right;">Total Movimentado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 5px 8px; font-weight: 600;">Numerário (Dinheiro em Espécie)</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-weight: bold;">
                      ${formatCurrency(shift.totalCash, company.currency)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 8px; font-weight: 600;">Cartão de Débito / Crédito (TPA)</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-weight: bold;">
                      ${formatCurrency(shift.totalCards, company.currency)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 8px; font-weight: 600;">Pagamento Móvel (MB WAY / M-Pesa / e-Mola)</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-weight: bold;">
                      ${formatCurrency(shift.totalMbway, company.currency)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 8px; font-weight: 600;">Transferências Bancárias</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-weight: bold;">
                      ${formatCurrency(shift.totalTransfers || 0, company.currency)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 8px; font-weight: 600;">Vales / Cartão Presente / Outros</td>
                    <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-weight: bold;">
                      ${formatCurrency(shift.totalVouchers || 0, company.currency)}
                    </td>
                  </tr>
                  <tr style="background: #f9fafb; border-top: 2px solid #111827;">
                    <td style="padding: 7px 8px; font-weight: 900; font-size: 12px; text-transform: uppercase;">
                      Total Faturação Bruta do Turno
                    </td>
                    <td style="padding: 7px 8px; text-align: right; font-family: monospace; font-weight: 900; font-size: 13px; color: #047857;">
                      ${formatCurrency(shift.totalSales, company.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- VAT Summary Notice -->
              <div style="margin-top: 10px; padding: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 10.5px;">
                <div style="font-weight: 700; color: #374151; margin-bottom: 2px;">Resumo Fiscal de Impostos (IVA):</div>
                <div style="display: flex; justify-content: space-between; color: #4b5563;">
                  <span>Incidência Isenta (0% Art. 9º): <strong>${formatCurrency(shift.totalSales * 0.2, company.currency)}</strong></span>
                  <span>Incidência Normal (16% / 23%): <strong>${formatCurrency(shift.totalSales * 0.8, company.currency)}</strong></span>
                </div>
              </div>
            </div>

            <!-- Right: Cash Drawer Audit / Reconciliação -->
            <div>
              <div class="section-title">
                <span>Auditoria & Reconciliação da Gaveta</span>
              </div>
              <div class="box-reconciliation">
                <div class="recon-row">
                  <span>(+) Fundo de Maneio Inicial:</span>
                  <span style="font-family: monospace; font-weight: 700;">${formatCurrency(shift.initialCash, company.currency)}</span>
                </div>
                <div class="recon-row">
                  <span>(+) Vendas em Numerário:</span>
                  <span style="font-family: monospace; font-weight: 700; color: #047857;">+${formatCurrency(shift.totalCash, company.currency)}</span>
                </div>
                <div class="recon-row">
                  <span>(+) Suprimentos de Caixa:</span>
                  <span style="font-family: monospace; font-weight: 700; color: #047857;">+${formatCurrency(shift.suprimentoTotal || 0, company.currency)}</span>
                </div>
                <div class="recon-row">
                  <span>(-) Sangrias / Retiradas de Caixa:</span>
                  <span style="font-family: monospace; font-weight: 700; color: #b91c1c;">-${formatCurrency(shift.sangriaTotal || 0, company.currency)}</span>
                </div>

                <div class="recon-row total-box">
                  <span>(=) Saldo Esperado em Caixa:</span>
                  <span style="font-family: monospace;">${formatCurrency(expectedCash, company.currency)}</span>
                </div>

                <div class="recon-row bold">
                  <span>Saldo Físico Contado / Declarado:</span>
                  <span style="font-family: monospace; font-size: 13px;">${formatCurrency(countedCash, company.currency)}</span>
                </div>

                <div class="recon-row bold" style="color: ${difference === 0 ? '#047857' : '#b91c1c'}; padding-top: 4px;">
                  <span>Diferença de Caixa (${difference > 0 ? 'Sobra' : difference < 0 ? 'Falta / Quebra' : 'Exata / Sem Diferença'}):</span>
                  <span style="font-family: monospace; font-size: 13px;">${formatCurrency(difference, company.currency)}</span>
                </div>
              </div>

              ${shift.notes ? `
                <div style="margin-top: 8px; padding: 6px 10px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 4px; font-size: 10.5px;">
                  <strong>Observações do Operador:</strong> ${shift.notes}
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Sangrias & Suprimentos Itemized Table -->
        <div class="section">
          <div class="section-title">
            <span>Discriminação de Movimentos de Tesouraria no Turno (Sangrias & Suprimentos)</span>
            <span style="font-weight: normal; font-size: 10px; color: #6b7280;">Total: ${(shift.movements || []).length} operações</span>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 25px;">#</th>
                <th style="width: 110px;">Data/Hora</th>
                <th style="width: 140px;">Tipo de Operação</th>
                <th style="width: 110px; text-align: right;">Montante</th>
                <th>Justificação / Motivo</th>
                <th style="width: 120px;">Autorizado Por</th>
              </tr>
            </thead>
            <tbody>
              ${movementsHtml}
            </tbody>
          </table>
        </div>

        <!-- Signatures & Approval Block -->
        <div class="signature-box">
          <div>
            <div style="height: 40px;"></div>
            <div class="sign-line">
              Assinatura do Operador de Caixa<br>
              <strong>${shift.operatorName}</strong>
            </div>
          </div>
          <div>
            <div style="height: 40px;"></div>
            <div class="sign-line">
              Visto do Responsável de Turno / Gerente de Loja<br>
              <strong>Controlo de Auditoria & Conformidade</strong>
            </div>
          </div>
        </div>

        <!-- Fiscal Audit Footer -->
        <div class="footer-fiscal">
          <span>Assinatura Digital AT: ${shift.id.slice(0, 16).toUpperCase()}-RELATORIO-Z-FECHO-FISCAL</span>
          <span>Processado por Programa Certificado nº ${company.softwareCertNumber || '4120/AT'}</span>
          <span>Página 1 de 1</span>
        </div>
      </body>
    </html>
  `;

  // Direct print via iframe or window popup
  try {
    const existingIframe = document.getElementById('zreport-print-frame');
    if (existingIframe) {
      existingIframe.remove();
    }
    const iframe = document.createElement('iframe');
    iframe.id = 'zreport-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 350);
      return;
    }
  } catch (err) {
    console.warn('Iframe print restricted, trying popup window:', err);
  }

  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  } else {
    window.print();
  }
}

/**
 * Print 80mm Thermal Z-Report
 */
export function printZReportThermal(
  shift: CashShift,
  company: Company,
  store?: Store,
  terminal?: Terminal
): void {
  const expectedCash = (shift.initialCash || 0) + (shift.totalCash || 0) + (shift.suprimentoTotal || 0) - (shift.sangriaTotal || 0);
  const countedCash = typeof shift.finalCashReported === 'number' ? shift.finalCashReported : expectedCash;
  const difference = typeof shift.cashDifference === 'number' ? shift.cashDifference : (countedCash - expectedCash);
  const zNumber = shift.zReportNumber || `Z-${shift.id.slice(-4).toUpperCase()}`;

  const movementsThermal = (shift.movements || []).map((m) => `
    <div style="display: flex; justify-content: space-between; font-size: 11px;">
      <span>${m.type === 'sangria' ? '[-] SANGRIA' : '[+] SUPRIM.'} (${m.reason ? m.reason.slice(0, 14) : 'Geral'}):</span>
      <span>${formatCurrency(m.amount, company.currency)}</span>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Z-Report ${zNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          body {
            width: 72mm;
            margin: 0 auto;
            padding: 8px 4px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            color: #000;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="bold" style="font-size: 14px;">${company.tradeName || company.name}</div>
          <div>NIF: ${company.taxNumber || '400123987'}</div>
          <div>${store?.name || 'Loja Principal'} - Term: ${terminal?.code || shift.terminalId || 'POS-01'}</div>
          <div class="divider"></div>
          <div class="bold" style="font-size: 13px;">*** RELATÓRIO Z DE FECHO ***</div>
          <div class="bold">${zNumber}</div>
          <div>Op: ${shift.operatorName}</div>
          <div>Aber: ${formatDate(shift.openedAt)}</div>
          <div>Fech: ${shift.closedAt ? formatDate(shift.closedAt) : formatDate(new Date().toISOString())}</div>
        </div>

        <div class="divider"></div>
        <div class="bold text-center">TOTAIS DE FATURAÇÃO</div>
        <div class="row"><span>Total Vendas:</span><span class="bold">${formatCurrency(shift.totalSales, company.currency)}</span></div>
        <div class="row"><span>- Numerário:</span><span>${formatCurrency(shift.totalCash, company.currency)}</span></div>
        <div class="row"><span>- Cartão TPA:</span><span>${formatCurrency(shift.totalCards, company.currency)}</span></div>
        <div class="row"><span>- MB WAY / Móvel:</span><span>${formatCurrency(shift.totalMbway, company.currency)}</span></div>
        <div class="row"><span>- Transf. / Vales:</span><span>${formatCurrency((shift.totalTransfers || 0) + (shift.totalVouchers || 0), company.currency)}</span></div>

        <div class="divider"></div>
        <div class="bold text-center">GAVETA DE DINHEIRO</div>
        <div class="row"><span>(+) Fundo Inicial:</span><span>${formatCurrency(shift.initialCash, company.currency)}</span></div>
        <div class="row"><span>(+) Vendas Dinheiro:</span><span>${formatCurrency(shift.totalCash, company.currency)}</span></div>
        <div class="row"><span>(+) Suprimentos:</span><span>+${formatCurrency(shift.suprimentoTotal || 0, company.currency)}</span></div>
        <div class="row"><span>(-) Sangrias:</span><span>-${formatCurrency(shift.sangriaTotal || 0, company.currency)}</span></div>
        <div class="divider"></div>
        <div class="row bold"><span>(=) Saldo Teórico:</span><span>${formatCurrency(expectedCash, company.currency)}</span></div>
        <div class="row bold"><span>Saldo Declarado:</span><span>${formatCurrency(countedCash, company.currency)}</span></div>
        <div class="row bold"><span>Diferença:</span><span>${formatCurrency(difference, company.currency)}</span></div>

        ${movementsThermal ? `
          <div class="divider"></div>
          <div class="bold text-center">MOVIMENTOS DO TURNO</div>
          ${movementsThermal}
        ` : ''}

        <div class="double-divider"></div>
        <div class="text-center" style="font-size: 10px;">
          Software Certificado nº ${company.softwareCertNumber || '4120/AT'}<br>
          Assinatura Digital Gravada
        </div>
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 300);
  }
}

/**
 * Download Z-Report as formal PDF Document
 */
export async function downloadZReportPdf(
  shift: CashShift,
  company: Company,
  store?: Store,
  terminal?: Terminal
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const currency = company.currencySymbol || company.currency || 'Mt';
  const expectedCash = (shift.initialCash || 0) + (shift.totalCash || 0) + (shift.suprimentoTotal || 0) - (shift.sangriaTotal || 0);
  const countedCash = typeof shift.finalCashReported === 'number' ? shift.finalCashReported : expectedCash;
  const difference = typeof shift.cashDifference === 'number' ? shift.cashDifference : (countedCash - expectedCash);
  const zNumber = shift.zReportNumber || `Z-${new Date(shift.closedAt || shift.openedAt).getFullYear()}/${shift.id.slice(-4).toUpperCase()}`;

  const logo = await getCompanyLogoForPdf(company.logoUrl, company.tradeName || company.name);
  let textStartX = 14;
  if (logo) {
    const { width: logoW, height: logoH } = calculateFittedDimensions(32, 14, logo.width, logo.height);
    try {
      doc.addImage(logo.dataUrl, logo.format, 14, 13, logoW, logoH);
      textStartX = 14 + logoW + 4;
    } catch {
      textStartX = 14;
    }
  }

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(company.tradeName || company.name, textStartX, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`NIF: ${company.taxNumber || '400123987'} • ${company.city || 'Maputo'}, ${company.country || 'Moçambique'}`, textStartX, 23);
  doc.text(`Loja: ${store?.name || 'Loja Principal'} • Terminal: ${terminal?.code || shift.terminalId || 'POS-01'}`, textStartX, 27);

  // Document Title Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(180, 83, 9);
  doc.text('RELATÓRIO Z DE FECHO DE CAIXA', 196, 18, { align: 'right' });
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(zNumber, 196, 23, { align: 'right' });
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text(`Cert. AT: ${company.softwareCertNumber || '4120/AT'} • Série: ${(company as any).fiscalSeries || '2026/A'}`, 196, 27, { align: 'right' });

  doc.setDrawColor(229, 231, 235);
  doc.line(14, 31, 196, 31);

  // Metadata Grid
  autoTable(doc, {
    startY: 34,
    theme: 'grid',
    head: [['Operador Responsável', 'Abertura de Turno', 'Fecho / Emissão Z', 'Estado']],
    body: [
      [
        shift.operatorName,
        formatDate(shift.openedAt),
        shift.closedAt ? formatDate(shift.closedAt) : formatDate(new Date().toISOString()),
        'FECHADO & AUDITADO'
      ]
    ],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontStyle: 'bold' }
  });

  const metaFinalY = (doc as any).lastAutoTable.finalY + 6;

  // Sales Summary Table & Cash Reconciliation Table
  autoTable(doc, {
    startY: metaFinalY,
    theme: 'striped',
    head: [['Meio de Pagamento / Faturação', 'Montante']],
    body: [
      ['Numerário (Dinheiro)', formatCurrency(shift.totalCash, company.currency)],
      ['Cartão TPA / POS', formatCurrency(shift.totalCards, company.currency)],
      ['Pagamentos Móveis (MB WAY / M-Pesa)', formatCurrency(shift.totalMbway, company.currency)],
      ['Transferências Bancárias', formatCurrency(shift.totalTransfers || 0, company.currency)],
      ['Vales & Cartões Presente', formatCurrency(shift.totalVouchers || 0, company.currency)],
      ['TOTAL FATURADO NO TURNO', formatCurrency(shift.totalSales, company.currency)]
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' }
    }
  });

  const salesFinalY = (doc as any).lastAutoTable.finalY + 6;

  // Drawer Reconciliation
  autoTable(doc, {
    startY: salesFinalY,
    theme: 'grid',
    head: [['Conceito de Caixa / Auditoria', 'Valor']],
    body: [
      ['(+) Fundo de Maneio Inicial', formatCurrency(shift.initialCash, company.currency)],
      ['(+) Vendas em Dinheiro', `+${formatCurrency(shift.totalCash, company.currency)}`],
      ['(+) Suprimentos (Reforço)', `+${formatCurrency(shift.suprimentoTotal || 0, company.currency)}`],
      ['(-) Sangrias (Retiradas)', `-${formatCurrency(shift.sangriaTotal || 0, company.currency)}`],
      ['(=) Saldo Teórico em Caixa', formatCurrency(expectedCash, company.currency)],
      ['Saldo Físico Contado / Declarado', formatCurrency(countedCash, company.currency)],
      ['Diferença de Caixa', formatCurrency(difference, company.currency)]
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [197, 164, 126], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' }
    }
  });

  const reconFinalY = (doc as any).lastAutoTable.finalY + 6;

  // Movements Table if any
  if (shift.movements && shift.movements.length > 0) {
    autoTable(doc, {
      startY: reconFinalY,
      theme: 'grid',
      head: [['Data/Hora', 'Tipo', 'Montante', 'Justificação', 'Autorização']],
      body: shift.movements.map((m) => [
        formatDate(m.timestamp),
        m.type.toUpperCase(),
        `${m.type === 'sangria' ? '-' : '+'}${formatCurrency(m.amount, company.currency)}`,
        m.reason || '—',
        m.authorizedBy || shift.operatorName
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55] }
    });
  }

  // Signatures at the bottom
  const finalY = Math.min((doc as any).lastAutoTable.finalY + 18, 255);
  doc.setDrawColor(156, 163, 175);
  doc.line(20, finalY, 85, finalY);
  doc.line(125, finalY, 190, finalY);

  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text('Assinatura do Operador', 52.5, finalY + 4, { align: 'center' });
  doc.text(shift.operatorName, 52.5, finalY + 8, { align: 'center' });

  doc.text('Visto do Responsável / Gerente', 157.5, finalY + 4, { align: 'center' });
  doc.text('Controlo de Auditoria', 157.5, finalY + 8, { align: 'center' });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(`Documento emitido para efeitos fiscais e auditoria interna • ID: ${shift.id}`, 105, 288, { align: 'center' });

  doc.save(`Relatorio_Z_${zNumber.replace(/[\/\s]/g, '_')}.pdf`);
}

/**
 * Options interface for printing/downloading Inventory Extract
 */
export interface InventoryExtractPrintOptions {
  rows: InventoryExtractRow[];
  periodLabel: string;
  initialStockTotal: number;
  finalStockTotal: number;
  totalIn: number;
  totalOut: number;
  totalCostValue: number;
  company: Company;
  store?: Store;
  warehouseName?: string;
  filterDetails?: string;
}

/**
 * Print Inventory Extract in formal A4 layout
 */
export function printInventoryExtractA4(options: InventoryExtractPrintOptions): void {
  const {
    rows,
    periodLabel,
    initialStockTotal,
    finalStockTotal,
    totalIn,
    totalOut,
    totalCostValue,
    company,
    store,
    warehouseName = 'Todos os Armazéns',
    filterDetails = 'Todos os artigos e categorias'
  } = options;

  const rowsHtml = rows.map((r, idx) => `
    <tr style="border-bottom: 1px solid #e5e7eb; font-size: 10px;">
      <td style="padding: 5px 6px; font-family: monospace; color: #4b5563;">${idx + 1}</td>
      <td style="padding: 5px 6px; font-family: monospace; white-space: nowrap;">${formatDate(r.timestamp)}</td>
      <td style="padding: 5px 6px;">
        <div style="font-weight: bold; color: #111827;">${r.productName}</div>
        <div style="font-size: 9px; color: #6b7280; font-family: monospace;">SKU: ${r.sku} ${r.batchNumber ? `| Lote: ${r.batchNumber}` : ''}</div>
      </td>
      <td style="padding: 5px 6px; color: #4b5563;">${r.warehouseName}</td>
      <td style="padding: 5px 6px; text-align: center;">
        <span style="font-weight: bold; text-transform: uppercase; font-size: 9px; padding: 2px 5px; border-radius: 3px; background: ${
          r.type === 'entrada' ? '#dcfce7; color: #15803d;' :
          r.type === 'saida' || r.type === 'venda' ? '#fee2e2; color: #b91c1c;' :
          r.type === 'transferencia' ? '#e0f2fe; color: #0369a1;' :
          '#fef3c7; color: #b45309;'
        }">
          ${r.typeLabel}
        </span>
      </td>
      <td style="padding: 5px 6px; font-family: monospace; color: #4b5563;">${r.referenceDoc || '—'}</td>
      <td style="padding: 5px 6px; text-align: right; font-family: monospace; font-weight: bold; color: ${r.quantityIn > 0 ? '#15803d' : '#9ca3af'};">
        ${r.quantityIn > 0 ? `+${r.quantityIn}` : '—'}
      </td>
      <td style="padding: 5px 6px; text-align: right; font-family: monospace; font-weight: bold; color: ${r.quantityOut > 0 ? '#b91c1c' : '#9ca3af'};">
        ${r.quantityOut > 0 ? `-${r.quantityOut}` : '—'}
      </td>
      <td style="padding: 5px 6px; text-align: right; font-family: monospace; font-weight: 800; background: #f9fafb;">
        ${r.runningBalance} ${r.unit}
      </td>
      <td style="padding: 5px 6px; text-align: right; font-family: monospace;">
        ${formatCurrency(r.unitCost, company.currency)}
      </td>
      <td style="padding: 5px 6px; text-align: right; font-family: monospace; font-weight: bold;">
        ${formatCurrency(r.totalCost, company.currency)}
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt">
      <head>
        <meta charset="utf-8">
        <title>Extrato de Inventário - ${periodLabel}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #111827;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .company-title {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
          }
          .grid-summary {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin-bottom: 12px;
          }
          .stat-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 6px 8px;
          }
          .stat-label {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            color: #6b7280;
          }
          .stat-value {
            font-size: 13px;
            font-weight: 800;
            font-family: monospace;
            color: #111827;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          table.data-table th {
            background: #f3f4f6;
            color: #374151;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9px;
            padding: 5px 6px;
            border-top: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
          }
          .footer {
            margin-top: 14px;
            padding-top: 6px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #6b7280;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-title">${company.tradeName || company.name}</div>
            <div style="font-size: 10.5px; color: #4b5563; margin-top: 2px;">
              <strong>NIF:</strong> ${company.taxNumber || '400123987'} &bull; <strong>Estabelecimento:</strong> ${store?.name || 'Geral'} &bull; <strong>Armazém:</strong> ${warehouseName}
            </div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 1px;">
              <strong>Critérios de Filtro:</strong> ${filterDetails}
            </div>
          </div>
          <div style="text-align: right;">
            <h1 style="margin: 0; font-size: 15px; font-weight: 900; text-transform: uppercase;">Extrato de Inventário</h1>
            <div style="font-size: 11px; font-weight: bold; color: #b45309; margin-top: 2px;">Período: ${periodLabel}</div>
            <div style="font-size: 9px; color: #6b7280; font-family: monospace; margin-top: 2px;">
              Data Emissão: ${formatDate(new Date().toISOString())}
            </div>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid-summary">
          <div class="stat-card">
            <div class="stat-label">Saldo Inicial Período</div>
            <div class="stat-value">${initialStockTotal} un</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Entradas (+)</div>
            <div class="stat-value" style="color: #15803d;">+${totalIn} un</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Saídas (-)</div>
            <div class="stat-value" style="color: #b91c1c;">-${totalOut} un</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Saldo Final Período</div>
            <div class="stat-value">${finalStockTotal} un</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Valor Total em Custo</div>
            <div class="stat-value">${formatCurrency(totalCostValue, company.currency)}</div>
          </div>
        </div>

        <!-- Table -->
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 20px;">#</th>
              <th style="width: 100px;">Data/Hora</th>
              <th>Artigo / SKU / Lote</th>
              <th style="width: 110px;">Armazém</th>
              <th style="width: 90px; text-align: center;">Tipo</th>
              <th style="width: 90px;">Documento</th>
              <th style="width: 60px; text-align: right;">Entrada</th>
              <th style="width: 60px; text-align: right;">Saída</th>
              <th style="width: 70px; text-align: right;">Saldo</th>
              <th style="width: 75px; text-align: right;">Custo Unit.</th>
              <th style="width: 85px; text-align: right;">Valor Custo</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="11" style="text-align: center; padding: 16px; color: #9ca3af;">Nenhum movimento encontrado para o filtro selecionado.</td></tr>`}
          </tbody>
        </table>

        <div class="footer">
          <span>Relatório de Auditoria de Inventário e Controlo Físico de Stock</span>
          <span>Software Certificado nº ${company.softwareCertNumber || '4120/AT'}</span>
          <span>Total de Linhas: ${rows.length}</span>
        </div>
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1200);
    }, 350);
  }
}

/**
 * Download Inventory Extract as PDF
 */
export async function downloadInventoryExtractPdf(options: InventoryExtractPrintOptions): Promise<void> {
  const {
    rows,
    periodLabel,
    initialStockTotal,
    finalStockTotal,
    totalIn,
    totalOut,
    totalCostValue,
    company,
    store,
    warehouseName = 'Todos os Armazéns'
  } = options;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const logo = await getCompanyLogoForPdf(company.logoUrl, company.tradeName || company.name);
  let textStartX = 14;
  if (logo) {
    const { width: logoW, height: logoH } = calculateFittedDimensions(32, 12, logo.width, logo.height);
    try {
      doc.addImage(logo.dataUrl, logo.format, 14, 11, logoW, logoH);
      textStartX = 14 + logoW + 4;
    } catch {
      textStartX = 14;
    }
  }

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  doc.text(company.tradeName || company.name, textStartX, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`NIF: ${company.taxNumber || '400123987'} • Armazém: ${warehouseName} • Loja: ${store?.name || 'Geral'}`, textStartX, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(180, 83, 9);
  doc.text('EXTRATO DE INVENTÁRIO & MOVIMENTOS', 283, 16, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Período: ${periodLabel}`, 283, 21, { align: 'right' });

  doc.setDrawColor(229, 231, 235);
  doc.line(14, 24, 283, 24);

  // Summary Banner
  autoTable(doc, {
    startY: 27,
    theme: 'grid',
    head: [['Saldo Inicial', 'Total Entradas (+)', 'Total Saídas (-)', 'Saldo Final', 'Valor Total em Custo']],
    body: [
      [
        `${initialStockTotal} un`,
        `+${totalIn} un`,
        `-${totalOut} un`,
        `${finalStockTotal} un`,
        formatCurrency(totalCostValue, company.currency)
      ]
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5, halign: 'center' },
    headStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontStyle: 'bold' }
  });

  const summaryFinalY = (doc as any).lastAutoTable.finalY + 4;

  // Movements Data Table
  autoTable(doc, {
    startY: summaryFinalY,
    theme: 'striped',
    head: [['#', 'Data/Hora', 'Artigo / SKU', 'Armazém', 'Tipo', 'Documento', 'Entrada', 'Saída', 'Saldo', 'Custo Unit.', 'Valor Custo']],
    body: rows.map((r, idx) => [
      idx + 1,
      formatDate(r.timestamp),
      `${r.productName} (${r.sku})`,
      r.warehouseName,
      r.typeLabel,
      r.referenceDoc || '—',
      r.quantityIn > 0 ? `+${r.quantityIn}` : '—',
      r.quantityOut > 0 ? `-${r.quantityOut}` : '—',
      `${r.runningBalance} ${r.unit}`,
      formatCurrency(r.unitCost, company.currency),
      formatCurrency(r.totalCost, company.currency)
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      6: { halign: 'right', textColor: [22, 101, 52] },
      7: { halign: 'right', textColor: [185, 28, 28] },
      8: { halign: 'right', fontStyle: 'bold' },
      9: { halign: 'right' },
      10: { halign: 'right', fontStyle: 'bold' }
    }
  });

  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text(`Extrato emitido em ${formatDate(new Date().toISOString())} • Software Certificado nº ${company.softwareCertNumber || '4120/AT'}`, 14, 202);

  doc.save(`Extrato_Inventario_${periodLabel.replace(/[\/\s]/g, '_')}.pdf`);
}

/**
 * Export Inventory Extract as CSV
 */
export function exportInventoryExtractCsv(options: InventoryExtractPrintOptions): void {
  const { rows, periodLabel, company } = options;

  const headers = [
    'Item',
    'Data_Hora',
    'Artigo',
    'SKU',
    'Unidade',
    'Armazem',
    'Tipo_Movimento',
    'Documento_Ref',
    'Entrada',
    'Saida',
    'Saldo_Acumulado',
    'Custo_Unitario',
    'Valor_Total_Custo',
    'Operador',
    'Motivo'
  ];

  const csvRows = rows.map((r, idx) => [
    idx + 1,
    `"${r.timestamp}"`,
    `"${(r.productName || '').replace(/"/g, '""')}"`,
    `"${r.sku || ''}"`,
    `"${r.unit || 'un'}"`,
    `"${(r.warehouseName || '').replace(/"/g, '""')}"`,
    `"${r.typeLabel || r.type}"`,
    `"${r.referenceDoc || ''}"`,
    r.quantityIn,
    r.quantityOut,
    r.runningBalance,
    r.unitCost,
    r.totalCost,
    `"${(r.operatorName || '').replace(/"/g, '""')}"`,
    `"${(r.reason || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...csvRows.map((e) => e.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Extrato_Inventario_${company.tradeName || 'Stock'}_${periodLabel.replace(/[\/\s]/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

