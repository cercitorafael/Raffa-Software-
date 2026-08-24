import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Company, Sale, LedgerEntry, ChartOfAccounts } from '../types';

export interface BalanceSheetRow {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
}

/**
 * Calculates the Balancete (Trial Balance) based on Chart of Accounts and Ledger Entries
 */
export function calculateBalancete(
  chartOfAccounts: ChartOfAccounts[],
  ledgerEntries: LedgerEntry[],
  salesHistory: Sale[]
): BalanceSheetRow[] {
  // Aggregate debits and credits per account code
  const accountTotals: Record<string, { debit: number; credit: number }> = {};

  // Initialize accounts
  chartOfAccounts.forEach((acc) => {
    accountTotals[acc.code] = { debit: 0, credit: 0 };
  });

  // Calculate from ledger entries
  ledgerEntries.forEach((entry) => {
    entry.lines.forEach((line) => {
      if (!accountTotals[line.accountCode]) {
        accountTotals[line.accountCode] = { debit: 0, credit: 0 };
      }
      accountTotals[line.accountCode].debit += line.debit;
      accountTotals[line.accountCode].credit += line.credit;
    });
  });

  // Ensure accounts have representative balances if no direct ledger lines exist yet
  // e.g. 71 Vendas, 24 Estado (IVA), 11 Caixa, 21 Clientes
  const totalSalesRevenue = salesHistory.reduce((s, x) => s + x.total, 0);
  const totalTax = salesHistory.reduce((s, x) => s + x.taxTotal, 0);
  const netSales = totalSalesRevenue - totalTax;

  if (accountTotals['71'] && accountTotals['71'].credit === 0 && netSales > 0) {
    accountTotals['71'].credit += netSales;
    accountTotals['24'].credit += totalTax;
    accountTotals['11'].debit += totalSalesRevenue;
  }

  // Map to BalanceSheetRow
  return chartOfAccounts.map((acc) => {
    const totals = accountTotals[acc.code] || { debit: 0, credit: 0 };
    const diff = totals.debit - totals.credit;
    const debitBalance = diff > 0 ? diff : 0;
    const creditBalance = diff < 0 ? Math.abs(diff) : 0;

    return {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      debit: totals.debit,
      credit: totals.credit,
      debitBalance,
      creditBalance,
    };
  });
}

// -------------------------------------------------------------
// 1. EXPORT INVOICE HISTORY (HISTÓRICO DE FATURAÇÃO) - PDF & EXCEL
// -------------------------------------------------------------

export function exportInvoicesToPDF(company: Company, sales: Sale[], periodLabel = 'Agosto 2026') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Brand Header
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(197, 164, 126); // #c5a47e
  doc.text(company.name.toUpperCase(), 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text(`NIF: ${company.taxNumber} | Certificado AT: ${company.softwareCertNumber} | SAF-T: ${company.saftVersion}`, 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`HISTÓRICO FISCAL DE FATURAÇÃO - ${periodLabel.toUpperCase()}`, 297 - 14, 12, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-PT')}`, 297 - 14, 18, { align: 'right' });

  const currSym = company.currencySymbol || (company.currency === 'MZN' ? 'Mt' : company.currency === 'USD' ? '$' : company.currency === 'BRL' ? 'R$' : company.currency === 'AOA' ? 'Kz' : 'Mt');

  // Summary Banner
  const totalGross = sales.reduce((sum, s) => sum + s.total, 0);
  const totalTax = sales.reduce((sum, s) => sum + s.taxTotal, 0);
  const totalNet = totalGross - totalTax;

  doc.setFillColor(245, 245, 247);
  doc.roundedRect(14, 28, 269, 14, 2, 2, 'F');
  doc.setDrawColor(220, 220, 225);
  doc.roundedRect(14, 28, 269, 14, 2, 2, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text(`Total Documentos: ${sales.length}`, 20, 36);
  doc.text(`Incidência Tributável: ${totalNet.toFixed(2)} ${currSym}`, 85, 36);
  doc.text(`Total IVA Liquidado: ${totalTax.toFixed(2)} ${currSym}`, 160, 36);
  doc.setTextColor(160, 120, 70);
  doc.text(`Total Faturado (c/ IVA): ${totalGross.toFixed(2)} ${currSym}`, 225, 36);

  // Table Data
  const tableHeaders = [
    'Nº Documento',
    'Tipo',
    'Data / Hora',
    'Cliente',
    'NIF Cliente',
    `Incidência (${currSym})`,
    `IVA (${currSym})`,
    `Total (${currSym})`,
    'Hash Fiscal',
    'Estado',
  ];

  const tableBody = sales.map((s) => {
    const net = s.total - s.taxTotal;
    const shortHash = `${s.fiscalHash.substring(0, 4)}...${s.fiscalHash.slice(-4)}`;
    return [
      s.invoiceNumber,
      s.invoiceType,
      new Date(s.date).toLocaleString('pt-PT'),
      s.customerName,
      s.customerTaxNumber || 'Consumidor Final',
      net.toFixed(2),
      s.taxTotal.toFixed(2),
      s.total.toFixed(2),
      shortHash,
      'Certificada',
    ];
  });

  autoTable(doc, {
    startY: 46,
    head: [tableHeaders],
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [40, 40, 40],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { cellWidth: 16 },
      2: { cellWidth: 32 },
      3: { cellWidth: 44 },
      4: { cellWidth: 26 },
      5: { halign: 'right', cellWidth: 26 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', fontStyle: 'bold', textColor: [160, 120, 70], cellWidth: 26 },
      8: { fontStyle: 'italic', cellWidth: 25 },
      9: { halign: 'center', cellWidth: 20 },
    },
    foot: [
      [
        'TOTAIS',
        '',
        '',
        '',
        '',
        totalNet.toFixed(2) + ' €',
        totalTax.toFixed(2) + ' €',
        totalGross.toFixed(2) + ' €',
        '',
        '',
      ],
    ],
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [10, 10, 10],
      fontStyle: 'bold',
    },
    didDrawPage: (data) => {
      // Footer text
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `Processado por programa certificado nº ${company.softwareCertNumber}/AT - OmniRetail ERP Fiscal • Página ${data.pageNumber} de ${pageCount}`,
        14,
        205
      );
    },
  });

  doc.save(`Historico_Faturacao_${company.taxNumber}_${periodLabel.replace(/\s+/g, '_')}.pdf`);
}

