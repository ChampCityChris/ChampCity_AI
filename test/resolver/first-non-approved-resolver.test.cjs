const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  resolveFirstNonApprovedDocument,
} = require("../../dist/main/documents/firstNonApprovedResolver.js");
const {
  __setPlanningDocumentServiceTestHooks,
  listPlanningDocuments,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  orderPlanningDocuments,
} = require("../../dist/shared/documents/documentOrder.js");
const {
  getCurrentWorkspaceModel,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-resolver-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  return root;
}

function writeFile(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function markdown(title, status, extra = "") {
  const disposition = status
    ? `\n\n## Document Disposition\nDocument.Status=${status}\n`
    : "\n";
  return `# ${title}\n\n${extra}${disposition}`;
}

function current(root) {
  const result = resolveFirstNonApprovedDocument(root);
  assert.equal(result.status, "current");
  return result.document;
}

function withServiceHooks(t, hooks) {
  __setPlanningDocumentServiceTestHooks(hooks);
  t.after(() => __setPlanningDocumentServiceTestHooks());
}

function allApproved(root) {
  const result = resolveFirstNonApprovedDocument(root);
  assert.equal(result.status, "all-approved");
  return result;
}

function writeApprovedProjectIntake(root) {
  writeFile(
    root,
    "planning/project/Project_Intake/PROJECT_INTAKE.md",
    markdown("Intake", "Approved"),
  );
}

function writeApprovedArchitectPrompt(root) {
  writeFile(
    root,
    "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.md",
    markdown("Prompt", "Approved", "participationRole=nonReviewHandoff\n"),
  );
  writeFile(
    root,
    "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.json",
    JSON.stringify(
      {
        artifactType: "project-architect-interview-prompt",
        artifactRevision: 1,
        participationRole: "nonReviewHandoff",
        architectOutputTargets: {
          markdown: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md",
          json: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.json",
        },
        documentDisposition: { status: "Approved" },
      },
      null,
      2,
    ),
  );
}

function writeArchitectInterview(root, status) {
  writeFile(
    root,
    "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md",
    markdown("Interview", status, "participationRole=gatingReview\n"),
  );
  writeFile(
    root,
    "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.json",
    JSON.stringify(
      {
        artifactType: "project-architect-interview",
        artifactRevision: 1,
        participationRole: "gatingReview",
        documentDisposition: { status },
      },
      null,
      2,
    ),
  );
}

function writePendingProjectRoadmap(root) {
  writeFile(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP.md", markdown("Roadmap"));
}

function writePendingPhasePlanning(root) {
  writeFile(root, "planning/phases/phase-01/Phase_Planning.md", markdown("Phase Planning"));
}

function writeCompleteProjectIntakeSequence(root) {
  writeApprovedProjectIntake(root);
  writeApprovedArchitectPrompt(root);
  writeArchitectInterview(root, "Approved");
}

function writeArchivedProjectIntake(root, status, suffix = "old") {
  writeFile(
    root,
    `planning/archive/project/Project_Intake/PROJECT_INTAKE_${suffix}.md`,
    markdown("Archived Intake", status, "participationRole=gatingReview\n"),
  );
  writeFile(
    root,
    `planning/archive/project/Project_Intake/PROJECT_INTAKE_${suffix}.json`,
    JSON.stringify(
      {
        artifactType: "project-intake",
        artifactRevision: 1,
        participationRole: "gatingReview",
        projectName: "Archived Intake",
        documentDisposition: { status },
      },
      null,
      2,
    ),
  );
}

test("empty repository resolves to Project Intake pre-intake state", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-empty-resolver-"));

  assert.deepEqual(resolveFirstNonApprovedDocument(root), {
    status: "pre-intake",
    activeWorkspaceId: "project-intake-capture",
    message: "Project Intake has not been captured",
    totalDocumentCount: 0,
    reason: "The active repository does not contain canonical Project Intake evidence. Capture Project Intake to begin the lifecycle.",
  });
  assert.equal(fs.existsSync(path.join(root, "planning")), false);
});

test("Project Intake is first when pending", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP.md", markdown("Roadmap"));
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake"));

  assert.equal(current(root).markdownPath, "planning/project/Project_Intake/PROJECT_INTAKE.md");
  assert.equal(current(root).owningWorkspaceId, "project-intake-capture");
});

test("missing disposition behaves as Pending", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", "# Intake\n");

  assert.equal(current(root).effectiveDisposition, "Pending");
});

