import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/crypto';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  Code,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Database,
  Layers,
  HelpCircle,
  FileUp,
  FileDown,
} from 'lucide-react';
import {
  parseProductsFile,
  ParsedProductRow,
  exportProductsToExcel,
  exportProductsToCSV,
  exportProductsToJSON,
  generateProductsTemplateExcel,
  generateProductsTemplateCSV,
} from '../../utils/stockExport';
import { Product } from '../../types';

interface ProductImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'import' | 'export';
}

export const ProductImportExportModal: React.FC<ProductImportExportModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'import',
}) => {
  const {
    products,
    categories,
    stock,
    warehouses,
    suppliers,
    currentCompany,
    currentStore,
    importProducts,
    notify,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'import' | 'export'>(initialMode);

  // Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    validNew: number;
    validUpdate: number;
    invalid: number;
  } | null>(null);
  const [importStrategy, setImportStrategy] = useState<'merge' | 'skip_existing'>('merge');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>(
    currentStore.defaultWarehouseId || warehouses[0]?.id || ''
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export State
  const [exportCategoryFilter, setExportCategoryFilter] = useState<string>('all');
  const [exportWarehouseFilter, setExportWarehouseFilter] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');

  if (!isOpen) return null;

  // Handle File Parsing
  const handleFileChange = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsParsing(true);
    try {
      const result = await parseProductsFile(
        file,
        products,
        categories,
        warehouses,
        suppliers
      );
      setParsedRows(result.rows);
      setImportSummary(result.summary);
      notify(`Ficheiro lido com sucesso: ${result.summary.total} linhas analisadas.`, 'info');
    } catch (err: any) {
      notify(`Erro ao processar ficheiro: ${err?.message || 'Formato inválido'}`, 'error');
      setParsedRows([]);
      setImportSummary(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (!parsedRows.length) return;

    // Filter valid rows according to strategy
    const validRows = parsedRows.filter((r) => {
      if (r.status === 'invalid') return false;
      if (importStrategy === 'skip_existing' && r.status === 'update') return false;
      return true;
    });

    if (validRows.length === 0) {
      notify('Nenhum artigo válido para importar de acordo com os critérios selecionados.', 'warning');
      return;
    }

    const payload = validRows.map((r) => ({
      name: r.name,
      sku: r.sku,
      barcode: r.barcode,
      price: r.price,
      costPrice: r.costPrice,
      taxRate: r.taxRate,
      category: r.category,
      unit: r.unit,
      minStock: r.minStock,
      maxStock: r.maxStock,
      hasBatchControl: r.hasBatchControl,
      supplierId: r.supplierId,
      description: r.description,
      imageUrl: r.imageUrl,
      initialStock: r.initialStock,
      warehouseId: targetWarehouseId,
    }));

    const result = importProducts(payload, importStrategy === 'merge' ? 'merge' : 'merge');
    notify(
      `Importação concluída! ${result.added} artigos novos adicionados e ${result.updated} atualizados.`,
      'success'
    );
    onClose();
  };

  // Filter products to export
  const productsToExport = products.filter((p) => {
    if (exportCategoryFilter !== 'all' && p.category !== exportCategoryFilter) return false;
    return true;
  });

  const handleExecuteExport = () => {
    if (productsToExport.length === 0) {
      notify('Nenhum artigo corresponde aos filtros para exportação.', 'warning');
      return;
    }

    if (exportFormat === 'xlsx') {
      exportProductsToExcel(
        productsToExport,
        categories,
        stock,
        warehouses,
        suppliers,
        currentCompany.tradeName || currentCompany.name,
        currentCompany.currencySymbol || currentCompany.currency
      );
    } else if (exportFormat === 'csv') {
      exportProductsToCSV(
        productsToExport,
        categories,
        stock,
        currentCompany.tradeName || currentCompany.name
      );
    } else {
      exportProductsToJSON(productsToExport, currentCompany.tradeName || currentCompany.name);
    }

    notify(`Catálogo exportado com sucesso (${productsToExport.length} artigos)!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none animate-fadeIn">
      <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#e5e5e5]">
        {/* Header */}
        <div className="p-4 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#c5a47e]/15 border border-[#c5a47e]/30 flex items-center justify-center text-[#c5a47e]">
              {activeTab === 'import' ? <FileUp className="w-5 h-5" /> : <FileDown className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#e5e5e5]">
                {activeTab === 'import' ? 'Importar Artigos em Massa' : 'Exportar Catálogo de Produtos'}
              </h3>
              <p className="text-xs text-neutral-400">
                {activeTab === 'import'
                  ? 'Carregue folhas de cálculo Excel (.xlsx), CSV ou JSON para atualizar o catálogo'
                  : 'Exporte artigos, preços, taxas de IVA e inventário para Excel, CSV ou JSON'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Mode Switcher Tabs */}
            <div className="bg-[#1a1a1a] p-1 rounded-lg border border-[#262626] flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'import'
                    ? 'bg-[#c5a47e] text-neutral-950 font-semibold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('export')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'export'
                    ? 'bg-[#c5a47e] text-neutral-950 font-semibold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-[#202020] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ===================== TAB: IMPORT ===================== */}
          {activeTab === 'import' && (
            <div className="space-y-5">
              {/* Template Download Assistance */}
              <div className="bg-[#0f0f0f] border border-[#262626] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <FileSpreadsheet className="w-5 h-5 text-[#c5a47e] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-200">Precisa do modelo padrão de importação?</h4>
                    <p className="text-[11px] text-neutral-400">
                      Descarregue o modelo com as colunas recomendadas (SKU, Nome, Barcode, Preço PVP, IVA, Stock Inicial).
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={generateProductsTemplateExcel}
                    className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] text-neutral-200 border border-[#333] hover:border-[#c5a47e]/40 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Modelo Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={generateProductsTemplateCSV}
                    className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] text-neutral-200 border border-[#333] hover:border-[#c5a47e]/40 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Modelo CSV</span>
                  </button>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#c5a47e] bg-[#c5a47e]/10 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : 'border-[#333] hover:border-[#c5a47e]/60 bg-[#0d0d0d] hover:bg-[#121212]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-12 h-12 rounded-full bg-[#1c1c1c] border border-[#262626] flex items-center justify-center text-[#c5a47e] mb-3 shadow-inner">
                  {isParsing ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-[#c5a47e]" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>

                {selectedFile ? (
                  <div>
                    <p className="text-sm font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> {selectedFile.name}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Clique para escolher outro ficheiro
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-neutral-200">
                      Arraste e solte o seu ficheiro Excel, CSV ou JSON aqui
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      ou clique para navegar no seu computador (.xlsx, .xls, .csv, .json)
                    </p>
                  </div>
                )}
              </div>

              {/* Import Options & Summary */}
              {importSummary && (
                <div className="space-y-4">
                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-3">
                      <span className="text-[10px] text-neutral-400 uppercase font-mono block">Total Analisado</span>
                      <span className="text-lg font-bold text-neutral-200 font-mono">{importSummary.total}</span>
                    </div>
                    <div className="bg-[#0f0f0f] border border-emerald-900/30 rounded-lg p-3">
                      <span className="text-[10px] text-emerald-400 uppercase font-mono block">Novos Artigos</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">{importSummary.validNew}</span>
                    </div>
                    <div className="bg-[#0f0f0f] border border-amber-900/30 rounded-lg p-3">
                      <span className="text-[10px] text-amber-400 uppercase font-mono block">A Atualizar (Merge)</span>
                      <span className="text-lg font-bold text-amber-400 font-mono">{importSummary.validUpdate}</span>
                    </div>
                    <div className="bg-[#0f0f0f] border border-rose-900/30 rounded-lg p-3">
                      <span className="text-[10px] text-rose-400 uppercase font-mono block">Linhas com Erros</span>
                      <span className="text-lg font-bold text-rose-400 font-mono">{importSummary.invalid}</span>
                    </div>
                  </div>

                  {/* Warehouse & Import Strategy Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0d0d0d] p-3.5 rounded-xl border border-[#262626]">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Armazém Destino para Stock Inicial:
                      </label>
                      <select
                        value={targetWarehouseId}
                        onChange={(e) => setTargetWarehouseId(e.target.value)}
                        className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                      >
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.code}) {w.isDefault ? '— Padrão' : ''}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        As quantidades de stock inicial declaradas serão alocadas a este armazém.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Estratégia para Artigos Existentes (SKU/Barcode):
                      </label>
                      <select
                        value={importStrategy}
                        onChange={(e) => setImportStrategy(e.target.value as any)}
                        className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden focus:border-[#c5a47e]"
                      >
                        <option value="merge">Atualizar dados existentes e inserir novos (Recomendado)</option>
                        <option value="skip_existing">Apenas adicionar novos (Ignorar se SKU já existir)</option>
                      </select>
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        Evita duplicação mantendo histórico e ajustando preços e IVA.
                      </span>
                    </div>
                  </div>

                  {/* Data Preview Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                      <span>Pré-visualização dos Artigos ({parsedRows.length} linhas)</span>
                      <span className="text-[11px] text-neutral-400 font-normal">
                        Mostrando as primeiras {Math.min(parsedRows.length, 10)} linhas
                      </span>
                    </div>

                    <div className="border border-[#262626] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0f0f0f] text-neutral-400 font-semibold uppercase text-[10px] sticky top-0 border-b border-[#262626]">
                          <tr>
                            <th className="py-2 px-3">Estado</th>
                            <th className="py-2 px-3">SKU</th>
                            <th className="py-2 px-3">Nome do Artigo</th>
                            <th className="py-2 px-3">PVP ({currentCompany?.currencySymbol || 'Mt'})</th>
                            <th className="py-2 px-3">IVA</th>
                            <th className="py-2 px-3">Stock Inicial</th>
                            <th className="py-2 px-3">Observações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#202020] bg-[#141414]">
                          {parsedRows.slice(0, 15).map((row, idx) => (
                            <tr key={idx} className="hover:bg-[#181818] transition-colors">
                              <td className="py-2 px-3">
                                {row.status === 'new' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    <CheckCircle className="w-3 h-3" /> Novo
                                  </span>
                                ) : row.status === 'update' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    <RefreshCw className="w-3 h-3" /> Atualizar
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    <AlertCircle className="w-3 h-3" /> Erro
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono text-neutral-300 font-medium">{row.sku}</td>
                              <td className="py-2 px-3 text-neutral-200 max-w-[200px] truncate">{row.name}</td>
                              <td className="py-2 px-3 font-mono text-[#c5a47e] font-semibold">{formatCurrency(row.price)}</td>
                              <td className="py-2 px-3 font-mono text-neutral-400">{row.taxRate}%</td>
                              <td className="py-2 px-3 font-mono text-emerald-400">{row.initialStock ?? 0} {row.unit}</td>
                              <td className="py-2 px-3 text-[11px] text-neutral-400">
                                {row.errors.length > 0 ? (
                                  <span className="text-rose-400">{row.errors.join(', ')}</span>
                                ) : (
                                  <span className="text-neutral-500">Pronto para importar</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB: EXPORT ===================== */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              {/* Filter Section */}
              <div className="bg-[#0f0f0f] border border-[#262626] rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-semibold text-neutral-200 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#c5a47e]" />
                  <span>Filtros de Exportação</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Filtrar por Categoria:</label>
                    <select
                      value={exportCategoryFilter}
                      onChange={(e) => setExportCategoryFilter(e.target.value)}
                      className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-hidden"
                    >
                      <option value="all">Todas as Categorias ({products.length} artigos)</option>
                      {categories.map((c) => {
                        const count = products.filter((p) => p.category === c.id).length;
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} ({count} artigos)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Empresa & Armazéns:</label>
                    <div className="p-2 bg-[#161616] border border-[#262626] rounded-lg text-xs text-neutral-300">
                      <span className="font-semibold text-[#c5a47e]">{currentCompany.tradeName || currentCompany.name}</span>
                      <span className="text-neutral-500 ml-1">({warehouses.length} armazéns integrados)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Format Selection Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-300">Formato de Ficheiro:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Excel */}
                  <div
                    onClick={() => setExportFormat('xlsx')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      exportFormat === 'xlsx'
                        ? 'border-[#c5a47e] bg-[#c5a47e]/10 shadow-sm'
                        : 'border-[#262626] bg-[#0f0f0f] hover:border-[#3f3f3f]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <FileSpreadsheet className={`w-6 h-6 ${exportFormat === 'xlsx' ? 'text-[#c5a47e]' : 'text-emerald-400'}`} />
                      {exportFormat === 'xlsx' && <CheckCircle className="w-4 h-4 text-[#c5a47e]" />}
                    </div>
                    <span className="font-semibold text-sm text-neutral-200">Microsoft Excel (.xlsx)</span>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Tabela formatada com colunas ajustadas, margens de lucro, valor de stock e separadores.
                    </p>
                  </div>

                  {/* CSV */}
                  <div
                    onClick={() => setExportFormat('csv')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      exportFormat === 'csv'
                        ? 'border-[#c5a47e] bg-[#c5a47e]/10 shadow-sm'
                        : 'border-[#262626] bg-[#0f0f0f] hover:border-[#3f3f3f]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <FileText className={`w-6 h-6 ${exportFormat === 'csv' ? 'text-[#c5a47e]' : 'text-sky-400'}`} />
                      {exportFormat === 'csv' && <CheckCircle className="w-4 h-4 text-[#c5a47e]" />}
                    </div>
                    <span className="font-semibold text-sm text-neutral-200">Ficheiro CSV (.csv)</span>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Texto delimitado por ponto e vírgula com codificação UTF-8 universal.
                    </p>
                  </div>

                  {/* JSON */}
                  <div
                    onClick={() => setExportFormat('json')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      exportFormat === 'json'
                        ? 'border-[#c5a47e] bg-[#c5a47e]/10 shadow-sm'
                        : 'border-[#262626] bg-[#0f0f0f] hover:border-[#3f3f3f]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Code className={`w-6 h-6 ${exportFormat === 'json' ? 'text-[#c5a47e]' : 'text-amber-400'}`} />
                      {exportFormat === 'json' && <CheckCircle className="w-4 h-4 text-[#c5a47e]" />}
                    </div>
                    <span className="font-semibold text-sm text-neutral-200">Schema JSON (.json)</span>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Exportação estruturada de backup para migração ou integração via API REST.
                    </p>
                  </div>
                </div>
              </div>

              {/* Export Preview Summary Card */}
              <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-400">Total de Artigos a Exportar:</span>
                  <div className="text-lg font-mono font-bold text-[#c5a47e]">{productsToExport.length} referências</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-neutral-400">Formato Selecionado:</span>
                  <div className="text-sm font-semibold uppercase text-emerald-400 font-mono">
                    .{exportFormat}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0d0d0d] border-t border-[#262626] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-300 rounded-lg text-xs font-medium transition-colors cursor-pointer border border-[#333]"
          >
            Cancelar
          </button>

          {activeTab === 'import' ? (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={!parsedRows.length || (importSummary?.validNew === 0 && importSummary?.validUpdate === 0)}
              className="px-5 py-2.5 bg-[#c5a47e] hover:bg-[#b5946e] disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-semibold text-xs rounded-lg transition-all flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Concluir Importação ({importSummary ? importSummary.validNew + importSummary.validUpdate : 0} artigos)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExecuteExport}
              disabled={productsToExport.length === 0}
              className="px-5 py-2.5 bg-[#c5a47e] hover:bg-[#b5946e] disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-semibold text-xs rounded-lg transition-all flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descarregar Ficheiro .{exportFormat.toUpperCase()}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
