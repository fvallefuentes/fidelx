import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";

/**
 * POST /api/admin/abuse/block-ip
 * Body: { ipPrefix: string, reason?: string, expiresIn?: "1h"|"24h"|"7d"|"30d"|"forever" }
 * Bloque une IP. Le middleware refusera ensuite toute requête depuis cette IP.
 *
 * GET : liste les IPs actuellement bloquées
 * DELETE: /api/admin/abuse/block-ip/[id] (route séparée)
 */

const DURATIONS_MS: Record<string, number | null> = {
  "1h": 60 * 60_000,
  "24h": 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
  "30d": 30 * 24 * 60 * 60_000,
  "forever": null,
};

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: string })?.role === "ADMIN" ? session : null;
}

export async function GET() {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const blockedIps = await prisma.blockedIp.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ blockedIps });
}

export async function POST(req: Request) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const ipPrefix = String(body?.ipPrefix || "").trim();
  const reason = typeof body?.reason === "string" ? body.reason.trim() : null;
  const expiresIn = String(body?.expiresIn || "24h");

  if (!ipPrefix) {
    return NextResponse.json({ error: "ipPrefix requis" }, { status: 400 });
  }
  if (!(expiresIn in DURATIONS_MS)) {
    return NextResponse.json(
      { error: "expiresIn invalide (1h, 24h, 7d, 30d, forever)" },
      { status: 400 }
    );
  }

  const duration = DURATIONS_MS[expiresIn];
  const expiresAt = duration === null ? null : new Date(Date.now() + duration);

  // Upsert : si l'IP est déjà bloquée, on étend la durée et met à jour la raison
  const existing = await prisma.blockedIp.findUnique({ where: { ipPrefix } });
  const blocked = existing
    ? await prisma.blockedIp.update({
        where: { id: existing.id },
        data: {
          reason,
          expiresAt,
          blockedById: session.user?.id ?? null,
        },
      })
    : await prisma.blockedIp.create({
        data: {
          ipPrefix,
          reason,
          expiresAt,
          blockedById: session.user?.id ?? null,
        },
      });

  await logAdminAction({
    adminId: session.user!.id!,
    action: "BLOCK_IP",
    targetType: "IP",
    targetId: blocked.id,
    targetLabel: ipPrefix,
    metadata: { reason, expiresIn, expiresAt },
    req,
  });

  return NextResponse.json({ ok: true, blocked });
}
