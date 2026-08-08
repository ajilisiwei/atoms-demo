"use client";

// Editor settings popover, opened from the activity bar's gear. Every change
// applies live to all open editors and persists in localStorage.

import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n";
import {
  resetEditorSettings,
  updateEditorSettings,
  useEditorSettings,
  type EditorSettings,
} from "@/lib/editor-settings";

interface EditorSettingsPanelProps {
  anchor: { x: number; y: number };
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex items-center rounded-full border border-line bg-panel-2/60 p-0.5">
        {children}
      </div>
    </div>
  );
}

function Seg<T extends string | number | boolean>({
  value,
  current,
  label,
  onPick,
}: {
  value: T;
  current: T;
  label: string;
  onPick: (v: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      className={`rounded-full px-2 py-0.5 text-[11px] transition-colors ${
        value === current
          ? "bg-panel text-foreground shadow-sm"
          : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function EditorSettingsPanel({ anchor, onClose }: EditorSettingsPanelProps) {
  const t = useT();
  const s = useEditorSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("click", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const set = (patch: Partial<EditorSettings>) => updateEditorSettings(patch);

  return (
    <div
      ref={panelRef}
      style={{ left: anchor.x, top: Math.min(anchor.y, window.innerHeight - 340) }}
      className="fixed z-50 w-72 rounded-2xl border border-line bg-panel p-4 shadow-xl"
    >
      <p className="mb-2 text-sm font-medium">{t("builder.editorSettings.title")}</p>

      <Row label={t("builder.editorSettings.fontSize")}>
        {([12, 13, 14, 16] as const).map((v) => (
          <Seg key={v} value={v} current={s.fontSize} label={`${v}`} onPick={(x) => set({ fontSize: x })} />
        ))}
      </Row>

      <Row label={t("builder.editorSettings.fontFamily")}>
        {(
          [
            ["system", t("builder.editorSettings.fontSystem")],
            ["clean", t("builder.editorSettings.fontClean")],
            ["classic", t("builder.editorSettings.fontClassic")],
          ] as const
        ).map(([v, label]) => (
          <Seg key={v} value={v} current={s.fontFamily} label={label} onPick={(x) => set({ fontFamily: x })} />
        ))}
      </Row>

      <Row label={t("builder.editorSettings.lineHeight")}>
        {(
          [
            [1.4, t("builder.editorSettings.compact")],
            [1.6, t("builder.editorSettings.normal")],
            [1.8, t("builder.editorSettings.relaxed")],
          ] as const
        ).map(([v, label]) => (
          <Seg key={v} value={v} current={s.lineHeight} label={label} onPick={(x) => set({ lineHeight: x })} />
        ))}
      </Row>

      <Row label={t("builder.editorSettings.tabSize")}>
        {([2, 4] as const).map((v) => (
          <Seg key={v} value={v} current={s.tabSize} label={`${v}`} onPick={(x) => set({ tabSize: x })} />
        ))}
      </Row>

      <Row label={t("builder.editorSettings.lineWrap")}>
        <Seg value={false} current={s.lineWrap} label={t("builder.editorSettings.off")} onPick={() => set({ lineWrap: false })} />
        <Seg value={true} current={s.lineWrap} label={t("builder.editorSettings.on")} onPick={() => set({ lineWrap: true })} />
      </Row>

      <Row label={t("builder.editorSettings.theme")}>
        {(
          [
            ["auto", t("builder.editorSettings.themeAuto")],
            ["light", t("builder.editorSettings.themeLight")],
            ["dark", t("builder.editorSettings.themeDark")],
          ] as const
        ).map(([v, label]) => (
          <Seg key={v} value={v} current={s.theme} label={label} onPick={(x) => set({ theme: x })} />
        ))}
      </Row>

      <button
        type="button"
        onClick={resetEditorSettings}
        className="mt-2 text-xs text-muted underline underline-offset-2 hover:text-foreground transition-colors"
      >
        {t("builder.editorSettings.reset")}
      </button>
    </div>
  );
}
