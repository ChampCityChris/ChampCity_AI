import type { FirstNonApprovedResult } from "../../shared/documents/documentOrder";
import { resolveFirstNonApproved } from "../../shared/documents/documentOrder";
import { listPlanningDocuments } from "./planningDocumentService";

export function resolveFirstNonApprovedDocument(
  workspaceRoot: string,
): FirstNonApprovedResult {
  return resolveFirstNonApproved(listPlanningDocuments(workspaceRoot));
}
