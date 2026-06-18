import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/validation";
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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const campaigns = await prisma.notificationCampaign.findMany({
    where: { merchantId: session.user.id },
    include: { program: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  const rules = campaigns.filter((campaign) =>
    isAutomationRule(campaign.triggerConfig)
  );
  const runsByRuleId = new Map<string, typeof campaigns>();
  for (const campaign of campaigns) {
    const config = campaign.triggerConfig as AutomationConfig | null;
    if (!config?.automationRuleId) continue;
    const current = runsByRuleId.get(config.automationRuleId) || [];
    current.push(campaign);
    runsByRuleId.set(config.automationRuleId, current);
  }

  return NextResponse.json(
    rules.map((rule) => {
      const config = rule.triggerConfig as AutomationConfig;
      const runs = (runsByRuleId.get(rule.id) || [])
        .sort((a, b) => (b.sentAt || b.createdAt).getTime() - (a.sentAt || a.createdAt).getTime())
        .slice(0, 5);
      const lastRun = runs[0] || null;

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
        runCount: config.runCount || runs.length,
        lastSentCount: config.lastSentCount || lastRun?.sentCount || 0,
        lastAudienceCount: config.lastAudienceCount || 0,
        lastSkipReason: config.lastSkipReason || null,
        lastSkippedAt: config.lastSkippedAt || null,
        frequencyDays: config.frequencyDays || DEFAULT_FREQUENCY_DAYS,
        cooldownDays: config.cooldownDays || DEFAULT_COOLDOWN_DAYS,
        minAudience: config.minAudience || DEFAULT_MIN_AUDIENCE,
        history: runs.map((run) => ({
          id: run.id,
          name: run.name,
          sentAt: run.sentAt?.toISOString() || run.createdAt.toISOString(),
          sentCount: run.sentCount,
          status: run.status,
        })),
      };
    })
  );
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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
