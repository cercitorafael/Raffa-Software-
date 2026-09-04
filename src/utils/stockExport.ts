import * as XLSX from 'xlsx';
import { Product, ProductCategory, StockItem, Warehouse, Supplier } from '../types';
import { getCurrencyDefinition } from './currency';

export interface ParsedProductRow {
  rowNumber: number;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  price: number;
  costPrice: number;
  taxRate: number;
  unit: string;
  minStock: number;
  maxStock: number;
  hasBatchControl: boolean;
  supplierId?: string;
  description?: string;
  imageUrl?: string;
  initialStock?: number;
  warehouseId?: string;
  status: 'new' | 'update' | 'invalid';
  errors: string[];
}

/**
 * Normalizes header keys from Excel/CSV to standard internal fields
 */
function normalizeHeaderKey(key: string): string {
  const clean = key
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  if (['nome', 'artigo', 'designacao', 'name', 'produto', 'descricaoartigo'].includes(clean)) {
    return 'name';
  }
  if (['sku', 'ref', 'referencia', 'code', 'codigo', 'codartigo'].includes(clean)) {
    return 'sku';
  }
  if (['barcode', 'codigobarras', 'codigodebarras', 'ean', 'gtin', 'codbarras'].includes(clean)) {
    return 'barcode';
  }
  if (['categoria', 'cat', 'category', 'familia', 'grupo'].includes(clean)) {
    return 'category';
  }
  if (['preco', 'price', 'pvp', 'precovenda', 'precocomiva', 'valorvenda'].includes(clean)) {
    return 'price';
  }
  if (['custo', 'precocusto', 'costprice', 'cost', 'valordecompra', 'precocompra'].includes(clean)) {
    return 'costPrice';
  }
  if (['taxaiva', 'iva', 'tax', 'taxrate', 'taxadeiva', 'aliquota'].includes(clean)) {
    return 'taxRate';
  }
  if (['unidade', 'unit', 'unid', 'medida', 'uom'].includes(clean)) {
    return 'unit';
  }
  if (['stockminimo', 'minstock', 'stockmin', 'minimo'].includes(clean)) {
    return 'minStock';
  }
  if (['stockmaximo', 'maxstock', 'stockmax', 'maximo'].includes(clean)) {
    return 'maxStock';
  }
  if (['stockinicial', 'stock', 'quantidade', 'qty', 'initialstock', 'qtd'].includes(clean)) {
    return 'initialStock';
  }
  if (['lotes', 'controleslote', 'batch', 'hasbatchcontrol', 'controllote', 'validade'].includes(clean)) {
    return 'hasBatchControl';
  }
  if (['descricao', 'description', 'obs', 'notas', 'detalhes'].includes(clean)) {
    return 'description';
  }
  if (['imagem', 'imageurl', 'foto', 'image', 'linkimagem'].includes(clean)) {
    return 'imageUrl';
  }
  if (['fornecedor', 'supplier', 'supplierid', 'niffornecedor'].includes(clean)) {
    return 'supplier';
  }
  if (['armazem', 'warehouse', 'warehouseid', 'local'].includes(clean)) {
    return 'warehouse';
  }

  return clean;
}

/**
 * Parses an uploaded Excel (.xlsx, .xls), CSV or JSON file containing products
 */
