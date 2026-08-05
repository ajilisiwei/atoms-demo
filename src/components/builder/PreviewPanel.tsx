"use client";

import { useEffect, useRef, useState } from "react";
import type { VersionMeta } from "@/lib/client/api";

export type PanelTab = "preview" | "code" | "versions";

interface ViewingVersion {
  id: string;
  number: number;
}

interface PreviewPanelProps {
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  html: string | null;
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

export function PreviewPanel({
  tab,
  onTabChange,
  html,
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
  const streaming = streamingCode !== null;

  // Auto-scroll the code pane while the agent streams code in.
  useEffect(() => {
    if (streaming && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [streamingCode, streaming]);

  async function copyCode() {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const shownCode = streaming ? streamingCode : html;

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
        {tab === "code" && html && !streaming && (
          <button
            onClick={copyCode}
            className="ml-auto text-xs text-muted hover:text-foreground transition-colors"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        )}
      </div>

      {viewing && (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-amber-950/30 px-4 py-2 text-sm text-amber-300">
          <span>Viewing v{viewing.number} — not the latest version</span>
          <span className="flex gap-3 shrink-0">
            <button
              onClick={() => onRestoreVersion(viewing.id)}
              className="hover:underline font-medium"
            >
              Restore
            </button>
            <button onClick={onBackToLatest} className="hover:underline">
              Back to latest
            </button>
          </span>
        </div>
      )}

      <div className="flex-1 min-h-0 bg-[#0d1017]">
        {tab === "preview" &&
          (html ? (
            <iframe
              key={viewing?.id ?? "latest"}
              srcDoc={html}
              sandbox="allow-scripts allow-same-origin allow-modals"
              title="App preview"
              className="h-full w-full border-0 bg-white"
            />
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
            className="h-full overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap break-words"
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
