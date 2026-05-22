// PATCH /api/billing/profile — save organization billing details
import { NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/dashboard/session";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const updates = {
    billing_name: (body?.billing_name as string)?.trim() || null,
    billing_eik: (body?.billing_eik as string)?.trim() || null,
    billing_address: (body?.billing_address as string)?.trim() || null,
    billing_vat: (body?.billing_vat as string)?.trim() || null,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", session.organization.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
