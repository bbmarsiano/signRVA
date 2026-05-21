// send-signed — Resend signed confirmation with PDF + p7s attachments (no download buttons)
import { Resend } from "resend";
import { getResendFrom } from "@/lib/email/from";
import { formatEmailDateTime } from "@/lib/utils/format-datetime";
import { supabaseAdmin } from "@/lib/supabase/admin";

function safeFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9\u0400-\u04FF_-]/g, "_").slice(0, 80) || "document";
}

type ResendAttachment = {
  filename: string;
  content: Buffer;
  content_type?: string;
};

async function buildAttachments(
  title: string,
  signedPdfBytes: Uint8Array | undefined,
  p7sPath: string | null | undefined
): Promise<ResendAttachment[]> {
  const base = safeFilename(title);
  const attachments: ResendAttachment[] = [];

  if (signedPdfBytes && signedPdfBytes.length > 0) {
    attachments.push({
      filename: `${base}-signed.pdf`,
      content: Buffer.from(signedPdfBytes),
      content_type: "application/pdf",
    });
  }

  if (p7sPath) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from("documents")
        .download(p7sPath);

      if (!error && data) {
        attachments.push({
          filename: `${base}-signature.p7s`,
          content: Buffer.from(await data.arrayBuffer()),
          content_type: "application/pkcs7-signature",
        });
      }
    } catch (err) {
      console.warn("p7s attachment failed:", err);
    }
  }

  return attachments;
}

export async function sendSignedEmails({
  recipientEmail,
  recipientName,
  ownerEmail,
  title,
  signedPdfBytes,
  documentId,
  p7sPath,
  signedAt,
  ipAddress,
}: {
  recipientEmail: string;
  recipientName: string;
  ownerEmail: string;
  title: string;
  signedPdfBytes?: Uint8Array;
  documentId: string;
  p7sPath?: string | null;
  signedAt: string;
  ipAddress: string;
}): Promise<void> {
  console.log("Resend API Key exists:", !!process.env.RESEND_API_KEY);
  console.log("Sending signed confirmation to:", recipientEmail);
  console.log("Sending signed copy to owner:", ownerEmail);

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = getResendFrom();
  const attachments = await buildAttachments(title, signedPdfBytes, p7sPath);
  const formattedDate = formatEmailDateTime(signedAt);
  const shortId = documentId.slice(0, 8);
  const attachmentPayload =
    attachments.length > 0 ? attachments : undefined;

  const recipientHtml = `
    <p>Здравейте ${recipientName},</p>
    <p>Документът <strong>${title}</strong> беше подписан успешно.</p>
    <p>Намирате подписания PDF и файла с електронен подпис (.p7s) като прикачени файлове към този имейл.</p>
    <p>Дата на подписване: ${formattedDate}<br>
    ID на документа: #${shortId}</p>
    <p><a href="https://sign.runverifiedapp.com">sign.runverifiedapp.com</a></p>
  `;

  const ownerHtml = `
    <p>Документът <strong>${title}</strong> беше подписан от ${recipientName} (${recipientEmail}).</p>
    <p>Намирате подписания PDF и файла с електронен подпис (.p7s) като прикачени файлове към този имейл.</p>
    <p>Дата: ${formattedDate}<br>
    IP: ${ipAddress}</p>
    <p><a href="https://sign.runverifiedapp.com">sign.runverifiedapp.com</a></p>
  `;

  const recipientResult = await resend.emails.send({
    from,
    to: recipientEmail,
    subject: `Документът беше подписан: ${title}`,
    html: recipientHtml,
    attachments: attachmentPayload,
  });
  console.log("Recipient signed email result:", recipientResult);

  const ownerResult = await resend.emails.send({
    from,
    to: ownerEmail,
    subject: `Документът беше подписан: ${title}`,
    html: ownerHtml,
    attachments: attachmentPayload,
  });
  console.log("Owner signed email result:", ownerResult);
}
