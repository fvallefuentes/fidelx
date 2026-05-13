import { describe, it, expect } from "vitest";
import {
  LEGAL_LAST_UPDATE,
  LEGAL_VERSION,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_SITE_URL,
  COFOUNDERS,
  HOST,
  LEGAL_PAGES,
} from "@/lib/legal";

describe("Legal constants (publication pré-immatriculation)", () => {
  it("LEGAL_VERSION is 1.0+", () => {
    expect(LEGAL_VERSION).toMatch(/^\d+\.\d+/);
  });

  it("LEGAL_LAST_UPDATE est une date FR lisible", () => {
    expect(LEGAL_LAST_UPDATE).toMatch(/\d+\s\w+\s\d{4}/);
  });

  it("PUBLIC_CONTACT_EMAIL est contact@fidlify.com (single source of truth)", () => {
    expect(PUBLIC_CONTACT_EMAIL).toBe("contact@fidlify.com");
  });

  it("PUBLIC_SITE_URL est HTTPS et matche SEO SITE_URL", () => {
    expect(PUBLIC_SITE_URL).toBe("https://www.fidlify.com");
  });

  it("COFOUNDERS contient exactement les 2 porteurs réels", () => {
    expect(COFOUNDERS).toHaveLength(2);
    const names = COFOUNDERS.map((c) => c.name);
    expect(names).toContain("Fabian Valle Fuentes");
    expect(names).toContain("Ludovic Pavesi");
  });

  it("HOST est Infomaniak en Suisse", () => {
    expect(HOST.name).toBe("Infomaniak Network SA");
    expect(HOST.country).toBe("Suisse");
    expect(HOST.url).toContain("infomaniak.com");
  });

  it("LEGAL_PAGES contient les 4 pages publiées (et non CGV / DPA)", () => {
    const hrefs = LEGAL_PAGES.map((p) => p.href);
    expect(hrefs).toContain("/mentions-legales");
    expect(hrefs).toContain("/politique-de-confidentialite");
    expect(hrefs).toContain("/politique-cookies");
    expect(hrefs).toContain("/cgu");
    // CGV et DPA NE doivent PAS être publiés à ce stade
    expect(hrefs).not.toContain("/cgv");
    expect(hrefs).not.toContain("/dpa");
  });
});
