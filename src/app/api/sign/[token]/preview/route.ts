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
  const signedPath = `${document.org_id}/${document.id}/signed.pdf`;

  const { data: signedUrl } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(signedPath, 3600);

  if (signedUrl?.signedUrl) {
    return NextResponse.redirect(signedUrl.signedUrl);
  }

  const originalPath =
    document.file_path ?? `${document.org_id}/${document.id}/original.pdf`;

  const { data: originalUrl } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(originalPath, 3600);

  if (originalUrl?.signedUrl) {
    return NextResponse.redirect(originalUrl.signedUrl);
  }

  return NextResponse.json({ error: "No PDF found" }, { status: 404 });
}
