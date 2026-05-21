// POST /api/documents/[id]/generate-pdf — merge template HTML with field values
import { NextResponse } from "next/server";
import {
  fetchDocumentFieldValues,
  fetchTemplateById,
  fillHtmlPlaceholders,
  validateDocumentToken,
} from "@/lib/templates/db";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type GeneratePdfBody = {
  sign_token?: string;
  template_id?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const body = (await request.json().catch(() => ({}))) as GeneratePdfBody;

    let authorized = false;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

      const { data: document } = await supabaseAdmin
        .from("documents")
        .select("id, org_id, template_id")
        .eq("id", documentId)
        .single();

      if (
        document &&
        userRow?.org_id &&
        document.org_id === userRow.org_id
      ) {
        authorized = true;
      }
    }

    if (!authorized && body.sign_token) {
      const tokenCheck = await validateDocumentToken(
        documentId,
        body.sign_token
      );
      authorized = tokenCheck.ok;
    }

    if (!authorized) {
      return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
    }

    const { data: document } = await supabaseAdmin
      .from("documents")
      .select("id, template_id, title")
      .eq("id", documentId)
      .single();

    if (!document) {
      return NextResponse.json(
        { error: "Документът не е намерен." },
        { status: 404 }
      );
    }

    const templateId =
      body.template_id ?? (document.template_id as string | null);

    if (!templateId) {
      return NextResponse.json(
        { error: "Документът няма свързан шаблон." },
        { status: 400 }
      );
    }

    const template = await fetchTemplateById(templateId);
    if (!template?.html_content) {
      return NextResponse.json(
        { error: "Шаблонът няма HTML съдържание." },
        { status: 400 }
      );
    }

    const fieldValues = await fetchDocumentFieldValues(documentId);
    const html = fillHtmlPlaceholders(template.html_content, fieldValues);

    return NextResponse.json({
      html,
      field_values: fieldValues,
      template_id: templateId,
      document_id: documentId,
    });
  } catch (error) {
    console.error("Generate PDF error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
