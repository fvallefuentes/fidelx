import { test, expect } from "@playwright/test";

/**
 * Smoke tests : vérifient que toutes les routes publiques principales
 * répondent sans crasher. Utile comme test rapide avant déploiement.
 */
test.describe("Smoke tests — toutes routes publiques accessibles", () => {
  const routes = [
    { path: "/", expect200OrRedirect: true },
    { path: "/login", expect200OrRedirect: true },
    { path: "/register", expect200OrRedirect: true },
    { path: "/forgot-password", expect200OrRedirect: true },
    { path: "/reset-password", expect200OrRedirect: true },
    { path: "/mentions-legales", expect200OrRedirect: true },
    { path: "/politique-de-confidentialite", expect200OrRedirect: true },
    { path: "/politique-cookies", expect200OrRedirect: true },
    { path: "/cgu", expect200OrRedirect: true },
    { path: "/sentry-example-page", expect200OrRedirect: true },
    { path: "/sitemap.xml", expect200OrRedirect: true },
    { path: "/robots.txt", expect200OrRedirect: true },
    { path: "/manifest.webmanifest", expect200OrRedirect: true },
    { path: "/icon.svg", expect200OrRedirect: true },
    { path: "/sw.js", expect200OrRedirect: true },
  ];

  for (const { path } of routes) {
    test(`GET ${path} répond 2xx ou 3xx`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      // 200 OK, 307 redirect (beta gate), 302 redirect, etc.
      expect(res.status()).toBeLessThan(400);
    });
  }
});

test.describe("Routes API publiques (sans auth requise)", () => {
  test("GET /api/health → 200", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
  });
});
