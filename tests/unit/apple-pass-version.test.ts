import { describe, expect, it } from "vitest";
import {
  APPLE_PASS_SCHEMA_UPDATED_AT,
  getApplePassUpdatedAt,
} from "../../src/lib/wallet/apple-version";

function makeCard(
  establishment: { latitude: number | null; longitude: number | null } | null,
  programUpdatedAt = new Date("2026-01-02T00:00:00.000Z")
) {
  return {
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    program: {
      updatedAt: programUpdatedAt,
      merchant: { updatedAt: new Date("2026-01-03T00:00:00.000Z") },
      establishment,
    },
  };
}

describe("getApplePassUpdatedAt", () => {
  it("force la révision du schéma pour un pass géolocalisé", () => {
    const updatedAt = getApplePassUpdatedAt(
      makeCard({ latitude: 46.1984, longitude: 6.1432 })
    );

    expect(updatedAt).toEqual(APPLE_PASS_SCHEMA_UPDATED_AT);
  });

  it("ne force pas les passes sans géolocalisation", () => {
    const updatedAt = getApplePassUpdatedAt(makeCard(null));

    expect(updatedAt).toEqual(new Date("2026-01-03T00:00:00.000Z"));
  });

  it("conserve une modification métier plus récente que le schéma", () => {
    const programUpdatedAt = new Date("2026-09-01T00:00:00.000Z");
    const updatedAt = getApplePassUpdatedAt(
      makeCard({ latitude: 46.1984, longitude: 6.1432 }, programUpdatedAt)
    );

    expect(updatedAt).toEqual(programUpdatedAt);
  });
});
