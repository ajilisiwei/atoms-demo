import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { MAX_THEME_NAME, sanitizeThemeName, sanitizeThemeTokens } from "@/lib/theme-validate";
import { CUSTOM_THEME_SELECT, customThemeName, themeTokensToJson } from "@/lib/custom-theme";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function findOwnedTheme(id: string, userId: string) {
  return prisma.customTheme.findFirst({ where: { id, userId }, select: { id: true } });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await findOwnedTheme(id, userId);
  if (!existing) return NextResponse.json({ error: "Theme not found" }, { status: 404 });

  let body: { name?: unknown; tokens?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: { name?: string; tokens?: Prisma.InputJsonValue } = {};
  if (body.name !== undefined) {
    const name = sanitizeThemeName(body.name);
    if (!name) {
      return NextResponse.json(
        { error: `Name must be 1-${MAX_THEME_NAME} characters` },
        { status: 400 }
      );
    }
    data.name = name;
  }
  if (body.tokens !== undefined) {
    const tokens = sanitizeThemeTokens(body.tokens);
    if (!tokens) {
      return NextResponse.json({ error: "Invalid theme tokens" }, { status: 400 });
    }
    data.tokens = themeTokensToJson(tokens);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const theme = await prisma.customTheme.update({
    where: { id },
    data,
    select: CUSTOM_THEME_SELECT,
  });
  return NextResponse.json({ theme });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await findOwnedTheme(id, userId);
  if (!existing) return NextResponse.json({ error: "Theme not found" }, { status: 404 });

  // Projects pointing at the deleted theme fall back to "no theme"; both
  // statements share a transaction so none is left with a dangling reference.
  await prisma.$transaction([
    prisma.project.updateMany({
      where: { userId, themeName: customThemeName(id) },
      data: { themeName: null },
    }),
    prisma.customTheme.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
