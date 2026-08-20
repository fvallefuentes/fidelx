import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contactCard: { findUnique },
  },
}));

import { generateContactApplePass } from "@/lib/wallet/contact-apple";

const card = {
  id: "contact-card-1",
  slug: "studio-horizon-123",
  isActive: true,
  displayName: "Sophie Martin",
  companyName: "Studio Horizon",
  jobTitle: "Fondatrice",
  phone: "+41 79 123 45 67",
  email: "sophie@example.com",
  website: "https://example.com",
};

describe("contact Apple Wallet pass modes", () => {
  beforeEach(() => {
    findUnique.mockResolvedValue(card);
    delete process.env.APPLE_PASS_TYPE_ID;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.fidlify.com";
  });

  it("keeps the recipient pass free of a sharing QR code", async () => {
    const result = await generateContactApplePass(card.slug, "recipient");
    const payload = JSON.parse(result!.toString());

    expect(payload.serialNumber).toBe("contact-contact-card-1");
    expect(payload.barcode).toBeNull();
  });

  it("adds the public contact URL only to the merchant sharing pass", async () => {
    const result = await generateContactApplePass(card.slug, "share");
    const payload = JSON.parse(result!.toString());

    expect(payload.serialNumber).toBe("contact-share-contact-card-1");
    expect(payload.barcode).toBe("https://www.fidlify.com/contact/studio-horizon-123");
  });
});
