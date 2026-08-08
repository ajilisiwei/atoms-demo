"use client";

// Console panel under the preview: runtime logs bridged from the sandboxed
// app plus build/bundle events from the builder. Filter chips + clear.

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

export type ConsoleLevel = "info" | "warn" | "error";

export interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  text: string;
  at: number;
}

type Filter = "all" | "error" | "info";

const LEVEL_TONE: Record<ConsoleLevel, string> = {
  info: "text-foreground/80",
  warn: "text-amber-500",
  error: "text-red-400",
};

function timeOf(at: number): string {
  return new Date(at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function ConsolePanel({
  logs,
  onClear,
}: {
  logs: ConsoleEntry[];
  onClear: () => void;
}) {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const listRef = useRef<HTMLDivElement>(null);

  const errors = logs.filter((l) => l.level === "error");
  const infos = logs.filter((l) => l.level !== "error");
  const shown =
    filter === "all" ? logs : filter === "error" ? errors : infos;

  // Follow the tail as new entries arrive.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length, filter]);

  const chip = (key: Filter, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
        filter === key
          ? "border-line bg-panel-2 text-foreground"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-52 shrink-0 flex-col border-t border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
        <span className="text-xs font-medium">{t("builder.console.title")}</span>
        <div className="flex items-center gap-1">
          {chip("all", t("builder.console.all", { n: logs.length }))}
          {chip("error", t("builder.console.errors", { n: errors.length }))}
          {chip("info", t("builder.console.infos", { n: infos.length }))}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-xs text-muted hover:text-foreground transition-colors"
        >
          {t("builder.console.clear")}
        </button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-1.5">
        {shown.length === 0 ? (
          <p className="mt-4 text-center text-xs text-muted">
            {t("builder.console.empty")}
          </p>
        ) : (
          shown.map((entry) => (
            <div
              key={entry.id}
              className="flex gap-2.5 border-b border-line/50 py-1 font-mono text-[11px] leading-5 last:border-b-0"
            >
              <span className="shrink-0 tabular-nums text-muted">
                {timeOf(entry.at)}
              </span>
              <span className={`min-w-0 whitespace-pre-wrap break-words ${LEVEL_TONE[entry.level]}`}>
                {entry.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
