<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC44-REPAIR04",
    "repairId": "WC44-REPAIR04",
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
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR03_review_validation_workspace_layout_and_document_viewer.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Operator Validation Decision Workspace Transition",
    "status": "approved_for_implementation",
    "executionMode": "one bounded renderer transition repair",
    "parentWorkCardId": "WC44",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR04_operator_validation_decision_workspace_transition.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair the post-validation renderer transition. Operator validation decisions are persisted correctly, and current workflow resolves the next workspace, but App.tsx refreshes state without moving the active workspace to work-card-close or work-card-repair.",
    "reviewedAt": "2026-08-03"
  }
}
CHAMPCITY-METADATA -->

# WC44-REPAIR04 — Operator Validation Decision Workspace Transition

Status: Approved for Implementer execution  
Parent: `WC44`  
Git mutation: prohibited

## Verified Repository Evidence

The reported running-app defect is:

```text
Operator completes validation of a Work Card in Review & Validation
→ repository state records the validation decision
→ application remains on the same screen instead of moving to the next workspace
```

The relevant production path was inspected before writing this card:

```text
WorkCardReportReviewWorkspace.tsx
→ App.tsx applyOperatorValidationDecision()
→ preload applyOperatorValidationDecisionForCurrentWorkCard()
→ main currentWorkflow:applyOperatorValidationDecision
→ currentWorkflowService.applyOperatorValidationDecisionForCurrentWorkCard()
→ workCardValidationService.applyOperatorValidationDecision()
→ canonical Validation Record write
→ currentWorkflowService.getCurrentWorkspaceModel()
→ App.tsx refreshCurrentModel(), resolveCurrentDocument(), and selected document refresh
```

Confirmed production behavior:

1. `workCardValidationService.applyOperatorValidationDecision()` creates or updates a Validation Record for the current Work Card/report revision.
2. `ValidatePassed` records the Validation Record with `Approved` disposition.
3. `RequestRepair` records the Validation Record with `RevisionRequested` disposition and requires repair defect text.
4. `currentWorkflowService` has resolver logic that recognizes a fresh Validation Record sourced to the same Implementer Report revision.
5. For `Approved` Validation Record, the resolver returns `activeWorkspaceId: "work-card-close"`.
6. For `RevisionRequested` Validation Record, the resolver returns `activeWorkspaceId: "work-card-repair"`.
7. `workspaceContracts.ts` registers `work-card-close`, `work-card-repair`, and `work-card-report-review` as visible/known workspaces.
8. Existing workflow tests assert the main resolver advances to `work-card-close` after `ValidatePassed`.

Confirmed defect:

`App.tsx` handles `applyOperatorValidationDecision()` by:

```text
call window.champcity.applyOperatorValidationDecisionForCurrentWorkCard(...)
→ set feedback
→ clear Operator/advisory/defect text
→ listDocuments()
→ applyDocumentInventory(nextDocuments)
→ refreshCurrentModel()
→ resolveCurrentDocument()
→ setResolverResult(nextResolverResult)
→ reload selectedDocumentId if present
```

It does **not** call `transitionToWorkflowStep()` with the refreshed current model. It also does **not** call `selectResolverResult()` with the post-decision resolver/current model. Therefore `activeWorkspaceId` remains `work-card-report-review` in renderer state even when the backend current model has advanced to `work-card-close` or `work-card-repair`.

The stale screen is therefore a renderer state-transition defect. It is not a validation-record persistence defect and not a missing workspace-registration defect.

## Objective

After an Operator validation decision is successfully persisted, the renderer must transition to the next workspace resolved by current repository evidence.

Expected runtime sequence:

```text
Operator selects Validate Passed or Request Repair
→ application persists the Validation Record
→ renderer refreshes documents and current workflow model
→ renderer transitions activeWorkspaceId to the refreshed model.activeWorkspaceId
→ renderer selects the relevant current document for that workspace when one exists
→ Operator sees Work Card Close after Validate Passed or Repair after Request Repair
```

## Runtime Sequence

### Validate Passed

```text
Review & Validation / fresh Pending Implementer Report
→ Operator selects Validate Passed
→ Approved Validation Record is written
→ current workflow resolves work-card-close
→ renderer transitions to work-card-close
→ selected document becomes the relevant Validation Record or close evidence when available
→ Operator-visible outcome: Close / Next Work Card workspace is active
```

