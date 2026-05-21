// embed-signature — overlay signature image and metadata on the last PDF page
import fs from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";

const UBUNTU_FONT_PATH = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Ubuntu-Regular.ttf"
);

const MARGIN = 40;
const LINE_GRAY = rgb(0.8, 0.8, 0.8);
const LABEL_GRAY = rgb(0.45, 0.45, 0.45);

const Y_SECTION = MARGIN + 112;
const Y_PARTY = MARGIN + 102;
const Y_SIGNED_BY = MARGIN + 80;
const Y_IP = MARGIN + 90;
const Y_CANVAS = MARGIN + 20;
const CANVAS_HEIGHT = 55;

export type SignerPosition = "single" | "left" | "right";

export type EmbedSignatureMeta = {
  recipientName: string;
  signedAt: Date;
  ip: string;
  userAgent: string;
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
    .map((c) => map[c] ?? c)
    .join("");
}

function fitText(text: string, maxChars: number): string {
  return text.length > maxChars ? text.slice(0, maxChars - 1) + "…" : text;
}

function truncateDevice(userAgent: string, maxChars: number): string {
  if (!userAgent || userAgent.length <= maxChars) return userAgent;
  return userAgent.slice(0, maxChars) + "...";
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

type ZoneTextLimits = {
  name: number;
  signedLine: number;
  ipLine: number;
  party: number;
  device: number;
};

function getTextLimits(position: SignerPosition): ZoneTextLimits {
  if (position === "single") {
    return { name: 80, signedLine: 80, ipLine: 80, party: 80, device: 80 };
  }
  return { name: 35, signedLine: 55, ipLine: 55, party: 25, device: 45 };
}

function buildZoneLines(
  meta: EmbedSignatureMeta,
  position: SignerPosition,
  supportsCyrillic: boolean
) {
  const limits = getTextLimits(position);
  const deviceMax = position === "single" ? 80 : 45;
  const deviceShort = textForPdf(
    truncateDevice(meta.userAgent || "", deviceMax),
    supportsCyrillic
  );
  const { date, time } = formatSignedAt(meta.signedAt);
  const name = fitText(
    textForPdf(meta.recipientName, supportsCyrillic),
    limits.name
  );

  return {
    signedLine: fitText(
      `Signed by: ${name} on ${date} at ${time} UTC`,
      limits.signedLine
    ),
    ipLine: fitText(
      `IP: ${meta.ip} · Device: ${deviceShort}`,
      limits.ipLine
    ),
  };
}

function drawTwoSidedChrome(
  lastPage: ReturnType<PDFDocument["getPages"]>[number],
  pageWidth: number
) {
  const halfX = pageWidth / 2 - 5;

  lastPage.drawLine({
    start: { x: halfX, y: MARGIN + 5 },
    end: { x: halfX, y: MARGIN + 100 },
    thickness: 0.5,
    color: LINE_GRAY,
    opacity: 0.5,
  });

  lastPage.drawLine({
    start: { x: MARGIN, y: MARGIN + 108 },
    end: { x: pageWidth - MARGIN, y: MARGIN + 108 },
    thickness: 0.5,
    color: LINE_GRAY,
    opacity: 0.3,
  });
}

function drawHalfZone(
  lastPage: ReturnType<PDFDocument["getPages"]>[number],
  pageWidth: number,
  pngImage: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  meta: EmbedSignatureMeta,
  font: PDFFont,
  supportsCyrillic: boolean,
  side: "left" | "right",
  drawChrome: boolean
) {
  const halfWidth = pageWidth / 2;
  const textX =
    side === "left" ? MARGIN + 4 : halfWidth + 10;
  const imageX = textX;
  const imageWidth = halfWidth - MARGIN - 24;
  const position: SignerPosition = side;

  if (drawChrome && side === "left") {
    drawTwoSidedChrome(lastPage, pageWidth);
    lastPage.drawText(fitText("Подпис — Страна 1", 25), {
      x: MARGIN + 4,
      y: Y_SECTION,
      size: 7,
      font,
      color: LABEL_GRAY,
    });
    lastPage.drawText(fitText("Подпис — Страна 2", 25), {
      x: halfWidth + 10,
      y: Y_SECTION,
      size: 7,
      font,
      color: LABEL_GRAY,
    });
  }

  const partyLabel =
    side === "left"
      ? fitText("Страна 1 / Party 1", 25)
      : fitText("Страна 2 / Party 2", 25);
  const lines = buildZoneLines(meta, position, supportsCyrillic);

  lastPage.drawImage(pngImage, {
    x: imageX,
    y: Y_CANVAS,
    width: imageWidth,
    height: CANVAS_HEIGHT,
  });

  lastPage.drawText(lines.ipLine, {
    x: textX,
    y: Y_IP,
    size: 8,
    font,
  });
  lastPage.drawText(lines.signedLine, {
    x: textX,
    y: Y_SIGNED_BY,
    size: 8,
    font,
  });
  lastPage.drawText(partyLabel, {
    x: textX,
    y: Y_PARTY,
    size: 7,
    font,
    color: LABEL_GRAY,
  });

  if (side === "right" && !drawChrome) {
    lastPage.drawText(fitText("Подпис — Страна 2", 25), {
      x: textX,
      y: Y_SECTION,
      size: 7,
      font,
      color: LABEL_GRAY,
    });
  }
}

function drawLeftZone(
  lastPage: ReturnType<PDFDocument["getPages"]>[number],
  pageWidth: number,
  pngImage: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  meta: EmbedSignatureMeta,
  font: PDFFont,
  supportsCyrillic: boolean,
  drawChrome: boolean
) {
  drawHalfZone(
    lastPage,
    pageWidth,
    pngImage,
    meta,
    font,
    supportsCyrillic,
    "left",
    drawChrome
  );
}

function drawRightZone(
  lastPage: ReturnType<PDFDocument["getPages"]>[number],
  pageWidth: number,
  pngImage: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  meta: EmbedSignatureMeta,
  font: PDFFont,
  supportsCyrillic: boolean
) {
  drawHalfZone(
    lastPage,
    pageWidth,
    pngImage,
    meta,
    font,
    supportsCyrillic,
    "right",
    false
  );
}

function drawSingleZone(
  lastPage: ReturnType<PDFDocument["getPages"]>[number],
  pageWidth: number,
  pngImage: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  meta: EmbedSignatureMeta,
  font: PDFFont,
  supportsCyrillic: boolean
) {
  const textX = MARGIN;
  const imageWidth = 160;
  const imageX = pageWidth - 180 - MARGIN;
  const lines = buildZoneLines(meta, "single", supportsCyrillic);

  lastPage.drawImage(pngImage, {
    x: imageX,
    y: Y_CANVAS,
    width: imageWidth,
    height: CANVAS_HEIGHT,
  });

  lastPage.drawText(lines.ipLine, {
    x: textX,
    y: Y_IP,
    size: 8,
    font,
  });
  lastPage.drawText(lines.signedLine, {
    x: textX,
    y: Y_SIGNED_BY,
    size: 8,
    font,
  });
}

export async function embedSignature(
  pdfBytes: Uint8Array,
  signaturePng: Uint8Array,
  meta: EmbedSignatureMeta,
  position: SignerPosition = "single"
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const { font, supportsCyrillic } = await loadFont(pdfDoc);

  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width: pageWidth } = lastPage.getSize();
  const pngImage = await pdfDoc.embedPng(signaturePng);

  switch (position) {
    case "left":
      drawLeftZone(lastPage, pageWidth, pngImage, meta, font, supportsCyrillic, true);
      break;
    case "right":
      drawRightZone(lastPage, pageWidth, pngImage, meta, font, supportsCyrillic);
      break;
    default:
      drawSingleZone(lastPage, pageWidth, pngImage, meta, font, supportsCyrillic);
  }

  return pdfDoc.save();
}

export type SignatureBlock = {
  signaturePng: Uint8Array;
  recipientName: string;
  signedAt: Date;
  ip: string;
  userAgent: string;
};

/** Embed multiple signatures in left/right zones (e.g. batch finalization). */
export async function embedMultipleSignatures(
  pdfBytes: Uint8Array,
  signatures: SignatureBlock[]
): Promise<Uint8Array> {
  if (signatures.length === 0) return pdfBytes;

  let result = pdfBytes;
  for (let i = 0; i < signatures.length; i++) {
    const sig = signatures[i];
    const position: SignerPosition =
      signatures.length === 1 ? "single" : i === 0 ? "left" : "right";
    result = await embedSignature(
      result,
      sig.signaturePng,
      {
        recipientName: sig.recipientName,
        signedAt: sig.signedAt,
        ip: sig.ip,
        userAgent: sig.userAgent,
      },
      position
    );
  }
  return result;
}
