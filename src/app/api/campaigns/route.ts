import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAllCardsInProgram, notifyCardsInProgram } from "@/lib/wallet/push";
import { getPlanLimits, getPeriodStart } from "@/lib/plan-limits";
import { parseJsonBody } from "@/lib/api/validation";
import type { Prisma } from "@/generated/prisma/client";

const ATTRIBUTION_WINDOW_DAYS = 7;

const createCampaignSchema = z.object({
  programId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(1, "Nom de campagne requis").max(120, "Nom de campagne trop long"),
  message: z.string().trim().min(1, "Message requis").max(350, "Message trop long"),
  triggerType: z.enum([
    "IMMEDIATE",
    "SCHEDULED",
    "GEOFENCE",
    "INACTIVITY",
    "POST_STAMP",
    "MILESTONE",
    "BIRTHDAY",
  ]),
  triggerConfig: z
    .object({
      sendAt: z.string().datetime().optional(),
      // Titre de la notif : obligatoire. Affiché en gras sur le lockscreen.
      notifTitle: z
        .string()
        .trim()
        .min(1, "Titre de la notification requis")
        .max(80, "Titre trop long (80 caractères max)"),
    })
    .catchall(z.unknown())
    .default({ notifTitle: "" }),
  targetSegment: z.enum(["ALL", "ACTIVE", "DORMANT", "NEW", "VIP"]).optional().default("ALL"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const campaigns = await prisma.notificationCampaign.findMany({
    where: { merchantId: session.user.id },
    include: {
      program: { select: { name: true } },
      _count: { select: { logs: true } },
      logs: {
        where: { delivered: true, deliveredAt: { not: null } },
        select: { cardId: true, deliveredAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const visibleCampaigns = campaigns.filter(
    (campaign) => !isAutomationRule(campaign.triggerConfig)
  );

  const campaignsWithImpact = await Promise.all(
    visibleCampaigns.map(async (campaign) => {
      const impact = await calculateCampaignImpact(campaign.logs);
      const rest = Object.fromEntries(
        Object.entries(campaign).filter(([key]) => key !== "logs")
      );
      return { ...rest, impact };
    })
  );

  return NextResponse.json(campaignsWithImpact);
}

function isAutomationRule(config: unknown) {
  return Boolean((config as { automationRule?: boolean } | null)?.automationRule);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, createCampaignSchema);
  if (!parsed.ok) return parsed.response;
  const {
    programId,
    name,
    message,
    triggerType,
    triggerConfig,
    targetSegment,
  } = parsed.data;

  // Vérification limites du plan
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, createdAt: true, stripeCurrentPeriodStart: true },
  });
  const limits = getPlanLimits(user?.plan);
  const isFree = !user?.plan || user.plan === "FREE";

  if (isFree && triggerType !== "IMMEDIATE") {
    return NextResponse.json({ error: "Le plan Gratuit ne permet que l'envoi immédiat." }, { status: 403 });
  }

  if (triggerType === "GEOFENCE") {
    return NextResponse.json(
      {
        error:
          "La proximite Wallet ne declenche pas encore d'envoi automatique. Ajoutez une position a l'etablissement pour afficher la carte Wallet a proximite.",
      },
      { status: 400 }
    );
  }

  if (limits.maxCampaignsPerMonth !== null) {
    const periodStart = getPeriodStart(user!);
    const campaignsThisPeriod = await prisma.notificationCampaign.count({
      where: { merchantId: session.user.id, createdAt: { gte: periodStart } },
    });
    if (campaignsThisPeriod >= limits.maxCampaignsPerMonth) {
      return NextResponse.json(
        { error: `Limite atteinte : ${limits.maxCampaignsPerMonth} campagnes par période sur votre plan.` },
        { status: 403 }
      );
    }
  }

  // Vérifier que le programme appartient au commerçant
  if (programId) {
    const program = await prisma.loyaltyProgram.findFirst({
      where: { id: programId, merchantId: session.user.id },
    });
    if (!program) {
      return NextResponse.json(
        { error: "Programme introuvable" },
        { status: 404 }
      );
    }
  }

  const campaign = await prisma.notificationCampaign.create({
    data: {
      merchantId: session.user.id,
      programId: programId || undefined,
      name,
      message,
      triggerType,
      triggerConfig: triggerConfig as Prisma.InputJsonValue,
      targetSegment,
      status: triggerType === "IMMEDIATE" ? "SENT" : "SCHEDULED",
      scheduledAt:
        triggerType === "SCHEDULED" && triggerConfig?.sendAt
          ? new Date(triggerConfig.sendAt)
          : undefined,
    },
  });

  // Si envoi immédiat, envoyer maintenant
  if (triggerType === "IMMEDIATE" && programId) {
    const rawTargetCardIds = (triggerConfig as { targetCardIds?: unknown }).targetCardIds;
    const targetCardIds = Array.isArray(rawTargetCardIds)
      ? rawTargetCardIds.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
    const result =
      targetCardIds.length > 0
        ? await notifyCardsInProgram(programId, targetCardIds, message, name, 7, campaign.id)
        : await notifyAllCardsInProgram(
            programId,
            message,
            targetSegment,
            name,
            campaign.id
          );

    await prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount: result.sent,
        sentAt: new Date(),
      },
    });

    return NextResponse.json(
      { ...campaign, sentCount: result.sent },
      { status: 201 }
    );
  }

  return NextResponse.json(campaign, { status: 201 });
}

