import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LIST_LIMIT = 100;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const merchant = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!merchant) {
    return NextResponse.json({ error: "Commerçant introuvable" }, { status: 404 });
  }
  if (merchant.role !== "USER") {
    return NextResponse.json(
      { error: "Cette vue est réservée aux comptes commerçants" },
      { status: 400 }
    );
  }

  const programs = await prisma.loyaltyProgram.findMany({
    where: { merchantId: id },
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      createdAt: true,
      establishment: { select: { id: true, name: true } },
      _count: {
        select: { cards: true, campaigns: true, rewards: true },
      },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
  const programIds = programs.map((program) => program.id);

  if (programIds.length === 0) {
    return NextResponse.json({
      merchant,
      generatedAt: new Date(),
      limits: { cards: LIST_LIMIT, clients: LIST_LIMIT, campaigns: LIST_LIMIT },
      summary: emptySummary(),
      programs,
      cards: [],
      clients: [],
      campaigns: [],
    });
  }

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  const campaignIdsPromise = prisma.notificationCampaign.findMany({
    where: { merchantId: id },
    select: { id: true },
  });

  const [
    clientCount,
    cardCount,
    walletCardCount,
    cardTotals,
    transactionCount,
    rewardCount,
    campaignCount,
    cardsLast30,
    transactionsLast30,
    campaignsLast30,
    cards,
    clients,
    campaigns,
    campaignIdRows,
  ] = await Promise.all([
    prisma.client.count({
      where: { cards: { some: { programId: { in: programIds } } } },
    }),
    prisma.loyaltyCard.count({ where: { programId: { in: programIds } } }),
    prisma.loyaltyCard.count({
      where: {
        programId: { in: programIds },
        registrations: { some: {} },
      },
    }),
    prisma.loyaltyCard.aggregate({
      where: { programId: { in: programIds } },
      _sum: { totalVisits: true, totalSpent: true },
    }),
    prisma.transaction.count({
      where: {
        card: { programId: { in: programIds } },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] },
      },
    }),
    prisma.rewardClaim.count({
      where: { card: { programId: { in: programIds } } },
    }),
    prisma.notificationCampaign.count({ where: { merchantId: id } }),
    prisma.loyaltyCard.count({
      where: { programId: { in: programIds }, createdAt: { gte: since30 } },
    }),
    prisma.transaction.count({
      where: {
        card: { programId: { in: programIds } },
        createdAt: { gte: since30 },
        type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] },
      },
    }),
    prisma.notificationCampaign.count({
      where: { merchantId: id, createdAt: { gte: since30 } },
    }),
    prisma.loyaltyCard.findMany({
      where: { programId: { in: programIds } },
      select: {
        id: true,
        serialNumber: true,
        status: true,
        currentStamps: true,
        currentPoints: true,
        cashbackBalance: true,
        totalVisits: true,
        totalSpent: true,
        lastVisitAt: true,
        lastMessageAt: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        program: { select: { id: true, name: true, type: true } },
        registrations: { select: { platform: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: LIST_LIMIT,
    }),
    prisma.client.findMany({
      where: { cards: { some: { programId: { in: programIds } } } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        birthDate: true,
        preferredLang: true,
        createdAt: true,
        cards: {
          where: { programId: { in: programIds } },
          select: {
            id: true,
            status: true,
            totalVisits: true,
            totalSpent: true,
            lastVisitAt: true,
            program: { select: { id: true, name: true } },
            registrations: { select: { platform: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
    }),
    prisma.notificationCampaign.findMany({
      where: { merchantId: id },
      select: {
        id: true,
        name: true,
        message: true,
        status: true,
        triggerType: true,
        targetSegment: true,
        sentCount: true,
        scheduledAt: true,
        sentAt: true,
        createdAt: true,
        program: { select: { id: true, name: true } },
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
    }),
    campaignIdsPromise,
  ]);

  const allCampaignIds = campaignIdRows.map((campaign) => campaign.id);
  const [deliveredNotifications, deliveryGroups] =
    allCampaignIds.length === 0
      ? [0, []]
      : await Promise.all([
          prisma.notificationLog.count({
            where: {
              campaignId: { in: allCampaignIds },
              delivered: true,
            },
          }),
          prisma.notificationLog.groupBy({
            by: ["campaignId", "walletStatus"],
            where: { campaignId: { in: campaigns.map((campaign) => campaign.id) } },
            _count: { _all: true },
          }),
        ]);

  const campaignDelivery = new Map<string, Record<string, number>>();
  for (const group of deliveryGroups) {
    if (!group.campaignId) continue;
    const statuses = campaignDelivery.get(group.campaignId) ?? {};
    statuses[group.walletStatus] = group._count._all;
    campaignDelivery.set(group.campaignId, statuses);
  }

  const notificationTotal = allCampaignIds.length
    ? await prisma.notificationLog.count({
        where: { campaignId: { in: allCampaignIds } },
      })
    : 0;

  return NextResponse.json({
    merchant,
    generatedAt: new Date(),
    limits: { cards: LIST_LIMIT, clients: LIST_LIMIT, campaigns: LIST_LIMIT },
    summary: {
      clientCount,
      cardCount,
      walletCardCount,
      totalVisits: cardTotals._sum.totalVisits ?? 0,
      totalSpent: cardTotals._sum.totalSpent ?? 0,
      transactionCount,
      rewardCount,
      campaignCount,
      deliveredNotifications,
      notificationTotal,
      cardsLast30,
      transactionsLast30,
      campaignsLast30,
    },
    programs,
    cards,
    clients,
    campaigns: campaigns.map((campaign) => ({
      ...campaign,
      delivery: campaignDelivery.get(campaign.id) ?? {},
    })),
  });
}

function emptySummary() {
  return {
    clientCount: 0,
    cardCount: 0,
    walletCardCount: 0,
    totalVisits: 0,
    totalSpent: 0,
    transactionCount: 0,
    rewardCount: 0,
    campaignCount: 0,
    deliveredNotifications: 0,
    notificationTotal: 0,
    cardsLast30: 0,
    transactionsLast30: 0,
    campaignsLast30: 0,
  };
}
