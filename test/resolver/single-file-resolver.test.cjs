const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  writeCanonicalMarkdownDocument,
} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
const {
  listPlanningDocuments,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  resolveFirstNonApproved,
} = require("../../dist/shared/documents/documentOrder.js");

function tempWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-single-file-resolver-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  return root;
}

function metadata(artifactType, status, extra = {}) {
  return {
    schemaVersion: 1,
    artifactType,
    artifactRevision: extra.artifactRevision ?? 1,
    participationRole: extra.participationRole ?? "gatingReview",
    identity: extra.identity ?? {},
    sourceRevisions: extra.sourceRevisions ?? [],
    workflowData: extra.workflowData ?? {},
    documentDisposition: { status, notes: "", reviewedAt: null },
  };
}

function writeDoc(root, relativePath, artifactType, status, extra = {}) {
  writeCanonicalMarkdownDocument({
    workspaceRoot: root,
    relativePath,
    metadata: metadata(artifactType, status, extra),
    bodyMarkdown: `# ${artifactType}\n\nDocument.Status=Approved in body prose is ignored.\n`,
  });
}

test("canonical metadata disposition drives current resolver state", () => {
  const root = tempWorkspace();
  writeDoc(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo.md", "project-intake", "Approved");
  writeDoc(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", "project-roadmap", "Pending");
  const result = resolveFirstNonApproved(listPlanningDocuments(root));
  assert.equal(result.status, "project-intake-incomplete");
});

test("approved intake and approved prompt wait for Architect Markdown output", () => {
  const root = tempWorkspace();
  const intakePath = "planning/project/Project_Intake/PROJECT_INTAKE_demo.md";
  const promptPath = "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.md";
  writeDoc(root, intakePath, "project-intake", "Approved");
  writeDoc(root, promptPath, "project-architect-interview-prompt", "Approved", {
    participationRole: "nonReviewHandoff",
    sourceRevisions: [{ path: intakePath, revision: 1 }],
    workflowData: {
      architectOutputTargets: {
        markdown: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md",
      },
    },
  });
  const result = resolveFirstNonApproved(listPlanningDocuments(root));
  assert.equal(result.status, "waiting-for-architect-interview");
  assert.equal(result.expectedOutputPaths.markdown, "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md");
});

test("pending canonical Architect Interview becomes current review document", () => {
  const root = tempWorkspace();
  const intakePath = "planning/project/Project_Intake/PROJECT_INTAKE_demo.md";
  const promptPath = "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.md";
  const interviewPath = "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md";
  writeDoc(root, intakePath, "project-intake", "Approved");
  writeDoc(root, promptPath, "project-architect-interview-prompt", "Approved", {
    participationRole: "nonReviewHandoff",
    sourceRevisions: [{ path: intakePath, revision: 1 }],
    workflowData: { architectOutputTargets: { markdown: interviewPath } },
  });
  writeDoc(root, interviewPath, "project-architect-interview", "Pending", {
    sourceRevisions: [
      { path: intakePath, revision: 1 },
      { path: promptPath, revision: 1 },
    ],
  });
  const result = resolveFirstNonApproved(listPlanningDocuments(root));
  assert.equal(result.status, "current");
  assert.equal(result.document.markdownPath, interviewPath);
  assert.equal(result.document.owningWorkspaceId, "architect-interview");
});
