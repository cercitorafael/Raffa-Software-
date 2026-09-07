import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';

// ============================================================================
// 1. MODELOS DE DADOS TIPADOS (FLUTTER / DART)
// ============================================================================

class MetaMensalItem {
  final int mes;
  final String nomeMes;
  final double pesoPercentual;
  final double valorMeta;

  MetaMensalItem({
    required this.mes,
    required this.nomeMes,
    required this.pesoPercentual,
    required this.valorMeta,
  });

  factory MetaMensalItem.fromJson(Map<String, dynamic> json) {
    return MetaMensalItem(
      mes: json['mes'] is int ? json['mes'] : int.parse(json['mes'].toString()),
      nomeMes: json['nomeMes'] ?? '',
      pesoPercentual: (json['pesoPercentual'] as num?)?.toDouble() ?? 0.0,
      valorMeta: (json['valorMeta'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'mes': mes,
        'nomeMes': nomeMes,
        'pesoPercentual': pesoPercentual,
        'valorMeta': valorMeta,
      };
}

class MetaResponse {
  final int anoReferencia;
  final double metaAnualTotal;
  final List<MetaMensalItem> metasMensais;
  final String? estrategia;
  final String? source;

  MetaResponse({
    required this.anoReferencia,
    required this.metaAnualTotal,
    required this.metasMensais,
    this.estrategia,
    this.source,
  });

  factory MetaResponse.fromJson(Map<String, dynamic> json) {
    var rawList = json['metasMensais'] as List? ?? [];
    return MetaResponse(
      anoReferencia: json['anoReferencia'] is int
          ? json['anoReferencia']
          : (int.tryParse(json['anoReferencia']?.toString() ?? '2027') ?? 2027),
      metaAnualTotal: (json['metaAnualTotal'] as num?)?.toDouble() ?? 0.0,
      metasMensais: rawList
          .map((item) => MetaMensalItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      estrategia: json['estrategia']?.toString(),
      source: json['source']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'anoReferencia': anoReferencia,
        'metaAnualTotal': metaAnualTotal,
        'metasMensais': metasMensais.map((m) => m.toJson()).toList(),
        if (estrategia != null) 'estrategia': estrategia,
        if (source != null) 'source': source,
      };
}

// ============================================================================
// 2. FUNÇÃO CANÔNICA GEMINI (SCRIPT INDEPENDENTE COM GEMINI 3.6 FLASH)
// ============================================================================

Future<void> gerarMetas() async {
  final apiKey = 'SUA_CHAVE_API_AQUI';

  final schema = Schema.object(
    properties: {
      'anoReferencia': Schema.integer(),
      'metaAnualTotal': Schema.number(),
      'metasMensais': Schema.array(
        items: Schema.object(
          properties: {
            'mes': Schema.integer(),
            'nomeMes': Schema.string(),
            'pesoPercentual': Schema.number(),
            'valorMeta': Schema.number(),
          },
          requiredProperties: ['mes', 'nomeMes', 'pesoPercentual', 'valorMeta'],
        ),
      ),
    },
    requiredProperties: ['metaAnualTotal', 'metasMensais'],
  );

  final model = GenerativeModel(
    model: 'gemini-3.6-flash',
    apiKey: apiKey,
    systemInstruction: Content.system(
      'Você é um motor de cálculo de metas comerciais para sistemas ERP/POS. '
      'Calcule as metas mensais com base na estratégia solicitada e retorne um JSON.',
    ),
    generationConfig: GenerationConfig(
      responseMimeType: 'application/json',
      responseSchema: schema,
    ),
  );

  final prompt = '''
  Gere a estrutura de metas com os seguintes dados:
  - Meta Anual Desejada: 1200000
  - Estratégia: HISTORICO
  - Histórico do Ano Anterior: [80000, 75000, 90000, 85000, 110000, 95000, 100000, 105000, 90000, 115000, 120000, 135000]
  ''';

  final response = await model.generateContent([Content.text(prompt)]);

  if (response.text != null) {
    Map<String, dynamic> metasJson = jsonDecode(response.text!);
    print(metasJson);
  }
}

// ============================================================================
// 3. MOTOR COMPLETO PARAMETRIZADO COM REGRAS DE NEGÓCIO E FALLBACK LOCAL
// ============================================================================

const List<String> nomesDosMeses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/// Motor dinâmico com suporte a HISTORICO, LINEAR, CRESCIMENTO, MANUAL
/// e tratamento estrito da regra de histórico zerado.
Future<MetaResponse> gerarMetasComerciaisAvancado({
  required String apiKey,
  int anoReferencia = 2027,
  double metaAnualDesejada = 1200000,
  String estrategia = 'HISTORICO', // 'HISTORICO' | 'LINEAR' | 'CRESCIMENTO' | 'MANUAL'
  List<num> historicoAnoAnterior = const [
    80000, 75000, 90000, 85000, 110000, 95000,
    100000, 105000, 90000, 115000, 120000, 135000
  ],
  List<double>? valoresManuais,
  double? taxaCrescimentoPercentual,
}) async {
  final somaHistorico = historicoAnoAnterior.fold<num>(0, (acc, v) => acc + v);

  // Regra de Negócio Crítica: Se a estratégia for HISTORICO e a empresa não tiver histórico
  if (estrategia == 'HISTORICO' && somaHistorico == 0) {
    return MetaResponse(
      anoReferencia: anoReferencia,
      metaAnualTotal: 0.0,
      estrategia: estrategia,
      source: 'regra_historico_zero',
      metasMensais: List.generate(12, (index) {
        return MetaMensalItem(
          mes: index + 1,
          nomeMes: nomesDosMeses[index],
          pesoPercentual: 0.0,
          valorMeta: 0.0,
        );
      }),
    );
  }

  // Schema estruturado Gemini
  final schema = Schema.object(
    properties: {
      'anoReferencia': Schema.integer(),
      'metaAnualTotal': Schema.number(),
      'metasMensais': Schema.array(
        items: Schema.object(
          properties: {
            'mes': Schema.integer(),
            'nomeMes': Schema.string(),
            'pesoPercentual': Schema.number(),
            'valorMeta': Schema.number(),
          },
          requiredProperties: ['mes', 'nomeMes', 'pesoPercentual', 'valorMeta'],
        ),
      ),
    },
    requiredProperties: ['metaAnualTotal', 'metasMensais'],
  );

  final model = GenerativeModel(
    model: 'gemini-3.6-flash',
    apiKey: apiKey,
    systemInstruction: Content.system(
      'Você é um motor de cálculo de metas comerciais para sistemas ERP/POS. '
      'Calcule as metas mensais com base na estratégia solicitada e retorne um JSON. '
      'Se a estratégia for "HISTORICO" e o histórico estiver zerado, todas as metas devem ser 0.',
    ),
    generationConfig: GenerationConfig(
      responseMimeType: 'application/json',
      responseSchema: schema,
    ),
  );

  // Construção dinâmica do prompt conforme a estratégia comercial
  var promptBuffer = StringBuffer()
    ..writeln('Gere a estrutura de metas com os seguintes dados:')
    ..writeln('- Meta Anual Desejada: $metaAnualDesejada')
    ..writeln('- Estratégia: $estrategia')
    ..writeln('- Histórico do Ano Anterior: $historicoAnoAnterior')
    ..writeln('- Ano Referência: $anoReferencia');

  if (estrategia == 'MANUAL' && valoresManuais != null && valoresManuais.length == 12) {
    promptBuffer.writeln('- Valores Mensais Manuais: $valoresManuais');
    promptBuffer.writeln('Instrução: Adote os valores manuais definidos e some a meta anual.');
  } else if (estrategia == 'LINEAR') {
    promptBuffer.writeln('Instrução: Distribua a meta anual igualmente entre os 12 meses (8.33% cada).');
  } else if (estrategia == 'CRESCIMENTO' && taxaCrescimentoPercentual != null) {
    promptBuffer.writeln('- Taxa de Crescimento Pretendida: $taxaCrescimentoPercentual%');
    promptBuffer.writeln('Instrução: Aplique a taxa de crescimento sobre o histórico do ano anterior.');
  }

  try {
    final response = await model.generateContent([Content.text(promptBuffer.toString())]);
    if (response.text != null && response.text!.isNotEmpty) {
      final jsonMap = jsonDecode(response.text!) as Map<String, dynamic>;
      return MetaResponse.fromJson({
        ...jsonMap,
        'estrategia': estrategia,
        'source': 'gemini-3.6-flash',
      });
    }
  } catch (err) {
    print('Aviso: Erro ao chamar Gemini AI ($err). Utilizando motor matemático determinístico.');
  }

  // Fallback Determinístico Local (Sem dependência de rede)
  return calcularMetasLocalmente(
    anoReferencia: anoReferencia,
    metaAnualDesejada: metaAnualDesejada,
    estrategia: estrategia,
    historicoAnoAnterior: historicoAnoAnterior,
    valoresManuais: valoresManuais,
  );
}

/// Cálculo determinístico local 100% offline
MetaResponse calcularMetasLocalmente({
  required int anoReferencia,
  required double metaAnualDesejada,
  required String estrategia,
  required List<num> historicoAnoAnterior,
  List<double>? valoresManuais,
}) {
  final somaHist = historicoAnoAnterior.fold<num>(0, (a, b) => a + b);

  if (estrategia == 'MANUAL' && valoresManuais != null && valoresManuais.length == 12) {
    final total = valoresManuais.fold<double>(0.0, (a, b) => a + b);
    return MetaResponse(
      anoReferencia: anoReferencia,
      metaAnualTotal: total,
      estrategia: 'MANUAL',
      source: 'offline_local_math',
      metasMensais: List.generate(12, (i) {
        final val = valoresManuais[i];
        final peso = total > 0 ? (val / total) * 100 : 8.33;
        return MetaMensalItem(
          mes: i + 1,
          nomeMes: nomesDosMeses[i],
          pesoPercentual: double.parse(peso.toStringAsFixed(2)),
          valorMeta: val,
        );
      }),
    );
  }

  if (estrategia == 'LINEAR' || somaHist == 0) {
    final valMes = somaHist == 0 ? 0.0 : double.parse((metaAnualDesejada / 12).toStringAsFixed(2));
    final pesoMes = somaHist == 0 ? 0.0 : 8.33;
    return MetaResponse(
      anoReferencia: anoReferencia,
      metaAnualTotal: somaHist == 0 ? 0.0 : metaAnualDesejada,
      estrategia: estrategia,
      source: 'offline_local_math',
      metasMensais: List.generate(12, (i) {
        return MetaMensalItem(
          mes: i + 1,
          nomeMes: nomesDosMeses[i],
          pesoPercentual: pesoMes,
          valorMeta: valMes,
        );
      }),
    );
  }

  // Proporcional ao Histórico
  return MetaResponse(
    anoReferencia: anoReferencia,
    metaAnualTotal: metaAnualDesejada,
    estrategia: 'HISTORICO',
    source: 'offline_local_math',
    metasMensais: List.generate(12, (i) {
      final peso = ((historicoAnoAnterior[i] / somaHist) * 100);
      final valor = (metaAnualDesejada * (peso / 100));
      return MetaMensalItem(
        mes: i + 1,
        nomeMes: nomesDosMeses[i],
        pesoPercentual: double.parse(peso.toStringAsFixed(2)),
        valorMeta: double.parse(valor.toStringAsFixed(2)),
      );
    }),
  );
}
