"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export const PENDING_PROMPT_KEY = "atomlet:pending-prompt";

const EXAMPLES = [
  "A pomodoro timer with task list and daily stats",
  "一个记账应用，支持分类统计和月度图表",
  "A flashcard app for learning Japanese kana",
  "A retro snake game with high scores",
];

interface HeroPromptProps {
  isLoggedIn: boolean;
}

export function HeroPrompt({ isLoggedIn }: HeroPromptProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  function start(text: string) {
    const value = text.trim();
    if (value) sessionStorage.setItem(PENDING_PROMPT_KEY, value);
    router.push(isLoggedIn ? "/dashboard" : "/register");
  }

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(prompt);
        }}
        className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-panel border border-line shadow-2xl shadow-black/40"
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              start(prompt);
            }
          }}
          rows={2}
          placeholder="Describe the app you want to build…"
          className="flex-1 resize-none bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          className="shrink-0 self-stretch sm:self-end rounded-xl bg-gradient-to-r from-accent to-accent-2 px-6 py-3 font-medium text-white hover:opacity-90 transition-opacity"
        >
          Build it
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => start(ex)}
            className="text-sm text-muted border border-line rounded-full px-3 py-1.5 hover:text-foreground hover:border-accent/60 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
