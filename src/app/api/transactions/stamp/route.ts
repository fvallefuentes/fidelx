import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits, getPeriodStart, countStampsThisMonth } from "@/lib/plan-limits";
import { createMerchantNotification } from "@/lib/notifications/merchant";
import { parseJsonBody } from "@/lib/api/validation";
import { trackServerEvent } from "@/lib/analytics/posthog-server";

const stampSchema = z.object({
  serialNumber: z.string().trim().min(1, "Numéro de série requis"),
  establishmentId: z.string().trim().min(1).optional().nullable(),
  amountSpent: z.coerce.number().min(0, "Montant invalide").optional(),
  // 1-100 : couvre les programmes POINTS (où le merchant peut ajouter
  // par ex. 50 points pour un achat de 50 CHF). Les programmes STAMPS
  // restent capés en pratique par le seuil de récompense (1-20).
  count: z.coerce.number().int().min(1).max(100).optional().default(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const merchantId = (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const parsed = await parseJsonBody(req, stampSchema);
  if (!parsed.ok) return parsed.response;
  const { serialNumber, establishmentId, amountSpent, count } = parsed.data;
  const stampCount = count;

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
  if (card.program.merchant.id !== merchantId) {
    return NextResponse.json({ error: "Ce programme ne vous appartient pas" }, { status: 403 });
  }

  // Limite du plan : nombre de tampons donnés ce mois-ci
  const merchant = await prisma.user.findUnique({
    where: { id: merchantId },
    select: { plan: true, createdAt: true, stripeCurrentPeriodStart: true },
  });
  const limits = getPlanLimits(merchant?.plan);
  if (limits.maxStampsPerMonth !== null) {
    const periodStart = getPeriodStart(merchant!);
    const used = await countStampsThisMonth(merchantId, periodStart);
    if (used + stampCount > limits.maxStampsPerMonth) {
      // Notif in-app : limite atteinte (idempotent — 1× par mois grâce au dedupeKey)
      const ym = new Date().toISOString().slice(0, 7);
      void createMerchantNotification({
        merchantId,
        type: "PLAN_LIMIT_REACHED",
        title: `🚫 Limite mensuelle atteinte`,
        body: `${limits.maxStampsPerMonth} tampons/mois sur votre plan. Passez à un plan supérieur pour des scans illimités.`,
        link: `/dashboard/settings`,
        metadata: { plan: merchant?.plan, used, limit: limits.maxStampsPerMonth },
        dedupeKey: `plan-limit-reached-${ym}`,
        dedupeMinutes: 60 * 24 * 31,
      });
      return NextResponse.json(
        {
          error: `Limite mensuelle atteinte (${limits.maxStampsPerMonth} tampons/mois sur votre plan). ${used} déjà donnés ce mois-ci. Passez à un plan supérieur pour des scans illimités.`,
        },
        { status: 403 }
      );
    }
    // Notif 80% : 1× par mois max
    const ratio = (used + stampCount) / limits.maxStampsPerMonth;
    if (ratio >= 0.8 && ratio < 0.95) {
      const ym = new Date().toISOString().slice(0, 7);
      void createMerchantNotification({
        merchantId,
        type: "PLAN_LIMIT_WARNING",
        title: `⚠️ 80% de votre quota mensuel atteint`,
        body: `${used + stampCount}/${limits.maxStampsPerMonth} tampons utilisés ce mois-ci.`,
        link: `/dashboard/settings`,
        metadata: { plan: merchant?.plan, used: used + stampCount, limit: limits.maxStampsPerMonth },
        dedupeKey: `plan-limit-warning-80-${ym}`,
        dedupeMinutes: 60 * 24 * 31,
      });
    } else if (ratio >= 0.95) {
      const ym = new Date().toISOString().slice(0, 7);
      void createMerchantNotification({
        merchantId,
        type: "PLAN_LIMIT_REACHED",
        title: `🔥 95% de votre quota mensuel atteint`,
        body: `${used + stampCount}/${limits.maxStampsPerMonth} tampons utilisés. Pensez à upgrader avant blocage.`,
        link: `/dashboard/settings`,
        metadata: { plan: merchant?.plan, used: used + stampCount, limit: limits.maxStampsPerMonth },
        dedupeKey: `plan-limit-warning-95-${ym}`,
        dedupeMinutes: 60 * 24 * 31,
      });
    }
  }
  if (card.status === "REVOKED" || card.status === "EXPIRED") {
    return NextResponse.json({ error: "Cette carte n'est plus active" }, { status: 400 });
  }
  if ((card.status as string) === "REWARD_PENDING") {
    return NextResponse.json({ error: "Une récompense est en attente de validation pour cette carte" }, { status: 400 });
  }

  // ─── Auto-activation au premier scan (anti-abus) ───
  // Les cartes sont créées en PENDING via le QR signup. Au premier scan
  // par le commerçant en boutique, la carte est validée et passe en ACTIVE.
  // Cela neutralise les attaques où un client crée des cartes en masse :
  // tant qu'elles ne passent pas en caisse, elles n'ont aucune valeur.
  const wasPending = (card.status as string) === "PENDING";
  if (wasPending) {
    await prisma.loyaltyCard.update({
      where: { id: card.id },
      data: { status: "ACTIVE" },
    });
    card.status = "ACTIVE";
  }

  const config = card.program.config as Record<string, unknown>;
  let rewardUnlocked = null;

  if (card.program.type === "STAMPS") {
    const maxStamps = (config.maxStamps as number) || 10;
    const newStamps = card.currentStamps + stampCount;
    const reachedMax = newStamps >= maxStamps;
    // Quand on dépasse, on cap currentStamps au seuil et on stocke l'excédent
    // dans pendingExtraStamps. À la validation, claim-reward repassera ces
    // extras dans currentStamps → ils démarrent le cycle suivant.
    const cappedStamps = Math.min(newStamps, maxStamps);
    const extra = Math.max(0, newStamps - maxStamps);

    // Check reward threshold
    const reward = card.program.rewards.find(
      (r) => newStamps >= r.threshold && card.currentStamps < r.threshold
    );
    if (reward) {
      rewardUnlocked = { id: reward.id, name: reward.name };
      await prisma.rewardClaim.create({
        data: { cardId: card.id, rewardId: reward.id, rewardName: reward.name },
      });
    }

    await prisma.loyaltyCard.update({
      where: { id: card.id },
      data: {
        currentStamps: cappedStamps,
        pendingExtraStamps: extra > 0 ? { increment: extra } : undefined,
        status: reachedMax ? "REWARD_PENDING" : "ACTIVE",
        totalVisits: { increment: 1 },
        totalSpent: amountSpent ? { increment: amountSpent } : undefined,
        lastVisitAt: new Date(),
      },
    });

    if (reachedMax && !rewardUnlocked) {
      // Seuil atteint mais aucun Reward configuré (ou aucun threshold matché).
      // On crée quand même un rewardClaim avec un nom : soit le Reward par
      // défaut s'il existe, soit le libellé stocké dans config.reward, soit
      // un fallback générique. Ainsi la section "Récompenses" du client
      // reflète toujours la récompense débloquée.
      const defaultReward = card.program.rewards[0];
      const fallbackName =
        (typeof config.reward === "string" && config.reward.trim()) ||
        "Récompense";
      rewardUnlocked = defaultReward
        ? { id: defaultReward.id, name: defaultReward.name }
        : { id: "", name: fallbackName };
      await prisma.rewardClaim.create({
        data: {
          cardId: card.id,
          rewardId: defaultReward?.id ?? null,
          rewardName: defaultReward?.name ?? fallbackName,
        },
      });
    }
  }

  if (card.program.type === "POINTS") {
    const pointsPerChf = (config.pointsPerChf as number) || 1;
    // Priorité : si amountSpent est fourni → on convertit en points via pointsPerChf.
    // Sinon → on respecte le `count` choisi par le merchant.
    const pointsValue = amountSpent ? amountSpent * pointsPerChf : stampCount;
    const newPoints = card.currentPoints + pointsValue;

    // Seuil de récompense : config.tiers[0].points pour les programmes limités.
    // En mode unlimited (config.unlimited === true), il n'y a aucun seuil — la
    // carte ne passe jamais en REWARD_PENDING.
    const isUnlimited = config.unlimited === true;
    const pointsTarget = isUnlimited
      ? null
      : ((config.tiers as { points?: number }[] | undefined)?.[0]?.points ?? null);
    const reachedMax =
      pointsTarget !== null && newPoints >= pointsTarget;

    const reward = card.program.rewards.find(
      (r) => newPoints >= r.threshold && card.currentPoints < r.threshold
    );
    if (reward) {
      rewardUnlocked = { id: reward.id, name: reward.name };
      await prisma.rewardClaim.create({
        data: { cardId: card.id, rewardId: reward.id, rewardName: reward.name },
      });
    }

    // POINTS limité : cap currentPoints au seuil + excess dans pendingExtraPoints.
    // POINTS illimité : pas de cap, juste incrément.
    let pointsUpdate: { currentPoints?: { set: number } | { increment: number }; pendingExtraPoints?: { increment: number } };
    if (pointsTarget !== null && reachedMax) {
      const extraPoints = newPoints - pointsTarget;
      pointsUpdate = {
        currentPoints: { set: pointsTarget },
        pendingExtraPoints:
          extraPoints > 0 ? { increment: extraPoints } : undefined,
      };
    } else {
      pointsUpdate = { currentPoints: { increment: pointsValue } };
    }

    await prisma.loyaltyCard.update({
      where: { id: card.id },
      data: {
        ...pointsUpdate,
        // Même logique que STAMPS : on lock la carte en REWARD_PENDING quand
        // le seuil est atteint, pour forcer la validation merchant avant
        // d'ajouter d'autres points. En unlimited, on reste toujours ACTIVE.
        status: reachedMax ? "REWARD_PENDING" : undefined,
        totalVisits: { increment: 1 },
        totalSpent: amountSpent ? { increment: amountSpent } : undefined,
        lastVisitAt: new Date(),
      },
    });

    if (reachedMax && !rewardUnlocked) {
      // Seuil atteint sans Reward configuré → on crée quand même le claim
      // (même logique que STAMPS) pour que la section "Récompenses" du client
      // affiche bien la récompense débloquée.
      const defaultReward = card.program.rewards[0];
      const tier0 = (config.tiers as { reward?: unknown }[] | undefined)?.[0];
      const fallbackName =
        (typeof tier0?.reward === "string" && tier0.reward.trim()) ||
        "Récompense";
      rewardUnlocked = defaultReward
        ? { id: defaultReward.id, name: defaultReward.name }
        : { id: "", name: fallbackName };
      await prisma.rewardClaim.create({
        data: {
          cardId: card.id,
          rewardId: defaultReward?.id ?? null,
          rewardName: defaultReward?.name ?? fallbackName,
        },
      });
    }
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

  // Analytics : un tampon = signal d'engagement très important (= LE moment où
  // le merchant utilise réellement Fidlify en boutique avec un vrai client).
  void trackServerEvent(session.user.id, "transaction.stamp_added", {
    programType: card.program.type,
    cardId: card.id,
    stampCount,
    hasAmount: !!amountSpent,
  });

  try {
    const { notifyPassUpdate } = await import("@/lib/wallet/push");
    await notifyPassUpdate(card.id);
  } catch { /* non bloquant */ }

  // Invitation auto à laisser un avis Google si le client vient d'atteindre
  // le seuil de visites configuré (1 seule fois via flag reviewInvitedAt).
  try {
    const { maybeInviteToReview } = await import("@/lib/google-review");
    await maybeInviteToReview(card.id);
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
