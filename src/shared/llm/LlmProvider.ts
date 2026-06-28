export type LlmProviderMode = "manual" | "future-api";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  purpose: string;
  messages: LlmMessage[];
}

export interface LlmResponse {
  mode: LlmProviderMode;
  content: string;
  requiresManualPaste: boolean;
}

export interface LlmProvider {
  readonly mode: LlmProviderMode;
  complete(request: LlmRequest): Promise<LlmResponse>;
}
