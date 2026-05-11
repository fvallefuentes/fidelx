import * as Sentry from "@sentry/nextjs";

/**
 * Sentry — config serveur (Node.js runtime).
 * Capture les erreurs des API routes, server components, et toutes
 * les exceptions Node lancées dans /var/www/fidelx.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance traces : 10% pour rester dans le quota free
  tracesSampleRate: 0.1,

  debug: false,

  // Filtrer le bruit
  ignoreErrors: [
    // Stripe webhooks retries (Stripe retente plusieurs fois en cas de 5xx)
    "Webhook signature verification failed",
    // NextAuth : utilisateur ferme l'onglet pendant l'auth
    "AbortError",
  ],

  // Ignore les health checks et autres routes non-utiles
  beforeSend(event) {
    const url = event.request?.url ?? "";
    if (url.includes("/api/health")) return null;
    if (url.includes("/api/cron/")) {
      // Pour les crons, on garde seulement les erreurs (pas les transactions perf)
      if (event.type === "transaction") return null;
    }
    return event;
  },
});
