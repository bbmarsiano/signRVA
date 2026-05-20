// payment-failed — notify org owner when Stripe invoice payment fails
import { Resend } from "resend";

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "Sign <onboarding@resend.dev>";

export async function sendPaymentFailedEmail({
  to,
  orgName,
}: {
  to: string;
  orgName: string;
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Проблем с плащането — sign.runverifiedapp.com",
    html: `
      <p>Здравейте,</p>
      <p>Имаше проблем с плащането за абонамента на <strong>${orgName}</strong>.</p>
      <p>Моля актуализирайте метода си за плащане в настройките на акаунта, за да избегнете прекъсване на услугата.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/billing">Отвори абонамент</a></p>
    `,
  });
}
