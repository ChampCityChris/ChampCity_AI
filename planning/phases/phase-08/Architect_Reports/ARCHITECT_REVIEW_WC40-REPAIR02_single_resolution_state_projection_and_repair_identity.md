<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
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
      "path": "planning/phases/phase-08/Work_Cards/WC40-REPAIR02_single_resolution_state_projection_and_repair_identity.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40-REPAIR02_single_resolution_state_projection_and_repair_identity.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC40-REPAIR01_copy_review_readiness_and_prompt_contract_repair.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC40-REPAIR02 Single-Resolution Copy, State Projection, and Repair Identity Closure",
    "reviewResult": "RevisionRequested",
    "returnTarget": "WC40",
    "acceptedCorrections": [
      "single-resolution production Copy",
      "state-sensitive Formal Repair and Phase Map projection",
      "shared Current Workflow projection fields",
      "exact Repair resolver replacing global-latest selection",
      "Repair revision one and revision two promotion path"
    ],
    "blockingDefects": 3,
    "proofDefect": true,
    "reportedValidation": {
      "typecheck": "passed",
      "typescriptBuild": "passed",
      "viteBuild": "passed in approved normal Windows lane",
      "tests": "192/192 reported passed"
    }
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "WC40-REPAIR02 correctly fixes single-resolution Copy and state-sensitive projection, and replaces global-latest Repair selection. It remains incomplete because existing Repair outputs are not validated against the full handoff authority and exact source revisions; RevisionRequested Formal and Repair prompts omit the Operator revision instructions; and Current Workflow routes any RevisionRequested document into Repair when the Repair resolver returns needs-attention without a resolved context. Required missing/conflicting-authority and revision-prompt proof is absent.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC40-REPAIR02

Disposition: `RevisionRequested`  
Parent: `WC40` remains unresolved  
Git mutation: none

## Review Boundary

ChampCity MCP was used to inspect the approved REPAIR02 Work Card, Implementer Report, production Copy handler, generic Architect-output workspace service, Current Workflow projection, exact Repair context resolver, shared contracts, focused state matrix, adversarial Repair selection test, complete Repair revision path, and repository status.

The MCP server returned complete repository payloads during this review.

## Accepted Corrections

The following REPAIR02 work is valid and must be preserved:

- `architectOutput:copyHandoff` now calls one operation that resolves the prepared instruction once and uses the same value for clipboard content and response bytes;
- Copy remains read-only before and after temporary draft creation;
- the generic workspace service classifies current final output and submission state before evaluating preparation eligibility;
- Formal Work Card, Repair Work Card, and Phase Map now project Pending, RevisionRequested, Rejected, Approved, and promotion-failed states with the intended Prepare policy;
- Current Workflow exposes shared Architect-output state, rail status, and Prepare eligibility;
- global `.at(-1)` Repair selection was removed from the Repair service;
- `resolveExactActiveRepairWorkCardContext()` binds an active non-Approved Repair output to one handoff target and validates phase, repair ID, parent ID, origin presence, evidence revision, target, and return-target presence;
- Repair ID allocation includes unresolved handoffs;
- the focused tests prove an unrelated completed Repair does not redirect the active Repair target;
- the production generic Repair path promotes revision 1 Pending, applies RevisionRequested, and promotes revision 2 Pending;
- the Implementer reports typecheck, TypeScript build, Vite build, and 192 passing tests;
- no dependency, fallback route, hidden active-state record, or Git mutation was introduced.

These accepted corrections are not being rewritten as failures.

## Blocking Defect 1 — Existing Repair Output Is Not Checked Against Full Authority

`repairWorkCardContextFromHandoff()` calls `assertExistingRepairOutputMatchesContext()` when a final Repair Work Card exists. That check validates only:

```text
artifact type
identity phase / workCard / repair / parent
workflowData.parentWorkCardId
workflowData.returnTarget
```

It does not validate the final output's:

```text
participation role
workflowData.repairId
workflowData.originalParentWorkCardId
workflowData.origin
workflowData.evidencePath
workflowData.boundedDefect
exact sourceRevisions, including the owning Repair handoff
```

The handoff resolver also accepts any non-empty return target for either origin and does not re-establish the required mapping:

```text
preValidationReportReview → work-card-building-review
postValidationRecord      → work-card-validation
```

Consequently, a readable Repair Work Card at the expected target can be accepted as the active output even when it was built from another evidence source or carries the wrong origin or bounded defect. The shared model can then present it for Operator review as current authority.

Required correction:

