export interface SwissAddressResult {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

interface GeoAdminSearchResult {
  id?: string | number;
  attrs?: {
    label?: string;
    lat?: number | string;
    lon?: number | string;
  };
}

interface GeoAdminSearchPayload {
  results?: GeoAdminSearchResult[];
}

export function buildSwissAddressSearchUrl(query: string) {
  const url = new URL("https://api3.geo.admin.ch/rest/services/api/SearchServer");
  url.search = new URLSearchParams({
    searchText: query.trim(),
    type: "locations",
    origins: "address",
    sr: "4326",
    limit: "6",
  }).toString();
  return url.toString();
}

export function normalizeSwissAddressResults(payload: unknown): SwissAddressResult[] {
  if (!payload || typeof payload !== "object") return [];

  const results = (payload as GeoAdminSearchPayload).results;
  if (!Array.isArray(results)) return [];

  return results.flatMap((result, index) => {
    const latitude = Number(result?.attrs?.lat);
    const longitude = Number(result?.attrs?.lon);
    const label = stripHtml(result?.attrs?.label ?? "");

    if (
      !label ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return [];
    }

    return [{
      id: String(result.id ?? `${latitude}-${longitude}-${index}`),
      label,
      latitude,
      longitude,
    }];
  });
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
