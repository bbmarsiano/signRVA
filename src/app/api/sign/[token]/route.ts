// POST /api/sign/[token] — submit signature, embed PDF, p7s, audit log, notify parties
import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { embedSignature } from "@/lib/pdf/embed-signature";
import { sendSignedEmails } from "@/lib/email/send-signed";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchDocumentByToken, resolveDocumentStatus } from "@/lib/sign/fetch-document";
import type { BiometricType } from "@/types";

const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

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
    const signedAt = new Date();
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const userAgent = request.headers.get("user-agent") ?? "unknown";
    const recipientName = document.recipient_name;
    const recipientEmail = document.recipient_email;

    const { data: originalFile, error: downloadError } = await supabaseAdmin.storage
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
      recipientName,
      signedAt,
      ip: ipAddress,
      userAgent,
    });

    const canvasPath = `signatures/${document.id}/canvas.png`;
    const signedPdfPath = `${organization.id}/${document.id}/signed.pdf`;
    const p7sPath = `signatures/${document.id}/signature.p7s`;

    const p7sContent = JSON.stringify({
      version: "1.0",
      type: "attached-signature",
      document_id: document.id,
      signed_by: recipientName,
      signed_at: signedAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      canvas_hash: createHash("sha256").update(canvasData).digest("hex"),
      document_hash: createHash("sha256").update(signedPdfBytes).digest("hex"),
    });

    await supabaseAdmin.storage.from("documents").upload(canvasPath, signaturePng, {
      contentType: "image/png",
      upsert: true,
    });

    const { error: signedUploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(signedPdfPath, signedPdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (signedUploadError) {
      console.error("Signed PDF upload error:", signedUploadError);
      return NextResponse.json(
        { error: "Грешка при запис на подписания PDF." },
        { status: 500 }
      );
    }

    const { error: p7sUploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(p7sPath, Buffer.from(p7sContent, "utf-8"), {
        contentType: "application/json",
        upsert: true,
      });

    if (p7sUploadError) {
      console.error("p7s upload error:", p7sUploadError);
    }

    const signedAtIso = signedAt.toISOString();

    await supabaseAdmin
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

    await supabaseAdmin.from("signatures").insert({
      id: randomUUID(),
      document_id: document.id,
      canvas_data_path: canvasPath,
      webauthn_credential_id: webauthnCredentialId,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_info: { biometric_type: biometricType },
      biometric_type: biometricType,
      p7s_path: p7sPath,
      signed_pdf_path: signedPdfPath,
      timestamp: signedAtIso,
    });

    const { data: auditRow, error: auditError } = await supabaseAdmin
      .from("audit_log")
      .insert({
        org_id: document.org_id,
        document_id: document.id,
        event_type: "document.signed",
        actor: `${recipientName} <${recipientEmail}>`,
        metadata: {
          ip: ipAddress,
          device: userAgent,
          biometric_type: biometricType,
          signed_pdf_path: signedPdfPath,
          p7s_path: p7sPath,
        },
        ip_address: ipAddress,
        created_at: signedAtIso,
      })
      .select("id")
      .single();

    if (auditError) {
      console.error("Audit log insert error:", auditError);
    } else {
      console.log("Audit log inserted:", auditRow?.id);
    }

    const { sendOrgWebhooks } = await import("@/lib/webhooks/send-webhook");
    void sendOrgWebhooks(document.org_id, "document.signed", {
      document_id: document.id,
      status: "signed",
      signed_at: signedAtIso,
      recipient_email: recipientEmail,
    });

    const { data: signedUrlData } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(signedPdfPath, SIGNED_URL_TTL_SECONDS);

    const { data: p7sUrlData } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(p7sPath, SIGNED_URL_TTL_SECONDS);

    const signedPdfUrl = signedUrlData?.signedUrl ?? null;
    const p7sUrl = p7sUrlData?.signedUrl ?? null;

    const { data: owner } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("org_id", document.org_id)
      .eq("role", "owner")
      .limit(1)
      .single();

    if (process.env.RESEND_API_KEY && owner?.email) {
      try {
        await sendSignedEmails({
          recipientEmail,
          recipientName,
          ownerEmail: owner.email,
          title: document.title,
          signedPdfBytes,
          documentId: document.id,
          p7sPath,
          signedAt: signedAtIso,
          ipAddress,
        });
        console.log("[sign] Signed confirmation emails sent");
      } catch (emailErr) {
        console.error("[sign] Resend error (non-blocking):", emailErr);
      }
    } else {
      console.warn("[sign] Skipping emails:", {
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasOwner: !!owner?.email,
      });
    }

    return NextResponse.json({
      success: true,
      signed_pdf_url: signedPdfUrl,
      p7s_url: p7sUrl,
      signed_at: signedAtIso,
      document_id: document.id,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      biometric_type: biometricType,
    });
  } catch (error) {
    console.error("Sign API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
