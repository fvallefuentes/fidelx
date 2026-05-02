/**
 * Génère le strip.png Apple Wallet avec les pastilles de tampons.
 *
 * Couleurs personnalisables via cardDesign :
 * - bgColor          : fond du strip (= fond de la carte)
 * - stampColor       : fill des cercles tampons obtenus
 * - stampCheckColor  : couleur du ✓ à l'intérieur
 * - stampEmptyColor  : couleur du contour des cercles vides
 */

import sharp from "sharp";

interface StripOptions {
  currentStamps: number;
  maxStamps: number;
  bgColor: string;
  stampColor?: string;
  stampCheckColor?: string;
  stampEmptyColor?: string;
}

// Apple Wallet storeCard strip dimensions @3x
const STRIP_W = 1125;
const STRIP_H = 432;

export async function generateStripImage({
  currentStamps,
  maxStamps,
  bgColor,
  stampColor,
  stampCheckColor,
  stampEmptyColor,
}: StripOptions): Promise<Buffer> {
  const total = Math.max(1, Math.min(20, maxStamps));
  const filled = Math.max(0, Math.min(total, currentStamps));

  // Defaults : si pas définis, on dérive du fond
  const dark = isDark(bgColor);
  const fillColor = stampColor || (dark ? "#ffffff" : "#0a0a0a");
  const checkColor = stampCheckColor || bgColor;
  const emptyStroke = stampEmptyColor || fillColor;

  // Layout : 1 ou 2 rangées selon le nombre de tampons
  const rows = total <= 5 ? 1 : 2;
  const perRow = Math.ceil(total / rows);

  // Espacement
  const padX = 90;
  const padY = 40;
  const gapX = 40;
  const gapY = 40;

  const availW = STRIP_W - padX * 2;
  const availH = STRIP_H - padY * 2;

  const dotByWidth = Math.floor((availW - gapX * (perRow - 1)) / perRow);
  const dotByHeight = Math.floor((availH - gapY * (rows - 1)) / rows);
  const dotSize = Math.min(dotByWidth, dotByHeight, 200);

  const totalRowW = dotSize * perRow + gapX * (perRow - 1);
  const startX = (STRIP_W - totalRowW) / 2;

  const totalH = dotSize * rows + (rows - 1) * gapY;
  const startY = (STRIP_H - totalH) / 2;

  const dots: string[] = [];
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const cx = startX + col * (dotSize + gapX) + dotSize / 2;
    const cy = startY + row * (dotSize + gapY) + dotSize / 2;
    const r = dotSize / 2 - 4;

    const isFilled = i < filled;
    if (isFilled) {
      dots.push(
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${escapeXml(fillColor)}"/>`
      );
      dots.push(buildCheckPath(cx, cy, dotSize * 0.45, escapeXml(checkColor)));
    } else {
      dots.push(
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${escapeXml(emptyStroke)}" stroke-width="6" stroke-opacity="0.85"/>`
      );
    }
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${STRIP_W}" height="${STRIP_H}" viewBox="0 0 ${STRIP_W} ${STRIP_H}">
  <rect width="${STRIP_W}" height="${STRIP_H}" fill="${escapeXml(bgColor)}"/>
  ${dots.join("\n  ")}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/* ─── Helpers ──────────────────────────────────────────────── */

function buildCheckPath(
  cx: number,
  cy: number,
  size: number,
  color: string
): string {
  const w = size;
  const x1 = cx - w * 0.42;
  const y1 = cy + w * 0.04;
  const x2 = cx - w * 0.08;
  const y2 = cy + w * 0.34;
  const x3 = cx + w * 0.46;
  const y3 = cy - w * 0.32;
  const stroke = Math.max(8, w * 0.16);

  return `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${stroke.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function isDark(hex: string): boolean {
  const m = hex.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return true;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!)
  );
}
