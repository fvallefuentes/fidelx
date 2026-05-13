import { describe, it, expect } from "vitest";
import { generateSerialNumber } from "@/lib/utils";

describe("generateSerialNumber", () => {
  it("returns 14-char string with 2 dashes (XXXX-XXXX-XXXX format)", () => {
    const sn = generateSerialNumber();
    expect(sn).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("uses only uppercase letters and digits", () => {
    for (let i = 0; i < 100; i++) {
      const sn = generateSerialNumber();
      expect(sn).toMatch(/^[A-Z0-9-]+$/);
    }
  });

  it("generates unique values", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      set.add(generateSerialNumber());
    }
    // 36^12 ≈ 4.7×10^18 → collisions improbables sur 1000 runs
    expect(set.size).toBe(1000);
  });
});
