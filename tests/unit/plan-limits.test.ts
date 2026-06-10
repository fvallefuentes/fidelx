import { describe, it, expect } from "vitest";
import { getPlanLimits, PLAN_LIMITS } from "@/lib/plan-limits";

describe("Plan limits", () => {
  it("getPlanLimits returns FREE for null/undefined/unknown", () => {
    expect(getPlanLimits(null)).toBe(PLAN_LIMITS.FREE);
    expect(getPlanLimits(undefined)).toBe(PLAN_LIMITS.FREE);
    expect(getPlanLimits("UNKNOWN")).toBe(PLAN_LIMITS.FREE);
  });

  it("FREE plan limits sont restrictifs", () => {
    const free = PLAN_LIMITS.FREE;
    expect(free.maxActiveCards).toBe(10);
    expect(free.maxStampsPerMonth).toBe(300);
    expect(free.maxPrograms).toBe(1);
    expect(free.maxCampaignsPerMonth).toBe(1);
    expect(free.allowedProgramTypes).toEqual(["STAMPS"]);
    expect(free.showFidlifyBranding).toBe(true);
    expect(free.canExportCsv).toBe(false);
  });

  it("Paid plans débloquent l'export CSV", () => {
    expect(PLAN_LIMITS.ESSENTIAL.canExportCsv).toBe(true);
    expect(PLAN_LIMITS.GROWTH.canExportCsv).toBe(true);
    expect(PLAN_LIMITS.MULTI_SITE.canExportCsv).toBe(true);
  });

  it("Paid plans cachent le branding Fidlify", () => {
    expect(PLAN_LIMITS.ESSENTIAL.showFidlifyBranding).toBe(false);
    expect(PLAN_LIMITS.GROWTH.showFidlifyBranding).toBe(false);
    expect(PLAN_LIMITS.MULTI_SITE.showFidlifyBranding).toBe(false);
  });

  it("Tous les plans payants autorisent les 4 types de programme", () => {
    for (const tier of ["ESSENTIAL", "GROWTH", "MULTI_SITE"] as const) {
      expect(PLAN_LIMITS[tier].allowedProgramTypes).toContain("STAMPS");
      expect(PLAN_LIMITS[tier].allowedProgramTypes).toContain("POINTS");
      expect(PLAN_LIMITS[tier].allowedProgramTypes).toContain("CASHBACK");
      expect(PLAN_LIMITS[tier].allowedProgramTypes).toContain("HYBRID");
    }
  });

  it("Limites maxActiveCards progressent FREE < ESSENTIAL < GROWTH < MULTI_SITE", () => {
    const free = PLAN_LIMITS.FREE.maxActiveCards as number;
    const ess = PLAN_LIMITS.ESSENTIAL.maxActiveCards as number;
    const gro = PLAN_LIMITS.GROWTH.maxActiveCards as number;
    const ms = PLAN_LIMITS.MULTI_SITE.maxActiveCards as number;
    expect(free).toBeLessThan(ess);
    expect(ess).toBeLessThan(gro);
    expect(gro).toBeLessThan(ms);
  });

  it("GROWTH et MULTI_SITE ont scans illimités (null)", () => {
    expect(PLAN_LIMITS.GROWTH.maxStampsPerMonth).toBeNull();
    expect(PLAN_LIMITS.MULTI_SITE.maxStampsPerMonth).toBeNull();
  });

  it("GROWTH et MULTI_SITE ont campagnes illimitées (null)", () => {
    expect(PLAN_LIMITS.GROWTH.maxCampaignsPerMonth).toBeNull();
    expect(PLAN_LIMITS.MULTI_SITE.maxCampaignsPerMonth).toBeNull();
  });
});
