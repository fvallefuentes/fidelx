import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getStampAreaInset,
  getStampAreaRadius,
  stampIconSvg,
} from "@/lib/wallet/stamp-icons";
import { getGoogleStampGridLayout } from "@/lib/wallet/google-stamp-grid";

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
  const areaInset = Math.round(getStampAreaInset(design.stampAreaInset) * 2.75);
  const areaRadius = Math.min(
    Math.round(getStampAreaRadius(design.stampAreaRadius) * 2.75),
    H / 2
  );
  const areaWidth = W - areaInset * 2;

  // Fond derrière les ronds (même logique que le strip Apple).
  const stampBgType = (design.stampBgType as string) || "none";
  const stampBgColor = design.stampBgColor as string | undefined;
  const stampBgColor2 = design.stampBgColor2 as string | undefined;
  const stampBgImage = design.stampBgImage as string | undefined;

  const {
    perRow,
    horizontalPadding,
    verticalPadding,
    cellWidth,
    cellHeight,
    radius,
  } = getGoogleStampGridLayout({
    maxStamps,
    stampAreaInset: design.stampAreaInset,
    stampSpacing,
  });

  let circles = "";
  for (let i = 0; i < maxStamps; i++) {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const cx = horizontalPadding + cellWidth * col + cellWidth / 2;
    const cy = verticalPadding + cellHeight * row + cellHeight / 2;
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
  // La marge laisse apparaître le fond de carte autour de la zone.
  let backgroundSvg: string;
  let baseImageBuf: Buffer | null = null;
  const areaRect = `x="${areaInset}" y="0" width="${areaWidth}" height="${H}" rx="${areaRadius}"`;
  const outerRect = `<rect width="${W}" height="${H}" fill="${bg}"/>`;
  if (stampBgType === "image" && stampBgImage) {
    const m = stampBgImage.match(/^data:image\/[\w+.-]+;base64,(.+)$/);
    if (m) {
      try {
        const sharp = (await import("sharp")).default;
        const mask = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${areaWidth}" height="${H}"><rect width="${areaWidth}" height="${H}" rx="${areaRadius}" fill="#fff"/></svg>`
        );
        const clippedImage = await sharp(Buffer.from(m[1], "base64"))
          .resize(areaWidth, H, { fit: "cover", position: "center" })
          .composite([{ input: mask, blend: "dest-in" }])
          .png()
          .toBuffer();
        baseImageBuf = await sharp({
          create: {
            width: W,
            height: H,
            channels: 4,
            background: bg,
          },
        })
          .composite([{ input: clippedImage, top: 0, left: areaInset }])
          .png()
          .toBuffer();
        backgroundSvg = `<rect ${areaRect} fill="rgba(0,0,0,0.18)"/>`;
      } catch {
        backgroundSvg = outerRect;
      }
    } else {
      backgroundSvg = outerRect;
    }
  } else if (stampBgType === "color" && stampBgColor) {
    if (stampBgColor2) {
      backgroundSvg = `<defs><linearGradient id="sbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${stampBgColor}"/><stop offset="1" stop-color="${stampBgColor2}"/></linearGradient></defs>${outerRect}<rect ${areaRect} fill="url(#sbg)"/>`;
    } else {
      backgroundSvg = `${outerRect}<rect ${areaRect} fill="${stampBgColor}"/>`;
    }
  } else {
    backgroundSvg = outerRect;
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
