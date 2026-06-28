import type { LlmProvider, LlmRequest, LlmResponse } from "./LlmProvider";

export class FutureApiProvider implements LlmProvider {
  readonly mode = "future-api" as const;

  async complete(_request: LlmRequest): Promise<LlmResponse> {
    return {
      mode: this.mode,
      content:
        "Future API provider is not implemented or configured in the MVP foundation scaffold.",
      requiresManualPaste: true,
    };
  }
}
