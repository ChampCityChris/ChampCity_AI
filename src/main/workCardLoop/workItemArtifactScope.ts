import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { WorkItemArtifactScopeReference } from "../../shared/workItemArtifactScope";
import { readRoutedDevelopmentExecutionBinding } from "../planExecution/routedDevelopmentExecutionBinding";

declare const resolvedScopeBrand: unique symbol;
export interface ResolvedWorkItemArtifactScope {
  readonly [resolvedScopeBrand]: true;
  readonly reference: Readonly<WorkItemArtifactScopeReference>;
  readonly root: string;
  readonly planRevision?: number;
  readonly planDigest?: string;
}
/** Strings are retained solely for established legacy Phase callers. */
export type WorkItemArtifactScope = string | ResolvedWorkItemArtifactScope;
const resolvedScopes = new WeakMap<ResolvedWorkItemArtifactScope, readonly string[] | null>();

function identifier(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value)) throw Error("Artifact scope requires a bounded identifier.");
}
export function parseWorkItemArtifactScopeReference(value: unknown): WorkItemArtifactScopeReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Explicit Work Item artifact scope is required.");
  const entry = value as Record<string, unknown>;
  if (!["legacy-phase", "routed-direct-plan", "routed-phase"].includes(entry.kind as string)) throw Error("Unsupported Work Item artifact scope.");
  const fields = entry.kind === "legacy-phase" ? ["kind", "phaseId"] : ["kind", "intakeId", "routeDecisionId", "planId", ...(entry.kind === "routed-phase" ? ["phaseId"] : [])];
  if (Object.keys(entry).some((key) => !fields.includes(key)) || fields.some((key) => !(key in entry))) throw Error("Artifact scope identity has missing or incompatible fields; direct Plans have no Phase.");
  if (entry.kind !== "legacy-phase") {
    if (typeof entry.intakeId !== "string" || !/^intake-[a-f0-9-]{36}$/.test(entry.intakeId) ||
      typeof entry.routeDecisionId !== "string" || !/^decision-[a-f0-9-]{36}$/.test(entry.routeDecisionId)) throw Error("Invalid routed artifact lineage.");
    identifier(entry.planId);
  }
  if (entry.kind !== "routed-direct-plan") identifier(entry.phaseId);
  return { ...entry } as unknown as WorkItemArtifactScopeReference;
}

export async function resolveWorkItemArtifactScope(root: string, reference: WorkItemArtifactScopeReference): Promise<ResolvedWorkItemArtifactScope> {
  const ref = parseWorkItemArtifactScopeReference(reference);
  if (ref.kind === "legacy-phase") return makeScope(ref, `planning/phases/${ref.phaseId}`, null);
  const binding = await readRoutedDevelopmentExecutionBinding(root, ref.intakeId);
  if (!binding || binding.identity.planId !== ref.planId || binding.identity.routeDecisionId !== ref.routeDecisionId) throw Error("Artifact scope requires its current routed execution binding.");
  if (ref.kind === "routed-direct-plan" ? binding.structure.topology !== "direct" :
    binding.structure.topology !== "phased" || !binding.structure.phases.some((phase) => phase.phaseId === ref.phaseId)) {
    throw Error("Artifact scope must match the Plan topology and a genuine declared Phase.");
  }
  const artifactRoot = `planning/work-intake/execution/${ref.intakeId}/${ref.routeDecisionId}/${ref.planId}`;
  const workItems = binding.structure.workItems.filter((item) => ref.kind === "routed-direct-plan" || item.phaseId === ref.phaseId).map((item) => item.workItemId);
  return makeScope(ref, ref.kind === "routed-direct-plan" ? `${artifactRoot}/direct` : `${artifactRoot}/phases/${ref.phaseId}`, workItems, binding.planRevision, binding.planDigest);
}

function makeScope(reference: WorkItemArtifactScopeReference, root: string, workItems: readonly string[] | null, planRevision?: number, planDigest?: string): ResolvedWorkItemArtifactScope {
  const scope = Object.freeze({ reference: Object.freeze(reference), root, ...(planRevision === undefined ? {} : { planRevision, planDigest }) }) as ResolvedWorkItemArtifactScope;
  resolvedScopes.set(scope, workItems && Object.freeze([...workItems]));
  return scope;
}

