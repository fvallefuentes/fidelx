import { describe, it, expect } from "vitest";
import { normalizeEmail, normalizePhone } from "@/lib/normalize";

describe("normalizeEmail", () => {
  it("trims and lowercases standard emails", () => {
    expect(normalizeEmail("  Marie@Example.COM  ")).toBe("marie@example.com");
    expect(normalizeEmail("simple@x.ch")).toBe("simple@x.ch");
  });

  it("returns null for null/undefined/empty", () => {
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail("")).toBeNull();
  });

  it("strips dots from Gmail local part", () => {
    expect(normalizeEmail("marie.test@gmail.com")).toBe("marietest@gmail.com");
    expect(normalizeEmail("a.b.c.d@gmail.com")).toBe("abcd@gmail.com");
  });

  it("strips +alias from Gmail", () => {
    expect(normalizeEmail("marie+promo@gmail.com")).toBe("marie@gmail.com");
    expect(normalizeEmail("marie.test+anything@gmail.com")).toBe("marietest@gmail.com");
  });

  it("treats googlemail.com same as gmail.com", () => {
    expect(normalizeEmail("marie.test@googlemail.com")).toBe("marietest@gmail.com");
    expect(normalizeEmail("Marie+x@GoogleMail.com")).toBe("marie@gmail.com");
  });

  it("preserves dots and +alias for non-Gmail providers", () => {
    expect(normalizeEmail("marie.test@outlook.com")).toBe("marie.test@outlook.com");
    expect(normalizeEmail("marie+promo@protonmail.com")).toBe("marie+promo@protonmail.com");
    expect(normalizeEmail("MARIE@INFOMANIAK.COM")).toBe("marie@infomaniak.com");
  });

  it("handles malformed emails gracefully (no @)", () => {
    expect(normalizeEmail("invalid")).toBe("invalid");
  });
});

describe("normalizePhone", () => {
  it("returns null for null/undefined/empty", () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("  ")).toBeNull();
  });

  it("converts Swiss national format to E.164", () => {
    expect(normalizePhone("0791234567")).toBe("+41791234567");
    expect(normalizePhone("079 123 45 67")).toBe("+41791234567");
    expect(normalizePhone("079-123-4567")).toBe("+41791234567"); // 10 chars → swiss
  });

  it("handles international with +41", () => {
    expect(normalizePhone("+41 79 123 45 67")).toBe("+41791234567");
    expect(normalizePhone("+41791234567")).toBe("+41791234567");
  });

  it("handles 00-prefixed international", () => {
    expect(normalizePhone("0041 79 123 45 67")).toBe("+41791234567");
  });

  it("preserves other international formats", () => {
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
    expect(normalizePhone("+1 415 555 1234")).toBe("+14155551234");
  });

  it("rejects too short numbers", () => {
    expect(normalizePhone("12345")).toBeNull();
  });

  it("handles dots and dashes as separators", () => {
    expect(normalizePhone("079.123.45.67")).toBe("+41791234567");
    expect(normalizePhone("+41-79-123-45-67")).toBe("+41791234567");
  });

  it("strips parentheses", () => {
    expect(normalizePhone("(079) 123 45 67")).toBe("+41791234567");
  });
});
