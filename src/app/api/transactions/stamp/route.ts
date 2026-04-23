import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { serialNumber, establishmentId, amountSpent, count } = await req.json();
  const stampCount = Math.max(1, Math.min(20, parseInt(count) || 1));

  if (!serialNumber) {
    return NextResponse.json({ error: "Numéro de série requis" }, { status: 400 });
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    include: {
      program: {
        include: {
          merchant: { select: { id: true } },
          rewards: { where: { isActive: true }, orderBy: { threshold: "asc" } },
        },
      },
      client: { select: { firstName: true } },
    },
  });

  if (!card) return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  if (card.program.merchant.id !== session.user.id) {
    return NextResponse.json({ error: "Ce programme ne vous appartient pas" }, { status: 403 });
  }
  if (card.status === "REVOKED" || card.status === "EXPIRED") {
    return NextResponse.json({ error: "Cette carte n'est plus active" }, { status: 400 });
  }
  if (card.status === "REWARD_PENDING") {
    return NextResponse.json({ error: "Une récompense est en attente de validation pour cette carte" }, { status: 400 });
  }

  const config = card.program.config as Record<string, unknown>;
  let rewardUnlocked = null;

  if (card.program.type === "STAMPS" || card.program.type === "HYBRID") {
    const maxStamps = (config.maxStamps as number) || 10;
    const newStamps = card.currentStamps + stampCount;
    const reachedMax = newStamps >= maxStamps;

    // Check reward threshold
    const reward = card.program.rewards.find(
      (r) => newStamps >= r.threshold && card.currentStamps < r.threshold
    );
    if (reward) {
      rewardUnlocked = { id: reward.id, name: reward.name };
      await prisma.rewardClaim.create({ data: { cardId: card.id, rewardId: reward.id } });
    }

    await prisma.loyaltyCard.update({
      where: { id: card.id },
      data: {
        // Cap at maxStamps, don't reset — wait for merchant to validate
        currentStamps: reachedMax ? maxStamps : newStamps,
        status: reachedMax ? "REWARD_PENDING" : "ACTIVE",
        totalVisits: { increment: 1 },
        totalSpent: amountSpent ? { increment: amountSpent } : undefined,
        lastVisitAt: new Date(),
      },
    });

    if (reachedMax && !rewardUnlocked) {
      // Auto-create reward claim if no specific reward threshold matched
      const defaultReward = card.program.rewards[0];
      if (defaultReward) {
        rewardUnlocked = { id: defaultReward.id, name: defaultReward.name };
        await prisma.rewardClaim.create({ data: { cardId: card.id, rewardId: defaultReward.id } });
      }
    }
  }

  if (card.program.type === "POINTS" || card.program.type === "HYBRID") {
    const pointsPerChf = (config.pointsPerChf as number) || 1;
    const pointsValue = amountSpent ? amountSpent * pointsPerChf : pointsPerChf;
    const newPoints = card.currentPoints + pointsValue;

    const reward = card.program.rewards.find(
      (r) => newPoints >= r.threshold && card.currentPoints < r.threshold
    );
    if (reward) {
      rewardUnlocked = { id: reward.id, name: reward.name };
      await prisma.rewardClaim.create({ data: { cardId: card.id, rewardId: reward.id } });
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

  await prisma.transaction.create({
    data: {
      cardId: card.id,
      establishmentId: establishmentId || undefined,
      type: card.program.type === "POINTS" ? "POINTS_EARN" : "STAMP",
      value: stampCount,
      amountSpent: amountSpent || undefined,
    },
  });

  try {
    const { notifyPassUpdate } = await import("@/lib/wallet/push");
    await notifyPassUpdate(card.id);
  } catch { /* non bloquant */ }

  try {
    const { updateGoogleWalletObject } = await import("@/lib/wallet/google");
    await updateGoogleWalletObject(card.id);
  } catch { /* non bloquant */ }

  const updatedCard = await prisma.loyaltyCard.findUnique({
    where: { id: card.id },
    select: { currentStamps: true, currentPoints: true, cashbackBalance: true, totalVisits: true, status: true },
  });

  return NextResponse.json({
    success: true,
    card: updatedCard,
    client: { firstName: card.client.firstName },
    rewardUnlocked,
    rewardPending: updatedCard?.status === "REWARD_PENDING",
  });
}