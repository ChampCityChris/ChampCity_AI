# WIR12 — Implement Infrastructure / Platform Change Planning Profile

**Order:** 12 of 23  
**Depends on:** `WIR07`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR12_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- Architecture requires current/target topology, provisioning, rollback, networking/access, observability/recovery, and operational acceptance.
- Existing development-environment services/tests provide relevant evidence but are not themselves the route.

At card start, re-verify repository state and every dependency report. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Create operational planning for deployment, host, runtime environment, networking, packaging, and platform changes.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR12
→ focused validation
→ write WIR12 report
→ checkpoint commit
→ read WIR13 from repository
```

## Required Changes

1. Define profile evidence/output for topology, environment ownership, install/provision/update/rollback, networking/access, observability/recovery, compatibility.
2. Require operational acceptance/recovery conditions.
3. Allow direct/phased topology based on rollout/cutover boundaries.
4. Keep product features out unless required by platform change.

## Preserved Behavior

- Current development-environment behavior.
- Shared planning kernel.
- No actual host provisioning.

## In-Scope Surface to Inspect

- `planning profile registry/kernel`
- `development-environment architecture evidence`
- `test/development-environment/development-environment-preflight-service.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Infrastructure route produces operational topology/rollout planning.
2. Rollback/recovery/ownership explicit.
3. Feature work not silently bundled.
4. Topology independent.

## Negative Constraints

- No system provisioning.
- No packaging/release change.
- No custom executor.
- No Git mutation.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/development-environment/development-environment-preflight-service.test.cjs test/project-planning/project-planning-service.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR12_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR13` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
