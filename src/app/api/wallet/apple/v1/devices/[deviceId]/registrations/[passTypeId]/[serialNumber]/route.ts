import { NextResponse } from "next/server";
import { registerDevice, unregisterDevice } from "@/lib/wallet/apple";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ deviceId: string; passTypeId: string; serialNumber: string }>;

function verifyToken(req: Request, serialNumber: string): boolean {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("ApplePass ", "").trim();
  const expected = serialNumber.replace(/-/g, "") + "0000";
  return token === expected;
}

// POST — enregistrement du device (Apple appelle ceci quand le client ajoute la carte)
export async function POST(req: Request, { params }: { params: Params }) {
  const { deviceId, serialNumber } = await params;

  if (!verifyToken(req, serialNumber)) {
    return new NextResponse(null, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const pushToken = body.pushToken;

  if (!pushToken) {
    return new NextResponse(null, { status: 400 });
  }

  const card = await prisma.loyaltyCard.findUnique({ where: { serialNumber } });
  if (!card) return new NextResponse(null, { status: 404 });

  const existing = await prisma.passRegistration.findFirst({
    where: { cardId: card.id, deviceLibraryId: deviceId },
  });

  await registerDevice(deviceId, pushToken, serialNumber);

  return new NextResponse(null, { status: existing ? 200 : 201 });
}

// DELETE — désenregistrement du device
export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { deviceId, serialNumber } = await params;
  await unregisterDevice(deviceId, serialNumber);
  return new NextResponse(null, { status: 200 });
}
