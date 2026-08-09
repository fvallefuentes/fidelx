import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAllCardsInProgram, notifyCardsInProgram } from "@/lib/wallet/push";
import { getEffectiveMaxCampaignsPerMonth, getPeriodStart, resolvePlanState } from "@/lib/plan-limits";
import { parseJsonBody } from "@/lib/api/validation";
import { calculateCampaignImpact } from "@/lib/campaign-impact";
import { MAX_BIRTHDAY_DAYS_BEFORE } from "@/lib/birthday-campaign";
import {
  activateProgramCardOffer,
  MAX_CARD_OFFER_DAYS,
  offerIntervalsOverlap,
} from "@/lib/card-offers";
import type { Prisma } from "@/generated/prisma/client";

const createCampaignSchema = z.object({
  programId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(1, "Nom de campagne requis").max(120, "Nom de campagne trop long"),
  message: z.string().trim().min(1, "Message requis").max(350, "Message trop long"),
  reviewConfirmed: z.literal(true, {
    error: "Validez l'étape de vérification avant de créer la campagne.",
  }),
  triggerType: z.enum([
    "IMMEDIATE",
    "SCHEDULED",
    "GEOFENCE",
    "INACTIVITY",
    "POST_STAMP",
    "MILESTONE",
    "BIRTHDAY",
  ]),
  triggerConfig: z
    .object({
      sendAt: z.string().datetime().optional(),
      sendAtLocal: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "Date programmée invalide")
        .optional(),
      timezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
      daysBefore: z
        .number()
        .int()
        .min(0)
        .max(MAX_BIRTHDAY_DAYS_BEFORE)
        .optional(),
      // Titre de la notif : obligatoire. Affiché en gras sur le lockscreen.
      notifTitle: z
        .string()
        .trim()
        .min(1, "Titre de la notification requis")
        .max(80, "Titre trop long (80 caractères max)"),
      notifLogo: z.string().max(750_000, "Logo de notification trop lourd").optional(),
      notifBgColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, "Couleur de notification invalide")
        .optional(),
      remainingBeforeReward: z.coerce.number().int().min(1).max(50).optional(),
      stampsReached: z.coerce.number().min(1).max(1_000_000).optional(),
    })
    .catchall(z.unknown())
    .default({ notifTitle: "" }),
  targetSegment: z.enum(["ALL", "ACTIVE", "DORMANT", "NEW", "VIP"]).optional().default("ALL"),
  showOnNewCards: z.boolean().optional().default(false),
  offerEndsAt: z.string().datetime().optional().nullable(),
  replaceActiveOffer: z.boolean().optional().default(false),
});

