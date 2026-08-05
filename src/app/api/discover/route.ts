import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

// Gallery data: every published project across all users, newest first.
// Only publicly visible fields are exposed (the published page is already
// world-readable at /p/[slug]).
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { publishedVersionId: { not: null }, slug: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: 24,
    select: {
      id: true,
      userId: true,
      name: true,
      slug: true,
      themeName: true,
      agentId: true,
      remixCount: true,
      updatedAt: true,
      user: { select: { email: true } },
    },
  });

  return NextResponse.json({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      themeName: p.themeName,
      agentId: p.agentId,
      remixCount: p.remixCount,
      updatedAt: p.updatedAt.toISOString(),
      author: p.user.email.split("@")[0],
      mine: p.userId === userId,
    })),
  });
}
