import { NextResponse } from "next/server";
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
        select: { serialNumber: true, updatedAt: true },
      },
    },
  });

  if (regs.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  // Filtre par "modifié depuis" si fourni
  let cards = regs.map((r) => r.card);
  if (since) {
    const sinceDate = new Date(parseInt(since));
    if (!isNaN(sinceDate.getTime())) {
      cards = cards.filter((c) => c.updatedAt > sinceDate);
    }
  }

  if (cards.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  const lastUpdated = Math.max(...cards.map((c) => c.updatedAt.getTime()));

  return NextResponse.json({
    lastUpdated: String(lastUpdated),
    serialNumbers: cards.map((c) => c.serialNumber),
  });
}
