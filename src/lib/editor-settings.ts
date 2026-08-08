"use client";

// Global code-editor settings, shared by every CodeEditor instance and
// persisted in localStorage. A tiny external store keeps the panel and all
// open editors in sync without prop-drilling.

import { useSyncExternalStore } from "react";

export interface EditorSettings {
  fontSize: 12 | 13 | 14 | 16;
  // Keys into FONT_STACKS — only system-safe monospace stacks (no webfonts).
  fontFamily: "system" | "classic" | "clean";
  lineHeight: 1.4 | 1.6 | 1.8;
  tabSize: 2 | 4;
  lineWrap: boolean;
  // "auto" follows the app appearance; light/dark force a scheme.
  theme: "auto" | "light" | "dark";
}

export const FONT_STACKS: Record<EditorSettings["fontFamily"], string> = {
  system: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
  clean: "Menlo, Consolas, 'DejaVu Sans Mono', ui-monospace, monospace",
  classic: "'Courier New', Courier, ui-monospace, monospace",
};

export const EDITOR_SETTINGS_DEFAULTS: EditorSettings = {
  fontSize: 12,
  fontFamily: "system",
  lineHeight: 1.6,
  tabSize: 2,
  lineWrap: false,
  theme: "auto",
};

const STORAGE_KEY = "atomlet:editor-settings";

function load(): EditorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EDITOR_SETTINGS_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<EditorSettings>;
    return { ...EDITOR_SETTINGS_DEFAULTS, ...parsed };
  } catch {
    return EDITOR_SETTINGS_DEFAULTS;
  }
}

let current: EditorSettings =
  typeof window === "undefined" ? EDITOR_SETTINGS_DEFAULTS : load();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEditorSettings(): EditorSettings {
  return current;
}

export function updateEditorSettings(patch: Partial<EditorSettings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Private mode etc. — settings still apply for the session.
  }
  for (const l of listeners) l();
}

export function resetEditorSettings(): void {
  current = EDITOR_SETTINGS_DEFAULTS;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  for (const l of listeners) l();
}

export function useEditorSettings(): EditorSettings {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => EDITOR_SETTINGS_DEFAULTS
  );
}
