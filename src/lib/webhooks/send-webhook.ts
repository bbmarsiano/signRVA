// send-webhook — dispatch signed HMAC events to org webhook URLs
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type WebhookEvent =
  | "document.signed"
  | "document.expired"
  | "document.created";

export type WebhookPayload = {
  event: WebhookEvent;
  document_id: string;
  status: string;
  signed_at: string | null;
  recipient_email: string;
  timestamp: string;
};

function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

async function postWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<boolean> {
  const body = JSON.stringify(payload);
  const signature = signPayload(secret, body);

  const attempt = async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Verified-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  };

  try {
    if (await attempt()) return true;
    return await attempt();
  } catch {
    return false;
  }
}

export async function sendOrgWebhooks(
  orgId: string,
  event: WebhookEvent,
  payload: Omit<WebhookPayload, "event" | "timestamp">
): Promise<void> {
  const supabase = createAdminClient();

  const { data: hooks } = await supabase
    .from("org_webhooks")
    .select("url, secret, events")
    .eq("org_id", orgId)
    .eq("is_active", true);

  if (!hooks?.length) return;

  const fullPayload: WebhookPayload = {
    ...payload,
    event,
    timestamp: new Date().toISOString(),
  };

  await Promise.allSettled(
    hooks
      .filter((h) => h.events?.includes(event))
      .map((h) => postWebhook(h.url, h.secret, fullPayload))
  );
}
