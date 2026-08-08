"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useLocale, useT } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AppSidebar, type ProjectChange } from "@/components/shell/AppSidebar";
import { MobileSidebar } from "@/components/shell/MobileSidebar";
import { SettingsDialog, type SettingsSection } from "@/components/shell/SettingsDialog";
import { PromptComposer } from "@/components/composer/PromptComposer";
import { ProjectsGrid, type ProjectListItem } from "@/components/ProjectsGrid";
import { AgentRow } from "@/components/AgentRow";
import { BuddyEditorDialog } from "@/components/agents/BuddyEditorDialog";
import { findAgent } from "@/lib/agents";
import { extractSpecialty } from "@/lib/agent-validate";
import type { AgentRecord } from "@/lib/agent-types";

export const AUTORUN_PREFIX = "atomlet:autorun:";

export type { ProjectListItem };

interface DashboardClientProps {
  userEmail: string;
  displayName: string;
  credits: number;
  initialAgents: AgentRecord[];
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
  initialAgents,
  initialProjects,
}: DashboardClientProps) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("account");
  const [themeName, setThemeName] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [template, setTemplate] = useState("html");
  const [agents, setAgents] = useState<AgentRecord[]>(initialAgents);
  const [buddyEditor, setBuddyEditor] = useState<
    { open: true; initial?: { id: string; name: string; specialty: string; avatarUrl: string } } | null
  >(null);

  // Picking a buddy adopts its theme hint unless the user chose a theme
  // themselves; clearing/switching lets go of the previous hint.
  function handleAgentChange(next: string | null) {
    const prevHint = findAgent(agents, agentId)?.themeHint ?? null;
    const nextHint = findAgent(agents, next)?.themeHint ?? null;
    setAgentId(next);
    setThemeName((current) => {
      const followingHint = current === null || current === prevHint;
      if (!followingHint) return current;
      return nextHint ?? (current === prevHint ? null : current);
    });
  }

  function handleBuddySaved(saved: AgentRecord) {
    setAgents((prev) => {
      const exists = prev.some((a) => a.id === saved.id);
      return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [...prev, saved];
    });
    setBuddyEditor(null);
    handleAgentChange(saved.id);
  }
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
        body: JSON.stringify({ name, template }),
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


  function handleProjectChanged(change: ProjectChange) {
    if (change.type === "delete") {
      setProjects((prev) => prev.filter((p) => p.id !== change.id));
    } else if (change.type === "rename") {
      setProjects((prev) =>
        prev.map((p) => (p.id === change.id ? { ...p, name: change.name } : p))
      );
    } else {
      setProjects((prev) =>
        prev.map((p) => (p.id === change.id ? { ...p, favorite: change.favorite } : p))
      );
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
          projects={projects.map((p) => ({ id: p.id, name: p.name, favorite: p.favorite }))}
          onProjectChanged={handleProjectChanged}
          onActionError={setError}
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
            <AgentRow
              agents={agents}
              value={agentId}
              onChange={handleAgentChange}
              disabled={creating}
              onCreateBuddy={() => setBuddyEditor({ open: true })}
              onEditBuddy={(a) =>
                setBuddyEditor({
                  open: true,
                  initial: {
                    id: a.id,
                    name: a.name,
                    specialty: extractSpecialty(a.persona) ?? "",
                    avatarUrl: a.avatarUrl,
                  },
                })
              }
            />
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
              agents={agents}
              agentValue={agentId}
              onAgentChange={handleAgentChange}
              templateValue={template}
              onTemplateChange={setTemplate}
              onSubmit={(p) => void createProject(p, themeName, agentId)}
              autoFocus
            />
          </div>
          {!creating &&
            (() => {
              const sel = findAgent(agents, agentId);
              if (!sel?.starterPrompts?.length) return null;
              return (
                <div className="mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2">
                  <span className="text-xs text-muted">{t("agents.starterLabel")}</span>
                  {sel.starterPrompts.map((sp, i) => {
                    const text = locale === "zh" ? sp.zh : sp.en;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => void createProject(text, themeName, agentId)}
                        className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-muted hover:border-accent-2/60 hover:text-foreground transition-colors"
                      >
                        {text}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
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
        projects={projects.map((p) => ({ id: p.id, name: p.name, favorite: p.favorite }))}
          onProjectChanged={handleProjectChanged}
          onActionError={setError}
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

      {buddyEditor && (
        <BuddyEditorDialog
          open
          initial={buddyEditor.initial}
          onClose={() => setBuddyEditor(null)}
          onSaved={handleBuddySaved}
        />
      )}

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
