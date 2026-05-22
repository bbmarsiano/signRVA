// BillingClient — plans, invoices, and billing settings (3 tabs)
"use client";

import { useEffect, useState } from "react";
import { IconCreditCard, IconLoader2 } from "@tabler/icons-react";
import { useToast } from "@/components/ui/Toast";
import {
  PLANS,
  PLAN_FEATURES,
  yearlySavingsEur,
} from "@/lib/stripe/plans";
import type { Organization, PlanId } from "@/types";

const PRIMARY = "#0F6E56";

const planNames: Record<PlanId, string> = {
  free: "Безплатен",
  small: "Малък бизнес",
  business: "Бизнес",
};

export type BillingSubscription = {
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
};

export type BillingInvoiceRow = {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "failed" | "other";
  statusLabel: string;
  pdfUrl: string | null;
};

export type BillingPaymentMethod = {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
};

export type BillingProfile = {
  billing_name: string | null;
  billing_eik: string | null;
  billing_address: string | null;
  billing_vat: string | null;
};

type TabId = "plans" | "invoices" | "settings";

export default function BillingClient({
  organization,
  usersCount,
  subscription,
  invoices,
  paymentMethod,
  billingProfile,
  hasStripeCustomer,
  isMockMode,
}: {
  organization: Organization;
  usersCount: number;
  subscription: BillingSubscription | null;
  invoices: BillingInvoiceRow[];
  paymentMethod: BillingPaymentMethod | null;
  billingProfile: BillingProfile;
  hasStripeCustomer: boolean;
  isMockMode: boolean;
}) {
  const { addToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabId>("plans");
  const [yearly, setYearly] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<PlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState(billingProfile);

  const [showMockModal, setShowMockModal] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<PlanId>("small");
  const [mockUpgrading, setMockUpgrading] = useState(false);
  const [mockSuccess, setMockSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentPlan = PLANS[organization.plan];
  const docsLimitLabel =
    organization.documents_limit < 0
      ? "∞"
      : String(organization.documents_limit);
  const docsPercent =
    organization.documents_limit > 0
      ? Math.min(
          100,
          (organization.documents_used / organization.documents_limit) * 100
        )
      : 0;
  const usersPercent =
    currentPlan.users_limit > 0
      ? Math.min(100, (usersCount / currentPlan.users_limit) * 100)
      : 0;

  const tabs: { id: TabId; label: string }[] = [
    { id: "plans", label: "Планове" },
    { id: "invoices", label: "Фактури" },
    { id: "settings", label: "Настройки" },
  ];

  function handleUpgrade(targetPlan: PlanId) {
    if (isMockMode) {
      setUpgradingPlan(targetPlan);
      setShowMockModal(true);
      setMockSuccess(false);
      return;
    }
    void handleStripeCheckout(targetPlan);
  }

  async function handleStripeCheckout(planId: PlanId) {
    setCheckoutLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          interval: yearly ? "yearly" : "monthly",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        addToast(data.error ?? "Грешка при плащане.", "error");
      }
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    if (isMockMode) {
      setUpgradingPlan(organization.plan);
      setShowMockModal(true);
      setMockSuccess(false);
      return;
    }
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else addToast(data.error ?? "Грешка при смяна на плана", "error");
    } finally {
      setPortalLoading(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/billing/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      setProfileMessage(res.ok ? "Запазено успешно." : data.error);
    } finally {
      setProfileSaving(false);
    }
  }

  if (!mounted) {
    return null;
  }

  if (showMockModal) {
    return (
      <div style={{ minHeight: "500px", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            borderRadius: "var(--border-radius-lg, 12px)",
          }}
        >
          <div
            style={{
              background: "var(--color-background-primary, #fff)",
              borderRadius: "var(--border-radius-lg, 12px)",
              padding: "28px",
              width: "380px",
              maxWidth: "90%",
              border: "0.5px solid var(--color-border-tertiary, #e4e4e7)",
            }}
          >
            <div
              style={{
                background: "#FAEEDA",
                color: "#633806",
                borderRadius: "var(--border-radius-md, 8px)",
                padding: "10px 14px",
                fontSize: "12.5px",
                marginBottom: "16px",
              }}
            >
              Mockup режим — Stripe не е свързан. Само за тестване.
            </div>

            <h3
              style={{
                fontSize: "15px",
                fontWeight: 500,
                marginBottom: "6px",
                color: "#18181b",
              }}
            >
              Симулатор на план
            </h3>
            <p
              style={{
                fontSize: "12.5px",
                color: "var(--color-text-secondary, #71717a)",
                marginBottom: "16px",
              }}
            >
              Избрали сте: <strong>{planNames[upgradingPlan]}</strong>
            </p>

            <button
              type="button"
              onClick={async () => {
                setMockUpgrading(true);
                try {
                  const res = await fetch("/api/billing/mock-upgrade", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: upgradingPlan }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    const planLabel =
                      (data.plan_name as string) ?? planNames[upgradingPlan];
                    addToast(
                      `Планът е сменен на ${planLabel} успешно`,
                      "success"
                    );
                    setMockSuccess(true);
                    setTimeout(() => window.location.reload(), 1200);
                  } else {
                    addToast(data.error ?? "Грешка при смяна на плана", "error");
                  }
                } catch (e) {
                  console.error(e);
                  addToast("Грешка при смяна на плана", "error");
                } finally {
                  setMockUpgrading(false);
                }
              }}
              disabled={mockUpgrading || mockSuccess}
              style={{
                width: "100%",
                background: PRIMARY,
                color: "#fff",
                border: "none",
                padding: "10px",
                borderRadius: "var(--border-radius-md, 8px)",
                fontSize: "13px",
                fontWeight: 500,
                cursor: mockUpgrading || mockSuccess ? "default" : "pointer",
                marginBottom: "8px",
                opacity: mockUpgrading ? 0.7 : 1,
              }}
            >
              {mockSuccess
                ? "Активирано! Зарежда..."
                : mockUpgrading
                  ? "Активиране..."
                  : `Активирай ${planNames[upgradingPlan]}`}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMockModal(false);
                setMockSuccess(false);
              }}
              style={{
                width: "100%",
                background: "none",
                border: "0.5px solid var(--color-border-tertiary, #e4e4e7)",
                padding: "9px",
                borderRadius: "var(--border-radius-md, 8px)",
                fontSize: "13px",
                cursor: "pointer",
                color: "var(--color-text-secondary, #71717a)",
              }}
            >
              Затвори
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isMockMode && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Mockup режим — Stripe не е свързан
        </div>
      )}

      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? "bg-white text-[#085041] shadow-sm"
                : "text-zinc-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plans" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">
                  {currentPlan.name}
                </h3>
                <span
                  className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Активен
                </span>
                {subscription?.current_period_end && (
                  <p className="mt-2 text-sm text-zinc-600">
                    Следващо плащане:{" "}
                    {new Intl.DateTimeFormat("bg-BG", {
                      dateStyle: "long",
                    }).format(new Date(subscription.current_period_end))}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Документи</span>
                  <span className="font-medium">
                    {organization.documents_used} / {docsLimitLabel}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${docsPercent}%`,
                      backgroundColor: PRIMARY,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Потребители</span>
                  <span className="font-medium">
                    {usersCount} / {currentPlan.users_limit}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-[#0F6E56]/70"
                    style={{ width: `${usersPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <span
              className={`text-sm ${!yearly ? "font-semibold text-zinc-900" : "text-zinc-500"}`}
            >
              Месечно
            </span>
            <button
              type="button"
              onClick={() => setYearly((y) => !y)}
              className="relative h-7 w-12 rounded-full bg-zinc-200 transition-colors"
              style={yearly ? { backgroundColor: PRIMARY } : undefined}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  yearly ? "left-5" : "left-0.5"
                }`}
              />
            </button>
            <span
              className={`text-sm ${yearly ? "font-semibold text-zinc-900" : "text-zinc-500"}`}
            >
              Годишно{" "}
              <span className="text-emerald-600">(спестете ~20%)</span>
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {(["free", "small", "business"] as PlanId[]).map((planId) => {
              const plan = PLANS[planId];
              const isCurrent = organization.plan === planId;
              const price =
                planId === "free"
                  ? "€0"
                  : yearly
                    ? `€${plan.price_yearly}/год`
                    : `€${plan.price_monthly}/мес`;
              const savings =
                planId !== "free" && yearly
                  ? yearlySavingsEur(planId as "small" | "business")
                  : 0;
              const order: Record<PlanId, number> = {
                free: 0,
                small: 1,
                business: 2,
              };
              const actionLabel =
                order[planId] > order[organization.plan]
                  ? "Надгради"
                  : "Понижи";

              return (
                <div
                  key={planId}
                  className={`rounded-xl border p-6 ${
                    isCurrent
                      ? "border-[#0F6E56] bg-[#E1F5EE]/30"
                      : "border-zinc-200 bg-white"
                  } shadow-sm`}
                >
                  <h4 className="text-lg font-semibold text-zinc-900">
                    {plan.name}
                  </h4>
                  <p className="mt-2 text-2xl font-bold text-zinc-900">
                    {price}
                  </p>
                  {savings > 0 && (
                    <p className="text-xs text-emerald-600">
                      Спестявате €{savings}/год
                    </p>
                  )}
                  <ul className="mt-4 space-y-1.5 text-sm text-zinc-600">
                    {PLAN_FEATURES[planId].map((f) => (
                      <li key={f}>✓ {f}</li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <p className="mt-4 text-center text-sm font-medium text-[#085041]">
                      Текущ план
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={checkoutLoading === planId}
                      onClick={() => handleUpgrade(planId)}
                      className="mt-4 w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {checkoutLoading === planId && !isMockMode ? (
                        <IconLoader2 className="mx-auto animate-spin" size={18} />
                      ) : (
                        actionLabel
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "invoices" && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-zinc-500">
                <th className="px-6 py-3 font-medium">Дата</th>
                <th className="px-6 py-3 font-medium">Сума</th>
                <th className="px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-zinc-500"
                  >
                    Няма фактури
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-zinc-50">
                    <td className="px-6 py-3 text-zinc-800">
                      {new Intl.DateTimeFormat("bg-BG", {
                        dateStyle: "medium",
                      }).format(new Date(inv.date))}
                    </td>
                    <td className="px-6 py-3">{inv.amount}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {inv.statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0F6E56] hover:underline"
                        >
                          PDF
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title={
                            isMockMode
                              ? "Недостъпно в mockup режим"
                              : undefined
                          }
                          className="cursor-not-allowed text-zinc-300"
                        >
                          PDF
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h4 className="font-semibold text-zinc-900">Метод на плащане</h4>
            {paymentMethod ? (
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-zinc-100">
                  <IconCreditCard size={28} className="text-zinc-600" />
                </div>
                <div>
                  <p className="font-medium capitalize text-zinc-900">
                    {paymentMethod.brand} •••• {paymentMethod.last4}
                  </p>
                  <p className="text-sm text-zinc-500">
                    Изтича {paymentMethod.exp_month}/
                    {paymentMethod.exp_year}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                Няма запазен метод на плащане
              </p>
            )}
            <button
              type="button"
              disabled={isMockMode || !hasStripeCustomer || portalLoading}
              onClick={() => void handlePortal()}
              title={
                isMockMode
                  ? "Stripe не е свързан"
                  : !hasStripeCustomer
                    ? "Няма Stripe клиент"
                    : undefined
              }
              className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: PRIMARY }}
            >
              {portalLoading ? "Зареждане..." : "Управление на плащането"}
            </button>
          </div>

          <form
            onSubmit={(e) => void saveProfile(e)}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <h4 className="font-semibold text-zinc-900">
              Фирмени данни за фактуриране
            </h4>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-zinc-700">
                  Фирма / Имена
                </label>
                <input
                  value={profile.billing_name ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      billing_name: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  ЕИК / ЕГН
                </label>
                <input
                  value={profile.billing_eik ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, billing_eik: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  ДДС номер
                </label>
                <input
                  value={profile.billing_vat ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, billing_vat: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-zinc-700">
                  Адрес
                </label>
                <input
                  value={profile.billing_address ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      billing_address: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            {profileMessage && (
              <p className="mt-3 text-sm text-zinc-600">{profileMessage}</p>
            )}
            <button
              type="submit"
              disabled={profileSaving}
              className="mt-4 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {profileSaving ? "Запазване..." : "Запази"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
