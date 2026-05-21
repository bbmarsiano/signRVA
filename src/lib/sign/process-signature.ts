// process-signature — shared signing logic for public sign and self-sign routes
import { createHash, randomUUID } from "crypto";
import QRCode from "qrcode";
import {
  embedSignature,
  type SignerPosition,
} from "@/lib/pdf/embed-signature";
import { sendSigningInvite, buildSignUrl } from "@/lib/email/send-document";
import { sendSignedEmails } from "@/lib/email/send-signed";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  allSignersSigned,
  canSignerSignNow,
  findSignerByToken,
  getSigningType,
  parseSigners,
} from "@/lib/sign/signers";
import type { BiometricType, Document, DocumentSigner } from "@/types";

const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

export type ProcessSignatureInput = {
  document: Document;
  orgId: string;
  token: string;
  signaturePng: Uint8Array;
  canvasDataBase64: string;
  signedAt: Date;
  ipAddress: string;
  userAgent: string;
  biometricType: BiometricType;
  webauthnCredentialId: string | null;
};

export type ProcessSignatureResult = {
  signedAtIso: string;
  signedPdfUrl: string | null;
  p7sUrl: string | null;
  message?: string;
  pendingNextSigner?: boolean;
  allComplete: boolean;
};

function resolveSignerPosition(
  signingType: ReturnType<typeof getSigningType>,
  signerIndex: number,
  signerCount: number
): SignerPosition {
  if (signingType !== "two_sided" || signerCount <= 1) {
    return "single";
  }
  return signerIndex === 0 ? "left" : "right";
}

async function loadPdfForSigning(
  orgId: string,
  document: Document,
  signerIndex: number,
  signingType: ReturnType<typeof getSigningType>
): Promise<Uint8Array> {
  const signers = parseSigners(document);
  const isMultiSigner =
    signingType === "two_sided" && signers.length >= 2;
  const isFirstSigner = signerIndex === 0;

  if (isMultiSigner && !isFirstSigner) {
    const signedPath = `${orgId}/${document.id}/signed.pdf`;
    const { data: partial } = await supabaseAdmin.storage
      .from("documents")
      .download(signedPath);

    if (partial) {
      return new Uint8Array(await partial.arrayBuffer());
    }
  }

  const { data: original, error } = await supabaseAdmin.storage
    .from("documents")
    .download(document.file_path);

  if (error || !original) {
    throw new Error("Грешка при зареждане на PDF.");
  }

  return new Uint8Array(await original.arrayBuffer());
}

async function emailNextSigner(
  document: Document,
  nextSigner: DocumentSigner
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const signUrl = buildSignUrl(nextSigner.sign_url_token);
  await sendSigningInvite({
    recipientEmail: nextSigner.email,
    recipientName: nextSigner.name,
    title: document.title,
    signUrl,
    expiresAt: document.expires_at,
  });
}

