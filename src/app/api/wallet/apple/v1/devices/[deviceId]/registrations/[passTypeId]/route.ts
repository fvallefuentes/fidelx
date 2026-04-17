import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ deviceId: string; passTypeId: string }>;

// GET — retourne les serial numbers mis à jour depuis lastUpdated
export async function GET(req: Request, { params }: { params: Params }) {
  const { deviceId } = await params;
  const url = new URL(req.url);
  const passesUpdatedSince = url.searchParams.get("passesUpdatedSince");

  const registrations = await prisma.passRegistration.findMany({
    where: { deviceLibraryId: deviceId },
    include: { card: { select: { serialNumber: true, updatedAt: true } } },
  });

  if (registrations.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  let cards = registrations.map((r) => r.card);

  if (passesUpdatedSince) {
    const since = new Date(passesUpdatedSince);
    cards = cards.filter((c) => c.updatedAt > since);
  }

  if (cards.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({
    serialNumbers: cards.map((c) => c.serialNumber),
    lastUpdated: new Date().toISOString(),
  });
}
