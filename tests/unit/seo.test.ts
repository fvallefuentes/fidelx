import { describe, it, expect } from "vitest";
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  FAQ_ITEMS,
} from "@/lib/seo";

describe("SEO constants", () => {
  it("SITE_URL is HTTPS and points to www.fidlify.com", () => {
    expect(SITE_URL).toBe("https://www.fidlify.com");
  });

  it("SITE_NAME is Fidlify", () => {
    expect(SITE_NAME).toBe("Fidlify");
  });

  it("DEFAULT_TITLE has primary keyword 'carte de fidélité digitale'", () => {
    expect(DEFAULT_TITLE.toLowerCase()).toContain("carte de fidélité digitale");
  });

  it("DEFAULT_DESCRIPTION mentions Apple Wallet + Google Wallet", () => {
    expect(DEFAULT_DESCRIPTION).toContain("Apple Wallet");
    expect(DEFAULT_DESCRIPTION).toContain("Google Wallet");
  });

  it("DEFAULT_DESCRIPTION respecte ~160 chars (SEO best practice)", () => {
    expect(DEFAULT_DESCRIPTION.length).toBeLessThanOrEqual(200);
    expect(DEFAULT_DESCRIPTION.length).toBeGreaterThan(80);
  });

  it("DEFAULT_KEYWORDS contient les mots-clés-business principaux", () => {
    const keywords = DEFAULT_KEYWORDS.map((k) => k.toLowerCase());
    expect(keywords).toContain("carte de fidélité digitale");
    expect(keywords).toContain("logiciel de fidélisation");
    expect(keywords.some((k) => k.includes("apple wallet"))).toBe(true);
    expect(keywords.some((k) => k.includes("google wallet"))).toBe(true);
  });

  it("FAQ_ITEMS contient au moins 7 questions", () => {
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(7);
  });

  it("FAQ_ITEMS chaque item a 'q' et 'a' non-vides", () => {
    for (const item of FAQ_ITEMS) {
      expect(item.q).toBeTruthy();
      expect(item.q.length).toBeGreaterThan(10);
      expect(item.a).toBeTruthy();
      expect(item.a.length).toBeGreaterThan(20);
    }
  });

  it("FAQ ne contient PLUS la réf à 'Starter 19 CHF' (fix copywriting audit)", () => {
    for (const item of FAQ_ITEMS) {
      expect(item.a.toLowerCase()).not.toContain("starter");
      expect(item.a).not.toContain("19 CHF");
    }
  });

  it("FAQ ne contient plus 'présents sur 100% des smartphones' (claim trop absolu)", () => {
    for (const item of FAQ_ITEMS) {
      expect(item.a).not.toContain("100%");
    }
  });
});
