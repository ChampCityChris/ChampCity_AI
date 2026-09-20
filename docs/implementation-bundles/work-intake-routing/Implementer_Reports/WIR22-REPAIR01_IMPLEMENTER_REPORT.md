# WIR22-REPAIR01 Implementer Report

## Outcome and repository verification

Repair Card **WIR22-REPAIR01 — Establish Routed Development Execution Binding** passes focused automated acceptance. The checkpoint hash is pending the single harness commit containing this report and will be reported after verification.

- Verified the selected working directory and Git top-level as the approved `<PROJECT_REPO>` before edits.
- Starting branch: `repair/work-intake-routing-wir22`; starting HEAD: `bc3659bda3c2ff2407ca017bbf652e797ec91dcf`. Initial working tree and index were clean. `origin` is configured; this branch has no upstream. No remote operation occurred.
- Verified repair-package checkpoint `cd6bc62ce7f78a886297fdeeb8530b0707107710` and WIR21 checkpoint `45c04027705fb9beeffc8f78e5ce2887e63645c2` are ancestors. Only the manifest branch-baseline update separates the package checkpoint from starting HEAD.
- Read the manifest, repair plan/evidence/index, blocked WIR22 report, adopted architecture, creation standard, repository boundary, validation lanes, and current Repair Card. Re-inspected the current planning kernel/contracts, Issue binding pattern, Development adapter, Intake/route/branch services, canonical persistence, focused tests, and capability-map ownership. Dependency reports WIR07, WIR17, and WIR21 agree with current source. No later Repair Card was loaded.
- Preserved the failed WIR22 report unchanged. Its SHA-256 is `9cfb9399fb60ceedcb28a9deeee91f457ef22bda901be5f7e47256c9072b17e1c`.

## Confirmed defect and bounded correction

Approved non-Issue routed Plans had no durable execution binding. The existing Development adapter starts from legacy Phase/Work Card Plans; the Issue binding serves only Issue correction. This repair establishes only the missing binding boundary.

The new main-process service writes one canonical Markdown binding at `planning/work-intake/execution/<intakeId>/EXECUTION_PLAN.md`. It records exact Project/Intake/route decision/route/Plan identity, Plan revision and full-content SHA-256, the verified branch binding, and the approved topology with original Work Item and genuine Phase identities, dependencies, and criteria. Direct Plans retain no Phase fields. The service does not create legacy planning artifacts.

Activation requires the current approved Plan through the existing kernel and verifies the current Intake branch through the existing source-control service. The reader rechecks current planning state, recursive source revisions/digests/disposition/supersession, the frozen activation head's checkpoint lineage, and evidence bytes across asynchronous branch verification. Research closure without an implementation Plan and the Issue route cannot activate this binding.

Repeated activation of an unchanged binding is byte-idempotent. The existing write-once canonical writer prevents replacement. A changed Plan, different binding identity/topology/branch, or competing Intake-bound legacy execution fails visibly. Unrelated legacy Project Phases remain outside this binding and are not modified. The existing route supersession traversal can find the binding through its explicit Plan source and Intake lineage.

## Attributable files

Created:

- `src/shared/routedDevelopmentExecutionContracts.ts`
- `src/main/planExecution/routedDevelopmentExecutionBinding.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR01_IMPLEMENTER_REPORT.md`

Modified:

- `test/project-planning/project-planning-service.test.cjs`

Deleted: none. Intentionally not created or modified: Work Card planning/intake, validation/Repair/close, renderer/IPC, Git integration, Issue execution, legacy Development behavior, dependencies, migrations, JSON sidecars, and service/browser refactor work.

## Validation and acceptance evidence

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0; final source |
| `npm run build` | Approved normal Windows | Exit 0; final source |
| `node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/characterization/desktop-project-repository-binding.test.cjs` | Approved normal Windows | Exit 0; 32 passed, none failed/skipped |
| `node --test --test-concurrency=1 --test-name-pattern='routed Development binding' test/project-planning/project-planning-service.test.cjs` | Approved normal Windows | Exit 0; 4 passed, none failed/skipped; final source |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

Build and fixture tests use the normal Windows lane established by the prior dependency reports' recorded restricted `spawn EPERM`; no restricted retry was needed. The first required run began before a final asynchronous binding-byte guard was added, so a separate final-source focused rerun covers that addition.

Test categories: existing repository-binding characterization and existing planning cases reused unchanged except the research closure case, extended to prove activation rejection. One new permanent lifecycle family in the existing Project Planning suite covers the previously absent durable routed execution binding: direct/phased round-trip, simultaneous/repeated activation, source and binding tampering, conflicting legacy ownership, supersession, wrong branch, and Issue rejection. No test file, consolidation, retirement, or capability-map changes. The new family addresses a distinct persistence/freshness boundary that the prior planning and legacy execution tests did not exercise.

These are production-service and repository capability checks. No renderer launch, visual judgment, external integration, packaging, or full regression is claimed. Those are outside this repair; bundle-wide regression remains WIR23. Manual validation for this Repair Card: none.

## Git, safety, and return to workflow

The supplied ChampCity harness confirms workspace `champcity_ai` resolves to the selected repository, branch, and expected HEAD. Shell Git is read-only. Exact four-file staged diff inspected; `git diff --cached --check` and the bounded staged secret/local-path/generated-artifact scan passed with no findings. Harness `pre_commit_scan` succeeded with only eight unchanged, unstaged baseline branding PNG notices. Checkpoint staging/commit use only the supplied harness. The final report update is re-staged and rechecked before committing.

Intended single checkpoint message: `WIR22-REPAIR01: Establish Routed Development Execution Binding`. Record the actual hash after the checkpoint; do not amend merely to place the hash in this report. No merge, push, tag, release, publication, history rewrite, or integration is in scope.

After this repair passes and its single checkpoint is verified, read WIR22-REPAIR02. No material product/architecture deviation has been identified.
