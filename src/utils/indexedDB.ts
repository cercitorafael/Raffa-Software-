/**
 * IndexedDB Offline Persistence Engine for OmniPOS
 * Enterprise-grade local storage for offline product catalogs, customers,
 * cash shifts, stock levels, sales records, and pending sync queues.
 */

import { Product, Customer, StockItem, Sale, CashShift, OfflineSyncQueueItem } from '../types';

const DB_NAME = 'OmniPOS_OfflineDB';
export const DB_VERSION = 3;

export interface DBMetadata {
  key: string;
  value: any;
  updatedAt: string;
}

function setupStores(db: IDBDatabase) {
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
  private initPromise: Promise<IDBDatabase | null> | null = null;

  /**
   * Initializes the IndexedDB database and schema
   */
  public async init(): Promise<IDBDatabase | null> {
    if (!this.isSupported) {
      return null;
    }

    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise(async (resolve) => {
      const requiredStores = ['products', 'customers', 'stock', 'sales', 'sync_queue', 'cash_shifts', 'metadata'];

      const checkAllStores = (database: IDBDatabase): boolean => {
        return requiredStores.every((store) => database.objectStoreNames.contains(store));
      };

      const handleUpgrade = (existingDb: IDBDatabase): Promise<IDBDatabase | null> => {
        return new Promise((upgradeResolve) => {
          try {
            const nextVersion = (existingDb.version || 1) + 1;
            existingDb.close();

            const upgradeReq = indexedDB.open(DB_NAME, nextVersion);

            upgradeReq.onupgradeneeded = (ev: IDBVersionChangeEvent) => {
              const upgradedDb = (ev.target as IDBOpenDBRequest).result;
              setupStores(upgradedDb);
            };

            upgradeReq.onsuccess = (ev: Event) => {
              const upgradedDb = (ev.target as IDBOpenDBRequest).result;
              upgradedDb.onversionchange = () => {
                upgradedDb.close();
                this.db = null;
                this.initPromise = null;
              };
              upgradeResolve(upgradedDb);
            };

            upgradeReq.onerror = (ev: Event) => {
              ev.preventDefault();
              upgradeResolve(null);
            };

            upgradeReq.onblocked = (ev: Event) => {
              ev.preventDefault();
              upgradeResolve(null);
            };
          } catch {
            upgradeResolve(null);
          }
        });
      };

      try {
        // Open without version first: this never fails with "requested version is less than existing version"
        const request = indexedDB.open(DB_NAME);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          setupStores(db);
        };

        request.onsuccess = async (event: Event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Check if all needed stores exist in this version
          if (!checkAllStores(db)) {
            const upgradedDb = await handleUpgrade(db);
            this.db = upgradedDb;
            resolve(this.db);
            return;
          }

          db.onversionchange = () => {
            db.close();
            this.db = null;
            this.initPromise = null;
          };

          this.db = db;
          resolve(this.db);
        };

        request.onblocked = (event: Event) => {
          event.preventDefault();
          resolve(null);
        };

        request.onerror = (event: Event) => {
          event.preventDefault();
          // Fallback: in case the database is blocked or corrupted, try deleting and resetting cleanly
          try {
            const delReq = indexedDB.deleteDatabase(DB_NAME);
            delReq.onsuccess = () => {
              const freshReq = indexedDB.open(DB_NAME, 1);
              freshReq.onupgradeneeded = (e) => setupStores((e.target as IDBOpenDBRequest).result);
              freshReq.onsuccess = (e) => {
                this.db = (e.target as IDBOpenDBRequest).result;
                resolve(this.db);
              };
              freshReq.onerror = (e) => {
                e.preventDefault();
                this.initPromise = null;
                resolve(null);
              };
            };
            delReq.onerror = (e) => {
              e.preventDefault();
              this.initPromise = null;
              resolve(null);
            };
          } catch {
            this.initPromise = null;
            resolve(null);
          }
        };
      } catch {
        this.initPromise = null;
        resolve(null);
      }
    });

    return this.initPromise;
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

  public async getAllSales(): Promise<Sale[]> {
    return this.getSales();
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

  public async updateSyncQueueItem(item: OfflineSyncQueueItem): Promise<void> {
    return this.enqueueSyncItem(item);
  }

  public async getSyncQueueItem(id: string): Promise<OfflineSyncQueueItem | null> {
    const store = await this.getStore('sync_queue', 'readonly');
    if (!store) return null;

    return new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  public async updateSyncItemRetry(
    id: string,
    retryCount: number,
    nextRetryTime: number,
    lastError?: string
  ): Promise<void> {
    const item = await this.getSyncQueueItem(id);
    if (!item) return;

    item.retryCount = retryCount;
    item.lastAttempt = Date.now();
    item.nextRetryTime = nextRetryTime;
    item.status = 'failed';
    if (lastError) item.lastError = lastError;

    await this.enqueueSyncItem(item);
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

  public async purgeCompanyData(companyId: string): Promise<void> {
    const cleanId = String(companyId || '').trim().toLowerCase();
    if (!cleanId) return;

    const filterStores = ['products', 'customers', 'stock', 'sales', 'sync_queue', 'cash_shifts'];
    for (const storeName of filterStores) {
      try {
        const store = await this.getStore(storeName, 'readwrite');
        if (!store) continue;

        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => {
          const items = getAllReq.result || [];
          for (const item of items) {
            const itemCompId = String(
              item.companyId ||
              item.company_id ||
              item.record?.companyId ||
              item.record?.company_id ||
              ''
            ).trim().toLowerCase();

            if (itemCompId === cleanId || item.id === cleanId) {
              const key = item.id || item.barcode;
              if (key) {
                store.delete(key);
              }
            }
          }
        };
      } catch (err) {
        console.warn(`Erro ao purgar dados da empresa ${companyId} na store ${storeName}:`, err);
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
