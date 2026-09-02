import { ProductCategory } from '../types';

/**
 * Dicionário de correções ortográficas e normalizações de categorias em Português
 */
const KNOWN_CATEGORY_MAPPINGS: Record<string, string> = {
  // Slugs e IDs comuns
  'cat-bebidas': 'Bebidas & Refrigerantes',
  'cat_bebidas': 'Bebidas & Refrigerantes',
  'bebidas': 'Bebidas & Refrigerantes',
  'bebida': 'Bebidas & Refrigerantes',
  'refrigerantes': 'Bebidas & Refrigerantes',
  'bebidas e refrigerantes': 'Bebidas & Refrigerantes',
  'bebidas e cafetaria': 'Bebidas & Cafetaria',
  'cafetaria e pastelaria': 'Cafetaria & Pastelaria',

  'cat-alimentar': 'Alimentação & Mercearia',
  'cat_alimentar': 'Alimentação & Mercearia',
  'alimentar': 'Alimentação & Mercearia',
  'alimentacao': 'Alimentação & Mercearia',
  'alimentação': 'Alimentação & Mercearia',
  'mercearia': 'Alimentação & Mercearia',
  'mercearia geral': 'Mercearia Geral',
  'mercearia fina': 'Mercearia Fina',

  'cat-padaria': 'Padaria & Pastelaria',
  'cat_padaria': 'Padaria & Pastelaria',
  'padaria': 'Padaria & Pastelaria',
  'pastelaria': 'Padaria & Pastelaria',
  'padaria e pastelaria': 'Padaria & Pastelaria',
  'padaria e charcutaria': 'Padaria & Charcutaria',

  'cat-higiene': 'Higiene & Limpeza',
  'cat_higiene': 'Higiene & Limpeza',
  'higiene': 'Higiene & Limpeza',
  'limpeza': 'Higiene & Limpeza',
  'higiene e limpeza': 'Higiene & Limpeza',
  'higiene e bem-estar': 'Higiene & Bem-Estar',
  'higiene e bem estar': 'Higiene & Bem-Estar',

  'cat-frescos': 'Frescos & Laticínios',
  'cat_frescos': 'Frescos & Laticínios',
  'frescos': 'Frescos & Hortícolas',
  'horticolas': 'Frescos & Hortícolas',
  'hortícolas': 'Frescos & Hortícolas',
  'frescos e horticolas': 'Frescos & Hortícolas',
  'frescos e hortícolas': 'Frescos & Hortícolas',

  'lacticinios': 'Laticínios & Frios',
  'laticinios': 'Laticínios & Frios',
  'lacticínios': 'Laticínios & Frios',
  'lacticinios e frios': 'Laticínios & Frios',
  'laticinios e frios': 'Laticínios & Frios',

  'cat-tecnologia': 'Informática & Tecnologia',
  'cat_tecnologia': 'Informática & Tecnologia',
  'informatica': 'Informática & Tecnologia',
  'informática': 'Informática & Tecnologia',
  'tecnologia': 'Informática & Tecnologia',
  'electronicos': 'Eletrónicos & Informática',
  'eletronicos': 'Eletrónicos & Informática',
  'assistencia tecnica e ti': 'Assistência Técnica & TI',
  'assistência técnica e ti': 'Assistência Técnica & TI',

  'cat-servicos': 'Serviços & Atendimento',
  'cat_servicos': 'Serviços & Atendimento',
  'servicos': 'Serviços & Atendimento',
  'serviços': 'Serviços & Atendimento',
  'servicos e atendimento': 'Serviços & Atendimento',
  'serviços e atendimento': 'Serviços & Atendimento',
  'servicos de consultoria': 'Serviços de Consultoria',
  'serviços de consultoria': 'Serviços de Consultoria',

  'cat-vestuario': 'Vestuário & Moda',
  'cat_vestuario': 'Vestuário & Moda',
  'vestuario': 'Vestuário & Moda',
  'vestuário': 'Vestuário & Moda',
  'roupa': 'Vestuário & Moda',
  'roupas': 'Vestuário & Moda',
  'calcado': 'Calçado & Ténis',
  'calçado': 'Calçado & Ténis',
  'vestuario feminino': 'Vestuário Feminino',
  'vestuário feminino': 'Vestuário Feminino',
  'vestuario masculino': 'Vestuário Masculino',
  'vestuário masculino': 'Vestuário Masculino',
  'infantil e bebe': 'Infantil & Bebé',
  'infantil e bebê': 'Infantil & Bebé',

  'cat-ferragens': 'Ferragens & Ferramentas',
  'cat_ferragens': 'Ferragens & Ferramentas',
  'ferragens': 'Ferragens & Ferramentas',
  'ferramentas': 'Ferramentas & Maquinaria',
  'ferramentas e maquinaria': 'Ferramentas & Maquinaria',
  'cimentos e argamassas': 'Cimentos & Argamassas',
  'eletricidade e canalizacao': 'Eletricidade & Canalização',
  'eletricidade e canalização': 'Eletricidade & Canalização',
  'tintas e acabamentos': 'Tintas & Acabamentos',
  'parafusaria e fixacao': 'Parafusaria & Fixação',
  'parafusaria e fixação': 'Parafusaria & Fixação',

  'cat-farmacia': 'Farmácia & Medicamentos',
  'cat_farmacia': 'Farmácia & Medicamentos',
  'farmacia': 'Farmácia & Saúde',
  'farmácia': 'Farmácia & Saúde',
  'medicamentos': 'Medicamentos MNSRM',
  'primeiros socorros': 'Primeiros Socorros',
  'suplementos e vitaminas': 'Suplementos & Vitaminas',
  'dermocosmetica': 'Dermocosmética',

  'cat-auto': 'Oficina & Peças Auto',
  'pecas e componentes': 'Peças & Componentes',
  'peças e componentes': 'Peças & Componentes',
  'oleos e lubrificantes': 'Óleos & Lubrificantes',
  'óleos e lubrificantes': 'Óleos & Lubrificantes',
  'acessorios auto': 'Acessórios Auto',
  'acessórios auto': 'Acessórios Auto',
  'pneus e alinhamento': 'Pneus & Alinhamento',
  'mao-de-obra e servicos': 'Mão-de-Obra & Serviços',
  'mão-de-obra e serviços': 'Mão-de-Obra & Serviços',

  'cat-agro': 'Agropecuária & Insumos',
  'adubos e fertilizantes': 'Adubos & Fertilizantes',
  'sementes e mudas': 'Sementes & Mudas',
  'racoes e nutricao animal': 'Rações & Nutrição Animal',
  'rações e nutrição animal': 'Rações & Nutrição Animal',
  'veterinaria e vacinas': 'Veterinária & Vacinas',
  'veterinária e vacinas': 'Veterinária & Vacinas',

  'cat-diversos': 'Artigos Diversos',
  'cat_diversos': 'Artigos Diversos',
  'cat-geral': 'Artigos Gerais',
  'cat_geral': 'Artigos Gerais',
  'diversos': 'Artigos Diversos',
  'geral': 'Artigos Gerais',
  'outros': 'Artigos Diversos',
  'consumiveis e acessorios': 'Consumíveis & Acessórios',
  'consumíveis e acessórios': 'Consumíveis & Acessórios',
};

