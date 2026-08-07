// Incremental parser for the marker-based generation protocol:
//   <PLAN>...</PLAN><FILE>...</FILE><SUMMARY>...</SUMMARY><SUGGESTIONS>...</SUGGESTIONS>
// Multi-file ("react-ts") generations instead repeat <FILE path="src/App.tsx">
// blocks and may emit self-closing <DELETE path="src/old.ts"/> markers, all
// between the plan and the summary. A <FILE> without a path attribute keeps the
// legacy meaning: one self-contained HTML document streamed as `html`.
// Markers can be split across stream chunks, so `in_file` holds back a small
// tail before emitting deltas.

export type GenEvent =
  | { type: "plan_step"; text: string }
  | { type: "html_delta"; delta: string }
  // Per-file progress for multi-file generations. `bytes` is the accumulated
  // content length of that file so far (characters, not UTF-8 bytes).
  | { type: "file_start"; path: string }
  | { type: "file_delta"; path: string; delta: string; bytes: number }
  | { type: "file_end"; path: string; bytes: number }
  | { type: "file_delete"; path: string }
  | { type: "summary"; text: string }
  | { type: "suggestions"; items: string[] };

type State =
  | "before_plan"
  | "in_plan"
  | "before_file"
  | "in_file"
  | "before_summary"
  | "in_summary"
  | "before_suggestions"
  | "in_suggestions"
  | "done";

// Where the content of the <FILE> block currently being streamed goes.
type FileTarget =
  | { kind: "html" } // pathless <FILE> — legacy single-document stream
  | { kind: "file"; path: string }
  | { kind: "drop" }; // rejected path (traversal) — consume and discard

const OPEN_PLAN = "<PLAN>";
const CLOSE_PLAN = "</PLAN>";
// Open tags carry optional attributes, so these are prefixes: the parser reads
// on to the closing ">" of the tag.
const OPEN_FILE = "<FILE";
const OPEN_DELETE = "<DELETE";
const CLOSE_FILE = "</FILE>";
const OPEN_SUMMARY = "<SUMMARY>";
const CLOSE_SUMMARY = "</SUMMARY>";
const OPEN_SUGGESTIONS = "<SUGGESTIONS>";
const CLOSE_SUGGESTIONS = "</SUGGESTIONS>";

const BLOCK_MARKERS = [OPEN_FILE, OPEN_DELETE, OPEN_SUMMARY] as const;
// Longest prefix of a block marker that may still be waiting for its tail.
const MARKER_HOLDBACK = Math.max(...BLOCK_MARKERS.map((m) => m.length)) - 1;

const NO_TARGET: FileTarget = { kind: "html" };

const PATH_ATTR = /path\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

function readPathAttr(attrs: string): string | null {
  const m = PATH_ATTR.exec(attrs);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? null;
}

// Returns null for paths that must not be written: absolute paths, traversal,
// or empty after normalization.
function normalizeFilePath(raw: string): string | null {
  const path = raw
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
  if (!path || path.startsWith("/") || path.includes("..")) return null;
  return path;
}

