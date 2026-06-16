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
  | "coffee";

export interface StampIconDef {
  label: string;
  emoji: string;
  path: string; // viewBox 0 0 24 24
  mode: "fill" | "stroke";
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
    path: "M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4zM6 1v3M10 1v3M14 1v3",
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

export function getStampIcon(key: string | undefined | null): StampIconDef {
  return STAMP_ICONS[(key as StampIconKey)] ?? STAMP_ICONS[DEFAULT_STAMP_ICON];
}

export const STAMP_ICON_LIST: { key: StampIconKey; def: StampIconDef }[] =
  (Object.keys(STAMP_ICONS) as StampIconKey[]).map((key) => ({
    key,
    def: STAMP_ICONS[key],
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