### Request Repair

```text
Review & Validation / fresh Pending Implementer Report
→ Operator enters bounded defect and selects Request Repair
→ RevisionRequested Validation Record is written
→ current workflow resolves work-card-repair
→ renderer transitions to work-card-repair
→ selected document becomes the relevant validation evidence or repair document when available
→ Operator-visible outcome: Repair workspace is active and can create the repair handoff/card
```

### Failure

```text
validation decision fails, document refresh fails, current model refresh fails, or resolver refresh fails
→ show inline error
→ do not spoof a transition
→ do not create another Validation Record
→ do not mutate Implementer Report disposition
```

## Required Changes

### 1. Transition after successful Operator validation decision

Modify `App.tsx` `applyOperatorValidationDecision()` so that after a successful `window.champcity.applyOperatorValidationDecisionForCurrentWorkCard()` call it:

1. refreshes document inventory;
2. refreshes current workflow model;
3. resolves the current document;
4. transitions to the refreshed `nextModel.activeWorkspaceId` using the existing `transitionToWorkflowStep()` or equivalent existing renderer transition helper;
5. passes the refreshed document inventory, resolver result, and preferred document ID into that transition.

The transition target must come from the refreshed backend current model, not from the button that was clicked and not from hard-coded decision-to-workspace mapping.

Allowed pattern:

```text
const nextDocuments = await listDocuments()
applyDocumentInventory(nextDocuments)
const nextModel = await refreshCurrentModel()
const nextResolverResult = await resolveCurrentDocument()
setResolverResult(nextResolverResult)
if (nextModel) transitionToWorkflowStep(nextModel.activeWorkspaceId, { documents: nextDocuments, resolverResult: nextResolverResult, preferredDocumentId: preferredDocumentIdFromResolver(nextResolverResult, nextModel.activeWorkspaceId) })
```

Equivalent implementation is acceptable only if it uses existing transition/document-selection semantics and backend-resolved workspace authority.

### 2. Preserve validation authority

Do not change the validation persistence model.

Preserve:

- `applyOperatorValidationDecisionForCurrentWorkCard()` main-process route;
- `workCardValidationService.applyOperatorValidationDecision()`;
- Validation Record source revisions to Approved Formal Work Card and current Implementer Report;
- duplicate final-decision prevention for the same report revision;
- `ValidatePassed` as Approved Validation Record;
- `RequestRepair` as RevisionRequested Validation Record;
- Implementer Report disposition unchanged;
- ChatGPT advisory output non-authoritative.

### 3. Preserve backend workflow resolver

Do not replace backend resolver logic with renderer hard-coding.

Renderer must follow `getCurrentWorkspaceModel()` after the decision. It must not infer:

```text
ValidatePassed -> work-card-close
RequestRepair -> work-card-repair
```

inside UI code, except in tests as expected outcomes. The application authority remains repository evidence and current workflow resolution.

### 4. Document selection after transition

The post-decision transition must clear or replace stale selected-document state.

Rules:

- do not keep the previously selected Implementer Report selected if the next workspace does not own it;
- if the resolver returns a current document for the next workspace, select and load it;
- if the next workspace has no review document, clear `selectedDocumentId` and `selectedDocument`;
- do not show stale Review & Validation document content after transition;
- do not produce off-screen or invisible selected-document behavior.

### 5. Add production-path renderer proof

Add focused tests proving the renderer post-decision handler transitions rather than merely refreshing model state.

Minimum proof:

- a source/wiring test must fail if `applyOperatorValidationDecision()` does not call the existing transition helper or an equivalent transition after `refreshCurrentModel()`;
- a focused component/handler test, where practical, should simulate a successful validation decision and prove `activeWorkspaceId` changes to the backend-refreshed workspace;
- existing current-workflow tests must continue proving backend resolution to `work-card-close` and `work-card-repair`.

Do not rely only on service tests that call `getCurrentWorkspaceModel()` directly; the defect is in renderer state transition.

## Preserved Behavior

Preserve unchanged:

