// POST /api/team/accept-invite — join organization from pending invite (reconcile)
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const orgId = (body?.org_id as string)?.trim();

  if (!orgId) {
    return NextResponse.json({ error: "Липсва org_id." }, { status: 400 });
  }

  const email = user.email.toLowerCase();

  const { data: invite } = await supabaseAdmin
    .from("pending_invites")
    .select("id, role")
    .eq("org_id", orgId)
    .eq("email", email)
    .is("accepted_at", null)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json(
      { error: "Поканата не е намерена или вече е приета." },
      { status: 404 }
    );
  }

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .maybeSingle();

  if (!org) {
    return NextResponse.json(
      { error: "Организацията не е намерена." },
      { status: 404 }
    );
  }

  const memberRole =
    invite.role === "admin" || invite.role === "member"
      ? invite.role
      : "member";

  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id, org_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (existingUser) {
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        org_id: orgId,
        role: memberRole === "admin" ? "member" : memberRole,
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id: user.id,
      org_id: orgId,
      email,
      role: memberRole === "admin" ? "member" : memberRole,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  await supabaseAdmin
    .from("pending_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ success: true, org_id: orgId });
}
