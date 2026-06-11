import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/validation";
import { notifyPassUpdate } from "@/lib/wallet/push";

const updateEstablishmentSchema = z
  .object({
    name: z.string().trim().min(1, "Le nom est requis").max(120, "Nom trop long").optional(),
    address: z.string().trim().max(240, "Adresse trop longue").optional().or(z.literal("")),
    phone: z.string().trim().max(40, "Telephone trop long").optional().or(z.literal("")),
    googlePlaceId: z.string().trim().max(200, "Google Place ID trop long").optional().or(z.literal("")),
    latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
    longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Aucune donnee a mettre a jour",
  })
  .refine((data) => {
    const hasLatitude = data.latitude !== undefined && data.latitude !== null;
    const hasLongitude = data.longitude !== undefined && data.longitude !== null;
    return hasLatitude === hasLongitude;
  }, {
    message: "Latitude et longitude doivent etre renseignees ensemble",
  });

async function notifyCardsLinkedToEstablishment(establishmentId: string, merchantId: string) {
  const cards = await prisma.loyaltyCard.findMany({
    where: {
      program: {
        establishmentId,
        merchantId,
      },
    },
    select: { id: true },
  });

  if (cards.length > 0) {
    void Promise.allSettled(cards.map((card) => notifyPassUpdate(card.id)));
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ establishmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { establishmentId } = await params;

  const parsed = await parseJsonBody(req, updateEstablishmentSchema);
  if (!parsed.ok) return parsed.response;

  const establishment = await prisma.establishment.findFirst({
    where: {
      id: establishmentId,
      merchantId: session.user.id,
    },
    select: { id: true },
  });

  if (!establishment) {
    return NextResponse.json(
      { error: "Etablissement introuvable" },
      { status: 404 }
    );
  }

  const data = parsed.data;
  const updated = await prisma.establishment.update({
    where: { id: establishmentId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.address !== undefined ? { address: data.address || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.googlePlaceId !== undefined ? { googlePlaceId: data.googlePlaceId || null } : {}),
      ...(data.latitude !== undefined ? { latitude: data.latitude ?? null } : {}),
      ...(data.longitude !== undefined ? { longitude: data.longitude ?? null } : {}),
    },
  });

  await notifyCardsLinkedToEstablishment(establishmentId, session.user.id);

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ establishmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { establishmentId } = await params;

  const establishment = await prisma.establishment.findFirst({
    where: {
      id: establishmentId,
      merchantId: session.user.id,
    },
    select: { id: true },
  });

  if (!establishment) {
    return NextResponse.json(
      { error: "Etablissement introuvable" },
      { status: 404 }
    );
  }

  const cardsToRefresh = await prisma.loyaltyCard.findMany({
    where: {
      program: {
        establishmentId,
        merchantId: session.user.id,
      },
    },
    select: { id: true },
  });

  const [programs, transactions] = await prisma.$transaction([
    prisma.loyaltyProgram.updateMany({
      where: {
        establishmentId,
        merchantId: session.user.id,
      },
      data: {
        establishmentId: null,
        googleReviewEnabled: false,
      },
    }),
    prisma.transaction.updateMany({
      where: {
        establishmentId,
        card: {
          program: {
            merchantId: session.user.id,
          },
        },
      },
      data: { establishmentId: null },
    }),
    prisma.establishment.delete({
      where: { id: establishmentId },
    }),
  ]);

  if (cardsToRefresh.length > 0) {
    void Promise.allSettled(cardsToRefresh.map((card) => notifyPassUpdate(card.id)));
  }

  return NextResponse.json({
    success: true,
    detachedPrograms: programs.count,
    detachedTransactions: transactions.count,
  });
}
