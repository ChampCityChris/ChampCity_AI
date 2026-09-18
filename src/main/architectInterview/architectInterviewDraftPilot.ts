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
import {
  buildWriteMarkdownArtifactJsonBlock,
  buildMcpWorkspaceBindingPromptBlock,
} from "../integrations/mcpWorkspacePromptContract";
import {
  inheritRepositoryBindingFromSourceRevisions,
  mergeRepositoryBindingIntoWorkflowData,
} from "../documents/repositoryBinding";

const outputKind = "project-architect-interview";
const owningWorkspaceId = "architect-interview";
const slotId = "interview";

type ActiveInterviewSubmission = ActiveArchitectOutputRuntimeSubmission;
interface ActiveInterviewChatHandoff {
  workspaceRoot: string;
  sourceHandoff: ArchitectDraftSubmission["sourceHandoff"];
  projectIntake: {
    path: string;
    revision: number;
  };
  preparedInstruction: string;
}

const activeInterviewChatHandoffByWorkspace = new Map<string, ActiveInterviewChatHandoff>();

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
        ? {
            ...metadataWithSubstantiveRevision(existing.metadata, sourceRevisions),
            workflowData: mergeRepositoryBindingIntoWorkflowData(
              existing.metadata.workflowData,
              inheritRepositoryBindingFromSourceRevisions(workspaceRoot, sourceRevisions),
            ),
          }
        : {
            schemaVersion: 1,
            artifactType: outputKind,
            artifactRevision: 1,
            participationRole: "gatingReview",
            identity: context.expectedProjectIdentity,
            sourceRevisions,
            workflowData: mergeRepositoryBindingIntoWorkflowData(
              {},
              inheritRepositoryBindingFromSourceRevisions(workspaceRoot, sourceRevisions),
            ),
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
  buildPreparedInstruction({ workspaceRoot, submission, sourceHandoff, domainContext: context }) {
    return buildProjectArchitectInterviewFinalizationInstruction(workspaceRoot, context, submission, sourceHandoff);
  },
  buildPostPromotionSelection({ promotedDocuments }) {
    return { selectedRole: "interview", markdownPath: promotedDocuments[0].relativePath };
  },
};

export function prepareArchitectInterviewDraftSubmission(workspaceRoot: string): ArchitectDraftSubmission {
  return prepareArchitectOutputRuntimeSubmission(workspaceRoot, outputKind, owningWorkspaceId);
}

export function prepareArchitectInterviewChatHandoff(workspaceRoot: string): string {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const context = requireReadyContext(resolvedWorkspaceRoot);
  assertCanPrepareSubmission(context);
  const sourceHandoff = { path: context.prompt.markdownPath, revision: context.prompt.artifactRevision };
  const preparedInstruction = buildProjectArchitectInterviewChatInstruction(
    resolvedWorkspaceRoot,
    context,
    sourceHandoff,
  );
  activeInterviewChatHandoffByWorkspace.set(resolvedWorkspaceRoot, {
    workspaceRoot: resolvedWorkspaceRoot,
    sourceHandoff,
    projectIntake: {
      path: context.projectIntake.markdownPath,
      revision: context.projectIntake.artifactRevision,
    },
    preparedInstruction,
  });
  return preparedInstruction;
}

