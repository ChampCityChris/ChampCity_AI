<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC51"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC48_architect_interview_runtime_finalization_gate.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC35_phase_interview_workspace_and_draft_ingestion_cutover.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Phase Interview Conversational Finalization Gate",
    "status": "approved_for_implementation",
    "executionMode": "concise bounded workflow-hardening Work Card, not a repair pass",
    "confirmedDefect": "Phase Interview currently combines conversational clarification and executable draft write-back in one handoff. ChatGPT is therefore biased toward completing the Phase Interview artifact instead of conducting a focused evidence-driven interview.",
    "rootCause": "Phase Interview prepares the Architect draft submission during initial handoff generation and exposes the temporary draft path plus create_markdown_artifact in the same instruction that tells ChatGPT to interview the Operator. Project Architect Interview already corrected this same failure mode by separating conversation from finalization.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC51_phase_interview_conversational_finalization_gate.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Apply the proven Project Architect Interview conversation/finalization boundary to Phase Interview. Keep the Work Card and implementation tightly bounded; do not expand into unrelated workflow refactoring.",
    "reviewedAt": "2026-08-17"
  }
}
CHAMPCITY-METADATA -->

# WC51 — Phase Interview Conversational Finalization Gate

Status: Approved for Implementer execution  
Phase: `phase-08`  
Work Card type: concise bounded workflow hardening  
Git mutation: prohibited

## Confirmed Defect

Phase Interview currently exposes its write-back route before the interview is complete.

Verified source evidence:

```text
src/main/phaseInterview/phaseInterviewService.ts
- generatePhaseInterviewHandoff(...) immediately calls preparePhaseInterviewDraftSubmission(...).

src/main/phaseInterview/phaseInterviewDraftOutput.ts
- buildPhaseInterviewPreparedInstruction(...) combines:
  - conduct the Phase Interview;
  - produce the complete Phase Interview body;
  - temporary draft path;
  - artifact_toolbox.create_markdown_artifact.

src/main/architectInterview/architectInterviewDraftPilot.ts
- Project Architect Interview already separates conversational handoff from final draft handoff.

src/renderer/app/App.tsx
- separate Final Draft controls currently exist only for architect-interview.
```

The governing Phase Intake design also permits zero clarification questions when approved evidence already resolves the phase context.

## Objective

Apply the proven Project Architect Interview two-stage runtime boundary to Phase Interview:

```text
Phase Interview chat handoff
→ evidence review and only necessary Operator clarification
→ confirmation summary
→ STOP

explicit Operator finalization action
→ temporary draft path and create_markdown_artifact
→ existing canonical promotion and review flow
```

Do not use a target question count. Ask only material Operator-owned questions that remain unresolved after reviewing project evidence and applying normal Architect judgment. Zero questions is valid.

## Required Changes

1. Split Phase Interview into a conversational handoff and a separate finalization/write-back handoff.
2. Initial handoff generation must not prepare or expose the Architect draft submission.
3. Initial copied instruction must contain no temporary draft path, `create_markdown_artifact`, or write JSON.
4. Interview behavior must:
   - use approved evidence before asking questions;
   - ask one primary question at a time;
   - distinguish Operator-owned decisions from Architect-owned technical decisions;
   - make Architect recommendations instead of transferring technical design work to the Operator;
   - allow the no-questions path when evidence is sufficient;
   - present a concise phase-understanding summary and stop for Operator confirmation/correction before finalization.
5. Add explicit Phase Interview Final Draft prepare/copy actions using the existing Project Architect Interview pattern.
6. Finalization alone may prepare the draft submission and expose the temporary draft path and `artifact_toolbox.create_markdown_artifact` invocation.
7. The durable Phase Interview must record whether clarification was required and preserve material questions/answers when questions were asked.
8. `RevisionRequested` must use the same two-stage conversation/finalization boundary and include current Operator revision instructions.

## Preserved Behavior

Do not change:

- evidence-derived selected phase identity;
- Approved Profile/Roadmap/Phase Map prerequisites;
- dependency closeout handling;
- source revision freshness and downstream invalidation;
- MCP workspace binding authority;
- canonical draft promotion and cleanup;
- Phase Interview disposition rules;
- Phase Intake completion requirement for a current readable, fresh, Approved Phase Interview;
- Project Architect Interview behavior established by WC48.

## Authorized Surface

Changes may be made only where required across:

```text
src/main/phaseInterview/*
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
focused Phase Interview / Architect-output / renderer tests
```

Use the WC48 Project Architect Interview implementation as the preferred pattern. Do not create a new generalized interview framework unless required to complete this card safely.

## Acceptance Criteria

1. Initial Phase Interview handoff contains no draft path, `create_markdown_artifact`, or write JSON.
2. Initial handoff explicitly requires evidence-first clarification, one primary question at a time, Architect-owned recommendations, confirmation summary, and stop-before-write behavior.
3. No fixed or minimum question count remains; the no-questions path is explicit and valid.
4. Separate Phase Interview Final Draft prepare/copy actions exist and only that handoff contains the temporary draft path and write invocation.
5. Finalization still promotes a valid body-only draft to the canonical Pending `Phase_Interview`.
6. The final document records clarification-required status and material Q&A when applicable.
7. `RevisionRequested` follows the same two-stage gate and carries revision notes.
8. Existing freshness, disposition, selected-phase, MCP binding, and Phase Intake completion behavior remain green.
9. Project Architect Interview WC48 behavior remains green.
10. `npm run typecheck`, `npm run build`, and `npm test` pass.

## Negative Constraints

- No Phase Planning or Work Card generation.
- No changes to project/phase selection semantics.
- No provider API or DOM automation.
- No transcript parsing requirement.
- No broad Architect-output refactor.
- No unrelated cleanup or opportunistic repairs.
- No Git mutation.

Keep the implementation and Implementer Report concise and tightly bounded to this defect.

## Implementer Report Requirements

Report only:

- repository/branch verification;
- files changed;
- conversation/finalization split implemented;
- no-questions behavior;
- revision-path behavior;
- focused regression evidence;
- typecheck/build/test results;
- remaining Operator manual validation.

End with `Document.Status=Pending`.

## Manual Validation

Using `ChampCity_PDL` Phase 1:

1. Copy/send the initial Phase Interview handoff and confirm ChatGPT does not create a draft immediately.
2. Confirm it asks only genuinely unresolved Operator questions; zero questions is acceptable when evidence is sufficient.
3. Confirm it presents the phase summary and waits for Operator confirmation.
4. Use the separate Final Draft action and confirm only then does the copied instruction expose the temporary draft/write route.
5. Confirm MCP draft creation, canonical promotion, review, approval, and Phase Intake completion still function.
