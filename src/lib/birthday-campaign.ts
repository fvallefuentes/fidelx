export const MAX_BIRTHDAY_DAYS_BEFORE = 30;

export function getBirthdayDaysBefore(config: unknown) {
  const value = (config as { daysBefore?: unknown } | null)?.daysBefore;
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_BIRTHDAY_DAYS_BEFORE
    ? value
    : 0;
}

export function getSwissBirthdayTargetDate(date: Date, daysBefore: number) {
  const swissParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = new Map(swissParts.map((part) => [part.type, part.value]));
  const year = Number(byType.get("year") || "1970");
  const month = Number(byType.get("month") || "1");
  const day = Number(byType.get("day") || "1");
  const target = new Date(Date.UTC(year, month - 1, day + daysBefore));
  const targetMonth = target.getUTCMonth() + 1;
  const targetDay = target.getUTCDate();

  return {
    month: targetMonth,
    day: targetDay,
    isoDate: `${target.getUTCFullYear()}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`,
  };
}

