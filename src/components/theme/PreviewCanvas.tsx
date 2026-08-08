"use client";

// The Theme Studio preview: a static sample application rendered entirely from
// the ThemeTokens handed in. Nothing here may use the studio's own design
// tokens — the canvas shows the user's theme, so every colour, radius, space
// and face resolves from the CSS custom properties set on the root element.
//
// The stylesheet below is deliberately static: tokens reach it through those
// custom properties, which keeps hover states, focus rings and container
// queries available without generating CSS per render.

import type { CSSProperties, SVGAttributes } from "react";
import { useT } from "@/lib/i18n";
import {
  DENSITY_BASE_PX,
  FONT_STACKS,
  RADIUS_PX,
  type ThemeTokens,
} from "@/lib/theme-tokens";

// A balanced, accessible theme so the canvas renders standalone.
export const DEFAULT_SAMPLE_TOKENS: ThemeTokens = {
  color: {
    background: "#F7F7F5",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    foreground: "#1A1A1F",
    muted: "#6B6B76",
    primary: "#2F5BEA",
    primaryForeground: "#FFFFFF",
    accent: "#7C5CFF",
    success: "#12805C",
    warning: "#B45309",
    destructive: "#DC2626",
    border: "#E4E4E7",
    ring: "#2F5BEA",
  },
  typography: {
    display: "sans-grotesk",
    body: "sans-modern",
    baseSize: 15,
    scaleRatio: 1.25,
    headingWeight: 600,
    bodyLineHeight: 1.6,
    headingTracking: "tight",
  },
  shape: { radius: "soft", density: "normal", border: "hairline" },
  layout: { container: "card" },
  icon: { style: "line", strokeWidth: 1.5, corner: "rounded" },
  effects: { shadow: "soft", motion: "subtle" },
};

const TRACKING: Record<ThemeTokens["typography"]["headingTracking"], string> = {
  tight: "-0.02em",
  normal: "0em",
  wide: "0.04em",
};

const BORDER_WIDTH_PX: Record<ThemeTokens["shape"]["border"], string> = {
  hairline: "1px",
  none: "0px",
  bold: "2px",
};

// Two tiers per setting: sm for resting chrome, md for content cards.
const SHADOWS: Record<
  ThemeTokens["effects"]["shadow"],
  { sm: string; md: string }
> = {
  none: { sm: "none", md: "none" },
  soft: {
    sm: "0 1px 2px rgba(15, 17, 21, 0.06)",
    md: "0 4px 14px rgba(15, 17, 21, 0.08)",
  },
  pronounced: {
    sm: "0 2px 6px rgba(15, 17, 21, 0.12)",
    md: "0 14px 32px rgba(15, 17, 21, 0.18)",
  },
};

const MOTION: Record<ThemeTokens["effects"]["motion"], string> = {
  none: "none",
  subtle: "all 150ms ease",
  playful: "all 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
};

// Modular scale: every size is the base multiplied by a power of the ratio, so
// a theme's scaleRatio visibly drives the typographic contrast.
function step(base: number, ratio: number, power: number): string {
  return `${Math.round(base * Math.pow(ratio, power) * 100) / 100}px`;
}

