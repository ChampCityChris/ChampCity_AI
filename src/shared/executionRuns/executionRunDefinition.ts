import type {
  ExecutionPassPlan,
  WorkCardAcceptanceContract,
  WorkCardAcceptanceRequirement,
} from "./executionRun";

export const EXECUTION_RUN_DEFINITION_SCHEMA_VERSION =
  "champcity.execution-run-definition.v1" as const;

export interface ExecutionRunDefinitionInvariant {
  invariantId: string;
  statement: string;
}

export interface ExecutionRunDefinitionRequirement {
  requirementId: string;
  type: WorkCardAcceptanceRequirement["type"];
  statement: string;
  noncompliantSubstitutions: string[];
  requiredBehavioralTests: string[];
}

export interface ExecutionRunDefinitionPass {
  passId: string;
  title: string;
  objective: string;
  requirements: ExecutionRunDefinitionRequirement[];
  globalInvariantIds: string[];
  allowedRepositoryPaths: string[];
  requiredTests: string[];
  prerequisitePassIds: string[];
  expectedOutputs: string[];
}

export interface ExecutionRunDefinitionV1 {
  schemaVersion: typeof EXECUTION_RUN_DEFINITION_SCHEMA_VERSION;
  globalInvariants: ExecutionRunDefinitionInvariant[];
  passes: ExecutionRunDefinitionPass[];
}

export interface ExecutionRunDefinitionCompileInput {
  definition: unknown;
  workCardArtifactId: string;
  workCardRevision: number;
  approvalArtifactId: string;
  implementationBranch: string;
  passTokenBudget?: number;
}

const definitionKeys = ["schemaVersion", "globalInvariants", "passes"] as const;
const invariantKeys = ["invariantId", "statement"] as const;
const passKeys = [
  "passId",
  "title",
  "objective",
  "requirements",
  "globalInvariantIds",
  "allowedRepositoryPaths",
  "requiredTests",
  "prerequisitePassIds",
  "expectedOutputs",
] as const;
const requirementKeys = [
  "requirementId",
  "type",
  "statement",
  "noncompliantSubstitutions",
  "requiredBehavioralTests",
] as const;

export function assertExecutionRunDefinitionV1(
  value: unknown,
): ExecutionRunDefinitionV1 {
  const issues = validateDefinitionObject(value);
  if (issues.length > 0) {
    throw new Error(issues.join(" "));
  }
  return value as ExecutionRunDefinitionV1;
}

export function compileExecutionRunDefinitionV1(
  input: ExecutionRunDefinitionCompileInput,
): {
  contract: WorkCardAcceptanceContract;
  plan: ExecutionPassPlan;
} {
  const definition = assertExecutionRunDefinitionV1(input.definition);
  if (!input.workCardArtifactId.trim()) {
    throw new Error("Execution definition compile requires an exact Work Card artifact ID.");
  }
  if (!Number.isInteger(input.workCardRevision) || input.workCardRevision < 1) {
    throw new Error("Execution definition compile requires a positive Work Card revision.");
  }
  if (!input.approvalArtifactId.trim()) {
    throw new Error("Execution definition compile requires an exact Operator Approval artifact ID.");
  }
  if (!input.implementationBranch.trim()) {
    throw new Error("Execution definition compile requires an implementation branch.");
  }

  const contractId = `${input.workCardArtifactId}/acceptance_contract/revision-${input.workCardRevision}`;
  const planId = `${input.workCardArtifactId}/execution_pass_plan/revision-${input.workCardRevision}`;
  const requirements = definition.passes.flatMap((pass) =>
    pass.requirements.map((requirement) => ({
      requirementId: requirement.requirementId,
      type: requirement.type,
      statement: requirement.statement,
      passIds: [pass.passId],
      noncompliantSubstitutions: [...requirement.noncompliantSubstitutions],
      requiredBehavioralTests: [...requirement.requiredBehavioralTests],
    })),
  );

  const contract: WorkCardAcceptanceContract = {
    contractId,
    workCardArtifactId: input.workCardArtifactId,
    workCardRevision: input.workCardRevision,
    globalInvariants: definition.globalInvariants.map((invariant) => ({
      invariantId: invariant.invariantId,
      statement: invariant.statement,
    })),
    requirements,
  };

  const plan: ExecutionPassPlan = {
    planId,
    workCardArtifactId: input.workCardArtifactId,
    workCardRevision: input.workCardRevision,
    approvalArtifactId: input.approvalArtifactId,
    acceptanceContractId: contractId,
    implementationBranch: input.implementationBranch,
    passTokenBudget: input.passTokenBudget ?? 5_000,
    passes: definition.passes.map((pass) => ({
      passId: pass.passId,
      title: pass.title,
      objective: pass.objective,
      requirementIds: pass.requirements.map((requirement) => requirement.requirementId),
      globalInvariantIds: [...pass.globalInvariantIds],
      allowedRepositoryPaths: [...pass.allowedRepositoryPaths],
      requiredTests: [...pass.requiredTests],
      prerequisitePassIds: [...pass.prerequisitePassIds],
      expectedOutputs: [...pass.expectedOutputs],
    })),
  };

  return { contract, plan };
}

