# WRB04-02 — Normalize Work Item Planning, Implementer Execution, and Implementation Checkpoints

**Depends on:** WRB04-01 checkpoint  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Move one eligible canonical WorkItem from the shared map through bounded execution-contract planning, Implementer execution, canonical ImplementationRecord, and source checkpoint.

Feature and Issue use the same service and workspace contracts.

## 1. Work Item execution-contract planning

Reuse useful existing Work Card Architect UX/mechanics, but re-key ownership on exact Workflow ID + canonical WorkItem ID.

The accepted WRB03 WorkItem/Criteria remain authoritative.

The Work Item execution-contract step may:
- elaborate implementation boundaries;
- identify affected files/services/contracts;
- specify focused proof intent;
- decompose an oversized WorkItem when evidence requires it.

Do not create a second route/Plan engine.

Human-readable Work Card Markdown is a handoff projection/evidence document, not WorkItem identity.

## 2. Typed decomposition

If decomposition is accepted:
- use typed SPS command(s);
- children remain inside the same exact Workflow;
- preserve/redistribute Criteria explicitly;
- preserve dependencies;
- prohibit cycles and cross-Workflow links;
- parent becomes a container/non-executable state as appropriate;
- no silent loss of acceptance obligations.

Do not manufacture Phases for every decomposition.

## 3. Implementer context

Adapt the existing Codex/App Server Implementer runtime to accept exact:
- workflowId;
- workItemId;
- source checkout identity when applicable;
- current exact source revision;
- WorkItem objective/Criteria;
- accepted BoundedSolution/Phase context;
- bounded Work Card handoff;
- allowed execution tooling/model selection.

Do not derive context from WorkIntake branch, routed plan Markdown, Issue Fix Card alias, or whichever checkout is active.

## 4. Implementation-local proof

Implementer may create temporary/local proof required to complete the bounded work.

Mark/classify such proof as implementation-local unless existing durable catalog entries are intentionally reused.

Do not automatically add every Implementer test to the permanent ValidationCatalog.

Implementer report must describe:
- summary;
- deviations;
- blockers;
- residual risks;
- implementation-local proof used;
- changed-path evidence available to Tester.

## 5. Canonical ImplementationRecord

After successful execution:
- record one immutable ImplementationRecord for the exact WorkItem/execution attempt;
- preserve multiple attempts instead of overwriting;
- failures/partial results remain historical attempts;
- execution identity cannot be reused with conflicting semantic content.

A successful attempt does not close the WorkItem. Tester/Validator remain downstream.

## 6. Implementation source checkpoint

For source-backed implementation:
- use the existing structured checkpoint machinery after successful implementation;
- verify WorkItem belongs to exact current Workflow;
- checkpoint only attributable changes under application-owned Git mechanics;
- advance SourceBinding currentRevisionId exactly;
- retain exact ImplementationRecord ↔ SourceCheckpoint evidence.

The Implementer does not commit/push/merge on its own authority.

For source-neutral/no-source WorkItems, checkpoint state may be not-required.

## 7. Permanent proof

Prove:
- same execution service handles Feature and Issue WorkItems;
- exact WorkItem ID drives context;
- same-title WorkItems do not collide;
- dependency-ineligible WorkItem cannot start;
- decomposition remains same-Workflow and acyclic;
- successful execution records immutable ImplementationRecord;
- repeated/conflicting execution identity fails safely;
- source-backed implementation materializes once then checkpoints exact revision;
- non-source/source-neutral implementation records no Git checkpoint;
- Implementer-created proof is not automatically permanent;
- no route-owned/private Issue execution adapter is used by the new path.

## Non-scope

Tester permanent-suite judgment, final Validation, Repair loop, Phase closure, Workflow completion, integration, and final UI convergence are later cards.

## Validation

Run build; shared execution + WorkItem planning tests; Codex adapter focused tests; structured checkpoint/source tests; exact same-Workflow decomposition proof; validation-plan preview; `git diff --check`.

Avoid broad old Work Card lifecycle suites whose only authority is replaced Markdown state.

## Report/checkpoint

Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-02_IMPLEMENTER_REPORT.md`.

Suggested commit: `WRB04-02 normalize Work Item implementation and checkpoint`.

Then proceed directly to WRB04-03.
