# WIR01 — Establish Work Route Contracts and Registry

**Order:** 1 of 23  
**Depends on:** None  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR01_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- `src/shared/workflowHubContracts.ts` currently exposes only `development | issue-resolution`.
- `src/shared/workspaceContracts.ts` has Project Intake contracts but no universal Work Intake routing contract.

At card start, re-verify repository state and every dependency report. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Create one shared semantic contract for Work Intake routes, route traits, Architect recommendation, Operator route decision, reroute state, and profile registration. No persistence, UI, Git, or planning orchestration.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR01
→ focused validation
→ write WIR01 report
→ checkpoint commit
→ read WIR02 from repository
```

## Required Changes

1. Add the seven canonical `WorkRouteId` values and deterministic registry metadata.
2. Define route traits, advisory Architect route assessment, Operator route decision, and reroute recommendation contracts.
3. Keep `WorkRouteId` distinct from `WorkflowId`, Workspace identity, and `PlanTopology`.
4. Expose shared contracts usable by main/preload/renderer/planning without Electron ownership.

## Preserved Behavior

- Current Development and Issue Workflow Hub contracts continue to compile.
- No Project Intake, Issue, or Work Card runtime behavior changes.

## In-Scope Surface to Inspect

- `src/shared/workflowHubContracts.ts`
- `src/shared/workspaceContracts.ts`
- `new shared Work Intake routing contract module`
- `test/renderer/workflow-hub-shell.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Registry exposes exactly seven canonical routes with deterministic metadata.
2. Architect recommendation and Operator-selected route are separate types/state.
3. Reroute can reference prior/replacement route without replacing Intake identity.
4. Existing focused workflow-hub/project-intake proof remains green.

## Negative Constraints

- No persistence or renderer navigation changes.
- No generic maintenance route.
- No hidden route inference.
- No Git mutation.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/renderer/workflow-hub-shell.test.cjs test/project-intake/project-intake-service.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR01_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None; contract-only card.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR02` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
