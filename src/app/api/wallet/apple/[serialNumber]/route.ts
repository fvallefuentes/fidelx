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

  let passBuffer: Buffer | null = null;
  try {
    passBuffer = await generateApplePass(card.id);
  } catch (err) {
    console.error("[wallet/apple] generateApplePass error:", err);
    return NextResponse.json(
      { error: "Erreur génération pass", detail: String(err) },
      { status: 500 }
    );
  }

  if (!passBuffer) {
    return NextResponse.json(
      { error: "Pass vide retourné" },
      { status: 500 }
    );
  }

  if (process.env.APPLE_PASS_TYPE_ID) {
    return new NextResponse(new Uint8Array(passBuffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="${serialNumber}.pkpass"`,
      },
    });
  }

  return NextResponse.json(JSON.parse(passBuffer.toString()), {
    headers: { "X-Dev-Mode": "true" },
  });
}
