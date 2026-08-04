<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC44-REPAIR03",
    "repairId": "WC44-REPAIR03",
    "parentWorkCardId": "WC44"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44_local_codex_cli_implementer_execution.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR02_advisory_review_and_operator_validation_workspace.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR02_advisory_review_and_operator_validation_workspace.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Review & Validation Workspace Layout and Document Viewer",
    "status": "approved_for_implementation",
    "executionMode": "one bounded Review & Validation UI repair",
    "parentWorkCardId": "WC44",
    "revisionReason": "Revision 2 replaces the initial non-compliant draft with a card based on review of WC44-REPAIR02, its Implementer Report, and the Review & Validation production path.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR03_review_validation_workspace_layout_and_document_viewer.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair Review & Validation visual and interaction defects after full review of WC44-REPAIR02 and its implementation path. Preserve WC44-REPAIR02 authority: Architect review is advisory; Operator validation creates the lifecycle authority.",
    "reviewedAt": "2026-08-03"
  }
}
CHAMPCITY-METADATA -->

# WC44-REPAIR03 — Review & Validation Workspace Layout and Document Viewer

Status: Approved for Implementer execution  
Parent: `WC44`  
Revision: 2 — replaces the initial noncompliant draft  
Git mutation: prohibited

## Verified Repository Evidence

This revision is based on review of:

- `WC44-REPAIR02_advisory_review_and_operator_validation_workspace.md` revision 1;
- `IMPLEMENTER_REPORT_WC44-REPAIR02_advisory_review_and_operator_validation_workspace.md` revision 1;
- `WorkCardReportReviewWorkspace.tsx`;
- `App.tsx` Review & Validation routing and embedded-browser attachment behavior;
- `currentWorkflowService.ts` current workflow and disposition routing;
- `workCardValidationService.ts` validation-record creation and Operator decision persistence;
- `workCardRepairService.ts` post-validation repair authority;
- shared workspace contracts, document classification, nested rail, and renderer CSS;
- Review & Validation screenshots supplied by the Operator from the running app.

Confirmed WC44-REPAIR02 behavior:

```text
Fresh Pending Implementer Report
→ work-card-report-review / Review & Validation
→ left pane shows Work Card/report information and Operator controls
→ right pane embeds ChatGPT advisory Architect review
→ Operator creates Validation Record as lifecycle authority
```

Confirmed implementation defects from source and running UI:

1. The top current-workflow context panel consumes excessive vertical space and repeats low-value information already available in the workspace body.
2. The left pane begins with a large Approved Work Card summary. It displays mostly static path/revision metadata and pushes the document viewer and Operator controls below the fold.
3. The `Approved Work Card` and `Implementer Report` controls are visually presented as document tabs, but in the running app they do not produce an obvious in-pane document-view transition. The useful document viewer is effectively hidden or displaced.
4. Pane boundaries are malformed. The left workspace and right embedded ChatGPT pane do not read as a clean, shared dual-pane review surface.
5. The Operator decision path is not prominent enough. The screen should lead with the report, advisory review, and validation decision, not with a large metadata card.

Confirmed preserved architecture:

- `work-card-building-review` remains the Implementer Build / Codex execution workspace.
- `work-card-report-review` remains the combined Review & Validation workspace.
- ChatGPT / Architect review is advisory only.
- Operator decision is lifecycle authority.
- Validation Record is durable pass-or-repair evidence.
- Implementer Report is implementation evidence, not approval authority.
- Repair creation from RevisionRequested Validation Record remains the existing post-validation repair path.

## Objective

Make Review & Validation usable at normal desktop width by replacing the oversized stacked metadata layout with a compact dual-pane review layout:

```text
left pane: compact evidence strip + visible document tabs + in-workspace document viewer + Operator decision controls
right pane: embedded ChatGPT advisory Architect review
```

The Operator must be able to see the Implementer Report, advisory ChatGPT surface, and validation decision controls without hunting below the fold.

## Runtime Sequence

```text
Fresh Pending Implementer Report and Approved Formal Work Card
→ Operator opens Review & Validation
→ app suppresses the oversized global workflow context panel for this workspace
→ left pane shows compact evidence strip and visible document tabs
→ Implementer Report is selected by default and rendered in the same left pane
→ selecting Approved Work Card renders that Markdown in the same left pane
→ right pane attaches embedded ChatGPT for advisory Architect review
→ Operator chooses Validate Passed or Request Repair
→ app creates or updates the Validation Record as Approved or RevisionRequested
→ downstream workflow follows the Validation Record authority
```

