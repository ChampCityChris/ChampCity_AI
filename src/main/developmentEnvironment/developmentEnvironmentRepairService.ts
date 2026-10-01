import { resolveWorkCardApplicationContext } from "./workCardApplicationContext";
import { developmentEnvironmentPreflightService, type DevelopmentEnvironmentPreflightService } from "./developmentEnvironmentPreflightService";
import type { DevelopmentEnvironmentWorkSelector } from "./workCardApplicationContext";

export class DevelopmentEnvironmentRepairService {
  constructor(private readonly preflight: DevelopmentEnvironmentPreflightService = developmentEnvironmentPreflightService) {}
  async repairDevelopmentEnvironment(workspaceRoot: string, selector?: DevelopmentEnvironmentWorkSelector) {
    const context = await resolveWorkCardApplicationContext(workspaceRoot, selector);
    if (context instanceof Error) throw context;
    const result = await this.preflight.runPreflight({ workspaceRoot: context.projectRoot, formalWorkCardPath: context.formalWorkCardPath });
    const current = await resolveWorkCardApplicationContext(workspaceRoot, selector);
    if (current instanceof Error) throw current;
    if (current.formalWorkCardPath !== context.formalWorkCardPath || current.formalWorkCardRevision !== context.formalWorkCardRevision || current.formalWorkCardSha256 !== context.formalWorkCardSha256) {
      throw new Error("Work Card context changed during environment setup; refresh the current contract.");
    }
    return result;
  }
}
export const developmentEnvironmentRepairService = new DevelopmentEnvironmentRepairService();
