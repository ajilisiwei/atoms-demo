// Derive a full color set from one brand color — the studio's "magic"
// helper for users who start from a single hex. Pure HSL arithmetic.

import type { ThemeTokens } from "./theme-tokens";

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.min(1, Math.max(0, s));
  l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

// Generates a light-scheme palette around the brand color: tinted neutrals
// for the base layers, brand at full strength for primary, and semantic
// colors nudged toward the brand hue without leaving their semantic range.
export function deriveColorsFromBrand(brandHex: string): ThemeTokens["color"] | null {
  const hsl = hexToHsl(brandHex);
  if (!hsl) return null;
  const { h, s } = hsl;
  const tintS = Math.min(0.25, s * 0.4);
  const primary = hslToHex(h, Math.max(0.35, s), Math.min(0.52, Math.max(0.34, hsl.l)));
  const primaryIsLight = (hexToHsl(primary)?.l ?? 0) > 0.62;
  return {
    background: hslToHex(h, tintS * 0.5, 0.985),
    surface: hslToHex(h, tintS * 0.6, 1),
    surfaceRaised: hslToHex(h, tintS * 0.6, 1),
    foreground: hslToHex(h, Math.min(0.3, tintS + 0.1), 0.14),
    muted: hslToHex(h, Math.min(0.2, tintS), 0.45),
    primary,
    primaryForeground: primaryIsLight ? hslToHex(h, 0.4, 0.12) : "#ffffff",
    accent: hslToHex(h + 40, Math.max(0.4, s * 0.8), 0.55),
    success: hslToHex(150, 0.45, 0.38),
    warning: hslToHex(38, 0.85, 0.5),
    destructive: hslToHex(4, 0.72, 0.5),
    border: hslToHex(h, tintS, 0.9),
    ring: primary,
  };
}
