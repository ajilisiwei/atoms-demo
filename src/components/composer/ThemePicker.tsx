"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GENERATION_THEMES, getGenerationTheme } from "@/lib/themes";

interface ThemePickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}

function PreviewDots({ colors }: { colors: readonly string[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {colors.map((color, i) => (
        <span
          key={i}
          className="w-2.5 h-2.5 rounded-full border border-line"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

export function ThemePicker({ value, onChange, disabled }: ThemePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = getGenerationTheme(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? GENERATION_THEMES.filter((t) => t.name.toLowerCase().includes(q))
      : GENERATION_THEMES;
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(id: string | null) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="rounded-full border border-line bg-panel-2 px-3 py-1.5 text-sm flex items-center gap-1.5 hover:border-accent-2/60 transition-colors disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
        <span className="truncate">{selected ? selected.name : "Theme"}</span>
        {selected && <PreviewDots colors={selected.preview} />}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-72 rounded-2xl border border-line bg-panel shadow-xl z-50 overflow-hidden">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search themes…"
            autoFocus
            className="m-2 rounded-lg bg-panel-2 px-3 py-2 text-sm outline-none w-[calc(100%-1rem)] placeholder:text-muted"
          />
          <div className="max-h-64 overflow-y-auto pb-1">
            <button
              type="button"
              onClick={() => choose(null)}
              className="w-full text-left flex items-center justify-between px-4 py-2 text-sm hover:bg-panel-2 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                No theme
                {value === null && <span className="text-accent-2">✓</span>}
              </span>
            </button>
            <p className="px-4 pt-2 pb-1 text-xs text-muted">Default themes</p>
            {filtered.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => choose(theme.id)}
                className="w-full text-left flex items-center justify-between px-4 py-2 text-sm hover:bg-panel-2 cursor-pointer"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{theme.name}</span>
                  {value === theme.id && <span className="text-accent-2">✓</span>}
                </span>
                <PreviewDots colors={theme.preview} />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted">No themes match.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
