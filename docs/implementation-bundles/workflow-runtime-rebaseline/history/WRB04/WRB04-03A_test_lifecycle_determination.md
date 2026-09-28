# WRB04-03A — Bounded Test Lifecycle Determination Engine

**Depends on:** WRB04-02D committed checkpoint
**Implementer:** GPT 6.0 Luna Medium

## Objective

Provide a deterministic, bounded analysis service that gives a Tester evidence about permanent regression proof affected by one exact WorkItem attempt. This card produces a typed recommendation and evidence only; it does not execute a Tester session, edit tests, checkpoint source, validate Criteria, create Repairs, or close WorkItems.

## Evidence and architecture

The adopted contract is in `ARCHITECT_BASELINE_2026-09-26.md`, section 6. Existing durable records are defined in `src/shared/projectState/domainContracts.ts`; lifecycle assessments are recorded through `recordTestLifecycleAssessment` in `src/shared/projectState/projectStateService.ts`. Validation proof ownership is described by `validation/capability-map.json` and its integrity suite. Inspect these current shapes before implementation. Do not introduce a parallel persistence format or alter Project State schemas in this card.

## Scope

- Add a pure/main-process Determination service that accepts one WorkItem ID, exact Implementer source revision, changed repository-relative paths, affected capability IDs, and bounded current catalog/obligation/assessment evidence supplied by its caller.
- Return a typed result with the exact WorkItem/revision, considered paths/capabilities/proof references, evidence provenance, and one recommendation: reuse existing proof, permanent proof change warranted, lifecycle review candidate, no permanent test required, or production defect suspected.
- Use only explicitly supplied affected proof and catalog metadata. Reject malformed paths/unknown catalog references and report missing metadata as unknown; never silently widen to a repository-wide audit.
- Keep recommendations advisory. No score may delete, retire, quarantine, or mutate tests or catalog records. Do not make Tester an Operator approval gate.
- Keep execution planner receipts and permanent catalog proof separate from implementation-local test evidence.

## Required areas

- `src/main/validation/` for the bounded determination service and its local types.
- `validation/capability-map.json` and validation catalog readers only as evidence sources; no schema redesign.
- Existing `test/validation/` and `test/project-state/tester-state-mapping.test.cjs` proof boundaries. Extend existing suites where they own the behavior; add a test only for a distinct uncovered contract.

## Acceptance

1. Analysis is bounded to the supplied WorkItem, changed paths, capabilities, and proof references, and the result preserves those exact identities.
2. Each recommendation includes traceable evidence and explicit unknowns; absent metadata cannot be represented as proof that no test is needed.
3. The service performs no file writes and no Project State/catalog mutations.
4. Implementation-local proof is never returned as permanent catalog proof unless the catalog explicitly identifies it.
5. A no-permanent-test recommendation can be produced only when supplied evidence supports it; an empty or incomplete evidence set yields an unknown/review result.
6. Existing capability-map integrity and lifecycle state mapping behavior remain valid.

## Non-scope

Tester workspace/role orchestration, permanent test edits, test-only source checkpointing, Validator execution, Validation record creation, Repair creation/re-entry, WorkItem completion, Phase/Workflow completion, UI, and broad lifecycle audits. These remain later sequential WRB04 cards.

## Validation and report

Inspect current tests and `validation/capability-map.json` before deciding whether proof needs modification or addition. Run the build, focused determination/lifecycle tests, capability-map integrity test, exact-path work-item validation-plan preview and work-item profile, and `git diff --check`, as required by the active validation workflow. Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-03A_IMPLEMENTER_REPORT.md`; distinguish reused, modified, and new tests with a coverage-gap reason for each new test.

Commit this card before opening WRB04-03B. Suggested commit: `WRB04-03A add bounded test lifecycle determination`.
