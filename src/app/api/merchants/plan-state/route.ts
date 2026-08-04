import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePlanState, trialDaysLeft } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

/**
 * GET /api/merchants/plan-state
 *
 * État d'abonnement du commerçant, pour le bandeau du tableau de bord.
 * Volontairement léger : le bandeau est monté sur toutes les pages, il ne
 * doit pas tirer toute la charge utile de /api/merchants/settings.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: merchantId },
    select: { plan: true, trialEndsAt: true, manualPlanUntil: true, testMode: true },
  });

  const state = resolvePlanState(user);

  return NextResponse.json({
    state,
    daysLeft: trialDaysLeft(user),
    trialEndsAt: user?.trialEndsAt ?? null,
  });
}
