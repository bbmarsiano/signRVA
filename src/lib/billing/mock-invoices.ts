// mock-invoices — realistic invoice history for mock billing mode
import type { PlanId } from "@/types";

export type MockInvoice = {
  id: string;
  number: string;
  date: string;
  period: string;
  amount: number;
  amountLabel: string;
  status: "paid";
  statusLabel: string;
};

export function generateMockInvoices(
  plan: PlanId,
  months: number
): MockInvoice[] {
  const price =
    plan === "business" ? 14.9 : plan === "small" ? 4.9 : 0;
  if (price === 0) return [];

  return Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();

    return {
      id: `mock-${year}-${month}-${suffix}`,
      number: `INV-${year}${String(month).padStart(2, "0")}-${suffix}`,
      date: date.toLocaleDateString("bg-BG"),
      period: `${date.toLocaleString("bg-BG", { month: "long" })} ${year}`,
      amount: price,
      amountLabel: `€${price.toFixed(2)}`,
      status: "paid" as const,
      statusLabel: "Платена",
    };
  });
}