Failure path:

```text
missing document, unreadable report, stale evidence, failed document load, or browser attachment failure
→ show inline error in Review & Validation
→ do not create or modify a Validation Record
→ do not mutate Implementer Report disposition
→ keep Operator on Review & Validation with actionable error text
```

## Required Changes

### 1. Remove the oversized top context panel for Review & Validation

For `activeWorkspaceId === "work-card-report-review"`, do not render the full global current-workflow context panel shown in the screenshots.

Replace it with either no top panel or a compact single-line workspace status bar. If shown, the compact status must be limited to:

```text
Review & Validation | <workCardId> | report: Pending/fresh/readable
```

Do not repeat the full Current Required Workflow Step, Current Target, Eligibility, Required Action, Expected Output, Next State, and multi-line Evidence blocks in this workspace.

This is workspace-specific. Do not remove useful context panels from unrelated workspaces.

### 2. Replace the oversized Approved Work Card summary with a compact evidence strip

The left pane must begin with a compact evidence strip, not a full card that consumes most of the viewport.

The strip must fit on one or two rows at normal desktop width and show only:

```text
Work Card: <id> — <title>
Report: <filename or compact path> | revision <n> | Pending | fresh/readable
Authority: Architect review advisory; Operator decision creates validation authority.
```

Long paths must be truncated, copyable, or shown in small wrapped text. Do not allocate a large vertical card to path metadata.

### 3. Make document selection functional and visible

The `Approved Work Card` and `Implementer Report` controls must be actual tabs in the left pane.

Required behavior:

- `Implementer Report` is selected by default.
- Clicking `Approved Work Card` loads and displays the Approved Formal Work Card Markdown in the visible document viewer.
- Clicking `Implementer Report` loads and displays the current Implementer Report Markdown in the same visible document viewer.
- The selected tab has visible selected styling.
- Missing or disabled documents show an inline error instead of silently doing nothing.
- The document viewer remains visible inside the left pane and is not pushed below unrelated metadata.

The viewer must include:

```text
selected document label
repository-relative path
read/freshness status
scrollable Markdown body
```

Raw Markdown in a `pre` block is acceptable for this repair; rich Markdown rendering is not required.

### 4. Preserve embedded ChatGPT as the right pane

The right pane remains embedded ChatGPT advisory review.

It must:

- occupy the full right side of the Review & Validation workspace;
- use the same established embedded-browser attachment and resize behavior as other Architect workspaces;
- not be squeezed by hidden overflow or malformed pane boundaries;
- show local browser attachment errors inline when attachment fails;
- remain advisory only.

Do not create another browser service, ChatGPT automation layer, or prompt-persistence artifact.

### 5. Keep Operator decision controls visible and authoritative

The left pane must keep Operator decision controls visible below or beside the document viewer without requiring excessive scrolling.

Controls must remain:

```text
Advisory summary / notes
Operator validation notes
Validate Passed
Request Repair
Bounded repair defect, required only for Request Repair
```

Rules:

- Validate Passed creates or updates an Approved Validation Record.
- Request Repair creates or updates a RevisionRequested Validation Record with bounded defect evidence.
- Implementer Report disposition remains unchanged.
- ChatGPT advisory output is not parsed or applied as authority.
- Operator decision remains the only lifecycle transition.

### 6. Preserve downstream authority

Do not change the underlying WC44-REPAIR02 validation authority unless a small wiring correction is necessary to keep the UI functional.

Preserve:

- current Validation Record source revisions to Approved Formal Work Card and current Implementer Report;
- duplicate final-decision prevention for the same report revision;
- Repair creation from RevisionRequested Validation Record;
- Approved Validation Record allowing close/next behavior;
- no Implementer Report disposition authority in the normal path.

## Preserved Behavior

Preserve unchanged:

- SDK-primary Codex integration;
- Codex Build workspace;
- local Codex authentication boundary;
- no API-key path;
- no raw CLI primary execution;
- no arbitrary command runner;
- advisory-only ChatGPT review;
- Operator-only validation authority;
- Validation Record as durable authority;
- Implementer Report as evidence only;
- post-validation repair path;
- no Git operation.

