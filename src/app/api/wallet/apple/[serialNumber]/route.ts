import { NextResponse } from "next/server";
import { generateApplePass } from "@/lib/wallet/apple";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/wallet/apple/[serialNumber]
 * Télécharge le pass .pkpass pour un numéro de série donné
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ serialNumber: string }> }
) {
  const { serialNumber } = await params;

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
  });

  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  const passBuffer = await generateApplePass(card.id);

  if (!passBuffer) {
    return NextResponse.json(
      { error: "Erreur lors de la génération du pass" },
      { status: 500 }
    );
  }

  // Si les certificats Apple sont configurés, retourner un vrai .pkpass
  if (process.env.APPLE_PASS_TYPE_ID) {
    return new NextResponse(new Uint8Array(passBuffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="${serialNumber}.pkpass"`,
      },
    });
  }

  // Mode dev: retourner le JSON du pass
  return NextResponse.json(JSON.parse(passBuffer.toString()), {
    headers: {
      "X-Dev-Mode": "true",
      "X-Note": "Configure Apple certificates in .env for real .pkpass files",
    },
  });
}
