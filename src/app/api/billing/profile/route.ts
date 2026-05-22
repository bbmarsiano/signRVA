// PATCH /api/billing/profile — save organization billing details and name
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!userRow?.org_id) {
    return NextResponse.json(
      { error: "Организацията не е намерена" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);

  const updates: Record<string, string | null> = {
    billing_name: (body?.billing_name as string)?.trim() || null,
    billing_eik: (body?.billing_eik as string)?.trim() || null,
    billing_address: (body?.billing_address as string)?.trim() || null,
    billing_vat: (body?.billing_vat as string)?.trim() || null,
  };

  const orgName = (body?.org_name as string)?.trim();
  if (orgName) {
    updates.name = orgName;
  }

  const { error } = await supabaseAdmin
    .from("organizations")
    .update(updates)
    .eq("id", userRow.org_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
