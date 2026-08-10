import { calculateCampaignImpact } from "@/lib/campaign-impact";
import {
  buildCampaignRecommendations,
  type CampaignRecommendation,
} from "@/lib/campaign-recommendations";
import { prisma } from "@/lib/prisma";

const ATTRIBUTION_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type AutomationConfig = {
  automationRule?: boolean;
  automationRuleId?: string;
  abTest?: boolean;
  abTestArm?: string;
  messageVariantLabel?: string;
};

type CampaignLog = {
  cardId: string;
  delivered: boolean;
  deliveredAt: Date | null;
  walletStatus: string;
};

type WeeklyCampaign = {
  id: string;
  programId: string | null;
  name: string;
  programName: string;
  sentAt: Date;
  sentCount: number;
  config: AutomationConfig | null;
  logs: CampaignLog[];
  impact: {
    returnedClients: number;
    generatedVisits: number;
    rewardsUnlocked: number;
    conversionRate: number;
  };
};

type ActivityCard = {
  clientId: string;
  createdAt: Date;
};

type ActivityTransaction = {
  cardId: string;
  createdAt: Date;
  amountSpent: number | null;
  card: ActivityCard;
};

type DeliveryHistory = {
  deliveredAt: Date | null;
  card: { clientId: string };
};

type PeriodRollup = {
  notificationsSent: number;
  notificationsDelivered: number;
  notificationsWithoutWallet: number;
  deliveryRate: number;
  returnedClients: number;
  generatedVisits: number;
  rewardsUnlocked: number;
  campaignsSent: number;
  abTestsRun: number;
};

export type WeeklyMetricComparison = {
  previous: number;
  delta: number;
  percentChange: number | null;
};

export type WeeklyCampaignSummary = {
  periodStart: string;
  periodEnd: string;
  currency: string;
  attribution: {
    windowDays: number;
    pendingCampaigns: number;
    resultsAreProvisional: boolean;
  };
  stats: {
    messagesSent: number;
    notificationsSent: number;
    notificationsDelivered: number;
    notificationsWithoutWallet: number;
    deliveryRate: number;
    returnedClients: number;
    generatedVisits: number;
    rewardsUnlocked: number;
    campaignsSent: number;
    automationsActive: number;
    abTestsRun: number;
    newClients: number;
    organicReturningClients: number;
  };
  comparisons: {
    notificationsSent: WeeklyMetricComparison;
    returnedClients: WeeklyMetricComparison;
    generatedVisits: WeeklyMetricComparison;
    newClients: WeeklyMetricComparison;
    organicReturningClients: WeeklyMetricComparison;
  };
  bestCampaign: {
    name: string;
    programName: string;
    sentCount: number;
    returnedClients: number;
    conversionRate: number;
    isProvisional: boolean;
  } | null;
  topOpportunity: {
    id: string;
    title: string;
    reason: string;
    programName: string;
    potentialCount: number;
    estimatedRevenue: number | null;
  } | null;
  programResults: Array<{
    programId: string | null;
    programName: string;
    notificationsSent: number;
    notificationsDelivered: number;
    returnedClients: number;
    generatedVisits: number;
    resultsAreProvisional: boolean;
  }>;
  highlights: string[];
  nextActions: string[];
};

