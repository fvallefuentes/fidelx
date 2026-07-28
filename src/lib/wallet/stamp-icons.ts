/**
 * Icônes de tampon partagées entre :
 *  - l'aperçu React (WalletCardPreview, dashboard/programs)
 *  - le strip Apple Wallet (lib/wallet/stripImage.ts)
 *  - le strip Google Wallet (api/wallet/google/strip/[serialNumber])
 *
 * Chaque icône est un path SVG en viewBox 0 0 24 24. `mode` indique si on
 * remplit (fill) ou trace le contour (stroke). Le commerçant choisit l'icône
 * qui marque un tampon obtenu ; par défaut c'est la coche (✓), le comportement
 * historique.
 */

export type StampIconKey =
  | "check"
  | "star"
  | "sparkle"
  | "heart"
  | "diamond"
  | "crown"
  | "coffee"
  | "scissors"
  | "gift"
  | "trophy"
  | "lightning"
  | "flower"
  | "leaf"
  | "paw"
  | "pizza"
  | "burger"
  | "utensils"
  | "croissant"
  | "bread"
  | "cake"
  | "iceCream"
  | "wine"
  | "lipstick"
  | "nailPolish"
  | "hairDryer"
  | "shoppingBag"
  | "car"
  | "dumbbell";

export type StampIconCategory = "classic" | "food" | "beauty" | "services";

export interface StampIconDef {
  label: string;
  emoji: string;
  path: string; // viewBox 0 0 24 24
  mode: "fill" | "stroke";
  category?: StampIconCategory;
}