export async function processDocumentSignature(
  input: ProcessSignatureInput
): Promise<ProcessSignatureResult> {
  const {
    document,
    orgId,
    token,
    signaturePng,
    canvasDataBase64,
    signedAt,
    ipAddress,
    userAgent,
    biometricType,
    webauthnCredentialId,
  } = input;

  const match = findSignerByToken(document, token);
  if (!match) {
    throw new Error("Невалиден линк за подписване.");
  }

  if (!canSignerSignNow(document, match.index)) {
    throw new Error("Не е вашият ред за подписване или вече сте подписали.");
  }

  const { signer, index: signerIndex } = match;
  const signingType = getSigningType(document);
  const signedAtIso = signedAt.toISOString();
  const signers = parseSigners(document);
  const signerCount = Math.max(
    signers.length,
    signingType === "two_sided" ? 2 : 1
  );
  const position = resolveSignerPosition(
    signingType,
    signerIndex,
    signers.length >= 2 ? signers.length : signerCount
  );

  const pdfBytes = await loadPdfForSigning(
    orgId,
    document,
    signerIndex,
    signingType
  );
  const signedPdfBytes = await embedSignature(
    pdfBytes,
    signaturePng,
    {
      recipientName: signer.name,
      signedAt,
      ip: ipAddress,
      userAgent,
    },
    position
  );

  const canvasPath = `signatures/${document.id}/${signerIndex}/canvas.png`;
  const signedPdfPath = `${orgId}/${document.id}/signed.pdf`;
  const p7sPath = `signatures/${document.id}/${signerIndex}/signature.p7s`;

  const p7sContent = JSON.stringify({
    version: "1.0",
    type: "attached-signature",
    document_id: document.id,
    signer_index: signerIndex,
    signed_by: signer.name,
    signed_at: signedAtIso,
    ip_address: ipAddress,
    user_agent: userAgent,
    canvas_hash: createHash("sha256").update(canvasDataBase64).digest("hex"),
    document_hash: createHash("sha256").update(signedPdfBytes).digest("hex"),
  });

  await supabaseAdmin.storage.from("documents").upload(canvasPath, signaturePng, {
    contentType: "image/png",
    upsert: true,
  });

  await supabaseAdmin.storage.from("documents").upload(signedPdfPath, signedPdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });

  await supabaseAdmin.storage
    .from("documents")
    .upload(p7sPath, Buffer.from(p7sContent, "utf-8"), {
      contentType: "application/json",
      upsert: true,
    });

  const parsedSigners = parseSigners(document);
  const hasSignersInDb = parsedSigners.length > 0;

  let updatedSigners = parsedSigners;
  if (hasSignersInDb) {
    updatedSigners = updatedSigners.map((s, i) =>
      i === signerIndex
        ? { ...s, status: "signed" as const, signed_at: signedAtIso }
        : s
    );
  }

  const docAfterSigner: Document = {
    ...document,
    signers: hasSignersInDb ? updatedSigners : document.signers,
    current_signer_index: document.current_signer_index ?? 0,
  };

  const everyoneSigned =
    (!hasSignersInDb && signingType === "one_sided") ||
    allSignersSigned(docAfterSigner);

  if (everyoneSigned) {
    const updatePayload: {
      status: string;
      signed_at: string;
      all_signed_at: string;
      signers?: DocumentSigner[];
    } = {
      status: "signed",
      signed_at: signedAtIso,
      all_signed_at: signedAtIso,
    };
    if (hasSignersInDb) {
      updatePayload.signers = updatedSigners;
    }

    await supabaseAdmin
      .from("documents")
      .update(updatePayload)
      .eq("id", document.id);
  } else {
    const nextIndex = signerIndex + 1;
    await supabaseAdmin
      .from("documents")
      .update({
        signers: updatedSigners,
        current_signer_index: nextIndex,
      })
      .eq("id", document.id);

    if (
      signingType === "two_sided" &&
      document.signing_order === "sequential" &&
      updatedSigners[nextIndex]
    ) {
      try {
        await emailNextSigner(document, updatedSigners[nextIndex]);
      } catch (err) {
        console.error("[sign] Next signer email failed:", err);
      }
    }
  }

  await supabaseAdmin.from("signatures").insert({
    id: randomUUID(),
    document_id: document.id,
    canvas_data_path: canvasPath,
    webauthn_credential_id: webauthnCredentialId,
    ip_address: ipAddress,
    user_agent: userAgent,
    device_info: { biometric_type: biometricType, signer_index: signerIndex },
    biometric_type: biometricType,
    p7s_path: p7sPath,
    signed_pdf_path: signedPdfPath,
    timestamp: signedAtIso,
  });

  await supabaseAdmin.from("audit_log").insert({
    org_id: document.org_id,
    document_id: document.id,
    event_type: "document.signed",
    actor: `${signer.name} <${signer.email}>`,
    metadata: {
      ip: ipAddress,
      device: userAgent,
      signer_index: signerIndex,
      signing_type: signingType,
      all_complete: everyoneSigned,
    },
    ip_address: ipAddress,
    created_at: signedAtIso,
  });

  if (everyoneSigned) {
    const { sendOrgWebhooks } = await import("@/lib/webhooks/send-webhook");
    void sendOrgWebhooks(document.org_id, "document.signed", {
      document_id: document.id,
      status: "signed",
      signed_at: signedAtIso,
      recipient_email: signer.email,
    });

    const { data: owner } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("org_id", document.org_id)
      .eq("role", "owner")
      .limit(1)
      .single();

    if (process.env.RESEND_API_KEY && owner?.email) {
      const emailsToNotify =
        signingType === "two_sided"
          ? updatedSigners.map((s) => ({ email: s.email, name: s.name }))
          : [{ email: signer.email, name: signer.name }];

      for (let i = 0; i < emailsToNotify.length; i++) {
        const party = emailsToNotify[i];
        try {
          await sendSignedEmails({
            recipientEmail: party.email,
            recipientName: party.name,
            ownerEmail: owner.email,
            title: document.title,
            signedPdfBytes,
            documentId: document.id,
            p7sPath,
            signedAt: signedAtIso,
            ipAddress,
            notifyOwner: i === 0,
          });
        } catch (emailErr) {
          console.error("[sign] Final email error:", emailErr);
        }
      }
    }
  }

  const { data: signedUrlData } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(signedPdfPath, SIGNED_URL_TTL_SECONDS);

  const { data: p7sUrlData } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(p7sPath, SIGNED_URL_TTL_SECONDS);

  const pendingNext =
    !everyoneSigned &&
    signingType === "two_sided" &&
    document.signing_order === "sequential";

  return {
    signedAtIso,
    signedPdfUrl: everyoneSigned ? (signedUrlData?.signedUrl ?? null) : null,
    p7sUrl: p7sUrlData?.signedUrl ?? null,
    message: pendingNext
      ? "Документът е изпратен на следващата страна"
      : undefined,
    pendingNextSigner: pendingNext,
    allComplete: everyoneSigned,
  };
}

export async function generateQrForToken(token: string): Promise<string> {
  const signUrl = buildSignUrl(token);
  return QRCode.toDataURL(signUrl, { width: 320, margin: 1 });
}
