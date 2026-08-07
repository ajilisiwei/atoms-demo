import { NextRequest, NextResponse } from "next/server";
import type OpenAI from "openai";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { buildGenerationMessages, getLlmClient, LLM_MODEL, type HistoryEntry } from "@/lib/llm";
import { GenerationParser, type GenEvent } from "@/lib/stream-parser";
import { checkRateLimit } from "@/lib/ratelimit";
import { getGenerationTheme, themePromptBlock, type GenerationTheme } from "@/lib/themes";
import { getBuiltinAgent, agentPromptBlock, type BuiltinAgent } from "@/lib/agents";
import {
  INITIAL_REACT_FILES,
  REACT_SYSTEM_PROMPT,
  formatFilesContext,
  reactThemeNote,
} from "@/lib/react-template";

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
// 1 credit per 1K LLM tokens, minimum 1 per generation
const TOKENS_PER_CREDIT = 1000;
const REACT_TEMPLATE = "react-ts";

type Params = { params: Promise<{ id: string }> };

type FileMap = Record<string, string>;

// AppVersion.files is untyped JSON; keep only the string entries.
function toFileMap(stored: unknown): FileMap {
  if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return {};
  return Object.fromEntries(
    Object.entries(stored).filter(([, content]) => typeof content === "string")
  ) as FileMap;
}

// Falls back to the starter project so the model always edits something real.
function currentSnapshot(stored: unknown): FileMap {
  const files = toFileMap(stored);
  return Object.keys(files).length > 0 ? files : INITIAL_REACT_FILES;
}

// The model emits only the files it touched, so a version's snapshot is the
// previous one patched with those files and minus the deleted paths.
function mergeFiles(previous: FileMap, changed: FileMap, deleted: readonly string[]): FileMap {
  const dropped = new Set(deleted);
  return Object.fromEntries(
    Object.entries({ ...previous, ...changed }).filter(([path]) => !dropped.has(path))
  );
}

