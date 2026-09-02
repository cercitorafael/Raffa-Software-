// Presets de Ramos de Atividade para Venda Multi-Empresa & Multi-Tenant
export interface IndustryPreset {
  id: string;
  name: string;
  badge: string;
  iconName: string;
  description: string;
  defaultCategories: { name: string; icon: string; color: string }[];
  sampleProducts: {
    name: string;
    category: string;
    price: number;
    costPrice: number;
    taxRate: number;
    unit: string;
  }[];
}

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    id: 'restauracao',
    name: 'Restauração & Bares',
    badge: 'Restauração',
    iconName: 'Utensils',
    description: 'Restaurantes, cafés, pastelarias, bares, pubs, lanchonetes e fast-food.',
    defaultCategories: [
      { name: 'Bebidas & Refrigerantes', icon: 'Wine', color: '#10b981' },
      { name: 'Cafetaria & Pastelaria', icon: 'Coffee', color: '#f59e0b' },
      { name: 'Entradas & Petiscos', icon: 'Cookie', color: '#3b82f6' },
      { name: 'Pratos Principais', icon: 'Utensils', color: '#c5a47e' },
      { name: 'Sobremesas', icon: 'Cake', color: '#ec4899' },
    ],
    sampleProducts: [
      { name: 'Água Mineral 500ml', category: 'Bebidas & Refrigerantes', price: 50, costPrice: 20, taxRate: 16, unit: 'un' },
      { name: 'Bife à Casa c/ Batata', category: 'Pratos Principais', price: 650, costPrice: 320, taxRate: 16, unit: 'dose' },
      { name: 'Café Expresso', category: 'Cafetaria & Pastelaria', price: 40, costPrice: 10, taxRate: 16, unit: 'chav' },
      { name: 'Frango Grelhado Inteiro', category: 'Pratos Principais', price: 580, costPrice: 280, taxRate: 16, unit: 'dose' },
      { name: 'Refrigerante Lata 330ml', category: 'Bebidas & Refrigerantes', price: 70, costPrice: 35, taxRate: 16, unit: 'un' },
    ],
  },
  {
    id: 'supermercado',
    name: 'Supermercado & Alimentar',
    badge: 'Supermercado',
    iconName: 'ShoppingCart',
    description: 'Supermercados, minimercados, mercearias, padarias e conveniência.',
    defaultCategories: [
      { name: 'Bebidas & Garrafeira', icon: 'Wine', color: '#ef4444' },
      { name: 'Frescos & Hortícolas', icon: 'Apple', color: '#10b981' },
      { name: 'Higiene & Limpeza', icon: 'Sparkles', color: '#06b6d4' },
      { name: 'Laticínios & Frios', icon: 'Milk', color: '#3b82f6' },
      { name: 'Mercearia Geral', icon: 'ShoppingBag', color: '#8b5cf6' },
      { name: 'Padaria & Charcutaria', icon: 'Wheat', color: '#f59e0b' },
    ],
    sampleProducts: [
      { name: 'Açúcar Castanho 1kg', category: 'Mercearia Geral', price: 85, costPrice: 60, taxRate: 16, unit: 'kg' },
      { name: 'Arroz Agulha 5kg', category: 'Mercearia Geral', price: 390, costPrice: 280, taxRate: 16, unit: 'pct' },
      { name: 'Leite UHT 1L', category: 'Laticínios & Frios', price: 110, costPrice: 80, taxRate: 16, unit: 'un' },
      { name: 'Óleo Vegetal 1L', category: 'Mercearia Geral', price: 145, costPrice: 105, taxRate: 16, unit: 'garrafa' },
    ],
  },
  {
    id: 'farmacia',
    name: 'Farmácia & Saúde',
    badge: 'Farmácia',
    iconName: 'Pill',
    description: 'Farmácias, parafarmácias, ervanárias e produtos de saúde e bem-estar.',
    defaultCategories: [
      { name: 'Dermocosmética', icon: 'Sparkles', color: '#ec4899' },
      { name: 'Higiene & Bem-Estar', icon: 'HeartPulse', color: '#10b981' },
      { name: 'Medicamentos MNSRM', icon: 'Pill', color: '#ef4444' },
      { name: 'Primeiros Socorros', icon: 'Activity', color: '#3b82f6' },
      { name: 'Suplementos & Vitaminas', icon: 'ShieldPlus', color: '#f59e0b' },
    ],
    sampleProducts: [
      { name: 'Álcool Gel 500ml', category: 'Primeiros Socorros', price: 180, costPrice: 90, taxRate: 16, unit: 'frasco' },
      { name: 'Paracetamol 500mg (20 comp)', category: 'Medicamentos MNSRM', price: 120, costPrice: 60, taxRate: 0, unit: 'cx' },
      { name: 'Vitamina C Efervescente', category: 'Suplementos & Vitaminas', price: 350, costPrice: 200, taxRate: 16, unit: 'tubo' },
    ],
  },
  {
    id: 'oficina',
    name: 'Oficina & Peças Auto',
    badge: 'Auto & Mecânica',
    iconName: 'Wrench',
    description: 'Oficinas auto, moto-peças, bate-chapa, pneus e serviços mecânicos.',
    defaultCategories: [
      { name: 'Acessórios Auto', icon: 'Shield', color: '#06b6d4' },
      { name: 'Mão-de-Obra & Serviços', icon: 'Wrench', color: '#8b5cf6' },
      { name: 'Óleos & Lubrificantes', icon: 'Droplet', color: '#f59e0b' },
      { name: 'Peças & Componentes', icon: 'Cog', color: '#3b82f6' },
      { name: 'Pneus & Alinhamento', icon: 'Disc', color: '#10b981' },
    ],
    sampleProducts: [
      { name: 'Filtro de Óleo Universal', category: 'Peças & Componentes', price: 450, costPrice: 220, taxRate: 16, unit: 'un' },
      { name: 'Óleo Motor 10W40 4L', category: 'Óleos & Lubrificantes', price: 2400, costPrice: 1600, taxRate: 16, unit: 'emb' },
      { name: 'Serviço Mudança de Óleo', category: 'Mão-de-Obra & Serviços', price: 800, costPrice: 100, taxRate: 16, unit: 'serv' },
    ],
  },
  {
    id: 'boutique',
    name: 'Boutique & Vestuário',
    badge: 'Moda & Calçado',
    iconName: 'Shirt',
    description: 'Lojas de roupa, sapatarias, acessórios, boutiques e vestuário infantil.',
    defaultCategories: [
      { name: 'Acessórios & Malas', icon: 'ShoppingBag', color: '#8b5cf6' },
      { name: 'Calçado & Ténis', icon: 'Footprints', color: '#f59e0b' },
      { name: 'Infantil & Bebé', icon: 'Heart', color: '#10b981' },
      { name: 'Vestuário Feminino', icon: 'Sparkles', color: '#ec4899' },
      { name: 'Vestuário Masculino', icon: 'Shirt', color: '#3b82f6' },
    ],
    sampleProducts: [
      { name: 'Camisa Formal Algodão', category: 'Vestuário Masculino', price: 1800, costPrice: 900, taxRate: 16, unit: 'un' },
      { name: 'Ténis Desportivo Comfort', category: 'Calçado & Ténis', price: 3500, costPrice: 1900, taxRate: 16, unit: 'par' },
      { name: 'Vestido Casual Estampado', category: 'Vestuário Feminino', price: 2200, costPrice: 1100, taxRate: 16, unit: 'un' },
    ],
  },
  {
    id: 'ferragens',
    name: 'Ferragens & Construção',
    badge: 'Construção & Brico',
    iconName: 'Hammer',
    description: 'Lojas de ferragens, materiais de construção, tintas, eletricidade e brico.',
    defaultCategories: [
      { name: 'Cimentos & Argamassas', icon: 'Box', color: '#6b7280' },
      { name: 'Eletricidade & Canalização', icon: 'Zap', color: '#10b981' },
      { name: 'Ferramentas & Maquinaria', icon: 'Hammer', color: '#f59e0b' },
      { name: 'Parafusaria & Fixação', icon: 'Cog', color: '#8b5cf6' },
      { name: 'Tintas & Acabamentos', icon: 'Paintbrush', color: '#3b82f6' },
    ],
    sampleProducts: [
      { name: 'Berbequim de Percussão 650W', category: 'Ferramentas & Maquinaria', price: 4200, costPrice: 2800, taxRate: 16, unit: 'un' },
      { name: 'Cimento Portland 50kg', category: 'Cimentos & Argamassas', price: 490, costPrice: 390, taxRate: 16, unit: 'saco' },
      { name: 'Tinta Plástica Branca 15L', category: 'Tintas & Acabamentos', price: 3800, costPrice: 2400, taxRate: 16, unit: 'balde' },
    ],
  },
  {
    id: 'agro',
    name: 'Agropecuária & Campo',
    badge: 'Agropecuária',
    iconName: 'Sprout',
    description: 'Insumos agrícolas, sementes, rações, fertilizantes e pecuária.',
    defaultCategories: [
      { name: 'Adubos & Fertilizantes', icon: 'Layers', color: '#8b5cf6' },
      { name: 'Equipamentos & Rega', icon: 'Wrench', color: '#3b82f6' },
      { name: 'Rações & Nutrição Animal', icon: 'Wheat', color: '#f59e0b' },
      { name: 'Sementes & Mudas', icon: 'Sprout', color: '#10b981' },
      { name: 'Veterinária & Vacinas', icon: 'ShieldPlus', color: '#ef4444' },
    ],
    sampleProducts: [
      { name: 'Adubo NPK 12-24-12 (50kg)', category: 'Adubos & Fertilizantes', price: 3100, costPrice: 2500, taxRate: 16, unit: 'saco' },
      { name: 'Ração Frango Inicial 50kg', category: 'Rações & Nutrição Animal', price: 2450, costPrice: 1900, taxRate: 16, unit: 'saco' },
      { name: 'Semente de Milho Híbrido 2kg', category: 'Sementes & Mudas', price: 850, costPrice: 550, taxRate: 16, unit: 'saco' },
    ],
  },
  {
    id: 'servicos',
    name: 'Prestação de Serviços',
    badge: 'Serviços & TI',
    iconName: 'Briefcase',
    description: 'Empresas de consultoria, informática, contabilidade e assistência técnica.',
    defaultCategories: [
      { name: 'Assistência Técnica & TI', icon: 'Laptop', color: '#10b981' },
      { name: 'Formação & Workshops', icon: 'GraduationCap', color: '#f59e0b' },
      { name: 'Licenças & Subscrições', icon: 'Key', color: '#8b5cf6' },
      { name: 'Serviços de Consultoria', icon: 'Briefcase', color: '#3b82f6' },
    ],
    sampleProducts: [
      { name: 'Consultoria de Gestão (Hora)', category: 'Serviços de Consultoria', price: 2500, costPrice: 0, taxRate: 16, unit: 'hora' },
      { name: 'Manutenção de TI / Mensal', category: 'Assistência Técnica & TI', price: 5000, costPrice: 500, taxRate: 16, unit: 'mensal' },
    ],
  },
  {
    id: 'geral',
    name: 'Comércio Geral & Outros',
    badge: 'Comércio Geral',
    iconName: 'Store',
    description: 'Empresas comerciais com produtos e serviços diversificados.',
    defaultCategories: [
      { name: 'Artigos Gerais', icon: 'Box', color: '#c5a47e' },
      { name: 'Consumíveis & Acessórios', icon: 'ShoppingBag', color: '#3b82f6' },
      { name: 'Diversos', icon: 'Layers', color: '#6b7280' },
      { name: 'Serviços & Atendimento', icon: 'Clock', color: '#10b981' },
    ],
    sampleProducts: [
      { name: 'Artigo Comercial Padrão', category: 'Artigos Gerais', price: 950, costPrice: 500, taxRate: 16, unit: 'un' },
      { name: 'Serviço Comercial Padrão', category: 'Serviços & Atendimento', price: 1200, costPrice: 200, taxRate: 16, unit: 'serv' },
    ],
  },
];
