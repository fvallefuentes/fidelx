import {
  getStampAreaInset,
} from "@/lib/wallet/stamp-icons";

const GOOGLE_HERO_WIDTH = 1032;
const GOOGLE_HERO_HEIGHT = 336;
const VERTICAL_PADDING = 32;

export function getGoogleStampGridLayout({
  maxStamps,
  stampAreaInset,
  stampSpacing,
}: {
  maxStamps: number;
  stampAreaInset: unknown;
  stampSpacing?: string;
}) {
  const safeMaxStamps = Math.max(1, Math.floor(maxStamps));
  const rows = safeMaxStamps <= 5 ? 1 : 2;
  const perRow = Math.ceil(safeMaxStamps / rows);
  const horizontalPadding =
    Math.round(getStampAreaInset(stampAreaInset) * 2.75) + 32;
  const availableWidth = Math.max(
    1,
    GOOGLE_HERO_WIDTH - horizontalPadding * 2
  );
  const availableHeight = Math.max(
    1,
    GOOGLE_HERO_HEIGHT - VERTICAL_PADDING * 2
  );
  const cellWidth = availableWidth / perRow;
  const cellHeight = availableHeight / rows;
  const radiusFactor =
    stampSpacing === "tight" ? 0.42 : stampSpacing === "wide" ? 0.28 : 0.36;

  return {
    rows,
    perRow,
    horizontalPadding,
    verticalPadding: VERTICAL_PADDING,
    cellWidth,
    cellHeight,
    radius: Math.min(cellWidth, cellHeight) * radiusFactor,
  };
}
