import { test as base, type BrowserContext } from "@playwright/test";

/**
 * Fixture Playwright étendue qui passe automatiquement le beta gate.
 *
 * Comportement :
 * - Si BETA_PASSWORD est défini dans l'env (ou si on tape un password connu),
 *   on pose le cookie `fidlify_beta_ok=1` avant chaque test
 * - Permet aux tests de naviguer librement comme si le gate était désactivé
 *
 * Usage : remplacer `import { test } from "@playwright/test"` par
 * `import { test } from "./fixtures"` dans les specs qui ont besoin
 * d'accéder à des pages gatées (landing, dashboard, etc.).
 */

const BETA_COOKIE_NAME = "fidlify_beta_ok";

export const test = base.extend<{ context: BrowserContext }>({
  context: async ({ context, baseURL }, use) => {
    // Extrait le domaine du baseURL pour poser le cookie
    const url = baseURL || "http://localhost:3000";
    const { hostname, protocol } = new URL(url);

    await context.addCookies([
      {
        name: BETA_COOKIE_NAME,
        value: "1",
        domain: hostname,
        path: "/",
        httpOnly: true,
        secure: protocol === "https:",
        sameSite: "Strict",
      },
    ]);

    await use(context);
  },
});

export { expect } from "@playwright/test";