function validateDefinitionObject(value: unknown): string[] {
  const issues: string[] = [];
  if (!isRecord(value)) return ["Execution Run definition must be an object."];
  issues.push(...unknownKeys(value, definitionKeys, "Execution Run definition"));
  if (value.schemaVersion !== EXECUTION_RUN_DEFINITION_SCHEMA_VERSION) {
    issues.push("Execution Run definition schemaVersion is unsupported.");
  }
  if (!Array.isArray(value.globalInvariants) || value.globalInvariants.length === 0) {
    issues.push("Execution Run definition requires globalInvariants.");
  } else {
    const seen = new Set<string>();
    value.globalInvariants.forEach((invariant, index) => {
      if (!isRecord(invariant)) {
        issues.push(`Global invariant ${index + 1} must be an object.`);
        return;
      }
      issues.push(...unknownKeys(invariant, invariantKeys, `Global invariant ${index + 1}`));
      pushRequiredString(issues, invariant.invariantId, `Global invariant ${index + 1} invariantId`);
      pushRequiredString(issues, invariant.statement, `Global invariant ${index + 1} statement`);
      if (typeof invariant.invariantId === "string" && invariant.invariantId.trim()) {
        if (seen.has(invariant.invariantId)) issues.push(`Duplicate global invariant ${invariant.invariantId}.`);
        seen.add(invariant.invariantId);
      }
    });
  }
  if (!Array.isArray(value.passes) || value.passes.length === 0) {
    issues.push("Execution Run definition requires passes.");
  } else {
    issues.push(...validatePasses(value.passes, value.globalInvariants));
  }
  return Array.from(new Set(issues));
}

