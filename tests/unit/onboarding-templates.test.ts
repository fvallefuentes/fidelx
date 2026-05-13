import { describe, it, expect } from "vitest";
import {
  ONBOARDING_TEMPLATES,
  getTemplate,
} from "@/lib/onboarding-templates";

describe("Onboarding templates", () => {
  it("contient au moins 6 templates pour couvrir les secteurs locaux", () => {
    expect(ONBOARDING_TEMPLATES.length).toBeGreaterThanOrEqual(6);
  });

  it("chaque template a un id unique", () => {
    const ids = ONBOARDING_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque template a une structure complète", () => {
    for (const t of ONBOARDING_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.emoji).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.programName).toBeTruthy();
      expect(t.type).toBe("STAMPS"); // FREE plan only allows STAMPS
      expect(t.config.maxStamps).toBeGreaterThanOrEqual(3);
      expect(t.config.maxStamps).toBeLessThanOrEqual(20);
      expect(t.reward.name).toBeTruthy();
      expect(t.reward.threshold).toBe(t.config.maxStamps);
      expect(t.cardDesign.bgColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.cardDesign.textColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("getTemplate retourne le template correct", () => {
    const cafe = getTemplate("cafe-10");
    expect(cafe).toBeDefined();
    expect(cafe?.title).toContain("Café");
    expect(cafe?.config.maxStamps).toBe(10);
  });

  it("getTemplate retourne undefined pour un id inconnu", () => {
    expect(getTemplate("inexistant")).toBeUndefined();
  });

  it("couvre les secteurs principaux (café, restaurant, coiffure, etc.)", () => {
    const ids = ONBOARDING_TEMPLATES.map((t) => t.id);
    expect(ids.some((id) => id.includes("cafe"))).toBe(true);
    expect(ids.some((id) => id.includes("restaurant"))).toBe(true);
    expect(ids.some((id) => id.includes("coiffeur"))).toBe(true);
  });
});
