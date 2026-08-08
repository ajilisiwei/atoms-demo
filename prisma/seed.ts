// Seeds the built-in buddies from src/lib/agent-seed-data.ts.
//
// Insert-if-missing per id: a row that already exists is never rewritten, so
// edits made against a live database (a retagged buddy, `enabled: false` on a
// retired one) survive every deploy. Adding a buddy to AGENT_SEED is therefore
// the only way this script changes anything.
//
// Run with `npx prisma db seed` (wired up in prisma.config.ts).

import "dotenv/config";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { AGENT_SEED, type AgentSeed } from "../src/lib/agent-seed-data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function toRow(agent: AgentSeed): Prisma.AgentCreateManyInput {
  return {
    id: agent.id,
    // The seed file describes built-ins only; custom buddies are created
    // through the API and never appear here.
    kind: "builtin",
    group: agent.group,
    name: agent.name,
    tagline: agent.tagline,
    taglineZh: agent.taglineZh,
    persona: agent.persona,
    avatarUrl: agent.avatarUrl,
    // StarterPrompt[] is an interface, which TypeScript will not implicitly
    // widen to Prisma's InputJsonValue; the value is plain JSON by construction.
    starterPrompts:
      agent.starterPrompts === null
        ? Prisma.DbNull
        : (agent.starterPrompts as unknown as Prisma.InputJsonValue),
    themeHint: agent.themeHint,
    sortOrder: agent.sortOrder,
  };
}

async function main(): Promise<void> {
  const existing = await prisma.agent.findMany({
    where: { id: { in: AGENT_SEED.map((agent) => agent.id) } },
    select: { id: true },
  });
  const present = new Set(existing.map((row) => row.id));
  const missing = AGENT_SEED.filter((agent) => !present.has(agent.id));

  if (missing.length > 0) {
    // skipDuplicates guards a concurrent seed run racing the check above.
    await prisma.agent.createMany({ data: missing.map(toRow), skipDuplicates: true });
  }

  const total = await prisma.agent.count({ where: { kind: "builtin" } });
  console.log(
    `Buddies seeded: ${missing.length} inserted, ${present.size} left untouched, ${total} built-in rows total.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
