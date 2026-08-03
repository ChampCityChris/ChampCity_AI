import fs from "node:fs";
import path from "node:path";
import type { ArchitectDraftSubmission, ArchitectOutputDefinition } from "../../shared/architectOutputs/architectOutputContracts";
import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import {
  metadataWithSubstantiveRevision,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import {
  getActiveArchitectOutputRuntimeSubmission,
  getArchitectOutputRuntimeStatus,
  prepareArchitectOutputRuntimeSubmission,
  type ActiveArchitectOutputRuntimeSubmission,
} from "../architectOutputs/architectOutputRuntimeService";
import { buildDeterministicArchitectDraftSubmissionId } from "../architectOutputs/architectDraftPaths";
import { resolveCanonicalArchitectInterviewContext, type CanonicalArchitectInterviewReadyContext } from "./architectInterviewContextResolver";

const outputKind = "project-architect-interview";
const owningWorkspaceId = "architect-interview";
const slotId = "interview";

type ActiveInterviewSubmission = ActiveArchitectOutputRuntimeSubmission;

const projectArchitectInterviewTitle = "Project Architect Interview";
const projectArchitectInterviewSections = [
  "Project Understanding",
  "Users and Primary Workflows",
  "Scope",
  "Non-Scope",
  "Constraints",
  "Key Decisions",
  "Architect Recommendations",
  "Data and Integration Requirements",
  "Security, Compliance, and Operational Considerations",
  "Risks and Dependencies",
  "Assumptions",
  "Deferred Decisions",
  "Unresolved Questions",
  "Acceptance Direction",
  "Project Planning Direction",
] as const;

export const projectArchitectInterviewOutputDefinition: ArchitectOutputDefinition<
  typeof slotId,
  { selectedRole: "interview"; markdownPath: string },
  CanonicalArchitectInterviewReadyContext
> = {
  outputKind,
  owningWorkspaceId,
  bundleMode: "single-output",
  slots: [{
    slotId,
    displayLabel: "Project Architect Interview",
    draftPathComponent: "interview.md",
    validateBody(bodyMarkdown) {
      if (!bodyMarkdown.trim()) throw new Error("Architect Interview draft requires substantive Markdown.");
    },
    buildCanonicalDocument({ workspaceRoot, domainContext: context, bodyMarkdown }) {
      const sourceRevisions = sourceRevisionsFor(context);
      const existing = context.interview
        ? readExistingCanonical(workspaceRoot, context.interviewTargets.markdownPath)
        : null;
      const metadata: CanonicalDocumentMetadata = existing
        ? metadataWithSubstantiveRevision(existing.metadata, sourceRevisions)
        : {
            schemaVersion: 1,
            artifactType: outputKind,
            artifactRevision: 1,
            participationRole: "gatingReview",
            identity: context.expectedProjectIdentity,
            sourceRevisions,
            workflowData: {},
            documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
          };
      return { relativePath: context.interviewTargets.markdownPath, metadata, bodyMarkdown };
    },
  }],
  buildSubmissionId(context) {
    return buildDeterministicArchitectDraftSubmissionId({
      outputKind,
      owningWorkspaceId,
      ...context,
    });
  },
  buildPromotionGroupId(context) {
    return buildDeterministicArchitectDraftSubmissionId({
      outputKind,
      owningWorkspaceId,
      ...context,
    });
  },
  resolvePreparation(workspaceRoot) {
    const context = requireReadyContext(workspaceRoot);
    assertCanPrepareSubmission(context);
    return {
      sourceHandoff: { path: context.prompt.markdownPath, revision: context.prompt.artifactRevision },
      domainContext: context,
    };
  },
  resolvePromotionContext({ workspaceRoot, submission, preparedContext }) {
    return requireCurrentPromotionContext(
      workspaceRoot,
      submission,
      preparedContext as CanonicalArchitectInterviewReadyContext,
    );
  },
  buildPreparedInstruction({ submission, sourceHandoff, domainContext: context }) {
    return buildProjectArchitectInterviewPreparedInstruction(context, submission, sourceHandoff);
  },
  buildPostPromotionSelection({ promotedDocuments }) {
    return { selectedRole: "interview", markdownPath: promotedDocuments[0].relativePath };
  },
};

export function prepareArchitectInterviewDraftSubmission(workspaceRoot: string): ArchitectDraftSubmission {
  return prepareArchitectOutputRuntimeSubmission(workspaceRoot, outputKind, owningWorkspaceId);
}

export function getArchitectInterviewDraftStatus(workspaceRoot: string): ActiveInterviewSubmission | undefined {
  return getArchitectOutputRuntimeStatus(workspaceRoot, outputKind, owningWorkspaceId);
}

export function getActiveArchitectInterviewDraftSubmission(workspaceRoot: string): ActiveInterviewSubmission | undefined {
  return getActiveArchitectOutputRuntimeSubmission(workspaceRoot, owningWorkspaceId);
}

function requireReadyContext(workspaceRoot: string): CanonicalArchitectInterviewReadyContext {
  const context = resolveCanonicalArchitectInterviewContext(workspaceRoot);
  if (context.status !== "ready") throw new Error(context.reason);
  return context;
}

function assertCanPrepareSubmission(context: CanonicalArchitectInterviewReadyContext): void {
  if (context.invalidInterview || context.invalidInterviewReason) {
    throw new Error(context.invalidInterviewReason ?? "Architect Interview target is not eligible for replacement.");
  }
  if (context.interview && context.interview.disposition !== "RevisionRequested") {
    throw new Error("Architect Interview target is not eligible for substantive replacement.");
  }
}

function requireCurrentPromotionContext(
  workspaceRoot: string,
  submission: ArchitectDraftSubmission,
  original: CanonicalArchitectInterviewReadyContext,
): CanonicalArchitectInterviewReadyContext {
  if (!original) throw new Error("Architect Interview draft submission context is unavailable.");
  const current = requireReadyContext(workspaceRoot);
  if (
    current.prompt.markdownPath !== submission.sourceHandoff.path ||
    current.prompt.artifactRevision !== submission.sourceHandoff.revision
  ) {
    throw new Error("Architect Interview draft submission no longer matches the current Prompt revision.");
  }
  if (
    current.projectIntake.markdownPath !== original.projectIntake.markdownPath ||
    current.projectIntake.artifactRevision !== original.projectIntake.artifactRevision ||
    JSON.stringify(current.expectedProjectIdentity) !== JSON.stringify(original.expectedProjectIdentity)
  ) {
    throw new Error("Architect Interview draft submission no longer matches the current Project Intake evidence.");
  }
  assertCanPrepareSubmission(current);
  return current;
}

function sourceRevisionsFor(context: CanonicalArchitectInterviewReadyContext) {
  return [
    { path: context.projectIntake.markdownPath, revision: context.projectIntake.artifactRevision },
    { path: context.prompt.markdownPath, revision: context.prompt.artifactRevision },
  ];
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  return fs.existsSync(absolutePath)
    ? parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"))
    : null;
}

function buildProjectArchitectInterviewPreparedInstruction(
  context: CanonicalArchitectInterviewReadyContext,
  submission: ArchitectDraftSubmission<typeof slotId>,
  sourceHandoff: ArchitectDraftSubmission["sourceHandoff"],
): string {
  const draftPath = submission.expectedDraftSlots[0].draftRelativePath;
  const revisionNotes = context.interview?.disposition === "RevisionRequested"
    ? context.interview.operatorReviewNotes
    : undefined;
  return [
    "Use ChampCity MCP with repository reference <PROJECT_REPO>.",
    "Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.",
    "",
    "Read these exact current inputs:",
    `- Approved Project Architect Interview prompt: ${sourceHandoff.path} revision ${sourceHandoff.revision}`,
    `- Approved Project Intake: ${context.projectIntake.markdownPath} revision ${context.projectIntake.artifactRevision}`,
    "",
    "Conduct the Project Architect Interview conversationally with the Operator until material scope, constraints, risks, decisions, unresolved questions, and planning direction are resolved.",
    "Do not return a snippet as completion.",
    `Final output identity: ${projectArchitectInterviewTitle}`,
    `Final canonical target owned by ChampCity A/I: ${context.interviewTargets.markdownPath}`,
    `Temporary draft Markdown: ${draftPath}`,
    `Temporary body-only draft path: ${draftPath}`,
    "The workflow remains incomplete until this temporary draft is created and ChampCity A/I promotes it.",
    "",
    "The Project Architect Interview Markdown body must contain these exact headings:",
    `# ${projectArchitectInterviewTitle}`,
    ...projectArchitectInterviewSections.map((heading) => `## ${heading}`),
    "",
    "When the complete Project Architect Interview body is ready, call artifact_toolbox.create_markdown_artifact with this invocation shape:",
    "```json",
    "{",
    '  "action": "create_markdown_artifact",',
    '  "workspaceId": "<resolved workspace ID>",',
    '  "params": {',
    `    "relativePath": "${draftPath}",`,
    '    "content": "<complete body-only Interview Markdown>",',
    '    "overwrite": false',
    "  }",
    "}",
    "```",
    "Do not supply canonical metadata, metadata delimiters, final canonical output paths, source revisions, route selectors, fallback fields, hidden authorization values, or any other authority fields as params.",
    "After the draft is created, respond with a concise draft-created confirmation.",
    "Read and address current Operator revision notes when the existing Interview is RevisionRequested.",
    ...(revisionNotes ? ["", "Current Operator revision instructions:", revisionNotes] : []),
  ].join("\n");
}
