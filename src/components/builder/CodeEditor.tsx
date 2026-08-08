"use client";

// CodeMirror 6 editor for the builder's cloud editing: syntax highlighting,
// in-buffer search (Cmd/Ctrl-F via basicSetup), light/dark theme following
// the app appearance, controlled value with an onChange for cloud saves.

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import {
  Annotation,
  Compartment,
  EditorState,
  type Extension,
} from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";

// Marks programmatic document syncs so they do not echo through onChange.
const remoteSync = Annotation.define<boolean>();

interface CodeEditorProps {
  path: string | null;
  value: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  // Keep the end of the document in view as value grows (streaming).
  followTail?: boolean;
}

function languageFor(path: string | null): Extension {
  if (!path) return [];
  if (path.endsWith(".css")) return css();
  if (path.endsWith(".html") || path.endsWith(".htm")) return html();
  if (/\.(tsx?|jsx?|mjs|cjs)$/.test(path)) {
    return javascript({ jsx: true, typescript: /\.tsx?$/.test(path) });
  }
  return [];
}

function isDarkAppearance(): boolean {
  const attr = document.documentElement.getAttribute("data-appearance");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const sizing = EditorView.theme({
  "&": { height: "100%", fontSize: "12px", backgroundColor: "transparent" },
  ".cm-scroller": { fontFamily: "var(--font-mono, ui-monospace, monospace)", lineHeight: "1.6" },
  "&.cm-focused": { outline: "none" },
});

export function CodeEditor({
  path,
  value,
  readOnly,
  onChange,
  followTail,
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const followTailRef = useRef(followTail);
  // Latest-value refs, synced after render (writing refs during render is
  // forbidden by the React compiler). Declared before the sync effects below
  // so they run first within the same commit.
  useEffect(() => {
    onChangeRef.current = onChange;
    followTailRef.current = followTail;
  });
  const themeComp = useRef(new Compartment());
  const readOnlyComp = useRef(new Compartment());
  const pathRef = useRef(path);

  function buildState(doc: string, forPath: string | null): EditorState {
    return EditorState.create({
      doc,
      extensions: [
        basicSetup,
        sizing,
        languageFor(forPath),
        themeComp.current.of(isDarkAppearance() ? oneDark : []),
        readOnlyComp.current.of(EditorState.readOnly.of(Boolean(readOnly))),
        EditorView.updateListener.of((u) => {
          // Only user-driven edits reach onChange; programmatic syncs are
          // dispatched with the remote annotation below and filtered out.
          if (u.docChanged && !u.transactions.some((tr) => tr.annotation(remoteSync))) {
            onChangeRef.current?.(u.state.doc.toString());
          }
        }),
      ],
    });
  }

  useEffect(() => {
    const view = new EditorView({ parent: hostRef.current! });
    view.setState(buildState(value, path));
    viewRef.current = view;
    const observer = new MutationObserver(() => {
      view.dispatch({
        effects: themeComp.current.reconfigure(isDarkAppearance() ? oneDark : []),
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-appearance"],
    });
    return () => {
      observer.disconnect();
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switching files gets a fresh state (own undo history); external value
  // updates for the same file are applied as a remote-annotated change.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (pathRef.current !== path) {
      pathRef.current = path;
      view.setState(buildState(value, path));
      return;
    }
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        annotations: remoteSync.of(true),
        ...(followTailRef.current
          ? { selection: { anchor: value.length }, scrollIntoView: true }
          : {}),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, path]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: readOnlyComp.current.reconfigure(
        EditorState.readOnly.of(Boolean(readOnly))
      ),
    });
  }, [readOnly]);

  return <div ref={hostRef} className="h-full min-h-0 overflow-hidden" />;
}
