"use client";

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import type { AgentRecord } from "@/lib/agents";
import { ThemePicker } from "./ThemePicker";
import { AgentMentionMenu } from "./AgentMentionMenu";
import { useAgentMention } from "./useAgentMention";

interface PromptComposerProps {
  placeholder: string;
  disabled?: boolean;
  themeValue: string | null;
  onThemeChange: (id: string | null) => void;
  onSubmit: (prompt: string) => void;
  autoFocus?: boolean;
  // @-mention agent selection (optional; enabled when onAgentChange is given).
  // `agents` is the mentionable list from GET /api/agents; without it the
  // mention menu simply never opens.
  agents?: AgentRecord[];
  agentValue?: string | null;
  onAgentChange?: (id: string | null) => void;
  // App template toggle (optional; enabled when onTemplateChange is given).
  templateValue?: string;
  onTemplateChange?: (template: string) => void;
  // Builder variant: slightly tighter paddings, 2 rows.
  compact?: boolean;
}

// Labels are plain-language (not tech stacks) — see composer.template.* keys.
const TEMPLATE_OPTIONS = [
  { key: "html", labelKey: "composer.template.simple" },
  { key: "react-ts", labelKey: "composer.template.advanced" },
];

export function PromptComposer({
  placeholder,
  disabled,
  themeValue,
  onThemeChange,
  onSubmit,
  autoFocus,
  agents = [],
  agentValue,
  onAgentChange,
  templateValue,
  onTemplateChange,
  compact,
}: PromptComposerProps) {
  const t = useT();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const mention = useAgentMention({
    text: input,
    setText: setInput,
    agents,
    agentValue: agentValue ?? null,
    onAgentChange,
    textareaRef,
  });

  function submit() {
    const prompt = mention.prepareSubmit();
    if (!prompt || disabled) return;
    onSubmit(prompt);
    setInput("");
  }

  return (
    <div
      className={`relative rounded-2xl border border-line bg-panel shadow-sm focus-within:border-accent-2/50 transition-colors ${
        compact ? "p-1.5" : "p-2"
      }`}
    >
      {mention.menuOpen && (
        <AgentMentionMenu
          candidates={mention.candidates}
          activeIndex={mention.activeIndex}
          onSelect={mention.select}
        />
      )}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={mention.handleChange}
        onKeyDown={(e) => {
          if (mention.handleKeyDown(e)) return;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        onKeyUp={mention.updateCaret}
        onClick={mention.updateCaret}
        rows={compact ? 2 : 3}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full resize-none bg-transparent px-3 text-sm outline-none placeholder:text-muted disabled:opacity-50 ${
          compact ? "py-1.5" : "py-2"
        }`}
      />
      <div className="flex items-center justify-between px-1 pb-0.5">
        <div className="flex items-center gap-2">
          <ThemePicker value={themeValue} onChange={onThemeChange} disabled={disabled} />
          {onTemplateChange && (
            <div
              className="flex items-center rounded-full border border-line bg-panel-2/60 p-0.5 text-xs"
              title={t("composer.templateTitle")}
            >
              {TEMPLATE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => onTemplateChange(opt.key)}
                  className={`rounded-full px-2.5 py-1 transition-colors disabled:opacity-50 ${
                    (templateValue ?? "html") === opt.key
                      ? "bg-panel text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !input.trim()}
          aria-label={t("composer.send")}
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
    </div>
  );
}
