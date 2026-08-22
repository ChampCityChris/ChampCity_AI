export const developmentEnvironmentFence = "champcity-development-environment";

export type DevelopmentEnvironmentProvisioning = "managed" | "external";
export type DevelopmentEnvironmentProvisioningMode = DevelopmentEnvironmentProvisioning;
export type DevelopmentEnvironmentPreflightState =
  | "not-required"
  | "checking"
  | "provisioning"
  | "resolution-required"
  | "ready"
  | "waiting-for-operator"
  | "blocked";
export type DevelopmentEnvironmentRequirementState =
  | "satisfied"
  | "missing"
  | "incompatible"
  | "unknown";
export type DevelopmentEnvironmentProvisioningAction =
  | "none"
  | "provider-resolution"
  | "dependency-restore"
  | "install"
  | "configure"
  | "repair-winget"
  | "external-block";
export type DevelopmentEnvironmentRequirementBlockerKind =
  | "external"
  | "unsupported"
  | "host-policy"
  | "ambiguous-package"
  | "provider-resolution-required"
  | "provisioning-failure"
  | "verification-failure";
export type DevelopmentEnvironmentHumanInteractionKind =
  | "windows-permission"
  | "restart-required";

export interface DevelopmentEnvironmentRequirement {
  capabilityId: string;
  versionConstraint?: string;
  profile?: string;
  provisioning: DevelopmentEnvironmentProvisioning;
}

export interface DevelopmentEnvironmentContract {
  schemaVersion: 1;
  requirements: DevelopmentEnvironmentRequirement[];
}

export interface DevelopmentEnvironmentCommandSummary {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface DevelopmentEnvironmentProviderCandidate {
  packageId?: string;
  packageName?: string;
  source?: string;
  publisher?: string;
  version?: string;
}

export interface DevelopmentEnvironmentProviderAttempt {
  provider:
    | "winget-mcp"
    | "winget-search"
    | "winget-configuration"
    | "repository-ecosystem"
    | "specialized-adapter";
  stage: "discovery" | "resolution" | "provisioning" | "verification";
  query?: string;
  outcome: "available" | "unavailable" | "resolved" | "ambiguous" | "no-results" | "failed" | "not-applicable";
  summary: string;
  candidates?: DevelopmentEnvironmentProviderCandidate[];
}

export interface DevelopmentEnvironmentRequirementResult {
  capabilityId: string;
  requestedVersionConstraint?: string;
  requestedProfile?: string;
  provisioning: DevelopmentEnvironmentProvisioning;
  beforeState: DevelopmentEnvironmentRequirementState;
  actionTaken: DevelopmentEnvironmentProvisioningAction;
  afterState: DevelopmentEnvironmentRequirementState;
  detectedVersion?: string;
  detectedProfile?: string;
  commandSummaries: DevelopmentEnvironmentCommandSummary[];
  providerAttempts?: DevelopmentEnvironmentProviderAttempt[];
  blocker?: string;
  blockerKind?: DevelopmentEnvironmentRequirementBlockerKind;
  retryAllowed: boolean;
  humanInteractionKind?: DevelopmentEnvironmentHumanInteractionKind;
  humanInteractionReason?: string;
}

export interface DevelopmentEnvironmentPreflightResult {
  state: DevelopmentEnvironmentPreflightState;
  summary: string;
  retryAllowed: boolean;
  requirements: DevelopmentEnvironmentRequirementResult[];
  evidenceMarkdown: string;
}

const topLevelFields = new Set(["schemaVersion", "requirements"]);
const requirementFields = new Set([
  "capabilityId",
  "versionConstraint",
  "profile",
  "provisioning",
]);

export function parseDevelopmentEnvironmentContractFromMarkdown(
  markdownBody: string,
): DevelopmentEnvironmentContract | null {
  const blocks = developmentEnvironmentBlocks(markdownBody);
  if (blocks.length === 0) return null;
  if (blocks.length > 1) {
    throw new Error("Formal Work Card requires at most one champcity-development-environment block.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(blocks[0]);
  } catch (error) {
    throw new Error(`champcity-development-environment block must contain JSON: ${errorMessage(error)}`);
  }
  return validateDevelopmentEnvironmentContract(parsed);
}

export function validateDevelopmentEnvironmentContract(
  value: unknown,
): DevelopmentEnvironmentContract {
  const record = requiredRecord(value, "champcity-development-environment contract");
  assertOnlyFields(record, topLevelFields, "champcity-development-environment contract");
  if (record.schemaVersion !== 1) {
    throw new Error("champcity-development-environment schemaVersion must be 1.");
  }
  if (!Array.isArray(record.requirements)) {
    throw new Error("champcity-development-environment requirements must be an array.");
  }
  const requirements = record.requirements.map(validateRequirement);
  rejectDuplicateRequirementIdentities(requirements);
  return {
    schemaVersion: 1,
    requirements,
  };
}

function validateRequirement(value: unknown): DevelopmentEnvironmentRequirement {
  const record = requiredRecord(value, "development environment requirement");
  assertOnlyFields(record, requirementFields, "development environment requirement");
  const capabilityId = requiredNonEmptyString(record.capabilityId, "capabilityId");
  const provisioning = requiredProvisioning(record.provisioning);
  const requirement: DevelopmentEnvironmentRequirement = {
    capabilityId,
    provisioning,
  };
  if (record.versionConstraint !== undefined) {
    requirement.versionConstraint = optionalString(record.versionConstraint, "versionConstraint");
  }
  if (record.profile !== undefined) {
    requirement.profile = optionalString(record.profile, "profile");
  }
  return requirement;
}

function developmentEnvironmentBlocks(markdownBody: string): string[] {
  const normalized = markdownBody.replace(/\r\n?/g, "\n");
  return [...normalized.matchAll(/^```champcity-development-environment[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm)]
    .map((match) => match[1]);
}

function requiredRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertOnlyFields(
  record: Record<string, unknown>,
  allowedFields: ReadonlySet<string>,
  label: string,
): void {
  const unknown = Object.keys(record).filter((field) => !allowedFields.has(field));
  if (unknown.length > 0) {
    throw new Error(`${label} contains unsupported field: ${unknown.join(", ")}.`);
  }
}

function requiredNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`development environment requirement requires non-empty ${field}.`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`development environment requirement ${field} must be a non-empty string when supplied.`);
  }
  return value.trim();
}

function requiredProvisioning(value: unknown): DevelopmentEnvironmentProvisioning {
  if (value === "managed" || value === "external") return value;
  throw new Error("development environment requirement provisioning must be managed or external.");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function rejectDuplicateRequirementIdentities(
  requirements: DevelopmentEnvironmentRequirement[],
): void {
  const seen = new Set<string>();
  for (const requirement of requirements) {
    const identity = [
      requirement.capabilityId,
      requirement.profile ?? "",
      requirement.provisioning,
    ].join("\u0000");
    if (seen.has(identity)) {
      throw new Error(
        `champcity-development-environment contains duplicate requirement identity: ${requirement.capabilityId}.`,
      );
    }
    seen.add(identity);
  }
}