test("approving Project Intake requires generated prompt before downstream evidence", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake"));
  writeFile(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP.md", markdown("Roadmap"));
  const intake = current(root);

  setDocumentDisposition(root, intake.logicalDocumentId, "Approved");

  assert.equal(resolveFirstNonApprovedDocument(root).status, "project-intake-incomplete");
});

test("Rejected remains current", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake", "Rejected"));
  writeFile(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP.md", markdown("Roadmap"));

  assert.equal(current(root).effectiveDisposition, "Rejected");
  assert.equal(current(root).markdownPath, "planning/project/Project_Intake/PROJECT_INTAKE.md");
});

test("RevisionRequested remains current", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake", "RevisionRequested"));
  writeFile(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP.md", markdown("Roadmap"));

  assert.equal(current(root).effectiveDisposition, "RevisionRequested");
  assert.equal(current(root).markdownPath, "planning/project/Project_Intake/PROJECT_INTAKE.md");
});

test("Phase Planning precedes Work Card Plan", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-01/Work_Card_Plan.md", markdown("Work Card Plan"));
  writeFile(root, "planning/phases/phase-01/Phase_Planning.md", markdown("Phase Planning"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Phase_Planning.md");
});

test("Phase 01 Work Card precedes Phase 02 Phase Planning", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Phase 02"));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_base.md", markdown("Phase 01 Work Card"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Work_Cards/WC01_base.md");
});

test("Phase 01 Operator Validation precedes Phase 02 Phase Planning", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Phase 02"));
  writeFile(root, "planning/phases/phase-01/Validation_Reports/VALIDATION_REPORT_WC01.md", markdown("Validation"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Validation_Reports/VALIDATION_REPORT_WC01.md");
});

test("Phase 01 Phase Closeout precedes Phase 02 Phase Planning", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Phase 02"));
  writeFile(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md", markdown("Closeout"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md");
});

test("Phase 02 Phase Planning becomes current only after every Phase 01 document is Approved", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-01/Phase_Planning.md", markdown("Phase 01 planning", "Approved"));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_base.md", markdown("Phase 01 Work Card", "Approved"));
  writeFile(root, "planning/phases/phase-01/Validation_Reports/VALIDATION_REPORT_WC01.md", markdown("Validation", "Approved"));
  writeFile(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md", markdown("Closeout", "Approved", "closureDecision=Close"));
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Phase 02"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-02/Phase_Planning.md");
});

test("numbered phases sort numerically", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-10/Phase_Planning.md", markdown("Phase 10"));
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Phase 02"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-02/Phase_Planning.md");
});

test("base Work Card precedes repairs", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01_fix.md", markdown("Repair"));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_base.md", markdown("Base"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Work_Cards/WC01_base.md");
});

test("repair numbers sort numerically", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01-REPAIR10_fix.md", markdown("Repair 10"));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01-REPAIR02_fix.md", markdown("Repair 02"));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_base.md", markdown("Base", "Approved"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Work_Cards/WC01-REPAIR02_fix.md");
});

test("implementation and validation evidence follows its Work Card", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_base.md", markdown("Base", "Approved"));
  writeFile(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01.md", markdown("Report"));
  writeFile(root, "planning/phases/phase-01/Validation_Reports/VALIDATION_REPORT_WC01.md", markdown("Validation"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01.md");
});

test("closeout follows validation evidence", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-01/Validation_Reports/VALIDATION_REPORT_WC01.md", markdown("Validation", "Approved"));
  writeFile(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md", markdown("Closeout"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md");
});

test("archives remain ordered and visible but do not block current lifecycle projection", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_base.md", markdown("Base", "Approved"));
  writeFile(root, "planning/archive/phases/phase-01/Work_Cards/WC01_archived.md", markdown("Archived"));

  const orderedPaths = orderPlanningDocuments(listPlanningDocuments(root)).map(
    (document) => document.markdownPath,
  );

  assert.equal(orderedPaths.includes("planning/archive/phases/phase-01/Work_Cards/WC01_archived.md"), true);
  assert.equal(allApproved(root).status, "all-approved");
});

test("unparseable records remain visible", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/not-a-number/Work_Cards/UNPARSEABLE.md", markdown("Unparseable"));

  assert.equal(current(root).markdownPath, "planning/phases/not-a-number/Work_Cards/UNPARSEABLE.md");
});

test("malformed later records do not preempt earlier pending records", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake"));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_broken.json", "{ broken\n");

  assert.equal(current(root).markdownPath, "planning/project/Project_Intake/PROJECT_INTAKE.md");
});

