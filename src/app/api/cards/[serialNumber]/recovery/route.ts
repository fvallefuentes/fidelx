import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateGoogleWalletLink } from "@/lib/wallet/google";

/**
 * Endpoint PUBLIC : information de récupération d'une carte.
 *
 * Sécurité : le serialNumber est un token aléatoire à ~62 bits d'entropie
 * (12 chars dans l'alphabet [A-Z0-9]), donc unguessable. Aucune donnée
 * sensible n'est exposée (pas d'email, pas de téléphone, juste prénom).
 *
 * Idempotence Wallet : redonner les mêmes URLs Apple/Google met à jour le
 * pass existant. La progression (tampons, points, visites) reste en DB.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ serialNumber: string }> }
) {
  const { serialNumber } = await params;

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    select: {
      id: true,
      serialNumber: true,
      currentStamps: true,
      currentPoints: true,
      cashbackBalance: true,
      totalVisits: true,
      status: true,
      client: {
        select: { firstName: true },
      },
      program: {
        select: {
          id: true,
          name: true,
          type: true,
          config: true,
          cardDesign: true,
          isActive: true,
          merchant: { select: { name: true } },
        },
      },
    },
  });

  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  // Cartes inutilisables → on renseigne mais on bloque le re-add
  const isRecoverable =
    card.program.isActive &&
    card.status !== "REVOKED" &&
    card.status !== "EXPIRED";

  // URLs Wallet — identiques à celles servies à l'inscription d'origine.
  // Apple/Google Wallet détectent le même passTypeId + serialNumber et
  // remplacent/mettent à jour le pass existant. Progression conservée.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.fidlify.com";
  const walletUrl = isRecoverable
    ? `${appUrl}/api/wallet/apple/${card.serialNumber}.pkpass`
    : null;
  const googleWalletUrl = isRecoverable
    ? await generateGoogleWalletLink(card.id)
    : null;

  return NextResponse.json({
    serialNumber: card.serialNumber,
    isRecoverable,
    status: card.status,
    client: { firstName: card.client.firstName },
    program: {
      name: card.program.name,
      type: card.program.type,
      config: card.program.config,
      cardDesign: card.program.cardDesign,
      merchant: { name: card.program.merchant.name },
    },
    progression: {
      currentStamps: card.currentStamps,
      currentPoints: card.currentPoints,
      cashbackBalance: card.cashbackBalance,
      totalVisits: card.totalVisits,
    },
    walletUrl,
    googleWalletUrl,
  });
}
