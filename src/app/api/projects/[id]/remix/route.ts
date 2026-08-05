import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { remixProject, RemixError } from "@/lib/remix";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const rl = checkRateLimit(`remix:${userId}`, 10, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit reached — try again in ${rl.retryAfterSeconds}s` },
      { status: 429 }
    );
  }

  try {
    const project = await remixProject(userId, id);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    if (err instanceof RemixError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`[remix] failed for source ${id}:`, err);
    return NextResponse.json({ error: "Remix failed" }, { status: 500 });
  }
}
