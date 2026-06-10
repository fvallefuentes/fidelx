import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMerchantNotification } from "@/lib/notifications/merchant";
import { trackServerEvent } from "@/lib/analytics/posthog-server";

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
  if ((card.status as string) !== "REWARD_PENDING") {
    return NextResponse.json({ error: "Aucune récompense en attente sur cette carte" }, { status: 400 });
  }

  // Détecter si c'est la 1ère récompense (utile pour la notif merchant)
  const isFirstReward =
    (await prisma.rewardClaim.count({
      where: { cardId: card.id, redeemedAt: { not: null } },
    })) === 0;

  // À la validation, on soustrait le seuil (et non plus reset à 0) → les
  // tampons / points "en trop" gagnés au-delà du seuil sont reportés sur
  // le cycle suivant. Ex: 9/10 puis +3 → 12 stockés → claim → 12-10 = 2/10.
  const config = card.program.config as Record<string, unknown>;
  const updateData: {
    currentStamps?: number;
    currentPoints?: number;
    status: "ACTIVE";
  } = { status: "ACTIVE" };

  if (card.program.type === "STAMPS") {
    const maxStamps = (config.maxStamps as number) || 10;
    updateData.currentStamps = Math.max(0, card.currentStamps - maxStamps);
  } else if (card.program.type === "POINTS") {
    const pointsTarget =
      (config.tiers as { points?: number }[] | undefined)?.[0]?.points;
    if (typeof pointsTarget === "number" && pointsTarget > 0) {
      updateData.currentPoints = Math.max(0, card.currentPoints - pointsTarget);
    }
  }

  await prisma.loyaltyCard.update({
    where: { id: card.id },
    data: updateData,
  });

  try {
    const { notifyPassUpdate } = await import("@/lib/wallet/push");
    await notifyPassUpdate(card.id);
  } catch { /* non bloquant */ }

  // Notification in-app commerçant : 1ère récompense d'un client
  if (isFirstReward) {
    void createMerchantNotification({
      merchantId: card.program.merchant.id,
      type: "CLIENT_FIRST_REWARD",
      title: `🎉 1ère récompense pour ${card.client.firstName}`,
      body: `Carte complétée, récompense remise.`,
      link: `/dashboard/clients/${card.id}`,
      metadata: { cardId: card.id },
    });
  }

  // Analytics : récompense réclamée = signal métier majeur (= cycle complet)
  void trackServerEvent(card.program.merchant.id, "reward.claimed", {
    cardId: card.id,
    programId: card.program.id,
    isFirstReward,
  });

  return NextResponse.json({
    success: true,
    client: { firstName: card.client.firstName },
  });
}