// Mirrors buildGenerationMessages (see @/lib/llm) for the react-ts template,
// where the system prompt and the current-code context differ.
function buildReactMessages(params: {
  history: HistoryEntry[];
  files: FileMap;
  prompt: string;
  theme?: GenerationTheme | null;
  agent?: BuiltinAgent | null;
}): OpenAI.ChatCompletionMessageParam[] {
  const { history, files, prompt, theme, agent } = params;
  const systemContent = [
    REACT_SYSTEM_PROMPT,
    agent ? agentPromptBlock(agent) : null,
    theme ? reactThemeNote(themePromptBlock(theme)) : null,
  ]
    .filter(Boolean)
    .join("\n\n");
  const context = formatFilesContext(files);
  return [
    { role: "system", content: systemContent },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    {
      role: "user",
      content: context ? `${context}\n\nUSER REQUEST: ${prompt}` : `USER REQUEST: ${prompt}`,
    },
  ];
}

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

  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (account.credits <= 0) {
    return NextResponse.json(
      {
        error:
          "You're out of credits, so generation is paused. 1 credit covers ~1K tokens; check Settings → Credits for your usage.",
      },
      { status: 402 }
    );
  }

  let body: { prompt?: string; themeName?: string | null; agentId?: string | null };
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
  // themeName/agentId semantics: undefined = keep project's; "" = clear; id = set.
  const requestedTheme = body.themeName;
  if (typeof requestedTheme === "string" && requestedTheme !== "" && !getGenerationTheme(requestedTheme)) {
    return NextResponse.json({ error: "Unknown theme" }, { status: 400 });
  }
  const requestedAgent = body.agentId;
  if (typeof requestedAgent === "string" && requestedAgent !== "" && !getBuiltinAgent(requestedAgent)) {
    return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      messages: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: HISTORY_TURNS,
      },
      versions: {
        orderBy: { number: "desc" },
        take: 1,
        // compiledHtml can be large and is never part of the prompt.
        select: { number: true, html: true, files: true },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const history: HistoryEntry[] = project.messages
    .slice()
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const latestVersion = project.versions[0] ?? null;
  const effectiveThemeName =
    requestedTheme === undefined ? project.themeName : requestedTheme || null;
  const theme = getGenerationTheme(effectiveThemeName);
  const effectiveAgentId =
    requestedAgent === undefined ? project.agentId : requestedAgent || null;
  const agent = getBuiltinAgent(effectiveAgentId);
  const isReact = project.template === REACT_TEMPLATE;
  const previousFiles = isReact ? currentSnapshot(latestVersion?.files) : {};
  const messages = isReact
    ? buildReactMessages({ history, files: previousFiles, prompt, theme, agent })
    : buildGenerationMessages({
        history,
        currentHtml: latestVersion?.html ?? null,
        prompt,
        theme,
        agent,
      });

  // Aborts the upstream LLM call when the client disconnects (stream cancel
  // or request abort) so tokens are not wasted on an audience of zero.
  const llmAbort = new AbortController();
  const onReqAbort = () => llmAbort.abort();
  req.signal.addEventListener("abort", onReqAbort);
  let clientGone = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (event: unknown): void => {
        if (clientGone) return;
        try {
          controller.enqueue(sse(event));
        } catch {
          clientGone = true;
          llmAbort.abort();
        }
      };

      const parser = new GenerationParser();
      const planSteps: string[] = [];
      let usageTotalTokens: number | null = null;

      const forward = (ev: GenEvent): void => {
        switch (ev.type) {
          case "plan_step":
            planSteps.push(ev.text);
            safeEnqueue(ev);
            break;
          // File content streams to the client like html_delta always has,
          // so the code view can render files as they are written.
          case "file_start":
            safeEnqueue({ type: "file_start", path: ev.path });
            break;
          case "file_delta":
            safeEnqueue({ type: "file_delta", path: ev.path, delta: ev.delta });
            break;
          case "file_end":
            safeEnqueue({ type: "file_end", path: ev.path, bytes: ev.bytes });
            break;
          case "file_delete":
            // Deletions are reported once, in the final "done" payload.
            break;
          default:
            safeEnqueue(ev);
        }
      };

      try {
        const completion = await getLlmClient().chat.completions.create(
          {
            model: LLM_MODEL,
            messages,
            stream: true,
            stream_options: { include_usage: true },
            max_tokens: 16000,
            temperature: 0.6,
            // DeepSeek extension: disable reasoning for fast, direct output
            ...({ thinking: { type: "disabled" } } as object),
          },
          { signal: llmAbort.signal }
        );

        for await (const part of completion) {
          if (part.usage?.total_tokens) usageTotalTokens = part.usage.total_tokens;
          const delta = part.choices[0]?.delta?.content ?? "";
          if (!delta) continue;
          for (const ev of parser.push(delta)) forward(ev);
        }
        for (const ev of parser.finish()) forward(ev);

        // A react-ts turn may legitimately change nothing (e.g. "the app
        // already does that") — treat it as a conversational reply: persist
        // the exchange and charge the tokens, but create no version.
        const noChangeTurn = isReact && !parser.hasFileChanges();
        if (isReact) {
          if (noChangeTurn && !parser.summary) {
            throw new Error("The model did not return any project files — please try again");
          }
        } else if (!parser.looksLikeValidHtml()) {
          throw new Error("The model did not return a valid HTML document — please try again");
        }

        // Persist even if the client disconnected after generation finished —
        // the tokens are spent and the work is worth keeping. Timestamps are
        // set explicitly with a 1ms offset: Postgres CURRENT_TIMESTAMP is
        // frozen within a transaction, which would otherwise make the
        // user/assistant pair unorderable.
        const summary = parser.summary || "Updated the app.";
        const suggestions = parser.suggestions;
        const nextNumber = (latestVersion?.number ?? 0) + 1;
        const now = Date.now();
        // react-ts versions store the full snapshot; the model only sent the
        // files it touched, so patch them over the previous version.
        const changedFiles = parser.changedFiles();
        const deletedPaths = parser.deletedPaths();
        const nextFiles = isReact
          ? mergeFiles(previousFiles, changedFiles, deletedPaths)
          : undefined;
        // Fall back to a character-based estimate when the stream carried no
        // usage frame (≈3 chars per token across mixed CJK/latin output).
        const promptChars = messages.reduce(
          (sum, m) => sum + (typeof m.content === "string" ? m.content.length : 0),
          0
        );
        const generatedChars = isReact
          ? Object.values(changedFiles).reduce((sum, content) => sum + content.length, 0)
          : parser.html.length;
        const totalTokens = usageTotalTokens ?? Math.ceil((promptChars + generatedChars) / 3);
        const creditsSpent = Math.max(1, Math.ceil(totalTokens / TOKENS_PER_CREDIT));

        if (noChangeTurn) {
          const [, , noChangeUser] = await prisma.$transaction([
            prisma.message.create({
              data: { projectId, role: "user", content: prompt, createdAt: new Date(now) },
            }),
            prisma.message.create({
              data: {
                projectId,
                role: "assistant",
                content: summary,
                planSteps,
                suggestions,
                createdAt: new Date(now + 1),
              },
            }),
            prisma.user.update({
              where: { id: userId },
              data: { credits: { decrement: creditsSpent } },
              select: { credits: true },
            }),
            prisma.creditLedger.create({
              data: {
                userId,
                delta: -creditsSpent,
                tokens: totalTokens,
                reason: "generation",
                projectId,
              },
            }),
          ]);
          safeEnqueue({
            type: "done",
            version: null,
            summary,
            planSteps,
            suggestions,
            creditsSpent,
            creditsRemaining: noChangeUser.credits,
            files: { changed: [], deleted: [] },
          });
          return;
        }

        const [, , version, , updatedUser] = await prisma.$transaction([
          prisma.message.create({
            data: { projectId, role: "user", content: prompt, createdAt: new Date(now) },
          }),
          prisma.message.create({
            data: {
              projectId,
              role: "assistant",
              content: summary,
              planSteps,
              suggestions,
              createdAt: new Date(now + 1),
            },
          }),
          prisma.appVersion.create({
            data: {
              projectId,
              number: nextNumber,
              // The legacy html column is non-null; react-ts keeps its sources
              // in `files` and its build artifact in `compiledHtml`.
              html: isReact ? "" : parser.html,
              files: nextFiles,
              promptSummary: prompt.slice(0, 200),
            },
            select: { id: true, number: true, createdAt: true },
          }),
          prisma.project.update({
            where: { id: projectId },
            data: {
              updatedAt: new Date(),
              themeName: effectiveThemeName,
              agentId: effectiveAgentId,
            },
          }),
          prisma.user.update({
            where: { id: userId },
            data: { credits: { decrement: creditsSpent } },
            select: { credits: true },
          }),
          prisma.creditLedger.create({
            data: {
              userId,
              delta: -creditsSpent,
              tokens: totalTokens,
              reason: "generation",
              projectId,
            },
          }),
        ]);

        safeEnqueue({
          type: "done",
          version,
          summary,
          planSteps,
          suggestions,
          creditsSpent,
          creditsRemaining: updatedUser.credits,
          ...(isReact
            ? { files: { changed: Object.keys(changedFiles), deleted: deletedPaths } }
            : {}),
        });
      } catch (err) {
        if (llmAbort.signal.aborted) {
          // Client left mid-generation — discard partial output silently.
        } else {
          const message = err instanceof Error ? err.message : "Generation failed";
          console.error(`[chat] generation failed for project ${projectId}:`, err);
          safeEnqueue({ type: "error", message });
        }
      } finally {
        req.signal.removeEventListener("abort", onReqAbort);
        try {
          controller.close();
        } catch {
          // Stream already closed by the client disconnecting.
        }
      }
    },
    cancel() {
      clientGone = true;
      llmAbort.abort();
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
