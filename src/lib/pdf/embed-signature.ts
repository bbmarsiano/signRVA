// embed-signature — overlay signature image and metadata on the last PDF page
import fs from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";

const UBUNTU_FONT_PATH = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Ubuntu-Regular.ttf"
);

function transliterate(text: string): string {
  const map: Record<string, string> = {
    А: "A",
    Б: "B",
    В: "V",
    Г: "G",
    Д: "D",
    Е: "E",
    Ж: "Zh",
    З: "Z",
    И: "I",
    Й: "Y",
    К: "K",
    Л: "L",
    М: "M",
    Н: "N",
    О: "O",
    П: "P",
    Р: "R",
    С: "S",
    Т: "T",
    У: "U",
    Ф: "F",
    Х: "H",
    Ц: "Ts",
    Ч: "Ch",
    Ш: "Sh",
    Щ: "Sht",
    Ъ: "A",
    Ь: "",
    Ю: "Yu",
    Я: "Ya",
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sht",
    ъ: "a",
    ь: "",
    ю: "yu",
    я: "ya",
  };
  return text
    .split("")
    .map((c) => map[c] ?? c)
    .join("");
}

function truncateUserAgent(ua: string, max = 80): string {
  const truncated = ua.length > max ? `${ua.slice(0, max)}...` : ua;
  return transliterate(truncated);
}

function formatSignedAt(date: Date | string): { date: string; time: string } {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return {
    date: `${day}.${month}.${year}`,
    time: `${hours}:${minutes}`,
  };
}

async function loadFont(pdfDoc: PDFDocument): Promise<{
  font: PDFFont;
  supportsCyrillic: boolean;
}> {
  pdfDoc.registerFontkit(fontkit);

  if (fs.existsSync(UBUNTU_FONT_PATH)) {
    const fontBytes = fs.readFileSync(UBUNTU_FONT_PATH);
    const font = await pdfDoc.embedFont(fontBytes);
    return { font, supportsCyrillic: true };
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  return { font, supportsCyrillic: false };
}

function textForPdf(text: string, supportsCyrillic: boolean): string {
  return supportsCyrillic ? text : transliterate(text);
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
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const { font, supportsCyrillic } = await loadFont(pdfDoc);

  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();
  const pngImage = await pdfDoc.embedPng(signaturePng);

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
  const recipientName = textForPdf(meta.recipientName, supportsCyrillic);

  lastPage.drawText(
    `Signed by: ${recipientName} on ${date} at ${time} UTC`,
    { x: margin, y: margin + 52, size: 9, font }
  );
  lastPage.drawText(
    `IP: ${meta.ip} · Device: ${truncateUserAgent(meta.userAgent)}`,
    { x: margin, y: margin + 40, size: 8, font }
  );

  return pdfDoc.save();
}
