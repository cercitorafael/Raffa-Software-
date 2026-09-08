import React, { useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { CompanyAttachedDocument } from '../../types';
import { formatDocumentSize } from '../../utils/officialDocs';

interface CompanyDocumentButtonProps {
  id: string;
  label: string;
  sublabel: string;
  doc?: CompanyAttachedDocument;
  icon?: React.ComponentType<{ className?: string }>;
  onUpload: (file: File) => void;
  onGenerate: () => void;
  onDownload: () => void;
  onRemove: () => void;
  badgeText?: string;
}

export const CompanyDocumentButton: React.FC<CompanyDocumentButtonProps> = ({
  id,
  label,
  sublabel,
  doc,
  icon: IconComponent = FileText,
  onUpload,
  onGenerate,
  onDownload,
  onRemove,
  badgeText,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(files[0]);
      // Reset input value so same file can be re-uploaded if needed
      e.target.value = '';
    }
  };

  const handleTriggerUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    fileInputRef.current?.click();
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.odt,.txt,.png,.jpg,.jpeg"
        className="hidden"
        id={`input-file-${id}`}
      />

      {!doc ? (
        // STATE 1: Document Not Added Yet -> "Adicionar [Documento]"
        <div className="inline-flex items-stretch rounded-lg shadow-sm border border-[#2e2e2e] bg-[#141414] hover:border-[#c5a47e]/60 transition-all overflow-hidden group">
          {/* Main Upload / Add Button */}
          <button
            type="button"
            id={`btn-add-${id}`}
            onClick={handleTriggerUpload}
            title={`Clique para selecionar e descarregar o ficheiro de ${label}`}
            className="flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold text-[#e5e5e5] hover:text-[#c5a47e] hover:bg-[#1a1a1a] transition-all cursor-pointer"
          >
            <div className="w-5 h-5 rounded-md bg-[#222] group-hover:bg-[#c5a47e]/20 flex items-center justify-center text-[#c5a47e] shrink-0 transition-colors">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <div className="text-left leading-tight">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold">Adicionar {label}</span>
                {badgeText && (
                  <span className="text-[9px] uppercase tracking-wider px-1 py-0.2 bg-[#222] text-neutral-400 rounded">
                    {badgeText}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-neutral-400 block font-normal">
                {sublabel}
              </span>
            </div>
          </button>

          {/* Quick Option: Gerar Oficial Preenchido */}
          <button
            type="button"
            id={`btn-generate-${id}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onGenerate();
            }}
            title={`Gerar automaticamente ${label} oficial em PDF preenchido com os dados da empresa e descarregar`}
            className="px-2.5 py-2 border-l border-[#262626] bg-[#181818] hover:bg-[#c5a47e]/15 hover:text-[#c5a47e] text-neutral-400 text-xs transition-colors cursor-pointer flex items-center space-x-1 shrink-0"
          >
            <Sparkles className="w-3 h-3 text-[#c5a47e]" />
            <span className="text-[10px] font-medium hidden sm:inline">Gerar</span>
          </button>
        </div>
      ) : (
        // STATE 2: Document Added -> "Descarregar [Documento]" + Actions
        <div className="inline-flex items-stretch rounded-lg shadow-sm border border-[#c5a47e]/50 bg-[#161616] hover:border-[#c5a47e] transition-all overflow-hidden group">
          {/* Main Download Button */}
          <button
            type="button"
            id={`btn-download-${id}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDownload();
            }}
            title={`Descarregar ${doc.name} (${formatDocumentSize(doc.size)})`}
            className="flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold text-[#e5e5e5] hover:bg-[#1c1c1c] transition-all cursor-pointer"
          >
            <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5 animate-bounce-short" />
            </div>
            <div className="text-left leading-tight max-w-[150px] sm:max-w-[200px]">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-[#c5a47e]">Descarregar {label}</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
              </div>
              <span className="text-[10px] text-neutral-400 truncate block font-mono">
                {doc.name} ({formatDocumentSize(doc.size)})
              </span>
            </div>
          </button>

          {/* Action: Replace Document */}
          <button
            type="button"
            id={`btn-replace-${id}`}
            onClick={handleTriggerUpload}
            title={`Substituir ficheiro de ${label} por outro`}
            className="px-2 py-2 border-l border-[#262626] bg-[#181818] hover:bg-[#222] text-neutral-400 hover:text-neutral-200 text-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
          </button>

          {/* Action: Remove Document */}
          <button
            type="button"
            id={`btn-remove-${id}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            title={`Remover documento de ${label}`}
            className="px-2 py-2 border-l border-[#262626] bg-[#181818] hover:bg-rose-950/40 text-neutral-400 hover:text-rose-400 text-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
