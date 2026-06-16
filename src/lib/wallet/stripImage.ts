/**
 * Génère le strip.png Apple Wallet avec les pastilles de tampons.
 *
 * Couleurs personnalisables via cardDesign :
 * - bgColor          : fond du strip (= fond de la carte)
 * - stampColor       : fill des cercles tampons obtenus
 * - stampCheckColor  : couleur de l'icône à l'intérieur
 * - stampEmptyColor  : couleur du contour des cercles vides
 * - stampIcon        : clé de l'icône du tampon obtenu (check par défaut)
 * - stampBgType      : "none" | "color" | "image" — fond derrière les ronds
 * - stampBgColor / stampBgColor2 : couleur(s) du fond (dégradé si 2)
 * - stampBgImage     : data URL image de fond (cover)
 */

import sharp from "sharp";
import { stampIconSvg, getStampSpacingMult } from "./stamp-icons";

interface StripOptions {
  currentStamps: number;
  maxStamps: number;
  bgColor: string;
  stampColor?: string;
  stampCheckColor?: string;
  stampEmptyColor?: string;
  stampIcon?: string;
  stampSpacing?: string;
  stampBgType?: "none" | "color" | "image";
  stampBgColor?: string;
  stampBgColor2?: string;
  stampBgImage?: string | null; // data URL
}

// Apple Wallet storeCard strip dimensions @3x
const STRIP_W = 1125;
const STRIP_H = 432;

function decodeDataUrl(dataUrl: string): Buffer | null {
  const m = dataUrl.match(/^data:image\/[\w+.-]+;base64,(.+)$/);
  if (!m) return null;
  try {
    return Buffer.from(m[1], "base64");
  } catch {
    return null;
  }
}

export async function generateStripImage({
  currentStamps,
  maxStamps,
  bgColor,
  stampColor,
  stampCheckColor,
  stampEmptyColor,
  stampIcon,
  stampSpacing,
  stampBgType = "none",
  stampBgColor,
  stampBgColor2,
  stampBgImage,
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

  // Espacement (multiplicateur choisi par le merchant)
  const spacingMult = getStampSpacingMult(stampSpacing);
  const padX = 90;
  const padY = 40;
  const gapX = Math.round(40 * spacingMult);
  const gapY = Math.round(40 * spacingMult);

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
      dots.push(
        stampIconSvg(stampIcon, cx, cy, dotSize * 0.5, escapeXml(checkColor))
      );
    } else {
      dots.push(
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${escapeXml(emptyStroke)}" stroke-width="6" stroke-opacity="0.85"/>`
      );
    }
  }

  // ─── Fond derrière les ronds ───
  // "image" → on composite l'image en cover sous le SVG des ronds.
  // "color" → rect plein ou dégradé. "none" → bgColor uni (historique).
  let backgroundSvg: string;
  let baseImageBuf: Buffer | null = null;

  if (stampBgType === "image" && stampBgImage) {
    const raw = decodeDataUrl(stampBgImage);
    if (raw) {
      baseImageBuf = await sharp(raw)
        .resize(STRIP_W, STRIP_H, { fit: "cover", position: "center" })
        .png()
        .toBuffer();
      // Léger voile sombre pour garder les ronds lisibles sur l'image.
      backgroundSvg = `<rect width="${STRIP_W}" height="${STRIP_H}" fill="rgba(0,0,0,0.18)"/>`;
    } else {
      backgroundSvg = `<rect width="${STRIP_W}" height="${STRIP_H}" fill="${escapeXml(bgColor)}"/>`;
    }
  } else if (stampBgType === "color" && stampBgColor) {
    if (stampBgColor2) {
      backgroundSvg = `<defs><linearGradient id="sbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${escapeXml(
        stampBgColor
      )}"/><stop offset="1" stop-color="${escapeXml(
        stampBgColor2
      )}"/></linearGradient></defs><rect width="${STRIP_W}" height="${STRIP_H}" fill="url(#sbg)"/>`;
    } else {
      backgroundSvg = `<rect width="${STRIP_W}" height="${STRIP_H}" fill="${escapeXml(stampBgColor)}"/>`;
    }
  } else {
    backgroundSvg = `<rect width="${STRIP_W}" height="${STRIP_H}" fill="${escapeXml(bgColor)}"/>`;
  }

  const overlaySvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${STRIP_W}" height="${STRIP_H}" viewBox="0 0 ${STRIP_W} ${STRIP_H}">
  ${backgroundSvg}
  ${dots.join("\n  ")}
</svg>`;

  if (baseImageBuf) {
    // Composite : image de fond + overlay (voile + ronds).
    return sharp(baseImageBuf)
      .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  return sharp(Buffer.from(overlaySvg)).png().toBuffer();
}

/* ─── Helpers ──────────────────────────────────────────────── */

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
