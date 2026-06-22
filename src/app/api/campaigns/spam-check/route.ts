import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { parseJsonBody } from "@/lib/api/validation";
import { buildCampaignAudienceWhere } from "@/lib/campaign-audience";
import { prisma } from "@/lib/prisma";

const spamCheckSchema = z.object({
  programId: z.string().trim().min(1),
  targetSegment: z.enum(["ALL", "ACTIVE", "DORMANT", "NEW", "VIP"]).default("ALL"),
  targetCardIds: z.array(z.string().trim().min(1)).optional().default([]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, spamCheckSchema);
  if (!parsed.ok) return parsed.response;

  const { programId, targetSegment, targetCardIds } = parsed.data;
  const program = await prisma.loyaltyProgram.findFirst({
    where: { id: programId, merchantId: session.user.id },
    select: { id: true },
  });
  if (!program) {
    return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });
  }

  const audience = await prisma.loyaltyCard.findMany({
    where: buildCampaignAudienceWhere(programId, targetSegment, targetCardIds),
    select: {
      id: true,
      client: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (audience.length === 0) {
    return NextResponse.json({
      totalAudience: 0,
      riskyCount: 0,
      threshold: 3,
      windowDays: 7,
      preview: [],
    });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentLogs = await prisma.notificationLog.groupBy({
    by: ["cardId"],
    where: {
      cardId: { in: audience.map((card) => card.id) },
      delivered: true,
      deliveredAt: { gte: since },
    },
    _count: { _all: true },
  });

  const recentCountByCardId = new Map(
    recentLogs.map((row) => [row.cardId, row._count._all])
  );
  const riskyCards = audience
    .map((card) => ({
      ...card,
      recentCount: recentCountByCardId.get(card.id) || 0,
    }))
    .filter((card) => card.recentCount >= 2);

  return NextResponse.json({
    totalAudience: audience.length,
    riskyCount: riskyCards.length,
    threshold: 3,
    windowDays: 7,
    preview: riskyCards.slice(0, 5).map((card) => ({
      cardId: card.id,
      name:
        [card.client.firstName, card.client.lastName].filter(Boolean).join(" ") ||
        card.client.email ||
        "Client",
      recentCount: card.recentCount,
    })),
  });
}
