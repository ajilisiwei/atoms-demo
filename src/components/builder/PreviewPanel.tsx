"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { VersionMeta } from "@/lib/client/api";

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

const TABS: { key: PanelTab; label: string }[] = [
  { key: "preview", label: "Preview" },
  { key: "code", label: "Code" },
  { key: "versions", label: "Versions" },
];

const DEVICE_OPTIONS: { key: DeviceWidth; title: string; icon: ReactNode }[] = [
  {
    key: "full",
    title: "Desktop width",
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
    title: "Tablet width",
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
    title: "Phone width",
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-line px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              tab === t.key
                ? "bg-panel-2 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            {t.key === "versions" && versions.length > 0 && (
              <span className="ml-1.5 text-xs text-muted">{versions.length}</span>
            )}
          </button>
        ))}
        {tab === "code" && codeText && !streaming && (
          <button
            onClick={copyCode}
            className="ml-auto text-xs text-muted hover:text-foreground transition-colors"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        )}
        {tab === "preview" && previewSrc && !streaming && (
          <div className="ml-auto flex items-center gap-1">
            {DEVICE_OPTIONS.map((d) => (
              <button
                key={d.key}
                onClick={() => setDeviceWidth(d.key)}
                title={d.title}
                aria-label={d.title}
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
              title="Refresh preview"
              aria-label="Refresh preview"
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
              title="Open in new tab"
              aria-label="Open in new tab"
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
          <span>Viewing v{viewing.number} — not the latest version</span>
          <span className="flex gap-3 shrink-0">
            <button
              onClick={() => onRestoreVersion(viewing.id)}
              className="hover:underline font-medium text-foreground"
            >
              Restore
            </button>
            <button
              onClick={onBackToLatest}
              className="hover:underline hover:text-foreground"
            >
              Back to latest
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
            <div className="flex justify-center h-full bg-background">
              <iframe
                key={previewSrc + "-" + reloadNonce}
                src={previewSrc}
                title="App preview"
                className={`bg-white ${IFRAME_CLASS[deviceWidth]}`}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted text-sm px-8 text-center">
              {streaming
                ? "The agent is writing code — preview appears when it finishes."
                : "Nothing here yet. Send a prompt to generate your app."}
            </div>
          ))}

        {tab === "code" && (
          <pre
            ref={codeRef}
            className="h-full overflow-auto p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words"
          >
            {shownCode ?? "// No code yet — send a prompt to generate your app."}
            {streaming && <span className="text-accent animate-blink">▌</span>}
          </pre>
        )}

        {tab === "versions" && (
          <div className="h-full overflow-y-auto p-4">
            {versions.length === 0 ? (
              <p className="text-sm text-muted text-center mt-8">
                Versions appear here after your first generation.
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
                              <span className="ml-2 text-xs text-emerald-400">latest</span>
                            )}
                            {publishedVersionId === v.id && (
                              <span className="ml-2 text-xs text-accent-2">published</span>
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
