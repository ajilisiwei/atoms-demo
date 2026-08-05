"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, streamGeneration, type VersionMeta } from "@/lib/client/api";
import { AUTORUN_PREFIX } from "@/components/DashboardClient";
import { ChatPanel } from "./ChatPanel";
import { PreviewPanel, type PanelTab } from "./PreviewPanel";
import { PublishDialog } from "./PublishDialog";
import type { BuilderProject, GenerationState, UiMessage } from "./types";

interface BuilderProps {
  initialProject: BuilderProject;
  initialMessages: UiMessage[];
  initialVersions: VersionMeta[];
  initialHtml: string | null;
}

export function Builder({
  initialProject,
  initialMessages,
  initialVersions,
  initialHtml,
}: BuilderProps) {
  const [project, setProject] = useState(initialProject);
  const [name, setName] = useState(initialProject.name);
  const [messages, setMessages] = useState(initialMessages);
  const [versions, setVersions] = useState(initialVersions);
  const [currentHtml, setCurrentHtml] = useState(initialHtml);
  const [generation, setGeneration] = useState<GenerationState | null>(null);
  const [streamingCode, setStreamingCode] = useState<string | null>(null);
  const [tab, setTab] = useState<PanelTab>("preview");
  const [viewing, setViewing] = useState<{ id: string; number: number } | null>(null);
  const [viewingHtml, setViewingHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoredInput, setRestoredInput] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);

  const htmlBufRef = useRef("");
  const generatingRef = useRef(false);

  const send = useCallback(
    async (prompt: string) => {
      if (generatingRef.current) return;
      generatingRef.current = true;
      setError(null);
      setViewing(null);
      setViewingHtml(null);
      setGeneration({ planSteps: [], phase: "planning", htmlLength: 0 });
      htmlBufRef.current = "";
      setStreamingCode("");
      setTab("code");

      // Throttled flush of the streamed code into React state.
      const flushTimer = setInterval(() => {
        setStreamingCode(htmlBufRef.current);
        setGeneration((g) => (g ? { ...g, htmlLength: htmlBufRef.current.length } : g));
      }, 400);

      let failure: string | null = null;
      try {
        await streamGeneration(project.id, prompt, (ev) => {
          switch (ev.type) {
            case "plan_step":
              setGeneration((g) =>
                g ? { ...g, planSteps: [...g.planSteps, ev.text] } : g
              );
              break;
            case "html_delta":
              htmlBufRef.current += ev.delta;
              setGeneration((g) =>
                g && g.phase === "planning" ? { ...g, phase: "coding" } : g
              );
              break;
            case "summary":
              setGeneration((g) => (g ? { ...g, phase: "finishing" } : g));
              break;
            case "done": {
              const html = htmlBufRef.current;
              const stamp = Date.now();
              setMessages((prev) => [
                ...prev,
                { id: `local-u-${stamp}`, role: "user", content: prompt, planSteps: null },
                {
                  id: `local-a-${stamp}`,
                  role: "assistant",
                  content: ev.summary,
                  planSteps: ev.planSteps.length > 0 ? ev.planSteps : null,
                },
              ]);
              setVersions((prev) => [ev.version, ...prev]);
              setCurrentHtml(html);
              setTab("preview");
              break;
            }
            case "error":
              failure = ev.message;
              break;
          }
        });
      } catch (err) {
        failure = err instanceof ApiError ? err.message : "Generation failed — please retry";
      } finally {
        clearInterval(flushTimer);
        setStreamingCode(null);
        setGeneration(null);
        generatingRef.current = false;
      }
      if (failure) {
        setError(failure);
        setRestoredInput(prompt);
        setTab(currentHtml ? "preview" : "code");
      }
    },
    [project.id, currentHtml]
  );

  // Auto-run the prompt carried over from the landing page / dashboard.
  useEffect(() => {
    const key = `${AUTORUN_PREFIX}${project.id}`;
    const pending = sessionStorage.getItem(key);
    if (pending) {
      sessionStorage.removeItem(key);
      void send(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === project.name) {
      setName(project.name);
      return;
    }
    try {
      await api(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
      setProject((prev) => ({ ...prev, name: trimmed }));
    } catch {
      setName(project.name);
    }
  }

  async function viewVersion(versionId: string) {
    try {
      const { version } = await api<{ version: VersionMeta & { html: string } }>(
        `/api/projects/${project.id}/versions/${versionId}`
      );
      setViewing({ id: version.id, number: version.number });
      setViewingHtml(version.html);
      setTab("preview");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load version");
    }
  }

  function backToLatest() {
    setViewing(null);
    setViewingHtml(null);
  }

  async function restoreVersion(versionId: string) {
    try {
      const { version } = await api<{ version: VersionMeta }>(
        `/api/projects/${project.id}/versions/${versionId}/restore`,
        { method: "POST" }
      );
      setVersions((prev) => [version, ...prev]);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-r-${Date.now()}`,
          role: "assistant",
          content: `Restored ${version.promptSummary.toLowerCase()} as v${version.number}.`,
          planSteps: null,
        },
      ]);
      if (viewingHtml) setCurrentHtml(viewingHtml);
      backToLatest();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to restore version");
    }
  }

  const latestVersion = versions[0] ?? null;
  const publishTargetId = viewing?.id ?? latestVersion?.id ?? null;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <Link
          href="/dashboard"
          className="text-muted hover:text-foreground transition-colors text-sm shrink-0"
          title="Back to dashboard"
        >
          ← <span className="text-gradient font-semibold">◉</span>
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void saveName()}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none rounded-md px-2 py-1 hover:bg-panel-2 focus:bg-panel-2 transition-colors"
        />
        <div className="flex items-center gap-2 shrink-0">
          {project.publishedVersionId && project.slug && (
            <a
              href={`/p/${project.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-900 px-3 py-1 text-xs hover:bg-emerald-950 transition-colors"
            >
              ● Live ↗
            </a>
          )}
          <button
            onClick={() => setPublishOpen(true)}
            disabled={!latestVersion}
            className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            Publish
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <div className="flex flex-col h-2/5 lg:h-auto lg:w-[420px] lg:shrink-0 border-b lg:border-b-0 lg:border-r border-line">
          <ChatPanel
            messages={messages}
            generation={generation}
            error={error}
            initialInput={restoredInput}
            onSend={(p) => void send(p)}
            onDismissError={() => setError(null)}
          />
        </div>
        <div className="flex-1 min-h-0">
          <PreviewPanel
            tab={tab}
            onTabChange={setTab}
            html={viewing ? viewingHtml : currentHtml}
            streamingCode={streamingCode}
            versions={versions}
            viewing={viewing}
            publishedVersionId={project.publishedVersionId}
            onViewVersion={(id) => void viewVersion(id)}
            onBackToLatest={backToLatest}
            onRestoreVersion={(id) => void restoreVersion(id)}
          />
        </div>
      </div>

      {publishOpen && publishTargetId && (
        <PublishDialog
          project={project}
          targetVersionId={publishTargetId}
          targetVersionNumber={viewing?.number ?? latestVersion?.number ?? 0}
          onClose={() => setPublishOpen(false)}
          onPublished={(slug, publishedVersionId) =>
            setProject((prev) => ({ ...prev, slug, publishedVersionId }))
          }
          onUnpublished={() =>
            setProject((prev) => ({ ...prev, publishedVersionId: null }))
          }
        />
      )}
    </div>
  );
}
