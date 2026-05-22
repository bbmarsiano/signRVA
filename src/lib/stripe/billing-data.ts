// billing-data — fetch Stripe subscription and invoices for billing page
import { stripe } from "@/lib/stripe/client";
import { getPlanById } from "@/lib/stripe/plans";
import type { Organization, PlanId } from "@/types";

export type BillingInvoice = {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "failed" | "other";
  statusLabel: string;
  pdfUrl: string | null;
};

export async function getBillingExtras(organization: Organization): Promise<{
  nextBillingDate: string | null;
  invoices: BillingInvoice[];
}> {
  if (!stripe || !organization.stripe_customer_id) {
    return { nextBillingDate: null, invoices: [] };
  }

  let nextBillingDate: string | null = null;

  if (organization.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(
        organization.stripe_subscription_id
      );
      const end = sub.items.data[0]?.current_period_end;
      if (end) {
        nextBillingDate = new Date(end * 1000).toISOString();
      }
    } catch {
      // subscription may be missing
    }
  }

  const invoiceList = await stripe.invoices.list({
    customer: organization.stripe_customer_id,
    limit: 10,
  });

  const invoices: BillingInvoice[] = invoiceList.data.map((inv) => {
    let status: BillingInvoice["status"] = "other";
    let statusLabel = "Друго";

    if (inv.status === "paid") {
      status = "paid";
      statusLabel = "Платена";
    } else if (
      inv.status === "open" &&
      inv.attempt_count &&
      inv.attempt_count > 0
    ) {
      status = "failed";
      statusLabel = "Неуспешна";
    } else if (inv.status === "uncollectible" || inv.status === "void") {
      status = "failed";
      statusLabel = "Неуспешна";
    }

    const amount = ((inv.amount_paid ?? inv.amount_due) / 100).toFixed(2);

    return {
      id: inv.id,
      date: new Date((inv.created ?? 0) * 1000).toISOString(),
      amount: `€${amount}`,
      status,
      statusLabel,
      pdfUrl: inv.invoice_pdf ?? null,
    };
  });

  return { nextBillingDate, invoices };
}

export function formatPlanPrice(planId: PlanId, yearly: boolean): string {
  const plan = getPlanById(planId);
  if (planId === "free") return "€0";
  const price = yearly ? plan.price_yearly : plan.price_monthly;
  return `€${price.toFixed(2)}`;
}
