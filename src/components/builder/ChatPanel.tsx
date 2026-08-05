"use client";

import { useEffect, useRef, useState } from "react";
import { ThemePicker } from "@/components/composer/ThemePicker";
import type { GenerationState, UiMessage } from "./types";

export interface RestoredInput {
  value: string;
  at: number;
}

interface ChatPanelProps {
  messages: UiMessage[];
  generation: GenerationState | null;
  error: string | null;
  // Prompt to put back into the input after a failed generation; `at` gives
  // each restore a fresh identity so repeated failures re-fill the box.
  restored: RestoredInput;
  onSend: (prompt: string) => void;
  onDismissError: () => void;
  // Optional until the Builder integration wires it up.
  onSuggestion?: (text: string) => void;
  // Generation theme controls (rendered in the input row when provided)
  themeValue?: string | null;
  onThemeChange?: (id: string | null) => void;
}

function PlanTimeline({ steps, live }: { steps: string[]; live: boolean }) {
  if (steps.length === 0) return null;
  return (
    <ol className="mt-2 flex flex-col gap-1.5">
      {steps.map((step, i) => {
        const isCurrent = live && i === steps.length - 1;
        return (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                isCurrent ? "bg-accent animate-blink" : "bg-emerald-500"
              }`}
            />
            <span className={isCurrent ? "text-foreground" : "text-muted"}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ChatPanel({
  messages,
  generation,
  error,
  restored,
  onSend,
  onDismissError,
  onSuggestion,
  themeValue,
  onThemeChange,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [lastRestoredAt, setLastRestoredAt] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const generating = generation !== null;
  // Suggestion chips only render under the newest assistant message.
  const lastAssistantId = messages.reduce<string | null>(
    (acc, m) => (m.role === "assistant" ? m.id : acc),
    null
  );

  // Adjust state during render when the prop changes (React's documented
  // alternative to syncing props via useEffect).
  if (restored.at !== lastRestoredAt) {
    setLastRestoredAt(restored.at);
    if (restored.value) setInput(restored.value);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, generation?.planSteps.length, generation?.phase]);

  function submit() {
    const value = input.trim();
    if (!value || generating) return;
    setInput("");
    onSend(value);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.length === 0 && !generating && (
          <div className="m-auto text-center text-muted max-w-xs">
            <p className="text-3xl mb-3">🤖</p>
            <p className="text-sm leading-relaxed">
              Describe the app you want and the agent will plan it, write the
              code and render it live on the right.
            </p>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="self-end max-w-[85%]">
              <div className="rounded-2xl rounded-br-md bg-panel-2 px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="self-start max-w-[92%] w-full px-1 py-0.5">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
              {m.planSteps && m.planSteps.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted cursor-pointer select-none hover:text-foreground">
                    Build plan ({m.planSteps.length} steps)
                  </summary>
                  <PlanTimeline steps={m.planSteps} live={false} />
                </details>
              )}
              {m.id === lastAssistantId &&
                m.suggestions &&
                m.suggestions.length > 0 && (
                  <div
                    className={`mt-3 flex flex-wrap gap-2 ${
                      generating ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    {m.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={generating}
                        onClick={() => onSuggestion?.(s)}
                        className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-muted hover:text-foreground hover:border-accent-2/60 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          )
        )}

        {generation && (
          <div className="self-start max-w-[92%] w-full">
            <div className="rounded-2xl rounded-bl-md bg-panel-2 border border-accent/40 px-4 py-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent animate-blink" />
                {generation.phase === "planning" && "Planning the app…"}
                {generation.phase === "coding" &&
                  `Writing code… ${(generation.htmlLength / 1024).toFixed(1)} KB`}
                {generation.phase === "finishing" && "Finishing up…"}
              </p>
              <PlanTimeline
                steps={generation.planSteps}
                live={generation.phase === "planning"}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="self-stretch rounded-xl border border-line bg-panel-2 px-4 py-3 text-sm text-red-400 flex items-start justify-between gap-3">
            <span>{error}</span>
            <button onClick={onDismissError} className="shrink-0 hover:text-foreground">
              ✕
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-line p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="rounded-xl bg-panel border border-line p-2 focus-within:border-accent-2/50 transition-colors"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            disabled={generating}
            placeholder={
              messages.length === 0
                ? "Describe your app… (Enter to send)"
                : "Describe a change… (Enter to send)"
            }
            className="w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted disabled:opacity-50"
          />
          <div className="flex items-center justify-between px-0.5 pb-0.5">
            {onThemeChange ? (
              <ThemePicker
                value={themeValue ?? null}
                onChange={onThemeChange}
                disabled={generating}
              />
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={generating || !input.trim()}
              aria-label="Send"
              className="w-9 h-9 rounded-full bg-foreground text-background grid place-items-center hover:opacity-85 transition-opacity disabled:opacity-30"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 19V5" />
                <path d="m5 12 7-7 7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
