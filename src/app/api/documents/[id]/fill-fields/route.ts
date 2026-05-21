// POST /api/documents/[id]/fill-fields — save template field values (sender or recipient)
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  incrementTemplateUses,
  resolveTemplateFields,
  validateDocumentToken,
} from "@/lib/templates/db";
import { regenerateDocumentOriginalPdf } from "@/lib/templates/regenerate-pdf";
import { supabaseAdmin } from "@/lib/supabase/admin";

type FillFieldsBody = {
  field_values: Record<string, string>;
  filled_by: "sender" | "recipient";
  signer_index?: number;
  sign_token?: string;
  template_id?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const body = (await request.json()) as FillFieldsBody;

    if (!body.field_values || !body.filled_by) {
      return NextResponse.json(
        { error: "Липсват field_values или filled_by." },
        { status: 400 }
      );
    }

    const tokenCheck = await validateDocumentToken(
      documentId,
      body.sign_token
    );

    if (!tokenCheck.ok) {
      return NextResponse.json(
        { error: "Невалиден документ или линк." },
        { status: 403 }
      );
    }

    const { data: docRow } = await supabaseAdmin
      .from("documents")
      .select("template_id, org_id")
      .eq("id", documentId)
      .single();

    const templateId =
      body.template_id ?? (docRow?.template_id as string | null) ?? null;
    const orgId = docRow?.org_id as string | undefined;
    const signerIndex = body.signer_index ?? 0;
    const now = new Date().toISOString();

    const rows = Object.entries(body.field_values).map(([field_key, value]) => ({
      id: randomUUID(),
      document_id: documentId,
      template_id: templateId,
      field_key,
      field_label: null,
      value: String(value ?? ""),
      filled_by: body.filled_by,
      filled_at: now,
      signer_index: signerIndex,
    }));

    if (rows.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("document_field_values")
        .insert(rows);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    const docUpdate: Record<string, unknown> = {};

    if (templateId) {
      docUpdate.template_id = templateId;

      const fields = await resolveTemplateFields(templateId);
      if (fields.some((f) => f.assigned_to === "recipient")) {
        docUpdate.recipient_fields_required = true;
      }
    }

    if (body.filled_by === "recipient" && templateId) {
      const fields = await resolveTemplateFields(templateId);
      const requiredRecipient = fields.filter(
        (f) => f.assigned_to === "recipient" && f.required
      );

      const { data: existing } = await supabaseAdmin
        .from("document_field_values")
        .select("field_key, value")
        .eq("document_id", documentId);

      const valueMap: Record<string, string> = {};
      for (const row of existing ?? []) {
        valueMap[row.field_key as string] = row.value as string;
      }

      const allFilled = requiredRecipient.every(
        (f) => (valueMap[f.key] ?? "").trim().length > 0
      );

      if (allFilled) {
        docUpdate.recipient_fields_filled = true;
      }
    }

    if (Object.keys(docUpdate).length > 0) {
      await supabaseAdmin
        .from("documents")
        .update(docUpdate)
        .eq("id", documentId);
    }

    if (templateId && orgId) {
      await regenerateDocumentOriginalPdf(documentId, orgId, templateId);
    }

    if (templateId && body.filled_by === "sender") {
      void incrementTemplateUses(templateId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fill fields error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