export async function buildWeeklyCampaignSummary(
  merchantId: string,
  now = new Date()
): Promise<WeeklyCampaignSummary> {
  const periodStart = addDays(now, -7);
  const previousPeriodStart = addDays(periodStart, -7);
  const deliveryHistoryStart = addDays(previousPeriodStart, -ATTRIBUTION_WINDOW_DAYS);

  const [
    campaigns,
    scheduledRules,
    recommendations,
    activityCards,
    activityTransactions,
    deliveryHistory,
    merchant,
  ] = await Promise.all([
    prisma.notificationCampaign.findMany({
      where: {
        merchantId,
        status: "SENT",
        OR: [
          { sentAt: { gte: previousPeriodStart } },
          { createdAt: { gte: previousPeriodStart } },
        ],
      },
      include: {
        program: { select: { name: true } },
        logs: {
          select: {
            cardId: true,
            delivered: true,
            deliveredAt: true,
            walletStatus: true,
          },
        },
      },
      orderBy: { sentAt: "desc" },
      take: 200,
    }),
    prisma.notificationCampaign.findMany({
      where: { merchantId, status: "SCHEDULED" },
      select: { triggerConfig: true },
    }),
    buildCampaignRecommendations(merchantId),
    prisma.loyaltyCard.findMany({
      where: {
        createdAt: { gte: previousPeriodStart, lte: now },
        program: { merchantId },
      },
      select: { clientId: true, createdAt: true },
    }),
    prisma.transaction.findMany({
      where: {
        createdAt: { gte: previousPeriodStart, lte: now },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] },
        card: { program: { merchantId } },
      },
      select: {
        cardId: true,
        createdAt: true,
        amountSpent: true,
        card: { select: { clientId: true, createdAt: true } },
      },
    }),
    prisma.notificationLog.findMany({
      where: {
        delivered: true,
        deliveredAt: { gte: deliveryHistoryStart, lte: now },
        card: { program: { merchantId } },
      },
      select: {
        deliveredAt: true,
        card: { select: { clientId: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: merchantId },
      select: { currency: true },
    }),
  ]);

  const activeAutomations = scheduledRules.filter(
    (rule) => (rule.triggerConfig as AutomationConfig | null)?.automationRule
  ).length;

  const campaignsWithImpact: WeeklyCampaign[] = await Promise.all(
    campaigns
      .filter(
        (campaign) =>
          !(campaign.triggerConfig as AutomationConfig | null)?.automationRule
      )
      .map(async (campaign) => ({
        id: campaign.id,
        programId: campaign.programId,
        name: campaign.name,
        programName: campaign.program?.name || "Programme",
        sentAt: campaign.sentAt || campaign.createdAt,
        sentCount: campaign.sentCount,
        config: campaign.triggerConfig as AutomationConfig | null,
        logs: campaign.logs,
        impact: await calculateCampaignImpact(campaign.logs),
      }))
  );

  const currentCampaigns = campaignsWithImpact.filter((campaign) =>
    isWithinPeriod(campaign.sentAt, periodStart, now)
  );
  const previousCampaigns = campaignsWithImpact.filter((campaign) =>
    isWithinPeriod(campaign.sentAt, previousPeriodStart, periodStart)
  );
  const currentRollup = rollupCampaigns(
    currentCampaigns,
    activityTransactions
  );
  const previousRollup = rollupCampaigns(
    previousCampaigns,
    activityTransactions
  );
  const deliveriesByClient = groupDeliveriesByClient(deliveryHistory);
  const currentActivity = buildActivityStats(
    periodStart,
    now,
    activityCards,
    activityTransactions,
    deliveriesByClient
  );
  const previousActivity = buildActivityStats(
    previousPeriodStart,
    periodStart,
    activityCards,
    activityTransactions,
    deliveriesByClient
  );

  const pendingCampaigns = currentCampaigns.filter(
    (campaign) => !isAttributionComplete(campaign.sentAt, now)
  ).length;
  const bestCampaign =
    currentCampaigns
      .filter((campaign) => campaign.impact.returnedClients > 0)
      .sort(
        (a, b) =>
          b.impact.returnedClients - a.impact.returnedClients ||
          b.impact.conversionRate - a.impact.conversionRate ||
          b.sentCount - a.sentCount
      )[0] || null;
  const topOpportunity = recommendations[0] || null;
  const averageBasket = calculateAverageBasket(activityTransactions);
  const estimatedRevenue =
    topOpportunity && averageBasket !== null
      ? roundMoney(averageBasket * topOpportunity.potentialCount)
      : null;
  const abTestCampaign = currentCampaigns.find(
    (campaign) => campaign.config?.abTest
  );

  const stats = {
    messagesSent: currentRollup.notificationsSent,
    notificationsSent: currentRollup.notificationsSent,
    notificationsDelivered: currentRollup.notificationsDelivered,
    notificationsWithoutWallet: currentRollup.notificationsWithoutWallet,
    deliveryRate: currentRollup.deliveryRate,
    returnedClients: currentRollup.returnedClients,
    generatedVisits: currentRollup.generatedVisits,
    rewardsUnlocked: currentRollup.rewardsUnlocked,
    campaignsSent: currentRollup.campaignsSent,
    automationsActive: activeAutomations,
    abTestsRun: currentRollup.abTestsRun,
    newClients: currentActivity.newClients,
    organicReturningClients: currentActivity.organicReturningClients,
  };

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: now.toISOString(),
    currency: merchant?.currency || "CHF",
    attribution: {
      windowDays: ATTRIBUTION_WINDOW_DAYS,
      pendingCampaigns,
      resultsAreProvisional: pendingCampaigns > 0,
    },
    stats,
    comparisons: {
      notificationsSent: buildMetricComparison(
        currentRollup.notificationsSent,
        previousRollup.notificationsSent
      ),
      returnedClients: buildMetricComparison(
        currentRollup.returnedClients,
        previousRollup.returnedClients
      ),
      generatedVisits: buildMetricComparison(
        currentRollup.generatedVisits,
        previousRollup.generatedVisits
      ),
      newClients: buildMetricComparison(
        currentActivity.newClients,
        previousActivity.newClients
      ),
      organicReturningClients: buildMetricComparison(
        currentActivity.organicReturningClients,
        previousActivity.organicReturningClients
      ),
    },
    bestCampaign: bestCampaign
      ? {
          name: bestCampaign.name,
          programName: bestCampaign.programName,
          sentCount: bestCampaign.sentCount,
          returnedClients: bestCampaign.impact.returnedClients,
          conversionRate: bestCampaign.impact.conversionRate,
          isProvisional: !isAttributionComplete(bestCampaign.sentAt, now),
        }
      : null,
    topOpportunity: topOpportunity
      ? {
          id: topOpportunity.id,
          title: topOpportunity.title,
          reason: topOpportunity.reason,
          programName: topOpportunity.programName,
          potentialCount: topOpportunity.potentialCount,
          estimatedRevenue,
        }
      : null,
    programResults: buildProgramResults(
      currentCampaigns,
      activityTransactions,
      now
    ),
    highlights: buildHighlights(
      stats,
      pendingCampaigns,
      bestCampaign,
      abTestCampaign
    ),
    nextActions: buildNextActions(stats, topOpportunity),
  };
}

