import fs from "node:fs";
import path from "node:path";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import {
  acquirePlanningRepositorySnapshot,
  type PlanningRepositorySnapshot,
} from "./planningRepositorySnapshot";
import { listPlanningDocumentsFromSnapshot } from "./planningDocumentService";

export interface PlanningProjectionContext {
  readonly workspaceRoot: string;
  readonly snapshot: PlanningRepositorySnapshot;
  readonly generation: number;
  readonly documents: readonly PlanningDocumentSummary[];
}

export interface PlanningProjectionContextTestHooks {
  onContextCreated?: (context: PlanningProjectionContext) => void;
}

let testHooks: PlanningProjectionContextTestHooks = {};

export function __setPlanningProjectionContextTestHooks(
  hooks: PlanningProjectionContextTestHooks = {},
): void {
  testHooks = hooks;
}

export function createPlanningProjectionContext(workspaceRoot: string): PlanningProjectionContext {
  const canonicalRoot = canonicalWorkspaceRoot(workspaceRoot);
  const snapshot = acquirePlanningRepositorySnapshot(canonicalRoot);
  const documents = Object.freeze(listPlanningDocumentsFromSnapshot(snapshot));
  const context = Object.freeze({
    workspaceRoot: canonicalRoot,
    snapshot,
    generation: snapshot.generation,
    documents,
  });
  testHooks.onContextCreated?.(context);
  return context;
}

export function assertPlanningProjectionContextRoot(
  context: PlanningProjectionContext,
  workspaceRoot: string,
): PlanningProjectionContext {
  const canonicalRoot = canonicalWorkspaceRoot(workspaceRoot);
  if (canonicalRootKey(canonicalRoot) !== canonicalRootKey(context.workspaceRoot)) {
    throw new Error("Planning projection context belongs to a different workspace root.");
  }
  return context;
}

export function resolvePlanningProjectionContext(
  workspaceRoot: string,
  supplied?: PlanningProjectionContext,
): PlanningProjectionContext {
  return supplied
    ? assertPlanningProjectionContextRoot(supplied, workspaceRoot)
    : createPlanningProjectionContext(workspaceRoot);
}

function canonicalWorkspaceRoot(workspaceRoot: string): string {
  const resolvedRoot = path.resolve(workspaceRoot);
  try {
    return fs.realpathSync.native(resolvedRoot);
  } catch {
    return resolvedRoot;
  }
}

function canonicalRootKey(workspaceRoot: string): string {
  return process.platform === "win32" ? workspaceRoot.toLowerCase() : workspaceRoot;
}
