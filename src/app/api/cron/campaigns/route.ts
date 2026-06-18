import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCampaignRecommendations } from "@/lib/campaign-recommendations";
import { notifyAllCardsInProgram, notifyCardsInProgram } from "@/lib/wallet/push";
import { createMerchantNotification } from "@/lib/notifications/merchant";
import { requireCronSecret } from "@/lib/api/validation";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AutomationConfig = {
  automationRule?: boolean;
  recommendationId?: string;
  sourceTitle?: string;
  sourceReason?: string;
  programName?: string;
  messageVariantId?: string;
  notifTitle?: string;
  frequencyDays?: number;
  cooldownDays?: number;
  minAudience?: number;
  runCount?: number;
  lastRunAt?: string | null;
  lastSentCount?: number;
  lastAudienceCount?: number;
  lastSkipReason?: string | null;
  lastSkippedAt?: string | null;
};

/**
 * GET /api/cron/campaigns
 *
 * Worker des campagnes planifiées. À appeler par crontab toutes les
 * minutes :
 *
 *   * * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *       https://fidlify.com/api/cron/campaigns >/dev/null
 *
 * Charge toutes les campagnes status=SCHEDULED dont scheduledAt <= now,
 * les envoie via APNs, met sentCount + sentAt + status=SENT.
 */
export async function GET(req: Request) {
  const cronAuthError = requireCronSecret(req);
  if (cronAuthError) return cronAuthError;

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
    if (isAutomationRule(c.triggerConfig)) {
      const result = await runAutomationRule(c);
      results.push(result);
      continue;
    }

    // Marquer SENDING en premier pour éviter les double-tirs
    await prisma.notificationCampaign.update({
      where: { id: c.id },
      data: { status: "SENDING" },
    });

    try {
      const r = await notifyAllCardsInProgram(
        c.programId!,
        c.message,
        c.targetSegment,
        c.name,
        c.id
      );
      await prisma.notificationCampaign.update({
        where: { id: c.id },
        data: {
          status: "SENT",
          sentCount: r.sent,
          sentAt: new Date(),
        },
      });
      // Notif in-app commerçant : campagne envoyée
      void createMerchantNotification({
        merchantId: c.merchantId,
        type: "CAMPAIGN_SENT",
        title: `📨 Campagne envoyée : ${c.name}`,
        body: `${r.sent}/${r.total} destinataires touchés.`,
        link: `/dashboard/campaigns`,
        metadata: { campaignId: c.id },
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

async function runAutomationRule(campaign: {
  id: string;
  merchantId: string;
  programId: string | null;
  name: string;
  message: string;
  targetSegment: "ALL" | "ACTIVE" | "DORMANT" | "NEW" | "VIP";
  triggerConfig: unknown;
}) {
  const config = campaign.triggerConfig as AutomationConfig;
  const frequencyDays = clampNumber(config.frequencyDays, 7, 30, 7);
  const cooldownDays = clampNumber(config.cooldownDays, 7, 30, 7);
  const minAudience = clampNumber(config.minAudience, 1, 50, 2);
  const nextRunAt = addDays(new Date(), frequencyDays);

  await prisma.notificationCampaign.update({
    where: { id: campaign.id },
    data: { status: "SENDING" },
  });

  try {
    const recommendations = await buildCampaignRecommendations(campaign.merchantId);
    const recommendation = recommendations.find(
      (rec) => rec.id === config.recommendationId && rec.programId === campaign.programId
    );

    if (!recommendation || recommendation.targetCardIds.length < minAudience) {
      const audienceCount = recommendation?.targetCardIds.length || 0;
      const skipReason =
        audienceCount === 0
          ? "Aucune audience eligible cette semaine."
          : `Audience trop petite (${audienceCount}/${minAudience}).`;
      await prisma.notificationCampaign.update({
        where: { id: campaign.id },
        data: {
          status: "SCHEDULED",
          scheduledAt: nextRunAt,
          triggerConfig: {
            ...config,
            lastAudienceCount: audienceCount,
            lastSkipReason: skipReason,
            lastSkippedAt: new Date().toISOString(),
          } satisfies Prisma.InputJsonObject,
        },
      });
      return {
        id: campaign.id,
        name: campaign.name,
        sent: 0,
        total: audienceCount,
        error: skipReason,
      };
    }

    const runTitle = config.notifTitle || recommendation.notifTitle;
    const runMessage = campaign.message || recommendation.message;

    const run = await prisma.notificationCampaign.create({
      data: {
        merchantId: campaign.merchantId,
        programId: recommendation.programId,
        name: recommendation.name,
        message: runMessage,
        triggerType: "IMMEDIATE",
        triggerConfig: {
          ...(recommendation.triggerConfig || {}),
          automationRuleId: campaign.id,
          recommendationId: recommendation.id,
          messageVariantId: config.messageVariantId,
          notifTitle: runTitle,
          targetCardIds: recommendation.targetCardIds,
        } satisfies Prisma.InputJsonObject,
        targetSegment: recommendation.targetSegment,
        status: "SENT",
      },
    });

    const sendResult = await notifyCardsInProgram(
      recommendation.programId,
      recommendation.targetCardIds,
      runMessage,
      runTitle,
      cooldownDays,
      run.id
    );

    await prisma.notificationCampaign.update({
      where: { id: run.id },
      data: { sentCount: sendResult.sent, sentAt: new Date() },
    });

    await prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "SCHEDULED",
        scheduledAt: nextRunAt,
        triggerConfig: {
          ...config,
          runCount: (config.runCount || 0) + 1,
          lastRunAt: new Date().toISOString(),
          lastSentCount: sendResult.sent,
          lastAudienceCount: sendResult.total,
          lastSkipReason: null,
          lastSkippedAt: null,
        } satisfies Prisma.InputJsonObject,
      },
    });

    void createMerchantNotification({
      merchantId: campaign.merchantId,
      type: "CAMPAIGN_SENT",
      title: `Automatisation envoyee : ${recommendation.name}`,
      body: `${sendResult.sent}/${sendResult.total} clients touches.`,
      link: `/dashboard/campaigns`,
      metadata: { campaignId: run.id, automationRuleId: campaign.id },
    });

    return {
      id: run.id,
      name: recommendation.name,
      sent: sendResult.sent,
      total: sendResult.total,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[cron/campaigns] failed automation ${campaign.id}:`, msg);
    await prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "SCHEDULED",
        scheduledAt: nextRunAt,
        triggerConfig: {
          ...config,
          lastSkipReason: msg,
          lastSkippedAt: new Date().toISOString(),
        } satisfies Prisma.InputJsonObject,
      },
    });
    return { id: campaign.id, name: campaign.name, sent: 0, total: 0, error: msg };
  }
}

function isAutomationRule(config: unknown) {
  return Boolean((config as AutomationConfig | null)?.automationRule);
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