export function buildMetricComparison(
  current: number,
  previous: number
): WeeklyMetricComparison {
  const delta = current - previous;
  return {
    previous,
    delta,
    percentChange:
      previous === 0 ? null : Math.round((delta / previous) * 1000) / 10,
  };
}

export function isAttributionComplete(sentAt: Date, now: Date) {
  return now.getTime() - sentAt.getTime() >= ATTRIBUTION_WINDOW_DAYS * DAY_MS;
}

function rollupCampaigns(
  campaigns: WeeklyCampaign[],
  transactions: ActivityTransaction[] = []
): PeriodRollup {
  const rollup = campaigns.reduce(
    (acc, campaign) => {
      acc.notificationsSent += campaign.sentCount || 0;
      acc.notificationsDelivered += campaign.logs.filter(
        (log) => log.delivered
      ).length;
      acc.notificationsWithoutWallet += campaign.logs.filter(
        (log) => log.walletStatus === "NO_DEVICE"
      ).length;
      acc.returnedClients += campaign.impact.returnedClients;
      acc.generatedVisits += campaign.impact.generatedVisits;
      acc.rewardsUnlocked += campaign.impact.rewardsUnlocked;
      acc.campaignsSent += 1;
      if (campaign.config?.abTest) acc.abTestsRun += 1;
      return acc;
    },
    {
      notificationsSent: 0,
      notificationsDelivered: 0,
      notificationsWithoutWallet: 0,
      deliveryRate: 0,
      returnedClients: 0,
      generatedVisits: 0,
      rewardsUnlocked: 0,
      campaignsSent: 0,
      abTestsRun: 0,
    }
  );

  rollup.deliveryRate =
    rollup.notificationsSent > 0
      ? Math.round(
          (rollup.notificationsDelivered / rollup.notificationsSent) * 1000
        ) / 10
      : 0;
  const uniqueAttribution = calculateUniqueCampaignAttribution(
    campaigns,
    transactions
  );
  rollup.returnedClients = uniqueAttribution.returnedClients;
  rollup.generatedVisits = uniqueAttribution.generatedVisits;
  return rollup;
}

