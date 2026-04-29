/**
 * Génère le strip.png Apple Wallet avec les pastilles de tampons.
 *
 * Design : cercles BLANCS pleins avec un ✓ couleur du fond pour les
 * tampons obtenus, cercles outline blanc transparent pour les restants.
 * Le fond du strip = couleur du programme, donc se fond avec la carte.
 */

import sharp from "sharp";

interface StripOptions {
  currentStamps: number;
  maxStamps: number;
  bgColor: string;
}

// Apple Wallet storeCard strip dimensions @3x
const STRIP_W = 1125;
const STRIP_H = 432;

export async function generateStripImage({
  currentStamps,
  maxStamps,
  bgColor,
}: StripOptions): Promise<Buffer> {
  const total = Math.max(1, Math.min(20, maxStamps));
  const filled = Math.max(0, Math.min(total, currentStamps));

  // Layout : 1 ou 2 rangées selon le nombre de tampons
  // Pour 10 par défaut → 2 rangées de 5 (comme dans les screenshots)
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
      // Cercle blanc plein avec ✓ couleur du fond
      dots.push(
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>`
      );
      dots.push(buildCheckPath(cx, cy, dotSize * 0.45, bgColor));
    } else {
      // Cercle outline blanc translucide
      dots.push(
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="6"/>`
      );
    }
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${STRIP_W}" height="${STRIP_H}" viewBox="0 0 ${STRIP_W} ${STRIP_H}">
  <rect width="${STRIP_W}" height="${STRIP_H}" fill="${bgColor}"/>
  ${dots.join("\n  ")}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/* ─── Helpers ──────────────────────────────────────────────── */

/**
 * Trace un ✓ centré en (cx, cy) avec une largeur d'environ `size`,
 * en chemin SVG de couleur `color`. Strokes épais et arrondis pour
 * un look "checkmark" iOS.
 */
function buildCheckPath(
  cx: number,
  cy: number,
  size: number,
  color: string
): string {
  // Coordonnées relatives d'un ✓ propre
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
