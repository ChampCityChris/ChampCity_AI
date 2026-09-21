# TVA02A Implementer Report

## Scope, repository, and Git

Work Card TVA02A. Verified the isolated worktree belongs to the approved ChampCity_AI repository using `git rev-parse --show-toplevel`. Branch `codex/test-execution-architecture` was created from local `dev` at `05eef38`; origin/dev was 45 commits behind local dev at initialization. No fetch or push. Operator direction authorizes the branch/worktree and final merge into dev. No staging, commit, or merge yet; final commit hash is pending final staged review. The original checkout was not changed by this implementation.

## Implementation and file disposition

Modified production files: `src/main/planExecution/routedDevelopmentExecutionService.ts`, `integrationPolicyProvider.ts`, `integrationRepairPolicyProvider.ts`; `src/main/phaseClose/routedExecutionAcceptance.ts`; `src/main/workCardLoop/workItemArtifactScope.ts`; `src/main/workCardIntake/workCardIntakeService.ts`; `src/main/workCardBuilding/workCardBuildingReviewService.ts`.

Routed reads create one PlanningProjectionContext after verifying the durable binding and reuse it for document inventory, freshness, work-item and repair evidence, and completion acceptance. Binding-aware scope resolution avoids rereading the binding for each phase. Contexts are local to an action; mutations do not install a cross-action cache. Literal boolean overloads on draft/repairDraft resolve the pre-existing inferred-union build failure documented in TVA01 without changing runtime behavior.

The registered npm runner remains the production default. A trusted main-process provider argument permits a deterministic test runner; no renderer or model command route was added. The repair provider retains real immutable-policy, ownership, changed-path, digest, and freshness checks. Its pure editable-path derivation now has a separately callable boundary for exhaustive scope cases.

Created these executable files:

- `test/agent-harness/integration-npm-adapter.test.cjs`: real process, script identity, cwd, hostile npm settings, failure sanitization, output ceiling, and timeout/descendant conformance.
- `test/agent-harness/integration-policy-semantics.test.cjs`: policy schema and eight identity/transition/recreation/staleness scenarios with an in-process runner.
- `test/agent-harness/integration-candidate-semantics.test.cjs`: relocated seven candidate state/integrity scenarios.
- `test/agent-harness/integration-repair-provider.test.cjs`: real provider conformance and pure protected-path/boundary cases.
- `test/agent-harness/integration-repair-controller.test.cjs`: retry ownership, digest/path disposition, governing intent, attempt bounds and Operator decisions with a narrow provider.
- `test/agent-harness/integration-repair-source-semantics.test.cjs`: three retained real repair Git/index/retry scenarios using narrowed source-control composition.
- `test/characterization/routed-integration-focus.test.cjs`: ordinary clean/conflicted integration from valid completed/checkpointed state.
- `test/characterization/routed-lifecycle-acceptance.test.cjs`: one full conflicted routed lifecycle with real application composition, npm and Integration Repair.

Modified `test/agent-harness/git-mutation-boundary.test.cjs` and `test/characterization/desktop-development-lifecycle.test.cjs` to remove relocated ownership. Added the large-fixture structural contract to `test/work-card-planning/work-card-planning-service.test.cjs`. Created test support modules `completed-routed-plan.cjs`, `execution-metrics.cjs`, `integration-scenarios.cjs`, and `integration-semantics.cjs`. Added the curated 14-file `test/fixtures/routed-completed/` boundary (13 canonical Markdown records and one fixture manifest). Hydration recomputes current lineage and digests and creates a valid application checkpoint; it does not replay predecessor actions. Production does not import test support.

Modified the catalog, shared schema validator, planner and validation-runner tests. Catalog schema 2 adds an explicit optional profile restriction for the full lifecycle test. Ordinary integration selects all decomposed behavior owners; phase-close/release/full profiles additionally select the complementary lifecycle proof. No second test list or duplicate behavior identifier was introduced. This report is new. No dependency, JSON workflow sidecar, generated build output, migration, or production logging was added. No source file deleted.

## Structural before/after evidence

A focused test-only measurement driver used the existing planning snapshot hooks and process interception against real routed fixtures, each with 150 extra planning documents. Measurements below are milliseconds. Each entry is `acquisitions/inventory scans; bounded Git; duration`. npm and checkout counts were zero in every listed stage.

