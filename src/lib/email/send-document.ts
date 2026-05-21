// send-document — Resend signing invite with CTA button
import { Resend } from "resend";
import { getResendFrom } from "@/lib/email/from";
import { getAppUrl } from "@/lib/app-url";

const PRIMARY = "#0F6E56";

function formatExpiresAt(iso: string): string {
  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}

export async function sendSigningInvite({
  recipientEmail,
  recipientName,
  title,
  signUrl,
  expiresAt,
}: {
  recipientEmail: string;
  recipientName: string;
  title: string;
  signUrl: string;
  expiresAt: string;
}): Promise<void> {
  console.log("Resend API Key exists:", !!process.env.RESEND_API_KEY);
  console.log("Sending invitation to:", recipientEmail);

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const expiryLabel = formatExpiresAt(expiresAt);

  const html = `
    <p>Здравейте ${recipientName},</p>
    <p>Моля подпишете документа <strong>${title}</strong> като кликнете на бутона или сканирате QR кода.</p>
    <p style="text-align:center;margin:32px 0">
      <a href="${signUrl}" style="background-color:${PRIMARY};color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block">
        Подпиши документа
      </a>
    </p>
    <p style="font-size:14px;color:#444">Линкът е валиден до ${expiryLabel}</p>
    <p style="color:#888;font-size:12px;margin-top:24px">sign.runverifiedapp.com</p>
  `;

  const result = await resend.emails.send({
    from: getResendFrom(),
    to: recipientEmail,
    subject: `Документ за подписване: ${title}`,
    html,
  });

  console.log("Invitation email result:", result);
}

export function buildSignUrl(token: string): string {
  return `${getAppUrl()}/sign/${token}`;
}
