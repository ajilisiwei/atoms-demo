"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";

interface FileTreeProps {
  // Flat map of project-relative path → file contents.
  files: Record<string, string>;
  activePath: string | null;
  onSelect: (path: string) => void;
  // Path the agent is currently writing while a generation streams in.
  writingPath?: string | null;
  // Paths touched by the latest generation, flagged with an "M" badge.
  changedPaths?: Set<string>;
}

type TreeNode =
  | { kind: "dir"; name: string; path: string; children: TreeNode[] }
  | { kind: "file"; name: string; path: string };

// Groups flat "src/components/Button.tsx" paths into a nested tree,
// directories before files and both alphabetical within each level.
function buildNodes(paths: string[], parentPath: string): TreeNode[] {
  const dirNames: string[] = [];
  const dirChildren = new Map<string, string[]>();
  const fileNames: string[] = [];

  for (const path of paths) {
    const slash = path.indexOf("/");
    if (slash === -1) {
      fileNames.push(path);
      continue;
    }
    const head = path.slice(0, slash);
    const rest = path.slice(slash + 1);
    const bucket = dirChildren.get(head);
    if (bucket) {
      bucket.push(rest);
    } else {
      dirNames.push(head);
      dirChildren.set(head, [rest]);
    }
  }

  const join = (name: string) => (parentPath ? `${parentPath}/${name}` : name);

  const dirs: TreeNode[] = [...dirNames]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const path = join(name);
      return {
        kind: "dir",
        name,
        path,
        children: buildNodes(dirChildren.get(name) ?? [], path),
      };
    });

  const files: TreeNode[] = [...fileNames]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ kind: "file", name, path: join(name) }));

  return [...dirs, ...files];
}

// Every directory on the way to a file, e.g. "src/lib/api.ts" →
// ["src", "src/lib"].
function ancestorDirs(path: string | null | undefined): string[] {
  if (!path) return [];
  const segments = path.split("/").slice(0, -1);
  return segments.map((_, i) => segments.slice(0, i + 1).join("/"));
}

const SOURCE_EXTENSIONS = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs"]);

// Shared with the editor tab bar so file-type dots match the tree.
export function fileDotClass(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
  if (SOURCE_EXTENSIONS.has(ext)) return "bg-accent";
  if (ext === "css") return "bg-muted";
  return "bg-muted/50";
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M3 7.5a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

const ROW_BASE =
  "group flex h-7 w-full items-center gap-1.5 rounded-md pr-2 text-left text-[13px] transition-colors";

// 12px per level, offset so the root level clears the panel edge.
function indent(depth: number): number {
  return 6 + depth * 12;
}

interface RowContext {
  activePath: string | null;
  writingPath: string | null;
  changedPaths?: Set<string>;
  isOpen: (path: string) => boolean;
  onToggleDir: (path: string) => void;
  onSelect: (path: string) => void;
}

function TreeRows({
  nodes,
  depth,
  ctx,
}: {
  nodes: TreeNode[];
  depth: number;
  ctx: RowContext;
}) {
  return (
    <>
      {nodes.map((node) =>
        node.kind === "dir" ? (
          <DirRow key={node.path} node={node} depth={depth} ctx={ctx} />
        ) : (
          <FileRow key={node.path} node={node} depth={depth} ctx={ctx} />
        )
      )}
    </>
  );
}

function DirRow({
  node,
  depth,
  ctx,
}: {
  node: Extract<TreeNode, { kind: "dir" }>;
  depth: number;
  ctx: RowContext;
}) {
  const t = useT();
  const open = ctx.isOpen(node.path);
  const label = open ? t("builder.files.collapse") : t("builder.files.expand");

  return (
    <>
      <button
        type="button"
        role="treeitem"
        aria-expanded={open}
        aria-selected={false}
        title={label}
        onClick={() => ctx.onToggleDir(node.path)}
        style={{ paddingLeft: indent(depth) }}
        className={`${ROW_BASE} text-muted hover:bg-panel-2/60 hover:text-foreground`}
      >
        <ChevronIcon open={open} />
        <FolderIcon />
        <span className="truncate">{node.name}</span>
      </button>
      {open && (
        <div role="group">
          <TreeRows nodes={node.children} depth={depth + 1} ctx={ctx} />
        </div>
      )}
    </>
  );
}

function FileRow({
  node,
  depth,
  ctx,
}: {
  node: Extract<TreeNode, { kind: "file" }>;
  depth: number;
  ctx: RowContext;
}) {
  const t = useT();
  const active = ctx.activePath === node.path;
  const writing = ctx.writingPath === node.path;
  const changed = ctx.changedPaths?.has(node.path) ?? false;

  const tone = active
    ? "bg-panel-2 text-foreground"
    : writing
      ? "text-foreground hover:bg-panel-2/60"
      : "text-muted hover:bg-panel-2/60 hover:text-foreground";

  return (
    <button
      type="button"
      role="treeitem"
      aria-selected={active}
      title={node.path}
      onClick={() => ctx.onSelect(node.path)}
      // Aligns the dot with the folder icon of the enclosing directory row.
      style={{ paddingLeft: indent(depth) + 13 }}
      className={`${ROW_BASE} ${tone}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${fileDotClass(node.name)}`}
      />
      <span className="min-w-0 flex-1 truncate">{node.name}</span>
      {changed && (
        <span
          title={t("builder.files.modified")}
          className="shrink-0 text-[10px] font-medium text-accent-2"
        >
          M
        </span>
      )}
      {writing && (
        <span
          title={t("builder.files.writing")}
          aria-label={t("builder.files.writing")}
          className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent"
        />
      )}
    </button>
  );
}

export function FileTree({
  files,
  activePath,
  onSelect,
  writingPath = null,
  changedPaths,
}: FileTreeProps) {
  const t = useT();
  // User-collapsed directories: tracking the closed set keeps every new
  // directory expanded by default without touching state on each render.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const paths = useMemo(() => Object.keys(files), [files]);
  const tree = useMemo(() => buildNodes(paths, ""), [paths]);

  // Derived, never stored: only the streaming file's directories are forced
  // open (so generation stays visible). The active file's ancestors are NOT
  // forced — otherwise a user could never collapse the directory holding the
  // current selection (e.g. the top-level "src").
  const forcedOpen = useMemo(() => new Set(ancestorDirs(writingPath)), [writingPath]);

  function toggleDir(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  const ctx: RowContext = {
    activePath,
    writingPath,
    changedPaths,
    isOpen: (path) => forcedOpen.has(path) || !collapsed.has(path),
    onToggleDir: toggleDir,
    onSelect,
  };

  if (paths.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
        {t("builder.files.empty")}
      </div>
    );
  }

  return (
    <div
      role="tree"
      aria-label={t("builder.files.treeLabel")}
      className="h-full overflow-y-auto py-1.5 pr-1"
    >
      <TreeRows nodes={tree} depth={0} ctx={ctx} />
    </div>
  );
}
