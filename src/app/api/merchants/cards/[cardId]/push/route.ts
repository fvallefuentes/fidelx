import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyPassUpdate } from "@/lib/wallet/push";

/**
 * POST /api/merchants/cards/[cardId]/push
 * Envoie une notification personnalisée à un client unique via son Wallet.
 * Le message est inscrit dans `lastMessage` (visible au verso du pass),
 * puis un push silencieux Apple/Google déclenche le refresh.
 */
export async function POST(
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

  const { message } = (await req.json()) as { message?: string };
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message requis" }, { status: 400 });
  }
  if (message.length > 240) {
    return NextResponse.json(
      { error: "Message trop long (max 240 caractères)" },
      { status: 400 }
    );
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      status: true,
      program: { select: { merchantId: true, name: true } },
    },
  });
  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }
  if (card.program.merchantId !== merchantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  if (card.status === "REVOKED" || card.status === "EXPIRED") {
    return NextResponse.json(
      { error: "Cette carte n'est plus active" },
      { status: 400 }
    );
  }

  // Mettre à jour le message visible au verso du pass + push
  await prisma.loyaltyCard.update({
    where: { id: card.id },
    data: { lastMessage: message.trim(), lastMessageAt: new Date() },
  });

  try {
    await notifyPassUpdate(card.id, {
      header: card.program.name,
      body: message.trim(),
    });
  } catch (e) {
    console.error("[card/push] notifyPassUpdate failed:", (e as Error).message);
  }

  // Logger une NotificationLog (campagne = null, c'est un envoi direct)
  await prisma.notificationLog.create({
    data: {
      cardId: card.id,
      delivered: true,
      deliveredAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
