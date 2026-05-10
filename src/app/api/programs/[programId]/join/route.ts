import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSerialNumber } from "@/lib/utils";
import { generateGoogleWalletLink } from "@/lib/wallet/google";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";
import { sendRecoveryEmail } from "@/lib/email/recovery";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { programId } = await params;

  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId, isActive: true },
    include: {
      merchant: { select: { plan: true, name: true } },
      _count: { select: { cards: true } },
    },
  });

  if (!program) {
    return NextResponse.json(
      { error: "Programme introuvable" },
      { status: 404 }
    );
  }

  // Vérifier la limite du plan gratuit (50 clients)
  if (program.merchant.plan === "FREE" && program._count.cards >= 50) {
    return NextResponse.json(
      { error: "Ce programme a atteint sa limite de clients" },
      { status: 403 }
    );
  }

  const {
    firstName,
    email: rawEmail,
    phone: rawPhone,
    referralCode,
  } = await req.json();

  if (!firstName) {
    return NextResponse.json(
      { error: "Le prénom est requis" },
      { status: 400 }
    );
  }

  // Normalisation : lowercase email + Gmail dots/aliases, phone E.164
  const email = normalizeEmail(rawEmail);
  const phone = normalizePhone(rawPhone);

  if (!email && !phone) {
    return NextResponse.json(
      { error: "Un email ou téléphone est requis" },
      { status: 400 }
    );
  }

  // Chercher le client existant (cross-merchant : un client peut avoir N
  // cartes pour N programmes différents — la contrainte unique est sur
  // (clientId, programId), pas sur clientId seul).
  let client = null;
  if (email) {
    client = await prisma.client.findFirst({ where: { email } });
  }
  if (!client && phone) {
    client = await prisma.client.findFirst({ where: { phone } });
  }

  if (!client) {
    client = await prisma.client.create({
      data: { firstName, email, phone },
    });
  }

  // Vérifier si le client a déjà une carte pour CE programme spécifique
  const existingCard = await prisma.loyaltyCard.findUnique({
    where: {
      clientId_programId: {
        clientId: client.id,
        programId,
      },
    },
  });

  if (existingCard) {
    // Privacy-safe : si on a un email, on envoie un lien de récupération
    // automatiquement. Réponse API opaque (toujours 409 même si pas d'email)
    // pour empêcher l'énumération.
    if (email) {
      // Fire-and-forget — on ne bloque pas la réponse sur l'envoi
      void sendRecoveryEmail({
        toEmail: email,
        firstName: client.firstName,
        programName: program.name,
        merchantName: program.merchant.name ?? "votre commerce",
        serialNumber: existingCard.serialNumber,
      });
    }
    return NextResponse.json(
      {
        error: "Vous avez déjà une carte pour ce programme",
        recoveryEmailSent: !!email,
      },
      { status: 409 }
    );
  }

  // Traiter le parrainage si un code est fourni
  let referralBonus = 0;
  if (referralCode) {
    const referralLink = await prisma.referralLink.findUnique({
      where: { code: referralCode },
    });
    if (referralLink && referralLink.uses < referralLink.maxUses) {
      referralBonus = referralLink.bonusReferee;

      await prisma.referralLink.update({
        where: { id: referralLink.id },
        data: { uses: { increment: 1 } },
      });

      if (referralLink.cardId) {
        await prisma.loyaltyCard.update({
          where: { id: referralLink.cardId },
          data: {
            currentStamps: { increment: referralLink.bonusReferrer },
            currentPoints: { increment: referralLink.bonusReferrer },
          },
        });

        await prisma.transaction.create({
          data: {
            cardId: referralLink.cardId,
            type: "REFERRAL_BONUS",
            value: referralLink.bonusReferrer,
            notes: `Parrainage de ${firstName}`,
          },
        });
      }

      await prisma.client.update({
        where: { id: client.id },
        data: { referredById: referralLink.clientId },
      });
    }
  }

  const serialNumber = generateSerialNumber();

  const card = await prisma.loyaltyCard.create({
    data: {
      clientId: client.id,
      programId,
      serialNumber,
      currentStamps: referralBonus,
      currentPoints: referralBonus,
    },
  });

  if (referralBonus > 0) {
    await prisma.transaction.create({
      data: {
        cardId: card.id,
        type: "REFERRAL_BONUS",
        value: referralBonus,
        notes: "Bonus de parrainage à l'inscription",
      },
    });
  }

  // Apple Wallet URL — l'extension .pkpass est requise pour que iOS Safari
  // reconnaisse la réponse comme un pass Wallet (sinon page blanche).
  const walletUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/wallet/apple/${card.serialNumber}.pkpass`;

  // Google Wallet URL
  const googleWalletUrl = await generateGoogleWalletLink(card.id);

  return NextResponse.json(
    {
      cardId: card.id,
      serialNumber: card.serialNumber,
      walletUrl,
      googleWalletUrl,
    },
    { status: 201 }
  );
}
