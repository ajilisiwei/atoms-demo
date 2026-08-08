import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { GENERATION_THEMES, getGenerationTheme } from "@/lib/themes";
import { MAX_THEME_NAME, sanitizeThemeName, sanitizeThemeTokens } from "@/lib/theme-validate";
import { CUSTOM_THEME_SELECT, MAX_CUSTOM_THEMES, themeTokensToJson } from "@/lib/custom-theme";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const custom = await prisma.customTheme.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: CUSTOM_THEME_SELECT,
  });

  return NextResponse.json({
    builtin: GENERATION_THEMES.map((theme) => ({
      id: theme.id,
      name: theme.name,
      nameZh: theme.nameZh,
    })),
    custom,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: unknown; baseTheme?: unknown; tokens?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = sanitizeThemeName(body.name);
  if (!name) {
    return NextResponse.json(
      { error: `Name must be 1-${MAX_THEME_NAME} characters` },
      { status: 400 }
    );
  }
  const tokens = sanitizeThemeTokens(body.tokens);
  if (!tokens) {
    return NextResponse.json({ error: "Invalid theme tokens" }, { status: 400 });
  }
  // Provenance only — a theme forked from a built-in remembers which one.
  let baseTheme: string | null = null;
  if (body.baseTheme !== undefined && body.baseTheme !== null && body.baseTheme !== "") {
    if (typeof body.baseTheme !== "string" || !getGenerationTheme(body.baseTheme)) {
      return NextResponse.json(
        { error: "baseTheme must be a built-in theme id" },
        { status: 400 }
      );
    }
    baseTheme = body.baseTheme;
  }

  const count = await prisma.customTheme.count({ where: { userId } });
  if (count >= MAX_CUSTOM_THEMES) {
    return NextResponse.json(
      { error: `Custom theme limit reached (${MAX_CUSTOM_THEMES})` },
      { status: 409 }
    );
  }

  const theme = await prisma.customTheme.create({
    data: { userId, name, baseTheme, tokens: themeTokensToJson(tokens) },
    select: CUSTOM_THEME_SELECT,
  });
  return NextResponse.json({ theme }, { status: 201 });
}
