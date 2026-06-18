import { prisma } from "@/lib/prisma";

export type CampaignRecommendation = {
  id: string;
  title: string;
  reason: string;
  impactLabel: string;
  potentialCount: number;
  programId: string;
  programName: string;
  name: string;
  notifTitle: string;
  message: string;
  triggerType: "IMMEDIATE" | "INACTIVITY" | "MILESTONE" | "BIRTHDAY";
  targetSegment: "ALL" | "ACTIVE" | "DORMANT" | "NEW" | "VIP";
  triggerConfig?: Record<string, unknown>;
  targetCardIds: string[];
  audience: RecommendationAudience[];
  audiencePreviewLimit: number;
  suppressedByCooldown: number;
  priority: number;
};

export type RecommendationAudience = {
  cardId: string;
  clientName: string;
  email: string | null;
  phone: string | null;
  reason: string;
  lastVisitAt: string | null;
  totalVisits: number;
  currentStamps: number;
  currentPoints: number;
  lastMessageAt: string | null;
};

type AudienceCard = {
  id: string;
  currentStamps: number;
  currentPoints: number;
  totalVisits: number;
  lastVisitAt: Date | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  client: {
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    birthDate?: Date | null;
  };
};

export async function buildCampaignRecommendations(merchantId: string) {
  const now = new Date();
  const dormantCutoff = addDays(now, -30);
  const newCutoff = addDays(now, -14);
  const recentCutoff = addDays(now, -30);
  const notificationCooldownCutoff = addDays(now, -7);

  const programs = await prisma.loyaltyProgram.findMany({
    where: { merchantId, isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      config: true,
      createdAt: true,
      cards: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          currentStamps: true,
          currentPoints: true,
          totalVisits: true,
          lastVisitAt: true,
          lastMessageAt: true,
          createdAt: true,
          client: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              birthDate: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const recommendations: CampaignRecommendation[] = [];

  for (const program of programs) {
    const cards = program.cards;
    const activeCards = cards.length;
    if (activeCards === 0) continue;

    const dormantCandidates = cards.filter(
      (card) => !card.lastVisitAt || card.lastVisitAt < dormantCutoff
    );
    const { eligible: dormantCards, suppressed: dormantSuppressed } =
      applyNotificationCooldown(dormantCandidates, notificationCooldownCutoff);
    const dormantCount = dormantCards.length;
    if (dormantCount >= 3 || dormantCount >= Math.ceil(activeCards * 0.35)) {
      recommendations.push({
        id: `dormant-${program.id}`,
        title: "Relancer les clients dormants",
        reason: `${dormantCount} client${dormantCount > 1 ? "s" : ""} sans visite depuis 30 jours.`,
        impactLabel: "retours possibles",
        potentialCount: dormantCount,
        programId: program.id,
        programName: program.name,
        name: "Win-back 30 jours",
        notifTitle: "On vous garde une offre",
        message:
          "Cela fait un moment qu'on ne vous a pas vu. Revenez cette semaine et profitez d'une offre speciale en boutique.",
        triggerType: "IMMEDIATE",
        targetSegment: "DORMANT",
        triggerConfig: { daysInactive: 30, targetCardIds: dormantCards.map((card) => card.id) },
        targetCardIds: dormantCards.map((card) => card.id),
        audience: buildAudience(dormantCards, "Sans visite depuis 30 jours"),
        audiencePreviewLimit: 8,
        suppressedByCooldown: dormantSuppressed,
        priority: 95 + dormantCount,
      });
    }

    const newWithoutSecondVisitCandidates = cards.filter(
      (card) => card.createdAt >= newCutoff && card.totalVisits < 2
    );
    const { eligible: newWithoutSecondVisitCards, suppressed: newSuppressed } =
      applyNotificationCooldown(newWithoutSecondVisitCandidates, notificationCooldownCutoff);
    const newWithoutSecondVisit = newWithoutSecondVisitCards.length;
    if (newWithoutSecondVisit >= 2) {
      recommendations.push({
        id: `new-second-visit-${program.id}`,
        title: "Transformer les nouveaux clients",
        reason: `${newWithoutSecondVisit} nouveau${newWithoutSecondVisit > 1 ? "x" : ""} client${newWithoutSecondVisit > 1 ? "s" : ""} n'ont pas encore fait de deuxieme visite.`,
        impactLabel: "2e visites a viser",
        potentialCount: newWithoutSecondVisit,
        programId: program.id,
        programName: program.name,
        name: "Deuxieme visite nouveaux clients",
        notifTitle: "Votre prochain avantage vous attend",
        message:
          "Merci pour votre premiere visite. Repassez cette semaine: votre prochain avantage fidelite vous attend.",
        triggerType: "IMMEDIATE",
        targetSegment: "NEW",
        triggerConfig: { targetCardIds: newWithoutSecondVisitCards.map((card) => card.id) },
        targetCardIds: newWithoutSecondVisitCards.map((card) => card.id),
        audience: buildAudience(newWithoutSecondVisitCards, "Nouveau client sans deuxieme visite"),
        audiencePreviewLimit: 8,
        suppressedByCooldown: newSuppressed,
        priority: 82 + newWithoutSecondVisit,
      });
    }

    const birthdaySoonCandidates = cards.filter((card) =>
      isBirthdayWithinDays(card.client.birthDate ?? null, now, 14)
    );
    const { eligible: birthdaySoonCards, suppressed: birthdaySuppressed } =
      applyNotificationCooldown(birthdaySoonCandidates, notificationCooldownCutoff);
    const birthdaySoonCount = birthdaySoonCards.length;
    if (birthdaySoonCount > 0) {
      recommendations.push({
        id: `birthday-${program.id}`,
        title: "Preparer les anniversaires",
        reason: `${birthdaySoonCount} client${birthdaySoonCount > 1 ? "s ont" : " a"} un anniversaire dans les 14 jours.`,
        impactLabel: "attentions a envoyer",
        potentialCount: birthdaySoonCount,
        programId: program.id,
        programName: program.name,
        name: "Anniversaire client",
        notifTitle: "Un cadeau d'anniversaire vous attend",
        message:
          "Votre anniversaire approche. Passez en boutique cette semaine: une attention speciale vous attend.",
        triggerType: "IMMEDIATE",
        targetSegment: "ALL",
        triggerConfig: { targetCardIds: birthdaySoonCards.map((card) => card.id) },
        targetCardIds: birthdaySoonCards.map((card) => card.id),
        audience: buildAudience(birthdaySoonCards, "Anniversaire dans les 14 jours"),
        audiencePreviewLimit: 8,
        suppressedByCooldown: birthdaySuppressed,
        priority: 78 + birthdaySoonCount,
      });
    }

    if (program.type === "STAMPS") {
      const maxStamps = getMaxStamps(program.config);
      const closeToRewardCandidates = cards.filter(
        (card) =>
          card.currentStamps >= Math.max(1, maxStamps - 2) &&
          card.currentStamps < maxStamps
      );
      const { eligible: closeToRewardCards, suppressed: rewardSuppressed } =
        applyNotificationCooldown(closeToRewardCandidates, notificationCooldownCutoff);
      const closeToRewardCount = closeToRewardCards.length;
      if (closeToRewardCount > 0) {
        recommendations.push({
          id: `close-reward-${program.id}`,
          title: "Pousser les cartes presque pleines",
          reason: `${closeToRewardCount} client${closeToRewardCount > 1 ? "s sont" : " est"} a 1 ou 2 tampons de la recompense.`,
          impactLabel: "recompenses proches",
          potentialCount: closeToRewardCount,
          programId: program.id,
          programName: program.name,
          name: "Carte presque pleine",
          notifTitle: "Votre recompense est toute proche",
          message:
            "Vous etes tout proche de votre recompense. Passez nous voir cette semaine pour completer votre carte.",
          triggerType: "IMMEDIATE",
          targetSegment: "ACTIVE",
          triggerConfig: { targetCardIds: closeToRewardCards.map((card) => card.id) },
          targetCardIds: closeToRewardCards.map((card) => card.id),
          audience: buildAudience(
            closeToRewardCards,
            (card) => `${maxStamps - card.currentStamps} tampon${maxStamps - card.currentStamps > 1 ? "s" : ""} restant${maxStamps - card.currentStamps > 1 ? "s" : ""}`
          ),
          audiencePreviewLimit: 8,
          suppressedByCooldown: rewardSuppressed,
          priority: 88 + closeToRewardCount,
        });
      }
    }

    const visitsLast30 = cards.filter(
      (card) => card.lastVisitAt && card.lastVisitAt >= recentCutoff
    ).length;
    const { eligible: lowActivityCards, suppressed: lowActivitySuppressed } =
      applyNotificationCooldown(cards, notificationCooldownCutoff);
    if (activeCards >= 3 && visitsLast30 === 0 && lowActivityCards.length > 0) {
      recommendations.push({
        id: `low-activity-${program.id}`,
        title: "Reveiller un programme peu utilise",
        reason: `${program.name} a ${activeCards} carte${activeCards > 1 ? "s" : ""}, mais aucune visite recente.`,
        impactLabel: "clients a reactiver",
        potentialCount: lowActivityCards.length,
        programId: program.id,
        programName: program.name,
        name: "Reactivation programme",
        notifTitle: "Une offre fidelite vous attend",
        message:
          "Votre carte fidelite vous attend toujours. Revenez cette semaine et profitez d'un avantage reserve aux membres.",
        triggerType: "IMMEDIATE",
        targetSegment: "ALL",
        triggerConfig: { targetCardIds: lowActivityCards.map((card) => card.id) },
        targetCardIds: lowActivityCards.map((card) => card.id),
        audience: buildAudience(lowActivityCards, "Programme sans visite recente"),
        audiencePreviewLimit: 8,
        suppressedByCooldown: lowActivitySuppressed,
        priority: 70 + lowActivityCards.length,
      });
    }
  }

  return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

function applyNotificationCooldown<T extends { lastMessageAt: Date | null }>(
  cards: T[],
  cooldownCutoff: Date
) {
  const eligible = cards.filter(
    (card) => !card.lastMessageAt || card.lastMessageAt < cooldownCutoff
  );
  return { eligible, suppressed: cards.length - eligible.length };
}

function buildAudience(
  cards: AudienceCard[],
  reason: string | ((card: AudienceCard) => string)
): RecommendationAudience[] {
  return cards.slice(0, 30).map((card) => ({
    cardId: card.id,
    clientName: [card.client.firstName, card.client.lastName].filter(Boolean).join(" "),
    email: card.client.email,
    phone: card.client.phone,
    reason: typeof reason === "function" ? reason(card) : reason,
    lastVisitAt: card.lastVisitAt?.toISOString() || null,
    totalVisits: card.totalVisits,
    currentStamps: card.currentStamps,
    currentPoints: card.currentPoints,
    lastMessageAt: card.lastMessageAt?.toISOString() || null,
  }));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMaxStamps(config: unknown) {
  const cfg = config as { maxStamps?: unknown } | null;
  return typeof cfg?.maxStamps === "number" && cfg.maxStamps > 0
    ? cfg.maxStamps
    : 10;
}

function isBirthdayWithinDays(birthDate: Date | null, from: Date, days: number) {
  if (!birthDate) return false;
  const thisYear = new Date(
    from.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate(),
    12
  );
  const target =
    thisYear < startOfDay(from)
      ? new Date(from.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate(), 12)
      : thisYear;
  return target <= addDays(from, days);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
