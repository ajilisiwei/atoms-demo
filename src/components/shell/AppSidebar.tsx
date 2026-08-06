"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useT } from "@/lib/i18n";
import { Logo, LogoMark } from "@/components/Logo";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InputDialog } from "@/components/InputDialog";
import { UserMenu } from "./UserMenu";

export interface SidebarProject {
  id: string;
  name: string;
  favorite?: boolean;
}

export type ProjectChange =
  | { type: "rename"; id: string; name: string }
  | { type: "favorite"; id: string; favorite: boolean }
  | { type: "delete"; id: string };

interface AppSidebarProps {
  userEmail: string;
  projects: SidebarProject[];
  activeProjectId?: string | null;
  // Which top-level nav item is active
  activeNav?: "home" | "apps" | "discover";
  onOpenSettings: () => void;
  onLogout: () => void;
  // Notifies the host page after a sidebar action succeeded, so other views
  // (project grids etc.) can stay in sync.
  onProjectChanged?: (change: ProjectChange) => void;
  onActionError?: (message: string) => void;
}

const MAX_RECENT = 8;
const COLLAPSED_STORAGE_KEY = "atomlet:sidebar-collapsed";
const FAV_OPEN_STORAGE_KEY = "atomlet:sidebar-fav-open";

function readStoredFlag(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : raw === "1";
  } catch {
    return fallback;
  }
}

function writeStoredFlag(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // localStorage unavailable — the in-memory state still applies
  }
}

const ITEM_BASE =
  "group flex items-center rounded-lg py-2 text-sm text-foreground hover:bg-panel-2 transition-colors";

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

function PanelLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.8l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9l5.9-.8z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform ${open ? "" : "-rotate-90"}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

interface MenuState {
  projectId: string;
  x: number;
  y: number;
}

