"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { commonDict } from "./dict/common";
import { shellDict } from "./dict/shell";
import { dashboardDict } from "./dict/dashboard";
import { builderDict } from "./dict/builder";

export type Locale = "en" | "zh";

export const LOCALE_COOKIE = "atomlet_locale";

export interface DictEntry {
  en: string;
  zh: string;
}

// Single merged dictionary; later spreads win on key collisions, so keep
// keys namespaced per domain (settings.*, credits.*, builder.* …).
const DICTIONARY: Record<string, DictEntry> = {
  ...commonDict,
  ...shellDict,
  ...dashboardDict,
  ...builderDict,
};

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  setLocale: () => {},
});

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  // initialLocale is read from the cookie on the server, so the first client
  // render matches SSR — no locale flash, no localStorage involved.
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLocale(): LanguageContextValue {
  return useContext(LanguageContext);
}

function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [name, v]) => text.replaceAll(`{${name}}`, String(v)),
    template
  );
}

// Translator hook: t(key, vars?) → localized string with {var} placeholders
// substituted. Falls back to the en string when zh is missing, and to the
// key itself when the entry is missing entirely.
export function useT(): (
  key: string,
  vars?: Record<string, string | number>
) => string {
  const { locale } = useLocale();
  return useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const entry = DICTIONARY[key];
      if (!entry) return key;
      const text = locale === "zh" ? entry.zh || entry.en : entry.en;
      return interpolate(text, vars);
    },
    [locale]
  );
}
