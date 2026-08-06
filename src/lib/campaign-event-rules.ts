export type StampEventTriggerType = "POST_STAMP" | "MILESTONE";

export interface StampEventCampaign {
  triggerType: string;
  triggerConfig: unknown;
}

export interface StampProgress {
  before: number;
  after: number;
  upcomingRewardThreshold: number | null;
}

export function findUpcomingRewardThreshold({
  programType,
  programConfig,
  rewardThresholds,
  progressBefore,
}: {
  programType: string;
  programConfig: Record<string, unknown>;
  rewardThresholds: number[];
  progressBefore: number;
}) {
  const candidates = [...rewardThresholds];

  if (programType === "STAMPS") {
    candidates.push(Number(programConfig.maxStamps));
  } else if (programType === "POINTS") {
    const tiers = Array.isArray(programConfig.tiers) ? programConfig.tiers : [];
    for (const tier of tiers) {
      if (tier && typeof tier === "object" && "points" in tier) {
        candidates.push(Number((tier as { points?: unknown }).points));
      }
    }
  }

  const next = [...new Set(candidates)]
    .filter((value) => Number.isFinite(value) && value > progressBefore)
    .sort((a, b) => a - b)[0];

  return next ?? null;
}

export function selectStampTriggeredCampaign<T extends StampEventCampaign>(
  campaigns: T[],
  progress: StampProgress
) {
  const milestone = campaigns.find(
    (campaign) =>
      campaign.triggerType === "MILESTONE" &&
      didEnterRewardProximity(progress, campaign.triggerConfig)
  );

  if (milestone) return milestone;
  return campaigns.find((campaign) => campaign.triggerType === "POST_STAMP") ?? null;
}

export function didEnterRewardProximity(
  progress: StampProgress,
  triggerConfig: unknown
) {
  const config = asTriggerConfig(triggerConfig);
  const explicitTarget = getPositiveNumber(config.stampsReached);

  if (explicitTarget !== null) {
    return progress.before < explicitTarget && progress.after >= explicitTarget;
  }

  if (progress.upcomingRewardThreshold === null) return false;

  const remainingBeforeReward = clampInteger(
    getPositiveNumber(config.remainingBeforeReward) ?? 1,
    1,
    50
  );
  const target = progress.upcomingRewardThreshold - remainingBeforeReward;

  return (
    target > 0 &&
    progress.before < target &&
    progress.after >= target &&
    progress.after < progress.upcomingRewardThreshold
  );
}

function asTriggerConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getPositiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}
