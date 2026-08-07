"use client";

import { useEffect, useRef, useState } from "react";
import type { BuiltinAgent } from "@/lib/agents";
import {
  activeMentionAt,
  filterAgents,
  resolveMentionAgent,
  stripMention,
} from "@/lib/mention";

interface Options {
  text: string;
  setText: (t: string) => void;
  agentValue: string | null;
  onAgentChange?: (id: string | null) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export interface AgentMention {
  menuOpen: boolean;
  candidates: BuiltinAgent[];
  activeIndex: number;
  select: (index: number) => void;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  // Returns true when the key event was consumed by the mention menu.
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
  updateCaret: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void;
  // Strips the mention token and freezes the mention-driven flag for submit.
  prepareSubmit: () => string;
}

export function useAgentMention({
  text,
  setText,
  agentValue,
  onAgentChange,
  textareaRef,
}: Options): AgentMention {
  const [caret, setCaret] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  // Start offset of a mention dismissed with Escape — stays closed until edited.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  // Only selections made BY typing a mention are cleared when it's deleted;
  // avatar-row picks must survive text edits.
  const mentionDrivenRef = useRef(false);
  // Value to restore when the mention is deleted (the pre-mention selection —
  // null on the dashboard, the project's own agent in the builder).
  const prevAgentRef = useRef<string | null>(null);
  const lastEmittedRef = useRef<string | null>(agentValue);

  useEffect(() => {
    // agentValue changed from outside (avatar row click) — drop the flag.
    if (agentValue !== lastEmittedRef.current) {
      mentionDrivenRef.current = false;
      lastEmittedRef.current = agentValue;
    }
  }, [agentValue]);

  const active = activeMentionAt(text, caret);
  const candidates = active ? filterAgents(active.query) : [];
  const menuOpen =
    active !== null && candidates.length > 0 && dismissedAt !== active.start;
  const activeIndex = Math.min(activeIdx, Math.max(0, candidates.length - 1));

  function syncFromText(next: string) {
    const resolved = resolveMentionAgent(next);
    if (resolved && resolved.id !== agentValue) {
      if (!mentionDrivenRef.current) prevAgentRef.current = agentValue;
      mentionDrivenRef.current = true;
      lastEmittedRef.current = resolved.id;
      onAgentChange?.(resolved.id);
    } else if (!resolved && mentionDrivenRef.current) {
      mentionDrivenRef.current = false;
      const restored = prevAgentRef.current;
      if (restored !== agentValue) {
        lastEmittedRef.current = restored;
        onAgentChange?.(restored);
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setText(next);
    setCaret(e.target.selectionStart ?? next.length);
    setDismissedAt(null);
    setActiveIdx(0);
    syncFromText(next);
  }

  function updateCaret(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    setCaret(e.currentTarget.selectionStart ?? 0);
  }

  function select(index: number) {
    if (!active) return;
    const agent = candidates[index];
    if (!agent) return;
    const before = text.slice(0, active.start);
    const inserted = `@${agent.name} `;
    const next = before + inserted + text.slice(caret);
    setText(next);
    syncFromText(next);
    setDismissedAt(null);
    const pos = before.length + inserted.length;
    setCaret(pos);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (e.nativeEvent.isComposing) return false;
    if (!menuOpen) return false;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % candidates.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + candidates.length) % candidates.length);
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      select(activeIndex);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setDismissedAt(active.start);
      return true;
    }
    return false;
  }

  function prepareSubmit(): string {
    const agent = resolveMentionAgent(text);
    // Freeze the flag so clearing the textarea after submit never deselects.
    mentionDrivenRef.current = false;
    return agent ? stripMention(text, agent) : text.trim();
  }

  return {
    menuOpen,
    candidates,
    activeIndex,
    select,
    handleChange,
    handleKeyDown,
    updateCaret,
    prepareSubmit,
  };
}
