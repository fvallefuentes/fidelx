import { test, expect } from "@playwright/test";

test.describe("Card recovery flow", () => {
  test("/carte/[serial-inexistant] retourne 404 (notFound)", async ({ page }) => {
    const res = await page.goto("/carte/INEXISTANT-1234-5678", { waitUntil: "domcontentloaded" });
    // Soit 404, soit la page Next 404
    expect([404, 200]).toContain(res?.status() || 0);
    if (res?.status() === 200) {
      // Next.js notFound() peut retourner 404 dans le HTML
      const html = await page.content();
      expect(html).toMatch(/404|introuvable|not.found/i);
    }
  });

  test("/api/cards/[serial-inexistant]/recovery retourne 404", async ({ request }) => {
    const res = await request.get("/api/cards/INEXISTANT-1234-5678/recovery");
    expect(res.status()).toBe(404);
  });

  test("Robots.txt disallow /carte/ (pas indexable)", async ({ request }) => {
    // C'est le seul moyen fiable de tester l'isolation des cartes :
    // un serialNumber invalide retourne 404 sans rendre la page complète,
    // donc on ne peut pas vérifier le meta robots. On vérifie la stratégie
    // SEO globale au niveau robots.txt à la place.
    const res = await request.get("/robots.txt");
    const text = await res.text();
    expect(text).toContain("Disallow: /carte/");
  });
});
