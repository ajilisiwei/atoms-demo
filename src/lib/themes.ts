// Generation themes — the design constraints applied to generated apps,
// mirroring Atoms' theme picker. Selecting one injects its tokens into the
// build agent's system prompt so every generation follows the palette.

export interface GenerationTheme {
  id: string;
  name: string;
  // Four swatches shown as preview dots in the picker, left to right.
  preview: [string, string, string, string];
  tokens: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    accent: string;
    border: string;
  };
  font: { sans: string; heading?: string };
  radius: string;
  style: string;
}

export const GENERATION_THEMES: GenerationTheme[] = [
  {
    id: "zen-garden",
    name: "Zen Garden",
    preview: ["#F7F6F3", "#1C1C1A", "#A8A29E", "#57534E"],
    tokens: {
      background: "#F7F6F3",
      foreground: "#1C1C1A",
      card: "#FFFFFF",
      cardForeground: "#1C1C1A",
      primary: "#1C1C1A",
      primaryForeground: "#FAFAF9",
      secondary: "#E7E5E4",
      accent: "#57534E",
      border: "#E7E5E4",
    },
    font: { sans: "'Inter', 'Helvetica Neue', sans-serif" },
    radius: "0.75rem",
    style: "Calm, minimal, monochrome warm-gray. Generous whitespace, subtle borders, no loud colors.",
  },
  {
    id: "terracotta",
    name: "Terracotta",
    preview: ["#FBF3EC", "#9A3B26", "#D97706", "#44322D"],
    tokens: {
      background: "#FBF3EC",
      foreground: "#44322D",
      card: "#FFFBF7",
      cardForeground: "#44322D",
      primary: "#9A3B26",
      primaryForeground: "#FFF7ED",
      secondary: "#F3E3D3",
      accent: "#D97706",
      border: "#EAD9C9",
    },
    font: { sans: "'Georgia', 'Songti SC', serif", heading: "'Georgia', serif" },
    radius: "1rem",
    style: "Warm Mediterranean clay and amber. Earthy, cozy, artisanal feel with serif headings.",
  },
  {
    id: "paper-ink",
    name: "Paper & Ink",
    preview: ["#FFFFFF", "#111111", "#6B7280", "#D1D5DB"],
    tokens: {
      background: "#FFFFFF",
      foreground: "#111111",
      card: "#FAFAFA",
      cardForeground: "#111111",
      primary: "#111111",
      primaryForeground: "#FFFFFF",
      secondary: "#F3F4F6",
      accent: "#6B7280",
      border: "#E5E7EB",
    },
    font: { sans: "-apple-system, 'PingFang SC', sans-serif" },
    radius: "0.375rem",
    style: "Notion-like document minimalism: black on white, hairline dividers, quiet grays, content first.",
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    preview: ["#F0F9FF", "#0C4A6E", "#0EA5E9", "#38BDF8"],
    tokens: {
      background: "#F0F9FF",
      foreground: "#0C4A6E",
      card: "#FFFFFF",
      cardForeground: "#0C4A6E",
      primary: "#0284C7",
      primaryForeground: "#F0F9FF",
      secondary: "#E0F2FE",
      accent: "#38BDF8",
      border: "#BAE6FD",
    },
    font: { sans: "'Inter', 'PingFang SC', sans-serif" },
    radius: "1rem",
    style: "Fresh coastal blues, airy and light. Soft sky gradients welcome, rounded friendly shapes.",
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    preview: ["#FFFBEB", "#92400E", "#F59E0B", "#FCD34D"],
    tokens: {
      background: "#FFFBEB",
      foreground: "#451A03",
      card: "#FFFDF5",
      cardForeground: "#451A03",
      primary: "#B45309",
      primaryForeground: "#FFFBEB",
      secondary: "#FEF3C7",
      accent: "#F59E0B",
      border: "#FDE68A",
    },
    font: { sans: "'Inter', 'PingFang SC', sans-serif" },
    radius: "0.75rem",
    style: "Sunset warmth: honey, amber and gold. Optimistic, glowing accents, soft shadows.",
  },
  {
    id: "forest-moss",
    name: "Forest & Moss",
    preview: ["#F3F6F1", "#1E3A2B", "#4D7C0F", "#84CC16"],
    tokens: {
      background: "#F3F6F1",
      foreground: "#1E3A2B",
      card: "#FBFDF9",
      cardForeground: "#1E3A2B",
      primary: "#2F5233",
      primaryForeground: "#F3F6F1",
      secondary: "#E4EDE0",
      accent: "#4D7C0F",
      border: "#D6E3CF",
    },
    font: { sans: "'Inter', 'PingFang SC', sans-serif" },
    radius: "0.75rem",
    style: "Nordic forest: moss green, stone gray, natural and grounded. Organic, unhurried.",
  },
  {
    id: "neon-night",
    name: "Neon Night",
    preview: ["#0A0A0F", "#E4E4E7", "#8B5CF6", "#22D3EE"],
    tokens: {
      background: "#0A0A0F",
      foreground: "#E4E4E7",
      card: "#15151C",
      cardForeground: "#E4E4E7",
      primary: "#8B5CF6",
      primaryForeground: "#FAFAFA",
      secondary: "#1E1E28",
      accent: "#22D3EE",
      border: "#27272E",
    },
    font: { sans: "'Inter', 'PingFang SC', sans-serif", heading: "'Space Grotesk', sans-serif" },
    radius: "1rem",
    style: "Dark cyber aesthetic: deep black, violet and cyan neon glows, high contrast, futuristic.",
  },
  {
    id: "swiss-grid",
    name: "Swiss Grid",
    preview: ["#FFFFFF", "#0F0F0F", "#EF4444", "#2563EB"],
    tokens: {
      background: "#FFFFFF",
      foreground: "#0F0F0F",
      card: "#FFFFFF",
      cardForeground: "#0F0F0F",
      primary: "#0F0F0F",
      primaryForeground: "#FFFFFF",
      secondary: "#F4F4F5",
      accent: "#EF4444",
      border: "#0F0F0F",
    },
    font: { sans: "'Helvetica Neue', 'Inter', sans-serif" },
    radius: "0",
    style: "Swiss International Style: strict grid, sharp corners, black rules, bold red/blue accents, typographic hierarchy.",
  },
];

export function getGenerationTheme(id: string | null | undefined): GenerationTheme | null {
  if (!id) return null;
  return GENERATION_THEMES.find((t) => t.id === id) ?? null;
}

export function themePromptBlock(theme: GenerationTheme): string {
  const { tokens, font, radius, style } = theme;
  return `## Design theme: "${theme.name}" (MUST follow)

Style direction: ${style}
Apply these design tokens consistently across the whole app:
- Page background ${tokens.background}, main text ${tokens.foreground}
- Cards/surfaces ${tokens.card} with text ${tokens.cardForeground}, borders ${tokens.border}
- Primary buttons/actions ${tokens.primary} with text ${tokens.primaryForeground}
- Secondary surfaces ${tokens.secondary}, highlight/accent color ${tokens.accent}
- Border radius ${radius}; font-family ${font.sans}${font.heading ? `; headings ${font.heading}` : ""}
Do not invent a different palette — derive hover/active shades from these colors.`;
}
