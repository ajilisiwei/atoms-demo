import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import {
  AGENT_SELECT,
  MAX_BUDDY_NAME,
  MAX_BUDDY_SPECIALTY,
  MAX_BUDDY_TAGLINE,
  MAX_CUSTOM_AGENTS,
  MIN_BUDDY_SPECIALTY,
  buildCustomPersona,
  deriveTagline,
  sanitizeAvatarUrl,
  sanitizeBuddyName,
  sanitizeSpecialty,
  sanitizeTagline,
  toAgentRecord,
} from "@/lib/agent-validate";

export const runtime = "nodejs";

// Creating a custom buddy. This lives beside the agent listing rather than in
// it so the two can be edited independently; POST /api/agents/create.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const name = sanitizeBuddyName(body.name);
  if (!name) {
    return NextResponse.json(
      { error: `Name must be 1-${MAX_BUDDY_NAME} characters` },
      { status: 400 }
    );
  }
  const specialty = sanitizeSpecialty(body.specialty);
  if (!specialty) {
    return NextResponse.json(
      { error: `Specialty must be ${MIN_BUDDY_SPECIALTY}-${MAX_BUDDY_SPECIALTY} characters` },
      { status: 400 }
    );
  }
  const avatarUrl = sanitizeAvatarUrl(body.avatarUrl, userId);
  if (!avatarUrl) {
    return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
  }

  // Both taglines fall back to the opening words of the specialty; an explicit
  // one still has to pass validation.
  const fallback = deriveTagline(specialty);
  const tagline = body.tagline === undefined ? fallback : sanitizeTagline(body.tagline);
  const taglineZh = body.taglineZh === undefined ? fallback : sanitizeTagline(body.taglineZh);
  if (!tagline || !taglineZh) {
    return NextResponse.json(
      { error: `Tagline must be 1-${MAX_BUDDY_TAGLINE} characters` },
      { status: 400 }
    );
  }

  const count = await prisma.agent.count({ where: { ownerId: userId, kind: "custom" } });
  if (count >= MAX_CUSTOM_AGENTS) {
    return NextResponse.json(
      { error: `Custom buddy limit reached (${MAX_CUSTOM_AGENTS})` },
      { status: 409 }
    );
  }

  const agent = await prisma.agent.create({
    data: {
      // id comes from the schema's cuid() default; built-ins override it with
      // their slug id when seeded.
      kind: "custom",
      group: "custom",
      ownerId: userId,
      name,
      tagline,
      taglineZh,
      persona: buildCustomPersona(name, specialty),
      avatarUrl,
    },
    select: AGENT_SELECT,
  });
  return NextResponse.json({ agent: toAgentRecord(agent) }, { status: 201 });
}
