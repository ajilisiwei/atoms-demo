"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { PENDING_PROMPT_KEY } from "@/components/HeroPrompt";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { SettingsDialog } from "@/components/shell/SettingsDialog";
import { PromptComposer } from "@/components/composer/PromptComposer";

export const AUTORUN_PREFIX = "atomlet:autorun:";

export interface ProjectListItem {
  id: string;
  name: string;
  slug: string | null;
  published: boolean;
  versionCount: number;
  updatedAt: string;
}

interface DashboardClientProps {
  userEmail: string;
  displayName: string;
  initialProjects: ProjectListItem[];
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function DashboardClient({
  userEmail,
  displayName,
  initialProjects,
}: DashboardClientProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeName, setThemeName] = useState<string | null>(null);
  const autoStarted = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function createProject(initialPrompt?: string, theme?: string | null) {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const name = initialPrompt ? initialPrompt.slice(0, 60) : undefined;
      const { project } = await api<{ project: { id: string } }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (initialPrompt) {
        sessionStorage.setItem(
          `${AUTORUN_PREFIX}${project.id}`,
          JSON.stringify({ prompt: initialPrompt, themeName: theme ?? null })
        );
      }
      router.push(`/builder/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create project");
      setCreating(false);
    }
  }

  // If the user typed a prompt on the landing page before signing up, pick it
  // up and jump straight into the builder. Deferred via setTimeout so no state
  // updates happen synchronously inside the effect; no cleanup on purpose —
  // clearing the timer would drop the autorun under Strict Mode's remount,
  // so the mountedRef guards instead.
  useEffect(() => {
    if (autoStarted.current) return;
    const pending = sessionStorage.getItem(PENDING_PROMPT_KEY);
    if (pending) {
      autoStarted.current = true;
      sessionStorage.removeItem(PENDING_PROMPT_KEY);
      setTimeout(() => {
        if (mountedRef.current) void createProject(pending);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteProject(id: string) {
    const target = projects.find((p) => p.id === id);
    if (!target) return;
    if (!window.confirm(`Delete "${target.name}"? This cannot be undone.`)) return;
    try {
      await api(`/api/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete project");
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="hidden lg:flex">
        <AppSidebar
          userEmail={userEmail}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          onOpenSettings={() => setSettingsOpen(true)}
          onLogout={() => void logout()}
        />
      </div>

      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile top bar (sidebar hidden below lg) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-line">
          <Link href="/" className="text-sm font-semibold">
            <span className="text-accent-2">◉</span> Atomlet
          </Link>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-sm text-muted hover:text-foreground"
          >
            Settings
          </button>
        </header>

        <section className="flex flex-col items-center px-6 pt-20 sm:pt-28 pb-14 text-center">
          <h1 className="font-display text-3xl sm:text-[44px] leading-tight tracking-tight">
            What will you create, {displayName}?
          </h1>
          <div className="mt-9 w-full max-w-2xl text-left">
            <PromptComposer
              placeholder="Describe the app you want to build…"
              disabled={creating}
              themeValue={themeName}
              onThemeChange={setThemeName}
              onSubmit={(p) => void createProject(p, themeName)}
              autoFocus
            />
          </div>
          {creating && (
            <p className="mt-4 text-sm text-muted">Creating your project…</p>
          )}
          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </section>

        <section id="apps" className="mx-auto w-full max-w-5xl px-6 pb-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">
              My apps
              <span className="ml-1.5 text-muted">({projects.length})</span>
            </h2>
            <button
              onClick={() => void createProject()}
              className="text-sm text-accent-2 hover:underline"
              disabled={creating}
            >
              + Blank project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted text-sm">
              No apps yet — describe one above to get started.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="group rounded-2xl border border-line bg-panel p-5 hover:border-accent-2/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/builder/${p.id}`} className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate group-hover:text-accent-2 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-xs text-muted mt-1">
                        {p.versionCount} version{p.versionCount === 1 ? "" : "s"} ·{" "}
                        {timeAgo(p.updatedAt)}
                      </p>
                    </Link>
                    <button
                      onClick={() => void deleteProject(p.id)}
                      title="Delete project"
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 transition-all text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    {p.published && p.slug ? (
                      <a
                        href={`/p/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 hover:bg-emerald-100 transition-colors dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900"
                      >
                        ● Live
                      </a>
                    ) : (
                      <span className="rounded-full bg-panel-2 text-muted border border-line px-2.5 py-1">
                        Draft
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
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
