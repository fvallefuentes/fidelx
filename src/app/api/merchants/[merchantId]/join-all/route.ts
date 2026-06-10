import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateSerialNumber } from "@/lib/utils";
import { generateGoogleWalletLink } from "@/lib/wallet/google";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";
import {
  buildDeviceCookieHeader,
  extractContext,
  newDeviceCookieValue,
} from "@/lib/anti-abuse/fingerprint";
import { evaluateRateLimits } from "@/lib/anti-abuse/rate-limit";
import { createMerchantNotification } from "@/lib/notifications/merchant";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { parseJsonBody } from "@/lib/api/validation";

/**
 * POST /api/merchants/[merchantId]/join-all
 *
 * Inscrit un client à plusieurs programmes de fidélité d'un même merchant
 * en un seul appel. Le client choisit côté UI quels programmes rejoindre
 * (cases à cocher).
 *
 * Comportement :
 *  - Lookup/create du Client par email ou téléphone (1 seul Client peu
 *    importe le nb de cartes)
 *  - Pour chaque programmeId sélectionné :
 *      * Vérifie qu'il appartient bien au merchant + est actif
 *      * Skip si une carte existe déjà (pas de duplication)
 *      * Sinon crée la carte (status PENDING) + génère les liens Wallet
 *  - Notification merchant groupée : "X a rejoint N programme(s)"
 *  - Réponse : { cards: [{ programName, walletUrl, googleWalletUrl, ... }] }
 */

const schema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(50),
  email: z.string().trim().toLowerCase().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format date invalide")
    .optional()
    .or(z.literal(""))
    // Refuser les dates futures ou < 1900. Un client peut bypasser le max= de
    // l'<input> côté front en éditant le DOM — on revalide donc côté API.
    .refine(
      (v) => {
        if (!v) return true;
        const d = new Date(v);
        if (isNaN(d.getTime())) return false;
        if (d.getFullYear() < 1900) return false;
        return d.getTime() <= Date.now();
      },
      { message: "Date de naissance future : refusée" },
    ),
  programIds: z.array(z.string().trim().min(1)).min(1, "Au moins 1 programme requis").max(20),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const { merchantId } = await params;

  // ─── Anti-abus : contexte d'identification ───
  const ctx = extractContext(req);
  const deviceCookie = ctx.deviceCookie ?? newDeviceCookieValue();
  const setCookie = !ctx.deviceCookie;
  const responseHeaders: Record<string, string> = {};
  if (setCookie) {
    responseHeaders["Set-Cookie"] = buildDeviceCookieHeader(deviceCookie);
  }

  // ─── Validation body (on parse avant rate-limit pour avoir email/phone) ───
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const { firstName, programIds } = parsed.data;
  const email = parsed.data.email ? normalizeEmail(parsed.data.email) : null;
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  const birthDate = parsed.data.birthDate ? new Date(parsed.data.birthDate) : null;

  // ─── Rate limit (clé sur le 1er programme sélectionné — l'IP/cookie/fingerprint
  // restent les vraies barrières même si l'attacker alterne les programmes) ───
  const rateVerdict = await evaluateRateLimits({
    programId: programIds[0],
    ipPrefix: ctx.ipPrefix,
    email,
    phone,
    deviceCookie,
    fingerprint: ctx.fingerprint,
  });
  if (!rateVerdict.ok) {
    return NextResponse.json(
      {
        error: "Trop de tentatives. Réessayez plus tard.",
        retryAfterSeconds: rateVerdict.retryAfterSeconds,
      },
      { status: 429, headers: responseHeaders }
    );
  }

  if (!email && !phone) {
    return NextResponse.json(
      { error: "Email ou téléphone requis" },
      { status: 400, headers: responseHeaders }
    );
  }

  // ─── Vérif merchant + récupération des programmes demandés ───
  const merchant = await prisma.user.findUnique({
    where: { id: merchantId },
    select: { id: true, name: true, suspendedAt: true },
  });
  if (!merchant || merchant.suspendedAt) {
    return NextResponse.json(
      { error: "Commerçant introuvable" },
      { status: 404, headers: responseHeaders }
    );
  }

  const programs = await prisma.loyaltyProgram.findMany({
    where: {
      id: { in: programIds },
      merchantId: merchant.id,
      isActive: true,
    },
    select: { id: true, name: true, type: true, config: true },
  });
  if (programs.length === 0) {
    return NextResponse.json(
      { error: "Aucun programme valide" },
      { status: 400, headers: responseHeaders }
    );
  }

  // ─── Lookup/create client ───
  // On cherche d'abord par email (priorité), sinon par téléphone.
  // Client.email n'est pas @unique → findFirst.
  let client = email
    ? await prisma.client.findFirst({ where: { email } })
    : null;
  if (!client && phone) {
    client = await prisma.client.findFirst({ where: { phone } });
  }

  if (!client) {
    client = await prisma.client.create({
      data: {
        firstName,
        email: email ?? undefined,
        phone: phone ?? undefined,
        birthDate: birthDate ?? undefined,
      },
    });
  } else if (birthDate && !client.birthDate) {
    client = await prisma.client.update({
      where: { id: client.id },
      data: { birthDate },
    });
  }

  // ─── Création des cartes (skip celles qui existent déjà) ───
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.fidlify.com";
  type CardResult = {
    programId: string;
    programName: string;
    serialNumber: string;
    walletUrl: string;
    googleWalletUrl: string | null;
    alreadyExisted: boolean;
  };
  const results: CardResult[] = [];

  for (const program of programs) {
    let card = await prisma.loyaltyCard.findUnique({
      where: { clientId_programId: { clientId: client.id, programId: program.id } },
      select: { id: true, serialNumber: true },
    });

    const alreadyExisted = !!card;

    if (!card) {
      const serialNumber = generateSerialNumber();
      card = await prisma.loyaltyCard.create({
        data: {
          clientId: client.id,
          programId: program.id,
          serialNumber,
        },
        select: { id: true, serialNumber: true },
      });

      // Notification merchant + analytics par carte créée
      void createMerchantNotification({
        merchantId: merchant.id,
        type: "CLIENT_SIGNUP",
        title: `Nouveau client : ${client.firstName}`,
        body: `S'est inscrit à « ${program.name} »`,
        link: `/dashboard/clients/${card.id}`,
        metadata: { cardId: card.id },
      });

      void trackServerEvent(merchant.id, "card.distributed", {
        programId: program.id,
        cardId: card.id,
        programType: program.type,
        source: "join-all",
      });
    }

    const googleWalletUrl = await generateGoogleWalletLink(card.id).catch(() => null);
    results.push({
      programId: program.id,
      programName: program.name,
      serialNumber: card.serialNumber,
      walletUrl: `${appUrl}/api/wallet/apple/${card.serialNumber}.pkpass`,
      googleWalletUrl,
      alreadyExisted,
    });
  }

  return NextResponse.json(
    {
      ok: true,
      clientFirstName: client.firstName,
      cards: results,
      createdCount: results.filter((r) => !r.alreadyExisted).length,
      existingCount: results.filter((r) => r.alreadyExisted).length,
    },
    { status: 201, headers: responseHeaders }
  );
}