test("read-error document is selected when its normal order position is current", (t) => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_broken.md", markdown("Broken"));
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Phase 02"));
  withServiceHooks(t, {
    failRead: (relativePath) =>
      relativePath === "planning/phases/phase-01/Work_Cards/WC01_broken.md"
        ? "Injected local read failure."
        : undefined,
  });

  const selected = current(root);

  assert.equal(selected.markdownPath, "planning/phases/phase-01/Work_Cards/WC01_broken.md");
  assert.equal(selected.effectiveDisposition, "Pending");
});

test("later read-error document does not preempt earlier readable Pending document", (t) => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_readable.md", markdown("Readable"));
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Broken"));
  withServiceHooks(t, {
    failRead: (relativePath) =>
      relativePath === "planning/phases/phase-02/Phase_Planning.md"
        ? "Injected local read failure."
        : undefined,
  });

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Work_Cards/WC01_readable.md");
});

test("refresh reflects external status changes", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);

  assert.equal(allApproved(root).message, "All planning documents approved");
  fs.writeFileSync(
    path.join(root, "planning/project/Project_Intake/PROJECT_INTAKE.md"),
    markdown("Intake", "Rejected"),
    "utf8",
  );

  assert.equal(current(root).effectiveDisposition, "Rejected");
});

test("restart derives the same current document without route persistence", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake"));

  assert.deepEqual(resolveFirstNonApprovedDocument(root), resolveFirstNonApprovedDocument(root));
});

test("all-approved returns the terminal informational state", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);

  assert.deepEqual(allApproved(root), {
    status: "all-approved",
    message: "All planning documents approved",
    totalDocumentCount: 3,
    reason: "All gating lifecycle documents are Approved or semantically complete; non-review handoffs, context-only records, and historical records do not block progression.",
  });
});

test("old governance approval maintenance role route Registry or hash input does not influence result", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/project/Project_Intake/PROJECT_INTAKE.json",
    JSON.stringify(
      {
        approval: "Approved",
        routeToken: "continue",
        role: "Operator",
        registryStatus: "Approved",
        targetHash: "approved",
        maintenance: "complete",
      },
      null,
      2,
    ),
  );

  assert.equal(current(root).effectiveDisposition, "Pending");
});

test("Approved Intake and Approved prompt wait for missing Architect Interview output", () => {
  const root = createWorkspace();
  writeApprovedProjectIntake(root);
  writeApprovedArchitectPrompt(root);

  const result = resolveFirstNonApprovedDocument(root);

  assert.equal(result.status, "waiting-for-architect-interview");
  assert.equal(result.activeWorkspaceId, "architect-interview");
  assert.equal(result.message, "Waiting for Project Architect Interview output");
  assert.deepEqual(result.expectedOutputPaths, {
    markdown: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md",
    json: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.json",
  });
});

test("Approved Intake missing prompt takes precedence over later Pending Project Roadmap", () => {
  const root = createWorkspace();
  writeApprovedProjectIntake(root);
  writePendingProjectRoadmap(root);

  const result = resolveFirstNonApprovedDocument(root);

  assert.equal(result.status, "project-intake-incomplete");
});

test("Approved Intake missing prompt takes precedence over later Pending Phase Planning", () => {
  const root = createWorkspace();
  writeApprovedProjectIntake(root);
  writePendingPhasePlanning(root);

  const result = resolveFirstNonApprovedDocument(root);

  assert.equal(result.status, "project-intake-incomplete");
});

test("Approved Intake missing required prompt produces incomplete state", () => {
  const root = createWorkspace();
  writeApprovedProjectIntake(root);

  const result = resolveFirstNonApprovedDocument(root);

  assert.equal(result.status, "project-intake-incomplete");
  assert.notEqual(result.status, "all-approved");
  assert.match(result.reason, /Project Architect Interview Prompt/);
});

test("multiple Project Intake families project conflict before later Project evidence", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE_one.md", markdown("One", "Approved"));
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE_two.md", markdown("Two", "Pending"));
  writePendingProjectRoadmap(root);

  const result = resolveFirstNonApprovedDocument(root);

  assert.equal(result.status, "project-intake-conflict");
  assert.equal(result.activeWorkspaceId, "project-intake-capture");
  assert.match(result.reason, /PROJECT_INTAKE_one/);
  assert.match(result.reason, /PROJECT_INTAKE_two/);
});

test("archive-only Project Intake resolves to pre-intake", () => {
  const root = createWorkspace();
  writeArchivedProjectIntake(root, "Approved");

  const result = resolveFirstNonApprovedDocument(root);

  assert.equal(result.status, "pre-intake");
});

