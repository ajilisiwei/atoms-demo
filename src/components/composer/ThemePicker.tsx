"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { useT } from "@/lib/i18n";
import { GENERATION_THEMES, getGenerationTheme } from "@/lib/themes";
import { BUILTIN_THEME_TOKENS, type ThemeTokens } from "@/lib/theme-tokens";
import {
  ThemeHoverPreview,
  type HoverAnchor,
} from "@/components/theme/ThemeHoverPreview";
import { ThemeStudio, type CustomThemeRow } from "@/components/theme/ThemeStudio";

interface HoverState {
  tokens: ThemeTokens;
  name: string;
  dots: readonly string[];
  anchor: HoverAnchor;
}

const canHover = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

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

const customDots = (row: CustomThemeRow): readonly string[] => [
  row.tokens.color.background,
  row.tokens.color.foreground,
  row.tokens.color.primary,
  row.tokens.color.accent,
];

export function ThemePicker({ value, onChange, disabled }: ThemePickerProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customs, setCustoms] = useState<CustomThemeRow[]>([]);
  const [studioOpen, setStudioOpen] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  // Hover preview: delayed show so scrolling past rows doesn't flicker.
  function rowHoverProps(entry: {
    tokens: ThemeTokens;
    name: string;
    dots: readonly string[];
  }) {
    if (!canHover()) return {};
    const show = (e: React.SyntheticEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        setHover({
          ...entry,
          anchor: { left: rect.left, right: rect.right, top: rect.top },
        });
      }, 150);
    };
    const hide = () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
      setHover(null);
    };
    return { onMouseEnter: show, onFocus: show, onMouseLeave: hide, onBlur: hide };
  }

  useEffect(
    () => () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    },
    []
  );

  const selectedBuiltin = getGenerationTheme(value);
  const selectedCustom = value?.startsWith("custom:")
    ? customs.find((c) => `custom:${c.id}` === value) ?? null
    : null;

  async function loadCustoms() {
    try {
      const data = await api<{ custom: CustomThemeRow[] }>("/api/themes");
      setCustoms(data.custom);
    } catch {
      // Non-fatal: built-ins still work.
    }
  }

  // Resolve the label when a custom theme is preselected (e.g. stored on the
  // project) before the dropdown was ever opened.
  useEffect(() => {
    if (fetchedRef.current) return;
    if (value?.startsWith("custom:")) {
      fetchedRef.current = true;
      // Deferred so no state updates run synchronously inside the effect.
      setTimeout(() => void loadCustoms(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? GENERATION_THEMES.filter((th) => th.name.toLowerCase().includes(q))
      : GENERATION_THEMES;
  }, [query]);

  const filteredCustoms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? customs.filter((c) => c.name.toLowerCase().includes(q)) : customs;
  }, [customs, query]);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchedRef.current = true;
      void loadCustoms();
    }
  }

  function choose(id: string | null) {
    onChange(id);
    setOpen(false);
    setQuery("");
    setHover(null);
  }

  const selectedLabel = selectedCustom
    ? selectedCustom.name
    : selectedBuiltin
      ? selectedBuiltin.name
      : value?.startsWith("custom:")
        ? t("composer.customTheme")
        : t("composer.theme");

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
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
        <span className="truncate">{selectedLabel}</span>
        {selectedBuiltin && <PreviewDots colors={selectedBuiltin.preview} />}
        {selectedCustom && <PreviewDots colors={customDots(selectedCustom)} />}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-72 rounded-2xl border border-line bg-panel shadow-xl z-50 overflow-hidden">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("composer.searchThemes")}
            autoFocus
            className="m-2 rounded-lg bg-panel-2 px-3 py-2 text-sm outline-none w-[calc(100%-1rem)] placeholder:text-muted"
          />
          <div className="max-h-64 overflow-y-auto overscroll-contain pb-1">
            <button
              type="button"
              onClick={() => choose(null)}
              className="w-full text-left flex items-center justify-between px-4 py-2 text-sm hover:bg-panel-2 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                {t("composer.noTheme")}
                {value === null && <span className="text-accent-2">✓</span>}
              </span>
            </button>
            {filteredCustoms.length > 0 && (
              <>
                <p className="px-4 pt-2 pb-1 text-xs text-muted">{t("composer.myThemes")}</p>
                {filteredCustoms.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => choose(`custom:${row.id}`)}
                    {...rowHoverProps({
                      tokens: row.tokens,
                      name: row.name,
                      dots: customDots(row),
                    })}
                    className="w-full text-left flex items-center justify-between px-4 py-2 text-sm hover:bg-panel-2 cursor-pointer"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{row.name}</span>
                      {value === `custom:${row.id}` && (
                        <span className="text-accent-2">✓</span>
                      )}
                    </span>
                    <PreviewDots colors={customDots(row)} />
                  </button>
                ))}
              </>
            )}
            <p className="px-4 pt-2 pb-1 text-xs text-muted">{t("composer.defaultThemes")}</p>
            {filtered.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => choose(theme.id)}
                {...rowHoverProps({
                  tokens:
                    BUILTIN_THEME_TOKENS.find((b) => b.id === theme.id)?.tokens ??
                    theme.tokens,
                  name: theme.name,
                  dots: theme.preview,
                })}
                className="w-full text-left flex items-center justify-between px-4 py-2 text-sm hover:bg-panel-2 cursor-pointer"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{theme.name}</span>
                  {value === theme.id && <span className="text-accent-2">✓</span>}
                </span>
                <PreviewDots colors={theme.preview} />
              </button>
            ))}
            {filtered.length === 0 && filteredCustoms.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted">{t("composer.noThemesMatch")}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setQuery("");
              setStudioOpen(true);
            }}
            className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-sm text-accent-2 hover:bg-panel-2 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            {t("composer.openStudio")}
          </button>
        </div>
      )}

      {open && hover && (
        <ThemeHoverPreview
          tokens={hover.tokens}
          name={hover.name}
          dots={hover.dots}
          anchor={hover.anchor}
        />
      )}

      <ThemeStudio
        open={studioOpen}
        initialThemeId={value}
        onClose={() => setStudioOpen(false)}
        onApply={(themeName) => {
          onChange(themeName);
          void loadCustoms();
        }}
      />
    </div>
  );
}
