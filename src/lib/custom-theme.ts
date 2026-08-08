// Server-side glue for user-authored themes: the "custom:<id>" naming that
// Project.themeName uses for them, and the adapter from a stored row to the
// shared ThemeDefinition the prompt renderer consumes.

import type { Prisma } from "@/generated/prisma/client";
import type { ThemeDefinition, ThemeTokens } from "./theme-tokens";
import { sanitizeThemeTokens } from "./theme-validate";

export const CUSTOM_THEME_PREFIX = "custom:";
export const MAX_CUSTOM_THEMES = 20;

// Shared by every endpoint that returns a theme, so the client sees one shape.
export const CUSTOM_THEME_SELECT = {
  id: true,
  name: true,
  baseTheme: true,
  tokens: true,
  updatedAt: true,
} as const;

export function customThemeName(id: string): string {
  return `${CUSTOM_THEME_PREFIX}${id}`;
}

// Project.themeName holds "custom:<id>" for user themes and a bare built-in id
// otherwise. Returns the row id, or null when the value is not a custom ref.
export function parseCustomThemeName(themeName: string | null | undefined): string | null {
  if (!themeName || !themeName.startsWith(CUSTOM_THEME_PREFIX)) return null;
  return themeName.slice(CUSTOM_THEME_PREFIX.length) || null;
}

export interface StoredCustomTheme {
  id: string;
  name: string;
  tokens: unknown;
}

// Stored tokens are re-validated on read: a row written before the contract
// tightened would otherwise reach the prompt renderer malformed.
export function toThemeDefinition(row: StoredCustomTheme): ThemeDefinition | null {
  const tokens = sanitizeThemeTokens(row.tokens);
  if (!tokens) return null;
  return { id: customThemeName(row.id), name: row.name, nameZh: row.name, tokens };
}

// ThemeTokens is an interface, which TypeScript will not implicitly widen to
// Prisma's InputJsonValue; the value is plain JSON by construction.
export function themeTokensToJson(tokens: ThemeTokens): Prisma.InputJsonValue {
  return tokens as unknown as Prisma.InputJsonValue;
}