function validatePasses(passes: unknown[], invariants: unknown): string[] {
  const issues: string[] = [];
  const passIds = new Set<string>();
  const requirementIds = new Set<string>();
  const invariantIds = new Set(
    Array.isArray(invariants)
      ? invariants.flatMap((item) =>
          isRecord(item) && typeof item.invariantId === "string"
            ? [item.invariantId]
            : [],
        )
      : [],
  );

  passes.forEach((pass, index) => {
    if (!isRecord(pass)) {
      issues.push(`Execution Pass ${index + 1} must be an object.`);
      return;
    }
    issues.push(...unknownKeys(pass, passKeys, `Execution Pass ${index + 1}`));
    pushRequiredString(issues, pass.passId, `Execution Pass ${index + 1} passId`);
    pushRequiredString(issues, pass.title, `Execution Pass ${index + 1} title`);
    pushRequiredString(issues, pass.objective, `Execution Pass ${index + 1} objective`);
    if (typeof pass.passId === "string" && pass.passId.trim()) {
      if (passIds.has(pass.passId)) issues.push(`Duplicate Execution Pass ${pass.passId}.`);
      passIds.add(pass.passId);
    }
    for (const key of [
      "globalInvariantIds",
      "allowedRepositoryPaths",
      "requiredTests",
      "prerequisitePassIds",
      "expectedOutputs",
    ] as const) {
      pushRequiredStringArray(issues, pass[key], `Execution Pass ${pass.passId ?? index + 1} ${key}`);
    }
    if (!Array.isArray(pass.requirements) || pass.requirements.length === 0) {
      issues.push(`Execution Pass ${pass.passId ?? index + 1} requires requirements.`);
    } else {
      pass.requirements.forEach((requirement, requirementIndex) => {
        issues.push(
          ...validateRequirement(
            requirement,
            `Execution Pass ${pass.passId ?? index + 1} requirement ${requirementIndex + 1}`,
            requirementIds,
          ),
        );
      });
    }
    if (Array.isArray(pass.globalInvariantIds)) {
      for (const invariantId of pass.globalInvariantIds) {
        if (typeof invariantId === "string" && !invariantIds.has(invariantId)) {
          issues.push(`Execution Pass ${pass.passId ?? index + 1} references unknown invariant ${invariantId}.`);
        }
      }
    }
  });

  passes.forEach((pass, index) => {
    if (!isRecord(pass) || !Array.isArray(pass.prerequisitePassIds)) return;
    for (const prerequisite of pass.prerequisitePassIds) {
      const prerequisiteIndex = passes.findIndex(
        (candidate) => isRecord(candidate) && candidate.passId === prerequisite,
      );
      if (
        typeof prerequisite !== "string" ||
        !passIds.has(prerequisite) ||
        prerequisite === pass.passId ||
        prerequisiteIndex < 0 ||
        prerequisiteIndex >= index
      ) {
        issues.push(`Execution Pass ${String(pass.passId)} has invalid prerequisite ${String(prerequisite)}.`);
      }
    }
  });

  return issues;
}

function validateRequirement(
  requirement: unknown,
  label: string,
  seen: Set<string>,
): string[] {
  const issues: string[] = [];
  if (!isRecord(requirement)) return [`${label} must be an object.`];
  issues.push(...unknownKeys(requirement, requirementKeys, label));
  pushRequiredString(issues, requirement.requirementId, `${label} requirementId`);
  if (
    requirement.type !== "required_behavior" &&
    requirement.type !== "prohibition" &&
    requirement.type !== "required_test" &&
    requirement.type !== "required_evidence"
  ) {
    issues.push(`${label} type is invalid.`);
  }
  pushRequiredString(issues, requirement.statement, `${label} statement`);
  pushRequiredStringArray(issues, requirement.noncompliantSubstitutions, `${label} noncompliantSubstitutions`);
  pushRequiredStringArray(issues, requirement.requiredBehavioralTests, `${label} requiredBehavioralTests`);
  if (typeof requirement.requirementId === "string" && requirement.requirementId.trim()) {
    if (seen.has(requirement.requirementId)) {
      issues.push(`Duplicate requirement ${requirement.requirementId}.`);
    }
    seen.add(requirement.requirementId);
  }
  return issues;
}

function unknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): string[] {
  const allowedSet = new Set(allowed);
  return Object.keys(value)
    .filter((key) => !allowedSet.has(key))
    .map((key) => `${label} contains unknown field ${key}.`);
}

function pushRequiredString(issues: string[], value: unknown, label: string): void {
  if (typeof value !== "string" || !value.trim()) {
    issues.push(`${label} is required.`);
  }
}

function pushRequiredStringArray(issues: string[], value: unknown, label: string): void {
  if (!Array.isArray(value)) {
    issues.push(`${label} must be an array.`);
    return;
  }
  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) {
      issues.push(`${label} must contain only non-empty strings.`);
      return;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
