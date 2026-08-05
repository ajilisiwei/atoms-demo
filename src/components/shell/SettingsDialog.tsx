"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  useAppearance,
  type Appearance,
} from "@/components/appearance/AppearanceProvider";
import { useLocale, useT } from "@/lib/i18n";
import { api, ApiError } from "@/lib/client/api";

export type SettingsSection = "account" | "appearance" | "model" | "credits";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
  onLogout: () => void;
  // Section shown when the dialog opens (e.g. the credits pill deep-links here)
  initialSection?: SettingsSection;
}

const SECTIONS: { id: SettingsSection; labelKey: string }[] = [
  { id: "account", labelKey: "settings.account" },
  { id: "credits", labelKey: "settings.credits" },
  { id: "appearance", labelKey: "settings.appearance" },
  { id: "model", labelKey: "settings.model" },
];

interface LedgerEntry {
  id: string;
  delta: number;
  tokens: number | null;
  reason: string;
  createdAt: string;
}

interface CreditsData {
  credits: number;
  ledger: LedgerEntry[];
}

// Ledger reason → dictionary key (resolved with t() at render time).
const LEDGER_KEYS: Record<string, string> = {
  generation: "credits.generation",
  signup_grant: "credits.signupGrant",
};

// Hex values here are tiny decorative theme-preview swatches; they must not
// follow the appearance tokens, since each swatch previews a fixed theme.
const APPEARANCE_CARDS: {
  value: Appearance;
  labelKey: string;
  swatchClass?: string;
  swatchStyle?: CSSProperties;
}[] = [
  { value: "light", labelKey: "appearance.light", swatchClass: "bg-white" },
  { value: "dark", labelKey: "appearance.dark", swatchClass: "bg-zinc-900" },
  {
    value: "system",
    labelKey: "appearance.system",
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
  initialSection = "account",
}: SettingsDialogProps) {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const { appearance, setAppearance } = useAppearance();
  const { locale, setLocale } = useLocale();
  const t = useT();
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  // Adjust state during render when the prop changes (each open may deep-link
  // to a different section).
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setSection(initialSection);
      setCreditsData(null);
      setCreditsError(null);
    }
  }

  async function loadCredits() {
    setCreditsError(null);
    try {
      setCreditsData(await api<CreditsData>("/api/credits"));
    } catch (err) {
      setCreditsError(
        err instanceof ApiError ? err.message : t("credits.loadFailed")
      );
    }
  }

  function selectSection(next: SettingsSection) {
    setSection(next);
    if (next === "credits" && !creditsData) void loadCredits();
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Deep-linking straight to Credits needs its data fetched on open too;
  // deferred so no state updates run synchronously inside the effect.
  useEffect(() => {
    if (!open || initialSection !== "credits") return;
    const timer = setTimeout(() => void loadCredits(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSection]);

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
          aria-label={t("common.close")}
          className="absolute right-4 top-4 z-10 text-muted hover:text-foreground"
        >
          ✕
        </button>

        <nav className="w-44 shrink-0 border-r border-line bg-background p-3">
          <p className="px-2 pb-3 text-sm font-semibold">{t("settings.title")}</p>
          <ul className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => selectSection(s.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                    section === s.id
                      ? "bg-panel-2 font-medium"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t(s.labelKey)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 p-6 overflow-y-auto">
          {section === "account" && (
            <section>
              <h3 className="text-base font-semibold mb-4">
                {t("settings.account")}
              </h3>
              <div className="rounded-xl border border-line p-4 flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-full bg-panel-2 border border-line grid place-items-center text-sm font-medium uppercase">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{userEmail}</p>
                  <p className="text-xs text-muted">
                    {t("settings.emailAccount")}
                  </p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="mt-4 rounded-lg border border-line px-4 py-2 text-sm text-red-500 hover:bg-panel-2 transition-colors"
              >
                {t("settings.logout")}
              </button>
            </section>
          )}

          {section === "credits" && (
            <section>
              <h3 className="text-base font-semibold mb-4">
                {t("settings.credits")}
              </h3>
              {creditsError && (
                <p className="mb-3 text-sm text-red-500">{creditsError}</p>
              )}
              {creditsData ? (
                <>
                  <div className="rounded-xl border border-line p-4">
                    <p className="text-xs text-muted mb-1">
                      {t("credits.balance")}
                    </p>
                    <p
                      className={`text-3xl font-semibold ${
                        creditsData.credits <= 0 ? "text-red-500" : ""
                      }`}
                    >
                      {creditsData.credits}
                      <span className="ml-1.5 text-sm font-normal text-muted">
                        {t("credits.unit")}
                      </span>
                    </p>
                    {creditsData.credits <= 0 && (
                      <p className="mt-2 text-sm text-red-500">
                        {t("credits.outOfCredits")}
                      </p>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted leading-relaxed">
                    {t("credits.rule")}
                  </p>
                  {creditsData.ledger.length > 0 && (
                    <div className="mt-5">
                      <p className="text-xs text-muted uppercase tracking-wide mb-2">
                        {t("credits.recentActivity")}
                      </p>
                      <ul className="rounded-xl border border-line divide-y divide-line">
                        {creditsData.ledger.map((entry) => {
                          const reasonKey = LEDGER_KEYS[entry.reason];
                          return (
                            <li
                              key={entry.id}
                              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="truncate">
                                  {reasonKey ? t(reasonKey) : entry.reason}
                                </p>
                                <p className="text-xs text-muted">
                                  {new Date(entry.createdAt).toLocaleString(
                                    locale === "zh" ? "zh-CN" : "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                  {entry.tokens
                                    ? ` · ${t("credits.tokens", {
                                        count: entry.tokens.toLocaleString(),
                                      })}`
                                    : ""}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 font-medium ${
                                  entry.delta < 0 ? "" : "text-emerald-500"
                                }`}
                              >
                                {entry.delta > 0
                                  ? `+${entry.delta}`
                                  : entry.delta}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                !creditsError && (
                  <p className="text-sm text-muted">{t("common.loading")}</p>
                )
              )}
            </section>
          )}

          {section === "appearance" && (
            <section>
              <div className="flex items-center justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t("settings.language")}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t("settings.language.hint")}
                  </p>
                </div>
                <select
                  value={locale}
                  onChange={(e) =>
                    setLocale(e.target.value === "zh" ? "zh" : "en")
                  }
                  className="rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm outline-none"
                >
                  <option value="en">{t("language.english")}</option>
                  <option value="zh">{t("language.chinese")}</option>
                </select>
              </div>
              <div className="h-px bg-line my-5" />
              <p className="text-sm font-medium mb-3">
                {t("settings.appearance")}
              </p>
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
                    <p className="text-sm text-center">{t(card.labelKey)}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {section === "model" && (
            <section>
              <h3 className="text-base font-semibold mb-4">
                {t("settings.model")}
              </h3>
              <div className="rounded-xl border border-line p-4 flex flex-col gap-3">
                <InfoRow
                  label={t("model.generationModel")}
                  value="deepseek-v4-flash"
                  mono
                />
                <InfoRow label={t("model.provider")} value="DeepSeek" />
                <InfoRow
                  label={t("model.reasoning")}
                  value={t("model.reasoningValue")}
                />
              </div>
              <p className="mt-3 text-xs text-muted">
                {t("model.description")}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
