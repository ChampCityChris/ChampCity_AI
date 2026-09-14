import type { FirstNonApprovedResult } from "../../shared/documents/documentOrder";
import { resolveFirstNonApproved } from "../../shared/documents/documentOrder";
import { listPlanningDocumentsFromSnapshot } from "./planningDocumentService";
import {
  acquirePlanningRepositorySnapshot,
  type PlanningRepositorySnapshot,
} from "./planningRepositorySnapshot";
import type { PlanningProjectionContext } from "./planningProjectionContext";

export function resolveFirstNonApprovedDocument(
  source: string | PlanningProjectionContext,
): FirstNonApprovedResult {
  return typeof source === "string"
    ? resolveFirstNonApprovedDocumentFromSnapshot(acquirePlanningRepositorySnapshot(source))
    : resolveFirstNonApprovedDocumentFromContext(source);
}

export function resolveFirstNonApprovedDocumentFromSnapshot(
  snapshot: PlanningRepositorySnapshot,
): FirstNonApprovedResult {
  return resolveFirstNonApproved(listPlanningDocumentsFromSnapshot(snapshot));
}

export function resolveFirstNonApprovedDocumentFromContext(
  context: import("./planningProjectionContext").PlanningProjectionContext,
): FirstNonApprovedResult {
  return resolveFirstNonApprovedDocumentFromSnapshot(context.snapshot);
}
