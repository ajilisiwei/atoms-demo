import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { generateSlug } from "@/lib/slug";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: { versions: { orderBy: { number: "desc" }, take: 1, select: { id: true } } },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  let body: { versionId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // no body — publish the latest version
  }

  const versionId = body.versionId ?? project.versions[0]?.id;
  if (!versionId) {
    return NextResponse.json({ error: "Nothing to publish yet — generate the app first" }, { status: 400 });
  }
  const version = await prisma.appVersion.findFirst({ where: { id: versionId, projectId: id } });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  // Slug is minted once and stays stable across re-publishes.
  let slug = project.slug;
  if (!slug) {
    for (let attempt = 0; attempt < 3 && !slug; attempt++) {
      const candidate = generateSlug();
      const clash = await prisma.project.findUnique({ where: { slug: candidate } });
      if (!clash) slug = candidate;
    }
    if (!slug) return NextResponse.json({ error: "Could not allocate a URL, try again" }, { status: 500 });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { slug, publishedVersionId: version.id },
    select: { id: true, slug: true, publishedVersionId: true },
  });
  return NextResponse.json({ project: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const updated = await prisma.project.update({
    where: { id },
    data: { publishedVersionId: null },
    select: { id: true, slug: true, publishedVersionId: true },
  });
  return NextResponse.json({ project: updated });
}
