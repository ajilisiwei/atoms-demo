// The shared buddy ("搭档") contract. Built-in personas and user-created ones
// are the same record — `kind` tells them apart — so every layer (DB row, API
// payload, UI props) speaks this one shape.

export interface StarterPrompt {
  en: string;
  zh: string;
}

export interface AgentRecord {
  id: string;
  kind: "builtin" | "custom";
  group: "work" | "life" | "custom";
  name: string;
  tagline: string; // en
  taglineZh: string;
  persona: string;
  avatarUrl: string;
  starterPrompts: StarterPrompt[] | null;
  themeHint: string | null; // builtin theme id or null
  sortOrder: number;
}