export const STAMP_ICONS: Record<StampIconKey, StampIconDef> = {
  check: {
    label: "Coche",
    emoji: "✓",
    mode: "stroke",
    path: "M20 6 9 17l-5-5",
  },
  star: {
    label: "Étoile",
    emoji: "★",
    mode: "fill",
    path: "M12 2l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.77l-5.88 3.09 1.12-6.55L2.48 9.92l6.58-.96z",
  },
  sparkle: {
    label: "Éclat",
    emoji: "✦",
    mode: "fill",
    path: "M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z",
  },
  heart: {
    label: "Cœur",
    emoji: "♥",
    mode: "fill",
    path: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z",
  },
  diamond: {
    label: "Losange",
    emoji: "◆",
    mode: "fill",
    path: "M12 2l10 10-10 10L2 12z",
  },
  crown: {
    label: "Couronne",
    emoji: "♛",
    mode: "fill",
    path: "M2 18h20l-1.8-9.5-5.2 4-3-7.5-3 7.5-5.2-4z",
  },
  coffee: {
    label: "Café",
    emoji: "☕",
    mode: "stroke",
    category: "food",
    path: "M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4zM6 1v3M10 1v3M14 1v3",
  },
  scissors: {
    label: "Ciseaux",
    emoji: "✂",
    mode: "stroke",
    category: "beauty",
    path: "M8.2 8.2 12 12M20 4 8.2 15.8M8.2 15.8 12 12M14.8 14.8 20 20M4 4.5a3 3 0 1 0 6 0 3 3 0 1 0-6 0M4 19.5a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  },
  gift: {
    label: "Cadeau",
    emoji: "🎁",
    mode: "stroke",
    path: "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5A2.5 2.5 0 1 1 10 4.5C10 7 12 7 12 7Zm0 0h4.5A2.5 2.5 0 1 0 14 4.5C14 7 12 7 12 7Z",
  },
  trophy: {
    label: "Trophée",
    emoji: "🏆",
    mode: "stroke",
    path: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4",
  },
  lightning: {
    label: "Éclair",
    emoji: "⚡",
    mode: "fill",
    path: "M13 2 3 14h8l-1 8 11-13h-8z",
  },
  flower: {
    label: "Fleur",
    emoji: "✿",
    mode: "stroke",
    category: "beauty",
    path: "M12 9.5A2.5 2.5 0 1 0 12 14.5 2.5 2.5 0 1 0 12 9.5M12 9c-3-1.5-3.4-5.7 0-7 3.4 1.3 3 5.5 0 7M15 11c1.5-3 5.7-3.4 7 0-1.3 3.4-5.5 3-7 0M12 15c3 1.5 3.4 5.7 0 7-3.4-1.3-3-5.5 0-7M9 12c-1.5 3-5.7 3.4-7 0 1.3-3.4 5.5-3 7 0",
  },
  leaf: {
    label: "Feuille",
    emoji: "🍃",
    mode: "stroke",
    category: "services",
    path: "M20.8 3.2C12 3 5 6 4 13c-.5 3.5 2 7 5.5 7 7 0 10-8 11.3-16.8ZM4 21c2-7 7-10 13-13",
  },
  paw: {
    label: "Patte",
    emoji: "🐾",
    mode: "fill",
    category: "services",
    path: "M12 11c-3.2 0-6 3.1-6 6.1 0 2.1 1.7 3.4 3.5 2.6 1.6-.7 3.4-.7 5 0 1.8.8 3.5-.5 3.5-2.6 0-3-2.8-6.1-6-6.1ZM6.2 10.2C4.8 10.5 3.4 9 3.1 7.3 2.8 5.5 3.7 4 5 3.8c1.4-.2 2.7 1.2 3 3 .3 1.7-.5 3.1-1.8 3.4Zm11.6 0c-1.3-.3-2.1-1.7-1.8-3.4.3-1.8 1.6-3.2 3-3 1.3.2 2.2 1.7 1.9 3.5-.3 1.7-1.7 3.2-3.1 2.9ZM10.7 8.5C9.2 8.6 8 7 8 5.2 8 3.4 9 2 10.4 2c1.4 0 2.5 1.5 2.5 3.3 0 1.8-.9 3.2-2.2 3.2Zm3.9 0c-1.3 0-2.2-1.4-2.2-3.2 0-1.8 1.1-3.3 2.5-3.3 1.4 0 2.4 1.4 2.4 3.2 0 1.8-1.2 3.4-2.7 3.3Z",
  },
  pizza: {
    label: "Pizza",
    emoji: "🍕",
    mode: "stroke",
    category: "food",
    path: "m12 3 9 18H3zM7.5 12.5h.01M14 15h.01M11 8h.01M5.2 17h13.6",
  },
  burger: {
    label: "Burger",
    emoji: "🍔",
    mode: "stroke",
    category: "food",
    path: "M4 11h16M5 11a7 7 0 0 1 14 0M3 15h18M5 15v2a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-2M8 7h.01M12 5h.01M16 7h.01",
  },
  utensils: {
    label: "Couverts",
    emoji: "🍴",
    mode: "stroke",
    category: "food",
    path: "M4 2v6M8 2v6M4 6h4M6 8v14M15 2v20M15 2c3 1.5 5 4.5 5 8v2h-5",
  },
  croissant: {
    label: "Croissant",
    emoji: "🥐",
    mode: "stroke",
    category: "food",
    path: "M5 5c-4 2.5-4 11.5 0 14l3-3c2 2 6 2 8 0l3 3c4-2.5 4-11.5 0-14l-3 3c-2-2-6-2-8 0zM8 8c-1 2-1 6 0 8M16 8c1 2 1 6 0 8",
  },
  bread: {
    label: "Pain",
    emoji: "🍞",
    mode: "stroke",
    category: "food",
    path: "M5 20h14a3 3 0 0 0 3-3v-7a6 6 0 0 0-6-6H8a6 6 0 0 0-6 6v7a3 3 0 0 0 3 3ZM8 7l2 3M13 6l2 3",
  },
  cake: {
    label: "Gâteau",
    emoji: "🍰",
    mode: "stroke",
    category: "food",
    path: "M3 11h18v9H3zM3 15h18M7 11V7M12 11V5M17 11V7M7 4v3M12 2v3M17 4v3",
  },
  iceCream: {
    label: "Glace",
    emoji: "🍦",
    mode: "stroke",
    category: "food",
    path: "M7 10h10l-5 12zM7 10a5 5 0 0 1 10 0M9 7a4 4 0 0 1 6 0",
  },
  wine: {
    label: "Verre",
    emoji: "🍷",
    mode: "stroke",
    category: "food",
    path: "M6 2h12l-1 7a5 5 0 0 1-10 0zM12 14v7M8 22h8M7 7h10",
  },
  lipstick: {
    label: "Rouge à lèvres",
    emoji: "💄",
    mode: "stroke",
    category: "beauty",
    path: "M8 10h8v12H8zM9 10V6l5-4 1 4v4M7 14h10M10 18h4",
  },
  nailPolish: {
    label: "Vernis",
    emoji: "💅",
    mode: "stroke",
    category: "beauty",
    path: "M9 2h6v5H9zM7 9h10l2 3v10H5V12zM9 13h6v5H9z",
  },
  hairDryer: {
    label: "Sèche-cheveux",
    emoji: "💨",
    mode: "stroke",
    category: "beauty",
    path: "M3 7h11a5 5 0 0 1 0 10H3zM3 10H1M3 14H1M12 17l-1 5H7l1-5M18 9l4-2v10l-4-2",
  },
  shoppingBag: {
    label: "Sac boutique",
    emoji: "🛍",
    mode: "stroke",
    category: "services",
    path: "M4 8h16l-1 14H5zM8 9V6a4 4 0 0 1 8 0v3",
  },
  car: {
    label: "Voiture",
    emoji: "🚗",
    mode: "stroke",
    category: "services",
    path: "M3 11l2-5h14l2 5v8h-3v-2H6v2H3zM5 11h14M7 14h.01M17 14h.01",
  },
  dumbbell: {
    label: "Haltère",
    emoji: "🏋",
    mode: "stroke",
    category: "services",
    path: "M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12M1 11v2M23 11v2",
  },
};

export const DEFAULT_STAMP_ICON: StampIconKey = "check";

/* ─── Espacement des tampons ──────────────────────────────
   Multiplicateur appliqué à l'écart entre les ronds. "normal" = 1
   (comportement historique). Partagé entre preview / Apple / Google. */
export type StampSpacing = "tight" | "normal" | "wide";

export const STAMP_SPACING_MULT: Record<StampSpacing, number> = {
  tight: 0.45,
  normal: 1,
  wide: 1.7,
};

export const STAMP_SPACING_LIST: { key: StampSpacing; label: string }[] = [
  { key: "tight", label: "Serré" },
  { key: "normal", label: "Normal" },
  { key: "wide", label: "Large" },
];

export function getStampSpacingMult(key: string | undefined | null): number {
  return STAMP_SPACING_MULT[(key as StampSpacing)] ?? STAMP_SPACING_MULT.normal;
}

export const STAMP_AREA_INSET_MAX = 48;
export const STAMP_AREA_RADIUS_MAX = 32;

function clampDesignNumber(
  value: unknown,
  max: number,
  fallback = 0
): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(max, Math.round(parsed)));
}

