export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  planSteps: string[] | null;
  // Follow-up prompts rendered as chips under the latest assistant message.
  // Optional so existing message constructors stay valid.
  suggestions?: string[] | null;
}

export interface BuilderProject {
  id: string;
  name: string;
  slug: string | null;
  publishedVersionId: string | null;
  themeName: string | null;
  agentId: string | null;
}

export interface GenerationState {
  planSteps: string[];
  phase: "planning" | "coding" | "finishing";
  htmlLength: number;
}
