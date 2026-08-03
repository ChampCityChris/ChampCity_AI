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
import {
  projectPlanningRequiredProfileSections,
  projectPlanningRequiredRoadmapSections,
} from "./projectPlanningPreflight";
import {
  resolveProjectPlanningContext,
  type ProjectPlanningReadyContext,
} from "./projectPlanningContext";

const outputKind = "project-planning";
const owningWorkspaceId = "project-planning-review";

type ProjectPlanningSlotId = "project-profile" | "project-roadmap";

type ActiveProjectPlanningSubmission = ActiveArchitectOutputRuntimeSubmission<
  ProjectPlanningSlotId,
  ProjectPlanningSelection
>;

interface ProjectPlanningSelection {
  selectedRole: "profile";
  profileMarkdownPath: string;
  roadmapMarkdownPath: string;
}

export const projectPlanningArchitectOutputDefinition: ArchitectOutputDefinition<
  ProjectPlanningSlotId,
  ProjectPlanningSelection,
  ProjectPlanningReadyContext
> = {
  outputKind,
  owningWorkspaceId,
  bundleMode: "atomic-bundle",
  slots: [
    {
      slotId: "project-profile",
      displayLabel: "Project Profile",
      draftPathComponent: "project-profile.md",
      validateBody(bodyMarkdown) {
        validateRequiredHeadings(
          bodyMarkdown,
          "Project Profile",
          projectPlanningRequiredProfileSections(),
        );
      },
      buildCanonicalDocument({ workspaceRoot, domainContext: context, bodyMarkdown }) {
        const existing = context.profile
          ? readExistingCanonical(workspaceRoot, context.profileMarkdownPath)
          : null;
        const sourceRevisions = sourceRevisionsFor(context);
        const metadata: CanonicalDocumentMetadata = existing
          ? metadataWithSubstantiveRevision(existing.metadata, sourceRevisions)
          : freshBundleMetadata(context, "project-profile", sourceRevisions);
        return { relativePath: context.profileMarkdownPath, metadata, bodyMarkdown };
      },
    },
    {
      slotId: "project-roadmap",
      displayLabel: "Project Roadmap",
      draftPathComponent: "project-roadmap.md",
      validateBody(bodyMarkdown) {
        validateRequiredHeadings(
          bodyMarkdown,
          "Project Roadmap",
          projectPlanningRequiredRoadmapSections(),
        );
      },
      buildCanonicalDocument({ workspaceRoot, domainContext: context, bodyMarkdown }) {
        const existing = context.roadmap
          ? readExistingCanonical(workspaceRoot, context.roadmapMarkdownPath)
          : null;
        const sourceRevisions = sourceRevisionsFor(context);
        const metadata: CanonicalDocumentMetadata = existing
          ? metadataWithSubstantiveRevision(existing.metadata, sourceRevisions)
          : freshBundleMetadata(context, "project-roadmap", sourceRevisions);
        return { relativePath: context.roadmapMarkdownPath, metadata, bodyMarkdown };
      },
    },
  ],
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
    if (!context.handoff) {
      throw new Error("Project Planning draft submission requires the current Approved handoff.");
    }
    assertCanPromoteBundle(context);
    return {
      sourceHandoff: { path: context.handoff.markdownPath, revision: context.handoff.artifactRevision },
      domainContext: context,
    };
  },
  resolvePromotionContext({ workspaceRoot, submission, preparedContext }) {
    return requireCurrentPromotionContext(
      workspaceRoot,
      submission,
      preparedContext as ProjectPlanningReadyContext,
    );
  },
  buildPreparedInstruction({ submission, sourceHandoff, domainContext: context }) {
    return buildProjectPlanningPreparedInstruction(context, submission, sourceHandoff);
  },
  buildPostPromotionSelection({ promotedDocuments }) {
    return {
      selectedRole: "profile",
      profileMarkdownPath: promotedDocuments[0].relativePath,
      roadmapMarkdownPath: promotedDocuments[1].relativePath,
    };
  },
};

export function prepareProjectPlanningDraftBundleSubmission(
  workspaceRoot: string,
): ArchitectDraftSubmission<ProjectPlanningSlotId, ProjectPlanningSelection> {
  return prepareArchitectOutputRuntimeSubmission(workspaceRoot, outputKind, owningWorkspaceId);
}

export function getProjectPlanningDraftBundleStatus(
  workspaceRoot: string,
): ActiveProjectPlanningSubmission | undefined {
  return getArchitectOutputRuntimeStatus(workspaceRoot, outputKind, owningWorkspaceId);
}

export function getActiveProjectPlanningDraftBundleSubmission(
  workspaceRoot: string,
): ActiveProjectPlanningSubmission | undefined {
  return getActiveArchitectOutputRuntimeSubmission(workspaceRoot, owningWorkspaceId);
}