function cssVars(tokens: ThemeTokens): CSSProperties {
  const { color, typography, shape, effects } = tokens;
  const radius = RADIUS_PX[shape.radius];
  const space = DENSITY_BASE_PX[shape.density];
  const shadow = SHADOWS[effects.shadow];
  const base = typography.baseSize;
  const ratio = typography.scaleRatio;

  const vars: Record<string, string> = {
    "--background": color.background,
    "--surface": color.surface,
    "--surface-raised": color.surfaceRaised,
    "--foreground": color.foreground,
    "--muted": color.muted,
    "--primary": color.primary,
    "--primary-foreground": color.primaryForeground,
    "--accent": color.accent,
    "--success": color.success,
    "--warning": color.warning,
    "--destructive": color.destructive,
    "--border": color.border,
    "--ring": color.ring,

    "--font-display": FONT_STACKS[typography.display],
    "--font-body": FONT_STACKS[typography.body],
    "--font-size-xs": step(base, ratio, -1),
    "--font-size-base": `${base}px`,
    "--font-size-lg": step(base, ratio, 1),
    "--font-size-xl": step(base, ratio, 2),
    "--font-size-2xl": step(base, ratio, 3),
    "--heading-weight": String(typography.headingWeight),
    "--heading-tracking": TRACKING[typography.headingTracking],
    "--line-height": String(typography.bodyLineHeight),

    // Cards carry a softer curve than controls, capped so a pill theme does not
    // turn a full-width card into a lozenge.
    "--radius": `${radius}px`,
    "--radius-card": `${Math.min(Math.round(radius * 1.5), 20)}px`,
    "--space": `${space}px`,
    "--border-width": BORDER_WIDTH_PX[shape.border],
    "--shadow-sm": shadow.sm,
    "--shadow-md": shadow.md,
    "--motion": MOTION[effects.motion],
  };

  return vars as CSSProperties;
}