## Authorized Surface

```text
src/renderer/app/App.tsx
src/renderer/app/WorkCardReportReviewWorkspace.tsx
src/renderer/styles.css
src/shared/workspaces/projectRailPresentation.ts
test/renderer/work-card-report-review-workspace.test.cjs
test/renderer/document-review-surface-source.test.cjs
test/app-shell/app-shell.test.cjs
test/workflow/current-execution-context.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR03_review_validation_workspace_layout_and_document_viewer.md
```

A narrowly necessary adjacent renderer helper may be changed if required to make document selection and embedded-browser sizing work. Any adjacent change must be documented and tested.

No main-process lifecycle authority, validation persistence, Codex execution, package dependency, schema, IPC, preload, or repair service change is expected. If the Implementer finds one is necessary, it must be narrowly justified in the report and tested through the production path.

## Risks and Constraints

This is a UI and interaction repair, not an authority redesign. Do not reopen WC44-REPAIR02's validation decision model.

Automated tests can prove source wiring, rendered markup, tab behavior, and absence of placeholder/generic surfaces. They cannot prove real desktop pane readability. Operator visual validation remains required.

## Acceptance Criteria

1. Review & Validation no longer renders the full global current-workflow context panel shown in the screenshots.
2. A compact workspace status or evidence strip identifies the Work Card, report, freshness/read status, and advisory/operator authority boundary without consuming the viewport.
3. The Approved Work Card summary no longer appears as a large vertical metadata card.
4. Implementer Report is selected by default when Review & Validation opens and its Markdown body is visible in the left pane.
5. Clicking Approved Work Card displays the Approved Work Card Markdown in the same in-pane viewer.
6. Clicking Implementer Report returns to the Implementer Report Markdown in the same in-pane viewer.
7. The selected document tab is visibly selected, and missing/unreadable documents show inline errors.
8. The document viewer remains within the left pane and has its own scrollable body.
9. The embedded ChatGPT pane occupies the full right pane and uses the established embedded-browser resize/attachment behavior.
10. Operator decision controls remain visible and continue to create Approved or RevisionRequested Validation Records only through Operator action.
11. ChatGPT advisory output cannot apply disposition, create validation records, create repair cards, or mutate report disposition.
12. Implementer Report disposition remains unchanged by Validate Passed and Request Repair flows.
13. Downstream Approved Validation Record and RevisionRequested Validation Record behavior remains unchanged.
14. No Codex Build, SDK, credential, or command-execution behavior changes.
15. Positive and negative proof includes rendered component tests for document-tab switching, compact layout content, absence of the large summary/top panel, and presence of Operator decision controls.
16. Typecheck, TypeScript build, Vite build, focused tests, and complete Node test lane pass in the approved normal Windows environment.
17. No Git operation occurs.

## Negative Constraints

Do not:

- change Codex execution;
- change the SDK dependency or local-auth boundary;
- restore Implementer Report disposition as normal authority;
- make ChatGPT advisory output authoritative;
- create a durable Architect advisory artifact;
- add a new browser service;
- add a new workspace ID;
- add package dependencies;
- change validation source-revision semantics;
- change repair-card creation authority;
- alter unrelated workspaces;
- perform Git operations.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/
IMPLEMENTER_REPORT_WC44-REPAIR03_review_validation_workspace_layout_and_document_viewer.md
```

The report must map every acceptance criterion to concrete proof and include:

- all changed files;
- exact layout changes;
- document tab and viewer behavior proof;
- evidence that the top context panel and oversized summary are absent for Review & Validation;
- embedded-browser pane preservation proof;
- Operator decision control preservation proof;
- validation authority preservation proof;
- commands and results;
- Operator validation remaining;
- scope expansion and residual risks.

## Manual Validation

After Architect approval, the Operator must validate in the running app:

1. Open Review & Validation at normal desktop width.
2. Confirm the top global context panel no longer wastes vertical space.
3. Confirm the left pane shows compact evidence, visible document tabs, a visible document viewer, and Operator controls.
4. Confirm Implementer Report is selected and visible by default.
5. Click Approved Work Card and confirm its Markdown appears in the same left-pane viewer.
6. Click Implementer Report and confirm its Markdown reappears.
7. Confirm embedded ChatGPT fills the right pane and remains readable.
8. Confirm Validate Passed and Request Repair still create the correct Validation Record authority.
