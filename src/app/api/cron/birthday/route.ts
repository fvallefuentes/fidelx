import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyPassUpdate } from "@/lib/wallet/push";
import { createMerchantNotification } from "@/lib/notifications/merchant";
import { requireCronSecret } from "@/lib/api/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/cron/birthday
 *
 * Daily worker for birthday campaigns.
 * Expected schedule: once per day, around 09:00 Europe/Zurich.
 *
 * It sends only when the merchant has created an active BIRTHDAY campaign
 * for the card program from the Campaigns page.
 */
export async function GET(req: Request) {
  const cronAuthError = requireCronSecret(req);
  if (cronAuthError) return cronAuthError;

  const now = new Date();
  const { month: targetMonth, day: targetDay, isoDate } = getSwissDateParts(now);

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
    return NextResponse.json({ ok: true, targetDate: isoDate, matched: 0, sent: 0 });
  }

  const clientIds = matchingClients.map((client) => client.id);
  const cards = await prisma.loyaltyCard.findMany({
    where: {
      clientId: { in: clientIds },
      status: { in: ["ACTIVE", "REWARD_PENDING"] },
    },
    select: {
      id: true,
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
            select: { id: true, message: true, name: true, triggerConfig: true },
            take: 1,
          },
        },
      },
    },
  });

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 350);

  const alreadyNotified = await prisma.notificationLog.findMany({
    where: {
      cardId: { in: cards.map((card) => card.id) },
      createdAt: { gte: cutoff },
      campaign: { triggerType: "BIRTHDAY" },
    },
    select: { cardId: true },
  });
  const alreadySet = new Set(alreadyNotified.map((log) => log.cardId));

  let sent = 0;
  const errors: string[] = [];
  const sentByCampaign = new Map<string, number>();

  for (const card of cards) {
    if (alreadySet.has(card.id)) continue;
    const campaign = card.program.campaigns[0];
    if (!campaign) continue;

    try {
      await prisma.loyaltyCard.update({
        where: { id: card.id },
        data: { lastMessage: campaign.message, lastMessageAt: now },
      });
      await notifyPassUpdate(card.id, {
        header: getCampaignNotificationTitle(campaign.triggerConfig) || campaign.name || card.program.name,
        body: campaign.message,
      });

      await prisma.notificationLog.create({
        data: {
          campaignId: campaign.id,
          cardId: card.id,
          delivered: true,
          deliveredAt: now,
        },
      });

      const client = matchingClients.find((item) => item.id === card.clientId);
      void createMerchantNotification({
        merchantId: card.program.merchantId,
        type: "CLIENT_BIRTHDAY_TODAY",
        title: "Anniversaire aujourd'hui",
        body: `${client?.firstName ?? "Un client"} fête son anniversaire aujourd'hui. Campagne envoyée.`,
        link: `/dashboard/clients/${card.id}`,
        metadata: { cardId: card.id },
      });

      sent++;
      sentByCampaign.set(campaign.id, (sentByCampaign.get(campaign.id) || 0) + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cron/birthday] card ${card.id} failed:`, msg);
      errors.push(`${card.id}: ${msg}`);
    }
  }

  await Promise.all(
    [...sentByCampaign.entries()].map(([id, count]) =>
      prisma.notificationCampaign.update({
        where: { id },
        data: { sentCount: { increment: count }, sentAt: new Date() },
      })
    )
  );

  return NextResponse.json({
    ok: true,
    targetDate: isoDate,
    matchedClients: matchingClients.length,
    eligibleCards: cards.length,
    sent,
    errors: errors.length ? errors : undefined,
  });
}

function getSwissDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const year = byType.get("year") || "1970";
  const month = Number(byType.get("month") || "1");
  const day = Number(byType.get("day") || "1");

  return {
    month,
    day,
    isoDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

function getCampaignNotificationTitle(config: unknown) {
  const title = (config as { notifTitle?: unknown } | null)?.notifTitle;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}