- compare every application-owned Repair identity and workflow field against the resolved handoff context;
- require the exact expected source revisions, including the evidence revision and owning Repair handoff revision;
- require `participationRole=gatingReview`;
- enforce the origin-specific evidence family and return target;
- classify any mismatch as `needs-attention` without mutation;
- add adversarial tests that alter origin, evidence path, return target, source revisions, and workflow repair identity at the correct target path.

This blocks acceptance criteria 11 and 13.

## Blocking Defect 2 — Revision Prompts Omit Operator Instructions

The complete Repair path test applies:

```text
RevisionRequested
notes = Clarify the acceptance proof.
```

It then prepares the second submission and writes a revised fixture body, but it never asserts that the prepared instruction contains those Operator notes.

Production source confirms that `buildRepairWorkCardPreparedInstruction()` does not read `context.existing.metadata.canonical.documentDisposition.notes`. The Formal Work Card builder has the same omission. Other established production flows explicitly add `Current Operator revision instructions` to their revised prompts.

Consequences:

- the application accepts non-empty Operator revision instructions but does not deliver them to the embedded Architect;
- the second standardized prompt does not explain what must change;
- revision 2 can be mechanically produced without addressing the Operator's requested correction.

Required correction:

- when the current Formal or Repair output is `RevisionRequested`, append the exact non-empty Operator revision instructions to the prepared prompt;
- do not add revision text for fresh creation or other dispositions;
- prove the revision 2 Repair prompt contains the exact notes supplied through generic review;
- add equivalent focused proof for Formal Work Card revision preparation.

This prevents the revision path from satisfying the parent WC40 one-pass prompt contract and REPAIR02 acceptance criterion 14 substantively.

## Blocking Defect 3 — Conflict-Mode Current Workflow Is Not Identity-Bound

`repairModelForRevisionRequestedEvidence()` correctly compares the current document path to `context.workflowData.evidencePath` when the exact Repair resolver returns `ready`.

When the resolver returns `needs-attention`, however, `resolved.context` is undefined. The evidence-path comparison is skipped, and any current `RevisionRequested` document can be redirected to the Work Card Repair workspace:

```text
resolver = needs-attention
context = undefined
no evidence identity comparison
→ return currentModelFromArchitectOutput(work-card-repair)
```

A Repair conflict elsewhere in the repository can therefore override an unrelated RevisionRequested lifecycle document. This is the same class of cross-context selection that REPAIR02 was intended to eliminate.

Required correction:

- preserve enough candidate identity/evidence information in non-ready Repair resolution results to determine whether the current RevisionRequested document belongs to that Repair conflict;
- route to Repair only when the current document is the exact evidence or Repair output involved;
- otherwise preserve the current document's owning workspace;
- add an adversarial Current Workflow test with conflicting Repair authority plus an unrelated RevisionRequested document.

This blocks acceptance criteria 10, 11, and 13.

## Required Proof Defect

The 192-test lane includes valuable new behavioral coverage, but required proof remains incomplete:

- no test verifies missing Repair authority produces `not-ready` without mutation;
- no test verifies duplicate or conflicting Repair authority produces `needs-attention` without mutation;
- the adversarial test uses an unrelated Repair whose final output is already Approved; it does not test competing unresolved authority;
- no test places mismatched Repair metadata or source revisions at the exact active target;
- the revision 2 test does not inspect the second prepared prompt for Operator notes;
- Current Workflow assertions are deliberately skipped for promotion-failed rows, despite the Work Card requiring shared projection of that active retry state.

The next pass should extend the existing focused test file rather than create another workspace-specific suite.

## Validation Assessment

The Implementer reports:

```text
npx tsc --noEmit                 passed
npx tsc                          passed
npx vite build                   passed; 1,612 modules transformed
focused Architect-output tests  10 passed
Current Workflow tests           5 passed
complete Node lane              192 passed, 0 failed
```

The sandbox `spawn EPERM` results were separated from successful approved Windows reruns. ChampCity MCP does not expose command execution, so this review does not claim independent command reruns.

## Final Disposition

WC40-REPAIR02 is not approved. Parent WC40 remains unresolved, and Operator running-product validation must not begin.

Preserve the single-resolution Copy operation, corrected state classifier, Current Workflow projection fields, exact Repair resolver foundation, and complete revision-one/revision-two promotion path. Correct only the three bounded defects above and add the missing behavioral proof. Do not restore global-latest selection, workspace-specific surfaces, direct-save paths, temporary-draft approval, additional disposition authority, fallback behavior, or hidden state.

No Git operation was performed by this review.
