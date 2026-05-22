// POST /api/stripe/checkout — create Stripe Checkout subscription session
import { NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/dashboard/session";
import { getAppUrl } from "@/lib/app-url";
import { stripe } from "@/lib/stripe/client";
import { getPriceId, STRIPE_MOCK_MODE } from "@/lib/stripe/plans";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/types";

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null);
  const planId = body?.plan_id as PlanId | undefined;
  const interval = body?.interval as "monthly" | "yearly" | undefined;

  if (
    !planId ||
    (planId !== "small" && planId !== "business") ||
    !interval ||
    (interval !== "monthly" && interval !== "yearly")
  ) {
    return NextResponse.json({ error: "Невалидни параметри." }, { status: 400 });
  }

  const priceId = getPriceId(planId, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: "Планът не е конфигуриран в Stripe." },
      { status: 500 }
    );
  }

  const { organization, user } = session;
  let customerId = organization.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: organization.name,
      metadata: { org_id: organization.id },
    });
    customerId = customer.id;

    const supabase = await createClient();
    await supabase
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", organization.id);
  }

  const appUrl = getAppUrl();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?success=true`,
    cancel_url: `${appUrl}/billing`,
    metadata: {
      org_id: organization.id,
      plan_id: planId,
    },
    subscription_data: {
      metadata: {
        org_id: organization.id,
        plan_id: planId,
      },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
