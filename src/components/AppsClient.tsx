"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useT } from "@/lib/i18n";
import { AppSidebar } from "@/components/shell/AppSidebar";
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

  async function deleteProject(id: string) {
    const target = projects.find((p) => p.id === id);
    if (!target) return;
    if (!window.confirm(t("shell.deleteConfirm", { name: target.name }))) return;
    try {
      await api(`/api/projects/${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("shell.deleteFailed"));
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
          activeNav="apps"
          onOpenSettings={() => setSettingsOpen(true)}
          onLogout={() => void logout()}
        />
      </div>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-line">
          <Link href="/" className="text-sm font-semibold">
            <span className="text-accent-2">◉</span> Atomlet
          </Link>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-sm text-muted hover:text-foreground"
          >
            {t("settings.title")}
          </button>
        </header>

        <div className="mx-auto w-full max-w-5xl px-6 py-10">
          <div className="flex items-center justify-between mb-1.5">
            <h1 className="text-xl font-semibold">{t("shell.myApps")}</h1>
            <Link href="/dashboard" className="text-sm text-accent-2 hover:underline">
              {t("shell.newApp")}
            </Link>
          </div>
          <p className="text-sm text-muted mb-8">{t("shell.appsSubtitle")}</p>

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

          <ProjectsGrid
            projects={projects}
            onDelete={(id) => void deleteProject(id)}
            emptyHint={t("shell.emptyApps")}
          />
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
