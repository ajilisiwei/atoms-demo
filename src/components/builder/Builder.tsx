"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, streamGeneration, type VersionMeta } from "@/lib/client/api";
import { AUTORUN_PREFIX } from "@/components/DashboardClient";
import { agentTagline, findAgent, type AgentRecord } from "@/lib/agents";
import { useLocale, useT } from "@/lib/i18n";
import { LogoMark } from "@/components/Logo";
import { assembleDocument } from "@/lib/bundler/assemble";
import { bundleFiles, ensureEsbuild, type BundleDiagnostic } from "@/lib/bundler/bundle";
import {
  downloadDirectoryZip,
  downloadHtmlProject,
  downloadReactProject,
  downloadSingleFile,
} from "@/lib/download";
import { ChatPanel, type RestoredInput } from "./ChatPanel";
import type { ConsoleEntry, ConsoleLevel } from "./ConsolePanel";
import { PreviewPanel, type PanelTab, type SaveState } from "./PreviewPanel";
import { PublishDialog } from "./PublishDialog";
import { ResizeHandle, useResizableWidth } from "./useResizable";
import type { BuilderProject, GenerationState, ProjectFiles, UiMessage } from "./types";

interface BuilderProps {
  initialProject: BuilderProject;
  initialMessages: UiMessage[];
  initialVersions: VersionMeta[];
  initialHtml: string | null;
  initialFiles: ProjectFiles | null;
  // Latest react-ts version exists but its compiledHtml was never stored
  // (e.g. the tab closed before the browser build finished).
  initialArtifactMissing?: boolean;
  initialCredits: number;
  initialAgents: AgentRecord[];
}

