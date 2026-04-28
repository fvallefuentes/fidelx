import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const merchantId = session.user.id;

  const programs = await prisma.loyaltyProgram.findMany({
    where: { merchantId },
    select: { id: true, name: true, _count: { select: { cards: true } } },
  });

  const programIds = programs.map((p) => p.id);

  if (programIds.length === 0) {
    return NextResponse.json({
      totalClients: 0,
      activeCards: 0,
      totalVisits: 0,
      returnRate: 0,
      newClientsThisWeek: 0,
      newClientsLastWeek: 0,
      visitsThisWeek: 0,
      visitsLastWeek: 0,
      visitsByDay: emptyDays(30),
      newClientsByDay: emptyDays(30),
      stampDistribution: [],
      topPrograms: [],
      recentClients: [],
    });
  }

  const now = new Date();
  const start30 = startOfDay(addDays(now, -29));
  const start7 = startOfDay(addDays(now, -6));
  const start14 = startOfDay(addDays(now, -13));

  const [
    totalCards,
    activeCards,
    totalVisitsAgg,
    cardsWithMultipleVisits,
    recentCards,
    cardsForChart,
    transactionsForChart,
    cardsForStamps,
  ] = await Promise.all([
    prisma.loyaltyCard.count({ where: { programId: { in: programIds } } }),
    prisma.loyaltyCard.count({
      where: { programId: { in: programIds }, status: "ACTIVE" },
    }),
    prisma.loyaltyCard.aggregate({
      where: { programId: { in: programIds } },
      _sum: { totalVisits: true },
    }),
    prisma.loyaltyCard.count({
      where: { programId: { in: programIds }, totalVisits: { gte: 2 } },
    }),
    prisma.loyaltyCard.findMany({
      where: { programId: { in: programIds } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { client: { select: { firstName: true, email: true } } },
    }),
    prisma.loyaltyCard.findMany({
      where: {
        programId: { in: programIds },
        createdAt: { gte: start30 },
      },
      select: { createdAt: true },
    }),
    prisma.transaction.findMany({
      where: {
        card: { programId: { in: programIds } },
        createdAt: { gte: start30 },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] },
      },
      select: { createdAt: true },
    }),
    prisma.loyaltyCard.findMany({
      where: { programId: { in: programIds } },
      select: { currentStamps: true, program: { select: { config: true } } },
    }),
  ]);

  // Build last-30-day buckets
  const newClientsByDay = bucketDays(cardsForChart.map((c) => c.createdAt), 30);
  const visitsByDay = bucketDays(transactionsForChart.map((t) => t.createdAt), 30);

  const newClientsThisWeek = cardsForChart.filter((c) => c.createdAt >= start7).length;
  const newClientsLastWeek = cardsForChart.filter(
    (c) => c.createdAt >= start14 && c.createdAt < start7
  ).length;
  const visitsThisWeek = transactionsForChart.filter((t) => t.createdAt >= start7).length;
  const visitsLastWeek = transactionsForChart.filter(
    (t) => t.createdAt >= start14 && t.createdAt < start7
  ).length;

  // Stamp distribution buckets (% completion of cards)
  const completionBuckets: Record<string, number> = {
    "0-25%": 0,
    "26-50%": 0,
    "51-75%": 0,
    "76-99%": 0,
    "100%": 0,
  };
  for (const card of cardsForStamps) {
    const cfg = (card.program?.config as { maxStamps?: number } | null) || null;
    const max = cfg?.maxStamps || 10;
    const pct = (card.currentStamps / Math.max(1, max)) * 100;
    if (pct >= 100) completionBuckets["100%"]++;
    else if (pct >= 76) completionBuckets["76-99%"]++;
    else if (pct >= 51) completionBuckets["51-75%"]++;
    else if (pct >= 26) completionBuckets["26-50%"]++;
    else completionBuckets["0-25%"]++;
  }
  const stampDistribution = Object.entries(completionBuckets).map(([range, count]) => ({
    range,
    count,
  }));

  // Top programs by card count
  const topPrograms = programs
    .map((p) => ({ id: p.id, name: p.name, cards: p._count.cards }))
    .sort((a, b) => b.cards - a.cards)
    .slice(0, 5);

  const returnRate =
    totalCards > 0 ? Math.round((cardsWithMultipleVisits / totalCards) * 100) : 0;

  const recentClients = recentCards.map((card) => ({
    id: card.id,
    firstName: card.client.firstName,
    email: card.client.email,
    currentStamps: card.currentStamps,
    lastVisitAt: card.lastVisitAt?.toISOString() || null,
  }));

  return NextResponse.json({
    totalClients: totalCards,
    activeCards,
    totalVisits: totalVisitsAgg._sum.totalVisits || 0,
    returnRate,
    newClientsThisWeek,
    newClientsLastWeek,
    visitsThisWeek,
    visitsLastWeek,
    visitsByDay,
    newClientsByDay,
    stampDistribution,
    topPrograms,
    recentClients,
  });
}

/* ─── Helpers ────────────────────────────────────────────── */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function emptyDays(n: number) {
  const out: { date: string; count: number }[] = [];
  const today = startOfDay(new Date());
  for (let i = n - 1; i >= 0; i--) {
    out.push({ date: addDays(today, -i).toISOString().slice(0, 10), count: 0 });
  }
  return out;
}
function bucketDays(dates: Date[], n: number) {
  const out = emptyDays(n);
  const idx: Record<string, number> = {};
  out.forEach((d, i) => (idx[d.date] = i));
  for (const dt of dates) {
    const key = startOfDay(dt).toISOString().slice(0, 10);
    if (idx[key] !== undefined) out[idx[key]].count++;
  }
  return out;
}
