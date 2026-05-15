import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Sert le logo d'un programme pour Google Wallet (programLogo).
 *
 * Le merchant uploade son logo via le dashboard, qui le stocke en data URI
 * base64 dans `cardDesign.logoData`. Apple Wallet l'utilise tel quel dans
 * le .pkpass (ZIP). Google Wallet n'accepte que des URLs HTTP/HTTPS, d'où
 * cet endpoint qui décode le base64 et le sert avec le bon Content-Type.
 *
 * Si pas de logo merchant → redirige vers /api/wallet/google/default-logo
 * (logo Fidlify rasterisé), car Google rejette toute LoyaltyClass sans
 * programLogo.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ programId: string }> }
) {
  const { programId } = await context.params;

  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
    select: { cardDesign: true },
  });

  const design = (program?.cardDesign as Record<string, unknown> | null) ?? {};
  const logoData = design.logoData as string | undefined;

  // Pas de logo merchant : redirige vers le default Fidlify
  if (!logoData || !logoData.startsWith("data:image/")) {
    const fallback = new URL("/api/wallet/google/default-logo", req.url);
    return NextResponse.redirect(fallback, 302);
  }

  // Parse "data:image/png;base64,XXXX"
  const m = logoData.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!m) {
    return new NextResponse("Invalid logoData format", { status: 500 });
  }

  const buf = Buffer.from(m[2], "base64");

  // Google Wallet cadre le programLogo en CERCLE (avatar). Un logo
  // rectangulaire ou horizontal (type "BODY PERFORMANCE") se fait couper
  // sur les côtés. Solution : on rasterise dans un carré 512×512 avec
  // fit:contain + padding transparent, pour que le logo entier reste
  // visible à l'intérieur du cercle de Google.
  try {
    const sharp = (await import("sharp")).default;
    const png = await sharp(buf)
      .resize(512, 512, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer();
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("[google/logo] sharp resize failed, serving raw:", err);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": m[1],
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }
}
