// GET /api/v1/documents/[id]/download — signed PDF download URL (Bearer API key)
import { jsonApiError } from "@/lib/api/errors";
import { verifyApiKey } from "@/lib/api/verify-api-key";
import { createAdminClient } from "@/lib/supabase/admin";

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
      .select("id, org_id, status")
      .eq("id", id)
      .eq("org_id", org_id)
      .single();

    if (error || !document) {
      return Response.json({ error: "Документът не е намерен." }, { status: 404 });
    }

    if (document.status !== "signed") {
      return Response.json(
        { error: "Документът все още не е подписан." },
        { status: 400 }
      );
    }

    const signedPath = `${org_id}/${id}/signed.pdf`;
    const { data: urlData, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(signedPath, 3600);

    if (urlError || !urlData?.signedUrl) {
      return Response.json(
        { error: "Подписаният PDF не е наличен." },
        { status: 404 }
      );
    }

    return Response.json({
      download_url: urlData.signedUrl,
      expires_in: 3600,
    });
  } catch (err) {
    return jsonApiError(err);
  }
}
