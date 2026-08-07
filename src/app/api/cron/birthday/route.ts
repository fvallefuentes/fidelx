import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildNotificationLogUpdate, notifyPassUpdate } from "@/lib/wallet/push";
import { createMerchantNotification } from "@/lib/notifications/merchant";
import { requireCronSecret } from "@/lib/api/validation";
import {
  getBirthdayDaysBefore,
  getSwissBirthdayTargetDate,
} from "@/lib/birthday-campaign";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Daily worker for birthday campaigns.
 * Expected schedule: once per day, around 09:00 Europe/Zurich.
 */
export async function GET(req: Request) {
  const cronAuthError = requireCronSecret(req);
  if (cronAuthError) return cronAuthError;

  const now = new Date();
  const activeCampaigns = await prisma.notificationCampaign.findMany({
    where: {
      triggerType: "BIRTHDAY",
      status: { in: ["SCHEDULED", "SENT"] },
      programId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      merchantId: true,
      programId: true,
      name: true,
      message: true,
      triggerConfig: true,
      program: { select: { name: true } },
    },
  });

  // A program can only use one birthday rule. The most recent one wins.
  const campaignsByProgram = new Map<
    string,
    (typeof activeCampaigns)[number] & {
      daysBefore: number;
      targetDate: ReturnType<typeof getSwissBirthdayTargetDate>;
    }
  >();
  for (const campaign of activeCampaigns) {
    if (!campaign.programId || campaignsByProgram.has(campaign.programId)) continue;
    const daysBefore = getBirthdayDaysBefore(campaign.triggerConfig);
    campaignsByProgram.set(campaign.programId, {
      ...campaign,
      daysBefore,
      targetDate: getSwissBirthdayTargetDate(now, daysBefore),
    });
  }

  if (campaignsByProgram.size === 0) {
    return NextResponse.json({ ok: true, activeCampaigns: 0, matched: 0, sent: 0 });
  }

  const uniqueTargets = [
    ...new Map(
      [...campaignsByProgram.values()].map((campaign) => [
        campaign.targetDate.isoDate,
        campaign.targetDate,
      ])
    ).values(),
  ];
  const clientsByTarget = new Map<
    string,
    Map<string, { id: string; firstName: string }>
  >();

  await Promise.all(
    uniqueTargets.map(async (target) => {
      const clients = await prisma.$queryRaw<{ id: string; firstName: string }[]>`
        SELECT id, "firstName"
        FROM "Client"
        WHERE "birthDate" IS NOT NULL
          AND EXTRACT(MONTH FROM "birthDate") = ${target.month}
          AND EXTRACT(DAY FROM "birthDate") = ${target.day}
      `;
      clientsByTarget.set(
        target.isoDate,
        new Map(clients.map((client) => [client.id, client]))
      );
    })
  );

  const clientIds = [
    ...new Set(
      [...clientsByTarget.values()].flatMap((clients) => [...clients.keys()])
    ),
  ];

  if (clientIds.length === 0) {
    return NextResponse.json({
      ok: true,
      activeCampaigns: campaignsByProgram.size,
      targets: buildTargetSummary(campaignsByProgram),
      matched: 0,
      sent: 0,
    });
  }

  const cards = await prisma.loyaltyCard.findMany({
    where: {
      clientId: { in: clientIds },
      programId: { in: [...campaignsByProgram.keys()] },
      status: { in: ["ACTIVE", "REWARD_PENDING"] },
    },
    select: { id: true, programId: true, clientId: true },
  });

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 350);
  const alreadyNotified = await prisma.notificationLog.findMany({
    where: {
      cardId: { in: cards.map((card) => card.id) },
      createdAt: { gte: cutoff },
      delivered: true,
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
    const campaign = campaignsByProgram.get(card.programId);
    if (!campaign) continue;
    const client = clientsByTarget.get(campaign.targetDate.isoDate)?.get(card.clientId);
    if (!client) continue;

    try {
      await prisma.loyaltyCard.update({
        where: { id: card.id },
        data: { lastMessage: campaign.message, lastMessageAt: now },
      });
      const deliveryResult = await notifyPassUpdate(card.id, {
        header:
          getCampaignNotificationTitle(campaign.triggerConfig) ||
          campaign.name ||
          campaign.program?.name ||
          "Anniversaire",
        body: campaign.message,
      });
      const deliveryLog = buildNotificationLogUpdate(deliveryResult, now);

      await prisma.notificationLog.create({
        data: {
          campaignId: campaign.id,
          cardId: card.id,
          messageSnapshot: campaign.message,
          ...deliveryLog,
        },
      });

      if (!deliveryLog.delivered) {
        const details = deliveryResult.errors.length
          ? deliveryResult.errors.join(" | ")
          : "aucun appareil Wallet n'a accepte la notification";
        errors.push(`${card.id}: ${details}`);
        continue;
      }

      const isToday = campaign.daysBefore === 0;
      const timing = isToday
        ? "aujourd'hui"
        : `dans ${campaign.daysBefore} jour${campaign.daysBefore > 1 ? "s" : ""}`;
      void createMerchantNotification({
        merchantId: campaign.merchantId,
        type: isToday ? "CLIENT_BIRTHDAY_TODAY" : "CLIENT_BIRTHDAY_SOON",
        title: isToday ? "Anniversaire aujourd'hui" : `Anniversaire ${timing}`,
        body: `${client.firstName || "Un client"} fête son anniversaire ${timing}. Campagne envoyée.`,
        link: `/dashboard/clients/${card.id}`,
        metadata: { cardId: card.id, daysBefore: campaign.daysBefore },
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
    activeCampaigns: campaignsByProgram.size,
    targets: buildTargetSummary(campaignsByProgram),
    matchedClients: clientIds.length,
    eligibleCards: cards.length,
    sent,
    errors: errors.length ? errors : undefined,
  });
}

function getCampaignNotificationTitle(config: unknown) {
  const title = (config as { notifTitle?: unknown } | null)?.notifTitle;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

function buildTargetSummary(
  campaigns: Map<string, { daysBefore: number; targetDate: { isoDate: string } }>
) {
  return [
    ...new Map(
      [...campaigns.values()].map((campaign) => [
        `${campaign.daysBefore}:${campaign.targetDate.isoDate}`,
        {
          daysBefore: campaign.daysBefore,
          targetDate: campaign.targetDate.isoDate,
        },
      ])
    ).values(),
  ];
}
