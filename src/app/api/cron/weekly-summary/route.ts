import { NextResponse } from "next/server";
import { buildWeeklyCampaignSummary } from "@/lib/campaign-weekly-summary";
import { sendWeeklyCampaignSummaryEmail } from "@/lib/email/weekly-campaign-summary";
import { prisma } from "@/lib/prisma";
import { createMerchantNotification } from "@/lib/notifications/merchant";
import { requireCronSecret } from "@/lib/api/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BATCH_SIZE = 50;

export async function GET(req: Request) {
  const cronAuthError = requireCronSecret(req);
  if (cronAuthError) return cronAuthError;

  const now = new Date();
  const weekKey = buildWeekKey(now);
  const dedupeKey = `weekly-campaign-summary:${weekKey}`;
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.fidlify.com"}/dashboard/assistant`;

  const merchants = await prisma.user.findMany({
    where: {
      role: "USER",
      suspendedAt: null,
      emailVerified: { not: null },
      programs: { some: { isActive: true } },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  const results: Array<{
    merchantId: string;
    email: string;
    sent: boolean;
    skipped?: string;
    error?: string;
  }> = [];

  for (const merchant of merchants) {
    try {
      const alreadySent = await prisma.merchantNotification.findFirst({
        where: {
          merchantId: merchant.id,
          type: "SYSTEM",
          metadata: { path: ["dedupeKey"], equals: dedupeKey },
        },
        select: { id: true },
      });
      if (alreadySent) {
        results.push({
          merchantId: merchant.id,
          email: merchant.email,
          sent: false,
          skipped: "already_sent_this_week",
        });
        continue;
      }

      const summary = await buildWeeklyCampaignSummary(merchant.id, now);
      if (!hasUsefulSummary(summary)) {
        results.push({
          merchantId: merchant.id,
          email: merchant.email,
          sent: false,
          skipped: "no_signal",
        });
        continue;
      }

      const emailResult = await sendWeeklyCampaignSummaryEmail({
        toEmail: merchant.email,
        merchantName: merchant.name,
        summary,
        dashboardUrl,
      });

      if (!emailResult.sent) {
        results.push({
          merchantId: merchant.id,
          email: merchant.email,
          sent: false,
          skipped: emailResult.devModeNoSmtp ? "smtp_not_configured" : undefined,
          error: emailResult.devModeNoSmtp ? undefined : "email_send_failed",
        });
        continue;
      }

      await createMerchantNotification({
        merchantId: merchant.id,
        type: "SYSTEM",
        title: "Recap hebdomadaire envoye",
        body: `${summary.stats.messagesSent} messages, ${summary.stats.returnedClients} clients revenus ces 7 derniers jours.`,
        link: "/dashboard/assistant",
        metadata: {
          weekKey,
          email: merchant.email,
          messagesSent: summary.stats.messagesSent,
          returnedClients: summary.stats.returnedClients,
        },
        dedupeKey,
        dedupeMinutes: 8 * 24 * 60,
      });

      results.push({ merchantId: merchant.id, email: merchant.email, sent: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/weekly-summary] failed merchant ${merchant.id}:`, message);
      results.push({
        merchantId: merchant.id,
        email: merchant.email,
        sent: false,
        error: message,
      });
    }
  }

  const sent = results.filter((result) => result.sent).length;
  return NextResponse.json({
    ok: true,
    weekKey,
    processed: results.length,
    sent,
    skipped: results.length - sent,
    results,
  });
}

function hasUsefulSummary(summary: Awaited<ReturnType<typeof buildWeeklyCampaignSummary>>) {
  return (
    summary.stats.messagesSent > 0 ||
    summary.stats.automationsActive > 0 ||
    Boolean(summary.topOpportunity)
  );
}

function buildWeekKey(date: Date) {
  const monday = startOfIsoWeekUtc(date);
  return monday.toISOString().slice(0, 10);
}

function startOfIsoWeekUtc(date: Date) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - day + 1);
  return utc;
}
