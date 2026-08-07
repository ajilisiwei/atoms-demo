// Semantics of Project.template, kept apart from the generation prompts and
// starter assets in @/lib/react-template so route handlers can validate and
// branch without pulling those in.
//
// Pure data module: no imports, no side effects, safe on server and client.

export const PROJECT_TEMPLATES = ["html", "react-ts"] as const;

export type ProjectTemplate = (typeof PROJECT_TEMPLATES)[number];

export const REACT_TEMPLATE: ProjectTemplate = "react-ts";

export function isProjectTemplate(value: unknown): value is ProjectTemplate {
  return typeof value === "string" && (PROJECT_TEMPLATES as readonly string[]).includes(value);
}

export interface VersionDocument {
  template: string;
  html: string;
  compiledHtml: string | null;
}

// Picks the document a version serves. "html" projects serve their generated
// document as-is; "react-ts" projects serve the browser-built artifact, which
// stays null until the builder posts a build — hence the null return, which
// callers surface as a 404 instead of a blank page.
//
// A version that carries a compiledHtml is treated as react-ts whatever the
// project row says, so the owner preview and the published page can never
// disagree about which document is the app.
export function resolveVersionDocument(version: VersionDocument): string | null {
  const isReact = version.template === REACT_TEMPLATE || version.compiledHtml !== null;
  if (!isReact) return version.html;
  return version.compiledHtml || null;
}
