// Billing — Stripe subscription, usage, plan selector, and invoices
import { redirect } from "next/navigation";
import BillingClient, {
  type BillingInvoiceRow,
  type BillingPaymentMethod,
  type BillingProfile,
  type BillingSubscription,
} from "@/components/billing/BillingClient";
import { getDashboardSession } from "@/lib/dashboard/session";
import { getBillingExtras } from "@/lib/stripe/billing-data";
import { STRIPE_MOCK_MODE } from "@/lib/stripe/plans";
import { createClient } from "@/lib/supabase/server";

const mockSubscription: BillingSubscription = {
  status: "active",
  current_period_end: new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString(),
  cancel_at_period_end: false,
};

const mockInvoices: BillingInvoiceRow[] = [
  {
    id: "mock_inv_001",
    date: "2026-05-22",
    amount: "€4.90",
    status: "paid",
    statusLabel: "Платена",
    pdfUrl: null,
  },
  {
    id: "mock_inv_002",
    date: "2026-04-22",
    amount: "€4.90",
    status: "paid",
    statusLabel: "Платена",
    pdfUrl: null,
  },
  {
    id: "mock_inv_003",
    date: "2026-03-22",
    amount: "€4.90",
    status: "paid",
    statusLabel: "Платена",
    pdfUrl: null,
  },
];

const mockPaymentMethod: BillingPaymentMethod = {
  brand: "visa",
  last4: "4242",
  exp_month: 12,
  exp_year: 2027,
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  const { organization } = session;
  const params = await searchParams;

  const supabase = await createClient();
  const { count: usersCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("org_id", organization.id);

  const { data: orgBilling } = await supabase
    .from("organizations")
    .select(
      "billing_name, billing_eik, billing_address, billing_vat, stripe_customer_id"
    )
    .eq("id", organization.id)
    .single();

  const billingProfile: BillingProfile = {
    billing_name: orgBilling?.billing_name ?? null,
    billing_eik: orgBilling?.billing_eik ?? null,
    billing_address: orgBilling?.billing_address ?? null,
    billing_vat: orgBilling?.billing_vat ?? null,
  };

  let subscription: BillingSubscription | null = null;
  let invoices: BillingInvoiceRow[] = [];
  let paymentMethod: BillingPaymentMethod | null = null;

  if (STRIPE_MOCK_MODE) {
    subscription = mockSubscription;
    invoices = mockInvoices;
    paymentMethod = mockPaymentMethod;
  } else if (
    organization.stripe_customer_id &&
    process.env.STRIPE_SECRET_KEY
  ) {
    try {
      const extras = await getBillingExtras(organization);
      if (extras.nextBillingDate) {
        subscription = {
          status: "active",
          current_period_end: extras.nextBillingDate,
          cancel_at_period_end: false,
        };
      }
      invoices = extras.invoices;
    } catch {
      // Stripe unavailable
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {params.success === "true" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Абонаментът е активиран успешно. Благодарим ви!
        </div>
      )}

      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Абонамент</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Управление на план, плащания и фактури
        </p>
      </div>

      <BillingClient
        organization={organization}
        usersCount={usersCount ?? 0}
        subscription={subscription}
        invoices={invoices}
        paymentMethod={paymentMethod}
        billingProfile={billingProfile}
        hasStripeCustomer={!!organization.stripe_customer_id}
        isMockMode={STRIPE_MOCK_MODE}
      />
    </div>
  );
}
