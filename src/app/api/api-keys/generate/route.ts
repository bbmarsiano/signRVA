// POST /api/api-keys/generate — create API key (shown once)
import crypto from "crypto";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    console.log("API key generate: Step 1 — auth");
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("API key generate: Step 2 — org lookup", user.id);
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("org_id, role")
      .eq("id", user.id)
      .single();

    console.log("userRow result:", userRow, userError);

    if (!userRow?.org_id) {
      return NextResponse.json(
        { error: "Организацията не е намерена" },
        { status: 400 }
      );
    }

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("plan")
      .eq("id", userRow.org_id)
      .single();

    console.log("org plan:", org?.plan);

    if (org?.plan !== "business") {
      return NextResponse.json(
        { error: "API достъпът е наличен само за Бизнес план" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const name = (body?.name as string)?.trim();
    const isLive = body?.is_live !== false;

    if (!name) {
      return NextResponse.json({ error: "Името е задължително" }, { status: 400 });
    }

    console.log("API key generate: Step 3 — generating key");

    const rawKey = crypto.randomBytes(32).toString("hex");
    const fullKey = `sk_${isLive ? "live" : "test"}_${rawKey}`;
    const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");
    const keyPrefix = fullKey.slice(0, 16);

    console.log("API key generate: Step 4 — hashing done");
    console.log("API key generate: Step 5 — inserting to DB");

    const { data: newKey, error: insertError } = await supabaseAdmin
      .from("api_keys")
      .insert({
        id: randomUUID(),
        org_id: userRow.org_id,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        is_live: isLive,
        last_used_at: null,
        created_at: new Date().toISOString(),
      })
      .select("id, org_id, name, key_prefix, is_live, created_at")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log("API key generate: Step 6 — success", newKey.id);

    return NextResponse.json({
      success: true,
      key: fullKey,
      id: newKey.id,
      name: newKey.name,
      key_prefix: keyPrefix,
      is_live: isLive,
      api_key: newKey,
    });
  } catch (error) {
    console.error("API key generate error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
