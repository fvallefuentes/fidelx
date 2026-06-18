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
  priorityScore: number;
  priorityLabel: string;
  priorityReason: string;
  messageVariants?: CampaignMessageVariant[];
};

export type CampaignMessageVariant = {
  id: string;
  label: string;
  tone: string;
  notifTitle: string;
  message: string;
  rationale: string;
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
  score: number;
  scoreLabel: string;
  scoreReasons: string[];
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
        audience: buildAudience(dormantCards, "Sans visite depuis 30 jours", { now }),
        audiencePreviewLimit: 8,
        suppressedByCooldown: dormantSuppressed,
        priority: 95 + dormantCount,
        priorityScore: 0,
        priorityLabel: "",
        priorityReason: "",
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
        audience: buildAudience(newWithoutSecondVisitCards, "Nouveau client sans deuxieme visite", { now }),
        audiencePreviewLimit: 8,
        suppressedByCooldown: newSuppressed,
        priority: 82 + newWithoutSecondVisit,
        priorityScore: 0,
        priorityLabel: "",
        priorityReason: "",
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
        audience: buildAudience(birthdaySoonCards, "Anniversaire dans les 14 jours", { now, birthdaySoon: true }),
        audiencePreviewLimit: 8,
        suppressedByCooldown: birthdaySuppressed,
        priority: 78 + birthdaySoonCount,
        priorityScore: 0,
        priorityLabel: "",
        priorityReason: "",
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
            (card) => `${maxStamps - card.currentStamps} tampon${maxStamps - card.currentStamps > 1 ? "s" : ""} restant${maxStamps - card.currentStamps > 1 ? "s" : ""}`,
            { now, maxStamps }
          ),
          audiencePreviewLimit: 8,
          suppressedByCooldown: rewardSuppressed,
          priority: 88 + closeToRewardCount,
          priorityScore: 0,
          priorityLabel: "",
          priorityReason: "",
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
        audience: buildAudience(lowActivityCards, "Programme sans visite recente", { now }),
        audiencePreviewLimit: 8,
        suppressedByCooldown: lowActivitySuppressed,
        priority: 70 + lowActivityCards.length,
        priorityScore: 0,
        priorityLabel: "",
        priorityReason: "",
      });
    }
  }

  return recommendations
    .map(enrichRecommendationPriority)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
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
  reason: string | ((card: AudienceCard) => string),
  context: { now: Date; maxStamps?: number; birthdaySoon?: boolean }
): RecommendationAudience[] {
  return cards
    .map((card) => ({ card, score: scoreAudienceCard(card, context) }))
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, 30)
    .map(({ card, score }) => ({
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
      score: score.score,
      scoreLabel: score.label,
      scoreReasons: score.reasons,
    }));
}

function enrichRecommendationPriority(rec: CampaignRecommendation): CampaignRecommendation {
  const averageScore =
    rec.audience.length > 0
      ? Math.round(rec.audience.reduce((sum, person) => sum + person.score, 0) / rec.audience.length)
      : 0;
  const topReason =
    rec.audience
      .flatMap((person) => person.scoreReasons)
      .find(Boolean) || "Audience qualifiee par les signaux de fidelite.";

  return {
    ...rec,
    priorityScore: averageScore,
    priorityLabel: priorityLabel(averageScore),
    priorityReason: topReason,
    messageVariants: buildMessageVariants(rec, averageScore, topReason),
    priority: rec.priority + Math.round(averageScore / 2),
  };
}

