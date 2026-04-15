import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const programs = await prisma.loyaltyProgram.findMany({
    where: { merchantId: session.user.id },
    include: {
      rewards: true,
      establishment: true,
      _count: { select: { cards: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(programs);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const {
    name,
    type,
    config,
    cardDesign,
    establishmentId,
    rewards,
    googleReviewEnabled,
    googleReviewBonus,
    googleReviewMinVisits,
  } = body;

  if (!name || !type || !config || !cardDesign) {
    return NextResponse.json(
      { error: "Champs requis manquants" },
      { status: 400 }
    );
  }

  // Vérifier la limite du plan gratuit (1 programme)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (user?.plan === "FREE") {
    const existingCount = await prisma.loyaltyProgram.count({
      where: { merchantId: session.user.id },
    });
    if (existingCount >= 1) {
      return NextResponse.json(
        { error: "Le plan gratuit est limité à 1 programme. Passez au plan Pro." },
        { status: 403 }
      );
    }
  }

  const program = await prisma.loyaltyProgram.create({
    data: {
      merchantId: session.user.id,
      establishmentId: establishmentId || undefined,
      name,
      type,
      config,
      cardDesign,
      googleReviewEnabled: googleReviewEnabled || false,
      googleReviewBonus: googleReviewBonus || 0,
      googleReviewMinVisits: googleReviewMinVisits || 3,
      rewards: rewards?.length
        ? {
            create: rewards.map(
              (r: { name: string; description?: string; threshold: number; rewardType: string; rewardValue?: number }) => ({
                name: r.name,
                description: r.description,
                threshold: r.threshold,
                rewardType: r.rewardType,
                rewardValue: r.rewardValue,
              })
            ),
          }
        : undefined,
    },
    include: { rewards: true },
  });

  return NextResponse.json(program, { status: 201 });
}
