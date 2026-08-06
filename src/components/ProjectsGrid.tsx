"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export interface ProjectListItem {
  id: string;
  name: string;
  slug: string | null;
  published: boolean;
  favorite: boolean;
  versionCount: number;
  updatedAt: string;
}

interface ProjectsGridProps {
  projects: ProjectListItem[];
  onDelete: (id: string) => void;
  emptyHint?: string;
}

type Translator = ReturnType<typeof useT>;

function timeAgo(iso: string, t: Translator): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t("shell.time.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("shell.time.minutesAgo", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("shell.time.hoursAgo", { n: hours });
  return t("shell.time.daysAgo", { n: Math.floor(hours / 24) });
}

export function ProjectsGrid({ projects, onDelete, emptyHint }: ProjectsGridProps) {
  const t = useT();

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-12 text-center text-muted text-sm">
        {emptyHint ?? t("shell.emptyDefault")}
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
              <h3 className="flex items-center gap-1.5 text-sm font-medium group-hover:text-accent-2 transition-colors">
                {p.favorite && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                    className="shrink-0 text-amber-500"
                  >
                    <path d="M12 2.8l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9l5.9-.8z" />
                  </svg>
                )}
                <span className="truncate">{p.name}</span>
              </h3>
              <p className="text-xs text-muted mt-1">
                {t(p.versionCount === 1 ? "shell.versionOne" : "shell.versionMany", {
                  count: p.versionCount,
                })}{" "}
                · {timeAgo(p.updatedAt, t)}
              </p>
            </Link>
            <button
              onClick={() => onDelete(p.id)}
              title={t("shell.deleteProject")}
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
                ● {t("shell.live")}
              </a>
            ) : (
              <span className="rounded-full bg-panel-2 text-muted border border-line px-2.5 py-1">
                {t("shell.draft")}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