export function Builder({
  initialProject,
  initialMessages,
  initialVersions,
  initialHtml,
  initialFiles,
  initialArtifactMissing,
  initialCredits,
  initialAgents,
}: BuilderProps) {
  const t = useT();
  const { locale } = useLocale();
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
  // Draggable chat pane width (desktop layout only).
  const chatResize = useResizableWidth(420, 300, 640);

  // Multi-file (react-ts) state. `files` is the latest snapshot; viewing a
  // historical version swaps in `viewingFiles` without touching it.
  const isReact = initialProject.template === "react-ts";
  const [files, setFiles] = useState<ProjectFiles | null>(initialFiles);
  const [viewingFiles, setViewingFiles] = useState<ProjectFiles | null>(null);
  const [viewingBuilt, setViewingBuilt] = useState(true);
  const [streamingFiles, setStreamingFiles] = useState<ProjectFiles | null>(null);
  const [writingPath, setWritingPath] = useState<string | null>(null);
  const [changedPaths, setChangedPaths] = useState<Set<string> | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [compileErrors, setCompileErrors] = useState<BundleDiagnostic[] | null>(null);
  // Cloud editing: debounced saves of manual edits to the latest version.
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [previewNonce, setPreviewNonce] = useState(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ files?: ProjectFiles; html?: string } | null>(null);

  // Chat attachments ("select file" from the tree menu); mirrored into a ref
  // so `send` (a useCallback) reads the latest without depending on it.
  const [attachedPaths, setAttachedPaths] = useState<string[]>([]);
  const attachedRef = useRef<string[]>([]);
  useEffect(() => {
    attachedRef.current = attachedPaths;
  }, [attachedPaths]);

  function attachPath(path: string) {
    setAttachedPaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }

  // Console: runtime logs bridged from the preview + build events.
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleUnseenError, setConsoleUnseenError] = useState(false);
  const consoleOpenRef = useRef(consoleOpen);
  const logIdRef = useRef(0);

  const pushLog = useCallback((level: ConsoleLevel, text: string) => {
    setConsoleLogs((prev) => {
      const next = [...prev, { id: ++logIdRef.current, level, text, at: Date.now() }];
      return next.length > 500 ? next.slice(next.length - 500) : next;
    });
    if (level === "error" && !consoleOpenRef.current) setConsoleUnseenError(true);
  }, []);

  useEffect(() => {
    consoleOpenRef.current = consoleOpen;
  }, [consoleOpen]);

  function toggleConsole() {
    setConsoleOpen((v) => !v);
    // Opening reveals the errors; closing means they were just seen.
    setConsoleUnseenError(false);
  }

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; level?: string; text?: string };
      if (d?.type !== "atomlet:console" || typeof d.text !== "string") return;
      const level: ConsoleLevel =
        d.level === "error" ? "error" : d.level === "warn" ? "warn" : "info";
      pushLog(level, d.text);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [pushLog]);

  const htmlBufRef = useRef("");
  const filesBufRef = useRef<ProjectFiles>({});
  const generatingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const autoStarted = useRef(false);

  // Prewarm the wasm compiler while the user reads/types.
  useEffect(() => {
    if (isReact) void ensureEsbuild().catch(() => {});
  }, [isReact]);

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

  // Bundle the snapshot in the browser, store the artifact on the version,
  // then reveal the preview (the raw route serves compiledHtml). While
  // `compiling` is true the preview pane shows a placeholder, which also
  // covers the window before the PATCH lands.
  const compileAndStore = useCallback(
    async (snapshot: ProjectFiles, versionId: string) => {
      setCompiling(true);
      setCompileErrors(null);
      const t0 = performance.now();
      try {
        const result = await bundleFiles(snapshot);
        if (!mountedRef.current) return;
        if (!result.ok) {
          setCompileErrors(result.errors);
          for (const d of result.errors) {
            pushLog(
              "error",
              `${d.file ?? ""}${d.line !== undefined ? `:${d.line}` : ""} ${d.text}`.trim()
            );
          }
          setTab("code");
          return;
        }
        const html = assembleDocument({
          js: result.js,
          css: result.css,
          title: project.name,
        });
        pushLog(
          "info",
          `Build succeeded in ${Math.round(performance.now() - t0)}ms — js ${(result.js.length / 1024).toFixed(1)}KB, css ${(result.css.length / 1024).toFixed(1)}KB`
        );
        await api(`/api/projects/${project.id}/versions/${versionId}`, {
          method: "PATCH",
          body: JSON.stringify({ compiledHtml: html }),
        });
        if (!mountedRef.current) return;
        setTab("preview");
      } catch (err) {
        if (mountedRef.current) {
          const message =
            err instanceof ApiError ? err.message : t("builder.compile.storeFailed");
          pushLog("error", message);
          setCompileErrors([{ text: message }]);
        }
      } finally {
        if (mountedRef.current) setCompiling(false);
      }
    },
    [project.id, project.name, pushLog, t]
  );

  // Rebuild a missing artifact on open (e.g. the tab closed mid-build).
  const rebuildStarted = useRef(false);
  useEffect(() => {
    if (rebuildStarted.current) return;
    if (!isReact || !initialArtifactMissing || !initialFiles) return;
    const latestId = initialVersions[0]?.id;
    if (!latestId) return;
    rebuildStarted.current = true;
    // Deferred so no state updates happen synchronously inside the effect;
    // mountedRef guards the Strict Mode remount window.
    setTimeout(() => {
      if (mountedRef.current) void compileAndStore(initialFiles, latestId);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setViewingFiles(null);
      setGeneration({ planSteps: [], phase: "planning", htmlLength: 0 });
      htmlBufRef.current = "";
      filesBufRef.current = {};
      setStreamingCode(isReact ? null : "");
      setStreamingFiles(isReact ? {} : null);
      setWritingPath(null);
      setCompileErrors(null);
      setTab("code");

      // Throttled flush of the streamed code into React state.
      const flushTimer = setInterval(() => {
        if (isReact) {
          setStreamingFiles({ ...filesBufRef.current });
          const total = Object.values(filesBufRef.current).reduce(
            (n, c) => n + c.length,
            0
          );
          setGeneration((g) => (g ? { ...g, htmlLength: total } : g));
        } else {
          setStreamingCode(htmlBufRef.current);
          setGeneration((g) =>
            g ? { ...g, htmlLength: htmlBufRef.current.length } : g
          );
        }
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
              case "file_start":
                filesBufRef.current[ev.path] = "";
                setWritingPath(ev.path);
                setGeneration((g) =>
                  g && g.phase === "planning" ? { ...g, phase: "coding" } : g
                );
                break;
              case "file_delta":
                filesBufRef.current[ev.path] =
                  (filesBufRef.current[ev.path] ?? "") + ev.delta;
                break;
              case "file_end":
                setWritingPath((p) => (p === ev.path ? null : p));
                break;
              case "summary":
                setGeneration((g) => (g ? { ...g, phase: "finishing" } : g));
                break;
              case "suggestions":
                // Carried on the done event as well; nothing to do mid-stream.
                break;
              case "done": {
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
                if (typeof ev.creditsRemaining === "number") {
                  setCredits(ev.creditsRemaining);
                }
                if (ev.version === null) {
                  // No-change turn: just a conversational reply.
                  setTab(hasVersions ? "preview" : "code");
                  break;
                }
                setVersions((prev) => [ev.version!, ...prev]);
                if (isReact) {
                  // Mirror the server-side merge: changed files over the
                  // previous snapshot, minus deletions.
                  const changed = { ...filesBufRef.current };
                  const merged: ProjectFiles = { ...(files ?? {}), ...changed };
                  for (const p of ev.files?.deleted ?? []) delete merged[p];
                  setFiles(merged);
                  setChangedPaths(new Set(Object.keys(changed)));
                  void compileAndStore(merged, ev.version.id);
                } else {
                  setCurrentHtml(htmlBufRef.current);
                  setTab("preview");
                }
                break;
              }
              case "error":
                failure = ev.message;
                break;
            }
          },
          {
            signal: abort.signal,
            themeName: effectiveTheme,
            agentId: effectiveAgent,
            focusPaths: attachedRef.current.length ? attachedRef.current : undefined,
          }
        );
        if (mountedRef.current) setAttachedPaths([]);
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
          setStreamingFiles(null);
          setWritingPath(null);
          setGeneration(null);
        }
      }
      if (failure && mountedRef.current) {
        setError(failure);
        setRestored({ value: prompt, at: Date.now() });
        setTab(hasVersions ? "preview" : "code");
      }
    },
    [project.id, hasVersions, themeName, agentId, isReact, files, compileAndStore, t]
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
      const { version } = await api<{
        version: VersionMeta & {
          html: string;
          files?: ProjectFiles | null;
          compiledHtml?: string | null;
        };
      }>(`/api/projects/${project.id}/versions/${versionId}`);
      setViewing({ id: version.id, number: version.number });
      if (isReact) {
        setViewingFiles(version.files ?? null);
        setViewingBuilt(Boolean(version.compiledHtml));
      } else {
        setViewingHtml(version.html);
      }
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
    setViewingFiles(null);
    setViewingBuilt(true);
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
      if (isReact) {
        // The server copied files/compiledHtml onto the new version.
        if (viewingFiles) setFiles(viewingFiles);
        setChangedPaths(null);
      } else if (viewingHtml) {
        setCurrentHtml(viewingHtml);
      }
      backToLatest();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("builder.error.restoreVersionFailed")
      );
    }
  }

  const activeAgent = findAgent(initialAgents, agentId);
  const latestVersion = versions[0] ?? null;
  const previewVersionId = viewing?.id ?? latestVersion?.id ?? null;
  const previewSrc = previewVersionId
    ? `/api/projects/${project.id}/versions/${previewVersionId}/raw`
    : null;
  const publishTargetId = viewing?.id ?? latestVersion?.id ?? null;

  // Files shown in the Code tab: mid-generation the streamed changes overlay
  // the previous snapshot; otherwise the viewed version or the latest.
  const displayFiles = streamingFiles
    ? { ...(files ?? {}), ...streamingFiles }
    : viewing
      ? viewingFiles
      : files;

  // ---- Cloud editing (latest version only) -------------------------------
  const editable = !viewing && generation === null && !compiling && hasVersions;

  function scheduleSave(payload: { files?: ProjectFiles; html?: string }) {
    pendingSaveRef.current = payload;
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void flushSave(), 900);
  }

  async function flushSave() {
    const payload = pendingSaveRef.current;
    const versionId = versions[0]?.id;
    if (!payload || !versionId) return;
    pendingSaveRef.current = null;
    try {
      if (payload.files) {
        // Store sources even when the build fails, so edits are never lost;
        // the artifact only updates on a green build.
        const t0 = performance.now();
        const result = await bundleFiles(payload.files);
        if (!mountedRef.current) return;
        const body: Record<string, unknown> = { files: payload.files };
        if (result.ok) {
          body.compiledHtml = assembleDocument({
            js: result.js,
            css: result.css,
            title: project.name,
          });
          pushLog(
            "info",
            `Build succeeded in ${Math.round(performance.now() - t0)}ms — js ${(result.js.length / 1024).toFixed(1)}KB, css ${(result.css.length / 1024).toFixed(1)}KB`
          );
        } else {
          for (const d of result.errors) {
            pushLog(
              "error",
              `${d.file ?? ""}${d.line !== undefined ? `:${d.line}` : ""} ${d.text}`.trim()
            );
          }
        }
        await api(`/api/projects/${project.id}/versions/${versionId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        if (!mountedRef.current) return;
        setCompileErrors(result.ok ? null : result.errors);
        if (result.ok) setPreviewNonce((n) => n + 1);
      } else if (payload.html !== undefined) {
        await api(`/api/projects/${project.id}/versions/${versionId}`, {
          method: "PATCH",
          body: JSON.stringify({ html: payload.html }),
        });
        if (!mountedRef.current) return;
        setPreviewNonce((n) => n + 1);
      }
      // A newer edit may have arrived while this save was in flight.
      if (pendingSaveRef.current) return;
      setSaveState("saved");
    } catch {
      if (mountedRef.current) setSaveState("error");
    }
  }

  function handleFileEdit(path: string, content: string) {
    if (!editable || !files) return;
    const next = { ...files, [path]: content };
    setFiles(next);
    scheduleSave({ files: next });
  }

  function handleHtmlEdit(html: string) {
    if (!editable) return;
    setCurrentHtml(html);
    scheduleSave({ html });
  }

  // ---- File-tree structure operations (react-ts, latest version only) ----

  function applyFiles(next: ProjectFiles) {
    setFiles(next);
    scheduleSave({ files: next });
  }

  // Renames a file, or every file under a directory. Returns false when the
  // target already exists.
  function renamePath(oldPath: string, newPath: string, isDir: boolean): boolean {
    if (!editable || !files || oldPath === newPath) return false;
    const next: ProjectFiles = {};
    if (isDir) {
      const oldPrefix = `${oldPath}/`;
      const newPrefix = `${newPath}/`;
      for (const [p, c] of Object.entries(files)) {
        const moved = p.startsWith(oldPrefix) ? newPrefix + p.slice(oldPrefix.length) : p;
        if (moved !== p && files[moved] !== undefined) return false;
        next[moved] = c;
      }
    } else {
      if (files[newPath] !== undefined) return false;
      for (const [p, c] of Object.entries(files)) next[p === oldPath ? newPath : p] = c;
    }
    applyFiles(next);
    setAttachedPaths((prev) =>
      prev.map((p) =>
        isDir && p.startsWith(`${oldPath}/`)
          ? newPath + p.slice(oldPath.length)
          : p === oldPath
            ? newPath
            : p
      )
    );
    return true;
  }

  function deletePath(path: string, isDir: boolean) {
    if (!editable || !files) return;
    const prefix = `${path}/`;
    const next = Object.fromEntries(
      Object.entries(files).filter(([p]) => (isDir ? !p.startsWith(prefix) : p !== path))
    );
    applyFiles(next);
    setAttachedPaths((prev) =>
      prev.filter((p) => (isDir ? !p.startsWith(prefix) : p !== path))
    );
  }

  // Returns false when the path is taken; otherwise creates an empty file.
  function createFile(path: string): boolean {
    if (!editable || !files || files[path] !== undefined) return false;
    applyFiles({ ...files, [path]: "" });
    return true;
  }

  function addUploadedFiles(entries: { path: string; content: string }[]) {
    if (!editable || !files || entries.length === 0) return;
    const next = { ...files };
    for (const { path, content } of entries) next[path] = content;
    applyFiles(next);
  }

  function downloadPath(path: string, isDir: boolean) {
    if (!files) return;
    if (isDir) void downloadDirectoryZip(path, files);
    else if (files[path] !== undefined) downloadSingleFile(path, files[path]);
  }

  function requestFix() {
    if (!compileErrors?.length) return;
    const diag = compileErrors
      .map(
        (d) =>
          `${d.file ?? ""}${d.line !== undefined ? `:${d.line}` : ""} ${d.text}`
      )
      .join("\n");
    void send(`The app fails to compile. Fix these build errors:\n${diag}`);
  }

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
            title={`${activeAgent.name} · ${agentTagline(activeAgent, locale)}`}
          >
            <Image
              src={activeAgent.avatarUrl}
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
          <button
            type="button"
            onClick={() => {
              if (isReact) {
                if (files) void downloadReactProject(project.name, files);
              } else if (currentHtml) {
                downloadHtmlProject(project.name, currentHtml);
              }
            }}
            disabled={isReact ? !files : !currentHtml}
            title={t("builder.header.download")}
            aria-label={t("builder.header.download")}
            className="w-8 h-8 shrink-0 rounded-lg hover:bg-panel-2 grid place-items-center text-muted hover:text-foreground transition-colors disabled:opacity-40"
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
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          </button>
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
          style={{ "--chat-w": `${chatResize.width}px` } as React.CSSProperties}
          className={
            chatCollapsed
              ? "hidden"
              : "flex flex-col h-2/5 lg:h-auto lg:w-(--chat-w) lg:shrink-0 border-b lg:border-b-0 lg:border-r border-line"
          }
        >
          <ChatPanel
            agents={initialAgents}
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
                ? { name: activeAgent.name, avatar: activeAgent.avatarUrl }
                : null
            }
            agentValue={agentId}
            onAgentChange={setAgentId}
            attachedPaths={attachedPaths}
            onDetachPath={(p) =>
              setAttachedPaths((prev) => prev.filter((x) => x !== p))
            }
          />
        </div>
        {!chatCollapsed && (
          <ResizeHandle
            dragging={chatResize.dragging}
            stopDragging={chatResize.stopDragging}
            className="hidden lg:block"
            {...chatResize.handleProps}
          />
        )}
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
            template={project.template}
            files={displayFiles}
            filesStreaming={streamingFiles !== null}
            writingPath={writingPath}
            changedPaths={changedPaths}
            compiling={compiling}
            compileErrors={compileErrors}
            onRequestFix={requestFix}
            previewUnavailable={isReact && Boolean(viewing) && !viewingBuilt}
            editable={editable}
            saveState={saveState}
            onFileEdit={handleFileEdit}
            onHtmlEdit={handleHtmlEdit}
            previewNonce={previewNonce}
            consoleLogs={consoleLogs}
            consoleOpen={consoleOpen}
            consoleUnseenError={consoleUnseenError}
            onToggleConsole={toggleConsole}
            onClearConsole={() => setConsoleLogs([])}
            fileOps={{
              attach: attachPath,
              rename: renamePath,
              remove: deletePath,
              create: createFile,
              upload: addUploadedFiles,
              download: downloadPath,
            }}
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