function requireReadyContext(workspaceRoot: string): ProjectPlanningReadyContext {
  const context = resolveProjectPlanningContext(workspaceRoot);
  if (context.status !== "ready") throw new Error(context.reason);
  return context;
}

function requireCurrentPromotionContext(
  workspaceRoot: string,
  submission: ArchitectDraftSubmission,
  original: ProjectPlanningReadyContext,
): ProjectPlanningReadyContext {
  if (!original) throw new Error("Project Planning draft submission context is unavailable.");
  const current = requireReadyContext(workspaceRoot);
  if (!current.handoff) {
    throw new Error("Project Planning draft submission no longer has a current Approved handoff.");
  }
  if (
    current.handoff.markdownPath !== submission.sourceHandoff.path ||
    current.handoff.artifactRevision !== submission.sourceHandoff.revision
  ) {
    throw new Error("Project Planning draft submission no longer matches the current handoff revision.");
  }
  if (
    JSON.stringify(current.sourceRevisions) !== JSON.stringify(original.sourceRevisions) ||
    current.projectSlug !== original.projectSlug ||
    current.profileMarkdownPath !== original.profileMarkdownPath ||
    current.roadmapMarkdownPath !== original.roadmapMarkdownPath
  ) {
    throw new Error("Project Planning draft submission no longer matches the current planning evidence.");
  }
  assertCanPromoteBundle(current);
  return current;
}

function assertCanPromoteBundle(context: ProjectPlanningReadyContext): void {
  if (context.invalidHandoffReason) {
    throw new Error(context.invalidHandoffReason);
  }
  if (context.invalidProfileReason || context.invalidRoadmapReason) {
    throw new Error(context.invalidProfileReason ?? context.invalidRoadmapReason);
  }
  if (context.profile && !context.roadmap) {
    throw new Error("Project Planning draft bundle cannot replace a partial existing output set.");
  }
  if (!context.profile && context.roadmap) {
    throw new Error("Project Planning draft bundle cannot replace a partial existing output set.");
  }
  if (!context.profile && !context.roadmap) {
    return;
  }
  const profile = context.profile;
  const roadmap = context.roadmap;
  if (!profile || !roadmap) {
    throw new Error("Project Planning draft bundle cannot replace a partial existing output set.");
  }
  if (
    profile.disposition !== "RevisionRequested" ||
    roadmap.disposition !== "RevisionRequested"
  ) {
    throw new Error("Project Planning draft bundle can only replace an existing synchronized RevisionRequested bundle.");
  }
  if (profile.operatorReviewNotes !== roadmap.operatorReviewNotes) {
    throw new Error("Project Planning draft bundle cannot replace outputs with mixed review notes.");
  }
}

