import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAllCardsInProgram } from "@/lib/wallet/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/cron/campaigns
 *
 * Worker des campagnes planifiées. À appeler par crontab toutes les
 * minutes :
 *
 *   * * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *       https://fidelx.balise.ch/api/cron/campaigns >/dev/null
 *
 * Charge toutes les campagnes status=SCHEDULED dont scheduledAt <= now,
 * les envoie via APNs, met sentCount + sentAt + status=SENT.
 */
export async function GET(req: Request) {
  // Auth simple par token Bearer
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (expected && token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const due = await prisma.notificationCampaign.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      programId: { not: null }, // sans programme on ne peut pas pousser
    },
    take: 50, // safety limit per tick
    orderBy: { scheduledAt: "asc" },
  });

  if (due.length === 0) {
    return NextResponse.json({ ok: true, due: 0 });
  }

  const results: Array<{
    id: string;
    name: string;
    sent: number;
    total: number;
    error?: string;
  }> = [];

  for (const c of due) {
    // Marquer SENDING en premier pour éviter les double-tirs
    await prisma.notificationCampaign.update({
      where: { id: c.id },
      data: { status: "SENDING" },
    });

    try {
      const r = await notifyAllCardsInProgram(
        c.programId!,
        c.message,
        c.targetSegment
      );
      await prisma.notificationCampaign.update({
        where: { id: c.id },
        data: {
          status: "SENT",
          sentCount: r.sent,
          sentAt: new Date(),
        },
      });
      results.push({ id: c.id, name: c.name, sent: r.sent, total: r.total });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cron/campaigns] failed campaign ${c.id}:`, msg);
      await prisma.notificationCampaign.update({
        where: { id: c.id },
        data: { status: "FAILED" },
      });
      results.push({
        id: c.id,
        name: c.name,
        sent: 0,
        total: 0,
        error: msg,
      });
    }
  }

  return NextResponse.json({ ok: true, due: due.length, results });
}
