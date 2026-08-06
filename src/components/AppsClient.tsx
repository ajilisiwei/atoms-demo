"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useT } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AppSidebar, type ProjectChange } from "@/components/shell/AppSidebar";
import { MobileSidebar } from "@/components/shell/MobileSidebar";
import { SettingsDialog } from "@/components/shell/SettingsDialog";
import { ProjectsGrid, type ProjectListItem } from "@/components/ProjectsGrid";

interface AppsClientProps {
  userEmail: string;
  initialProjects: ProjectListItem[];
}

export function AppsClient({ userEmail, initialProjects }: AppsClientProps) {
  const t = useT();
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  function requestDelete(id: string) {
    const target = projects.find((p) => p.id === id);
    if (!target) return;
    setPendingDelete({ id: target.id, name: target.name });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setDeleteBusy(true);
    try {
      await api(`/api/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("shell.deleteFailed"));
    } finally {
      setDeleteBusy(false);
      setPendingDelete(null);
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
          activeNav="apps"
          onOpenSettings={() => setSettingsOpen(true)}
          onLogout={() => void logout()}
        />
      </div>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-line">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label={t("common.openMenu")}
            className="w-8 h-8 -ml-1 grid place-items-center rounded-lg text-muted hover:text-foreground hover:bg-panel-2 transition-colors"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/dashboard" className="text-sm font-semibold">
            <Logo size={20} />
          </Link>
        </header>

        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-1.5">
            <h1 className="text-xl font-semibold">{t("shell.myApps")}</h1>
            <Link href="/dashboard" className="text-sm text-accent-2 hover:underline">
              {t("shell.newApp")}
            </Link>
          </div>
          <p className="text-sm text-muted mb-6">{t("shell.appsSubtitle")}</p>

          <div className="mb-6 flex items-center gap-1.5">
            {(["all", "favorites"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  filter === key
                    ? "bg-foreground text-background font-medium"
                    : "border border-line text-muted hover:text-foreground hover:bg-panel-2"
                }`}
              >
                {t(key === "all" ? "shell.tabAll" : "shell.tabFavorites")}
              </button>
            ))}
          </div>

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

          <ProjectsGrid
            projects={filter === "all" ? projects : projects.filter((p) => p.favorite)}
            onDelete={requestDelete}
            emptyHint={t("shell.emptyApps")}
          />
        </div>
      </main>

      <MobileSidebar
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        userEmail={userEmail}
        projects={projects.map((p) => ({ id: p.id, name: p.name, favorite: p.favorite }))}
          onProjectChanged={handleProjectChanged}
          onActionError={setError}
        activeNav="apps"
        onOpenSettings={() => {
          setMobileNavOpen(false);
          setSettingsOpen(true);
        }}
        onLogout={() => void logout()}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t("common.confirmDeleteTitle")}
        body={
          pendingDelete
            ? t("common.confirmDeleteBody", { name: pendingDelete.name })
            : undefined
        }
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        danger
        busy={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userEmail={userEmail}
        onLogout={() => void logout()}
      />
    </div>
  );
}
