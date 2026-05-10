import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/merchants/cards/[cardId]
 * Profil détaillé d'un client / sa carte. Timeline + RFM stats + notes.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { cardId } = await params;
  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    include: {
      client: true,
      program: {
        include: { merchant: { select: { id: true, name: true } } },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          establishment: { select: { name: true } },
        },
      },
      rewardClaims: {
        orderBy: { claimedAt: "desc" },
        include: { reward: { select: { name: true } } },
        take: 20,
      },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { campaign: { select: { name: true, message: true } } },
      },
      registrations: {
        select: { platform: true, registeredAt: true },
      },
    },
  });

  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }
  if (card.program.merchantId !== merchantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Stats RFM
  const txs = card.transactions;
  const visitTxs = txs.filter(
    (t) =>
      t.type === "STAMP" ||
      t.type === "POINTS_EARN" ||
      t.type === "CASHBACK_EARN"
  );
  const recencyDays = card.lastVisitAt
    ? Math.floor(
        (Date.now() - card.lastVisitAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  // Fréquence approximative : visites par mois depuis l'inscription
  const monthsSinceJoin = Math.max(
    1,
    (Date.now() - card.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const frequencyPerMonth =
    Math.round((card.totalVisits / monthsSinceJoin) * 10) / 10;

  // Montant moyen par visite
  const avgPerVisit =
    card.totalVisits > 0 ? card.totalSpent / card.totalVisits : 0;

  return NextResponse.json({
    card: {
      id: card.id,
      serialNumber: card.serialNumber,
      status: card.status,
      currentStamps: card.currentStamps,
      currentPoints: card.currentPoints,
      cashbackBalance: card.cashbackBalance,
      totalVisits: card.totalVisits,
      totalSpent: card.totalSpent,
      lastVisitAt: card.lastVisitAt,
      lastMessage: card.lastMessage,
      lastMessageAt: card.lastMessageAt,
      merchantNotes: card.merchantNotes,
      createdAt: card.createdAt,
    },
    client: {
      id: card.client.id,
      firstName: card.client.firstName,
      email: card.client.email,
      phone: card.client.phone,
      birthDate: card.client.birthDate,
      preferredLang: card.client.preferredLang,
      createdAt: card.client.createdAt,
    },
    program: {
      id: card.program.id,
      name: card.program.name,
      type: card.program.type,
      config: card.program.config,
    },
    rfm: {
      recencyDays,
      frequencyPerMonth,
      avgPerVisit: Math.round(avgPerVisit * 100) / 100,
      visitCount: visitTxs.length,
    },
    wallet: {
      devices: card.registrations.length,
      apple: card.registrations.filter((r) => r.platform === "APPLE").length,
      google: card.registrations.filter((r) => r.platform === "GOOGLE").length,
      registrations: card.registrations.map((r) => ({
        platform: r.platform,
        registeredAt: r.registeredAt,
      })),
    },
    transactions: txs.map((t) => ({
      id: t.id,
      type: t.type,
      value: t.value,
      amountSpent: t.amountSpent,
      notes: t.notes,
      establishment: t.establishment?.name ?? null,
      createdAt: t.createdAt,
    })),
    rewards: card.rewardClaims.map((rc) => ({
      id: rc.id,
      name: rc.reward.name,
      status: rc.status,
      claimedAt: rc.claimedAt,
      redeemedAt: rc.redeemedAt,
    })),
    campaigns: card.notifications.map((n) => ({
      id: n.id,
      delivered: n.delivered,
      deliveredAt: n.deliveredAt,
      createdAt: n.createdAt,
      campaign: n.campaign
        ? { name: n.campaign.name, message: n.campaign.message }
        : null,
    })),
  });
}

/**
 * PATCH /api/merchants/cards/[cardId]
 * Mise à jour des notes commerçant uniquement (free text).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { cardId } = await params;
  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      program: { select: { merchantId: true } },
    },
  });
  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }
  if (card.program.merchantId !== merchantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = (await req.json()) as { merchantNotes?: string | null };
  if (typeof body.merchantNotes === "undefined") {
    return NextResponse.json({ error: "merchantNotes requis" }, { status: 400 });
  }

  const updated = await prisma.loyaltyCard.update({
    where: { id: cardId },
    data: {
      merchantNotes:
        body.merchantNotes === null ? null : String(body.merchantNotes),
    },
    select: { merchantNotes: true },
  });

  return NextResponse.json(updated);
}
