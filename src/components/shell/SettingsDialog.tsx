"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  useAppearance,
  type Appearance,
} from "@/components/appearance/AppearanceProvider";

type SettingsSection = "account" | "appearance" | "model";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
  onLogout: () => void;
}

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "appearance", label: "Appearance" },
  { id: "model", label: "Model" },
];

// Hex values here are tiny decorative theme-preview swatches; they must not
// follow the appearance tokens, since each swatch previews a fixed theme.
const APPEARANCE_CARDS: {
  value: Appearance;
  label: string;
  swatchClass?: string;
  swatchStyle?: CSSProperties;
}[] = [
  { value: "light", label: "Light", swatchClass: "bg-white" },
  { value: "dark", label: "Dark", swatchClass: "bg-zinc-900" },
  {
    value: "system",
    label: "System",
    swatchStyle: {
      background: "linear-gradient(to right, #ffffff 50%, #18181b 50%)",
    },
  },
];

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted">{label}</span>
      <span className={mono ? "font-mono text-sm" : "text-sm"}>{value}</span>
    </div>
  );
}

export function SettingsDialog({
  open,
  onClose,
  userEmail,
  onLogout,
}: SettingsDialogProps) {
  const [section, setSection] = useState<SettingsSection>("account");
  const { appearance, setAppearance } = useAppearance();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const initial = userEmail.slice(0, 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl h-[420px] rounded-2xl border border-line bg-panel flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="absolute right-4 top-4 z-10 text-muted hover:text-foreground"
        >
          ✕
        </button>

        <nav className="w-44 shrink-0 border-r border-line bg-background p-3">
          <p className="px-2 pb-3 text-sm font-semibold">Settings</p>
          <ul className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSection(s.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                    section === s.id
                      ? "bg-panel-2 font-medium"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 p-6 overflow-y-auto">
          {section === "account" && (
            <section>
              <h3 className="text-base font-semibold mb-4">Account</h3>
              <div className="rounded-xl border border-line p-4 flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-full bg-panel-2 border border-line grid place-items-center text-sm font-medium uppercase">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{userEmail}</p>
                  <p className="text-xs text-muted">Email account</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="mt-4 rounded-lg border border-line px-4 py-2 text-sm text-red-500 hover:bg-panel-2 transition-colors"
              >
                Log out
              </button>
            </section>
          )}

          {section === "appearance" && (
            <section>
              <h3 className="text-base font-semibold mb-4">Appearance</h3>
              <div className="grid grid-cols-3 gap-3">
                {APPEARANCE_CARDS.map((card) => (
                  <button
                    key={card.value}
                    onClick={() => setAppearance(card.value)}
                    className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                      appearance === card.value
                        ? "border-accent-2 ring-1 ring-accent-2"
                        : "border-line"
                    }`}
                  >
                    <div
                      className={`h-10 rounded-md mb-2 border border-line ${card.swatchClass ?? ""}`}
                      style={card.swatchStyle}
                    />
                    <p className="text-sm text-center">{card.label}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {section === "model" && (
            <section>
              <h3 className="text-base font-semibold mb-4">Model</h3>
              <div className="rounded-xl border border-line p-4 flex flex-col gap-3">
                <InfoRow label="Generation model" value="deepseek-v4-flash" mono />
                <InfoRow label="Provider" value="DeepSeek" />
                <InfoRow label="Reasoning" value="disabled for low latency" />
              </div>
              <p className="mt-3 text-xs text-muted">
                This model powers app generation — it plans, writes and revises
                the code behind every app you build from prompts.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
