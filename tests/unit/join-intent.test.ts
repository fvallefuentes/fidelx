import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createJoinIntent,
  JOIN_INTENT_TTL_SECONDS,
  verifyJoinIntent,
} from "@/lib/anti-abuse/join-intent";

describe("join intent", () => {
  const previousSecret = process.env.JOIN_INTENT_SECRET;

  beforeEach(() => {
    process.env.JOIN_INTENT_SECRET = "test-join-intent-secret";
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.JOIN_INTENT_SECRET;
    else process.env.JOIN_INTENT_SECRET = previousSecret;
  });

  it("accepts a valid token for the same target and device", () => {
    const now = Date.UTC(2026, 7, 5, 10, 0, 0);
    const token = createJoinIntent({
      scope: "program",
      targetId: "program-1",
      deviceCookie: "device-1",
      now,
    });

    expect(
      verifyJoinIntent({
        token,
        scope: "program",
        targetId: "program-1",
        deviceCookie: "device-1",
        now: now + 1_000,
      }).ok
    ).toBe(true);
  });

  it("rejects a token used for another program", () => {
    const token = createJoinIntent({
      scope: "program",
      targetId: "program-1",
      deviceCookie: "device-1",
    });

    expect(
      verifyJoinIntent({
        token,
        scope: "program",
        targetId: "program-2",
        deviceCookie: "device-1",
      })
    ).toEqual({ ok: false, reason: "wrong_target" });
  });

  it("rejects a token copied to another device", () => {
    const token = createJoinIntent({
      scope: "merchant",
      targetId: "merchant-1",
      deviceCookie: "device-1",
    });

    expect(
      verifyJoinIntent({
        token,
        scope: "merchant",
        targetId: "merchant-1",
        deviceCookie: "device-2",
      })
    ).toEqual({ ok: false, reason: "wrong_device" });
  });

  it("rejects expired and tampered tokens", () => {
    const now = Date.UTC(2026, 7, 5, 10, 0, 0);
    const token = createJoinIntent({
      scope: "program",
      targetId: "program-1",
      deviceCookie: "device-1",
      now,
    });

    expect(
      verifyJoinIntent({
        token,
        scope: "program",
        targetId: "program-1",
        deviceCookie: "device-1",
        now: now + JOIN_INTENT_TTL_SECONDS * 1000 + 1,
      })
    ).toEqual({ ok: false, reason: "expired" });

    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    expect(
      verifyJoinIntent({
        token: tampered,
        scope: "program",
        targetId: "program-1",
        deviceCookie: "device-1",
      })
    ).toEqual({ ok: false, reason: "invalid_signature" });
  });
});
