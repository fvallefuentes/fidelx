import { test, expect } from "./fixtures";

test.describe("SEO meta tags + sitemap", () => {
  test("homepage a meta description et OG tags", async ({ page }) => {
    await page.goto("/");
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description).toBeTruthy();
    expect(description!.toLowerCase()).toContain("carte de fidélité");

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(ogTitle).toBeTruthy();

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toBeTruthy();
  });

  test("homepage a canonical tag pointant vers / (sans paramètres)", async ({ page }) => {
    await page.goto("/?utm_source=test");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBeTruthy();
    expect(canonical).toMatch(/^https:\/\/(www\.)?fidlify\.com\/?$/);
  });

  test("homepage a viewport mobile-friendly", async ({ page }) => {
    await page.goto("/");
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).toContain("width=device-width");
  });

  test("homepage a JSON-LD Organization", async ({ page }) => {
    await page.goto("/");
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    const hasOrganization = scripts.some((s) => s.includes('"@type":"Organization"'));
    expect(hasOrganization).toBe(true);
  });

  test("homepage a JSON-LD SoftwareApplication", async ({ page }) => {
    await page.goto("/");
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    const hasSoftware = scripts.some((s) => s.includes('"@type":"SoftwareApplication"'));
    expect(hasSoftware).toBe(true);
  });

  test("homepage a JSON-LD FAQPage", async ({ page }) => {
    await page.goto("/");
    // Wait for hydration : le FAQ JSON-LD est rendu dans le composant client
    await page.waitForLoadState("networkidle");
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    // Match avec ou sans espaces autour des `:` selon le serializer
    const hasFaq = scripts.some(
      (s) => /["']?@type["']?\s*:\s*["']FAQPage["']/.test(s)
    );
    expect(hasFaq).toBe(true);
  });

  test("Apple Wallet et Google Wallet sont mentionnés explicitement", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html).toContain("Apple Wallet");
    expect(html).toContain("Google Wallet");
  });

  test("Mention 'Suisse romande' ou 'Suisse' visible (positioning local)", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.match(/Suisse/i)).toBeTruthy();
  });

  test("Header de sécurité HSTS présent dans la réponse", async ({ request }) => {
    const res = await request.get("/");
    const hsts = res.headers()["strict-transport-security"];
    expect(hsts).toBeTruthy();
    expect(hsts).toContain("max-age");
  });

  test("Header X-Content-Type-Options nosniff présent", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });
});
