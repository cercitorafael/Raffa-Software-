import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/crypto';
import {
  Users,
  Clock,
  FileSpreadsheet,
  CalendarDays,
  Plus,
  Play,
  Square,
  CheckCircle2,
  Building,
  DollarSign,
  Download,
  Edit2,
  Trash2,
  X,
  UserCheck,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';
import { Employee, TimeEntry, Payroll, EmployeeShift } from '../../types';

export const HRModule: React.FC = () => {
  const {
    employees,
    timeEntries,
    payrolls,
    employeeShifts,
    currentCompany,
    currentStore,
    stores,
    currencyDefinition,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    clockInEmployee,
    clockOutEmployee,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    approveTimeEntry,
    processMonthlyPayroll,
    addPayroll,
    updatePayroll,
    deletePayroll,
    clearAllPayrolls,
    addEmployeeShift,
    updateEmployeeShift,
    deleteEmployeeShift,
    hasPermission,
    requestConfirm,
    closeConfirm,
    notify,
  } = useApp();

  const currencySymbol = currentCompany?.currencySymbol || currencyDefinition?.symbol || 'Mt';

  const [activeTab, setActiveTab] = useState<'directory' | 'timeclock' | 'payroll' | 'shifts'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  // Employee Modals
  const [showNewEmpModal, setShowNewEmpModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({
    name: '',
    role: '',
    department: 'Operações de Loja',
    storeId: currentStore.id,
    taxNumber: '',
    socialSecurityNumber: '',
    email: '',
    phone: '',
    baseSalary: 1200,
    mealAllowanceDaily: 9.60,
    contractType: 'sem_termo' as Employee['contractType'],
    admissionDate: new Date().toISOString().split('T')[0],
    status: 'ativo' as Employee['status'],
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  });

  // Time Entry Modals
  const [showNewTimeModal, setShowNewTimeModal] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);
  const [timeForm, setTimeForm] = useState({
    employeeId: employees[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    clockIn: '09:00',
    clockOut: '18:00',
    breakMinutes: 60,
    notes: '',
  });

  // Shift Modals
  const [showNewShiftModal, setShowNewShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<EmployeeShift | null>(null);
  const [shiftForm, setShiftForm] = useState({
    employeeId: employees[0]?.id || '',
    storeId: currentStore.id,
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '18:00',
    role: 'Assistente de Vendas',
    status: 'agendado' as EmployeeShift['status'],
  });

  const currentMonthStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  })();

  // Payroll Modals
  const [showNewPayrollModal, setShowNewPayrollModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [payrollForm, setPayrollForm] = useState({
    employeeId: employees[0]?.id || '',
    month: currentMonthStr,
    baseSalary: 1200,
    mealAllowance: 211.20,
    bonus: 0,
    irsRetention: 144,
    socialSecurityRetention: 132,
    netSalary: 1135.20,
    status: 'processado' as Payroll['status'],
  });

  // Permissions
  const canCreate = hasPermission('hr', 'create');
  const canEdit = hasPermission('hr', 'edit');
  const canDelete = hasPermission('hr', 'delete');

  // Selected row tracking for keyboard Delete / Backspace actions
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedTimeEntryId, setSelectedTimeEntryId] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  // Keyboard shortcut for Delete / Backspace in HR module
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      if (isInput) return;

      const isModalOpen =
        showNewEmpModal ||
        !!editingEmployee ||
        showNewTimeModal ||
        !!editingTimeEntry ||
        showNewShiftModal ||
        !!editingShift ||
        showNewPayrollModal ||
        !!editingPayroll;

      if (isModalOpen) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeTab === 'payroll') {
          if (!canDelete || payrolls.length === 0) return;
          const target = selectedPayrollId
            ? payrolls.find((p) => p.id === selectedPayrollId) || payrolls[0]
            : payrolls[0];

          if (target) {
            e.preventDefault();
            const monthDisplay = target.monthYear || (target as any).month || currentMonthStr;
            requestConfirm({
              title: 'Eliminar Recibo de Vencimento',
              message: `Tem a certeza que deseja eliminar o recibo de vencimento do colaborador "${target.employeeName}"?`,
              itemDetails: `Mês: ${monthDisplay} | Líquido a Pagar: ${formatCurrency(target.netSalary)} | Estado: ${target.status}`,
              confirmLabel: 'Eliminar Recibo',
              isDestructive: true,
              onConfirm: () => {
                deletePayroll(target.id);
                if (selectedPayrollId === target.id) {
                  setSelectedPayrollId(null);
                }
                closeConfirm();
              },
            });
          }
        } else if (activeTab === 'directory') {
          if (!canDelete || employees.length === 0) return;
          const target = selectedEmployeeId
            ? employees.find((emp) => emp.id === selectedEmployeeId) || employees[0]
            : employees[0];

          if (target) {
            e.preventDefault();
            requestConfirm({
              title: 'Eliminar Colaborador',
              message: `Tem a certeza que deseja eliminar o colaborador "${target.name}"?`,
              itemDetails: `Cargo: ${target.role} | Departamento: ${target.department} | NIF: ${target.taxNumber}`,
              confirmLabel: 'Eliminar Colaborador',
              isDestructive: true,
              onConfirm: () => {
                deleteEmployee(target.id);
                if (selectedEmployeeId === target.id) {
                  setSelectedEmployeeId(null);
                }
                closeConfirm();
              },
            });
          }
        } else if (activeTab === 'timeclock') {
          if (!canDelete || timeEntries.length === 0) return;
          const target = selectedTimeEntryId
            ? timeEntries.find((te) => te.id === selectedTimeEntryId) || timeEntries[0]
            : timeEntries[0];

          if (target) {
            e.preventDefault();
            requestConfirm({
              title: 'Eliminar Registo de Ponto',
              message: `Tem a certeza que deseja eliminar o registo de ponto de "${target.employeeName}"?`,
              itemDetails: `Data: ${formatDate(target.clockIn)} | Horas: ${target.totalHours.toFixed(1)}h`,
              confirmLabel: 'Eliminar Registo',
              isDestructive: true,
              onConfirm: () => {
                deleteTimeEntry(target.id);
                if (selectedTimeEntryId === target.id) {
                  setSelectedTimeEntryId(null);
                }
                closeConfirm();
              },
            });
          }
        } else if (activeTab === 'shifts') {
          if (!canDelete || employeeShifts.length === 0) return;
          const target = selectedShiftId
            ? employeeShifts.find((s) => s.id === selectedShiftId) || employeeShifts[0]
            : employeeShifts[0];

          if (target) {
            e.preventDefault();
            requestConfirm({
              title: 'Eliminar Turno Agendado',
              message: `Tem a certeza que deseja eliminar o turno agendado de "${target.employeeName}"?`,
              itemDetails: `Data: ${formatDate(target.date)} | Horário: ${target.startTime} - ${target.endTime}`,
              confirmLabel: 'Eliminar Turno',
              isDestructive: true,
              onConfirm: () => {
                deleteEmployeeShift(target.id);
                if (selectedShiftId === target.id) {
                  setSelectedShiftId(null);
                }
                closeConfirm();
              },
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTab,
    canDelete,
    selectedPayrollId,
    selectedEmployeeId,
    selectedTimeEntryId,
    selectedShiftId,
    payrolls,
    employees,
    timeEntries,
    employeeShifts,
    showNewEmpModal,
    editingEmployee,
    showNewTimeModal,
    editingTimeEntry,
    showNewShiftModal,
    editingShift,
    showNewPayrollModal,
    editingPayroll,
    deletePayroll,
    deleteEmployee,
    deleteTimeEntry,
    deleteEmployeeShift,
    requestConfirm,
    closeConfirm,
    currentMonthStr,
  ]);

  const totalPayrollCost = employees.reduce((sum, e) => {
    const meal = 22 * e.mealAllowanceDaily;
    const gross = e.baseSalary + meal;
    const tsu = e.baseSalary * 0.2375;
    return sum + gross + tsu;
  }, 0);

  const filteredEmployees = employees.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = e.name.toLowerCase().includes(q) || e.taxNumber.includes(q) || e.role.toLowerCase().includes(q);
    const matchesDept = selectedDeptFilter === 'all' || e.department === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  // ================= EMPLOYEE HANDLERS =================
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name || !empForm.taxNumber) return;

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        name: empForm.name,
        role: empForm.role,
        department: empForm.department,
        storeId: empForm.storeId,
        taxNumber: empForm.taxNumber,
        socialSecurityNumber: empForm.socialSecurityNumber,
        email: empForm.email,
        phone: empForm.phone,
        baseSalary: Number(empForm.baseSalary),
        mealAllowanceDaily: Number(empForm.mealAllowanceDaily),
        contractType: empForm.contractType,
        admissionDate: empForm.admissionDate,
        status: empForm.status,
        avatarUrl: empForm.avatarUrl,
      });
      setEditingEmployee(null);
    } else {
      addEmployee({
        companyId: currentCompany.id,
        name: empForm.name,
        role: empForm.role || 'Assistente de Vendas',
        department: empForm.department,
        storeId: empForm.storeId || currentStore.id,
        taxNumber: empForm.taxNumber,
        socialSecurityNumber: empForm.socialSecurityNumber || '11987654321',
        email: empForm.email || `${empForm.name.toLowerCase().replace(/\s+/g, '.')}@empresa.pt`,
        phone: empForm.phone || '+351 912 000 000',
        baseSalary: Number(empForm.baseSalary),
        mealAllowanceDaily: Number(empForm.mealAllowanceDaily),
        contractType: empForm.contractType,
        admissionDate: empForm.admissionDate,
        status: empForm.status,
        avatarUrl: empForm.avatarUrl,
      });
      setShowNewEmpModal(false);
    }
  };

  // ================= TIME ENTRY HANDLERS =================
  const handleSaveTimeEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === timeForm.employeeId);
    if (!emp) return;

    const inDate = new Date(`${timeForm.date}T${timeForm.clockIn}:00`);
    const outDate = timeForm.clockOut ? new Date(`${timeForm.date}T${timeForm.clockOut}:00`) : undefined;
    let workedMins = 0;
    if (outDate) {
      workedMins = Math.max(0, Math.round((outDate.getTime() - inDate.getTime()) / 60000) - timeForm.breakMinutes);
    }

    if (editingTimeEntry) {
      updateTimeEntry(editingTimeEntry.id, {
        clockIn: inDate.toISOString(),
        clockOut: outDate ? outDate.toISOString() : undefined,
        totalHours: workedMins / 60,
        notes: timeForm.notes,
      });
      setEditingTimeEntry(null);
    } else {
      addTimeEntry({
        employeeId: emp.id,
        employeeName: emp.name,
        storeId: currentStore.id,
        clockIn: inDate.toISOString(),
        clockOut: outDate ? outDate.toISOString() : undefined,
        totalHours: workedMins / 60,
        status: outDate ? 'concluido' : 'em_curso',
        notes: timeForm.notes,
      });
      setShowNewTimeModal(false);
    }
  };

  // ================= SHIFT HANDLERS =================
  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === shiftForm.employeeId);
    if (!emp) return;

    if (editingShift) {
      updateEmployeeShift(editingShift.id, {
        employeeId: emp.id,
        employeeName: emp.name,
        storeId: shiftForm.storeId,
        date: shiftForm.date,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        role: shiftForm.role,
        status: shiftForm.status,
      });
      setEditingShift(null);
    } else {
      addEmployeeShift({
        employeeId: emp.id,
        employeeName: emp.name,
        storeId: shiftForm.storeId,
        date: shiftForm.date,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        role: shiftForm.role,
        status: shiftForm.status,
      });
      setShowNewShiftModal(false);
    }
  };

  // ================= PAYROLL HANDLERS =================
  const handleSavePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === payrollForm.employeeId);
    if (!emp) return;

    const base = Number(payrollForm.baseSalary);
    const meal = Number(payrollForm.mealAllowance);
    const bonus = Number(payrollForm.bonus);
    const irs = Number(payrollForm.irsRetention);
    const ss = Number(payrollForm.socialSecurityRetention);
    const net = base + meal + bonus - irs - ss;
    const tsu = base * 0.2375;

    if (editingPayroll) {
      updatePayroll(editingPayroll.id, {
        baseSalary: base,
        mealAllowance: meal,
        bonus: bonus,
        irsRetention: irs,
        socialSecurityRetention: ss,
        netSalary: net,
        companySocialSecurity: tsu,
        status: payrollForm.status,
      });
      setEditingPayroll(null);
    } else {
      addPayroll({
        companyId: currentCompany.id,
        employeeId: emp.id,
        employeeName: emp.name,
        month: payrollForm.month,
        baseSalary: base,
        mealAllowance: meal,
        bonus: bonus,
        irsRetention: irs,
        socialSecurityRetention: ss,
        netSalary: net,
        companySocialSecurity: tsu,
        status: payrollForm.status,
        paymentDate: payrollForm.status === 'pago' ? new Date().toISOString().split('T')[0] : undefined,
      });
      setShowNewPayrollModal(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Top Header Summary */}
      <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] grid grid-cols-1 sm:grid-cols-4 gap-3 shrink-0">
        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#c5a47e]/15 text-[#c5a47e] border border-[#c5a47e]/30 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Colaboradores</span>
            <p className="text-xl font-serif font-bold text-[#e5e5e5]">{employees.length} ativos</p>
          </div>
        </div>

        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Em Turno Agora</span>
            <p className="text-xl font-serif font-bold text-emerald-400">
              {timeEntries.filter((t) => t.status === 'em_curso').length} pessoas
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Massa Salarial Estimada</span>
            <p className="text-xl font-serif font-bold text-blue-400">{formatCurrency(totalPayrollCost)}</p>
          </div>
        </div>

        <div className="p-3 bg-[#141414] rounded-xl border border-[#262626] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Loja Alocada</span>
            <p className="text-xl font-serif font-bold text-amber-400">{currentStore.name}</p>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="px-6 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between">
        <div className="flex space-x-1 overflow-x-auto">
          {[
            { id: 'directory', label: 'Quadro de Pessoal', icon: Users, count: employees.length },
            { id: 'timeclock', label: 'Ponto Eletrónico', icon: Clock, count: timeEntries.length },
            { id: 'shifts', label: 'Escalas de Trabalho', icon: CalendarDays, count: employeeShifts.length },
            { id: 'payroll', label: 'Processamento Salarial', icon: DollarSign, count: payrolls.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-medium border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#c5a47e] text-[#c5a47e]'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-[#c5a47e]/20 text-[#c5a47e]' : 'bg-[#1f1f1f] text-neutral-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ================= TAB 1: EMPLOYEES CRUD ================= */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, NIF, cargo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md pl-9 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {canCreate && (
                  <button
                    onClick={() => {
                      setEditingEmployee(null);
                      setEmpForm({
                        name: '',
                        role: '',
                        department: 'Operações de Loja',
                        storeId: currentStore.id,
                        taxNumber: '',
                        socialSecurityNumber: '',
                        email: '',
                        phone: '',
                        baseSalary: 1200,
                        mealAllowanceDaily: 9.60,
                        contractType: 'sem_termo',
                        admissionDate: new Date().toISOString().split('T')[0],
                        status: 'ativo',
                        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                      });
                      setShowNewEmpModal(true);
                    }}
                    className="px-3.5 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Colaborador</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((emp) => {
                const store = stores.find((s) => s.id === emp.storeId);
                const isSelected = selectedEmployeeId === emp.id;
                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={`bg-[#141414] border rounded-xl p-5 transition-all cursor-pointer ${
                      isSelected ? 'border-[#c5a47e] ring-1 ring-[#c5a47e]/50' : 'border-[#262626] hover:border-[#383838]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={emp.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={emp.name}
                          className="w-12 h-12 rounded-full object-cover border border-[#333]"
                        />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            {isSelected && (
                              <span className="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/40">
                                DEL
                              </span>
                            )}
                            <h3 className="font-semibold text-neutral-200 text-sm">{emp.name}</h3>
                          </div>
                          <p className="text-xs text-[#c5a47e]">{emp.role}</p>
                          <span className="text-[11px] text-neutral-500">{emp.department}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEmployee(emp);
                              setEmpForm({
                                name: emp.name,
                                role: emp.role,
                                department: emp.department,
                                storeId: emp.storeId,
                                taxNumber: emp.taxNumber,
                                socialSecurityNumber: emp.socialSecurityNumber,
                                email: emp.email,
                                phone: emp.phone,
                                baseSalary: emp.baseSalary,
                                mealAllowanceDaily: emp.mealAllowanceDaily,
                                contractType: emp.contractType,
                                admissionDate: emp.admissionDate,
                                status: emp.status,
                                avatarUrl: emp.avatarUrl || '',
                              });
                            }}
                            className="p-1.5 hover:bg-neutral-800 rounded-md text-cyan-400 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              requestConfirm({
                                title: 'Eliminar Colaborador',
                                message: `Tem a certeza que deseja eliminar o colaborador "${emp.name}"?`,
                                itemDetails: `Cargo: ${emp.role} | Departamento: ${emp.department} | NIF: ${emp.taxNumber}`,
                                confirmLabel: 'Eliminar Colaborador',
                                isDestructive: true,
                                onConfirm: () => {
                                  deleteEmployee(emp.id);
                                  if (selectedEmployeeId === emp.id) {
                                    setSelectedEmployeeId(null);
                                  }
                                  closeConfirm();
                                },
                              });
                            }}
                            className="p-1.5 hover:bg-neutral-800 rounded-md text-rose-400 cursor-pointer"
                            title="Eliminar Colaborador (Tecla Delete)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#262626] space-y-1.5 text-xs text-neutral-400 font-mono">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">NIF / NISS:</span>
                        <span className="text-neutral-300">{emp.taxNumber} / {emp.socialSecurityNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Vencimento Base:</span>
                        <span className="text-emerald-400 font-semibold">{formatCurrency(emp.baseSalary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Loja Alocada:</span>
                        <span className="text-neutral-300">{store?.name || 'Central'}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-neutral-500">Estado:</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          emp.status === 'ativo' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {emp.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 2: TIME ENTRIES CRUD ================= */}
        {activeTab === 'timeclock' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="text-xs text-neutral-400">
                Registo de assiduidade, picagem de ponto e controlo de horas de trabalho
              </div>
              {canCreate && (
                <button
                  onClick={() => {
                    setEditingTimeEntry(null);
                    setShowNewTimeModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-md cursor-pointer"
                >
                  + Registar Ponto Manual
                </button>
              )}
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">Entrada (Clock In)</th>
                    <th className="px-4 py-3">Saída (Clock Out)</th>
                    <th className="px-4 py-3 text-right">Horas Totais</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3">Aprovado Por</th>
                    <th className="px-4 py-3 text-right">Ações CRUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {timeEntries.map((te) => {
                    const isSelected = selectedTimeEntryId === te.id;
                    return (
                      <tr
                        key={te.id}
                        onClick={() => setSelectedTimeEntryId(te.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#222222] ring-1 ring-[#c5a47e]/50' : 'hover:bg-[#191919]'
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-neutral-200">
                          <div className="flex items-center space-x-2">
                            {isSelected && (
                              <span className="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/40">
                                DEL
                              </span>
                            )}
                            <span>{te.employeeName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDate(te.clockIn)}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">
                          {te.clockOut ? formatDate(te.clockOut) : <span className="text-emerald-400 font-semibold">Em Curso...</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-200">
                          {te.totalHours ? `${te.totalHours.toFixed(1)}h` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                            te.status === 'aprovado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                            te.status === 'em_curso' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                            'bg-neutral-800 text-neutral-400'
                          }`}>
                            {te.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-400">{te.approvedBy || '—'}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1">
                            {te.status !== 'aprovado' && canEdit && (
                              <button
                                type="button"
                                onClick={() => approveTimeEntry(te.id, 'Diretor RH')}
                                className="px-2 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded text-[11px] font-medium cursor-pointer"
                              >
                                Aprovar
                              </button>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTimeEntry(te);
                                  const cIn = te.clockIn || new Date().toISOString();
                                  setTimeForm({
                                    employeeId: te.employeeId,
                                    date: cIn.split('T')[0],
                                    clockIn: cIn.split('T')[1]?.slice(0, 5) || '09:00',
                                    clockOut: te.clockOut ? te.clockOut.split('T')[1]?.slice(0, 5) || '18:00' : '18:00',
                                    breakMinutes: 60,
                                    notes: te.notes || '',
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  requestConfirm({
                                    title: 'Eliminar Registo de Ponto',
                                    message: `Tem a certeza que deseja eliminar o registo de ponto do colaborador ${te.employeeName}?`,
                                    itemDetails: `Data: ${formatDate(te.clockIn)} | Horas Trabalhadas: ${te.totalHours ? te.totalHours.toFixed(1) : '0'}h | Estado: ${te.status}`,
                                    confirmLabel: 'Eliminar Registo',
                                    isDestructive: true,
                                    onConfirm: () => {
                                      deleteTimeEntry(te.id);
                                      if (selectedTimeEntryId === te.id) {
                                        setSelectedTimeEntryId(null);
                                      }
                                      closeConfirm();
                                    },
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                                title="Eliminar Registo (Tecla Delete)"
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
        )}

        {/* ================= TAB 3: SHIFTS CRUD ================= */}
        {activeTab === 'shifts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div className="text-xs text-neutral-400">
                Escalas de serviço e planeamento semanal de turnos de loja
              </div>
              {canCreate && (
                <button
                  onClick={() => {
                    setEditingShift(null);
                    setShowNewShiftModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-md cursor-pointer"
                >
                  + Agendar Novo Turno
                </button>
              )}
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">Loja</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Horário Previsto</th>
                    <th className="px-4 py-3">Função / Posto</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Ações CRUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {employeeShifts.map((shift) => {
                    const store = stores.find((s) => s.id === shift.storeId);
                    const isSelected = selectedShiftId === shift.id;
                    return (
                      <tr
                        key={shift.id}
                        onClick={() => setSelectedShiftId(shift.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#222222] ring-1 ring-[#c5a47e]/50' : 'hover:bg-[#191919]'
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-neutral-200">
                          <div className="flex items-center space-x-2">
                            {isSelected && (
                              <span className="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/40">
                                DEL
                              </span>
                            )}
                            <span>{shift.employeeName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-neutral-400">{store?.name || shift.storeId}</td>
                        <td className="px-4 py-3 font-mono text-neutral-400">{formatDate(shift.date)}</td>
                        <td className="px-4 py-3 font-mono text-[#c5a47e]">
                          {shift.startTime} &mdash; {shift.endTime}
                        </td>
                        <td className="px-4 py-3 text-neutral-300">{shift.role}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                            shift.status === 'concluido' ? 'bg-emerald-500/10 text-emerald-400' :
                            shift.status === 'em_curso' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-neutral-800 text-neutral-300'
                          }`}>
                            {shift.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingShift(shift);
                                  setShiftForm({
                                    employeeId: shift.employeeId,
                                    storeId: shift.storeId,
                                    date: shift.date,
                                    startTime: shift.startTime,
                                    endTime: shift.endTime,
                                    role: shift.role,
                                    status: shift.status,
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  requestConfirm({
                                    title: 'Eliminar Turno Agendado',
                                    message: `Tem a certeza que deseja eliminar o turno agendado do colaborador ${shift.employeeName}?`,
                                    itemDetails: `Data: ${formatDate(shift.date)} | Horário: ${shift.startTime} - ${shift.endTime} | Função: ${shift.role}`,
                                    confirmLabel: 'Eliminar Turno',
                                    isDestructive: true,
                                    onConfirm: () => {
                                      deleteEmployeeShift(shift.id);
                                      if (selectedShiftId === shift.id) {
                                        setSelectedShiftId(null);
                                      }
                                      closeConfirm();
                                    },
                                  });
                                }}
                                className="p-1.5 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                                title="Eliminar Turno (Tecla Delete)"
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
        )}

        {/* ================= TAB 4: PAYROLL CRUD ================= */}
        {activeTab === 'payroll' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#141414] p-3 rounded-lg border border-[#262626]">
              <div>
                <div className="text-xs text-neutral-300 font-medium">
                  Processamento mensal de salários, retenções na fonte (IRS) e Segurança Social (11% + 23.75% TSU)
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Prima a tecla <kbd className="px-1.5 py-0.5 bg-[#202020] border border-[#333] rounded text-neutral-300 font-mono text-[10px]">Delete</kbd> ou <kbd className="px-1.5 py-0.5 bg-[#202020] border border-[#333] rounded text-neutral-300 font-mono text-[10px]">Backspace</kbd> para eliminar o recibo selecionado.
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                {payrolls.length > 0 && canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      requestConfirm({
                        title: 'Eliminar Todos os Recibos',
                        message: `Tem a certeza que deseja eliminar todos os ${payrolls.length} recibos de vencimento processados?`,
                        confirmLabel: 'Eliminar Todos',
                        isDestructive: true,
                        onConfirm: () => {
                          clearAllPayrolls();
                          setSelectedPayrollId(null);
                          closeConfirm();
                        },
                      });
                    }}
                    className="px-3 py-1.5 bg-rose-950/30 text-rose-300 border border-rose-800/40 hover:bg-rose-900/40 rounded-md text-xs font-medium cursor-pointer flex items-center space-x-1.5 transition-colors"
                    title="Eliminar todos os recibos processados"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar ({payrolls.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => processMonthlyPayroll(currentMonthStr)}
                  className="px-3 py-1.5 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-200 border border-[#333] rounded-md text-xs font-medium cursor-pointer transition-colors"
                >
                  Processamento Automático Global
                </button>
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPayroll(null);
                      setShowNewPayrollModal(true);
                    }}
                    className="px-3 py-1.5 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-medium text-xs rounded-md cursor-pointer transition-colors"
                  >
                    + Novo Recibo Individual
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#1a1a1a] text-neutral-400 font-medium uppercase tracking-wider text-[10px] border-b border-[#262626]">
                  <tr>
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">Mês</th>
                    <th className="px-4 py-3 text-right">Venc. Base</th>
                    <th className="px-4 py-3 text-right">Subs. Alim.</th>
                    <th className="px-4 py-3 text-right">Ret. IRS</th>
                    <th className="px-4 py-3 text-right">Seg. Social (11%)</th>
                    <th className="px-4 py-3 text-right">Líquido a Pagar</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Ações CRUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {payrolls.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-neutral-500">
                        Nenhum recibo de vencimento processado. Clique em &quot;Processamento Automático Global&quot; ou &quot;+ Novo Recibo Individual&quot;.
                      </td>
                    </tr>
                  ) : (
                    payrolls.map((pr) => {
                      const isSelected = selectedPayrollId === pr.id;
                      const monthDisplay = pr.monthYear || (pr as any).month || currentMonthStr;

                      return (
                        <tr
                          key={pr.id}
                          onClick={() => setSelectedPayrollId(pr.id)}
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#222222] ring-1 ring-[#c5a47e]/50' : 'hover:bg-[#191919]'
                          }`}
                        >
                          <td className="px-4 py-3 font-medium text-neutral-200">
                            <div className="flex items-center space-x-2">
                              {isSelected && (
                                <span className="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/40">
                                  DEL
                                </span>
                              )}
                              <span>{pr.employeeName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-neutral-400">{monthDisplay}</td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-200">{formatCurrency(pr.baseSalary)}</td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-400">{formatCurrency(pr.mealAllowance)}</td>
                          <td className="px-4 py-3 text-right font-mono text-rose-400">-{formatCurrency(pr.irsRetention)}</td>
                          <td className="px-4 py-3 text-right font-mono text-rose-400">-{formatCurrency(pr.socialSecurityRetention)}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                            {formatCurrency(pr.netSalary)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                              pr.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}>
                              {pr.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end space-x-1">
                              {pr.status !== 'pago' && canEdit && (
                                <button
                                  type="button"
                                  onClick={() => updatePayroll(pr.id, { status: 'pago', paymentDate: new Date().toISOString().split('T')[0] })}
                                  className="px-2 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded text-[11px] font-medium cursor-pointer"
                                >
                                  Pagar
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPayroll(pr);
                                    setPayrollForm({
                                      employeeId: pr.employeeId,
                                      month: monthDisplay,
                                      baseSalary: pr.baseSalary,
                                      mealAllowance: pr.mealAllowance,
                                      bonus: pr.bonus || 0,
                                      irsRetention: pr.irsRetention,
                                      socialSecurityRetention: pr.socialSecurityRetention,
                                      netSalary: pr.netSalary,
                                      status: pr.status,
                                    });
                                  }}
                                  className="p-1.5 hover:bg-neutral-800 rounded text-cyan-400 cursor-pointer"
                                  title="Editar Recibo"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    requestConfirm({
                                      title: 'Eliminar Recibo de Vencimento',
                                      message: `Tem a certeza que deseja eliminar o recibo de vencimento do colaborador ${pr.employeeName}?`,
                                      itemDetails: `Mês: ${monthDisplay} | Líquido a Pagar: ${formatCurrency(pr.netSalary)} | Estado: ${pr.status}`,
                                      confirmLabel: 'Eliminar Recibo',
                                      isDestructive: true,
                                      onConfirm: () => {
                                        deletePayroll(pr.id);
                                        if (selectedPayrollId === pr.id) {
                                          setSelectedPayrollId(null);
                                        }
                                        closeConfirm();
                                      },
                                    });
                                  }}
                                  className="p-1.5 hover:bg-neutral-800 rounded text-rose-400 cursor-pointer"
                                  title="Eliminar Recibo (Tecla Delete)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: EMPLOYEE ================= */}
      {(showNewEmpModal || editingEmployee) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingEmployee ? 'Editar Ficha de Colaborador' : 'Novo Colaborador'}
              </h3>
              <button
                onClick={() => {
                  setShowNewEmpModal(false);
                  setEditingEmployee(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={empForm.name}
                    onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Cargo / Função *</label>
                  <input
                    type="text"
                    required
                    value={empForm.role}
                    onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Departamento</label>
                  <select
                    value={empForm.department}
                    onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  >
                    <option value="Operações de Loja">Operações de Loja</option>
                    <option value="Armazém / Logística">Armazém / Logística</option>
                    <option value="Administração / Finanças">Administração / Finanças</option>
                    <option value="Comercial / Vendas">Comercial / Vendas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">NIF *</label>
                  <input
                    type="text"
                    required
                    value={empForm.taxNumber}
                    onChange={(e) => setEmpForm({ ...empForm, taxNumber: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">NISS (Segurança Social)</label>
                  <input
                    type="text"
                    value={empForm.socialSecurityNumber}
                    onChange={(e) => setEmpForm({ ...empForm, socialSecurityNumber: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={empForm.phone}
                    onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Salário Base ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={empForm.baseSalary}
                    onChange={(e) => setEmpForm({ ...empForm, baseSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Subs. Alimentação Diário ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={empForm.mealAllowanceDaily}
                    onChange={(e) => setEmpForm({ ...empForm, mealAllowanceDaily: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewEmpModal(false);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingEmployee ? 'Guardar' : 'Registar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TIME ENTRY ================= */}
      {(showNewTimeModal || editingTimeEntry) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingTimeEntry ? 'Editar Ponto' : 'Novo Ponto Manual'}
              </h3>
              <button
                onClick={() => {
                  setShowNewTimeModal(false);
                  setEditingTimeEntry(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTimeEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Colaborador *</label>
                <select
                  value={timeForm.employeeId}
                  onChange={(e) => setTimeForm({ ...timeForm, employeeId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Data</label>
                <input
                  type="date"
                  value={timeForm.date}
                  onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Hora Entrada</label>
                  <input
                    type="time"
                    value={timeForm.clockIn}
                    onChange={(e) => setTimeForm({ ...timeForm, clockIn: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Hora Saída</label>
                  <input
                    type="time"
                    value={timeForm.clockOut}
                    onChange={(e) => setTimeForm({ ...timeForm, clockOut: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Observações</label>
                <input
                  type="text"
                  value={timeForm.notes}
                  onChange={(e) => setTimeForm({ ...timeForm, notes: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTimeModal(false);
                    setEditingTimeEntry(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingTimeEntry ? 'Guardar' : 'Gravar Ponto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SHIFT ================= */}
      {(showNewShiftModal || editingShift) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingShift ? 'Editar Turno' : 'Agendar Turno'}
              </h3>
              <button
                onClick={() => {
                  setShowNewShiftModal(false);
                  setEditingShift(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Colaborador *</label>
                <select
                  value={shiftForm.employeeId}
                  onChange={(e) => setShiftForm({ ...shiftForm, employeeId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Loja</label>
                <select
                  value={shiftForm.storeId}
                  onChange={(e) => setShiftForm({ ...shiftForm, storeId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Data do Turno</label>
                <input
                  type="date"
                  value={shiftForm.date}
                  onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Hora Início</label>
                  <input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Hora Fim</label>
                  <input
                    type="time"
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewShiftModal(false);
                    setEditingShift(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingShift ? 'Guardar' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PAYROLL ================= */}
      {(showNewPayrollModal || editingPayroll) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#191919]">
              <h3 className="font-serif text-base text-[#e5e5e5]">
                {editingPayroll ? 'Editar Recibo Salarial' : 'Novo Recibo Salarial'}
              </h3>
              <button
                onClick={() => {
                  setShowNewPayrollModal(false);
                  setEditingPayroll(null);
                }}
                className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayroll} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Colaborador *</label>
                <select
                  value={payrollForm.employeeId}
                  onChange={(e) => {
                    const emp = employees.find((x) => x.id === e.target.value);
                    setPayrollForm({
                      ...payrollForm,
                      employeeId: e.target.value,
                      baseSalary: emp?.baseSalary || 1200,
                      mealAllowance: (emp?.mealAllowanceDaily || 9.60) * 22,
                    });
                  }}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Mês de Referência</label>
                <input
                  type="text"
                  placeholder="AAAA-MM"
                  value={payrollForm.month}
                  onChange={(e) => setPayrollForm({ ...payrollForm, month: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Vencimento Base ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payrollForm.baseSalary}
                    onChange={(e) => setPayrollForm({ ...payrollForm, baseSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Subs. Alimentação ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payrollForm.mealAllowance}
                    onChange={(e) => setPayrollForm({ ...payrollForm, mealAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Retenção IRS / IRPS ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payrollForm.irsRetention}
                    onChange={(e) => setPayrollForm({ ...payrollForm, irsRetention: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Segurança Social (11%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payrollForm.socialSecurityRetention}
                    onChange={(e) => setPayrollForm({ ...payrollForm, socialSecurityRetention: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded-md px-3 py-2 text-xs text-neutral-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#262626] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPayrollModal(false);
                    setEditingPayroll(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#c5a47e] text-neutral-950 font-medium text-xs rounded-lg cursor-pointer"
                >
                  {editingPayroll ? 'Guardar' : 'Gravar Recibo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