export async function parseProductsFile(
  file: File,
  existingProducts: Product[],
  categories: ProductCategory[],
  warehouses: Warehouse[],
  suppliers: Supplier[]
): Promise<{ rows: ParsedProductRow[]; summary: { total: number; validNew: number; validUpdate: number; invalid: number } }> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  let rawRows: Record<string, any>[] = [];

  if (extension === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    rawRows = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }

  const existingSkuMap = new Map<string, Product>();
  const existingBarcodeMap = new Map<string, Product>();

  existingProducts.forEach((p) => {
    if (p.sku) existingSkuMap.set(p.sku.toLowerCase().trim(), p);
    if (p.barcode) existingBarcodeMap.set(p.barcode.trim(), p);
  });

  const parsedRows: ParsedProductRow[] = [];

  rawRows.forEach((row, index) => {
    // Normalize keys
    const normalized: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      const field = normalizeHeaderKey(k);
      normalized[field] = row[k];
    });

    const errors: string[] = [];

    // Name validation
    const name = String(normalized.name || '').trim();
    if (!name) {
      errors.push('Nome do artigo é obrigatório.');
    }

    // SKU generation or extraction
    let sku = String(normalized.sku || '').trim();
    if (!sku) {
      // Auto-generate SKU if missing
      const cleanPrefix = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || 'ART';
      sku = `${cleanPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Barcode extraction
    let barcode = String(normalized.barcode || '').trim();
    if (!barcode) {
      // Auto-generate numeric barcode if missing
      barcode = `560${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    }

    // Category mapping
    let categoryInput = String(normalized.category || '').trim();
    let matchedCategory = categories.find(
      (c) =>
        c.id === categoryInput ||
        c.name.toLowerCase() === categoryInput.toLowerCase()
    );
    const categoryId = matchedCategory ? matchedCategory.id : (categories[0]?.id || 'cat-geral');

    // Price parsing
    const rawPrice = String(normalized.price || '').replace(',', '.').replace(/[^\d.-]/g, '');
    const price = parseFloat(rawPrice);
    if (isNaN(price) || price < 0) {
      errors.push('Preço PVP inválido.');
    }

    // Cost price
    const rawCost = String(normalized.costPrice || '').replace(',', '.').replace(/[^\d.-]/g, '');
    const costPrice = isNaN(parseFloat(rawCost)) ? Number(((price || 1) * 0.5).toFixed(2)) : parseFloat(rawCost);

    // Tax rate (IVA)
    let taxRate = parseInt(String(normalized.taxRate || '23').replace('%', ''), 10);
    if (![0, 6, 13, 23].includes(taxRate)) {
      if (taxRate === 5 || taxRate === 4) taxRate = 6;
      else if (taxRate === 12) taxRate = 13;
      else taxRate = 23;
    }

    // Unit
    const unit = String(normalized.unit || 'un').trim().toLowerCase() || 'un';

    // Min & Max Stock
    const minStock = parseInt(String(normalized.minStock || '5'), 10) || 5;
    const maxStock = parseInt(String(normalized.maxStock || '100'), 10) || 100;

    // Batch control
    const rawBatch = String(normalized.hasBatchControl || '').toLowerCase();
    const hasBatchControl = ['true', '1', 'sim', 'yes', 's'].includes(rawBatch);

    // Initial stock
    const rawInitialStock = String(normalized.initialStock || '0').replace(',', '.');
    const initialStock = Math.max(0, parseFloat(rawInitialStock) || 0);

    // Warehouse matching
    let warehouseInput = String(normalized.warehouse || '').trim();
    const matchedWarehouse = warehouses.find(
      (w) =>
        w.id === warehouseInput ||
        w.code.toLowerCase() === warehouseInput.toLowerCase() ||
        w.name.toLowerCase() === warehouseInput.toLowerCase()
    );
    const warehouseId = matchedWarehouse ? matchedWarehouse.id : warehouses[0]?.id;

    // Supplier matching
    let supplierInput = String(normalized.supplier || '').trim();
    const matchedSupplier = suppliers.find(
      (s) =>
        s.id === supplierInput ||
        s.name.toLowerCase() === supplierInput.toLowerCase() ||
        s.taxNumber === supplierInput
    );
    const supplierId = matchedSupplier ? matchedSupplier.id : undefined;

    // Status checking (is it an update of existing product?)
    const existingBySku = existingSkuMap.get(sku.toLowerCase().trim());
    const existingByBarcode = existingBarcodeMap.get(barcode.trim());
    const isUpdate = Boolean(existingBySku || existingByBarcode);

    const status: 'new' | 'update' | 'invalid' =
      errors.length > 0 ? 'invalid' : isUpdate ? 'update' : 'new';

    parsedRows.push({
      rowNumber: index + 2, // 1-indexed plus header row
      name,
      sku,
      barcode,
      category: categoryId,
      price: isNaN(price) ? 0 : price,
      costPrice,
      taxRate,
      unit,
      minStock,
      maxStock,
      hasBatchControl,
      supplierId,
      description: normalized.description || '',
      imageUrl: normalized.imageUrl || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300',
      initialStock,
      warehouseId,
      status,
      errors,
    });
  });

  const summary = {
    total: parsedRows.length,
    validNew: parsedRows.filter((r) => r.status === 'new').length,
    validUpdate: parsedRows.filter((r) => r.status === 'update').length,
    invalid: parsedRows.filter((r) => r.status === 'invalid').length,
  };

  return { rows: parsedRows, summary };
}

