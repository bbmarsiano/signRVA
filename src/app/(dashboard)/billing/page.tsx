// Billing — Stripe subscription, usage, plan selector, and invoices
import { redirect } from "next/navigation";
import BillingActions from "@/components/billing/BillingActions";
import InvoiceHistory from "@/components/billing/InvoiceHistory";
import PlanSelector from "@/components/billing/PlanSelector";
import { getDashboardSession } from "@/lib/dashboard/session";
import { getBillingExtras } from "@/lib/stripe/billing-data";
import { getPlanById } from "@/lib/stripe/plans";
import { createClient } from "@/lib/supabase/server";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  const { organization } = session;
  const params = await searchParams;
  const plan = getPlanById(organization.plan);

  const supabase = await createClient();
  const { count: usersCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("org_id", organization.id);

  let billingExtras = { nextBillingDate: null as string | null, invoices: [] as Awaited<ReturnType<typeof getBillingExtras>>["invoices"] };

  if (organization.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      billingExtras = await getBillingExtras(organization);
    } catch {
      // Stripe unavailable — show page without extras
    }
  }

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
    plan.users_limit > 0
      ? Math.min(100, ((usersCount ?? 0) / plan.users_limit) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
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

      {/* Current plan */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-zinc-900">
                {plan.name}
              </h3>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: "#0F6E56" }}
              >
                Активен
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {organization.plan === "free"
                ? "Безплатен план"
                : `€${plan.price_monthly.toFixed(2)} / мес · €${plan.price_yearly.toFixed(2)} / год`}
            </p>
            {billingExtras.nextBillingDate && (
              <p className="mt-2 text-sm text-zinc-600">
                Следващо плащане:{" "}
                {new Intl.DateTimeFormat("bg-BG", {
                  dateStyle: "long",
                }).format(new Date(billingExtras.nextBillingDate))}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Документи</span>
              <span className="font-medium text-zinc-900">
                {organization.documents_used} / {docsLimitLabel}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${docsPercent}%`,
                  backgroundColor: "#0F6E56",
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Потребители</span>
              <span className="font-medium text-zinc-900">
                {usersCount ?? 0} / {plan.users_limit}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-[#0F6E56]/70 transition-all"
                style={{ width: `${usersPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          Изберете план
        </h3>
        <PlanSelector
          currentPlanId={organization.plan}
          hasStripeCustomer={!!organization.stripe_customer_id}
        />
      </section>

      <BillingActions hasStripeCustomer={!!organization.stripe_customer_id} />

      <section>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          История на фактурите
        </h3>
        <InvoiceHistory invoices={billingExtras.invoices} />
      </section>
    </div>
  );
}
