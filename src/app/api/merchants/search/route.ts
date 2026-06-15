import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/merchants/search?q=...
 *
 * Recherche universelle pour la command palette Ctrl+K.
 * Cherche en parallèle dans :
 * - clients (prénom, email, téléphone) → /dashboard/clients/[cardId]
 * - cartes (serialNumber) → /dashboard/clients/[cardId]
 * - programmes (nom) → /dashboard/programs
 * - campagnes (nom, message) → /dashboard/campaigns
 *
 * Insensible à la casse, 5 résultats max par catégorie.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({
      clients: [],
      programs: [],
      campaigns: [],
    });
  }

  // Recherche cartes (par client OU serialNumber)
  const cards = await prisma.loyaltyCard.findMany({
    where: {
      program: { merchantId },
      OR: [
        { serialNumber: { contains: q, mode: "insensitive" } },
        {
          client: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      ],
    },
    include: {
      client: { select: { firstName: true, lastName: true, email: true, phone: true } },
      program: { select: { name: true } },
    },
    take: 5,
    orderBy: { lastVisitAt: "desc" },
  });

  const [programs, campaigns] = await Promise.all([
    prisma.loyaltyProgram.findMany({
      where: {
        merchantId,
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, type: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notificationCampaign.findMany({
      where: {
        merchantId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { message: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, message: true, status: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    clients: cards.map((c) => ({
      id: c.id,
      firstName: c.client.firstName,
      lastName: c.client.lastName,
      email: c.client.email,
      phone: c.client.phone,
      serialNumber: c.serialNumber,
      programName: c.program.name,
    })),
    programs: programs.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
    })),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      message: c.message.slice(0, 80),
      status: c.status,
    })),
  });
}
