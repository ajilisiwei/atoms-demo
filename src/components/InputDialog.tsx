"use client";

import { useEffect, useRef, useState } from "react";

interface InputDialogProps {
  open: boolean;
  title: string;
  initialValue: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

// Single-field prompt dialog (rename etc.), matching ConfirmDialog's styling.
export function InputDialog({
  open,
  title,
  initialValue,
  confirmLabel,
  cancelLabel,
  busy,
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  // Re-seed the field each time the dialog opens (render-phase adjustment).
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setValue(initialValue);
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.select();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const trimmed = value.trim();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed && !busy) onConfirm(trimmed);
          }}
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={80}
            autoFocus
            disabled={busy}
            className="mt-4 w-full rounded-lg border border-line bg-panel-2 px-3 py-2.5 text-sm outline-none focus:border-accent-2 transition-colors disabled:opacity-50"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-panel-2 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={busy || !trimmed}
              className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
