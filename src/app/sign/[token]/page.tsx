// Public signing page — mobile-first QR flow for signers (no auth required)
import SignAlreadySigned from "@/components/sign/SignAlreadySigned";
import SignExpired from "@/components/sign/SignExpired";
import SignForm from "@/components/sign/SignForm";
import SignNotFound from "@/components/sign/SignNotFound";
import {
  fetchDocumentByToken,
  resolveDocumentStatus,
} from "@/lib/sign/fetch-document";
import { findSignerByToken, getSigningType } from "@/lib/sign/signers";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await fetchDocumentByToken(token);

  if (!payload) {
    return <SignNotFound />;
  }

  const { document, organization, previewUrl } = payload;
  const status = resolveDocumentStatus(document);

  if (status === "expired") {
    if (document.status !== "expired") {
      const supabase = createAdminClient();
      await supabase
        .from("documents")
        .update({ status: "expired" })
        .eq("id", document.id);
    }
    return <SignExpired document={document} />;
  }

  if (status === "signed") {
    return <SignAlreadySigned document={document} />;
  }

  const signerMatch = findSignerByToken(document, token);
  if (signerMatch?.signer.status === "signed") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">
          Вече подписахте
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {getSigningType(document) === "two_sided"
            ? "Очаква се подпис от следващата страна."
            : "Документът е в процес на обработка."}
        </p>
      </div>
    );
  }

  const supabase = createAdminClient();
  await supabase.from("audit_log").insert({
    org_id: document.org_id,
    document_id: document.id,
    event_type: "document.viewed",
    actor: document.recipient_email,
    metadata: {},
    ip_address: "unknown",
    created_at: new Date().toISOString(),
  });

  return (
    <SignForm
      document={document}
      orgName={organization.name}
      previewUrl={previewUrl}
      token={token}
      signerLabel={payload.signerLabel}
      progressLabel={payload.progressLabel}
    />
  );
}
