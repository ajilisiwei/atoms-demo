import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { injectStorageShim } from "@/lib/storage-shim";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

// Serves the published app document itself. The CSP `sandbox` directive gives
// the document an opaque origin (like an iframe sandbox attribute), so a
// malicious generated app cannot call Atomlet APIs with a viewer's cookies.
// localStorage throws in opaque origins, hence the injected shim.
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    include: { publishedVersion: { select: { html: true } } },
  });
  if (!project?.publishedVersion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(injectStorageShim(project.publishedVersion.html), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-modals",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
