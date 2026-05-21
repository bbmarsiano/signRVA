// POST /api/templates/custom — create org custom template
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchTemplateById } from "@/lib/templates/db";
import type { TemplateField } from "@/types";

type CreateCustomBody = {
  name: string;
  description?: string;
  fields: TemplateField[];
  html_content?: string;
  category?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
    }

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userRow?.org_id) {
      return NextResponse.json(
        { error: "Нямате свързана организация." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as CreateCustomBody;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: "Името на шаблона е задължително." },
        { status: 400 }
      );
    }

    const templateId = randomUUID();
    const now = new Date().toISOString();

    const { error: insertError } = await supabaseAdmin.from("templates").insert({
      id: templateId,
      org_id: userRow.org_id,
      name,
      description: body.description?.trim() ?? "",
      type: "custom",
      category: body.category ?? "other",
      html_content: body.html_content ?? null,
      pdf_path: null,
      uses_count: 0,
      is_active: true,
      created_at: now,
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    const fields = body.fields ?? [];
    if (fields.length > 0) {
      const rows = fields.map((f, index) => ({
        id: randomUUID(),
        template_id: templateId,
        key: f.key,
        label: f.label,
        field_type: f.field_type,
        assigned_to: f.assigned_to,
        required: f.required ?? false,
        placeholder: f.placeholder ?? null,
        options: f.options ?? null,
        order_index: f.order_index ?? index,
        section: f.section ?? null,
      }));

      const { error: fieldsError } = await supabaseAdmin
        .from("template_fields")
        .insert(rows);

      if (fieldsError) {
        await supabaseAdmin.from("templates").delete().eq("id", templateId);
        return NextResponse.json(
          { error: fieldsError.message },
          { status: 500 }
        );
      }
    }

    const template = await fetchTemplateById(templateId);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Custom template create error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
