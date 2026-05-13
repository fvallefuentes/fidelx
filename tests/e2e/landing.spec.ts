import { test, expect } from "./fixtures";

test.describe("Landing page", () => {
  test("homepage charge avec H1 SEO + hero", async ({ page }) => {
    await page.goto("/");
    // Le H1 SEO caché est en premier dans le DOM
    await expect(page.locator("h1")).toContainText(/Carte de fidélité digitale/i);
    // Le titre du document doit contenir Fidlify
    await expect(page).toHaveTitle(/Fidlify/);
  });

  test("FAQ ne contient plus 'Starter 19 CHF' (fix copywriting audit)", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html).not.toContain("Starter");
    expect(html).not.toContain("19 CHF/mois");
  });

  test("footer contient les 4 liens légaux publiés", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: /Mentions/i })).toBeVisible();
    await expect(footer.getByRole("link", { name: /Confidentialité/i })).toBeVisible();
    await expect(footer.getByRole("link", { name: /Cookies/i })).toBeVisible();
    await expect(footer.getByRole("link", { name: /CGU/i })).toBeVisible();
  });

  test("footer NE contient PAS de liens CGV/DPA (en cours de rédaction)", async ({ page }) => {
    await page.goto("/");
    const footerHtml = await page.locator("footer").innerHTML();
    expect(footerHtml).not.toContain("/cgv");
    expect(footerHtml).not.toContain("/dpa");
  });

  test("bouton 'Gérer mes cookies' ouvre la modal", async ({ page }) => {
    await page.goto("/");
    // Le bouton dans le footer a un aria-label spécifique (prime sur le texte)
    await page
      .locator("footer")
      .getByRole("button", { name: /Ouvrir la fenêtre de gestion des cookies/i })
      .click();
    // Modal : on cherche par le H2 (aria-labelledby="cookie-modal-title")
    await expect(page.locator("#cookie-modal-title")).toBeVisible();
  });

  test("robots.txt accessible avec Disallow correct", async ({ page }) => {
    const res = await page.request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("Disallow: /api/");
    expect(text).toContain("Disallow: /admin");
    expect(text).toContain("Disallow: /dashboard");
    expect(text).toContain("Sitemap:");
  });

  test("sitemap.xml accessible et contient les pages légales", async ({ page }) => {
    const res = await page.request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("https://www.fidlify.com/");
    expect(text).toContain("/mentions-legales");
    expect(text).toContain("/politique-de-confidentialite");
    expect(text).toContain("/politique-cookies");
    expect(text).toContain("/cgu");
  });

  test("manifest.webmanifest valide pour PWA", async ({ page }) => {
    const res = await page.request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.name).toContain("Fidlify");
    expect(json.display).toBe("standalone");
    expect(json.start_url).toBe("/dashboard");
    expect(json.icons.length).toBeGreaterThan(0);
  });

  test("icon.svg accessible et contient FIDLIFY label", async ({ page }) => {
    const res = await page.request.get("/icon.svg");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/svg+xml");
  });
});
