// embed-signature — overlay signature image and metadata on the last PDF page
import { PDFDocument, StandardFonts } from "pdf-lib";

function truncateUserAgent(ua: string, max = 80): string {
  return ua.length > max ? `${ua.slice(0, max)}…` : ua;
}

function formatSignedAt(date: Date): { date: string; time: string } {
  const iso = date.toISOString();
  const [d, t] = iso.replace("T", " ").split(".");
  const [yyyy, mm, dd] = d.split("-");
  const time = t.slice(0, 8);
  return { date: `${dd}.${mm}.${yyyy}`, time };
}

export async function embedSignature(
  pdfBytes: Uint8Array,
  signaturePng: Uint8Array,
  meta: {
    recipientName: string;
    signedAt: Date;
    ip: string;
    userAgent: string;
  }
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes);
  const pages = pdf.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pngImage = await pdf.embedPng(signaturePng);

  const sigWidth = 150;
  const sigHeight = 60;
  const margin = 40;

  lastPage.drawImage(pngImage, {
    x: width - sigWidth - margin,
    y: margin + 36,
    width: sigWidth,
    height: sigHeight,
  });

  const { date, time } = formatSignedAt(meta.signedAt);

  lastPage.drawText(
    `Подписано от: ${meta.recipientName} на ${date} в ${time} UTC`,
    { x: margin, y: margin + 52, size: 9, font }
  );
  lastPage.drawText(
    `IP: ${meta.ip} · Устройство: ${truncateUserAgent(meta.userAgent)}`,
    { x: margin, y: margin + 40, size: 8, font }
  );

  return pdf.save();
}
