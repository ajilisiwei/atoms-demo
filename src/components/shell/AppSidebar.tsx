"use client";

import Link from "next/link";
import { UserMenu } from "./UserMenu";

interface AppSidebarProps {
  userEmail: string;
  projects: { id: string; name: string }[];
  activeProjectId?: string | null;
  onOpenSettings: () => void;
  onLogout: () => void;
}

const MAX_RECENT = 8;

const ITEM_CLASS =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-panel-2 transition-colors";

function itemClass(active: boolean): string {
  return active ? `${ITEM_CLASS} bg-panel-2 font-medium` : ITEM_CLASS;
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

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6" />
    </svg>
  );
}

export function AppSidebar({
  userEmail,
  projects,
  activeProjectId,
  onOpenSettings,
  onLogout,
}: AppSidebarProps) {
  const recent = projects.slice(0, MAX_RECENT);

  return (
    <aside className="h-full w-[248px] shrink-0 flex flex-col border-r border-line">
      <Link href="/" className="flex items-center gap-1.5 px-4 py-4 text-sm">
        <span className="text-accent-2">◉</span>
        <span className="font-semibold">Atomlet</span>
      </Link>

      <nav className="flex flex-col gap-0.5 px-2">
        <Link href="/dashboard" className={itemClass(!activeProjectId)}>
          <HouseIcon />
          Home
        </Link>
        <Link href="/dashboard#apps" className={itemClass(false)}>
          <GridIcon />
          My apps
        </Link>
      </nav>

      {recent.length > 0 && (
        <>
          <p className="px-5 pt-5 pb-1.5 text-xs text-muted uppercase tracking-wide">
            Recent
          </p>
          <nav className="flex flex-col gap-0.5 px-2 overflow-y-auto">
            {recent.map((project) => (
              <Link
                key={project.id}
                href={`/builder/${project.id}`}
                title={project.name}
                className={itemClass(project.id === activeProjectId)}
              >
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
              </Link>
            ))}
          </nav>
        </>
      )}

      <div className="flex-1" />

      <div className="border-t border-line px-3 py-3 flex items-center gap-2.5">
        <UserMenu
          userEmail={userEmail}
          onOpenSettings={onOpenSettings}
          onLogout={onLogout}
        />
        <span className="text-xs text-muted truncate flex-1" title={userEmail}>
          {userEmail}
        </span>
        <button
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Open settings"
          className="w-8 h-8 shrink-0 rounded-lg hover:bg-panel-2 grid place-items-center text-muted hover:text-foreground transition-colors"
        >
          <GearIcon />
        </button>
      </div>
    </aside>
  );
}
