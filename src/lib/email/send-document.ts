// send-document — Resend invite email to recipient (and sender if both parties)
import { Resend } from "resend";
import { getAppUrl } from "@/lib/app-url";

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "Sign <onboarding@resend.dev>";

export async function sendDocumentInvite({
  recipientEmail,
  recipientName,
  senderEmail,
  title,
  signUrl,
  emailBothParties,
}: {
  recipientEmail: string;
  recipientName: string;
  senderEmail: string;
  title: string;
  signUrl: string;
  emailBothParties: boolean;
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = `
    <p>Здравейте, ${recipientName},</p>
    <p>Имате документ за електронен подпис: <strong>${title}</strong></p>
    <p><a href="${signUrl}">Отвори и подпиши документа</a></p>
    <p style="color:#666;font-size:12px">sign.runverifiedapp.com</p>
  `;

  const recipients = emailBothParties
    ? [recipientEmail, senderEmail]
    : [recipientEmail];

  await resend.emails.send({
    from: FROM,
    to: recipients,
    subject: `Документ за подпис: ${title}`,
    html,
  });
}

export function buildSignUrl(token: string): string {
  return `${getAppUrl()}/sign/${token}`;
}
