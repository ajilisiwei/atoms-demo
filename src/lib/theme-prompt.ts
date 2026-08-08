// Renders a ThemeDefinition into the design block injected into the build
// agent's system prompt. This is the single source of theme instructions —
// nothing about a theme should be hand-written prose anymore.

import {
  DENSITY_BASE_PX,
  FONT_STACKS,
  RADIUS_PX,
  type ThemeDefinition,
  type ThemeTokens,
} from "./theme-tokens";

type ColorSlot = keyof ThemeTokens["color"];
type Typography = ThemeTokens["typography"];
type Shape = ThemeTokens["shape"];
type Layout = ThemeTokens["layout"];
type Icon = ThemeTokens["icon"];
type Effects = ThemeTokens["effects"];

// Declaration order here is the render order of both the color list and the
// CSS variable block.
const COLOR_USAGE: Record<ColorSlot, string> = {
  background: "page canvas behind everything",
  surface: "cards, panels and list rows sitting on the background",
  surfaceRaised: "popovers, modals and dropdowns, one step above surface",
  foreground: "primary text and icons",
  muted: "secondary text, labels, placeholders, disabled states",
  primary: "primary buttons, active nav, key interactive fills",
  primaryForeground: "text and icons placed on primary",
  accent: "highlights, badges, charts and decorative fills (not body text)",
  success: "confirmations, valid states, positive deltas",
  warning: "warnings, pending states, values needing attention",
  destructive: "delete actions, errors, invalid inputs",
  border: "borders, dividers, input outlines, table rules",
  ring: "focus rings only, as a 2px outline with 2px offset, never removed",
};

const TRACKING_CSS: Record<Typography["headingTracking"], string> = {
  tight: "-0.02em",
  normal: "0",
  wide: "0.04em",
};

const BORDER_NOTE: Record<Shape["border"], string> = {
  hairline: "1px solid the border color on cards, inputs and dividers",
  none: "no borders — separate regions with background steps and whitespace alone",
  bold: "2px solid the border color; treat rules as structure, full-bleed where they organize the grid",
};

const CONTAINER_NOTE: Record<Layout["container"], string> = {
  card: "one centered column (max-width ~960px) with content grouped into cards",
  split: "a strict two-column grid (list or sidebar + detail) collapsing to one column under 768px",
  fluid: "full-width fluid sections, content first, with a ~72ch measure for running text",
};

const SHADOW_NOTE: Record<Effects["shadow"], string> = {
  none: "no shadows — depth comes from the border color and whitespace",
  soft: "soft shadows only: 0 1px 2px rgba(0,0,0,0.06) and 0 4px 12px rgba(0,0,0,0.06) on cards and popovers",
  pronounced:
    "pronounced depth: 0 8px 30px rgba(0,0,0,0.35) on raised surfaces, plus a glow of the primary color at ~35% opacity behind key interactive elements",
};

const MOTION_NOTE: Record<Effects["motion"], string> = {
  none: "no transitions or animations — state changes are instant",
  subtle: "150ms ease transitions on hover, focus and open/close; nothing travels more than a few pixels",
  playful:
    "spring-like motion: 260ms cubic-bezier(0.34, 1.56, 0.64, 1) with a slight scale overshoot on press and on entrance",
};

