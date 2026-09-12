// controllers/inventarioController.js
import supabase from '../config/supabaseClient.js';

export const obterExtratoInventarioArmazem = async (req, res) => {
    const { armazem_id, produto_id, data_limite } = req.query; 
    // Exemplo: armazem_id = 'wh-1', data_limite = '2026-09-01T23:59:59Z'

    if (!armazem_id || !data_limite) {
        return res.status(400).json({ error: "É necessário informar o armazem_id e a data_limite." });
    }

    const isSingleProduct = produto_id && produto_id !== 'all' && produto_id !== 'TODOS';

    try {
        // 1. Obter o Stock ATUAL do armazém específico
        let queryEstoque = supabase
            .from('estoque_atual')
            .select('produto_id, quantidade')
            .eq('loja_id', armazem_id);

        if (isSingleProduct) queryEstoque = queryEstoque.eq('produto_id', produto_id);

        let { data: estoqueAtual, error: errEstoque } = await queryEstoque;

        // Fallback resiliente caso a tabela no schema do Supabase seja 'stock'
        if (errEstoque) {
            let fallbackQuery = supabase
                .from('stock')
                .select('product_id, quantity')
                .eq('warehouse_id', armazem_id);
            if (isSingleProduct) fallbackQuery = fallbackQuery.eq('product_id', produto_id);
            const { data: fbData, error: fbErr } = await fallbackQuery;
            if (!fbErr && fbData) {
                estoqueAtual = fbData.map((s) => ({
                    produto_id: s.product_id,
                    quantidade: s.quantity,
                }));
                errEstoque = null;
            } else {
                estoqueAtual = [];
                errEstoque = null;
            }
        }

        // Mapa de stock atual por produto
        const stockAtualPorProduto = {};
        (estoqueAtual || []).forEach((item) => {
            const pId = item.produto_id;
            const q = Number(item.quantidade) || 0;
            stockAtualPorProduto[pId] = (stockAtualPorProduto[pId] || 0) + q;
        });

        const saldoAtualTotal = Object.values(stockAtualPorProduto).reduce((acc, q) => acc + q, 0);

        // 2. Buscar movimentações do Armazém ocorridas APÓS a data limite até hoje
        let queryMovApos = supabase
            .from('movimentos_estoque')
            .select('produto_id, quantidade, tipo_movimento')
            .eq('armazem_id', armazem_id)
            .gt('data_movimento', data_limite);

        if (isSingleProduct) queryMovApos = queryMovApos.eq('produto_id', produto_id);

        let { data: movsApos, error: errMovs } = await queryMovApos;

        // Fallback resiliente caso a tabela seja 'stock_movements'
        if (errMovs) {
            let fbMovQuery = supabase
                .from('stock_movements')
                .select('product_id, quantity, type')
                .eq('target_warehouse_id', armazem_id)
                .gt('timestamp', data_limite);
            if (isSingleProduct) fbMovQuery = fbMovQuery.eq('product_id', produto_id);
            const { data: fbMovData, error: fbMovErr } = await fbMovQuery;
            if (!fbMovErr && fbMovData) {
                movsApos = fbMovData.map((m) => ({
                    produto_id: m.product_id,
                    quantidade: m.quantity,
                    tipo_movimento: m.type,
                }));
                errMovs = null;
            } else {
                movsApos = [];
                errMovs = null;
            }
        }

        // Mapa de movimentações pós-data por produto
        const movsAposPorProduto = {};
        (movsApos || []).forEach((m) => {
            const pId = m.produto_id;
            const q = Number(m.quantidade) || 0;
            movsAposPorProduto[pId] = (movsAposPorProduto[pId] || 0) + q;
        });

        const totalMovimentadoAposData = Object.values(movsAposPorProduto).reduce((acc, q) => acc + q, 0);
        const stockCalculadoNaDataTotal = saldoAtualTotal - totalMovimentadoAposData;

        // Consolidar mapa de produtos calculados na data limite
        const todosProdutosIds = new Set([
            ...Object.keys(stockAtualPorProduto),
            ...Object.keys(movsAposPorProduto)
        ]);

        const itensPorProduto = {};
        todosProdutosIds.forEach((pId) => {
            const sAtual = stockAtualPorProduto[pId] || 0;
            const mApos = movsAposPorProduto[pId] || 0;
            itensPorProduto[pId] = {
                produto_id: pId,
                saldo_atual: sAtual,
                movimentacoes_apos_data: mApos,
                stock_na_data: sAtual - mApos,
            };
        });

        // 3. Buscar o Extrato/Kardex detalhado das movimentações ATÉ a data limite
        let queryExtrato = supabase
            .from('movimentos_estoque')
            .select('id, produto_id, tipo_movimento, quantidade, data_movimento, usuario_id, referencia_id')
            .eq('armazem_id', armazem_id)
            .lte('data_movimento', data_limite)
            .order('data_movimento', { ascending: true });

        if (isSingleProduct) queryExtrato = queryExtrato.eq('produto_id', produto_id);

        let { data: extratoHistorico, error: errExtrato } = await queryExtrato;

        // Fallback resiliente caso a tabela seja 'stock_movements'
        if (errExtrato) {
            let fbExtQuery = supabase
                .from('stock_movements')
                .select('id, product_id, type, quantity, timestamp, operator_id, reference_doc')
                .eq('target_warehouse_id', armazem_id)
                .lte('timestamp', data_limite)
                .order('timestamp', { ascending: true });
            if (isSingleProduct) fbExtQuery = fbExtQuery.eq('product_id', produto_id);
            const { data: fbExtData, error: fbExtErr } = await fbExtQuery;
            if (!fbExtErr && fbExtData) {
                extratoHistorico = fbExtData.map((m) => ({
                    id: m.id,
                    produto_id: m.product_id,
                    tipo_movimento: m.type,
                    quantidade: m.quantity,
                    data_movimento: m.timestamp,
                    usuario_id: m.operator_id,
                    referencia_id: m.reference_doc,
                }));
                errExtrato = null;
            } else {
                extratoHistorico = [];
                errExtrato = null;
            }
        }

        return res.json({
            armazem_id,
            produto_id: isSingleProduct ? produto_id : 'TODOS',
            data_consulta: data_limite,
            saldo_atual: saldoAtualTotal,
            movimentacoes_apos_data: totalMovimentadoAposData,
            stock_na_data: stockCalculadoNaDataTotal,
            extrato_movimentos: extratoHistorico || [],
            itens_por_produto: itensPorProduto,
        });

    } catch (err) {
        console.error("Erro no extrato por armazém:", err);
        return res.status(500).json({ error: "Falha ao calcular o extrato do armazém." });
    }
};

export default {
    obterExtratoInventarioArmazem
};
