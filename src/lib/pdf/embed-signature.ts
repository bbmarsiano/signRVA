// embed-signature — overlay signature image and metadata on the last PDF page
import fs from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";
import { getAppUrl } from "@/lib/app-url";

const UBUNTU_FONT_PATH = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Ubuntu-Regular.ttf"
);

const MARGIN = 50;
const ZONE_BOTTOM = MARGIN + 55;
const ZONE_HEIGHT = 130;

const GREEN = rgb(0.059, 0.431, 0.337);
const TEXT_PRIMARY = rgb(0.1, 0.1, 0.1);
const TEXT_SECONDARY = rgb(0.4, 0.4, 0.4);
const TEXT_MUTED = rgb(0.45, 0.45, 0.45);

const BRAND_LINE = "Created by sign.runverifiedapp.com";
const Y_BRAND = ZONE_BOTTOM + 5;

const CANVAS_W = 130;
const CANVAS_H = 50;

const Y_LABEL = ZONE_BOTTOM + 105;
const Y_SIGNED_BY = ZONE_BOTTOM + 92;
const Y_IP = ZONE_BOTTOM + 81;
const Y_CANVAS = ZONE_BOTTOM + 20;
const Y_ZONE_TOP = ZONE_BOTTOM + ZONE_HEIGHT;

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

function zoneLabel(position: SignerPosition): string {
  if (position === "left") {
    return "Подпис — Страна 1 / Signature — Party 1";
  }
  if (position === "right") {
    return "Подпис — Страна 2 / Signature — Party 2";
  }
  return "Подпис / Signature";
}

function buildZoneLines(
  meta: EmbedSignatureMeta,
  position: SignerPosition,
  supportsCyrillic: boolean
) {
  const nameMax = position === "single" ? 80 : 35;
  const signedMax = position === "single" ? 80 : 55;
  const deviceMax = 40;

  const deviceShort = textForPdf(
    truncateDevice(meta.userAgent || "", deviceMax),
    supportsCyrillic
  );
  const { date, time } = formatSignedAt(meta.signedAt);
  const name = fitText(
    textForPdf(meta.recipientName, supportsCyrillic),
    nameMax
  );

  return {
    label: fitText(zoneLabel(position), position === "single" ? 48 : 44),
    signedLine: fitText(
      `Signed by: ${name} on ${date} at ${time} UTC`,
      signedMax
    ),
    ipLine: fitText(`IP: ${meta.ip} · ${deviceShort}`, signedMax),
  };
}

type PageLike = ReturnType<PDFDocument["getPages"]>[number];

function drawRectBorder(
  page: PageLike,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const top = y + height;
  const right = x + width;
  const borderOpts = {
    thickness: 0.5,
    color: GREEN,
    opacity: 0.25,
  };

  page.drawLine({
    start: { x, y },
    end: { x: right, y },
    ...borderOpts,
  });
  page.drawLine({
    start: { x: right, y },
    end: { x: right, y: top },
    ...borderOpts,
  });
  page.drawLine({
    start: { x: right, y: top },
    end: { x, y: top },
    ...borderOpts,
  });
  page.drawLine({
    start: { x, y: top },
    end: { x, y },
    ...borderOpts,
  });
}

function drawZoneBackground(
  page: PageLike,
  pageWidth: number,
  position: SignerPosition
) {
  const fill = {
    y: ZONE_BOTTOM,
    height: ZONE_HEIGHT,
    color: GREEN,
    opacity: 0.06,
  };

  if (position === "single") {
    const x = MARGIN - 4;
    const w = pageWidth - MARGIN * 2 + 8;
    page.drawRectangle({ x, width: w, ...fill });
    drawRectBorder(page, x, ZONE_BOTTOM, w, ZONE_HEIGHT);
    return;
  }

  const half = pageWidth / 2;

  if (position === "left") {
    const x = MARGIN - 4;
    const w = half - MARGIN - 6;
    page.drawRectangle({ x, width: w, ...fill });
    drawRectBorder(page, x, ZONE_BOTTOM, w, ZONE_HEIGHT);
    return;
  }

  const x = half + 10;
  const w = pageWidth - MARGIN - x + 4;
  page.drawRectangle({ x, width: w, ...fill });
  drawRectBorder(page, x, ZONE_BOTTOM, w, ZONE_HEIGHT);
}

function drawZoneTopSeparator(
  page: PageLike,
  pageWidth: number,
  position: SignerPosition
) {
  const half = pageWidth / 2;
  const lineOpts = {
    thickness: 0.5,
    color: GREEN,
    opacity: 0.4,
  };

  if (position === "single") {
    page.drawLine({
      start: { x: MARGIN, y: Y_ZONE_TOP },
      end: { x: pageWidth - MARGIN, y: Y_ZONE_TOP },
      ...lineOpts,
    });
    return;
  }

  if (position === "left") {
    page.drawLine({
      start: { x: MARGIN, y: Y_ZONE_TOP },
      end: { x: half - 10, y: Y_ZONE_TOP },
      ...lineOpts,
    });
    return;
  }

  page.drawLine({
    start: { x: half + 10, y: Y_ZONE_TOP },
    end: { x: pageWidth - MARGIN, y: Y_ZONE_TOP },
    ...lineOpts,
  });
}

