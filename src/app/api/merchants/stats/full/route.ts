import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/* ─── Types ───────────────────────────────────────────────── */
interface DayBucket { date: string; count: number }
interface MonthBucket { month: string; count: number }
interface EstablishmentStat {
  id: string;
  name: string;
  clientCount: number;
  scanCount: number;
  rewardCount: number;
}
interface CampaignPerf {
  id: string;
  name: string;
  sentCount: number;
  deliveredCount: number;
}
interface ProgressionBucket { range: string; count: number }
interface ActiveVsInactive { name: string; value: number }

export interface FullStatsResponse {
  plan: string;
  // FREE+
  totalClients: number;
  activeCards: number;
  totalStamps: number;
  rewardsClaimed: number;
  avgProgressionPct: number | null;
  activityLast7: DayBucket[];
  // ESSENTIAL+
  newClientsLast30: number | null;
  walletInstallRate: number | null;
  activeClientsLast30: number | null;
  scansPerClient: number | null;
  rewardsRedeemed: number | null;
  nearRewardCount: number | null;
  inscriptionsLast30: DayBucket[] | null;
  scansLast30: DayBucket[] | null;
  rewardsLast30: DayBucket[] | null;
  // GROWTH+
  inactiveClients: number | null;
  campaignsSent: number | null;
  notifDelivered: number | null;
  notifTotal: number | null;
  openRate: number | null;
  avgDaysToReward: number | null;
  activeVsInactiveLast30: ActiveVsInactive[] | null;
  campaignPerformance: CampaignPerf[] | null;
  clientProgressionDist: ProgressionBucket[] | null;
  monthlyGrowth: MonthBucket[] | null;
  // MULTI_SITE+
  establishments: EstablishmentStat[] | null;
}

