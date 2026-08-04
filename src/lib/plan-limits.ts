import { prisma } from "@/lib/prisma";

export type ProgramType = "STAMPS" | "POINTS" | "CASHBACK";

export { PLAN_LABELS } from "@/lib/plan-labels";
export interface PlanLimits {
  maxActiveCards: number | null;
  maxStampsPerMonth: number | null;
  allowedProgramTypes: ProgramType[];
  showFidlifyBranding: boolean;
  maxPrograms: number | null;
  maxCampaignsPerMonth: number | null;
  /** Export CSV (Clients, Transactions, Campagnes) — uniquement plans payants. */
  canExportCsv: boolean;
}

export const GLOBAL_MAX_CAMPAIGNS_PER_MONTH = 15;

/** Durée de l'essai gratuit, en jours. 30 et non 14 : le déclic du produit
 *  ("j'ai relancé, des clients sont revenus") demande d'abord d'accumuler des
 *  porteurs de carte, puis une campagne, puis d'en voir l'effet. */
export const TRIAL_DAYS = 30;

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  TEST: {
    maxActiveCards: null,
    maxStampsPerMonth: null,
    allowedProgramTypes: ["STAMPS", "POINTS", "CASHBACK"],
    showFidlifyBranding: false,
    maxPrograms: null,
    maxCampaignsPerMonth: null,
    canExportCsv: true,
  },
  /** Essai complet, 30 jours, sans carte bancaire. */
  TRIAL: {
    maxActiveCards: 1000,
    maxStampsPerMonth: null,
    allowedProgramTypes: ["STAMPS", "POINTS", "CASHBACK"],
    showFidlifyBranding: true,
    maxPrograms: 3,
    maxCampaignsPerMonth: null,
    canExportCsv: true,
  },
  /**
   * Mode veille : l'essai est terminé et aucun abonnement n'a été pris.
   * Principe — on ne casse jamais l'expérience du client final : les cartes
   * déjà dans les Wallets continuent de fonctionner et de cumuler des tampons.
   * Ce qui s'arrête, c'est la capacité du commerçant à développer son
   * programme : plus de nouvelle carte, plus de campagne, plus d'export.
   */
  DORMANT: {
    maxActiveCards: 0,
    maxStampsPerMonth: 300,
    allowedProgramTypes: ["STAMPS"],
    showFidlifyBranding: true,
    maxPrograms: 1,
    maxCampaignsPerMonth: 0,
    canExportCsv: false,
  },
  FREE: {
    maxActiveCards: 10,
    maxStampsPerMonth: 300,
    allowedProgramTypes: ["STAMPS"],
    showFidlifyBranding: true,
    maxPrograms: 1,
    maxCampaignsPerMonth: 1,
    canExportCsv: false,
  },
  ESSENTIAL: {
    maxActiveCards: 1000,
    maxStampsPerMonth: 2500,
    allowedProgramTypes: ["STAMPS", "POINTS", "CASHBACK"],
    showFidlifyBranding: false,
    maxPrograms: 10,
    maxCampaignsPerMonth: 4,
    canExportCsv: true,
  },
  GROWTH: {
    maxActiveCards: 5000,
    maxStampsPerMonth: null,
    allowedProgramTypes: ["STAMPS", "POINTS", "CASHBACK"],
    showFidlifyBranding: false,
    maxPrograms: null,
    maxCampaignsPerMonth: null,
    canExportCsv: true,
  },
  MULTI_SITE: {
    maxActiveCards: 25000,
    maxStampsPerMonth: null,
    allowedProgramTypes: ["STAMPS", "POINTS", "CASHBACK"],
    showFidlifyBranding: false,
    maxPrograms: null,
    maxCampaignsPerMonth: null,
    canExportCsv: true,
  },
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[plan || "FREE"] || PLAN_LIMITS.FREE;
}

/** État réellement applicable à un compte : le plan payé, ou — pour un compte
 *  non abonné — l'essai en cours puis le mode veille. */
export type PlanState =
  | "TEST"
  | "TRIAL"
  | "DORMANT"
  | "FREE"
  | "ESSENTIAL"
  | "GROWTH"
  | "MULTI_SITE";

