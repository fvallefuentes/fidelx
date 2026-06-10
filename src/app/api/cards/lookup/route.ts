import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const serialNumber = searchParams.get("serialNumber");
  if (!serialNumber) {
    return NextResponse.json({ error: "Numéro de série requis" }, { status: 400 });
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    include: {
      client: { select: { firstName: true } },
      program: { include: { merchant: { select: { id: true, name: true } } } },
    },
  });

  if (!card) return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  if (card.program.merchant.id !== session.user.id) {
    return NextResponse.json({ error: "Cette carte n'appartient pas à votre programme" }, { status: 403 });
  }
  if (card.status === "REVOKED" || card.status === "EXPIRED") {
    return NextResponse.json({ error: "Cette carte n'est plus active" }, { status: 400 });
  }

  const config = card.program.config as Record<string, unknown>;
  // Pour un programme POINTS, le seuil de récompense est dans config.tiers[0].points
  // (et pas dans config.maxStamps). En mode unlimited, il n'y a aucun seuil.
  const pointsTarget =
    (config.tiers as { points?: number }[] | undefined)?.[0]?.points ?? null;
  const isUnlimitedPoints =
    card.program.type === "POINTS" && config.unlimited === true;
  const maxStamps =
    card.program.type === "POINTS"
      ? (pointsTarget ?? 0)
      : ((config.maxStamps as number) || 10);

  // On clamp les valeurs affichées au seuil pour ne jamais montrer "12/10".
  // La DB peut contenir des valeurs au-dessus quand la carte est en
  // REWARD_PENDING — les tampons "en trop" sont reportés au cycle suivant
  // après validation merchant.
  const displayStamps =
    maxStamps > 0
      ? Math.min(card.currentStamps, maxStamps)
      : card.currentStamps;
  const displayPoints =
    isUnlimitedPoints || pointsTarget === null
      ? card.currentPoints
      : Math.min(card.currentPoints, pointsTarget);

  return NextResponse.json({
    clientName: card.client.firstName,
    programName: card.program.name,
    merchantName: card.program.merchant.name || "Commerce",
    programType: card.program.type,
    currentStamps: displayStamps,
    maxStamps,
    currentPoints: displayPoints,
    unlimited: isUnlimitedPoints,
    status: card.status,
  });
}