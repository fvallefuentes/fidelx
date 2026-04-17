import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

interface Placeholder {
  id: string;
  label: string;
  from: string;
  to: string;
}

const WIDTH = 375;
const HEIGHT = 98;

const PLACEHOLDERS: Placeholder[] = [
  { id: "cafe", label: "Café", from: "#6F4E37", to: "#C9A27A" },
  { id: "boulangerie", label: "Boulangerie", from: "#D4A574", to: "#F4E4C1" },
  { id: "bar", label: "Bar", from: "#1B1B2F", to: "#53354A" },
  { id: "restaurant", label: "Restaurant", from: "#3A1F1F", to: "#8B3A3A" },
  { id: "patisserie", label: "Pâtisserie", from: "#F7B2B7", to: "#F9D5CA" },
  { id: "fast-food", label: "Fast-food", from: "#FF5A36", to: "#FFD23F" },
  { id: "pizzeria", label: "Pizzeria", from: "#C0392B", to: "#27AE60" },
  { id: "generique", label: "Générique", from: "#4A6FA5", to: "#9AB8D9" },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvg(p: Placeholder): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.from}"/>
      <stop offset="100%" stop-color="${p.to}"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
  <text x="${WIDTH / 2}" y="${HEIGHT / 2}" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#ffffff" stroke="rgba(0,0,0,0.25)" stroke-width="1" paint-order="stroke">${escapeXml(p.label)}</text>
</svg>`;
}

async function main() {
  const outDir = join(process.cwd(), "public", "strip-library");
  await mkdir(outDir, { recursive: true });

  for (const p of PLACEHOLDERS) {
    const svg = buildSvg(p);
    const outPath = join(outDir, `${p.id}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    console.log(`wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