export type PlanStateUser = {
  plan?: string | null;
  trialEndsAt?: Date | null;
  manualPlanUntil?: Date | null;
  testMode?: boolean | null;
};

/**
 * Résout l'état d'un compte. Les dates priment sur la colonne `plan` :
 *  - plan payant encore valide            → ce plan
 *  - plan offert par l'admin mais périmé  → retour au parcours essai/veille
 *  - pas d'abonnement, essai en cours     → TRIAL
 *  - pas d'abonnement, essai terminé      → DORMANT
 *  - compte antérieur à l'essai (pas de date) → FREE (historique, non touché)
 */
export function resolvePlanState(
  user: PlanStateUser | null | undefined,
  now: Date = new Date()
): PlanState {
  if (user?.testMode) return "TEST";
  const plan = (user?.plan || "FREE") as PlanState;

  if (plan !== "FREE") {
    const manualExpired = user?.manualPlanUntil ? user.manualPlanUntil < now : false;
    if (!manualExpired) return plan;
    // Le plan offert a expiré : on ne le prolonge pas indéfiniment.
  }

  if (!user?.trialEndsAt) return "FREE";
  return user.trialEndsAt > now ? "TRIAL" : "DORMANT";
}

/** Limites effectives d'un compte, essai et veille compris. À préférer à
 *  `getPlanLimits` partout où l'utilisateur est disponible. */
export function getEffectiveLimits(
  user: PlanStateUser | null | undefined,
  now: Date = new Date()
): PlanLimits {
  return PLAN_LIMITS[resolvePlanState(user, now)] || PLAN_LIMITS.FREE;
}

/** Jours restants avant la fin de l'essai (0 si terminé ou non applicable). */
export function trialDaysLeft(
  user: PlanStateUser | null | undefined,
  now: Date = new Date()
): number {
  if (!user?.trialEndsAt) return 0;
  const ms = user.trialEndsAt.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

export function getEffectiveMaxCampaignsPerMonth(
  user: PlanStateUser | string | null | undefined
): number | null {
  // Accepte encore un plan brut (appels historiques) en plus de l'utilisateur.
  const limits =
    typeof user === "string" || user == null
      ? getPlanLimits(user as string | null | undefined)
      : getEffectiveLimits(user);
  const planLimit = limits.maxCampaignsPerMonth;
  if (typeof user !== "string" && user?.testMode) return null;
  if (planLimit === null) return GLOBAL_MAX_CAMPAIGNS_PER_MONTH;
  return Math.min(planLimit, GLOBAL_MAX_CAMPAIGNS_PER_MONTH);
}

/**
 * Calcule le début de la période en cours pour un utilisateur.
 * - Plan payant : début du cycle Stripe (ex: abonné le 20 → reset le 20 chaque mois)
 * - Plan gratuit : jour d'inscription comme ancre (ex: inscrit le 15 → reset le 15 chaque mois)
 */
export function getPeriodStart(user: {
  createdAt: Date;
  plan: string;
  stripeCurrentPeriodStart?: Date | null;
}): Date {
  if (user.plan !== "FREE" && user.stripeCurrentPeriodStart) {
    return user.stripeCurrentPeriodStart;
  }

  // Ancre sur le jour d'inscription
  const now = new Date();
  const anchorDay = user.createdAt.getDate();
  let start = new Date(now.getFullYear(), now.getMonth(), anchorDay, 0, 0, 0, 0);

  // Si le jour d'ancre n'est pas encore passé ce mois-ci, reculer d'un mois
  if (start > now) {
    start = new Date(now.getFullYear(), now.getMonth() - 1, anchorDay, 0, 0, 0, 0);
  }

  return start;
}

export async function countStampsThisMonth(merchantId: string, periodStart: Date): Promise<number> {
  return prisma.transaction.count({
    where: {
      card: { program: { merchantId } },
      createdAt: { gte: periodStart },
      type: { in: ["STAMP", "POINTS_EARN", "CASHBACK_EARN"] },
    },
  });
}

export async function countActiveCards(merchantId: string): Promise<number> {
  return prisma.loyaltyCard.count({
    where: {
      program: { merchantId },
      status: { in: ["ACTIVE", "REWARD_PENDING"] },
    },
  });
}
