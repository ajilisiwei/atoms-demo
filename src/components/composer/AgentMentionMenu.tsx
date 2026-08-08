"use client";

import Image from "next/image";
import { useLocale } from "@/lib/i18n";
import { agentTagline, type AgentRecord } from "@/lib/agents";

interface AgentMentionMenuProps {
  candidates: AgentRecord[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

// Floating candidate list for @-mentions, anchored above the composer.
export function AgentMentionMenu({
  candidates,
  activeIndex,
  onSelect,
}: AgentMentionMenuProps) {
  const { locale } = useLocale();

  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 w-80 overflow-hidden rounded-2xl border border-line bg-panel p-1.5 shadow-xl">
      {candidates.map((agent, i) => (
        <button
          key={agent.id}
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
  );
}
