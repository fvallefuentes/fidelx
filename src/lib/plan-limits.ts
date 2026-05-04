/**
 * Limites par plan d'abonnement.
 *
 * - FREE       : 50 cartes actives, 300 tampons/mois, STAMPS only,
 *                branding "Propulsé par Fidlify" affiché
 * - PRO        : 2000 cartes, scans illimités, tous types, sans branding
 * - BUSINESS   : illimité, multi-établissements
 * - ENTERPRISE : tout illimité, dédié
 */

import { prisma } from "@/lib/prisma";

export type ProgramType = "STAMPS" | "POINTS" | "CASHBACK" | "HYBRID";

export interface PlanLimits {
  maxActiveCards: number | null; // null = illimité
  maxStampsPerMonth: number | null;
  allowedProgramTypes: ProgramType[];
  showFidlifyBranding: boolean;
  maxPrograms: number | null;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    maxActiveCards: 50,
    maxStampsPerMonth: 300,
    allowedProgramTypes: ["STAMPS"],
    showFidlifyBranding: true,
    maxPrograms: 1,
  },
  PRO: {
    maxActiveCards: 2000,
    maxStampsPerMonth: null,
    allowedProgramTypes: ["STAMPS", "POINTS", "CASHBACK", "HYBRID"],
    showFidlifyBranding: false,
    maxPrograms: null,
  },
  BUSINESS: {
    maxActiveCards: null,
    maxStampsPerMonth: null,
    allowedProgramTypes: ["STAMPS", "POINTS", "CASHBACK", "HYBRID"],
    showFidlifyBranding: false,
    maxPrograms: null,
  },
  ENTERPRISE: {
    maxActiveCards: null,
    maxStampsPerMonth: null,
    allowedProgramTypes: ["STAMPS", "POINTS", "CASHBACK", "HYBRID"],
    showFidlifyBranding: false,
    maxPrograms: null,
  },
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[plan || "FREE"] || PLAN_LIMITS.FREE;
}

/**
 * Compte le nombre de tampons donnés ce mois-ci par un commerçant
 * (toutes cartes confondues, type STAMP / POINTS_EARN / CASHBACK_EARN).
 */
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

/**
 * Compte le nombre de cartes actives sur tous les programmes du commerçant.
 */
export async function countActiveCards(merchantId: string): Promise<number> {
  return prisma.loyaltyCard.count({
    where: {
      program: { merchantId },
      status: { in: ["ACTIVE", "REWARD_PENDING"] },
    },
  });
}