function buildMessageVariants(
  rec: CampaignRecommendation,
  averageScore: number,
  topReason: string
): CampaignMessageVariant[] {
  const base = {
    id: "standard",
    label: "Equilibre",
    tone: "Clair et prudent",
    notifTitle: rec.notifTitle,
    message: rec.message,
    rationale: "Bon choix par defaut pour envoyer sans paraitre trop commercial.",
  };

  if (rec.id.startsWith("dormant-")) {
    return [
      base,
      {
        id: "soft-return",
        label: "Retour doux",
        tone: "Relationnel",
        notifTitle: "On pense a vous",
        message:
          "Cela fait un moment qu'on ne vous a pas vu. Passez quand vous voulez, une attention vous attend.",
        rationale: "Mieux pour les clients dormants a relancer sans pression.",
      },
      {
        id: "offer-return",
        label: "Offre retour",
        tone: "Incitatif",
        notifTitle: "Votre offre retour est prete",
        message:
          "Revenez cette semaine et profitez d'un avantage reserve aux membres fideles.",
        rationale: "A utiliser quand l'objectif est de generer une visite rapidement.",
      },
      ...(averageScore >= 65
        ? [
            {
              id: "vip-risk",
              label: "Ancien bon client",
              tone: "Reconnaissance",
              notifTitle: "Votre avantage fidelite vous attend",
              message:
                "Merci pour votre fidelite. Revenez cette semaine: nous vous avons reserve un avantage.",
              rationale: `Adapte car l'audience contient surtout: ${topReason}.`,
            },
          ]
        : []),
    ];
  }

  if (rec.id.startsWith("new-second-visit-")) {
    return [
      base,
      {
        id: "welcome",
        label: "Bienvenue",
        tone: "Chaleureux",
        notifTitle: "Merci pour votre premiere visite",
        message:
          "Merci pour votre premiere visite. Repassez cette semaine, votre carte fidelite avance deja.",
        rationale: "Rassure les nouveaux clients et explique la valeur de la carte.",
      },
      {
        id: "second-visit",
        label: "2e visite",
        tone: "Direct",
        notifTitle: "Votre prochain passage compte",
        message:
          "Votre prochain passage vous rapproche de votre avantage fidelite. A tres vite en boutique.",
        rationale: "Bon choix pour transformer une inscription en habitude.",
      },
    ];
  }

  if (rec.id.startsWith("birthday-")) {
    return [
      base,
      {
        id: "gift",
        label: "Cadeau",
        tone: "Attention speciale",
        notifTitle: "Votre cadeau d'anniversaire vous attend",
        message:
          "Votre anniversaire approche. Passez en boutique cette semaine: un cadeau vous attend.",
        rationale: "Plus fort quand le commercant assume une vraie attention anniversaire.",
      },
      {
        id: "warm",
        label: "Chaleureux",
        tone: "Personnel",
        notifTitle: "Une attention pour votre anniversaire",
        message:
          "Votre anniversaire approche. Nous serions ravis de vous offrir une attention en boutique.",
        rationale: "Moins promotionnel, plus relationnel.",
      },
    ];
  }

  if (rec.id.startsWith("close-reward-")) {
    return [
      base,
      {
        id: "one-step",
        label: "Dernier pas",
        tone: "Motivant",
        notifTitle: "Plus qu'un passage",
        message:
          "Vous etes tout proche de votre recompense. Passez cette semaine pour completer votre carte.",
        rationale: "Met l'accent sur l'effort minimal restant.",
      },
      {
        id: "reward-focus",
        label: "Recompense",
        tone: "Benefice clair",
        notifTitle: "Votre recompense approche",
        message:
          "Votre recompense fidelite est presque debloquee. Un prochain passage peut tout changer.",
        rationale: "Utile si l'audience est deja motivee par le programme.",
      },
    ];
  }

  if (rec.id.startsWith("low-activity-")) {
    return [
      base,
      {
        id: "member-benefit",
        label: "Membres",
        tone: "Valeur membre",
        notifTitle: "Votre avantage membre vous attend",
        message:
          "Votre carte fidelite est toujours active. Revenez cette semaine profiter d'un avantage membre.",
        rationale: "Repositionne le programme comme un benefice reserve.",
      },
      {
        id: "wake-up",
        label: "Reveil",
        tone: "Simple",
        notifTitle: "Une offre fidelite vous attend",
        message:
          "Nous avons une offre fidelite pour vous cette semaine. Passez nous voir quand vous voulez.",
        rationale: "Message court pour relancer un programme peu utilise.",
      },
    ];
  }

  return [base];
}

function scoreAudienceCard(
  card: AudienceCard,
  context: { now: Date; maxStamps?: number; birthdaySoon?: boolean }
) {
  let score = 20;
  const reasons: string[] = [];
  const daysSinceVisit =
    card.lastVisitAt !== null
      ? Math.floor((context.now.getTime() - card.lastVisitAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  if (daysSinceVisit === null) {
    score += 12;
    reasons.push("jamais revenu depuis l'inscription");
  } else if (daysSinceVisit >= 60) {
    score += 30;
    reasons.push("inactif depuis 60+ jours");
  } else if (daysSinceVisit >= 30) {
    score += 22;
    reasons.push("inactif depuis 30+ jours");
  } else if (daysSinceVisit <= 14 && card.totalVisits >= 3) {
    score += 10;
    reasons.push("client encore actif");
  }

  if (card.totalVisits >= 10 && (daysSinceVisit === null || daysSinceVisit >= 30)) {
    score += 18;
    reasons.push("ancien bon client a risque");
  } else if (card.totalVisits >= 5) {
    score += 10;
    reasons.push("historique de visites solide");
  }

  if (card.totalVisits < 2) {
    score += 16;
    reasons.push("nouveau client a convertir");
  }

  if (context.maxStamps) {
    const remaining = context.maxStamps - card.currentStamps;
    if (remaining === 1) {
      score += 34;
      reasons.push("a 1 tampon de la recompense");
    } else if (remaining === 2) {
      score += 26;
      reasons.push("a 2 tampons de la recompense");
    }
  }

  if (context.birthdaySoon) {
    score += 14;
    reasons.push("moment personnel a forte attention");
  }

  if (card.client.email || card.client.phone) {
    score += 4;
  }

  const cappedScore = Math.max(0, Math.min(100, score));
  return {
    score: cappedScore,
    label: priorityLabel(cappedScore),
    reasons: reasons.slice(0, 3),
  };
}

function priorityLabel(score: number) {
  if (score >= 75) return "Priorite haute";
  if (score >= 55) return "Bon potentiel";
  if (score >= 35) return "A surveiller";
  return "Faible urgence";
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
