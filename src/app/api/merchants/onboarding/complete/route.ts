import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/merchants/onboarding/complete
 * Marque l'onboarding comme terminé pour le commerçant connecté.
 * Idempotent : si déjà complété, on ne touche pas à la date.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "USER") {
    return NextResponse.json(
      { error: "Onboarding réservé aux commerçants" },
      { status: 403 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, onboardingCompletedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  // Idempotent : si déjà complété, on retourne la date existante
  if (user.onboardingCompletedAt) {
    return NextResponse.json({
      ok: true,
      onboardingCompletedAt: user.onboardingCompletedAt,
    });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompletedAt: new Date() },
    select: { onboardingCompletedAt: true },
  });

  return NextResponse.json({
    ok: true,
    onboardingCompletedAt: updated.onboardingCompletedAt,
  });
}
