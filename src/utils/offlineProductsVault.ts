import { Product, StockItem } from '../types';

export interface VaultProductEntry {
  product: Product;
  stockRecord?: StockItem;
  createdAt: string;
  synced: boolean;
  syncedAt?: string;
  origin: 'offline_creation' | 'recovered_from_events' | 'recovered_from_stock' | 'recovered_from_queue';
}

const VAULT_STORAGE_KEY = 'pos_erp_offline_products_vault';
const QUEUE_STORAGE_KEY = 'erp_pending_supabase_queue';
const EVENTS_STORAGE_KEY = 'pos_erp_enterprise_events';
const STOCK_STORAGE_KEY = 'pos_erp_enterprise_stock';
const PRODUCTS_STORAGE_KEY = 'pos_erp_enterprise_products';

/**
 * Gets all products safely stored in the persistent offline vault
 */
export function getOfflineVault(): Record<string, VaultProductEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Failed to read offline products vault:', err);
    return {};
  }
}

/**
 * Saves vault entries to localStorage
 */
export function saveOfflineVault(vault: Record<string, VaultProductEntry>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch (err) {
    console.error('Failed to write offline products vault:', err);
  }
}

/**
 * Records an offline-created product in the protected vault
 */
export function recordOfflineProduct(product: Product, stockRecord?: StockItem): void {
  if (!product || !product.id) return;
  const vault = getOfflineVault();
  vault[product.id] = {
    product: { ...product },
    stockRecord: stockRecord ? { ...stockRecord } : undefined,
    createdAt: vault[product.id]?.createdAt || new Date().toISOString(),
    synced: false,
    origin: 'offline_creation',
  };
  saveOfflineVault(vault);
}

/**
 * Updates an offline product in the vault
 */
export function updateOfflineProductInVault(product: Product): void {
  if (!product || !product.id) return;
  const vault = getOfflineVault();
  if (vault[product.id]) {
    vault[product.id].product = { ...vault[product.id].product, ...product };
    saveOfflineVault(vault);
  }
}

/**
 * Removes a deleted product from the vault
 */
export function removeOfflineProductFromVault(productId: string): void {
  if (!productId) return;
  const vault = getOfflineVault();
  if (vault[productId]) {
    delete vault[productId];
    saveOfflineVault(vault);
  }
}

/**
 * Marks an offline product as successfully confirmed on Supabase
 */
export function markOfflineProductSynced(productId: string): void {
  if (!productId) return;
  const vault = getOfflineVault();
  if (vault[productId]) {
    vault[productId].synced = true;
    vault[productId].syncedAt = new Date().toISOString();
    saveOfflineVault(vault);
  }
}

/**
 * Returns all products that are pending synchronization
 */
export function getPendingOfflineProducts(): Product[] {
  const vault = getOfflineVault();
  return Object.values(vault)
    .filter((entry) => !entry.synced)
    .map((entry) => entry.product);
}

/**
 * Self-healing recovery engine:
 * Scans all offline storage locations to restore any products registered offline
 * that disappeared or were missing from the active products list.
 */
export function recoverLostOfflineProducts(currentProducts: Product[]): {
  recoveredProducts: Product[];
  recoveredStock: StockItem[];
  reportMessage: string;
} {
  if (typeof window === 'undefined') {
    return { recoveredProducts: [], recoveredStock: [], reportMessage: '' };
  }

  const existingIds = new Set(currentProducts.map((p) => String(p.id)));
  const recoveredMap = new Map<string, Product>();
  const recoveredStockItems: StockItem[] = [];

  // 1. Recover from the dedicated Offline Vault
  const vault = getOfflineVault();
  Object.values(vault).forEach((entry) => {
    if (entry.product && entry.product.id && !existingIds.has(String(entry.product.id))) {
      recoveredMap.set(String(entry.product.id), entry.product);
      if (entry.stockRecord) {
        recoveredStockItems.push(entry.stockRecord);
      }
    }
  });

  // 2. Recover from erp_pending_supabase_queue (if any product was queued while offline)
  try {
    const rawQueue = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (rawQueue) {
      const queue = JSON.parse(rawQueue);
      if (Array.isArray(queue)) {
        queue.forEach((item: any) => {
          if (item && item.table === 'produtos' && item.record && item.record.id) {
            const prod = item.record as Product;
            if (!existingIds.has(String(prod.id)) && !recoveredMap.has(String(prod.id))) {
              recoveredMap.set(String(prod.id), prod);
              recordOfflineProduct(prod);
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('Recovery from pending queue failed:', err);
  }

  // 3. Recover from pos_erp_enterprise_events (events log contains stock.product.created events)
  try {
    const rawEvents = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (rawEvents) {
      const events = JSON.parse(rawEvents);
      if (Array.isArray(events)) {
        events.forEach((ev: any) => {
          if (ev && ev.type === 'stock.product.created' && ev.payload && ev.payload.productId) {
            const pid = String(ev.payload.productId);
            if (!existingIds.has(pid) && !recoveredMap.has(pid)) {
              // Reconstruct product from event metadata
              const reconstructedProduct: Product = {
                id: pid,
                companyId: ev.payload.companyId || 'comp-1',
                name: ev.payload.name || `Artigo Recuperado (${pid})`,
                sku: ev.payload.sku || `REC-${pid.slice(-6)}`,
                barcode: `560${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                price: Number(ev.payload.price) || 0,
                costPrice: Number(ev.payload.costPrice) || 0,
                taxRate: 16,
                category: 'Geral',
                unit: 'un',
                minStock: 10,
                maxStock: 100,
                hasBatchControl: false,
                description: 'Artigo recuperado automaticamente do histórico de eventos offline',
              };
              recoveredMap.set(pid, reconstructedProduct);
              recordOfflineProduct(reconstructedProduct);
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('Recovery from events failed:', err);
  }

  // 4. Recover from pos_erp_enterprise_stock (stock records orphaned without a product)
  try {
    const rawStock = localStorage.getItem(STOCK_STORAGE_KEY);
    if (rawStock) {
      const stockList = JSON.parse(rawStock);
      if (Array.isArray(stockList)) {
        stockList.forEach((stk: any) => {
          if (stk && stk.productId) {
            const pid = String(stk.productId);
            if (!existingIds.has(pid) && !recoveredMap.has(pid)) {
              const reconstructedProduct: Product = {
                id: pid,
                companyId: stk.companyId || 'comp-1',
                name: `Artigo em Stock (${pid})`,
                sku: `STK-${pid.slice(-6)}`,
                barcode: `560${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                price: Number(stk.avgCost) ? Number(stk.avgCost) * 1.3 : 10,
                costPrice: Number(stk.avgCost) || 5,
                taxRate: 16,
                category: 'Geral',
                unit: 'un',
                minStock: 5,
                maxStock: 50,
                hasBatchControl: false,
                description: 'Artigo recuperado automaticamente a partir de inventário local',
              };
              recoveredMap.set(pid, reconstructedProduct);
              recordOfflineProduct(reconstructedProduct, stk);
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('Recovery from stock failed:', err);
  }

  const recoveredProducts = Array.from(recoveredMap.values());

  // Also persist updated products list to localStorage if any were recovered
  if (recoveredProducts.length > 0) {
    try {
      const mergedAll = [...recoveredProducts, ...currentProducts];
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(mergedAll));
    } catch {}
  }

  const reportMessage =
    recoveredProducts.length > 0
      ? `🛡️ Foram recuperados ${recoveredProducts.length} artigos registados offline que estavam em falta no catálogo.`
      : '';

  return {
    recoveredProducts,
    recoveredStock: recoveredStockItems,
    reportMessage,
  };
}