export function AppSidebar({
  userEmail,
  projects,
  activeProjectId,
  activeNav,
  onOpenSettings,
  onLogout,
  onProjectChanged,
  onActionError,
}: AppSidebarProps) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(() =>
    readStoredFlag(COLLAPSED_STORAGE_KEY, false)
  );
  const [favOpen, setFavOpen] = useState(() => readStoredFlag(FAV_OPEN_STORAGE_KEY, true));
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [renameTarget, setRenameTarget] = useState<SidebarProject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SidebarProject | null>(null);
  const [busy, setBusy] = useState(false);

  const favorites = projects.filter((p) => p.favorite);
  const recent = projects.filter((p) => !p.favorite).slice(0, MAX_RECENT);
  const menuProject = menu ? (projects.find((p) => p.id === menu.projectId) ?? null) : null;

  function setCollapsedPersisted(next: boolean) {
    setCollapsed(next);
    writeStoredFlag(COLLAPSED_STORAGE_KEY, next);
  }

  function setFavOpenPersisted(next: boolean) {
    setFavOpen(next);
    writeStoredFlag(FAV_OPEN_STORAGE_KEY, next);
  }

  useEffect(() => {
    if (!menu) return;
    // "click" (not "mousedown"): item handlers must run before this global
    // close unmounts the menu — clicks bubble target-first, so the action
    // fires and the document listener merely cleans up afterwards.
    function close() {
      setMenu(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  function openMenu(e: React.MouseEvent, project: SidebarProject) {
    e.preventDefault();
    e.stopPropagation();
    // Belt and suspenders: keep this very click from reaching the global
    // close listener regardless of how the framework delegates events.
    e.nativeEvent.stopImmediatePropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu((prev) =>
      prev?.projectId === project.id
        ? null
        : { projectId: project.id, x: rect.right - 176, y: rect.bottom + 6 }
    );
  }

  function fail(err: unknown) {
    onActionError?.(err instanceof ApiError ? err.message : t("shell.actionFailed"));
  }

  async function toggleFavorite(project: SidebarProject) {
    setMenu(null);
    const next = !project.favorite;
    try {
      await api(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ favorite: next }),
      });
      onProjectChanged?.({ type: "favorite", id: project.id, favorite: next });
    } catch (err) {
      fail(err);
    }
  }

  async function confirmRename(name: string) {
    if (!renameTarget) return;
    setBusy(true);
    try {
      await api(`/api/projects/${renameTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      onProjectChanged?.({ type: "rename", id: renameTarget.id, name });
      setRenameTarget(null);
    } catch (err) {
      fail(err);
      setRenameTarget(null);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api(`/api/projects/${deleteTarget.id}`, { method: "DELETE" });
      onProjectChanged?.({ type: "delete", id: deleteTarget.id });
      setDeleteTarget(null);
    } catch (err) {
      fail(err);
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  function renderProjectItem(project: SidebarProject) {
    return (
      <Link
        key={project.id}
        href={`/builder/${project.id}`}
        title={project.name}
        className={`${itemClass(project.id === activeProjectId, false)} pr-1.5`}
      >
        <span className="min-w-0 flex-1 truncate">{project.name}</span>
        <button
          onClick={(e) => openMenu(e, project)}
          title={t("shell.moreActions")}
          aria-label={t("shell.moreActions")}
          className={`h-6 w-6 shrink-0 rounded-md grid place-items-center text-muted hover:text-foreground hover:bg-panel transition-all ${
            menu?.projectId === project.id
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <DotsIcon />
        </button>
      </Link>
    );
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

      {!collapsed && (favorites.length > 0 || recent.length > 0) && (
        <div className="min-h-0 overflow-y-auto pb-2">
          {favorites.length > 0 && (
            <>
              <button
                onClick={() => setFavOpenPersisted(!favOpen)}
                className="flex w-full items-center gap-1.5 px-5 pt-5 pb-1.5 text-xs text-muted uppercase tracking-wide hover:text-foreground transition-colors"
              >
                {t("shell.favorites")} ({favorites.length})
                <ChevronIcon open={favOpen} />
              </button>
              {favOpen && (
                <nav className="flex flex-col gap-0.5 px-2">
                  {favorites.map(renderProjectItem)}
                </nav>
              )}
            </>
          )}
          {recent.length > 0 && (
            <>
              <p className="px-5 pt-5 pb-1.5 text-xs text-muted uppercase tracking-wide">
                {t("shell.recent")}
              </p>
              <nav className="flex flex-col gap-0.5 px-2">
                {recent.map(renderProjectItem)}
              </nav>
            </>
          )}
        </div>
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

      {menu && menuProject && (
        <div
          className="fixed z-[70] w-44 rounded-xl border border-line bg-panel p-1.5 shadow-xl"
          style={{ left: Math.max(8, menu.x), top: menu.y }}
        >
          <button
            onClick={() => void toggleFavorite(menuProject)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-panel-2 transition-colors text-left"
          >
            <span className={menuProject.favorite ? "text-amber-500" : "text-muted"}>
              <StarIcon filled={Boolean(menuProject.favorite)} />
            </span>
            {menuProject.favorite ? t("shell.unfavorite") : t("shell.favorite")}
          </button>
          <button
            onClick={() => {
              setMenu(null);
              setRenameTarget(menuProject);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-panel-2 transition-colors text-left"
          >
            <span className="text-muted">
              <PencilIcon />
            </span>
            {t("shell.rename")}
          </button>
          <div className="my-1 h-px bg-line" />
          <button
            onClick={() => {
              setMenu(null);
              setDeleteTarget(menuProject);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-panel-2 transition-colors text-left"
          >
            <TrashIcon />
            {t("common.delete")}
          </button>
        </div>
      )}

      <InputDialog
        open={renameTarget !== null}
        title={t("shell.renameTitle")}
        initialValue={renameTarget?.name ?? ""}
        confirmLabel={t("shell.save")}
        cancelLabel={t("common.cancel")}
        busy={busy}
        onConfirm={(name) => void confirmRename(name)}
        onCancel={() => setRenameTarget(null)}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("common.confirmDeleteTitle")}
        body={
          deleteTarget
            ? t("common.confirmDeleteBody", { name: deleteTarget.name })
            : undefined
        }
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        danger
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </aside>
  );
}
