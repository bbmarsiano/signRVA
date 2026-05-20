// POST /api/sign/[token] — submit signature, embed PDF, notify parties
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { embedSignature } from "@/lib/pdf/embed-signature";
import { sendSignedEmails } from "@/lib/email/send-signed";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDocumentByToken, resolveDocumentStatus } from "@/lib/sign/fetch-document";
import type { BiometricType, Document } from "@/types";

function parseBiometricType(value: string | null): BiometricType {
  if (value === "face_id" || value === "touch_id") return value;
  return "none";
}

function base64ToUint8Array(base64: string): Uint8Array {
  const raw = base64.replace(/^data:image\/png;base64,/, "");
  const binary = Buffer.from(raw, "base64");
  return new Uint8Array(binary);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const payload = await fetchDocumentByToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Документът не е намерен." }, { status: 404 });
  }

  const { document, organization } = payload;
  const status = resolveDocumentStatus(document);

  if (status === "expired") {
    return NextResponse.json({ error: "Документът е изтекъл." }, { status: 410 });
  }

  if (status === "signed") {
    return NextResponse.json({ error: "Документът вече е подписан." }, { status: 409 });
  }

  const formData = await request.formData();
  const canvasData = formData.get("canvas_data") as string | null;
  const biometricType = parseBiometricType(
    formData.get("biometric_type") as string | null
  );
  const webauthnRaw = formData.get("webauthn_credential") as string | null;

  if (!canvasData) {
    return NextResponse.json({ error: "Липсва подпис." }, { status: 400 });
  }

  const signaturePng = base64ToUint8Array(canvasData);
  const supabase = createAdminClient();
  const signedAt = new Date();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  const { data: originalFile, error: downloadError } = await supabase.storage
    .from("documents")
    .download(document.file_path);

  if (downloadError || !originalFile) {
    return NextResponse.json(
      { error: "Грешка при зареждане на PDF." },
      { status: 500 }
    );
  }

  const originalBytes = new Uint8Array(await originalFile.arrayBuffer());
  const signedPdfBytes = await embedSignature(originalBytes, signaturePng, {
    recipientName: document.recipient_name,
    signedAt,
    ip,
    userAgent,
  });

  const canvasPath = `signatures/${document.id}/canvas.png`;
  const signedPath = `${organization.id}/${document.id}/signed.pdf`;

  await supabase.storage.from("documents").upload(canvasPath, signaturePng, {
    contentType: "image/png",
    upsert: true,
  });

  const { error: signedUploadError } = await supabase.storage
    .from("documents")
    .upload(signedPath, signedPdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (signedUploadError) {
    return NextResponse.json(
      { error: "Грешка при запис на подписания PDF." },
      { status: 500 }
    );
  }

  const signedAtIso = signedAt.toISOString();

  await supabase
    .from("documents")
    .update({ status: "signed", signed_at: signedAtIso })
    .eq("id", document.id);

  let webauthnCredentialId: string | null = null;
  if (webauthnRaw) {
    try {
      const parsed = JSON.parse(webauthnRaw) as { id?: string };
      webauthnCredentialId = parsed.id ?? null;
    } catch {
      webauthnCredentialId = null;
    }
  }

  await supabase.from("signatures").insert({
    id: randomUUID(),
    document_id: document.id,
    canvas_data_path: canvasPath,
    webauthn_credential_id: webauthnCredentialId,
    ip_address: ip,
    user_agent: userAgent,
    device_info: { biometric_type: biometricType },
    biometric_type: biometricType,
    p7s_path: null,
    signed_pdf_path: signedPath,
    timestamp: signedAtIso,
  });

  await supabase.from("audit_log").insert({
    org_id: document.org_id,
    document_id: document.id,
    event_type: "document.signed",
    actor: document.recipient_email,
    metadata: { biometric_type: biometricType, ip },
    ip_address: ip,
    created_at: signedAtIso,
  });

  const { sendOrgWebhooks } = await import("@/lib/webhooks/send-webhook");
  void sendOrgWebhooks(document.org_id, "document.signed", {
    document_id: document.id,
    status: "signed",
    signed_at: signedAtIso,
    recipient_email: document.recipient_email,
  });

  const { data: owner } = await supabase
    .from("users")
    .select("email")
    .eq("org_id", document.org_id)
    .eq("role", "owner")
    .limit(1)
    .single();

  if (process.env.RESEND_API_KEY && owner?.email) {
    try {
      await sendSignedEmails({
        recipientEmail: document.recipient_email,
        recipientName: document.recipient_name,
        ownerEmail: owner.email,
        title: document.title,
        signedPdfBytes,
        documentId: document.id,
      });
    } catch {
      // Signing succeeded; email failure is non-blocking
    }
  }

  const { data: signedUrlData } = await supabase.storage
    .from("documents")
    .createSignedUrl(signedPath, 3600);

  return NextResponse.json({
    success: true,
    signed_pdf_url: signedUrlData?.signedUrl ?? null,
    signed_at: signedAtIso,
    document_id: document.id,
    recipient_name: document.recipient_name,
    recipient_email: document.recipient_email,
    biometric_type: biometricType,
  });
}
