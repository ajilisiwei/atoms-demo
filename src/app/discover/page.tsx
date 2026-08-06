import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DiscoverClient } from "@/components/DiscoverClient";

export const metadata = { title: "Discover — Atomlet" };

export default async function DiscoverPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [projects, myProjects] = await Promise.all([
    prisma.project.findMany({
      where: { publishedVersionId: { not: null }, slug: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 24,
      select: {
        id: true,
        userId: true,
        name: true,
        slug: true,
        agentId: true,
        remixCount: true,
        updatedAt: true,
        user: { select: { email: true } },
      },
    }),
    prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, favorite: true },
    }),
  ]);

  return (
    <DiscoverClient
      userEmail={user.email}
      sidebarProjects={myProjects}
      initialItems={projects.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug as string,
        agentId: p.agentId,
        remixCount: p.remixCount,
        updatedAt: p.updatedAt.toISOString(),
        author: p.user.email.split("@")[0],
        mine: p.userId === user.id,
      }))}
    />
  );
}
