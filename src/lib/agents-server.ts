// Server-side buddy lookups. Kept out of ./agents so client components can
// import the shared helpers without pulling Prisma into the browser bundle.

import { prisma } from "./db";
import type { AgentRecord } from "./agent-types";
import { AGENT_SELECT, toAgentRecord } from "./agent-validate";

// What the picker renders: enabled built-ins in their curated order, then the
// caller's own buddies, newest first.
export async function listAgentsForUser(userId: string): Promise<AgentRecord[]> {
  const [builtins, customs] = await Promise.all([
    prisma.agent.findMany({
      where: { kind: "builtin", enabled: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: AGENT_SELECT,
    }),
    prisma.agent.findMany({
      where: { kind: "custom", ownerId: userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: AGENT_SELECT,
    }),
  ]);
  return [...builtins, ...customs].map(toAgentRecord);
}

// A buddy this user is allowed to build with: an enabled built-in, or a custom
// one they own. Anything else — a retired built-in, someone else's buddy, an id
// that no longer exists — resolves to null so the caller can decide whether
// that is an error (an explicit request) or something to drop (an inherited id).
export async function loadAgentForUser(
  id: string | null | undefined,
  userId: string
): Promise<AgentRecord | null> {
  if (!id) return null;
  const row = await prisma.agent.findFirst({
    where: {
      id,
      OR: [
        { kind: "builtin", enabled: true },
        { kind: "custom", ownerId: userId },
      ],
    },
    select: AGENT_SELECT,
  });
  return row ? toAgentRecord(row) : null;
}
