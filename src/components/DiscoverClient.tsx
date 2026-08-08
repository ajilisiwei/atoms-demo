"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useT } from "@/lib/i18n";
import { findAgent } from "@/lib/agents";
import type { AgentRecord } from "@/lib/agent-types";
import { Logo } from "@/components/Logo";
import { AppSidebar, type ProjectChange, type SidebarProject } from "@/components/shell/AppSidebar";
import { MobileSidebar } from "@/components/shell/MobileSidebar";
import { SettingsDialog } from "@/components/shell/SettingsDialog";

export interface DiscoverItem {
  id: string;
  name: string;
  slug: string;
  agentId: string | null;
  remixCount: number;
  updatedAt: string;
  author: string;
  mine: boolean;
}

interface DiscoverClientProps {
  userEmail: string;
  agents: AgentRecord[];
  sidebarProjects: SidebarProject[];
  initialItems: DiscoverItem[];
}

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function RemixIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 2.5 21 6.5l-4 4" />
      <path d="M3 11V10a3.5 3.5 0 0 1 3.5-3.5H21" />
      <path d="M7 21.5 3 17.5l4-4" />
      <path d="M21 13v1a3.5 3.5 0 0 1-3.5 3.5H3" />
    </svg>
  );
}

const emptySubscribe = () => () => {};

// Live thumbnail: the published document rendered at half scale inside a
// fixed-ratio window (pointer events off so the card handles clicks).
// A theme-following skeleton sits under the iframe, which fades in on load —
// the document's white flash during load stays fully covered. `version`
// cache-busts per republish so unchanged apps hit the HTTP cache.
// The iframe mounts only after hydration: with SSR markup it starts loading
// before React attaches listeners, and its opaque origin (CSP sandbox) makes
// a missed load event undetectable afterwards.
function LivePreview({
  slug,
  title,
  version,
}: {
  slug: string;
  title: string;
  version: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl border-b border-line bg-panel-2">
      {!loaded && (
        <div
          className="absolute inset-0 grid place-items-center animate-pulse"
          aria-hidden="true"
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted/50"
          >
            <rect x="3" y="4" width="18" height="16" rx="2.5" />
            <path d="M3 9h18" />
            <circle cx="6.2" cy="6.5" r="0.3" />
            <circle cx="8.7" cy="6.5" r="0.3" />
          </svg>
        </div>
      )}
      {hydrated && (
        <iframe
          src={`/p/${slug}/raw?v=${version}`}
          title={title}
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          onLoad={() => setLoaded(true)}
          className={`pointer-events-none absolute left-0 top-0 h-[200%] w-[200%] origin-top-left scale-50 border-0 transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}

export function DiscoverClient({
  userEmail,
  agents,
  sidebarProjects,
  initialItems,
}: DiscoverClientProps) {
  const t = useT();
  const router = useRouter();
  const [items] = useState(initialItems);
  const [sideProjects, setSideProjects] = useState(sidebarProjects);

  function handleProjectChanged(change: ProjectChange) {
    if (change.type === "delete") {
      setSideProjects((prev) => prev.filter((p) => p.id !== change.id));
    } else if (change.type === "rename") {
      setSideProjects((prev) =>
        prev.map((p) => (p.id === change.id ? { ...p, name: change.name } : p))
      );
    } else {
      setSideProjects((prev) =>
        prev.map((p) => (p.id === change.id ? { ...p, favorite: change.favorite } : p))
      );
    }
  }
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [remixingId, setRemixingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remix(item: DiscoverItem) {
    if (remixingId) return;
    setRemixingId(item.id);
    setError(null);
    try {
      const { project } = await api<{ project: { id: string } }>(
        `/api/projects/${item.id}/remix`,
        { method: "POST" }
      );
      router.push(`/builder/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("discover.remixFailed"));
      setRemixingId(null);
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const sidebarProps = {
    userEmail,
    projects: sideProjects,
    onProjectChanged: handleProjectChanged,
    onActionError: setError,
    activeNav: "discover" as const,
    onLogout: () => void logout(),
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="hidden lg:flex">
        <AppSidebar {...sidebarProps} onOpenSettings={() => setSettingsOpen(true)} />
      </div>
      <MobileSidebar
        {...sidebarProps}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onOpenSettings={() => {
          setMobileNavOpen(false);
          setSettingsOpen(true);
        }}
      />

      <main className="flex-1 min-w-0 overflow-y-auto">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label={t("common.openMenu")}
              className="w-9 h-9 rounded-lg grid place-items-center text-muted hover:text-foreground hover:bg-panel-2 transition-colors"
            >
              <MenuIcon />
            </button>
            <Link href="/dashboard" className="text-sm">
              <Logo size={20} />
            </Link>
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10">
          <h1 className="text-xl font-semibold mb-1.5">{t("discover.title")}</h1>
          <p className="text-sm text-muted mb-8 max-w-xl">{t("discover.subtitle")}</p>

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted text-sm">
              {t("discover.empty")}
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const agent = findAgent(agents, item.agentId);
                const busy = remixingId === item.id;
                return (
                  <li
                    key={item.id}
                    className="group rounded-2xl border border-line bg-panel overflow-hidden hover:border-accent-2/50 transition-colors"
                  >
                    <a
                      href={`/p/${item.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      title={t("discover.open")}
                      className="block"
                    >
                      <LivePreview
                        slug={item.slug}
                        title={item.name}
                        version={String(new Date(item.updatedAt).getTime())}
                      />
                    </a>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium leading-snug line-clamp-1 flex-1">
                          {item.name}
                        </h3>
                        {agent && (
                          <span
                            className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full border border-line"
                            title={agent.name}
                          >
                            <Image
                              src={agent.avatarUrl}
                              alt={agent.name}
                              fill
                              sizes="20px"
                              className="object-cover"
                            />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {item.mine
                          ? t("discover.yours")
                          : t("discover.by", { name: item.author })}
                        {item.remixCount > 0 && (
                          <span className="ml-2">
                            {t("discover.remixes", { count: item.remixCount })}
                          </span>
                        )}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => void remix(item)}
                          disabled={remixingId !== null}
                          className="flex items-center gap-1.5 rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-85 transition-opacity disabled:opacity-40"
                        >
                          <RemixIcon />
                          {busy ? t("discover.remixing") : t("discover.remix")}
                        </button>
                        <a
                          href={`/p/${item.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-foreground hover:bg-panel-2 transition-colors"
                        >
                          {t("discover.open")} ↗
                        </a>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userEmail={userEmail}
        onLogout={() => void logout()}
      />
    </div>
  );
}