const CANVAS_CSS = `
.tpc-root {
  --page-max: 920px;
  container-type: inline-size;
  width: 100%;
  overflow: hidden;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  line-height: var(--line-height);
  text-align: start;
  -webkit-font-smoothing: antialiased;
}
.tpc-root *,
.tpc-root *::before,
.tpc-root *::after { box-sizing: border-box; }

/* ---------- top nav ---------- */
.tpc-nav {
  position: relative;
  z-index: 1;
  background: var(--surface-raised);
  border-bottom: var(--border-width) solid var(--border);
  box-shadow: var(--shadow-sm);
}
.tpc-nav-inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: calc(var(--space) * 1.25) calc(var(--space) * 1.5);
  width: 100%;
  padding: calc(var(--space) * 1.75) calc(var(--space) * 3);
}
.tpc-brand {
  display: flex;
  align-items: center;
  gap: calc(var(--space) * 1.25);
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  font-weight: var(--heading-weight);
  letter-spacing: var(--heading-tracking);
  line-height: 1.2;
}
.tpc-brand-mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 1.7em;
  height: 1.7em;
  border-radius: var(--radius);
  background: var(--primary);
  color: var(--primary-foreground);
}
.tpc-navlinks {
  display: none;
  align-items: center;
  gap: calc(var(--space) * 2.25);
  margin-inline-start: calc(var(--space) * 1.5);
  color: var(--muted);
  font-size: calc(var(--font-size-base) * 0.94);
}
.tpc-navlink[data-active="true"] { color: var(--foreground); font-weight: 500; }
.tpc-nav-actions { margin-inline-start: auto; }

/* ---------- page ---------- */
.tpc-page { padding: calc(var(--space) * 3); }
.tpc-main {
  display: grid;
  gap: calc(var(--space) * 2.5);
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "head" "stats" "form" "list" "empty";
}
/* min-width: 0 throughout — grid and flex items default to min-width: auto,
   which would let a card refuse to shrink and punch out of the canvas. */
.tpc-head { grid-area: head; min-width: 0; }
.tpc-stats { grid-area: stats; min-width: 0; }
.tpc-form { grid-area: form; min-width: 0; }
.tpc-list { grid-area: list; min-width: 0; }
.tpc-empty { grid-area: empty; min-width: 0; }
/* Sections stretch to their grid row, and their card fills the section, so
   cards sharing a row line up at the bottom instead of ending ragged. */
.tpc-form,
.tpc-list,
.tpc-empty { display: flex; }
.tpc-form > .tpc-card,
.tpc-list > .tpc-card,
.tpc-empty > .tpc-empty-box { flex: 1; min-width: 0; }

.tpc-title {
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
  font-weight: var(--heading-weight);
  letter-spacing: var(--heading-tracking);
  line-height: 1.15;
}
.tpc-subtitle {
  margin-top: calc(var(--space) * 0.5);
  color: var(--muted);
  font-size: calc(var(--font-size-base) * 0.94);
}

/* ---------- cards ---------- */
.tpc-card {
  background: var(--surface);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-md);
  padding: calc(var(--space) * 2.5);
}
.tpc-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: calc(var(--space) * 0.5) var(--space);
  margin-bottom: calc(var(--space) * 2);
}
.tpc-card-title {
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  font-weight: var(--heading-weight);
  letter-spacing: var(--heading-tracking);
  line-height: 1.2;
}
.tpc-card-meta { color: var(--muted); font-size: var(--font-size-xs); }

/* ---------- stats ---------- */
.tpc-stat-grid {
  display: grid;
  gap: calc(var(--space) * 2);
  grid-template-columns: minmax(0, 1fr);
}
.tpc-stat {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space) * 0.5);
  min-width: 0;
  box-shadow: var(--shadow-sm);
}
.tpc-stat-icon {
  display: grid;
  place-items: center;
  width: 2.4em;
  height: 2.4em;
  margin-bottom: calc(var(--space) * 1.25);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
}
.tpc-stat-value {
  font-family: var(--font-display);
  font-size: var(--font-size-2xl);
  font-weight: var(--heading-weight);
  letter-spacing: var(--heading-tracking);
  line-height: 1.05;
}
.tpc-stat-label { color: var(--muted); font-size: var(--font-size-xs); }

/* ---------- form ---------- */
.tpc-fields { display: flex; flex-direction: column; gap: calc(var(--space) * 1.75); }
.tpc-field { display: flex; flex-direction: column; gap: calc(var(--space) * 0.75); }
.tpc-label { color: var(--muted); font-size: var(--font-size-xs); font-weight: 500; }
.tpc-input {
  padding: calc(var(--space) * 1.15) calc(var(--space) * 1.5);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--foreground) 4%, var(--background));
  font-size: calc(var(--font-size-base) * 0.94);
  line-height: 1.4;
}
.tpc-input[data-focus="true"] {
  background: var(--background);
  border-color: var(--ring);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 30%, transparent);
}
.tpc-select { display: flex; align-items: center; justify-content: space-between; gap: var(--space); }
.tpc-form-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space);
  margin-top: calc(var(--space) * 2.25);
}

/* ---------- buttons ---------- */
.tpc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--space) * 0.75);
  padding: calc(var(--space) * 1.15) calc(var(--space) * 2);
  border: var(--border-width) solid transparent;
  border-radius: var(--radius);
  font-family: inherit;
  font-size: calc(var(--font-size-base) * 0.94);
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  transition: var(--motion);
}
.tpc-btn--primary {
  background: var(--primary);
  color: var(--primary-foreground);
  box-shadow: var(--shadow-sm);
}
.tpc-btn--secondary {
  background: color-mix(in srgb, var(--foreground) 6%, transparent);
  color: var(--foreground);
  border-color: var(--border);
}
.tpc-btn--sm {
  padding: calc(var(--space) * 0.85) calc(var(--space) * 1.6);
  font-size: var(--font-size-xs);
}
.tpc-root[data-motion="playful"] .tpc-btn:hover { transform: translateY(-2px); }
.tpc-root[data-motion="playful"] .tpc-btn--primary:hover { box-shadow: var(--shadow-md); }

/* ---------- activity list ---------- */
.tpc-rows { display: flex; flex-direction: column; }
.tpc-row {
  display: flex;
  align-items: center;
  gap: calc(var(--space) * 1.5);
  padding-block: calc(var(--space) * 1.5);
}
.tpc-row:first-child { padding-top: 0; }
.tpc-row:last-child { padding-bottom: 0; }
.tpc-row + .tpc-row { border-top: var(--border-width) solid var(--border); }
.tpc-avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.4em;
  height: 2.4em;
  border-radius: 50%;
  font-size: var(--font-size-xs);
  font-weight: 700;
}
.tpc-row-text { flex: 1; min-width: 0; }
.tpc-row-name {
  display: block;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tpc-row-detail {
  display: block;
  margin-top: calc(var(--space) * 0.25);
  color: var(--muted);
  font-size: var(--font-size-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tpc-badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.3em 0.75em;
  border-radius: var(--radius);
  font-size: var(--font-size-xs);
  font-weight: 600;
  white-space: nowrap;
}
.tpc-badge-dot { width: 0.45em; height: 0.45em; border-radius: 50%; background: currentColor; }

/* ---------- empty state ---------- */
.tpc-empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--space) * 0.75);
  padding: calc(var(--space) * 4) calc(var(--space) * 3);
  border: max(1px, var(--border-width)) dashed color-mix(in srgb, var(--muted) 45%, transparent);
  border-radius: var(--radius-card);
  text-align: center;
}
.tpc-empty-title {
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  font-weight: var(--heading-weight);
  letter-spacing: var(--heading-tracking);
}
.tpc-empty-body { max-width: 44ch; color: var(--muted); font-size: calc(var(--font-size-base) * 0.94); }

/* ---------- footer ---------- */
.tpc-footer { background: var(--surface); border-top: var(--border-width) solid var(--border); }
.tpc-footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: calc(var(--space) * 0.5) calc(var(--space) * 2);
  padding: calc(var(--space) * 2) calc(var(--space) * 3);
  color: var(--muted);
  font-size: var(--font-size-xs);
}
.tpc-status { display: inline-flex; align-items: center; gap: 0.5em; }
.tpc-status-dot { width: 0.5em; height: 0.5em; border-radius: 50%; background: var(--success); }

/* ---------- container variants ---------- */
.tpc-root[data-container="card"] .tpc-nav-inner,
.tpc-root[data-container="card"] .tpc-page,
.tpc-root[data-container="card"] .tpc-footer-inner {
  max-width: var(--page-max);
  margin-inline: auto;
}
/* Fluid pulls the stats out to a full-bleed band, so the cards inside shed
   their own chrome and let the band carry the surface. */
.tpc-root[data-container="fluid"] .tpc-stats {
  margin-inline: calc(var(--space) * -3);
  padding: calc(var(--space) * 2.5) calc(var(--space) * 3);
  background: var(--surface);
  border-block: var(--border-width) solid var(--border);
}
.tpc-root[data-container="fluid"] .tpc-stat {
  padding-inline: 0;
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

@container (min-width: 560px) {
  .tpc-navlinks { display: flex; }
}
@container (min-width: 520px) {
  .tpc-stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@container (min-width: 680px) {
  .tpc-root[data-container="card"] .tpc-main,
  .tpc-root[data-container="fluid"] .tpc-main {
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
    grid-template-areas: "head head" "stats stats" "form list" "empty empty";
  }
  .tpc-root[data-container="split"] .tpc-main {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas: "head list" "stats list" "form empty";
  }
}

@media (prefers-reduced-motion: reduce) {
  .tpc-root .tpc-btn { transition: none; }
  .tpc-root[data-motion="playful"] .tpc-btn:hover { transform: none; }
}
`;

