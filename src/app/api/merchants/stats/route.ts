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
    select: { id: true },
  });

  const programIds = programs.map((p) => p.id);

  if (programIds.length === 0) {
    return NextResponse.json({
      totalClients: 0,
      activeCards: 0,
      totalVisits: 0,
      returnRate: 0,
      recentClients: [],
    });
  }

  const [totalCards, activeCards, totalVisitsAgg, recentCards] =
    await Promise.all([
      prisma.loyaltyCard.count({
        where: { programId: { in: programIds } },
      }),
      prisma.loyaltyCard.count({
        where: { programId: { in: programIds }, status: "ACTIVE" },
      }),
      prisma.loyaltyCard.aggregate({
        where: { programId: { in: programIds } },
        _sum: { totalVisits: true },
      }),
      prisma.loyaltyCard.findMany({
        where: { programId: { in: programIds } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          client: {
            select: { firstName: true, email: true },
          },
        },
      }),
    ]);

  const cardsWithMultipleVisits = await prisma.loyaltyCard.count({
    where: {
      programId: { in: programIds },
      totalVisits: { gte: 2 },
    },
  });

  const returnRate =
    totalCards > 0
      ? Math.round((cardsWithMultipleVisits / totalCards) * 100)
      : 0;

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
    recentClients,
  });
}
