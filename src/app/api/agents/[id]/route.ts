import { NextResponse, type NextRequest } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import {
  AGENT_SELECT,
  MAX_BUDDY_NAME,
  MAX_BUDDY_SPECIALTY,
  MAX_BUDDY_TAGLINE,
  MIN_BUDDY_SPECIALTY,
  buildCustomPersona,
  extractSpecialty,
  isOwnedBlobAvatar,
  sanitizeAvatarUrl,
  sanitizeBuddyName,
  sanitizeSpecialty,
  sanitizeTagline,
  toAgentRecord,
} from "@/lib/agent-validate";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// Built-in buddies are seeded rows nobody owns, so the kind filter is what
// keeps this route from editing them.
async function findOwnedBuddy(id: string, userId: string) {
  return prisma.agent.findFirst({
    where: { id, ownerId: userId, kind: "custom" },
    select: { id: true, name: true, persona: true, avatarUrl: true },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await findOwnedBuddy(id, userId);
  if (!existing) return NextResponse.json({ error: "Buddy not found" }, { status: 404 });

  let body: {
    name?: unknown;
    specialty?: unknown;
    avatarUrl?: unknown;
    tagline?: unknown;
    taglineZh?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: {
    name?: string;
    tagline?: string;
    taglineZh?: string;
    avatarUrl?: string;
    persona?: string;
  } = {};

  if (body.name !== undefined) {
    const name = sanitizeBuddyName(body.name);
    if (!name) {
      return NextResponse.json(
        { error: `Name must be 1-${MAX_BUDDY_NAME} characters` },
        { status: 400 }
      );
    }
    data.name = name;
  }
  if (body.tagline !== undefined) {
    const tagline = sanitizeTagline(body.tagline);
    if (!tagline) {
      return NextResponse.json(
        { error: `Tagline must be 1-${MAX_BUDDY_TAGLINE} characters` },
        { status: 400 }
      );
    }
    data.tagline = tagline;
  }
  if (body.taglineZh !== undefined) {
    const taglineZh = sanitizeTagline(body.taglineZh);
    if (!taglineZh) {
      return NextResponse.json(
        { error: `Tagline must be 1-${MAX_BUDDY_TAGLINE} characters` },
        { status: 400 }
      );
    }
    data.taglineZh = taglineZh;
  }
  if (body.avatarUrl !== undefined) {
    const avatarUrl = sanitizeAvatarUrl(body.avatarUrl, userId);
    if (!avatarUrl) {
      return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
    }
    data.avatarUrl = avatarUrl;
  }

  // The persona embeds both the name and the specialty, so a change to either
  // rebuilds it from the template — a rename must not leave the buddy
  // introducing itself as its old name. The current specialty is read back out
  // of the stored persona, which is the only place it lives.
  let specialty: string | null = null;
  if (body.specialty !== undefined) {
    specialty = sanitizeSpecialty(body.specialty);
    if (!specialty) {
      return NextResponse.json(
        { error: `Specialty must be ${MIN_BUDDY_SPECIALTY}-${MAX_BUDDY_SPECIALTY} characters` },
        { status: 400 }
      );
    }
  } else if (data.name !== undefined) {
    specialty = extractSpecialty(existing.persona);
  }
  if (specialty) {
    data.persona = buildCustomPersona(data.name ?? existing.name, specialty);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const agent = await prisma.agent.update({
    where: { id },
    data,
    select: AGENT_SELECT,
  });
  return NextResponse.json({ agent: toAgentRecord(agent) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await findOwnedBuddy(id, userId);
  if (!existing) return NextResponse.json({ error: "Buddy not found" }, { status: 404 });

  // Projects built with this buddy fall back to the default builder; both
  // statements share a transaction so none is left pointing at a deleted row.
  await prisma.$transaction([
    prisma.project.updateMany({ where: { userId, agentId: id }, data: { agentId: null } }),
    prisma.agent.delete({ where: { id } }),
  ]);

  // Storage cleanup is best-effort: the buddy is already gone, and a failed
  // del() must not turn a successful delete into an error.
  if (isOwnedBlobAvatar(existing.avatarUrl, userId)) {
    try {
      await del(existing.avatarUrl);
    } catch {
      // Orphaned blob; nothing the caller can do about it.
    }
  }

  return NextResponse.json({ ok: true });
}
