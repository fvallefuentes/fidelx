import { prisma } from "@/lib/prisma";
import { notifyCardInProgram } from "@/lib/wallet/push";
import {
  selectStampTriggeredCampaign,
  type StampProgress,
} from "@/lib/campaign-event-rules";

export async function dispatchStampTriggeredCampaign({
  merchantId,
  programId,
  cardId,
  progress,
}: {
  merchantId: string;
  programId: string;
  cardId: string;
  progress: StampProgress;
}) {
  const campaigns = await prisma.notificationCampaign.findMany({
    where: {
      merchantId,
      programId,
      status: "SCHEDULED",
      triggerType: { in: ["POST_STAMP", "MILESTONE"] },
    },
    select: {
      id: true,
      name: true,
      message: true,
      triggerType: true,
      triggerConfig: true,
      targetSegment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const campaign = selectStampTriggeredCampaign(campaigns, progress);
  if (!campaign) return { matched: false, sent: 0 };

  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    select: {
      status: true,
      totalVisits: true,
      createdAt: true,
      lastVisitAt: true,
    },
  });

  if (!card || !matchesSegment(card, campaign.targetSegment)) {
    return { matched: true, sent: 0, campaignId: campaign.id };
  }

  const title = getNotificationTitle(campaign.triggerConfig) || campaign.name;
  const result = await notifyCardInProgram(
    programId,
    cardId,
    campaign.message,
    title,
    campaign.id
  );

  if (result.sent > 0) {
    await prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount: { increment: result.sent },
        sentAt: new Date(),
      },
    });
  }

  return { matched: true, sent: result.sent, campaignId: campaign.id };
}

function matchesSegment(
  card: {
    status: string;
    totalVisits: number;
    createdAt: Date;
    lastVisitAt: Date | null;
  },
  segment: string
) {
  if (card.status !== "ACTIVE" && card.status !== "REWARD_PENDING") return false;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  if (segment === "ACTIVE") {
    return Boolean(card.lastVisitAt && card.lastVisitAt.getTime() >= thirtyDaysAgo);
  }
  if (segment === "DORMANT") {
    return !card.lastVisitAt || card.lastVisitAt.getTime() < thirtyDaysAgo;
  }
  if (segment === "NEW") return card.createdAt.getTime() >= sevenDaysAgo;
  if (segment === "VIP") return card.totalVisits >= 10;
  return true;
}

function getNotificationTitle(config: unknown) {
  const title = (config as { notifTitle?: unknown } | null)?.notifTitle;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}
