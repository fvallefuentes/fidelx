import { prisma } from "@/lib/prisma";

export type ProgramType = "STAMPS" | "POINTS" | "CASHBACK" | "HYBRID";

export { PLAN_LABELS } from "@/lib/plan-labels";
export interface PlanLimits {
  maxActiveCards: number | null;
  maxStampsPerMonth: number | null;
  allowedProgramTypes: ProgramType[];
  showFidlifyBranding: boolean;
  maxPrograms: number | null;
  maxCampaignsPerMonth: number | null;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    maxActiveCards: 50,
    maxStampsPerMonth: 300,
    allowedProgramTypes: ["STAMPS"],
    showFidlifyBranding: true,
    maxPrograms: 1,
    maxCampaignsPerMonth: 2,
  },
  ESSENTIAL: {
    maxActiveCards: 1000,
    maxStampsPerMonth: 2500,
    allowedProgramTypes: ["STAMPS", "POINTS", "CASHBACK", "HYBRID"],
    showFidlifyBranding: false,
    maxPrograms: null,
    maxCampaignsPerMonth: 4,
  },
  GROWTH: {
    maxActiveCards: 5000,
    maxStampsPerMonth: null,
    allowedProgramTypes: ["STAMPS", "POINTS", "CASHBACK", "HYBRID"],
    showFidlifyBranding: false,
    maxPrograms: null,
    maxCampaignsPerMonth: null,
  },
  MULTI_SITE: {
    maxActiveCards: 25000,
    maxStampsPerMonth: null,
    allowedProgramTypes: ["STAMPS", "POINTS", "CASHBACK", "HYBRID"],
    showFidlifyBranding: false,
    maxPrograms: null,
    maxCampaignsPerMonth: null,
  },
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[plan || "FREE"] || PLAN_LIMITS.FREE;
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
