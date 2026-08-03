<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC40-REPAIR01",
    "repairId": "WC40-REPAIR01",
    "parentWorkCardId": "WC40"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC40_simultaneous_seven_flow_architect_output_product_cutover.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40_simultaneous_seven_flow_architect_output_product_cutover.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC40_simultaneous_seven_flow_architect_output_product_cutover.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Copy, Operator Review, Readiness, Prompt Contract, and Current-Workflow Projection Repair",
    "status": "approved_for_implementation",
    "executionMode": "one bounded WC40 repair pass",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40-REPAIR01_copy_review_readiness_and_prompt_contract_repair.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair only mutation-free Copy, Operator-owned disposition integrity, exact prerequisite readiness, complete Formal/Repair prompt contracts, and shared Current Workflow projection while preserving the accepted seven-flow WC40 cutover.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# WC40-REPAIR01 — Copy, Operator Review, Readiness, Prompt Contract, and Current-Workflow Projection Repair

Status: Approved for Implementer execution  
Parent: `WC40`  
Git mutation: prohibited

## Objective

Complete the accepted WC40 product cutover through five bounded corrections:

```text
Copy reads the existing prepared prompt without mutation
Operator disposition remains generic and Operator-owned
Prepare is enabled only for the exact current eligible handoff
Formal and Repair prompts contain the complete contract their validators enforce
Current Workflow projects all seven Architect-output workspaces from the shared model
```

Temporary body-only output drafts remain staging files. They do not require approval. The one-pass workflow remains:

```text
Prepare standardized prompt
→ Copy prompt
→ Operator sends prompt to embedded ChatGPT
→ ChatGPT writes temporary body draft(s)
→ application promotes final Pending output(s)
→ Operator reviews the final output(s)
```

## Accepted WC40 Implementation to Preserve

Preserve:

- seven active definitions and nine slots;
- one production catalog, registry, and WC39 coordinator;
- four generic `architectOutput:*` IPC/preload operations;
- one generic renderer refresh, action bar, and review shell;
- Formal and Repair temporary-draft promotion;
- removal of workspace-specific IPC/preload families;
- removal of Formal/Repair direct-save and manual-import surfaces;
- existing browser security and non-Architect lifecycle behavior.

Do not redesign or reverse the cutover.

## 1. Make Copy Handoff Read-Only

`architectOutput:copyHandoff` must copy the already-prepared standardized instruction only.

Required behavior:

```text
resolve active waiting/partial submission
→ derive or read its existing prepared instruction
→ copy that exact instruction once
→ return success
```

Copy must not:

- call the promotion-capable workspace model;
- inspect or promote draft files;
- create or retry a submission;
- advance an ordinal;
- revise or generate a handoff;
- resolve the instruction twice.

If no active prepared instruction exists, return one actionable Prepare-first error.

## 2. Preserve Generic Operator Disposition with Minimal Integrity Safeguards

The Operator remains the sole disposition authority. Do not create Architect approval authority, automated approval, content scoring, or another workflow gate.

### Current-revision safety

The renderer must send the current slot revision identifiers it presented when the Operator applies a review. The backend uses them only as optimistic-concurrency evidence.

Before writing disposition, verify that each supplied identifier still matches the current slot:

```text
slotId + targetPath + artifactRevision
```

If repository evidence changed, reject with a refresh-and-review message. This check does not decide whether the Operator may approve; it only prevents applying the Operator's decision to a different revision.

### Atomic bundle behavior

For Project Planning and Phase Planning bundles:

- require every current slot;
- require readable, fresh current members;
- reject mixed disposition or mixed review-note authority as `needs-attention` before review;
- apply one Operator-selected status, notes value, and timestamp to the complete bundle atomically;
- never permit one member to be dispositioned separately through the generic document review route.

### Catalog review route

`documents:setDisposition` must reject catalog-owned Architect outputs and direct the caller to `architectOutput:review`.

This is route integrity, not an additional approval gate. Non-catalog documents retain their existing generic disposition behavior.

`RevisionRequested` continues to require instructions. Viewed-state UX may remain renderer-owned; do not add persisted viewed state or an Architect-owned decision gate.

## 3. Resolve Exact Prerequisite Readiness

`not-ready` is a workspace state, not a document disposition.

