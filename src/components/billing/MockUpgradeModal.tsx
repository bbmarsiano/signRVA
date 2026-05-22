// MockUpgradeModal — simulate plan change when Stripe is not connected
"use client";

import { useState } from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { PLANS } from "@/lib/stripe/plans";
import type { PlanId } from "@/types";

const PRIMARY = "#0F6E56";

const PLAN_OPTIONS: {
  id: PlanId;
  label: string;
  detail: string;
}[] = [
  {
    id: "free",
    label: "Безплатен",
    detail: "€0/мес (3 документа, 1 потребител)",
  },
  {
    id: "small",
    label: "Малък бизнес",
    detail: "€4.90/мес (50 документа, 2 потребители)",
  },
  {
    id: "business",
    label: "Бизнес",
    detail: "€14.90/мес (Неограничено, 5 потребители, API)",
  },
];

export default function MockUpgradeModal({
  open,
  initialPlan,
  onClose,
  onSuccess,
}: {
  open: boolean;
  initialPlan: PlanId;
  onClose: () => void;
  onSuccess: (planName: string) => void;
}) {
  const [selected, setSelected] = useState<PlanId>(initialPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleActivate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/mock-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Грешка при смяна на плана.");
        return;
      }
      onSuccess(data.plan_name ?? PLANS[selected].name);
      window.location.reload();
    } catch {
      setError("Грешка при връзка със сървъра.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[400px]">
      <div
        className="absolute inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-upgrade-title"
      >
        <div className="mx-4 w-full max-w-[400px] rounded-xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3
                id="mock-upgrade-title"
                className="text-lg font-semibold text-zinc-900"
              >
                Симулатор на план (Mockup режим)
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Stripe не е свързан. Изберете план за симулация.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100"
              aria-label="Затвори"
            >
              <IconX size={20} />
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            Това е само за тестване. Реалните плащания ще минат през Stripe след
            интеграция.
          </div>

          <fieldset className="mt-4 space-y-3">
            {PLAN_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 ${
                  selected === opt.id
                    ? "border-[#0F6E56] bg-[#E1F5EE]/40"
                    : "border-zinc-200"
                }`}
              >
                <input
                  type="radio"
                  name="mock-plan"
                  value={opt.id}
                  checked={selected === opt.id}
                  onChange={() => setSelected(opt.id)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-zinc-900">{opt.label}</span>
                  <span className="block text-sm text-zinc-500">
                    {opt.detail}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleActivate()}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {loading ? (
                <IconLoader2 className="mx-auto animate-spin" size={18} />
              ) : (
                "Активирай план"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700"
            >
              Затвори
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
