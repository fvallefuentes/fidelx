import { prisma } from "@/lib/prisma";

export type ProgramType = "STAMPS" | "POINTS" | "CASHBACK" | "HYBRID";

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

export async function countStampsThisMonth(merchantId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  return prisma.transaction.count({
    where: {
      card: { program: { merchantId } },
      createdAt: { gte: start },
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
