import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAllCardsInProgram } from "@/lib/wallet/push";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const campaigns = await prisma.notificationCampaign.findMany({
    where: { merchantId: session.user.id },
    include: {
      program: { select: { name: true } },
      _count: { select: { logs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const {
    programId,
    name,
    message,
    triggerType,
    triggerConfig,
    targetSegment,
  } = body;

  if (!name || !message || !triggerType) {
    return NextResponse.json(
      { error: "Champs requis manquants" },
      { status: 400 }
    );
  }

  // Restrictions plan FREE
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } });
  const isFree = !user?.plan || user.plan === "FREE";
  if (isFree) {
    if (triggerType !== "IMMEDIATE") {
      return NextResponse.json({ error: "Le plan FREE ne permet que l'envoi immédiat." }, { status: 403 });
    }
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const campaignsThisMonth = await prisma.notificationCampaign.count({
      where: { merchantId: session.user.id, createdAt: { gte: startOfMonth } },
    });
    if (campaignsThisMonth >= 2) {
      return NextResponse.json({ error: "Le plan FREE est limité à 2 campagnes par mois." }, { status: 403 });
    }
  }

  // Vérifier que le programme appartient au commerçant
  if (programId) {
    const program = await prisma.loyaltyProgram.findFirst({
      where: { id: programId, merchantId: session.user.id },
    });
    if (!program) {
      return NextResponse.json(
        { error: "Programme introuvable" },
        { status: 404 }
      );
    }
  }

  const campaign = await prisma.notificationCampaign.create({
    data: {
      merchantId: session.user.id,
      programId: programId || undefined,
      name,
      message,
      triggerType,
      triggerConfig: triggerConfig || {},
      targetSegment: targetSegment || "ALL",
      status: triggerType === "IMMEDIATE" ? "SENT" : "SCHEDULED",
      scheduledAt:
        triggerType === "SCHEDULED" && triggerConfig?.sendAt
          ? new Date(triggerConfig.sendAt)
          : undefined,
    },
  });

  // Si envoi immédiat, envoyer maintenant
  if (triggerType === "IMMEDIATE" && programId) {
    const result = await notifyAllCardsInProgram(
      programId,
      message,
      targetSegment
    );

    await prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount: result.sent,
        sentAt: new Date(),
      },
    });

    return NextResponse.json(
      { ...campaign, sentCount: result.sent },
      { status: 201 }
    );
  }

  return NextResponse.json(campaign, { status: 201 });
}
