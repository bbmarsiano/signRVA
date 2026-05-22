// POST /api/team/remove — remove member from organization
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
      { error: "Само собственикът може да премахва членове." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const userId = body?.user_id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Липсва user_id." }, { status: 400 });
  }

  if (userId === ctx.userId) {
    return NextResponse.json(
      { error: "Не можете да премахнете себе си." },
      { status: 400 }
    );
  }

  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, role, org_id")
    .eq("id", userId)
    .eq("org_id", ctx.orgId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Потребителят не е намерен." }, { status: 404 });
  }

  if (target.role === "owner") {
    return NextResponse.json(
      { error: "Не можете да премахнете собственик." },
      { status: 403 }
    );
  }

  const { error } = await supabaseAdmin.from("users").delete().eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
