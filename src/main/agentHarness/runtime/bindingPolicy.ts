const localBindHosts = new Set(["127.0.0.1", "localhost"]);

export function normalizeAgentHarnessBindHost(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Agent Harness host must be a string.");
  }
  const host = value.trim();
  if (!host || /\s/.test(host) || host.includes("/") || host.includes(":")) {
    throw new Error("Agent Harness host must be a hostname or IP address without a scheme, port, path, or whitespace.");
  }
  assertAgentHarnessLoopbackHost(host);
  return host;
}

export function assertAgentHarnessLoopbackHost(host: string): void {
  if (!localBindHosts.has(host.toLowerCase())) {
    throw new Error("Agent Harness HTTP runtime may bind only to local loopback hosts in WC60.");
  }
}
