export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  planSteps: string[] | null;
  // Follow-up prompts rendered as chips under the latest assistant message.
  // Optional so existing message constructors stay valid.
  suggestions?: string[] | null;
}

// Flat file snapshot of a multi-file (react-ts) project: path -> content.
export type ProjectFiles = Record<string, string>;

export interface BuilderProject {
  id: string;
  name: string;
  slug: string | null;
  publishedVersionId: string | null;
  themeName: string | null;
  agentId: string | null;
  template: string;
}

export interface GenerationState {
  planSteps: string[];
  phase: "planning" | "coding" | "finishing";
  htmlLength: number;
}
