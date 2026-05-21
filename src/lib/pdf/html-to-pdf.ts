// html-to-pdf — convert simple HTML to PDF with Cyrillic (Ubuntu font)
import fs from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFPage, type PDFFont } from "pdf-lib";

const UBUNTU_REGULAR = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Ubuntu-Regular.ttf"
);
const UBUNTU_BOLD = path.join(process.cwd(), "public", "fonts", "Ubuntu-Bold.ttf");

const PAGE_SIZE: [number, number] = [595, 842];
const MARGIN = 60;

type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "p"; text: string }
  | { kind: "br" };

function parseHtmlToBlocks(html: string): Block[] {
  const normalized = html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n__H1__$1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n__H2__$1\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n__P__$1\n")
    .replace(/<br\s*\/?>/gi, "\n__BR__\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "$1")
    .replace(/<[^>]+>/g, "");

  const blocks: Block[] = [];

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("__H1__")) {
      blocks.push({ kind: "h1", text: line.replace(/^__H1__/, "").trim() });
    } else if (line.startsWith("__H2__")) {
      blocks.push({ kind: "h2", text: line.replace(/^__H2__/, "").trim() });
    } else if (line === "__BR__") {
      blocks.push({ kind: "br" });
    } else if (line.startsWith("__P__")) {
      const text = line.replace(/^__P__/, "").trim();
      if (text) blocks.push({ kind: "p", text });
      else blocks.push({ kind: "br" });
    } else {
      blocks.push({ kind: "p", text: line });
    }
  }

  return blocks;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }

  if (current) lines.push(current);
  return lines;
}

export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = fs.readFileSync(UBUNTU_REGULAR);
  const boldBytes = fs.existsSync(UBUNTU_BOLD)
    ? fs.readFileSync(UBUNTU_BOLD)
    : fontBytes;

  const regularFont = await pdfDoc.embedFont(fontBytes);
  const boldFont = await pdfDoc.embedFont(boldBytes);

  let page = pdfDoc.addPage(PAGE_SIZE);
  let { width, height } = page.getSize();
  const maxWidth = width - MARGIN * 2;
  let y = height - MARGIN;

  const blocks = parseHtmlToBlocks(html);

  const ensureSpace = (needed: number) => {
    if (y >= MARGIN + needed) return;
    page = pdfDoc.addPage(PAGE_SIZE);
    ({ width, height } = page.getSize());
    y = height - MARGIN;
  };

  const drawLines = (
    lines: string[],
    size: number,
    font: PDFFont,
    lineHeight: number,
    extraGap = 0
  ) => {
    for (const line of lines) {
      ensureSpace(lineHeight + 4);
      page.drawText(line, {
        x: MARGIN,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
    y -= extraGap;
  };

  for (const block of blocks) {
    if (block.kind === "br") {
      y -= 14;
      continue;
    }

    if (block.kind === "h1") {
      drawLines(wrapText(block.text, boldFont, 20, maxWidth), 20, boldFont, 28, 10);
      continue;
    }

    if (block.kind === "h2") {
      drawLines(wrapText(block.text, boldFont, 15, maxWidth), 15, boldFont, 22, 8);
      continue;
    }

    if (block.kind === "p") {
      drawLines(wrapText(block.text, regularFont, 11, maxWidth), 11, regularFont, 18, 4);
    }
  }

  for (const p of pdfDoc.getPages()) {
    drawFooter(p, regularFont);
  }

  return pdfDoc.save();
}

function drawFooter(page: PDFPage, font: PDFFont) {
  page.drawText("sign.runverifiedapp.com", {
    x: MARGIN,
    y: MARGIN - 20,
    size: 9,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });
}
