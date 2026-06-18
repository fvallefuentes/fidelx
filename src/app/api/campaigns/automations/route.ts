import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/validation";
import { calculateCampaignImpact, emptyCampaignImpact, type CampaignImpact } from "@/lib/campaign-impact";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const DEFAULT_FREQUENCY_DAYS = 7;
const DEFAULT_COOLDOWN_DAYS = 7;
const DEFAULT_MIN_AUDIENCE = 2;

const createAutomationSchema = z.object({
  recommendationId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(240),
  programId: z.string().trim().min(1),
  programName: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  messageVariantId: z.string().trim().min(1).max(80).optional(),
  messageVariantLabel: z.string().trim().min(1).max(80).optional(),
  messageVariantTone: z.string().trim().min(1).max(80).optional(),
  notifTitle: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(350),
  targetSegment: z.enum(["ALL", "ACTIVE", "DORMANT", "NEW", "VIP"]).default("ALL"),
  frequencyDays: z.coerce.number().int().min(7).max(30).default(DEFAULT_FREQUENCY_DAYS),
  cooldownDays: z.coerce.number().int().min(7).max(30).default(DEFAULT_COOLDOWN_DAYS),
  minAudience: z.coerce.number().int().min(1).max(50).default(DEFAULT_MIN_AUDIENCE),
});

const updateAutomationSchema = z.object({
  id: z.string().trim().min(1),
  active: z.boolean(),
});

type AutomationConfig = {
  automationRule?: boolean;
  automationRuleId?: string;
  recommendationId?: string;
  sourceTitle?: string;
  sourceReason?: string;
  programName?: string;
  messageVariantId?: string;
  messageVariantLabel?: string;
  messageVariantTone?: string;
  abTestEnabled?: boolean;
  lastAbTestAt?: string | null;
  lastAbTestVariantIds?: string[];
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

type CampaignRun = Awaited<ReturnType<typeof getAutomationCampaigns>>[number];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const campaigns = await getAutomationCampaigns(session.user.id);

  const rules = campaigns.filter((campaign) =>
    isAutomationRule(campaign.triggerConfig)
  );
  const runsByRuleId = new Map<string, CampaignRun[]>();
  for (const campaign of campaigns) {
    const config = campaign.triggerConfig as AutomationConfig | null;
    if (!config?.automationRuleId) continue;
    const current = runsByRuleId.get(config.automationRuleId) || [];
    current.push(campaign);
    runsByRuleId.set(config.automationRuleId, current);
  }

  const response = await Promise.all(
    rules.map(async (rule) => {
      const config = rule.triggerConfig as AutomationConfig;
      const allRuns = (runsByRuleId.get(rule.id) || []).sort(
        (a, b) => (b.sentAt || b.createdAt).getTime() - (a.sentAt || a.createdAt).getTime()
      );
      const runs = allRuns.slice(0, 5);
      const lastRun = runs[0] || null;
      const performance = await buildMessageVariantPerformance(allRuns, config);

      return {
        id: rule.id,
        name: rule.name,
        title: config.sourceTitle || rule.name,
        reason: config.sourceReason || "",
        programName: config.programName || rule.program?.name || "Programme",
        message: rule.message,
        status: rule.status,
        active: rule.status === "SCHEDULED",
        nextRunAt: rule.scheduledAt?.toISOString() || null,
        lastRunAt: config.lastRunAt || lastRun?.sentAt?.toISOString() || null,
        runCount: config.runCount || allRuns.length,
        lastSentCount: config.lastSentCount || lastRun?.sentCount || 0,
        lastAudienceCount: config.lastAudienceCount || 0,
        lastSkipReason: config.lastSkipReason || null,
        lastSkippedAt: config.lastSkippedAt || null,
        frequencyDays: config.frequencyDays || DEFAULT_FREQUENCY_DAYS,
        cooldownDays: config.cooldownDays || DEFAULT_COOLDOWN_DAYS,
        minAudience: config.minAudience || DEFAULT_MIN_AUDIENCE,
        selectedVariant: {
          id: config.messageVariantId || "standard",
          label: config.messageVariantLabel || formatVariantLabel(config.messageVariantId),
          tone: config.messageVariantTone || "",
        },
        abTest: {
          enabled: config.abTestEnabled !== false,
          minAudience: 20,
          lastRunAt: config.lastAbTestAt || null,
          lastVariantIds: config.lastAbTestVariantIds || [],
        },
        performance,
        history: runs.map((run) => {
          const runConfig = run.triggerConfig as AutomationConfig | null;
          return {
            id: run.id,
            name: run.name,
            sentAt: run.sentAt?.toISOString() || run.createdAt.toISOString(),
            sentCount: run.sentCount,
            status: run.status,
            messageVariantId: runConfig?.messageVariantId || config.messageVariantId || "standard",
            messageVariantLabel:
              runConfig?.messageVariantLabel ||
              config.messageVariantLabel ||
              formatVariantLabel(runConfig?.messageVariantId || config.messageVariantId),
          };
        }),
      };
    })
  );

  return NextResponse.json(response);
}

