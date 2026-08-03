<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC43-REPAIR01A",
    "repairId": "WC43-REPAIR01A",
    "parentWorkCardId": "WC43"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC42_work_card_plan_structured_review_and_architect_ui_consistency.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC42_work_card_plan_structured_review_and_architect_ui_consistency.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC43_work_card_intake_workspace_and_transition.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43_work_card_intake_workspace_and_transition.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Single-Output Review Activation",
    "status": "approved_for_implementation",
    "executionMode": "one bounded renderer-state repair",
    "dependsOn": [],
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR01A_single_output_review_activation.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Mark an exact current single-output Architect revision viewed when that readable revision is actually displayed. Preserve bundle per-slot viewing and every review semantic.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# WC43-REPAIR01A — Single-Output Review Activation

Status: Approved for Implementer execution  
Parent: `WC43`  
Git mutation: prohibited

## Verified Repository Evidence

Operator validation reached a Pending Formal Work Card in `work-card-planning`. The document was readable and visible, but `Apply Review` remained disabled with `Open every current output revision before approval.`

The production path is:

```text
architect output workspace refresh
→ select the only Formal Work Card slot
→ load its canonical Markdown detail
→ render the document
→ ArchitectOutputReviewShell evaluates viewed revision keys
→ reviewArchitectOutput persists the disposition
```

WC42 removed the redundant one-item slot selector. That selector was also the only production path calling `onViewedRevision`. Automatic selection and successful document display do not register the revision as viewed. A single-output workspace therefore cannot satisfy its approval gate.

The confirmed defect is renderer state coordination. No backend, IPC, preload, persistence, metadata, review-service, or document defect was found.

## Objective

When the exact current readable revision for a single-output Architect workspace is displayed, register that revision as viewed so the existing disposition controls can operate.

Preserve explicit per-member viewing for atomic bundles.

## Runtime Sequence

```text
current ArchitectOutputWorkspaceModel with one output slot
→ renderer selects and reads that slot's exact logical document
→ successful readable detail matches current slot path and artifact revision
→ renderer records that exact revision key as viewed
→ existing review gate evaluates status and notes normally
→ Operator can apply the existing review disposition
```

## Required Changes

1. Add one production state-coordination function that receives the current Architect-output model, the successfully displayed `PlanningDocumentDetail`, and current viewed keys.
2. Add the current slot revision key only when all are true:
   - the model has exactly one slot;
   - the slot has a logical document ID and artifact revision;
   - the displayed detail has no read error and is readable;
   - displayed logical ID, path, and artifact revision match the current slot.
3. Call that function after the real `readDocument` result is accepted for display. Do not mark a revision merely because a model or path exists.
4. Keep fingerprint-change reset behavior. A new revision must require the new readable detail to be displayed before approval.
5. Do not restore a one-item selector.

## Preserved Behavior

Preserve unchanged:

- `reviewArchitectOutput` IPC/preload and main-process review behavior;
- `canApplyDisposition` and allowed statuses;
- `RevisionRequested` non-empty notes requirement;
- atomic-bundle requirement that every current member revision be viewed;
- slot selection and viewed tracking for Project Planning and Phase Planning bundles;
- document loading, promotion, polling, paths, metadata, and canonical writes;
- WC42 button and review-panel presentation;
- Work Card Intake and Formal Work Card generation.

## Authorized Surface

```text
src/renderer/app/App.tsx
src/renderer/app/architectOutputWorkspaceRefresh.ts
test/renderer/architect-output-workspace-source.test.cjs
test/renderer/architect-interview-refresh-state.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR01A_single_output_review_activation.md
```

One adjacent renderer test file may be added when needed to exercise the production state function. Any adjacent change must be directly necessary, documented, and tested.

## Risks and Constraints

Do not weaken the review gate by treating model discovery, auto-selection, or a failed read as proof of viewing. The proof event is successful display of the exact current readable revision.

## Acceptance Criteria

1. A Pending Formal Work Card with one current readable slot becomes review-eligible after that exact revision is displayed and a disposition is selected.
2. The production `readDocument`/display path invokes the same state function exercised by tests.
3. A read error, wrong logical ID, wrong path, stale revision, or missing revision does not mark the output viewed.
4. When the artifact revision changes, prior viewed state is cleared and the new revision must be displayed.
5. A two-slot bundle remains ineligible until both exact current revisions are displayed.
6. No one-item selector is restored.
7. Review persistence, status values, notes rules, and main-process behavior remain unchanged.
8. Tests cover positive single-output display, mismatched detail, failed read, revision replacement, and unchanged bundle behavior through production state logic. Source-string assertions are supplemental only.
9. Typecheck, TypeScript build, Vite build, focused tests, and the complete Node test lane pass in the approved normal Windows environment.
10. No Git operation occurs.

## Negative Constraints

Do not:

- bypass `canApplyDisposition`;
- mark all revisions viewed on workspace refresh;
- mark a document viewed before a successful read;
- remove bundle viewing requirements;
- add backend state, marker files, persistence, route tokens, or compatibility wrappers;
- change unrelated workspaces;
- perform Git operations.

## Implementer Report Requirements

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR01A_single_output_review_activation.md
```

Map every acceptance criterion to concrete proof. Report changed files, any necessary adjacent file, production path exercised, positive and negative test cases, commands and results, Operator validation remaining, scope expansion, residual risk, and confirmation that no review authority or persistence behavior changed.

## Manual Validation

Operator validation must open a Pending Formal Work Card, confirm the document is readable, select `Approve`, and apply review without an impossible viewing message. A bundle must still require opening each member.