| Work Items | Stage | Before | After |
| --- | --- | --- | --- |
| 1 | query | 5/5; 204; 14681 | 1/1; 102; 6315 |
| 1 | read-only draft precondition | 5/5; 204; 14960 | 1/1; 102; 6698 |
| 1 | begin mutation | 6/6; 204; 13696 | 1/1; 102; 6676 |
| 1 | independent post-write query | 6/6; 204; 13204 | 1/1; 102; 6474 |
| 10 | query | 32/32; 204; 13805 | 1/1; 102; 7296 |
| 10 | read-only draft precondition | 32/32; 204; 15536 | 1/1; 102; 6850 |
| 10 | begin mutation | 33/33; 204; 15140 | 1/1; 102; 6812 |
| 10 | independent post-write query | 33/33; 204; 15137 | 1/1; 102; 6516 |

The begin action returns a handoff, not a post-write projection: one pre-write scan plus one later query scan is intentional. The permanent structural test isolates binding verification and expands from 1 to 40 Work Items and 10 to 400 documents; query and draft precondition remain exactly one acquisition/scan. A same-revision byte edit changes the next fingerprint, proving fresh bytes after mutation. The real measurement includes remaining binding verification Git costs rather than hiding them in the isolated asymptotic assertion.

## Focused performance and behavior evidence

All child-process commands below used the normal Windows execution lane with the installed toolchain and existing dependency junction. Every final result is exit 0 unless explicitly stated. Historical baseline durations are the measured reports supplied by the active card; the quarantined aggregate was not rerun to manufacture a new baseline.

| Proof | Before | After |
| --- | --- | --- |
| Original git boundary aggregate | WIR20 209.52 s; REPAIR06B 1117.39 s | Decomposed; aggregate intentionally not run |
| Routed clean/conflict focus | 2184.02 s total, clean 820.20 s, conflict 1363.36 s | 80.05 s total; clean 20.79 s, conflict 59.00 s; 3/3 |
| Full conflicted lifecycle | 1363.36 s | 740.16 s total; 2/2 before relocation |
| Target-policy semantics | Earlier recorded focus 207.63 s | 37.97 s; 10/10; 168 bounded Git, 0 npm |
| Real npm conformance | Previously mixed into policy matrix | 5.18 s; 1/1; 0 bounded Git, 4 npm |
| Real repair provider | Previously mixed into state matrix | 19.90 s; 1/1; 249 bounded Git, 0 npm |
| Repair controller semantics | Previously recreated full stack | 0.21 s initial / 0.128 s instrumented case; 1/1; 0 Git, 0 npm |
| Repair source semantics | Previously mixed into giant scenario matrix | 32.38 s; 4/4; 253 bounded Git, 0 npm |

The historical reports do not contain baseline aggregate process counts; those are unavailable, not zero. Direct before/after bounded-Git and snapshot counts above are measured. New npm counts are bounded to four adapter cases plus the explicit full lifecycle; policy/controller semantics invoke none. The initial counter counted only bounded-Git checkout creation and returned zero for fixture-created checkouts; that was an instrumentation limitation, not absence of worktrees. The revised helper also counts synchronous fixture Git. Ordinary focus creates two candidate checkouts, the policy matrix eight, and provider conformance one by construction; these structural counts are distinct from measured process counters.

Exact commands:

