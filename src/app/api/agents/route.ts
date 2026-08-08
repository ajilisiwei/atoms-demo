import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { listAgentsForUser } from "@/lib/agents-server";

export const runtime = "nodejs";

// The buddy list every picker reads: enabled built-ins followed by the caller's
// own buddies. Writes live in sibling routes (create/, [id]/, avatar/) so this
// file stays the read path and the two can be edited independently.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agents = await listAgentsForUser(userId);
  return NextResponse.json({ agents });
}
