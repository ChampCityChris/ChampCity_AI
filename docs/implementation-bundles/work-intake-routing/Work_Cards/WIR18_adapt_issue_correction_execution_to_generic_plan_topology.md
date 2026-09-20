# WIR18 — Adapt Issue Correction Execution to Generic Plan Topology

**Order:** 18 of 23  
**Depends on:** `WIR14`, `WIR16`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR18_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- Current Issue service combines RCA, planning, Fix, validation, Repair, close.
- WIR14 now yields correction Plan topology.
- WIR16 supplies generic execution and current Issue characterization preserves expected behavior.

At card start, re-verify repository state and dependency reports. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Keep Issue investigation/RCA bespoke while moving post-RCA correction implementation onto the same generic direct/phased Plan executor as Development.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR18
→ focused validation
→ write WIR18 report
→ checkpoint commit
→ read WIR19 from repository
```

## Required Changes

1. Adapt current Fix/Repair correction semantics into generic Work Item execution without changing RCA ownership.
2. Support simple Issue→direct correction and complex Issue→phased correction.
3. Preserve validation/Repair/close evidence semantics where valid.
4. Remove only Issue-specific progression superseded by generic executor.
5. Keep Issue vocabulary/presentation as projection if useful, not as separate executor.

## Preserved Behavior

- Issue evidence/RCA.
- Current simple Fix/Repair behavior.
- Current Issue characterization unless intentionally superseded by phased support.

## In-Scope Surface to Inspect

- `src/main/issueResolution/issueResolutionService.ts`
- `Issue fix/validation/close services/workspaces`
- `generic Plan executor`
- `test/characterization/desktop-issue-lifecycle.test.cjs`
- `test/issue-resolution/issue-fix-card-service.test.cjs`
- `test/issue-resolution/issue-validation-service.test.cjs`
- `test/issue-resolution/issue-close-service.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Simple Issue correction executes direct.
2. Complex Issue correction can execute across Phases.
3. RCA remains distinct from generic execution.
4. Existing Fix/Repair/close scenarios remain valid.

## Negative Constraints

- Do not genericize away RCA.
- Do not force Issue into Development presentation.
- No Git checkpoints yet.
- No release behavior.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/characterization/desktop-issue-lifecycle.test.cjs test/issue-resolution/issue-fix-card-service.test.cjs test/issue-resolution/issue-validation-service.test.cjs test/issue-resolution/issue-close-service.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR18_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR19` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
