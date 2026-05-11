import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/merchants/stats/insights
 *
 * Analytics avancées :
 * 1. Comparaison période (30j actuels vs 30j précédents) + delta %
 * 2. Heatmap horaire (7 jours × 24 heures sur les 30 derniers jours)
 * 3. Cohort retention (8 semaines, retention W+1..W+6)
 *
 * Réservé aux plans payants (Essentiel+) — FREE n'a pas accès.
 */

export interface InsightsResponse {
  /** Tier d'accès appliqué (FREE renvoie comparison vide). */
  available: boolean;

  /** Comparaison KPI courante vs période précédente. */
  comparison: {
    period: { from: string; to: string; days: number };
    previousPeriod: { from: string; to: string };
    metrics: {
      [key in
        | "newClients"
        | "scans"
        | "rewards"
        | "activeClients"
        | "avgScansPerClient"]: {
        current: number;
        previous: number;
        deltaPct: number | null; // null si previous = 0
      };
    };
  };

  /** Heatmap horaire des scans (30 derniers jours). */
  heatmap: {
    day: number; // 0 = dimanche, 6 = samedi (Date.getDay())
    hour: number; // 0-23
    count: number;
  }[];

  /** Cohort retention : 8 semaines, taux de rétention W+1..W+6. */
  cohorts: {
    cohortWeek: string; // ex: "2026-W18"
    weekStart: string; // ISO date
    signups: number;
    /** retentionN[i] = nb de clients de cette cohort avec au moins 1 scan en semaine N+i+1 */
    retention: number[]; // length max 6
  }[];
}

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
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = dim
  // Démarre les semaines le lundi (ISO 8601) → jour 1
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function isoWeekLabel(d: Date): string {
  // YYYY-Www : on calcule la semaine ISO
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // lun=0
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: merchantId },
    select: { plan: true },
  });
  const plan = user?.plan ?? "FREE";
  const isPaid = plan !== "FREE";

  // Programmes du commerçant
  const programs = await prisma.loyaltyProgram.findMany({
    where: { merchantId },
    select: { id: true },
  });
  const programIds = programs.map((p) => p.id);

  const now = new Date();
  const today = startOfDay(now);

  /* ─── 1. Comparison period (30j actuels vs 30j précédents) ─── */
  const periodDays = 30;
  const currentStart = addDays(today, -(periodDays - 1));
  const prevStart = addDays(currentStart, -periodDays);
  const prevEnd = addDays(currentStart, -1);

  const [
    curNewClients,
    prevNewClients,
    curScans,
    prevScans,
    curRewards,
    prevRewards,
    curActiveCards,
    prevActiveCards,
  ] = programIds.length === 0
    ? [0, 0, 0, 0, 0, 0, 0, 0]
    : await Promise.all([
        prisma.loyaltyCard.count({
          where: { programId: { in: programIds }, createdAt: { gte: currentStart } },
        }),
        prisma.loyaltyCard.count({
          where: {
            programId: { in: programIds },
            createdAt: { gte: prevStart, lte: prevEnd },
          },
        }),
        prisma.transaction.count({
          where: {
            card: { programId: { in: programIds } },
            type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] as never[] },
            createdAt: { gte: currentStart },
          },
        }),
        prisma.transaction.count({
          where: {
            card: { programId: { in: programIds } },
            type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] as never[] },
            createdAt: { gte: prevStart, lte: prevEnd },
          },
        }),
        prisma.rewardClaim.count({
          where: {
            card: { programId: { in: programIds } },
            claimedAt: { gte: currentStart },
          },
        }),
        prisma.rewardClaim.count({
          where: {
            card: { programId: { in: programIds } },
            claimedAt: { gte: prevStart, lte: prevEnd },
          },
        }),
        prisma.loyaltyCard.count({
          where: {
            programId: { in: programIds },
            transactions: { some: { createdAt: { gte: currentStart } } },
          },
        }),
        prisma.loyaltyCard.count({
          where: {
            programId: { in: programIds },
            transactions: {
              some: { createdAt: { gte: prevStart, lte: prevEnd } },
            },
          },
        }),
      ]);

  const curAvgScansPerClient =
    curActiveCards > 0
      ? Math.round((curScans / curActiveCards) * 10) / 10
      : 0;
  const prevAvgScansPerClient =
    prevActiveCards > 0
      ? Math.round((prevScans / prevActiveCards) * 10) / 10
      : 0;

  const comparison: InsightsResponse["comparison"] = {
    period: {
      from: currentStart.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
      days: periodDays,
    },
    previousPeriod: {
      from: prevStart.toISOString().slice(0, 10),
      to: prevEnd.toISOString().slice(0, 10),
    },
    metrics: {
      newClients: {
        current: curNewClients,
        previous: prevNewClients,
        deltaPct: deltaPct(curNewClients, prevNewClients),
      },
      scans: {
        current: curScans,
        previous: prevScans,
        deltaPct: deltaPct(curScans, prevScans),
      },
      rewards: {
        current: curRewards,
        previous: prevRewards,
        deltaPct: deltaPct(curRewards, prevRewards),
      },
      activeClients: {
        current: curActiveCards,
        previous: prevActiveCards,
        deltaPct: deltaPct(curActiveCards, prevActiveCards),
      },
      avgScansPerClient: {
        current: curAvgScansPerClient,
        previous: prevAvgScansPerClient,
        deltaPct: deltaPct(curAvgScansPerClient, prevAvgScansPerClient),
      },
    },
  };

  // Pour FREE, on s'arrête là — pas de heatmap/cohort
  if (!isPaid || programIds.length === 0) {
    return NextResponse.json({
      available: false,
      comparison,
      heatmap: [],
      cohorts: [],
    } satisfies InsightsResponse);
  }

  /* ─── 2. Heatmap horaire (30 derniers jours) ─── */
  const heatmapTxs = await prisma.transaction.findMany({
    where: {
      card: { programId: { in: programIds } },
      type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] as never[] },
      createdAt: { gte: currentStart },
    },
    select: { createdAt: true },
  });

  // Bucket 7 days x 24 hours
  const heatmapMap = new Map<string, number>();
  for (const tx of heatmapTxs) {
    const d = tx.createdAt;
    const key = `${d.getDay()}-${d.getHours()}`;
    heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
  }
  const heatmap: InsightsResponse["heatmap"] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmap.push({
        day,
        hour,
        count: heatmapMap.get(`${day}-${hour}`) || 0,
      });
    }
  }

  /* ─── 3. Cohorts (8 semaines, retention W+1..W+6) ─── */
  const cohortWindowWeeks = 8;
  const retentionWeeksMax = 6;

  // Cohorts : on prend les cards créées dans les 8 semaines passées
  const cohortStart = startOfWeek(addDays(today, -cohortWindowWeeks * 7));

  const cohortCards = await prisma.loyaltyCard.findMany({
    where: {
      programId: { in: programIds },
      createdAt: { gte: cohortStart },
    },
    select: {
      id: true,
      createdAt: true,
      transactions: {
        where: {
          type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] as never[] },
        },
        select: { createdAt: true },
      },
    },
  });

  // Group by cohort week
  const cohortGroups = new Map<
    string,
    { weekStart: Date; cards: typeof cohortCards }
  >();
  for (const card of cohortCards) {
    const wStart = startOfWeek(card.createdAt);
    const key = wStart.toISOString();
    if (!cohortGroups.has(key)) {
      cohortGroups.set(key, { weekStart: wStart, cards: [] });
    }
    cohortGroups.get(key)!.cards.push(card);
  }

  const cohorts: InsightsResponse["cohorts"] = [];
  const sortedKeys = [...cohortGroups.keys()].sort();
  for (const key of sortedKeys) {
    const group = cohortGroups.get(key)!;
    const weekStart = group.weekStart;
    const signups = group.cards.length;

    const retention: number[] = [];
    for (let w = 1; w <= retentionWeeksMax; w++) {
      const wFrom = addDays(weekStart, w * 7);
      const wTo = addDays(weekStart, (w + 1) * 7 - 1);
      // Future weeks not yet elapsed → on s'arrête
      if (wFrom > today) break;

      const activeInWeek = group.cards.filter((card) =>
        card.transactions.some((tx) => tx.createdAt >= wFrom && tx.createdAt <= wTo)
      ).length;
      retention.push(activeInWeek);
    }

    cohorts.push({
      cohortWeek: isoWeekLabel(weekStart),
      weekStart: weekStart.toISOString().slice(0, 10),
      signups,
      retention,
    });
  }

  return NextResponse.json({
    available: true,
    comparison,
    heatmap,
    cohorts,
  } satisfies InsightsResponse);
}
