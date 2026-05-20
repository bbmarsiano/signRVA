// GET/POST /api/org-webhooks — manage outgoing webhook config
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/dashboard/session";
import { createClient } from "@/lib/supabase/server";
import type { WebhookEventType } from "@/types/webhooks";

const VALID_EVENTS: WebhookEventType[] = [
  "document.signed",
  "document.expired",
  "document.created",
];

export async function GET() {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("org_webhooks")
    .select("id, url, events, is_active, created_at")
    .eq("org_id", session.organization.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ webhooks: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  if (session.organization.plan !== "business") {
    return NextResponse.json({ error: "Изисква Business план." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const url = (body?.url as string)?.trim();
  const events = (body?.events as string[])?.filter((e): e is WebhookEventType =>
    VALID_EVENTS.includes(e as WebhookEventType)
  );

  if (!url) {
    return NextResponse.json({ error: "Въведете URL." }, { status: 400 });
  }

  if (!events?.length) {
    return NextResponse.json({ error: "Изберете поне едно събитие." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("org_webhooks")
    .select("id")
    .eq("org_id", session.organization.id)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("org_webhooks")
      .update({ url, events, is_active: true })
      .eq("id", existing.id)
      .select("id, url, events, is_active, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Грешка при запис." }, { status: 500 });
    }
    return NextResponse.json({ webhook: data });
  }

  const { data, error } = await supabase
    .from("org_webhooks")
    .insert({
      id: randomUUID(),
      org_id: session.organization.id,
      url,
      events,
      is_active: true,
    })
    .select("id, url, events, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Грешка при запис." }, { status: 500 });
  }

  return NextResponse.json({ webhook: data });
}
