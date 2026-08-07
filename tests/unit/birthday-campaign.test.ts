import { describe, expect, it } from "vitest";
import {
  getBirthdayDaysBefore,
  getSwissBirthdayTargetDate,
  MAX_BIRTHDAY_DAYS_BEFORE,
} from "@/lib/birthday-campaign";

describe("birthday campaigns", () => {
  it("conserve le jour même par défaut pour les campagnes existantes", () => {
    expect(getBirthdayDaysBefore(undefined)).toBe(0);
    expect(getBirthdayDaysBefore({})).toBe(0);
    expect(getBirthdayDaysBefore({ daysBefore: 7 })).toBe(7);
  });

  it("refuse les délais invalides persistés", () => {
    expect(getBirthdayDaysBefore({ daysBefore: -1 })).toBe(0);
    expect(getBirthdayDaysBefore({ daysBefore: MAX_BIRTHDAY_DAYS_BEFORE + 1 })).toBe(0);
    expect(getBirthdayDaysBefore({ daysBefore: 2.5 })).toBe(0);
  });

  it("ajoute des jours calendaires depuis la date suisse", () => {
    const lateUtcOnNewYearsEve = new Date("2026-12-31T23:30:00.000Z");
    expect(getSwissBirthdayTargetDate(lateUtcOnNewYearsEve, 0).isoDate).toBe("2027-01-01");
    expect(getSwissBirthdayTargetDate(lateUtcOnNewYearsEve, 7).isoDate).toBe("2027-01-08");
  });

  it("reste stable au changement d'heure suisse", () => {
    const dstChange = new Date("2026-03-28T23:30:00.000Z");
    expect(getSwissBirthdayTargetDate(dstChange, 1).isoDate).toBe("2026-03-30");
  });
});
