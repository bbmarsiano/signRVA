// POST /api/billing/mock-upgrade — simulate plan change (mock mode only)
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlanById, getPlanLimits, STRIPE_MOCK_MODE } from "@/lib/stripe/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PlanId } from "@/types";

const MOCK_LIMITS: Record<PlanId, number> = {
  free: 3,
  small: 50,
  business: -1,
};

export async function POST(request: Request) {
  if (!STRIPE_MOCK_MODE) {
    return NextResponse.json(
      { error: "Само в mockup режим." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!userRow?.org_id) {
    return NextResponse.json(
      { error: "Организацията не е намерена." },
      { status: 400 }
    );
  }

  if (userRow.role !== "owner") {
    return NextResponse.json(
      { error: "Само собственикът може да сменя плана." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const plan = body?.plan as PlanId | undefined;

  if (!plan || !["free", "small", "business"].includes(plan)) {
    return NextResponse.json({ error: "Невалиден план." }, { status: 400 });
  }

  const limits = getPlanLimits(plan);
  const documentsLimit = MOCK_LIMITS[plan];

  const { error } = await supabaseAdmin
    .from("organizations")
    .update({
      plan,
      documents_limit: documentsLimit,
      documents_used: 0,
    })
    .eq("id", userRow.org_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    plan,
    plan_name: getPlanById(plan).name,
    documents_limit: documentsLimit,
    users_limit: limits.users_limit,
  });
}
