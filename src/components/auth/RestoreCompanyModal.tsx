import React, { useState, useRef } from 'react';
import {
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  X,
  Database,
  Building2,
  Users,
  Package,
  ShoppingCart,
  Store as StoreIcon,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FileUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  CompanySafetyDump,
  validateCompanySafetyDump,
  formatBytes,
} from '../../utils/companyBackup';
import { sound } from '../../utils/audio';
import { User, Company } from '../../types';

interface RestoreCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRestore?: (company: Company, user: User) => void;
}

export const RestoreCompanyModal: React.FC<RestoreCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccessRestore,
}) => {
  const { restoreCompanyFromDump, notify } = useApp();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedDump, setParsedDump] = useState<CompanySafetyDump | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [autoLoginChecked, setAutoLoginChecked] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setParseError(null);
    setParsedDump(null);
    setSelectedFile(file);

    if (!file.name.toLowerCase().endsWith('.json')) {
      setParseError('Por favor selecione um ficheiro com extensão .json');
      sound.playError();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        const result = validateCompanySafetyDump(parsed);

        if (!result.valid || !result.dump) {
          setParseError(result.error || 'Formato de dump inválido.');
          sound.playError();
          return;
        }

        sound.playBeep();
        setParsedDump(result.dump);
      } catch (err) {
        setParseError('O ficheiro não contém um JSON válido ou está corrompido.');
        sound.playError();
      }
    };
    reader.onerror = () => {
      setParseError('Falha ao ler o ficheiro.');
      sound.playError();
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteRestore = async () => {
    if (!parsedDump) return;

    setIsProcessing(true);
    setProgressStep('A validar dados estruturados e tabelas fiscais...');
    sound.playBeep();

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setProgressStep('A restaurar e registar empresa no sistema...');

      const res = await restoreCompanyFromDump(parsedDump, {
        autoLogin: autoLoginChecked,
      });

      if (!res.success) {
        setParseError(res.error || 'Erro durante a restauração.');
        setIsProcessing(false);
        sound.playError();
        return;
      }

      setProgressStep('Sincronização concluída com sucesso!');
      await new Promise((resolve) => setTimeout(resolve, 400));

      if (res.restoredCompany && res.adminUser && onSuccessRestore) {
        onSuccessRestore(res.restoredCompany, res.adminUser);
      }

      onClose();
    } catch (err: any) {
      setParseError(err?.message || 'Erro inesperado na restauração.');
      setIsProcessing(false);
      sound.playError();
    }
  };

  const adminUsers = parsedDump?.data.users || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-8"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1c1c1c] via-[#161616] to-[#1c1c1c] px-6 py-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#c5a47e]/20 border border-[#c5a47e]/40 text-[#c5a47e] flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Restaurar Dados da Empresa & Registo
              </h3>
              <p className="text-xs text-neutral-400">
                Importe o ficheiro Dump JSON de segurança para reativar todos os registos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-neutral-300 text-xs max-h-[75vh] overflow-y-auto">
          {/* Informational Guidance */}
          <div className="bg-[#181818] border border-[#2a2a2a] p-4 rounded-xl flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-[#c5a47e] shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <strong className="text-white font-semibold block mb-0.5">
                Restauração Integral & Registo no Sistema e Supabase
              </strong>
              Ao carregar o dump de segurança gerado anteriormente, a empresa e todos os seus artigos,
              vendas, clientes, categorias, armazéns e utilizadores serão recadastrados e disponibilizados
              imediatamente para login e operações de venda.
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              parsedDump
                ? 'border-emerald-500/50 bg-emerald-950/10'
                : parseError
                ? 'border-rose-500/50 bg-rose-950/10'
                : 'border-neutral-700 hover:border-[#c5a47e] bg-[#141414] hover:bg-[#181818]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center justify-center space-y-2">
              {parsedDump ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-scale-up" />
              ) : (
                <FileUp className="w-10 h-10 text-[#c5a47e]" />
              )}

              <div>
                <p className="text-xs font-bold text-white">
                  {selectedFile ? selectedFile.name : 'Clique para selecionar ou arraste o ficheiro Dump JSON'}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {selectedFile
                    ? `${formatBytes(selectedFile.size)} • Pronto para restauração`
                    : 'Ficheiro de cópia de segurança .json criado pelo sistema'}
                </p>
              </div>
            </div>
          </div>

          {/* Error notification */}
          {parseError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="text-[11px] font-medium">{parseError}</span>
            </div>
          )}

          {/* Dump Preview Details */}
          {parsedDump && (
            <div className="space-y-4 animate-fade-in">
              {/* Company Info Box */}
              <div className="bg-[#171717] border border-[#2a2a2a] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[#c5a47e] font-bold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Empresa Identificada no Dump</span>
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                    {parsedDump.data.company.id}
                  </span>
                </div>

                <div className="text-sm font-bold text-white">
                  {parsedDump.data.company.name}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-neutral-400 pt-2 border-t border-neutral-800">
                  <div>NIF: <span className="text-neutral-200 font-semibold">{parsedDump.data.company.taxNumber || 'Sem NIF'}</span></div>
                  <div>Cidade: <span className="text-neutral-200 font-semibold">{parsedDump.data.company.city || 'Maputo'}</span></div>
                  <div>Moeda: <span className="text-neutral-200 font-semibold">{parsedDump.data.company.currency || 'MZN'}</span></div>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div>
                <h4 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#c5a47e]" />
                  <span>Conteúdo a Restaurar e Registar</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-[#151515] border border-neutral-800 p-2.5 rounded-xl flex items-center space-x-2.5">
                    <Package className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-neutral-400">Artigos / Produtos</p>
                      <p className="text-xs font-bold text-white">{parsedDump.summary.productsCount}</p>
                    </div>
                  </div>

                  <div className="bg-[#151515] border border-neutral-800 p-2.5 rounded-xl flex items-center space-x-2.5">
                    <ShoppingCart className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-neutral-400">Histórico Vendas</p>
                      <p className="text-xs font-bold text-white">{parsedDump.summary.salesCount}</p>
                    </div>
                  </div>

                  <div className="bg-[#151515] border border-neutral-800 p-2.5 rounded-xl flex items-center space-x-2.5">
                    <Users className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-neutral-400">Utilizadores</p>
                      <p className="text-xs font-bold text-white">{parsedDump.summary.usersCount}</p>
                    </div>
                  </div>

                  <div className="bg-[#151515] border border-neutral-800 p-2.5 rounded-xl flex items-center space-x-2.5">
                    <StoreIcon className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-neutral-400">Lojas & Caixas</p>
                      <p className="text-xs font-bold text-white">
                        {parsedDump.summary.storesCount} / {parsedDump.summary.terminalsCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operators list ready for login */}
              {adminUsers.length > 0 && (
                <div className="bg-[#151515] border border-neutral-800 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-neutral-300">
                      Utilizadores prontos para iniciar sessão:
                    </span>
                    <span className="text-neutral-500 font-mono">
                      {adminUsers.length} disponíveis
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                    {adminUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-lg text-[11px] border border-neutral-800/80"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white">{u.name}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            ({u.email || u.username})
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-[#c5a47e]/20 text-[#c5a47e] border border-[#c5a47e]/30">
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto login toggle */}
              <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={autoLoginChecked}
                  onChange={(e) => setAutoLoginChecked(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-[#c5a47e] focus:ring-[#c5a47e]"
                />
                <span className="text-xs text-neutral-200">
                  Iniciar sessão automaticamente como Administrador após a restauração
                </span>
              </label>
            </div>
          )}

          {/* Progress Banner */}
          {isProcessing && (
            <div className="bg-[#181818] border border-[#c5a47e]/40 p-4 rounded-xl flex items-center space-x-3 text-[#c5a47e] animate-pulse">
              <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Processo de Restauração em Curso</p>
                <p className="text-[11px] text-neutral-300">{progressStep}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#141414] border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleExecuteRestore}
            disabled={!parsedDump || isProcessing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#c5a47e] text-neutral-950 font-bold text-xs hover:bg-[#b5946e] transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                <span>A restaurar e registar...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Restaurar e Registar Empresa</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
