"use client";

import Image from "next/image";
import { useT } from "@/lib/i18n";
import { BUILTIN_AGENTS, getBuiltinAgent } from "@/lib/agents";

interface AgentRowProps {
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}

// Atoms-style overlapping avatar row: click to pick a specialist agent,
// click again to clear.
export function AgentRow({ value, onChange, disabled }: AgentRowProps) {
  const t = useT();
  const selected = getBuiltinAgent(value);

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className={`flex -space-x-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
        {BUILTIN_AGENTS.map((agent) => {
          const isSelected = value === agent.id;
          const dimmed = value !== null && !isSelected;
          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => onChange(isSelected ? null : agent.id)}
              title={`${agent.name} · ${t(agent.taglineKey)}`}
              aria-label={agent.name}
              aria-pressed={isSelected}
              className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 transition-all duration-150 hover:z-10 hover:scale-110 ${
                isSelected
                  ? "z-10 scale-110 border-accent-2 shadow-lg"
                  : "border-panel"
              } ${dimmed ? "opacity-45 saturate-50" : ""}`}
            >
              <Image
                src={agent.avatar}
                alt={agent.name}
                fill
                sizes="48px"
                className="object-cover"
              />
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted min-h-4">
        {selected ? (
          <>
            {t("agents.buildWith", { name: selected.name })}
            <span className="mx-1.5">·</span>
            {t(selected.taglineKey)}
            <button
              type="button"
              onClick={() => onChange(null)}
              className="ml-2 text-muted hover:text-foreground underline underline-offset-2"
            >
              {t("agents.clear")}
            </button>
          </>
        ) : (
          t("agents.rowLabel")
        )}
      </p>
    </div>
  );
}
