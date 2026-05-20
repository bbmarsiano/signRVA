// DELETE /api/api-keys/[id] — revoke API key
import { NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/dashboard/session";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", id)
    .eq("org_id", session.organization.id);

  if (error) {
    return NextResponse.json({ error: "Грешка при изтриване." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
