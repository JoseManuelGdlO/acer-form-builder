import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import { Company } from '../models';
import { QuoteTemplate } from '../models/QuoteTemplate';
import { config } from '../config/env';
import { resolveCompanyLogoUrl } from '../utils/company-branding';

type QuotePdfPayload = {
  folio: string;
  clientName: string;
  advisorName: string;
  title: string;
  hotel: string;
  totalLabel: string;
  advanceLabel: string;
  validUntilLabel: string;
  includes: string[];
  excludes: string[];
  terms: string;
};

const uploadsBase = path.isAbsolute(config.uploadsDir)
  ? config.uploadsDir
  : path.join(process.cwd(), config.uploadsDir);

function hexToRgb(hex: string, fallback: RGB): RGB {
  const raw = (hex || '').trim().replace('#', '');
  const normalized = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback;
  const n = parseInt(normalized, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = String(text || '').split('\n');
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const next = `${current} ${words[i]}`;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

async function loadLogoBytes(logoUrl: string | null | undefined): Promise<{ bytes: Buffer; kind: 'png' | 'jpg' } | null> {
  if (!logoUrl) return null;
  try {
    let bytes: Buffer | null = null;
    const dataMatch = logoUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
    if (dataMatch) {
      bytes = Buffer.from(dataMatch[2], 'base64');
      return { bytes, kind: dataMatch[1].toLowerCase().includes('png') ? 'png' : 'jpg' };
    }
    if (logoUrl.startsWith('/uploads/')) {
      const relative = logoUrl.replace(/^\/uploads\//, '');
      const filePath = path.join(uploadsBase, relative);
      bytes = await fs.promises.readFile(filePath);
    } else if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      const res = await fetch(logoUrl);
      if (!res.ok) return null;
      bytes = Buffer.from(await res.arrayBuffer());
    } else {
      const filePath = path.isAbsolute(logoUrl) ? logoUrl : path.join(uploadsBase, logoUrl);
      bytes = await fs.promises.readFile(filePath);
    }
    if (!bytes) return null;
    const kind = bytes[0] === 0x89 ? 'png' : 'jpg';
    return { bytes, kind };
  } catch {
    return null;
  }
}

function drawWrapped(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
  color: RGB,
  lineHeight = size + 4
): number {
  const lines = wrapText(text, font, size, maxWidth);
  let cursor = y;
  for (const line of lines) {
    if (line) {
      page.drawText(line, { x, y: cursor, size, font, color });
    }
    cursor -= lineHeight;
  }
  return cursor;
}

export async function renderQuotePdf(params: {
  template: QuoteTemplate;
  company: Company | null;
  payload: QuotePdfPayload;
}): Promise<Uint8Array> {
  const { template, company, payload } = params;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const headerColor = hexToRgb(template.headerColor, rgb(0.075, 0.475, 0.745));
  const accentColor = hexToRgb(template.accentColor, rgb(0.835, 0.118, 0.149));
  const ink = rgb(0.15, 0.16, 0.18);
  const muted = rgb(0.4, 0.42, 0.45);
  const white = rgb(1, 1, 1);

  page.drawRectangle({ x: 0, y: 777, width: 595.28, height: 65, color: headerColor });

  let textX = 32;
  if (template.showLogo) {
    const logo = await loadLogoBytes(resolveCompanyLogoUrl(company));
    if (logo) {
      try {
        const image = logo.kind === 'png' ? await pdf.embedPng(logo.bytes) : await pdf.embedJpg(logo.bytes);
        const height = 28;
        const width = (image.width / image.height) * height;
        page.drawImage(image, { x: 32, y: 796, width, height });
        textX = 32 + width + 12;
      } catch {
        // continue without logo
      }
    }
  }

  page.drawText(template.companyName.slice(0, 80), {
    x: textX,
    y: 812,
    size: 12,
    font: fontBold,
    color: white,
  });
  if (template.contact) {
    page.drawText(template.contact.slice(0, 90), {
      x: textX,
      y: 796,
      size: 8,
      font,
      color: white,
    });
  }
  const folioLabel = `Folio ${payload.folio}`;
  const folioWidth = font.widthOfTextAtSize(folioLabel, 9);
  page.drawText(folioLabel, {
    x: 595.28 - 32 - folioWidth,
    y: 812,
    size: 9,
    font,
    color: white,
  });

  let y = 748;
  page.drawText(template.title, { x: 32, y, size: 13, font: fontBold, color: accentColor });
  y -= 22;
  y = drawWrapped(
    page,
    `Cliente: ${payload.clientName}  ·  Agente: ${payload.advisorName}`,
    font,
    10,
    32,
    y,
    530,
    ink
  );
  y -= 4;
  y = drawWrapped(
    page,
    `Servicio: ${payload.title}${payload.hotel ? `  ·  ${payload.hotel}` : ''}`,
    font,
    10,
    32,
    y,
    530,
    ink
  );
  y -= 10;

  const boxW = 170;
  const boxes: Array<[string, string]> = [
    ['Costo total', payload.totalLabel],
    ['Anticipo', payload.advanceLabel],
    ['Vigencia', payload.validUntilLabel],
  ];
  boxes.forEach((box, i) => {
    const x = 32 + i * (boxW + 10);
    page.drawRectangle({
      x,
      y: y - 36,
      width: boxW,
      height: 42,
      borderColor: rgb(0.85, 0.87, 0.9),
      borderWidth: 1,
    });
    page.drawText(box[0].toUpperCase(), { x: x + 8, y: y - 6, size: 7, font, color: muted });
    page.drawText(box[1].slice(0, 28), { x: x + 8, y: y - 24, size: 10, font: fontBold, color: ink });
  });
  y -= 58;

  const colW = 250;
  page.drawText('INCLUYE', { x: 32, y, size: 8, font: fontBold, color: accentColor });
  page.drawText('NO INCLUYE', { x: 313, y, size: 8, font: fontBold, color: muted });
  y -= 16;
  const includeLines = payload.includes.length ? payload.includes : ['—'];
  const excludeLines = payload.excludes.length ? payload.excludes : ['—'];
  const maxRows = Math.max(includeLines.length, excludeLines.length);
  for (let i = 0; i < maxRows; i += 1) {
    if (includeLines[i]) {
      drawWrapped(page, `· ${includeLines[i]}`, font, 9, 32, y, colW, ink, 12);
    }
    if (excludeLines[i]) {
      drawWrapped(page, `· ${excludeLines[i]}`, font, 9, 313, y, colW, ink, 12);
    }
    y -= 14;
  }

  y -= 8;
  page.drawText('CONDICIONES', { x: 32, y, size: 8, font: fontBold, color: muted });
  y -= 14;
  y = drawWrapped(page, payload.terms || '—', font, 9, 32, y, 530, ink, 12);

  page.drawLine({
    start: { x: 32, y: 48 },
    end: { x: 563, y: 48 },
    thickness: 0.5,
    color: rgb(0.85, 0.87, 0.9),
  });
  drawWrapped(page, template.footer, font, 8, 32, 34, 530, muted, 11);

  return pdf.save();
}

export function linesFromText(value: string | null | undefined): string[] {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}