/**
 * Corrige e padroniza a grafia de um nome de categoria em Português
 */
export function standardizeCategoryName(rawName: string): string {
  if (!rawName) return 'Artigos Gerais';
  const clean = rawName.trim();
  if (!clean) return 'Artigos Gerais';

  const lower = clean.toLowerCase();

  // 1. Verificação direta no dicionário de mapeamentos conhecidos
  if (KNOWN_CATEGORY_MAPPINGS[lower]) {
    return KNOWN_CATEGORY_MAPPINGS[lower];
  }

  // 2. Remoção de prefixos técnicos tipo "cat-" ou "cat_"
  let processed = clean.replace(/^(cat[-_]|categoria[-_])/i, '').trim();

  // Substituição de "&amp;" ou " + " por " & "
  processed = processed.replace(/&amp;/gi, '&').replace(/\s*\+\s*/g, ' & ');

  // Se tiver conectores " e " entre duas palavras capitais, padronizar para " & "
  processed = processed.replace(/\s+e\s+/gi, ' & ');

  // 3. Regras de acentuação e correções ortográficas específicas
  const wordReplacements: Record<string, string> = {
    'agua': 'Água',
    'aguas': 'Águas',
    'alimentacao': 'Alimentação',
    'alimentar': 'Alimentação',
    'bebida': 'Bebida',
    'bebidas': 'Bebidas',
    'cafe': 'Café',
    'cafetaria': 'Cafetaria',
    'cha': 'Chá',
    'lacticinios': 'Laticínios',
    'laticinios': 'Laticínios',
    'frescos': 'Frescos',
    'horticolas': 'Hortícolas',
    'mercearia': 'Mercearia',
    'padaria': 'Padaria',
    'pastelaria': 'Pastelaria',
    'charcutaria': 'Charcutaria',
    'higiene': 'Higiene',
    'limpeza': 'Limpeza',
    'saude': 'Saúde',
    'farmacia': 'Farmácia',
    'remedio': 'Remédio',
    'remedios': 'Remédios',
    'medicamento': 'Medicamento',
    'medicamentos': 'Medicamentos',
    'dermocosmetica': 'Dermocosmética',
    'optica': 'Óptica',
    'tecnologia': 'Tecnologia',
    'informatica': 'Informática',
    'electronicos': 'Eletrónicos',
    'eletronicos': 'Eletrónicos',
    'eletrodomesticos': 'Eletrodomésticos',
    'pecas': 'Peças',
    'oleo': 'Óleo',
    'oleos': 'Óleos',
    'lubrificantes': 'Lubrificantes',
    'maquinaria': 'Maquinaria',
    'ferragens': 'Ferragens',
    'ferramentas': 'Ferramentas',
    'construcao': 'Construção',
    'eletricidade': 'Eletricidade',
    'canalizacao': 'Canalização',
    'tintas': 'Tintas',
    'acessorios': 'Acessórios',
    'calcado': 'Calçado',
    'tenis': 'Ténis',
    'vestuario': 'Vestuário',
    'bebe': 'Bebé',
    'servico': 'Serviço',
    'servicos': 'Serviços',
    'consultoria': 'Consultoria',
    'manutencao': 'Manutenção',
    'assistencia': 'Assistência',
    'tecnica': 'Técnica',
    'subscricao': 'Subscrição',
    'subscricoes': 'Subscrições',
    'licenca': 'Licença',
    'licencas': 'Licenças',
    'formacao': 'Formação',
    'workshops': 'Workshops',
    'adubo': 'Adubo',
    'adubos': 'Adubos',
    'fertilizantes': 'Fertilizantes',
    'racoes': 'Rações',
    'nutricao': 'Nutrição',
    'veterinaria': 'Veterinária',
    'diversos': 'Diversos',
    'geral': 'Geral',
    'gerais': 'Gerais',
    'artigo': 'Artigo',
    'artigos': 'Artigos',
  };

  // Capitalização Title Case inteligente
  const lowerWords = ['de', 'do', 'da', 'dos', 'das', 'em', 'por', 'com', 'para', 'a', 'o', 'as', 'os'];
  const tokens = processed.split(/\s+/);

  const formattedTokens = tokens.map((token, index) => {
    if (token === '&' || token === '/' || token === '-') return token;
    const cleanToken = token.toLowerCase();

    if (wordReplacements[cleanToken]) {
      return wordReplacements[cleanToken];
    }

    if (index > 0 && lowerWords.includes(cleanToken)) {
      return cleanToken;
    }

    // Capitaliza primeira letra
    return cleanToken.charAt(0).toUpperCase() + cleanToken.slice(1);
  });

  return formattedTokens.join(' ');
}

