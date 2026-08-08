"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { VersionMeta } from "@/lib/client/api";
import type { BundleDiagnostic } from "@/lib/bundler/bundle";
import { useT } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InputDialog } from "@/components/InputDialog";
import { CodeEditor } from "./CodeEditor";
import { ConsolePanel, type ConsoleEntry } from "./ConsolePanel";
import { FileTree, fileDotClass, type TreeActions } from "./FileTree";
import { ResizeHandle, useResizableWidth } from "./useResizable";
import type { ProjectFiles } from "./types";

// Structure operations owned by the builder (files state + save pipeline).
export interface FileOps {
  attach: (path: string) => void;
  rename: (oldPath: string, newPath: string, isDir: boolean) => boolean;
  remove: (path: string, isDir: boolean) => void;
  create: (path: string) => boolean;
  upload: (entries: { path: string; content: string }[]) => void;
  download: (path: string, isDir: boolean) => void;
}

const TEXT_FILE_RE = /\.(tsx?|jsx?|mjs|cjs|css|json|md|txt|html?|svg)$/i;

export type SaveState = "idle" | "saving" | "saved" | "error";

export type PanelTab = "preview" | "code" | "versions";

type DeviceWidth = "full" | "md" | "sm";

interface ViewingVersion {
  id: string;
  number: number;
}

interface PreviewPanelProps {
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  // URL of the sandboxed document for the version being previewed
  previewSrc: string | null;
  // Full HTML text shown in the Code tab
  codeText: string | null;
  streamingCode: string | null;
  versions: VersionMeta[];
  viewing: ViewingVersion | null;
  publishedVersionId: string | null;
  onViewVersion: (versionId: string) => void;
  onBackToLatest: () => void;
  onRestoreVersion: (versionId: string) => void;
  // Multi-file (react-ts) additions
  template: string;
  files: ProjectFiles | null;
  filesStreaming: boolean;
  writingPath: string | null;
  changedPaths: Set<string> | null;
  compiling: boolean;
  compileErrors: BundleDiagnostic[] | null;
  onRequestFix: () => void;
  previewUnavailable: boolean;
  // Cloud editing (latest version only, disabled while generating/viewing)
  editable: boolean;
  saveState: SaveState;
  onFileEdit: (path: string, content: string) => void;
  onHtmlEdit: (html: string) => void;
  // Bumped by the builder after a save lands, to reload the preview iframe.
  previewNonce: number;
  // Console panel under the preview
  consoleLogs: ConsoleEntry[];
  consoleOpen: boolean;
  consoleUnseenError: boolean;
  onToggleConsole: () => void;
  onClearConsole: () => void;
  fileOps: FileOps;
}

const TABS: { key: PanelTab; labelKey: string }[] = [
  { key: "preview", labelKey: "builder.tabs.preview" },
  { key: "code", labelKey: "builder.tabs.code" },
  { key: "versions", labelKey: "builder.tabs.versions" },
];

const DEVICE_OPTIONS: { key: DeviceWidth; titleKey: string; icon: ReactNode }[] = [
  {
    key: "full",
    titleKey: "builder.device.desktop",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4.5" width="18" height="12" rx="2" />
        <path d="M8.5 20h7M12 16.5V20" />
      </svg>
    ),
  },
  {
    key: "md",
    titleKey: "builder.device.tablet",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M11 17.5h2" />
      </svg>
    ),
  },
  {
    key: "sm",
    titleKey: "builder.device.phone",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="7.5" y="2.5" width="9" height="19" rx="2" />
        <path d="M11 18h2" />
      </svg>
    ),
  },
];

const IFRAME_CLASS: Record<DeviceWidth, string> = {
  full: "w-full h-full border-0",
  md: "w-[768px] max-w-full h-full border-x border-line",
  sm: "w-[390px] max-w-full h-full border-x border-line",
};

