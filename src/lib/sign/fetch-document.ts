// fetch-document — load document + organization by public sign token
import { createAdminClient } from "@/lib/supabase/admin";
import type { Document, Organization } from "@/types";

export type SignDocumentPayload = {
  document: Document;
  organization: Organization;
  previewUrl: string | null;
};

export async function fetchDocumentByToken(
  token: string
): Promise<SignDocumentPayload | null> {
  const supabase = createAdminClient();

  const { data: document, error } = await supabase
    .from("documents")
    .select("*")
    .eq("sign_url_token", token)
    .single<Document>();

  if (error || !document) return null;

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", document.org_id)
    .single<Organization>();

  if (!organization) return null;

  const { data: signed } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.file_path, 3600);

  return {
    document,
    organization,
    previewUrl: signed?.signedUrl ?? null,
  };
}

export function resolveDocumentStatus(document: Document): Document["status"] {
  if (document.status === "signed") return "signed";
  if (document.status === "expired") return "expired";
  if (new Date(document.expires_at).getTime() < Date.now()) return "expired";
  return document.status;
}
