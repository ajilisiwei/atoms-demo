import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { injectStorageShim } from "@/lib/storage-shim";
import { resolveVersionDocument } from "@/lib/templates";

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
    include: { publishedVersion: { select: { html: true, compiledHtml: true } } },
  });
  if (!project?.publishedVersion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // react-ts apps live in their build artifact, not the html column. A version
  // published before its build landed has neither, so it 404s instead of
  // serving a blank page that looks like a broken app.
  const document = resolveVersionDocument({
    template: project.template,
    html: project.publishedVersion.html,
    compiledHtml: project.publishedVersion.compiledHtml,
  });
  if (document === null) {
    return NextResponse.json({ error: "This app has not been built yet" }, { status: 404 });
  }

  // Public published content, so browser/CDN caching is safe. Embedders pass
  // ?v=<updatedAt> so a republish mints a fresh URL and bypasses the cache;
  // the bare URL may serve up to max-age of staleness, which is acceptable.
  return new Response(injectStorageShim(document), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-modals",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      "X-Robots-Tag": "noindex",
    },
  });
}
