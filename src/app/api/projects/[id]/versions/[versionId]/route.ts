import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { REACT_TEMPLATE } from "@/lib/templates";

export const runtime = "nodejs";

// Generous enough for a bundled React app with inlined CSS; a payload past
// this is a runaway build rather than something worth storing in a row.
const MAX_COMPILED_HTML_CHARS = 2_000_000;

type Params = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, versionId } = await params;

  const version = await prisma.appVersion.findFirst({
    where: { id: versionId, project: { id, userId } },
    select: {
      id: true,
      number: true,
      html: true,
      files: true,
      compiledHtml: true,
      promptSummary: true,
      createdAt: true,
    },
  });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });
  return NextResponse.json({ version });
}

// Stores the build artifact for a react-ts version. Bundling happens in the
// browser, so the artifact arrives here after the version row already exists;
// until it does, the raw routes serve a 404 rather than a blank document.
export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, versionId } = await params;

  const version = await prisma.appVersion.findFirst({
    where: { id: versionId, project: { id, userId } },
    select: { id: true, project: { select: { template: true } } },
  });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });
  if (version.project.template !== REACT_TEMPLATE) {
    return NextResponse.json(
      { error: "Only react-ts projects store a build artifact" },
      { status: 409 }
    );
  }

  let body: { compiledHtml?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { compiledHtml } = body;
  if (typeof compiledHtml !== "string" || compiledHtml.length === 0) {
    return NextResponse.json(
      { error: "compiledHtml must be a non-empty string" },
      { status: 400 }
    );
  }
  if (compiledHtml.length > MAX_COMPILED_HTML_CHARS) {
    return NextResponse.json(
      { error: `Build artifact exceeds the ${MAX_COMPILED_HTML_CHARS} character limit` },
      { status: 413 }
    );
  }

  await prisma.appVersion.update({ where: { id: versionId }, data: { compiledHtml } });
  return NextResponse.json({ ok: true });
}
