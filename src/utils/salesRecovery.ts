import { Sale, Customer } from '../types';
import { supabase } from '../lib/supabase';
import { mapSupabaseToSale, mapSaleToSupabase } from '../lib/supabaseSync';
import { offlineDB } from './indexedDB';

/**
 * Normalizes strings for resilient customer-to-sale matching.
 * Strips whitespace, accents, punctuation, and converts to lowercase.
 */
export function normalizeText(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Robustly matches a sale record to a customer entity using:
 * 1. Exact Customer ID match
 * 2. NIF / Tax Number match (excluding generic 999999990)
 * 3. Cleaned name exact match
 * 4. Substring containment (e.g. "AGRO-AVES" matches "AGRO-AVES, LDA")
 */
export function matchSaleToCustomer(sale: Sale | any, customer: Customer | any): boolean {
  if (!sale || !customer) return false;

  // 1. Direct ID match
  const saleCustId = sale.customerId || sale.customer_id;
  if (saleCustId && customer.id && String(saleCustId) === String(customer.id)) {
    return true;
  }

  // 2. Tax Number (NIF) match
  const sTax = (sale.customerTaxNumber || sale.customer_tax_number || sale.customerNif || '').trim();
  const cTax = (customer.taxNumber || customer.tax_number || '').trim();
  if (sTax && cTax && sTax !== '999999990' && cTax !== '999999990' && sTax === cTax) {
    return true;
  }

  // 3. Name comparisons
  const sName = normalizeText(sale.customerName || sale.customer_name);
  const cName = normalizeText(customer.name);

  if (!sName || !cName || sName === 'consumidorfinal' || cName === 'consumidorfinal') {
    return false;
  }

  if (sName === cName) {
    return true;
  }

  // Substring match for business extensions (LDA, E.I., SU, etc.)
  if (sName.length >= 4 && cName.length >= 4) {
    if (sName.includes(cName) || cName.includes(sName)) {
      return true;
    }
  }

  return false;
}

/**
 * Retrieves all sales belonging to a specific customer from a list of sales.
 */
export function getCustomerPurchases(customer: Customer, allSales: Sale[]): Sale[] {
  if (!customer || !Array.isArray(allSales)) return [];
  return allSales.filter((s) => matchSaleToCustomer(s, customer));
}

/**
 * Calculates the total monetary volume spent by a customer across all sales.
 */
export function getCustomerTotalVolume(customer: Customer, allSales: Sale[]): number {
  const purchases = getCustomerPurchases(customer, allSales);
  return purchases.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
}

/**
 * Recalculates and restores customer metrics (totalSpent, ordersCount, lastPurchaseDate)
 * based on all sales recorded from day 1 to today.
 */
export function reconcileCustomerMetrics(customers: Customer[], allSales: Sale[]): Customer[] {
  if (!Array.isArray(customers)) return [];
  const safeSales = Array.isArray(allSales) ? allSales : [];

  return customers.map((customer) => {
    const matchingSales = safeSales.filter((s) => matchSaleToCustomer(s, customer));
    const totalSpentFromSales = matchingSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const ordersCountFromSales = matchingSales.length;

    // Find most recent purchase date
    let lastPurchaseDate = customer.lastPurchaseDate;
    if (matchingSales.length > 0) {
      const sortedByDate = [...matchingSales].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      lastPurchaseDate = sortedByDate[0].date;
    }

    const effectiveTotalSpent = Math.max(Number(customer.totalSpent) || 0, totalSpentFromSales);
    const effectiveOrdersCount = Math.max(Number(customer.ordersCount) || 0, ordersCountFromSales);

    // Ensure loyalty points reflect at least 1 pt per 10 MT spent if not higher
    const calculatedPoints = Math.floor(effectiveTotalSpent / 10);
    const effectivePoints = Math.max(Number(customer.loyaltyPoints) || 0, calculatedPoints);

    return {
      ...customer,
      totalSpent: effectiveTotalSpent,
      ordersCount: effectiveOrdersCount,
      lastPurchaseDate,
      loyaltyPoints: effectivePoints,
    };
  });
}

/**
 * Fetches all sales without company restrictions from Supabase (from day 1 to today).
 */
export async function fetchAllHistoricalSalesFromSupabase(): Promise<Sale[]> {
  try {
    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .order('date', { ascending: false })
      .range(0, 49999);

    if (error) {
      console.warn('Erro ao carregar vendas históricas do Supabase:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];
    return data.map(mapSupabaseToSale);
  } catch (err) {
    console.error('Falha de rede ao consultar vendas do Supabase:', err);
    return [];
  }
}

/**
 * Master recovery function:
 * 1. Pulls all sales from Supabase
 * 2. Pulls all sales from IndexedDB offline storage
 * 3. Merges them with local in-memory/localStorage sales
 * 4. Reconciles and restores all customer purchasing records and totals
 */
export async function recoverAndReconcileAllSales(
  localSales: Sale[],
  localCustomers: Customer[],
  targetCompanyId?: string
): Promise<{
  allSales: Sale[];
  reconciledCustomers: Customer[];
  stats: {
    totalSalesCount: number;
    remoteSalesFound: number;
    offlineSalesFound: number;
    totalRevenue: number;
    customersRestoredCount: number;
    earliestSaleDate: string | null;
    latestSaleDate: string | null;
  };
}> {
  // 1. Fetch remote sales from Supabase
  const remoteSales = await fetchAllHistoricalSalesFromSupabase();

  // 2. Fetch offline sales from IndexedDB
  let offlineSales: Sale[] = [];
  try {
    offlineSales = await offlineDB.getAllSales();
  } catch (e) {
    console.warn('Não foi possível ler vendas do IndexedDB:', e);
  }

  // 3. Merge all sales deduplicating by ID and invoiceNumber
  const salesMap = new Map<string, Sale>();

  const registerSale = (s: Sale) => {
    if (!s || !s.id) return;
    const key = String(s.id);
    const invKey = s.invoiceNumber ? `INV-${s.invoiceNumber}` : null;

    if (!salesMap.has(key)) {
      // If sale has no companyId and a targetCompanyId is given, tag it
      const saleWithComp = {
        ...s,
        companyId: s.companyId || targetCompanyId || 'comp-1',
      };
      salesMap.set(key, saleWithComp);
      if (invKey) salesMap.set(invKey, saleWithComp);
    }
  };

  // Register existing local sales first
  (localSales || []).forEach(registerSale);
  // Register offline sales
  offlineSales.forEach(registerSale);
  // Register remote Supabase sales
  remoteSales.forEach(registerSale);

  // Extract unique sales (ignore invKey aliases)
  const uniqueSalesMap = new Map<string, Sale>();
  for (const [key, sale] of salesMap.entries()) {
    if (!key.startsWith('INV-')) {
      uniqueSalesMap.set(String(sale.id), sale);
    }
  }

  const allSales = Array.from(uniqueSalesMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // 4. Reconcile customer totals
  const reconciledCustomers = reconcileCustomerMetrics(localCustomers, allSales);

  // 5. AUTO-PUSH PARA O BANCO CENTRAL (SUPABASE) DE TODAS AS VENDAS QUE SÓ EXISTEM NESTE DISPOSITIVO
  // Garante paridade total entre todos os computadores, caixas e terminais
  try {
    const remoteIdSet = new Set(remoteSales.map((r) => String(r.id)));
    const remoteInvSet = new Set(remoteSales.map((r) => (r.invoiceNumber ? r.invoiceNumber.trim() : '')));

    const missingInCloud = allSales.filter((s) => {
      if (!s || !s.id) return false;
      if (remoteIdSet.has(String(s.id))) return false;
      if (s.invoiceNumber && remoteInvSet.has(s.invoiceNumber.trim())) return false;
      return true;
    });

    if (missingInCloud.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < missingInCloud.length; i += batchSize) {
        const batch = missingInCloud.slice(i, i + batchSize).map((s) => ({
          ...mapSaleToSupabase(s),
          company_id: s.companyId || targetCompanyId || 'comp-1',
        }));
        await supabase.from('vendas').upsert(batch);
      }

      // Marcar como sincronizadas no banco local do dispositivo
      const syncedAt = new Date().toISOString();
      for (const s of missingInCloud) {
        offlineDB.markSaleSynced(s.id, syncedAt, 'OK_GRAVEI').catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Aviso ao sincronizar vendas pendentes no Supabase:', err);
  }

  // 6. Update Supabase clientes table in the background for persisted accuracy
  try {
    for (const cust of reconciledCustomers) {
      if (cust.totalSpent > 0 || (cust.ordersCount || 0) > 0) {
        await supabase
          .from('clientes')
          .update({
            total_spent: cust.totalSpent,
            loyalty_points: cust.loyaltyPoints,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cust.id);
      }
    }
  } catch (e) {
    console.warn('Aviso ao sincronizar métricas de clientes no Supabase:', e);
  }

  // 7. Compute statistics
  const totalRevenue = allSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const earliestSaleDate = allSales.length > 0 ? allSales[allSales.length - 1].date : null;
  const latestSaleDate = allSales.length > 0 ? allSales[0].date : null;
  const customersRestoredCount = reconciledCustomers.filter(
    (c) => (c.totalSpent || 0) > 0 || (c.ordersCount || 0) > 0
  ).length;

  return {
    allSales,
    reconciledCustomers,
    stats: {
      totalSalesCount: allSales.length,
      remoteSalesFound: remoteSales.length,
      offlineSalesFound: offlineSales.length,
      totalRevenue,
      customersRestoredCount,
      earliestSaleDate,
      latestSaleDate,
    },
  };
}
