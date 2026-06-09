/**
 * SEO constants partagées (URLs, defaults, valeurs sociales).
 * Référence unique pour toutes les balises meta, canonicals, sitemap, JSON-LD.
 */

export const SITE_URL = "https://www.fidlify.com";
export const SITE_NAME = "Fidlify";

export const DEFAULT_TITLE =
  "Carte de fidélité digitale pour commerçants | Fidlify Suisse";

export const DEFAULT_DESCRIPTION =
  "Créez une carte de fidélité digitale dans Apple Wallet et Google Wallet. QR code, points, tampons, notifications et statistiques pour commerces suisses, sans application à télécharger.";

/** Mots-clés associés à la home + SEO global. */
export const DEFAULT_KEYWORDS = [
  "carte de fidélité digitale",
  "logiciel de fidélisation",
  "programme de fidélité digital",
  "carte fidélité Apple Wallet",
  "carte fidélité Google Wallet",
  "fidélisation commerce",
  "fidélisation Suisse",
  "carte fidélité commerçants",
  "remplacer carte papier",
  "QR code fidélité",
];

/** Image OpenGraph par défaut (place /og-default.png dans /public si dispo). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

/** FAQ canonique de la home (réutilisée dans FAQSection + JSON-LD FAQPage). */
export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Est-ce que mes clients doivent télécharger une application ?",
    a: "Non, jamais. La carte Fidlify s'installe directement dans Apple Wallet ou Google Wallet — déjà présents sur la majorité des smartphones récents. Un simple tap depuis un QR code suffit.",
  },
  {
    q: "Est-ce compatible Apple Wallet ET Google Wallet ?",
    a: "Oui, Fidlify génère automatiquement la version compatible selon l'appareil de votre client. Aucune configuration de votre côté — la carte s'ajoute en un tap sur iPhone comme sur Android.",
  },
  {
    q: "Puis-je envoyer des notifications à mes clients ?",
    a: "Oui. Vous pouvez envoyer des notifications push directement dans le Wallet de vos clients — promotions, nouveautés, anniversaires, rappels. Idéal pour relancer un client au bon moment.",
  },
  {
    q: "Puis-je personnaliser le design de la carte ?",
    a: "Entièrement. Logo, couleurs, photo de fond, type de récompense (tampons, points, paliers), texte. Votre carte ressemble à votre commerce — pas à Fidlify.",
  },
  {
    q: "Combien de temps pour créer une carte de fidélité digitale ?",
    a: "Environ 3 minutes. Vous remplissez les informations de votre commerce, choisissez le design et la récompense — c'est en ligne et prêt à être distribué via QR code.",
  },
  {
    q: "Est-ce adapté aux petits commerces suisses ?",
    a: "C'est précisément pour eux que Fidlify existe. L'offre Gratuite permet de tester la solution, puis l'offre Essentiel démarre à 39 CHF/mois, sans engagement. Aucune compétence technique nécessaire.",
  },
  {
    q: "Puis-je utiliser un QR code en magasin ?",
    a: "Oui — vous générez votre QR code depuis le dashboard, l'imprimez (sticker, chevalet de table, addition) et vos clients scannent pour ajouter la carte au Wallet en un tap.",
  },
  {
    q: "Combien coûte un programme de fidélité digital avec Fidlify ?",
    a: "Trois offres : Gratuit (0 CHF), Essentiel (39 CHF/mois) et Croissance (59 CHF/mois). Facturées annuellement. Pas d'engagement, pas de frais cachés.",
  },
];
