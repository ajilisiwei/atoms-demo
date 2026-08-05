"use client";

import { useEffect, useRef, useState } from "react";
import {
  useAppearance,
  type Appearance,
} from "@/components/appearance/AppearanceProvider";

interface UserMenuProps {
  userEmail: string;
  onOpenSettings: () => void;
  onLogout: () => void;
}

const APPEARANCE_SEGMENTS: { value: Appearance; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

function GearIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-muted"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function UserMenu({ userEmail, onOpenSettings, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { appearance, setAppearance } = useAppearance();

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initial = userEmail.slice(0, 1);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={userEmail}
        className="w-9 h-9 rounded-full bg-panel-2 border border-line text-sm font-medium uppercase grid place-items-center hover:opacity-80 transition-opacity"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full mb-2 left-0 w-60 rounded-2xl border border-line bg-panel shadow-xl p-1.5 z-50"
        >
          <div className="px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 shrink-0 rounded-full bg-panel-2 border border-line grid place-items-center text-sm font-medium uppercase">
              {initial}
            </div>
            <span className="flex-1 min-w-0 text-sm truncate">{userEmail}</span>
          </div>

          <div className="h-px bg-line my-1" />

          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-panel-2 text-left transition-colors"
          >
            <GearIcon />
            Settings
          </button>

          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-sm">Appearance</span>
            <div className="flex items-center gap-0.5">
              {APPEARANCE_SEGMENTS.map((seg) => (
                <button
                  key={seg.value}
                  onClick={() => setAppearance(seg.value)}
                  className={`rounded-md px-2 py-1 text-xs transition-colors ${
                    appearance === seg.value
                      ? "bg-panel-2 font-medium"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-line my-1" />

          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-panel-2 text-left text-red-500 transition-colors"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
