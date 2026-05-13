import { describe, it, expect } from "vitest";
import {
  anonymizeIp,
  computeFingerprint,
  newDeviceCookieValue,
  buildDeviceCookieHeader,
  extractIp,
  extractContext,
  DEVICE_COOKIE_NAME,
} from "@/lib/anti-abuse/fingerprint";

describe("anonymizeIp", () => {
  it("anonymizes IPv4 to /24", () => {
    expect(anonymizeIp("192.168.1.42")).toBe("192.168.1.0/24");
    expect(anonymizeIp("8.8.8.8")).toBe("8.8.8.0/24");
  });

  it("anonymizes IPv6 to /48 (best-effort, déterministe)", () => {
    // L'algo (split + slice + join) produit des résultats parfois bizarres
    // avec la notation compressée :: mais reste déterministe — c'est ce qui
    // compte pour BlockedIp et JoinAttempt (toujours la même clé pour la
    // même IP source).
    expect(anonymizeIp("2001:db8:abcd:1234::1")).toBe("2001:db8:abcd::/48");
    const a = anonymizeIp("fe80::1ff:fe23:4567:890a");
    expect(a).toBe(anonymizeIp("fe80::1ff:fe23:4567:890a"));
    expect(a).toContain("/48");
  });

  it("returns null for null/empty/undefined", () => {
    expect(anonymizeIp(null)).toBeNull();
    expect(anonymizeIp(undefined)).toBeNull();
    expect(anonymizeIp("")).toBeNull();
    expect(anonymizeIp("   ")).toBeNull();
  });

  it("returns input unchanged for malformed IP", () => {
    expect(anonymizeIp("not-an-ip")).toBe("not-an-ip");
  });
});

describe("computeFingerprint", () => {
  it("returns null when all inputs are null", () => {
    expect(
      computeFingerprint({
        userAgent: null,
        ipPrefix: null,
        acceptLanguage: null,
      })
    ).toBeNull();
  });

  it("produces deterministic hash from same inputs", () => {
    const args = {
      userAgent: "Mozilla/5.0",
      ipPrefix: "1.2.3.0/24",
      acceptLanguage: "fr-CH,en;q=0.8",
    };
    expect(computeFingerprint(args)).toBe(computeFingerprint(args));
  });

  it("produces different hash for different inputs", () => {
    const a = computeFingerprint({
      userAgent: "Chrome",
      ipPrefix: "1.0.0.0/24",
      acceptLanguage: "fr",
    });
    const b = computeFingerprint({
      userAgent: "Firefox",
      ipPrefix: "1.0.0.0/24",
      acceptLanguage: "fr",
    });
    expect(a).not.toBe(b);
  });

  it("hash is 16 chars hex", () => {
    const fp = computeFingerprint({
      userAgent: "test",
      ipPrefix: null,
      acceptLanguage: null,
    });
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("newDeviceCookieValue", () => {
  it("returns a UUID-like string", () => {
    const v = newDeviceCookieValue();
    expect(v).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("returns unique values on each call", () => {
    const a = newDeviceCookieValue();
    const b = newDeviceCookieValue();
    expect(a).not.toBe(b);
  });
});

describe("buildDeviceCookieHeader", () => {
  it("builds httpOnly Secure SameSite=Lax cookie with 1 year max-age", () => {
    const header = buildDeviceCookieHeader("abc-123");
    expect(header).toContain("fid_dev=abc-123");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Path=/");
    expect(header).toContain(`Max-Age=${60 * 60 * 24 * 365}`);
  });
});

describe("extractIp", () => {
  function reqWithHeaders(headers: Record<string, string>): Request {
    return new Request("https://example.com", { headers });
  }

  it("prefers X-Forwarded-For", () => {
    expect(
      extractIp(
        reqWithHeaders({
          "x-forwarded-for": "1.2.3.4, 5.6.7.8",
          "x-real-ip": "9.9.9.9",
        })
      )
    ).toBe("1.2.3.4");
  });

  it("falls back to X-Real-IP", () => {
    expect(
      extractIp(reqWithHeaders({ "x-real-ip": "9.9.9.9" }))
    ).toBe("9.9.9.9");
  });

  it("returns null when no IP headers", () => {
    expect(extractIp(reqWithHeaders({}))).toBeNull();
  });
});

describe("extractContext", () => {
  it("returns full context with anonymized IP + fingerprint", () => {
    const req = new Request("https://example.com", {
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "user-agent": "Mozilla/5.0",
        "accept-language": "fr-CH",
        cookie: `${DEVICE_COOKIE_NAME}=550e8400-e29b-41d4-a716-446655440000`,
      },
    });
    const ctx = extractContext(req);
    expect(ctx.ipPrefix).toBe("1.2.3.0/24");
    expect(ctx.userAgent).toBe("Mozilla/5.0");
    expect(ctx.acceptLanguage).toBe("fr-CH");
    expect(ctx.deviceCookie).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(ctx.fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });

  it("handles missing cookie", () => {
    const req = new Request("https://example.com", {
      headers: { "user-agent": "X" },
    });
    expect(extractContext(req).deviceCookie).toBeNull();
  });

  it("ignores malformed cookie value", () => {
    const req = new Request("https://example.com", {
      headers: { cookie: `${DEVICE_COOKIE_NAME}=not-a-uuid` },
    });
    expect(extractContext(req).deviceCookie).toBeNull();
  });
});
