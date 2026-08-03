<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC40-REPAIR02",
    "repairId": "WC40-REPAIR02",
    "parentWorkCardId": "WC40"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC40-REPAIR01_copy_review_readiness_and_prompt_contract_repair.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40-REPAIR01_copy_review_readiness_and_prompt_contract_repair.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC40-REPAIR01_copy_review_readiness_and_prompt_contract_repair.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC40_simultaneous_seven_flow_architect_output_product_cutover.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Single-Resolution Copy, State Projection, and Repair Identity Closure",
    "status": "approved_for_implementation",
    "executionMode": "one bounded WC40 closure repair",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40-REPAIR02_single_resolution_state_projection_and_repair_identity.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Close only the three residual WC40 defects: one-resolution production Copy, state-sensitive Formal/Repair/Phase Map projection, and exact active Repair identity, with focused behavioral proof.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# WC40-REPAIR02 — Single-Resolution Copy, State Projection, and Repair Identity Closure

Status: Approved for Implementer execution  
Parent: `WC40`  
Git mutation: prohibited

## Objective

Close the three residual WC40 defects without redesigning the accepted cutover:

```text
production Copy resolves one prepared instruction once
current output state is classified before preparation eligibility
Repair authority is bound to the exact active repair and parent identity
```

Add only the focused behavioral proof required to demonstrate those corrections.

## Accepted REPAIR01 Corrections to Preserve

Preserve unchanged:

- one prepared instruction stored on the active runtime submission;
- read-only service-level Copy;
- renderer-presented current-revision review evidence;
- generic Operator-owned review and atomic bundle disposition;
- catalog-output guard on `documents:setDisposition`;
- coordinator-owned typed Formal and Repair context;
- removal of `lastFormalContext`, `currentFormalValidationId`, and `lastRepairContext`;
- complete Formal and Repair prompt contracts;
- Current Workflow delegation to `ArchitectOutputWorkspaceModel`;
- seven active definitions, nine slots, generic renderer surfaces, and direct-save retirement.

Do not reopen passed REPAIR01 behavior.

## 1. Resolve Copy Once in the Production Handler

The production `architectOutput:copyHandoff` operation must perform exactly one prepared-instruction lookup.

Required sequence:

```text
resolve active prepared instruction once
→ write that exact value to clipboard
→ calculate response metadata from that same value
→ return success
```

Do not call `getPreparedArchitectOutputInstruction()` again through a result helper.

The handler or one directly invoked operation must return both the instruction and result metadata from the same resolved value. Copy remains read-only and must not inspect drafts, promote, retry, create a submission, generate a handoff, or advance an ordinal.

## 2. Classify Current Output State Before Preparation Eligibility

Preparation eligibility and current output state are separate decisions.

For Formal Work Card, Repair Work Card, and Phase Map, first classify the current final output and active submission. Only then evaluate whether Prepare is allowed.

Required state policy:

| Current condition | Workspace state | Prepare |
|---|---|---|
| prerequisites missing/ineligible | `not-ready` | disabled |
| exact prerequisites eligible; final absent | `ready-for-handoff` | enabled |
| temporary drafts incomplete | `waiting-for-drafts` or `partial-draft-set` | disabled |
| promotion failed | `promotion-failed` | enabled for explicit retry |
| final Pending | `ready-for-review` | disabled |
| final `RevisionRequested` | `revision-requested` | enabled |
| final Rejected | `rejected` | disabled |
| final Approved | `completed` | disabled |
| final stale, partial, conflicting, malformed, or wrong authority | `needs-attention` | disabled |

Do not call create-or-replace eligibility as a general model-read probe after a final output exists.

Current Workflow must project the resulting shared-model state, rail status, required action, blocker, and preparation eligibility without independent reinterpretation.

## 3. Bind Repair Authority to the Exact Active Repair

Create or use one exact Repair context resolver shared by:

```text
workCardRepairService
architectOutputWorkspaceService
a current-workflow Repair projection
```

The resolver must identify the active Repair from current lifecycle evidence and require one matching Approved Repair Architect handoff with the same:

- phase ID;
- repair ID;
- original parent Work Card ID;
- origin;
- evidence path and revision relationship;
- final Repair Work Card target;
- return target.

Do not select Repair authority through global `.at(-1)`, filename order, or latest-artifact fallback.

Missing authority is `not-ready`. Duplicate, conflicting, stale, unrelated, or mismatched authority is `needs-attention`. Neither condition may mutate a handoff, submission, prompt, ordinal, draft, or final output.

