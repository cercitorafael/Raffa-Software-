import { Company, BillingCycle } from '../types';

export interface SubscriptionInfo {
  status: 'active' | 'suspended' | 'expired' | 'trial' | 'warning' | 'critical';
  rawStatus: string;
  plan: string;
  billingCycle: BillingCycle;
  totalCycleDays: number;
  daysRemaining: number;
  hoursRemaining: number;
  percentageRemaining: number;
  isExpired: boolean;
  isSuspended: boolean;
  isExpiringSoon: boolean; // <= 7 days
  isCritical: boolean; // <= 3 days
  expiresAt: Date | null;
  expiresAtFormatted: string;
  startedAt: Date | null;
  startedAtFormatted: string;
}

export const WHATSAPP_CONTACTS = [
  {
    label: 'WhatsApp Suporte & Faturação (Principal)',
    number: '+258 87 262 7974',
    rawPhone: '258872627974',
    isPrimary: true,
  },
  {
    label: 'WhatsApp Comercial & Ativações',
    number: '+258 84 395 7589',
    rawPhone: '258843957589',
    isPrimary: false,
  },
];

/**
 * Calculates remaining subscription days, percentage, and license health based on company data.
 * - Monthly cycle: 30 days
 * - Yearly cycle: 365 days
 */
export function calculateSubscription(company: Partial<Company> | null | undefined): SubscriptionInfo {
  const rawStatus = (company?.status || (company as any)?.company_status || 'active').toLowerCase();
  const rawCycle = (company?.billingCycle || (company as any)?.billing_cycle || 'monthly').toLowerCase();
  const billingCycle: BillingCycle = rawCycle === 'yearly' || rawCycle === 'anual' ? 'yearly' : 'monthly';
  const totalCycleDays = billingCycle === 'yearly' ? 365 : 30;
  const plan = company?.plan || (company as any)?.plano || 'Plano Profissional';

  // Expiration date
  const rawExpiresAt =
    company?.subscriptionExpiresAt ||
    (company as any)?.subscription_expires_at ||
    (company as any)?.data_expiracao;

  let expiresAt: Date | null = null;
  if (rawExpiresAt) {
    const parsed = new Date(rawExpiresAt);
    if (!isNaN(parsed.getTime())) {
      expiresAt = parsed;
    }
  }

  // Fallback: If no expiration date is configured on newly added/mock company, default to 30 days ahead from now
  if (!expiresAt) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    expiresAt = fallback;
  }

  // Started at
  const rawStartedAt =
    company?.subscriptionStartedAt ||
    (company as any)?.subscription_started_at ||
    (company as any)?.created_at;
  let startedAt: Date | null = null;
  if (rawStartedAt) {
    const parsed = new Date(rawStartedAt);
    if (!isNaN(parsed.getTime())) {
      startedAt = parsed;
    }
  }

  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));

  // Calculate percentage based on cycle days
  // 0% when expired/past, 100% when full
  const calculatedPercentage = Math.round((daysRemaining / totalCycleDays) * 100);
  const percentageRemaining = Math.max(0, Math.min(100, calculatedPercentage));

  const isExpired = daysRemaining <= 0;
  const isExplicitlySuspended = rawStatus === 'suspended' || rawStatus === 'bloqueado' || rawStatus === 'desativado';
  const isSuspended = isExplicitlySuspended || isExpired;
  const isCritical = !isSuspended && daysRemaining <= 3;
  const isExpiringSoon = !isSuspended && daysRemaining <= 7;

  let status: 'active' | 'suspended' | 'expired' | 'trial' | 'warning' | 'critical' = 'active';
  if (isExplicitlySuspended) {
    status = 'suspended';
  } else if (isExpired) {
    status = 'expired';
  } else if (isCritical) {
    status = 'critical';
  } else if (isExpiringSoon) {
    status = 'warning';
  } else if (rawStatus === 'trial') {
    status = 'trial';
  } else {
    status = 'active';
  }

  const expiresAtFormatted = expiresAt.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const startedAtFormatted = startedAt
    ? startedAt.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Início do Ciclo';

  return {
    status,
    rawStatus,
    plan,
    billingCycle,
    totalCycleDays,
    daysRemaining,
    hoursRemaining,
    percentageRemaining,
    isExpired,
    isSuspended,
    isExpiringSoon,
    isCritical,
    expiresAt,
    expiresAtFormatted,
    startedAt,
    startedAtFormatted,
  };
}

/**
 * Builds a direct pre-filled WhatsApp renewal link for the specified phone number and company.
 */
export function getWhatsAppRenewalUrl(phoneRaw: string, company?: Partial<Company> | null, subInfo?: SubscriptionInfo): string {
  const cleanPhone = phoneRaw.replace(/[^0-9]/g, '');
  const compName = company?.tradeName || company?.name || 'A Minha Empresa';
  const compNuit = company?.taxNumber || 'N/A';
  const compId = company?.id || 'N/A';
  const plan = subInfo?.plan || company?.plan || 'Plano Profissional';
  const cycle = (subInfo?.billingCycle || company?.billingCycle) === 'yearly' ? 'Anual (365 dias)' : 'Mensal (30 dias)';
  const daysText = subInfo ? (subInfo.daysRemaining <= 0 ? 'Expirada / Vencida' : `${subInfo.daysRemaining} dias restantes`) : 'Para renovação';

  const message = [
    `*SOLICITAÇÃO DE RENOVAÇÃO DE ASSINATURA POS/ERP*`,
    `----------------------------------------`,
    `🏢 *Empresa:* ${compName}`,
    `📋 *NUIT / NIF:* ${compNuit}`,
    `🔑 *Código da Empresa:* ${compId}`,
    `📦 *Plano:* ${plan}`,
    `⏳ *Ciclo de Faturação:* ${cycle}`,
    `⚠️ *Estado da Licença:* ${daysText}`,
    `----------------------------------------`,
    `Olá! Gostaria de efetuar o pagamento para renovação da licença/assinatura do sistema.`,
    `Por favor, enviem os dados de pagamento (M-Pesa / E-Mola / Millennium BIM / BCI / Standard Bank).`,
    `Obrigado!`,
  ].join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
