import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleWalletHasUsersMap } from "@/lib/wallet/google";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const programs = await prisma.loyaltyProgram.findMany({
    where: { merchantId },
    select: { id: true },
  });

  const programIds = programs.map((p) => p.id);

  const cards = await prisma.loyaltyCard.findMany({
    where: { programId: { in: programIds } },
    include: {
      client: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
      program: {
        select: { name: true, type: true, config: true },
      },
      registrations: {
        select: { platform: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Google ne crée pas de PassRegistration. Son champ API `hasUsers` indique
  // si l'objet est réellement présent dans le Wallet d'au moins un utilisateur.
  const googleUsage = await getGoogleWalletHasUsersMap(
    cards
      .filter(
        (card) =>
          !card.client.lastName &&
          !card.registrations.some((registration) => registration.platform === "APPLE")
      )
      .map((card) => card.serialNumber)
  );

  // Enrichir avec le statut Wallet
  const enriched = cards.map((card) => {
    const apple = card.registrations.filter((r) => r.platform === "APPLE").length;
    const google = googleUsage?.get(card.serialNumber) === true ? 1 : 0;
    const total = apple + google;

    let walletStatus: "installed" | "manual" | "removed" | "never_installed";
    if (total > 0) walletStatus = "installed";
    else if (card.client.lastName) walletStatus = "manual";
    else {
      // Si la carte a déjà été utilisée (visites > 0 ou tampons > 0),
      // c'est qu'elle a été installée puis supprimée
      const wasUsed =
        card.totalVisits > 0 ||
        card.currentStamps > 0 ||
        card.currentPoints > 0 ||
        card.cashbackBalance > 0;
      walletStatus = wasUsed ? "removed" : "never_installed";
    }

    return {
      ...card,
      walletStatus,
      walletDevices: { apple, google, total },
    };
  });

  return NextResponse.json(enriched);
}
