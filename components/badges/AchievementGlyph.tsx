/**
 * Achievement glyphs — branded SVG marks that replace the emoji set
 * seeded in 0003_seed_plans.sql. Stroke-based marks so they sit
 * cleanly on both Royal-Blue (unlocked) and Mist (locked) cards.
 *
 * Add new IDs here as the catalog grows; falls back to a neutral
 * "spark" mark for any ID we don't know yet.
 */

type GlyphProps = { className?: string; size?: number };

function Frame({
  size = 36,
  className,
  children,
}: {
  size?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const glyphs: Record<string, (p: GlyphProps) => React.ReactElement> = {
  first_wash: (p) => (
    <Frame {...p}>
      {/* 4-point spark — a "first" mark */}
      <path d="M16 4v8M16 20v8M4 16h8M20 16h8" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </Frame>
  ),
  loyal: (p) => (
    <Frame {...p}>
      {/* Concentric rings — repeat business */}
      <circle cx="16" cy="16" r="11" />
      <circle cx="16" cy="16" r="7" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </Frame>
  ),
  detailing_fan: (p) => (
    <Frame {...p}>
      {/* Buffer / orbital pad */}
      <circle cx="16" cy="16" r="8" />
      <path d="M16 8v16M8 16h16" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </Frame>
  ),
  showroom_connoisseur: (p) => (
    <Frame {...p}>
      {/* Trophy outline */}
      <path d="M11 6h10v4a5 5 0 01-10 0V6z" />
      <path d="M7 8h4M21 8h4" />
      <path d="M16 15v6M12 25h8M13 22h6v3h-6z" />
    </Frame>
  ),
  quarterly_regular: (p) => (
    <Frame {...p}>
      {/* Calendar — month grid */}
      <rect x="5" y="7" width="22" height="20" rx="2" />
      <path d="M5 12h22M11 4v6M21 4v6" />
      <rect x="9" y="16" width="3" height="3" fill="currentColor" />
    </Frame>
  ),
  big_tipper: (p) => (
    <Frame {...p}>
      {/* Stacked coins */}
      <ellipse cx="16" cy="10" rx="9" ry="3" />
      <path d="M7 10v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" />
      <path d="M7 16v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" />
    </Frame>
  ),
  showroom_grade: (p) => (
    <Frame {...p}>
      {/* Diamond / cut gem */}
      <path d="M16 5l8 7-8 15-8-15 8-7z" />
      <path d="M8 12h16M12 12l4-7M20 12l-4-7" />
    </Frame>
  ),
  referrer: (p) => (
    <Frame {...p}>
      {/* Two people + arrow */}
      <circle cx="11" cy="10" r="3" />
      <circle cx="22" cy="14" r="3" />
      <path d="M5 24a6 6 0 0112 0" />
      <path d="M16 19a6 6 0 0112 0" />
    </Frame>
  ),
  early_bird: (p) => (
    <Frame {...p}>
      {/* Sunrise */}
      <path d="M3 22h26" />
      <path d="M16 11a6 6 0 016 6H10a6 6 0 016-6z" fill="currentColor" fillOpacity="0.15" />
      <path d="M16 5v3M7 9l2 2M25 9l-2 2M2 17h2M28 17h-2" />
    </Frame>
  ),
  pro_first_job: (p) => (
    <Frame {...p}>
      <path d="M6 16l4 4 16-16" />
      <circle cx="16" cy="16" r="13" />
    </Frame>
  ),
  pro_top_rated: (p) => (
    <Frame {...p}>
      {/* 5-point star */}
      <path d="M16 4l3.7 7.5 8.3 1.2-6 5.8 1.4 8.2-7.4-3.9-7.4 3.9 1.4-8.2-6-5.8 8.3-1.2L16 4z" />
    </Frame>
  ),
  pro_workhorse: (p) => (
    <Frame {...p}>
      {/* Tally — vertical bars */}
      <path d="M7 6v20M12 6v20M17 6v20M22 6v20M5 14l20 4" />
    </Frame>
  ),
};

function FallbackGlyph(p: GlyphProps) {
  return (
    <Frame {...p}>
      <path d="M16 4v8M16 20v8M4 16h8M20 16h8" />
      <circle cx="16" cy="16" r="3" />
    </Frame>
  );
}

export function AchievementGlyph({
  id,
  size = 36,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const G = glyphs[id] ?? FallbackGlyph;
  return <G size={size} className={className} />;
}
