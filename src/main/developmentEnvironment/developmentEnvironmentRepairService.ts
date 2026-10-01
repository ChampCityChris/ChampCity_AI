import { resolveWorkCardApplicationContext } from "./workCardApplicationContext";
import { developmentEnvironmentPreflightService, type DevelopmentEnvironmentPreflightService } from "./developmentEnvironmentPreflightService";
import type { DevelopmentEnvironmentWorkSelector } from "./workCardApplicationContext";

export class DevelopmentEnvironmentRepairService {
  constructor(private readonly preflight: DevelopmentEnvironmentPreflightService = developmentEnvironmentPreflightService) {}
  async repairDevelopmentEnvironment(workspaceRoot: string, selector?: DevelopmentEnvironmentWorkSelector) {
    const context = await resolveWorkCardApplicationContext(workspaceRoot, selector);
    if (context instanceof Error) throw context;
    return this.preflight.runPreflight({ workspaceRoot: context.projectRoot, formalWorkCardPath: context.formalWorkCardPath });
  }
}
export const developmentEnvironmentRepairService = new DevelopmentEnvironmentRepairService();
