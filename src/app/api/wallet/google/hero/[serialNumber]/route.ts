import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Sert le hero image (carte POINTS avec image personnalisée) pour Google
 * Wallet. Recoit le data URL stocké dans cardDesign.heroImage, le décode
 * et l'envoie en PNG/JPEG redimensionné aux dimensions Google Wallet
 * (1032×336 recommandé).
 *
 * Si pas de heroImage configurée → 404 (Google retombe sur l'absence
 * d'image héro, ce qui est OK).
 */
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

  const design = card.program.cardDesign as Record<string, unknown>;
  const heroDataUrl = design.heroImage as string | undefined;
  if (!heroDataUrl) {
    return new NextResponse("No hero image", { status: 404 });
  }

  const match = heroDataUrl.match(/^data:image\/[\w+.-]+;base64,(.+)$/);
  if (!match) return new NextResponse("Bad image data", { status: 400 });

  try {
    const buf = Buffer.from(match[1], "base64");
    const sharp = (await import("sharp")).default;
    // Google Wallet recommande 1032×336 pour le hero. On cover/center.
    const png = await sharp(buf)
      .resize(1032, 336, { fit: "cover", position: "center" })
      .png()
      .toBuffer();
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    console.error("[google/hero] failed:", (e as Error).message);
    return new NextResponse("Image processing failed", { status: 500 });
  }
}
