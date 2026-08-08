// WCAG contrast math plus the rule set behind the studio's accessibility
// panel. Pure functions only — no React, no DOM — so the same rules can run in
// the editor, on the server, or in tests.

import type { ThemeTokens } from "./theme-tokens";

// WCAG 2.1 minimums: 4.5:1 for body-sized text, 3:1 for large text and for
// non-text affordances such as a focus ring.
const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

// Cards need a visible lightness step from the page, otherwise the layout
// collapses into one flat sheet. Expressed as a relative-luminance delta
// because a contrast ratio between two near-identical greys is uninformative.
const SURFACE_DELTA_MIN = 0.03;

// A "destructive" colour users actually read as danger. Hues wrap at 360.
const DESTRUCTIVE_HUE_MIN = 340;
const DESTRUCTIVE_HUE_MAX = 40;

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

// Returns null for anything that is not a 3- or 6-digit hex colour. Tokens can
// arrive from the API half-edited, so every public function below turns that
// null into NaN and every rule skips itself rather than reporting nonsense.
function parseHex(hex: string): Rgb | null {
  const match = HEX_PATTERN.exec(String(hex ?? "").trim());
  if (!match) return null;
  const digits = match[1];
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((d) => d + d)
          .join("")
      : digits;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

// WCAG 2.1 sRGB gamma expansion for a single 0-255 channel.
function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// Relative luminance in 0..1, or NaN when the colour cannot be parsed.
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return Number.NaN;
  const r = channelLuminance(rgb.r);
  const g = channelLuminance(rgb.g);
  const b = channelLuminance(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Contrast ratio in 1..21 (white on black = 21), or NaN when either colour is
// unparseable. Order of the arguments does not matter.
export function contrastRatio(a: string, b: string): number {
  const luminanceA = relativeLuminance(a);
  const luminanceB = relativeLuminance(b);
  if (Number.isNaN(luminanceA) || Number.isNaN(luminanceB)) return Number.NaN;
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

// HSL hue in degrees (0-360), or NaN when the colour cannot be parsed.
// Greys have no hue and report 0.
export function hueOf(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return Number.NaN;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta === 0) return 0;
  const sector =
    max === r
      ? ((g - b) / delta) % 6
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;
  return (sector * 60 + 360) % 360;
}

export interface LintFinding {
  id: string;
  level: "error" | "warn" | "info";
  messageKey: string;
  ratio?: number;
}

type LintRule = (tokens: ThemeTokens) => LintFinding | null;

function contrastRule(
  id: string,
  level: LintFinding["level"],
  messageKey: string,
  minimum: number,
  pick: (color: ThemeTokens["color"]) => readonly [string, string]
): LintRule {
  return (tokens) => {
    const [a, b] = pick(tokens.color);
    const ratio = contrastRatio(a, b);
    if (!Number.isFinite(ratio) || ratio >= minimum) return null;
    return { id, level, messageKey, ratio };
  };
}

// Evaluated in this order, so findings always come back in a stable sequence.
const RULES: readonly LintRule[] = [
  contrastRule(
    "body-contrast",
    "error",
    "theme.lint.bodyContrast",
    AA_TEXT,
    (color) => [color.foreground, color.background]
  ),
  contrastRule(
    "muted-contrast",
    "warn",
    "theme.lint.mutedContrast",
    AA_NON_TEXT,
    (color) => [color.muted, color.background]
  ),
  contrastRule(
    "primary-contrast",
    "error",
    "theme.lint.primaryContrast",
    AA_TEXT,
    (color) => [color.primaryForeground, color.primary]
  ),
  (tokens) => {
    const surface = relativeLuminance(tokens.color.surface);
    const background = relativeLuminance(tokens.color.background);
    if (!Number.isFinite(surface) || !Number.isFinite(background)) return null;
    if (Math.abs(surface - background) >= SURFACE_DELTA_MIN) return null;
    return {
      id: "surface-separation",
      level: "warn",
      messageKey: "theme.lint.surfaceSeparation",
    };
  },
  contrastRule(
    "ring-contrast",
    "warn",
    "theme.lint.ringContrast",
    AA_NON_TEXT,
    (color) => [color.ring, color.background]
  ),
  (tokens) => {
    const hue = hueOf(tokens.color.destructive);
    if (!Number.isFinite(hue)) return null;
    if (hue >= DESTRUCTIVE_HUE_MIN || hue <= DESTRUCTIVE_HUE_MAX) return null;
    return {
      id: "destructive-hue",
      level: "warn",
      messageKey: "theme.lint.destructiveHue",
    };
  },
];

// Runs every rule against a theme. Rules that cannot be evaluated — malformed
// hex, missing slot — drop out silently instead of reporting a false failure.
export function lintTheme(tokens: ThemeTokens): LintFinding[] {
  return RULES.map((rule) => rule(tokens)).filter(
    (finding): finding is LintFinding => finding !== null
  );
}
