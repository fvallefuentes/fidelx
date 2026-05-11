import * as Sentry from "@sentry/nextjs";

/**
 * Sentry — config edge runtime (middleware, edge functions).
 * Plus léger que la config serveur car l'edge n'a pas accès à toutes les APIs Node.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
});