export function workItemArtifactRoot(scope: WorkItemArtifactScope): string {
  if (typeof scope === "string") { identifier(scope); return `planning/phases/${scope}`; }
  if (!scope || !resolvedScopes.has(scope)) throw Error("Resolve routed artifact scope from current execution evidence before addressing artifacts.");
  return scope.root;
}
function cardId(scope: WorkItemArtifactScope, workCardId: string): string {
  workItemArtifactRoot(scope); identifier(workCardId);
  const items = typeof scope === "string" ? null : resolvedScopes.get(scope);
  if (items && !items.includes(workCardId) && !items.includes(workCardId.replace(/-REPAIR\d+$/i, ""))) throw Error("Work Item does not belong to this Plan artifact scope.");
  return workCardId;
}

export function workItemArtifactIdentity(scope: WorkItemArtifactScope, workCardId: string): Record<string, unknown> {
  cardId(scope, workCardId);
  const ref = typeof scope === "string" ? { kind: "legacy-phase" as const, phaseId: scope } : scope.reference;
  if (ref.kind === "legacy-phase") return { phaseId: ref.phaseId, workCardId };
  return { intakeId: ref.intakeId, routeDecisionId: ref.routeDecisionId, planId: ref.planId,
    ...(ref.kind === "routed-phase" ? { phaseId: ref.phaseId } : {}), workCardId, artifactScope: { ...ref } };
}
export function workItemArtifactScopeFromIdentity(identity: Record<string, unknown>): WorkItemArtifactScopeReference {
  if (identity.artifactScope === undefined) {
    if (identity.intakeId !== undefined || identity.planId !== undefined || identity.routeDecisionId !== undefined) throw Error("Routed Work Item identity requires explicit artifact scope.");
    return parseWorkItemArtifactScopeReference({ kind: "legacy-phase", phaseId: identity.phaseId });
  }
  const ref = parseWorkItemArtifactScopeReference(identity.artifactScope);
  const expected = ref.kind === "legacy-phase" ? { phaseId: ref.phaseId } : {
    intakeId: ref.intakeId, routeDecisionId: ref.routeDecisionId, planId: ref.planId, ...(ref.kind === "routed-phase" ? { phaseId: ref.phaseId } : {}),
  };
  const actual = Object.fromEntries(["intakeId", "routeDecisionId", "planId", "phaseId"].filter((key) => identity[key] !== undefined).map((key) => [key, identity[key]]));
  if (!isDeepStrictEqual(actual, expected)) throw Error("Work Item metadata conflicts with its artifact scope.");
  return ref;
}

export function workItemFormalPrefix(scope: WorkItemArtifactScope, workCardId: string): string {
  return `${workItemArtifactRoot(scope)}/Work_Cards/${cardId(scope, workCardId)}`;
}
export function workItemIntakeTargets(scope: WorkItemArtifactScope, candidate: { candidateId: string; title: string }) {
  const id = cardId(scope, candidate.candidateId);
  const slug = candidate.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "work_card";
  return { handoffMarkdownPath: `${workItemArtifactRoot(scope)}/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_${id}.md`,
    formalWorkCardMarkdownPath: `${workItemFormalPrefix(scope, id)}_${slug}.md` };
}
export function workItemReportPrefix(scope: WorkItemArtifactScope, workCardId: string): string {
  return `${workItemArtifactRoot(scope)}/Implementer_Reports/IMPLEMENTER_REPORT_${cardId(scope, workCardId)}`;
}
export function workItemReportPath(scope: WorkItemArtifactScope, workCardId: string, formalPath: string, repair = false): string {
  const prefix = workItemReportPrefix(scope, workCardId);
  if (repair) return `${prefix}.md`;
  const displayFilename = path.posix.basename(formalPath, ".md");
  const escapedId = workCardId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const slug = displayFilename.replace(new RegExp(`^${escapedId}_?`, "i"), "") || "implementation";
  return `${prefix}_${slug}.md`;
}
export function workItemValidationPrefix(scope: WorkItemArtifactScope, workCardId: string): string {
  return `${workItemArtifactRoot(scope)}/Validation_Records/VALIDATION_RECORD_${cardId(scope, workCardId)}_ATTEMPT`;
}
export function workItemValidationPath(scope: WorkItemArtifactScope, workCardId: string, attemptNumber: number): string {
  if (!Number.isSafeInteger(attemptNumber) || attemptNumber < 1) throw Error("Validation attempt identity must be a positive integer.");
  return `${workItemValidationPrefix(scope, workCardId)}${String(attemptNumber).padStart(2, "0")}.md`;
}
export function workItemRepairTargets(scope: WorkItemArtifactScope, repairId: string) {
  cardId(scope, repairId);
  if (!/-REPAIR\d+$/i.test(repairId)) throw Error("Repair identity is required.");
  return { handoffMarkdownPath: `${workItemArtifactRoot(scope)}/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_${repairId}.md`,
    repairMarkdownPath: `${workItemFormalPrefix(scope, repairId)}.md` };
}
