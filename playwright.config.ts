import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config pour les tests E2E de Fidlify.
 *
 * Modes :
 * - `npm run test:e2e` : tests headless contre `npm run dev` automatiquement
 * - `npm run test:e2e:ui` : interface Playwright pour debug
 * - `BASE_URL=https://staging.fidlify.com npm run test:e2e` : run contre une URL externe
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // beaucoup de tests touchent la DB, on évite les races
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? "github" : "list",

  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "fr-CH",
    timezoneId: "Europe/Zurich",
    // Désactive le beta gate via cookie pré-configuré (les tests E2E
    // s'attendent à pouvoir naviguer librement)
    storageState: undefined,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          // Désactive le beta gate pendant les tests E2E
          BETA_ACCESS_PASSWORD: "",
        },
      },
});
