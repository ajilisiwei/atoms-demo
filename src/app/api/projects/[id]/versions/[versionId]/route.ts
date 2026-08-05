import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, versionId } = await params;

  const version = await prisma.appVersion.findFirst({
    where: { id: versionId, project: { id, userId } },
    select: { id: true, number: true, html: true, promptSummary: true, createdAt: true },
  });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });
  return NextResponse.json({ version });
}
