import { describe, expect, it } from "vitest";
import { canExpireCard } from "@/lib/card-lifecycle";

describe("card lifecycle", () => {
  it.each(["PENDING", "ACTIVE", "COMPLETED", "REWARD_PENDING"])(
    "allows %s cards to expire",
    (status) => {
      expect(canExpireCard(status)).toBe(true);
    }
  );

  it.each(["EXPIRED", "REVOKED"])("keeps %s as a final state", (status) => {
    expect(canExpireCard(status)).toBe(false);
  });
});
