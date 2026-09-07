import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';

/// Função em Dart para calcular e distribuir metas comerciais com Gemini AI.
/// Compatível com Flutter e aplicações backend/CLI em Dart.
Future<Map<String, dynamic>?> gerarMetas({
  String apiKey = 'SUA_CHAVE_API_AQUI',
  int anoReferencia = 2027,
  double metaAnualDesejada = 1200000,
  String estrategia = 'HISTORICO',
  List<num> historicoAnoAnterior = const [
    80000, 75000, 90000, 85000, 110000, 95000,
    100000, 105000, 90000, 115000, 120000, 135000
  ],
}) async {
  // Schema estruturado para retorno estrito em JSON
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
    model: 'gemini-2.5-flash',
    apiKey: apiKey,
    systemInstruction: Content.system(
      'Você é um motor de cálculo de metas comerciais para sistemas ERP/POS. '
      'Calcule as metas mensais com base na estratégia solicitada e retorne um JSON. '
      'Se a estratégia for "HISTORICO" e a empresa não possuir histórico (valores zerados ou vazios), '
      'todas as metas mensais e a meta anual devem ficar estritamente em zero (0).'
    ),
    generationConfig: GenerationConfig(
      responseMimeType: 'application/json',
      responseSchema: schema,
    ),
  );

  final prompt = '''
  Gere a estrutura de metas com os seguintes dados:
  - Meta Anual Desejada: $metaAnualDesejada
  - Estratégia: $estrategia
  - Histórico do Ano Anterior: $historicoAnoAnterior
  - Ano Referência: $anoReferencia
  ''';

  final response = await model.generateContent([Content.text(prompt)]);
  
  if (response.text != null) {
    Map<String, dynamic> metasJson = jsonDecode(response.text!);
    print(metasJson);
    return metasJson;
  }
  return null;
}
