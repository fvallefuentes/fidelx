import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const bgColor = (design.bgColor as string) || "#1a1a2e";
  const textColor = (design.textColor as string) || "#ffffff";

  const W = 1032;
  const H = 336;
  const bg = bgColor.startsWith("#") ? bgColor : "#1a1a2e";
  const fg = textColor.startsWith("#") ? textColor : "#ffffff";

  const perRow = maxStamps <= 5 ? maxStamps : 5;
  const rows = Math.ceil(maxStamps / perRow);
  const padding = 32;
  const availW = W - padding * 2;
  const availH = H - padding * 2;
  const cellW = availW / perRow;
  const cellH = availH / rows;
  const radius = Math.min(cellW, cellH) * 0.36;

  let circles = "";
  for (let i = 0; i < maxStamps; i++) {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const cx = padding + cellW * col + cellW / 2;
    const cy = padding + cellH * row + cellH / 2;
    const filled = i < currentStamps;
    const sw = Math.max(3, radius * 0.1);

    if (filled) {
      circles += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fg}"/>`;
      const ck = radius * 0.45;
      circles += `<polyline points="${cx - ck * 0.6},${cy} ${cx - ck * 0.1},${cy + ck * 0.55} ${cx + ck * 0.7},${cy - ck * 0.55}" fill="none" stroke="${bg}" stroke-width="${sw * 1.4}" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else {
      circles += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fg}" opacity="0.15"/>`;
      circles += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${fg}" stroke-width="${sw}" opacity="0.55"/>`;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  ${circles}
</svg>`;

  try {
    const sharp = (await import("sharp")).default;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
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