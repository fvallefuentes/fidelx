import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyPassUpdate } from "@/lib/wallet/push";

export async function POST(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const secret = process.env.CAMPAIGNS_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();

  const dueCampaigns = await prisma.notificationCampaign.findMany({
    where: {
      triggerType: "SCHEDULED",
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
  });

  const results = [];

  for (const campaign of dueCampaigns) {
    if (!campaign.programId) continue;

    const where: Record<string, unknown> = { programId: campaign.programId, status: "ACTIVE" };
    const seg = campaign.targetSegment;
    if (seg === "ACTIVE") where.lastVisitAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    else if (seg === "DORMANT") where.OR = [{ lastVisitAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, { lastVisitAt: null }];
    else if (seg === "NEW") where.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    else if (seg === "VIP") where.totalVisits = { gte: 10 };

    const cards = await prisma.loyaltyCard.findMany({ where, select: { id: true } });

    await prisma.loyaltyCard.updateMany({
      where: { id: { in: cards.map((c) => c.id) } },
      data: { lastMessage: campaign.message },
    });

    await Promise.allSettled(cards.map((c) => notifyPassUpdate(c.id)));

    await prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: { status: "SENT", sentAt: new Date(), sentCount: cards.length },
    });

    results.push({ campaign: campaign.name, sent: cards.length });
  }

  return NextResponse.json({ processed: results.length, results });
}
