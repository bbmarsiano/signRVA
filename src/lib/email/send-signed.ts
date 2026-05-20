// send-signed — Resend emails with signed PDF attachment to recipient and org owner
import { Resend } from "resend";

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "Sign <onboarding@resend.dev>";

export async function sendSignedEmails({
  recipientEmail,
  recipientName,
  ownerEmail,
  title,
  signedPdfBytes,
  documentId,
}: {
  recipientEmail: string;
  recipientName: string;
  ownerEmail: string;
  title: string;
  signedPdfBytes: Uint8Array;
  documentId: string;
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const filename = `signed-${documentId.slice(0, 8)}.pdf`;
  const attachment = Buffer.from(signedPdfBytes);

  await resend.emails.send({
    from: FROM,
    to: recipientEmail,
    subject: `Вашият подписан документ: ${title}`,
    html: `
      <p>Здравейте, ${recipientName},</p>
      <p>Вашият документ <strong>${title}</strong> беше подписан успешно.</p>
      <p>Прикачваме подписания PDF.</p>
    `,
    attachments: [{ filename, content: attachment }],
  });

  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Документът беше подписан: ${title}`,
    html: `
      <p>Документът <strong>${title}</strong> беше подписан от ${recipientName}.</p>
      <p>Прикачваме подписания PDF.</p>
    `,
    attachments: [{ filename, content: attachment }],
  });
}
