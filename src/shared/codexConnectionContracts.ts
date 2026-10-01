export type ManagedCodexConnectionRequirement = "required" | "optional";
export interface ManagedCodexConnection {
  name: string;
  enabled: boolean;
  requirement: ManagedCodexConnectionRequirement;
  status: "ready" | "disconnected" | "authentication-required" | "failed";
  diagnostic: string;
}
export interface ManagedCodexConnectionsStatus {
  connections: ManagedCodexConnection[];
  requiredReady: boolean;
  optionalWarnings: number;
  blocker: string | null;
}

export function connectionStatus(connections: ManagedCodexConnection[]): ManagedCodexConnectionsStatus {
  const blocked = connections.find(connection => connection.requirement === "required" && (!connection.enabled || connection.status !== "ready"));
  return {
    connections,
    requiredReady: !blocked,
    optionalWarnings: connections.filter(connection => connection.enabled && connection.requirement === "optional" && connection.status !== "ready").length,
    blocker: blocked ? `Codex connection "${blocked.name}" ${blocked.status === "authentication-required" ? "requires authentication" : "is not ready"}. Open Settings > Codex Connections.` : null,
  };
}
