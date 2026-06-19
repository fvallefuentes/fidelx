import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCampaignImpact } from "@/lib/campaign-impact";
import { buildCampaignRecommendations } from "@/lib/campaign-recommendations";

export const dynamic = "force-dynamic";

type AutomationConfig = {
  automationRule?: boolean;
  automationRuleId?: string;
  abTest?: boolean;
  abTestArm?: string;
  messageVariantLabel?: string;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const now = new Date();
  const periodStart = addDays(now, -7);

  const [campaigns, scheduledRules, recommendations] = await Promise.all([
    prisma.notificationCampaign.findMany({
      where: {
        merchantId: session.user.id,
        status: "SENT",
        OR: [{ sentAt: { gte: periodStart } }, { createdAt: { gte: periodStart } }],
      },
      include: {
        program: { select: { name: true } },
        logs: {
          where: { delivered: true, deliveredAt: { not: null } },
          select: { cardId: true, deliveredAt: true },
        },
      },
      orderBy: { sentAt: "desc" },
      take: 100,
    }),
    prisma.notificationCampaign.findMany({
      where: {
        merchantId: session.user.id,
        status: "SCHEDULED",
      },
      select: { triggerConfig: true },
    }),
    buildCampaignRecommendations(session.user.id),
  ]);
  const activeAutomations = scheduledRules.filter(
    (rule) => (rule.triggerConfig as AutomationConfig | null)?.automationRule
  ).length;

  const visibleCampaigns = campaigns.filter(
    (campaign) => !(campaign.triggerConfig as AutomationConfig | null)?.automationRule
  );
  const campaignsWithImpact = await Promise.all(
    visibleCampaigns.map(async (campaign) => ({
      id: campaign.id,
      name: campaign.name,
      programName: campaign.program?.name || "Programme",
      sentAt: campaign.sentAt || campaign.createdAt,
      sentCount: campaign.sentCount,
      config: campaign.triggerConfig as AutomationConfig | null,
      impact: await calculateCampaignImpact(campaign.logs),
    }))
  );

  const stats = campaignsWithImpact.reduce(
    (acc, campaign) => {
      acc.messagesSent += campaign.sentCount || 0;
      acc.returnedClients += campaign.impact.returnedClients;
      acc.generatedVisits += campaign.impact.generatedVisits;
      acc.rewardsUnlocked += campaign.impact.rewardsUnlocked;
      if (campaign.config?.abTest) acc.abTestsRun += 1;
      return acc;
    },
    {
      messagesSent: 0,
      returnedClients: 0,
      generatedVisits: 0,
      rewardsUnlocked: 0,
      campaignsSent: campaignsWithImpact.length,
      automationsActive: activeAutomations,
      abTestsRun: 0,
    }
  );

  const bestCampaign =
    campaignsWithImpact
      .filter((campaign) => campaign.sentCount > 0)
      .sort(
        (a, b) =>
          b.impact.returnedClients - a.impact.returnedClients ||
          b.impact.conversionRate - a.impact.conversionRate ||
          b.sentCount - a.sentCount
      )[0] || null;
  const topOpportunity = recommendations[0] || null;
  const abTestCampaign = campaignsWithImpact.find((campaign) => campaign.config?.abTest) || null;

  return NextResponse.json({
    periodStart: periodStart.toISOString(),
    periodEnd: now.toISOString(),
    stats,
    bestCampaign: bestCampaign
      ? {
          name: bestCampaign.name,
          programName: bestCampaign.programName,
          sentCount: bestCampaign.sentCount,
          returnedClients: bestCampaign.impact.returnedClients,
          conversionRate: bestCampaign.impact.conversionRate,
        }
      : null,
    topOpportunity: topOpportunity
      ? {
          title: topOpportunity.title,
          reason: topOpportunity.reason,
          programName: topOpportunity.programName,
          potentialCount: topOpportunity.potentialCount,
        }
      : null,
    highlights: buildHighlights(stats, bestCampaign, abTestCampaign),
    nextActions: buildNextActions(stats, topOpportunity),
  });
}

function buildHighlights(
  stats: {
    messagesSent: number;
    returnedClients: number;
    generatedVisits: number;
    rewardsUnlocked: number;
    abTestsRun: number;
  },
  bestCampaign: {
    name: string;
    sentCount: number;
    impact: { returnedClients: number; conversionRate: number };
  } | null,
  abTestCampaign: { config: AutomationConfig | null } | null
) {
  const highlights: string[] = [];
  if (stats.messagesSent === 0) {
    highlights.push("Aucune campagne envoyee ces 7 derniers jours.");
  } else {
    highlights.push(
      `${stats.messagesSent} message${stats.messagesSent > 1 ? "s" : ""} envoye${stats.messagesSent > 1 ? "s" : ""}, ${stats.returnedClients} client${stats.returnedClients > 1 ? "s" : ""} revenu${stats.returnedClients > 1 ? "s" : ""}.`
    );
  }

  if (bestCampaign && bestCampaign.impact.returnedClients > 0) {
    highlights.push(
      `${bestCampaign.name} est la meilleure action: ${bestCampaign.impact.returnedClients} retour${bestCampaign.impact.returnedClients > 1 ? "s" : ""}, ${bestCampaign.impact.conversionRate}% de retour.`
    );
  }

  if (stats.abTestsRun > 0) {
    const variant = abTestCampaign?.config?.messageVariantLabel;
    highlights.push(
      variant
        ? `Un test A/B est en cours, avec la variante ${variant} dans la boucle.`
        : "Un test A/B est en cours sur vos messages automatiques."
    );
  }

  if (stats.rewardsUnlocked > 0) {
    highlights.push(
      `${stats.rewardsUnlocked} recompense${stats.rewardsUnlocked > 1 ? "s" : ""} debloquee${stats.rewardsUnlocked > 1 ? "s" : ""} apres campagne.`
    );
  }

  return highlights.slice(0, 4);
}

function buildNextActions(
  stats: { automationsActive: number; messagesSent: number },
  topOpportunity: { title: string; potentialCount: number; programName: string } | null
) {
  const actions: string[] = [];
  if (topOpportunity) {
    actions.push(
      `Priorite: ${topOpportunity.title.toLowerCase()} pour ${topOpportunity.potentialCount} client${topOpportunity.potentialCount > 1 ? "s" : ""} sur ${topOpportunity.programName}.`
    );
  }
  if (stats.automationsActive === 0) {
    actions.push("Activez une premiere recommandation automatique pour lancer le suivi recurrent.");
  }
  if (stats.messagesSent === 0 && stats.automationsActive > 0) {
    actions.push("Vos automatisations sont pretes, mais aucune audience suffisante n'a ete envoyee cette semaine.");
  }
  if (actions.length === 0) {
    actions.push("Continuez les tests: l'assistant consolide les gagnants quand les donnees deviennent fiables.");
  }
  return actions.slice(0, 3);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
