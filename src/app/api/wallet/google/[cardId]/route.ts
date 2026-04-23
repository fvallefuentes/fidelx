import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateGoogleWalletLink } from "@/lib/wallet/google";

export async function GET(
  _req: Request,
  context: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await context.params;

  const card = await prisma.loyaltyCard.findUnique({ where: { id: cardId } });
  if (!card) return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });

  const url = await generateGoogleWalletLink(cardId);
  if (!url) return NextResponse.json({ error: "Google Wallet non configuré" }, { status: 503 });

  return NextResponse.json({ url });
}