const updateScheduledCampaignSchema = z.object({
  id: z.string().trim().min(1, "Campagne requise"),
  programId: z.string().trim().min(1, "Programme requis"),
  name: z.string().trim().min(1, "Nom de campagne requis").max(120),
  message: z.string().trim().min(1, "Message requis").max(350),
  reviewConfirmed: z.literal(true, {
    error: "Confirmez explicitement la campagne avant de l'enregistrer.",
  }),
  triggerType: z.literal("SCHEDULED"),
  triggerConfig: createCampaignSchema.shape.triggerConfig,
  targetSegment: z.enum(["ALL", "ACTIVE", "DORMANT", "NEW", "VIP"]),
  showOnNewCards: createCampaignSchema.shape.showOnNewCards,
  offerEndsAt: createCampaignSchema.shape.offerEndsAt,
  replaceActiveOffer: createCampaignSchema.shape.replaceActiveOffer,
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const campaigns = await prisma.notificationCampaign.findMany({
    where: { merchantId: session.user.id },
    include: {
      program: { select: { name: true } },
      _count: { select: { logs: true } },
      logs: {
        where: { delivered: true, deliveredAt: { not: null } },
        select: { cardId: true, deliveredAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const visibleCampaigns = campaigns.filter(
    (campaign) => !isAutomationRule(campaign.triggerConfig)
  );

  const campaignsWithImpact = await Promise.all(
    visibleCampaigns.map(async (campaign) => {
      const impact = await calculateCampaignImpact(campaign.logs);
      const rest = Object.fromEntries(
        Object.entries(campaign).filter(([key]) => key !== "logs")
      );
      return { ...rest, impact };
    })
  );

  return NextResponse.json(campaignsWithImpact);
}

function isAutomationRule(config: unknown) {
  return Boolean((config as { automationRule?: boolean } | null)?.automationRule);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, createCampaignSchema);
  if (!parsed.ok) return parsed.response;
  const {
    programId,
    name,
    message,
    reviewConfirmed,
    triggerType,
    triggerConfig,
    targetSegment,
    showOnNewCards,
    offerEndsAt: offerEndsAtInput,
    replaceActiveOffer,
  } = parsed.data;

  if (!reviewConfirmed) {
    return NextResponse.json(
      { error: "Validez l'étape de vérification avant de créer la campagne." },
      { status: 400 }
    );
  }

  // Vérification limites du plan
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, trialEndsAt: true, manualPlanUntil: true, testMode: true, createdAt: true, stripeCurrentPeriodStart: true },
  });
  const limits: { maxCampaignsPerMonth: number | null } = { maxCampaignsPerMonth: null };
  // Un compte en essai a plan=FREE : c'est l'etat effectif qui compte.
  const planState = resolvePlanState(user);
  const isFree = planState === "FREE" || planState === "DORMANT";

  if (isFree && triggerType !== "IMMEDIATE") {
    return NextResponse.json({ error: "Le plan Gratuit ne permet que l'envoi immédiat." }, { status: 403 });
  }

  if (triggerType === "GEOFENCE") {
    return NextResponse.json(
      {
        error:
          "La proximite Wallet ne declenche pas encore d'envoi automatique. Ajoutez une position a l'etablissement pour afficher la carte Wallet a proximite.",
      },
      { status: 400 }
    );
  }

  const globalPeriodStart = getPeriodStart(user!);
  const globalMaxCampaignsPerMonth = getEffectiveMaxCampaignsPerMonth(user);
  const visibleCampaignsThisPeriod = await prisma.notificationCampaign.count({
    where: {
      merchantId: session.user.id,
      createdAt: { gte: globalPeriodStart },
      NOT: { triggerConfig: { path: ["automationRule"], equals: true } },
    },
  });
  if (globalMaxCampaignsPerMonth !== null && visibleCampaignsThisPeriod >= globalMaxCampaignsPerMonth) {
    return NextResponse.json(
      { error: `Limite atteinte : ${globalMaxCampaignsPerMonth} campagnes par mois sur votre compte.` },
      { status: 403 }
    );
  }

  if (limits.maxCampaignsPerMonth !== null) {
    const periodStart = getPeriodStart(user!);
    const campaignsThisPeriod = await prisma.notificationCampaign.count({
      where: { merchantId: session.user.id, createdAt: { gte: periodStart } },
    });
    if (campaignsThisPeriod >= limits.maxCampaignsPerMonth) {
      return NextResponse.json(
        { error: `Limite atteinte : ${limits.maxCampaignsPerMonth} campagnes par période sur votre plan.` },
        { status: 403 }
      );
    }
  }

  // Vérifier que le programme appartient au commerçant
  if (programId) {
    const program = await prisma.loyaltyProgram.findFirst({
      where: { id: programId, merchantId: session.user.id },
    });
    if (!program) {
      return NextResponse.json(
        { error: "Programme introuvable" },
        { status: 404 }
      );
    }
  }

  const scheduledAt = resolveScheduledAt(triggerType, triggerConfig);
  if (
    triggerType === "SCHEDULED" &&
    (!scheduledAt || scheduledAt.getTime() <= Date.now())
  ) {
    return NextResponse.json(
      { error: "Choisissez une date et une heure futures." },
      { status: 400 }
    );
  }

  const offerPreparation = await prepareCardOffer({
    merchantId: session.user.id,
    programId: programId || null,
    triggerType,
    targetSegment,
    showOnNewCards,
    offerEndsAtInput,
    replaceActiveOffer,
    hasExactTargets: hasExactTargetCardIds(triggerConfig),
    activationAt: scheduledAt || new Date(),
  });
  if ("response" in offerPreparation) return offerPreparation.response;

  const campaign = await prisma.notificationCampaign.create({
    data: {
      merchantId: session.user.id,
      programId: programId || undefined,
      name,
      message,
      triggerType,
      triggerConfig: triggerConfig as Prisma.InputJsonValue,
      targetSegment,
      status: triggerType === "IMMEDIATE" ? "SENT" : "SCHEDULED",
      scheduledAt,
      showOnNewCards,
      offerEndsAt: offerPreparation.offerEndsAt,
    },
  });

  if (
    programId &&
    (triggerType === "POST_STAMP" || triggerType === "MILESTONE")
  ) {
    await prisma.notificationCampaign.updateMany({
      where: {
        id: { not: campaign.id },
        merchantId: session.user.id,
        programId,
        triggerType,
        status: "SCHEDULED",
      },
      data: { status: "CANCELLED" },
    });
  }

  // Si envoi immédiat, envoyer maintenant
  if (triggerType === "IMMEDIATE" && programId) {
    const notifTitle = triggerConfig.notifTitle || name;
    if (showOnNewCards && offerPreparation.offerEndsAt) {
      await activateProgramCardOffer({
        merchantId: session.user.id,
        programId,
        campaignId: campaign.id,
        title: notifTitle,
        message,
        startsAt: new Date(),
        endsAt: offerPreparation.offerEndsAt,
      });
    }
    const rawTargetCardIds = (triggerConfig as { targetCardIds?: unknown }).targetCardIds;
    const targetCardIds = Array.isArray(rawTargetCardIds)
      ? rawTargetCardIds.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
    const result =
      targetCardIds.length > 0
        ? await notifyCardsInProgram(
            programId,
            targetCardIds,
            message,
            notifTitle,
            7,
            campaign.id,
            { offerEndsAt: offerPreparation.offerEndsAt }
          )
        : await notifyAllCardsInProgram(
            programId,
            message,
            targetSegment,
            notifTitle,
            campaign.id,
            { offerEndsAt: offerPreparation.offerEndsAt }
          );

    await prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount: result.sent,
        sentAt: new Date(),
      },
    });

    return NextResponse.json(
      { ...campaign, sentCount: result.sent },
      { status: 201 }
    );
  }

  return NextResponse.json(campaign, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, updateScheduledCampaignSchema);
  if (!parsed.ok) return parsed.response;
  const {
    id,
    programId,
    name,
    message,
    triggerType,
    triggerConfig,
    targetSegment,
    showOnNewCards,
    offerEndsAt: offerEndsAtInput,
    replaceActiveOffer,
  } = parsed.data;

  const campaign = await prisma.notificationCampaign.findFirst({
    where: { id, merchantId: session.user.id },
    include: { _count: { select: { logs: true } } },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }
  if (
    campaign.status !== "SCHEDULED" ||
    campaign.triggerType !== "SCHEDULED" ||
    campaign.sentAt ||
    campaign._count.logs > 0
  ) {
    return NextResponse.json(
      { error: "Cette campagne a déjà été prise en charge et ne peut plus être modifiée." },
      { status: 409 }
    );
  }

  const program = await prisma.loyaltyProgram.findFirst({
    where: { id: programId, merchantId: session.user.id },
    select: { id: true },
  });
  if (!program) {
    return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });
  }

  const scheduledAt = resolveScheduledAt(triggerType, triggerConfig);
  if (!scheduledAt || scheduledAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Choisissez une date et une heure futures." },
      { status: 400 }
    );
  }

  const offerPreparation = await prepareCardOffer({
    merchantId: session.user.id,
    programId,
    campaignId: id,
    triggerType,
    targetSegment,
    showOnNewCards,
    offerEndsAtInput,
    replaceActiveOffer,
    hasExactTargets: hasExactTargetCardIds(triggerConfig),
    activationAt: scheduledAt,
  });
  if ("response" in offerPreparation) return offerPreparation.response;

  const updated = await prisma.notificationCampaign.updateMany({
    where: {
      id,
      merchantId: session.user.id,
      status: "SCHEDULED",
      sentAt: null,
    },
    data: {
      programId,
      name,
      message,
      triggerConfig: triggerConfig as Prisma.InputJsonValue,
      targetSegment,
      scheduledAt,
      showOnNewCards,
      offerEndsAt: offerPreparation.offerEndsAt,
    },
  });
  if (updated.count === 0) {
    return NextResponse.json(
      { error: "La campagne vient d'être prise en charge et ne peut plus être modifiée." },
      { status: 409 }
    );
  }

  const savedCampaign = await prisma.notificationCampaign.findUnique({
    where: { id },
    include: { program: { select: { name: true } }, _count: { select: { logs: true } } },
  });
  return NextResponse.json(savedCampaign);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("id");
  if (!campaignId) {
    return NextResponse.json({ error: "Campagne manquante" }, { status: 400 });
  }

  const campaign = await prisma.notificationCampaign.findFirst({
    where: { id: campaignId, merchantId: session.user.id },
    include: { _count: { select: { logs: true } } },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }

  if (isAutomationRule(campaign.triggerConfig)) {
    return NextResponse.json(
      { error: "Cette règle automatique se gère depuis l'onglet Automatisations." },
      { status: 400 }
    );
  }

  const isStampEventCampaign =
    campaign.triggerType === "POST_STAMP" || campaign.triggerType === "MILESTONE";
  if (
    isStampEventCampaign &&
    campaign.status === "SCHEDULED" &&
    (campaign.sentAt || campaign._count.logs > 0)
  ) {
    await prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ ok: true, cancelled: true });
  }

  if (campaign.status !== "SCHEDULED" || campaign.sentAt || campaign._count.logs > 0) {
    return NextResponse.json(
      { error: "Cette campagne ne peut plus être supprimée car elle a déjà été traitée." },
      { status: 409 }
    );
  }

  await prisma.notificationCampaign.delete({ where: { id: campaign.id } });

  return NextResponse.json({ ok: true });
}

