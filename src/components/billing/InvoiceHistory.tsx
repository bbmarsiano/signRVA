// InvoiceHistory — Stripe invoice list with PDF download links
import type { BillingInvoice } from "@/lib/stripe/billing-data";

export default function InvoiceHistory({
  invoices,
}: {
  invoices: BillingInvoice[];
}) {
  if (invoices.length === 0) {
    return (
      <p className="text-sm text-zinc-500">Все още няма фактури.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3">Дата</th>
            <th className="px-4 py-3">Сума</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3 text-right">PDF</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td className="px-4 py-3 text-zinc-700">
                {new Intl.DateTimeFormat("bg-BG", {
                  dateStyle: "medium",
                }).format(new Date(inv.date))}
              </td>
              <td className="px-4 py-3 font-medium text-zinc-900">
                {inv.amount}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    inv.status === "paid"
                      ? "bg-emerald-50 text-emerald-800"
                      : inv.status === "failed"
                        ? "bg-red-50 text-red-700"
                        : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {inv.statusLabel}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {inv.pdfUrl ? (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                    style={{ color: "#0F6E56" }}
                  >
                    Изтегли
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
