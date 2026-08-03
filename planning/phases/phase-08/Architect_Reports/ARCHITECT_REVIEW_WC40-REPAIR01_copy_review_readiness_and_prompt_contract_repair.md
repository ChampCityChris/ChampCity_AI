<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC40-REPAIR01",
    "repairId": "WC40-REPAIR01",
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
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC40_simultaneous_seven_flow_architect_output_product_cutover.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC40-REPAIR01 Copy, Operator Review, Readiness, Prompt Contract, and Current-Workflow Projection Repair",
    "reviewResult": "RevisionRequested",
    "returnTarget": "WC40",
    "acceptedCorrections": [
      "read-only active prepared instruction storage",
      "current-revision review evidence",
      "catalog document disposition route guard",
      "typed Formal and Repair validation context",
      "complete Formal and Repair prompt structures",
      "catalog Current Workflow delegation"
    ],
    "blockingDefects": 3,
    "proofDefect": true,
    "reportedValidation": {
      "typecheck": "passed",
      "typescriptBuild": "passed",
      "viteBuild": "passed in approved normal Windows lane",
      "tests": "188/188 reported passed"
    }
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "WC40-REPAIR01 is directionally correct but incomplete. The main Copy handler still resolves the prepared instruction twice; Formal and Repair existing outputs are misclassified because preparation/replacement eligibility overrides current output state, with Phase Map Prepare also remaining enabled for ineligible final states; and Repair Work Card authority still selects the globally latest Approved repair handoff rather than the exact active repair and parent identity. The focused tests do not cover these paths or Repair promotion/revision.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC40-REPAIR01

Disposition: `RevisionRequested`  
Parent: `WC40` remains unresolved  
Git mutation: none

## Review Boundary

ChampCity MCP was used to inspect:

- WC40-REPAIR01 artifact revision 2;
- the Implementer Report;
- shared Architect-output contracts;
- runtime submission and promotion services;
- generic workspace, Copy, review, and readiness services;
- main IPC and renderer revision evidence;
- Formal and Repair Work Card definitions and resolvers;
- Current Workflow projection;
- generic document-disposition route protection;
- focused and existing production-service tests.

The MCP server returned complete repository payloads during this review.

## Accepted Corrections

The following repairs are valid and must be preserved:

- the active runtime record now stores one immutable prepared instruction with its submission and typed context;
- service-level Copy reads the active prepared instruction without polling, inspection, promotion, retry, or ordinal mutation;
- review receives renderer-presented `slotId + targetPath + artifactRevision` evidence and rejects changed revisions before disposition;
- Project Planning bundle review rejects mixed member dispositions or review notes before the atomic write;
- the `documents:setDisposition` IPC route rejects all seven catalog output artifact types while non-catalog documents retain generic disposition;
- Formal and Repair validation and post-promotion selection receive coordinator-owned typed domain context;
- `lastFormalContext`, `currentFormalValidationId`, and `lastRepairContext` are removed;
- Formal and Repair prepared prompts include their exact identities, evidence, temporary paths, and validator-enforced headings;
- Current Workflow now delegates catalog-owned current documents to `ArchitectOutputWorkspaceModel` after lifecycle ownership is selected;
- no temporary-draft approval, Architect disposition authority, fallback route, dependency, or Git mutation was introduced.

These accepted corrections are not being rewritten as failures.

## Blocking Defect 1 — Main Copy Still Resolves the Instruction Twice

The service-level Copy path is read-only, but the production IPC handler remains:

```text
getPreparedArchitectOutputInstruction(...)
→ clipboard.writeText(instruction)
→ copyArchitectOutputHandoffResult(...)
→ getPreparedArchitectOutputInstruction(...) again
```

`copyArchitectOutputHandoffResult()` performs its own lookup. WC40-REPAIR01 acceptance criterion 2 requires one instruction resolution.

The second lookup is not currently mutating, but it creates an avoidable race: the clipboard can already contain the first instruction while the result path fails because active submission state changed between lookups. It also makes the Implementer Report statement that Copy resolves once factually incorrect.

Required correction:

- resolve one prepared instruction once in the production handler;
- use that same value for clipboard write and response byte count;
- either pass the resolved instruction into the result builder or provide one operation that performs the single lookup and returns both instruction and result data;
- add production-handler proof rather than only calling `copyArchitectOutputHandoffResult()` directly.

## Blocking Defect 2 — Readiness Evaluation Overrides Existing Output State

`domainOverlay()` uses `definition.resolvePreparation()` as the default readiness probe for Formal and Repair Work Cards.

Both definitions correctly allow preparation only when the final target is absent or `RevisionRequested`. However, that preparation rule is also applied when an existing output is merely being displayed.

For a current Formal or Repair Work Card with disposition:

```text
Pending
Approved
Rejected
```

