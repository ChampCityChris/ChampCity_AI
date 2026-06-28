import type { LlmProvider, LlmRequest, LlmResponse } from "./LlmProvider";

export class ManualCopyPasteProvider implements LlmProvider {
  readonly mode = "manual" as const;

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const promptText = request.messages
      .map((message) => `[${message.role.toUpperCase()}]\n${message.content}`)
      .join("\n\n");

    return {
      mode: this.mode,
      content: promptText,
      requiresManualPaste: true,
    };
  }
}
