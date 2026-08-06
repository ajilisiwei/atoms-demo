"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { VersionMeta } from "@/lib/client/api";
import { useT } from "@/lib/i18n";

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
}: PreviewPanelProps) {
  const t = useT();
  const codeRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const [deviceWidth, setDeviceWidth] = useState<DeviceWidth>("full");
  const [reloadNonce, setReloadNonce] = useState(0);
  const streaming = streamingCode !== null;

  // Auto-scroll the code pane while the agent streams code in.
  useEffect(() => {
    if (streaming && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [streamingCode, streaming]);

  async function copyCode() {
    if (!codeText) return;
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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
        {tab === "code" && codeText && !streaming && (
          <button
            onClick={copyCode}
            className="ml-auto text-xs text-muted hover:text-foreground transition-colors"
          >
            {copied ? t("builder.copied") : t("builder.copy")}
          </button>
        )}
        {tab === "preview" && previewSrc && !streaming && (
          <div className="ml-auto flex items-center gap-1">
            {DEVICE_OPTIONS.map((d) => (
              <button
                key={d.key}
                onClick={() => setDeviceWidth(d.key)}
                title={t(d.titleKey)}
                aria-label={t(d.titleKey)}
                className={`w-7 h-7 rounded-md grid place-items-center transition-colors ${
                  deviceWidth === d.key
                    ? "bg-panel-2 text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {d.icon}
              </button>
            ))}
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
        {tab === "preview" &&
          (previewSrc ? (
            /* Isolation comes from the CSP `sandbox` response header on the
               raw route (opaque origin). No sandbox attribute here: iframes
               carrying a sandbox attribute without allow-same-origin fail to
               render at all in some Chrome environments. */
            <div className="flex h-full flex-col">
              <div className="flex flex-1 min-h-0 justify-center bg-background">
                <iframe
                  key={previewSrc + "-" + reloadNonce}
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

        {tab === "code" && (
          <pre
            ref={codeRef}
            className="h-full overflow-auto p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words"
          >
            {shownCode ?? t("builder.code.empty")}
            {streaming && <span className="text-accent animate-blink">▌</span>}
          </pre>
        )}

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
    </div>
  );
}
