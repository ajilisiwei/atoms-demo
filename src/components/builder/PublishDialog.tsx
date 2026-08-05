"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import type { BuilderProject } from "./types";

interface PublishDialogProps {
  project: BuilderProject;
  targetVersionId: string;
  targetVersionNumber: number;
  onClose: () => void;
  onPublished: (slug: string, publishedVersionId: string) => void;
  onUnpublished: () => void;
}

export function PublishDialog({
  project,
  targetVersionId,
  targetVersionNumber,
  onClose,
  onPublished,
  onUnpublished,
}: PublishDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isPublished = Boolean(project.publishedVersionId);
  const isCurrentTargetLive = project.publishedVersionId === targetVersionId;
  const publicUrl =
    typeof window !== "undefined" && project.slug
      ? `${window.location.origin}/p/${project.slug}`
      : null;

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const { project: updated } = await api<{
        project: { slug: string; publishedVersionId: string };
      }>(`/api/projects/${project.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ versionId: targetVersionId }),
      });
      onPublished(updated.slug, updated.publishedVersionId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/projects/${project.id}/publish`, { method: "DELETE" });
      onUnpublished();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unpublish failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold">Publish app</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        {isPublished && publicUrl ? (
          <div className="mb-5">
            <p className="text-sm text-muted mb-2">Your app is live at:</p>
            <div className="flex items-center gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 truncate rounded-lg bg-panel-2 border border-line px-3 py-2 text-sm text-accent-2 hover:underline"
              >
                {publicUrl}
              </a>
              <button
                onClick={copyUrl}
                className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                {copied ? "✓" : "Copy"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted mb-5">
            Publishing makes this app available to anyone at a public URL. You
            can unpublish or update it at any time.
          </p>
        )}

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="flex flex-col gap-2">
          {!isCurrentTargetLive && (
            <button
              onClick={() => void publish()}
              disabled={busy}
              className="rounded-lg bg-gradient-to-r from-accent to-accent-2 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy
                ? "Working…"
                : isPublished
                  ? `Update live app to v${targetVersionNumber}`
                  : `Publish v${targetVersionNumber}`}
            </button>
          )}
          {isCurrentTargetLive && (
            <p className="text-center text-sm text-emerald-400 py-1.5">
              v{targetVersionNumber} is live ✓
            </p>
          )}
          {isPublished && (
            <button
              onClick={() => void unpublish()}
              disabled={busy}
              className="rounded-lg border border-line py-2.5 text-sm text-muted hover:text-red-400 hover:border-red-900 transition-colors disabled:opacity-50"
            >
              Unpublish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
