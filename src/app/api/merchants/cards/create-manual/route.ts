import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSerialNumber } from "@/lib/utils";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";
import { getPlanLimits, countActiveCards } from "@/lib/plan-limits";
import { parseJsonBody } from "@/lib/api/validation";
import { trackServerEvent } from "@/lib/analytics/posthog-server";

/**
 * POST /api/merchants/cards/create-manual
 *
 * Création d'une carte par le commerçant pour un client sans smartphone
 * (typiquement un senior). Aucun email/téléphone n'est requis — le merchant
 * gère tout côté dashboard. Différences avec /programs/[id]/join :
 *
 *  - Pas de QR public / wallet pass généré (le client n'en a pas l'usage)
 *  - Pas de rate-limit / device fingerprint (c'est le merchant authentifié)
 *  - Statut ACTIVE direct (pas de PENDING — il n'y a pas de phase de scan
 *    par le merchant à venir puisque c'est lui qui crée la carte)
 *  - Champ lastName collecté pour distinguer plusieurs clients du même prénom
 *    dans la recherche manuelle du scan
 */

const schema = z.object({
  programId: z.string().trim().min(1, "Programme requis"),
  firstName: z.string().trim().min(1, "Prénom requis").max(50),
  lastName: z.string().trim().min(1, "Nom requis").max(50),
  email: z.string().trim().toLowerCase().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format date invalide")
    .optional()
    .or(z.literal(""))
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
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) return parsed.response;
  const { programId, firstName, lastName } = parsed.data;
  const email = parsed.data.email ? normalizeEmail(parsed.data.email) : null;
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  const birthDate = parsed.data.birthDate
    ? new Date(parsed.data.birthDate)
    : null;

  // ─── Vérif programme ───
  const program = await prisma.loyaltyProgram.findFirst({
    where: { id: programId, merchantId, isActive: true },
    select: { id: true, name: true },
  });
  if (!program) {
    return NextResponse.json(
      { error: "Programme introuvable ou inactif" },
      { status: 404 },
    );
  }

  // ─── Limite cartes actives du plan ───
  const merchant = await prisma.user.findUnique({
    where: { id: merchantId },
    select: { plan: true },
  });
  const limits = getPlanLimits(merchant?.plan);
  if (limits.maxActiveCards !== null) {
    const activeCount = await countActiveCards(merchantId);
    if (activeCount >= limits.maxActiveCards) {
      return NextResponse.json(
        {
          error: `Votre plan est limité à ${limits.maxActiveCards} cartes actives. Passez à un plan supérieur pour en créer plus.`,
        },
        { status: 403 },
      );
    }
  }

  // ─── Lookup / create client ───
  // Si email ou téléphone fourni, on essaie de réutiliser un client existant
  // pour éviter les doublons. Sinon on crée un nouveau client à chaque fois
  // (même nom = personnes différentes par défaut).
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
        lastName,
        email: email ?? undefined,
        phone: phone ?? undefined,
        birthDate: birthDate ?? undefined,
      },
    });
  } else {
    // Client existant : on enrichit avec lastName / birthDate s'ils manquent
    const updates: { lastName?: string; birthDate?: Date } = {};
    if (!client.lastName && lastName) updates.lastName = lastName;
    if (!client.birthDate && birthDate) updates.birthDate = birthDate;
    if (Object.keys(updates).length > 0) {
      client = await prisma.client.update({
        where: { id: client.id },
        data: updates,
      });
    }
  }

  // ─── Création (ou récupération) de la carte ───
  let card = await prisma.loyaltyCard.findUnique({
    where: { clientId_programId: { clientId: client.id, programId } },
    select: { id: true, serialNumber: true, status: true },
  });

  const alreadyExisted = !!card;
  if (!card) {
    card = await prisma.loyaltyCard.create({
      data: {
        clientId: client.id,
        programId,
        serialNumber: generateSerialNumber(),
        // ACTIVE direct (pas PENDING : c'est le merchant qui crée, pas un
        // client via QR — l'anti-abus du PENDING n'a pas de sens ici).
        status: "ACTIVE",
      },
      select: { id: true, serialNumber: true, status: true },
    });

    void trackServerEvent(merchantId, "card.distributed", {
      programId,
      cardId: card.id,
      source: "manual",
    });
  }

  return NextResponse.json(
    {
      ok: true,
      alreadyExisted,
      card: {
        id: card.id,
        serialNumber: card.serialNumber,
        status: card.status,
      },
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
      },
      program: {
        id: program.id,
        name: program.name,
      },
    },
    { status: 201 },
  );
}
