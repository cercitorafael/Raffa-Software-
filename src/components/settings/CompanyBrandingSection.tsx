import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  Building2,
  Eye,
  RefreshCw,
  Sun,
  Moon,
  Check,
  AlertCircle
} from 'lucide-react';
import { Company } from '../../types';

export const CompanyBrandingSection: React.FC = () => {
  const { currentCompany, updateCompany, notify } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoUrlInput, setLogoUrlInput] = useState(currentCompany.logoUrl || '');
  const [logoPosition, setLogoPosition] = useState<'left' | 'center' | 'right'>(
    currentCompany.logoPosition || 'left'
  );
  const [previewBg, setPreviewBg] = useState<'dark' | 'light'>('light');
  const [isDragging, setIsDragging] = useState(false);

  // Preset Corporate Logos
  const sampleLogos = [
    {
      name: 'Omni Retail Gold',
      category: 'Retalho & Moda',
      url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300&auto=format&fit=crop&q=80',
    },
    {
      name: 'Modern Tech & Services',
      category: 'Tecnologia',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
    },
    {
      name: 'Boutique & Joalharia',
      category: 'Luxo & Joalharia',
      url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=80',
    },
    {
      name: 'Supermercado & Alimentar',
      category: 'Supermercado',
      url: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=300&auto=format&fit=crop&q=80',
    },
  ];

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      notify('Por favor selecione um ficheiro de imagem válido (PNG, JPG, SVG, WebP).', 'error');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      notify('A imagem não deve exceder 4MB para otimizar a velocidade de impressão.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        setLogoUrlInput(base64);
        updateCompany({ logoUrl: base64, logoPosition });
        notify('Logótipo da empresa carregado e aplicado com sucesso!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!logoUrlInput.trim()) {
      updateCompany({ logoUrl: undefined, logoPosition });
      notify('Logótipo removido.', 'info');
      return;
    }
    updateCompany({ logoUrl: logoUrlInput.trim(), logoPosition });
    notify('Logótipo da empresa atualizado!', 'success');
  };

  const handleRemoveLogo = () => {
    setLogoUrlInput('');
    updateCompany({ logoUrl: undefined });
    notify('Logótipo removido. Os documentos utilizarão o monograma padrão.', 'info');
  };

  const handleSelectSample = (url: string) => {
    setLogoUrlInput(url);
    updateCompany({ logoUrl: url, logoPosition });
    notify('Logótipo pré-definido aplicado à empresa!', 'success');
  };

  const handlePositionChange = (pos: 'left' | 'center' | 'right') => {
    setLogoPosition(pos);
    updateCompany({ logoPosition: pos });
    notify(`Posicionamento do logótipo alterado para: ${pos.toUpperCase()}`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 text-[#c5a47e]">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-white">
                Identidade Visual & Logótipo da Empresa
              </h3>
              <p className="text-xs text-neutral-400">
                Configure o logótipo que será impresso nos documentos fiscais (Faturas, Notas de Crédito, Guias de Transporte) e exibido na barra superior do ERP.
              </p>
            </div>
          </div>

          {currentCompany.logoUrl && (
            <button
              onClick={handleRemoveLogo}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/40 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover Logótipo</span>
            </button>
          )}
        </div>

        {/* Main Grid: Upload & Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left: Upload and Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#c5a47e] bg-[#c5a47e]/10'
                  : 'border-[#333333] hover:border-[#c5a47e]/60 bg-[#0d0d0d] hover:bg-[#111111]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center mx-auto mb-3 text-[#c5a47e]">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-white mb-1">
                Clique para selecionar ou arraste o logótipo da sua empresa aqui
              </p>
              <p className="text-[11px] text-neutral-400">
                Formatos recomendados: PNG transparente, SVG ou JPG de alta resolução (máx. 4MB).
              </p>
            </div>

            {/* Direct URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 block">
                Ou insira o URL direto da imagem:
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="https://exemplo.com/logo-empresa.png"
                  value={logoUrlInput}
                  onChange={(e) => setLogoUrlInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#c5a47e]"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-4 py-2 bg-[#c5a47e] hover:bg-[#b5946e] text-neutral-950 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Aplicar URL
                </button>
              </div>
            </div>

            {/* Position Controls */}
            <div className="bg-[#0d0d0d] border border-[#242424] rounded-xl p-4 space-y-2">
              <label className="text-xs font-semibold text-neutral-300 block">
                Posição do Logótipo no Cabeçalho dos Documentos:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'left', label: 'À Esquerda' },
                  { id: 'center', label: 'Ao Centro' },
                  { id: 'right', label: 'À Direita' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => handlePositionChange(pos.id as any)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      logoPosition === pos.id
                        ? 'bg-[#c5a47e]/20 text-[#c5a47e] border-[#c5a47e] font-bold'
                        : 'bg-[#141414] text-neutral-400 border-[#262626] hover:text-white'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sample Preset Logos */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] uppercase font-mono tracking-wider text-neutral-400 block">
                Modelos de Logótipos Rápidos para Demonstração:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {sampleLogos.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSample(s.url)}
                    className="p-2.5 rounded-xl bg-[#0d0d0d] border border-[#242424] hover:border-[#c5a47e]/60 text-left transition-all cursor-pointer flex items-center space-x-2.5 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white p-0.5 shrink-0 overflow-hidden">
                      <img src={s.url} alt={s.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-neutral-200 group-hover:text-[#c5a47e] truncate">
                        {s.name}
                      </p>
                      <p className="text-[10px] text-neutral-500">{s.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Live Preview Box (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-[#0d0d0d] border border-[#262626] rounded-2xl p-4 flex flex-col h-full">
              <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-[#c5a47e]" />
                  <span className="text-xs font-serif font-bold text-white">Pré-visualização do Logótipo</span>
                </div>
                {/* Contrast Toggle */}
                <div className="flex items-center space-x-1 bg-[#161616] p-1 rounded-lg border border-[#2a2a2a]">
                  <button
                    type="button"
                    onClick={() => setPreviewBg('light')}
                    className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                      previewBg === 'light' ? 'bg-white text-black font-bold shadow-xs' : 'text-neutral-400'
                    }`}
                    title="Fundo Claro (Papel A4 / Fatura Impressa)"
                  >
                    <Sun className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewBg('dark')}
                    className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                      previewBg === 'dark' ? 'bg-[#2a2a2a] text-white font-bold' : 'text-neutral-400'
                    }`}
                    title="Fundo Escuro (Ecrã POS / Dashboard)"
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Logo Frame Container */}
              <div
                className={`flex-1 min-h-[220px] rounded-xl my-4 border flex flex-col items-center justify-center p-6 transition-colors ${
                  previewBg === 'light'
                    ? 'bg-[#ffffff] border-[#e2e8f0] text-neutral-900'
                    : 'bg-[#050505] border-[#222222] text-white'
                }`}
              >
                {currentCompany.logoUrl ? (
                  <div className="flex flex-col items-center text-center space-y-3">
                    <img
                      src={currentCompany.logoUrl}
                      alt={currentCompany.name}
                      className="max-h-24 max-w-full object-contain rounded shadow-xs"
                    />
                    <div>
                      <p className={`text-xs font-serif font-bold ${previewBg === 'light' ? 'text-neutral-900' : 'text-white'}`}>
                        {currentCompany.tradeName || currentCompany.name}
                      </p>
                      <p className={`text-[10px] font-mono ${previewBg === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        NIF: {currentCompany.taxNumber}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-[#c5a47e]/15 border border-[#c5a47e]/40 text-[#c5a47e] flex items-center justify-center font-serif text-2xl font-bold mx-auto">
                      {currentCompany.name?.substring(0, 2).toUpperCase() || 'ER'}
                    </div>
                    <p className={`text-xs font-medium ${previewBg === 'light' ? 'text-neutral-600' : 'text-neutral-400'}`}>
                      Nenhum logótipo carregado
                    </p>
                    <p className="text-[10px] text-neutral-400 max-w-[200px]">
                      Será utilizado o monograma padrão com as iniciais da empresa.
                    </p>
                  </div>
                )}
              </div>

              {/* Status footer */}
              <div className="bg-[#141414] rounded-xl p-3 border border-[#242424] text-[11px] space-y-1">
                <div className="flex items-center justify-between text-neutral-300">
                  <span>Estado do Logótipo:</span>
                  <span className="font-semibold text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{currentCompany.logoUrl ? 'Configurado & Ativo' : 'Padrão (Iniciais)'}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-400">
                  <span>Alinhamento em Documentos:</span>
                  <span className="font-mono text-[#c5a47e] capitalize">{logoPosition}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