// Models occasionally wrap file content in a markdown fence despite the
// protocol; unwrap it rather than storing a file that cannot compile.
function stripCodeFence(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```") || trimmed.length < 6) {
    return content;
  }
  return trimmed.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
}

function parseSuggestionLines(block: string): string[] {
  return block
    .split("\n")
    .map((l) => l.replace(/^[-*\d.、]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

export class GenerationParser {
  private buf = "";
  private state: State = "before_plan";
  private summaryBuf = "";
  private suggestionsBuf = "";
  private target: FileTarget = NO_TARGET;
  private fileMap: Record<string, string> = {};
  private deleted: string[] = [];
  html = "";

  get summary(): string {
    return this.summaryBuf.trim();
  }

  get suggestions(): string[] {
    return parseSuggestionLines(this.suggestionsBuf);
  }

  // Files written by this generation, as { path: content }.
  changedFiles(): Record<string, string> {
    return { ...this.fileMap };
  }

  deletedPaths(): string[] {
    return [...this.deleted];
  }

  hasFileChanges(): boolean {
    return Object.keys(this.fileMap).length > 0 || this.deleted.length > 0;
  }

  push(chunk: string): GenEvent[] {
    this.buf += chunk;
    const events: GenEvent[] = [];
    let progressed = true;
    while (progressed) {
      progressed = false;
      switch (this.state) {
        case "before_plan": {
          const i = this.buf.indexOf(OPEN_PLAN);
          if (i >= 0) {
            this.buf = this.buf.slice(i + OPEN_PLAN.length);
            this.state = "in_plan";
            progressed = true;
          }
          break;
        }
        case "in_plan": {
          const end = this.buf.indexOf(CLOSE_PLAN);
          const segment = end >= 0 ? this.buf.slice(0, end) : this.buf;
          // Emit only complete lines; keep the trailing partial line buffered.
          const lastNewline = segment.lastIndexOf("\n");
          const complete = end >= 0 ? segment : lastNewline >= 0 ? segment.slice(0, lastNewline + 1) : "";
          for (const line of complete.split("\n")) {
            const step = line.replace(/^[-*]\s*/, "").trim();
            if (step) events.push({ type: "plan_step", text: step });
          }
          if (end >= 0) {
            this.buf = this.buf.slice(end + CLOSE_PLAN.length);
            this.state = "before_file";
            progressed = true;
          } else {
            this.buf = lastNewline >= 0 ? segment.slice(lastNewline + 1) : segment;
          }
          break;
        }
        case "before_file": {
          progressed = this.openNextBlock(events);
          break;
        }
        case "in_file": {
          const end = this.buf.indexOf(CLOSE_FILE);
          if (end >= 0) {
            this.writeFileChunk(this.buf.slice(0, end), events);
            this.buf = this.buf.slice(end + CLOSE_FILE.length);
            this.closeFile(events);
            progressed = true;
          } else {
            // Hold back enough characters that a split "</FILE>" is never emitted.
            const safeLen = this.buf.length - (CLOSE_FILE.length - 1);
            if (safeLen > 0) {
              this.writeFileChunk(this.buf.slice(0, safeLen), events);
              this.buf = this.buf.slice(safeLen);
            }
          }
          break;
        }
        case "before_summary": {
          const i = this.buf.indexOf(OPEN_SUMMARY);
          if (i >= 0) {
            this.buf = this.buf.slice(i + OPEN_SUMMARY.length);
            this.state = "in_summary";
            progressed = true;
          }
          break;
        }
        case "in_summary": {
          const end = this.buf.indexOf(CLOSE_SUMMARY);
          if (end >= 0) {
            this.summaryBuf += this.buf.slice(0, end);
            this.buf = this.buf.slice(end + CLOSE_SUMMARY.length);
            this.state = "before_suggestions";
            events.push({ type: "summary", text: this.summary });
            progressed = true;
          } else {
            const safeLen = this.buf.length - (CLOSE_SUMMARY.length - 1);
            if (safeLen > 0) {
              this.summaryBuf += this.buf.slice(0, safeLen);
              this.buf = this.buf.slice(safeLen);
            }
          }
          break;
        }
        case "before_suggestions": {
          const i = this.buf.indexOf(OPEN_SUGGESTIONS);
          if (i >= 0) {
            this.buf = this.buf.slice(i + OPEN_SUGGESTIONS.length);
            this.state = "in_suggestions";
            progressed = true;
          }
          break;
        }
        case "in_suggestions": {
          const end = this.buf.indexOf(CLOSE_SUGGESTIONS);
          if (end >= 0) {
            this.suggestionsBuf += this.buf.slice(0, end);
            this.buf = "";
            this.state = "done";
            if (this.suggestions.length > 0) {
              events.push({ type: "suggestions", items: this.suggestions });
            }
          } else {
            const safeLen = this.buf.length - (CLOSE_SUGGESTIONS.length - 1);
            if (safeLen > 0) {
              this.suggestionsBuf += this.buf.slice(0, safeLen);
              this.buf = this.buf.slice(safeLen);
            }
          }
          break;
        }
        case "done":
          break;
      }
    }
    return events;
  }

  // Consumes the next <FILE>/<DELETE>/<SUMMARY> opening marker. Returns true
  // when the buffer moved forward, false when it needs more input.
  private openNextBlock(events: GenEvent[]): boolean {
    let marker: { name: string; index: number } | null = null;
    for (const name of BLOCK_MARKERS) {
      const index = this.buf.indexOf(name);
      if (index >= 0 && (marker === null || index < marker.index)) marker = { name, index };
    }
    if (marker === null) {
      // Prose between blocks is ignored; keep only what could be a split marker.
      if (this.buf.length > MARKER_HOLDBACK) this.buf = this.buf.slice(-MARKER_HOLDBACK);
      return false;
    }
    if (marker.name === OPEN_SUMMARY) {
      this.buf = this.buf.slice(marker.index + OPEN_SUMMARY.length);
      this.state = "in_summary";
      return true;
    }

    const tagEnd = this.buf.indexOf(">", marker.index);
    if (tagEnd < 0) {
      // Attributes still streaming — drop leading noise and wait for the rest.
      this.buf = this.buf.slice(marker.index);
      return false;
    }
    const attrs = this.buf.slice(marker.index + marker.name.length, tagEnd);
    this.buf = this.buf.slice(tagEnd + 1);
    const rawPath = readPathAttr(attrs);

    if (marker.name === OPEN_DELETE) {
      const path = rawPath === null ? null : normalizeFilePath(rawPath);
      if (path) {
        delete this.fileMap[path];
        if (!this.deleted.includes(path)) this.deleted.push(path);
        events.push({ type: "file_delete", path });
      }
      return true;
    }

    if (rawPath === null) {
      this.target = { kind: "html" };
    } else {
      const path = normalizeFilePath(rawPath);
      if (path) {
        this.target = { kind: "file", path };
        // A repeated path replaces the earlier block rather than appending.
        this.fileMap[path] = "";
        const i = this.deleted.indexOf(path);
        if (i >= 0) this.deleted.splice(i, 1);
        events.push({ type: "file_start", path });
      } else {
        this.target = { kind: "drop" };
      }
    }
    if (attrs.trimEnd().endsWith("/")) {
      this.closeFile(events); // self-closing <FILE path="..."/> — empty file
    } else {
      this.state = "in_file";
    }
    return true;
  }

  private writeFileChunk(delta: string, events: GenEvent[]): void {
    if (!delta) return;
    const target = this.target;
    if (target.kind === "html") {
      this.html += delta;
      events.push({ type: "html_delta", delta });
    } else if (target.kind === "file") {
      const content = (this.fileMap[target.path] ?? "") + delta;
      this.fileMap[target.path] = content;
      events.push({ type: "file_delta", path: target.path, delta, bytes: content.length });
    }
  }

  private closeFile(events: GenEvent[]): void {
    const target = this.target;
    this.target = NO_TARGET;
    if (target.kind === "file") {
      const content = stripCodeFence(this.fileMap[target.path] ?? "");
      this.fileMap[target.path] = content;
      events.push({ type: "file_end", path: target.path, bytes: content.length });
      this.state = "before_file";
      return;
    }
    // A pathless <FILE> is the whole app: nothing but the summary follows it.
    this.state = target.kind === "drop" ? "before_file" : "before_summary";
  }

  // Flush whatever remains; also rescues outputs where the model ignored the
  // marker protocol and returned a bare HTML document.
  finish(): GenEvent[] {
    const events: GenEvent[] = [];
    if (this.state === "in_file") {
      // Truncated stream: keep the partial content, the caller decides whether
      // it is usable.
      this.writeFileChunk(this.buf, events);
      this.buf = "";
      this.closeFile(events);
    } else if (this.state === "in_summary" && this.buf) {
      this.summaryBuf += this.buf;
      this.buf = "";
      events.push({ type: "summary", text: this.summary });
    } else if (this.state === "in_suggestions" && this.buf) {
      this.suggestionsBuf += this.buf;
      this.buf = "";
      if (this.suggestions.length > 0) {
        events.push({ type: "suggestions", items: this.suggestions });
      }
    } else if (!this.html && this.state === "before_plan") {
      const raw = this.buf.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "");
      const docStart = raw.search(/<!doctype html|<html/i);
      if (docStart >= 0) {
        this.html = raw.slice(docStart);
        events.push({ type: "html_delta", delta: this.html });
      }
    }
    return events;
  }

  looksLikeValidHtml(): boolean {
    return /<!doctype html|<html/i.test(this.html) && this.html.length > 200;
  }
}
