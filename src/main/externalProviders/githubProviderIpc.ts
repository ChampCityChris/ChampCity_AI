import type { GithubProviderService } from "./githubProviderService";
import { validateRequest } from "./githubProviderService";

// Only fixed lifecycle actions and selected-repository reads cross preload.
export function registerGithubProviderIpc(
  ipc: { handle(channel: string, handler: (event: unknown, input?: unknown) => unknown): void },
  service: GithubProviderService,
  selectedRepository: () => string,
): void {
  ipc.handle("githubProvider:status", () => service.getStatus());
  ipc.handle("githubProvider:connect", () => { void service.connect(); return service.getStatus(); });
  ipc.handle("githubProvider:restart", async () => { await service.disconnect(); void service.connect(); return service.getStatus(); });
  ipc.handle("githubProvider:disconnect", async () => { await service.disconnect(); return service.getStatus(); });
  ipc.handle("githubProvider:read", (_event, input) => {
    validateRequest(input);
    return service.read(input.kind === "context" ? null : selectedRepository(), input);
  });
}