/** Marge gauche/droite de la zone des tampons, exprimée en px d'aperçu. */
export function getStampAreaInset(value: unknown): number {
  return clampDesignNumber(value, STAMP_AREA_INSET_MAX);
}

/** Rayon des coins de la zone des tampons, exprimé en px d'aperçu. */
export function getStampAreaRadius(value: unknown): number {
  return clampDesignNumber(value, STAMP_AREA_RADIUS_MAX);
}

export function getStampIcon(key: string | undefined | null): StampIconDef {
  return STAMP_ICONS[(key as StampIconKey)] ?? STAMP_ICONS[DEFAULT_STAMP_ICON];
}

export const STAMP_ICON_LIST: { key: StampIconKey; def: StampIconDef }[] =
  (Object.keys(STAMP_ICONS) as StampIconKey[]).map((key) => ({
    key,
    def: STAMP_ICONS[key],
  }));

const STAMP_ICON_GROUP_LABELS: {
  key: StampIconCategory;
  label: string;
}[] = [
  { key: "classic", label: "Classiques" },
  { key: "food", label: "Restauration & boulangerie" },
  { key: "beauty", label: "Beauté & bien-être" },
  { key: "services", label: "Commerces & services" },
];

export const STAMP_ICON_GROUPS = STAMP_ICON_GROUP_LABELS.map((group) => ({
  ...group,
  icons: STAMP_ICON_LIST.filter(
    ({ def }) => (def.category || "classic") === group.key
  ),
}));

/**
 * Fragment SVG d'une icône de tampon centrée à (cx, cy) occupant `size` px.
 * Pour la génération des strips Apple / Google (chaînes SVG passées à sharp).
 */
export function stampIconSvg(
  key: string | undefined | null,
  cx: number,
  cy: number,
  size: number,
  color: string
): string {
  const def = getStampIcon(key);
  const scale = size / 24;
  const tx = cx - size / 2;
  const ty = cy - size / 2;
  const paint =
    def.mode === "fill"
      ? `fill="${color}"`
      : `fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
  return `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${scale.toFixed(
    4
  )})"><path d="${def.path}" ${paint}/></g>`;
}
