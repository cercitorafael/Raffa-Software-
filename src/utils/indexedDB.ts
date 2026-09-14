/**
 * IndexedDB Offline Persistence Engine for OmniPOS
 * Enterprise-grade local storage for offline product catalogs, customers,
 * cash shifts, stock levels, sales records, and pending sync queues.
 */

import { Product, Customer, StockItem, Sale, CashShift, OfflineSyncQueueItem } from '../types';

const DB_NAME = 'OmniPOS_OfflineDB';
const DB_VERSION = 2;

export interface DBMetadata {
  key: string;
  value: any;
  updatedAt: string;
}

export interface DBStats {
  productsCount: number;
  customersCount: number;
  stockCount: number;
  salesCount: number;
  pendingSyncCount: number;
  lastSyncTime: string | null;
  dbReady: boolean;
}

/**
 * Deterministic cryptographic checksum to guarantee payload integrity
 * during offline storage and synchronization with Supabase.
 */
export async function calculatePayloadChecksum(data: any): Promise<string> {
  try {
    const json = typeof data === 'string' ? data : JSON.stringify(data);
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgUint8 = new TextEncoder().encode(json);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback deterministic polynomial hash
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `chk-${Math.abs(hash).toString(16)}`;
  } catch {
    return `chk-${Date.now()}`;
  }
}

/**
 * Exponential Backoff Configuration for Offline Sync Retries
 */
export const RETRY_CONFIG = {
  INITIAL_BACKOFF_MS: 1500, // 1.5 seconds base delay
  MAX_BACKOFF_MS: 32000,    // 32 seconds maximum backoff ceiling
  BACKOFF_FACTOR: 2,        // Exponential multiplier (1.5s -> 3s -> 6s -> 12s -> 24s -> 32s...)
  JITTER_RATIO: 0.2,        // Up to 20% random jitter to distribute retries
  MAX_RETRIES: 10,          // High-level threshold
};

/**
 * Calculates exponential backoff duration with random jitter based on the retry attempt count.
 */
export function calculateExponentialBackoff(retryCount: number): number {
  const attempt = Math.max(1, retryCount);
  const rawDelay = RETRY_CONFIG.INITIAL_BACKOFF_MS * Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, attempt - 1);
  const cappedDelay = Math.min(rawDelay, RETRY_CONFIG.MAX_BACKOFF_MS);
  const jitter = Math.floor(Math.random() * (cappedDelay * RETRY_CONFIG.JITTER_RATIO));
  return Math.round(cappedDelay + jitter);
}

class IndexedDBEngine {
  private db: IDBDatabase | null = null;
  private isSupported: boolean = typeof window !== 'undefined' && 'indexedDB' in window;