test("active singleton plus archived Intake does not project conflict", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE_current.md", markdown("Current", "Pending"));
  writeArchivedProjectIntake(root, "Approved");

  const result = resolveFirstNonApprovedDocument(root);

  assert.equal(result.status, "current");
  assert.equal(result.document.markdownPath, "planning/project/Project_Intake/PROJECT_INTAKE_current.md");
  assert.notEqual(result.status, "project-intake-conflict");
});

test("archived Intake cannot preempt later valid active lifecycle evidence", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writeArchivedProjectIntake(root, "Pending");
  writePendingProjectRoadmap(root);

  const result = resolveFirstNonApprovedDocument(root);

  assert.equal(result.status, "current");
  assert.equal(result.document.markdownPath, "planning/project/Project_Roadmap/PROJECT_ROADMAP.md");
});

test("true conflict between two active Intakes remains a conflict when archived Intake exists", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE_one.md", markdown("One", "Approved"));
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE_two.md", markdown("Two", "Pending"));
  writeArchivedProjectIntake(root, "Approved");

  const result = resolveFirstNonApprovedDocument(root);

  assert.equal(result.status, "project-intake-conflict");
  assert.deepEqual(result.sourceEvidence, [
    "planning/project/Project_Intake/PROJECT_INTAKE_one.md",
    "planning/project/Project_Intake/PROJECT_INTAKE_two.md",
  ]);
});

test("multiple Project Intake families project conflict before later Phase evidence", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE_one.md", markdown("One", "Approved"));
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE_two.md", markdown("Two", "Pending"));
  writePendingPhasePlanning(root);

  const result = resolveFirstNonApprovedDocument(root);
  const model = getCurrentWorkspaceModel(root);

  assert.equal(result.status, "project-intake-conflict");
  assert.equal(model.activeWorkspaceId, "project-intake-capture");
  assert.equal(model.currentTarget, "Project Intake conflict");
  assert.match(model.requiredAction, /Resolve multiple canonical Project Intake documents/);
});

test("Approved prompt with missing Interview takes precedence over later Pending Project Roadmap", () => {
  const root = createWorkspace();
  writeApprovedProjectIntake(root);
  writeApprovedArchitectPrompt(root);
  writePendingProjectRoadmap(root);

  const result = resolveFirstNonApprovedDocument(root);

  assert.equal(result.status, "waiting-for-architect-interview");
});

test("Approved prompt with missing Interview takes precedence over later Pending Phase Planning", () => {
  const root = createWorkspace();
  writeApprovedProjectIntake(root);
  writeApprovedArchitectPrompt(root);
  writePendingPhasePlanning(root);

  const result = resolveFirstNonApprovedDocument(root);

  assert.equal(result.status, "waiting-for-architect-interview");
});

test("Pending canonical Architect Interview becomes current review document", () => {
  const root = createWorkspace();
  writeApprovedProjectIntake(root);
  writeApprovedArchitectPrompt(root);
  writeArchitectInterview(root, "Pending");

  const resolved = current(root);

  assert.equal(resolved.owningWorkspaceId, "architect-interview");
  assert.equal(resolved.artifactType, "project-architect-interview");
  assert.equal(resolved.effectiveDisposition, "Pending");
});

test("Pending canonical Architect Interview takes precedence after continuation yields", () => {
  const root = createWorkspace();
  writeApprovedProjectIntake(root);
  writeApprovedArchitectPrompt(root);
  writeArchitectInterview(root, "Pending");
  writePendingProjectRoadmap(root);

  const resolved = current(root);

  assert.equal(resolved.owningWorkspaceId, "architect-interview");
  assert.equal(resolved.artifactType, "project-architect-interview");
  assert.equal(resolved.effectiveDisposition, "Pending");
});

test("Approved Architect Interview permits normal downstream resolution", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writePendingProjectRoadmap(root);

  assert.equal(current(root).markdownPath, "planning/project/Project_Roadmap/PROJECT_ROADMAP.md");
});

test("Approved Architect Interview permits later Pending Phase Planning to become current", () => {
  const root = createWorkspace();
  writeCompleteProjectIntakeSequence(root);
  writePendingPhasePlanning(root);

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Phase_Planning.md");
});

test("Project Intake submission current model projects Pending Intake review state", () => {
  const root = createWorkspace();
  submitProjectIntake({
    projectName: "Resolver Submission",
    projectPurpose: "Create a pending review projection.",
    desiredOutcome: "Current model waits for explicit Operator approval.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  });

  const model = getCurrentWorkspaceModel(root);

  assert.equal(model.activeWorkspaceId, "project-intake-capture");
  assert.equal(model.currentTarget, "PROJECT_INTAKE_resolver_submission");
  assert.match(model.requiredAction, /project-intake evidence is Pending/);
});
