// Atomlet brand mark: rounded-square gradient tile with an atom — a nucleus,
// one tilted orbit and a satellite electron. Same artwork as src/app/icon.svg
// (the favicon); keep the two in sync when adjusting.

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 22, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="atomlet-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5B8DFF" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#atomlet-logo-g)" />
      <ellipse
        cx="16"
        cy="16"
        rx="10"
        ry="4.8"
        transform="rotate(-24 16 16)"
        stroke="#ffffff"
        strokeWidth="1.7"
        fill="none"
        opacity="0.92"
      />
      <circle cx="16" cy="16" r="3.1" fill="#ffffff" />
      <circle cx="22.4" cy="10.2" r="1.8" fill="#ffffff" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

export function Logo({ size = 22, withWordmark = true, className }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark size={size} />
      {withWordmark && <span className="font-semibold">Atomlet</span>}
    </span>
  );
}
