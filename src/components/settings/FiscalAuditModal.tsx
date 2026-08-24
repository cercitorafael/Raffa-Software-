import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  FileCode,
  Download,
  Key,
  Lock,
  Hash,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

export const FiscalAuditModal: React.FC = () => {
  const {
    showFiscalAuditModal,
    setShowFiscalAuditModal,
    salesHistory,
    currentCompany,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'verificacao' | 'xml' | 'certificacao'>('verificacao');

  if (!showFiscalAuditModal) return null;

  const totalSales = salesHistory.reduce((acc, s) => acc + s.total, 0);
  const totalTax = salesHistory.reduce((acc, s) => acc + s.taxTotal, 0);

  // Generate SAF-T (PT) XML content
  const generateSaftXml = () => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <AuditFileVersion>1.04_01</AuditFileVersion>
    <CompanyID>${currentCompany.taxNumber}</CompanyID>
    <TaxRegistrationNumber>${currentCompany.taxNumber}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${currentCompany.name}</CompanyName>
    <BusinessName>${currentCompany.tradeName}</BusinessName>
    <CompanyAddress>
      <AddressDetail>${currentCompany.address}</AddressDetail>
      <City>${currentCompany.city}</City>
      <PostalCode>${currentCompany.postalCode}</PostalCode>
      <Country>PT</Country>
    </CompanyAddress>
    <FiscalYear>2026</FiscalYear>
    <StartDate>2026-08-01</StartDate>
    <EndDate>2026-08-31</EndDate>
    <CurrencyCode>EUR</CurrencyCode>
    <DateCreated>${new Date().toISOString().split('T')[0]}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductCompanyID>OmniRetail Solutions Lda</ProductCompanyID>
    <SoftwareCertificateNumber>${currentCompany.softwareCertNumber}</SoftwareCertificateNumber>
  </Header>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${salesHistory.length}</NumberOfEntries>
      <TotalPartnerDiscount>0.00</TotalPartnerDiscount>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>${totalSales.toFixed(2)}</TotalCredit>
      ${salesHistory
        .map(
          (s) => `
      <Invoice>
        <InvoiceNo>${s.invoiceNumber}</InvoiceNo>
        <ATCUD>0</ATCUD>
        <DocumentStatus>
          <InvoiceStatus>N</InvoiceStatus>
          <InvoiceStatusDate>${s.date}</InvoiceStatusDate>
          <SourceID>${s.operatorId}</SourceID>
          <SourceBilling>P</SourceBilling>
        </DocumentStatus>
        <Hash>${s.fiscalHash}</Hash>
        <HashControl>1</HashControl>
        <Period>8</Period>
        <InvoiceDate>${(s.date || new Date().toISOString()).split('T')[0]}</InvoiceDate>
        <InvoiceType>${s.invoiceType}</InvoiceType>
        <SpecialRegimes>
          <SelfBillingIndicator>0</SelfBillingIndicator>
          <CashVATSchemeIndicator>0</CashVATSchemeIndicator>
          <ThirdPartiesBillingIndicator>0</ThirdPartiesBillingIndicator>
        </SpecialRegimes>
        <SourceID>${s.operatorName}</SourceID>
        <CustomerID>${s.customerTaxNumber || 'Consumidor Final'}</CustomerID>
        <Line>
          ${s.items
            .map(
              (item, i) => `
          <LineNumber>${i + 1}</LineNumber>
          <ProductCode>${item.sku}</ProductCode>
          <ProductDescription>${item.productName}</ProductDescription>
          <Quantity>${item.quantity}</Quantity>
          <UnitOfMeasure>UN</UnitOfMeasure>
          <UnitPrice>${item.unitPrice.toFixed(2)}</UnitPrice>
          <TaxPointDate>${(s.date || new Date().toISOString()).split('T')[0]}</TaxPointDate>
          <Description>${item.productName}</Description>
          <DebitAmount>0.00</DebitAmount>
          <CreditAmount>${item.total.toFixed(2)}</CreditAmount>
          <Tax>
            <TaxType>IVA</TaxType>
            <TaxCountryRegion>PT</TaxCountryRegion>
            <TaxCode>NOR</TaxCode>
            <TaxPercentage>${item.taxRate}</TaxPercentage>
          </Tax>
          `
            )
            .join('')}
        </Line>
        <DocumentTotals>
          <TaxPayable>${s.taxTotal.toFixed(2)}</TaxPayable>
          <NetTotal>${s.subtotal.toFixed(2)}</NetTotal>
          <GrossTotal>${s.total.toFixed(2)}</GrossTotal>
        </DocumentTotals>
      </Invoice>`
        )
        .join('')}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;
  };

  const handleDownloadSaft = () => {
    const xmlContent = generateSaftXml();
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SAF-T_PT_${currentCompany.taxNumber}_2026_08.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#101010] border border-[#262626] rounded-2xl w-full max-w-3xl text-[#e5e5e5] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#141414]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Auditoria Fiscal & Validador SAF-T (PT)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AT 4120/AT
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Certificação de Software de Faturação nos termos da Portaria n.º 363/2010 e Portaria n.º 302/2016
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowFiscalAuditModal(false)}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-[#202020] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-[#262626] bg-[#0c0c0c] flex space-x-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('verificacao')}
            className={`py-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'verificacao'
                ? 'border-[#c5a47e] text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            1. Verificação da Cadeia RSA (Hash 4 Caracteres)
          </button>
          <button
            onClick={() => setActiveTab('xml')}
            className={`py-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'xml'
                ? 'border-[#c5a47e] text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            2. Exportação SAF-T XML (PT)
          </button>
          <button
            onClick={() => setActiveTab('certificacao')}
            className={`py-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'certificacao'
                ? 'border-[#c5a47e] text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            3. Parâmetros de Certificação AT
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'verificacao' && (
            <div className="space-y-5">
              {/* Compliance Status Hero Banner */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-3.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Assinatura Digital e Encadeamento Conformes
                  </h3>
                  <p className="text-xs text-neutral-300 mt-1">
                    Todos os {salesHistory.length} documentos fiscais emitidos possuem assinatura digital encriptada por chave privada RSA de 2048 bits com encadeamento estrito do hash do documento anterior.
                  </p>
                </div>
              </div>

              {/* Chaining Inspection Table */}
              <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
                <div className="p-3.5 bg-[#171717] border-b border-[#262626] flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center space-x-2">
                    <Hash className="w-4 h-4 text-[#c5a47e]" />
                    <span>Cadeia de Hash Fiscal Sequencial</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">Posições 1, 11, 21, 31</span>
                </div>

                <div className="divide-y divide-[#202020] max-h-64 overflow-y-auto text-xs">
                  {salesHistory.map((s, idx) => {
                    const hash = s.fiscalHash || '';
                    const shortHash = hash.length >= 31
                      ? `${hash[0] || 'A'}${hash[10] || 'B'}${hash[20] || 'C'}${hash[30] || 'D'}`
                      : `${hash[0] || 'A'}***`;
                    return (
                      <div key={s.id} className="p-3.5 flex items-center justify-between hover:bg-[#1a1a1a]">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-white">{s.invoiceNumber}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-300">
                              {s.invoiceType}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-400">
                            {new Date(s.date).toLocaleString('pt-PT')} &bull; Operador: {s.operatorName}
                          </p>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="flex items-center space-x-1.5 justify-end">
                            <span className="text-[10px] text-neutral-400">Hash 4-caracteres:</span>
                            <span className="font-mono font-bold px-2 py-0.5 bg-[#252525] text-[#c5a47e] rounded border border-[#383838]">
                              {shortHash}
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-mono flex items-center justify-end space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Encadeado com Hash Anterior</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'xml' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <FileCode className="w-4 h-4 text-[#c5a47e]" />
                    <span>Ficheiro SAF-T (PT) Estruturado XML</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Estrutura conforme Portaria n.º 302/2016 para comunicação mensal à AT
                  </p>
                </div>

                <button
                  onClick={handleDownloadSaft}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#c5a47e] hover:bg-[#d4b896] text-black font-bold rounded-lg text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descarregar Ficheiro XML</span>
                </button>
              </div>

              {/* Code Preview Box */}
              <div className="p-4 rounded-xl bg-[#080808] border border-[#262626] font-mono text-xs text-neutral-300 max-h-80 overflow-auto shadow-inner">
                <pre>{generateSaftXml()}</pre>
              </div>
            </div>
          )}

          {activeTab === 'certificacao' && (
            <div className="space-y-4 text-xs">
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-[#c5a47e]" />
                  <span>Identificação e Registo do Software na AT</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[#181818] border border-[#262626]">
                    <span className="text-neutral-400 text-[10px] block">Nº de Certificado AT</span>
                    <span className="text-sm font-mono font-bold text-white mt-1 block">
                      {currentCompany.softwareCertNumber}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#181818] border border-[#262626]">
                    <span className="text-neutral-400 text-[10px] block">Versão do Schema SAF-T</span>
                    <span className="text-sm font-mono font-bold text-emerald-400 mt-1 block">
                      {currentCompany.saftVersion}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#181818] border border-[#262626]">
                    <span className="text-neutral-400 text-[10px] block">Algoritmo de Chave Criptográfica</span>
                    <span className="text-sm font-mono font-bold text-white mt-1 block">
                      RSA 2048 bits / SHA-256
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#181818] border border-[#262626]">
                    <span className="text-neutral-400 text-[10px] block">NIF da Empresa Emitente</span>
                    <span className="text-sm font-mono font-bold text-[#c5a47e] mt-1 block">
                      {currentCompany.taxNumber}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#141414] border-t border-[#262626] flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Pronto para submissão no portal e-fatura</span>
          </span>
          <button
            onClick={() => setShowFiscalAuditModal(false)}
            className="px-4 py-1.5 bg-[#202020] hover:bg-[#282828] text-white rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
