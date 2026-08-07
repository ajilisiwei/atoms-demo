"use client";

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";
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
  agentValue?: string | null;
  onAgentChange?: (id: string | null) => void;
  // Builder variant: slightly tighter paddings, 2 rows.
  compact?: boolean;
}

export function PromptComposer({
  placeholder,
  disabled,
  themeValue,
  onThemeChange,
  onSubmit,
  autoFocus,
  agentValue,
  onAgentChange,
  compact,
}: PromptComposerProps) {
  const t = useT();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const mention = useAgentMention({
    text: input,
    setText: setInput,
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
        <ThemePicker value={themeValue} onChange={onThemeChange} disabled={disabled} />
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
