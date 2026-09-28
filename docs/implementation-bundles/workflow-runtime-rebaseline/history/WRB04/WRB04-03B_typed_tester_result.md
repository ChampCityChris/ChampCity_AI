# WRB04-03B — Typed Durable Tester Result

**Depends on:** WRB04-03A committed checkpoint
**Implementer:** GPT 6.0 Luna Medium

## Objective

Persist the result of one bounded Tester assessment as canonical Project State evidence, keyed to the exact current Workflow, WorkItem, and Implementer record. This card defines the typed result boundary consumed by the later test-only checkpoint and Validator cards; it does not execute a Tester or create a source checkpoint.

## Current evidence

The adopted result fields and outcomes are in `ARCHITECT_BASELINE_2026-09-26.md`, sections 6–7. `Validation` and `TestLifecycleAssessmentStatus` currently capture validation and per-obligation lifecycle outcomes, while `recordTestLifecycleAssessment` cannot represent one exact WorkItem attempt and candidate revision as a single result. `ImplementationRecord` and typed attempts are defined in `src/shared/projectState/domainContracts.ts` and `src/shared/projectState/projectStateService.ts`. Verify the Project State persistence/store contract before editing; records use the typed entity registry and application-issued envelopes.

## Scope and decisions

- Add one typed `TesterResult` Project State entity. Required fields: exact `workflowId`, `workItemId`, `implementationRecordId`, `implementerRevisionId`, recommendation from the WRB04-03A result union, affected capability IDs, permanent test paths changed, determination evidence, unknowns, and rationale. Include explicit checkpoint state (`not-required` or `pending`) and optional candidate revision/checkpoint ID fields for the following checkpoint card.
- Add one typed `createTesterResult(projectId, workflowId, workItemId, implementationRecordId, input)` operation. Require the exact current substantive Workflow, WorkItem ownership under that Workflow, a completed successful ImplementationRecord for that WorkItem, and an immutable source revision reference. The recommendation and exact input paths/capabilities/evidence must be bounded and schema validated.
- If no permanent test path changed, set candidate revision equal to the Implementer revision and checkpoint state `not-required`. If permanent test paths changed, candidate revision is absent and checkpoint state is `pending`; only the next card's typed test-only checkpoint command may transition it to `committed` and fill candidate revision/checkpoint ID.
- Link the TesterResult to both its WorkItem and ImplementationRecord with typed semantic relationships. Reject generic record creation/revision or a mismatched Workflow/ImplementationRecord. Do not add a new database, JSON sidecar, or compatibility path.
- Keep the existing per-obligation/permanent-reference `recordTestLifecycleAssessment` behavior intact; a TesterResult summarizes one WorkItem assessment and does not itself retire/quarantine obligations.

## Required areas

- `src/shared/projectState/domainContracts.ts`, `entityTypeRegistry.ts`, `relationshipRegistry.ts`, and `projectStateService.ts`.
- Current Project State store adapters only as required to prove new entity round-trip; no physical schema migration unless the existing typed store proves one is necessary (stop and document if so).
- `test/project-state/tester-state-mapping.test.cjs`, `test/project-state/domain-contracts.test.cjs`, and `test/project-state/execution-completion.test.cjs` as applicable. Reuse/extend existing tests when they own the boundary.

## Acceptance

1. A TesterResult round-trips through in-memory and SQLite stores with its exact Workflow, WorkItem, implementation, and source revision identities.
2. Cross-Workflow, stale/non-implemented, wrong-WorkItem, malformed, duplicate, over-bound, and unsupported-field inputs fail closed.
3. No-test-change results use the Implementer revision with `not-required`; changed-test results remain pending with no candidate revision until the later checkpoint.
4. The result is linked to its WorkItem and ImplementationRecord; generic record APIs cannot manufacture or revise it.
5. Existing Validation lifecycle assessment history and WorkItem completion behavior remain unchanged.

## Non-scope

Test-only Git checkpoint mechanics, Tester workspace/runtime, edits to permanent proof, Validator, Repair creation/re-entry, WorkItem completion orchestration, Phase/Workflow completion, and UI. Do not open the next card until this card is complete and committed.

## Validation and report

Inspect existing Project State tests and capability-map ownership before adding proof. Run build, focused Project State/Tester tests, capability-map integrity, exact-path work-item validation-plan preview and profile, and `git diff --check`. A new permanent test requires the exact uncovered durable-result contract/failure mode in the report. Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-03B_IMPLEMENTER_REPORT.md`, then commit this card before opening WRB04-03C.

Suggested commit: `WRB04-03B persist typed Tester results`.
