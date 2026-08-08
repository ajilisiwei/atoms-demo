import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { REACT_TEMPLATE } from "@/lib/templates";

export const runtime = "nodejs";

// Generous enough for a bundled React app with inlined CSS; a payload past
// this is a runaway build rather than something worth storing in a row.
const MAX_COMPILED_HTML_CHARS = 2_000_000;
const MAX_SOURCE_CHARS = 2_000_000;

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

// Sanitized {path: content} map or null when the shape is wrong. Rejects
// path traversal outright — a hostile path never reaches the row.
function sanitizeFiles(input: unknown): Record<string, string> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const out: Record<string, string> = {};
  let total = 0;
  for (const [rawPath, content] of Object.entries(input)) {
    if (typeof content !== "string") return null;
    const path = rawPath.replace(/\\/g, "/");
    if (path.startsWith("/") || path.split("/").includes("..") || path.length > 200) {
      return null;
    }
    total += content.length;
    if (total > MAX_SOURCE_CHARS) return null;
    out[path] = content;
  }
  return Object.keys(out).length > 0 ? out : null;
}

// Updates a version's stored content. Two callers: the browser bundler
// storing a build artifact (compiledHtml) after generation, and the cloud
// editor saving manual edits (files for react-ts, html for html projects).
// Manual edits are only accepted on the LATEST version — history is
// immutable once a newer version exists.
export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, versionId } = await params;

  const version = await prisma.appVersion.findFirst({
    where: { id: versionId, project: { id, userId } },
    select: { id: true, number: true, project: { select: { id: true, template: true } } },
  });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });
  const isReact = version.project.template === REACT_TEMPLATE;

  let body: { compiledHtml?: unknown; files?: unknown; html?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: { compiledHtml?: string; files?: Record<string, string>; html?: string } = {};

  if (body.compiledHtml !== undefined) {
    if (!isReact) {
      return NextResponse.json(
        { error: "Only react-ts projects store a build artifact" },
        { status: 409 }
      );
    }
    if (typeof body.compiledHtml !== "string" || body.compiledHtml.length === 0) {
      return NextResponse.json(
        { error: "compiledHtml must be a non-empty string" },
        { status: 400 }
      );
    }
    if (body.compiledHtml.length > MAX_COMPILED_HTML_CHARS) {
      return NextResponse.json(
        { error: `Build artifact exceeds the ${MAX_COMPILED_HTML_CHARS} character limit` },
        { status: 413 }
      );
    }
    data.compiledHtml = body.compiledHtml;
  }

  if (body.files !== undefined) {
    if (!isReact) {
      return NextResponse.json(
        { error: "Only react-ts projects store source files" },
        { status: 409 }
      );
    }
    const files = sanitizeFiles(body.files);
    if (!files) {
      return NextResponse.json({ error: "files must map safe paths to strings" }, { status: 400 });
    }
    data.files = files;
  }

  if (body.html !== undefined) {
    if (isReact) {
      return NextResponse.json(
        { error: "react-ts projects edit files, not html" },
        { status: 409 }
      );
    }
    if (typeof body.html !== "string" || body.html.length === 0 || body.html.length > MAX_SOURCE_CHARS) {
      return NextResponse.json({ error: "html must be a non-empty string" }, { status: 400 });
    }
    data.html = body.html;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Source edits (files/html) must target the newest version only.
  if (data.files !== undefined || data.html !== undefined) {
    const latest = await prisma.appVersion.findFirst({
      where: { projectId: version.project.id },
      orderBy: { number: "desc" },
      select: { id: true },
    });
    if (latest?.id !== versionId) {
      return NextResponse.json(
        { error: "Only the latest version can be edited" },
        { status: 409 }
      );
    }
  }

  await prisma.appVersion.update({ where: { id: versionId }, data });
  return NextResponse.json({ ok: true });
}
