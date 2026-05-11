import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook : appelé au démarrage du serveur.
 * Charge la bonne config Sentry selon le runtime actif.
 *
 * Doc : https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture automatique des erreurs de requêtes (server components, route handlers).
export const onRequestError = Sentry.captureRequestError;
