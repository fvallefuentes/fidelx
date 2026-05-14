import { NextResponse } from "next/server";

/**
 * Logo Fidlify rasterisé en PNG 512×512.
 *
 * Utilisé comme fallback du programLogo Google Wallet quand le merchant
 * n'a pas configuré son propre logo (Google Wallet refuse la création
 * d'une LoyaltyClass sans programLogo).
 *
 * On rasterise le SVG inline avec sharp à la volée. Mise en cache CDN
 * long terme (1 jour) car ce logo ne change quasi jamais.
 */

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="512" height="512" fill="none">
  <rect width="256" height="256" fill="#0E1116"/>
  <g transform="rotate(-12 128 128)">
    <rect x="48" y="78" width="160" height="100" rx="16" fill="#D9FF3C" opacity="0.35"/>
    <rect x="64" y="148" width="60" height="6" rx="3" fill="#0E1116" opacity="0.35"/>
  </g>
  <g transform="rotate(8 128 128)">
    <rect x="40" y="78" width="176" height="108" rx="18" fill="#D9FF3C"/>
    <g transform="translate(60 96)">
      <rect x="0" y="0" width="12" height="12" rx="2.5" fill="#0E1116"/>
      <rect x="15" y="0" width="12" height="12" rx="2.5" fill="#0E1116"/>
      <rect x="30" y="0" width="12" height="12" rx="2.5" fill="#0E1116"/>
      <rect x="45" y="0" width="12" height="12" rx="2.5" fill="#0E1116"/>
      <rect x="0" y="15" width="12" height="12" rx="2.5" fill="#0E1116"/>
      <rect x="0" y="30" width="12" height="12" rx="2.5" fill="#0E1116"/>
      <rect x="15" y="30" width="12" height="12" rx="2.5" fill="#0E1116"/>
      <rect x="30" y="30" width="12" height="12" rx="2.5" fill="#0E1116"/>
      <rect x="0" y="45" width="12" height="12" rx="2.5" fill="#0E1116"/>
    </g>
    <g transform="translate(154 100)">
      <rect width="44" height="34" rx="5" fill="#0E1116" opacity="0.92"/>
      <line x1="0" y1="11" x2="44" y2="11" stroke="#D9FF3C" stroke-width="1.5"/>
      <line x1="0" y1="22" x2="44" y2="22" stroke="#D9FF3C" stroke-width="1.5"/>
      <line x1="14" y1="0" x2="14" y2="34" stroke="#D9FF3C" stroke-width="1.5"/>
      <line x1="30" y1="0" x2="30" y2="34" stroke="#D9FF3C" stroke-width="1.5"/>
    </g>
    <rect x="60" y="160" width="78" height="6" rx="3" fill="#0E1116" opacity="0.5"/>
    <rect x="146" y="160" width="46" height="6" rx="3" fill="#0E1116" opacity="0.5"/>
  </g>
</svg>`;

export async function GET() {
  try {
    const sharp = (await import("sharp")).default;
    const png = await sharp(Buffer.from(SVG)).png().toBuffer();
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    // Fallback : sert le SVG tel quel (Google ne l'acceptera pas
    // mais au moins ça répond avec quelque chose en debug)
    return new NextResponse(SVG, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}