/* ─── Helpers ─────────────────────────────────────────────── */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function emptyDays(n: number): DayBucket[] {
  const out: DayBucket[] = [];
  const today = startOfDay(new Date());
  for (let i = n - 1; i >= 0; i--) {
    out.push({ date: addDays(today, -i).toISOString().slice(0, 10), count: 0 });
  }
  return out;
}
function bucketDays(dates: Date[], n: number): DayBucket[] {
  const out = emptyDays(n);
  const idx: Record<string, number> = {};
  out.forEach((d, i) => (idx[d.date] = i));
  for (const dt of dates) {
    const key = startOfDay(dt).toISOString().slice(0, 10);
    if (idx[key] !== undefined) out[idx[key]].count++;
  }
  return out;
}
function bucketMonths(dates: Date[], n: number): MonthBucket[] {
  const out: MonthBucket[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -i);
    out.push({ month: d.toISOString().slice(0, 7), count: 0 });
  }
  const idx: Record<string, number> = {};
  out.forEach((m, i) => (idx[m.month] = i));
  for (const dt of dates) {
    const key = new Date(dt).toISOString().slice(0, 7);
    if (idx[key] !== undefined) out[idx[key]].count++;
  }
  return out;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/* ─── Route ───────────────────────────────────────────────── */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const merchantId = session.user.id;

  // Get current plan from DB (authoritative)
  const dbUser = await prisma.user.findUnique({
    where: { id: merchantId },
    select: { plan: true },
  });
  const plan: string = (dbUser?.plan as string | undefined) ?? "FREE";

  const isEssential = plan === "ESSENTIAL" || plan === "GROWTH" || plan === "MULTI_SITE";
  const isGrowth = plan === "GROWTH" || plan === "MULTI_SITE";
  const isMultiSite = plan === "MULTI_SITE";

  // Get all program IDs for this merchant
  const programs = await prisma.loyaltyProgram.findMany({
    where: { merchantId },
    select: { id: true },
  });
  const programIds = programs.map((p) => p.id);

  const now = new Date();
  const start7 = startOfDay(addDays(now, -6));
  const start30 = startOfDay(addDays(now, -29));
  const start60 = startOfDay(addDays(now, -59));

  // Empty response defaults
  const defaults: FullStatsResponse = {
    plan,
    totalClients: 0,
    activeCards: 0,
    totalStamps: 0,
    rewardsClaimed: 0,
    avgProgressionPct: null,
    activityLast7: emptyDays(7),
    newClientsLast30: null,
    walletInstallRate: null,
    activeClientsLast30: null,
    scansPerClient: null,
    rewardsRedeemed: null,
    nearRewardCount: null,
    inscriptionsLast30: null,
    scansLast30: null,
    rewardsLast30: null,
    inactiveClients: null,
    campaignsSent: null,
    notifDelivered: null,
    notifTotal: null,
    openRate: null,
    avgDaysToReward: null,
    activeVsInactiveLast30: null,
    campaignPerformance: null,
    clientProgressionDist: null,
    monthlyGrowth: null,
    establishments: null,
  };

  if (programIds.length === 0) {
    return NextResponse.json({ ...defaults });
  }

  /* ── FREE queries (always run) ── */
  const [
    totalClients,
    activeCards,
    totalStamps,
    rewardsClaimed,
    stampsCards,
    activityLast7Rows,
  ] = await Promise.all([
    prisma.loyaltyCard.count({ where: { programId: { in: programIds } } }),
    prisma.loyaltyCard.count({
      where: { programId: { in: programIds }, status: "ACTIVE" as never },
    }),
    prisma.transaction.count({
      where: {
        card: { programId: { in: programIds } },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] as never[] },
      },
    }),
    prisma.rewardClaim.count({
      where: { card: { programId: { in: programIds } } },
    }),
    // For avgProgressionPct — STAMPS type programs only
    prisma.loyaltyCard.findMany({
      where: {
        programId: { in: programIds },
        program: { type: "STAMPS" as never },
      },
      select: {
        currentStamps: true,
        program: { select: { config: true } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        card: { programId: { in: programIds } },
        createdAt: { gte: start7 },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] as never[] },
      },
      select: { createdAt: true },
    }),
  ]);

  // Compute avgProgressionPct
  let avgProgressionPct: number | null = null;
  if (stampsCards.length > 0) {
    const pcts = stampsCards.map((card) => {
      const cfg = (card.program?.config as { maxStamps?: number } | null) ?? null;
      const max = cfg?.maxStamps ?? 10;
      return (card.currentStamps / Math.max(1, max)) * 100;
    });
    avgProgressionPct = round1(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  }

  const activityLast7 = bucketDays(activityLast7Rows.map((t) => t.createdAt), 7);

  const result: FullStatsResponse = {
    ...defaults,
    plan,
    totalClients,
    activeCards,
    totalStamps,
    rewardsClaimed,
    avgProgressionPct,
    activityLast7,
  };

  if (!isEssential) {
    return NextResponse.json(result);
  }

  /* ── ESSENTIAL queries ── */
  const [
    newClientsLast30,
    cardsWithWallet,
    cardsWithTransactionLast30,
    rewardsRedeemed,
    inscriptionsLast30Rows,
    scansLast30Rows,
    rewardClaimsLast30Rows,
  ] = await Promise.all([
    prisma.loyaltyCard.count({
      where: { programId: { in: programIds }, createdAt: { gte: start30 } },
    }),
    // Cards with at least 1 pass registration
    prisma.loyaltyCard.count({
      where: {
        programId: { in: programIds },
        registrations: { some: {} },
      },
    }),
    // Cards with at least 1 transaction in last 30 days
    prisma.loyaltyCard.count({
      where: {
        programId: { in: programIds },
        transactions: {
          some: { createdAt: { gte: start30 } },
        },
      },
    }),
    prisma.rewardClaim.count({
      where: {
        card: { programId: { in: programIds } },
        status: "REDEEMED" as never,
      },
    }),
    prisma.loyaltyCard.findMany({
      where: { programId: { in: programIds }, createdAt: { gte: start30 } },
      select: { createdAt: true },
    }),
    prisma.transaction.findMany({
      where: {
        card: { programId: { in: programIds } },
        createdAt: { gte: start30 },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] as never[] },
      },
      select: { createdAt: true },
    }),
    prisma.rewardClaim.findMany({
      where: {
        card: { programId: { in: programIds } },
        claimedAt: { gte: start30 },
      },
      select: { claimedAt: true },
    }),
  ]);

  // nearRewardCount: cards where currentStamps/maxStamps >= 0.8 for STAMPS programs
  const nearRewardCount = stampsCards.filter((card) => {
    const cfg = (card.program?.config as { maxStamps?: number } | null) ?? null;
    const max = cfg?.maxStamps ?? 10;
    return card.currentStamps / Math.max(1, max) >= 0.8;
  }).length;

  const walletInstallRate =
    totalClients > 0 ? round1((cardsWithWallet / totalClients) * 100) : 0;
  const scansPerClient =
    totalClients > 0 ? round1(totalStamps / totalClients) : 0;

  result.newClientsLast30 = newClientsLast30;
  result.walletInstallRate = walletInstallRate;
  result.activeClientsLast30 = cardsWithTransactionLast30;
  result.scansPerClient = scansPerClient;
  result.rewardsRedeemed = rewardsRedeemed;
  result.nearRewardCount = nearRewardCount;
  result.inscriptionsLast30 = bucketDays(inscriptionsLast30Rows.map((c) => c.createdAt), 30);
  result.scansLast30 = bucketDays(scansLast30Rows.map((t) => t.createdAt), 30);
  result.rewardsLast30 = bucketDays(rewardClaimsLast30Rows.map((r) => r.claimedAt), 30);

  if (!isGrowth) {
    return NextResponse.json(result);
  }

  /* ── GROWTH queries ── */
  // inactiveClients: cards with no transaction in last 60 days AND totalVisits > 0
  const [
    inactiveClients,
    campaignsSent,
    campaignIds,
    avgDaysRaw,
    campaignPerformanceRaw,
    monthlyGrowthRows,
    allCardsForDist,
  ] = await Promise.all([
    prisma.loyaltyCard.count({
      where: {
        programId: { in: programIds },
        totalVisits: { gt: 0 },
        transactions: {
          none: { createdAt: { gte: start60 } },
        },
      },
    }),
    prisma.notificationCampaign.count({ where: { merchantId } }),
    prisma.notificationCampaign.findMany({
      where: { merchantId },
      select: { id: true, name: true, sentCount: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // avgDaysToReward: fetch rewardClaims with card.createdAt
    prisma.rewardClaim.findMany({
      where: { card: { programId: { in: programIds } } },
      select: {
        claimedAt: true,
        card: { select: { createdAt: true } },
      },
    }),
    // campaign performance: top 5 campaigns with delivered log count
    prisma.notificationCampaign.findMany({
      where: { merchantId },
      select: {
        id: true,
        name: true,
        sentCount: true,
        logs: {
          where: { delivered: true },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // monthlyGrowth: cards created in last 6 months
    prisma.loyaltyCard.findMany({
      where: {
        programId: { in: programIds },
        createdAt: { gte: addMonths(startOfDay(new Date()), -5) },
      },
      select: { createdAt: true },
    }),
    // clientProgressionDist: all cards for stamp distribution
    prisma.loyaltyCard.findMany({
      where: { programId: { in: programIds } },
      select: {
        currentStamps: true,
        program: { select: { config: true, type: true } },
      },
    }),
  ]);

  // Compute notifDelivered and notifTotal
  const campaignIdList = campaignIds.map((c) => c.id);
  let notifDelivered = 0;
  let notifTotal = 0;
  if (campaignIdList.length > 0) {
    const [delivered, total] = await Promise.all([
      prisma.notificationLog.count({
        where: { campaignId: { in: campaignIdList }, delivered: true },
      }),
      prisma.notificationLog.count({
        where: { campaignId: { in: campaignIdList } },
      }),
    ]);
    notifDelivered = delivered;
    notifTotal = total;
  }

  const openRate = notifTotal > 0 ? round1((notifDelivered / notifTotal) * 100) : 0;

  // avgDaysToReward
  let avgDaysToReward: number | null = null;
  if (avgDaysRaw.length > 0) {
    const diffs = avgDaysRaw.map((rc) => {
      const ms = rc.claimedAt.getTime() - rc.card.createdAt.getTime();
      return ms / (1000 * 60 * 60 * 24);
    });
    avgDaysToReward = round1(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  }

  const activeVsInactiveLast30: ActiveVsInactive[] = [
    { name: "Actifs", value: cardsWithTransactionLast30 },
    { name: "Inactifs", value: inactiveClients },
  ];

  const campaignPerformance: CampaignPerf[] = campaignPerformanceRaw.map((c) => ({
    id: c.id,
    name: c.name,
    sentCount: c.sentCount,
    deliveredCount: c.logs.length,
  }));

  // clientProgressionDist
  const distBuckets: Record<string, number> = {
    "0-25%": 0,
    "26-50%": 0,
    "51-75%": 0,
    "76-99%": 0,
    "100%": 0,
  };
  for (const card of allCardsForDist) {
    const cfg = (card.program?.config as { maxStamps?: number } | null) ?? null;
    const max = cfg?.maxStamps ?? 10;
    const pct = (card.currentStamps / Math.max(1, max)) * 100;
    if (pct >= 100) distBuckets["100%"]++;
    else if (pct >= 76) distBuckets["76-99%"]++;
    else if (pct >= 51) distBuckets["51-75%"]++;
    else if (pct >= 26) distBuckets["26-50%"]++;
    else distBuckets["0-25%"]++;
  }
  const clientProgressionDist = Object.entries(distBuckets).map(([range, count]) => ({
    range,
    count,
  }));

  const monthlyGrowth = bucketMonths(monthlyGrowthRows.map((c) => c.createdAt), 6);

  result.inactiveClients = inactiveClients;
  result.campaignsSent = campaignsSent;
  result.notifDelivered = notifDelivered;
  result.notifTotal = notifTotal;
  result.openRate = openRate;
  result.avgDaysToReward = avgDaysToReward;
  result.activeVsInactiveLast30 = activeVsInactiveLast30;
  result.campaignPerformance = campaignPerformance;
  result.clientProgressionDist = clientProgressionDist;
  result.monthlyGrowth = monthlyGrowth;

  if (!isMultiSite) {
    return NextResponse.json(result);
  }

  /* ── MULTI_SITE queries ── */
  const establishmentList = await prisma.establishment.findMany({
    where: { merchantId },
    select: { id: true, name: true },
  });

  const estIds = establishmentList.map((e) => e.id);

  const [cardsByEst, scansByEst, rewardsByEst] = await Promise.all([
    // cards per establishment (via program.establishmentId)
    prisma.loyaltyCard.groupBy({
      by: ["programId"],
      where: { programId: { in: programIds } },
      _count: { id: true },
    }),
    // scans per establishment
    prisma.transaction.groupBy({
      by: ["establishmentId"],
      where: {
        establishmentId: { in: estIds },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] as never[] },
      },
      _count: { id: true },
    }),
    // rewards per establishment (via card.program.establishment)
    prisma.rewardClaim.findMany({
      where: { card: { programId: { in: programIds } } },
      select: {
        card: {
          select: {
            program: { select: { establishmentId: true } },
          },
        },
      },
    }),
  ]);

  // Map programId -> establishmentId
  const programEstMap: Record<string, string> = {};
  for (const prog of await prisma.loyaltyProgram.findMany({
    where: { id: { in: programIds }, establishmentId: { not: null } },
    select: { id: true, establishmentId: true },
  })) {
    if (prog.establishmentId) programEstMap[prog.id] = prog.establishmentId;
  }

  // Build client counts per establishment
  const clientCountByEst: Record<string, number> = {};
  for (const row of cardsByEst) {
    const estId = programEstMap[row.programId];
    if (estId) {
      clientCountByEst[estId] = (clientCountByEst[estId] ?? 0) + row._count.id;
    }
  }

  // Scan counts per establishment
  const scanCountByEst: Record<string, number> = {};
  for (const row of scansByEst) {
    if (row.establishmentId) {
      scanCountByEst[row.establishmentId] = row._count.id;
    }
  }

  // Reward counts per establishment
  const rewardCountByEst: Record<string, number> = {};
  for (const rc of rewardsByEst) {
    const estId = rc.card?.program?.establishmentId;
    if (estId) {
      rewardCountByEst[estId] = (rewardCountByEst[estId] ?? 0) + 1;
    }
  }

  const establishments: EstablishmentStat[] = establishmentList.map((e) => ({
    id: e.id,
    name: e.name,
    clientCount: clientCountByEst[e.id] ?? 0,
    scanCount: scanCountByEst[e.id] ?? 0,
    rewardCount: rewardCountByEst[e.id] ?? 0,
  }));

  result.establishments = establishments;

  return NextResponse.json(result);
}
