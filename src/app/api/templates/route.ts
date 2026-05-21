// GET /api/templates — list system + org custom templates
import { NextResponse } from "next/server";
import { fetchTemplatesForOrg } from "@/lib/templates/db";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
    }

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    const { system, custom } = await fetchTemplatesForOrg(
      userRow?.org_id ?? null
    );

    return NextResponse.json({ system, custom });
  } catch (error) {
    console.error("Templates list error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