The generic workspace model must enable Prepare only after resolving the exact current eligible prerequisite handoff for that lifecycle context.

Examples:

- Formal Work Card requires the current Approved Work Card Intake handoff for the selected candidate.
- Repair Work Card requires the current Approved Repair Architect handoff for the active repair and parent Work Card.
- Phase Map requires the current eligible Project Planning authority.

Required behavior:

```text
prerequisite absent or ineligible → not-ready, Prepare disabled
exact current handoff eligible and final absent → ready-for-handoff
current final partial, conflicting, stale, or ineligible → needs-attention
```

Do not select authority through an unrelated global latest handoff or output fallback. Resolve by the current project, phase, candidate, Work Card, repair, and parent identity applicable to the workspace.

A model read must not create or revise a handoff or submission. Prepare performs the authorized mutation only after readiness is proven.

## 4. Standardize Formal and Repair Prompt Contracts

The application-owned prepared prompt for each output kind must contain the complete body contract required by its validator.

### Formal Work Card prompt

Include the exact selected Work Card ID, candidate title/context, evidence inputs, temporary path, and required document structure:

```text
# <work-card-id> — <candidate title>
## Verified Repository Evidence
## Objective
## Runtime Sequence
## Required Changes
## Preserved Behavior
## Authorized Surface
## Risks and Constraints
## Acceptance Criteria
## Negative Constraints
## Implementer Report Requirements
## Manual Validation
```

### Repair Work Card prompt

Include the exact repair ID, parent Work Card, bounded defect, evidence path, return target, temporary path, and required document structure:

```text
# <repair-id> — <bounded repair title>
## Confirmed Defect
## Source Evidence
## Objective
## Runtime Sequence
## Required Changes
## Preserved Behavior
## Authorized Surface
## Acceptance Criteria
## Negative Constraints
## Return Target
## Implementer Report Requirements
## Manual Validation
```

Only context variables change between executions. Do not require the Architect to infer a hidden heading schema.

Pass the coordinator-owned typed domain context explicitly to body validation and post-promotion selection. Remove:

```text
lastFormalContext
currentFormalValidationId
lastRepairContext
```

Do not replace them with another module-global, cache, persisted store, token, or hidden context authority.

## 5. Project All Architect-Output States Through the Shared Current-Workflow Model

The lifecycle resolver may continue selecting which workspace owns the current step. After it selects one of the seven catalog-owned Architect-output workspaces, `currentWorkflowService.ts` must obtain that workspace's state from `ArchitectOutputWorkspaceModel` rather than independently deriving it from one document or file-presence checks.

This requirement applies to:

```text
architect-interview
project-planning-review
project-phase-map
phase-interview
phase-planning-bundle
work-card-planning
work-card-repair
```

The shared model must control Current Workflow projection for:

```text
not-ready
ready-for-handoff
waiting-for-drafts
partial-draft-set
promotion-failed
ready-for-review
revision-requested
rejected
completed
needs-attention
```

Current Workflow must project from the shared model:

- current target and evidence;
- state and rail status;
- required action and reason;
- Prepare/Copy/review eligibility;
- draft and promotion state;
- expected next lifecycle result.

The existing resolver may remain responsible for project, phase, Work Card, candidate, validation, and close ownership. Non-Architect workspaces retain their existing services. Do not create a second generic model, hidden active-workspace state, or a broad lifecycle rewrite.

## Authorized Surface

Expected production changes are limited to:

```text
src/shared/architectOutputs/architectOutputContracts.ts
src/shared/workspaceContracts.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/architectOutputs/architectDraftPromotionService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/main.ts
src/preload/index.ts
src/main/documents/planningDocumentService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardRepair/workCardRepairService.ts
src/renderer/app/App.tsx
src/renderer/app/architectOutputWorkspaceRefresh.ts
```

Current Workflow changes are limited to consuming and projecting the corrected shared Architect-output model after lifecycle ownership is resolved. Do not rewrite non-Architect selection, validation, or close behavior.

Focused tests are authorized under existing Architect-output, renderer, documents, Work Card Planning, Work Card Repair, and workflow test directories.

## Acceptance Criteria