The exact active Repair context must control its prepared prompt, temporary path, final target, parent identity, and return target.

## 4. Focused Behavioral Proof

Extend the existing focused production-service test file unless a very small helper-specific test is necessary:

```text
test/architect-outputs/architect-output-workspace-repair.test.cjs
```

Required scenarios:

### Production Copy

Prove the production operation resolves one prepared instruction once and uses the same value for clipboard content and result bytes. Prove Copy before and after temporary draft creation remains read-only.

### State matrix

For Formal Work Card, Repair Work Card, and Phase Map, prove the applicable conditions:

```text
absent
Pending
RevisionRequested
Rejected
Approved
promotion-failed
```

Assert workspace state, rail status, required action, blocker, `canPrepareHandoff`, and Current Workflow projection.

### Adversarial Repair identity

Create at least two Approved Repair handoffs for different repair IDs or parent Work Cards. Prove the active Repair selects only its own:

```text
repair ID
parent Work Card
evidence path
temporary draft path
final target
return target
```

The unrelated handoff and target must remain byte-identical.

### Complete Repair path

Prove through production generic services:

```text
Prepare
→ standardized prompt
→ temporary body draft
→ promote revision 1 Pending
→ generic Operator review to RevisionRequested
→ prepare replacement
→ promote revision 2 Pending
```

Source-string assertions may support absence claims but do not replace these behavioral tests.

## Authorized Surface

Expected production changes are limited to:

```text
src/main/main.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/workCardRepair/workCardRepairService.ts
```

A narrow helper or shared-contract adjustment is authorized only when required to pass the same resolved instruction or exact Repair context without duplication.

Focused tests may change under:

```text
test/architect-outputs/
test/workflow/
test/work-card-repair/
test/repository/
```

Do not modify renderer design, browser security, unrelated domain services, or non-Architect lifecycle persistence.

## Acceptance Criteria

1. Production Copy performs one prepared-instruction lookup.
2. The same resolved instruction supplies clipboard content and response bytes.
3. Copy remains mutation-free before and after temporary draft creation.
4. Formal Pending projects `ready-for-review` with Prepare disabled.
5. Formal `RevisionRequested` permits Prepare; Rejected and Approved do not.
6. Repair Pending projects `ready-for-review` with Prepare disabled.
7. Repair `RevisionRequested` permits Prepare; Rejected and Approved do not.
8. Phase Map Pending, Rejected, and Approved disable Prepare; absent eligible and `RevisionRequested` states behave as specified.
9. Promotion failure remains an explicit retry state without automatic retry.
10. Current Workflow projects the same state, rail, action, blocker, and preparation eligibility as the shared model for these workspaces.
11. Repair authority resolves the exact active phase, repair, parent, origin, evidence, target, and return context.
12. Multiple Approved Repair handoffs cannot redirect the active Repair prompt or target.
13. Missing or conflicting Repair authority causes no mutation.
14. Repair revision 1 and revision 2 Pending promotions complete through generic production services.
15. Accepted REPAIR01 behavior remains passing and unchanged.
16. Typecheck, TypeScript build, Vite build, and the complete Node test lane pass in the approved normal Windows environment.
17. No Git operation occurs.

## Negative Constraints

Do not:

- add draft approval or Architect disposition authority;
- add persisted viewed state, tokens, hashes, caches, marker files, or hidden active context;
- restore workspace-specific IPC, preload, polling, actions, review, direct-save, or manual-import paths;
- add compatibility aliases or fallback selection;
- redesign Current Workflow or non-Architect lifecycle behavior;
- add dependencies;
- perform Git operations.

## Return Target

Return to Architect review of `WC40-REPAIR02`, then parent `WC40` closeout disposition.

Operator running-product validation remains blocked until this repair and parent WC40 are Approved.

## Implementer Report Requirements

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40-REPAIR02_single_resolution_state_projection_and_repair_identity.md
```

The report must:

- list every changed file;
- map every acceptance criterion to production-path evidence;
- identify the single-resolution Copy operation;
- reproduce the Formal, Repair, and Phase Map state-matrix results;
- identify the exact Repair context resolver and adversarial multi-handoff proof;
- record Repair revision 1 and revision 2 promotion evidence;
- record exact validation commands and lanes;
- disclose any scope expansion or unresolved defect;
- confirm no fallback, new authority, dependency, or Git mutation.

## Manual Validation

No Implementer claim of Operator acceptance is permitted. After Architect approval, Operator validation should exercise one real Copy operation, one Formal review, one Phase Map review, and one complete Repair creation/revision path in the running application.
