import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const programs = await prisma.loyaltyProgram.findMany({
    where: { merchantId: session.user.id },
    select: { id: true },
  });

  const programIds = programs.map((p) => p.id);

  const cards = await prisma.loyaltyCard.findMany({
    where: { programId: { in: programIds } },
    include: {
      client: {
        select: { id: true, firstName: true, email: true, phone: true },
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

  // Enrichir avec le statut Wallet
  const enriched = cards.map((card) => {
    const apple = card.registrations.filter((r) => r.platform === "APPLE").length;
    const google = card.registrations.filter((r) => r.platform === "GOOGLE").length;
    const total = apple + google;

    let walletStatus: "installed" | "removed" | "never_installed";
    if (total > 0) walletStatus = "installed";
    else {
      // Si la carte a déjà été utilisée (visites > 0 ou tampons > 0),
      // c'est qu'elle a été installée puis supprimée
      const wasUsed = card.totalVisits > 0 || card.currentStamps > 0;
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
