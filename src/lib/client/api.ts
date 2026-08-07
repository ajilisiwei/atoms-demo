export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export type VersionMeta = {
  id: string;
  number: number;
  promptSummary: string;
  createdAt: string;
};

export type GenerationEvent =
  | { type: "plan_step"; text: string }
  | { type: "html_delta"; delta: string }
  // Multi-file (react-ts) streaming: content per file, like html_delta.
  | { type: "file_start"; path: string }
  | { type: "file_delta"; path: string; delta: string }
  | { type: "file_end"; path: string; bytes: number }
  | { type: "summary"; text: string }
  | { type: "suggestions"; items: string[] }
  | {
      type: "done";
      // null on a no-change react-ts turn (conversational reply, no version)
      version: VersionMeta | null;
      summary: string;
      planSteps: string[];
      suggestions?: string[];
      creditsSpent?: number;
      creditsRemaining?: number;
      // react-ts only: which paths this generation changed/deleted
      files?: { changed: string[]; deleted: string[] };
    }
  | { type: "error"; message: string };

export interface StreamGenerationOptions {
  signal?: AbortSignal;
  // undefined = keep the project's stored value; null = clear; id = set
  themeName?: string | null;
  agentId?: string | null;
}

export async function streamGeneration(
  projectId: string,
  prompt: string,
  onEvent: (event: GenerationEvent) => void,
  opts: StreamGenerationOptions = {}
): Promise<void> {
  const payload: Record<string, unknown> = { prompt };
  if (opts.themeName !== undefined) payload.themeName = opts.themeName ?? "";
  if (opts.agentId !== undefined) payload.agentId = opts.agentId ?? "";
  const res = await fetch(`/api/projects/${projectId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    const data: { error?: string } = await res.json().catch(() => ({}));
    throw new ApiError(data.error ?? `Generation failed (${res.status})`, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const frame of frames) {
      const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      try {
        onEvent(JSON.parse(dataLine.slice(6)) as GenerationEvent);
      } catch {
        // Skip malformed frames rather than killing the whole stream.
      }
    }
  }
}
