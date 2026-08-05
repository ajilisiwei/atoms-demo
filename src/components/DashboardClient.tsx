"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { PENDING_PROMPT_KEY } from "@/components/HeroPrompt";

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

export function DashboardClient({ userEmail, initialProjects }: DashboardClientProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  async function createProject(initialPrompt?: string) {
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
        sessionStorage.setItem(`${AUTORUN_PREFIX}${project.id}`, initialPrompt);
      }
      router.push(`/builder/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create project");
      setCreating(false);
    }
  }

  // If the user typed a prompt on the landing page before signing up,
  // pick it up here and jump straight into the builder.
  useEffect(() => {
    if (autoStarted.current) return;
    const pending = sessionStorage.getItem(PENDING_PROMPT_KEY);
    if (pending) {
      autoStarted.current = true;
      sessionStorage.removeItem(PENDING_PROMPT_KEY);
      void createProject(pending);
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
    <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
      <header className="flex items-center justify-between mb-10">
        <Link href="/" className="text-lg font-semibold">
          <span className="text-gradient">◉ Atomlet</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted hidden sm:inline">{userEmail}</span>
          <button
            onClick={logout}
            className="text-muted hover:text-foreground transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <section className="mb-12">
        <h1 className="text-2xl font-semibold mb-1">What do you want to build?</h1>
        <p className="text-muted mb-5">
          Describe an app and the agent will plan, code and preview it for you.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (prompt.trim()) void createProject(prompt.trim());
          }}
          className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-panel border border-line"
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (prompt.trim()) void createProject(prompt.trim());
              }
            }}
            rows={2}
            placeholder="e.g. A habit tracker with streaks and weekly charts…"
            className="flex-1 resize-none bg-transparent px-4 py-3 outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={creating || !prompt.trim()}
            className="shrink-0 self-stretch sm:self-end rounded-xl bg-gradient-to-r from-accent to-accent-2 px-6 py-3 font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {creating ? "Creating…" : "Start building"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-muted uppercase tracking-wide text-xs">
            Your apps ({projects.length})
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
          <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted">
            No apps yet — describe one above to get started.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <li
                key={p.id}
                className="group rounded-2xl border border-line bg-panel p-5 hover:border-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/builder/${p.id}`} className="flex-1 min-w-0">
                    <h3 className="font-medium truncate group-hover:text-accent-2 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-sm text-muted mt-1">
                      {p.versionCount} version{p.versionCount === 1 ? "" : "s"} ·{" "}
                      {timeAgo(p.updatedAt)}
                    </p>
                  </Link>
                  <button
                    onClick={() => void deleteProject(p.id)}
                    title="Delete project"
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all text-sm"
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
                      className="rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-900 px-2.5 py-1 hover:bg-emerald-950 transition-colors"
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
  );
}