1. Copy uses one active prepared instruction and performs no inspection, promotion, retry, handoff generation, or ordinal change.
2. Copy resolves the instruction once; repeated Copy returns the same prompt and submission paths.
3. Temporary output drafts remain approval-free staging files promoted to final Pending documents.
4. Operator review remains one generic action with one Operator-selected status and notes value.
5. Review rejects only when the current slot revision identifiers no longer match the revisions presented to the Operator.
6. Project Planning and Phase Planning disposition remains atomic; mixed bundle authority is `needs-attention` and byte-identical after rejection.
7. `documents:setDisposition` rejects catalog-owned outputs while remaining unchanged for non-catalog documents.
8. Missing or ineligible prerequisites produce `not-ready` with Prepare disabled.
9. Exact current eligible handoffs produce `ready-for-handoff`; old unrelated handoffs are not selected.
10. Partial, conflicting, stale, or ineligible final authority produces `needs-attention` before mutation.
11. Formal and Repair prepared prompts contain their complete exact body contracts and current context values.
12. Formal and Repair valid one-pass outputs promote through the shared coordinator as revision 1 Pending documents.
13. Formal and Repair `RevisionRequested` replacements increment once and reset final review state to Pending.
14. `lastFormalContext`, `currentFormalValidationId`, and `lastRepairContext` are absent from source and compiled output.
15. After lifecycle ownership is selected, all seven catalog workspaces project every Architect-output state through `ArchitectOutputWorkspaceModel`.
16. Existing Pending, RevisionRequested, Rejected, promotion-failed, and needs-attention outputs do not fall back to independent document-derived Architect-output state.
17. Non-Architect lifecycle selection, validation, and close behavior remain unchanged.
18. The accepted seven-definition catalog, generic renderer, direct-save retirement, browser security, and non-Architect lifecycle behavior remain unchanged.
19. Typecheck, TypeScript build, Vite build, and the complete Node test lane pass in the approved normal Windows environment.
20. No Git operation occurs.

## Required Proof

Use a compact production-path matrix, not one new suite per workspace.

Prove at minimum:

- Copy before and after temporary draft creation remains read-only;
- current-revision mismatch blocks review without changing files;
- one single output receives the Operator disposition through the generic review path;
- one atomic bundle receives one synchronized disposition, while a mixed bundle is rejected unchanged;
- generic document disposition rejects a catalog output and still permits a non-catalog document;
- absent prerequisites are `not-ready` and an old unrelated handoff is not selected;
- Formal and Repair prepared instructions include every required heading and exact current identity;
- Formal and Repair prepare, draft, promote, review, and revision paths use the production generic services;
- all seven definitions remain loadable from the production catalog;
- Current Workflow projects the shared model for all seven workspace IDs, including at least one missing-output state and existing Pending, RevisionRequested, promotion-failed, and needs-attention states;
- non-Architect workflow projection remains unchanged.

Source-string assertions may support absence claims but do not replace production-service tests.

## Negative Constraints

Do not:

- add Architect disposition authority or automated approval;
- add approval for temporary drafts;
- add persisted viewed-state or another approval gate;
- restore workspace-specific IPC, polling, action, or review paths;
- restore direct-save or manual-import behavior;
- add compatibility aliases, fallbacks, provider APIs, background workers, hashes, tokens, or sidecars;
- broaden this repair into a complete current-workflow redesign;
- add dependencies;
- perform Git operations.

## Return Target

Return to Architect review of parent `WC40`.

Operator running-product validation begins only after this repair passes and WC40 receives an Approved Architect disposition.

## Implementer Report Requirements

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40-REPAIR01_copy_review_readiness_and_prompt_contract_repair.md
```

The report must list every changed file, map each acceptance criterion to production-path evidence, record exact validation commands and lanes, disclose any scope expansion, and confirm that no temporary-draft approval, additional disposition authority, fallback, dependency, or Git mutation was introduced. It must separately identify the Current Workflow projection changes and prove that non-Architect lifecycle behavior was not rewritten.

## Manual Validation

No Implementer claim of Operator acceptance is permitted. After Architect approval, Operator validation should confirm the one-pass Prepare → Copy → ChatGPT draft → promotion → final review flow for Formal and Repair Work Cards and one atomic bundle, plus consistent Current Workflow status before and after promotion and disposition.
