import { test, expect } from "./fixtures";

test.describe("Cookie banner et préférences", () => {
  test("Bannière cookies apparaît à la 1ère visite (pas de cookie)", async ({ page, context }) => {
    // Vider tous les cookies + localStorage
    await context.clearCookies();
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Bannière doit apparaître
    await expect(
      page.getByRole("dialog", { name: /Information cookies/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Click 'J'ai compris' ferme la bannière et persiste le choix", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const banner = page.getByRole("dialog", { name: /Information cookies/i });
    await expect(banner).toBeVisible();

    await page.getByRole("button", { name: /J'ai compris/i }).click();

    // La bannière disparaît
    await expect(banner).toBeHidden();

    // Et n'apparaît plus au reload
    await page.reload();
    await expect(banner).toBeHidden({ timeout: 3_000 });
  });

  test("Click 'Préférences' ouvre la modal détaillée", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole("button", { name: /Préférences/i }).click();
    await expect(page.getByRole("dialog", { name: /Gérer mes cookies/i })).toBeVisible();
  });

  test("Modal préférences mentionne les cookies NextAuth strictement nécessaires", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole("button", { name: /Préférences/i }).click();
    const modal = page.getByRole("dialog", { name: /Gérer mes cookies/i });
    await expect(modal).toContainText("next-auth.session-token");
    await expect(modal).toContainText("Toujours actif");
  });
});
