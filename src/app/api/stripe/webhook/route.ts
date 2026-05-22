// Stripe webhook — subscription lifecycle and payment failure handling
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendPaymentFailedEmail } from "@/lib/email/payment-failed";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { getPlanFromPriceId, getPlanLimits, STRIPE_MOCK_MODE } from "@/lib/stripe/plans";
import type { PlanId } from "@/types";

async function updateOrganization(
  orgId: string,
  updates: Record<string, unknown>
) {
  const supabase = createAdminClient();
  await supabase.from("organizations").update(updates).eq("id", orgId);
}

async function applyPlan(orgId: string, planId: PlanId, subscriptionId?: string) {
  const limits = getPlanLimits(planId);
  await updateOrganization(orgId, {
    plan: planId,
    documents_limit: limits.documents_limit,
    ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
  });
}

export async function POST(request: Request) {
  if (STRIPE_MOCK_MODE) {
    return NextResponse.json({ received: true, mock: true });
  }

  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook config" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id;
      const planId = (session.metadata?.plan_id as PlanId) ?? "small";
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (orgId) {
        const limits = getPlanLimits(planId);
        await updateOrganization(orgId, {
          plan: planId,
          documents_limit: limits.documents_limit,
          documents_used: 0,
          stripe_subscription_id: subscriptionId ?? null,
          stripe_customer_id:
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id ?? null,
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.org_id;
      const priceId = subscription.items.data[0]?.price.id;

      if (orgId && priceId) {
        const planId = getPlanFromPriceId(priceId);
        await applyPlan(orgId, planId, subscription.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.org_id;

      if (orgId) {
        const limits = getPlanLimits("free");
        await updateOrganization(orgId, {
          plan: "free",
          documents_limit: limits.documents_limit,
          stripe_subscription_id: null,
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (customerId && process.env.RESEND_API_KEY) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id, name")
          .eq("stripe_customer_id", customerId)
          .single();

        if (org) {
          const { data: owner } = await supabase
            .from("users")
            .select("email")
            .eq("org_id", org.id)
            .eq("role", "owner")
            .limit(1)
            .single();

          if (owner?.email) {
            try {
              await sendPaymentFailedEmail({
                to: owner.email,
                orgName: org.name,
              });
            } catch {
              // non-blocking
            }
          }
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
