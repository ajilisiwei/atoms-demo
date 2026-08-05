import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

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

  let body: { name?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — default name is used
  }
  const name = (body.name ?? "Untitled App").trim().slice(0, 80) || "Untitled App";

  const count = await prisma.project.count({ where: { userId } });
  if (count >= 50) {
    return NextResponse.json({ error: "Project limit reached (50)" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: { userId, name },
    select: { id: true, name: true, createdAt: true },
  });
  return NextResponse.json({ project }, { status: 201 });
}
