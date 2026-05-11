import * as Sentry from "@sentry/nextjs";

/**
 * Sentry — config navigateur (browser).
 * Capture les erreurs JS côté client React + Next.js.
 *
 * Sample rates calibrés pour le free tier (5 000 events/mois) :
 * - tracesSampleRate 0.1 : 10% des transactions sont tracées (perf)
 * - replays désactivés (très lourd en events)
 * - errors : 100% (les bugs réels remontent toujours)
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — 10% pour rester dans le quota free
  tracesSampleRate: 0.1,

  // Replays désactivés : très gros consommateurs d'events
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,

  debug: false,

  // Filtrer les bruits non-actionnables
  ignoreErrors: [
    // Erreurs de plugins de navigateur / extensions
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    "Network request failed",
    // NextAuth abandons quand l'utilisateur quitte avant fin
    "AbortError",
    // Stripe.js quand bloqué par un adblocker
    "Failed to load Stripe.js",
  ],
});
