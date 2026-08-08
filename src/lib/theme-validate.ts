// Validation for user-authored theme tokens. Everything that reaches the
// database or a generation prompt passes through here: the payload is rebuilt
// field by field, so unknown keys are dropped rather than stored, and any value
// outside the contract rejects the whole theme instead of being coerced.

import { FONT_STACKS, type FontStackKey, type ThemeTokens } from "./theme-tokens";

export const MAX_THEME_NAME = 40;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const COLOR_SLOTS = [
  "background",
  "surface",
  "surfaceRaised",
  "foreground",
  "muted",
  "primary",
  "primaryForeground",
  "accent",
  "success",
  "warning",
  "destructive",
  "border",
  "ring",
] as const;

type ColorSlot = (typeof COLOR_SLOTS)[number];

// FONT_STACKS is keyed by the full FontStackKey union, so its keys are the
// allowed values by construction — no second list to keep in sync.
const FONT_STACK_KEYS = Object.keys(FONT_STACKS) as readonly FontStackKey[];

const BASE_SIZES = [14, 15, 16] as const;
const SCALE_RATIOS = [1.2, 1.25, 1.333] as const;
const HEADING_WEIGHTS = [500, 600, 700, 800] as const;
const BODY_LINE_HEIGHTS = [1.5, 1.6, 1.75] as const;
const HEADING_TRACKINGS = ["tight", "normal", "wide"] as const;
const RADII = ["sharp", "soft", "round", "pill"] as const;
const DENSITIES = ["compact", "normal", "relaxed"] as const;
const BORDERS = ["hairline", "none", "bold"] as const;
const CONTAINERS = ["card", "split", "fluid"] as const;
const ICON_STYLES = ["line", "filled", "duotone"] as const;
const STROKE_WIDTHS = [1.5, 2] as const;
const ICON_CORNERS = ["sharp", "rounded"] as const;
const SHADOWS = ["none", "soft", "pronounced"] as const;
const MOTIONS = ["none", "subtle", "playful"] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

// Membership test by identity: no coercion, so "16" never passes for 16.
function pickEnum<T extends string | number>(value: unknown, allowed: readonly T[]): T | null {
  return allowed.find((member) => member === value) ?? null;
}

function pickHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const hex = value.trim();
  return HEX_COLOR.test(hex) ? hex.toLowerCase() : null;
}

function sanitizeColors(input: unknown): ThemeTokens["color"] | null {
  const raw = asRecord(input);
  if (!raw) return null;
  const color: Partial<Record<ColorSlot, string>> = {};
  for (const slot of COLOR_SLOTS) {
    const hex = pickHexColor(raw[slot]);
    if (hex === null) return null;
    color[slot] = hex;
  }
  // Every slot was assigned above, so the partial is complete.
  return color as ThemeTokens["color"];
}

function sanitizeTypography(input: unknown): ThemeTokens["typography"] | null {
  const raw = asRecord(input);
  if (!raw) return null;
  const display = pickEnum(raw.display, FONT_STACK_KEYS);
  const body = pickEnum(raw.body, FONT_STACK_KEYS);
  const baseSize = pickEnum(raw.baseSize, BASE_SIZES);
  const scaleRatio = pickEnum(raw.scaleRatio, SCALE_RATIOS);
  const headingWeight = pickEnum(raw.headingWeight, HEADING_WEIGHTS);
  const bodyLineHeight = pickEnum(raw.bodyLineHeight, BODY_LINE_HEIGHTS);
  const headingTracking = pickEnum(raw.headingTracking, HEADING_TRACKINGS);
  if (
    display === null ||
    body === null ||
    baseSize === null ||
    scaleRatio === null ||
    headingWeight === null ||
    bodyLineHeight === null ||
    headingTracking === null
  ) {
    return null;
  }
  return { display, body, baseSize, scaleRatio, headingWeight, bodyLineHeight, headingTracking };
}

function sanitizeShape(input: unknown): ThemeTokens["shape"] | null {
  const raw = asRecord(input);
  if (!raw) return null;
  const radius = pickEnum(raw.radius, RADII);
  const density = pickEnum(raw.density, DENSITIES);
  const border = pickEnum(raw.border, BORDERS);
  if (radius === null || density === null || border === null) return null;
  return { radius, density, border };
}

function sanitizeLayout(input: unknown): ThemeTokens["layout"] | null {
  const raw = asRecord(input);
  if (!raw) return null;
  const container = pickEnum(raw.container, CONTAINERS);
  return container === null ? null : { container };
}

function sanitizeIcon(input: unknown): ThemeTokens["icon"] | null {
  const raw = asRecord(input);
  if (!raw) return null;
  const style = pickEnum(raw.style, ICON_STYLES);
  const strokeWidth = pickEnum(raw.strokeWidth, STROKE_WIDTHS);
  const corner = pickEnum(raw.corner, ICON_CORNERS);
  if (style === null || strokeWidth === null || corner === null) return null;
  return { style, strokeWidth, corner };
}

function sanitizeEffects(input: unknown): ThemeTokens["effects"] | null {
  const raw = asRecord(input);
  if (!raw) return null;
  const shadow = pickEnum(raw.shadow, SHADOWS);
  const motion = pickEnum(raw.motion, MOTIONS);
  if (shadow === null || motion === null) return null;
  return { shadow, motion };
}

// Theme names are interpolated into the generation system prompt, so control
// characters — newlines above all — must never survive validation.
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

// Returns a freshly built ThemeTokens, or null if any part of the input is
// missing, malformed or outside the allowed values.
export function sanitizeThemeTokens(input: unknown): ThemeTokens | null {
  const raw = asRecord(input);
  if (!raw) return null;
  const color = sanitizeColors(raw.color);
  const typography = sanitizeTypography(raw.typography);
  const shape = sanitizeShape(raw.shape);
  const layout = sanitizeLayout(raw.layout);
  const icon = sanitizeIcon(raw.icon);
  const effects = sanitizeEffects(raw.effects);
  if (!color || !typography || !shape || !layout || !icon || !effects) return null;
  return { color, typography, shape, layout, icon, effects };
}

export function sanitizeThemeName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.trim();
  if (!name || name.length > MAX_THEME_NAME) return null;
  if (hasControlChars(name)) return null;
  return name;
}