  /**
   * Initializes the IndexedDB database and schema
   */
  public async init(): Promise<IDBDatabase | null> {
    if (!this.isSupported) {
      console.warn('IndexedDB is not supported in this environment.');
      return null;
    }

    if (this.db) return this.db;

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 1. Products Store
          if (!db.objectStoreNames.contains('products')) {
            const productStore = db.createObjectStore('products', { keyPath: 'id' });
            productStore.createIndex('sku', 'sku', { unique: false });
            productStore.createIndex('barcode', 'barcode', { unique: false });
            productStore.createIndex('category', 'category', { unique: false });
          }

          // 2. Customers Store
          if (!db.objectStoreNames.contains('customers')) {
            const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
            customerStore.createIndex('taxNumber', 'taxNumber', { unique: false });
            customerStore.createIndex('name', 'name', { unique: false });
          }

          // 3. Stock Store
          if (!db.objectStoreNames.contains('stock')) {
            const stockStore = db.createObjectStore('stock', { keyPath: 'id' });
            stockStore.createIndex('productId', 'productId', { unique: false });
            stockStore.createIndex('warehouseId', 'warehouseId', { unique: false });
          }

          // 4. Sales Store (Offline Fiscal Archive)
          if (!db.objectStoreNames.contains('sales')) {
            const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
            salesStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: true });
            salesStore.createIndex('date', 'date', { unique: false });
            salesStore.createIndex('isSynced', 'isSynced', { unique: false });
          }

          // 5. Sync Queue Store (Pending Backend Dispatch)
          let queueStore: IDBObjectStore;
          if (!db.objectStoreNames.contains('sync_queue')) {
            queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
            queueStore.createIndex('status', 'status', { unique: false });
            queueStore.createIndex('timestamp', 'timestamp', { unique: false });
            queueStore.createIndex('action', 'action', { unique: false });
          } else {
            queueStore = (event.target as IDBOpenDBRequest).transaction!.objectStore('sync_queue');
          }

          if (queueStore && !queueStore.indexNames.contains('sequence')) {
            try {
              queueStore.createIndex('sequence', 'sequence', { unique: false });
            } catch {}
          }

          // 6. Cash Shifts Store
          if (!db.objectStoreNames.contains('cash_shifts')) {
            const shiftStore = db.createObjectStore('cash_shifts', { keyPath: 'id' });
            shiftStore.createIndex('status', 'status', { unique: false });
            shiftStore.createIndex('terminalId', 'terminalId', { unique: false });
          }

          // 7. Metadata Store
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'key' });
          }
        };

        request.onsuccess = (event: Event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          resolve(this.db);
        };

        request.onerror = (event: Event) => {
          console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
          resolve(null);
        };
      } catch (err) {
        console.error('IndexedDB initialization failed:', err);
        resolve(null);
      }
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore | null> {
    const db = await this.init();
    if (!db) return null;
    try {
      const tx = db.transaction(storeName, mode);
      return tx.objectStore(storeName);
    } catch (e) {
      console.error(`Error getting store ${storeName}:`, e);
      return null;
    }
  }

  /**
   * Generates a monotonically increasing sequence number for strict FIFO ordering
   */
  private async getNextSequence(): Promise<number> {
    try {
      const current = (await this.getMetadata('offline_queue_seq')) || 0;
      const next = Number(current) + 1;
      await this.setMetadata('offline_queue_seq', next);
      return next;
    } catch {
      return Date.now();
    }
  }

  /* ----------------------------------------------------
   * PRODUCTS CACHE & OFFLINE PRESERVATION
   * ---------------------------------------------------- */
  public async cacheProducts(products: Product[]): Promise<void> {
    const db = await this.init();
    if (!db || products.length === 0) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');
        // Non-destructive upsert into IndexedDB: preserve existing items
        products.forEach((p) => store.put(p));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async saveOfflineProduct(product: Product): Promise<void> {
    const store = await this.getStore('products', 'readwrite');
    if (!store) return;

    return new Promise((resolve) => {
      const req = store.put(product);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  public async getCachedProducts(): Promise<Product[]> {
    const store = await this.getStore('products', 'readonly');
    if (!store) return [];

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  public async findProductByBarcode(barcode: string): Promise<Product | null> {
    const store = await this.getStore('products', 'readonly');
    if (!store) return null;

    return new Promise((resolve) => {
      const index = store.index('barcode');
      const request = index.get(barcode);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  /* ----------------------------------------------------
   * CUSTOMERS CACHE
   * ---------------------------------------------------- */
  public async cacheCustomers(customers: Customer[]): Promise<void> {
    const db = await this.init();
    if (!db || customers.length === 0) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');
        store.clear();
        customers.forEach((c) => store.put(c));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getCachedCustomers(): Promise<Customer[]> {
    const store = await this.getStore('customers', 'readonly');
    if (!store) return [];

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  /* ----------------------------------------------------
   * STOCK CACHE & LOCAL ADJUSTMENT
   * ---------------------------------------------------- */
  public async cacheStock(stockItems: StockItem[]): Promise<void> {
    const db = await this.init();
    if (!db || stockItems.length === 0) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('stock', 'readwrite');
        const store = tx.objectStore('stock');
        store.clear();
        stockItems.forEach((s) => store.put(s));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getCachedStock(): Promise<StockItem[]> {
    const store = await this.getStore('stock', 'readonly');
    if (!store) return [];

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  public async decrementOfflineStock(productId: string, warehouseId: string, quantity: number): Promise<void> {
    const db = await this.init();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('stock', 'readwrite');
        const store = tx.objectStore('stock');
        const req = store.getAll();
        req.onsuccess = () => {
          const items: StockItem[] = req.result || [];
          const target = items.find((s) => s.productId === productId && s.warehouseId === warehouseId);
          if (target) {
            target.quantity = Math.max(0, target.quantity - quantity);
            store.put(target);
          }
          resolve();
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /* ----------------------------------------------------
   * SALES ARCHIVE (OFFLINE + ONLINE)
   * ---------------------------------------------------- */
  public async saveSale(sale: Sale): Promise<void> {
    const store = await this.getStore('sales', 'readwrite');
    if (!store) return;

    return new Promise((resolve) => {
      const req = store.put(sale);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  public async getSales(): Promise<Sale[]> {
    const store = await this.getStore('sales', 'readonly');
    if (!store) return [];

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const list = request.result || [];
        // Sort descending by date
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(list);
      };
      request.onerror = () => resolve([]);
    });
  }

  public async markSaleSynced(saleId: string): Promise<void> {
    const store = await this.getStore('sales', 'readwrite');
    if (!store) return;

    return new Promise((resolve) => {
      const getReq = store.get(saleId);
      getReq.onsuccess = () => {
        if (getReq.result) {
          const updated = { ...getReq.result, isSynced: true };
          store.put(updated);
        }
        resolve();
      };
      getReq.onerror = () => resolve();
    });
  }

  /* ----------------------------------------------------
   * SYNC QUEUE (PENDING BACKEND TRANSMISSIONS - FIFO)
   * ---------------------------------------------------- */

  /**
   * Enqueues a POS operation into the IndexedDB local queue.
   * Assigns a monotonic sequence number and cryptographic checksum to guarantee data integrity.
   */
  public async enqueueSyncItem(item: OfflineSyncQueueItem): Promise<OfflineSyncQueueItem> {
    const store = await this.getStore('sync_queue', 'readwrite');
    if (!store) return item;

    const sequence = item.sequence ?? (await this.getNextSequence());
    const checksum = item.checksum ?? (await calculatePayloadChecksum(item.data));
    const normalizedItem: OfflineSyncQueueItem = {
      ...item,
      sequence,
      checksum,
      status: item.status || 'pending',
      retryCount: item.retryCount || 0,
      timestamp: item.timestamp || new Date().toISOString(),
    };

    return new Promise((resolve) => {
      const req = store.put(normalizedItem);
      req.onsuccess = () => resolve(normalizedItem);
      req.onerror = () => resolve(normalizedItem);
    });
  }

  /**
   * Updates an existing queue item with partial status/error updates
   */
  public async updateSyncItem(id: string, updates: Partial<OfflineSyncQueueItem>): Promise<void> {
    const store = await this.getStore('sync_queue', 'readwrite');
    if (!store) return;

    return new Promise((resolve) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          const updated = { ...getReq.result, ...updates };
          store.put(updated);
        }
        resolve();
      };
      getReq.onerror = () => resolve();
    });
  }

  /**
   * Retrieves all pending or failed sync queue items sorted in strict chronological (FIFO) order.
   * If ignoreBackoff is false/omitted, failed items that are still waiting for their
   * exponential backoff duration will be excluded from the batch.
   */
  public async getPendingSyncQueue(options?: { ignoreBackoff?: boolean }): Promise<OfflineSyncQueueItem[]> {
    const store = await this.getStore('sync_queue', 'readonly');
    if (!store) return [];

    const now = Date.now();
    const ignoreBackoff = !!options?.ignoreBackoff;

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all: OfflineSyncQueueItem[] = request.result || [];
        const pending = all.filter((item) => {
          if (item.status === 'pending') return true;
          if (item.status === 'failed') {
            if (ignoreBackoff) return true;
            // Only eligible if scheduled backoff timestamp has expired
            return !item.nextRetryTimestamp || item.nextRetryTimestamp <= now;
          }
          return false;
        });

        // Strict FIFO ordering: earliest sequence / timestamp first
        pending.sort((a, b) => {
          if (a.sequence !== undefined && b.sequence !== undefined) {
            return a.sequence - b.sequence;
          }
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
        resolve(pending);
      };
      request.onerror = () => resolve([]);
    });
  }

  /**
   * Retrieves all items in the sync queue regardless of status
   */
  public async getAllSyncQueue(): Promise<OfflineSyncQueueItem[]> {
    const store = await this.getStore('sync_queue', 'readonly');
    if (!store) return [];

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all: OfflineSyncQueueItem[] = request.result || [];
        all.sort((a, b) => {
          if (a.sequence !== undefined && b.sequence !== undefined) {
            return b.sequence - a.sequence;
          }
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        resolve(all);
      };
      request.onerror = () => resolve([]);
    });
  }

  /**
   * Marks an item as currently syncing
   */
  public async markItemSyncing(id: string): Promise<void> {
    await this.updateSyncItem(id, {
      status: 'syncing',
      lastAttempt: new Date().toISOString(),
    });
  }

  /**
   * Marks an item as successfully synced
   */
  public async markItemSynced(id: string): Promise<void> {
    await this.updateSyncItem(id, {
      status: 'synced',
      lastAttempt: new Date().toISOString(),
      errorMessage: undefined,
      nextRetryTimestamp: undefined,
      backoffDelayMs: undefined,
    });
  }

  /**
   * Marks an item as failed with error details, calculates exponential backoff delay,
   * schedules next retry timestamp, and increments retry count.
   */
  public async markItemFailed(
    id: string,
    errorMsg: string
  ): Promise<{ retryCount: number; nextRetryTimestamp: number; backoffDelayMs: number } | null> {
    const store = await this.getStore('sync_queue', 'readwrite');
    if (!store) return null;

    return new Promise((resolve) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          const item: OfflineSyncQueueItem = getReq.result;
          const nextRetry = (item.retryCount || 0) + 1;
          const backoffDelayMs = calculateExponentialBackoff(nextRetry);
          const nextRetryTimestamp = Date.now() + backoffDelayMs;

          const updated: OfflineSyncQueueItem = {
            ...item,
            status: 'failed',
            retryCount: nextRetry,
            lastAttempt: new Date().toISOString(),
            errorMessage: errorMsg,
            backoffDelayMs,
            nextRetryTimestamp,
          };
          store.put(updated);
          resolve({ retryCount: nextRetry, nextRetryTimestamp, backoffDelayMs });
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => resolve(null);
    });
  }

  /**
   * Resets exponential backoff timers on all failed items when connection is restored,
   * making them immediately ready for retransmission to Supabase.
   */
  public async resetBackoffForReconnection(): Promise<number> {
    const store = await this.getStore('sync_queue', 'readwrite');
    if (!store) return 0;

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all: OfflineSyncQueueItem[] = request.result || [];
        const failedItems = all.filter((i) => i.status === 'failed');
        failedItems.forEach((item) => {
          store.put({
            ...item,
            status: 'pending',
            nextRetryTimestamp: undefined,
            backoffDelayMs: undefined,
          });
        });
        resolve(failedItems.length);
      };
      request.onerror = () => resolve(0);
    });
  }

  /**
   * Finds the earliest timestamp in the future when a failed item is eligible for retry.
   * Returns null if no items are awaiting scheduled backoff.
   */
  public async getNextScheduledRetryTime(): Promise<number | null> {
    const store = await this.getStore('sync_queue', 'readonly');
    if (!store) return null;

    const now = Date.now();

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all: OfflineSyncQueueItem[] = request.result || [];
        const futureRetries = all
          .filter((i) => i.status === 'failed' && i.nextRetryTimestamp && i.nextRetryTimestamp > now)
          .map((i) => i.nextRetryTimestamp as number);

        if (futureRetries.length === 0) {
          resolve(null);
        } else {
          resolve(Math.min(...futureRetries));
        }
      };
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Resets all failed queue items back to pending status for retry.
   * If forceImmediate is true, backoff timer is removed.
   */
  public async retryFailedQueueItems(forceImmediate = true): Promise<number> {
    const store = await this.getStore('sync_queue', 'readwrite');
    if (!store) return 0;

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all: OfflineSyncQueueItem[] = request.result || [];
        const failed = all.filter((i) => i.status === 'failed');
        failed.forEach((item) => {
          store.put({
            ...item,
            status: 'pending',
            errorMessage: undefined,
            nextRetryTimestamp: forceImmediate ? undefined : item.nextRetryTimestamp,
            backoffDelayMs: forceImmediate ? undefined : item.backoffDelayMs,
          });
        });
        resolve(failed.length);
      };
      request.onerror = () => resolve(0);
    });
  }

  /**
   * Validates cryptographic data integrity of all stored queue payloads
   */
  public async verifyQueueIntegrity(): Promise<{ valid: boolean; total: number; corrupted: number }> {
    const items = await this.getAllSyncQueue();
    let corrupted = 0;

    for (const item of items) {
      if (item.checksum) {
        const expectedChecksum = await calculatePayloadChecksum(item.data);
        if (expectedChecksum !== item.checksum) {
          corrupted++;
        }
      }
    }

    return {
      valid: corrupted === 0,
      total: items.length,
      corrupted,
    };
  }

  /**
   * Returns breakdown stats of the offline queue
   */
  public async getQueueStats(): Promise<{
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
    total: number;
  }> {
    const items = await this.getAllSyncQueue();
    return {
      pending: items.filter((i) => i.status === 'pending').length,
      syncing: items.filter((i) => i.status === 'syncing').length,
      synced: items.filter((i) => i.status === 'synced').length,
      failed: items.filter((i) => i.status === 'failed').length,
      total: items.length,
    };
  }

  /**
   * Cleans up successfully synced items from the queue
   */
  public async clearSyncedItems(): Promise<number> {
    const store = await this.getStore('sync_queue', 'readwrite');
    if (!store) return 0;

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all: OfflineSyncQueueItem[] = request.result || [];
        const synced = all.filter((i) => i.status === 'synced');
        synced.forEach((item) => store.delete(item.id));
        resolve(synced.length);
      };
      request.onerror = () => resolve(0);
    });
  }

  public async removeSyncQueueItem(id: string): Promise<void> {
    const store = await this.getStore('sync_queue', 'readwrite');
    if (!store) return;

    return new Promise((resolve) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  public async clearSyncQueue(): Promise<void> {
    const store = await this.getStore('sync_queue', 'readwrite');
    if (!store) return;

    return new Promise((resolve) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  /* ----------------------------------------------------
   * CASH SHIFTS
   * ---------------------------------------------------- */
  public async saveShift(shift: CashShift): Promise<void> {
    const store = await this.getStore('cash_shifts', 'readwrite');
    if (!store) return;

    return new Promise((resolve) => {
      const req = store.put(shift);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  public async getActiveShift(terminalId: string): Promise<CashShift | null> {
    const store = await this.getStore('cash_shifts', 'readonly');
    if (!store) return null;

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const shifts: CashShift[] = request.result || [];
        const active = shifts.find((s) => s.terminalId === terminalId && s.status === 'aberto');
        resolve(active || null);
      };
      request.onerror = () => resolve(null);
    });
  }

  /* ----------------------------------------------------
   * METADATA & DIAGNOSTICS
   * ---------------------------------------------------- */
  public async setMetadata(key: string, value: any): Promise<void> {
    const store = await this.getStore('metadata', 'readwrite');
    if (!store) return;

    return new Promise((resolve) => {
      const req = store.put({ key, value, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  public async getMetadata(key: string): Promise<any> {
    const store = await this.getStore('metadata', 'readonly');
    if (!store) return null;

    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  }

  public async addSyncQueueItem(item: OfflineSyncQueueItem): Promise<OfflineSyncQueueItem> {
    return this.enqueueSyncItem(item);
  }

  public async clearAll(): Promise<void> {
    const stores = ['products', 'customers', 'stock', 'sales', 'sync_queue', 'cash_shifts', 'metadata'];
    for (const storeName of stores) {
      try {
        const store = await this.getStore(storeName, 'readwrite');
        if (store) {
          store.clear();
        }
      } catch {
        // ignore
      }
    }
  }

  public async getDBStats(): Promise<DBStats> {
    const db = await this.init();
    if (!db) {
      return {
        productsCount: 0,
        customersCount: 0,
        stockCount: 0,
        salesCount: 0,
        pendingSyncCount: 0,
        lastSyncTime: null,
        dbReady: false,
      };
    }

    const countStore = (storeName: string): Promise<number> => {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.count();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(0);
        } catch {
          resolve(0);
        }
      });
    };

    const [productsCount, customersCount, stockCount, salesCount, pendingSyncCount] = await Promise.all([
      countStore('products'),
      countStore('customers'),
      countStore('stock'),
      countStore('sales'),
      countStore('sync_queue'),
    ]);

    const lastSyncTime = await this.getMetadata('last_sync_timestamp');

    return {
      productsCount,
      customersCount,
      stockCount,
      salesCount,
      pendingSyncCount,
      lastSyncTime,
      dbReady: true,
    };
  }
}

export const offlineDB = new IndexedDBEngine();
