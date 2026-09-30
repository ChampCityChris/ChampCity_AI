# WRB04-02 — Canonical WorkItem Execution Contract and Attempt State

**Revision:** 3 — split from the exact runtime architecture specification
**Depends on:** WRB04-01 checkpoint `ae6eb789f829e2c7320827eb24767709cc458bcd`
**Implementer:** GPT 6.0 Luna Medium

## Objective

Give one exact eligible Feature or Issue WorkItem an application-owned execution contract and typed attempt lifecycle. This card establishes canonical state and its service-level proof only. It does not launch Codex or mutate source.

## Architecture

Use `createWorkflowExecutionApplicationService` as the exact Current Project → Workflow → WorkItem authority. WorkItem ID is canonical; titles and Markdown are display/evidence only. Feature and Issue use the same service. Do not create another plan engine or change accepted WRB03 WorkItem/Criteria.

The execution contract is a bounded projection over the accepted Workflow plan: exact project/workflow/workItem IDs and WorkItem record version, accepted BoundedSolution, optional Phase, exact Criteria, dependencies, solution scope/constraints, affected paths, focused proof intent, source mutation requirement, and current source revision. Issue a deterministic contract digest. Contract creation must reject ineligible WorkItems, missing/ambiguous solution ownership, and source-required work without a prepared source binding; source-neutral work must not fabricate one.

Add typed `beginWorkItemAttempt` and `finishWorkItemAttempt` commands to Project State. Begin must verify the unique current Feature/Issue Workflow, exact WorkItem membership and version, execution eligibility/dependencies, and unused application-issued execution reference before moving `planned|ready → in_progress`. Finish creates one immutable ImplementationRecord for that execution reference and moves the WorkItem to `validation_pending` for `implemented`, `blocked` for `blocked`, or `ready` for retryable `partial|failed|abandoned`. Successful implementation does not close the WorkItem. Reuse of an execution reference with different content must fail.

## In scope

- Shared execution-contract type and exact contract projection service.
- Typed begin/finish Project State commands and focused service tests.
- Preserve attempts as append-only ImplementationRecords; preserve same-title WorkItems by exact ID.
- No UI, renderer, Codex/App Server session, decomposition, repository checkout, Git checkpoint, Tester, Validator, Repair, or completion workflow changes.

## Acceptance

1. Feature and Issue WorkItems use the same contract service and expose exact IDs, accepted Criteria, solution/phase context, dependencies, source requirement, and deterministic digest.
2. Same-title WorkItems yield distinct contracts by canonical ID.
3. Ineligible/dependency-blocked, stale, cross-Workflow, or non-current WorkItems cannot begin.
4. Begin uses typed state transition and returns an application-issued execution reference.
5. Finish records immutable attempts and applies the specified state transition without closing the WorkItem.
6. Conflicting execution-reference reuse fails; multiple distinct attempts remain queryable.
7. Source-neutral WorkItems do not create SourceBinding, RepositoryCheckout, or Git evidence.
8. Existing WRB04-01 projection and lazy source behavior remain intact.

## Validation

Run the build, `test/project-state/execution-completion.test.cjs`, `test/workflow/workflow-execution-application-service.test.cjs`, exact validation-plan preview for changed paths, and `git diff --check`. Use the work-item profile for the exact changed-path set. Report unrelated failures separately.

Before adding permanent tests, inspect existing coverage and the capability map. Any new permanent test must name the specific uncovered behavior it proves.

## Report and checkpoint

Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-02_IMPLEMENTER_REPORT.md`.

Commit: `WRB04-02 add exact WorkItem contract and attempt lifecycle`.

After this card is committed, proceed to WRB04-02B.
