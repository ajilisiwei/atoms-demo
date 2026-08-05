"use client";

import Link from "next/link";

export interface ProjectListItem {
  id: string;
  name: string;
  slug: string | null;
  published: boolean;
  versionCount: number;
  updatedAt: string;
}

interface ProjectsGridProps {
  projects: ProjectListItem[];
  onDelete: (id: string) => void;
  emptyHint?: string;
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

export function ProjectsGrid({ projects, onDelete, emptyHint }: ProjectsGridProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted text-sm">
        {emptyHint ?? "No apps yet — describe one to get started."}
      </div>
    );
  }

  return (
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
              onClick={() => onDelete(p.id)}
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
  );
}
