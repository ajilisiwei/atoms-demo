import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { buildGenerationMessages, getLlmClient, LLM_MODEL, type HistoryEntry } from "@/lib/llm";
import { GenerationParser } from "@/lib/stream-parser";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 300;

const encoder = new TextEncoder();

function sse(event: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

const MAX_PROMPT_LENGTH = 4000;
const HISTORY_TURNS = 12;
const GENERATIONS_PER_WINDOW = 8;
const WINDOW_MS = 10 * 60 * 1000;

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: projectId } = await params;

  const rl = checkRateLimit(`chat:${userId}`, GENERATIONS_PER_WINDOW, WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit reached — try again in ${rl.retryAfterSeconds}s` },
      { status: 429 }
    );
  }

  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const prompt = body.prompt?.trim() ?? "";
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Prompt must be 1-${MAX_PROMPT_LENGTH} characters` },
      { status: 400 }
    );
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: HISTORY_TURNS },
      versions: { orderBy: { number: "desc" }, take: 1 },
    },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const history: HistoryEntry[] = project.messages
    .slice()
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const latestVersion = project.versions[0] ?? null;
  const messages = buildGenerationMessages({
    history,
    currentHtml: latestVersion?.html ?? null,
    prompt,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const parser = new GenerationParser();
      const planSteps: string[] = [];
      try {
        const completion = await getLlmClient().chat.completions.create({
          model: LLM_MODEL,
          messages,
          stream: true,
          max_tokens: 16000,
          temperature: 0.6,
          // DeepSeek extension: disable reasoning for fast, direct output
          ...({ thinking: { type: "disabled" } } as object),
        });

        for await (const part of completion) {
          const delta = part.choices[0]?.delta?.content ?? "";
          if (!delta) continue;
          for (const ev of parser.push(delta)) {
            if (ev.type === "plan_step") planSteps.push(ev.text);
            controller.enqueue(sse(ev));
          }
        }
        for (const ev of parser.finish()) {
          if (ev.type === "plan_step") planSteps.push(ev.text);
          controller.enqueue(sse(ev));
        }

        if (!parser.looksLikeValidHtml()) {
          throw new Error("The model did not return a valid HTML document — please try again");
        }

        const summary = parser.summary || "Updated the app.";
        const nextNumber = (latestVersion?.number ?? 0) + 1;
        const [, , version] = await prisma.$transaction([
          prisma.message.create({
            data: { projectId, role: "user", content: prompt },
          }),
          prisma.message.create({
            data: { projectId, role: "assistant", content: summary, planSteps },
          }),
          prisma.appVersion.create({
            data: { projectId, number: nextNumber, html: parser.html, promptSummary: prompt.slice(0, 200) },
            select: { id: true, number: true, createdAt: true },
          }),
          prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } }),
        ]);

        controller.enqueue(sse({ type: "done", version, summary, planSteps }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Generation failed";
        console.error(`[chat] generation failed for project ${projectId}:`, err);
        controller.enqueue(sse({ type: "error", message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
