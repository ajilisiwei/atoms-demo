"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useT } from "@/lib/i18n";
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
  const t = useT();
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
      setError(err instanceof ApiError ? err.message : t("builder.publish.failed"));
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
      setError(
        err instanceof ApiError ? err.message : t("builder.publish.unpublishFailed")
      );
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
          <h2 className="text-lg font-semibold">{t("builder.publish.title")}</h2>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {isPublished && publicUrl ? (
          <div className="mb-5">
            <p className="text-sm text-muted mb-2">{t("builder.publish.liveAt")}</p>
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
                {copied ? "✓" : t("builder.copy")}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted mb-5">{t("builder.publish.explainer")}</p>
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
                ? t("builder.publish.working")
                : isPublished
                  ? t("builder.publish.update", { n: targetVersionNumber })
                  : t("builder.publish.publishVersion", { n: targetVersionNumber })}
            </button>
          )}
          {isCurrentTargetLive && (
            <p className="text-center text-sm text-emerald-400 py-1.5">
              {t("builder.publish.versionLive", { n: targetVersionNumber })}
            </p>
          )}
          {isPublished && (
            <button
              onClick={() => void unpublish()}
              disabled={busy}
              className="rounded-lg border border-line py-2.5 text-sm text-muted hover:text-red-400 hover:border-red-900 transition-colors disabled:opacity-50"
            >
              {t("builder.publish.unpublish")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
