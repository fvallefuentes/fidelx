import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Headers de sécurité (audit V2 §6).
 * - HSTS : forcer HTTPS sur tous les sous-domaines.
 * - X-Content-Type-Options : empêcher le sniffing MIME.
 * - X-Frame-Options : empêcher l'embedding via iframe.
 * - Referrer-Policy : limiter les fuites d'URL.
 * - Permissions-Policy : couper les API matérielles non utilisées.
 * - X-DNS-Prefetch-Control : pré-résolution autorisée.
 *
 * NOTE : Content-Security-Policy non ajoutée ici pour l'instant — à tester
 * en mode Report-Only avant application stricte (audit §12), car la CSP
 * peut casser les scripts Stripe / Apple-Google Wallet / NextAuth.
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

// Sentry — wrappe la config Next.js pour activer la capture serveur + client
// Note : sans SENTRY_AUTH_TOKEN les source maps ne sont pas uploadées (stack
// traces minifiées dans Sentry). Acceptable pour MVP — ajouter le token plus
// tard via le panel Sentry pour des stack traces lisibles.
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: "fidlify",
  project: "javascript-nextjs",
  // Désactive le client logger pour éviter le bundle bloat
  disableLogger: true,
  // tunnelRoute désactivé : si activé, il faut s'assurer que le rate-limit
  // anti-abus ne bloque pas les calls Sentry.
});