function buildProgramResults(
  campaigns: WeeklyCampaign[],
  transactions: ActivityTransaction[],
  now: Date
) {
  const grouped = new Map<string, WeeklyCampaign[]>();
  for (const campaign of campaigns) {
    const key = campaign.programId || `none:${campaign.programName}`;
    grouped.set(key, [...(grouped.get(key) || []), campaign]);
  }

  return [...grouped.entries()]
    .map(([key, programCampaigns]) => {
      const rollup = rollupCampaigns(programCampaigns, transactions);
      return {
        programId: key.startsWith("none:") ? null : key,
        programName: programCampaigns[0]?.programName || "Programme",
        notificationsSent: rollup.notificationsSent,
        notificationsDelivered: rollup.notificationsDelivered,
        returnedClients: rollup.returnedClients,
        generatedVisits: rollup.generatedVisits,
        resultsAreProvisional: programCampaigns.some(
          (campaign) => !isAttributionComplete(campaign.sentAt, now)
        ),
      };
    })
    .sort(
      (a, b) =>
        b.returnedClients - a.returnedClients ||
        b.notificationsDelivered - a.notificationsDelivered
    );
}

export function calculateUniqueCampaignAttribution(
  campaigns: Array<{
    logs: Array<{
      cardId: string;
      delivered: boolean;
      deliveredAt: Date | null;
    }>;
  }>,
  transactions: Array<{
    cardId: string;
    createdAt: Date;
    card: { clientId: string };
  }>
) {
  const deliveriesByCard = new Map<string, Date[]>();
  for (const campaign of campaigns) {
    for (const log of campaign.logs) {
      if (!log.delivered || !log.deliveredAt) continue;
      deliveriesByCard.set(log.cardId, [
        ...(deliveriesByCard.get(log.cardId) || []),
        log.deliveredAt,
      ]);
    }
  }

  const returnedClients = new Set<string>();
  let generatedVisits = 0;
  for (const transaction of transactions) {
    const deliveries = deliveriesByCard.get(transaction.cardId) || [];
    const isAttributed = deliveries.some(
      (deliveredAt) =>
        transaction.createdAt >= deliveredAt &&
        transaction.createdAt <=
          addDays(deliveredAt, ATTRIBUTION_WINDOW_DAYS)
    );
    if (!isAttributed) continue;
    generatedVisits++;
    returnedClients.add(transaction.card.clientId);
  }

  return {
    returnedClients: returnedClients.size,
    generatedVisits,
  };
}

function buildActivityStats(
  start: Date,
  end: Date,
  cards: ActivityCard[],
  transactions: ActivityTransaction[],
  deliveriesByClient: Map<string, Date[]>
) {
  const newClients = new Set(
    cards
      .filter((card) => isWithinPeriod(card.createdAt, start, end))
      .map((card) => card.clientId)
  ).size;
  const organicReturningClients = new Set<string>();

  for (const transaction of transactions) {
    if (!isWithinPeriod(transaction.createdAt, start, end)) continue;
    if (transaction.card.createdAt >= start) continue;
    if (
      hasRecentDelivery(
        transaction.card.clientId,
        transaction.createdAt,
        deliveriesByClient
      )
    ) {
      continue;
    }
    organicReturningClients.add(transaction.card.clientId);
  }

  return {
    newClients,
    organicReturningClients: organicReturningClients.size,
  };
}

