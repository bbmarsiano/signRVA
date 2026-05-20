// Outgoing webhooks — internal dispatch endpoint (used by background jobs)
import { NextResponse } from "next/server";
import { sendOrgWebhooks } from "@/lib/webhooks/send-webhook";
import type { WebhookEvent } from "@/lib/webhooks/send-webhook";

export async function POST(request: Request) {
  const secret = request.headers.get("x-internal-secret");
  if (
    process.env.INTERNAL_WEBHOOK_SECRET &&
    secret !== process.env.INTERNAL_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const orgId = body?.org_id as string | undefined;
  const event = body?.event as WebhookEvent | undefined;

  if (!orgId || !event) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await sendOrgWebhooks(orgId, event, {
    document_id: body.document_id,
    status: body.status,
    signed_at: body.signed_at ?? null,
    recipient_email: body.recipient_email,
  });

  return NextResponse.json({ delivered: true });
}