- Review & Validation layout and advisory browser behavior from `WC44-REPAIR02` / `WC44-REPAIR03`;
- Codex Build workspace;
- Codex SDK/auth boundaries;
- advisory-only Architect review;
- Operator-only validation authority;
- Validation Record as durable pass-or-repair authority;
- Implementer Report as evidence only;
- post-validation repair path;
- Work Card close/next behavior;
- no Git operation.

## Authorized Surface

```text
src/renderer/app/App.tsx
test/renderer/document-review-surface-source.test.cjs
test/renderer/work-card-report-review-workspace.test.cjs
test/app-shell/app-shell.test.cjs
test/workflow/current-execution-context.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR04_operator_validation_decision_workspace_transition.md
```

A narrowly necessary renderer test helper may be added under `test/renderer/` if needed to exercise the handler path. Any adjacent change must be justified in the Implementer Report.

No main-process lifecycle service, validation persistence service, schema, IPC, preload, workspace registry, package dependency, Codex service, or repair service change is expected.

## Risks and Constraints

This is a renderer transition repair. The backend already resolves the next workspace correctly in source and tests. Do not redesign the lifecycle, validation, repair, or close model.

The UI may be on a workspace that does not have a selected review document after transition. That is acceptable only when the next workspace legitimately has no current document; stale document content must not remain visible.

## Acceptance Criteria

1. After `ValidatePassed`, the repository contains an Approved Validation Record for the current Work Card/report revision.
2. After `ValidatePassed`, `getCurrentWorkspaceModel()` resolves `work-card-close` and the renderer transitions `activeWorkspaceId` to that backend-resolved workspace without app restart.
3. After `RequestRepair`, the repository contains a RevisionRequested Validation Record with the bounded defect text.
4. After `RequestRepair`, `getCurrentWorkspaceModel()` resolves `work-card-repair` and the renderer transitions `activeWorkspaceId` to that backend-resolved workspace without app restart.
5. The renderer transition target is derived from the refreshed current model, not hard-coded from the clicked decision.
6. Stale Review & Validation selected-document state is cleared or replaced when the next workspace does not own the prior document.
7. Implementer Report disposition remains unchanged by both decisions.
8. ChatGPT advisory output remains non-authoritative and is not parsed to decide transition.
9. Backend validation decision service and current workflow resolver behavior remain unchanged except for narrowly necessary test wiring.
10. Failed validation decision or failed refresh shows an inline error and does not spoof a workspace transition.
11. Automated tests include renderer-path proof that a successful validation decision invokes post-decision transition to the refreshed workspace.
12. Existing current-workflow tests continue proving `ValidatePassed` -> `work-card-close` and `RequestRepair` -> `work-card-repair` resolver outcomes.
13. Existing Review & Validation UI tests continue passing.
14. Typecheck, TypeScript build, Vite build, focused tests, and full Node test lane pass in the approved normal Windows environment.
15. No Git operation occurs.

## Negative Constraints

Do not:

- hard-code lifecycle transition authority in the renderer;
- change validation-record metadata or source revision semantics;
- change Implementer Report disposition;
- make Architect advisory output authoritative;
- create Validation Records from ChatGPT output;
- alter Codex execution;
- change main/preload IPC unless proven necessary;
- add dependencies;
- change unrelated workspaces;
- perform Git operations.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/
IMPLEMENTER_REPORT_WC44-REPAIR04_operator_validation_decision_workspace_transition.md
```

The report must map every acceptance criterion to concrete proof and include:

- all changed files;
- exact renderer transition code path;
- proof that next workspace is derived from refreshed backend current model;
- Validate Passed transition evidence;
- Request Repair transition evidence;
- stale document-selection cleanup evidence;
- failed decision/refresh behavior;
- commands and results;
- Operator validation remaining;
- scope expansion and residual risks.

## Manual Validation

After Architect approval, the Operator must validate in the running app:

1. Complete Review & Validation with `Validate Passed`.
2. Confirm the app moves to `Close / Next Work Card` without restart or manual rail click.
3. Repeat on a repair path with `Request Repair` and bounded defect text.
4. Confirm the app moves to `Work Card Repair` without restart or manual rail click.
5. Confirm no stale Implementer Report document remains selected in an unrelated workspace.