function drawVerticalDivider(page: PageLike, pageWidth: number) {
  const half = pageWidth / 2;
  page.drawLine({
    start: { x: half, y: ZONE_BOTTOM + 8 },
    end: { x: half, y: Y_ZONE_TOP - 4 },
    thickness: 0.5,
    color: GREEN,
    opacity: 0.3,
  });
}

function drawQrSeparator(page: PageLike, pageWidth: number) {
  page.drawLine({
    start: { x: MARGIN, y: ZONE_BOTTOM - 3 },
    end: { x: pageWidth - MARGIN, y: ZONE_BOTTOM - 3 },
    thickness: 0.3,
    color: GREEN,
    opacity: 0.2,
  });
}

function getZoneLayout(pageWidth: number, position: SignerPosition) {
  const half = pageWidth / 2;
  const textX = position === "right" ? half + 14 : MARGIN + 5;

  if (position === "single") {
    return {
      textX: MARGIN + 5,
      brandX: MARGIN + 5,
      canvasX: pageWidth - MARGIN - CANVAS_W - 10,
    };
  }

  if (position === "left") {
    return {
      textX,
      brandX: MARGIN + 5,
      canvasX: MARGIN + 5,
    };
  }

  const zoneLeft = half + 10;
  const zoneWidth = pageWidth - MARGIN - zoneLeft;
  return {
    textX,
    brandX: zoneLeft + 5,
    canvasX: zoneLeft + zoneWidth - CANVAS_W - 5,
  };
}

function drawZoneContent(
  page: PageLike,
  pageWidth: number,
  pngImage: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  meta: EmbedSignatureMeta,
  font: PDFFont,
  supportsCyrillic: boolean,
  position: SignerPosition
) {
  const { textX, brandX, canvasX } = getZoneLayout(pageWidth, position);
  const lines = buildZoneLines(meta, position, supportsCyrillic);

  drawZoneBackground(page, pageWidth, position);
  drawZoneTopSeparator(page, pageWidth, position);

  if (position === "left") {
    drawVerticalDivider(page, pageWidth);
  }

  page.drawText(lines.label, {
    x: textX,
    y: Y_LABEL,
    size: 7.5,
    font,
    color: GREEN,
  });

  page.drawText(lines.signedLine, {
    x: textX,
    y: Y_SIGNED_BY,
    size: 8,
    font,
    color: TEXT_PRIMARY,
  });

  page.drawText(lines.ipLine, {
    x: textX,
    y: Y_IP,
    size: 7,
    font,
    color: TEXT_SECONDARY,
  });

  page.drawImage(pngImage, {
    x: canvasX,
    y: Y_CANVAS,
    width: CANVAS_W,
    height: CANVAS_H,
  });

  page.drawText(BRAND_LINE, {
    x: brandX,
    y: Y_BRAND,
    size: 6,
    font,
    color: GREEN,
  });
}

async function drawVerificationBlock(
  pdfDoc: PDFDocument,
  page: PageLike,
  documentId: string,
  font: PDFFont
) {
  const { width: pageWidth } = page.getSize();
  const half = pageWidth / 2;

  drawQrSeparator(page, pageWidth);

  const verifyUrl = `${getAppUrl()}/verify/${documentId}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 80,
    margin: 1,
  });
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrBytes = Buffer.from(qrBase64, "base64");
  const qrImage = await pdfDoc.embedPng(qrBytes);
  const qrSize = 40;

  page.drawImage(qrImage, {
    x: half - 20,
    y: MARGIN + 8,
    width: qrSize,
    height: qrSize,
  });

  const verifyLabel = "Верифицирай / Verify";
  const labelWidth = font.widthOfTextAtSize(verifyLabel, 6);
  page.drawText(verifyLabel, {
    x: half - labelWidth / 2,
    y: MARGIN + 4,
    size: 6,
    font,
    color: TEXT_MUTED,
  });
}

export async function embedSignature(
  pdfBytes: Uint8Array,
  signaturePng: Uint8Array,
  meta: EmbedSignatureMeta,
  position: SignerPosition = "single",
  documentId?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const { font, supportsCyrillic } = await loadFont(pdfDoc);

  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width: pageWidth } = lastPage.getSize();
  const pngImage = await pdfDoc.embedPng(signaturePng);

  drawZoneContent(
    lastPage,
    pageWidth,
    pngImage,
    meta,
    font,
    supportsCyrillic,
    position
  );

  if (documentId) {
    await drawVerificationBlock(pdfDoc, lastPage, documentId, font);
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
  signatures: SignatureBlock[],
  documentId?: string
): Promise<Uint8Array> {
  if (signatures.length === 0) return pdfBytes;

  let result = pdfBytes;
  for (let i = 0; i < signatures.length; i++) {
    const sig = signatures[i];
    const position: SignerPosition =
      signatures.length === 1 ? "single" : i === 0 ? "left" : "right";
    const isLast = i === signatures.length - 1;
    result = await embedSignature(
      result,
      sig.signaturePng,
      {
        recipientName: sig.recipientName,
        signedAt: sig.signedAt,
        ip: sig.ip,
        userAgent: sig.userAgent,
      },
      position,
      isLast ? documentId : undefined
    );
  }
  return result;
}
