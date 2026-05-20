// BillingActions — Stripe Customer Portal launcher
"use client";

import { useState } from "react";
import { IconLoader2, IconCreditCard } from "@tabler/icons-react";

export default function BillingActions({
  hasStripeCustomer,
}: {
  hasStripeCustomer: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-zinc-100 p-2">
          <IconCreditCard size={22} className="text-zinc-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-zinc-900">Метод на плащане</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Управлявайте карти, адрес за фактуриране и абонамент в Stripe.
          </p>
          <button
            type="button"
            disabled={!hasStripeCustomer || loading}
            onClick={() => void openPortal()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <IconLoader2 size={18} className="animate-spin" />
            ) : null}
            Управление на плащането
          </button>
        </div>
      </div>
    </div>
  );
}
