import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardClient } from "@/components/DashboardClient";

export const metadata = { title: "Dashboard — Atomlet" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      publishedVersionId: true,
      updatedAt: true,
      _count: { select: { versions: true } },
    },
  });

  return (
    <DashboardClient
      userEmail={user.email}
      initialProjects={projects.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        published: Boolean(p.publishedVersionId),
        versionCount: p._count.versions,
        updatedAt: p.updatedAt.toISOString(),
      }))}
    />
  );
}
