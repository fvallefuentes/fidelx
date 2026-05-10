import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/merchants/me
 * Retourne l'état du compte commerçant : profil + onboarding + nb programmes.
 * Utilisé par le dashboard pour décider si on redirige vers /dashboard/onboarding.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      onboardingCompletedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  // Le STAFF et l'ADMIN n'ont pas d'onboarding
  const needsOnboarding =
    user.role === "USER" && user.onboardingCompletedAt === null;

  // Compter les programmes (pour skip auto si user existant avec programmes)
  const programCount = await prisma.loyaltyProgram.count({
    where: { merchantId },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    onboardingCompletedAt: user.onboardingCompletedAt,
    needsOnboarding,
    programCount,
  });
}
