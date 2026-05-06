import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLAN_PRICES: Record<string, number> = {
  FREE: 0,
  ESSENTIAL: 39,
  GROWTH: 89,
  MULTI_SITE: 199,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 6);
  start7.setHours(0, 0, 0, 0);
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 29);
  start30.setHours(0, 0, 0, 0);

  const [
    totalMerchants,
    newMerchantsLast30,
    planCounts,
    totalClients,
    totalCards,
    scansLast30,
    scansLast7,
    rewardsLast30,
    inscriptions30Rows,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({
      where: { role: "USER", createdAt: { gte: start30 } },
    }),
    prisma.user.groupBy({
      by: ["plan"],
      where: { role: "USER" },
      _count: { id: true },
    }),
    prisma.client.count(),
    prisma.loyaltyCard.count(),
    prisma.transaction.count({
      where: {
        createdAt: { gte: start30 },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] },
      },
    }),
    prisma.transaction.count({
      where: {
        createdAt: { gte: start7 },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] },
      },
    }),
    prisma.rewardClaim.count({ where: { claimedAt: { gte: start30 } } }),
    prisma.user.findMany({
      where: { role: "USER", createdAt: { gte: start30 } },
      select: { createdAt: true },
    }),
  ]);

  const planMap: Record<string, number> = {};
  for (const p of planCounts) planMap[p.plan] = p._count.id;
  const paidCount =
    (planMap.ESSENTIAL ?? 0) +
    (planMap.GROWTH ?? 0) +
    (planMap.MULTI_SITE ?? 0);
  const mrr =
    (planMap.ESSENTIAL ?? 0) * PLAN_PRICES.ESSENTIAL +
    (planMap.GROWTH ?? 0) * PLAN_PRICES.GROWTH +
    (planMap.MULTI_SITE ?? 0) * PLAN_PRICES.MULTI_SITE;

  // Bucket merchant inscriptions over 30 days
  const buckets: { date: string; count: number }[] = [];
  const idx: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    buckets.push({ date: key, count: 0 });
    idx[key] = buckets.length - 1;
  }
  for (const u of inscriptions30Rows) {
    const key = new Date(u.createdAt).toISOString().slice(0, 10);
    if (idx[key] !== undefined) buckets[idx[key]].count++;
  }

  return NextResponse.json({
    totalMerchants,
    newMerchantsLast30,
    paidCount,
    mrr,
    planMap,
    totalClients,
    totalCards,
    scansLast30,
    scansLast7,
    rewardsLast30,
    inscriptions30: buckets,
  });
}
