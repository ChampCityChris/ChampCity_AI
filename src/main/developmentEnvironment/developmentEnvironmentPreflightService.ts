import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type {
  DevelopmentEnvironmentPreflightResult,
} from "../../shared/developmentEnvironmentContracts";
import {
  parseDevelopmentEnvironmentContractFromMarkdown,
} from "../../shared/developmentEnvironmentContracts";
import {
  WindowsDevelopmentEnvironmentProvisioner,
} from "./windowsDevelopmentEnvironmentProvisioner";

export interface DevelopmentEnvironmentProvisioner {
  preflight(
    requirements: Parameters<WindowsDevelopmentEnvironmentProvisioner["preflight"]>[0],
    workspaceRoot: string,
  ): Promise<DevelopmentEnvironmentPreflightResult>;
}

export interface DevelopmentEnvironmentPreflightInput {
  workspaceRoot: string;
  formalWorkCardPath: string;
}

export class DevelopmentEnvironmentPreflightService {
  private readonly workspaceOperations = new Map<string, Promise<void>>();
  private readonly inFlight = new Map<string, Promise<DevelopmentEnvironmentPreflightResult>>();
  constructor(
    private readonly provisioner: DevelopmentEnvironmentProvisioner =
      new WindowsDevelopmentEnvironmentProvisioner({ packageResolverOptions: { allowMcpDiscovery: false } }),
  ) {}

  async runPreflight(input: DevelopmentEnvironmentPreflightInput): Promise<DevelopmentEnvironmentPreflightResult> {
    const formalPath = path.join(input.workspaceRoot, input.formalWorkCardPath);
    const markdown = fs.readFileSync(formalPath, "utf8");
    const key = `${path.resolve(formalPath).toLowerCase()}:${createHash("sha256").update(markdown).digest("hex")}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    const workspaceKey = path.resolve(input.workspaceRoot).toLowerCase();
    const prior = this.workspaceOperations.get(workspaceKey);
    const operation = prior ? prior.then(() => this.check(markdown, input.workspaceRoot)) : this.check(markdown, input.workspaceRoot);
    const tail = operation.then(() => undefined, () => undefined);
    this.workspaceOperations.set(workspaceKey, tail);
    this.inFlight.set(key, operation);
    try { return await operation; }
    finally {
      if (this.inFlight.get(key) === operation) this.inFlight.delete(key);
      if (this.workspaceOperations.get(workspaceKey) === tail) this.workspaceOperations.delete(workspaceKey);
    }
  }

  private async check(markdown: string, workspaceRoot: string): Promise<DevelopmentEnvironmentPreflightResult> {
    const contract = parseDevelopmentEnvironmentContractFromMarkdown(markdown);
    if (!contract || contract.requirements.length === 0) {
      return {
        state: "not-required",
        summary: "No development environment requirements were declared.",
        retryAllowed: false,
        requirements: [],
        evidenceMarkdown: [
          "Development environment preflight evidence:",
          "- Final state: not-required",
          "- Retry allowed: no",
          "- Summary: No development environment requirements were declared.",
        ].join("\n"),
      };
    }
    return this.provisioner.preflight(contract.requirements, workspaceRoot);
  }
}

export const developmentEnvironmentPreflightService =
  new DevelopmentEnvironmentPreflightService();
