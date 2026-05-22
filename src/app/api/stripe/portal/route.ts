// POST /api/stripe/portal — Stripe Customer Billing Portal session
import { NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/dashboard/session";
import { getAppUrl } from "@/lib/app-url";
import { stripe } from "@/lib/stripe/client";
import { STRIPE_MOCK_MODE } from "@/lib/stripe/plans";

export async function POST() {
  if (STRIPE_MOCK_MODE) {
    return NextResponse.json(
      { error: "Stripe не е активиран", mock: true },
      { status: 503 }
    );
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe не е конфигуриран." },
      { status: 503 }
    );
  }

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
