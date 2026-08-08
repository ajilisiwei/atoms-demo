"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "@/lib/i18n";
import { agentTagline, findAgent } from "@/lib/agents";
import type { AgentRecord } from "@/lib/agent-types";

interface AgentRowProps {
  agents: AgentRecord[];
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  onCreateBuddy?: () => void;
  onEditBuddy?: (agent: AgentRecord) => void;
}

const VISIBLE_COUNT = 5;

function Avatar({
  agent,
  size,
  selected,
  dimmed,
  onClick,
  title,
}: {
  agent: AgentRecord;
  size: string;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={agent.name}
      aria-pressed={selected}
      className={`relative ${size} shrink-0 overflow-hidden rounded-full border-2 transition-all duration-150 hover:z-10 hover:scale-110 ${
        selected ? "z-10 scale-110 border-accent-2 shadow-lg" : "border-panel"
      } ${dimmed ? "opacity-45 saturate-50" : ""}`}
    >
      <Image src={agent.avatarUrl} alt={agent.name} fill sizes="48px" className="object-cover" />
    </button>
  );
}

// Buddy picker: the leading avatars inline, everyone else (work/life/custom
// groups + create) inside an expandable panel.
export function AgentRow({
  agents,
  value,
  onChange,
  disabled,
  onCreateBuddy,
  onEditBuddy,
}: AgentRowProps) {
  const t = useT();
  const { locale } = useLocale();
  const [panelOpen, setPanelOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = findAgent(agents, value);

  useEffect(() => {
    if (!panelOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPanelOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [panelOpen]);

  const builtins = agents.filter((a) => a.kind === "builtin");
  const customs = agents.filter((a) => a.kind === "custom");

  // Leading strip: the first N builtins; if the selection lives elsewhere it
  // takes the last visible slot so the active buddy is always on screen.
  const visible = builtins.slice(0, VISIBLE_COUNT);
  if (selected && !visible.some((a) => a.id === selected.id)) {
    visible[Math.max(0, visible.length - 1)] = selected;
  }
  const hiddenCount = builtins.length + customs.length - visible.length;

  const pick = (id: string) => {
    onChange(value === id ? null : id);
    setPanelOpen(false);
  };

  const group = (label: string, list: AgentRecord[], editable = false) =>
    list.length > 0 ? (
      <div key={label}>
        <p className="px-1 pb-1.5 pt-2 text-xs text-muted">{label}</p>
        <div className="grid grid-cols-5 gap-1">
          {list.map((agent) => (
            <div
              key={agent.id}
              className="group/item relative flex flex-col items-center gap-1 rounded-xl p-1.5 hover:bg-panel-2 transition-colors"
            >
              <Avatar
                agent={agent}
                size="h-11 w-11"
                selected={value === agent.id}
                dimmed={false}
                onClick={() => pick(agent.id)}
                title={`${agent.name} · ${agentTagline(agent, locale)}`}
              />
              <span className="max-w-full truncate text-[11px] text-muted">{agent.name}</span>
              {editable && onEditBuddy && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPanelOpen(false);
                    onEditBuddy(agent);
                  }}
                  title={t("agents.editBuddy")}
                  aria-label={t("agents.editBuddy")}
                  className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full border border-line bg-panel text-muted opacity-0 shadow-sm transition-opacity hover:text-foreground group-hover/item:opacity-100"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div ref={wrapRef} className="relative flex flex-col items-center gap-2.5">
      <div
        className={`flex items-center -space-x-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        {visible.map((agent) => (
          <Avatar
            key={agent.id}
            agent={agent}
            size="h-10 w-10 sm:h-12 sm:w-12"
            selected={value === agent.id}
            dimmed={value !== null && value !== agent.id}
            onClick={() => pick(agent.id)}
            title={`${agent.name} · ${agentTagline(agent, locale)}`}
          />
        ))}
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          title={t("agents.moreBuddies")}
          aria-label={t("agents.moreBuddies")}
          aria-expanded={panelOpen}
          className={`z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-panel bg-panel-2 text-xs font-medium transition-all duration-150 hover:scale-110 hover:text-foreground sm:h-12 sm:w-12 ${
            panelOpen ? "text-foreground" : "text-muted"
          }`}
        >
          {hiddenCount > 0 ? `+${hiddenCount}` : "⋯"}
        </button>
      </div>

      {panelOpen && (
        <div className="absolute top-full z-50 mt-2 w-[360px] rounded-2xl border border-line bg-panel p-3 text-left shadow-xl">
          {group(t("agents.group.work"), builtins.filter((a) => a.group === "work"))}
          {group(t("agents.group.life"), builtins.filter((a) => a.group === "life"))}
          {group(t("agents.group.custom"), customs, true)}
          {onCreateBuddy && (
            <button
              type="button"
              onClick={() => {
                setPanelOpen(false);
                onCreateBuddy();
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-sm text-muted hover:bg-panel-2 hover:text-foreground transition-colors"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t("agents.createBuddy")}
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-muted min-h-4">
        {selected ? (
          <>
            {t("agents.buildWith", { name: selected.name })}
            <span className="mx-1.5">·</span>
            {agentTagline(selected, locale)}
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
