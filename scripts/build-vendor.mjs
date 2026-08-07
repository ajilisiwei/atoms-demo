// Build the browser-side vendor assets for the in-browser bundler:
//
//   public/vendor/react.js    ONE ESM file carrying react + react-dom/client
//                             + react/jsx-runtime
//   public/vendor/esbuild.wasm  the esbuild-wasm binary the bundler loads
//
// The preview import map points all three React specifiers at that single URL,
// so every consumer shares one React instance (hooks break otherwise) and no
// cross-package externals can leak into the preview document.
//
// The three packages are CJS, and CJS cannot be `export *`-forwarded, so the
// entry re-exports their real runtime exports by name.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";

// react and react-dom pick their implementation from NODE_ENV at require()
// time, and the two builds do not export the same names (`act` and
// `captureOwnerStack` are development-only). The bundle below is defined to
// production, so enumerate under production too — otherwise we would export
// names that do not exist in the shipped file.
process.env.NODE_ENV = "production";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const PACKAGE_JSON = path.join(ROOT, "package.json");
const OUT_DIR = path.join(ROOT, "public", "vendor");
const OUT_JS = path.join(OUT_DIR, "react.js");
const OUT_WASM = path.join(OUT_DIR, "esbuild.wasm");

const requireFromRepo = createRequire(PACKAGE_JSON);

// Order matters: the first module to claim a name keeps it, so react wins the
// collisions (Fragment with react/jsx-runtime, version with react-dom/client).
const VENDOR_MODULES = [
  { specifier: "react", withDefault: true },
  { specifier: "react-dom/client", withDefault: false },
  { specifier: "react/jsx-runtime", withDefault: false },
];

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function generateEntrySource() {
  const taken = new Set();
  const lines = [];

  for (const { specifier, withDefault } of VENDOR_MODULES) {
    const exported = requireFromRepo(specifier);
    const names = Object.keys(exported).filter(
      (name) => name !== "default" && IDENTIFIER.test(name) && !taken.has(name),
    );
    for (const name of names) taken.add(name);

    if (names.length > 0) {
      lines.push(`export { ${names.join(", ")} } from ${JSON.stringify(specifier)};`);
    }
    if (withDefault) {
      lines.push(`export { default } from ${JSON.stringify(specifier)};`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function resolveEsbuildWasm() {
  try {
    return requireFromRepo.resolve("esbuild-wasm/esbuild.wasm");
  } catch {
    // Fall back to walking up from the package entry in case the package ever
    // gains an "exports" map that hides the binary.
    return path.join(path.dirname(requireFromRepo.resolve("esbuild-wasm")), "..", "esbuild.wasm");
  }
}

async function statOrNull(target) {
  try {
    return await fs.stat(target);
  } catch {
    return null;
  }
}

// Outputs are gitignored and rebuilt by postinstall, so skip the work when they
// already exist and no build input (dependencies or this script) is newer.
async function isUpToDate() {
  const [js, wasm, pkg, self] = await Promise.all([
    statOrNull(OUT_JS),
    statOrNull(OUT_WASM),
    statOrNull(PACKAGE_JSON),
    statOrNull(SELF),
  ]);
  if (!js || !wasm) return false;

  const inputs = [pkg, self].filter(Boolean).map((entry) => entry.mtimeMs);
  const newestInput = inputs.length > 0 ? Math.max(...inputs) : 0;
  return Math.min(js.mtimeMs, wasm.mtimeMs) > newestInput;
}

async function buildReactBundle() {
  const esbuild = await import("esbuild-wasm");
  try {
    const result = await esbuild.build({
      stdin: { contents: generateEntrySource(), resolveDir: ROOT, sourcefile: "vendor-react.js" },
      bundle: true,
      format: "esm",
      platform: "browser",
      minify: true,
      write: false,
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "warning",
    });
    const [output] = result.outputFiles;
    await fs.writeFile(OUT_JS, output.contents);
    return output.contents.byteLength;
  } finally {
    // esbuild-wasm keeps a worker alive; without this the process never exits.
    await esbuild.stop();
  }
}

async function main() {
  const force = process.argv.includes("--force");
  if (!force && (await isUpToDate())) {
    console.log("[vendor] up to date, skipping (use --force to rebuild)");
    return;
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  const wasmSource = resolveEsbuildWasm();
  await fs.copyFile(wasmSource, OUT_WASM);
  const wasmStat = await fs.stat(OUT_WASM);
  console.log(`[vendor] esbuild.wasm ${Math.round(wasmStat.size / 1024)} kB`);

  const jsBytes = await buildReactBundle();
  console.log(`[vendor] react.js ${Math.round(jsBytes / 1024)} kB`);
}

await main();
