// In-browser bundling of a generated multi-file React app with esbuild-wasm.
//
// Pure library: no React, no server-only imports, safe to call from client
// components. esbuild-wasm is imported lazily so nothing is pulled in until a
// bundle is actually requested.
import type { BuildFailure, Loader, Message, Plugin } from "esbuild-wasm";

type EsbuildModule = typeof import("esbuild-wasm");

/** Every project is compiled from this file. */
export const ENTRY = "src/main.tsx";

export interface BundleDiagnostic {
  text: string;
  /** Project-relative path, e.g. "src/App.tsx". */
  file?: string;
  /** 1-based, as reported by esbuild. */
  line?: number;
  /** 0-based, as reported by esbuild. */
  column?: number;
}

export type BundleResult =
  | { ok: true; js: string; css: string }
  | { ok: false; errors: BundleDiagnostic[] };

const WASM_URL = "/vendor/esbuild.wasm";
const VFS_NAMESPACE = "vfs";
const RESOLVE_EXTENSIONS = [
  "",
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".css",
  "/index.tsx",
  "/index.ts",
];

// esbuild-wasm can only be initialized once per module instance, and Next's
// HMR can hand us a fresh copy of this module. Caching the initialized
// namespace object (not just a "ready" flag) on globalThis guarantees we keep
// building through the instance that was actually initialized.
type EsbuildGlobal = typeof globalThis & {
  __atomletEsbuild?: Promise<EsbuildModule>;
};

function loadEsbuild(): Promise<EsbuildModule> {
  const global = globalThis as EsbuildGlobal;
  const cached = global.__atomletEsbuild;
  if (cached) return cached;

  const pending = (async () => {
    const esbuild = await import("esbuild-wasm");
    await esbuild.initialize({ wasmURL: WASM_URL });
    return esbuild;
  })();

  global.__atomletEsbuild = pending;
  pending.catch(() => {
    // A failed download or init must not poison every later attempt.
    if (global.__atomletEsbuild === pending) delete global.__atomletEsbuild;
  });

  return pending;
}

/** Download and initialize the wasm bundler. Safe to call repeatedly. */
export async function ensureEsbuild(): Promise<void> {
  await loadEsbuild();
}

function dirname(filePath: string): string {
  const index = filePath.lastIndexOf("/");
  return index === -1 ? "" : filePath.slice(0, index);
}

function joinPath(base: string, relative: string): string {
  const parts = base ? base.split("/") : [];
  for (const segment of relative.split("/")) {
    if (segment === "." || segment === "") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}

function resolveInFiles(
  files: Readonly<Record<string, string>>,
  base: string,
): string | null {
  for (const extension of RESOLVE_EXTENSIONS) {
    const candidate = base + extension;
    if (files[candidate] !== undefined) return candidate;
  }
  return null;
}

function loaderFor(filePath: string): Loader {
  if (filePath.endsWith(".css")) return "css";
  if (filePath.endsWith(".ts")) return "ts";
  return "tsx";
}

function vfsPlugin(files: Readonly<Record<string, string>>): Plugin {
  return {
    name: "vfs",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === "entry-point") {
          const entry = resolveInFiles(files, args.path);
          if (!entry) {
            return { errors: [{ text: `Entry point "${args.path}" is missing` }] };
          }
          return { path: entry, namespace: VFS_NAMESPACE };
        }

        if (args.path.startsWith("./") || args.path.startsWith("../")) {
          const base = joinPath(dirname(args.importer), args.path);
          const resolved = resolveInFiles(files, base);
          if (!resolved) {
            // esbuild fills in the import site location for us.
            return {
              errors: [{ text: `Cannot resolve "${args.path}" from "${args.importer}"` }],
            };
          }
          return { path: resolved, namespace: VFS_NAMESPACE };
        }

        // Bare specifiers stay external — the preview document's import map
        // resolves them against the vendor bundle at runtime.
        return { path: args.path, external: true };
      });

      build.onLoad({ filter: /.*/, namespace: VFS_NAMESPACE }, (args) => {
        const contents = files[args.path];
        if (contents === undefined) {
          return { errors: [{ text: `Missing file "${args.path}"` }] };
        }
        return { contents, loader: loaderFor(args.path) };
      });
    },
  };
}

function isBuildFailure(error: unknown): error is BuildFailure {
  return (
    typeof error === "object" &&
    error !== null &&
    Array.isArray((error as { errors?: unknown }).errors)
  );
}

function toDiagnostic(message: Message): BundleDiagnostic {
  const location = message.location;
  if (!location) return { text: message.text };
  return {
    // esbuild reports plugin paths as "<namespace>:<path>".
    file: location.file.startsWith(`${VFS_NAMESPACE}:`)
      ? location.file.slice(VFS_NAMESPACE.length + 1)
      : location.file,
    line: location.line,
    column: location.column,
    text: message.text,
  };
}

function toDiagnostics(error: unknown): BundleDiagnostic[] {
  if (isBuildFailure(error) && error.errors.length > 0) {
    return error.errors.map(toDiagnostic);
  }
  return [{ text: error instanceof Error ? error.message : String(error) }];
}

/**
 * Compile an in-memory project into a single ESM chunk plus its CSS.
 * Compilation problems come back as diagnostics; this never rejects.
 */
export async function bundleFiles(
  files: Readonly<Record<string, string>>,
): Promise<BundleResult> {
  try {
    const esbuild = await loadEsbuild();
    const result = await esbuild.build({
      entryPoints: [ENTRY],
      bundle: true,
      format: "esm",
      write: false,
      outdir: "out",
      jsx: "automatic",
      logLevel: "silent",
      plugins: [vfsPlugin(files)],
    });

    let js = "";
    let css = "";
    for (const file of result.outputFiles ?? []) {
      if (file.path.endsWith(".css")) css = file.text;
      else if (file.path.endsWith(".js")) js = file.text;
    }
    return { ok: true, js, css };
  } catch (error: unknown) {
    return { ok: false, errors: toDiagnostics(error) };
  }
}
