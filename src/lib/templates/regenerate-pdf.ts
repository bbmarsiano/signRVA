// regenerate-pdf — rebuild original.pdf from template HTML + saved field values
import { htmlToPdf } from "@/lib/pdf/html-to-pdf";
import {
  fetchDocumentFieldValues,
  fillHtmlPlaceholders,
} from "@/lib/templates/db";
import { supabaseAdmin } from "@/lib/supabase/admin";

export function mergeAllFieldValuesIntoHtml(
  htmlContent: string,
  values: Record<string, string>,
  unfilledReplacement = ""
): string {
  let html = fillHtmlPlaceholders(htmlContent, values);
  html = html.replace(/\{\{(\w+)\}\}/g, unfilledReplacement);
  return html;
}

export async function regenerateDocumentOriginalPdf(
  documentId: string,
  orgId: string,
  templateId: string
): Promise<boolean> {
  const values = await fetchDocumentFieldValues(documentId);
  if (Object.keys(values).length === 0) return false;

  const { data: template } = await supabaseAdmin
    .from("templates")
    .select("html_content")
    .eq("id", templateId)
    .single();

  if (!template?.html_content) return false;

  const html = mergeAllFieldValuesIntoHtml(template.html_content, values, "");
  const pdfBytes = await htmlToPdf(html);

  const { error } = await supabaseAdmin.storage
    .from("documents")
    .upload(`${orgId}/${documentId}/original.pdf`, pdfBytes, {
      upsert: true,
      contentType: "application/pdf",
    });

  if (error) {
    console.error("regenerate original.pdf error:", error);
    return false;
  }

  return true;
}

export async function buildFilledPdfFromDocument(document: {
  id: string;
  template_id?: string | null;
}): Promise<Uint8Array | null> {
  if (!document.template_id) return null;

  const values = await fetchDocumentFieldValues(document.id);
  if (Object.keys(values).length === 0) return null;

  const { data: template } = await supabaseAdmin
    .from("templates")
    .select("html_content")
    .eq("id", document.template_id)
    .single();

  if (!template?.html_content) return null;

  const html = mergeAllFieldValuesIntoHtml(template.html_content, values, "");
  return htmlToPdf(html);
}
