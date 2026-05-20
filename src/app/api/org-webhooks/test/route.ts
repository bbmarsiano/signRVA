// POST /api/org-webhooks/test — send test payload to configured or custom webhook URL
import { createHmac, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/dashboard/session";
import { createClient } from "@/lib/supabase/server";
import { sendOrgWebhooks } from "@/lib/webhooks/send-webhook";

export async function POST(request: Request) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const url = (body?.url as string)?.trim();

  if (url) {
    const supabase = await createClient();
    const { data: hook } = await supabase
      .from("org_webhooks")
      .select("secret")
      .eq("org_id", session.organization.id)
      .limit(1)
      .maybeSingle();

    const secret = hook?.secret ?? randomUUID();
    const payload = {
      event: "document.created",
      document_id: randomUUID(),
      status: "pending",
      signed_at: null,
      recipient_email: "test@example.com",
      timestamp: new Date().toISOString(),
    };
    const bodyStr = JSON.stringify(payload);
    const sig = createHmac("sha256", secret).update(bodyStr).digest("hex");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Verified-Signature": sig,
        },
        body: bodyStr,
      });
      return NextResponse.json({ ok: res.ok, status: res.status });
    } catch {
      return NextResponse.json({ ok: false, error: "Неуспешна връзка." });
    }
  }

  await sendOrgWebhooks(session.organization.id, "document.created", {
    document_id: "00000000-0000-0000-0000-000000000000",
    status: "pending",
    signed_at: null,
    recipient_email: "test@example.com",
  });

  return NextResponse.json({ ok: true, message: "Тестово събитие изпратено." });
}