export function getPreparedArchitectInterviewChatHandoff(workspaceRoot: string): string | undefined {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const active = activeInterviewChatHandoffByWorkspace.get(resolvedWorkspaceRoot);
  if (!active) return undefined;
  try {
    const context = requireReadyContext(resolvedWorkspaceRoot);
    assertCanPrepareSubmission(context);
    if (
      active.sourceHandoff.path !== context.prompt.markdownPath ||
      active.sourceHandoff.revision !== context.prompt.artifactRevision ||
      active.projectIntake.path !== context.projectIntake.markdownPath ||
      active.projectIntake.revision !== context.projectIntake.artifactRevision
    ) {
      activeInterviewChatHandoffByWorkspace.delete(resolvedWorkspaceRoot);
      return undefined;
    }
    return active.preparedInstruction;
  } catch {
    activeInterviewChatHandoffByWorkspace.delete(resolvedWorkspaceRoot);
    return undefined;
  }
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

function buildProjectArchitectInterviewChatInstruction(
  workspaceRoot: string,
  context: CanonicalArchitectInterviewReadyContext,
  sourceHandoff: ArchitectDraftSubmission["sourceHandoff"],
): string {
  const revisionNotes = context.interview?.disposition === "RevisionRequested"
    ? context.interview.operatorReviewNotes
    : undefined;
  const promptWorkflowData = mergeRepositoryBindingIntoWorkflowData(
    {},
    inheritRepositoryBindingFromSourceRevisions(workspaceRoot, sourceRevisionsFor(context)),
  );
  return [
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot, promptWorkflowData, {
      includeDiagnosticsToolboxHint: false,
    }),
    "",
    "This handoff starts or continues the Project Architect Interview. It is not a draft write-back handoff.",
    "",
    "Read these exact current inputs:",
    `- Approved Project Architect Interview prompt: ${sourceHandoff.path} revision ${sourceHandoff.revision}`,
    `- Approved Project Intake: ${context.projectIntake.markdownPath} revision ${context.projectIntake.artifactRevision}`,
    "",
    "Conduct the Project Architect Interview conversationally with the Operator.",
    "Ask one primary question at a time and continue until material scope, constraints, risks, decisions, unresolved questions, acceptance direction, and planning direction are resolved.",
    "When Project Intake declares existing source or planning, or supplies repository review context, inspect the materially relevant repository source, planning, and architecture evidence before asking unresolved questions.",
    "Distinguish verified current implementation, established planning or architecture intent, historical or legacy evidence, and unresolved assumptions.",
    "Resolve intended product capabilities, principal user workflows, and acceptance outcomes from the approved inputs and materially relevant evidence before asking the Operator to repeat known facts.",
    "When the approved inputs describe existing-product evolution, distinguish current product capabilities and workflows, governing next-version product and capability intent, governing architecture and technical constraints, current implementation evidence, and unresolved Operator-owned product decisions.",
    "For that existing-product evolution, materially resolve the next-version capability delta as Preserve, Improve or Replace, Add, and Defer or Conditional; do not treat architecture preservation as a substitute for capability preservation.",
    "Treat architecture identified by Intake or repository evidence as governing, approved, adopted, canonical, or otherwise Operator-established as a controlling planning constraint unless the Operator explicitly revises it.",
    "Assess that architecture for consistency, applicability, gaps, stale assumptions, or direct conflicts; do not redesign, summarize away, or silently supersede it merely to complete the generic interview structure.",
    "Evidence review controls interview length. Do not use a target, minimum, or expected question count.",
    "Ask only material Operator-owned questions that remain unresolved after reviewing the required Project Intake and materially relevant repository evidence and applying normal Architect judgment, including concrete architecture conflicts that cannot be resolved without the Operator.",
    "When that evidence resolves the project context and required coverage, ask zero clarification questions and proceed directly to the concise confirmation summary.",
    "Treat required coverage as coverage obligations, not a questionnaire or an implied one-question-per-section requirement.",
    "Do not compress unresolved material decisions merely to shorten the interview.",
    "Do not return a snippet as completion.",
    `Final output identity: ${projectArchitectInterviewTitle}`,
    `Final canonical target owned by ChampCity A/I, for context only: ${context.interviewTargets.markdownPath}`,
    "",
    "When the interview or revision direction is substantively complete, present a concise confirmation summary.",
    "The summary must include project understanding; principal users and workflows; intended product capabilities; key decisions and accepted Architect recommendations; acceptance direction; assumptions; deferred or conditional items; and unresolved material issues.",
    "When the approved inputs describe existing-product evolution, the summary must also include next-version understanding and a material capability delta that explicitly distinguishes Preserve, Improve or Replace, Add, and Defer or Conditional.",
    "Ask the Operator to confirm or correct that summary.",
    "Stop and wait for Operator confirmation before any draft creation or write-back.",
    "Do not create, save, or request any Markdown artifact during this handoff.",
    "",
    "The eventual Project Architect Interview Markdown body must contain these exact headings:",
    `# ${projectArchitectInterviewTitle}`,
    ...projectArchitectInterviewSections.map((heading) => `## ${heading}`),
    "",
    "Read and address current Operator revision notes when the existing Interview is RevisionRequested.",
    ...(revisionNotes ? ["", "Current Operator revision instructions:", revisionNotes] : []),
  ].join("\n");
}

function buildProjectArchitectInterviewFinalizationInstruction(
  workspaceRoot: string,
  context: CanonicalArchitectInterviewReadyContext,
  submission: ArchitectDraftSubmission<typeof slotId>,
  sourceHandoff: ArchitectDraftSubmission["sourceHandoff"],
): string {
  const draftPath = submission.expectedDraftSlots[0].draftRelativePath;
  const revisionNotes = context.interview?.disposition === "RevisionRequested"
    ? context.interview.operatorReviewNotes
    : undefined;
  const promptWorkflowData = mergeRepositoryBindingIntoWorkflowData(
    {},
    inheritRepositoryBindingFromSourceRevisions(workspaceRoot, sourceRevisionsFor(context)),
  );
  return [
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot, promptWorkflowData, {
      includeDiagnosticsToolboxHint: false,
    }),
    "",
    "This is the Finalize Interview Draft handoff. Use it only after the Operator has confirmed or corrected the interview completion summary.",
    "",
    "Read these exact current inputs:",
    `- Approved Project Architect Interview prompt: ${sourceHandoff.path} revision ${sourceHandoff.revision}`,
    `- Approved Project Intake: ${context.projectIntake.markdownPath} revision ${context.projectIntake.artifactRevision}`,
    "",
    "Write only the complete body-only Project Architect Interview Markdown that reflects the confirmed interview summary.",
    "Preserve confirmed product and capability intent, principal workflows, acceptance direction, and governing, approved, adopted, canonical, or otherwise Operator-established architecture from the inspected evidence unless the confirmed Operator direction explicitly revised them.",
    "Treat the concise confirmation summary as a checkpoint, not as permission to omit established product or capability intent from the approved Project Intake and materially relevant governing evidence.",
    "For existing-product evolution, preserve the material next-version capability delta as Preserve, Improve or Replace, Add, and Defer or Conditional within the existing required sections.",
    "Do not silently redesign, supersede, or summarize away established architecture or product capability intent during final synthesis.",
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
    "When the complete Project Architect Interview body is ready, call artifact_toolbox.write_markdown_artifact with this invocation shape:",
    "```json",
    ...buildWriteMarkdownArtifactJsonBlock(
      workspaceRoot,
      draftPath,
      "<complete body-only Interview Markdown>",
      promptWorkflowData,
    ),
    "```",
    "Do not supply canonical metadata, metadata delimiters, final canonical output paths, source revisions, route selectors, fallback fields, hidden application-control values, or any other application-owned fields as params.",
    "After the draft is created, respond with a concise draft-created confirmation.",
    "Read and address current Operator revision notes when the existing Interview is RevisionRequested.",
    ...(revisionNotes ? ["", "Current Operator revision instructions:", revisionNotes] : []),
  ].join("\n");
}
