import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 29);
  start30.setHours(0, 0, 0, 0);
  const start6mo = new Date(
    now.getFullYear(),
    now.getMonth() - 5,
    1,
    0,
    0,
    0,
    0
  );

  const [
    totalMerchants,
    totalPrograms,
    totalClients,
    totalScans,
    planCounts,
    merchants6mo,
    transactions30,
    topMerchantsTx,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.loyaltyProgram.count(),
    prisma.client.count(),
    prisma.transaction.count({
      where: { type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] } },
    }),
    prisma.user.groupBy({
      by: ["plan"],
      where: { role: "USER" },
      _count: { id: true },
    }),
    prisma.user.findMany({
      where: { role: "USER", createdAt: { gte: start6mo } },
      select: { createdAt: true },
    }),
    prisma.transaction.findMany({
      where: {
        createdAt: { gte: start30 },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] },
      },
      select: { createdAt: true },
    }),
    // Top cards by scan count — we'll aggregate to merchant after
    prisma.transaction.groupBy({
      by: ["cardId"],
      where: { type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 50,
    }),
  ]);

  // Bucket monthly inscriptions
  const monthlyGrowth: { month: string; count: number }[] = [];
  const mIdx: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    monthlyGrowth.push({ month: key, count: 0 });
    mIdx[key] = monthlyGrowth.length - 1;
  }
  for (const u of merchants6mo) {
    const key = new Date(u.createdAt).toISOString().slice(0, 7);
    if (mIdx[key] !== undefined) monthlyGrowth[mIdx[key]].count++;
  }

  // Bucket daily activity 30 days
  const activity30: { date: string; count: number }[] = [];
  const aIdx: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    activity30.push({ date: key, count: 0 });
    aIdx[key] = activity30.length - 1;
  }
  for (const t of transactions30) {
    const key = new Date(t.createdAt).toISOString().slice(0, 10);
    if (aIdx[key] !== undefined) activity30[aIdx[key]].count++;
  }

  // Resolve top merchants by aggregating cardId → merchantId
  const cardIds = topMerchantsTx.map((r) => r.cardId);
  const cards = cardIds.length
    ? await prisma.loyaltyCard.findMany({
        where: { id: { in: cardIds } },
        select: {
          id: true,
          program: {
            select: {
              merchantId: true,
              merchant: { select: { name: true, email: true } },
            },
          },
        },
      })
    : [];
  const cardToMerchant = new Map<string, { id: string; name: string }>();
  for (const c of cards) {
    cardToMerchant.set(c.id, {
      id: c.program.merchantId,
      name:
        c.program.merchant.name ?? c.program.merchant.email ?? "—",
    });
  }
  const merchantTotals: Record<string, { name: string; count: number }> = {};
  for (const r of topMerchantsTx) {
    const m = cardToMerchant.get(r.cardId);
    if (!m) continue;
    if (!merchantTotals[m.id]) merchantTotals[m.id] = { name: m.name, count: 0 };
    merchantTotals[m.id].count += r._count.id;
  }
  const topMerchants = Object.entries(merchantTotals)
    .map(([id, v]) => ({ id, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const planDistribution = ["FREE", "ESSENTIAL", "GROWTH", "MULTI_SITE"].map(
    (plan) => ({
      name: plan,
      value: planCounts.find((p) => p.plan === plan)?._count.id ?? 0,
    })
  );

  return NextResponse.json({
    totalMerchants,
    totalPrograms,
    totalClients,
    totalScans,
    monthlyGrowth,
    activity30,
    topMerchants,
    planDistribution,
  });
}
