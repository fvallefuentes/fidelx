import { describe, it, expect } from "vitest";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";

describe("Campaign templates", () => {
  it("contient exactement 10 templates", () => {
    expect(CAMPAIGN_TEMPLATES.length).toBe(10);
  });

  it("chaque template a un id unique + structure complète", () => {
    const ids = new Set<string>();
    for (const tpl of CAMPAIGN_TEMPLATES) {
      expect(tpl.id).toBeTruthy();
      expect(ids.has(tpl.id)).toBe(false);
      ids.add(tpl.id);

      expect(tpl.emoji).toBeTruthy();
      expect(tpl.title).toBeTruthy();
      expect(tpl.description).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.message).toBeTruthy();
      expect(tpl.message.length).toBeLessThanOrEqual(240);
      expect(tpl.triggerType).toBeTruthy();
      expect(tpl.targetSegment).toBeTruthy();
    }
  });

  it("au moins 1 template BIRTHDAY (pour le cron J-7)", () => {
    const birthday = CAMPAIGN_TEMPLATES.filter((t) => t.triggerType === "BIRTHDAY");
    expect(birthday.length).toBeGreaterThanOrEqual(1);
  });

  it("au moins 1 template INACTIVITY (win-back)", () => {
    const winback = CAMPAIGN_TEMPLATES.filter((t) => t.triggerType === "INACTIVITY");
    expect(winback.length).toBeGreaterThanOrEqual(1);
  });

  it("au moins 1 template ciblant les NEW clients (bienvenue)", () => {
    const welcome = CAMPAIGN_TEMPLATES.filter((t) => t.targetSegment === "NEW");
    expect(welcome.length).toBeGreaterThanOrEqual(1);
  });

  it("triggerType doit être dans la whitelist", () => {
    const valid = new Set([
      "IMMEDIATE",
      "SCHEDULED",
      "INACTIVITY",
      "POST_STAMP",
      "MILESTONE",
      "BIRTHDAY",
    ]);
    for (const tpl of CAMPAIGN_TEMPLATES) {
      expect(valid.has(tpl.triggerType)).toBe(true);
    }
  });

  it("targetSegment doit être dans la whitelist", () => {
    const valid = new Set(["ALL", "ACTIVE", "DORMANT", "NEW", "VIP"]);
    for (const tpl of CAMPAIGN_TEMPLATES) {
      expect(valid.has(tpl.targetSegment)).toBe(true);
    }
  });
});
