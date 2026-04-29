/**
 * Génère le strip.png Apple Wallet avec les pastilles de tampons.
 *
 * Le strip image est la bande en haut du pass storeCard. On y dessine
 * les cercles de fidélité (remplis = lime, vides = contour).
 *
 * Dimensions Apple Wallet @3x: 1125 x 432 px (largeur fixe imposée par iOS).
 * On retourne une seule version @3x — Apple downscale automatiquement.
 */

import sharp from "sharp";

interface StripOptions {
  currentStamps: number;
  maxStamps: number;
  bgColor: string; // ex: "#0e110b"
  accentColor?: string; // pastille pleine — défaut lime
}

const STRIP_W = 1125;
const STRIP_H = 432;

export async function generateStripImage({
  currentStamps,
  maxStamps,
  bgColor,
  accentColor = "#d4ff4e",
}: StripOptions): Promise<Buffer> {
  const total = Math.max(1, Math.min(20, maxStamps));
  const filled = Math.max(0, Math.min(total, currentStamps));

  // Layout: éventuellement 2 rangées si > 10 stamps, sinon 1 rangée
  const rows = total > 10 ? 2 : 1;
  const perRow = Math.ceil(total / rows);

  // Espacement
  const padX = 80;
  const availW = STRIP_W - padX * 2;
  const gap = 18;
  const dotSize = Math.min(
    140,
    Math.floor((availW - gap * (perRow - 1)) / perRow)
  );

  const totalRowW = dotSize * perRow + gap * (perRow - 1);
  const startX = (STRIP_W - totalRowW) / 2;

  const totalH = dotSize * rows + (rows - 1) * gap;
  const startY = (STRIP_H - totalH) / 2;

  // Détecter si le fond est sombre pour adapter le contraste
  const dark = isDark(bgColor);
  const emptyStroke = dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)";
  const emptyFill = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const filledStroke = accentColor;
  const filledFill = accentColor;
  const starColor = darkenForContrast(accentColor);

  const dots: string[] = [];
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const cx = startX + col * (dotSize + gap) + dotSize / 2;
    const cy = startY + row * (dotSize + gap) + dotSize / 2;
    const r = dotSize / 2 - 6;

    const isFilled = i < filled;
    if (isFilled) {
      // Cercle plein lime + étoile noire
      dots.push(
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${filledFill}" stroke="${filledStroke}" stroke-width="3"/>`
      );
      // Étoile centrée (vraie ★ rendue avec une polyline en chemin SVG)
      const starSize = r * 0.95;
      dots.push(buildStarPath(cx, cy, starSize, starColor));
    } else {
      // Cercle vide en pointillé subtil
      dots.push(
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${emptyFill}" stroke="${emptyStroke}" stroke-width="3" stroke-dasharray="6 6"/>`
      );
    }
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${STRIP_W}" height="${STRIP_H}" viewBox="0 0 ${STRIP_W} ${STRIP_H}">
  <rect width="${STRIP_W}" height="${STRIP_H}" fill="${bgColor}"/>
  <!-- subtle radial highlight in top-right corner -->
  <defs>
    <radialGradient id="hl" cx="0.85" cy="0" r="0.6">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${STRIP_W}" height="${STRIP_H}" fill="url(#hl)"/>
  ${dots.join("\n  ")}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
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

function darkenForContrast(hex: string): string {
  // Pour le lime #d4ff4e on veut une étoile sombre lisible
  return "#0a0d04";
}

function buildStarPath(
  cx: number,
  cy: number,
  size: number,
  color: string
): string {
  // Étoile à 5 branches centrée en (cx, cy)
  const r1 = size / 2;
  const r2 = r1 * 0.4;
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? r1 : r2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `<polygon points="${points.join(" ")}" fill="${color}"/>`;
}
