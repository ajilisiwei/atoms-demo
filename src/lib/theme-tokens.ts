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

// The 8 built-in themes. Palettes are verified to keep foreground/background
// and primaryForeground/primary at WCAG AA (>= 4.5:1); muted text clears AA
// against background too. Keep hex values 6-digit lowercase.
export const BUILTIN_THEME_TOKENS: ThemeDefinition[] = [
  {
    id: "zen-garden",
    name: "Zen Garden",
    nameZh: "禅意庭园",
    tokens: {
      color: {
        background: "#f7f6f3",
        surface: "#ffffff",
        surfaceRaised: "#fdfdfc",
        foreground: "#1c1c1a",
        muted: "#6b665f",
        primary: "#1c1c1a",
        primaryForeground: "#fafaf9",
        accent: "#57534e",
        success: "#2f6f57",
        warning: "#8a5a12",
        destructive: "#a8352a",
        border: "#e7e5e4",
        ring: "#57534e",
      },
      typography: {
        display: "sans-modern",
        body: "sans-modern",
        baseSize: 16,
        scaleRatio: 1.2,
        headingWeight: 500,
        bodyLineHeight: 1.75,
        headingTracking: "normal",
      },
      shape: { radius: "soft", density: "relaxed", border: "hairline" },
      layout: { container: "card" },
      icon: { style: "line", strokeWidth: 1.5, corner: "rounded" },
      effects: { shadow: "none", motion: "subtle" },
    },
  },
  {
    id: "terracotta",
    name: "Terracotta",
    nameZh: "赤陶",
    tokens: {
      color: {
        background: "#fbf3ec",
        surface: "#fffbf7",
        surfaceRaised: "#ffffff",
        foreground: "#44322d",
        muted: "#7a5a49",
        primary: "#9a3b26",
        primaryForeground: "#fff7ed",
        accent: "#b45c09",
        success: "#3f7a52",
        warning: "#96570a",
        destructive: "#a82c1c",
        border: "#ead9c9",
        ring: "#9a3b26",
      },
      typography: {
        display: "serif-elegant",
        body: "sans-modern",
        baseSize: 16,
        scaleRatio: 1.25,
        headingWeight: 600,
        bodyLineHeight: 1.6,
        headingTracking: "normal",
      },
      shape: { radius: "round", density: "relaxed", border: "hairline" },
      layout: { container: "card" },
      icon: { style: "line", strokeWidth: 1.5, corner: "rounded" },
      effects: { shadow: "soft", motion: "subtle" },
    },
  },
  {
    id: "paper-ink",
    name: "Paper & Ink",
    nameZh: "纸与墨",
    tokens: {
      color: {
        background: "#ffffff",
        surface: "#fafafa",
        surfaceRaised: "#ffffff",
        foreground: "#111111",
        muted: "#6b7280",
        primary: "#111111",
        primaryForeground: "#ffffff",
        accent: "#4b5563",
        success: "#15803d",
        warning: "#a16207",
        destructive: "#b91c1c",
        border: "#e5e7eb",
        ring: "#111111",
      },
      typography: {
        display: "sans-modern",
        body: "sans-modern",
        baseSize: 16,
        scaleRatio: 1.25,
        headingWeight: 600,
        bodyLineHeight: 1.6,
        headingTracking: "tight",
      },
      shape: { radius: "soft", density: "normal", border: "hairline" },
      layout: { container: "fluid" },
      icon: { style: "line", strokeWidth: 1.5, corner: "rounded" },
      effects: { shadow: "none", motion: "subtle" },
    },
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    nameZh: "海风",
    tokens: {
      color: {
        background: "#f0f9ff",
        surface: "#ffffff",
        surfaceRaised: "#ffffff",
        foreground: "#0c4a6e",
        muted: "#3d6b85",
        primary: "#0369a1",
        primaryForeground: "#f0f9ff",
        accent: "#38bdf8",
        success: "#0d7d70",
        warning: "#9a5b06",
        destructive: "#c22d2d",
        border: "#bae6fd",
        ring: "#0284c7",
      },
      typography: {
        display: "sans-modern",
        body: "sans-modern",
        baseSize: 16,
        scaleRatio: 1.25,
        headingWeight: 600,
        bodyLineHeight: 1.6,
        headingTracking: "normal",
      },
      shape: { radius: "round", density: "relaxed", border: "hairline" },
      layout: { container: "card" },
      icon: { style: "line", strokeWidth: 2, corner: "rounded" },
      effects: { shadow: "soft", motion: "playful" },
    },
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    nameZh: "黄金时刻",
    tokens: {
      color: {
        background: "#fffbeb",
        surface: "#fffdf5",
        surfaceRaised: "#ffffff",
        foreground: "#451a03",
        muted: "#7d5211",
        primary: "#b45309",
        primaryForeground: "#fffbeb",
        accent: "#f59e0b",
        success: "#15803d",
        warning: "#a1660a",
        destructive: "#b3291c",
        border: "#fde68a",
        ring: "#b45309",
      },
      typography: {
        display: "sans-modern",
        body: "sans-modern",
        baseSize: 16,
        scaleRatio: 1.25,
        headingWeight: 700,
        bodyLineHeight: 1.6,
        headingTracking: "normal",
      },
      shape: { radius: "soft", density: "normal", border: "hairline" },
      layout: { container: "card" },
      icon: { style: "filled", strokeWidth: 2, corner: "rounded" },
      effects: { shadow: "soft", motion: "playful" },
    },
  },
  {
    id: "forest-moss",
    name: "Forest & Moss",
    nameZh: "森林苔藓",
    tokens: {
      color: {
        background: "#f3f6f1",
        surface: "#fbfdf9",
        surfaceRaised: "#ffffff",
        foreground: "#1e3a2b",
        muted: "#556b58",
        primary: "#2f5233",
        primaryForeground: "#f3f6f1",
        accent: "#4d7c0f",
        success: "#0f766e",
        warning: "#8a5f0b",
        destructive: "#a8352a",
        border: "#d6e3cf",
        ring: "#4d7c0f",
      },
      typography: {
        display: "sans-modern",
        body: "sans-modern",
        baseSize: 16,
        scaleRatio: 1.2,
        headingWeight: 600,
        bodyLineHeight: 1.75,
        headingTracking: "normal",
      },
      shape: { radius: "soft", density: "relaxed", border: "hairline" },
      layout: { container: "card" },
      icon: { style: "line", strokeWidth: 1.5, corner: "rounded" },
      effects: { shadow: "soft", motion: "subtle" },
    },
  },
  {
    id: "neon-night",
    name: "Neon Night",
    nameZh: "霓虹夜色",
    tokens: {
      color: {
        background: "#0a0a0f",
        surface: "#15151c",
        surfaceRaised: "#1e1e28",
        foreground: "#e4e4e7",
        muted: "#a1a1b3",
        primary: "#7c3aed",
        primaryForeground: "#fafafa",
        accent: "#22d3ee",
        success: "#34d399",
        warning: "#fbbf24",
        destructive: "#f87171",
        border: "#27272e",
        ring: "#22d3ee",
      },
      typography: {
        display: "sans-grotesk",
        body: "sans-modern",
        baseSize: 15,
        scaleRatio: 1.333,
        headingWeight: 700,
        bodyLineHeight: 1.6,
        headingTracking: "tight",
      },
      shape: { radius: "round", density: "normal", border: "hairline" },
      layout: { container: "fluid" },
      icon: { style: "line", strokeWidth: 2, corner: "sharp" },
      effects: { shadow: "pronounced", motion: "playful" },
    },
  },
  {
    id: "swiss-grid",
    name: "Swiss Grid",
    nameZh: "瑞士网格",
    tokens: {
      color: {
        background: "#ffffff",
        surface: "#ffffff",
        surfaceRaised: "#f4f4f5",
        foreground: "#0f0f0f",
        muted: "#52525b",
        primary: "#0f0f0f",
        primaryForeground: "#ffffff",
        accent: "#d92616",
        success: "#15803d",
        warning: "#a16207",
        destructive: "#b91c1c",
        border: "#0f0f0f",
        ring: "#2563eb",
      },
      typography: {
        display: "sans-modern",
        body: "sans-modern",
        baseSize: 16,
        scaleRatio: 1.333,
        headingWeight: 700,
        bodyLineHeight: 1.5,
        headingTracking: "tight",
      },
      shape: { radius: "sharp", density: "compact", border: "bold" },
      layout: { container: "split" },
      icon: { style: "line", strokeWidth: 2, corner: "sharp" },
      effects: { shadow: "none", motion: "none" },
    },
  },
];
