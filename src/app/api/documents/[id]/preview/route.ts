// GET /api/documents/[id]/preview — authenticated signed URL for original PDF (1h)
import { NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/dashboard/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Document } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: document, error } = await supabase
    .from("documents")
    .select("file_path, org_id")
    .eq("id", id)
    .eq("org_id", session.organization.id)
    .single<Pick<Document, "file_path" | "org_id">>();

  if (error || !document) {
    return NextResponse.json({ error: "Документът не е намерен." }, { status: 404 });
  }

  const { data, error: urlError } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.file_path, 3600);

  if (urlError || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Грешка при генериране на преглед." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: data.signedUrl, expires_in: 3600 });
}
