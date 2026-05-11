import type { MetadataRoute } from "next";

/**
 * Web App Manifest (PWA) — permet l'installation de Fidlify comme app
 * sur le téléphone du commerçant (Apple Wallet pour scanner en boutique).
 *
 * Doc : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fidlify — Tableau de bord commerçant",
    short_name: "Fidlify",
    description:
      "Plateforme SaaS de fidélité digitale pour commerçants. Apple Wallet, Google Wallet, sans application à télécharger.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0d0c",
    theme_color: "#0c0d0c",
    lang: "fr-CH",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      // Note : si on veut un meilleur support Android et iOS,
      // ajouter plus tard des PNG 192x192 et 512x512 générés depuis l'SVG
      // dans /public/icon-192.png et /public/icon-512.png
    ],
    shortcuts: [
      {
        name: "Scanner",
        short_name: "Scan",
        url: "/dashboard/scan",
        description: "Scanner la carte d'un client en boutique",
      },
      {
        name: "Clients",
        short_name: "Clients",
        url: "/dashboard/clients",
        description: "Voir mes clients",
      },
    ],
  };
}
