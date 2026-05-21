// GET /api/sign/[token]/preview — public PDF preview for signers (no auth)
import { NextResponse } from "next/server";
import { fetchDocumentByToken } from "@/lib/sign/fetch-document";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const payload = await fetchDocumentByToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { document } = payload;
  const storagePath = document.file_path;

  const { data, error } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "No PDF" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
