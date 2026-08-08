// @-mention parsing for buddies. The selection is DERIVED from the text: a
// mention whose word uniquely prefix-matches a buddy name selects that buddy,
// and deleting the mention deselects it again.
//
// The candidate list is passed in rather than imported: it is whatever the
// caller loaded from GET /api/agents, so user-created buddies are mentionable
// on exactly the same terms as the built-ins.

import type { AgentRecord } from "./agent-types";

const MENTION_RE = /(^|\s)@(\S+)/g;

export function filterAgents(agents: AgentRecord[], query: string): AgentRecord[] {
  const q = query.toLowerCase();
  return agents.filter((a) => a.name.toLowerCase().startsWith(q));
}

// First mention in the text that uniquely prefix-matches a buddy.
export function resolveMentionAgent(
  agents: AgentRecord[],
  text: string
): AgentRecord | null {
  MENTION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(text))) {
    const hits = filterAgents(agents, m[2]);
    if (hits.length === 1) return hits[0];
  }
  return null;
}

// The mention currently being typed at the caret: the nearest "@" to the
// left that starts a word and has no whitespace before the caret.
export function activeMentionAt(
  text: string,
  caret: number
): { start: number; query: string } | null {
  const upto = text.slice(0, caret);
  const at = upto.lastIndexOf("@");
  if (at === -1) return null;
  if (at > 0 && !/\s/.test(upto[at - 1])) return null;
  const query = upto.slice(at + 1);
  if (/\s/.test(query)) return null;
  return { start: at, query };
}

// Removes the first mention resolving to `agent` and returns the cleaned
// prompt (the mention is a selector, not part of the request).
export function stripMention(
  agents: AgentRecord[],
  text: string,
  agent: AgentRecord
): string {
  MENTION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(text))) {
    const hits = filterAgents(agents, m[2]);
    if (hits.length === 1 && hits[0].id === agent.id) {
      const before = text.slice(0, m.index);
      const after = text.slice(m.index + m[0].length);
      return `${before}${m[1]}${after}`.replace(/\s+/g, " ").trim();
    }
  }
  return text.trim();
}
