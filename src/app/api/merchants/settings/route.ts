import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits, getPeriodStart, countStampsThisMonth } from "@/lib/plan-limits";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      language: true,
      currency: true,
      plan: true,
      createdAt: true,
      stripeCurrentPeriodStart: true,
      stripeCurrentPeriodEnd: true,
      establishments: {
        select: { id: true, name: true, address: true, phone: true, googlePlaceId: true },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const limits = getPlanLimits(user.plan);
  const periodStart = getPeriodStart(user);

  const [programCount, activeCardCount, campaignCount, stampsCount] = await Promise.all([
    prisma.loyaltyProgram.count({ where: { merchantId: session.user.id } }),
    prisma.loyaltyCard.count({
      where: { program: { merchantId: session.user.id }, status: { in: ["ACTIVE", "REWARD_PENDING"] } },
    }),
    prisma.notificationCampaign.count({
      where: { merchantId: session.user.id, createdAt: { gte: periodStart } },
    }),
    countStampsThisMonth(session.user.id, periodStart),
  ]);

  return NextResponse.json({
    ...user,
    usage: {
      periodStart,
      programs:    { current: programCount,   max: limits.maxPrograms },
      activeCards: { current: activeCardCount, max: limits.maxActiveCards },
      campaigns:   { current: campaignCount,   max: limits.maxCampaignsPerMonth },
      stamps:      { current: stampsCount,     max: limits.maxStampsPerMonth },
    },
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { name, phone, language, currency } = await req.json();

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name || undefined,
      phone: phone || undefined,
      language: language || undefined,
      currency: currency || undefined,
    },
  });

  return NextResponse.json({ success: true, user });
}
