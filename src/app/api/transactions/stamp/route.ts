import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { serialNumber, establishmentId, amountSpent } = await req.json();

  if (!serialNumber) {
    return NextResponse.json(
      { error: "Numéro de série requis" },
      { status: 400 }
    );
  }

  // Trouver la carte
  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    include: {
      program: {
        include: {
          merchant: { select: { id: true } },
          rewards: { where: { isActive: true }, orderBy: { threshold: "asc" } },
        },
      },
      client: { select: { firstName: true, email: true } },
    },
  });

  if (!card) {
    return NextResponse.json(
      { error: "Carte introuvable" },
      { status: 404 }
    );
  }

  // Vérifier que le commerçant est bien le propriétaire du programme
  if (card.program.merchant.id !== session.user.id) {
    return NextResponse.json(
      { error: "Ce programme ne vous appartient pas" },
      { status: 403 }
    );
  }

  if (card.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Cette carte n'est plus active" },
      { status: 400 }
    );
  }

  const config = card.program.config as Record<string, unknown>;
  let stampValue = 1;
  let pointsValue = 0;
  let rewardUnlocked = null;

  if (card.program.type === "STAMPS" || card.program.type === "HYBRID") {
    const maxStamps = (config.maxStamps as number) || 10;
    const newStamps = card.currentStamps + stampValue;

    // Vérifier si une récompense est atteinte
    const reward = card.program.rewards.find(
      (r) => newStamps >= r.threshold && card.currentStamps < r.threshold
    );

    if (reward) {
      rewardUnlocked = {
        id: reward.id,
        name: reward.name,
        threshold: reward.threshold,
      };

      // Créer le claim
      await prisma.rewardClaim.create({
        data: {
          cardId: card.id,
          rewardId: reward.id,
        },
      });
    }

    // Si la carte est complète, remettre à zéro
    const finalStamps = newStamps >= maxStamps ? 0 : newStamps;
    const newStatus = newStamps >= maxStamps ? "ACTIVE" : card.status; // reste active, reset des tampons

    await prisma.loyaltyCard.update({
      where: { id: card.id },
      data: {
        currentStamps: finalStamps,
        totalVisits: { increment: 1 },
        totalSpent: amountSpent
          ? { increment: amountSpent }
          : undefined,
        lastVisitAt: new Date(),
        status: newStatus,
      },
    });

    stampValue = 1;
  }

  if (card.program.type === "POINTS" || card.program.type === "HYBRID") {
    const pointsPerChf = (config.pointsPerChf as number) || 1;
    pointsValue = amountSpent ? amountSpent * pointsPerChf : pointsPerChf;

    const newPoints = card.currentPoints + pointsValue;

    // Vérifier les paliers
    const reward = card.program.rewards.find(
      (r) => newPoints >= r.threshold && card.currentPoints < r.threshold
    );

    if (reward) {
      rewardUnlocked = {
        id: reward.id,
        name: reward.name,
        threshold: reward.threshold,
      };

      await prisma.rewardClaim.create({
        data: { cardId: card.id, rewardId: reward.id },
      });
    }

    await prisma.loyaltyCard.update({
      where: { id: card.id },
      data: {
        currentPoints: { increment: pointsValue },
        totalVisits: card.program.type === "POINTS" ? { increment: 1 } : undefined,
        totalSpent: amountSpent ? { increment: amountSpent } : undefined,
        lastVisitAt: new Date(),
      },
    });
  }

  if (card.program.type === "CASHBACK") {
    const percentage = (config.percentage as number) || 5;
    const cashback = amountSpent ? (amountSpent * percentage) / 100 : 0;

    await prisma.loyaltyCard.update({
      where: { id: card.id },
      data: {
        cashbackBalance: { increment: cashback },
        totalVisits: { increment: 1 },
        totalSpent: amountSpent ? { increment: amountSpent } : undefined,
        lastVisitAt: new Date(),
      },
    });
  }

  // Créer la transaction
  const transaction = await prisma.transaction.create({
    data: {
      cardId: card.id,
      establishmentId: establishmentId || undefined,
      type: card.program.type === "POINTS" ? "POINTS_EARN" : "STAMP",
      value: card.program.type === "POINTS" ? pointsValue : stampValue,
      amountSpent: amountSpent || undefined,
    },
  });

  // Récupérer la carte mise à jour
  const updatedCard = await prisma.loyaltyCard.findUnique({
    where: { id: card.id },
    select: {
      currentStamps: true,
      currentPoints: true,
      cashbackBalance: true,
      totalVisits: true,
    },
  });

  return NextResponse.json({
    success: true,
    transaction: transaction.id,
    card: updatedCard,
    client: { firstName: card.client.firstName },
    rewardUnlocked,
  });
}
