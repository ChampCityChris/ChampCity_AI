<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC40-REPAIR03",
    "repairId": "WC40-REPAIR03",
    "parentWorkCardId": "WC40"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC40-REPAIR02_single_resolution_state_projection_and_repair_identity.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40-REPAIR02_single_resolution_state_projection_and_repair_identity.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC40-REPAIR02_single_resolution_state_projection_and_repair_identity.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Repair Authority, Revision Prompt, and Conflict Isolation Closure",
    "status": "approved_for_implementation",
    "executionMode": "production-code-only bounded closure repair",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "architectOwnedTestPath": "test/architect-outputs/architect-output-workspace-repair.test.cjs",
    "architectOwnedTestSha256": "c10562b8f3c94a5abe35d6d04f96a60bcf8a7894499b20081ad2f4f6c8890409",
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40-REPAIR03_repair_authority_revision_prompt_and_conflict_isolation.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Close the remaining Repair authority, revision-instruction delivery, and conflict-isolation defects against immutable Architect-authored behavioral tests. Production code only; Implementer modification of the acceptance tests is prohibited.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# WC40-REPAIR03 — Repair Authority, Revision Prompt, and Conflict Isolation Closure

Status: Approved for Implementer execution  
Parent: `WC40`  
Git mutation: prohibited

## Confirmed Defect

Three bounded defects remain:

1. Existing Repair Work Cards are not compared against the complete owning handoff authority.
2. Formal and Repair `RevisionRequested` prompts omit the Operator's revision instructions.
3. Repair conflicts can redirect an unrelated `RevisionRequested` lifecycle document into Work Card Repair.

The first is an incomplete REPAIR02 implementation, the second is a latent parent WC40/REPAIR01 defect, and the third is a REPAIR02 regression.

## Source Evidence

Controlling review:

```text
planning/phases/phase-08/Architect_Reports/
ARCHITECT_REVIEW_WC40-REPAIR02_single_resolution_state_projection_and_repair_identity.md
```

Architect-owned acceptance tests have already been added to:

```text
test/architect-outputs/architect-output-workspace-repair.test.cjs
```

Required immutable baseline SHA-256:

```text
c10562b8f3c94a5abe35d6d04f96a60bcf8a7894499b20081ad2f4f6c8890409
```

The Implementer must not edit, rename, skip, conditionally bypass, weaken, replace, or delete this test file or its assertions. If the baseline cannot execute as written, stop and report the exact failure without changing it.

## Objective

Make the existing Architect-authored tests pass through production-code corrections only while preserving every accepted WC40, REPAIR01, and REPAIR02 behavior.

## Runtime Sequence

```text
verify immutable test SHA
→ run focused test before production changes and record expected failures
→ correct only authorized production code
→ rerun the same unchanged focused test
→ run typecheck, build, and complete test lane
→ return to Architect review
```

## Required Changes

### 1. Enforce complete Repair authority

For an existing Repair Work Card, require exact agreement with the resolved Approved Repair Architect handoff for:

- artifact type and `participationRole=gatingReview`;
- phase ID, repair ID, Work Card ID, and original parent Work Card ID;
- `workflowData.repairId`;
- `workflowData.parentWorkCardId`;
- `workflowData.originalParentWorkCardId`;
- origin;
- evidence path;
- bounded defect;
- return target;
- exact source revisions, including current evidence revision and owning handoff revision.

Enforce origin mapping:

```text
preValidationReportReview → Implementer Report evidence → work-card-building-review
postValidationRecord      → Validation Record evidence  → work-card-validation
```

An orphan Repair output with no matching Approved handoff is `not-ready`. Duplicate, conflicting, stale, malformed, or mismatched authority is `needs-attention`. Neither condition may mutate repository files or runtime submission state.

### 2. Deliver Operator revision instructions

When a current Formal or Repair Work Card is `RevisionRequested`, its prepared prompt must contain:

```text
Current Operator revision instructions:
<exact non-empty documentDisposition.notes>
```

Do not include revision instructions for initial creation, Pending, Rejected, or Approved outputs. Preserve the existing standardized body contract and context fields.

### 3. Isolate Repair conflicts in Current Workflow

A non-ready Repair resolution must retain sufficient evidence identity to determine whether the current `RevisionRequested` document belongs to that Repair condition.

