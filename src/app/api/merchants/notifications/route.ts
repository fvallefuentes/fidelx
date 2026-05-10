import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/merchants/notifications
 *   ?unreadOnly=1 → uniquement non-lues
 *   ?limit=N → défaut 50 (max 200)
 *
 * Retourne les notifications du commerçant connecté, plus récentes en premier.
 * Pour STAFF : on retourne celles de l'employeur (merchantId).
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const merchantId =
    (session.user as { merchantId?: string }).merchantId ?? session.user.id;

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "1";
  const limit = Math.min(
    200,
    Math.max(1, Number(searchParams.get("limit") || 50))
  );

  const where: Record<string, unknown> = { merchantId };
  if (unreadOnly) where.readAt = null;

  const [notifications, unreadCount] = await Promise.all([
    prisma.merchantNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.merchantNotification.count({
      where: { merchantId, readAt: null },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
