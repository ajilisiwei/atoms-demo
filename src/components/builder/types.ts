export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  planSteps: string[] | null;
}

export interface BuilderProject {
  id: string;
  name: string;
  slug: string | null;
  publishedVersionId: string | null;
}

export interface GenerationState {
  planSteps: string[];
  phase: "planning" | "coding" | "finishing";
  htmlLength: number;
}
