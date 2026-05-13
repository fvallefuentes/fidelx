import { test, expect } from "./fixtures";

test.describe("Pages légales", () => {
  const pages = [
    { path: "/mentions-legales", title: /Mentions légales/i },
    { path: "/politique-de-confidentialite", title: /Politique de confidentialité/i },
    { path: "/politique-cookies", title: /Politique cookies/i },
    { path: "/cgu", title: /Conditions générales/i },
  ];

  for (const { path, title } of pages) {
    test(`${path} accessible avec H1 correct`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1").first()).toContainText(title);
    });

    test(`${path} ne contient PAS de placeholder juridique pré-immatriculation`, async ({ page }) => {
      await page.goto(path);
      const html = await page.content();
      expect(html).not.toContain("RAISON_SOCIALE_OFFICIELLE");
      expect(html).not.toContain("CHE-XXX");
      expect(html).not.toContain("ADRESSE_COMPLÈTE");
      expect(html).not.toContain("CANTON_DU_SIÈGE");
      expect(html).not.toContain("DATE_PUBLICATION");
      expect(html).not.toContain("à compléter");
    });

    // Note : seules les pages Mentions légales et Politique confidentialité
    // affichent explicitement les noms (les autres renvoient vers elles)
    if (path === "/mentions-legales" || path === "/politique-de-confidentialite") {
      test(`${path} affiche les coéditeurs réels`, async ({ page }) => {
        await page.goto(path);
        const html = await page.content();
        expect(html).toContain("Fabian Valle Fuentes");
        expect(html).toContain("Ludovic Pavesi");
      });
    }

    test(`${path} mentionne Infomaniak comme hébergeur`, async ({ page }) => {
      await page.goto(path);
      const html = await page.content();
      // Au moins Mentions légales doit mentionner Infomaniak
      if (path === "/mentions-legales") {
        expect(html).toContain("Infomaniak");
      }
    });
  }

  test("politique-cookies a un bouton 'Gérer mes cookies' qui ouvre la modal", async ({ page }) => {
    await page.goto("/politique-cookies");
    // Cliquer sur le bouton CTA dans la page (pas celui du footer)
    await page
      .locator("main, .legal-content, .legal-cta-box")
      .getByRole("button", { name: /Gérer mes cookies/i })
      .first()
      .click();
    await expect(page.locator("#cookie-modal-title")).toBeVisible();
  });

  test("liens internes inter-pages fonctionnent", async ({ page }) => {
    await page.goto("/mentions-legales");
    await page.getByRole("link", { name: /Politique de confidentialité/i }).first().click();
    await expect(page).toHaveURL(/politique-de-confidentialite/);
  });
});
