"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useT } from "@/lib/i18n";

interface RemixButtonProps {
  slug: string;
}

// Floating remix action on the public /p/[slug] page. Anonymous viewers get
// sent to sign in; signed-in viewers fork straight into their builder.
export function RemixButton({ slug }: RemixButtonProps) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remix() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { project } = await api<{ project: { id: string } }>(
        `/api/remix/by-slug/${slug}`,
        { method: "POST" }
      );
      router.push(`/builder/${project.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t("discover.signInToRemix"));
        setTimeout(() => router.push("/login"), 900);
        return;
      }
      setError(err instanceof ApiError ? err.message : t("discover.remixFailed"));
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && (
        <span className="rounded-full bg-black/80 px-3 py-1.5 text-xs text-white/90 backdrop-blur">
          {error}
        </span>
      )}
      <button
        onClick={() => void remix()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-900 shadow-lg hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 2.5 21 6.5l-4 4" />
          <path d="M3 11V10a3.5 3.5 0 0 1 3.5-3.5H21" />
          <path d="M7 21.5 3 17.5l4-4" />
          <path d="M21 13v1a3.5 3.5 0 0 1-3.5 3.5H3" />
        </svg>
        {busy ? t("discover.remixing") : t("discover.remix")}
      </button>
    </span>
  );
}
