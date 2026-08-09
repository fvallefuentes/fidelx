export type ExactAudienceMode = "MANUAL" | "LIST";

export function getExactTargetCardIds(config: unknown) {
  const targetCardIds = (config as { targetCardIds?: unknown } | null)?.targetCardIds;
  if (!Array.isArray(targetCardIds)) return [];
  return [
    ...new Set(
      targetCardIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0
      )
    ),
  ];
}

export function getExactAudienceMode(config: unknown): ExactAudienceMode | null {
  const mode = (config as { audienceMode?: unknown } | null)?.audienceMode;
  return mode === "MANUAL" || mode === "LIST" ? mode : null;
}

export function getExactAudienceCooldownDays(config: unknown) {
  return getExactAudienceMode(config) ? 0 : 7;
}
