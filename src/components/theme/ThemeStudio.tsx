"use client";

// Theme Studio: full-screen editor with token form (left), live preview
// canvas (center), and UX-guideline lint (right). Built-ins are editable as
// a starting point; any save on a built-in becomes "save as new theme".

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useT } from "@/lib/i18n";
import { BUILTIN_THEME_TOKENS, type ThemeTokens } from "@/lib/theme-tokens";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InputDialog } from "@/components/InputDialog";
import { PreviewCanvas } from "./PreviewCanvas";
import { ThemeLint } from "./ThemeLint";
import { TokenForm } from "./TokenForm";

export interface CustomThemeRow {
  id: string;
  name: string;
  baseTheme: string | null;
  tokens: ThemeTokens;
  updatedAt: string;
}

interface ThemeStudioProps {
  open: boolean;
  initialThemeId: string | null;
  onClose: () => void;
  // Called with a themeName value ("zen-garden" or "custom:<id>").
  onApply: (themeName: string) => void;
}

const clone = (t: ThemeTokens): ThemeTokens => JSON.parse(JSON.stringify(t)) as ThemeTokens;

export function ThemeStudio({ open, initialThemeId, onClose, onApply }: ThemeStudioProps) {
  const t = useT();
  const [customs, setCustoms] = useState<CustomThemeRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>(BUILTIN_THEME_TOKENS[0].id);
  const [tokens, setTokens] = useState<ThemeTokens>(() => clone(BUILTIN_THEME_TOKENS[0].tokens));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const loadedRef = useRef(false);

  const isCustom = selectedId.startsWith("custom:");
  const currentCustom = isCustom
    ? customs.find((c) => `custom:${c.id}` === selectedId) ?? null
    : null;
  const currentBuiltin = !isCustom
    ? BUILTIN_THEME_TOKENS.find((b) => b.id === selectedId) ?? null
    : null;
  const currentName = currentCustom?.name ?? currentBuiltin?.name ?? "";

  function selectTheme(id: string, rows: CustomThemeRow[] = customs) {
    setSelectedId(id);
    setDirty(false);
    setError(null);
    if (id.startsWith("custom:")) {
      const row = rows.find((c) => `custom:${c.id}` === id);
      if (row) setTokens(clone(row.tokens));
    } else {
      const def = BUILTIN_THEME_TOKENS.find((b) => b.id === id);
      if (def) setTokens(clone(def.tokens));
    }
  }

  // Load the custom-theme list each time the studio opens.
  useEffect(() => {
    if (!open) {
      loadedRef.current = false;
      return;
    }
    if (loadedRef.current) return;
    loadedRef.current = true;
    void (async () => {
      try {
        const data = await api<{ custom: CustomThemeRow[] }>("/api/themes");
        setCustoms(data.custom);
        const target =
          initialThemeId &&
          (initialThemeId.startsWith("custom:")
            ? data.custom.some((c) => `custom:${c.id}` === initialThemeId)
            : BUILTIN_THEME_TOKENS.some((b) => b.id === initialThemeId))
            ? initialThemeId
            : BUILTIN_THEME_TOKENS[0].id;
        selectTheme(target, data.custom);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t("theme.studio.loadFailed"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialThemeId]);

  if (!open) return null;

  function handleTokensChange(next: ThemeTokens) {
    setTokens(next);
    setDirty(true);
  }

  async function saveExisting() {
    if (!currentCustom || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { theme } = await api<{ theme: CustomThemeRow }>(
        `/api/themes/${currentCustom.id}`,
        { method: "PATCH", body: JSON.stringify({ tokens }) }
      );
      setCustoms((prev) => prev.map((c) => (c.id === theme.id ? theme : c)));
      setDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("theme.studio.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function saveAs(name: string) {
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const { theme } = await api<{ theme: CustomThemeRow }>("/api/themes", {
        method: "POST",
        body: JSON.stringify({
          name: trimmed,
          baseTheme: isCustom ? currentCustom?.baseTheme ?? undefined : selectedId,
          tokens,
        }),
      });
      setCustoms((prev) => [theme, ...prev]);
      setSelectedId(`custom:${theme.id}`);
      setDirty(false);
      setSaveAsOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("theme.studio.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrent() {
    if (!currentCustom || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/api/themes/${currentCustom.id}`, { method: "DELETE" });
      const rest = customs.filter((c) => c.id !== currentCustom.id);
      setCustoms(rest);
      setDeleteOpen(false);
      selectTheme(BUILTIN_THEME_TOKENS[0].id, rest);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("theme.studio.deleteFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-4">
        <p className="text-sm font-semibold">{t("theme.studio.title")}</p>
        <select
          value={selectedId}
          onChange={(e) => selectTheme(e.target.value)}
          className="h-8 max-w-[220px] rounded-lg border border-line bg-panel px-2 text-sm outline-none focus:border-accent-2/50"
        >
          <optgroup label={t("theme.studio.builtinGroup")}>
            {BUILTIN_THEME_TOKENS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </optgroup>
          {customs.length > 0 && (
            <optgroup label={t("theme.studio.customGroup")}>
              {customs.map((c) => (
                <option key={c.id} value={`custom:${c.id}`}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {dirty && (
          <span className="text-xs text-muted">{t("theme.studio.unsaved")}</span>
        )}
        {error && <span className="max-w-xs truncate text-xs text-red-400">{error}</span>}
        <div className="ml-auto flex items-center gap-2">
          {isCustom && (
            <>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                disabled={saving}
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {t("theme.studio.delete")}
              </button>
              <button
                type="button"
                onClick={() => void saveExisting()}
                disabled={saving || !dirty}
                className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-panel-2 transition-colors disabled:opacity-40"
              >
                {t("theme.studio.save")}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setSaveAsOpen(true)}
            disabled={saving}
            className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-panel-2 transition-colors disabled:opacity-50"
          >
            {t("theme.studio.saveAs")}
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(selectedId);
              onClose();
            }}
            disabled={saving || (dirty && !isCustom)}
            title={dirty && !isCustom ? t("theme.studio.applyNeedsSave") : undefined}
            className="rounded-lg bg-foreground px-3.5 py-1.5 text-xs font-medium text-background hover:opacity-85 transition-opacity disabled:opacity-40"
          >
            {t("theme.studio.apply")}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.cancel")}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-panel-2 hover:text-foreground transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Three columns */}
      <div className="flex min-h-0 flex-1">
        <div className="w-[300px] shrink-0 overflow-y-auto border-r border-line">
          <TokenForm tokens={tokens} onChange={handleTokensChange} />
        </div>
        <div className="min-w-0 flex-1 overflow-auto bg-panel-2/40 p-6">
          <div className="mx-auto max-w-4xl">
            <PreviewCanvas tokens={tokens} />
          </div>
        </div>
        <div className="w-64 shrink-0 overflow-y-auto border-l border-line p-3">
          <p className="mb-2 text-xs font-medium text-muted">
            {t("theme.studio.lintTitle")}
          </p>
          <ThemeLint tokens={tokens} />
          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            {t("theme.studio.canvasNote")}
          </p>
        </div>
      </div>

      <InputDialog
        open={saveAsOpen}
        title={t("theme.studio.saveAsTitle")}
        initialValue={
          isCustom ? `${currentName} 2` : `${currentName} (${t("theme.studio.customSuffix")})`
        }
        confirmLabel={t("theme.studio.save")}
        cancelLabel={t("common.cancel")}
        busy={saving}
        onConfirm={(v) => void saveAs(v)}
        onCancel={() => setSaveAsOpen(false)}
      />
      <ConfirmDialog
        open={deleteOpen}
        title={t("theme.studio.deleteTitle", { name: currentName })}
        body={t("theme.studio.deleteBody")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        danger
        busy={saving}
        onConfirm={() => void deleteCurrent()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
