"use client";

import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";

// Row "more" menu callbacks; dialogs/file-inputs live in the parent.
export interface TreeActions {
  onPick: (path: string, isDir: boolean) => void;
  onDownload: (path: string, isDir: boolean) => void;
  onRenameRequest: (path: string, isDir: boolean) => void;
  onDeleteRequest: (path: string, isDir: boolean) => void;
  onNewFileRequest: (dir: string) => void;
  onNewFolderRequest: (dir: string) => void;
  onUploadFile: (dir: string) => void;
  onUploadFolder: (dir: string) => void;
}

interface FileTreeProps {
  // Flat map of project-relative path → file contents.
  files: Record<string, string>;
  activePath: string | null;
  onSelect: (path: string) => void;
  // Path the agent is currently writing while a generation streams in.
  writingPath?: string | null;
  // Paths touched by the latest generation, flagged with an "M" badge.
  changedPaths?: Set<string>;
  // Row menus appear only when actions are provided (i.e. when editable).
  actions?: TreeActions;
  // Directories that exist without files yet (freshly created folders).
  extraDirs?: string[];
}

type TreeNode =
  | { kind: "dir"; name: string; path: string; children: TreeNode[] }
  | { kind: "file"; name: string; path: string };

// Groups flat "src/components/Button.tsx" paths into a nested tree,
// directories before files and both alphabetical within each level.
// `extraDirs` are level-relative directory paths kept alive with no files.
function buildNodes(paths: string[], extraDirs: string[], parentPath: string): TreeNode[] {
  const dirNames: string[] = [];
  const dirChildren = new Map<string, string[]>();
  const dirExtras = new Map<string, string[]>();
  const fileNames: string[] = [];

  const ensureDir = (head: string) => {
    if (!dirChildren.has(head)) {
      dirNames.push(head);
      dirChildren.set(head, []);
      dirExtras.set(head, []);
    }
  };

  for (const path of paths) {
    const slash = path.indexOf("/");
    if (slash === -1) {
      fileNames.push(path);
      continue;
    }
    const head = path.slice(0, slash);
    ensureDir(head);
    dirChildren.get(head)!.push(path.slice(slash + 1));
  }

  for (const dir of extraDirs) {
    const slash = dir.indexOf("/");
    const head = slash === -1 ? dir : dir.slice(0, slash);
    ensureDir(head);
    if (slash !== -1) dirExtras.get(head)!.push(dir.slice(slash + 1));
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
        children: buildNodes(dirChildren.get(name) ?? [], dirExtras.get(name) ?? [], path),
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
  "group flex h-7 w-full items-center gap-1.5 rounded-md pr-1 text-left text-[13px] transition-colors";

interface MenuState {
  path: string;
  isDir: boolean;
  x: number;
  y: number;
}

function MoreButton({
  onOpen,
  label,
}: {
  onOpen: (e: React.MouseEvent<HTMLSpanElement>) => void;
  label: string;
}) {
  return (
    <span
      role="button"
      tabIndex={-1}
      title={label}
      aria-label={label}
      onClick={onOpen}
      className="grid h-5 w-5 shrink-0 place-items-center rounded text-transparent hover:bg-panel-2 hover:text-foreground group-hover:text-muted"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="12" cy="19" r="1.7" />
      </svg>
    </span>
  );
}

const MENU_WIDTH = 184;

function TreeMenu({
  menu,
  actions,
  onClose,
}: {
  menu: MenuState;
  actions: TreeActions;
  onClose: () => void;
}) {
  const t = useT();

  useEffect(() => {
    // "click" (not mousedown) so a menu item's own click fires first.
    const close = () => onClose();
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [onClose]);

  const run = (fn: () => void) => () => {
    onClose();
    fn();
  };

  const item = (label: string, onClick: () => void, danger = false) => (
    <button
      key={label}
      type="button"
      onClick={run(onClick)}
      className={`flex w-full items-center rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors ${
        danger ? "text-red-400 hover:bg-red-500/10" : "hover:bg-panel-2"
      }`}
    >
      {label}
    </button>
  );

  const divider = <div key="div" className="my-1 border-t border-line" />;

  const items = menu.isDir
    ? [
        item(t("builder.files.menu.newFile"), () => actions.onNewFileRequest(menu.path)),
        item(t("builder.files.menu.newFolder"), () => actions.onNewFolderRequest(menu.path)),
        item(t("builder.files.menu.uploadFile"), () => actions.onUploadFile(menu.path)),
        item(t("builder.files.menu.uploadFolder"), () => actions.onUploadFolder(menu.path)),
        divider,
        item(t("builder.files.menu.pick"), () => actions.onPick(menu.path, true)),
        item(t("builder.files.menu.download"), () => actions.onDownload(menu.path, true)),
        item(t("builder.files.menu.rename"), () => actions.onRenameRequest(menu.path, true)),
        item(t("builder.files.menu.delete"), () => actions.onDeleteRequest(menu.path, true), true),
      ]
    : [
        item(t("builder.files.menu.pick"), () => actions.onPick(menu.path, false)),
        divider,
        item(t("builder.files.menu.download"), () => actions.onDownload(menu.path, false)),
        item(t("builder.files.menu.rename"), () => actions.onRenameRequest(menu.path, false)),
        item(t("builder.files.menu.delete"), () => actions.onDeleteRequest(menu.path, false), true),
      ];

  return (
    <div
      style={{ left: menu.x, top: menu.y, width: MENU_WIDTH }}
      className="fixed z-50 rounded-xl border border-line bg-panel p-1 shadow-xl"
      role="menu"
    >
      {items}
    </div>
  );
}

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
  moreLabel: string;
  openMenu?: (path: string, isDir: boolean, e: React.MouseEvent<HTMLSpanElement>) => void;
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
      <div
        role="treeitem"
        aria-expanded={open}
        aria-selected={false}
        tabIndex={0}
        title={label}
        onClick={() => ctx.onToggleDir(node.path)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") ctx.onToggleDir(node.path);
        }}
        style={{ paddingLeft: indent(depth) }}
        className={`${ROW_BASE} cursor-pointer select-none text-muted hover:bg-panel-2/60 hover:text-foreground`}
      >
        <ChevronIcon open={open} />
        <FolderIcon />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {ctx.openMenu && (
          <MoreButton
            label={ctx.moreLabel}
            onOpen={(e) => ctx.openMenu!(node.path, true, e)}
          />
        )}
      </div>
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
    <div
      role="treeitem"
      aria-selected={active}
      tabIndex={0}
      title={node.path}
      onClick={() => ctx.onSelect(node.path)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") ctx.onSelect(node.path);
      }}
      // Aligns the dot with the folder icon of the enclosing directory row.
      style={{ paddingLeft: indent(depth) + 13 }}
      className={`${ROW_BASE} cursor-pointer select-none ${tone}`}
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
      {ctx.openMenu && (
        <MoreButton
          label={ctx.moreLabel}
          onOpen={(e) => ctx.openMenu!(node.path, false, e)}
        />
      )}
    </div>
  );
}