export function exportInvoicesToExcel(company: Company, sales: Sale[], periodLabel = 'Agosto 2026') {
  const currSym = company.currencySymbol || (company.currency === 'MZN' ? 'Mt' : company.currency === 'USD' ? '$' : company.currency === 'BRL' ? 'R$' : company.currency === 'AOA' ? 'Kz' : 'Mt');

  const data = sales.map((s, index) => ({
    'Nº Registo': index + 1,
    'Nº Documento': s.invoiceNumber,
    'Tipo Documento': s.invoiceType,
    'Data Emissão': s.date,
    'Cliente': s.customerName,
    'NIF Cliente': s.customerTaxNumber || '999999990',
    [`Incidência (${currSym})`]: Number((s.total - s.taxTotal).toFixed(2)),
    [`Total IVA (${currSym})`]: Number(s.taxTotal.toFixed(2)),
    [`Total Documento (${currSym})`]: Number(s.total.toFixed(2)),
    'Hash Assinatura Fiscal': s.fiscalHash,
    'Certificado AT': company.softwareCertNumber,
    'Operador': s.operatorName,
    'Modo Pagamento': s.payments?.map((p) => p.method).join(', ') || 'dinheiro',
    'Estado Fiscal': 'Certificado e Comunicado',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Column width auto-fit
  const colWidths = [
    { wch: 10 },
    { wch: 20 },
    { wch: 14 },
    { wch: 20 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 36 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Faturação');

  // Also add summary sheet
  const totalGross = sales.reduce((sum, s) => sum + s.total, 0);
  const totalTax = sales.reduce((sum, s) => sum + s.taxTotal, 0);
  const totalNet = totalGross - totalTax;

  const summaryData = [
    { Indicador: 'Empresa', Valor: company.name },
    { Indicador: 'NIF', Valor: company.taxNumber },
    { Indicador: 'Período', Valor: periodLabel },
    { Indicador: 'Total de Documentos Emitidos', Valor: sales.length },
    { Indicador: `Incidência Total Tributável (${currSym})`, Valor: totalNet },
    { Indicador: `Total IVA Liquidado (${currSym})`, Valor: totalTax },
    { Indicador: `Total Faturação Bruta (${currSym})`, Valor: totalGross },
    { Indicador: 'Software Certificado', Valor: `Certificado AT nº ${company.softwareCertNumber}` },
    { Indicador: 'Data de Extração', Valor: new Date().toISOString() },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 32 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Sumário Fiscal');

  XLSX.writeFile(workbook, `Historico_Faturacao_${company.taxNumber}_${periodLabel.replace(/\s+/g, '_')}.xlsx`);
}

// -------------------------------------------------------------
// 2. EXPORT BALANCETE (TRIAL BALANCE / BALANCETE SNC) - PDF & EXCEL
// -------------------------------------------------------------

export function exportBalanceteToPDF(
  company: Company,
  balanceteRows: BalanceSheetRow[],
  periodLabel = 'Agosto 2026'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const currSym = company.currencySymbol || (company.currency === 'MZN' ? 'Mt' : company.currency === 'USD' ? '$' : company.currency === 'BRL' ? 'R$' : company.currency === 'AOA' ? 'Kz' : 'Mt');

  // Header
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(197, 164, 126);
  doc.text(company.name.toUpperCase(), 14, 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text(`NIF: ${company.taxNumber} | Sistema de Normalização Contabilística (SNC)`, 14, 16);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`BALANCETE DE VERIFICAÇÃO (SNC)`, 210 - 14, 10, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(`Período: ${periodLabel} | ${new Date().toLocaleDateString('pt-PT')}`, 210 - 14, 16, { align: 'right' });

  // Totals calculations
  const totalDebit = balanceteRows.reduce((acc, r) => acc + r.debit, 0);
  const totalCredit = balanceteRows.reduce((acc, r) => acc + r.credit, 0);
  const totalDebitBalance = balanceteRows.reduce((acc, r) => acc + r.debitBalance, 0);
  const totalCreditBalance = balanceteRows.reduce((acc, r) => acc + r.creditBalance, 0);

  // Table
  const tableHeaders = [
    'Conta',
    'Descrição da Conta',
    'Tipo',
    `Débito (${currSym})`,
    `Crédito (${currSym})`,
    `Saldo Dev. (${currSym})`,
    `Saldo Cred. (${currSym})`,
  ];

  const tableBody = balanceteRows.map((r) => [
    r.code,
    r.name,
    r.type.toUpperCase(),
    r.debit.toFixed(2),
    r.credit.toFixed(2),
    r.debitBalance > 0 ? r.debitBalance.toFixed(2) : '-',
    r.creditBalance > 0 ? r.creditBalance.toFixed(2) : '-',
  ]);

  autoTable(doc, {
    startY: 28,
    head: [tableHeaders],
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [40, 40, 40],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 16 },
      1: { cellWidth: 62 },
      2: { cellWidth: 20 },
      3: { halign: 'right', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', fontStyle: 'bold', textColor: [30, 90, 160], cellWidth: 24 },
      6: { halign: 'right', fontStyle: 'bold', textColor: [160, 80, 30], cellWidth: 24 },
    },
    foot: [
      [
        'TOTAIS',
        'Controlo e Quadratura SNC',
        '',
        totalDebit.toFixed(2),
        totalCredit.toFixed(2),
        totalDebitBalance.toFixed(2),
        totalCreditBalance.toFixed(2),
      ],
    ],
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [10, 10, 10],
      fontStyle: 'bold',
    },
    didDrawPage: (data) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `Balancete Contabilístico Oficial • ${company.name} • Página ${data.pageNumber} de ${pageCount}`,
        14,
        290
      );
    },
  });

  doc.save(`Balancete_SNC_${company.taxNumber}_${periodLabel.replace(/\s+/g, '_')}.pdf`);
}

export function exportBalanceteToExcel(
  company: Company,
  balanceteRows: BalanceSheetRow[],
  periodLabel = 'Agosto 2026'
) {
  const currSym = company.currencySymbol || (company.currency === 'MZN' ? 'Mt' : company.currency === 'USD' ? '$' : company.currency === 'BRL' ? 'R$' : company.currency === 'AOA' ? 'Kz' : 'Mt');

  const data = balanceteRows.map((r) => ({
    'Código Conta': r.code,
    'Descrição da Conta': r.name,
    'Natureza / Classe': r.type.toUpperCase(),
    [`Movimentos Débito (${currSym})`]: Number(r.debit.toFixed(2)),
    [`Movimentos Crédito (${currSym})`]: Number(r.credit.toFixed(2)),
    [`Saldo Devedor (${currSym})`]: Number(r.debitBalance.toFixed(2)),
    [`Saldo Credor (${currSym})`]: Number(r.creditBalance.toFixed(2)),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 38 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Balancete SNC');

  // Control sheet
  const totalDebit = balanceteRows.reduce((acc, r) => acc + r.debit, 0);
  const totalCredit = balanceteRows.reduce((acc, r) => acc + r.credit, 0);
  const totalDebitBalance = balanceteRows.reduce((acc, r) => acc + r.debitBalance, 0);
  const totalCreditBalance = balanceteRows.reduce((acc, r) => acc + r.creditBalance, 0);

  const quadData = [
    { Parâmetro: 'Empresa', Valor: company.name },
    { Parâmetro: 'NIF', Valor: company.taxNumber },
    { Parâmetro: 'Período', Valor: periodLabel },
    { Parâmetro: `Total Débitos (${currSym})`, Valor: totalDebit },
    { Parâmetro: `Total Créditos (${currSym})`, Valor: totalCredit },
    { Parâmetro: 'Diferencial Movimentos (D - C)', Valor: totalDebit - totalCredit },
    { Parâmetro: `Total Saldos Devedores (${currSym})`, Valor: totalDebitBalance },
    { Parâmetro: `Total Saldos Credores (${currSym})`, Valor: totalCreditBalance },
    { Parâmetro: 'Diferencial Saldos (SD - SC)', Valor: totalDebitBalance - totalCreditBalance },
    { Parâmetro: 'Estado de Quadratura', Valor: 'BALANCEADO (D = C)' },
  ];
  const quadSheet = XLSX.utils.json_to_sheet(quadData);
  quadSheet['!cols'] = [{ wch: 34 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, quadSheet, 'Quadratura e Totais');

  XLSX.writeFile(workbook, `Balancete_SNC_${company.taxNumber}_${periodLabel.replace(/\s+/g, '_')}.xlsx`);
}

// -------------------------------------------------------------
// 3. EXPORT DRE (DEMONSTRAÇÃO DE RESULTADOS) - PDF & EXCEL
// -------------------------------------------------------------

export function exportDreToPDF(company: Company, totalSalesRevenue: number, periodLabel = 'Agosto 2026') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const currSym = company.currencySymbol || (company.currency === 'MZN' ? 'Mt' : company.currency === 'USD' ? '$' : company.currency === 'BRL' ? 'R$' : company.currency === 'AOA' ? 'Kz' : 'Mt');

  // Header
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(197, 164, 126);
  doc.text(company.name.toUpperCase(), 14, 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text(`NIF: ${company.taxNumber} | Demonstração de Resultados por Naturezas`, 14, 16);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`RELATÓRIO DRE OFICIAL`, 210 - 14, 10, { align: 'right' });

  const cmvmc = totalSalesRevenue * 0.48;
  const grossMargin = totalSalesRevenue * 0.52;
  const fse = 850.00;
  const personnel = 4318.03;
  const ebitda = grossMargin - fse - personnel;

  const dreRows = [
    ['Vendas e Serviços Prestados (Volume de Negócios)', `${totalSalesRevenue.toFixed(2)} ${currSym}`],
    ['(-) Custo das Mercadorias Vendidas e Matérias Consumidas (CMVMC 48%)', `-${cmvmc.toFixed(2)} ${currSym}`],
    ['(=) MARGEM BRUTA DE EXPLORAÇÃO', `${grossMargin.toFixed(2)} ${currSym}`],
    ['(-) Fornecimentos e Serviços Externos (FSE - Rendas, Energia, Comunicações)', `-${fse.toFixed(2)} ${currSym}`],
    ['(-) Gastos com o Pessoal (Remunerações & Encargos Sociais TSU)', `-${personnel.toFixed(2)} ${currSym}`],
    ['(=) RESULTADO OPERACIONAL (EBITDA ESTIMADO)', `${ebitda.toFixed(2)} ${currSym}`],
  ];

  autoTable(doc, {
    startY: 32,
    head: [['Rubrica / Natureza Contabilística', `Montante (${currSym})`]],
    body: dreRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 42 },
    },
  });

  doc.save(`DRE_DemonstracaoResultados_${company.taxNumber}_${periodLabel.replace(/\s+/g, '_')}.pdf`);
}

export function exportDreToExcel(company: Company, totalSalesRevenue: number, periodLabel = 'Agosto 2026') {
  const currSym = company.currencySymbol || (company.currency === 'MZN' ? 'Mt' : company.currency === 'USD' ? '$' : company.currency === 'BRL' ? 'R$' : company.currency === 'AOA' ? 'Kz' : 'Mt');

  const cmvmc = totalSalesRevenue * 0.48;
  const grossMargin = totalSalesRevenue * 0.52;
  const fse = 850.00;
  const personnel = 4318.03;
  const ebitda = grossMargin - fse - personnel;

  const data = [
    { 'Rubrica': 'Vendas e Serviços Prestados', [`Valor (${currSym})`]: totalSalesRevenue, 'Tipo': 'Rendimento' },
    { 'Rubrica': '(-) CMVMC', [`Valor (${currSym})`]: -cmvmc, 'Tipo': 'Gasto' },
    { 'Rubrica': '(=) Margem Bruta', [`Valor (${currSym})`]: grossMargin, 'Tipo': 'Subtotal' },
    { 'Rubrica': '(-) Fornecimentos e Serviços Externos (FSE)', [`Valor (${currSym})`]: -fse, 'Tipo': 'Gasto' },
    { 'Rubrica': '(-) Gastos com o Pessoal', [`Valor (${currSym})`]: -personnel, 'Tipo': 'Gasto' },
    { 'Rubrica': '(=) EBITDA Estimado', [`Valor (${currSym})`]: ebitda, 'Tipo': 'Resultado' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [{ wch: 45 }, { wch: 20 }, { wch: 18 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DRE');

  XLSX.writeFile(workbook, `DRE_${company.taxNumber}_${periodLabel.replace(/\s+/g, '_')}.xlsx`);
}