`resolvePreparation()` reaches `assertFormalWorkCardEligible()` or `assertRepairWorkCardEligible()` and throws because the document is not `RevisionRequested`. `domainOverlay()` catches the error and sets the workspace to `needs-attention`, overriding `deriveState()`.

Consequences:

- a Pending Formal or Repair output is projected as `needs-attention` instead of `ready-for-review`;
- Current Workflow inherits the wrong rail status, required action, and blocker;
- a Rejected output receives a replacement-eligibility error instead of its normal rejected lifecycle meaning;
- the focused single-output review test succeeds only because `canApplyDisposition` is calculated independently from the incorrect workspace state and the test never asserts state, rail, required action, or Prepare eligibility.

Phase Map has the inverse form of the same defect. Once an Approved Phase Map handoff exists, `phaseMapDomainOverlay()` returns `canPrepareHandoff: true` without considering the final output state. Prepare can therefore remain enabled for Pending, Rejected, or completed Phase Map output even though only absent, `RevisionRequested`, or failed-submission cases should permit a new preparation.

Required correction:

- separate current output classification from eligibility to create or revise an output;
- derive final state first from current output evidence;
- evaluate preparation eligibility only for `ready-for-handoff`, `revision-requested`, and `promotion-failed` paths;
- Pending must project `ready-for-review` with Prepare disabled;
- Approved must project `completed` when that workspace is directly modeled;
- Rejected must project `rejected` with the domain-defined next action;
- apply the same state-sensitive Prepare policy to Phase Map;
- add state assertions for Formal, Repair, and Phase Map covering absent, Pending, RevisionRequested, Rejected, Approved, and promotion-failed conditions.

This defect blocks acceptance criteria 8, 10, 15, 16, and 17.

## Blocking Defect 3 — Repair Handoff Authority Is Still Global-Latest

Formal Work Card now resolves the selected phase and candidate before locating its Work Card Intake handoff. Repair Work Card does not have equivalent identity binding.

Both paths still use the globally last Approved repair handoff:

```text
workCardRepairService.requiredApprovedHandoff()
→ all Approved generated handoffs with handoffKind=repair
→ .at(-1)
```

and:

```text
currentWorkflowService.missingRepairWorkCardModel()
→ all Approved generated handoffs with handoffKind=repair
→ .at(-1)
```

No filter binds the handoff to the current repair ID, original parent Work Card, origin, evidence path, or resolver-selected lifecycle context.

When multiple Approved repair handoffs remain in the repository, opening or preparing one repair can select another repair's target and prompt. Filename ordering, not current lifecycle authority, decides the result.

The focused Repair test creates only one handoff, so it cannot prove acceptance criterion 9.

Required correction:

- resolve the active repair identity and original parent from current lifecycle evidence;
- select exactly the Approved Repair Architect handoff matching that repair ID, parent, origin, and evidence relationship;
- use the same resolver in the Repair definition, generic workspace model, and Current Workflow projection;
- reject missing, duplicate, conflicting, or unrelated repair handoffs as `not-ready` or `needs-attention` without mutation;
- add an adversarial test containing at least two Approved repair handoffs and prove the active repair selects its own prompt, target, parent, and return path.

This defect blocks acceptance criterion 9 and the Repair portion of criteria 12, 13, and 15.

## Required Proof Defect

The focused test file proves several accepted corrections, but it does not prove the failed criteria above:

- it tests the service-level Copy result, not the actual main handler's single-resolution behavior;
- it reviews a Pending Formal output without asserting that the generic model reports `ready-for-review`, `Awaiting Approval`, and Prepare disabled;
- it does not assert Formal or Repair Rejected, Approved, RevisionRequested, or promotion-failed shared-model states;
- it creates only one Repair handoff;
- it never writes a Repair temporary draft, promotes a Repair Work Card, reviews it through the generic route, or performs a `RevisionRequested` Repair replacement;
- Current Workflow tests assert workspace IDs and execution-context disposition but do not assert the shared model's required action, rail status, blocker, or preparation eligibility.

The revised proof must cover these production paths directly. Source-string assertions and a green complete lane do not substitute for the missing behavioral proof.

## Validation Assessment

The Implementer reports:

```text
npx tsc --noEmit                 passed
npx tsc                          passed
npx vite build                   passed; 1,612 modules transformed
node --test --test-concurrency=1 188 passed, 0 failed
```

The sandbox `spawn EPERM` results were separated from successful approved Windows reruns. ChampCity MCP does not expose command execution, so this review does not claim independent command reruns.

## Final Disposition

WC40-REPAIR01 is not approved. Parent WC40 remains unresolved, and Operator running-product validation must not begin.

Preserve the accepted prepared-instruction storage, review revision evidence, route guard, typed context, standardized prompts, and Current Workflow delegation. Correct only the three bounded defects above and add the missing production-path proof. Do not restore workspace-specific surfaces, direct-save paths, temporary-draft approval, additional disposition authority, fallback behavior, or hidden state.

No Git operation was performed by this review.
