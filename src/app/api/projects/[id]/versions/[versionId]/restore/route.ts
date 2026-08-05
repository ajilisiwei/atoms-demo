import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; versionId: string }> };

// Restoring never rewrites history: it copies the chosen version as a new
// latest version, so the timeline stays append-only.
export async function POST(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, versionId } = await params;

  const source = await prisma.appVersion.findFirst({
    where: { id: versionId, project: { id, userId } },
  });
  if (!source) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const latest = await prisma.appVersion.findFirst({
    where: { projectId: id },
    orderBy: { number: "desc" },
    select: { number: true, id: true },
  });
  if (latest?.id === source.id) {
    return NextResponse.json({ error: "This is already the latest version" }, { status: 400 });
  }

  const [version] = await prisma.$transaction([
    prisma.appVersion.create({
      data: {
        projectId: id,
        number: (latest?.number ?? 0) + 1,
        html: source.html,
        promptSummary: `Restored from v${source.number}`,
      },
      select: { id: true, number: true, promptSummary: true, createdAt: true },
    }),
    prisma.message.create({
      data: { projectId: id, role: "assistant", content: `Restored version v${source.number} as the latest version.` },
    }),
    prisma.project.update({ where: { id }, data: { updatedAt: new Date() } }),
  ]);
  return NextResponse.json({ version });
}