/**
 * Exports products to Excel workbook and triggers download
 */
export function exportProductsToExcel(
  products: Product[],
  categories: ProductCategory[],
  stock: StockItem[],
  warehouses: Warehouse[],
  suppliers: Supplier[],
  companyName: string = 'Empresa',
  currencySymbol?: string
) {
  const currSym = currencySymbol || getCurrencyDefinition().symbol || 'Mt';
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

  // Calculate aggregated stock per product
  const productStockMap = new Map<string, number>();
  stock.forEach((s) => {
    const current = productStockMap.get(s.productId) || 0;
    productStockMap.set(s.productId, current + s.quantity);
  });

  const exportData = products.map((p, idx) => {
    const totalQty = productStockMap.get(p.id) || 0;
    const catName = categoryMap.get(p.category) || p.category;
    const supName = p.supplierId ? (supplierMap.get(p.supplierId) || p.supplierId) : 'N/A';

    return {
      'Nº': idx + 1,
      'SKU / Referência': p.sku,
      'Designação do Artigo': p.name,
      'Código de Barras (EAN)': p.barcode,
      'Categoria': catName,
      [`PVP (${currSym} com IVA)`]: p.price,
      [`Preço Custo (${currSym})`]: p.costPrice,
      [`Margem Bruta (${currSym})`]: Number((p.price - p.costPrice).toFixed(2)),
      'Taxa IVA (%)': p.taxRate,
      'Unidade': p.unit,
      'Stock Atual (Total)': totalQty,
      'Stock Mínimo': p.minStock,
      'Stock Máximo': p.maxStock,
      [`Valor Total Stock (${currSym})`]: Number((totalQty * p.costPrice).toFixed(2)),
      'Controlo de Lotes': p.hasBatchControl ? 'Sim' : 'Não',
      'Fornecedor Habitual': supName,
      'Descrição / Notas': p.description || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 5 },  // Nº
    { wch: 16 }, // SKU
    { wch: 32 }, // Nome
    { wch: 18 }, // Barcode
    { wch: 18 }, // Categoria
    { wch: 14 }, // PVP
    { wch: 14 }, // Custo
    { wch: 15 }, // Margem
    { wch: 12 }, // IVA
    { wch: 8 },  // Unidade
    { wch: 16 }, // Stock Atual
    { wch: 12 }, // Min
    { wch: 12 }, // Max
    { wch: 18 }, // Valor Total
    { wch: 14 }, // Lotes
    { wch: 22 }, // Fornecedor
    { wch: 30 }, // Descrição
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catálogo de Produtos');

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Catalogo_Produtos_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports products to CSV format and triggers download
 */
export function exportProductsToCSV(
  products: Product[],
  categories: ProductCategory[],
  stock: StockItem[],
  companyName: string = 'Empresa'
) {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const productStockMap = new Map<string, number>();
  stock.forEach((s) => {
    const current = productStockMap.get(s.productId) || 0;
    productStockMap.set(s.productId, current + s.quantity);
  });

  const headers = [
    'SKU',
    'Nome',
    'CodigoBarras',
    'Categoria',
    'PrecoPVP',
    'PrecoCusto',
    'TaxaIVA',
    'Unidade',
    'StockAtual',
    'StockMinimo',
    'StockMaximo',
    'ControloLotes',
    'Descricao',
  ];

  const rows = products.map((p) => {
    const totalQty = productStockMap.get(p.id) || 0;
    const catName = categoryMap.get(p.category) || p.category;
    return [
      `"${p.sku.replace(/"/g, '""')}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.barcode.replace(/"/g, '""')}"`,
      `"${catName.replace(/"/g, '""')}"`,
      p.price.toFixed(2),
      p.costPrice.toFixed(2),
      p.taxRate,
      `"${p.unit}"`,
      totalQty,
      p.minStock,
      p.maxStock,
      p.hasBatchControl ? '1' : '0',
      `"${(p.description || '').replace(/"/g, '""')}"`,
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `Catalogo_Produtos_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports products to JSON format and triggers download
 */
export function exportProductsToJSON(products: Product[], companyName: string = 'Empresa') {
  const dataStr = JSON.stringify(products, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `Catalogo_Produtos_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an Excel Template for importing products with instructions
 */
export function generateProductsTemplateExcel() {
  const sampleData = [
    {
      'Nome': 'Água Mineral das Pedras 250ml',
      'SKU': 'BEB-PED-001',
      'CodigoBarras': '5601234567890',
      'Categoria': 'Bebidas e Cafetaria',
      'PrecoPVP': 1.60,
      'PrecoCusto': 0.65,
      'TaxaIVA': 23,
      'Unidade': 'un',
      'StockInicial': 48,
      'StockMinimo': 12,
      'StockMaximo': 120,
      'ControloLotes': 'Sim',
      'Descricao': 'Garrafa de vidro 250ml com gás natural',
    },
    {
      'Nome': 'Croissant Francês Tradicional',
      'SKU': 'PAD-CRO-002',
      'CodigoBarras': '5609876543210',
      'Categoria': 'Padaria & Pastelaria',
      'PrecoPVP': 1.40,
      'PrecoCusto': 0.45,
      'TaxaIVA': 13,
      'Unidade': 'un',
      'StockInicial': 30,
      'StockMinimo': 10,
      'StockMaximo': 60,
      'ControloLotes': 'Não',
      'Descricao': 'Massa folhada com manteiga pura',
    },
    {
      'Nome': 'Café Espresso Arábica Premium 1kg',
      'SKU': 'MER-CAF-003',
      'CodigoBarras': '5601122334455',
      'Categoria': 'Mercearia Fina',
      'PrecoPVP': 24.90,
      'PrecoCusto': 12.00,
      'TaxaIVA': 23,
      'Unidade': 'kg',
      'StockInicial': 15,
      'StockMinimo': 5,
      'StockMaximo': 40,
      'ControloLotes': 'Sim',
      'Descricao': 'Grão torrado 100% arábica origem Colômbia',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 35 }, // Nome
    { wch: 16 }, // SKU
    { wch: 18 }, // Barcode
    { wch: 24 }, // Categoria
    { wch: 12 }, // PVP
    { wch: 12 }, // Custo
    { wch: 10 }, // TaxaIVA
    { wch: 8 },  // Unidade
    { wch: 14 }, // StockInicial
    { wch: 12 }, // Min
    { wch: 12 }, // Max
    { wch: 14 }, // Lotes
    { wch: 35 }, // Descricao
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo_Importacao');

  XLSX.writeFile(workbook, 'Modelo_Importacao_Artigos_POS_ERP.xlsx');
}

/**
 * Generates a CSV Template for importing products
 */
export function generateProductsTemplateCSV() {
  const headers = [
    'Nome',
    'SKU',
    'CodigoBarras',
    'Categoria',
    'PrecoPVP',
    'PrecoCusto',
    'TaxaIVA',
    'Unidade',
    'StockInicial',
    'StockMinimo',
    'StockMaximo',
    'ControloLotes',
    'Descricao',
  ];

  const sampleRows = [
    [
      '"Água Mineral das Pedras 250ml"',
      '"BEB-PED-001"',
      '"5601234567890"',
      '"Bebidas e Cafetaria"',
      '1.60',
      '0.65',
      '23',
      '"un"',
      '48',
      '12',
      '120',
      '"Sim"',
      '"Garrafa de vidro 250ml"',
    ].join(';'),
    [
      '"Croissant Francês Tradicional"',
      '"PAD-CRO-002"',
      '"5609876543210"',
      '"Padaria & Pastelaria"',
      '1.40',
      '0.45',
      '13',
      '"un"',
      '30',
      '10',
      '60',
      '"Não"',
      '"Massa folhada com manteiga"',
    ].join(';'),
  ];

  const csvContent = '\uFEFF' + [headers.join(';'), ...sampleRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'Modelo_Importacao_Artigos_POS_ERP.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
