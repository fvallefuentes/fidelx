import { prisma } from "@/lib/prisma";

const ATTRIBUTION_WINDOW_DAYS = 7;

export type CampaignImpact = {
  returnedClients: number;
  generatedVisits: number;
  generatedValue: number;
  rewardsUnlocked: number;
  conversionRate: number;
  windowDays: number;
};

export type DeliveredCampaignLog = {
  cardId: string;
  deliveredAt: Date | null;
};

export async function calculateCampaignImpact(
  logs: DeliveredCampaignLog[]
): Promise<CampaignImpact> {
  const deliveredLogs = logs.filter(
    (log): log is { cardId: string; deliveredAt: Date } => Boolean(log.deliveredAt)
  );
  const deliveredCount = deliveredLogs.length;
  if (deliveredCount === 0) {
    return emptyCampaignImpact();
  }

  const firstDeliveryByCard = new Map<string, Date>();
  for (const log of deliveredLogs) {
    const current = firstDeliveryByCard.get(log.cardId);
    if (!current || log.deliveredAt < current) {
      firstDeliveryByCard.set(log.cardId, log.deliveredAt);
    }
  }

  const cardIds = [...firstDeliveryByCard.keys()];
  const deliveredDates = [...firstDeliveryByCard.values()];
  const minDeliveredAt = new Date(Math.min(...deliveredDates.map((date) => date.getTime())));
  const maxAttributedAt = addDays(
    new Date(Math.max(...deliveredDates.map((date) => date.getTime()))),
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

export function emptyCampaignImpact(): CampaignImpact {
  return {
    returnedClients: 0,
    generatedVisits: 0,
    generatedValue: 0,
    rewardsUnlocked: 0,
    conversionRate: 0,
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
