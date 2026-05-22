// POST /api/team/cancel-invite — cancel pending team invitation
import { NextResponse } from "next/server";
import { getTeamAuthContext } from "@/lib/team/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const ctx = await getTeamAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (ctx.userRole !== "owner") {
    return NextResponse.json(
      { error: "Само собственикът може да отменя покани." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const inviteId = body?.invite_id as string | undefined;

  if (!inviteId) {
    return NextResponse.json({ error: "Липсва invite_id." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("pending_invites")
    .delete()
    .eq("id", inviteId)
    .eq("org_id", ctx.orgId)
    .is("accepted_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
