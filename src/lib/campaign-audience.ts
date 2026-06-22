import type { Prisma } from "@/generated/prisma/client";

export type CampaignSegment = "ALL" | "ACTIVE" | "DORMANT" | "NEW" | "VIP";

export function buildCampaignAudienceWhere(
  programId: string,
  segment: CampaignSegment = "ALL",
  cardIds: string[] = []
): Prisma.LoyaltyCardWhereInput {
  const where: Prisma.LoyaltyCardWhereInput = { programId, status: "ACTIVE" };

  if (cardIds.length > 0) {
    where.id = { in: [...new Set(cardIds)].filter(Boolean) };
    return where;
  }

  if (segment === "ACTIVE") {
    where.lastVisitAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
  } else if (segment === "DORMANT") {
    where.OR = [
      { lastVisitAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      { lastVisitAt: null },
    ];
  } else if (segment === "NEW") {
    where.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  } else if (segment === "VIP") {
    where.totalVisits = { gte: 10 };
  }

  return where;
}
