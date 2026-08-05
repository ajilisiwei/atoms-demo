// Incremental parser for the marker-based generation protocol:
//   <PLAN>...</PLAN><FILE>...</FILE><SUMMARY>...</SUMMARY>
// Markers can be split across stream chunks, so `in_file` holds back a small
// tail before emitting html deltas.

export type GenEvent =
  | { type: "plan_step"; text: string }
  | { type: "html_delta"; delta: string }
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

const OPEN_PLAN = "<PLAN>";
const CLOSE_PLAN = "</PLAN>";
const OPEN_FILE = "<FILE>";
const CLOSE_FILE = "</FILE>";
const OPEN_SUMMARY = "<SUMMARY>";
const CLOSE_SUMMARY = "</SUMMARY>";
const OPEN_SUGGESTIONS = "<SUGGESTIONS>";
const CLOSE_SUGGESTIONS = "</SUGGESTIONS>";

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
  html = "";

  get summary(): string {
    return this.summaryBuf.trim();
  }

  get suggestions(): string[] {
    return parseSuggestionLines(this.suggestionsBuf);
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
          const i = this.buf.indexOf(OPEN_FILE);
          if (i >= 0) {
            this.buf = this.buf.slice(i + OPEN_FILE.length);
            this.state = "in_file";
            progressed = true;
          }
          break;
        }
        case "in_file": {
          const end = this.buf.indexOf(CLOSE_FILE);
          if (end >= 0) {
            const delta = this.buf.slice(0, end);
            if (delta) {
              this.html += delta;
              events.push({ type: "html_delta", delta });
            }
            this.buf = this.buf.slice(end + CLOSE_FILE.length);
            this.state = "before_summary";
            progressed = true;
          } else {
            // Hold back enough characters that a split "</FILE>" is never emitted.
            const safeLen = this.buf.length - (CLOSE_FILE.length - 1);
            if (safeLen > 0) {
              const delta = this.buf.slice(0, safeLen);
              this.html += delta;
              events.push({ type: "html_delta", delta });
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

  // Flush whatever remains; also rescues outputs where the model ignored the
  // marker protocol and returned a bare HTML document.
  finish(): GenEvent[] {
    const events: GenEvent[] = [];
    if (this.state === "in_file" && this.buf) {
      this.html += this.buf;
      events.push({ type: "html_delta", delta: this.buf });
      this.buf = "";
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
