// v1 documents API — POST create, GET list (Bearer API key)
import { NextResponse } from "next/server";
import { jsonApiError } from "@/lib/api/errors";
import { verifyApiKey } from "@/lib/api/verify-api-key";
import {
  createDocumentViaApi,
  type V1CreateDocumentBody,
} from "@/lib/api/v1-create-document";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrgWebhooks } from "@/lib/webhooks/send-webhook";
import type { Document } from "@/types";

export async function POST(request: Request) {
  try {
    const { org, apiKey } = await verifyApiKey(request);
    const body = (await request.json()) as V1CreateDocumentBody;

    const result = await createDocumentViaApi(org, body, `api_key:${apiKey.key_prefix}`);

    void sendOrgWebhooks(org.id, "document.created", {
      document_id: result.id,
      status: "pending",
      signed_at: null,
      recipient_email: body.recipient_email,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "DOCUMENT_LIMIT") {
        return NextResponse.json(
          { error: "Достигнат лимит на документи." },
          { status: 403 }
        );
      }
      if (err.message === "VALIDATION") {
        return NextResponse.json(
          { error: "Липсват задължителни полета." },
          { status: 400 }
        );
      }
      if (err.message === "PDF_REQUIRED" || err.message === "PDF_TOO_LARGE") {
        return NextResponse.json(
          { error: "Невалиден или твърде голям PDF." },
          { status: 400 }
        );
      }
    }
    return jsonApiError(err);
  }
}

export async function GET(request: Request) {
  try {
    const { org_id } = await verifyApiKey(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
    const offset = Number(searchParams.get("offset") ?? 0);

    const supabase = createAdminClient();
    let query = supabase
      .from("documents")
      .select(
        "id, title, status, recipient_email, recipient_name, created_at, signed_at, expires_at",
        { count: "exact" }
      )
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query.returns<
      Pick<
        Document,
        | "id"
        | "title"
        | "status"
        | "recipient_email"
        | "recipient_name"
        | "created_at"
        | "signed_at"
        | "expires_at"
      >[]
    >();

    if (error) {
      return NextResponse.json({ error: "Грешка при заявката." }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    return jsonApiError(err);
  }
}
