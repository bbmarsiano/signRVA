// GET /api/v1/documents/[id]/status — document status (Bearer API key)
import { jsonApiError } from "@/lib/api/errors";
import { verifyApiKey } from "@/lib/api/verify-api-key";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Document } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { org_id } = await verifyApiKey(request);
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: document, error } = await supabase
      .from("documents")
      .select(
        "id, title, status, created_at, signed_at, expires_at, recipient_email"
      )
      .eq("id", id)
      .eq("org_id", org_id)
      .single<
        Pick<
          Document,
          | "id"
          | "title"
          | "status"
          | "created_at"
          | "signed_at"
          | "expires_at"
          | "recipient_email"
        >
      >();

    if (error || !document) {
      return Response.json({ error: "Документът не е намерен." }, { status: 404 });
    }

    return Response.json(document);
  } catch (err) {
    return jsonApiError(err);
  }
}
