// Theme Studio design-token schema — the shared contract between the token
// definitions, the prompt renderer, the preview canvas, and the CRUD API.
// Slots are semantic and constrained on purpose: pro-looking output comes
// from limiting freedom (scale ratios, semantic color slots), not extending it.

export type FontStackKey =
  | "sans-modern" // neutral geometric sans
  | "sans-grotesk" // characterful grotesk
  | "serif-elegant" // editorial serif for display
  | "rounded-friendly" // soft rounded sans
  | "mono-tech"; // monospace-forward

// System-safe stacks only — generated apps must not load webfonts.
export const FONT_STACKS: Record<FontStackKey, string> = {
  "sans-modern":
    "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  "sans-grotesk":
    "'Avenir Next', Avenir, 'Segoe UI', Futura, 'Trebuchet MS', system-ui, sans-serif",
  "serif-elegant": "Georgia, 'Times New Roman', 'Songti SC', serif",
  "rounded-friendly":
    "'Hiragino Maru Gothic ProN', 'Arial Rounded MT Bold', 'Comic Sans MS', system-ui, sans-serif",
  "mono-tech": "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

export interface ThemeTokens {
  color: {
    background: string; // page base
    surface: string; // cards
    surfaceRaised: string; // popovers / modals
    foreground: string;
    muted: string; // secondary text
    primary: string;
    primaryForeground: string; // text on primary
    accent: string;
    success: string;
    warning: string;
    destructive: string;
    border: string;
    ring: string; // focus outline
  };
  typography: {
    display: FontStackKey;
    body: FontStackKey;
    baseSize: 14 | 15 | 16;
    scaleRatio: 1.2 | 1.25 | 1.333;
    headingWeight: 500 | 600 | 700 | 800;
    bodyLineHeight: 1.5 | 1.6 | 1.75;
    headingTracking: "tight" | "normal" | "wide";
  };
  shape: {
    radius: "sharp" | "soft" | "round" | "pill";
    density: "compact" | "normal" | "relaxed";
    border: "hairline" | "none" | "bold";
  };
  layout: {
    container: "card" | "split" | "fluid";
  };
  icon: {
    style: "line" | "filled" | "duotone";
    strokeWidth: 1.5 | 2; // meaningful for "line"; keep 2 otherwise
    corner: "sharp" | "rounded";
  };
  effects: {
    shadow: "none" | "soft" | "pronounced";
    motion: "none" | "subtle" | "playful";
  };
}

export interface ThemeDefinition {
  // Built-in id (existing names like "zen-garden") or "custom:<cuid>".
  id: string;
  name: string;
  nameZh: string;
  tokens: ThemeTokens;
}

// Radius/density/spacing bases the canvas and prompt renderer share.
export const RADIUS_PX: Record<ThemeTokens["shape"]["radius"], number> = {
  sharp: 2,
  soft: 8,
  round: 14,
  pill: 24,
};

export const DENSITY_BASE_PX: Record<ThemeTokens["shape"]["density"], number> = {
  compact: 6,
  normal: 8,
  relaxed: 12,
};

// Filled in by the P1 agent: full token definitions for the 8 built-ins.
export declare const BUILTIN_THEME_TOKENS: ThemeDefinition[];
