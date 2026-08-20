import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  buildVCard,
  createContactCardSlug,
  digitsOnly,
  normalizeWebUrl,
} from "@/lib/contact-card";

describe("contact card", () => {
  it("creates a stable public slug without accents", () => {
    expect(createContactCardSlug("Café du Marché", "merchant_1234567890"))
      .toBe("cafe-du-marche-1234567890");
  });

  it("normalizes web links and rejects unsafe protocols", () => {
    expect(normalizeWebUrl("fidlify.com/contact")).toBe("https://fidlify.com/contact");
    expect(normalizeWebUrl("https://fidlify.com/contact")).toBe("https://fidlify.com/contact");
    expect(normalizeWebUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeWebUrl("not a url")).toBeNull();
  });

  it("builds an importable vCard and escapes user content", () => {
    const vcard = buildVCard({
      displayName: "Léa Martin",
      companyName: "Atelier, Léa",
      jobTitle: "Fondatrice",
      phone: "+41 79 123 45 67",
      email: "lea@example.com",
      website: "atelier-lea.ch",
      address: "Rue du Lac 1; Lausanne",
      whatsapp: "+41 79 123 45 67",
      bookingUrl: null,
    });

    expect(vcard).toContain("BEGIN:VCARD\r\nVERSION:3.0");
    expect(vcard).toContain("ORG:Atelier\\, Léa");
    expect(vcard).toContain("URL:https://atelier-lea.ch/");
    expect(vcard).toContain(`https://wa.me/${digitsOnly("+41 79 123 45 67")}`);
    expect(vcard.endsWith("END:VCARD\r\n")).toBe(true);
  });
});
