// send-team-invite — Resend invitation to join organization
import { Resend } from "resend";
import { getAppUrl } from "@/lib/app-url";
import { getResendFrom } from "@/lib/email/from";

export async function sendTeamInviteEmail(params: {
  to: string;
  orgName: string;
  orgId: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[team/invite] RESEND_API_KEY missing — skipping email");
    return;
  }

  const appUrl = getAppUrl();
  const registerUrl = `${appUrl}/register?invite=${params.orgId}&email=${encodeURIComponent(params.to)}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: getResendFrom(),
    to: params.to,
    subject: `Поканени сте да се присъедините към ${params.orgName} в sign.`,
    html: `
      <p>Здравейте,</p>
      <p>Поканени сте да се присъедините към <strong>${params.orgName}</strong> в sign.</p>
      <p><a href="${registerUrl}">Кликнете тук за регистрация</a></p>
      <p style="color:#71717a;font-size:12px;">sign.runverifiedapp.com</p>
    `,
  });
}