interface IconAttrs {
  outer: SVGAttributes<SVGElement>;
  detail: SVGAttributes<SVGElement>;
}

// Icons follow the theme: line glyphs stroke at the token width, filled glyphs
// become silhouettes whose interior details knock out in the card colour, and
// duotone fills at low opacity behind the stroke.
function iconAttrs(icon: ThemeTokens["icon"]): IconAttrs {
  const rounded = icon.corner === "rounded";
  const caps = {
    strokeWidth: icon.strokeWidth,
    strokeLinecap: (rounded ? "round" : "butt") as "round" | "butt",
    strokeLinejoin: (rounded ? "round" : "miter") as "round" | "miter",
  };
  return {
    outer: {
      ...caps,
      fill: icon.style === "line" ? "none" : "currentColor",
      fillOpacity: icon.style === "duotone" ? 0.22 : undefined,
      stroke: icon.style === "filled" ? "none" : "currentColor",
    },
    detail: {
      ...caps,
      fill: "none",
      stroke: icon.style === "filled" ? "var(--surface)" : "currentColor",
    },
  };
}

const ICON_SIZE = "1.2em";

function PackageIcon({ attrs }: { attrs: IconAttrs }) {
  return (
    <svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE} aria-hidden="true">
      <path d="M12 2.6 20.7 7v10L12 21.4 3.3 17V7z" {...attrs.outer} />
      <path d="M3.3 7 12 11.4 20.7 7M12 11.4v10" {...attrs.detail} />
    </svg>
  );
}

