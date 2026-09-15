import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Download,
  CheckCircle2,
  Trash2,
  X,
  FileJson,
  ShieldAlert,
  Database,
  Info,
  Clock,
  ArrowDownCircle,
} from 'lucide-react';
import { Company } from '../../types';
import {
  CompanySafetyDump,
  downloadCompanyDump,
  formatBytes,
} from '../../utils/companyBackup';
import { sound } from '../../utils/audio';

interface DeleteCompanyBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  dump: CompanySafetyDump;
  onConfirmDelete: () => Promise<void>;
}

export const DeleteCompanyBackupModal: React.FC<DeleteCompanyBackupModalProps> = ({
  isOpen,
  onClose,
  company,
  dump,
  onConfirmDelete,
}) => {
  const [hasDownloaded, setHasDownloaded] = useState<boolean>(false);
  const [downloadInfo, setDownloadInfo] = useState<{ filename: string; url: string; sizeInBytes: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setHasDownloaded(false);
      setConfirmInput('');
      setIsDeleting(false);
      // Prepara o objeto de download
      try {
        const jsonStr = JSON.stringify(dump, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const safeName = (company.name || 'empresa')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);
        setDownloadInfo({
          filename: `Dump_Seguranca_${safeName}_${dateStr}.json`,
          url,
          sizeInBytes: blob.size,
        });
      } catch (e) {
        console.error('Erro ao gerar blob do dump:', e);
      }
    }
  }, [isOpen, company, dump]);

  if (!isOpen) return null;

  const handleDownload = () => {
    sound.playBeep();
    downloadCompanyDump(dump);
    setHasDownloaded(true);
  };

  const handleConfirm = async () => {
    // Se ainda não tiver feito o download, descarrega automaticamente antes de deletar
    if (!hasDownloaded) {
      downloadCompanyDump(dump);
      setHasDownloaded(true);
    }

    setIsDeleting(true);
    sound.playError();
    try {
      await onConfirmDelete();
      // O AppContext irá redirecionar para a tela de login
    } catch (err) {
      console.error('Erro na exclusão da empresa:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-[#121212] border border-rose-500/30 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-8"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950/40 via-neutral-900 to-rose-950/20 px-6 py-4 border-b border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Eliminar Empresa & Purgar Supabase
              </h3>
              <p className="text-xs text-neutral-400">
                Cópia de segurança prévia e eliminação permanente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-neutral-300 text-xs">
          {/* Company identity card */}
          <div className="bg-[#171717] border border-neutral-800 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                Empresa a Eliminar
              </span>
              <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800/60 px-2 py-0.5 rounded">
                ID: {company.id}
              </span>
            </div>
            <div className="text-sm font-bold text-white">{company.name}</div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400 pt-1 border-t border-neutral-800">
              <div>NIF: <span className="text-neutral-200 font-semibold">{company.taxNumber || 'Sem NIF'}</span></div>
              <div>Cidade: <span className="text-neutral-200 font-semibold">{company.city || 'Maputo'}</span></div>
            </div>
          </div>

          {/* DUMP DE SEGURANÇA (Obrigatório / Destaque) */}
          <div className="bg-[#1a1412] border border-[#c5a47e]/30 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-2 text-[#c5a47e]">
                <Database className="w-4 h-4 shrink-0" />
                <h4 className="font-bold text-xs text-[#c5a47e]">
                  Dump de Segurança Gerado com Sucesso
                </h4>
              </div>
              {hasDownloaded && (
                <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Transferido</span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Antes de executar a exclusão, reunimos todas as informações das tabelas principais desta empresa num ficheiro estruturado JSON pronto para download:
            </p>

            {/* Resumo das tabelas empacotadas no dump */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-[10px] bg-black/40 p-2.5 rounded-lg border border-neutral-800 font-mono">
              <div>Artigos: <strong className="text-white">{dump.summary.productsCount}</strong></div>
              <div>Vendas: <strong className="text-white">{dump.summary.salesCount}</strong></div>
              <div>Clientes: <strong className="text-white">{dump.summary.customersCount}</strong></div>
              <div>Fornecedores: <strong className="text-white">{dump.summary.suppliersCount}</strong></div>
              <div>Lojas: <strong className="text-white">{dump.summary.storesCount}</strong></div>
              <div>Utilizadores: <strong className="text-white">{dump.summary.usersCount}</strong></div>
              <div>Categorias: <strong className="text-white">{dump.summary.categoriesCount}</strong></div>
              <div>Turnos: <strong className="text-white">{dump.summary.shiftsCount}</strong></div>
            </div>

            {/* Botão de Download */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#c5a47e] text-neutral-950 font-bold text-xs hover:bg-[#b5946e] transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Descarregar Cópia de Segurança (Dump JSON)</span>
              </button>

              {downloadInfo && (
                <span className="text-[11px] text-neutral-400 font-mono">
                  {formatBytes(downloadInfo.sizeInBytes)} &bull; JSON
                </span>
              )}
            </div>

            {/* Link direto caso o utilizador prefira */}
            {downloadInfo && (
              <div className="text-[11px] text-neutral-400 flex items-center space-x-1.5">
                <FileJson className="w-3.5 h-3.5 text-[#c5a47e]" />
                <span>Link direto do ficheiro:</span>
                <a
                  href={downloadInfo.url}
                  download={downloadInfo.filename}
                  onClick={() => setHasDownloaded(true)}
                  className="text-[#c5a47e] hover:underline font-mono truncate max-w-[260px]"
                >
                  {downloadInfo.filename}
                </a>
              </div>
            )}
          </div>

          {/* Aviso sobre restauração futura na tela de login */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3.5 flex items-start space-x-3 text-blue-200">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-white font-semibold">Como voltar a usar esta empresa:</strong>
              <p className="mt-0.5 text-neutral-300">
                Caso decida reativar a empresa no futuro, a <strong>tela de login</strong> dispõe de uma opção para <strong>&ldquo;Restaurar Dados da Empresa&rdquo;</strong>. Bastará carregar este ficheiro JSON para recadastrar instantaneamente a empresa e todos os seus utilizadores no sistema e no Supabase.
              </p>
            </div>
          </div>

          {/* Alerta Destrutivo Supabase */}
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 flex items-start space-x-3 text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-white font-semibold">Aviso Crítico de Exclusão no Supabase:</strong>
              <p className="mt-0.5 text-neutral-300">
                Ao confirmar, todos os registos remotos associados no Supabase e na memória local serão eliminados. A sessão atual será terminada imediatamente e será redirecionado para a tela de login.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#141414] border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>A purgar no Supabase & Encerrar...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>
                  {hasDownloaded
                    ? 'Confirmar Exclusão e Purgar Supabase'
                    : 'Baixar Backup e Confirmar Exclusão'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