/**
 * Obtém o nome legível e formatado da categoria com fallback inteligente
 */
export function getCategoryDisplayName(
  categoryIdOrName: string | undefined | null,
  categories: ProductCategory[] = []
): string {
  if (!categoryIdOrName) return 'Artigos Gerais';

  // 1. Tentar encontrar por ID
  const foundById = categories.find((c) => String(c.id).toLowerCase() === String(categoryIdOrName).toLowerCase());
  if (foundById && foundById.name) {
    return standardizeCategoryName(foundById.name);
  }

  // 2. Tentar encontrar por Nome
  const foundByName = categories.find((c) => (c.name || '').toLowerCase() === String(categoryIdOrName).toLowerCase());
  if (foundByName && foundByName.name) {
    return standardizeCategoryName(foundByName.name);
  }

  // 3. Fallback: padronizar a string passada (evita imprimir "cat-bebidas" cru)
  return standardizeCategoryName(categoryIdOrName);
}

/**
 * Conjuntos de categorias recomendadas e pré-configuradas para adição rápida
 */
export const RECOMMENDED_PRESETS_BY_INDUSTRY = [
  {
    industry: 'Restauração & Bares',
    categories: [
      { name: 'Bebidas & Refrigerantes', color: 'emerald', icon: 'Coffee' },
      { name: 'Cafetaria & Pastelaria', color: 'amber', icon: 'Coffee' },
      { name: 'Entradas & Petiscos', color: 'blue', icon: 'ShoppingBag' },
      { name: 'Pratos Principais', color: 'gold', icon: 'Package' },
      { name: 'Sobremesas', color: 'rose', icon: 'Sparkles' },
    ],
  },
  {
    industry: 'Supermercado & Mercearia',
    categories: [
      { name: 'Alimentação & Mercearia', color: 'amber', icon: 'Apple' },
      { name: 'Bebidas & Garrafeira', color: 'emerald', icon: 'Coffee' },
      { name: 'Frescos & Hortícolas', color: 'teal', icon: 'Sprout' },
      { name: 'Laticínios & Frios', color: 'blue', icon: 'Package' },
      { name: 'Padaria & Charcutaria', color: 'orange', icon: 'ShoppingBag' },
      { name: 'Higiene & Limpeza', color: 'cyan', icon: 'Sparkles' },
    ],
  },
  {
    industry: 'Farmácia & Saúde',
    categories: [
      { name: 'Medicamentos MNSRM', color: 'rose', icon: 'HeartPulse' },
      { name: 'Primeiros Socorros', color: 'blue', icon: 'HeartPulse' },
      { name: 'Higiene & Bem-Estar', color: 'emerald', icon: 'Sparkles' },
      { name: 'Suplementos & Vitaminas', color: 'amber', icon: 'Package' },
      { name: 'Dermocosmética', color: 'violet', icon: 'Sparkles' },
    ],
  },
  {
    industry: 'Moda, Boutique & Calçado',
    categories: [
      { name: 'Vestuário Feminino', color: 'rose', icon: 'Shirt' },
      { name: 'Vestuário Masculino', color: 'blue', icon: 'Shirt' },
      { name: 'Calçado & Ténis', color: 'amber', icon: 'Tag' },
      { name: 'Acessórios & Malas', color: 'violet', icon: 'ShoppingBag' },
      { name: 'Infantil & Bebé', color: 'teal', icon: 'Sparkles' },
    ],
  },
  {
    industry: 'Ferragens & Construção',
    categories: [
      { name: 'Ferramentas & Maquinaria', color: 'amber', icon: 'Wrench' },
      { name: 'Cimentos & Argamassas', color: 'gold', icon: 'Boxes' },
      { name: 'Eletricidade & Canalização', color: 'emerald', icon: 'Wrench' },
      { name: 'Tintas & Acabamentos', color: 'blue', icon: 'Sparkles' },
      { name: 'Parafusaria & Fixação', color: 'violet', icon: 'Tag' },
    ],
  },
  {
    industry: 'Oficina & Auto',
    categories: [
      { name: 'Peças & Componentes', color: 'blue', icon: 'Wrench' },
      { name: 'Óleos & Lubrificantes', color: 'amber', icon: 'Package' },
      { name: 'Acessórios Auto', color: 'cyan', icon: 'Tag' },
      { name: 'Pneus & Alinhamento', color: 'emerald', icon: 'Boxes' },
      { name: 'Mão-de-Obra & Serviços', color: 'violet', icon: 'Layers' },
    ],
  },
  {
    industry: 'Serviços & Tecnologia',
    categories: [
      { name: 'Informática & Tecnologia', color: 'violet', icon: 'Laptop' },
      { name: 'Assistência Técnica & TI', color: 'emerald', icon: 'Wrench' },
      { name: 'Serviços de Consultoria', color: 'blue', icon: 'Layers' },
      { name: 'Licenças & Subscrições', color: 'amber', icon: 'Tag' },
      { name: 'Formação & Workshops', color: 'gold', icon: 'BookOpen' },
    ],
  },
  {
    industry: 'Comércio Geral & Outros',
    categories: [
      { name: 'Artigos Gerais', color: 'gold', icon: 'Package' },
      { name: 'Consumíveis & Acessórios', color: 'blue', icon: 'ShoppingBag' },
      { name: 'Artigos Diversos', color: 'teal', icon: 'Tag' },
      { name: 'Serviços & Atendimento', color: 'emerald', icon: 'Layers' },
    ],
  },
];
