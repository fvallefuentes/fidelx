import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSerialNumber } from "@/lib/utils";
import { generateGoogleWalletLink } from "@/lib/wallet/google";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";
import { sendRecoveryEmail } from "@/lib/email/recovery";
import {
  buildDeviceCookieHeader,
  extractContext,
  newDeviceCookieValue,
} from "@/lib/anti-abuse/fingerprint";
import { evaluateRateLimits } from "@/lib/anti-abuse/rate-limit";
import { createMerchantNotification } from "@/lib/notifications/merchant";
import { trackServerEvent } from "@/lib/analytics/posthog-server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { programId } = await params;

  // ─── Anti-abus : extraire le contexte d'identification ───
  const ctx = extractContext(req);
  const deviceCookie = ctx.deviceCookie ?? newDeviceCookieValue();
  const setCookie = !ctx.deviceCookie; // on doit poser le cookie sur la réponse

  const responseHeaders: Record<string, string> = {};
  if (setCookie) {
    responseHeaders["Set-Cookie"] = buildDeviceCookieHeader(deviceCookie);
  }

  // Helper pour logger une tentative + retourner une réponse JSON
  async function respond(
    body: Record<string, unknown>,
    init: { status: number },
    log: {
      result:
        | "SUCCESS"
        | "RATE_LIMITED"
        | "DUPLICATE_RECOVERY"
        | "PROGRAM_FULL"
        | "PROGRAM_NOT_FOUND"
        | "VALIDATION_ERROR";
      blockedReason?: string;
      cardId?: string;
      email?: string | null;
      phone?: string | null;
    }
  ) {
    try {
      await prisma.joinAttempt.create({
        data: {
          programId,
          ipPrefix: ctx.ipPrefix,
          userAgent: ctx.userAgent,
          deviceCookie,
          fingerprint: ctx.fingerprint,
          email: log.email ?? null,
          phone: log.phone ?? null,
          cardId: log.cardId ?? null,
          result: log.result,
          blockedReason: log.blockedReason ?? null,
        },
      });
    } catch (e) {
      // Le logging ne doit jamais bloquer la réponse client
      console.error("[joinAttempt log] failed:", (e as Error).message);
    }
    return NextResponse.json(body, { status: init.status, headers: responseHeaders });
  }

  // ─── Vérif programme ───
  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId, isActive: true },
    include: {
      merchant: { select: { plan: true, name: true } },
      _count: { select: { cards: true } },
    },
  });

  if (!program) {
    return respond(
      { error: "Programme introuvable" },
      { status: 404 },
      { result: "PROGRAM_NOT_FOUND" }
    );
  }

  // Plan FREE : limite 50 clients
  if (program.merchant.plan === "FREE" && program._count.cards >= 50) {
    return respond(
      { error: "Ce programme a atteint sa limite de clients" },
      { status: 403 },
      { result: "PROGRAM_FULL" }
    );
  }

  // ─── Validation input ───
  const {
    firstName,
    email: rawEmail,
    phone: rawPhone,
    birthDate: rawBirthDate,
    referralCode,
  } = await req.json();

  if (!firstName) {
    return respond(
      { error: "Le prénom est requis" },
      { status: 400 },
      { result: "VALIDATION_ERROR", blockedReason: "missing_first_name" }
    );
  }

  const email = normalizeEmail(rawEmail);
  const phone = normalizePhone(rawPhone);

  // Parse birthDate : YYYY-MM-DD → Date à minuit UTC. Bornes : 1900..aujourd'hui
  let birthDate: Date | null = null;
  if (rawBirthDate && typeof rawBirthDate === "string") {
    const parsed = new Date(rawBirthDate);
    if (
      !isNaN(parsed.getTime()) &&
      parsed.getFullYear() >= 1900 &&
      parsed.getTime() <= Date.now()
    ) {
      birthDate = parsed;
    }
  }

  if (!email && !phone) {
    return respond(
      { error: "Un email ou téléphone est requis" },
      { status: 400 },
      { result: "VALIDATION_ERROR", blockedReason: "missing_email_phone" }
    );
  }

  // ─── Rate limiting ───
  const rl = await evaluateRateLimits({
    programId,
    ipPrefix: ctx.ipPrefix,
    email,
    phone,
    deviceCookie,
    fingerprint: ctx.fingerprint,
  });
  if (!rl.ok) {
    return respond(
      {
        error:
          "Trop de tentatives d'inscription. Veuillez réessayer dans quelques minutes.",
      },
      { status: 429 },
      {
        result: "RATE_LIMITED",
        blockedReason: rl.rule,
        email,
        phone,
      }
    );
  }

  // ─── Lookup client (cross-merchant : un client peut avoir N cartes pour
  //   N programmes différents — la contrainte unique est sur (clientId, programId)) ───
  let client = null;
  if (email) {
    client = await prisma.client.findFirst({ where: { email } });
  }
  if (!client && phone) {
    client = await prisma.client.findFirst({ where: { phone } });
  }

  if (!client) {
    client = await prisma.client.create({
      data: { firstName, email, phone, birthDate },
    });
  } else if (birthDate && !client.birthDate) {
    // Le client existe déjà mais n'a pas de date d'anniversaire → on l'enregistre
    client = await prisma.client.update({
      where: { id: client.id },
      data: { birthDate },
    });
  }

  // ─── Vérif carte existante pour CE programme ───
  const existingCard = await prisma.loyaltyCard.findUnique({
    where: { clientId_programId: { clientId: client.id, programId } },
  });

  if (existingCard) {
    if (email) {
      void sendRecoveryEmail({
        toEmail: email,
        firstName: client.firstName,
        programName: program.name,
        merchantName: program.merchant.name ?? "votre commerce",
        serialNumber: existingCard.serialNumber,
      });
    }
    return respond(
      {
        error: "Vous avez déjà une carte pour ce programme",
        recoveryEmailSent: !!email,
      },
      { status: 409 },
      { result: "DUPLICATE_RECOVERY", email, phone, cardId: existingCard.id }
    );
  }

  // ─── Parrainage (optionnel) ───
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

  // ─── Création de la carte (status PENDING par défaut) ───
  // La carte ne deviendra ACTIVE qu'au premier scan en boutique par
  // le commerçant ou un staff (cf. /api/transactions/stamp).
  const serialNumber = generateSerialNumber();
  const card = await prisma.loyaltyCard.create({
    data: {
      clientId: client.id,
      programId,
      serialNumber,
      currentStamps: referralBonus,
      currentPoints: referralBonus,
      // status: PENDING (default)
    },
  });

  // Analytics : un client a rejoint un programme. Distinct ID = merchantId
  // pour attribuer la métrique au merchant. clientId reste anonyme.
  void trackServerEvent(program.merchantId, "card.distributed", {
    programId,
    cardId: card.id,
    programType: program.type,
    hasReferralBonus: referralBonus > 0,
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

  // ─── URLs Wallet (Apple .pkpass + Google JWT link) ───
  const walletUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/wallet/apple/${card.serialNumber}.pkpass`;
  const googleWalletUrl = await generateGoogleWalletLink(card.id);

  // Notification in-app commerçant : nouveau client inscrit
  void createMerchantNotification({
    merchantId: program.merchantId,
    type: "CLIENT_SIGNUP",
    title: `Nouveau client : ${client.firstName}`,
    body: `Inscrit·e au programme « ${program.name} »`,
    link: `/dashboard/clients/${card.id}`,
    metadata: { cardId: card.id, clientId: client.id, programId },
  });

  return respond(
    {
      cardId: card.id,
      serialNumber: card.serialNumber,
      walletUrl,
      googleWalletUrl,
    },
    { status: 201 },
    { result: "SUCCESS", cardId: card.id, email, phone }
  );
}
