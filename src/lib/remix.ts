import { prisma } from "./db";

export class RemixError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "RemixError";
  }
}

// Forks a PUBLISHED project into the caller's workspace: the published HTML
// becomes v1 of the new project, theme/agent carry over, and the source's
// remix counter increments. History stays append-only on both sides.
export async function remixProject(userId: string, sourceProjectId: string) {
  const source = await prisma.project.findUnique({
    where: { id: sourceProjectId },
    include: {
      publishedVersion: { select: { html: true, number: true } },
      user: { select: { email: true } },
    },
  });
  if (!source?.publishedVersion || !source.slug) {
    throw new RemixError("This app is not published", 404);
  }

  const projectCount = await prisma.user
    .findUnique({ where: { id: userId }, select: { _count: { select: { projects: true } } } })
    .then((u) => u?._count.projects ?? 0);
  if (projectCount >= 50) {
    throw new RemixError("Project limit reached (50)", 400);
  }

  const name = `${source.name.slice(0, 66)} (Remix)`;
  const authorHandle = source.user.email.split("@")[0];

  const [project] = await prisma.$transaction([
    prisma.project.create({
      data: {
        userId,
        name,
        themeName: source.themeName,
        agentId: source.agentId,
        remixedFromId: source.id,
        versions: {
          create: {
            number: 1,
            html: source.publishedVersion.html,
            promptSummary: `Remixed from “${source.name.slice(0, 80)}”`,
          },
        },
        messages: {
          create: {
            role: "assistant",
            content: `Remixed from “${source.name}” by ${authorHandle}. Describe a change to make it yours.`,
          },
        },
      },
      select: { id: true },
    }),
    prisma.project.update({
      where: { id: source.id },
      data: { remixCount: { increment: 1 } },
    }),
  ]);

  return project;
}
