# WIR14 — Integrate Issue Resolution with Universal Work Intake Routing

**Order:** 14 of 23  
**Depends on:** `WIR06`, `WIR07`  
**Governing architecture:** `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR14_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- Governing architecture is `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` (bundle planning SHA-256 `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`). Re-read it at card start and stop on material contradiction.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires verified evidence, bounded scope, focused proof, explicit preservation/constraints, and an Implementer Report.
- At bundle-authoring time unrelated WC02/test-governance changes were present in the working tree. Re-verify the execution baseline and do not modify or attribute unrelated pre-existing changes to this card.
- `src/main/issueResolution/issueResolutionService.ts` owns Issue discovery through close and includes `Reframe to Development/Feature`.
- `test/characterization/desktop-issue-lifecycle.test.cjs` preserves current Issue behavior.
- Architecture says Issue owns RCA, not a private execution topology.

At card start, re-verify repository state and dependency reports. Stop on dependency failure or material mismatch rather than redesigning around it.

## Objective

Make Issue Resolution a routed RCA path entered from universal Work Intake, replace its special reframe mechanism with general rerouting, and allow RCA to produce direct or phased correction planning.

## Runtime / Workflow Sequence

```text
verify dependencies/current source
→ implement only WIR14
→ focused validation
→ write WIR14 report
→ checkpoint commit
→ read WIR15 from repository
```

## Required Changes

1. Add Work Intake → Issue Resolution handoff preserving Intake identity/evidence/branch binding.
2. Map current reframe recommendation onto WIR06 general reroute semantics.
3. Preserve current evidence gathering, Architect investigation, root-cause, and bounded-solution semantics.
4. Change post-RCA planning so correction may recommend direct or phased topology through WIR07.
5. Leave actual generic correction execution for WIR18.

## Preserved Behavior

- Issue screenshots/evidence/RCA.
- Current Issue close/validation behavior until WIR18.
- Operator route authority.

## In-Scope Surface to Inspect

- `src/main/issueResolution/issueResolutionService.ts`
- `src/shared/issueResolutionContracts.ts`
- `Issue renderer workspaces`
- `WIR routing/planning services`
- `test/issue-resolution/issue-resolution-service.test.cjs`
- `test/issue-resolution/issue-architect-planning-service.test.cjs`
- `test/characterization/desktop-issue-lifecycle.test.cjs`

The list is an inspection boundary, not permission for unrelated cleanup.

## Risks and Constraints

- Keep this card to one coherent outcome; stop and report if the objective itself requires further decomposition.
- Reuse current application services/mechanics when they already own the behavior.
- Preserve source-revision/freshness and fail-closed behavior on affected workflow paths.
- Later uploaded cards are future context, not authority to implement their scope early.
- Source-control checkpoint rule: after this card's implementation, required validation, and Implementer Report pass, create exactly one checkpoint commit containing only this card's attributable changes and report, using the source-control capability supplied by the execution harness. Do not merge, tag, release, or integrate the bundle branch during an individual card. Do not invent or bypass the harness source-control mechanism. Any card-specific `No Git mutation`/`No Git changes` constraint refers to product/workflow scope inside the card and does not cancel this mandatory checkpoint commit.

## Acceptance Criteria

1. Defect Work Intake can route into Issue Resolution.
2. Existing Reframe becomes general reroute recommendation.
3. RCA may recommend phased correction when root cause requires milestones.
4. Simple Issue path remains representable.

## Negative Constraints

- No broad RCA rewrite.
- No generic correction executor yet.
- No forced Phases.
- No Git mutation.

## Validation

Inspect existing tests and `validation/capability-map.json` if present. Prefer reuse → extend → explicitly authorized consolidation → new permanent test. New tests require a specific uncovered behavior/boundary/failure-mode/contract justification.

Minimum commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/issue-resolution/issue-resolution-service.test.cjs test/issue-resolution/issue-architect-planning-service.test.cjs test/characterization/desktop-issue-lifecycle.test.cjs`

Do not run the full suite unless listed; WIR23 owns bundle-wide full regression.

## Implementer Report Requirements

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR14_IMPLEMENTER_REPORT.md` before opening the next card. Include baseline/dependency verification, files changed, implementation summary, acceptance proof, exact commands/results, deviations/blockers/residual risk, the intended checkpoint commit message and attributable changed-file set for this card, plus test categories: reused unchanged; modified/extended; consolidated if authorized; retired if authorized; new permanent tests with coverage-gap justification.

## Manual Validation

None.

## Post-Implementation Path

If implementation and required validation pass, write the Implementer Report, create the single card checkpoint commit through the execution harness, verify the checkpoint succeeded, then read `WIR15` from the repository and continue without card-local Operator approval. Do not preload later cards. Stop only for a real blocker or unrecoverable required acceptance failure.
