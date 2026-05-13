import { test, expect } from "@playwright/test";

test.describe("APIs anti-abus et sécurité", () => {
  test("/api/health renvoie 200", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
  });

  test("/api/admin/* sans auth → 403/401/302", async ({ request }) => {
    const routes = [
      "/api/admin/users",
      "/api/admin/dashboard",
      "/api/admin/stats",
      "/api/admin/abuse",
      "/api/admin/abuse/block-ip",
    ];
    for (const r of routes) {
      const res = await request.get(r);
      expect([401, 403, 302, 307]).toContain(res.status());
    }
  });

  test("/api/merchants/* sans auth → 401", async ({ request }) => {
    const routes = [
      "/api/merchants/me",
      "/api/merchants/notifications",
      "/api/merchants/stats/full",
      "/api/merchants/stats/insights",
      "/api/merchants/search?q=test",
      "/api/merchants/export/clients",
      "/api/merchants/export/transactions",
      "/api/merchants/export/campaigns",
    ];
    for (const r of routes) {
      const res = await request.get(r);
      expect(res.status()).toBe(401);
    }
  });

  test("/api/cron/* sans Bearer token → 401", async ({ request }) => {
    const res = await request.get("/api/cron/birthday");
    expect([401, 403]).toContain(res.status());
    const res2 = await request.get("/api/cron/campaigns");
    expect([401, 403]).toContain(res2.status());
  });

  test("/api/auth/forgot-password : anti-enumeration (200 pour email inexistant)", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: { email: "absolument-inexistant-test@example.com" },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  test("/api/auth/forgot-password : 400 si pas d'email", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("/api/auth/forgot-password : 400 si body invalide", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      headers: { "Content-Type": "application/json" },
      data: "not-json",
    });
    expect(res.status()).toBe(400);
  });

  test("/api/auth/reset-password : 400 si pas de token", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password", {
      data: { password: "pass12345" },
    });
    expect(res.status()).toBe(400);
  });

  test("/api/auth/reset-password : 400 si password trop court", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password", {
      data: { token: "any", password: "short" },
    });
    expect(res.status()).toBe(400);
  });

  test("/api/auth/reset-password : 400 si token invalide", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password", {
      data: { token: "definitely-not-a-valid-token", password: "longenoughpass" },
    });
    expect(res.status()).toBe(400);
  });

  test("/api/programs/[id]/public retourne 404 pour programme inexistant", async ({ request }) => {
    const res = await request.get("/api/programs/cuid-inexistant/public");
    expect(res.status()).toBe(404);
  });

  test("Routes Stripe / Apple Wallet / Google Wallet doivent rester accessibles (pas de gate)", async ({ request }) => {
    // /api/webhooks/stripe sans signature → 400 ou similaire, mais pas redirect
    const res = await request.post("/api/webhooks/stripe", {
      data: { test: true },
    });
    // Doit répondre (sans redirect vers /beta-access ou /login)
    expect([400, 401, 200]).toContain(res.status());
  });
});
