import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stampIconSvg } from "@/lib/wallet/stamp-icons";

export async function GET(
  _req: Request,
  context: { params: Promise<{ serialNumber: string }> }
) {
  const { serialNumber } = await context.params;
  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    include: { program: true },
  });

  if (!card) return new NextResponse("Not found", { status: 404 });

  const config = card.program.config as Record<string, unknown>;
  const design = card.program.cardDesign as Record<string, unknown>;
  const maxStamps = (config.maxStamps as number) || 10;
  const currentStamps = card.currentStamps;

  // Couleurs : on respecte les overrides explicites du merchant (stampColor,
  // stampCheckColor, stampEmptyColor) comme côté Apple. Fallback sur bgColor/
  // textColor si pas définis.
  const bgColor = (design.bgColor as string) || "#1a1a2e";
  const textColor = (design.textColor as string) || "#ffffff";
  const W = 1032;
  const H = 336;
  const bg = bgColor.startsWith("#") ? bgColor : "#1a1a2e";
  const fg = textColor.startsWith("#") ? textColor : "#ffffff";
  const stampFill = (design.stampColor as string) || fg;
  const stampCheck = (design.stampCheckColor as string) || bg;
  const stampEmptyStroke = (design.stampEmptyColor as string) || fg;
  const stampIcon = (design.stampIcon as string) || "check";
  const stampSpacing = (design.stampSpacing as string) || "normal";

  // Fond derrière les ronds (même logique que le strip Apple).
  const stampBgType = (design.stampBgType as string) || "none";
  const stampBgColor = design.stampBgColor as string | undefined;
  const stampBgColor2 = design.stampBgColor2 as string | undefined;
  const stampBgImage = design.stampBgImage as string | undefined;

  const perRow = maxStamps <= 5 ? maxStamps : 5;
  const rows = Math.ceil(maxStamps / perRow);
  const padding = 32;
  const availW = W - padding * 2;
  const availH = H - padding * 2;
  const cellW = availW / perRow;
  const cellH = availH / rows;
  // Espacement : un rayon plus petit laisse plus de vide entre les ronds.
  const radiusFactor =
    stampSpacing === "tight" ? 0.42 : stampSpacing === "wide" ? 0.28 : 0.36;
  const radius = Math.min(cellW, cellH) * radiusFactor;

  let circles = "";
  for (let i = 0; i < maxStamps; i++) {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const cx = padding + cellW * col + cellW / 2;
    const cy = padding + cellH * row + cellH / 2;
    const filled = i < currentStamps;
    const sw = Math.max(3, radius * 0.1);

    if (filled) {
      circles += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${stampFill}"/>`;
      circles += stampIconSvg(stampIcon, cx, cy, radius * 1.1, stampCheck);
    } else {
      circles += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${stampEmptyStroke}" opacity="0.12"/>`;
      circles += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${stampEmptyStroke}" stroke-width="${sw}" opacity="0.55"/>`;
    }
  }

  // ─── Fond : couleur / dégradé / image (cover) ───
  let backgroundSvg: string;
  let baseImageBuf: Buffer | null = null;
  if (stampBgType === "image" && stampBgImage) {
    const m = stampBgImage.match(/^data:image\/[\w+.-]+;base64,(.+)$/);
    if (m) {
      try {
        const sharp = (await import("sharp")).default;
        baseImageBuf = await sharp(Buffer.from(m[1], "base64"))
          .resize(W, H, { fit: "cover", position: "center" })
          .png()
          .toBuffer();
        backgroundSvg = `<rect width="${W}" height="${H}" fill="rgba(0,0,0,0.18)"/>`;
      } catch {
        backgroundSvg = `<rect width="${W}" height="${H}" fill="${bg}"/>`;
      }
    } else {
      backgroundSvg = `<rect width="${W}" height="${H}" fill="${bg}"/>`;
    }
  } else if (stampBgType === "color" && stampBgColor) {
    if (stampBgColor2) {
      backgroundSvg = `<defs><linearGradient id="sbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${stampBgColor}"/><stop offset="1" stop-color="${stampBgColor2}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sbg)"/>`;
    } else {
      backgroundSvg = `<rect width="${W}" height="${H}" fill="${stampBgColor}"/>`;
    }
  } else {
    backgroundSvg = `<rect width="${W}" height="${H}" fill="${bg}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${backgroundSvg}
  ${circles}
</svg>`;

  try {
    const sharp = (await import("sharp")).default;
    let png: Buffer;
    if (baseImageBuf) {
      png = await sharp(baseImageBuf)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .png()
        .toBuffer();
    } else {
      png = await sharp(Buffer.from(svg)).png().toBuffer();
    }
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}
