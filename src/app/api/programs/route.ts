import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits, type ProgramType } from "@/lib/plan-limits";
import { parseJsonBody } from "@/lib/api/validation";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import type { Prisma } from "@/generated/prisma/client";
import type { RewardType } from "@/generated/prisma/enums";

const jsonObject = z.record(z.string(), z.unknown());

const createProgramSchema = z
  .object({
    name: z.string().trim().min(1, "Nom du programme requis").max(120, "Nom du programme trop long"),
    type: z.enum(["STAMPS", "POINTS", "CASHBACK"]),
    config: jsonObject,
    cardDesign: jsonObject,
    establishmentId: z.string().trim().min(1).optional().nullable(),
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
  })
  // Validation : nombre de tampons entre 1 et 20 pour STAMPS.
  .refine(
    (data) => {
      if (data.type !== "STAMPS") return true;
      const max = (data.config as Record<string, unknown>).maxStamps;
      return (
        typeof max === "number" &&
        Number.isInteger(max) &&
        max >= 1 &&
        max <= 20
      );
    },
    {
      message: "Le nombre de tampons doit être un entier entre 1 et 20",
      path: ["config", "maxStamps"],
    }
  )
  // Validation : seuil de points entre 10 et 10'000 pour POINTS.
  // (Le client envoie config.tiers[0].points qui sert de seuil principal.)
  // Exception : si config.unlimited === true, le programme accumule sans seuil
  // — on saute alors cette validation.
  .refine(
    (data) => {
      if (data.type !== "POINTS") return true;
      const cfg = data.config as Record<string, unknown>;
      if (cfg.unlimited === true) return true;
      const tiers = cfg.tiers as { points?: unknown }[] | undefined;
      const target = tiers?.[0]?.points;
      return (
        typeof target === "number" &&
        Number.isInteger(target) &&
        target >= 10 &&
        target <= 10_000
      );
    },
    {
      message: "Le seuil de points doit être un entier entre 10 et 10'000",
      path: ["config", "tiers", 0, "points"],
    }
  );

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
  } = parsed.data;

  // Vérifier les limites du plan
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  const limits = getPlanLimits(user?.plan);

  // Limite du nombre de programmes actifs
  if (limits.maxPrograms !== null) {
    const existingCount = await prisma.loyaltyProgram.count({
      where: { merchantId: session.user.id, isActive: true },
    });
    if (existingCount >= limits.maxPrograms) {
      const isFree = (user?.plan ?? "FREE") === "FREE";
      const error = isFree
        ? `Votre plan Gratuit est limité à ${limits.maxPrograms} programme actif. Passez à un plan payant pour en créer plus.`
        : `Vous avez atteint la limite de ${limits.maxPrograms} programmes actifs.\n\nPour créer un nouveau programme, archivez un programme existant en le rendant inactif, ou contactez notre support afin de débloquer la limite :\nsupport@fidlify.com`;
      return NextResponse.json({ error }, { status: 403 });
    }
  }

  // Type de programme autorisé par le plan
  if (!limits.allowedProgramTypes.includes(type as ProgramType)) {
    return NextResponse.json(
      {
        error: `Le type "${type}" n'est pas disponible dans votre plan. Le plan FREE n'autorise que les cartes à tampons. Passez à un plan supérieur pour débloquer Points et Cashback.`,
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

  void trackServerEvent(session.user.id, "program.created", {
    programId: program.id,
    type,
    rewardsCount: program.rewards.length,
    hasEstablishment: !!establishmentId,
  });

  return NextResponse.json(program, { status: 201 });
}