- `npm run build`: exit 0 after the owned draft overload fix; static/main/preload/shared/renderer build, no launch claim.
- `node --test --test-name-pattern='routed projection shares one fresh inventory' test/work-card-planning/work-card-planning-service.test.cjs`: exit 0, structural focus about 4.94 s.
- `node tmp/tva02a-counts.cjs`: exit 0 before and after the context change; ignored measurement driver, real fixtures, table above.
- `node --test test/characterization/routed-integration-focus.test.cjs`: exit 0, 3/3, 80049.84 ms.
- `node --test --test-name-pattern='routed application checkpoints source' test/characterization/desktop-development-lifecycle.test.cjs`: exit 0, 2/2, 740155.39 ms before moving the retained test to its own file.
- `node --test test/agent-harness/integration-npm-adapter.test.cjs test/agent-harness/integration-repair-controller.test.cjs test/agent-harness/integration-repair-provider.test.cjs`: exit 0, all three owners passed; measured file details above.
- `node --test test/agent-harness/integration-policy-semantics.test.cjs`: exit 0, 10/10, 37968 ms.
- `node --test test/agent-harness/integration-repair-source-semantics.test.cjs`: exit 0, 4/4, 32376.50 ms. An initial fixture lacked push support; corrected the fixture and reran this owner only.
- `node --test --test-name-pattern='routed phased eligibility retains genuine phase barriers' test/work-card-planning/work-card-planning-service.test.cjs`: exit 0, 1/1, 106080.81 ms; unchanged lineage/barrier behavior retained.
- `node --test --test-concurrency=1 test/validation/capability-map.test.cjs test/validation/validation-runner.test.cjs`: exit 0, 8/8, latest 1385.98 ms.
- `node --check` on changed test support, full acceptance and validation modules: exit 0; restricted static lane.
- Planner previews through `planValidation({profile:'integration-gate'})` and `planValidation({profile:'phase-close'})`: exit 0, plan only. Catalog mapping shows all seven decomposed integration owners and adds full lifecycle only to the wider profile.
- `git diff --check`: exit 0, read-only static review.

No `npm test`, test:full, whole-repository glob/profile, or complete legacy git-mutation-boundary file was executed. No external provider/network, packaging, UI launch or Operator visual acceptance claim. The relocation-only candidate matrix was not run wholesale; narrower affected semantic owners, the real-provider boundaries and retained production end-to-end path establish this card's change.

## Safety and remaining work

Curated fixture bytes use `<PROJECT_REPO>` and `<BASE_COMMIT>` placeholders; no concrete home/project/temp paths or secrets were found in the fixture scan. Runtime captures remain ignored under tmp and will not be staged. Tests use disposable synthetic repositories. No archive fixture or local workflow corpus was introduced.

Remaining focused hotspots above 30 seconds: target-policy 37.97 s, repair-source 32.38 s, ordinary conflicted composition 59.00 s (close to the 60-second limit), phase-lineage preservation 106.08 s, and the deliberate full acceptance path about 12 minutes. The required ordinary thresholds passed. Wider end-to-end cost remains explicit rather than hidden in routine clean/conflict proof. No Operator visual decision is needed for these deterministic assertions.

Final lifecycle stage telemetry and closure are recorded below.

Corrected checkout instrumentation rerun: `node --test --test-concurrency=1 test/agent-harness/integration-policy-semantics.test.cjs test/agent-harness/integration-repair-provider.test.cjs`, normal Windows, exit 0, 11/11, 57905.77 ms. Policy: 37915.69 ms, 168 bounded-Git calls, 186 intercepted synchronous fixture-Git calls, 0 npm, 8 checkouts. Provider: 19788.70 ms, 249 bounded-Git calls, 13 synchronous fixture-Git calls, 0 npm, 1 checkout. Synchronous counts cover intercepted helper calls; some fixture setup helpers captured Git before instrumentation. Bounded-Git and npm counts are complete for these owners. Catalog dependency flags and durations were reconciled with measured results; focused catalog/runner contracts passed 8/8, 1380.19 ms.

Final retained acceptance invocation: `node --test test/characterization/routed-lifecycle-acceptance.test.cjs`, normal Windows, exit 0, 2/2, 729638.48 ms (conflicted subcase 726581.58 ms). Per-stage durations and cumulative observed process counts:

| Stage | Duration ms | Bounded Git cumulative | npm cumulative | Candidate checkouts cumulative |
| --- | --- | --- | --- | --- |
| Routing/planning | 52938 | 766 | 0 | 0 |
| Formal contract | 66670 | 1790 | 0 | 0 |
| Implementation/checkpoint | 55722 | 2644 | 0 | 0 |
| Validation/close/Plan acceptance | 143363 | 4664 | 0 | 0 |
| Integration/repair | 410824 | 10870 | 1 | 1 |

This proves the retained full composition after relocation. The wider path still has substantial source-control verification cost; it remains visible and outside ordinary focused selection. The active card's four owned amplifications and required focus thresholds are resolved. TVA02A is complete; next card TVA02.
