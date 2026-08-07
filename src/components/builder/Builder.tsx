"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, streamGeneration, type VersionMeta } from "@/lib/client/api";
import { AUTORUN_PREFIX } from "@/components/DashboardClient";
import { getBuiltinAgent } from "@/lib/agents";
import { useT } from "@/lib/i18n";
import { LogoMark } from "@/components/Logo";
import { ChatPanel, type RestoredInput } from "./ChatPanel";
import { PreviewPanel, type PanelTab } from "./PreviewPanel";
import { PublishDialog } from "./PublishDialog";
import type { BuilderProject, GenerationState, UiMessage } from "./types";

interface BuilderProps {
  initialProject: BuilderProject;
  initialMessages: UiMessage[];
  initialVersions: VersionMeta[];
  initialHtml: string | null;
  initialCredits: number;
}

export function Builder({
  initialProject,
  initialMessages,
  initialVersions,
  initialHtml,
  initialCredits,
}: BuilderProps) {
  const t = useT();
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
  const [restored, setRestored] = useState<RestoredInput>({ value: "", at: 0 });
  const [publishOpen, setPublishOpen] = useState(false);
  const [themeName, setThemeName] = useState<string | null>(initialProject.themeName);
  const [agentId, setAgentId] = useState<string | null>(initialProject.agentId);
  const [credits, setCredits] = useState(initialCredits);
  // Not persisted — resets to expanded on reload.
  const [chatCollapsed, setChatCollapsed] = useState(false);

  const htmlBufRef = useRef("");
  const generatingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const autoStarted = useRef(false);

  // Declared before the autorun effect so its setup runs first on every
  // (Strict Mode) remount, keeping mountedRef accurate at timer-fire time.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const hasVersions = versions.length > 0;

  const send = useCallback(
    async (
      prompt: string,
      themeOverride?: string | null,
      agentOverride?: string | null
    ) => {
      if (generatingRef.current) return;
      generatingRef.current = true;
      const abort = new AbortController();
      abortRef.current = abort;
      const effectiveTheme = themeOverride !== undefined ? themeOverride : themeName;
      const effectiveAgent = agentOverride !== undefined ? agentOverride : agentId;
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
        await streamGeneration(
          project.id,
          prompt,
          (ev) => {
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
              case "suggestions":
                // Carried on the done event as well; nothing to do mid-stream.
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
                    suggestions: ev.suggestions?.length ? ev.suggestions : null,
                  },
                ]);
                setVersions((prev) => [ev.version, ...prev]);
                setCurrentHtml(html);
                setTab("preview");
                if (typeof ev.creditsRemaining === "number") {
                  setCredits(ev.creditsRemaining);
                }
                break;
              }
              case "error":
                failure = ev.message;
                break;
            }
          },
          { signal: abort.signal, themeName: effectiveTheme, agentId: effectiveAgent }
        );
      } catch (err) {
        failure = abort.signal.aborted
          ? null // component unmounted / navigation — stay silent
          : err instanceof ApiError
            ? err.message
            : t("builder.error.generationFailed");
      } finally {
        clearInterval(flushTimer);
        generatingRef.current = false;
        if (mountedRef.current) {
          setStreamingCode(null);
          setGeneration(null);
        }
      }
      if (failure && mountedRef.current) {
        setError(failure);
        setRestored({ value: prompt, at: Date.now() });
        setTab(hasVersions ? "preview" : "code");
      }
    },
    [project.id, hasVersions, themeName, agentId, t]
  );

  // Auto-run the prompt carried over from the landing page / dashboard.
  // Deferred via setTimeout so no state updates happen synchronously inside
  // the effect; no cleanup on purpose — clearing the timer would drop the
  // autorun under Strict Mode's remount, so the mountedRef guards instead.
  useEffect(() => {
    if (autoStarted.current) return;
    const key = `${AUTORUN_PREFIX}${project.id}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    autoStarted.current = true;
    sessionStorage.removeItem(key);
    // Payload is JSON {prompt, themeName, agentId} from the dashboard
    // composer; a bare string is accepted for backward compatibility.
    let prompt = raw;
    let theme: string | null | undefined;
    let agent: string | null | undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && "prompt" in parsed) {
        const p = parsed as { prompt: unknown; themeName?: unknown; agentId?: unknown };
        if (typeof p.prompt === "string") {
          prompt = p.prompt;
          theme = typeof p.themeName === "string" ? p.themeName : null;
          agent = typeof p.agentId === "string" ? p.agentId : null;
        }
      }
    } catch {
      // Bare-string payload — keep as-is.
    }
    const themeToApply = theme;
    const agentToApply = agent;
    setTimeout(() => {
      if (!mountedRef.current) return;
      if (themeToApply !== undefined) setThemeName(themeToApply);
      if (agentToApply !== undefined) setAgentId(agentToApply);
      void send(prompt, themeToApply, agentToApply);
    }, 0);
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
      setError(
        err instanceof ApiError ? err.message : t("builder.error.loadVersionFailed")
      );
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
          content: t("builder.chat.restored", {
            summary: version.promptSummary.toLowerCase(),
            number: version.number,
          }),
          planSteps: null,
        },
      ]);
      if (viewingHtml) setCurrentHtml(viewingHtml);
      backToLatest();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("builder.error.restoreVersionFailed")
      );
    }
  }

  const activeAgent = getBuiltinAgent(agentId);
  const latestVersion = versions[0] ?? null;
  const previewVersionId = viewing?.id ?? latestVersion?.id ?? null;
  const previewSrc = previewVersionId
    ? `/api/projects/${project.id}/versions/${previewVersionId}/raw`
    : null;
  const publishTargetId = viewing?.id ?? latestVersion?.id ?? null;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <Link
          href="/dashboard"
          className="w-8 h-8 shrink-0 rounded-lg hover:bg-panel-2 grid place-items-center text-muted hover:text-foreground transition-colors"
          title={t("builder.header.backToDashboard")}
          aria-label={t("builder.header.backToDashboard")}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        {activeAgent ? (
          <span
            className="relative w-7 h-7 shrink-0 overflow-hidden rounded-full border border-line"
            title={`${activeAgent.name} · ${t(activeAgent.taglineKey)}`}
          >
            <Image
              src={activeAgent.avatar}
              alt={activeAgent.name}
              fill
              sizes="28px"
              className="object-cover"
            />
          </span>
        ) : (
          <LogoMark size={20} className="shrink-0" />
        )}
        <button
          type="button"
          onClick={() => setChatCollapsed((prev) => !prev)}
          aria-label={
            chatCollapsed
              ? t("builder.header.expandChat")
              : t("builder.header.collapseChat")
          }
          title={
            chatCollapsed
              ? t("builder.header.expandChat")
              : t("builder.header.collapseChat")
          }
          className="w-8 h-8 shrink-0 rounded-lg hover:bg-panel-2 grid place-items-center text-muted hover:text-foreground transition-colors"
        >
          {chatCollapsed ? (
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 17 5-5-5-5" />
              <path d="m13 17 5-5-5-5" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m11 17-5-5 5-5" />
              <path d="m18 17-5-5 5-5" />
            </svg>
          )}
        </button>
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
              ● {t("builder.header.live")}
            </a>
          )}
          <button
            onClick={() => setPublishOpen(true)}
            disabled={!latestVersion}
            className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {t("builder.header.publish")}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Kept mounted while collapsed (display:none) so ChatPanel state and
            an in-flight generation stream survive the toggle. */}
        <div
          className={
            chatCollapsed
              ? "hidden"
              : "flex flex-col h-2/5 lg:h-auto lg:w-[420px] lg:shrink-0 border-b lg:border-b-0 lg:border-r border-line"
          }
        >
          <ChatPanel
            messages={messages}
            generation={generation}
            error={error}
            restored={restored}
            onSend={(p) => void send(p)}
            onDismissError={() => setError(null)}
            onSuggestion={(text) => void send(text)}
            themeValue={themeName}
            onThemeChange={setThemeName}
            outOfCredits={credits <= 0}
            agent={
              activeAgent
                ? { name: activeAgent.name, avatar: activeAgent.avatar }
                : null
            }
            agentValue={agentId}
            onAgentChange={setAgentId}
          />
        </div>
        <div className="flex-1 min-h-0">
          <PreviewPanel
            tab={tab}
            onTabChange={setTab}
            previewSrc={previewSrc}
            codeText={viewing ? viewingHtml : currentHtml}
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
