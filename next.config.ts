import type { NextConfig } from "next";

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

export default nextConfig;
