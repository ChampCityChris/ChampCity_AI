import { randomUUID } from "node:crypto";
import type { WorkIssueAction, WorkIssueActionInput, WorkIssueModel } from "../../shared/issueResolutionContracts";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import { applyIssueArchitectReview, createLightweightIssueRecord, getIssueArchitectPlanningProjection, prepareIssueArchitectPlanningHandoff, resolveIssueArchitectPlanningCopyHandoff } from "../issueResolution/issueResolutionService";
import { getWorkRouteDecision, recommendWorkRouteReroute } from "../workIntake/workRouteDecisionService";
import { readWorkIntake } from "../workIntake/workIntakeService";
import { sourceDigests, workPlanningArtifactPath } from "./workPlanningKernel";
import { issueEvidenceBytes, issueEvidenceDigest, workIssueContext, workIssueHandoffPath } from "./workIssueContext";
import { activateRoutedIssueExecutionPlan, issueExecutionPlanPath } from "../planExecution/issueExecutionPlan";
import { approveIssueCorrectionPhase, getIssueCorrectionExecution } from "../issueResolution/issueResolutionService";

/** Adapt existing Issue RCA mechanics; routing and Git authority remain outside the Architect. */
export async function runWorkIssueAction(root: string, intakeId: string, action: WorkIssueAction, input: WorkIssueActionInput = {}): Promise<{ model: WorkIssueModel; instruction?: string }> {
  if (!["open", "status", "prepare", "copy", "review", "activate-execution", "accept-phase"].includes(action) || !input || Object.keys(input).some((key) => !["review", "screenshots", "expectedEvidenceDigest", "phaseAcceptance"].includes(key)) ||
    action !== "review" && (input.review !== undefined || input.expectedEvidenceDigest !== undefined) || action !== "open" && input.screenshots !== undefined || action !== "accept-phase" && input.phaseAcceptance !== undefined) throw Error("Invalid routed Issue action.");
  let route = await getWorkRouteDecision(root, intakeId);
  const intake = readWorkIntake(root, intakeId);
  if (!route.selection || route.selection.selectedRouteId !== "issue-resolution" || route.history.at(-1)?.sourceIntake.revision !== intake.artifactRevision) throw Error("Issue RCA requires the current Operator-selected Issue route and Intake.");
  const decisionId = route.selection.decisionId;
  const sources = [{ path: intake.relativePath, revision: intake.artifactRevision }, { path: route.relativePath, revision: route.artifactRevision }];
  let context = workIssueContext(root, intakeId, decisionId);
  if (!context && action === "open") {
    if (route.state !== "selected") throw Error("Resolve routing before opening an Issue.");
    const handoffPath = workIssueHandoffPath(intakeId, decisionId);
    createLightweightIssueRecord(root, {
      title: intake.workRequest.slice(0, 120), issue: intake.workRequest,
      currentConsequence: `Reported work and desired outcome: ${intake.desiredOutcome}`,
      neededCapability: intake.desiredOutcome, discoveryContext: `Work Intake: ${intake.relativePath}\nConstraints: ${intake.knownConstraints}\nRepository context: ${intake.repositoryReviewContext}`,
      screenshots: input.screenshots,
    }, ({ createdIssueId, createdRecordPath }) => {
      writeCanonicalMarkdownDocument({ workspaceRoot: root, relativePath: handoffPath,
        metadata: { schemaVersion: 1, artifactType: "work-intake-issue-handoff", artifactRevision: 1, participationRole: "contextOnly",
          identity: { intakeId, projectId: intake.projectId, routeId: "issue-resolution", routeDecisionId: decisionId, issueId: createdIssueId },
          sourceRevisions: sources, workflowData: { branchBinding: intake.branchBinding, issueRecordPath: createdRecordPath, sourceDigests: sourceDigests(root, sources) },
          documentDisposition: { status: "Pending", notes: "", reviewedAt: null } },
        bodyMarkdown: `# Work Intake to Issue RCA\n\nWork Intake: ${intake.relativePath}\nIssue record: ${createdRecordPath}\nWork branch: ${intake.branchBinding.workBranch}\n\n## Reported work\n${intake.workRequest}\n\n## Desired outcome\n${intake.desiredOutcome}\n\n## Constraints and evidence\n${intake.knownConstraints}\n${intake.repositoryReviewContext}\n\nPreserve the original Intake and branch. Investigate reproduction, expected versus actual behavior, root cause, and bounded correction before shared direct/phased planning.\n` });
    });
    context = workIssueContext(root, intakeId, decisionId);
  }
  if (!context) {
    if (action !== "status") throw Error("Open the routed Issue before RCA actions.");
    return { model: { intakeId, issueId: null, handoffPath: null, architect: null, correctionPlanningReady: false, rerouteRecommended: false, reviewEvidenceDigest: null } };
  }
  let instruction: string | undefined;
  if (action === "activate-execution") await activateRoutedIssueExecutionPlan(root, intakeId);
  if (action === "accept-phase") {
    if (route.state !== "selected" || !input.phaseAcceptance || Object.keys(input.phaseAcceptance).some((key) => !["phaseId", "expectedFingerprint", "notes"].includes(key))) throw Error("Supply current correction Phase acceptance evidence.");
    approveIssueCorrectionPhase(root, context.issueId, input.phaseAcceptance);
  }
  if (action === "prepare") prepareIssueArchitectPlanningHandoff(root, context.issueId);
  if (action === "copy") instruction = resolveIssueArchitectPlanningCopyHandoff(root, context.issueId).instruction +
    `\n\nRouted Work Intake: ${intake.relativePath}\nCanonical Issue handoff: ${context.relativePath}\nBranch: ${intake.branchBinding.workBranch}\nPreserve this Intake/branch. Root-cause correction may use direct or phased shared planning. Reframe is advisory; Operator route selection is required.`;
  if (action === "review") {
    if (!input.review || Object.keys(input.review).some((key) => !["disposition", "operatorNotes"].includes(key)) || typeof input.review.operatorNotes !== "string" || input.review.operatorNotes.length > 4000) throw Error("Supply an explicit bounded Issue RCA review.");
    if (input.expectedEvidenceDigest !== issueEvidenceDigest(JSON.stringify(context.evidenceDigests))) throw Error("Presented RCA evidence is stale; refresh before reviewing.");
    applyIssueArchitectReview(root, context.issueId, input.review);
  }
  const architect = getIssueArchitectPlanningProjection(root, context.issueId);
  context = workIssueContext(root, intakeId, decisionId)!;
  const targetPath = workPlanningArtifactPath(intakeId, decisionId, "assessment");
  const priorContent = issueEvidenceBytes(root, targetPath);
  const prior = priorContent ? parseCanonicalMarkdownDocument(priorContent) : null;
  if (prior && (prior.metadata.identity.routeDecisionId !== decisionId || prior.metadata.artifactType !== "work-planning-assessment" || prior.metadata.participationRole === "historical")) throw Error("RCA assessment target identity is invalid.");
  let ready = false;
  if (architect.finalInvestigationState === "readable") {
    const investigationDigest = context.evidenceDigests[context.paths[1]];
    const reviewedDigest = action === "review" ? investigationDigest : prior?.metadata.workflowData.issueReviewedInvestigationDigest;
    const reviewedEvidence = action === "review" ? JSON.stringify(context.evidenceDigests) : prior?.metadata.workflowData.issueReviewedEvidence;
    const approvalCurrent = reviewedDigest === investigationDigest && reviewedEvidence === JSON.stringify(context.evidenceDigests);
    const disposition = approvalCurrent ? architect.operatorDisposition ?? "Pending" : "Pending";
    ready = disposition === "Approved" && architect.architectRecommendation === "Proceed in Issue Resolution";
    const sourceRevisions = [...sources, context.source];
    const digests = { ...sourceDigests(root, sourceRevisions), ...context.evidenceDigests };
    const workflowData = { sourceDigests: digests, issueId: context.issueId, issueReviewedInvestigationDigest: reviewedDigest ?? null, issueReviewedEvidence: reviewedEvidence ?? null, architectRecommendation: architect.architectRecommendation };
    const bodyMarkdown = `# Route Architect Assessment\n\n## Evidence\nOriginal Work Intake: ${intake.relativePath}\nIssue record: ${context.paths[0]}\nRCA: ${context.paths[1]}\nReview: ${context.paths[2]}\n\n## Decisions\n${architect.architectRecommendation}\n\n## Risks and Unresolved Questions\nPreserve the investigation's bounded correction, preservation rules, risks, and unresolved questions.\n\n${architect.finalInvestigationMarkdown}\n`;
    const documentDisposition = { status: ready ? "Approved" as const : disposition === "Approved" ? "Pending" as const : disposition, notes: architect.operatorReviewNotes ?? "", reviewedAt: action === "review" ? new Date().toISOString() : prior?.metadata.documentDisposition.reviewedAt ?? null };
    if (!prior || prior.bodyMarkdown !== bodyMarkdown || JSON.stringify(prior.metadata.workflowData) !== JSON.stringify(workflowData) || prior.metadata.documentDisposition.status !== documentDisposition.status || prior.metadata.documentDisposition.notes !== documentDisposition.notes) {
      writeCanonicalMarkdownDocument({ workspaceRoot: root, relativePath: targetPath, bodyMarkdown,
        metadata: { schemaVersion: 1, artifactType: "work-planning-assessment", artifactRevision: (prior?.metadata.artifactRevision ?? 0) + 1, participationRole: "gatingReview",
          identity: { intakeId, projectId: intake.projectId, routeDecisionId: decisionId, routeId: "issue-resolution", assessmentId: prior?.metadata.identity.assessmentId ?? `assessment-${randomUUID()}`, issueId: context.issueId },
          sourceRevisions, workflowData, documentDisposition } });
    }
    if (architect.architectRecommendation === "Reframe to Development/Feature") {
      const assessment = parseCanonicalMarkdownDocument(issueEvidenceBytes(root, targetPath)!);
      const evidence = { path: targetPath, revision: assessment.metadata.artifactRevision };
      if (route.recommendation?.kind !== "architect-reroute-recommendation" || !route.recommendation.sourceEvidence.some((item) => item.path === evidence.path && item.revision === evidence.revision)) {
        route = await recommendWorkRouteReroute(root, intakeId, { priorDecisionId: decisionId, replacementRouteId: "feature-change",
          rationale: `Issue ${context.issueId} RCA recommends reframing as planned Feature work. Review the current investigation before choosing the replacement route.`, sourceEvidence: [evidence] });
      }
    }
  }
  return { model: { intakeId, issueId: context.issueId, handoffPath: context.relativePath, architect, correctionPlanningReady: ready && route.state === "selected", rerouteRecommended: route.recommendation?.kind === "architect-reroute-recommendation",
    execution: issueEvidenceBytes(root, issueExecutionPlanPath(context.issueId)) ? getIssueCorrectionExecution(root, context.issueId) : undefined,
    reviewEvidenceDigest: architect.finalInvestigationState === "readable" ? issueEvidenceDigest(JSON.stringify(context.evidenceDigests)) : null }, instruction };
}
