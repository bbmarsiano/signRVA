// plan-display — billing UI plan cards with features and missing items
import type { PlanId } from "@/types";

export type BillingPlanDisplay = {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  documentsLimit: number;
  usersLimit: number;
  apiAccess: boolean;
  auditLogDays: number;
  features: string[];
  missing: string[];
};

export const BILLING_PLANS: Record<PlanId, BillingPlanDisplay> = {
  free: {
    id: "free",
    name: "Безплатен",
    monthlyPrice: 0,
    yearlyPrice: 0,
    documentsLimit: 3,
    usersLimit: 1,
    apiAccess: false,
    auditLogDays: 0,
    features: [
      "QR подписване",
      "3 документа / месец",
      "1 потребител",
      "PDF с подпис",
      "Имейл нотификации",
    ],
    missing: [
      "API & ERP интеграция",
      "Audit log",
      "Шаблони",
      "Приоритетна поддръжка",
    ],
  },
  small: {
    id: "small",
    name: "Малък бизнес",
    monthlyPrice: 4.9,
    yearlyPrice: 47,
    documentsLimit: 50,
    usersLimit: 2,
    apiAccess: false,
    auditLogDays: 365,
    features: [
      "QR подписване",
      "50 документа / месец",
      "2 потребители",
      "Двустранно подписване",
      "Биометрична верификация",
      "Шаблони",
      "Audit log (1 година)",
      "Имейл нотификации",
    ],
    missing: ["API & ERP интеграция", "Приоритетна поддръжка"],
  },
  business: {
    id: "business",
    name: "Бизнес",
    monthlyPrice: 14.9,
    yearlyPrice: 139,
    documentsLimit: -1,
    usersLimit: 5,
    apiAccess: true,
    auditLogDays: 1825,
    features: [
      "Неограничени документи",
      "5 потребители",
      "API & ERP интеграция",
      "REST API + Webhooks",
      "Audit log (5 години)",
      "Всички типове подписване",
      "Приоритетна поддръжка",
      "Персонализирани шаблони",
    ],
    missing: [],
  },
};

export const PLAN_ORDER: Record<PlanId, number> = {
  free: 0,
  small: 1,
  business: 2,
};

export function planAction(
  current: PlanId,
  target: PlanId
): "current" | "upgrade" | "downgrade" {
  if (current === target) return "current";
  return PLAN_ORDER[target] > PLAN_ORDER[current] ? "upgrade" : "downgrade";
}
