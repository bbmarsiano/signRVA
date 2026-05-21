// fetch-document — load document + organization by public sign token
import { createAdminClient } from "@/lib/supabase/admin";
import { findSignerByToken, getSigningType } from "@/lib/sign/signers";
import type { Document, Organization } from "@/types";

export type SignDocumentPayload = {
  document: Document;
  organization: Organization;
  previewUrl: string | null;
  signerIndex: number;
  signerLabel: string | null;
  progressLabel: string | null;
};

export async function fetchDocumentByToken(
  token: string
): Promise<SignDocumentPayload | null> {
  const supabase = createAdminClient();

  let document: Document | null = null;

  const { data: byColumn } = await supabase
    .from("documents")
    .select("*")
    .eq("sign_url_token", token)
    .maybeSingle<Document>();

  if (byColumn) {
    document = byColumn;
  } else {
    const { data: rows } = await supabase
      .from("documents")
      .select("*")
      .in("signing_type", ["two_sided", "self_sign"]);

    document =
      rows?.find((row) => findSignerByToken(row as Document, token) !== null) ??
      null;
  }

  if (!document) return null;

  const match = findSignerByToken(document, token);
  if (!match) return null;

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", document.org_id)
    .single<Organization>();

  if (!organization) return null;

  const signingType = getSigningType(document);
  const previewPath =
    document.status === "signed" || signingType === "two_sided"
      ? `${document.org_id}/${document.id}/signed.pdf`
      : document.file_path;

  const { data: signed } = await supabase.storage
    .from("documents")
    .createSignedUrl(previewPath, 3600);

  let previewUrl = signed?.signedUrl ?? null;
  if (!previewUrl && previewPath !== document.file_path) {
    const { data: original } = await supabase.storage
      .from("documents")
      .createSignedUrl(document.file_path, 3600);
    previewUrl = original?.signedUrl ?? null;
  }

  const total = document.signers?.length ?? 1;
  let signerLabel: string | null = null;
  if (signingType === "two_sided" && total > 1) {
    signerLabel = `Подписвате като Страна ${match.index + 1} от ${total}`;
  } else if (signingType === "self_sign") {
    signerLabel = "Подписвате собствен документ";
  }

  const signedCount =
    document.signers?.filter((s) => s.status === "signed").length ?? 0;
  const progressLabel =
    signingType === "two_sided" && total > 1 && signedCount > 0
      ? `${signedCount} от ${total} подписи завършени`
      : null;

  return {
    document,
    organization,
    previewUrl,
    signerIndex: match.index,
    signerLabel,
    progressLabel,
  };
}

export function resolveDocumentStatus(document: Document): Document["status"] {
  if (document.status === "signed") return "signed";
  if (document.status === "expired") return "expired";
  if (new Date(document.expires_at).getTime() < Date.now()) return "expired";
  return document.status;
}
