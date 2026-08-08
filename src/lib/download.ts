// Client-side project export. Simple (html) projects download as a single
// .html file; advanced (react-ts) projects download as a runnable Vite
// workspace (unzip, `npm install`, `npm run dev`).

import type { ProjectFiles } from "@/components/builder/types";

function safeName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "atomlet-app";
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadHtmlProject(name: string, html: string): void {
  triggerDownload(
    new Blob([html], { type: "text/html;charset=utf-8" }),
    `${safeName(name)}.html`
  );
}

const PACKAGE_JSON = (name: string) =>
  JSON.stringify(
    {
      name,
      private: true,
      version: "1.0.0",
      type: "module",
      scripts: { dev: "vite", build: "tsc -b && vite build", preview: "vite preview" },
      dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
      devDependencies: {
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@vitejs/plugin-react": "^4.3.0",
        typescript: "^5.6.0",
        vite: "^6.0.0",
      },
    },
    null,
    2
  ) + "\n";

const VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`;

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2020",
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      moduleResolution: "bundler",
      jsx: "react-jsx",
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    },
    include: ["src"],
  },
  null,
  2
) + "\n";

const INDEX_HTML = (title: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title.replace(/[<>&]/g, "")}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const README = (title: string) => `# ${title}

Built with [Atomlet](https://atoms-demo-phi.vercel.app).

\`\`\`bash
npm install
npm run dev
\`\`\`
`;

export async function downloadReactProject(
  name: string,
  files: ProjectFiles
): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const slug = safeName(name);
  zip.file("package.json", PACKAGE_JSON(slug));
  zip.file("vite.config.ts", VITE_CONFIG);
  zip.file("tsconfig.json", TSCONFIG);
  zip.file("index.html", INDEX_HTML(name));
  zip.file("README.md", README(name));
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `${slug}.zip`);
}
