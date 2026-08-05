"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useT } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import { OAuthButtons } from "@/components/OAuthButtons";

// Known OAuth error codes (passed by the login page) → dict keys.
const OAUTH_ERROR_KEYS: Record<string, string> = {
  oauth: "auth.oauthError",
  oauth_email: "auth.oauthEmailError",
};

interface AuthFormProps {
  mode: "login" | "register";
  oauthProviders?: string[];
  oauthErrorCode?: string | null;
}

export function AuthForm({ mode, oauthProviders, oauthErrorCode }: AuthFormProps) {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Seed with the localized OAuth error; unknown codes fall back to the
  // generic OAuth failure message.
  const [error, setError] = useState<string | null>(() =>
    oauthErrorCode ? t(OAUTH_ERROR_KEYS[oauthErrorCode] ?? "auth.oauthError") : null
  );
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.genericError"));
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/dashboard" className="block text-center text-lg font-semibold mb-8">
          <Logo size={22} />
        </Link>
        <div className="rounded-2xl border border-line bg-panel p-8">
          <h1 className="text-xl font-semibold mb-1">
            {isRegister ? t("auth.createTitle") : t("auth.loginTitle")}
          </h1>
          <p className="text-sm text-muted mb-6">
            {isRegister ? t("auth.createSubtitle") : t("auth.loginSubtitle")}
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted">{t("auth.email")}</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg bg-panel-2 border border-line px-3 py-2.5 outline-none focus:border-accent transition-colors"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted">
                {isRegister ? t("auth.passwordWithHint") : t("auth.password")}
              </span>
              <input
                type="password"
                required
                minLength={isRegister ? 8 : undefined}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg bg-panel-2 border border-line px-3 py-2.5 outline-none focus:border-accent transition-colors"
              />
            </label>
            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-lg bg-foreground py-2.5 font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting
                ? t("auth.pleaseWait")
                : isRegister
                  ? t("auth.createAccount")
                  : t("auth.logIn")}
            </button>
          </form>
          <OAuthButtons providers={oauthProviders ?? []} />
        </div>
        <p className="text-center text-sm text-muted mt-6">
          {isRegister ? (
            <>
              {t("auth.haveAccount")}{" "}
              <Link href="/login" className="text-accent-2 hover:underline">
                {t("auth.logIn")}
              </Link>
            </>
          ) : (
            <>
              {t("auth.newTo")}{" "}
              <Link href="/register" className="text-accent-2 hover:underline">
                {t("auth.createAccountLink")}
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
