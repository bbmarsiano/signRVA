// Resend from address — set RESEND_FROM_EMAIL in .env.local
export function getResendFrom(): string {
  return process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
}
