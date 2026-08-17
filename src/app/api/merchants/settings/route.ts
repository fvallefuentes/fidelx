import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateGoogleWalletClass } from "@/lib/wallet/google";
import {
  countStampsThisMonth,
  getEffectiveMaxCampaignsPerMonth,
  getEffectiveLimits,
  resolvePlanState,
  trialDaysLeft,
  getPeriodStart,
} from "@/lib/plan-limits";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      language: true,
      currency: true,
      weeklySummaryEmailEnabled: true,
      notificationDefaultLogo: true,
      notificationDefaultBgColor: true,
      plan: true,
      testMode: true,
      trialEndsAt: true,
      manualPlanUntil: true,
      createdAt: true,
      stripeCurrentPeriodStart: true,
      stripeCurrentPeriodEnd: true,
      stripeCustomerId: true,
      establishments: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const limits = getEffectiveLimits(user);
  const periodStart = getPeriodStart(user);

  const [programCount, activeCardCount, campaignCount, stampsCount] = await Promise.all([
    prisma.loyaltyProgram.count({ where: { merchantId: session.user.id } }),
    prisma.loyaltyCard.count({
      where: { program: { merchantId: session.user.id }, status: { in: ["ACTIVE", "REWARD_PENDING"] } },
    }),
    prisma.notificationCampaign.count({
      where: {
        merchantId: session.user.id,
        createdAt: { gte: periodStart },
        NOT: { triggerConfig: { path: ["automationRule"], equals: true } },
      },
    }),
    countStampsThisMonth(session.user.id, periodStart),
  ]);

  return NextResponse.json({
    ...user,
    // État effectif (essai / veille / plan payé) : l'interface doit s'y fier
    // plutôt qu'à la colonne `plan`, car un compte en essai a plan = FREE.
    planState: resolvePlanState(user),
    trialDaysLeft: trialDaysLeft(user),
    usage: {
      periodStart,
      programs:    { current: programCount,   max: limits.maxPrograms },
      activeCards: { current: activeCardCount, max: limits.maxActiveCards },
      campaigns:   { current: campaignCount,   max: getEffectiveMaxCampaignsPerMonth(user) },
      stamps:      { current: stampsCount,     max: limits.maxStampsPerMonth },
    },
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const {
    name,
    phone,
    language,
    currency,
    weeklySummaryEmailEnabled,
    notificationDefaultLogo,
    notificationDefaultBgColor,
  } = await req.json();

  if (
    typeof notificationDefaultLogo === "string" &&
    notificationDefaultLogo.length > 750_000
  ) {
    return NextResponse.json({ error: "Logo de notification trop lourd" }, { status: 400 });
  }

  if (
    notificationDefaultBgColor &&
    (typeof notificationDefaultBgColor !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(notificationDefaultBgColor))
  ) {
    return NextResponse.json({ error: "Couleur de notification invalide" }, { status: 400 });
  }

  const currentAppearance = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      notificationDefaultLogo: true,
      notificationDefaultBgColor: true,
    },
  });
  if (!currentAppearance) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  const nextNotificationLogo =
    typeof notificationDefaultLogo === "string"
      ? notificationDefaultLogo || null
      : currentAppearance.notificationDefaultLogo;
  const nextNotificationBgColor =
    typeof notificationDefaultBgColor === "string"
      ? notificationDefaultBgColor || null
      : currentAppearance.notificationDefaultBgColor;
  const notificationAppearanceChanged =
    nextNotificationLogo !== currentAppearance.notificationDefaultLogo ||
    nextNotificationBgColor !== currentAppearance.notificationDefaultBgColor;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name || undefined,
      phone: phone || undefined,
      language: language || undefined,
      currency: currency || undefined,
      weeklySummaryEmailEnabled:
        typeof weeklySummaryEmailEnabled === "boolean" ? weeklySummaryEmailEnabled : undefined,
      notificationDefaultLogo:
        typeof notificationDefaultLogo === "string" ? notificationDefaultLogo || null : undefined,
      notificationDefaultBgColor:
        typeof notificationDefaultBgColor === "string" ? notificationDefaultBgColor || null : undefined,
    },
  });

  if (notificationAppearanceChanged) {
    const programs = await prisma.loyaltyProgram.findMany({
      where: { merchantId: session.user.id, isActive: true },
      select: { id: true },
    });

    // Ne jamais pousser toutes les cartes Apple pour un changement visuel :
    // Wallet peut alors rejouer le changeMessage mémorisé comme notification.
    // L'icône Apple sera récupérée à la prochaine vraie mise à jour du pass.
    void Promise.allSettled(
      programs.map((program) => updateGoogleWalletClass(program.id))
    ).catch(() => {});
  }

  return NextResponse.json({ success: true, user });
}
