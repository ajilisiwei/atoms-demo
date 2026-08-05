"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Logo, LogoMark } from "@/components/Logo";
import { UserMenu } from "./UserMenu";

interface AppSidebarProps {
  userEmail: string;
  projects: { id: string; name: string }[];
  activeProjectId?: string | null;
  // Which top-level nav item is active
  activeNav?: "home" | "apps" | "discover";
  onOpenSettings: () => void;
  onLogout: () => void;
}

const MAX_RECENT = 8;
const COLLAPSED_STORAGE_KEY = "atomlet:sidebar-collapsed";

function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    // localStorage unavailable (e.g. blocked) — default to expanded
    return false;
  }
}

function writeStoredCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // localStorage unavailable — the in-memory state still applies
  }
}

const ITEM_BASE =
  "flex items-center rounded-lg py-2 text-sm text-foreground hover:bg-panel-2 transition-colors";

function itemClass(active: boolean, collapsed: boolean): string {
  const layout = collapsed ? "justify-center" : "gap-2.5 px-3";
  return active
    ? `${ITEM_BASE} ${layout} bg-panel-2 font-medium`
    : `${ITEM_BASE} ${layout}`;
}

function CompassIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </svg>
  );
}

function HouseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

// Standard cog (lucide "settings") rather than a sun-like radial glyph.
function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Lucide "panel-left": frame with the sidebar column marked.
function PanelLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

export function AppSidebar({
  userEmail,
  projects,
  activeProjectId,
  activeNav,
  onOpenSettings,
  onLogout,
}: AppSidebarProps) {
  const t = useT();
  const recent = projects.slice(0, MAX_RECENT);
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);

  function setCollapsedPersisted(next: boolean) {
    setCollapsed(next);
    writeStoredCollapsed(next);
  }

  return (
    <aside
      className={`h-full shrink-0 flex flex-col border-r border-line transition-[width] duration-200 ${
        collapsed ? "w-[64px]" : "w-[248px]"
      }`}
    >
      {collapsed ? (
        <div className="flex justify-center py-4">
          <button
            onClick={() => setCollapsedPersisted(false)}
            aria-label={t("shell.expandSidebar")}
            title={t("shell.expandSidebar")}
            className="w-9 h-9 rounded-lg grid place-items-center hover:bg-panel-2 transition-colors"
          >
            <LogoMark size={22} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-4 py-4 text-sm">
          <Link href="/dashboard" className="flex items-center">
            <Logo size={22} />
          </Link>
          <button
            onClick={() => setCollapsedPersisted(true)}
            aria-label={t("shell.collapseSidebar")}
            title={t("shell.collapseSidebar")}
            className="ml-auto w-7 h-7 shrink-0 rounded-md grid place-items-center text-muted hover:text-foreground hover:bg-panel-2 transition-colors"
          >
            <PanelLeftIcon />
          </button>
        </div>
      )}

      <nav className="flex flex-col gap-0.5 px-2">
        <Link
          href="/dashboard"
          title={collapsed ? t("shell.home") : undefined}
          className={itemClass(activeNav === "home" && !activeProjectId, collapsed)}
        >
          <HouseIcon />
          {!collapsed && t("shell.home")}
        </Link>
        <Link
          href="/apps"
          title={collapsed ? t("shell.myApps") : undefined}
          className={itemClass(activeNav === "apps", collapsed)}
        >
          <GridIcon />
          {!collapsed && t("shell.myApps")}
        </Link>
        <Link
          href="/discover"
          title={collapsed ? t("discover.nav") : undefined}
          className={itemClass(activeNav === "discover", collapsed)}
        >
          <CompassIcon />
          {!collapsed && t("discover.nav")}
        </Link>
      </nav>

      {!collapsed && recent.length > 0 && (
        <>
          <p className="px-5 pt-5 pb-1.5 text-xs text-muted uppercase tracking-wide">
            {t("shell.recent")}
          </p>
          <nav className="flex flex-col gap-0.5 px-2 overflow-y-auto">
            {recent.map((project) => (
              <Link
                key={project.id}
                href={`/builder/${project.id}`}
                title={project.name}
                className={itemClass(project.id === activeProjectId, false)}
              >
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
              </Link>
            ))}
          </nav>
        </>
      )}

      <div className="flex-1" />

      <div
        className={`border-t border-line py-3 flex items-center ${
          collapsed ? "justify-center" : "px-3 gap-2.5"
        }`}
      >
        <UserMenu
          userEmail={userEmail}
          onOpenSettings={onOpenSettings}
          onLogout={onLogout}
        />
        {!collapsed && (
          <>
            <span className="text-xs text-muted truncate flex-1" title={userEmail}>
              {userEmail}
            </span>
            <button
              onClick={onOpenSettings}
              title={t("settings.title")}
              aria-label={t("shell.openSettings")}
              className="w-8 h-8 shrink-0 rounded-lg hover:bg-panel-2 grid place-items-center text-muted hover:text-foreground transition-colors"
            >
              <GearIcon />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
