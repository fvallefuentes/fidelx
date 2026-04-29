import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerDevice, unregisterDevice } from "@/lib/wallet/apple";

export const dynamic = "force-dynamic";

/**
 * Apple Wallet — register device for pass
 * POST /api/wallet/apple/v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serialNumber}
 *
 * Appelé par iOS automatiquement quand l'utilisateur ajoute le pass au
 * Wallet. Body JSON: { "pushToken": "..." }. Sans cette route, iOS reçoit
 * 404 et n'enregistre JAMAIS de device → impossible de pousser des notifs.
 */
export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      deviceLibraryId: string;
      passTypeId: string;
      serialNumber: string;
    }>;
  }
) {
  const { deviceLibraryId, serialNumber } = await params;

  // Auth iOS : "Authorization: ApplePass <authToken>"
  if (!(await checkAuth(req, serialNumber))) {
    return new NextResponse(null, { status: 401 });
  }

  let body: { pushToken?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!body.pushToken) return new NextResponse(null, { status: 400 });

  // Vérifier si déjà enregistré
  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    select: { id: true },
  });
  if (!card) return new NextResponse(null, { status: 404 });

  const existing = await prisma.passRegistration.findUnique({
    where: {
      cardId_deviceLibraryId: { cardId: card.id, deviceLibraryId },
    },
  });

  await registerDevice(deviceLibraryId, body.pushToken, serialNumber);

  // 201 si nouveau, 200 si déjà existant
  return new NextResponse(null, { status: existing ? 200 : 201 });
}

/**
 * Apple Wallet — unregister device for pass
 * DELETE /api/wallet/apple/v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serialNumber}
 */
export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      deviceLibraryId: string;
      passTypeId: string;
      serialNumber: string;
    }>;
  }
) {
  const { deviceLibraryId, serialNumber } = await params;

  if (!(await checkAuth(req, serialNumber))) {
    return new NextResponse(null, { status: 401 });
  }

  await unregisterDevice(deviceLibraryId, serialNumber);
  return new NextResponse(null, { status: 200 });
}

/**
 * Vérifie l'en-tête Authorization: ApplePass <token>.
 * Doit matcher le authenticationToken qu'on a mis dans le pass body.
 */
async function checkAuth(req: Request, serialNumber: string): Promise<boolean> {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^ApplePass\s+(.+)$/);
  if (!m) return false;
  const token = m[1].trim();
  // Algorithme du authenticationToken : serial sans tirets + "0000"
  const expected = serialNumber.replace(/-/g, "") + "0000";
  return token === expected;
}
