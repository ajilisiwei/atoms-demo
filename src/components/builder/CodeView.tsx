"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

interface CodeViewProps {
  // Project-relative path of the file being shown; null renders the empty state.
  path: string | null;
  content: string;
  // True while the agent is still writing this file.
  streaming?: boolean;
}

const COPIED_FLASH_MS = 1500;

function CopyIcon() {
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
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function CodeView({ path, content, streaming = false }: CodeViewProps) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);

  const lineCount = useMemo(() => content.split("\n").length, [content]);
  // One text node beats one element per line: alignment comes from the shared
  // line-height, and a 2000-line file stays cheap to render.
  const gutter = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount]
  );

  // Follow the tail while the agent streams the file in.
  useEffect(() => {
    if (streaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, streaming]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard denied or unavailable (insecure context) — skip the flash
      // rather than interrupting the user with an error.
      return;
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), COPIED_FLASH_MS);
  }

  if (!path) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center text-sm text-muted">
        {t("builder.files.codeEmpty")}
      </div>
    );
  }

  const lastSlash = path.lastIndexOf("/");
  const dirPart = lastSlash === -1 ? "" : path.slice(0, lastSlash + 1);
  const fileName = path.slice(lastSlash + 1);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line px-3">
        <span className="flex min-w-0 flex-1 items-baseline font-mono text-xs">
          {dirPart && (
            // RTL container + isolated LTR text: overflow clips the leading
            // directories ("…/components/") so the file name always survives.
            <span dir="rtl" className="min-w-0 truncate text-muted">
              <bdi dir="ltr">{dirPart}</bdi>
            </span>
          )}
          <span className="shrink-0 text-foreground">{fileName}</span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {t("builder.files.lines", { n: lineCount })}
        </span>
        <button
          type="button"
          onClick={() => void copyContent()}
          title={copied ? t("builder.files.copied") : t("builder.files.copyCode")}
          aria-label={copied ? t("builder.files.copied") : t("builder.files.copyCode")}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors ${
            copied ? "text-accent-2" : "text-muted hover:bg-panel-2 hover:text-foreground"
          }`}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-max min-w-full">
          <pre
            aria-hidden="true"
            className="sticky left-0 z-10 shrink-0 select-none border-r border-line bg-panel px-3 py-3 text-right font-mono text-xs leading-5 tabular-nums text-muted"
          >
            {gutter}
          </pre>
          <pre className="py-3 pl-4 pr-6 font-mono text-xs leading-5 whitespace-pre text-foreground">
            <code>{content}</code>
            {streaming && (
              <span className="ml-px inline-block h-3 w-[6px] translate-y-[1px] animate-pulse rounded-[1px] bg-accent" />
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