export function FileTree({
  files,
  activePath,
  onSelect,
  writingPath = null,
  changedPaths,
  actions,
  extraDirs,
}: FileTreeProps) {
  const t = useT();
  // User-collapsed directories: tracking the closed set keeps every new
  // directory expanded by default without touching state on each render.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [menu, setMenu] = useState<MenuState | null>(null);

  const paths = useMemo(() => Object.keys(files), [files]);
  const tree = useMemo(
    () => buildNodes(paths, extraDirs ?? [], ""),
    [paths, extraDirs]
  );

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

  function openMenu(path: string, isDir: boolean, e: React.MouseEvent<HTMLSpanElement>) {
    e.stopPropagation();
    // Keep this same click from reaching the document-level close listener.
    e.nativeEvent.stopImmediatePropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.right + 6;
    if (x + MENU_WIDTH > window.innerWidth - 8) x = rect.left - MENU_WIDTH - 6;
    const y = Math.min(rect.top, window.innerHeight - 340);
    setMenu({ path, isDir, x, y });
  }

  const ctx: RowContext = {
    activePath,
    writingPath,
    changedPaths,
    isOpen: (path) => forcedOpen.has(path) || !collapsed.has(path),
    onToggleDir: toggleDir,
    onSelect,
    moreLabel: t("builder.files.menu.more"),
    openMenu: actions ? openMenu : undefined,
  };

  if (paths.length === 0 && !extraDirs?.length) {
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
      {menu && actions && (
        <TreeMenu menu={menu} actions={actions} onClose={() => setMenu(null)} />
      )}
    </div>
  );
}
