import { describe, expect, it } from "vitest";
import { getGoogleStampGridLayout } from "../../src/lib/wallet/google-stamp-grid";
import { buildLoyaltyObject } from "../../src/lib/wallet/google";

describe("Google Wallet stamp grid", () => {
  it("keeps stamps readable when the horizontal area inset is high", () => {
    const layout = getGoogleStampGridLayout({
      maxStamps: 7,
      stampAreaInset: 44,
      stampSpacing: "normal",
    });

    expect(layout.perRow).toBe(4);
    expect(layout.verticalPadding).toBe(32);
    expect(layout.radius).toBeGreaterThan(40);
  });

  it("versions the generated image URL to invalidate Google's cache", () => {
    const object = buildLoyaltyObject({
      serialNumber: "CARD-123",
      classId: "issuer.program",
      clientName: "Client",
      currentStamps: 2,
      maxStamps: 7,
      currentPoints: 0,
      programType: "STAMPS",
      appUrl: "https://www.fidlify.com",
      designVersion: "12345",
    }) as { heroImage?: { sourceUri?: { uri?: string } } };

    expect(object.heroImage?.sourceUri?.uri).toContain("12345-grid2");
  });
});
