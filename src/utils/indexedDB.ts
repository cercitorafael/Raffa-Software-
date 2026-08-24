/**
 * IndexedDB Offline Persistence Engine for OmniPOS
 * Enterprise-grade local storage for offline product catalogs, customers,
 * cash shifts, stock levels, sales records, and pending sync queues.
 */

import { Product, Customer, StockItem, Sale, CashShift, OfflineSyncQueueItem } from '../types';

const DB_NAME = 'OmniPOS_OfflineDB';
const DB_VERSION = 1;

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

    return new Promise((resolve, reject) => {
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
          if (!db.objectStoreNames.contains('sync_queue')) {
            const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
            queueStore.createIndex('status', 'status', { unique: false });
            queueStore.createIndex('timestamp', 'timestamp', { unique: false });
            queueStore.createIndex('action', 'action', { unique: false });
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

  /* ----------------------------------------------------
   * PRODUCTS CACHE
   * ---------------------------------------------------- */
  public async cacheProducts(products: Product[]): Promise<void> {
    const db = await this.init();
    if (!db || products.length === 0) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');
        store.clear();
        products.forEach((p) => store.put(p));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
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
   * SYNC QUEUE (PENDING BACKEND TRANSMISSIONS)
   * ---------------------------------------------------- */
  public async enqueueSyncItem(item: OfflineSyncQueueItem): Promise<void> {
    const store = await this.getStore('sync_queue', 'readwrite');
    if (!store) return;

    return new Promise((resolve) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  public async getPendingSyncQueue(): Promise<OfflineSyncQueueItem[]> {
    const store = await this.getStore('sync_queue', 'readonly');
    if (!store) return [];

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
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

  public async addSyncQueueItem(item: OfflineSyncQueueItem): Promise<void> {
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
