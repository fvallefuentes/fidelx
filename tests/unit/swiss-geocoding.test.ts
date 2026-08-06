import { describe, expect, it } from "vitest";
import {
  buildSwissAddressSearchUrl,
  normalizeSwissAddressResults,
} from "../../src/lib/swiss-geocoding";

describe("Swiss address geocoding", () => {
  it("builds an address-only WGS84 search", () => {
    const url = new URL(buildSwissAddressSearchUrl(" Rue de Carouge 10, Genève "));

    expect(url.hostname).toBe("api3.geo.admin.ch");
    expect(url.searchParams.get("searchText")).toBe("Rue de Carouge 10, Genève");
    expect(url.searchParams.get("origins")).toBe("address");
    expect(url.searchParams.get("sr")).toBe("4326");
  });

  it("normalizes labels and ignores unusable results", () => {
    expect(normalizeSwissAddressResults({
      results: [
        {
          id: 42,
          attrs: {
            label: "Rue de <b>Carouge</b> 10, 1205 Genève",
            lat: "46.194",
            lon: 6.144,
          },
        },
        { id: 43, attrs: { label: "Adresse invalide", lat: 999, lon: 6.1 } },
      ],
    })).toEqual([
      {
        id: "42",
        label: "Rue de Carouge 10, 1205 Genève",
        latitude: 46.194,
        longitude: 6.144,
      },
    ]);
  });
});
