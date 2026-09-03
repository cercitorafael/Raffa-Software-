import React, { useState } from 'react';
import {
  Clock,
  Plus,
  CheckCircle2,
  Edit2,
  Trash2,
  AlertCircle,
  Timer,
  ShieldCheck,
  Coffee,
  Sparkles,
  X,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ShiftType } from '../../types';

export const ShiftManagementSection: React.FC = () => {
  const {
    shiftTypes,
    defaultShiftType,
    addShiftType,
    updateShiftType,
    deleteShiftType,
    setDefaultShiftType,
    requestConfirm,
    notify,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShiftType, setEditingShiftType] = useState<ShiftType | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    durationHours: number;
    description: string;
    defaultStartTime: string;
    defaultEndTime: string;
    breakMinutes: number;
    alertOnOvertime: boolean;
    overtimeToleranceMinutes: number;
    color: string;
    isDefault: boolean;
  }>({
    name: '',
    code: '',
    durationHours: 8,
    description: '',
    defaultStartTime: '08:00',
    defaultEndTime: '17:00',
    breakMinutes: 60,
    alertOnOvertime: true,
    overtimeToleranceMinutes: 30,
    color: '#c5a47e',
    isDefault: false,
  });

  const handleOpenCreateModal = () => {
    setEditingShiftType(null);
    setFormData({
      name: 'Turno de 8 Horas de Trabalho',
      code: 'T-8H',
      durationHours: 8,
      description: 'Jornada diária normal de 8 horas com descanso regulamentar.',
      defaultStartTime: '08:00',
      defaultEndTime: '17:00',
      breakMinutes: 60,
      alertOnOvertime: true,
      overtimeToleranceMinutes: 30,
      color: '#c5a47e',
      isDefault: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (shift: ShiftType) => {
    setEditingShiftType(shift);
    setFormData({
      name: shift.name,
      code: shift.code,
      durationHours: shift.durationHours,
      description: shift.description || '',
      defaultStartTime: shift.defaultStartTime || '08:00',
      defaultEndTime: shift.defaultEndTime || '17:00',
      breakMinutes: shift.breakMinutes ?? 60,
      alertOnOvertime: shift.alertOnOvertime ?? true,
      overtimeToleranceMinutes: shift.overtimeToleranceMinutes ?? 30,
      color: shift.color || '#c5a47e',
      isDefault: !!shift.isDefault,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      notify('Por favor, informe o nome do turno.', 'warning');
      return;
    }

    if (editingShiftType) {
      updateShiftType(editingShiftType.id, {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase() || 'TURNO',
        durationHours: Number(formData.durationHours) || 0,
        description: formData.description.trim(),
        defaultStartTime: formData.defaultStartTime,
        defaultEndTime: formData.defaultEndTime,
        breakMinutes: Number(formData.breakMinutes) || 0,
        alertOnOvertime: formData.alertOnOvertime,
        overtimeToleranceMinutes: Number(formData.overtimeToleranceMinutes) || 0,
        color: formData.color,
        isDefault: formData.isDefault,
      });
    } else {
      addShiftType({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase() || 'TURNO',
        durationHours: Number(formData.durationHours) || 0,
        description: formData.description.trim(),
        defaultStartTime: formData.defaultStartTime,
        defaultEndTime: formData.defaultEndTime,
        breakMinutes: Number(formData.breakMinutes) || 0,
        alertOnOvertime: formData.alertOnOvertime,
        overtimeToleranceMinutes: Number(formData.overtimeToleranceMinutes) || 0,
        color: formData.color,
        isDefault: formData.isDefault,
        appliesTo: 'all',
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (shift: ShiftType) => {
    if (shift.isDefault && shiftTypes.length > 1) {
      notify('Não é possível eliminar o turno que está definido como padrão.', 'warning');
      return;
    }

    requestConfirm({
      title: 'Eliminar Tipo de Turno',
      message: `Tem a certeza que deseja eliminar o modelo "${shift.name}"? Esta ação não afetará os turnos históricos já fechados.`,
      confirmLabel: 'Eliminar Turno',
      cancelLabel: 'Cancelar',
      isDanger: true,
      onConfirm: () => {
        deleteShiftType(shift.id);
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141414] p-5 rounded-2xl border border-[#262626]">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Gestão & Tipos de Turnos de Trabalho</span>
              <span className="px-2 py-0.5 rounded-full bg-[#c5a47e]/20 text-[#c5a47e] text-[10px] font-mono font-bold uppercase tracking-wider">
                {shiftTypes.length} Modelos
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Configure as jornadas e regimes de turnos (ex: Turno de 8 Horas). O turno definido como padrão é assumido na abertura do caixa e escalas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Tipo de Turno</span>
        </button>
      </div>

      {/* Featured Active Default Shift Card */}
      <div className="p-5 bg-gradient-to-r from-[#171717] via-[#1a1815] to-[#171717] rounded-2xl border border-[#c5a47e]/30 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#c5a47e]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3" />
                <span>Turno Padrão Ativo</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                Código: {defaultShiftType?.code || 'T-8H'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white font-serif">
              {defaultShiftType?.name || 'Turno Normal (8 Horas de Trabalho)'}
            </h3>

            <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
              {defaultShiftType?.description ||
                'Jornada de trabalho legal padrão de 8 horas diárias, com 1h de descanso. Este turno é pré-selecionado por omissão em todas as operações.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#202020] border border-[#333] rounded-lg text-neutral-200">
                <Timer className="w-3.5 h-3.5 text-[#c5a47e]" />
                <span className="font-mono font-bold text-[#c5a47e]">
                  {defaultShiftType?.durationHours ? `${defaultShiftType.durationHours} Horas de Trabalho` : 'Duração Flexível'}
                </span>
              </div>

              {defaultShiftType?.defaultStartTime && defaultShiftType?.defaultEndTime && (
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#202020] border border-[#333] rounded-lg text-neutral-200">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>
                    Horário: <strong className="font-mono text-white">{defaultShiftType.defaultStartTime} às {defaultShiftType.defaultEndTime}</strong>
                  </span>
                </div>
              )}

              {defaultShiftType?.breakMinutes !== undefined && defaultShiftType.breakMinutes > 0 && (
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#202020] border border-[#333] rounded-lg text-neutral-200">
                  <Coffee className="w-3.5 h-3.5 text-neutral-400" />
                  <span>
                    Descanso: <strong className="font-mono text-white">{defaultShiftType.breakMinutes} min</strong>
                  </span>
                </div>
              )}

              <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#202020] border border-[#333] rounded-lg text-neutral-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Alerta de Limite: <strong className="text-emerald-400">Ativado</strong></span>
              </div>
            </div>
          </div>

          <div className="flex md:flex-col items-end justify-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenEditModal(defaultShiftType)}
              className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-neutral-200 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-[#3a3a3a]"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar Configuração</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Shift Selection Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-[#c5a47e]" />
              <span>Escolha Rápida do Tipo de Turno Desejado</span>
            </h3>
            <p className="text-[11px] text-neutral-500">
              Clique em &quot;Definir como Padrão&quot; no modelo que pretende aplicar como padrão na sua loja/empresa.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {shiftTypes.map((shift) => {
            const isDef = shift.isDefault;
            return (
              <div
                key={shift.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between relative ${
                  isDef
                    ? 'bg-[#181613] border-[#c5a47e] shadow-md ring-1 ring-[#c5a47e]/30'
                    : 'bg-[#141414] border-[#262626] hover:border-[#3a3a3a]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono"
                        style={{
                          backgroundColor: `${shift.color || '#c5a47e'}20`,
                          color: shift.color || '#c5a47e',
                          border: `1px solid ${shift.color || '#c5a47e'}40`,
                        }}
                      >
                        {shift.durationHours ? `${shift.durationHours}h` : 'FLX'}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                          {shift.code}
                        </span>
                        <h4 className="text-xs font-bold text-white leading-tight">
                          {shift.name}
                        </h4>
                      </div>
                    </div>

                    {isDef ? (
                      <span className="px-2 py-0.5 rounded-md bg-[#c5a47e]/20 border border-[#c5a47e]/40 text-[#c5a47e] text-[9px] font-bold uppercase tracking-wider">
                        Padrão
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-neutral-500">
                        {shift.durationHours ? `${shift.durationHours}h` : 'Livre'}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-neutral-400 line-clamp-2 mb-3 min-h-[32px] leading-relaxed">
                    {shift.description || 'Modelo de turno de trabalho e atendimento.'}
                  </p>

                  <div className="space-y-1 text-[11px] text-neutral-300 font-mono bg-[#0e0e0e] p-2.5 rounded-lg border border-[#222] mb-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-500 font-sans">Jornada de Trabalho:</span>
                      <strong className="text-white">
                        {shift.durationHours ? `${shift.durationHours} Horas` : 'Sem limite'}
                      </strong>
                    </div>
                    {shift.defaultStartTime && shift.defaultEndTime && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500 font-sans">Horário Padrão:</span>
                        <span>{shift.defaultStartTime} - {shift.defaultEndTime}</span>
                      </div>
                    )}
                    {shift.breakMinutes !== undefined && shift.breakMinutes > 0 && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500 font-sans">Pausa de Descanso:</span>
                        <span>{shift.breakMinutes} min</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#222] gap-2">
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(shift)}
                      title="Editar modelo"
                      className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#222] rounded-md transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!isDef && (
                      <button
                        type="button"
                        onClick={() => handleDelete(shift)}
                        title="Eliminar modelo"
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isDef ? (
                    <div className="flex items-center space-x-1 text-emerald-400 text-[11px] font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Selecionado</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDefaultShiftType(shift.id)}
                      className="px-3 py-1.5 bg-[#222] hover:bg-[#c5a47e] text-neutral-300 hover:text-neutral-950 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1"
                    >
                      <span>Definir como Padrão</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Information & Labor Law Reference Box */}
      <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl flex items-start space-x-3 text-xs text-neutral-400">
        <Info className="w-4 h-4 text-[#c5a47e] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-neutral-200 font-semibold">
            Como funciona a aplicação dos Tipos de Turno no sistema?
          </p>
          <p className="leading-relaxed">
            Ao escolher ou definir um turno (ex: <strong>Turno de 8 Horas</strong>), esse tempo é utilizado como referência para o fecho de caixa. Quando um operador abre o caixa no POS, o sistema calcula a hora prevista de encerramento ({defaultShiftType?.durationHours || 8} horas a partir da abertura). Se o turno ultrapassar a duração prevista, o POS exibe um lembrete visual recomendando a contagem física e o fecho Z.
          </p>
        </div>
      </div>

      {/* Modal: Create / Edit Shift Type */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-[#171717] border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingShiftType ? 'Editar Modelo de Turno' : 'Novo Tipo de Turno'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Defina as horas de trabalho e configurações do turno
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#222] hover:bg-[#2e2e2e] text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Nome do Turno *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: Turno de 8 Horas de Trabalho"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg text-white focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Código
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="T-8H"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg text-white font-mono focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
              </div>

              {/* Duration in Hours */}
              <div className="p-4 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white block">
                      Duração da Jornada de Trabalho (Horas) *
                    </label>
                    <span className="text-[11px] text-neutral-400">
                      Ex: 8 horas para jornada normal diária de trabalho
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      required
                      value={formData.durationHours}
                      onChange={(e) => setFormData({ ...formData, durationHours: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1.5 text-center bg-[#181818] border border-[#333] rounded-lg text-base font-mono font-bold text-[#c5a47e] focus:outline-hidden focus:border-[#c5a47e]"
                    />
                    <span className="text-neutral-400 font-bold">horas</span>
                  </div>
                </div>

                {/* Preset quick buttons */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] text-neutral-500 mr-1">Atalhos:</span>
                  {[4, 6, 8, 10, 12].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setFormData({ ...formData, durationHours: hrs })}
                      className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                        formData.durationHours === hrs
                          ? 'bg-[#c5a47e] text-neutral-950'
                          : 'bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300 border border-[#333]'
                      }`}
                    >
                      {hrs}h
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, durationHours: 0 })}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                      formData.durationHours === 0
                        ? 'bg-[#c5a47e] text-neutral-950 font-bold'
                        : 'bg-[#1a1a1a] hover:bg-[#252525] text-neutral-400 border border-[#333]'
                    }`}
                  >
                    Livre (0h)
                  </button>
                </div>
              </div>

              {/* Start Time, End Time & Break */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Início Padrão
                  </label>
                  <input
                    type="time"
                    value={formData.defaultStartTime}
                    onChange={(e) => setFormData({ ...formData, defaultStartTime: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg text-white font-mono focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Fim Padrão
                  </label>
                  <input
                    type="time"
                    value={formData.defaultEndTime}
                    onChange={(e) => setFormData({ ...formData, defaultEndTime: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg text-white font-mono focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Intervalo (Minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={formData.breakMinutes}
                    onChange={(e) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
                    placeholder="60"
                    className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg text-white font-mono focus:outline-hidden focus:border-[#c5a47e]"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Descrição / Notas
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Turno normal diário de 8 horas de trabalho recomendado para operadores de caixa."
                  className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg text-white focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              {/* Options */}
              <div className="space-y-2 pt-2 border-t border-[#262626]">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.alertOnOvertime}
                    onChange={(e) => setFormData({ ...formData, alertOnOvertime: e.target.checked })}
                    className="rounded border-[#333] text-[#c5a47e] focus:ring-[#c5a47e]"
                  />
                  <span className="text-neutral-300 font-medium">
                    Avisar no POS quando a duração do turno for ultrapassada
                  </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded border-[#333] text-[#c5a47e] focus:ring-[#c5a47e]"
                  />
                  <span className="text-[#c5a47e] font-bold">
                    Definir este turno como o Tipo Padrão da Empresa
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#202020] hover:bg-[#282828] text-neutral-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
                >
                  {editingShiftType ? 'Salvar Alterações' : 'Criar Tipo de Turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