function getAutomationCampaigns(merchantId: string) {
  return prisma.notificationCampaign.findMany({
    where: { merchantId },
    include: {
      program: { select: { name: true } },
      logs: {
        where: { delivered: true, deliveredAt: { not: null } },
        select: { cardId: true, deliveredAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  if (!user?.plan || user.plan === "FREE") {
    return NextResponse.json(
      { error: "Les automatisations sont reservees aux plans payants." },
      { status: 403 }
    );
  }

  const parsed = await parseJsonBody(req, createAutomationSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const program = await prisma.loyaltyProgram.findFirst({
    where: { id: data.programId, merchantId: session.user.id, isActive: true },
    select: { id: true, name: true },
  });
  if (!program) {
    return NextResponse.json({ error: "Programme introuvable" }, { status: 404 });
  }

  const existingRules = await prisma.notificationCampaign.findMany({
    where: {
      merchantId: session.user.id,
      programId: data.programId,
      status: { in: ["SCHEDULED", "SENDING"] },
    },
    select: { id: true, triggerConfig: true },
  });
  const duplicate = existingRules.find((rule) => {
    const config = rule.triggerConfig as AutomationConfig | null;
    return config?.automationRule && config.recommendationId === data.recommendationId;
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "Cette recommandation est deja automatisee.", id: duplicate.id },
      { status: 409 }
    );
  }

  const nextRunAt = addDays(new Date(), data.frequencyDays);
  const automation = await prisma.notificationCampaign.create({
    data: {
      merchantId: session.user.id,
      programId: data.programId,
      name: `Auto - ${data.name}`,
      message: data.message,
      triggerType: "SCHEDULED",
      triggerConfig: {
        automationRule: true,
        recommendationId: data.recommendationId,
        sourceTitle: data.title,
        sourceReason: data.reason,
        programName: program.name || data.programName,
        messageVariantId: data.messageVariantId,
        messageVariantLabel: data.messageVariantLabel,
        messageVariantTone: data.messageVariantTone,
        abTestEnabled: true,
        lastAbTestAt: null,
        lastAbTestVariantIds: [],
        notifTitle: data.notifTitle,
        frequencyDays: data.frequencyDays,
        cooldownDays: data.cooldownDays,
        minAudience: data.minAudience,
        runCount: 0,
        lastRunAt: null,
        lastSkipReason: null,
      } satisfies Prisma.InputJsonObject,
      targetSegment: data.targetSegment,
      status: "SCHEDULED",
      scheduledAt: nextRunAt,
    },
  });

  return NextResponse.json({ id: automation.id, nextRunAt }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, updateAutomationSchema);
  if (!parsed.ok) return parsed.response;

  const rule = await prisma.notificationCampaign.findFirst({
    where: { id: parsed.data.id, merchantId: session.user.id },
    select: { id: true, triggerConfig: true },
  });
  if (!rule || !isAutomationRule(rule.triggerConfig)) {
    return NextResponse.json({ error: "Regle introuvable" }, { status: 404 });
  }

  const updated = await prisma.notificationCampaign.update({
    where: { id: rule.id },
    data: {
      status: parsed.data.active ? "SCHEDULED" : "CANCELLED",
      scheduledAt: parsed.data.active ? addDays(new Date(), DEFAULT_FREQUENCY_DAYS) : null,
    },
  });

  return NextResponse.json({ id: updated.id, active: updated.status === "SCHEDULED" });
}

function isAutomationRule(config: unknown) {
  return Boolean((config as AutomationConfig | null)?.automationRule);
}

async function buildMessageVariantPerformance(
  runs: CampaignRun[],
  ruleConfig: AutomationConfig
) {
  const groups = new Map<
    string,
    {
      id: string;
      label: string;
      runCount: number;
      sentCount: number;
      impact: CampaignImpact;
      lastSentAt: string | null;
    }
  >();

  for (const run of runs) {
    const runConfig = run.triggerConfig as AutomationConfig | null;
    const variantId = runConfig?.messageVariantId || ruleConfig.messageVariantId || "standard";
    const label =
      runConfig?.messageVariantLabel ||
      ruleConfig.messageVariantLabel ||
      formatVariantLabel(variantId);
    const impact = await calculateCampaignImpact(run.logs);
    const current =
      groups.get(variantId) ||
      {
        id: variantId,
        label,
        runCount: 0,
        sentCount: 0,
        impact: emptyCampaignImpact(),
        lastSentAt: null,
      };

    current.runCount += 1;
    current.sentCount += run.sentCount || 0;
    current.impact.returnedClients += impact.returnedClients;
    current.impact.generatedVisits += impact.generatedVisits;
    current.impact.generatedValue += impact.generatedValue;
    current.impact.rewardsUnlocked += impact.rewardsUnlocked;
    current.lastSentAt = newerIsoDate(current.lastSentAt, run.sentAt || run.createdAt);
    groups.set(variantId, current);
  }

  const variants = [...groups.values()]
    .map((variant) => ({
      id: variant.id,
      label: variant.label,
      runCount: variant.runCount,
      sentCount: variant.sentCount,
      returnedClients: variant.impact.returnedClients,
      generatedVisits: variant.impact.generatedVisits,
      rewardsUnlocked: variant.impact.rewardsUnlocked,
      conversionRate:
        variant.sentCount > 0
          ? Math.round((variant.impact.returnedClients / variant.sentCount) * 1000) / 10
          : 0,
      lastSentAt: variant.lastSentAt,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate || b.sentCount - a.sentCount);

  const best = variants.find((variant) => variant.sentCount >= 5) || variants[0] || null;
  return {
    variants,
    bestVariantId: best?.id || null,
    recommendation: buildPerformanceRecommendation(best, variants.length),
  };
}

function buildPerformanceRecommendation(
  best: { label: string; conversionRate: number; sentCount: number } | null,
  variantCount: number
) {
  if (!best) return "Pas encore assez d'envois pour comparer les messages.";
  if (best.sentCount < 5) return "Premieres donnees recues. Attendez quelques envois avant de comparer.";
  if (variantCount <= 1) {
    return `${best.label} est le message suivi actuellement: ${best.conversionRate}% de retour.`;
  }
  return `${best.label} performe le mieux pour l'instant: ${best.conversionRate}% de retour.`;
}

function newerIsoDate(current: string | null, next: Date | null) {
  if (!next) return current;
  if (!current || next > new Date(current)) return next.toISOString();
  return current;
}

function formatVariantLabel(id?: string) {
  if (!id || id === "standard") return "Equilibre";
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
