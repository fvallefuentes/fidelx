import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { canExpireCard } from "@/lib/card-lifecycle";
import { prisma } from "@/lib/prisma";
import { notifyPassUpdate } from "@/lib/wallet/push";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { cardId } = await params;
  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;
  const card = await prisma.loyaltyCard.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      status: true,
      program: { select: { merchantId: true } },
    },
  });

  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }
  if (card.program.merchantId !== merchantId) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }
  if (card.status === "EXPIRED") {
    return NextResponse.json({ status: "EXPIRED", alreadyExpired: true });
  }
  if (!canExpireCard(card.status)) {
    return NextResponse.json(
      { error: "Cette carte ne peut plus etre modifiee." },
      { status: 409 }
    );
  }

  const updated = await prisma.loyaltyCard.updateMany({
    where: {
      id: card.id,
      status: { notIn: ["EXPIRED", "REVOKED"] },
    },
    data: { status: "EXPIRED" },
  });
  if (updated.count === 0) {
    return NextResponse.json(
      { error: "La carte vient deja d'etre desactivee." },
      { status: 409 }
    );
  }

  const walletSync = await notifyPassUpdate(card.id);

  return NextResponse.json({
    status: "EXPIRED",
    walletSync: {
      appleNotified: walletSync.applePushSent,
      googleUpdated: walletSync.googleObjectUpdated,
      errors: walletSync.errors,
    },
  });
}
