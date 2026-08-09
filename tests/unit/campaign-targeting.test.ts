import { describe, expect, it } from "vitest";
import {
  getExactAudienceCooldownDays,
  getExactAudienceMode,
  getExactTargetCardIds,
} from "@/lib/campaign-targeting";

describe("campaign exact targeting", () => {
  it("normalizes an exact audience snapshot", () => {
    expect(
      getExactTargetCardIds({ targetCardIds: ["card-1", "card-1", "", 42, "card-2"] })
    ).toEqual(["card-1", "card-2"]);
  });

  it("recognizes manual and saved-list audiences", () => {
    expect(getExactAudienceMode({ audienceMode: "MANUAL" })).toBe("MANUAL");
    expect(getExactAudienceMode({ audienceMode: "LIST" })).toBe("LIST");
    expect(getExactAudienceMode({ audienceMode: "SEGMENT" })).toBeNull();
  });

  it("does not silently apply the recommendation cooldown to explicit recipients", () => {
    expect(getExactAudienceCooldownDays({ audienceMode: "MANUAL" })).toBe(0);
    expect(getExactAudienceCooldownDays({ audienceMode: "LIST" })).toBe(0);
    expect(getExactAudienceCooldownDays({ targetCardIds: ["recommended-card"] })).toBe(7);
  });
});
