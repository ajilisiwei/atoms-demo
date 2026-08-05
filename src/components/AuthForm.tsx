"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client/api";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      setError(err instanceof ApiError ? err.message : "Something went wrong, please retry");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-lg font-semibold mb-8">
          <span className="text-gradient">◉ Atomlet</span>
        </Link>
        <div className="rounded-2xl border border-line bg-panel p-8">
          <h1 className="text-xl font-semibold mb-1">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted mb-6">
            {isRegister
              ? "Start building apps from a sentence."
              : "Log in to continue building."}
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted">Email</span>
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
                Password{isRegister ? " (8+ characters)" : ""}
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
              className="mt-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 py-2.5 font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Please wait…" : isRegister ? "Create account" : "Log in"}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-muted mt-6">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-accent-2 hover:underline">
                Log in
              </Link>
            </>
          ) : (
            <>
              New to Atomlet?{" "}
              <Link href="/register" className="text-accent-2 hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
