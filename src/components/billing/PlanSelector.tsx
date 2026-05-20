// PlanSelector — plan cards, billing interval toggle, Stripe checkout & portal
"use client";

import { useState } from "react";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import {
  PLAN_FEATURES,
  PLANS,
  yearlySavingsEur,
} from "@/lib/stripe/plans";
import type { PlanId } from "@/types";

const PRIMARY = "#0F6E56";
const PLAN_ORDER: PlanId[] = ["free", "small", "business"];

function planRank(id: PlanId) {
  return PLAN_ORDER.indexOf(id);
}

export default function PlanSelector({
  currentPlanId,
  hasStripeCustomer,
}: {
  currentPlanId: PlanId;
  hasStripeCustomer: boolean;
}) {
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(planId: PlanId) {
    if (planId === "free") return;
    setLoading(`checkout-${planId}`);
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
      }
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setLoading(null);
    }
  }

  function renderButton(planId: PlanId) {
    if (planId === currentPlanId) {
      return (
        <button
          type="button"
          disabled
          className="mt-4 w-full rounded-lg border border-zinc-200 bg-zinc-100 py-2.5 text-sm font-medium text-zinc-500"
        >
          Текущ план
        </button>
      );
    }

    const rank = planRank(planId);
    const currentRank = planRank(currentPlanId);

    if (rank > currentRank) {
      return (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void handleCheckout(planId)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: PRIMARY }}
        >
          {loading === `checkout-${planId}` ? (
            <IconLoader2 size={18} className="animate-spin" />
          ) : (
            "Upgrade →"
          )}
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled={loading !== null || !hasStripeCustomer}
        onClick={() => void handlePortal()}
        className="mt-4 w-full rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        {loading === "portal" ? (
          <IconLoader2 size={18} className="mx-auto animate-spin" />
        ) : (
          "Downgrade"
        )}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3">
        <span
          className={`text-sm ${!yearly ? "font-semibold text-zinc-900" : "text-zinc-500"}`}
        >
          Месечно
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          onClick={() => setYearly(!yearly)}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            yearly ? "bg-[#0F6E56]" : "bg-zinc-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              yearly ? "translate-x-5" : ""
            }`}
          />
        </button>
        <span
          className={`text-sm ${yearly ? "font-semibold text-zinc-900" : "text-zinc-500"}`}
        >
          Годишно
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isPopular = planId === "small";
          const price =
            planId === "free"
              ? 0
              : yearly
                ? plan.price_yearly
                : plan.price_monthly;
          const savings =
            planId !== "free" ? yearlySavingsEur(planId) : 0;

          return (
            <div
              key={planId}
              className={`relative rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${
                planId === currentPlanId
                  ? "border-[#0F6E56] ring-1 ring-[#0F6E56]/20"
                  : "border-zinc-200"
              } ${isPopular ? "lg:scale-[1.02]" : ""}`}
            >
              {isPopular && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Най-популярен
                </span>
              )}

              <h3 className="text-lg font-semibold text-zinc-900">
                {plan.name}
              </h3>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-900">
                  €{price.toFixed(2)}
                </span>
                <span className="text-sm text-zinc-500">
                  /{yearly ? "год" : "мес"}
                </span>
              </div>

              {yearly && savings > 0 && planId !== "free" && (
                <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  Спестяваш €{savings}
                </span>
              )}

              <ul className="mt-5 space-y-2">
                {PLAN_FEATURES[planId].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-zinc-600"
                  >
                    <IconCheck
                      size={16}
                      className="mt-0.5 shrink-0 text-[#0F6E56]"
                      stroke={2}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              {renderButton(planId)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
