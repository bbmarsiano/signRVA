// prepare-html — merge template HTML with field values for PDF generation
import { resolveTemplateFields } from "@/lib/templates/db";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TemplateField } from "@/types";

export async function fetchTemplateForPdf(templateId: string): Promise<{
  html_content: string;
  name: string;
  fields: TemplateField[];
} | null> {
  const { data: row, error } = await supabaseAdmin
    .from("templates")
    .select("html_content, name, fields, description")
    .eq("id", templateId)
    .single();

  if (error || !row) return null;

  const fields = await resolveTemplateFields(templateId);

  return {
    html_content: row.html_content ?? "",
    name: row.name,
    fields,
  };
}

export function buildFilledTemplateHtml(
  htmlContent: string,
  senderFieldValues: Record<string, string> = {}
): string {
  let html = htmlContent || "";

  for (const [key, value] of Object.entries(senderFieldValues)) {
    html = html.split(`{{${key}}}`).join(value ?? "");
  }

  html = html.replace(/\{\{(\w+)\}\}/g, "___________");

  return html;
}
