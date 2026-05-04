import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits, type ProgramType } from "@/lib/plan-limits";

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

  // Vérifier les limites du plan
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  const limits = getPlanLimits(user?.plan);

  // Limite du nombre de programmes
  if (limits.maxPrograms !== null) {
    const existingCount = await prisma.loyaltyProgram.count({
      where: { merchantId: session.user.id },
    });
    if (existingCount >= limits.maxPrograms) {
      return NextResponse.json(
        {
          error: `Votre plan est limité à ${limits.maxPrograms} programme${limits.maxPrograms > 1 ? "s" : ""}. Passez à un plan supérieur pour en créer plus.`,
        },
        { status: 403 }
      );
    }
  }

  // Type de programme autorisé par le plan
  if (!limits.allowedProgramTypes.includes(type as ProgramType)) {
    return NextResponse.json(
      {
        error: `Le type "${type}" n'est pas disponible dans votre plan. Le plan FREE n'autorise que les cartes à tampons. Passez à un plan supérieur pour débloquer Points, Cashback et Hybride.`,
      },
      { status: 403 }
    );
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
