// plans — Stripe price IDs and plan limits for Bulgarian SaaS tiers
import type { Organization, Plan, PlanId } from "@/types";

export const STRIPE_MOCK_MODE = process.env.STRIPE_MOCK_MODE === "true";

export const PLANS: Record<PlanId, Plan & {
  stripe_price_monthly: string | null;
  stripe_price_yearly: string | null;
}> = {
  free: {
    id: "free",
    name: "Безплатен",
    price_monthly: 0,
    price_yearly: 0,
    documents_limit: 3,
    users_limit: 1,
    api_access: false,
    audit_log_days: 0,
    stripe_price_monthly: null,
    stripe_price_yearly: null,
  },
  small: {
    id: "small",
    name: "Малък бизнес",
    price_monthly: 4.9,
    price_yearly: 47,
    documents_limit: 50,
    users_limit: 2,
    api_access: false,
    audit_log_days: 365,
    stripe_price_monthly: process.env.STRIPE_PRICE_SMALL_MONTHLY ?? null,
    stripe_price_yearly: process.env.STRIPE_PRICE_SMALL_YEARLY ?? null,
  },
  business: {
    id: "business",
    name: "Бизнес",
    price_monthly: 14.9,
    price_yearly: 139,
    documents_limit: -1,
    users_limit: 5,
    api_access: true,
    audit_log_days: 1825,
    stripe_price_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? null,
    stripe_price_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY ?? null,
  },
};

export function getPlanById(id: PlanId) {
  return PLANS[id];
}

export function getPlanLimits(plan: PlanId) {
  const p = PLANS[plan];
  return {
    documents_limit: p.documents_limit,
    users_limit: p.users_limit,
    api_access: p.api_access,
    audit_log_days: p.audit_log_days,
  };
}

export function isWithinLimit(
  org: Pick<Organization, "documents_used" | "documents_limit">
): boolean {
  if (org.documents_limit < 0) return true;
  return org.documents_used < org.documents_limit;
}

export function getPriceId(
  planId: Exclude<PlanId, "free">,
  interval: "monthly" | "yearly"
): string | null {
  const plan = PLANS[planId];
  return interval === "yearly"
    ? plan.stripe_price_yearly
    : plan.stripe_price_monthly;
}

export function getPlanFromPriceId(priceId: string): PlanId {
  const entries = Object.entries(PLANS) as [
    PlanId,
    (typeof PLANS)[PlanId],
  ][];
  for (const [id, plan] of entries) {
    if (
      plan.stripe_price_monthly === priceId ||
      plan.stripe_price_yearly === priceId
    ) {
      return id;
    }
  }
  return "free";
}

export function yearlySavingsEur(planId: Exclude<PlanId, "free">): number {
  const plan = PLANS[planId];
  return Math.round(plan.price_monthly * 12 - plan.price_yearly);
}

export const PLAN_FEATURES: Record<
  PlanId,
  string[]
> = {
  free: [
    "3 документа",
    "1 потребител",
    "QR подписване",
    "Без API достъп",
  ],
  small: [
    "50 документа / месец",
    "2 потребителя",
    "Биометрична верификация",
    "Audit log 1 година",
    "Имейл нотификации",
  ],
  business: [
    "Неограничени документи",
    "5 потребителя",
    "API & ERP интеграции",
    "Audit log 5 години",
    "Приоритетна поддръжка",
  ],
};
