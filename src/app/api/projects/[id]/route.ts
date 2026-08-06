import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function findOwnedProject(id: string, userId: string) {
  return prisma.project.findFirst({ where: { id, userId } });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      versions: {
        orderBy: { number: "desc" },
        select: { id: true, number: true, promptSummary: true, createdAt: true },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const latest = project.versions[0]
    ? await prisma.appVersion.findUnique({
        where: { id: project.versions[0].id },
        select: { id: true, html: true },
      })
    : null;

  return NextResponse.json({ project, latestHtml: latest?.html ?? null });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await findOwnedProject(id, userId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  let body: { name?: string; favorite?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: { name?: string; favorite?: boolean } = {};
  if (body.name !== undefined) {
    const name = body.name.trim().slice(0, 80);
    if (!name) return NextResponse.json({ error: "Name must not be empty" }, { status: 400 });
    data.name = name;
  }
  if (body.favorite !== undefined) {
    if (typeof body.favorite !== "boolean") {
      return NextResponse.json({ error: "favorite must be a boolean" }, { status: 400 });
    }
    data.favorite = body.favorite;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.project.update({
    where: { id },
    data,
    select: { id: true, name: true, favorite: true },
  });
  return NextResponse.json({ project: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await findOwnedProject(id, userId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
