import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Builder } from "@/components/builder/Builder";

export const metadata = { title: "Builder — Atomlet" };

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const userId = user.id;
  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      versions: {
        orderBy: { number: "desc" },
        select: { id: true, number: true, promptSummary: true, createdAt: true },
      },
    },
  });
  if (!project) notFound();

  const latestId = project.versions[0]?.id;
  const latest = latestId
    ? await prisma.appVersion.findUnique({
        where: { id: latestId },
        select: { html: true },
      })
    : null;

  return (
    <Builder
      initialCredits={user.credits}
      initialProject={{
        id: project.id,
        name: project.name,
        slug: project.slug,
        publishedVersionId: project.publishedVersionId,
        themeName: project.themeName,
        agentId: project.agentId,
      }}
      initialMessages={project.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        planSteps: Array.isArray(m.planSteps) ? (m.planSteps as string[]) : null,
        suggestions: Array.isArray(m.suggestions) ? (m.suggestions as string[]) : null,
      }))}
      initialVersions={project.versions.map((v) => ({
        id: v.id,
        number: v.number,
        promptSummary: v.promptSummary,
        createdAt: v.createdAt.toISOString(),
      }))}
      initialHtml={latest?.html ?? null}
    />
  );
}
