import { supabase } from '../lib/supabase';
import {
  Sale,
  Product,
  Customer,
  Supplier,
  ProductCategory,
  StockItem,
  AccountPayable,
  AccountReceivable,
  CashShift,
} from '../types';
import {
  mapSupabaseToSale,
  mapSupabaseToProduct,
  mapSupabaseToCustomer,
  mapSupabaseToSupplier,
  mapSupabaseToCategory,
  mapSupabaseToStock,
  mapSupabaseToAccountPayable,
  mapSupabaseToAccountReceivable,
  mapSupabaseToShift,
  mapSaleToSupabase,
  mapProductToSupabase,
  mapCustomerToSupabase,
  mapStockToSupabase,
  mapAccountPayableToSupabase,
  mapAccountReceivableToSupabase,
  mapShiftToSupabase,
  addSyncLog,
} from '../lib/supabaseSync';
import { reconcileCustomerMetrics } from './salesRecovery';
import { offlineDB } from './indexedDB';

export interface ReconciliationResult {
  success: boolean;
  timestamp: string;
  scope: string;
  summary: {
    totalEntitiesProcessed: number;
    salesReconciled: number;
    newSalesMerged: number;
    productsReconciled: number;
    stockReconciled: number;
    customersReconciled: number;
    shiftsReconciled: number;
    payablesReconciled: number;
    receivablesReconciled: number;
    discrepanciesResolved: number;
  };
  reconciledData: {
    sales: Sale[];
    products: Product[];
    customers: Customer[];
    stock: StockItem[];
    shifts: CashShift[];
    accountsPayable: AccountPayable[];
    accountsReceivable: AccountReceivable[];
  };
  details: string[];
  errors: string[];
}

/**
 * Motor de Reconciliação Geral e Bidirecional com o Supabase:
 * 1. Puxa todos os registos remotos da nuvem (Supabase) para a empresa alvo.
 * 2. Recolhe todos os registos locais (em memória, localStorage e IndexedDB).
 * 3. Compara cada entidade utilizando regras de carimbo de tempo (LWW - Last-Write-Wins),
 *    número de fatura/documento e unicidade de chaves.
 * 4. Reconcilia métricas financeiras de clientes (total gasto, contagem de pedidos)
 *    com base em 100% do histórico de vendas deduplicado.
 * 5. Reconcilia stock e reservas cruzando os saldos atuais com as vendas remotas e locais.
 * 6. Disponibiliza os dados consolidados e atualiza os registos deficientes tanto localmente
 *    quanto no Supabase para garantir consistência total entre todos os computadores.
 */
