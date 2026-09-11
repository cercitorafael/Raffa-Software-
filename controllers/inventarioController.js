// controllers/inventarioController.js
import supabase from '../config/supabaseClient.js';

export const obterExtratoInventarioArmazem = async (req, res) => {
    const { armazem_id, produto_id, data_limite } = req.query; 
    // Exemplo: armazem_id = 'uuid-do-armazem-central', data_limite = '2026-09-01T23:59:59Z'

    if (!armazem_id || !data_limite) {
        return res.status(400).json({ error: "É necessário informar o armazem_id e a data_limite." });
    }

    try {
        // 1. Obter o Stock ATUAL do produto no Armazém específico
        let queryEstoque = supabase
            .from('estoque_atual')
            .select('quantidade')
            .eq('loja_id', armazem_id);

        if (produto_id) queryEstoque = queryEstoque.eq('produto_id', produto_id);

        let { data: estoqueAtual, error: errEstoque } = await queryEstoque;

        // Fallback resiliente caso a tabela no schema do Supabase seja 'stock'
        if (errEstoque) {
            let fallbackQuery = supabase
                .from('stock')
                .select('quantity')
                .eq('warehouse_id', armazem_id);
            if (produto_id) fallbackQuery = fallbackQuery.eq('product_id', produto_id);
            const { data: fbData, error: fbErr } = await fallbackQuery;
            if (!fbErr && fbData) {
                estoqueAtual = fbData.map((s) => ({ quantidade: s.quantity }));
                errEstoque = null;
            } else {
                // Se a tabela ainda não existe ou o armazém não tem registos, assume saldo 0
                estoqueAtual = [];
                errEstoque = null;
            }
        }

        const saldoAtual = estoqueAtual?.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0) || 0;

        // 2. Buscar movimentações do Armazém ocorridas APÓS a data limite até hoje
        let queryMovApos = supabase
            .from('movimentos_estoque')
            .select('quantidade')
            .eq('armazem_id', armazem_id)
            .gt('data_movimento', data_limite);

        if (produto_id) queryMovApos = queryMovApos.eq('produto_id', produto_id);

        let { data: movsApos, error: errMovs } = await queryMovApos;

        // Fallback resiliente caso a tabela seja 'stock_movements'
        if (errMovs) {
            let fbMovQuery = supabase
                .from('stock_movements')
                .select('quantity')
                .eq('target_warehouse_id', armazem_id)
                .gt('timestamp', data_limite);
            if (produto_id) fbMovQuery = fbMovQuery.eq('product_id', produto_id);
            const { data: fbMovData, error: fbMovErr } = await fbMovQuery;
            if (!fbMovErr && fbMovData) {
                movsApos = fbMovData.map((m) => ({ quantidade: m.quantity }));
                errMovs = null;
            } else {
                movsApos = [];
                errMovs = null;
            }
        }

        // Somar as movimentações pós-data para fazer o ajuste inverso
        const totalMovimentadoAposData = movsApos?.reduce((acc, m) => acc + (Number(m.quantidade) || 0), 0) || 0;

        // Stock na data limite = Stock Atual - (tudo o que movimentou depois)
        const stockCalculadoNaData = saldoAtual - totalMovimentadoAposData;

        // 3. Buscar o Extrato/Kardex detalhado das movimentações ATÉ a data limite
        let queryExtrato = supabase
            .from('movimentos_estoque')
            .select('id, tipo_movimento, quantidade, data_movimento, usuario_id, referencia_id')
            .eq('armazem_id', armazem_id)
            .lte('data_movimento', data_limite)
            .order('data_movimento', { ascending: true });

        if (produto_id) queryExtrato = queryExtrato.eq('produto_id', produto_id);

        let { data: extratoHistorico, error: errExtrato } = await queryExtrato;

        // Fallback resiliente caso a tabela seja 'stock_movements'
        if (errExtrato) {
            let fbExtQuery = supabase
                .from('stock_movements')
                .select('id, type, quantity, timestamp, operator_id, reference_doc')
                .eq('target_warehouse_id', armazem_id)
                .lte('timestamp', data_limite)
                .order('timestamp', { ascending: true });
            if (produto_id) fbExtQuery = fbExtQuery.eq('product_id', produto_id);
            const { data: fbExtData, error: fbExtErr } = await fbExtQuery;
            if (!fbExtErr && fbExtData) {
                extratoHistorico = fbExtData.map((m) => ({
                    id: m.id,
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
            produto_id: produto_id || 'TODOS',
            data_consulta: data_limite,
            saldo_atual: saldoAtual,
            movimentacoes_apos_data: totalMovimentadoAposData,
            stock_na_data: stockCalculadoNaData,
            extrato_movimentos: extratoHistorico || []
        });

    } catch (err) {
        console.error("Erro no extrato por armazém:", err);
        return res.status(500).json({ error: "Falha ao calcular o extrato do armazém." });
    }
};

export default {
    obterExtratoInventarioArmazem
};