function ShieldIcon({ attrs }: { attrs: IconAttrs }) {
  return (
    <svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE} aria-hidden="true">
      <path d="M12 2.6 19 5.5v5.6c0 4.4-2.9 7.6-7 9.1-4.1-1.5-7-4.7-7-9.1V5.5z" {...attrs.outer} />
      <path d="m8.7 12 2.4 2.4 4.3-4.6" {...attrs.detail} />
    </svg>
  );
}

function ClockIcon({ attrs }: { attrs: IconAttrs }) {
  return (
    <svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE} aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" {...attrs.outer} />
      <path d="M12 6.6V12l3.4 2.1" {...attrs.detail} />
    </svg>
  );
}

function BrandMark({ attrs }: { attrs: IconAttrs }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <path d="M12 3.2 20.8 12 12 20.8 3.2 12z" {...attrs.outer} />
    </svg>
  );
}

// A caret is an affordance rather than an icon, so it always strokes — a filled
// chevron would read as a solid wedge.
function CaretIcon({ icon }: { icon: ThemeTokens["icon"] }) {
  const rounded = icon.corner === "rounded";
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={icon.strokeWidth}
      strokeLinecap={rounded ? "round" : "butt"}
      strokeLinejoin={rounded ? "round" : "miter"}
      style={{ color: "var(--muted)", flex: "none" }}
    >
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

const NAV_LINKS = [
  { key: "overview", active: true },
  { key: "orders", active: false },
  { key: "reports", active: false },
] as const;

const STATS = [
  { key: "orders", Icon: PackageIcon },
  { key: "onTime", Icon: ShieldIcon },
  { key: "handling", Icon: ClockIcon },
] as const;

const ACTIVITY = [
  { key: "delivered", tone: "success", avatar: "primary" },
  { key: "pending", tone: "warning", avatar: "accent" },
  { key: "failed", tone: "destructive", avatar: "muted" },
] as const;

function tint(token: string, percent: number): string {
  return `color-mix(in srgb, var(--${token}) ${percent}%, transparent)`;
}

function TopNav({ attrs }: { attrs: IconAttrs }) {
  const t = useT();
  return (
    <header className="tpc-nav">
      <div className="tpc-nav-inner">
        <span className="tpc-brand">
          <span className="tpc-brand-mark">
            <BrandMark attrs={attrs} />
          </span>
          {t("theme.preview.brand")}
        </span>
        <nav className="tpc-navlinks">
          {NAV_LINKS.map((link) => (
            <span
              key={link.key}
              className="tpc-navlink"
              data-active={link.active}
            >
              {t(`theme.preview.nav.${link.key}`)}
            </span>
          ))}
        </nav>
        <span className="tpc-nav-actions">
          <span className="tpc-btn tpc-btn--primary tpc-btn--sm">
            {t("theme.preview.nav.action")}
          </span>
        </span>
      </div>
    </header>
  );
}

function StatsRow({ attrs }: { attrs: IconAttrs }) {
  const t = useT();
  return (
    <section className="tpc-stats">
      <div className="tpc-stat-grid">
        {STATS.map(({ key, Icon }) => (
          <article key={key} className="tpc-card tpc-stat">
            <span className="tpc-stat-icon">
              <Icon attrs={attrs} />
            </span>
            <span className="tpc-stat-value">
              {t(`theme.preview.stat.${key}.value`)}
            </span>
            <span className="tpc-stat-label">
              {t(`theme.preview.stat.${key}.label`)}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function FormCard({ icon }: { icon: ThemeTokens["icon"] }) {
  const t = useT();
  return (
    <section className="tpc-form">
      <div className="tpc-card">
        <div className="tpc-card-head">
          <h3 className="tpc-card-title">{t("theme.preview.form.title")}</h3>
        </div>
        <div className="tpc-fields">
          <div className="tpc-field">
            <span className="tpc-label">{t("theme.preview.form.reference")}</span>
            <div className="tpc-input">
              {t("theme.preview.form.referenceValue")}
            </div>
          </div>
          <div className="tpc-field">
            <span className="tpc-label">
              {t("theme.preview.form.destination")}
            </span>
            <div className="tpc-input" data-focus="true">
              {t("theme.preview.form.destinationValue")}
            </div>
          </div>
          <div className="tpc-field">
            <span className="tpc-label">{t("theme.preview.form.service")}</span>
            <div className="tpc-input tpc-select">
              <span>{t("theme.preview.form.serviceValue")}</span>
              <CaretIcon icon={icon} />
            </div>
          </div>
        </div>
        <div className="tpc-form-actions">
          <span className="tpc-btn tpc-btn--primary">
            {t("theme.preview.form.submit")}
          </span>
          <span className="tpc-btn tpc-btn--secondary">
            {t("theme.preview.form.cancel")}
          </span>
        </div>
      </div>
    </section>
  );
}

function ActivityCard() {
  const t = useT();
  return (
    <section className="tpc-list">
      <div className="tpc-card">
        <div className="tpc-card-head">
          <h3 className="tpc-card-title">{t("theme.preview.list.title")}</h3>
          <span className="tpc-card-meta">{t("theme.preview.list.meta")}</span>
        </div>
        <div className="tpc-rows">
          {ACTIVITY.map((row) => (
            <div key={row.key} className="tpc-row">
              <span
                className="tpc-avatar"
                style={{
                  background: tint(row.avatar, 18),
                  color: `var(--${row.avatar})`,
                }}
              >
                {t(`theme.preview.list.${row.key}.initials`)}
              </span>
              <span className="tpc-row-text">
                <span className="tpc-row-name">
                  {t(`theme.preview.list.${row.key}.name`)}
                </span>
                <span className="tpc-row-detail">
                  {t(`theme.preview.list.${row.key}.detail`)}
                </span>
              </span>
              <span
                className="tpc-badge"
                style={{
                  background: tint(row.tone, 16),
                  color: `var(--${row.tone})`,
                }}
              >
                <span className="tpc-badge-dot" />
                {t(`theme.preview.list.${row.key}.badge`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PreviewCanvas({ tokens }: { tokens: ThemeTokens }) {
  const t = useT();
  const attrs = iconAttrs(tokens.icon);

  return (
    <section
      className="tpc-root"
      style={cssVars(tokens)}
      data-container={tokens.layout.container}
      data-motion={tokens.effects.motion}
      aria-label={t("theme.preview.ariaLabel")}
    >
      <style>{CANVAS_CSS}</style>

      <TopNav attrs={attrs} />

      <div className="tpc-page">
        <div className="tpc-main">
          <div className="tpc-head">
            <h2 className="tpc-title">{t("theme.preview.title")}</h2>
            <p className="tpc-subtitle">{t("theme.preview.subtitle")}</p>
          </div>

          <StatsRow attrs={attrs} />
          <FormCard icon={tokens.icon} />
          <ActivityCard />

          <section className="tpc-empty">
            <div className="tpc-empty-box">
              <span className="tpc-empty-title">
                {t("theme.preview.empty.title")}
              </span>
              <p className="tpc-empty-body">{t("theme.preview.empty.body")}</p>
            </div>
          </section>
        </div>
      </div>

      <footer className="tpc-footer">
        <div className="tpc-footer-inner">
          <span>{t("theme.preview.footer.meta")}</span>
          <span className="tpc-status">
            <span className="tpc-status-dot" />
            {t("theme.preview.footer.status")}
          </span>
        </div>
      </footer>
    </section>
  );
}