function ConsoleButton({
  open,
  unseenError,
  onToggle,
  title,
}: {
  open: boolean;
  unseenError: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      aria-label={title}
      className={`relative grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors ${
        open ? "bg-panel-2 text-foreground" : "text-muted hover:bg-panel-2 hover:text-foreground"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m5 8 4 4-4 4" />
        <path d="M11 17h8" />
      </svg>
      {unseenError && (
        <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
      )}
    </button>
  );
}

function PanelLeftIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
    </svg>
  );
}

function useSaveLabel(editable: boolean, saveState: SaveState): string {
  const t = useT();
  if (!editable) return t("builder.editor.readOnly");
  if (saveState === "saving") return t("builder.editor.saving");
  if (saveState === "saved") return t("builder.editor.saved");
  if (saveState === "error") return t("builder.editor.saveFailed");
  return t("builder.editor.editable");
}

function SaveBadge({ editable, saveState }: { editable: boolean; saveState: SaveState }) {
  const label = useSaveLabel(editable, saveState);
  return (
    <span
      className={`shrink-0 px-3 text-[11px] ${
        saveState === "error" && editable ? "text-red-400" : "text-muted"
      }`}
    >
      {label}
    </span>
  );
}

function TabBar({
  tabs,
  active,
  editable,
  saveState,
  onSelect,
  onClose,
}: {
  tabs: string[];
  active: string | null;
  editable: boolean;
  saveState: SaveState;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}) {
  const t = useT();
  return (
    <div className="flex h-10 shrink-0 items-center border-b border-line">
      <div
        role="tablist"
        className="flex h-full min-w-0 flex-1 items-end gap-0.5 overflow-x-auto px-1.5"
      >
        {tabs.map((path) => {
          const name = path.split("/").pop() ?? path;
          const isActive = path === active;
          return (
            <div
              key={path}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              title={path}
              onClick={() => onSelect(path)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(path);
              }}
              className={`group flex h-8 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-t-lg border border-b-0 px-2.5 text-xs transition-colors ${
                isActive
                  ? "border-line bg-background text-foreground"
                  : "border-transparent text-muted hover:bg-panel-2/60 hover:text-foreground"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${fileDotClass(name)}`}
              />
              <span className="max-w-[140px] truncate">{name}</span>
              <button
                type="button"
                aria-label={t("builder.tabs.closeFile")}
                title={t("builder.tabs.closeFile")}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(path);
                }}
                className={`grid h-4 w-4 shrink-0 place-items-center rounded hover:bg-panel-2 hover:text-foreground ${
                  isActive ? "text-muted" : "text-transparent group-hover:text-muted"
                }`}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
      <SaveBadge editable={editable} saveState={saveState} />
    </div>
  );
}

export function PreviewPanel({
  tab,
  onTabChange,
  previewSrc,
  codeText,
  streamingCode,
  versions,
  viewing,
  publishedVersionId,
  onViewVersion,
  onBackToLatest,
  onRestoreVersion,
  template,
  files,
  filesStreaming,
  writingPath,
  changedPaths,
  compiling,
  compileErrors,
  onRequestFix,
  previewUnavailable,
  editable,
  saveState,
  onFileEdit,
  onHtmlEdit,
  previewNonce,
  consoleLogs,
  consoleOpen,
  consoleUnseenError,
  onToggleConsole,
  onClearConsole,
  fileOps,
}: PreviewPanelProps) {
  const t = useT();
  const [deviceWidth, setDeviceWidth] = useState<DeviceWidth>("full");
  const [reloadNonce, setReloadNonce] = useState(0);
  const isReact = template === "react-ts";
  const streaming = isReact ? filesStreaming : streamingCode !== null;

  // ---- Editor tabs (multiple open files) --------------------------------
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [tabsInited, setTabsInited] = useState(false);
  const [lastWriting, setLastWriting] = useState<string | null>(null);

  const entryPath = files
    ? "src/main.tsx" in files
      ? "src/main.tsx"
      : Object.keys(files)[0] ?? null
    : null;

  // Render-phase adjustments (React's documented alternative to effects):
  // open the entry file once content exists, and open/focus the file the
  // agent is currently writing.
  if (!tabsInited && entryPath) {
    setTabsInited(true);
    setOpenTabs([entryPath]);
    setActivePath(entryPath);
  }
  if (writingPath !== lastWriting) {
    setLastWriting(writingPath);
    if (writingPath) {
      if (!openTabs.includes(writingPath)) setOpenTabs([...openTabs, writingPath]);
      setActivePath(writingPath);
    }
  }

  // Tabs whose file vanished (deleted / older version) stay in state but are
  // hidden until the file exists again.
  const visibleTabs = files ? openTabs.filter((p) => p in files) : [];
  const activeFile =
    writingPath ??
    (activePath && files && activePath in files ? activePath : null) ??
    visibleTabs[0] ??
    null;

  function openFile(path: string) {
    if (!openTabs.includes(path)) setOpenTabs([...openTabs, path]);
    setActivePath(path);
  }

  function closeTab(path: string) {
    const idx = openTabs.indexOf(path);
    const next = openTabs.filter((p) => p !== path);
    setOpenTabs(next);
    if (activePath === path) {
      setActivePath(next[Math.min(idx, next.length - 1)] ?? null);
    }
  }

  // ---- Tree row menu: dialogs, uploads, tab sync -------------------------
  const [treeDialog, setTreeDialog] = useState<{
    mode: "rename" | "newFile" | "newFolder";
    target: string;
    isDir: boolean;
  } | null>(null);
  const [treeDelete, setTreeDelete] = useState<{ path: string; isDir: boolean } | null>(null);
  // Freshly created folders with no files yet (ephemeral, this session only).
  const [extraDirs, setExtraDirs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadDirRef = useRef<string>("");

  const dirOf = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
  const baseOf = (p: string) => p.split("/").pop() ?? p;

  function handleDialogConfirm(value: string) {
    if (!treeDialog) return;
    const name = value.trim();
    // One level only — no separators, no traversal.
    if (!name || name.includes("/") || name.includes("\\") || name === "..") return;
    const { mode, target, isDir } = treeDialog;
    if (mode === "rename") {
      const parent = dirOf(target);
      const newPath = parent ? `${parent}/${name}` : name;
      if (newPath !== target && fileOps.rename(target, newPath, isDir)) {
        if (isDir) {
          const prefix = `${target}/`;
          const mapPath = (p: string) =>
            p.startsWith(prefix) ? `${newPath}/${p.slice(prefix.length)}` : p;
          setOpenTabs((tabs) => tabs.map(mapPath));
          setActivePath((p) => (p ? mapPath(p) : p));
          setExtraDirs((dirs) => dirs.map((d) => (d === target ? newPath : mapPath(d))));
        } else {
          setOpenTabs((tabs) => tabs.map((p) => (p === target ? newPath : p)));
          setActivePath((p) => (p === target ? newPath : p));
        }
      }
    } else if (mode === "newFile") {
      const path = `${target}/${name}`;
      if (fileOps.create(path)) openFile(path);
    } else {
      setExtraDirs((dirs) => {
        const path = `${target}/${name}`;
        return dirs.includes(path) ? dirs : [...dirs, path];
      });
    }
    setTreeDialog(null);
  }

  function handleDeleteConfirm() {
    if (!treeDelete) return;
    const { path, isDir } = treeDelete;
    fileOps.remove(path, isDir);
    if (isDir) {
      const prefix = `${path}/`;
      setOpenTabs((tabs) => tabs.filter((p) => !p.startsWith(prefix)));
      setActivePath((p) => (p && p.startsWith(prefix) ? null : p));
      setExtraDirs((dirs) => dirs.filter((d) => d !== path && !d.startsWith(prefix)));
    } else {
      setOpenTabs((tabs) => tabs.filter((p) => p !== path));
      setActivePath((p) => (p === path ? null : p));
    }
    setTreeDelete(null);
  }

  async function handleUploadChange(
    e: React.ChangeEvent<HTMLInputElement>,
    isFolder: boolean
  ) {
    const dir = uploadDirRef.current;
    const picked = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (!dir || picked.length === 0) return;
    const entries: { path: string; content: string }[] = [];
    for (const f of picked) {
      const rel = isFolder
        ? (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
        : f.name;
      if (!TEXT_FILE_RE.test(rel)) continue; // text sources only
      entries.push({ path: `${dir}/${rel}`, content: await f.text() });
    }
    if (entries.length) fileOps.upload(entries);
  }

  const treeActions: TreeActions = {
    onPick: (path) => fileOps.attach(path),
    onDownload: (path, isDir) => fileOps.download(path, isDir),
    onRenameRequest: (path, isDir) => setTreeDialog({ mode: "rename", target: path, isDir }),
    onDeleteRequest: (path, isDir) => setTreeDelete({ path, isDir }),
    onNewFileRequest: (dir) => setTreeDialog({ mode: "newFile", target: dir, isDir: true }),
    onNewFolderRequest: (dir) => setTreeDialog({ mode: "newFolder", target: dir, isDir: true }),
    onUploadFile: (dir) => {
      uploadDirRef.current = dir;
      fileInputRef.current?.click();
    },
    onUploadFolder: (dir) => {
      uploadDirRef.current = dir;
      folderInputRef.current?.click();
    },
  };

  // File-name filter above the tree (the in-buffer search is Cmd/Ctrl-F).
  const [fileQuery, setFileQuery] = useState("");
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  // Draggable divider between the tree and the editor.
  const treeResize = useResizableWidth(224, 176, 480);
  const treeFiles = useMemo(() => {
    if (!files) return {};
    const q = fileQuery.trim().toLowerCase();
    if (!q) return files;
    return Object.fromEntries(
      Object.entries(files).filter(([p]) => p.toLowerCase().includes(q))
    );
  }, [files, fileQuery]);

  const shownCode = streaming ? streamingCode : codeText;

  // --- Evolution timeline (v1 → vN scrubber + replay) ---------------------
  // `versions` arrives newest-first; the timeline runs oldest-first.
  const ascVersions = useMemo(() => [...versions].reverse(), [versions]);
  const externalIdx = viewing
    ? ascVersions.findIndex((v) => v.id === viewing.id)
    : ascVersions.length - 1;
  // Local position while dragging/replaying (debounced commit keeps rapid
  // scrubbing from firing a fetch per tick).
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const displayIdx = dragIdx ?? (externalIdx === -1 ? ascVersions.length - 1 : externalIdx);
  const displayVersion = ascVersions[displayIdx] ?? null;
  const showTimeline =
    tab === "preview" && Boolean(previewSrc) && !streaming && ascVersions.length >= 2;

  function selectIdx(idx: number) {
    const v = ascVersions[idx];
    if (!v) return;
    if (idx === ascVersions.length - 1) onBackToLatest();
    else onViewVersion(v.id);
  }

  function stopPlay() {
    if (playTimer.current) clearInterval(playTimer.current);
    playTimer.current = null;
    setPlaying(false);
  }

  function onSlide(idx: number) {
    stopPlay();
    setDragIdx(idx);
    if (slideTimer.current) clearTimeout(slideTimer.current);
    slideTimer.current = setTimeout(() => {
      setDragIdx(null);
      selectIdx(idx);
    }, 250);
  }

  function togglePlay() {
    if (playing) {
      stopPlay();
      setDragIdx(null);
      return;
    }
    if (ascVersions.length < 2) return;
    setPlaying(true);
    let idx = 0;
    setDragIdx(0);
    selectIdx(0);
    playTimer.current = setInterval(() => {
      idx += 1;
      if (idx >= ascVersions.length) {
        stopPlay();
        setDragIdx(null);
        return;
      }
      setDragIdx(idx);
      selectIdx(idx);
    }, 1600);
  }

  useEffect(
    () => () => {
      if (slideTimer.current) clearTimeout(slideTimer.current);
      if (playTimer.current) clearInterval(playTimer.current);
    },
    []
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-line px-3 py-2">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.key}
            onClick={() => onTabChange(tabDef.key)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              tab === tabDef.key
                ? "bg-panel-2 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t(tabDef.labelKey)}
            {tabDef.key === "versions" && versions.length > 0 && (
              <span className="ml-1.5 text-xs text-muted">{versions.length}</span>
            )}
          </button>
        ))}
        {tab === "preview" && previewSrc && !streaming && (
          <div className="ml-auto flex items-center gap-1">
            {(() => {
              const idx = DEVICE_OPTIONS.findIndex((d) => d.key === deviceWidth);
              const current = DEVICE_OPTIONS[idx] ?? DEVICE_OPTIONS[0];
              const next = DEVICE_OPTIONS[(idx + 1) % DEVICE_OPTIONS.length];
              return (
                <button
                  onClick={() => setDeviceWidth(next.key)}
                  title={`${t(current.titleKey)} → ${t(next.titleKey)}`}
                  aria-label={t(current.titleKey)}
                  className="w-7 h-7 rounded-md grid place-items-center bg-panel-2 text-foreground transition-colors"
                >
                  {current.icon}
                </button>
              );
            })()}
            <button
              onClick={() => setReloadNonce((n) => n + 1)}
              title={t("builder.preview.refresh")}
              aria-label={t("builder.preview.refresh")}
              className="w-7 h-7 rounded-md grid place-items-center text-muted hover:text-foreground transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
            <button
              onClick={() => window.open(previewSrc, "_blank", "noopener,noreferrer")}
              title={t("builder.preview.openNewTab")}
              aria-label={t("builder.preview.openNewTab")}
              className="w-7 h-7 rounded-md grid place-items-center text-muted hover:text-foreground transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 17 17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {viewing && (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-panel-2 px-4 py-2 text-sm text-muted">
          <span>{t("builder.versions.viewingBanner", { n: viewing.number })}</span>
          <span className="flex gap-3 shrink-0">
            <button
              onClick={() => onRestoreVersion(viewing.id)}
              className="hover:underline font-medium text-foreground"
            >
              {t("builder.versions.restore")}
            </button>
            <button
              onClick={onBackToLatest}
              className="hover:underline hover:text-foreground"
            >
              {t("builder.versions.backToLatest")}
            </button>
          </span>
        </div>
      )}

      <div className="flex-1 min-h-0 bg-background">
        {tab === "preview" && isReact && (compiling || compileErrors || previewUnavailable) ? (
          <div className="flex h-full items-center justify-center px-8">
            {compiling ? (
              <div className="flex flex-col items-center gap-3 text-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-accent animate-blink" />
                <p className="text-sm">{t("builder.compile.compiling")}</p>
              </div>
            ) : compileErrors ? (
              <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-5">
                <p className="text-sm font-medium text-red-400">
                  {t("builder.compile.failedTitle")}
                </p>
                <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-panel-2 p-3 font-mono text-xs leading-5 text-muted whitespace-pre-wrap">
                  {compileErrors
                    .map(
                      (d) =>
                        `${d.file ?? ""}${d.line !== undefined ? `:${d.line}` : ""} ${d.text}`
                    )
                    .join("\n")}
                </pre>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={onRequestFix}
                    className="rounded-lg bg-foreground px-3.5 py-1.5 text-xs font-medium text-background hover:opacity-85 transition-opacity"
                  >
                    {t("builder.compile.fix")}
                  </button>
                  <button
                    onClick={() => onTabChange("code")}
                    className="rounded-lg border border-line px-3.5 py-1.5 text-xs text-muted hover:text-foreground hover:bg-panel-2 transition-colors"
                  >
                    {t("builder.compile.viewCode")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted text-center">
                {t("builder.compile.notBuilt")}
              </p>
            )}
          </div>
        ) : null}
        {tab === "preview" &&
          !(isReact && (compiling || compileErrors || previewUnavailable)) &&
          (previewSrc ? (
            /* Isolation comes from the CSP `sandbox` response header on the
               raw route (opaque origin). No sandbox attribute here: iframes
               carrying a sandbox attribute without allow-same-origin fail to
               render at all in some Chrome environments. */
            <div className="flex h-full flex-col">
              <div className="flex flex-1 min-h-0 justify-center bg-background">
                <iframe
                  key={`${previewSrc}-${reloadNonce}-${previewNonce}`}
                  src={previewSrc}
                  title={t("builder.preview.iframeTitle")}
                  className={`bg-white ${IFRAME_CLASS[deviceWidth]}`}
                />
              </div>
              {showTimeline && displayVersion && (
                <div className="flex items-center gap-3 border-t border-line bg-panel px-4 py-2.5">
                  <button
                    onClick={togglePlay}
                    title={playing ? t("builder.timeline.pause") : t("builder.timeline.play")}
                    aria-label={
                      playing ? t("builder.timeline.pause") : t("builder.timeline.play")
                    }
                    className="w-7 h-7 shrink-0 rounded-md grid place-items-center text-muted hover:text-foreground hover:bg-panel-2 transition-colors"
                  >
                    {playing ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <rect x="5" y="4" width="5" height="16" rx="1" />
                        <rect x="14" y="4" width="5" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M7 4.5v15a1 1 0 0 0 1.5.87l13-7.5a1 1 0 0 0 0-1.74l-13-7.5A1 1 0 0 0 7 4.5z" />
                      </svg>
                    )}
                  </button>
                  <span className="shrink-0 text-xs font-medium tabular-nums">
                    v{displayVersion.number}
                    <span className="text-muted">/{ascVersions.length}</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={ascVersions.length - 1}
                    step={1}
                    value={displayIdx}
                    onChange={(e) => onSlide(Number(e.target.value))}
                    aria-label={t("builder.timeline.slider")}
                    className="h-1.5 flex-1 cursor-pointer"
                    style={{ accentColor: "var(--accent-2)" }}
                  />
                  <span className="hidden sm:block max-w-[220px] shrink-0 truncate text-xs text-muted">
                    {displayVersion.number === 1
                      ? t("builder.timeline.initial")
                      : displayVersion.promptSummary}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted text-sm px-8 text-center">
              {streaming
                ? t("builder.preview.emptyStreaming")
                : t("builder.preview.emptyIdle")}
            </div>
          ))}

        {tab === "code" &&
          (isReact ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex min-h-0 flex-1">
                {/* Activity bar (VSCode-style): editor-wide entries live here. */}
                <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-line pt-1.5">
                  <button
                    type="button"
                    onClick={() => setTreeCollapsed((v) => !v)}
                    title={
                      treeCollapsed
                        ? t("builder.files.expandPanel")
                        : t("builder.files.collapsePanel")
                    }
                    aria-label={
                      treeCollapsed
                        ? t("builder.files.expandPanel")
                        : t("builder.files.collapsePanel")
                    }
                    className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${
                      treeCollapsed
                        ? "text-muted hover:bg-panel-2 hover:text-foreground"
                        : "bg-panel-2 text-foreground"
                    }`}
                  >
                    <PanelLeftIcon />
                  </button>
                  <ConsoleButton
                    open={consoleOpen}
                    unseenError={consoleUnseenError}
                    onToggle={onToggleConsole}
                    title={t("builder.console.toggle")}
                  />
                </div>
                {!treeCollapsed && (
                  <>
                    <div
                      style={{ width: treeResize.width }}
                      className="flex shrink-0 flex-col border-r border-line"
                    >
                      <div className="flex h-10 shrink-0 items-center border-b border-line px-1.5">
                        <input
                          value={fileQuery}
                          onChange={(e) => setFileQuery(e.target.value)}
                          placeholder={t("builder.files.search")}
                          className="h-7 w-full min-w-0 rounded-lg border border-line bg-panel px-2.5 text-xs outline-none placeholder:text-muted focus:border-accent-2/50 transition-colors"
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto py-2">
                        <FileTree
                          files={treeFiles}
                          activePath={activeFile}
                          onSelect={openFile}
                          writingPath={writingPath}
                          changedPaths={changedPaths ?? undefined}
                          actions={editable ? treeActions : undefined}
                          extraDirs={extraDirs}
                        />
                      </div>
                    </div>
                    <ResizeHandle
                      dragging={treeResize.dragging}
                      stopDragging={treeResize.stopDragging}
                      {...treeResize.handleProps}
                    />
                  </>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <TabBar
                    tabs={visibleTabs}
                    active={activeFile}
                    editable={editable}
                    saveState={saveState}
                    onSelect={setActivePath}
                    onClose={closeTab}
                  />
                  {activeFile ? (
                    <div className="min-h-0 flex-1">
                      <CodeEditor
                        path={activeFile}
                        value={files?.[activeFile] ?? ""}
                        readOnly={!editable}
                        onChange={(v) => onFileEdit(activeFile, v)}
                        followTail={streaming && writingPath === activeFile}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted">
                      {t("builder.files.codeEmpty")}
                    </div>
                  )}
                </div>
              </div>
              {consoleOpen && (
                <ConsolePanel logs={consoleLogs} onClear={onClearConsole} />
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex min-h-0 flex-1">
                <div className="flex w-10 shrink-0 flex-col items-center border-r border-line pt-1.5">
                  <ConsoleButton
                    open={consoleOpen}
                    unseenError={consoleUnseenError}
                    onToggle={onToggleConsole}
                    title={t("builder.console.toggle")}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-1.5">
                    <span className="min-w-0 flex-1 truncate pl-1.5 font-mono text-xs text-muted">
                      index.html
                    </span>
                    <SaveBadge editable={editable} saveState={saveState} />
                  </div>
                  <div className="min-h-0 flex-1">
                    <CodeEditor
                      path="index.html"
                      value={shownCode ?? ""}
                      readOnly={!editable}
                      onChange={onHtmlEdit}
                      followTail={streaming}
                    />
                  </div>
                </div>
              </div>
              {consoleOpen && (
                <ConsolePanel logs={consoleLogs} onClear={onClearConsole} />
              )}
            </div>
          ))}

        {tab === "versions" && (
          <div className="h-full overflow-y-auto p-4">
            {versions.length === 0 ? (
              <p className="text-sm text-muted text-center mt-8">
                {t("builder.versions.empty")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {versions.map((v, i) => {
                  const isLatest = i === 0;
                  const isViewing = viewing ? viewing.id === v.id : isLatest;
                  return (
                    <li
                      key={v.id}
                      className={`rounded-xl border px-4 py-3 transition-colors ${
                        isViewing
                          ? "border-accent/60 bg-panel-2"
                          : "border-line bg-panel hover:border-accent/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() => (isLatest ? onBackToLatest() : onViewVersion(v.id))}
                          className="flex-1 min-w-0 text-left"
                        >
                          <span className="text-sm font-medium">
                            v{v.number}
                            {isLatest && (
                              <span className="ml-2 text-xs text-emerald-400">
                                {t("builder.versions.latest")}
                              </span>
                            )}
                            {publishedVersionId === v.id && (
                              <span className="ml-2 text-xs text-accent-2">
                                {t("builder.versions.published")}
                              </span>
                            )}
                          </span>
                          <p className="text-xs text-muted truncate mt-0.5">
                            {v.promptSummary}
                          </p>
                        </button>
                        <span className="text-xs text-muted shrink-0">
                          {new Date(v.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Tree-menu dialogs + hidden upload inputs */}
      <InputDialog
        open={treeDialog !== null}
        title={
          treeDialog?.mode === "rename"
            ? t("builder.files.dialog.renameTitle", { name: baseOf(treeDialog.target) })
            : treeDialog?.mode === "newFile"
              ? t("builder.files.dialog.newFileTitle")
              : t("builder.files.dialog.newFolderTitle")
        }
        initialValue={treeDialog?.mode === "rename" ? baseOf(treeDialog.target) : ""}
        confirmLabel={t("builder.files.dialog.confirm")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleDialogConfirm}
        onCancel={() => setTreeDialog(null)}
      />
      <ConfirmDialog
        open={treeDelete !== null}
        title={t("builder.files.dialog.deleteTitle", {
          name: treeDelete ? baseOf(treeDelete.path) : "",
        })}
        body={
          treeDelete?.isDir
            ? t("builder.files.dialog.deleteDirBody")
            : t("builder.files.dialog.deleteFileBody")
        }
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setTreeDelete(null)}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => void handleUploadChange(e, false)}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        {...{ webkitdirectory: "" }}
        onChange={(e) => void handleUploadChange(e, true)}
      />
    </div>
  );
}
