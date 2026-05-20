// create-placeholder-pdf — minimal PDF when a template is selected without upload
import { PDFDocument, StandardFonts } from "pdf-lib";

const TEMPLATE_TITLES: Record<string, string> = {
  rent: "Наемен договор",
  vehicle: "Покупко-продажба МПС",
  services: "Договор за услуги",
  "power-of-attorney": "Пълномощно",
  membership: "Членски договор",
};

export async function createPlaceholderPdf(
  templateId: string,
  documentTitle: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const templateName = TEMPLATE_TITLES[templateId] ?? "Шаблон";

  page.drawText(templateName, { x: 50, y: 780, size: 18, font });
  page.drawText(documentTitle, { x: 50, y: 750, size: 14, font });
  page.drawText("Чернова — заменете с финален PDF", {
    x: 50,
    y: 720,
    size: 10,
    font,
  });

  return pdf.save();
}