function groupDeliveriesByClient(deliveries: DeliveryHistory[]) {
  const grouped = new Map<string, Date[]>();
  for (const delivery of deliveries) {
    if (!delivery.deliveredAt) continue;
    grouped.set(delivery.card.clientId, [
      ...(grouped.get(delivery.card.clientId) || []),
      delivery.deliveredAt,
    ]);
  }
  return grouped;
}

function hasRecentDelivery(
  clientId: string,
  transactionAt: Date,
  deliveriesByClient: Map<string, Date[]>
) {
  const cutoff = addDays(transactionAt, -ATTRIBUTION_WINDOW_DAYS);
  return (deliveriesByClient.get(clientId) || []).some(
    (deliveredAt) => deliveredAt >= cutoff && deliveredAt <= transactionAt
  );
}

function calculateAverageBasket(transactions: ActivityTransaction[]) {
  const values = transactions
    .map((transaction) => transaction.amountSpent)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value > 0
    );
  if (values.length < 3) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildHighlights(
  stats: WeeklyCampaignSummary["stats"],
  pendingCampaigns: number,
  bestCampaign: WeeklyCampaign | null,
  abTestCampaign: WeeklyCampaign | undefined
) {
  const highlights: string[] = [];
  if (stats.notificationsSent === 0) {
    highlights.push("Aucune campagne envoyée ces 7 derniers jours.");
  } else {
    highlights.push(
      `${stats.notificationsDelivered} notification${stats.notificationsDelivered > 1 ? "s" : ""} livrée${stats.notificationsDelivered > 1 ? "s" : ""} sur ${stats.notificationsSent} envoyée${stats.notificationsSent > 1 ? "s" : ""}.`
    );
  }

  if (bestCampaign) {
    highlights.push(
      `${bestCampaign.name} a généré ${bestCampaign.impact.returnedClients} retour${bestCampaign.impact.returnedClients > 1 ? "s" : ""}, soit ${bestCampaign.impact.conversionRate} %.`
    );
  } else if (pendingCampaigns > 0) {
    highlights.push(
      "Aucun retour mesurable pour le moment. Les résultats des campagnes récentes sont encore en cours."
    );
  } else if (stats.notificationsSent > 0) {
    highlights.push("Aucun retour mesurable sur la période d'attribution terminée.");
  }

  if (stats.abTestsRun > 0) {
    const variant = abTestCampaign?.config?.messageVariantLabel;
    highlights.push(
      variant
        ? `Un test A/B est en cours avec la variante ${variant}.`
        : "Un test A/B est en cours sur vos messages automatiques."
    );
  }

  if (stats.rewardsUnlocked > 0) {
    highlights.push(
      `${stats.rewardsUnlocked} récompense${stats.rewardsUnlocked > 1 ? "s" : ""} débloquée${stats.rewardsUnlocked > 1 ? "s" : ""} après campagne.`
    );
  }

  return highlights.slice(0, 4);
}

function buildNextActions(
  stats: Pick<WeeklyCampaignSummary["stats"], "automationsActive">,
  topOpportunity: Pick<
    CampaignRecommendation,
    "title" | "potentialCount" | "programName"
  > | null
) {
  if (topOpportunity) {
    return [
      `${topOpportunity.potentialCount} client${topOpportunity.potentialCount > 1 ? "s" : ""} ciblable${topOpportunity.potentialCount > 1 ? "s" : ""} : ${topOpportunity.title.toLowerCase()} sur ${topOpportunity.programName}.`,
    ];
  }
  if (stats.automationsActive === 0) {
    return ["Activez une première recommandation automatique pour lancer le suivi récurrent."];
  }
  return ["Aucune action urgente détectée cette semaine."];
}

function isWithinPeriod(value: Date, start: Date, end: Date) {
  return value >= start && value < end;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}
