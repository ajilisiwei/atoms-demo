import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { name: true, publishedVersionId: true },
  });
  return {
    title: project?.publishedVersionId ? `${project.name} — Atomlet` : "Not found — Atomlet",
  };
}

export default async function PublishedAppPage({ params }: Props) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { name: true, publishedVersionId: true },
  });
  if (!project?.publishedVersionId) notFound();

  return (
    <div className="fixed inset-0">
      <iframe
        src={`/p/${slug}/raw`}
        title={project.name}
        className="h-full w-full border-0 bg-white"
      />
      <Link
        href="/"
        className="absolute bottom-3 right-3 rounded-full bg-black/80 border border-line px-3 py-1.5 text-xs text-white/90 hover:text-white backdrop-blur transition-colors"
      >
        ⚡ Built with <span className="text-gradient font-semibold">Atomlet</span>
      </Link>
    </div>
  );
}
