import { NextResponse } from "next/server";
import { generateApplePass } from "@/lib/wallet/apple";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ passTypeId: string; serialNumber: string }>;

// GET — retourne la version à jour du pass (appelé par Apple Wallet après une push)
export async function GET(req: Request, { params }: { params: Params }) {
  const { serialNumber } = await params;

  const card = await prisma.loyaltyCard.findUnique({ where: { serialNumber } });
  if (!card) return new NextResponse(null, { status: 404 });

  // Vérifier If-Modified-Since
  const ifModifiedSince = req.headers.get("If-Modified-Since");
  if (ifModifiedSince) {
    const since = new Date(ifModifiedSince);
    if (card.updatedAt <= since) {
      return new NextResponse(null, { status: 304 });
    }
  }

  let passBuffer: Buffer | null = null;
  try {
    passBuffer = await generateApplePass(card.id);
  } catch (err) {
    console.error("[wallet/v1/passes] error:", err);
    return new NextResponse(null, { status: 500 });
  }

  if (!passBuffer) return new NextResponse(null, { status: 500 });

  return new NextResponse(new Uint8Array(passBuffer), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Last-Modified": card.updatedAt.toUTCString(),
    },
  });
}
