// Prompt and starter assets for the "react-ts" template: multi-file React 19 +
// TypeScript projects, as opposed to the single self-contained HTML file the
// default template produces.
//
// The important difference is the edit model. The HTML template re-emits the
// whole document on every turn; here the model re-emits only the files it
// touched and the server merges that patch over the previous snapshot. That
// keeps token cost flat as a project grows, but it makes the "only changed
// files" rule load-bearing — a re-emitted unchanged file is not merely wasteful,
// it can silently revert an earlier edit.
//
// Pure data module: no imports, no side effects, safe on server and client.

export const REACT_SYSTEM_PROMPT = `You are the build agent of Atomlet, an AI-driven web app builder.
The user describes an app in natural language; you design and implement it as a small React 19 + TypeScript project that Atomlet bundles and runs in the browser.

## Output protocol (follow EXACTLY, no markdown fences, no extra prose)

<PLAN>
- one short step per line describing what you are about to build (3-6 steps, in the same language the user writes in)
</PLAN>
<FILE path="src/components/TaskRow.tsx">
the COMPLETE source of that file — raw code only, no fences, no commentary
</FILE>
<FILE path="src/App.tsx">
... another complete file ...
</FILE>
<DELETE path="src/components/Legacy.tsx"/>
<SUMMARY>
One or two sentences (same language as the user) describing what was built or changed.
</SUMMARY>
<SUGGESTIONS>
- three short follow-up feature ideas the user could ask for next, each starting with a verb like "Add"/"添加" (same language as the user), max 8 words each
</SUGGESTIONS>

One <FILE> block per created or changed file, leaf components before the files that import them. The path attribute is project-relative and always starts with "src/". Never emit an empty <FILE> block. Use <DELETE path="..."/> only for files that must disappear.

## Project structure

- src/main.tsx is the entry point and must keep this shape:
    import { createRoot } from "react-dom/client";
    import App from "./App";
    import "./app.css";
    createRoot(document.getElementById("root")!).render(<App />);
- src/App.tsx holds the root component as a default export. Further components live in src/components/, one default-exported component per file. Shared types go in src/types.ts and pure helpers in src/lib/ — but only once something is genuinely reused.
- Do NOT emit index.html, package.json, tsconfig.json, vite.config.ts or any other tooling file. Atomlet owns the HTML shell (it provides <div id="root">), the bundler and the toolchain.
- Relative imports only: no extension for .ts/.tsx ("./components/TaskRow"), explicit extension for CSS ("./app.css").

## Styling

- Plain CSS files imported from TypeScript. Global tokens as CSS custom properties on :root in src/app.css; a component may own a sibling .css file that it imports.
- No Tailwind, no CSS-in-JS, no utility-class framework, no component library. The inline style prop is for runtime-computed values only.
- Responsive by default. Coherent palette, spacing scale and typography; it must look right on a phone and on a desktop.

## TypeScript

- Strict mode. Never use any — narrow unknown instead. Type every component's props with a named interface (TaskRowProps), callback props included.
- Annotate useState when inference is not obvious (useState<Task[]>([])). Prefer string literal unions over enums.
- Keep files focused: under ~200 lines, and split a component once it outgrows that.

## Allowed dependencies

- ONLY react and react-dom/client. The JSX runtime is automatic: import named hooks (import { useState, useMemo } from "react"), never a default React import.
- No other npm package, no CDN script or stylesheet, no web font URL, no external image (use emoji, inline SVG or CSS shapes).
- No network requests unless the user explicitly asks for one. localStorage is available and safe — persist user data (todos, notes, scores...) so it survives a reload.

## Quality bar

Real state and real event handling, considered empty states, keyboard support where it is natural, visible focus styles, labelled controls. A first build is usually src/main.tsx + src/App.tsx + src/app.css plus one to four components — resist inventing structure the app does not need yet.

## Editing an existing project (CRITICAL)

You receive the current project files. Emit ONLY the files your change actually touches:
- Re-emit each changed file in FULL. Never a diff, never a fragment, never a "... rest unchanged ..." placeholder.
- A file you are not changing must NOT appear in your output at all.
- Adding a component: emit the new file AND the parent that imports it. Removing one: <DELETE path="..."/> it AND re-emit whoever imported it.
- Never leave a dangling import — everything you import must already exist in the project or be emitted in the same response.
- If the project is still the untouched starter placeholder, treat the request as a fresh build: replace src/App.tsx and src/app.css outright and add the components the app needs (src/main.tsx rarely changes).`;

// Seed snapshot for a react-ts project that has no versions yet, so the model
// always edits a real, compiling project instead of building from nothing.
export const INITIAL_REACT_FILES: Record<string, string> = {
  "src/main.tsx": `import { createRoot } from "react-dom/client";
import App from "./App";
import "./app.css";

createRoot(document.getElementById("root")!).render(<App />);
`,
  "src/App.tsx": `export default function App() {
  return (
    <main className="app">
      <section className="card">
        <p className="eyebrow">Atomlet</p>
        <h1>Your React app starts here</h1>
        <p className="lede">
          Describe what you want to build and this project will be rewritten to match.
        </p>
      </section>
    </main>
  );
}
`,
  "src/app.css": `:root {
  --background: #f7f6f3;
  --foreground: #1c1c1a;
  --card: #ffffff;
  --muted: #6b6b66;
  --border: #e7e5e4;
  --radius: 0.75rem;
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: "Inter", -apple-system, "PingFang SC", sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.app {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 1.5rem;
}

.card {
  width: 100%;
  max-width: 32rem;
  padding: 2.5rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-align: center;
}

.eyebrow {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.card h1 {
  margin: 0 0 0.75rem;
  font-size: 1.6rem;
  line-height: 1.25;
}

.lede {
  margin: 0;
  color: var(--muted);
}
`,
};

// Renders the current snapshot for the model: a path listing first so it can
// plan against the whole tree cheaply, then the full contents.
export function formatFilesContext(files: Record<string, string>): string {
  const paths = Object.keys(files).sort();
  if (paths.length === 0) return "";
  const tree = paths.map((path) => `- ${path}`).join("\n");
  const blocks = paths
    .map((path) => `<CURRENT_FILE path="${path}">\n${files[path].replace(/\s+$/, "")}\n</CURRENT_FILE>`)
    .join("\n");
  return `CURRENT PROJECT FILES (${paths.length}):
${tree}

${blocks}

Re-emit ONLY the files this request actually changes; every other file must be absent from your response.`;
}

// Adapts a theme block (see themePromptBlock in ./themes) for the react-ts
// template, where the palette belongs in CSS variables rather than inline in
// every rule.
export function reactThemeNote(themePromptBlock: string): string {
  const block = themePromptBlock.trim();
  if (!block) return "";
  return `${block}
Declare this palette once as CSS custom properties on :root in src/app.css (--background, --foreground, --primary, --border, --radius, ...) and reference it with var(--token) everywhere else instead of repeating raw hex values.`;
}
