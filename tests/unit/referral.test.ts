import { describe, it, expect } from "vitest";
import {
  MERCHANT_REFERRAL_COOKIE,
  buildReferralCookieHeader,
  readReferralCookie,
  buildClearReferralCookieHeader,
  MAX_MONTHS_CUMULATIVE,
  SAFETY_WINDOW_DAYS,
} from "@/lib/referral/merchant";

describe("buildReferralCookieHeader", () => {
  it("inclut le nom et la valeur du code", () => {
    const header = buildReferralCookieHeader("cafe-bellini-r2x9");
    expect(header).toContain(`${MERCHANT_REFERRAL_COOKIE}=cafe-bellini-r2x9`);
  });

  it("définit Max-Age à 30 jours", () => {
    const header = buildReferralCookieHeader("test");
    const expected = 60 * 60 * 24 * 30;
    expect(header).toContain(`Max-Age=${expected}`);
  });

  it("inclut HttpOnly et SameSite=Lax (cross-site nav depuis email/WhatsApp)", () => {
    const header = buildReferralCookieHeader("test");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
  });

  it("inclut Path=/ pour être lu sur toute l'app", () => {
    const header = buildReferralCookieHeader("test");
    expect(header).toContain("Path=/");
  });

  it("encode URI-correctement les caractères spéciaux du code", () => {
    const header = buildReferralCookieHeader("café@bellini");
    // Le code est passé par encodeURIComponent
    expect(header).toContain(encodeURIComponent("café@bellini"));
  });
});

describe("readReferralCookie", () => {
  it("lit le code depuis le header Cookie", () => {
    const cookie = `${MERCHANT_REFERRAL_COOKIE}=cafe-bellini-r2x9; another=foo`;
    expect(readReferralCookie(cookie)).toBe("cafe-bellini-r2x9");
  });

  it("retourne null si le cookie n'est pas présent", () => {
    expect(readReferralCookie("other=foo; bar=baz")).toBeNull();
    expect(readReferralCookie("")).toBeNull();
    expect(readReferralCookie(null)).toBeNull();
  });

  it("decode les caractères URI-encodés", () => {
    const encoded = encodeURIComponent("café-bellini");
    const cookie = `${MERCHANT_REFERRAL_COOKIE}=${encoded}`;
    expect(readReferralCookie(cookie)).toBe("café-bellini");
  });

  it("trouve le cookie même s'il n'est pas en premier", () => {
    const cookie = `session=abc; theme=dark; ${MERCHANT_REFERRAL_COOKIE}=mycode; lang=fr`;
    expect(readReferralCookie(cookie)).toBe("mycode");
  });

  it("ne confond pas avec un cookie de nom similaire", () => {
    // fidlify_mref_old ne doit PAS être lu comme fidlify_mref
    const cookie = `${MERCHANT_REFERRAL_COOKIE}_old=fake; other=foo`;
    expect(readReferralCookie(cookie)).toBeNull();
  });
});

describe("buildClearReferralCookieHeader", () => {
  it("pose Max-Age=0 pour effacer le cookie", () => {
    const header = buildClearReferralCookieHeader();
    expect(header).toContain(`${MERCHANT_REFERRAL_COOKIE}=`);
    expect(header).toContain("Max-Age=0");
  });

  it("garde Path=/ pour matcher le cookie original", () => {
    const header = buildClearReferralCookieHeader();
    expect(header).toContain("Path=/");
  });
});

describe("Constantes parrainage", () => {
  it("cap parrain = 12 mois cumulés", () => {
    expect(MAX_MONTHS_CUMULATIVE).toBe(12);
  });

  it("safety window = 14 jours (= fenêtre de refund Stripe standard)", () => {
    expect(SAFETY_WINDOW_DAYS).toBe(14);
  });
});

describe("Cookie name", () => {
  it("utilise un prefix Fidlify identifiable", () => {
    expect(MERCHANT_REFERRAL_COOKIE).toMatch(/^fidlify_/);
  });
});