Route Current Workflow to `work-card-repair` only when the current document is the exact Repair evidence or Repair output involved. A Repair conflict elsewhere must not override an unrelated Project, Phase, Work Card, validation, or close document.

### 4. Preserve promotion-failure projection

Current Workflow must continue to project shared `promotion-failed` state, rail status, required action, blocker, and explicit retry eligibility for Formal Work Card, Repair Work Card, and Phase Map.

## Preserved Behavior

Preserve unchanged:

- single-resolution, mutation-free Copy;
- state-sensitive Formal, Repair, and Phase Map projection;
- generic Operator-owned review and current-revision checks;
- atomic bundle review;
- catalog disposition route guard;
- exact Repair resolver foundation and non-global selection;
- standardized Formal and Repair prompt contracts;
- Repair revision 1 and revision 2 promotion;
- Current Workflow shared projection fields;
- seven-definition catalog and generic renderer cutover;
- no temporary-draft approval or additional authority gate.

## Authorized Surface

Production changes are limited to:

```text
src/main/workCardRepair/workCardRepairService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
```

A narrow type adjustment in an existing shared contract is authorized only when required to carry non-ready Repair evidence identity. No new service, registry, store, model, route family, or test helper is authorized.

The Architect-owned test file is read-only for this pass.

## Acceptance Criteria

1. The Architect-owned test file SHA matches the recorded baseline before implementation.
2. The pre-change focused run records the failing Architect-authored scenarios without modifying tests.
3. Existing Repair output authority validates every required identity, workflow, participation-role, origin, evidence, return-target, and source-revision field.
4. Orphan Repair output is `not-ready`, Prepare is disabled, and bytes remain unchanged.
5. Conflicting Repair authority is `needs-attention`, Prepare is disabled, and bytes remain unchanged.
6. Pre-validation and post-validation origin/evidence/return mappings are enforced exactly.
7. Formal revision prompt includes the exact Operator notes.
8. Repair revision prompt includes the exact Operator notes.
9. Fresh creation prompts do not contain revision instructions.
10. Repair conflict does not redirect an unrelated `RevisionRequested` Project Planning document.
11. Current Workflow still projects promotion-failed state consistently for Formal, Repair, and Phase Map.
12. The Architect-owned test file is byte-identical after implementation and retains the baseline SHA.
13. The unchanged focused test passes after production corrections.
14. All previously passing REPAIR01 and REPAIR02 tests remain passing.
15. Typecheck, TypeScript build, Vite build, and complete Node test lane pass in the approved normal Windows environment.
16. No Git operation occurs.

## Negative Constraints

Do not:

- modify any Architect-owned acceptance test;
- add implementation-specific branches solely to identify test fixtures;
- weaken validation to satisfy a fixture;
- add hidden active Repair state, caches, markers, hashes, tokens, or sidecars;
- restore global-latest selection or fallback target selection;
- add a new lifecycle level, authority gate, IPC route, preload route, or renderer surface;
- restore direct-save or manual-import behavior;
- add dependencies;
- perform Git operations.

## Return Target

Return to Architect review of `WC40-REPAIR03`, then parent `WC40` closeout disposition.

Operator running-product validation remains blocked until REPAIR03 and parent WC40 are Approved.

## Implementer Report Requirements

Create:

```text
planning/phases/phase-08/Implementer_Reports/
IMPLEMENTER_REPORT_WC40-REPAIR03_repair_authority_revision_prompt_and_conflict_isolation.md
```

The report must include:

- initial and final SHA-256 of the Architect-owned test file;
- exact focused-test failures observed before production changes;
- confirmation that no test file was modified;
- every changed production file;
- acceptance-criterion mapping to production evidence;
- exact focused and complete validation commands and results;
- full Repair authority comparison fields;
- exact Formal and Repair revision-note prompt evidence;
- unrelated-document conflict-isolation evidence;
- any scope expansion or unresolved issue;
- confirmation of no dependency, fallback, hidden state, or Git mutation.

## Manual Validation

No Implementer claim of Operator acceptance is permitted. After Architect approval, Operator validation should exercise one Formal revision prompt, one Repair revision prompt, one malformed or conflicting Repair authority display, and one unrelated RevisionRequested document while a Repair conflict exists.
