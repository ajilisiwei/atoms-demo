import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { HeroPrompt } from "@/components/HeroPrompt";

const FEATURES = [
  {
    icon: "🤖",
    title: "Agent-driven build",
    body: "An AI agent plans the app step by step, then writes the full code while you watch it stream in live.",
  },
  {
    icon: "⚡",
    title: "Instant live preview",
    body: "Every generation renders immediately in a sandboxed preview. Iterate by chatting — each change is a new version you can restore.",
  },
  {
    icon: "🚀",
    title: "One-click publish",
    body: "Happy with the result? Publish it to a public URL and share a working app, not a screenshot.",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <main className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 max-w-6xl w-full mx-auto">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          <span className="text-gradient">◉ Atomlet</span>
        </Link>
        <nav className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Open dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="mb-4 text-sm text-muted border border-line rounded-full px-4 py-1.5">
          AI Agent · Code Generation · Live Preview
        </p>
        <h1 className="font-display text-4xl sm:text-6xl tracking-tight max-w-3xl leading-tight">
          Describe it.
          <br />
          <span className="text-gradient">Watch it become an app.</span>
        </h1>
        <p className="mt-6 mb-10 max-w-xl text-muted text-lg">
          Atomlet turns a sentence into a running web app — planned, coded and
          previewed by an AI agent, ready to publish in minutes.
        </p>
        <HeroPrompt isLoggedIn={Boolean(user)} />
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-line bg-panel p-6 text-left"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">
        Atomlet — an Atoms-inspired demo built for the ROOT full-stack challenge
      </footer>
    </main>
  );
}
