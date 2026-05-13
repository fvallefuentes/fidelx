import { test, expect } from "./fixtures";

test.describe("Auth flows", () => {
  test("/login affiche le form avec le lien 'Mot de passe oublié ?'", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(page.getByRole("link", { name: /Mot de passe oublié/i })).toBeVisible();
  });

  test("clic sur 'Mot de passe oublié' redirige vers /forgot-password", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /Mot de passe oublié/i }).click();
    await expect(page).toHaveURL(/forgot-password/);
    await expect(page.locator("h1")).toContainText(/Mot de passe oublié/i);
  });

  test("/forgot-password affiche message opaque même pour email inexistant", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.locator("input#email").fill("inexistant-test@example.com");
    await page.getByRole("button", { name: /Envoyer/i }).click();
    // Réponse opaque : on affiche TOUJOURS le message succès
    await expect(page.locator(".auth-success")).toBeVisible({ timeout: 10_000 });
  });

  test("/login avec creds invalides reste sur la page avec erreur", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input#email").fill("nimporte@quoi.fake");
    await page.locator("input#password").fill("wrong-password-test");
    await page.getByRole("button", { name: /Se connecter/i }).click();
    // Doit afficher une erreur (et NE pas rediriger vers /dashboard)
    await expect(page.locator(".auth-error")).toBeVisible({ timeout: 10_000 });
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test("/register affiche le form avec les 3 champs requis", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("input#name")).toBeVisible();
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
  });

  test("/reset-password sans token affiche erreur", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.locator(".auth-error")).toBeVisible();
  });

  test("/reset-password avec mauvais token rejette à la soumission", async ({ page }) => {
    await page.goto("/reset-password?token=invalide");
    await page.locator("input#password").fill("nouveaupass1234");
    await page.locator("input#confirm").fill("nouveaupass1234");
    await page.getByRole("button", { name: /Définir/i }).click();
    await expect(page.locator(".auth-error")).toBeVisible({ timeout: 10_000 });
  });

  test("/dashboard non-authentifié → redirect /login", async ({ page }) => {
    const res = await page.goto("/dashboard");
    // Soit le client redirige (302/307), soit la page affiche /login après hydratation
    await page.waitForURL(/login/, { timeout: 10_000 });
  });

  test("/admin non-authentifié → redirect /login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/login/, { timeout: 10_000 });
  });
});
