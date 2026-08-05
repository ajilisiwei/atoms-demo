# Atomlet — build apps by talking

An Atoms-inspired AI app builder: describe an app in a sentence, watch an AI
agent plan it and stream the code in live, iterate by chatting, then publish
it to a public URL with one click.

Built for the ROOT / AI Native full-stack challenge.

## What it does

- **Agent-driven generation** — a build agent (DeepSeek `deepseek-v4-flash`)
  plans the app step by step, then writes a complete self-contained HTML app.
  Plan steps and code stream into the UI in real time over SSE.
- **Live preview** — every generation renders instantly in a sandboxed iframe.
- **Chat iteration** — describe a change; the agent re-emits the full updated
  app against the current code. Every generation is an immutable version.
- **Version history** — inspect any version, restore it (append-only, never
  rewrites history), publish any specific version.
- **One-click publish** — the app gets a stable public URL (`/p/<slug>`),
  served with origin isolation. Unpublish / republish at any time.
- **Accounts & persistence** — email+password auth, projects / chat history /
  versions all persisted in Postgres.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│ Next.js 16 (App Router, TypeScript, Tailwind v4)     │
│                                                      │
│  Landing → Auth → Dashboard → Builder                │
│    Builder = Chat + Agent timeline │ Preview/Code/   │
│              (SSE streaming)       │ Versions tabs   │
│                                                      │
│  API routes (Node runtime)                           │
│   /api/auth/*                 register/login/logout  │
│   /api/projects[...]          CRUD + versions        │
│   /api/projects/:id/chat      SSE generation stream  │
│   /api/projects/:id/publish   publish/unpublish      │
│   /p/:slug/raw                published app document │
└───────────────┬──────────────────────────────────────┘
                │
   DeepSeek API (deepseek-v4-flash, streaming,
   reasoning disabled for latency)
                │
   Postgres (Prisma 7 + driver adapter)
   User · Project · Message · AppVersion
```

### Generation pipeline

The agent responds in a marker protocol streamed token by token:

```
<PLAN>  - build steps …            → agent timeline (SSE: plan_step)
<FILE>  <!doctype html> …          → code pane      (SSE: html_delta)
<SUMMARY> what was built …         → chat reply     (SSE: summary)
```

`src/lib/stream-parser.ts` is an incremental state machine that survives
markers split across chunks, holds back partial closing tags, and rescues
non-conforming outputs (bare HTML / markdown fences). On success the version
+ messages are persisted atomically and a `done` event closes the stream.

### Security model for generated code

Generated apps are untrusted input — LLM output can be poisoned by indirect
prompt injection, so even the owner's own preview must not run with the
platform's origin:

- **Builder preview** loads from an owner-authenticated route
  (`/api/projects/:id/versions/:versionId/raw`) and **published pages** from
  `/p/:slug/raw`. Both are served with
  `Content-Security-Policy: sandbox allow-scripts allow-forms allow-modals`,
  giving the generated document an **opaque origin**: it cannot call Atomlet
  APIs with the viewer's session cookie, regardless of what code the model
  produced. (The header, not an iframe `sandbox` attribute, is the isolation
  mechanism — sandbox-attribute iframes without `allow-same-origin` fail to
  render entirely in some Chrome environments.)
- Opaque origins make `localStorage` throw, so a small storage shim
  (in-memory fallback) is injected into served HTML
  (`src/lib/storage-shim.ts`) — generated apps keep working, their data lives
  per tab session.
- Known limitation: published apps share the platform's domain (a phishing
  consideration); a dedicated wildcard subdomain per app is the standard fix
  and first on the security roadmap.

Other hardening: bcrypt password hashing, httpOnly SameSite JWT session
cookie, ownership checks on every project route, per-user/IP rate limits,
prompt length caps, LLM output validation before persisting.

## Run locally

Prereqs: Node 20+, pnpm, Docker.

```bash
cp .env.example .env          # fill JWT_SECRET (openssl rand -hex 32) and DEEPSEEK_API_KEY
docker compose up -d          # Postgres on :54329
pnpm install                  # runs prisma generate
npx prisma migrate dev        # apply schema
pnpm dev                      # http://localhost:3000
```

## Deploy

Any Node host + any Postgres works. Reference setup:

1. Postgres: Supabase / Neon — set `DATABASE_URL`.
2. Vercel: import the repo, set `DATABASE_URL`, `JWT_SECRET`,
   `DEEPSEEK_API_KEY` (optional `LLM_MODEL`), deploy.
   `postinstall` runs `prisma generate`; run
   `npx prisma migrate deploy` once against the production DB.

Note: the in-memory rate limiter assumes a single instance; swap for
Redis/Upstash if scaling out.

## Key trade-offs (by design, for a 6-8h scope)

- **Single-file HTML output** instead of multi-file projects — makes preview,
  storage, versioning and publishing trivial; the protocol has a `FILE`
  marker so multi-file is a natural extension.
- **Full regeneration on edit** instead of diffs — slower but far more
  reliable within the time budget; versions make it safe.
- **Append-only versions with restore-as-copy** — no history rewrites.

## If I had more time

1. Multi-file projects + client-side esbuild for React/TS output
2. Diff-based edits (send patch, apply server-side) to cut latency/cost
3. Race mode: two models generate in parallel, user picks the winner
4. Per-app key-value storage API so published apps get real persistence
5. Streaming preview (render partial HTML during generation)
