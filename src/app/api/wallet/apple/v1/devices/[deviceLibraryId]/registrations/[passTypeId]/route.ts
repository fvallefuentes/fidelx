import { NextResponse } from "next/server";
import { getApplePassUpdatedAt } from "@/lib/wallet/apple-version";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Apple Wallet — list passes that have been updated since `passesUpdatedSince`
 * for a given device.
 *
 * GET /api/wallet/apple/v1/devices/{deviceLibraryId}/registrations/{passTypeId}
 * Query: ?passesUpdatedSince={tag}
 *
 * Appelé par iOS quand il reçoit un push silencieux pour savoir quels
 * passes ont changé. On retourne les serials et un tag de version.
 */
export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      deviceLibraryId: string;
      passTypeId: string;
    }>;
  }
) {
  const { deviceLibraryId } = await params;
  const { searchParams } = new URL(req.url);
  const since = searchParams.get("passesUpdatedSince");

  // Toutes les cartes pour ce device
  const regs = await prisma.passRegistration.findMany({
    where: { deviceLibraryId, platform: "APPLE" },
    include: {
      card: {
        select: {
          serialNumber: true,
          updatedAt: true,
          program: {
            select: {
              updatedAt: true,
              merchant: { select: { updatedAt: true } },
              establishment: {
                select: { latitude: true, longitude: true },
              },
            },
          },
        },
      },
    },
  });

  if (regs.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  // Filtre par "modifié depuis" si fourni
  const registeredCards = regs.map((r) => r.card);
  let cards = registeredCards;
  if (since) {
    const sinceDate = new Date(parseInt(since));
    if (!isNaN(sinceDate.getTime())) {
      cards = registeredCards.filter(
        (c) => getApplePassUpdatedAt(c).getTime() > sinceDate.getTime()
      );
    }
  }

  if (cards.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  const lastUpdated = Math.max(
    ...cards.map((c) => getApplePassUpdatedAt(c).getTime())
  );

  return NextResponse.json({
    lastUpdated: String(lastUpdated),
    serialNumbers: cards.map((c) => c.serialNumber),
  });
}
