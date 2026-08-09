const FINAL_CARD_STATUSES = new Set(["EXPIRED", "REVOKED"]);

export function canExpireCard(status: string) {
  return !FINAL_CARD_STATUSES.has(status);
}