function freshBundleMetadata(
  context: ProjectPlanningReadyContext,
  artifactType: "project-profile" | "project-roadmap",
  sourceRevisions: CanonicalDocumentMetadata["sourceRevisions"],
): CanonicalDocumentMetadata {
  return {
    schemaVersion: 1,
    artifactType,
    artifactRevision: 1,
    participationRole: "compoundGatingReview",
    identity: {
      projectSlug: context.projectSlug,
      "Project.ArtifactKey": context.projectSlug,
    },
    sourceRevisions,
    workflowData: {},
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function sourceRevisionsFor(context: ProjectPlanningReadyContext) {
  if (!context.handoff) {
    throw new Error("Project Planning output source revisions require the current handoff.");
  }
  return [
    ...context.sourceRevisions,
    { path: context.handoff.markdownPath, revision: context.handoff.artifactRevision },
  ];
}

function validateRequiredHeadings(
  bodyMarkdown: string,
  title: string,
  sectionHeadings: readonly string[],
): void {
  if (!bodyMarkdown.trim()) {
    throw new Error(`${title} draft requires substantive Markdown.`);
  }
  if (!hasHeading(bodyMarkdown, 1, title)) {
    throw new Error(`${title} draft requires # ${title}.`);
  }
  for (const heading of sectionHeadings) {
    if (!hasHeading(bodyMarkdown, 2, heading)) {
      throw new Error(`${title} draft requires ## ${heading}.`);
    }
  }
}

function hasHeading(bodyMarkdown: string, depth: 1 | 2, heading: string): boolean {
  const prefix = "#".repeat(depth);
  return bodyMarkdown
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .some((line) => line.trim() === `${prefix} ${heading}`);
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  return fs.existsSync(absolutePath)
    ? parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"))
    : null;
}

function buildProjectPlanningPreparedInstruction(
  context: ProjectPlanningReadyContext,
  submission: ArchitectDraftSubmission<ProjectPlanningSlotId>,
  sourceHandoff: ArchitectDraftSubmission["sourceHandoff"],
): string {
  const revisionNotes = sharedOperatorReviewNotes(context.profile, context.roadmap);
  const includeRevisionNotes =
    (context.profile?.disposition === "RevisionRequested" ||
      context.roadmap?.disposition === "RevisionRequested") &&
    revisionNotes;
  const profileDraftPath = draftPathForSlot(submission, "project-profile");
  const roadmapDraftPath = draftPathForSlot(submission, "project-roadmap");
  return [
    "Use ChampCity MCP with repository reference <PROJECT_REPO>.",
    "Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.",
    "",
    "Read these exact current inputs:",
    `- Project Intake Markdown: ${context.projectIntake.markdownPath}`,
    `- Architect Interview Prompt Markdown: ${context.prompt.markdownPath}`,
    `- Approved Architect Interview Markdown: ${context.interview.markdownPath}`,
    `- Approved Project Planning handoff Markdown: ${sourceHandoff.path} revision ${sourceHandoff.revision}`,
    "- Stable Project Planning submission contract: project-planning-output-submission-v2",
    "",
    "Inspect required repository evidence through ChampCity MCP before drafting outputs.",
    "Distinguish verified implementation from declared intent and reconcile materially relevant legacy planning as evidence, not authority.",
    "",
    "Produce both complete Markdown document bodies for these exact final targets:",
    `- Project Profile target: ${context.profileMarkdownPath}`,
    `- Project Roadmap target: ${context.roadmapMarkdownPath}`,
    "",
    "Both outputs belong to one atomic Project Planning draft bundle.",
    "MCP creates only these temporary body-only drafts:",
    `- Temporary Project Profile draft path: ${profileDraftPath}`,
    `- Temporary Project Roadmap draft path: ${roadmapDraftPath}`,
    "ChampCity A/I owns final targets, canonical metadata, validation, revisions, atomic promotion, cleanup, and review state.",
    "The workflow remains incomplete until both temporary drafts are created and ChampCity A/I promotes the bundle.",
    "",
    "The Project Profile Markdown body must contain these exact headings:",
    "# Project Profile",
    ...projectPlanningRequiredProfileSections().map((heading) => `## ${heading}`),
    "",
    "The Project Roadmap Markdown body must contain these exact headings:",
    "# Project Roadmap",
    ...projectPlanningRequiredRoadmapSections().map((heading) => `## ${heading}`),
    "The Roadmap must cover the complete currently intended development lifecycle, not only the MVP boundary.",
    "Do not write placeholders.",
    "",
    "Current source revisions:",
    ...sourceRevisionsFor(context).map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "When the complete Project Profile body is ready, call artifact_toolbox.create_markdown_artifact with this invocation shape:",
    "```json",
    "{",
    '  "action": "create_markdown_artifact",',
    '  "workspaceId": "<resolved workspace ID>",',
    '  "params": {',
    `    "relativePath": "${profileDraftPath}",`,
    '    "content": "<complete body-only Project Profile Markdown>",',
    '    "overwrite": false',
    "  }",
    "}",
    "```",
    "",
    "When the complete Project Roadmap body is ready, call artifact_toolbox.create_markdown_artifact with this invocation shape:",
    "```json",
    "{",
    '  "action": "create_markdown_artifact",',
    '  "workspaceId": "<resolved workspace ID>",',
    '  "params": {',
    `    "relativePath": "${roadmapDraftPath}",`,
    '    "content": "<complete body-only Project Roadmap Markdown>",',
    '    "overwrite": false',
    "  }",
    "}",
    "```",
    "Do not supply canonical metadata, metadata delimiters, final canonical output paths, source revisions, reconciliation fields, route selectors, fallback fields, hidden authorization values, or any other authority fields as params.",
    "After both drafts are created, respond with a concise draft-created confirmation.",
    ...(includeRevisionNotes ? ["", "Current Operator revision instructions:", revisionNotes] : []),
  ].join("\n");
}

function draftPathForSlot(
  submission: ArchitectDraftSubmission<ProjectPlanningSlotId>,
  slotId: ProjectPlanningSlotId,
): string {
  const slot = submission.expectedDraftSlots.find((candidate) => candidate.slotId === slotId);
  if (!slot) {
    throw new Error("Project Planning draft submission is missing an expected slot.");
  }
  return slot.draftRelativePath;
}

function sharedOperatorReviewNotes(
  profile: ProjectPlanningReadyContext["profile"],
  roadmap: ProjectPlanningReadyContext["roadmap"],
): string | undefined {
  if (!profile || !roadmap) return profile?.operatorReviewNotes ?? roadmap?.operatorReviewNotes;
  return profile.operatorReviewNotes === roadmap.operatorReviewNotes
    ? profile.operatorReviewNotes
    : "Mixed review notes require attention.";
}
