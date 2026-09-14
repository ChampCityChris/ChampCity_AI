import type { AgentHarnessWorkerEnvironmentOverrides } from "./agentHarnessProcessProtocol";

export function agentHarnessEnvironmentOverrides(
  environment: NodeJS.ProcessEnv = process.env,
): AgentHarnessWorkerEnvironmentOverrides {
  const overrides: AgentHarnessWorkerEnvironmentOverrides = {};
  if (environment.CHAMPCITY_AGENT_HARNESS_ENABLED !== undefined) {
    overrides.enabled = environment.CHAMPCITY_AGENT_HARNESS_ENABLED !== "false";
  }
  if (environment.CHAMPCITY_AGENT_HARNESS_HOST !== undefined) {
    overrides.host = environment.CHAMPCITY_AGENT_HARNESS_HOST;
  }
  if (environment.CHAMPCITY_AGENT_HARNESS_PORT !== undefined) {
    overrides.port = Number.parseInt(environment.CHAMPCITY_AGENT_HARNESS_PORT, 10);
  }
  if (environment.CHAMPCITY_AGENT_HARNESS_PUBLIC_BASE_URL !== undefined) {
    overrides.publicBaseUrl = environment.CHAMPCITY_AGENT_HARNESS_PUBLIC_BASE_URL;
  }
  if (environment.CHAMPCITY_AGENT_HARNESS_LOCAL_AUTH !== undefined) {
    overrides.allowUnauthenticatedLocal =
      environment.CHAMPCITY_AGENT_HARNESS_LOCAL_AUTH === "development-unauthenticated" &&
      !environment.CHAMPCITY_AGENT_HARNESS_PUBLIC_BASE_URL;
  }
  return overrides;
}
