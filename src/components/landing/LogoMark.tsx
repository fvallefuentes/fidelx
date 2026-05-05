/* Fidlify brand mark — two stacked tilted loyalty cards with QR + chip */
export default function LogoMark({
  size = 28,
  className,
  style,
  /** Primary card fill — default lime #D9FF3C */
  cardColor = "#D9FF3C",
  /** Detail/cutout color — default near-black #0E1116 */
  detailColor = "#0E1116",
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  cardColor?: string;
  detailColor?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      aria-label="Fidlify"
      className={className}
      style={style}
    >
      <g transform="rotate(-12 128 128)">
        <rect x="48" y="78" width="160" height="100" rx="16" fill={cardColor} opacity="0.35" />
        <rect x="64" y="148" width="60" height="6" rx="3" fill={detailColor} opacity="0.35" />
      </g>
      <g transform="rotate(8 128 128)">
        <rect x="40" y="78" width="176" height="108" rx="18" fill={cardColor} />
        <g transform="translate(60 96)">
          <rect x="0" y="0" width="12" height="12" rx="2.5" fill={detailColor} />
          <rect x="15" y="0" width="12" height="12" rx="2.5" fill={detailColor} />
          <rect x="30" y="0" width="12" height="12" rx="2.5" fill={detailColor} />
          <rect x="45" y="0" width="12" height="12" rx="2.5" fill={detailColor} />
          <rect x="0" y="15" width="12" height="12" rx="2.5" fill={detailColor} />
          <rect x="0" y="30" width="12" height="12" rx="2.5" fill={detailColor} />
          <rect x="15" y="30" width="12" height="12" rx="2.5" fill={detailColor} />
          <rect x="30" y="30" width="12" height="12" rx="2.5" fill={detailColor} />
          <rect x="0" y="45" width="12" height="12" rx="2.5" fill={detailColor} />
        </g>
        <g transform="translate(154 100)">
          <rect width="44" height="34" rx="5" fill={detailColor} opacity="0.92" />
          <line x1="0" y1="11" x2="44" y2="11" stroke={cardColor} strokeWidth="1.5" />
          <line x1="0" y1="22" x2="44" y2="22" stroke={cardColor} strokeWidth="1.5" />
          <line x1="14" y1="0" x2="14" y2="34" stroke={cardColor} strokeWidth="1.5" />
          <line x1="30" y1="0" x2="30" y2="34" stroke={cardColor} strokeWidth="1.5" />
        </g>
        <rect x="60" y="160" width="78" height="6" rx="3" fill={detailColor} opacity="0.5" />
        <rect x="146" y="160" width="46" height="6" rx="3" fill={detailColor} opacity="0.5" />
      </g>
    </svg>
  );
}
