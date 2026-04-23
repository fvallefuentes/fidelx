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

  return NextResponse.json({
    clientName: card.client.firstName,
    programName: card.program.name,
    merchantName: card.program.merchant.name || "Commerce",
    programType: card.program.type,
    currentStamps: card.currentStamps,
    maxStamps: (config.maxStamps as number) || 10,
    currentPoints: card.currentPoints,
    status: card.status,
  });
}