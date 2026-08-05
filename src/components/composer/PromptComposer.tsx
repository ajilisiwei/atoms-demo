"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { ThemePicker } from "./ThemePicker";

interface PromptComposerProps {
  placeholder: string;
  disabled?: boolean;
  themeValue: string | null;
  onThemeChange: (id: string | null) => void;
  onSubmit: (prompt: string) => void;
  autoFocus?: boolean;
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
  compact,
}: PromptComposerProps) {
  const t = useT();
  const [input, setInput] = useState("");

  function submit() {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setInput("");
  }

  return (
    <div
      className={`rounded-2xl border border-line bg-panel shadow-sm focus-within:border-accent-2/50 transition-colors ${
        compact ? "p-1.5" : "p-2"
      }`}
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
