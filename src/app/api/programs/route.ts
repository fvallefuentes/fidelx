import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits, type ProgramType } from "@/lib/plan-limits";
import { parseJsonBody } from "@/lib/api/validation";
import type { Prisma } from "@/generated/prisma/client";
import type { RewardType } from "@/generated/prisma/enums";

const jsonObject = z.record(z.string(), z.unknown());

const createProgramSchema = z.object({
  name: z.string().trim().min(1, "Nom du programme requis").max(120, "Nom du programme trop long"),
  type: z.enum(["STAMPS", "POINTS", "CASHBACK", "HYBRID"]),
  config: jsonObject,
  cardDesign: jsonObject,
  establishmentId: z.string().trim().min(1).optional().nullable(),
  googleReviewEnabled: z.boolean().optional().default(false),
  googleReviewBonus: z.coerce.number().int().min(0).max(100).optional().default(0),
  googleReviewMinVisits: z.coerce.number().int().min(1).max(100).optional().default(3),
  rewards: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Nom de récompense requis").max(120, "Nom de récompense trop long"),
        description: z.string().trim().max(500, "Description trop longue").optional(),
        threshold: z.coerce.number().int().positive("Seuil de récompense invalide"),
        rewardType: z.enum(["FREE_ITEM", "DISCOUNT_CHF", "DISCOUNT_PCT", "CUSTOM"]),
        rewardValue: z.coerce.number().min(0).optional(),
      })
    )
    .optional(),
});

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

  const parsed = await parseJsonBody(req, createProgramSchema);
  if (!parsed.ok) return parsed.response;
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
  } = parsed.data;

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
      config: config as Prisma.InputJsonValue,
      cardDesign: cardDesign as Prisma.InputJsonValue,
      googleReviewEnabled,
      googleReviewBonus,
      googleReviewMinVisits,
      rewards: rewards?.length
        ? {
            create: rewards.map(
              (r) => ({
                name: r.name,
                description: r.description,
                threshold: r.threshold,
                rewardType: r.rewardType as RewardType,
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
