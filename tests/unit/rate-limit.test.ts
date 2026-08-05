import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    joinAttempt: {
      count: mocks.count,
    },
  },
}));

import { evaluateRateLimits } from "@/lib/anti-abuse/rate-limit";

describe("evaluateRateLimits", () => {
  beforeEach(() => {
    mocks.count.mockReset();
  });

  it("never blocks a shared IP and returns an admin warning", async () => {
    mocks.count.mockResolvedValue(25);

    const verdict = await evaluateRateLimits({
      programId: "program-1",
      ipPrefix: "192.168.1.0/24",
      email: null,
      phone: null,
      deviceCookie: null,
      fingerprint: null,
    });

    expect(verdict).toEqual({
      ok: true,
      warnings: ["ip-global-1h-alert"],
    });
    expect(mocks.count).toHaveBeenCalledOnce();
  });

  it("keeps the email limit per program", async () => {
    mocks.count.mockResolvedValue(1);

    const verdict = await evaluateRateLimits({
      programId: "program-1",
      ipPrefix: null,
      email: "client@example.com",
      phone: null,
      deviceCookie: null,
      fingerprint: null,
    });

    expect(verdict).toMatchObject({
      ok: false,
      rule: "email-program-24h",
    });
  });

  it("uses the device cookie instead of fingerprint when both exist", async () => {
    mocks.count.mockResolvedValue(0);

    const verdict = await evaluateRateLimits({
      programId: "program-1",
      ipPrefix: null,
      email: null,
      phone: null,
      deviceCookie: "device-1",
      fingerprint: "fingerprint-1",
    });

    expect(verdict).toEqual({ ok: true, warnings: [] });
    expect(mocks.count).toHaveBeenCalledOnce();
    expect(mocks.count.mock.calls[0][0].where).toMatchObject({
      deviceCookie: "device-1",
    });
  });

  it("keeps fingerprint as fallback when the cookie is absent", async () => {
    mocks.count.mockResolvedValue(5);

    const verdict = await evaluateRateLimits({
      programId: "program-1",
      ipPrefix: null,
      email: null,
      phone: null,
      deviceCookie: null,
      fingerprint: "fingerprint-1",
    });

    expect(verdict).toMatchObject({ ok: false, rule: "fp-global-24h" });
  });
});