function kebab(slot: string): string {
  return slot.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function colorSlots(): ColorSlot[] {
  return Object.keys(COLOR_USAGE) as ColorSlot[];
}

// Concrete px ladder so the model never has to apply the ratio itself. The
// downward step is floored at 12px — a strict ratio puts small text below
// legibility for the tighter base sizes.
const MIN_SMALL_PX = 12;

function typeLadder(typography: Typography): string {
  const { baseSize, scaleRatio } = typography;
  const step = (n: number) => Math.round(baseSize * scaleRatio ** n);
  const small = Math.max(MIN_SMALL_PX, step(-1));
  return `small ${small}px, body ${baseSize}px, h3 ${step(1)}px, h2 ${step(2)}px, h1 ${step(3)}px, display ${step(4)}px`;
}

function radiusNote(radius: Shape["radius"]): string {
  const px = RADIUS_PX[radius];
  if (radius === "pill") {
    return `${px}px on cards; buttons, inputs and chips are fully rounded pills (border-radius: 9999px)`;
  }
  if (radius === "sharp") {
    return `${px}px everywhere — keep corners crisp, never soften them`;
  }
  return `${px}px on cards, inputs, buttons, images and avatars alike`;
}

function densityNote(density: Shape["density"]): string {
  const unit = DENSITY_BASE_PX[density];
  return `${density} — ${unit}px spacing unit: ${unit * 3}px card padding, ${unit * 1.5}px between related elements, ${unit * 6}px between sections`;
}

function iconNote(icon: Icon): string {
  const corner =
    icon.corner === "rounded"
      ? "round line caps and joins"
      : "square line caps and mitered joins";
  if (icon.style === "line") {
    return `outline icons drawn with ${icon.strokeWidth}px strokes, no fills, ${corner}`;
  }
  if (icon.style === "filled") {
    return `solid single-color icons with no outlines, ${corner} on any internal detail`;
  }
  return `duotone icons: a filled shape in the accent color at ~20% opacity under a ${icon.strokeWidth}px foreground-colored outline, ${corner}`;
}

// Just the :root block — the studio preview and the runtime need it without
// the surrounding prompt.
export function renderThemeCssVars(tokens: ThemeTokens): string {
  const { color, typography, shape } = tokens;
  return [
    ":root {",
    ...colorSlots().map((slot) => `  --${kebab(slot)}: ${color[slot]};`),
    `  --radius: ${RADIUS_PX[shape.radius]}px;`,
    `  --space: ${DENSITY_BASE_PX[shape.density]}px;`,
    `  --font-display: ${FONT_STACKS[typography.display]};`,
    `  --font-body: ${FONT_STACKS[typography.body]};`,
    `  --text-base: ${typography.baseSize}px;`,
    `  --line-height: ${typography.bodyLineHeight};`,
    "}",
  ].join("\n");
}

export function renderThemePrompt(def: ThemeDefinition): string {
  const { color, typography, shape, layout, icon, effects } = def.tokens;

  const colorLines = colorSlots()
    .map((slot) => `- ${slot}: ${color[slot]} — ${COLOR_USAGE[slot]}`)
    .join("\n");

  return `## Design theme: "${def.name}" (${def.nameZh}) — MUST follow

### Colors — use these exact values; derive hover/active by shifting lightness 6-10%, never by picking a new hue
${colorLines}

### Typography
- Headings: ${FONT_STACKS[typography.display]}
- Body: ${FONT_STACKS[typography.body]}
- Body text ${typography.baseSize}px with line-height ${typography.bodyLineHeight}; scale ratio ${typography.scaleRatio} gives ${typeLadder(typography)}
- Headings: font-weight ${typography.headingWeight}, letter-spacing ${TRACKING_CSS[typography.headingTracking]} (${typography.headingTracking}), line-height ~1.2

### Shape, density and layout
- Corner radius ${radiusNote(shape.radius)}
- Density ${densityNote(shape.density)}
- Borders: ${BORDER_NOTE[shape.border]}
- Layout: ${CONTAINER_NOTE[layout.container]}

### Icons
- Style: ${iconNote(icon)}
- Draw every icon as inline SVG on a 24px grid with a consistent set — same weight, same optical size, no icon fonts and no external assets

### Effects
- Shadows: ${SHADOW_NOTE[effects.shadow]}
- Motion: ${MOTION_NOTE[effects.motion]}

### CSS variables — define exactly these once, then reference them with var(--token) throughout; no raw hex anywhere else
${renderThemeCssVars(def.tokens)}`;
}