async function prepareCardOffer(input: {
  merchantId: string;
  programId: string | null;
  campaignId?: string;
  triggerType: string;
  targetSegment: string;
  showOnNewCards: boolean;
  offerEndsAtInput?: string | null;
  replaceActiveOffer: boolean;
  hasExactTargets: boolean;
  activationAt: Date;
}): Promise<{ offerEndsAt: Date | null } | { response: NextResponse }> {
  if (!input.showOnNewCards) return { offerEndsAt: null };

  if (!input.programId) {
    return {
      response: NextResponse.json(
        { error: "Choisissez un programme pour afficher cette offre sur les cartes." },
        { status: 400 }
      ),
    };
  }
  if (input.triggerType !== "IMMEDIATE" && input.triggerType !== "SCHEDULED") {
    return {
      response: NextResponse.json(
        { error: "Cette option est réservée aux campagnes immédiates ou programmées." },
        { status: 400 }
      ),
    };
  }
  if (input.targetSegment !== "ALL" || input.hasExactTargets) {
    return {
      response: NextResponse.json(
        { error: "Une offre destinée aux futurs clients doit cibler tous les clients." },
        { status: 400 }
      ),
    };
  }

  const offerEndsAt = input.offerEndsAtInput
    ? new Date(input.offerEndsAtInput)
    : null;
  if (!offerEndsAt || Number.isNaN(offerEndsAt.getTime()) || offerEndsAt <= input.activationAt) {
    return {
      response: NextResponse.json(
        { error: "Choisissez une date de fin postérieure au début de l'offre." },
        { status: 400 }
      ),
    };
  }
  const maxEndsAt = new Date(input.activationAt);
  maxEndsAt.setDate(maxEndsAt.getDate() + MAX_CARD_OFFER_DAYS);
  if (offerEndsAt > maxEndsAt) {
    return {
      response: NextResponse.json(
        { error: `Une offre peut rester active au maximum ${MAX_CARD_OFFER_DAYS} jours.` },
        { status: 400 }
      ),
    };
  }

  const program = await prisma.loyaltyProgram.findFirst({
    where: { id: input.programId, merchantId: input.merchantId },
    select: {
      activeOfferCampaignId: true,
      activeOfferTitle: true,
      activeOfferStartsAt: true,
      activeOfferEndsAt: true,
    },
  });
  if (!program) {
    return {
      response: NextResponse.json({ error: "Programme introuvable" }, { status: 404 }),
    };
  }

  const currentOfferConflicts = Boolean(
    program.activeOfferCampaignId &&
      program.activeOfferCampaignId !== input.campaignId &&
      program.activeOfferEndsAt &&
      offerIntervalsOverlap(
        {
          startsAt: program.activeOfferStartsAt || new Date(0),
          endsAt: program.activeOfferEndsAt,
        },
        { startsAt: input.activationAt, endsAt: offerEndsAt }
      )
  );

  const scheduledConflicts = await prisma.notificationCampaign.findMany({
    where: {
      id: input.campaignId ? { not: input.campaignId } : undefined,
      merchantId: input.merchantId,
      programId: input.programId,
      status: "SCHEDULED",
      showOnNewCards: true,
      scheduledAt: { lt: offerEndsAt },
      offerEndsAt: { gt: input.activationAt },
    },
    select: { id: true, name: true, scheduledAt: true, offerEndsAt: true },
  });

  if ((currentOfferConflicts || scheduledConflicts.length > 0) && !input.replaceActiveOffer) {
    const conflict = scheduledConflicts[0];
    return {
      response: NextResponse.json(
        {
          error:
            "Une offre est déjà active ou programmée pour ce programme. Confirmez son remplacement.",
          errorCode: "ACTIVE_CARD_OFFER_CONFLICT",
          activeOffer: currentOfferConflicts
            ? {
                title: program.activeOfferTitle || "Offre active",
                endsAt: program.activeOfferEndsAt,
              }
            : {
                title: conflict?.name || "Offre programmée",
                startsAt: conflict?.scheduledAt,
                endsAt: conflict?.offerEndsAt,
              },
        },
        { status: 409 }
      ),
    };
  }

  if (input.replaceActiveOffer && scheduledConflicts.length > 0) {
    await prisma.notificationCampaign.updateMany({
      where: { id: { in: scheduledConflicts.map((campaign) => campaign.id) } },
      data: { showOnNewCards: false, offerEndsAt: null },
    });
  }

  return { offerEndsAt };
}

function hasExactTargetCardIds(triggerConfig: Record<string, unknown>): boolean {
  const targetCardIds = triggerConfig.targetCardIds;
  return (
    Array.isArray(targetCardIds) &&
    targetCardIds.some((id) => typeof id === "string" && id.length > 0)
  );
}

function resolveScheduledAt(
  triggerType: string,
  triggerConfig: {
    sendAt?: string;
    sendAtLocal?: string;
    timezoneOffsetMinutes?: number;
  }
) {
  if (triggerType !== "SCHEDULED") return undefined;

  if (
    triggerConfig.sendAtLocal &&
    typeof triggerConfig.timezoneOffsetMinutes === "number"
  ) {
    const [datePart, timePart] = triggerConfig.sendAtLocal.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute, second = 0] = timePart.split(":").map(Number);
    const utcMillis =
      Date.UTC(year, month - 1, day, hour, minute, second) +
      triggerConfig.timezoneOffsetMinutes * 60_000;
    const scheduledAt = new Date(utcMillis);
    if (!Number.isNaN(scheduledAt.getTime())) return scheduledAt;
  }

  return triggerConfig.sendAt ? new Date(triggerConfig.sendAt) : undefined;
}
