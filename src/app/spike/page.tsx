"use client";

// P0 spike: esbuild-wasm in-browser bundling + postMessage preview host.
// Temporary page — verifies the multi-file React pipeline end to end before
// the real feature lands. Remove before merging.

import { useEffect, useRef, useState } from "react";

const DEMO_FILES: Record<string, string> = {
  "src/main.tsx": `import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./app.css";

createRoot(document.getElementById("root")!).render(<App />);
`,
  "src/App.tsx": `import { useState } from "react";
import { Badge } from "./components/Badge";

export function App() {
  const [n, setN] = useState(0);
  return (
    <main className="wrap">
      <h1>Atomlet React Spike</h1>
      <Badge label={\`count: \${n}\`} />
      <button onClick={() => setN((v) => v + 1)}>increment</button>
    </main>
  );
}
`,
  "src/components/Badge.tsx": `export function Badge({ label }: { label: string }) {
  return <span className="badge">{label}</span>;
}
`,
  "src/app.css": `.wrap { font-family: system-ui; padding: 2rem; }
.badge { background: #4b6bfb; color: white; border-radius: 999px; padding: 4px 12px; margin-right: 12px; }
button { padding: 6px 14px; border-radius: 8px; border: 1px solid #ccc; cursor: pointer; }
`,
};

// All three specifiers resolve to ONE URL — one module instance, so hooks
// and the renderer always share the same React.
const IMPORT_MAP = {
  imports: {
    react: "/vendor/react.js",
    "react-dom/client": "/vendor/react.js",
    "react/jsx-runtime": "/vendor/react.js",
  },
};

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}

function joinPath(base: string, rel: string): string {
  const parts = base ? base.split("/") : [];
  for (const seg of rel.split("/")) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

async function bundle(files: Record<string, string>) {
  const esbuild = await import("esbuild-wasm");
  type G = typeof globalThis & { __esbuildReady?: Promise<void> };
  const g = globalThis as G;
  if (!g.__esbuildReady) {
    g.__esbuildReady = esbuild.initialize({ wasmURL: "/vendor/esbuild.wasm" });
  }
  await g.__esbuildReady;

  const EXT = ["", ".tsx", ".ts", ".jsx", ".js", ".css"];
  const result = await esbuild.build({
    entryPoints: ["src/main.tsx"],
    bundle: true,
    format: "esm",
    write: false,
    outdir: "out",
    jsx: "automatic",
    plugins: [
      {
        name: "vfs",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (args) => {
            if (args.kind === "entry-point") {
              return { path: args.path, namespace: "vfs" };
            }
            if (args.path.startsWith("./") || args.path.startsWith("../")) {
              const base = joinPath(dirname(args.importer), args.path);
              for (const ext of EXT) {
                if (files[base + ext] !== undefined) {
                  return { path: base + ext, namespace: "vfs" };
                }
              }
              return {
                errors: [{ text: `Cannot resolve "${args.path}" from "${args.importer}"` }],
              };
            }
            return { path: args.path, external: true };
          });
          b.onLoad({ filter: /.*/, namespace: "vfs" }, (args) => {
            const loader = args.path.endsWith(".css")
              ? ("css" as const)
              : args.path.endsWith(".ts")
                ? ("ts" as const)
                : ("tsx" as const);
            return { contents: files[args.path], loader };
          });
        },
      },
    ],
  });

  let js = "";
  let css = "";
  for (const f of result.outputFiles ?? []) {
    if (f.path.endsWith(".js")) js = f.text;
    if (f.path.endsWith(".css")) css = f.text;
  }
  return { js, css };
}

function assembleHtml(js: string, css: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script type="importmap">${JSON.stringify(IMPORT_MAP)}</script>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${js}</script>
</body>
</html>`;
}

export default function SpikePage() {
  const [status, setStatus] = useState("idle");
  const [ms, setMs] = useState(0);
  const [hostLog, setHostLog] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const htmlRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "atomlet:host-log") {
        setHostLog((prev) => [...prev, `${e.data.step} ${e.data.detail ?? ""}`]);
      }
      if (e.data?.type === "atomlet:host-ready" && htmlRef.current) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "atomlet:render", html: htmlRef.current },
          "*"
        );
      }
    };
    window.addEventListener("message", onMsg);

    (async () => {
      try {
        setStatus("compiling");
        const t0 = performance.now();
        const { js, css } = await bundle(DEMO_FILES);
        setMs(Math.round(performance.now() - t0));
        htmlRef.current = assembleHtml(js, css);
        setStatus("compiled — pushing to host");
        // Host may already be ready; push directly too.
        iframeRef.current?.contentWindow?.postMessage(
          { type: "atomlet:render", html: htmlRef.current },
          "*"
        );
        setStatus("done");
      } catch (err) {
        setStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();

    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 18 }}>P0 spike: esbuild-wasm + postMessage host</h1>
      <p data-testid="status">
        status: {status} {ms > 0 && `(compile ${ms}ms)`}
      </p>
      <p data-testid="hostlog" style={{ fontSize: 12, color: "#888" }}>
        host: {hostLog.join(" → ") || "(no messages)"}
      </p>
      <iframe
        ref={iframeRef}
        src="/preview-host"
        title="spike-preview"
        style={{ width: 640, height: 400, border: "1px solid #ccc", borderRadius: 8 }}
      />
    </div>
  );
}
