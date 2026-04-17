import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyPassUpdate } from "@/lib/wallet/push";

// GET — liste les devices enregistrés pour toutes les cartes du commerçant
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const cards = await prisma.loyaltyCard.findMany({
    where: { program: { merchantId: session.user.id } },
    include: {
      client: { select: { firstName: true } },
      program: { select: { name: true } },
      registrations: { select: { platform: true, deviceLibraryId: true, registeredAt: true } },
    },
  });

  return NextResponse.json(
    cards.map((c) => ({
      serialNumber: c.serialNumber,
      client: c.client.firstName,
      program: c.program.name,
      registrations: c.registrations.length,
      devices: c.registrations.map((r) => ({
        platform: r.platform,
        deviceId: r.deviceLibraryId.slice(0, 12) + "...",
        registeredAt: r.registeredAt,
      })),
    }))
  );
}

// POST — envoie un push test à une carte spécifique
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { serialNumber } = await req.json();

  const card = await prisma.loyaltyCard.findFirst({
    where: {
      serialNumber,
      program: { merchantId: session.user.id },
    },
  });

  if (!card) return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });

  await prisma.loyaltyCard.update({
    where: { id: card.id },
    data: { lastMessage: "🎉 Test notification FidelX !" },
  });

  const results = await notifyPassUpdate(card.id);
  const sent = results.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({ sent, total: results.length, results: results.map((r) => r.status) });
}
