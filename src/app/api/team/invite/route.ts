// POST /api/team/invite — invite member by email
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { sendTeamInviteEmail } from "@/lib/email/send-team-invite";
import { getTeamAuthContext } from "@/lib/team/auth";
import { getPlanById } from "@/lib/stripe/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const ctx = await getTeamAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (ctx.userRole !== "owner") {
    return NextResponse.json(
      { error: "Само собственикът може да кани членове." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const email = (body?.email as string)?.trim().toLowerCase();
  const role = (body?.role as string)?.trim() || "member";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Въведете валиден имейл." }, { status: 400 });
  }

  const orgId = ctx.orgId;
  const plan = getPlanById(ctx.orgPlan);

  const { count: memberCount } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  const { count: pendingCount } = await supabaseAdmin
    .from("pending_invites")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .is("accepted_at", null);

  const total = (memberCount ?? 0) + (pendingCount ?? 0);
  if (plan.users_limit > 0 && total >= plan.users_limit) {
    return NextResponse.json(
      { error: "Достигнахте лимита на потребители за вашия план." },
      { status: 403 }
    );
  }

  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("org_id", orgId)
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json(
      { error: "Този имейл вече е в организацията." },
      { status: 409 }
    );
  }

  const { data: existingInvite } = await supabaseAdmin
    .from("pending_invites")
    .select("id")
    .eq("org_id", orgId)
    .eq("email", email)
    .is("accepted_at", null)
    .maybeSingle();

  if (existingInvite) {
    return NextResponse.json(
      { error: "Вече има изпратена покана за този имейл." },
      { status: 409 }
    );
  }

  const inviteRole = role === "admin" ? "admin" : "member";

  const { error: insertError } = await supabaseAdmin
    .from("pending_invites")
    .insert({
      id: randomUUID(),
      org_id: orgId,
      email,
      role: inviteRole,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    await sendTeamInviteEmail({
      to: email,
      orgName: ctx.orgName,
      orgId,
    });
  } catch (err) {
    console.error("[team/invite] email error:", err);
  }

  await supabaseAdmin.from("audit_log").insert({
    org_id: orgId,
    document_id: null,
    event_type: "api.request",
    actor: ctx.userEmail,
    metadata: { action: "team.invite", email, role: inviteRole },
    ip_address: "dashboard",
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
