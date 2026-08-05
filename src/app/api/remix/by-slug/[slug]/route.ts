import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { remixProject, RemixError } from "@/lib/remix";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

// Remix entry point for the public /p/[slug] page — resolves the slug first.
// 401 tells the (possibly anonymous) viewer to sign in.
export async function POST(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;

  const rl = checkRateLimit(`remix:${userId}`, 10, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit reached — try again in ${rl.retryAfterSeconds}s` },
      { status: 429 }
    );
  }

  const source = await prisma.project.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const project = await remixProject(userId, source.id);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    if (err instanceof RemixError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`[remix] failed for slug ${slug}:`, err);
    return NextResponse.json({ error: "Remix failed" }, { status: 500 });
  }
}
