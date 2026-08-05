// Atomlet brand mark: an organic cluster of four blobs — one parent atom and
// three little ones spinning off, sized in a playful rhythm. Monochrome by
// design (Atoms-style): it inherits currentColor, so it renders dark on the
// light theme and light on the dark theme automatically. `tone="brand"`
// switches to the fixed brand blue for standalone placements (e.g. auth).
// Keep src/app/icon.svg (the favicon) in sync when adjusting the geometry.

interface LogoMarkProps {
  size?: number;
  className?: string;
  tone?: "auto" | "brand";
}

const BRAND_BLUE = "#4B6BFB";

export function LogoMark({ size = 22, className, tone = "auto" }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill={tone === "brand" ? BRAND_BLUE : "currentColor"}
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="10.6" cy="17.2" rx="7.7" ry="6.3" transform="rotate(-24 10.6 17.2)" />
      <ellipse cx="21.8" cy="9.6" rx="5.1" ry="4.1" transform="rotate(-28 21.8 9.6)" />
      <ellipse cx="23.6" cy="21.9" rx="4.5" ry="3.6" transform="rotate(-14 23.6 21.9)" />
      <circle cx="13" cy="5.4" r="2.35" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
  tone?: "auto" | "brand";
}

export function Logo({ size = 22, withWordmark = true, className, tone = "auto" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark size={size} tone={tone} />
      {withWordmark && <span className="font-semibold">Atomlet</span>}
    </span>
  );
}
