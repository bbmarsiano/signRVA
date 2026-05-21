// create-placeholder-pdf — minimal PDF when a template is selected without upload
import fs from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const UBUNTU_FONT_PATH = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Ubuntu-Regular.ttf"
);

const TEMPLATE_TITLES: Record<string, string> = {
  rent: "Наемен договор",
  vehicle: "Покупко-продажба МПС",
  services: "Договор за услуги",
  "power-of-attorney": "Пълномощно",
  membership: "Членски договор",
};

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
    .map((c) => map[c] || c)
    .join("");
}

function textForPdf(text: string, supportsCyrillic: boolean): string {
  return supportsCyrillic ? text : transliterate(text);
}

export async function createPlaceholderPdf(
  templateId: string,
  documentTitle: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let font;
  let supportsCyrillic = false;

  if (fs.existsSync(UBUNTU_FONT_PATH)) {
    const fontBytes = fs.readFileSync(UBUNTU_FONT_PATH);
    font = await pdfDoc.embedFont(fontBytes);
    supportsCyrillic = true;
  } else {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const page = pdfDoc.addPage([595, 842]);
  const templateNameRaw = TEMPLATE_TITLES[templateId] ?? "Шаблон";
  const draftLabel = "Чернова — заменете с финален PDF";

  const templateName = textForPdf(templateNameRaw, supportsCyrillic);
  const title = textForPdf(documentTitle, supportsCyrillic);
  const draft = textForPdf(draftLabel, supportsCyrillic);

  page.drawText(templateName, {
    x: 50,
    y: 780,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText(title, { x: 50, y: 750, size: 14, font, color: rgb(0, 0, 0) });
  page.drawText(draft, { x: 50, y: 720, size: 10, font, color: rgb(0, 0, 0) });

  return pdfDoc.save();
}
