// Buddy personas live in the database now (model Agent) and travel to the
// client as AgentRecord (see ./agent-types). What is left here is the glue both
// sides share: the prompt block, list lookups and locale-aware taglines.
// Server-side loading lives in ./agents-server, which this module never imports
// so client components can keep using these helpers.

import type { AgentRecord } from "./agent-types";

export type { AgentRecord, StarterPrompt } from "./agent-types";

// The record type's historical name, kept as an alias so existing call sites
// (llm.ts, the composer components) compile unchanged.
export type BuiltinAgent = AgentRecord;

export function findAgent(
  agents: AgentRecord[],
  id: string | null | undefined
): AgentRecord | null {
  if (!id) return null;
  return agents.find((agent) => agent.id === id) ?? null;
}

export function agentTagline(agent: AgentRecord, locale: "en" | "zh"): string {
  return locale === "zh" ? agent.taglineZh || agent.tagline : agent.tagline;
}

export function agentPromptBlock(agent: AgentRecord): string {
  return `## Active agent persona (adopt fully)\n\n${agent.persona}\nIntroduce yourself as ${agent.name} in summaries when natural, and keep suggestions within your specialty.`;
}
