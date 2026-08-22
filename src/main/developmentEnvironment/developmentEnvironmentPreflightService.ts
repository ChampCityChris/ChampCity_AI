import fs from "node:fs";
import path from "node:path";
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
  constructor(
    private readonly provisioner: DevelopmentEnvironmentProvisioner =
      new WindowsDevelopmentEnvironmentProvisioner(),
  ) {}

  async runPreflight(input: DevelopmentEnvironmentPreflightInput): Promise<DevelopmentEnvironmentPreflightResult> {
    const formalPath = path.join(input.workspaceRoot, input.formalWorkCardPath);
    const markdown = fs.readFileSync(formalPath, "utf8");
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
    return this.provisioner.preflight(contract.requirements, input.workspaceRoot);
  }
}

export const developmentEnvironmentPreflightService =
  new DevelopmentEnvironmentPreflightService();
