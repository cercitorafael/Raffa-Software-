import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { VatRate } from '../../types';
import { defaultVatRates } from '../../mockData';
import {
  Percent,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calculator,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { sound } from '../../utils/audio';

export const VatSettingsSection: React.FC = () => {
  const {
    currentCompany,
    updateCompany,
    products,
    updateProduct,
    notify,
    requestConfirm,
    formatCurrency,
  } = useApp();

  const vatRates: VatRate[] = currentCompany.vatRates && currentCompany.vatRates.length > 0
    ? currentCompany.vatRates
    : defaultVatRates;

  const defaultRateValue = typeof currentCompany.defaultTaxRate === 'number'
    ? currentCompany.defaultTaxRate
    : (vatRates.find((v) => v.isDefault)?.rate ?? 16);

  // Modal State for adding / editing a VAT Rate
  const [showRateModal, setShowRateModal] = useState(false);
  const [editingRate, setEditingRate] = useState<VatRate | null>(null);
  const [rateForm, setRateForm] = useState<Omit<VatRate, 'id'>>({
    name: '',
    rate: 16,
    code: 'NOR',
    isDefault: false,
    isActive: true,
    exemptionReason: '',
    description: '',
  });

  // Bulk Apply Modal State
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Live VAT Simulator State
  const [simGrossPrice, setSimGrossPrice] = useState<number>(1000);
  const [simSelectedRate, setSimSelectedRate] = useState<number>(defaultRateValue);

  const handleOpenNewRate = () => {
    setEditingRate(null);
    setRateForm({
      name: 'Taxa Personalizada',
      rate: 16,
      code: 'NOR',
      isDefault: false,
      isActive: true,
      exemptionReason: '',
      description: '',
    });
    setShowRateModal(true);
  };

  const handleOpenEditRate = (rate: VatRate) => {
    setEditingRate(rate);
    setRateForm({
      name: rate.name,
      rate: rate.rate,
      code: rate.code,
      isDefault: !!rate.isDefault,
      isActive: rate.isActive,
      exemptionReason: rate.exemptionReason || '',
      description: rate.description || '',
    });
    setShowRateModal(true);
  };

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNumber = Math.max(0, Math.min(100, Number(rateForm.rate) || 0));

    let updatedList: VatRate[];

    if (editingRate) {
      // Editing existing
      updatedList = vatRates.map((r) => {
        if (r.id === editingRate.id) {
          return {
            ...r,
            ...rateForm,
            rate: rateNumber,
          };
        }
        // If marked as default, unset others
        if (rateForm.isDefault) {
          return { ...r, isDefault: false };
        }
        return r;
      });
      notify(`Taxa de IVA "${rateForm.name}" (${rateNumber}%) atualizada com sucesso!`, 'success');
    } else {
      // Creating new
      const newRate: VatRate = {
        id: `vat-${Date.now()}`,
        name: rateForm.name.trim() || `Taxa IVA ${rateNumber}%`,
        rate: rateNumber,
        code: rateForm.code.trim().toUpperCase() || 'NOR',
        isDefault: !!rateForm.isDefault,
        isActive: rateForm.isActive !== false,
        exemptionReason: rateNumber === 0 ? (rateForm.exemptionReason || 'Artigo 9.º do CIVA') : undefined,
        description: rateForm.description,
      };

      if (newRate.isDefault) {
        updatedList = vatRates.map((r) => ({ ...r, isDefault: false }));
        updatedList.push(newRate);
      } else {
        updatedList = [...vatRates, newRate];
      }
      notify(`Nova taxa de IVA "${newRate.name}" adicionada ao sistema!`, 'success');
    }

    const updates: Partial<typeof currentCompany> = {
      vatRates: updatedList,
    };

    if (rateForm.isDefault) {
      updates.defaultTaxRate = rateNumber;
    }

    updateCompany(updates);
    sound.playSuccessChime();
    setShowRateModal(false);
  };

  const handleToggleRateActive = (rateId: string) => {
    const updated = vatRates.map((r) => {
      if (r.id === rateId) {
        if (r.isDefault && r.isActive) {
          notify('Não é possível desativar a taxa de IVA padrão do sistema.', 'warning');
          return r;
        }
        return { ...r, isActive: !r.isActive };
      }
      return r;
    });

    updateCompany({ vatRates: updated });
    sound.playSuccessChime();
  };

  const handleSetDefaultRate = (rate: VatRate) => {
    const updated = vatRates.map((r) => ({
      ...r,
      isDefault: r.id === rate.id,
      isActive: r.id === rate.id ? true : r.isActive,
    }));

    updateCompany({
      vatRates: updated,
      defaultTaxRate: rate.rate,
    });

    sound.playSuccessChime();
    notify(`Taxa de IVA padrão alterada para ${rate.name} (${rate.rate}%)!`, 'success');
  };

  const handleDeleteRate = (rate: VatRate) => {
    if (rate.isDefault) {
      notify('Não pode eliminar a taxa de IVA padrão do sistema.', 'warning');
      return;
    }

    requestConfirm({
      title: 'Eliminar Taxa de IVA',
      message: `Tem a certeza que deseja eliminar a taxa "${rate.name}" (${rate.rate}%)? Os artigos existentes manterão o valor até serem editados.`,
      confirmLabel: 'Sim, Eliminar',
      type: 'danger',
      onConfirm: () => {
        const filtered = vatRates.filter((r) => r.id !== rate.id);
        updateCompany({ vatRates: filtered });
        sound.playSuccessChime();
        notify(`Taxa de IVA "${rate.name}" eliminada.`, 'success');
      },
    });
  };

  const handleBulkApplyToAllProducts = (targetRate: number) => {
    requestConfirm({
      title: 'Atualizar IVA em Massa no Inventário',
      message: `Isto irá alterar a Taxa de IVA de TODOS os ${products.length} artigos do inventário para ${targetRate}%. Deseja continuar?`,
      confirmLabel: `Sim, aplicar ${targetRate}% a todos`,
      type: 'warning',
      onConfirm: () => {
        setIsBulkUpdating(true);
        try {
          products.forEach((p) => {
            updateProduct(p.id, { taxRate: targetRate });
          });
          sound.playSuccessChime();
          notify(`Taxa de IVA (${targetRate}%) aplicada com sucesso a todos os ${products.length} artigos!`, 'success');
        } finally {
          setIsBulkUpdating(false);
        }
      },
    });
  };

  // Calculate live simulator values
  const simRateObj = vatRates.find((r) => r.rate === simSelectedRate) || { rate: simSelectedRate, name: `${simSelectedRate}%` };
  const simBasePrice = simGrossPrice / (1 + (simSelectedRate / 100));
  const simTaxAmount = simGrossPrice - simBasePrice;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Card */}
      <div className="bg-[#141414] rounded-xl border border-[#262626] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#262626]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e] shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-serif font-bold text-[#e5e5e5]">
                Configuração e Edição de Taxas de IVA (Imposto sobre o Valor Acrescentado)
              </h4>
              <p className="text-xs text-neutral-400">
                Defina a taxa de IVA padrão do sistema, edite as percentagens legais (16%, 0%, 5%, 23%) e configure motivos de isenção.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleOpenNewRate}
              className="px-3.5 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Adicionar Nova Taxa</span>
            </button>
          </div>
        </div>

        {/* Default Tax Rate Highlight Banner */}
        <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-[#c5a47e]/15 via-[#1a1a1a] to-[#141414] border border-[#c5a47e]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#c5a47e] text-neutral-950 flex items-center justify-center font-bold text-sm font-mono shadow-xs">
              {defaultRateValue}%
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-[#e5e5e5]">Taxa de IVA Padrão Atual</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ATIVADA
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Aplicada automaticamente a novos produtos registados e na emissão de documentos.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => handleBulkApplyToAllProducts(defaultRateValue)}
              className="px-3 py-1.5 bg-[#202020] hover:bg-[#2a2a2a] text-neutral-200 border border-[#383838] rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5"
              title="Aplica esta taxa a todos os produtos já existentes no inventário"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#c5a47e] ${isBulkUpdating ? 'animate-spin' : ''}`} />
              <span>Aplicar {defaultRateValue}% a Todos os Artigos ({products.length})</span>
            </button>
          </div>
        </div>

        {/* VAT Rates Management Table */}
        <div className="mt-6">
          <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Tabela de Taxas de IVA no Sistema</span>
            <span className="text-[11px] text-neutral-400 normal-case font-normal">
              {vatRates.filter((r) => r.isActive).length} ativas de {vatRates.length} configuradas
            </span>
          </h5>

          <div className="overflow-x-auto border border-[#262626] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d0d0d] text-neutral-400 uppercase font-semibold border-b border-[#262626]">
                <tr>
                  <th className="py-3 px-4">Designação da Taxa</th>
                  <th className="py-3 px-4 text-center">Taxa (%)</th>
                  <th className="py-3 px-4 text-center">Código Fiscal</th>
                  <th className="py-3 px-4">Motivo de Isenção / Observações</th>
                  <th className="py-3 px-4 text-center">Padrão</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020] text-neutral-300">
                {vatRates.map((rate) => {
                  const isSystemDefault = rate.rate === defaultRateValue || rate.isDefault;
                  return (
                    <tr
                      key={rate.id}
                      className={`hover:bg-[#1a1a1a]/60 transition-colors ${
                        isSystemDefault ? 'bg-[#c5a47e]/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center space-x-2">
                          <span>{rate.name}</span>
                          {isSystemDefault && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#c5a47e] text-neutral-950 font-bold">
                              PADRÃO
                            </span>
                          )}
                        </div>
                        {rate.description && (
                          <span className="text-[11px] text-neutral-400 font-normal block mt-0.5">
                            {rate.description}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-sm text-[#c5a47e]">
                        {rate.rate}%
                      </td>

                      <td className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-[#1f1f1f] text-neutral-300 border border-[#333]">
                          {rate.code || 'NOR'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-neutral-400">
                        {rate.rate === 0 ? (
                          <span className="text-amber-400/90 font-medium">
                            {rate.exemptionReason || 'Artigo 9.º do CIVA'}
                          </span>
                        ) : (
                          <span className="text-neutral-400">Tributação normal</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isSystemDefault ? (
                          <span className="inline-flex items-center text-emerald-400 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Sim
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultRate(rate)}
                            className="px-2 py-1 bg-[#202020] hover:bg-[#c5a47e]/20 hover:text-[#c5a47e] text-neutral-400 rounded text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Tornar Padrão
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRateActive(rate.id)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            rate.isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                          }`}
                        >
                          {rate.isActive ? 'Ativa' : 'Inativa'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRate(rate)}
                            className="p-1.5 bg-[#202020] hover:bg-[#303030] text-neutral-300 rounded-lg transition-colors cursor-pointer"
                            title="Editar taxa de IVA"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!rate.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRate(rate)}
                              className="p-1.5 bg-[#202020] hover:bg-rose-950/40 hover:text-rose-400 text-neutral-400 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar taxa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Interactive Simulator & Legal Guidelines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Simulator Card */}
        <div className="bg-[#141414] rounded-xl border border-[#262626] p-6 shadow-sm">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-[#262626]">
            <Calculator className="w-5 h-5 text-[#c5a47e]" />
            <div>
              <h4 className="text-sm font-serif font-bold text-[#e5e5e5]">
                Simulador Interativo de Cálculo de IVA
              </h4>
              <p className="text-xs text-neutral-400">
                Valide o desdobramento entre Preço Base (Incidência), IVA e PVP Final
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4 text-xs">
            <div>
              <label className="text-neutral-400 font-semibold block mb-1">
                Preço de Venda ao Público (PVP com IVA incluído):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={simGrossPrice}
                  onChange={(e) => setSimGrossPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-3 pr-12 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg font-mono text-sm font-bold text-[#c5a47e] focus:outline-hidden focus:border-[#c5a47e]"
                />
                <span className="absolute right-3 top-2.5 text-neutral-400 font-mono text-xs">
                  {currentCompany.currencySymbol || 'Mt'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-neutral-400 font-semibold block mb-1">
                Selecione a Taxa de IVA para Simular:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {vatRates
                  .filter((r) => r.isActive)
                  .map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSimSelectedRate(r.rate)}
                      className={`p-2 rounded-lg border text-center font-mono text-xs font-bold transition-all cursor-pointer ${
                        simSelectedRate === r.rate
                          ? 'bg-[#c5a47e] text-neutral-950 border-[#c5a47e] shadow-sm'
                          : 'bg-[#1a1a1a] text-neutral-300 border-[#2b2b2b] hover:bg-[#252525]'
                      }`}
                    >
                      {r.rate}% ({r.code})
                    </button>
                  ))}
              </div>
            </div>

            {/* Calculation Breakdown Result Box */}
            <div className="p-4 rounded-xl bg-[#0d0d0d] border border-[#2b2b2b] space-y-2 mt-4">
              <div className="flex justify-between items-center text-neutral-400">
                <span>Incidência / Valor Base (s/ IVA):</span>
                <span className="font-mono font-semibold text-neutral-200">
                  {formatCurrency(simBasePrice)}
                </span>
              </div>

              <div className="flex justify-between items-center text-neutral-400">
                <span>Montante de IVA ({simRateObj.rate}%):</span>
                <span className="font-mono font-bold text-[#c5a47e]">
                  + {formatCurrency(simTaxAmount)}
                </span>
              </div>

              <div className="pt-2 border-t border-[#262626] flex justify-between items-center text-sm font-bold text-white">
                <span>Total a Pagar pelo Cliente:</span>
                <span className="font-mono text-emerald-400">
                  {formatCurrency(simGrossPrice)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Guidelines & Tax Framework Card */}
        <div className="bg-[#141414] rounded-xl border border-[#262626] p-6 shadow-sm">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-[#262626]">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-sm font-serif font-bold text-[#e5e5e5]">
                Enquadramento Fiscal & Isenções (CIVA Moçambique / SADC)
              </h4>
              <p className="text-xs text-neutral-400">
                Regras obrigatórias para documentos fiscais certificados e exportação SAF-T
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-xs text-neutral-400 leading-relaxed">
            <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#262626] space-y-1">
              <span className="font-bold text-white block">Taxa Normal (16%)</span>
              <p>
                Aplicável à generalidade das transmissões de bens e prestações de serviços em Moçambique desde a atualização do Código do IVA.
              </p>
            </div>

            <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#262626] space-y-1">
              <span className="font-bold text-amber-300 block">Isenção de IVA (0% - Art. 9.º CIVA)</span>
              <p>
                Obrigatório incluir nos documentos a menção legal ao motivo de isenção quando a taxa for 0% (ex.: produtos da cesta básica, medicamentos, exportações e insumos agrícolas).
              </p>
            </div>

            <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#262626] space-y-1">
              <span className="font-bold text-blue-300 block">Série Fiscal e Certificação SAF-T</span>
              <p>
                Todas as alterações às taxas de IVA são refletidas nos ficheiros de auditoria fiscal e no código bidimensional (QR Code) de cada documento.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL: ADD / EDIT VAT RATE ================= */}
      {showRateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Percent className="w-5 h-5 text-[#c5a47e]" />
                <h3 className="font-serif font-bold text-base text-white">
                  {editingRate ? 'Editar Taxa de IVA' : 'Adicionar Nova Taxa de IVA'}
                </h3>
              </div>
              <button
                onClick={() => setShowRateModal(false)}
                className="text-neutral-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-neutral-400 font-semibold block mb-1">
                  Designação da Taxa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Taxa Normal (16%), Taxa Reduzida (5%), Isenção Art. 9"
                  value={rateForm.name}
                  onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-white font-medium focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 font-semibold block mb-1">
                    Percentagem de IVA (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={rateForm.rate}
                    onChange={(e) => setRateForm({ ...rateForm, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[#c5a47e] font-mono font-bold text-sm focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 font-semibold block mb-1">
                    Código Fiscal (SAF-T) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="NOR, ISE, RED, INT"
                    value={rateForm.code}
                    onChange={(e) => setRateForm({ ...rateForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-white font-mono uppercase focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
              </div>

              {Number(rateForm.rate) === 0 && (
                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2">
                  <label className="text-amber-300 font-semibold block">
                    Motivo de Isenção Legal de IVA (Obrigatório para 0%) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Artigo 9.º do CIVA (Moçambique) / M01"
                    value={rateForm.exemptionReason}
                    onChange={(e) => setRateForm({ ...rateForm, exemptionReason: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white"
                  />
                  <span className="text-[11px] text-neutral-400 block">
                    Este texto será impresso na fatura quando forem vendidos artigos com 0% de IVA.
                  </span>
                </div>
              )}

              <div>
                <label className="text-neutral-400 font-semibold block mb-1">
                  Descrição / Notas Internas
                </label>
                <input
                  type="text"
                  placeholder="ex: Aplicável a produtos agrícolas e farinhas"
                  value={rateForm.description}
                  onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#262626] rounded-lg text-neutral-300 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="flex items-center space-x-4 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rateForm.isDefault}
                    onChange={(e) => setRateForm({ ...rateForm, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded border-neutral-700 text-[#c5a47e] focus:ring-[#c5a47e]"
                  />
                  <span className="text-neutral-200 font-medium">Definir como Taxa Padrão da Empresa</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rateForm.isActive}
                    onChange={(e) => setRateForm({ ...rateForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-neutral-700 text-[#c5a47e] focus:ring-[#c5a47e]"
                  />
                  <span className="text-neutral-200 font-medium">Ativa</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#262626] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="px-4 py-2 bg-[#202020] hover:bg-[#2b2b2b] text-neutral-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  {editingRate ? 'Guardar Alterações' : 'Criar Taxa de IVA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
