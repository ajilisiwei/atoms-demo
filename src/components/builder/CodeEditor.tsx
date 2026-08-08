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
import {
  FONT_STACKS,
  useEditorSettings,
  type EditorSettings,
} from "@/lib/editor-settings";

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

function darkFor(settings: EditorSettings): boolean {
  if (settings.theme === "dark") return true;
  if (settings.theme === "light") return false;
  return isDarkAppearance();
}

function typographyOf(settings: EditorSettings): Extension {
  // In "auto" the editor blends into the app panel (transparent); a forced
  // scheme needs its own background — transparent here would override
  // oneDark's and produce dark text on a light panel (or vice versa).
  const background =
    settings.theme === "auto"
      ? "transparent"
      : settings.theme === "light"
        ? "#ffffff"
        : null; // dark: let oneDark's own background win
  return EditorView.theme({
    "&": {
      height: "100%",
      fontSize: `${settings.fontSize}px`,
      backgroundColor: background,
    },
    ".cm-scroller": {
      fontFamily: FONT_STACKS[settings.fontFamily],
      lineHeight: String(settings.lineHeight),
    },
    "&.cm-focused": { outline: "none" },
  });
}

function behaviorOf(settings: EditorSettings): Extension {
  return [
    EditorState.tabSize.of(settings.tabSize),
    settings.lineWrap ? EditorView.lineWrapping : [],
  ];
}

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
  const typographyComp = useRef(new Compartment());
  const behaviorComp = useRef(new Compartment());
  const pathRef = useRef(path);
  const settings = useEditorSettings();
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  });

  function buildState(doc: string, forPath: string | null): EditorState {
    const s = settingsRef.current;
    return EditorState.create({
      doc,
      extensions: [
        basicSetup,
        typographyComp.current.of(typographyOf(s)),
        behaviorComp.current.of(behaviorOf(s)),
        languageFor(forPath),
        themeComp.current.of(darkFor(s) ? oneDark : []),
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
        effects: themeComp.current.reconfigure(
          darkFor(settingsRef.current) ? oneDark : []
        ),
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

  // Live-apply settings changes to the mounted editor.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: [
        typographyComp.current.reconfigure(typographyOf(settings)),
        behaviorComp.current.reconfigure(behaviorOf(settings)),
        themeComp.current.reconfigure(darkFor(settings) ? oneDark : []),
      ],
    });
  }, [settings]);

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
