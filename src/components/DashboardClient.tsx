"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useT } from "@/lib/i18n";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { SettingsDialog, type SettingsSection } from "@/components/shell/SettingsDialog";
import { PromptComposer } from "@/components/composer/PromptComposer";
import { ProjectsGrid, type ProjectListItem } from "@/components/ProjectsGrid";

export const AUTORUN_PREFIX = "atomlet:autorun:";

export type { ProjectListItem };

interface DashboardClientProps {
  userEmail: string;
  displayName: string;
  credits: number;
  initialProjects: ProjectListItem[];
}

export function DashboardClient({
  userEmail,
  displayName,
  credits,
  initialProjects,
}: DashboardClientProps) {
  const t = useT();
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("account");
  const [themeName, setThemeName] = useState<string | null>(null);

  function openSettings(section: SettingsSection = "account") {
    setSettingsSection(section);
    setSettingsOpen(true);
  }

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
      setError(err instanceof ApiError ? err.message : t("dashboard.createFailed"));
      setCreating(false);
    }
  }

  async function deleteProject(id: string) {
    const target = projects.find((p) => p.id === id);
    if (!target) return;
    if (!window.confirm(t("dashboard.deleteConfirm", { name: target.name }))) return;
    try {
      await api(`/api/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("dashboard.deleteFailed"));
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
          activeNav="home"
          onOpenSettings={() => openSettings()}
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
            onClick={() => openSettings()}
            className="text-sm text-muted hover:text-foreground"
          >
            {t("settings.title")}
          </button>
        </header>

        {/* Credits pill, mirroring Atoms' top-right balance */}
        <div className="hidden lg:flex justify-end px-6 pt-5">
          <button
            onClick={() => openSettings("credits")}
            title={t("dashboard.creditsPillTitle")}
            className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-3.5 py-1.5 text-sm hover:border-accent-2/60 transition-colors"
          >
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
              className="text-muted"
            >
              <path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3L4.3 7.6l5.3-.8z" />
            </svg>
            {credits}
          </button>
        </div>

        <section className="flex flex-col items-center px-6 pt-12 sm:pt-20 pb-14 text-center">
          <h1 className="font-display text-3xl sm:text-[44px] leading-tight tracking-tight">
            {t("dashboard.heroTitle", { name: displayName })}
          </h1>
          <div className="mt-9 w-full max-w-2xl text-left">
            <PromptComposer
              placeholder={t("dashboard.composerPlaceholder")}
              disabled={creating}
              themeValue={themeName}
              onThemeChange={setThemeName}
              onSubmit={(p) => void createProject(p, themeName)}
              autoFocus
            />
          </div>
          {creating && (
            <p className="mt-4 text-sm text-muted">{t("dashboard.creating")}</p>
          )}
          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </section>

        <section id="apps" className="mx-auto w-full max-w-5xl px-6 pb-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">
              {t("dashboard.myApps")}
              <span className="ml-1.5 text-muted">({projects.length})</span>
            </h2>
            <button
              onClick={() => void createProject()}
              className="text-sm text-accent-2 hover:underline"
              disabled={creating}
            >
              {t("dashboard.blankProject")}
            </button>
          </div>
          <ProjectsGrid
            projects={projects}
            onDelete={(id) => void deleteProject(id)}
            emptyHint={t("dashboard.emptyHint")}
          />
        </section>
      </main>

      <SettingsDialog
        open={settingsOpen}
        initialSection={settingsSection}
        onClose={() => setSettingsOpen(false)}
        userEmail={userEmail}
        onLogout={() => void logout()}
      />
    </div>
  );
}
