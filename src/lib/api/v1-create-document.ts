// v1-create-document — shared logic for REST API document creation
import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { getAppUrl } from "@/lib/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWithinLimit } from "@/lib/stripe/plans";
import type { Organization } from "@/types";

const MAX_BYTES = 20 * 1024 * 1024;

export type V1CreateDocumentBody = {
  title: string;
  recipient_email: string;
  recipient_name: string;
  recipient_phone?: string;
  ttl_hours?: number;
  biometric_required?: boolean;
  pdf_base64: string;
};

export async function createDocumentViaApi(
  org: Organization,
  body: V1CreateDocumentBody,
  actor: string
) {
  if (!isWithinLimit(org)) {
    throw new Error("DOCUMENT_LIMIT");
  }

  const title = body.title?.trim();
  const recipientEmail = body.recipient_email?.trim();
  const recipientName = body.recipient_name?.trim();

  if (!title || !recipientEmail || !recipientName) {
    throw new Error("VALIDATION");
  }

  if (!body.pdf_base64) {
    throw new Error("PDF_REQUIRED");
  }

  const pdfBytes = Uint8Array.from(
    Buffer.from(body.pdf_base64.replace(/^data:application\/pdf;base64,/, ""), "base64")
  );

  if (pdfBytes.length > MAX_BYTES) {
    throw new Error("PDF_TOO_LARGE");
  }

  const ttlHours = body.ttl_hours ?? 48;
  const documentId = randomUUID();
  const signUrlToken = randomUUID();
  const expiresAt = new Date(
    Date.now() + ttlHours * 60 * 60 * 1000
  ).toISOString();
  const storagePath = `${org.id}/${documentId}/original.pdf`;
  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, pdfBytes, { contentType: "application/pdf" });

  if (uploadError) throw new Error("UPLOAD");

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    org_id: org.id,
    title,
    file_path: storagePath,
    status: "pending",
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    recipient_phone: body.recipient_phone?.trim() || null,
    ttl_hours: ttlHours,
    sign_url_token: signUrlToken,
    biometric_required: body.biometric_required ?? true,
    attached_signature: true,
    internal_note: null,
    created_at: new Date().toISOString(),
    signed_at: null,
    expires_at: expiresAt,
  });

  if (insertError) {
    await supabase.storage.from("documents").remove([storagePath]);
    throw new Error("INSERT");
  }

  const signUrl = `${getAppUrl()}/sign/${signUrlToken}`;
  const qrUrl = await QRCode.toDataURL(signUrl, { width: 320, margin: 1 });

  await supabase.from("audit_log").insert({
    org_id: org.id,
    document_id: documentId,
    event_type: "api.request",
    actor,
    metadata: { endpoint: "POST /v1/documents" },
    ip_address: "api",
    created_at: new Date().toISOString(),
  });

  await supabase
    .from("organizations")
    .update({ documents_used: org.documents_used + 1 })
    .eq("id", org.id);

  return {
    id: documentId,
    qr_url: qrUrl,
    sign_url: signUrl,
    expires_at: expiresAt,
    token: signUrlToken,
  };
}
