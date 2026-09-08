import { jsPDF } from 'jspdf';
import { Company, CompanyAttachedDocument } from '../types';

/**
 * Formats byte count to readable string
 */
export function formatDocumentSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Triggers direct browser download of a CompanyAttachedDocument
 */
export function downloadAttachedDocument(doc: CompanyAttachedDocument): void {
  if (!doc || !doc.dataUrl) return;
  const link = document.createElement('a');
  link.href = doc.dataUrl;
  link.download = doc.name || 'documento_fiscal.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Reads a File from an input[type=file] and converts to CompanyAttachedDocument
 */
export function readFileAsAttachedDocument(file: File): Promise<CompanyAttachedDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl,
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Generates official formal A4 PDF for "Requerimento" pre-filled with company details
 */
export function generateOfficialRequerimentoPdf(company: Partial<Company>): CompanyAttachedDocument {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 22;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header banner
  doc.setFillColor(248, 246, 240);
  doc.rect(margin, y, contentWidth, 22, 'F');
  doc.setDrawColor(197, 164, 126);
  doc.setLineWidth(0.6);
  doc.rect(margin, y, contentWidth, 22, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('REPÚBLICA DE MOÇAMBIQUE / MINISTÉRIO DA ECONOMIA E FINANÇAS', pageWidth / 2, y + 7, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(90, 80, 70);
  doc.text('AUTORIDADE TRIBUTÁRIA • DIRECÇÃO-GERAL DE IMPOSTOS', pageWidth / 2, y + 13, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('Repartição de Finanças / Delegação Provincial Competente', pageWidth / 2, y + 18, { align: 'center' });

  y += 32;

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text('REQUERIMENTO DE AUTORIZAÇÃO E HOMOLOGAÇÃO', pageWidth / 2, y, { align: 'center' });
  y += 5.5;
  doc.setFontSize(11);
  doc.setTextColor(180, 130, 60);
  doc.text('SISTEMA INFORMÁTICO DE EMISSÃO DE FATURAS E DOCUMENTOS FISCAIS', pageWidth / 2, y, { align: 'center' });

  y += 12;

  // Greeting
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(40, 40, 40);
  doc.text('Exmo. Senhor Delegado da Autoridade Tributária / Diretor das Finanças,', margin, y);
  y += 8;

  // Identification Section Box
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 54, 2, 2, 'FD');

  let boxY = y + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(120, 90, 40);
  doc.text('1. IDENTIFICAÇÃO DO SUJEITO PASSIVO / REQUERENTE', margin + 4, boxY);
  boxY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);

  const row = (label: string, value: string, currentY: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 4, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(value || 'N/D', margin + 52, currentY);
  };

  row('Denominação Social:', company.name || 'Empresa Requerente, Lda.', boxY);
  boxY += 5.5;
  row('Nome Comercial (Insígnia):', company.tradeName || company.name || 'N/D', boxY);
  boxY += 5.5;
  row('NIF / NUIT Fiscal:', company.taxNumber || '400123987', boxY);
  boxY += 5.5;
  row('Sede Fiscal / Morada:', `${company.address || ''} - ${company.city || ''} (${company.postalCode || ''})`, boxY);
  boxY += 5.5;
  row('Capital Social Declarado:', company.shareCapital || '100.000,00 MT', boxY);
  boxY += 5.5;
  row('País / Jurisdição Fiscal:', company.country || 'Moçambique', boxY);
  boxY += 5.5;
  row('Contacto Telefónico & Email:', `${company.phone || '+258 87 262 7974'} • ${company.email || 'geral@empresa.co.mz'}`, boxY);

  y += 62;

  // Section 2: Request Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(120, 90, 40);
  doc.text('2. EXPOSIÇÃO DOS FATOS E FUNDAMENTO DO PEDIDO', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);

  const paragraph1 =
    `A sociedade requerente acima identificada, no exercício regular das suas atividades comerciais e industriais, vem por este meio solicitar a V. Exa. a competente autorização e registo para a utilização do programa informático de faturação no seu estabelecimento, designado "Sistema Integrado POS/ERP Empresarial (Versão 2.0.1)".`;

  const paragraph2 =
    `Mais informa que o referido sistema informático cumpre integralmente os requisitos legais de inalterabilidade dos dados gravados, dispondo de algoritmos criptográficos com encadeamento de registos (SHA-256), numeração sequencial ininterrupta por série de documento, parametrização rigorosa das taxas de IVA em vigor (${company.currencySymbol || 'Mt'}), exportação eletrónica de ficheiro SAF-T de auditoria e fechos diários de caixa com geração de Relatórios Z.`;

  const paragraph3 =
    `Em anexo ao presente requerimento, junta-se a respectiva Memória Descritiva e Justificativa das funcionalidades do sistema, bem como a prova de inscrição no Cadastro Único Tributário e Certidão Comercial.`;

  const split1 = doc.splitTextToSize(paragraph1, contentWidth);
  doc.text(split1, margin, y);
  y += split1.length * 4.2 + 3;

  const split2 = doc.splitTextToSize(paragraph2, contentWidth);
  doc.text(split2, margin, y);
  y += split2.length * 4.2 + 3;

  const split3 = doc.splitTextToSize(paragraph3, contentWidth);
  doc.text(split3, margin, y);
  y += split3.length * 4.2 + 6;

  // Closing Formula
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Nestes termos, pede e espera DEFERIMENTO.', margin, y);
  y += 16;

  // Location and Date
  const today = new Date();
  const dateStr = `${today.getDate()} de ${today.toLocaleString('pt-PT', { month: 'long' })} de ${today.getFullYear()}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${company.city || 'Maputo'}, ${dateStr}`, margin, y);
  y += 18;

  // Signatures
  const colWidth = contentWidth / 2 - 5;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, margin + colWidth, y);
  doc.line(margin + colWidth + 10, y, margin + contentWidth, y);

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Pela Administração / Gerência', margin + colWidth / 2, y, { align: 'center' });
  doc.text('O Técnico Responsável pelo Software', margin + colWidth + 10 + colWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('(Assinatura legível e carimbo da sociedade)', margin + colWidth / 2, y, { align: 'center' });
  doc.text('(Credenciado / Desenvolvedor)', margin + colWidth + 10 + colWidth / 2, y, { align: 'center' });

  // Footer footer note
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Documento Fiscal Oficial gerado pelo Sistema Integrado POS/ERP Empresarial • Certificado Software: ${company.softwareCertNumber || '3024/AT'} • Versão SAF-T: ${company.saftVersion || '1.04_01'}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  const cleanName = (company.tradeName || company.name || 'Empresa').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Requerimento_Fiscal_${cleanName}.pdf`;
  const dataUrl = doc.output('datauristring');

  return {
    name: filename,
    size: Math.round(dataUrl.length * 0.75),
    type: 'application/pdf',
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Generates official formal A4 PDF for "Memória Descritiva" pre-filled with technical specifications
 */
export function generateOfficialMemoriaDescritivaPdf(company: Partial<Company>): CompanyAttachedDocument {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 22;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header Banner
  doc.setFillColor(244, 246, 248);
  doc.rect(margin, y, contentWidth, 20, 'F');
  doc.setDrawColor(70, 90, 120);
  doc.setLineWidth(0.6);
  doc.rect(margin, y, contentWidth, 20, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 35, 60);
  doc.text('MEMÓRIA DESCRITIVA E ESPECIFICAÇÕES TÉCNICAS', pageWidth / 2, y + 8, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setTextColor(80, 95, 120);
  doc.text('SISTEMA INFORMÁTICO DE FATURAÇÃO E GESTÃO EMPRESARIAL', pageWidth / 2, y + 14, { align: 'center' });

  y += 28;

  const section = (title: string, paragraphs: string[]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 130, 60);
    doc.text(title, margin, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(45, 45, 45);

    for (const p of paragraphs) {
      const split = doc.splitTextToSize(p, contentWidth);
      doc.text(split, margin, y);
      y += split.length * 3.8 + 2;
    }
    y += 2;
  };

  section('1. IDENTIFICAÇÃO DA EMPRESA UTILIZADORA', [
    `Entidade Fiscal: ${company.name || 'Empresa Requerente'} (Nome Comercial: ${company.tradeName || company.name || 'N/D'})`,
    `NIF/NUIT: ${company.taxNumber || '400123987'} • Sede: ${company.address || ''}, ${company.city || ''} (${company.country || 'Moçambique'})`,
    `Capital Social: ${company.shareCapital || '100.000,00 MT'} • Moeda Oficial: ${company.currencySymbol || 'Mt'} (${company.currency || 'MZN'})`,
  ]);

  section('2. IDENTIFICAÇÃO DO SOFTWARE E FABRICANTE', [
    `Designação da Aplicação: Sistema Integrado POS/ERP Empresarial - Edição Comercial Certificada`,
    `Versão da Aplicação: 2.0.1 (Build Produção Multi-Loja & Offline-First)`,
    `Certificado AT / Autoridade Tributária: ${company.softwareCertNumber || '3024/AT'} • Especificação SAF-T: ${company.saftVersion || '1.04_01'}`,
    `Tecnologias de Suporte: React, TypeScript, Motor Criptográfico Web Crypto API, IndexedDB com Barramento de Eventos e Sincronização Cloud.`,
  ]);

  section('3. INALTERABILIDADE E INTEGRIDADE DOS REGISTOS FISCAIS', [
    `Todos os documentos emitidos (Faturas, Faturas Simplificadas, Faturas-Recibo e Notas de Crédito) são objeto de assinatura sequencial criptográfica, calculada através de resumo hash (SHA-256) encadeando a fatura imediatamente anterior com a fatura corrente.`,
    `A base de dados impede expressamente qualquer alteração, truncagem, alteração de montantes ou eliminação física de documentos emitidos. Correções ou devoluções são estritamente efetuadas mediante a emissão de Notas de Crédito retificativas, com referência ao documento originário.`,
  ]);

  section('4. NUMERAÇÃO SEQUENCIAL E SÉRIES DE DOCUMENTOS', [
    `O sistema suporta múltiplas séries cronológicas independentes devidamente registadas junto da autoridade tributária (ex: FT 2026/1, FS 2026/1). A numeração de cada série é contínua e estritamente crescente, sem quebras, duplicidades ou omissões.`,
  ]);

  section('5. PONTO DE VENDA (POS), TURNOS E AUDITORIA FISCAL', [
    `O subsistema de Ponto de Venda gere turnos de caixa com contagens cegas e geração obrigatória de Relatórios Z de fecho diário. São consolidadas as vendas brutas, o IVA liquidado por taxa (Isento, Reduzido e Normal), os meios de pagamento (Numerário, Cartão POS, M-Pesa, E-Mola, Transferência) e os movimentos de fundo de maneio.`,
  ]);

  section('6. EXPORTAÇÃO ELETRÓNICA SAF-T (Standard Audit File for Tax)', [
    `O sistema disponibiliza rotina automatizada de extração e validação do ficheiro de auditoria fiscal SAF-T XML, em conformidade com as normas tributárias em vigor, abrangendo os dados da empresa, o catálogo de artigos/serviços, os clientes cadastrados e a totalidade dos documentos de faturação do período fiscal selecionado.`,
  ]);

  y += 4;

  // Date and Signatures Box
  const today = new Date();
  const dateStr = `${today.getDate()} de ${today.toLocaleString('pt-PT', { month: 'long' })} de ${today.getFullYear()}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(`Elaborado e homologado em ${company.city || 'Maputo'}, a ${dateStr}.`, margin, y);

  y += 14;
  const colWidth = contentWidth / 2 - 5;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, margin + colWidth, y);
  doc.line(margin + colWidth + 10, y, margin + contentWidth, y);

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text('A Gerência da Empresa Utilizadora', margin + colWidth / 2, y, { align: 'center' });
  doc.text('O Engenheiro de Software / Responsável Técnico', margin + colWidth + 10 + colWidth / 2, y, { align: 'center' });

  // Page Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Memória Descritiva Técnica • Sistema Integrado POS/ERP v2.0.1 • NIF ${company.taxNumber || '400123987'} • Software Certificado n.º ${company.softwareCertNumber || '3024/AT'}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  const cleanName = (company.tradeName || company.name || 'Empresa').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Memoria_Descritiva_${cleanName}.pdf`;
  const dataUrl = doc.output('datauristring');

  return {
    name: filename,
    size: Math.round(dataUrl.length * 0.75),
    type: 'application/pdf',
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };
}
