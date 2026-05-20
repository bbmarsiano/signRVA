// POST /api/stripe/portal — Stripe Customer Billing Portal session
import { NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/dashboard/session";
import { getAppUrl } from "@/lib/app-url";
import { stripe } from "@/lib/stripe/client";

export async function POST() {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const { organization } = session;

  if (!organization.stripe_customer_id) {
    return NextResponse.json(
      { error: "Няма активен Stripe клиент." },
      { status: 400 }
    );
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: organization.stripe_customer_id,
    return_url: `${getAppUrl()}/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
