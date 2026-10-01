import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveRoutedImplementerContext } from "../planExecution/routedImplementerContext";
import { evaluateDocumentFreshness, listPlanningDocuments } from "../documents/planningDocumentService";
import { getCurrentWorkspaceModel } from "../currentWorkflow/currentWorkflowService";
import { resolveIssueFixCardCodexExecutionContext } from "../issueResolution/issueResolutionService";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { DevelopmentEnvironmentPreflightResult } from "../../shared/developmentEnvironmentContracts";
export type DevelopmentEnvironmentWorkSelector =
  | { ownerKind: "issue"; issueId: string; fixCardId: string; currentImplementationId?: string }
  | { ownerKind: "routed-development"; intakeId: string; workItemId: string };
export interface WorkCardApplicationContext {
  ownerKind?: "development" | "issue" | "routed-development";
  intakeId?: string; planId?: string; planRevision?: number; rootWorkItemId?: string;
  issueId?: string; rootFixCardId?: string; currentImplementationId?: string;
  phaseId: string | null; workCardId: string; workCardTitle: string; projectRoot: string;
  formalWorkCardPath: string; formalWorkCardRevision: number; formalWorkCardSha256: string;
  implementationContractType: "formal-work-card" | "repair-work-card" | "fix-card"; implementationContractLabel: string;
  implementerReportPath: string; implementerReportRevision: number; implementerReportSha256: string;
  developmentEnvironmentPreflight: DevelopmentEnvironmentPreflightResult | null;
  workflowWorkItem?: never;
}

/** Shared exact identity resolution; environment preparation does not acquire a Codex runtime. */
export async function resolveWorkCardApplicationContext(workspaceRoot: string, selector?: DevelopmentEnvironmentWorkSelector): Promise<WorkCardApplicationContext | Error> {
    try {
      const projectRoot = path.resolve(workspaceRoot);
      if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
        throw new Error("Selected workspace root is not a readable directory.");
      }
      if (selector?.ownerKind === "issue") {
        const issueContext = resolveIssueFixCardCodexExecutionContext(
          projectRoot,
          selector.issueId,
          selector.fixCardId,
          selector.currentImplementationId,
        );
        return {
          ...issueContext,
          rootFixCardId: issueContext.fixCardId,
          currentImplementationId: issueContext.currentImplementationId,
          phaseId: null,
          workCardId: issueContext.currentImplementationId,
          ownerKind: "issue",
          developmentEnvironmentPreflight: null,
        };
      }

      const routed = selector?.ownerKind === "routed-development" ? await resolveRoutedImplementerContext(projectRoot, selector.intakeId, selector.workItemId) : undefined;
      const current = routed ? undefined : getCurrentWorkspaceModel(projectRoot);
      if (!routed && (
        current?.activeWorkspaceId !== "work-card-building-review" &&
        current?.activeWorkspaceId !== "work-card-report-review"
      )) {
        throw new Error("Run Codex Implementer is available only in the Implement workspace.");
      }
      const projection = routed?.projection ?? current?.workCardBuildingReview;
      if (!projection) {
        throw new Error("Current Implement projection does not resolve an Approved Work Card Contract.");
      }

      const documents = listPlanningDocuments(projectRoot);
      const formal = documents.find((document) => document.markdownPath === projection.formalWorkCardPath);
      if (!formal || formal.documentReadState !== "readable" || formal.readError) {
        throw new Error("Current Approved Work Card Contract is missing or unreadable.");
      }
      if (formal.effectiveDisposition !== "Approved") {
        throw new Error("Current Work Card Contract must be Approved before Codex execution.");
      }

      const report = documents.find((document) => document.markdownPath === projection.implementerReportPath);
      if (!report || projection.reportMissing) {
        throw new Error("Existing Pending Implementer Report is required before Codex execution.");
      }
      if (projection.reportReadiness === "invalid" || projection.reportReadiness === "conflict") {
        throw new Error(projection.reportReadinessReason);
      }
      if (report.documentReadState !== "readable" || report.readError) {
        throw new Error(report.readError ?? "Existing Implementer Report is unreadable.");
      }
      if (report.effectiveDisposition !== "Pending") {
        throw new Error("Existing Implementer Report must be Pending before Codex execution.");
      }
      if (evaluateDocumentFreshness(projectRoot, report.logicalDocumentId).state !== "fresh") {
        throw new Error("Existing Implementer Report must be fresh before Codex execution.");
      }

      const formalMetadata = readCanonicalMetadata(projectRoot, projection.formalWorkCardPath);
      const reportMetadata = readCanonicalMetadata(projectRoot, projection.implementerReportPath);
      return {
        ownerKind: routed ? "routed-development" : "development",
        ...(routed ? { intakeId: routed.state.binding.identity.intakeId, planId: routed.state.binding.identity.planId, planRevision: routed.state.binding.planRevision,
          rootWorkItemId: routed.entry.candidate.workItemId, currentImplementationId: routed.entry.executionWorkCardId } : {}),
        phaseId: projection.phaseId ?? null,
        workCardId: projection.workCardId,
        workCardTitle: projection.workCardTitle,
        projectRoot,
        formalWorkCardPath: projection.formalWorkCardPath,
        formalWorkCardRevision: formalMetadata.artifactRevision,
        formalWorkCardSha256: sha256ForRelativePath(projectRoot, projection.formalWorkCardPath),
        implementationContractType: projection.implementationContractType ?? "formal-work-card",
        implementationContractLabel: projection.implementationContractLabel ?? "Approved Work Card Contract",
        implementerReportPath: projection.implementerReportPath,
        implementerReportRevision: reportMetadata.artifactRevision,
        implementerReportSha256: sha256ForRelativePath(projectRoot, projection.implementerReportPath),
        developmentEnvironmentPreflight: null,
      };
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

function readCanonicalMetadata(workspaceRoot: string, relativePath: string) {
  return parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8"),
  ).metadata;
}

function sha256ForRelativePath(workspaceRoot: string, relativePath: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(workspaceRoot, relativePath)))
    .digest("hex");
}
