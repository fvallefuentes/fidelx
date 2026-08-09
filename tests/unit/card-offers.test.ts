import { describe, expect, it } from "vitest";
import {
  offerIntervalsOverlap,
  resolveActiveCardOffer,
  resolveVisibleCardOffer,
} from "../../src/lib/card-offers";
import { buildLoyaltyObject } from "../../src/lib/wallet/google";

const now = new Date("2026-08-09T12:00:00.000Z");

describe("card offers", () => {
  it("returns the active program offer", () => {
    expect(
      resolveActiveCardOffer(
        {
          activeOfferCampaignId: "campaign-1",
          activeOfferTitle: "Offre",
          activeOfferMessage: "-20% aujourd'hui",
          activeOfferStartsAt: new Date("2026-08-09T08:00:00.000Z"),
          activeOfferEndsAt: new Date("2026-08-10T08:00:00.000Z"),
        },
        now
      )?.message
    ).toBe("-20% aujourd'hui");
  });

  it("hides an expired temporary message", () => {
    expect(
      resolveVisibleCardOffer({
        program: {},
        lastMessage: "Ancienne offre",
        lastMessageExpiresAt: new Date("2026-08-09T11:59:59.000Z"),
        now,
      })
    ).toBeNull();
  });

  it("keeps a regular notification visible when it has no expiry", () => {
    expect(
      resolveVisibleCardOffer({
        program: {},
        lastMessage: "Actualité du commerce",
        now,
      })
    ).toBe("Actualité du commerce");
  });

  it("detects overlapping offer periods", () => {
    expect(
      offerIntervalsOverlap(
        { startsAt: new Date("2026-08-09"), endsAt: new Date("2026-08-15") },
        { startsAt: new Date("2026-08-14"), endsAt: new Date("2026-08-20") }
      )
    ).toBe(true);
    expect(
      offerIntervalsOverlap(
        { startsAt: new Date("2026-08-09"), endsAt: new Date("2026-08-15") },
        { startsAt: new Date("2026-08-15"), endsAt: new Date("2026-08-20") }
      )
    ).toBe(false);
  });

  it("adds the active offer to a Google Wallet object", () => {
    const object = buildLoyaltyObject({
      serialNumber: "CARD-123",
      classId: "issuer.program",
      clientName: "Ludo",
      currentStamps: 2,
      maxStamps: 10,
      currentPoints: 0,
      programType: "STAMPS",
      offerMessage: "-20% jusqu'à dimanche",
    }) as { textModulesData?: Array<{ id: string; body: string }> };

    expect(object.textModulesData).toContainEqual({
      id: "active_offer",
      header: "Offre en cours",
      body: "-20% jusqu'à dimanche",
    });
  });
});
