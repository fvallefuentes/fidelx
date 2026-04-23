import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { serialNumber } = await req.json();
  if (!serialNumber) {
    return NextResponse.json({ error: "Numéro de série requis" }, { status: 400 });
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    include: {
      program: { include: { merchant: { select: { id: true } } } },
      client: { select: { firstName: true } },
    },
  });

  if (!card) return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  if (card.program.merchant.id !== session.user.id) {
    return NextResponse.json({ error: "Ce programme ne vous appartient pas" }, { status: 403 });
  }
  if (card.status !== "REWARD_PENDING") {
    return NextResponse.json({ error: "Aucune récompense en attente sur cette carte" }, { status: 400 });
  }

  // Reset stamps and reactivate card
  await prisma.loyaltyCard.update({
    where: { id: card.id },
    data: {
      currentStamps: 0,
      status: "ACTIVE",
    },
  });

  try {
    const { notifyPassUpdate } = await import("@/lib/wallet/push");
    await notifyPassUpdate(card.id);
  } catch { /* non bloquant */ }

  return NextResponse.json({
    success: true,
    client: { firstName: card.client.firstName },
  });
}