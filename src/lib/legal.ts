/**
 * Constantes juridiques partagées (toutes les pages légales publiques).
 *
 * NOTE IMPORTANTE - PRÉ-IMMATRICULATION :
 * Tant que la société Fidlify n'est pas constituée, le site est publié
 * sous l'identité réelle de ses porteurs de projet. Aucune raison sociale,
 * forme juridique, IDE/CHE, RC ou adresse personnelle n'est affichée
 * publiquement. Les pages légales sont rédigées en conséquence.
 *
 * TODO post-immatriculation : remplacer COFOUNDERS par COMPANY = {
 *   name, form, ide, rc, canton, address
 * } et réintégrer ces données dans les pages mentions-légales,
 * politique-de-confidentialité et CGU. Voir
 * `src/app/(legal)/*` pour les sections à réactiver.
 */

export const LEGAL_LAST_UPDATE = "7 mai 2026";
export const LEGAL_VERSION = "1.0";

export const PUBLIC_CONTACT_EMAIL = "contact@fidlify.com";
export const PUBLIC_SITE_URL = "https://www.fidlify.com";
export const PUBLIC_SITE_DOMAIN = "fidlify.com";

/** Coéditeurs / coresponsables du site (personnes physiques, pré-immatriculation). */
export const COFOUNDERS = [
  { name: "Fabian Valle Fuentes", role: "Coéditeur, coresponsable de la publication" },
  { name: "Ludovic Pavesi", role: "Coéditeur, coresponsable de la publication" },
] as const;

/** Hébergeur public. */
export const HOST = {
  name: "Infomaniak Network SA",
  country: "Suisse",
  url: "https://www.infomaniak.com",
} as const;

/** Pages légales publiques actuellement exposées. */
export const LEGAL_PAGES = [
  {
    href: "/mentions-legales",
    label: "Mentions légales",
    short: "Mentions légales",
  },
  {
    href: "/politique-de-confidentialite",
    label: "Politique de confidentialité",
    short: "Confidentialité",
  },
  {
    href: "/politique-cookies",
    label: "Politique cookies",
    short: "Cookies",
  },
  { href: "/cgu", label: "Conditions générales d'utilisation", short: "CGU" },
] as const;
