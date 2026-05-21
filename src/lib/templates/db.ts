// db — load templates and fields from Supabase
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Template, TemplateField, TemplateFieldType } from "@/types";

type TemplateRow = {
  id: string;
  org_id: string | null;
  name: string;
  description: string;
  type: Template["type"];
  category: Template["category"];
  html_content: string | null;
  pdf_path: string | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
  fields?: TemplateField[] | null;
};

type TemplateFieldRow = {
  id: string;
  template_id: string;
  key: string;
  label: string;
  field_type: string;
  assigned_to: string;
  required: boolean;
  placeholder: string | null;
  options: string[] | null;
  order_index: number;
  section: string | null;
};

function mapField(row: TemplateFieldRow): TemplateField {
  return {
    key: row.key,
    label: row.label,
    field_type: row.field_type as TemplateFieldType,
    assigned_to: row.assigned_to as TemplateField["assigned_to"],
    required: row.required,
    placeholder: row.placeholder ?? undefined,
    options: Array.isArray(row.options) ? row.options : undefined,
    order_index: row.order_index,
    section: row.section ?? undefined,
  };
}

export function mapTemplate(
  row: TemplateRow,
  fields: TemplateFieldRow[]
): Template {
  return {
    id: row.id,
    org_id: row.org_id,
    name: row.name,
    description: row.description,
    type: row.type,
    category: row.category,
    fields: fields
      .filter((f) => f.template_id === row.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map(mapField),
    html_content: row.html_content ?? undefined,
    pdf_path: row.pdf_path ?? undefined,
    uses_count: row.uses_count,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

/** System templates: `templates.fields` jsonb; custom: `template_fields` table. */
export async function resolveTemplateFields(
  templateId: string
): Promise<TemplateField[]> {
  const { data: row } = await supabaseAdmin
    .from("templates")
    .select("fields")
    .eq("id", templateId)
    .single();

  const jsonFields = row?.fields;
  if (Array.isArray(jsonFields) && jsonFields.length > 0) {
    return (jsonFields as TemplateField[]).sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );
  }

  const tableRows = await fetchTemplateFields(templateId);
  return tableRows.map(mapField);
}

export async function fetchTemplateFields(
  templateId: string
): Promise<TemplateFieldRow[]> {
  const { data, error } = await supabaseAdmin
    .from("template_fields")
    .select("*")
    .eq("template_id", templateId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("template_fields fetch error:", error);
    return [];
  }

  return (data as TemplateFieldRow[]) ?? [];
}

export async function fetchTemplateById(
  templateId: string
): Promise<Template | null> {
  const { data: row, error } = await supabaseAdmin
    .from("templates")
    .select("*")
    .eq("id", templateId)
    .eq("is_active", true)
    .maybeSingle<TemplateRow>();

  if (error || !row) return null;

  const fields = await resolveTemplateFields(templateId);
  return {
    ...mapTemplate(row, []),
    fields,
  };
}

export async function fetchTemplatesForOrg(orgId: string | null): Promise<{
  system: Template[];
  custom: Template[];
}> {
  const { data: systemRows, error: systemError } = await supabaseAdmin
    .from("templates")
    .select("*")
    .eq("type", "system")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (systemError) {
    console.error("system templates fetch error:", systemError);
  }

  let customRows: TemplateRow[] = [];
  if (orgId) {
    const { data, error } = await supabaseAdmin
      .from("templates")
      .select("*")
      .eq("type", "custom")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("custom templates fetch error:", error);
    } else {
      customRows = (data as TemplateRow[]) ?? [];
    }
  }

  const allIds = [
    ...((systemRows as TemplateRow[]) ?? []).map((r) => r.id),
    ...customRows.map((r) => r.id),
  ];

  let allFields: TemplateFieldRow[] = [];
  if (allIds.length > 0) {
    const { data: fieldRows } = await supabaseAdmin
      .from("template_fields")
      .select("*")
      .in("template_id", allIds)
      .order("order_index", { ascending: true });
    allFields = (fieldRows as TemplateFieldRow[]) ?? [];
  }

  const system = ((systemRows as TemplateRow[]) ?? []).map((row) =>
    mapTemplate(row, allFields)
  );
  const custom = customRows.map((row) => mapTemplate(row, allFields));

  return { system, custom };
}

export async function incrementTemplateUses(templateId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("templates")
    .select("uses_count")
    .eq("id", templateId)
    .single();

  if (!data) return;

  await supabaseAdmin
    .from("templates")
    .update({ uses_count: (data.uses_count ?? 0) + 1 })
    .eq("id", templateId);
}

export function fillHtmlPlaceholders(
  html: string,
  values: Record<string, string>
): string {
  let result = html;
  for (const [key, value] of Object.entries(values)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, "g"), value);
  }
  return result;
}

export async function fetchDocumentFieldValues(
  documentId: string
): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin
    .from("document_field_values")
    .select("field_key, value")
    .eq("document_id", documentId);

  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    out[row.field_key as string] = row.value as string;
  }
  return out;
}

export async function validateDocumentToken(
  documentId: string,
  signToken: string | undefined
): Promise<{ ok: boolean; document?: { id: string; org_id: string; sign_url_token: string } }> {
  const { data: document, error } = await supabaseAdmin
    .from("documents")
    .select("id, org_id, sign_url_token, signers")
    .eq("id", documentId)
    .single();

  if (error || !document) return { ok: false };

  if (!signToken) return { ok: false };

  if (document.sign_url_token === signToken) {
    return { ok: true, document };
  }

  const signers = document.signers as { sign_url_token?: string }[] | null;
  if (Array.isArray(signers)) {
    const match = signers.some((s) => s.sign_url_token === signToken);
    if (match) return { ok: true, document };
  }

  return { ok: false };
}
