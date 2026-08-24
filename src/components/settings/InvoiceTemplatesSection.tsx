import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InvoiceTemplateConfig, Sale } from '../../types';
import { defaultInvoiceTemplates } from '../../mockData';
import { formatCurrency } from '../../utils/crypto';
import { printInvoiceDocument, downloadInvoicePdf } from '../../utils/print';
import {
  FileSpreadsheet,
  Check,
  Eye,
  Settings2,
  Copy,
  Trash2,
  Plus,
  Palette,
  ShieldCheck,
  QrCode,
  CreditCard,
  Printer,
  Sparkles,
  FileText,
  Building2,
  CheckCircle2,
  Layers,
  HelpCircle,
  FileCheck,
  Download
} from 'lucide-react';

export const InvoiceTemplatesSection: React.FC = () => {
  const { currentCompany, updateCompany, notify } = useApp();

  const templates: InvoiceTemplateConfig[] =
    currentCompany.invoiceTemplates && currentCompany.invoiceTemplates.length > 0
      ? currentCompany.invoiceTemplates
      : defaultInvoiceTemplates;

  const activeTemplateId =
    currentCompany.activeInvoiceTemplateId ||
    templates.find((t) => t.isDefault)?.id ||
    templates[0]?.id ||
    'tmpl-agro-vendus';

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(activeTemplateId);

  // Form for editing the currently selected template
  const currentSelectedTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const [templateForm, setTemplateForm] = useState<InvoiceTemplateConfig>(
    currentSelectedTemplate
  );

  React.useEffect(() => {
    const found = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (found) {
      setTemplateForm(found);
    }
  }, [selectedTemplateId, currentCompany.invoiceTemplates]);

  // Handle selecting AND activating a template immediately
  const handleSelectAndActivateTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const updatedTemplates = templates.map((t) => ({
      ...t,
      isDefault: t.id === id,
    }));
    updateCompany({
      activeInvoiceTemplateId: id,
      invoiceTemplates: updatedTemplates,
    });
    const target = templates.find((t) => t.id === id);
    notify(`Modelo "${target?.name || id}" ativado para todas as emissões e impressões do sistema!`, 'success');
  };

  // Handle setting as active emission template
  const handleSetActiveTemplate = (id: string) => {
    handleSelectAndActivateTemplate(id);
  };

  // Sample sale for live test printing & test downloading
  const sampleInvoiceSale: Sale = {
    id: 'sample-inv-test',
    companyId: currentCompany.id || 'comp-1',
    storeId: 'store-1',
    terminalId: 'term-1',
    operatorId: 'user-admin',
    shiftId: 'shift-1',
    invoiceNumber: 'FT 01P2026/182',
    invoiceType: 'FT',
    date: new Date().toISOString(),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
    subtotal: 500,
    discountTotal: 0,
    taxTotal: 0,
    total: 500,
    changeAmount: 0,
    fiscalHash: '0EC949341CA5FDD4',
    previousHash: 'PREV-HASH-001',
    isSynced: true,
    atcud: 'ATCUD-AT-2026-FT182',
    customerName: 'CARLOS',
    customerNif: '402172967',
    customerTaxNumber: '402172967',
    operatorName: 'Administrador',
    notes: 'Exemplo de fatura para validação de modelo.',
    items: [
      {
        productId: 'p-cenoura-01',
        productName: 'CENOURA KURODA -100GR',
        sku: 'VCEN44-26042732',
        quantity: 1,
        unitPrice: 500,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: 500,
      },
    ],
    payments: [
      {
        method: 'dinheiro',
        amount: 500,
      },
    ],
  };

  // Handle saving current template edits
  const handleSaveTemplateEdits = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTemplates = templates.map((t) =>
      t.id === templateForm.id ? templateForm : t
    );
    updateCompany({ invoiceTemplates: updatedTemplates });
    notify(`Alterações ao modelo "${templateForm.name}" guardadas com sucesso!`, 'success');
  };

  // Handle duplicating template
  const handleDuplicateTemplate = () => {
    const newId = `tpl-custom-${Date.now()}`;
    const duplicated: InvoiceTemplateConfig = {
      ...templateForm,
      id: newId,
      name: `${templateForm.name} (Cópia)`,
      isDefault: false,
    };
    const updatedTemplates = [...templates, duplicated];
    updateCompany({ invoiceTemplates: updatedTemplates });
    setSelectedTemplateId(newId);
    notify(`Novo modelo "${duplicated.name}" criado!`, 'success');
  };

  // Handle resetting templates to default
  const handleResetToDefaults = () => {
    updateCompany({
      invoiceTemplates: defaultInvoiceTemplates,
      activeInvoiceTemplateId: defaultInvoiceTemplates[0].id,
    });
    setSelectedTemplateId(defaultInvoiceTemplates[0].id);
    notify('Modelos de fatura restaurados para os padrões de fábrica.', 'info');
  };

  const colorPresets = [
    { name: 'Ouro Champanhe', hex: '#c5a47e' },
    { name: 'Azul Executivo', hex: '#1e40af' },
    { name: 'Verde Floresta', hex: '#065f46' },
    { name: 'Grafite Escuro', hex: '#1f2937' },
    { name: 'Bordô Clássico', hex: '#831843' },
    { name: 'Púrpura Imperial', hex: '#581c87' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 text-[#c5a47e]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-white">
                Modelos de Faturas & Documentos Fiscais
              </h3>
              <p className="text-xs text-neutral-400">
                Personalize os modelos de emissão para Faturas (FT), Faturas Simplificadas (FS), Faturas-Recibo (FR) e Guias de Transporte.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDuplicateTemplate}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-neutral-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>Duplicar Modelo</span>
            </button>

            <button
              onClick={handleResetToDefaults}
              className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] text-neutral-400 hover:text-neutral-200 rounded-xl text-xs font-medium cursor-pointer transition-colors"
            >
              Restaurar Padrões
            </button>
          </div>
        </div>

        {/* Template Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {templates.map((tpl) => {
            const isSelected = selectedTemplateId === tpl.id;
            const isActiveForEmission = activeTemplateId === tpl.id;

            return (
              <div
                key={tpl.id}
                onClick={() => handleSelectAndActivateTemplate(tpl.id)}
                className={`group p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between relative ${
                  isActiveForEmission || isSelected
                    ? 'bg-[#c5a47e]/12 border-[#c5a47e] ring-2 ring-[#c5a47e]/35 shadow-lg'
                    : 'bg-[#0d0d0d] border-[#262626] hover:border-neutral-500 hover:bg-[#141414]'
                }`}
              >
                <div>
                  {/* Top Bar: Radio Bullet + Swatch & Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      {/* Radio Bullet / Bolinha */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isActiveForEmission || isSelected
                            ? 'border-[#c5a47e] bg-[#c5a47e]/25 ring-2 ring-[#c5a47e]/50'
                            : 'border-neutral-500 bg-[#1e1e1e] group-hover:border-[#c5a47e]'
                        }`}
                      >
                        {(isActiveForEmission || isSelected) && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#c5a47e] shadow-xs" />
                        )}
                      </div>

                      {/* Color Dot Swatch */}
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                        style={{ backgroundColor: tpl.primaryColor || '#c5a47e' }}
                        title={`Cor: ${tpl.primaryColor}`}
                      />
                    </div>

                    {isActiveForEmission ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>PADRÃO ATIVO</span>
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#1e1e1e] text-neutral-400 border border-[#2a2a2a]">
                        {tpl.paperSize}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-white mb-1 group-hover:text-[#c5a47e] transition-colors">
                    {tpl.name}
                  </h4>
                  <p className="text-[11px] text-neutral-400 line-clamp-2">
                    {tpl.paperSize === '80mm'
                      ? 'Otimizado para impressoras de talões térmicos ESC/POS.'
                      : `Documento formal ${tpl.paperSize} com tipografia ${tpl.fontFamily} e enquadramento fiscal.`}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#222222] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-neutral-400">
                    {tpl.showQrCode ? 'QR Code AT: Sim' : 'QR Code: Não'}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      isActiveForEmission
                        ? 'text-emerald-400'
                        : 'text-[#c5a47e] group-hover:underline'
                    }`}
                  >
                    {isActiveForEmission ? 'Em uso no sistema' : 'Clique para usar'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor & Live Invoice Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Settings Form (6 cols) */}
        <div className="lg:col-span-6 bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <div className="flex items-center space-x-2">
              <Settings2 className="w-4 h-4 text-[#c5a47e]" />
              <h4 className="text-sm font-serif font-bold text-white">
                Personalização do Modelo: {templateForm.name}
              </h4>
            </div>
            {activeTemplateId !== templateForm.id && (
              <button
                type="button"
                onClick={() => handleSetActiveTemplate(templateForm.id)}
                className="px-3 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                Definir como Padrão de Emissão
              </button>
            )}
          </div>

          <form onSubmit={handleSaveTemplateEdits} className="space-y-4 text-xs">
            {/* Template Name, Style & Paper Size */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="text-neutral-400 font-semibold block mb-1">Nome do Modelo *</label>
                <input
                  type="text"
                  required
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-xl text-white font-bold focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div>
                <label className="text-neutral-400 font-semibold block mb-1">Estilo de Layout</label>
                <select
                  value={templateForm.style || 'classic'}
                  onChange={(e) => setTemplateForm({ ...templateForm, style: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e]"
                >
                  <option value="agro_mz">Modelo Agro / Vendus MZ (Bilingue PT/EN)</option>
                  <option value="classic">Clássico Executivo (Playfair / Dourado)</option>
                  <option value="modern">Moderno Minimalista (Azul / Tech)</option>
                  <option value="corporate">Corporativo SGPS (Grafite / Tabelas)</option>
                  <option value="thermal">Talão Térmico POS (80mm)</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 font-semibold block mb-1">Formato do Papel</label>
                <select
                  value={templateForm.paperSize}
                  onChange={(e) => setTemplateForm({ ...templateForm, paperSize: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e]"
                >
                  <option value="A4">A4 (Padrão Escritório / Impressora Laser)</option>
                  <option value="A5">A5 (Meia Folha Económica)</option>
                  <option value="80mm">80mm (Talão Térmico POS)</option>
                </select>
              </div>
            </div>

            {/* Typography & Accent Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-neutral-400 font-semibold block mb-1">Tipografia do Documento</label>
                <select
                  value={templateForm.fontFamily}
                  onChange={(e) => setTemplateForm({ ...templateForm, fontFamily: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-xl text-white focus:outline-hidden focus:border-[#c5a47e]"
                >
                  <option value="serif">Serifada Elegante (Playfair / Times)</option>
                  <option value="sans">Sans-Serif Moderna (Inter / Helvetica)</option>
                  <option value="mono">Monoespaçada Fiscal (Courier / IBM)</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 font-semibold block mb-1">Cor de Destaque / Acentos</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={templateForm.primaryColor || '#c5a47e'}
                    onChange={(e) => setTemplateForm({ ...templateForm, primaryColor: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-[#262626]"
                  />
                  <input
                    type="text"
                    value={templateForm.primaryColor || '#c5a47e'}
                    onChange={(e) => setTemplateForm({ ...templateForm, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-xl text-white font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Quick Color Chips */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
              <span className="text-[10px] text-neutral-400">Paletas:</span>
              {colorPresets.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setTemplateForm({ ...templateForm, primaryColor: c.hex })}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#0d0d0d] border border-[#262626] text-[10px] hover:border-neutral-500 cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                  <span className="text-neutral-300">{c.name}</span>
                </button>
              ))}
            </div>

            {/* Watermark & QR Code Toggles */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-[#0d0d0d] p-3 rounded-xl border border-[#242424] space-y-1.5">
                <label className="text-neutral-300 font-semibold block">Marca de Água no Fundo</label>
                <input
                  type="text"
                  placeholder="Ex: ORIGINAL, DUPLICADO..."
                  value={templateForm.watermarkText || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, watermarkText: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#262626] rounded-lg text-white text-xs placeholder-neutral-500 font-bold uppercase tracking-wider"
                />
              </div>

              <div className="bg-[#0d0d0d] p-3 rounded-xl border border-[#242424] flex flex-col justify-between">
                <div>
                  <span className="text-neutral-300 font-semibold block">Código QR & ATCUD</span>
                  <span className="text-[10px] text-neutral-400">Portaria 195/2020</span>
                </div>
                <label className="flex items-center space-x-2 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={templateForm.showQrCode}
                    onChange={(e) => setTemplateForm({ ...templateForm, showQrCode: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#c5a47e]"
                  />
                  <span className="text-neutral-200 font-medium text-xs">Exibir QR Code AT</span>
                </label>
              </div>
            </div>

            {/* Bank Info */}
            <div className="bg-[#0d0d0d] p-3.5 rounded-xl border border-[#242424] space-y-2">
              <span className="font-semibold text-neutral-200 block">
                Dados Bancários para Liquidação (Faturas a Crédito)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] text-neutral-400 block mb-0.5">IBAN da Empresa</label>
                  <input
                    type="text"
                    value={templateForm.bankIban || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, bankIban: e.target.value })}
                    placeholder="PT50 0000 0000 0000 0000 0000 0"
                    className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#262626] rounded-lg text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Nome do Banco</label>
                  <input
                    type="text"
                    value={templateForm.bankName || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, bankName: e.target.value })}
                    placeholder="Ex: Millennium BCP"
                    className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#262626] rounded-lg text-white text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Header and Footer Notes */}
            <div className="space-y-3">
              <div>
                <label className="text-neutral-400 font-semibold block mb-1">
                  Notas de Cabeçalho / Menções de Enquadramento
                </label>
                <textarea
                  rows={2}
                  value={templateForm.headerNotes || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, headerNotes: e.target.value })}
                  placeholder="Ex: Documento processado por computador com certificação oficial..."
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-xl text-neutral-300 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div>
                <label className="text-neutral-400 font-semibold block mb-1">
                  Termos de Rodapé & Garantia
                </label>
                <textarea
                  rows={2}
                  value={templateForm.footerNotes || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, footerNotes: e.target.value })}
                  placeholder="Ex: Trocas aceites no prazo de 15 dias mediante apresentação deste talão..."
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-xl text-neutral-300 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#222222] flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-xl cursor-pointer transition-colors shadow-md"
              >
                Guardar Configuração do Modelo
              </button>
            </div>
          </form>
        </div>

        {/* Right: Real-time Live Document Simulation (6 cols) */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 flex flex-col h-full shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-[#c5a47e]" />
                <span className="text-xs font-serif font-bold text-white">
                  Simulador de Impressão ({templateForm.paperSize})
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#202020] text-[#c5a47e]">
                Tempo Real
              </span>
            </div>

            {/* Document Paper Simulation Container (White Paper Style) */}
            <div className="flex-1 my-3 bg-neutral-200 p-4 rounded-xl flex items-center justify-center overflow-x-auto">
              {templateForm.style === 'agro_mz' || templateForm.id === 'tmpl-agro-vendus' ? (
                /* AGRO / VENDUS MZ EXACT PDF SIMULATION */
                <div
                  className="bg-white text-neutral-900 shadow-2xl p-6 rounded relative text-[10px] leading-snug w-full max-w-md font-sans border-t-4"
                  style={{ borderColor: templateForm.primaryColor || '#166534' }}
                >
                  {/* Header: Logo + Company Info on Left, Customer on Right */}
                  <div className="flex justify-between items-start pb-2 border-b border-neutral-300">
                    <div className="space-y-0.5 max-w-[60%]">
                      {currentCompany.logoUrl ? (
                        <div className="mb-2">
                          <img src={currentCompany.logoUrl} alt="Logo" className="h-14 max-w-[170px] object-contain" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-sm bg-emerald-700 text-white flex items-center justify-center font-bold text-[13px] mb-1.5">
                          🌱
                        </div>
                      )}
                      <div>
                        <h5 className="font-bold text-[11px] text-neutral-950 uppercase tracking-tight leading-none">
                          {currentCompany.tradeName || currentCompany.name || 'RAFFA ALIADOS DO CAMPO, LDA'}
                        </h5>
                        <p className="text-[8.5px] font-bold text-emerald-800 tracking-wider mt-0.5">
                          {templateForm.headerNotes || 'FOCO NO AGRO, GANHO NO CAMPO'}
                        </p>
                      </div>
                      <div className="text-[8.5px] text-neutral-700 leading-tight pt-1">
                        <div>Vila de Ribaue, Namiconha</div>
                        <div>Contribuinte: <span className="font-mono font-semibold">{currentCompany.taxNumber || '402172967'}</span></div>
                        <div>E-mail: {currentCompany.email || 'raffaaliadosdocampo@gmail.com'}</div>
                        <div>Tel: {currentCompany.phone || '258848361130'} | Tlm: 258870095149</div>
                      </div>
                    </div>

                    <div className="text-right text-[9px] pt-1">
                      <div className="font-bold text-neutral-900 uppercase">CARLOS</div>
                      <div className="text-neutral-600">Moçambique</div>
                    </div>
                  </div>

                  {/* Document Title Bar & 4-Column Meta Header */}
                  <div className="my-2">
                    <div className="flex justify-between items-center text-xs font-bold text-neutral-950 pb-1">
                      <span>Fatura n.º FT 01P2026/182</span>
                      <span className="font-normal text-neutral-600 text-[9px]">Original</span>
                    </div>

                    <div className="grid grid-cols-4 border-y border-neutral-300 py-1 text-[8px]">
                      <div>
                        <div className="font-bold text-neutral-800">Data (Date)</div>
                        <div className="text-neutral-600 font-mono">2026-07-23</div>
                      </div>
                      <div>
                        <div className="font-bold text-neutral-800">Vencimento (Due)</div>
                        <div className="text-neutral-600 font-mono">2026-07-23</div>
                      </div>
                      <div>
                        <div className="font-bold text-neutral-800">Contribuinte (VAT NR)</div>
                        <div className="text-neutral-600 font-mono">---------</div>
                      </div>
                      <div>
                        <div className="font-bold text-neutral-800">V/ Ref. (Your Ref.)</div>
                        <div className="text-neutral-600 font-mono">FT 01P2026/182</div>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-left text-[8.5px] border-b border-neutral-300 mb-2">
                    <thead>
                      <tr className="border-b border-neutral-300 font-bold text-neutral-900 bg-neutral-50/80">
                        <th className="py-1">Código<br/><span className="text-[7.5px] font-normal text-neutral-500">(Code)</span></th>
                        <th className="py-1">Descrição<br/><span className="text-[7.5px] font-normal text-neutral-500">(Description)</span></th>
                        <th className="py-1 text-right">P. Uni.<br/><span className="text-[7.5px] font-normal text-neutral-500">(Unit Price)</span></th>
                        <th className="py-1 text-center">Uni.<br/><span className="text-[7.5px] font-normal text-neutral-500">(Unit)</span></th>
                        <th className="py-1 text-center">Qtd.<br/><span className="text-[7.5px] font-normal text-neutral-500">(Qty)</span></th>
                        <th className="py-1 text-center">IVA<br/><span className="text-[7.5px] font-normal text-neutral-500">(VAT)</span></th>
                        <th className="py-1 text-right">Total<br/><span className="text-[7.5px] font-normal text-neutral-500">(Total)</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      <tr>
                        <td className="py-1 font-mono text-[8px]">
                          <div>VCEN44-26042732</div>
                          <div className="text-[7.5px] text-neutral-500">Lote1</div>
                        </td>
                        <td className="py-1 font-medium">CENOURA KURODA -100GR</td>
                        <td className="py-1 text-right font-mono">500,00 MT</td>
                        <td className="py-1 text-center font-mono">UNI</td>
                        <td className="py-1 text-center font-mono font-bold">1</td>
                        <td className="py-1 text-center font-mono">0% (1)</td>
                        <td className="py-1 text-right font-mono font-bold">500,00 MT</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Lower Grid: Taxes & Bank on Left, Summary & Grand Total on Right */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-300 items-start">
                    {/* Left: Tax breakdown & Payment & Bank */}
                    <div className="space-y-1.5 text-[8px]">
                      {/* Tax table */}
                      <table className="w-full border-collapse border border-neutral-300 text-left">
                        <thead>
                          <tr className="bg-neutral-100 font-bold text-neutral-800 text-[7.5px]">
                            <th className="p-0.5 border border-neutral-300">Taxa (Tax)</th>
                            <th className="p-0.5 border border-neutral-300 text-right">Base (Net Amount)</th>
                            <th className="p-0.5 border border-neutral-300 text-right">IVA (VAT)</th>
                            <th className="p-0.5 border border-neutral-300 text-right">Total (Total)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-0.5 border border-neutral-300 font-mono">0%</td>
                            <td className="p-0.5 border border-neutral-300 text-right font-mono">500,00 MT</td>
                            <td className="p-0.5 border border-neutral-300 text-right font-mono">0,00 MT</td>
                            <td className="p-0.5 border border-neutral-300 text-right font-mono">500,00 MT</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="text-[7px] text-neutral-500 italic leading-tight">
                        {templateForm.legalNotice || '(1) Não sujeito; não tributado ou similar'}
                      </div>

                      {/* Payment Method */}
                      <div className="pt-0.5">
                        <span className="font-bold text-neutral-800 block text-[7.5px]">Meio de Pagamento (Payment Method)</span>
                        <div className="flex justify-between text-[8px] font-mono text-neutral-700">
                          <span>Dinheiro</span>
                          <span>500,00 MT</span>
                        </div>
                      </div>

                      {/* Bank Details */}
                      <div className="pt-0.5">
                        <span className="font-bold text-neutral-800 block text-[7.5px]">Dados Bancários (Bank Transfer)</span>
                        <div className="text-[7.5px] font-mono text-neutral-700">
                          <div>NIB {templateForm.bankName || 'BIM: Numero de Conta: 1190902466'}</div>
                          <div>NIB: <span className="font-bold">{templateForm.bankIban || '000100000119090246657'}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Summary & Grand Total */}
                    <div className="space-y-2 text-right">
                      <div className="space-y-0.5 text-[8.5px]">
                        <span className="font-bold text-neutral-900 block text-left border-b border-neutral-200 pb-0.5 text-[8px]">
                          Sumário (Resume)
                        </span>
                        <div className="flex justify-between text-neutral-700">
                          <span>S/IVA (Net Value)</span>
                          <span className="font-mono">500,00 MT</span>
                        </div>
                        <div className="flex justify-between text-neutral-700">
                          <span>IVA (VAT)</span>
                          <span className="font-mono">0,00 MT</span>
                        </div>
                      </div>

                      {/* Grand Total */}
                      <div className="border-y-2 border-neutral-900 py-1 flex justify-between items-center text-xs font-bold text-neutral-950">
                        <span className="text-[9px]">Total (Amount)</span>
                        <span className="text-sm font-mono font-black">500,00 MT</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Bar */}
                  <div className="mt-3 pt-1 border-t border-neutral-300 flex justify-between text-[7px] text-neutral-500">
                    <span>Página 1/1</span>
                    <span>WgSI-Gerado Online</span>
                  </div>
                  <div className="text-[7px] text-neutral-500 text-center mt-0.5">
                    {templateForm.footerNotes || 'Sede: Nampula, 3100, Ribaue. Obrigado pela preferência, volte mais!'}
                  </div>
                </div>
              ) : (
                /* STANDARD CLASSIC / MODERN / THERMAL SIMULATION */
                <div
                  className={`bg-white text-neutral-900 shadow-2xl p-6 rounded relative text-[11px] leading-relaxed transition-all ${
                    templateForm.paperSize === '80mm'
                      ? 'w-72 font-mono text-[10px]'
                      : templateForm.fontFamily === 'serif'
                      ? 'w-full max-w-md font-serif'
                      : templateForm.fontFamily === 'mono'
                      ? 'w-full max-w-md font-mono'
                      : 'w-full max-w-md font-sans'
                  }`}
                  style={{
                    borderTop: `4px solid ${templateForm.primaryColor || '#c5a47e'}`,
                  }}
                >
                  {/* Watermark */}
                  {templateForm.watermarkText && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none font-black text-5xl uppercase rotate-[-25deg] text-neutral-900">
                      {templateForm.watermarkText}
                    </div>
                  )}

                  {/* Header: Company + Logo */}
                  <div
                    className={`flex ${
                      currentCompany.logoPosition === 'center'
                        ? 'flex-col items-center text-center'
                        : currentCompany.logoPosition === 'right'
                        ? 'flex-row-reverse justify-between items-start'
                        : 'flex-row justify-between items-start'
                    } border-b pb-3 mb-3 border-neutral-200`}
                  >
                    {currentCompany.logoUrl ? (
                      <img
                        src={currentCompany.logoUrl}
                        alt="Logo"
                        className="h-10 max-w-[120px] object-contain mb-1"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded font-bold text-white flex items-center justify-center text-xs mb-1"
                        style={{ backgroundColor: templateForm.primaryColor || '#c5a47e' }}
                      >
                        {currentCompany.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className={currentCompany.logoPosition === 'right' ? 'text-left' : 'text-right'}>
                      <h5 className="font-bold text-xs text-neutral-900 leading-tight">
                        {currentCompany.name}
                      </h5>
                      <p className="text-[10px] text-neutral-600">{currentCompany.address}</p>
                      <p className="text-[10px] font-mono text-neutral-600">NIF: {currentCompany.taxNumber}</p>
                      <p className="text-[9px] text-emerald-700 font-mono">
                        Certificado Software nº {currentCompany.softwareCertNumber}
                      </p>
                    </div>
                  </div>

                  {/* Document Type Badge & Number */}
                  <div className="flex items-center justify-between bg-neutral-100 p-2 rounded mb-3">
                    <div>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white uppercase"
                        style={{ backgroundColor: templateForm.primaryColor || '#c5a47e' }}
                      >
                        Fatura FT 2026/0042
                      </span>
                      <p className="text-[9px] text-neutral-500 mt-0.5">
                        ATCUD: AT-CERT-2026-X891
                      </p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-neutral-600">
                      <div>Data: {new Date().toISOString().split('T')[0]}</div>
                      <div>Hora: 14:35:10</div>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="border border-neutral-200 rounded p-2 mb-3 bg-neutral-50/50">
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block">Exmo.(a) Cliente:</span>
                    <div className="font-bold text-neutral-900">Empresa Exemplar, Lda.</div>
                    <div className="text-[10px] font-mono text-neutral-600">NIF: 501234567</div>
                    <div className="text-[10px] text-neutral-500">Avenida da Liberdade, Lisboa</div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-left text-[10px] mb-3">
                    <thead>
                      <tr
                        className="border-b border-neutral-300 font-bold"
                        style={{ color: templateForm.primaryColor || '#111827' }}
                      >
                        <th className="pb-1">Artigo</th>
                        <th className="pb-1 text-center">Qtd</th>
                        <th className="pb-1 text-right">PVP</th>
                        <th className="pb-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      <tr>
                        <td className="py-1 font-medium">Serviço de Consultoria ERP</td>
                        <td className="py-1 text-center font-mono">1</td>
                        <td className="py-1 text-right font-mono">{formatCurrency(150, currentCompany?.currency)}</td>
                        <td className="py-1 text-right font-mono font-bold">{formatCurrency(150, currentCompany?.currency)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium">Módulo de Faturação Eletrónica</td>
                        <td className="py-1 text-center font-mono">1</td>
                        <td className="py-1 text-right font-mono">{formatCurrency(99, currentCompany?.currency)}</td>
                        <td className="py-1 text-right font-mono font-bold">{formatCurrency(99, currentCompany?.currency)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Tax Breakdown & Totals */}
                  <div className="border-t border-neutral-300 pt-2 flex justify-between items-end mb-3">
                    {templateForm.showQrCode ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-12 bg-neutral-900 text-white flex items-center justify-center rounded p-1">
                          <QrCode className="w-10 h-10" />
                        </div>
                        <div className="text-[8px] font-mono text-neutral-500">
                          <div>Assinatura Digital AT:</div>
                          <div className="font-bold text-neutral-800">4a7B-vX91-k8...</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[8px] font-mono text-neutral-500">
                        Doc. Certificado AT &bull; Processado por computador
                      </div>
                    )}

                    <div className="text-right">
                      <div className="text-[9px] text-neutral-500">Subtotal: {formatCurrency(249, currentCompany?.currency)}</div>
                      <div className="text-[9px] text-neutral-500">IVA (23% / 16%): {formatCurrency(57.27, currentCompany?.currency)}</div>
                      <div
                        className="text-sm font-bold font-mono mt-0.5"
                        style={{ color: templateForm.primaryColor || '#c5a47e' }}
                      >
                        Total: {formatCurrency(306.27, currentCompany?.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Bank Info */}
                  {templateForm.bankIban && (
                    <div className="text-[9px] bg-neutral-100 p-1.5 rounded border border-neutral-200 font-mono text-neutral-700 mb-2">
                      <span className="font-bold">Pagamento por Transf. Bancária:</span> {templateForm.bankIban} ({templateForm.bankName || 'Banco'})
                    </div>
                  )}

                  {/* Footer Legal Notes */}
                  {templateForm.footerNotes && (
                    <div className="text-[8px] text-neutral-500 text-center border-t border-neutral-200 pt-1.5 italic">
                      {templateForm.footerNotes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Simulator status & Actions */}
            <div className="pt-3 border-t border-[#222222] space-y-3">
              <div className="text-[11px] text-neutral-400 flex flex-wrap items-center justify-between gap-2">
                <div>
                  Modelo: <strong className="text-white">{templateForm.name}</strong>
                </div>
                <div>
                  {activeTemplateId === templateForm.id ? (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>PADRÃO ATIVO DO SISTEMA</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetActiveTemplate(templateForm.id)}
                      className="flex items-center space-x-1.5 px-3 py-1 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-lg text-xs cursor-pointer shadow-sm transition-transform active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Definir como Padrão</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => downloadInvoicePdf(sampleInvoiceSale, currentCompany, templateForm)}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#242424] border border-[#2a2a2a] text-neutral-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Baixar PDF Teste</span>
                </button>

                <button
                  type="button"
                  onClick={() => printInvoiceDocument(sampleInvoiceSale, currentCompany, templateForm)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#c5a47e] border border-[#c5a47e]/40 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Teste A4</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
