import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { injectStorageShim } from "@/lib/storage-shim";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; versionId: string }> };

// Owner-only preview document for the builder. Same isolation model as the
// public /p/[slug]/raw route: the CSP sandbox gives the generated app an
// opaque origin, so even the owner's own preview cannot call Atomlet APIs
// with the owner's session (LLM output is untrusted — indirect prompt
// injection could smuggle exfiltration code into a generated app).
export async function GET(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, versionId } = await params;

  const version = await prisma.appVersion.findFirst({
    where: { id: versionId, project: { id, userId } },
    select: { html: true },
  });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  return new Response(injectStorageShim(version.html), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-modals",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
