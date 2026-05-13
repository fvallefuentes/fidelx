import { test, expect } from "./fixtures";

/**
 * Vérifie que les pages /dashboard/* protégées par auth redirigent
 * bien vers /login sans cookie de session.
 */
test.describe("Dashboard auth guards", () => {
  const protectedPages = [
    "/dashboard",
    "/dashboard/clients",
    "/dashboard/programs",
    "/dashboard/campaigns",
    "/dashboard/scan",
    "/dashboard/qrcode",
    "/dashboard/stats",
    "/dashboard/settings",
  ];

  for (const path of protectedPages) {
    test(`${path} non-authentifié → redirect /login`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(/login/, { timeout: 10_000 });
      expect(page.url()).toContain("/login");
    });
  }

  const protectedAdminPages = [
    "/admin",
    "/admin/users",
    "/admin/stats",
    "/admin/abuse",
    "/admin/settings",
  ];

  for (const path of protectedAdminPages) {
    test(`${path} non-authentifié → redirect /login`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(/login/, { timeout: 10_000 });
      expect(page.url()).toContain("/login");
    });
  }
});
