// POST /api/sign/[token] — submit signature (one_sided, two_sided, multi-signer)
import { NextResponse } from "next/server";
import { fetchDocumentByToken, resolveDocumentStatus } from "@/lib/sign/fetch-document";
import { findSignerByToken, getSigningType } from "@/lib/sign/signers";
import { processDocumentSignature } from "@/lib/sign/process-signature";
import { buildFilledPdfFromDocument } from "@/lib/templates/regenerate-pdf";
import type { BiometricType } from "@/types";

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
  try {
    const { token } = await params;
    const payload = await fetchDocumentByToken(token);

    if (!payload) {
      return NextResponse.json({ error: "Документът не е намерен." }, { status: 404 });
    }

    const { document, organization } = payload;
    const signingType = getSigningType(document);

    if (signingType === "self_sign") {
      return NextResponse.json(
        { error: "Използвайте страницата за самоподпис в панела." },
        { status: 400 }
      );
    }

    const status = resolveDocumentStatus(document);

    if (status === "expired") {
      return NextResponse.json({ error: "Документът е изтекъл." }, { status: 410 });
    }

    if (status === "signed") {
      return NextResponse.json({ error: "Документът вече е подписан." }, { status: 409 });
    }

    const signerMatch = findSignerByToken(document, token);
    if (signerMatch?.signer.status === "signed") {
      return NextResponse.json({ error: "Вече сте подписали този документ." }, { status: 409 });
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

    let webauthnCredentialId: string | null = null;
    if (webauthnRaw) {
      try {
        const parsed = JSON.parse(webauthnRaw) as { id?: string };
        webauthnCredentialId = parsed.id ?? null;
      } catch {
        webauthnCredentialId = null;
      }
    }

    const signedAt = new Date();
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const userAgent = request.headers.get("user-agent") ?? "unknown";

    let basePdfBytes: Uint8Array | undefined;
    if (document.template_id) {
      const signerIndex = signerMatch?.index ?? 0;
      const isFirstSigner = signerIndex === 0;
      if (signingType !== "two_sided" || isFirstSigner) {
        const filled = await buildFilledPdfFromDocument(document);
        if (filled) {
          basePdfBytes = filled;
        }
      }
    }

    const result = await processDocumentSignature({
      document,
      orgId: organization.id,
      token,
      signaturePng: base64ToUint8Array(canvasData),
      canvasDataBase64: canvasData,
      signedAt,
      ipAddress,
      userAgent,
      biometricType,
      webauthnCredentialId,
      basePdfBytes,
    });

    const signer = signerMatch?.signer;

    return NextResponse.json({
      success: true,
      signed_pdf_url: result.signedPdfUrl,
      p7s_url: result.p7sUrl,
      signed_at: result.signedAtIso,
      document_id: document.id,
      recipient_name: signer?.name ?? document.recipient_name,
      recipient_email: signer?.email ?? document.recipient_email,
      biometric_type: biometricType,
      message: result.message,
      pending_next_signer: result.pendingNextSigner,
    });
  } catch (error) {
    console.error("Sign API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
