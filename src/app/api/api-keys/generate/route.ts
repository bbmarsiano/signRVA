// POST /api/api-keys/generate — create API key (shown once)
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/lib/api/hash-key";
import { getDashboardSession } from "@/lib/dashboard/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  if (session.organization.plan !== "business") {
    return NextResponse.json(
      { error: "API ключовете са достъпни само за Business план." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const name = (body?.name as string)?.trim();
  const isLive = body?.is_live !== false;

  if (!name) {
    return NextResponse.json({ error: "Въведете име на ключа." }, { status: 400 });
  }

  const { fullKey, keyPrefix, keyHash } = generateApiKey(isLive);
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("api_keys")
    .insert({
      id: randomUUID(),
      org_id: session.organization.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      is_live: isLive,
      last_used_at: null,
      created_at: new Date().toISOString(),
    })
    .select("id, name, key_prefix, is_live, created_at")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "Грешка при създаване на ключа." },
      { status: 500 }
    );
  }

  await supabase.from("audit_log").insert({
    org_id: session.organization.id,
    document_id: null,
    event_type: "api.request",
    actor: session.user.email,
    metadata: { action: "api_key.created", key_prefix: keyPrefix, is_live: isLive },
    ip_address: "dashboard",
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    key: fullKey,
    api_key: row,
  });
}
