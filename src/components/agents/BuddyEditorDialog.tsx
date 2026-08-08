"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { api, ApiError } from "@/lib/client/api";
import { useT } from "@/lib/i18n";
import type { AgentRecord } from "@/lib/agent-types";
import {
  MAX_BUDDY_NAME,
  MAX_BUDDY_SPECIALTY,
  MIN_BUDDY_SPECIALTY,
  avatarPathPrefix,
} from "@/lib/agent-validate";

// Avatars shipped in public/agents. Kept as a literal list because the picker
// needs concrete choices; the server accepts any /agents/*.png path.
const BUILTIN_AVATARS = [
  "/agents/timo.png",
  "/agents/ledger.png",
  "/agents/momo.png",
  "/agents/pixel.png",
  "/agents/sage.png",
];

const AVATAR_PX = 256;
const AVATAR_MIME = "image/webp";

export interface BuddyEditorInitial {
  id: string;
  name: string;
  specialty: string;
  avatarUrl: string;
}

interface BuddyEditorDialogProps {
  open: boolean;
  // Absent for a create; present to edit an existing custom buddy.
  initial?: BuddyEditorInitial;
  onClose: () => void;
  onSaved: (agent: AgentRecord) => void;
}

// Center-crops to a square and re-encodes at avatar size, so what leaves the
// browser is always a small WebP regardless of what the user picked.
async function cropToSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const size = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_PX;
    canvas.height = AVATAR_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable");
    ctx.drawImage(
      bitmap,
      (bitmap.width - size) / 2,
      (bitmap.height - size) / 2,
      size,
      size,
      0,
      0,
      AVATAR_PX,
      AVATAR_PX
    );
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Image encoding failed"))),
        AVATAR_MIME,
        0.9
      );
    });
  } finally {
    bitmap.close();
  }
}

export function BuddyEditorDialog({
  open,
  initial,
  onClose,
  onSaved,
}: BuddyEditorDialogProps) {
  const t = useT();
  const [name, setName] = useState(initial?.name ?? "");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl ?? BUILTIN_AVATARS[0]);
  // An uploaded avatar keeps its own tile, so switching to a built-in one and
  // back does not lose it.
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(
    initial && !BUILTIN_AVATARS.includes(initial.avatarUrl) ? initial.avatarUrl : null
  );
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userIdRef = useRef<string | null>(null);

  // Re-seed the form each time the dialog opens (render-phase adjustment,
  // matching InputDialog).
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(initial?.name ?? "");
      setSpecialty(initial?.specialty ?? "");
      setAvatarUrl(initial?.avatarUrl ?? BUILTIN_AVATARS[0]);
      setUploadedUrl(
        initial && !BUILTIN_AVATARS.includes(initial.avatarUrl) ? initial.avatarUrl : null
      );
      setError(null);
      setUploading(false);
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const trimmedName = name.trim();
  const trimmedSpecialty = specialty.trim();
  const canSave =
    trimmedName.length > 0 &&
    trimmedSpecialty.length >= MIN_BUDDY_SPECIALTY &&
    Boolean(avatarUrl) &&
    !busy &&
    !uploading;

  // The blob pathname is chosen client-side and must land under the caller's
  // own prefix, so the id comes from the session rather than a prop.
  async function currentUserId(): Promise<string> {
    if (userIdRef.current) return userIdRef.current;
    const { user } = await api<{ user: { id: string } | null }>("/api/auth/me");
    if (!user) throw new Error("Not signed in");
    userIdRef.current = user.id;
    return user.id;
  }

  async function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so picking the same file twice still fires a change event.
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const square = await cropToSquareWebp(file);
      const userId = await currentUserId();
      const result = await upload(`${avatarPathPrefix(userId)}buddy.webp`, square, {
        access: "public",
        handleUploadUrl: "/api/agents/avatar",
        contentType: AVATAR_MIME,
      });
      setUploadedUrl(result.url);
      setAvatarUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("agents.editor.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = JSON.stringify({
        name: trimmedName,
        specialty: trimmedSpecialty,
        avatarUrl,
      });
      const { agent } = initial
        ? await api<{ agent: AgentRecord }>(`/api/agents/${initial.id}`, {
            method: "PATCH",
            body: payload,
          })
        : await api<{ agent: AgentRecord }>("/api/agents/create", {
            method: "POST",
            body: payload,
          });
      onSaved(agent);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("agents.editor.failed"));
    } finally {
      setBusy(false);
    }
  }

  const choices = uploadedUrl ? [...BUILTIN_AVATARS, uploadedUrl] : BUILTIN_AVATARS;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(initial ? "agents.editor.editTitle" : "agents.editor.createTitle")}
        className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <h2 className="text-lg font-semibold">
            {t(initial ? "agents.editor.editTitle" : "agents.editor.createTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) void save();
          }}
        >
          <label className="block text-sm font-medium mb-1.5" htmlFor="buddy-name">
            {t("agents.editor.nameLabel")}
          </label>
          <input
            id="buddy-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_BUDDY_NAME}
            placeholder={t("agents.editor.namePlaceholder")}
            autoFocus
            disabled={busy}
            className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-sm outline-none focus:border-accent-2 transition-colors disabled:opacity-50"
          />

          <div className="mt-5 flex items-baseline justify-between">
            <label className="block text-sm font-medium" htmlFor="buddy-specialty">
              {t("agents.editor.specialtyLabel")}
            </label>
            <span
              className={`text-xs tabular-nums ${
                trimmedSpecialty.length > 0 && trimmedSpecialty.length < MIN_BUDDY_SPECIALTY
                  ? "text-red-400"
                  : "text-muted"
              }`}
            >
              {t("agents.editor.counter", {
                n: trimmedSpecialty.length,
                max: MAX_BUDDY_SPECIALTY,
              })}
            </span>
          </div>
          <textarea
            id="buddy-specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            maxLength={MAX_BUDDY_SPECIALTY}
            rows={4}
            placeholder={t("agents.editor.specialtyPlaceholder")}
            disabled={busy}
            className="mt-1.5 w-full resize-none rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-accent-2 transition-colors disabled:opacity-50"
          />
          <p className="mt-1.5 text-xs text-muted">
            {t("agents.editor.specialtyHint", { min: MIN_BUDDY_SPECIALTY })}
          </p>

          <p className="mt-5 mb-2 text-sm font-medium">{t("agents.editor.avatarLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {choices.map((choice) => {
              const isSelected = choice === avatarUrl;
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setAvatarUrl(choice)}
                  aria-pressed={isSelected}
                  aria-label={choice}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 transition-all hover:scale-105 ${
                    isSelected ? "border-accent-2 shadow-lg" : "border-line opacity-70"
                  }`}
                >
                  <Image src={choice} alt="" fill sizes="56px" className="object-cover" />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || busy}
              className="h-14 w-14 shrink-0 rounded-full border-2 border-dashed border-line text-xs text-muted hover:border-accent-2 hover:text-foreground transition-colors disabled:opacity-50"
            >
              {uploading ? "…" : t("agents.editor.upload")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => void onFileChosen(e)}
              className="hidden"
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {uploading ? t("agents.editor.uploading") : t("agents.editor.uploadHint")}
          </p>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-panel-2 transition-colors disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy
                ? t("agents.editor.saving")
                : t(initial ? "agents.editor.save" : "agents.editor.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