type DeliveredCampaignLog = {
  cardId: string;
  deliveredAt: Date | null;
};

async function calculateCampaignImpact(logs: DeliveredCampaignLog[]) {
  const deliveredLogs = logs.filter(
    (log): log is { cardId: string; deliveredAt: Date } => Boolean(log.deliveredAt)
  );
  const deliveredCount = deliveredLogs.length;
  if (deliveredCount === 0) {
    return {
      returnedClients: 0,
      generatedVisits: 0,
      generatedValue: 0,
      rewardsUnlocked: 0,
      conversionRate: 0,
      windowDays: ATTRIBUTION_WINDOW_DAYS,
    };
  }

  const firstDeliveryByCard = new Map<string, Date>();
  for (const log of deliveredLogs) {
    const current = firstDeliveryByCard.get(log.cardId);
    if (!current || log.deliveredAt < current) {
      firstDeliveryByCard.set(log.cardId, log.deliveredAt);
    }
  }

  const cardIds = [...firstDeliveryByCard.keys()];
  const minDeliveredAt = new Date(
    Math.min(...[...firstDeliveryByCard.values()].map((date) => date.getTime()))
  );
  const maxAttributedAt = addDays(
    new Date(Math.max(...[...firstDeliveryByCard.values()].map((date) => date.getTime()))),
    ATTRIBUTION_WINDOW_DAYS
  );

  const [transactions, rewards] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        cardId: { in: cardIds },
        createdAt: { gte: minDeliveredAt, lte: maxAttributedAt },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] },
      },
      select: { cardId: true, createdAt: true, value: true },
    }),
    prisma.rewardClaim.findMany({
      where: {
        cardId: { in: cardIds },
        claimedAt: { gte: minDeliveredAt, lte: maxAttributedAt },
      },
      select: { cardId: true, claimedAt: true },
    }),
  ]);

  const attributedTransactions = transactions.filter((transaction) =>
    isWithinAttributionWindow(transaction.cardId, transaction.createdAt, firstDeliveryByCard)
  );
  const attributedRewards = rewards.filter((reward) =>
    isWithinAttributionWindow(reward.cardId, reward.claimedAt, firstDeliveryByCard)
  );
  const returnedClients = new Set(attributedTransactions.map((transaction) => transaction.cardId)).size;
  const generatedValue = attributedTransactions.reduce(
    (sum, transaction) => sum + transaction.value,
    0
  );

  return {
    returnedClients,
    generatedVisits: attributedTransactions.length,
    generatedValue,
    rewardsUnlocked: attributedRewards.length,
    conversionRate: Math.round((returnedClients / deliveredCount) * 1000) / 10,
    windowDays: ATTRIBUTION_WINDOW_DAYS,
  };
}

function isWithinAttributionWindow(
  cardId: string,
  happenedAt: Date,
  deliveryByCard: Map<string, Date>
) {
  const deliveredAt = deliveryByCard.get(cardId);
  if (!deliveredAt) return false;
  return happenedAt >= deliveredAt && happenedAt <= addDays(deliveredAt, ATTRIBUTION_WINDOW_DAYS);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
