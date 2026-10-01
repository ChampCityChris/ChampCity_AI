import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { connectionStatus, type ManagedCodexConnection, type ManagedCodexConnectionsStatus } from "../../shared/codexConnectionContracts";

export interface ApprovedCodexConnection { name: string; enabled: boolean; requirement: "required" | "optional" }
export interface ObservedCodexConnection { name: string; authStatus: string; initialized: boolean }

// No ambient entry is approval. Future application execution contracts may provision this bounded list.
export class CodexConnectionPolicy {
  private readonly file: string;
  private snapshot = connectionStatus([]);
  constructor(userData: string) { this.file = path.join(userData, "codex-runtime", "connections.json"); }
  async read(): Promise<ApprovedCodexConnection[]> {
    let value: unknown;
    try { value = JSON.parse(await fs.readFile(this.file, "utf8")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw new Error("Could not read approved Codex connections."); }
    if (!Array.isArray(value) || value.length > 100 || value.some(entry => !entry ||
      typeof entry.name !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(entry.name) || typeof entry.enabled !== "boolean" ||
      (entry.requirement !== undefined && !["required", "optional"].includes(entry.requirement))) ||
      new Set(value.map(entry => entry.name)).size !== value.length) throw new Error("Invalid approved Codex connections.");
    return value.map(entry => ({ name: entry.name, enabled: entry.enabled, requirement: entry.requirement ?? "optional" }));
  }
  fail(message: string): void {
    this.snapshot = { ...this.snapshot, requiredReady: false, blocker: message };
  }
  getStatus(): ManagedCodexConnectionsStatus { return structuredClone(this.snapshot); }
  project(approved: ApprovedCodexConnection[], observed: ObservedCodexConnection[], failed = false): ManagedCodexConnectionsStatus {
    const connections: ManagedCodexConnection[] = approved.map(entry => {
      const actual = observed.find(server => server.name === entry.name);
      const status = !entry.enabled ? "disconnected" : actual?.authStatus === "notLoggedIn" ? "authentication-required" :
        actual?.initialized ? "ready" : failed ? "failed" : "disconnected";
      return { ...entry, status, diagnostic: status === "authentication-required" ? "Authentication required. Managed use is disabled until supported connector authentication is available." :
        status === "ready" ? "Connection ready." : status === "failed" ? "Connection preflight failed. Managed use is disabled." : "Connection is disabled or disconnected." };
    });
    this.snapshot = connectionStatus(connections);
    return this.getStatus();
  }
  async setEnabled(name: unknown, enabled: unknown): Promise<void> {
    if (typeof name !== "string" || typeof enabled !== "boolean") throw new Error("Invalid Codex connection action.");
    const approved = await this.read();
    const entry = approved.find(connection => connection.name === name);
    if (!entry) throw new Error("This connection is not ChampCity-approved.");
    entry.enabled = enabled;
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(approved), { flag: "wx" });
    await fs.rename(temporary, this.file);
  }
}

// TOML quoted keys prevent server names from becoming nested paths or config injection.
export function managedConnectionOverrides(names: string[], active: string[]): string[] {
  return ["-c", `mcp_servers={${[...new Set(names)].map(name => `${JSON.stringify(name)}={enabled=${active.includes(name)}}`).join(",")}}`];
}

export function redactCodexDiagnostic(value: string): string {
  return value.replace(/\bBearer\s+[^\s,"'\]}]+/gi, "Bearer [redacted]")
    .replace(/((?:authorization|cookie|set-cookie)\s*[:=]\s*)[^\r\n]+/gi, "$1[redacted]")
    .replace(/((?:access[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key|password)\s*["']?\s*[:=]\s*["']?)[^\s,"';&}]+/gi, "$1[redacted]")
    .replace(/(https?:\/\/[^\s?#]+)\?[^\s]+/gi, "$1?[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 2000);
}
