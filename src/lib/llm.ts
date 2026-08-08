import OpenAI from "openai";
import { themePromptBlock, type GenerationTheme } from "./themes";
import { agentPromptBlock, type BuiltinAgent } from "./agents";

export const LLM_MODEL = process.env.LLM_MODEL ?? "deepseek-v4-flash";

let client: OpenAI | null = null;

export function getLlmClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");
  if (!client) {
    client = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey });
  }
  return client;
}

export const BUILDER_SYSTEM_PROMPT = `You are the build agent of Atomlet, an AI-driven web app builder.
The user describes an app in natural language; you design and implement it as a single self-contained HTML file.

## Output protocol (follow EXACTLY, no markdown fences, no extra prose)

<PLAN>
- one short step per line describing what you are about to build (3-6 steps, in the same language the user writes in)
</PLAN>
<FILE>
<!doctype html>
... the complete HTML document ...
</FILE>
<SUMMARY>
One or two sentences (same language as the user) describing what was built or changed.
</SUMMARY>
<SUGGESTIONS>
- three short follow-up feature ideas the user could ask for next, each starting with a verb like "Add"/"添加" (same language as the user), max 8 words each
</SUGGESTIONS>

## Rules for the generated app

- ONE self-contained HTML file: all CSS in <style>, all JS in <script>. No build step.
- Allowed external resources: only <script src="https://cdn.tailwindcss.com"></script> if Tailwind helps. No other CDNs, no external images (use emoji, inline SVG or CSS).
- The app must be genuinely interactive and polished: real state, real event handling, thoughtful empty states, keyboard support where natural.
- If the app manages data (todos, notes, scores...), persist it with localStorage so data survives reload.
- Responsive layout; looks good on both mobile and desktop. Choose a coherent color scheme and typography.
- No network requests, no forms posting anywhere, no <a> to external sites.
- Keep it under ~600 lines. Prefer vanilla JS; small and readable.

## When the user asks for a modification

You will receive the CURRENT APP CODE. Re-emit the COMPLETE updated file (never a diff, never a fragment) applying the requested change while preserving everything else that works.`;

export type HistoryEntry = { role: "user" | "assistant"; content: string };

export function buildGenerationMessages(params: {
  history: HistoryEntry[];
  currentHtml: string | null;
  prompt: string;
  theme?: GenerationTheme | null;
  // Pre-rendered theme block, used for user-defined themes whose tokens are not
  // a GenerationTheme (see renderThemePrompt in ./theme-prompt). Takes
  // precedence over `theme` when both are given.
  themeBlock?: string | null;
  agent?: BuiltinAgent | null;
}): OpenAI.ChatCompletionMessageParam[] {
  const { history, currentHtml, prompt, theme, themeBlock, agent } = params;
  const systemContent = [
    BUILDER_SYSTEM_PROMPT,
    agent ? agentPromptBlock(agent) : null,
    themeBlock ?? (theme ? themePromptBlock(theme) : null),
  ]
    .filter(Boolean)
    .join("\n\n");
  const finalUserContent = currentHtml
    ? `CURRENT APP CODE:\n${currentHtml}\n\nUSER REQUEST: ${prompt}`
    : `USER REQUEST: ${prompt}`;
  return [
    { role: "system", content: systemContent },
    // Older turns are passed as prompt/summary pairs only (without full HTML)
    // to keep token usage bounded; the latest HTML above carries the real state.
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: finalUserContent },
  ];
}