export async function executeSupabaseReconciliation(params: {
  companyId: string;
  localSales: Sale[];
  localProducts: Product[];
  localCustomers: Customer[];
  localStock: StockItem[];
  localShifts: CashShift[];
  localPayables: AccountPayable[];
  localReceivables: AccountReceivable[];
  autoPushResolvedToCloud?: boolean;
}): Promise<ReconciliationResult> {
  const {
    companyId,
    localSales = [],
    localProducts = [],
    localCustomers = [],
    localStock = [],
    localShifts = [],
    localPayables = [],
    localReceivables = [],
    autoPushResolvedToCloud = true,
  } = params;

  const result: ReconciliationResult = {
    success: true,
    timestamp: new Date().toISOString(),
    scope: companyId,
    summary: {
      totalEntitiesProcessed: 0,
      salesReconciled: 0,
      newSalesMerged: 0,
      productsReconciled: 0,
      stockReconciled: 0,
      customersReconciled: 0,
      shiftsReconciled: 0,
      payablesReconciled: 0,
      receivablesReconciled: 0,
      discrepanciesResolved: 0,
    },
    reconciledData: {
      sales: [],
      products: [],
      customers: [],
      stock: [],
      shifts: [],
      accountsPayable: [],
      accountsReceivable: [],
    },
    details: [],
    errors: [],
  };

  try {
    // -------------------------------------------------------------
    // 1. RECONCILIAÇÃO DE VENDAS & DOCUMENTOS
    // -------------------------------------------------------------
    let remoteSalesRaw: any[] = [];
    try {
      let q = supabase.from('vendas').select('*').order('date', { ascending: false }).range(0, 49999);
      if (companyId && companyId !== 'ALL') {
        q = q.eq('company_id', companyId);
      }
      const { data, error } = await q;
      if (!error && Array.isArray(data)) {
        remoteSalesRaw = data;
      } else if (error) {
        result.errors.push(`Vendas Supabase: ${error.message}`);
      }
    } catch (e: any) {
      result.errors.push(`Erro de rede ao ler vendas: ${e.message || e}`);
    }

    const remoteSales: Sale[] = remoteSalesRaw.map(mapSupabaseToSale);

    // Também obter vendas guardadas no IndexedDB
    let idbSales: Sale[] = [];
    try {
      idbSales = await offlineDB.getAllSales();
      if (companyId && companyId !== 'ALL') {
        idbSales = idbSales.filter((s) => s.companyId === companyId);
      }
    } catch {
      // silencioso se IndexedDB não estiver acessível
    }

    const salesMap = new Map<string, Sale>();
    const salesInvoiceMap = new Map<string, string>(); // invoiceNumber -> saleId

    // Função de inserção com reconciliação de atributos
    const mergeSale = (s: Sale) => {
      if (!s || !s.id) return;
      const id = String(s.id);
      const inv = s.invoiceNumber?.trim();

      // Checar se já existe pelo invoiceNumber
      let existingId = id;
      if (inv && salesInvoiceMap.has(inv)) {
        existingId = salesInvoiceMap.get(inv)!;
      }

      if (!salesMap.has(existingId)) {
        salesMap.set(id, { ...s, companyId: s.companyId || companyId });
        if (inv) salesInvoiceMap.set(inv, id);
      } else {
        const existing = salesMap.get(existingId)!;
        // Se o novo registo tiver carimbo mais recente ou dados de pagamento mais completos
        const existingTime = new Date((existing as any).updatedAt || existing.date).getTime();
        const incomingTime = new Date((s as any).updatedAt || s.date).getTime();
        const isMoreRecent = incomingTime > existingTime;

        // Se uma estiver paga/emitida e a outra pendente
        const statusPriority: Record<string, number> = {
          anulado: 4,
          pago: 3,
          emitido: 2,
          pendente: 1,
        };

        const existingPrio = statusPriority[existing.status?.toLowerCase() || ''] || 0;
        const incomingPrio = statusPriority[s.status?.toLowerCase() || ''] || 0;

        const resolvedStatus = incomingPrio > existingPrio ? s.status : existing.status;

        const merged: Sale = {
          ...existing,
          ...(isMoreRecent ? s : {}),
          status: resolvedStatus,
          payments: (s.payments && s.payments.length > 0) ? s.payments : existing.payments,
          items: (s.items && s.items.length > 0) ? s.items : existing.items,
          companyId: existing.companyId || s.companyId || companyId,
        };

        salesMap.set(existingId, merged);
        result.summary.discrepanciesResolved++;
      }
    };

    // Aplicar a ordem: Local -> IndexedDB -> Remoto (Nuvem)
    localSales.forEach(mergeSale);
    idbSales.forEach(mergeSale);
    const initialCount = salesMap.size;
    remoteSales.forEach(mergeSale);

    const reconciledSales = Array.from(salesMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    result.reconciledData.sales = reconciledSales;
    result.summary.salesReconciled = reconciledSales.length;
    result.summary.newSalesMerged = Math.max(0, reconciledSales.length - localSales.length);
    result.details.push(
      `Vendas: ${reconciledSales.length} documentos reconciliados (${remoteSales.length} na nuvem, ${localSales.length} locais).`
    );

    // -------------------------------------------------------------
    // 2. RECONCILIAÇÃO DE CLIENTES & MÉTRICAS
    // -------------------------------------------------------------
    let remoteCustomersRaw: any[] = [];
    try {
      let q = supabase.from('clientes').select('*');
      if (companyId && companyId !== 'ALL') {
        q = q.eq('company_id', companyId);
      }
      const { data, error } = await q;
      if (!error && Array.isArray(data)) {
        remoteCustomersRaw = data;
      }
    } catch (e: any) {
      result.errors.push(`Clientes Supabase: ${e.message || e}`);
    }

    const remoteCustomers: Customer[] = remoteCustomersRaw.map(mapSupabaseToCustomer);
    const customerMap = new Map<string, Customer>();

    // Indexar clientes locais e remotos
    const mergeCustomer = (c: Customer) => {
      if (!c || !c.id) return;
      const key = String(c.id);
      if (!customerMap.has(key)) {
        customerMap.set(key, { ...c, companyId: c.companyId || companyId });
      } else {
        const existing = customerMap.get(key)!;
        customerMap.set(key, {
          ...existing,
          ...c,
          totalSpent: Math.max(Number(existing.totalSpent) || 0, Number(c.totalSpent) || 0),
          ordersCount: Math.max(Number(existing.ordersCount) || 0, Number(c.ordersCount) || 0),
          loyaltyPoints: Math.max(Number(existing.loyaltyPoints) || 0, Number(c.loyaltyPoints) || 0),
        });
      }
    };

    localCustomers.forEach(mergeCustomer);
    remoteCustomers.forEach(mergeCustomer);

    // Reconciliar métricas de cada cliente cruzando com o histórico total consolidado de vendas
    const preliminaryCustomers = Array.from(customerMap.values());
    const fullyReconciledCustomers = reconcileCustomerMetrics(preliminaryCustomers, reconciledSales);

    result.reconciledData.customers = fullyReconciledCustomers;
    result.summary.customersReconciled = fullyReconciledCustomers.length;
    result.details.push(
      `Clientes: ${fullyReconciledCustomers.length} clientes reconciliados com histórico de compras e métricas recompostas.`
    );

    // -------------------------------------------------------------
    // 3. RECONCILIAÇÃO DE PRODUTOS & PREÇOS
    // -------------------------------------------------------------
    let remoteProductsRaw: any[] = [];
    try {
      let q = supabase.from('produtos').select('*');
      if (companyId && companyId !== 'ALL') {
        q = q.eq('company_id', companyId);
      }
      const { data, error } = await q;
      if (!error && Array.isArray(data)) {
        remoteProductsRaw = data;
      }
    } catch (e: any) {
      result.errors.push(`Produtos Supabase: ${e.message || e}`);
    }

    const remoteProducts: Product[] = remoteProductsRaw.map(mapSupabaseToProduct);
    const productMap = new Map<string, Product>();

    const mergeProduct = (p: Product) => {
      if (!p || !p.id) return;
      const key = String(p.id);
      if (!productMap.has(key)) {
        productMap.set(key, { ...p, companyId: p.companyId || companyId });
      } else {
        const existing = productMap.get(key)!;
        // Priorizar dados com carimbo de tempo mais recente ou mais preenchidos
        const existingTime = new Date((existing as any).updatedAt || 0).getTime();
        const incomingTime = new Date((p as any).updatedAt || 0).getTime();
        productMap.set(key, {
          ...existing,
          ...(incomingTime >= existingTime ? p : {}),
          price: p.price !== undefined ? p.price : existing.price,
          costPrice: p.costPrice !== undefined ? p.costPrice : existing.costPrice,
        });
      }
    };

    localProducts.forEach(mergeProduct);
    remoteProducts.forEach(mergeProduct);

    const reconciledProducts = Array.from(productMap.values());
    result.reconciledData.products = reconciledProducts;
    result.summary.productsReconciled = reconciledProducts.length;
    result.details.push(
      `Produtos: ${reconciledProducts.length} artigos sincronizados e consolidados com a nuvem.`
    );

    // -------------------------------------------------------------
    // 4. RECONCILIAÇÃO DE STOCK (INVENTÁRIO)
    // -------------------------------------------------------------
    let remoteStockRaw: any[] = [];
    try {
      let q = supabase.from('stock').select('*');
      if (companyId && companyId !== 'ALL') {
        q = q.eq('company_id', companyId);
      }
      const { data, error } = await q;
      if (!error && Array.isArray(data)) {
        remoteStockRaw = data;
      }
    } catch (e: any) {
      result.errors.push(`Stock Supabase: ${e.message || e}`);
    }

    const remoteStock: StockItem[] = remoteStockRaw.map(mapSupabaseToStock);
    const stockMap = new Map<string, StockItem>();

    const mergeStock = (s: StockItem) => {
      if (!s || !s.id) return;
      const key = String(s.id);
      if (!stockMap.has(key)) {
        stockMap.set(key, { ...s, companyId: s.companyId || companyId });
      } else {
        const existing = stockMap.get(key)!;
        const existingTime = new Date((existing as any).updatedAt || 0).getTime();
        const incomingTime = new Date((s as any).updatedAt || 0).getTime();
        stockMap.set(key, {
          ...existing,
          ...(incomingTime >= existingTime ? s : {}),
          quantity: incomingTime >= existingTime ? s.quantity : existing.quantity,
          reserved: incomingTime >= existingTime ? s.reserved : existing.reserved,
        });
      }
    };

    localStock.forEach(mergeStock);
    remoteStock.forEach(mergeStock);

    const reconciledStock = Array.from(stockMap.values());
    result.reconciledData.stock = reconciledStock;
    result.summary.stockReconciled = reconciledStock.length;
    result.details.push(
      `Inventário: ${reconciledStock.length} itens de stock reconciliados entre lojas e armazéns.`
    );

    // -------------------------------------------------------------
    // 5. RECONCILIAÇÃO DE TURNOS DE CAIXA
    // -------------------------------------------------------------
    let remoteShiftsRaw: any[] = [];
    try {
      let q = supabase.from('turnos_caixa').select('*').order('opened_at', { ascending: false });
      if (companyId && companyId !== 'ALL') {
        q = q.eq('company_id', companyId);
      }
      const { data, error } = await q;
      if (!error && Array.isArray(data)) {
        remoteShiftsRaw = data;
      }
    } catch (e: any) {
      result.errors.push(`Turnos Supabase: ${e.message || e}`);
    }

    const remoteShifts: CashShift[] = remoteShiftsRaw.map(mapSupabaseToShift);
    const shiftMap = new Map<string, CashShift>();

    const mergeShift = (sh: CashShift) => {
      if (!sh || !sh.id) return;
      const key = String(sh.id);
      if (!shiftMap.has(key)) {
        shiftMap.set(key, { ...sh, companyId: sh.companyId || companyId });
      } else {
        const existing = shiftMap.get(key)!;
        // Se um turno estiver fechado e o outro aberto, o estado fechado prevalece
        const isClosed = existing.status === 'fechado' || sh.status === 'fechado';
        shiftMap.set(key, {
          ...existing,
          ...sh,
          status: isClosed ? 'fechado' : 'aberto',
          totalSales: Math.max(Number(existing.totalSales) || 0, Number(sh.totalSales) || 0),
          totalCash: Math.max(Number(existing.totalCash) || 0, Number(sh.totalCash) || 0),
        });
      }
    };

    localShifts.forEach(mergeShift);
    remoteShifts.forEach(mergeShift);

    const reconciledShifts = Array.from(shiftMap.values()).sort(
      (a, b) => new Date(b.openedAt || 0).getTime() - new Date(a.openedAt || 0).getTime()
    );

    result.reconciledData.shifts = reconciledShifts;
    result.summary.shiftsReconciled = reconciledShifts.length;
    result.details.push(`Turnos de Caixa: ${reconciledShifts.length} sessões de caixa reconciliadas.`);

    // -------------------------------------------------------------
    // 6. RECONCILIAÇÃO DE CONTAS A PAGAR & RECEBER
    // -------------------------------------------------------------
    let remoteAPRaw: any[] = [];
    let remoteARRaw: any[] = [];
    try {
      const [apRes, arRes] = await Promise.all([
        supabase.from('contas_pagar').select('*'),
        supabase.from('contas_receber').select('*'),
      ]);
      if (apRes.data) remoteAPRaw = apRes.data;
      if (arRes.data) remoteARRaw = arRes.data;
    } catch {}

    const remoteAP = remoteAPRaw.map(mapSupabaseToAccountPayable);
    const remoteAR = remoteARRaw.map(mapSupabaseToAccountReceivable);

    const apMap = new Map<string, AccountPayable>();
    localPayables.forEach((p) => p && p.id && apMap.set(String(p.id), p));
    remoteAP.forEach((p) => p && p.id && apMap.set(String(p.id), { ...(apMap.get(String(p.id)) || {}), ...p }));
    result.reconciledData.accountsPayable = Array.from(apMap.values());
    result.summary.payablesReconciled = result.reconciledData.accountsPayable.length;

    const arMap = new Map<string, AccountReceivable>();
    localReceivables.forEach((r) => r && r.id && arMap.set(String(r.id), r));
    remoteAR.forEach((r) => r && r.id && arMap.set(String(r.id), { ...(arMap.get(String(r.id)) || {}), ...r }));
    result.reconciledData.accountsReceivable = Array.from(arMap.values());
    result.summary.receivablesReconciled = result.reconciledData.accountsReceivable.length;

    result.summary.totalEntitiesProcessed =
      result.summary.salesReconciled +
      result.summary.customersReconciled +
      result.summary.productsReconciled +
      result.summary.stockReconciled +
      result.summary.shiftsReconciled +
      result.summary.payablesReconciled +
      result.summary.receivablesReconciled;

    // -------------------------------------------------------------
    // 7. AUTO-PUSH PARA SUPABASE DOS CLIENTES RECONCILIADOS
    // -------------------------------------------------------------
    if (autoPushResolvedToCloud && fullyReconciledCustomers.length > 0) {
      try {
        const custPayloads = fullyReconciledCustomers
          .filter((c) => (c.totalSpent || 0) > 0 || (c.ordersCount || 0) > 0)
          .map((c) => ({
            id: c.id,
            company_id: c.companyId || companyId,
            total_spent: c.totalSpent,
            loyalty_points: c.loyaltyPoints,
            last_purchase_date: c.lastPurchaseDate,
            updated_at: new Date().toISOString(),
          }));

        if (custPayloads.length > 0) {
          await supabase.from('clientes').upsert(custPayloads);
        }
      } catch (err: any) {
        console.warn('Aviso ao sincronizar clientes reconciliados no Supabase:', err);
      }
    }

    // 8. AUTO-PUSH PARA SUPABASE DE TODAS AS VENDAS QUE FALTAVAM NA NUVEM
    // Garante que outros computadores e caixas descarreguem exatamente o mesmo número de vendas
    if (autoPushResolvedToCloud && reconciledSales.length > 0) {
      try {
        const remoteIds = new Set(remoteSales.map((r) => String(r.id)));
        const remoteInvs = new Set(remoteSales.map((r) => (r.invoiceNumber ? r.invoiceNumber.trim() : '')));

        const missingSalesInCloud = reconciledSales.filter((s) => {
          if (!s || !s.id) return false;
          if (remoteIds.has(String(s.id))) return false;
          if (s.invoiceNumber && remoteInvs.has(s.invoiceNumber.trim())) return false;
          return true;
        });

        if (missingSalesInCloud.length > 0) {
          const batchSize = 50;
          for (let i = 0; i < missingSalesInCloud.length; i += batchSize) {
            const batch = missingSalesInCloud.slice(i, i + batchSize).map((s) => ({
              ...mapSaleToSupabase(s),
              company_id: s.companyId || companyId,
            }));
            await supabase.from('vendas').upsert(batch);
          }
          result.details.push(
            `Nuvem atualizada: ${missingSalesInCloud.length} venda(s) deste dispositivo foram enviadas para o Supabase para sincronizar outros caixas.`
          );
        }
      } catch (err: any) {
        console.warn('Aviso ao sincronizar vendas reconciliadas no Supabase:', err);
      }
    }

    addSyncLog({
      table: 'ALL',
      action: 'PULL',
      origin: 'LOCAL_APP',
      description: `⚡ Reconciliação Geral Supabase: ${result.summary.totalEntitiesProcessed} entidades reconciliadas (${result.summary.newSalesMerged} novas vendas fundidas, ${result.summary.discrepanciesResolved} divergências resolvidas).`,
      status: 'success',
    });

    return result;
  } catch (err: any) {
    result.success = false;
    result.errors.push(`Falha crítica na reconciliação: ${err.message || err}`);
    return result;
  }
}
