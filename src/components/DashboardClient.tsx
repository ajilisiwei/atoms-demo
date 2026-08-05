"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useT } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { MobileSidebar } from "@/components/shell/MobileSidebar";
import { SettingsDialog, type SettingsSection } from "@/components/shell/SettingsDialog";
import { PromptComposer } from "@/components/composer/PromptComposer";
import { ProjectsGrid, type ProjectListItem } from "@/components/ProjectsGrid";
import { AgentRow } from "@/components/AgentRow";

export const AUTORUN_PREFIX = "atomlet:autorun:";

export type { ProjectListItem };

interface DashboardClientProps {
  userEmail: string;
  displayName: string;
  credits: number;
  initialProjects: ProjectListItem[];
}

function CreditsStarIcon() {
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
      className="text-muted"
    >
      <path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3L4.3 7.6l5.3-.8z" />
    </svg>
  );
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
  const [agentId, setAgentId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ProjectListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openSettings(section: SettingsSection = "account") {
    setSettingsSection(section);
    setSettingsOpen(true);
  }

  async function createProject(
    initialPrompt?: string,
    theme?: string | null,
    agent?: string | null
  ) {
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
          JSON.stringify({
            prompt: initialPrompt,
            themeName: theme ?? null,
            agentId: agent ?? null,
          })
        );
      }
      router.push(`/builder/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("dashboard.createFailed"));
      setCreating(false);
    }
  }

  async function confirmDeleteProject() {
    if (!pendingDelete || deleting) return;
    const { id } = pendingDelete;
    setDeleting(true);
    setError(null);
    try {
      await api(`/api/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("dashboard.deleteFailed"));
    } finally {
      setDeleting(false);
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
          <button
            onClick={() => openSettings("credits")}
            title={t("dashboard.creditsPillTitle")}
            className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1 text-sm hover:border-accent-2/60 transition-colors"
          >
            <CreditsStarIcon />
            {credits}
          </button>
        </header>

        {/* Credits pill, mirroring Atoms' top-right balance */}
        <div className="hidden lg:flex justify-end px-6 pt-5">
          <button
            onClick={() => openSettings("credits")}
            title={t("dashboard.creditsPillTitle")}
            className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-3.5 py-1.5 text-sm hover:border-accent-2/60 transition-colors"
          >
            <CreditsStarIcon />
            {credits}
          </button>
        </div>

        <section className="flex flex-col items-center px-4 sm:px-6 pt-8 sm:pt-16 pb-14 text-center">
          <div className="mb-6">
            <AgentRow value={agentId} onChange={setAgentId} disabled={creating} />
          </div>
          <h1 className="font-display text-3xl sm:text-[44px] leading-tight tracking-tight">
            {t("dashboard.heroTitle", { name: displayName })}
          </h1>
          <div className="mt-9 w-full max-w-2xl text-left">
            <PromptComposer
              placeholder={t("dashboard.composerPlaceholder")}
              disabled={creating}
              themeValue={themeName}
              onThemeChange={setThemeName}
              onSubmit={(p) => void createProject(p, themeName, agentId)}
              autoFocus
            />
          </div>
          {creating && (
            <p className="mt-4 text-sm text-muted">{t("dashboard.creating")}</p>
          )}
          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </section>

        <section id="apps" className="mx-auto w-full max-w-5xl px-4 sm:px-6 pb-20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
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
            onDelete={(id) => {
              const target = projects.find((p) => p.id === id);
              if (target) setPendingDelete(target);
            }}
            emptyHint={t("dashboard.emptyHint")}
          />
        </section>
      </main>

      <MobileSidebar
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        userEmail={userEmail}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        activeNav="home"
        onOpenSettings={() => {
          setMobileNavOpen(false);
          openSettings();
        }}
        onLogout={() => void logout()}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t("common.confirmDeleteTitle")}
        body={
          pendingDelete
            ? t("common.confirmDeleteBody", { name: pendingDelete.name })
            : undefined
        }
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        danger
        busy={deleting}
        onConfirm={() => void confirmDeleteProject()}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />

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
