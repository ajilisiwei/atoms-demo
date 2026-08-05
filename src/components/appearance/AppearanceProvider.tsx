"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Appearance = "light" | "dark" | "system";

const STORAGE_KEY = "atomlet:appearance";

interface AppearanceContextValue {
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
}

const AppearanceContext = createContext<AppearanceContextValue>({
  appearance: "system",
  setAppearance: () => {},
});

function readStored(): Appearance {
  if (typeof window === "undefined") return "system";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>(readStored);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = appearance === "dark" || (appearance === "system" && mql.matches);
      document.documentElement.dataset.appearance = dark ? "dark" : "light";
    };
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [appearance]);

  const setAppearance = (a: Appearance) => {
    window.localStorage.setItem(STORAGE_KEY, a);
    setAppearanceState(a);
  };

  return (
    <AppearanceContext.Provider value={{ appearance, setAppearance }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  return useContext(AppearanceContext);
}

// Runs before paint (inlined in the root layout) so the first frame already
// has the right appearance — no light/dark flash.
export const APPEARANCE_INIT_SCRIPT = `(function(){try{var a=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)})||"system";var d=a==="dark"||(a==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.appearance=d?"dark":"light";}catch(e){document.documentElement.dataset.appearance="light";}})();`;
