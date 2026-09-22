# WIR23-REPAIR03A Implementer Report

## Scope and repository verification

- Card type and identifier: Repair Work Card `WIR23-REPAIR03A`.
- Approved repository root: verified at `<PROJECT_REPO>`.
- Branch: `dev`; remote: `origin` configured, with `dev` initially 12 commits ahead of `origin/dev`.
- Existing unrelated working-tree changes were preserved and excluded from this card's attributable set.

## Files created and modified

Created:

- `src/shared/integrationCompletionContracts.ts`
- `src/main/planExecution/researchCompletionService.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR03A_IMPLEMENTER_REPORT.md`

Modified:

- `src/shared/lifecycleEvidenceCheckpointContracts.ts`
- `src/main/planExecution/lifecycleEvidenceCheckpointService.ts`
- `src/main/planExecution/lifecycleEvidenceCheckpointReceipt.ts`
- `test/agent-harness/source-checkpoint-boundary.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`
- `test/support/work-intake-fixtures.cjs`
- `validation/capability-map.json` (mechanical count/duration refresh for the extended existing test owners)

Deleted: none. Intentionally not created: Plan, Work Item, Phase, routed-development binding, acceptance artifact, candidate record, JSON sidecar, migration, dependency, or Research-specific Git path.

## Implementation evidence

Research completion is represented as `IntegrationCompletionEvidence` with `kind`, `routeDecisionId`, `completionId`, `revision`, `fingerprint`, and `sourcePath`. The Research fingerprint is SHA-256 over the exact canonical approved Assessment bytes.

`resolveResearchCompletion()` requires the current selected `research-prototype` route, current non-stale Approved Assessment, exact Intake/route/Assessment identity, and `no-implementation-plan-required`. It returns the verified current Work Intake branch binding, completion evidence, Research lifecycle boundary, and exact checkpoint roots.

The Research checkpoint graph contains the Work Intake, current route decision, current route source assessment, Research Assessment, and recursively reached canonical ancestors. It is capped at 20 ordinary repository-contained Markdown files, rejects historical/cross-Intake evidence, and requires exact source revisions. Only the Assessment's direct route-decision edge permits revision drift, and only when the current route decision ID and selected Research route still match. The test fixture graph was:

- `planning/work-intake/PROJECT.md`
- current Work Intake
- current routing assessment
- current route decision
- current Research Assessment

The checkpoint rejects unrelated changes, wrong route identity, historical evidence, and `research-plan-required`. Its receipt uses the Assessment ID as subject and a deterministic code-point-sorted file inventory. No Plan, Work Item, Phase, or development binding is created.

## Validation

Canonical lane results:

1. `npm run typecheck` — installed local Windows toolchain; exit 0.
2. `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="research lifecycle checkpoint commits approved no-plan evidence" test/agent-harness/source-checkpoint-boundary.test.cjs` — normal Windows lane; exit 0; 1 passed.
3. `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="research closes durably on reviewed evidence" test/project-planning/project-planning-service.test.cjs` — normal Windows lane; exit 0; 1 passed.

Additional build evidence: the restricted `npm run build` attempt produced the documented `spawn EPERM`; the equivalent approved normal Windows lane then passed with exit 0. The final normal Windows `npm run build` also passed. Initial restricted Node test-runner attempts produced the same documented `spawn EPERM`; each required test was then run successfully in the normal Windows lane.

No full suite was run because the card explicitly prohibits it.

## Git, safety, and residual risk

- Intended commit message: `Implement WIR23 Research completion integration`.
- Git mutations before report creation: none. Actual commit hash is pending in this same-commit artifact and will be reported after commit; the report will not be amended solely to add it.
- Secret/credential scan: no credential material introduced.
- Durable local-path scan: attributable committed artifacts use repository-relative paths or `<PROJECT_REPO>`; no concrete local-machine path is recorded.
- Generated `dist/` output and dependency state are excluded from source control.
- Deviation/correction: Research exposed a pre-existing locale-sort versus receipt code-point-sort inconsistency; checkpoint inventory sorting was aligned with receipt validation. The planning fixture's deliberately failed draft was removed only after its failure behavior was asserted, so exact checkpoint containment remained intact.
- Remaining Operator validation: optional visual confirmation of the Research integration surface is residual experiential validation; deterministic card acceptance evidence is complete.
