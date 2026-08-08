"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useLocale } from "@/lib/i18n";
import { agentTagline, type AgentRecord } from "@/lib/agents";

interface AgentMentionMenuProps {
  candidates: AgentRecord[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

// Floating candidate list for @-mentions, anchored above the composer.
// Capped in height with its own scroll layer (solid rounded shell outside,
// scroller inside) so a long roster never runs past the viewport top; the
// keyboard-active row is kept in view.
export function AgentMentionMenu({
  candidates,
  activeIndex,
  onSelect,
}: AgentMentionMenuProps) {
  const { locale } = useLocale();
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 w-80 overflow-hidden rounded-2xl border border-line bg-panel shadow-xl">
      <div className="max-h-72 overflow-y-auto overscroll-contain p-1.5">
        {candidates.map((agent, i) => (
          <button
            key={agent.id}
            ref={i === activeIndex ? activeRef : undefined}
            type="button"
            // preventDefault keeps the textarea focused while clicking.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(i)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
              i === activeIndex ? "bg-panel-2" : "hover:bg-panel-2"
            }`}
          >
            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-line">
              <Image
                src={agent.avatarUrl}
                alt={agent.name}
                fill
                sizes="32px"
                className="object-cover"
              />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{agent.name}</span>
              <span className="block truncate text-xs text-muted">
                {agentTagline(agent, locale)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
