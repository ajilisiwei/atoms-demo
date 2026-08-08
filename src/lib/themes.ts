// Generation themes — the design constraints applied to generated apps,
// mirroring Atoms' theme picker. Selecting one injects its tokens into the
// build agent's system prompt so every generation follows the palette.
// Tokens live in ./theme-tokens; the prompt is rendered from them in
// ./theme-prompt — there is no hand-written style copy anymore.

import { renderThemePrompt } from "./theme-prompt";
import { BUILTIN_THEME_TOKENS, type ThemeDefinition } from "./theme-tokens";

// A theme as the picker consumes it: the definition plus the four swatches
// shown as preview dots, left to right.
export type GenerationTheme = ThemeDefinition & {
  preview: readonly [string, string, string, string];
};

function withPreview(def: ThemeDefinition): GenerationTheme {
  const { background, foreground, primary, accent } = def.tokens.color;
  return { ...def, preview: [background, foreground, primary, accent] };
}

export const GENERATION_THEMES: GenerationTheme[] = BUILTIN_THEME_TOKENS.map(withPreview);

export function getGenerationTheme(id: string | null | undefined): GenerationTheme | null {
  if (!id) return null;
  return GENERATION_THEMES.find((t) => t.id === id) ?? null;
}

// Accepts any ThemeDefinition so studio-authored themes render the same way.
export function themePromptBlock(theme: ThemeDefinition): string {
  return renderThemePrompt(theme);
}
