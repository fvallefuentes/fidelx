import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyPassUpdate } from "@/lib/wallet/push";
import { createMerchantNotification } from "@/lib/notifications/merchant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/cron/birthday
 *
 * Worker quotidien des campagnes ANNIVERSAIRE.
 * À appeler 1× par jour (recommandé : 09:00 heure locale Suisse).
 *
 *   0 9 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *       https://www.fidlify.com/api/cron/birthday >/dev/null
 *
 * Logique :
 * 1. Trouve tous les clients dont la date d'anniversaire (mois/jour) est
 *    dans 7 jours (J+7 par rapport à aujourd'hui).
 * 2. Pour chaque carte active de ces clients, vérifie si le commerçant
 *    a une campagne BIRTHDAY active (status SCHEDULED/SENT-loop) sur le
 *    programme concerné.
 * 3. Envoie une notification push avec le message de la campagne.
 * 4. Loggue une NotificationLog pour ne pas re-notifier la même carte
 *    plusieurs fois la même année.
 */

export async function GET(req: Request) {
  // Auth simple par Bearer token
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (expected && token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + 7);
  const targetMonth = targetDate.getMonth() + 1; // 1..12
  const targetDay = targetDate.getDate(); // 1..31

  // Cherche les clients dont l'anniversaire mois+jour matche J+7.
  // (Prisma Postgres permet EXTRACT via $queryRaw)
  const matchingClients = await prisma.$queryRaw<
    { id: string; firstName: string }[]
  >`
    SELECT id, "firstName"
    FROM "Client"
    WHERE "birthDate" IS NOT NULL
      AND EXTRACT(MONTH FROM "birthDate") = ${targetMonth}
      AND EXTRACT(DAY FROM "birthDate") = ${targetDay}
  `;

  if (matchingClients.length === 0) {
    return NextResponse.json({ ok: true, matched: 0, sent: 0 });
  }

  const clientIds = matchingClients.map((c) => c.id);

  // Récupère les cartes actives de ces clients (status ACTIVE ou REWARD_PENDING,
  // pas PENDING — la carte doit être validée pour mériter une notif anniversaire)
  const cards = await prisma.loyaltyCard.findMany({
    where: {
      clientId: { in: clientIds },
      status: { in: ["ACTIVE", "REWARD_PENDING"] },
    },
    select: {
      id: true,
      serialNumber: true,
      programId: true,
      clientId: true,
      program: {
        select: {
          merchantId: true,
          name: true,
          campaigns: {
            where: {
              triggerType: "BIRTHDAY",
              status: { in: ["SCHEDULED", "SENT"] },
            },
            select: { id: true, message: true, name: true },
            take: 1,
          },
        },
      },
    },
  });

  // Anti-doublon : ne pas re-notifier une carte déjà notifiée cette année.
  // On exclut les cartes qui ont déjà une NotificationLog d'une campagne
  // BIRTHDAY de ce programme dans les 350 derniers jours.
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 350);

  const alreadyNotified = await prisma.notificationLog.findMany({
    where: {
      cardId: { in: cards.map((c) => c.id) },
      createdAt: { gte: cutoff },
      campaign: {
        triggerType: "BIRTHDAY",
      },
    },
    select: { cardId: true },
  });
  const alreadySet = new Set(alreadyNotified.map((n) => n.cardId));

  let sent = 0;
  const errors: string[] = [];

  for (const card of cards) {
    if (alreadySet.has(card.id)) continue;
    const campaign = card.program.campaigns[0];
    if (!campaign) continue; // pas de campagne BIRTHDAY active sur ce programme

    try {
      // Mettre à jour le message sur la carte (visible au dos du pass)
      // puis déclencher la mise à jour push (Apple Wallet / Google Wallet)
      await prisma.loyaltyCard.update({
        where: { id: card.id },
        data: { lastMessage: campaign.message, lastMessageAt: now },
      });
      await notifyPassUpdate(card.id);

      await prisma.notificationLog.create({
        data: {
          campaignId: campaign.id,
          cardId: card.id,
          delivered: true,
          deliveredAt: now,
        },
      });

      // Notif in-app commerçant : anniversaire d'un client (J-7)
      const client = matchingClients.find((c) => c.id === card.clientId);
      void createMerchantNotification({
        merchantId: card.program.merchantId,
        type: "CLIENT_BIRTHDAY_SOON",
        title: `🎂 Anniversaire dans 7 jours`,
        body: `${client?.firstName ?? "Un client"} fête son anniversaire bientôt. Campagne envoyée.`,
        link: `/dashboard/clients/${card.id}`,
        metadata: { cardId: card.id },
      });

      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[cron/birthday] card ${card.id} failed:`,
        msg
      );
      errors.push(`${card.id}: ${msg}`);
    }
  }

  // Met à jour les compteurs sentCount des campagnes ayant envoyé des messages
  const campaignsToUpdate = new Map<string, number>();
  for (const card of cards) {
    if (alreadySet.has(card.id)) continue;
    const c = card.program.campaigns[0];
    if (!c) continue;
    campaignsToUpdate.set(c.id, (campaignsToUpdate.get(c.id) || 0) + 1);
  }
  await Promise.all(
    [...campaignsToUpdate.entries()].map(([id, count]) =>
      prisma.notificationCampaign.update({
        where: { id },
        data: { sentCount: { increment: count }, sentAt: new Date() },
      })
    )
  );

  return NextResponse.json({
    ok: true,
    targetDate: targetDate.toISOString().split("T")[0],
    matchedClients: matchingClients.length,
    eligibleCards: cards.length,
    sent,
    errors: errors.length ? errors : undefined,
  });
}
