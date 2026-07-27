const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildArchitectInterviewEvidenceFingerprint,
  buildArchitectInterviewReviewSourceKey,
  getArchitectInterviewReviewRegionState,
  hydrateArchitectInterviewReviewEditState,
} = require("../../dist/shared/architectInterview/architectInterviewRefreshState.js");

function model(overrides = {}) {
  const interviewDocument = overrides.interviewDocument === null
    ? undefined
    : {
        logicalDocumentId: "interview-id",
        markdownPath: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.md",
        artifactRevision: overrides.artifactRevision ?? 1,
        disposition: overrides.disposition ?? "Pending",
        documentReadState: overrides.documentReadState ?? "readable",
        freshnessState: overrides.freshnessState ?? "fresh",
        readError: overrides.readError,
        operatorReviewNotes: overrides.notes,
      };
  return {
    state: overrides.state ?? "ready-for-review",
    railStatus: overrides.railStatus ?? "Awaiting Approval",
    handoffState: "handoff-ready",
    promptDocument: {
      logicalDocumentId: "prompt-id",
      markdownPath: "planning/project/Project_Architect_Interview_Prompts/PROMPT.md",
      artifactRevision: 1,
      disposition: "Approved",
      documentReadState: "readable",
    },
    interviewDocument,
    selectedReviewDocumentRole: "interview",
    interviewDisposition: interviewDocument?.disposition,
    documentReadState: interviewDocument?.documentReadState ?? "missing",
    freshnessState: interviewDocument?.freshnessState ?? "fresh",
    canCopyHandoff: true,
    canApplyDisposition: overrides.canApplyDisposition ?? Boolean(interviewDocument),
    currentOperatorReviewNotes: overrides.notes,
    projectIntakeComplete: false,
    requiredAction: "Review output.",
    reason: overrides.reason ?? "Repository evidence controls Architect Interview status.",
    evidencePaths: [],
  };
}

test("Architect Interview evidence fingerprint changes on same logical ID revision and disposition", () => {
  const initial = buildArchitectInterviewEvidenceFingerprint("repo", model());
  const revised = buildArchitectInterviewEvidenceFingerprint("repo", model({ artifactRevision: 2 }));
  const dispositionChanged = buildArchitectInterviewEvidenceFingerprint("repo", model({ disposition: "RevisionRequested" }));

  assert.notEqual(initial, revised);
  assert.notEqual(initial, dispositionChanged);
});

test("review source key binds repository, logical ID, and artifact revision", () => {
  const sourceKey = buildArchitectInterviewReviewSourceKey("repo", model({ artifactRevision: 3 }));
  assert.match(sourceKey, /^repo::/);
  assert.notEqual(
    sourceKey,
    buildArchitectInterviewReviewSourceKey("repo", model({ artifactRevision: 4 })),
  );
  assert.equal(buildArchitectInterviewReviewSourceKey("repo", model({ canApplyDisposition: false })), null);
});

test("review source key changes on disposition and note-only evidence changes", () => {
  const initial = buildArchitectInterviewReviewSourceKey("repo", model());
  const dispositionChanged = buildArchitectInterviewReviewSourceKey("repo", model({ disposition: "RevisionRequested" }));
  const notesChanged = buildArchitectInterviewReviewSourceKey("repo", model({ notes: "Durable Operator notes." }));

  assert.notEqual(initial, dispositionChanged);
  assert.notEqual(initial, notesChanged);
});

test("review hydration preserves dirty same-revision edits and resets on new revision", () => {
  const dirty = {
    sourceToken: buildArchitectInterviewReviewSourceKey("repo", model({ artifactRevision: 1 })),
    selectedDisposition: "RevisionRequested",
    notes: "Operator draft notes.",
    isDirty: true,
  };

  assert.deepEqual(
    hydrateArchitectInterviewReviewEditState({
      current: dirty,
      model: model({ artifactRevision: 1 }),
      repositoryIdentity: "repo",
      selectedRole: "interview",
    }),
    dirty,
  );

  const hydrated = hydrateArchitectInterviewReviewEditState({
    current: dirty,
    model: model({ artifactRevision: 2, disposition: "Pending", notes: "" }),
    repositoryIdentity: "repo",
    selectedRole: "interview",
  });
  assert.match(hydrated.sourceToken, /^repo::/);
  assert.equal(hydrated.selectedDisposition, "");
  assert.equal(hydrated.notes, "");
  assert.equal(hydrated.isDirty, false);
});

test("Pending hydrates to no selected disposition while RevisionRequested restores notes", () => {
  const pending = hydrateArchitectInterviewReviewEditState({
    current: null,
    model: model({ disposition: "Pending" }),
    repositoryIdentity: "repo",
    selectedRole: "interview",
  });
  assert.equal(pending.selectedDisposition, "");

  const revisionRequested = hydrateArchitectInterviewReviewEditState({
    current: null,
    model: model({ disposition: "RevisionRequested", notes: "Clarify architecture." }),
    repositoryIdentity: "repo",
    selectedRole: "interview",
  });
  assert.equal(revisionRequested.selectedDisposition, "RevisionRequested");
  assert.equal(revisionRequested.notes, "Clarify architecture.");
});

test("review presentation hides controls for prompt or missing Interview and reports invalid output", () => {
  assert.equal(
    getArchitectInterviewReviewRegionState({ model: model(), selectedRole: "prompt" }).kind,
    "prompt-or-missing",
  );
  assert.equal(
    getArchitectInterviewReviewRegionState({ model: model({ interviewDocument: null }), selectedRole: "interview" }).kind,
    "prompt-or-missing",
  );
  const invalid = getArchitectInterviewReviewRegionState({
    model: model({ canApplyDisposition: false, reason: "Wrong artifact type." }),
    selectedRole: "interview",
  });
  assert.equal(invalid.kind, "invalid");
  assert.equal(invalid.canApplyReview, false);
  assert.match(invalid.diagnostics, /Wrong artifact type/);
  assert.equal(
    getArchitectInterviewReviewRegionState({ model: model(), selectedRole: "interview" }).kind,
    "valid",
  );
});
