import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { isProjectTemplate, PROJECT_TEMPLATES } from "@/lib/templates";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      publishedVersionId: true,
      updatedAt: true,
      createdAt: true,
      _count: { select: { versions: true } },
    },
  });
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; template?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — defaults are used
  }
  const name = (body.name ?? "Untitled App").trim().slice(0, 80) || "Untitled App";
  // The generation target is fixed at creation time: it decides the system
  // prompt and how versions store their output.
  const template = body.template ?? "html";
  if (!isProjectTemplate(template)) {
    return NextResponse.json(
      { error: `template must be one of: ${PROJECT_TEMPLATES.join(", ")}` },
      { status: 400 }
    );
  }

  const count = await prisma.project.count({ where: { userId } });
  if (count >= 50) {
    return NextResponse.json({ error: "Project limit reached (50)" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: { userId, name, template },
    select: { id: true, name: true, template: true, createdAt: true },
  });
  return NextResponse.json({ project }, { status: 201 });
}
