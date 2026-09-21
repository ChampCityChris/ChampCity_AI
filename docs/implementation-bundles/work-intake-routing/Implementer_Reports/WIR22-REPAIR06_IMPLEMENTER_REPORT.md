# WIR22-REPAIR06 Implementer Report

Repair Card: **WIR22-REPAIR06 — Wire Routed Completion to Machine-Owned Git and Integration Services**.

**Implementation complete; focused production-path proof passed. Remaining combined regression stopped under explicit Operator direction to skip testing.** The earlier blocked report is preserved in repository history at the REPAIR06B checkpoint. Its missing policy dependencies are now implemented.

## Repository and dependencies

Verified the approved repository and Git top-level as `<PROJECT_REPO>`. Starting repair checkpoint: `87cc8c9687806c9ff52bfd281f1635dc69e012be` (REPAIR06B), on `codex/work-intake-routing-finish`. REPAIR06A exists in the earlier consolidation checkpoint; REPAIR05's completion loader and REPAIR06B's policy provider were re-inspected. `origin` is configured; the repair branch has no upstream. No fetch or remote freshness claim. Independent documentation commits `b96fc27` and `795e7f0` occurred during this pass and were preserved without attributing them to this repair.

Read the current card, required dependency evidence, existing checkpoint/executor, routed execution binding and lifecycle, Codex session/context/readiness path, integration owners, source-control service, relevant tests and capability-map ownership. Later cards remain unopened.

The Operator authorizes bounded checkpoints, completion of the remaining chain without routine review stops, and a final merge into `dev` after WIR23. One bounded implementation checkpoint is authorized after this report; the final merge remains after the remaining sequence.

## Confirmed defect and implementation

The routed lifecycle resolves correct Work Item artifacts but the shared Codex service still selected Development through the legacy current-workspace projection. Integration factories also lacked an application caller that connected current Plan completion and source-checkpoint evidence to candidate/Repair operations.

- Added application-owned routed selection to the existing Codex service. It resolves the current eligible Intake/Plan/Work Item through the repaired lifecycle, uses exact Formal/Repair and report paths, retains Plan identity/revision and root Work Item identity, and rechecks context after preflight.
- Reused `captureWorkItemCheckpoint`, worker file-change attribution, and `completePlanWorkItemSource`. Routed Repair checkpoint identity resolves to its root Work Item; existing Issue and legacy behavior retain their prior paths. No alternate commit mechanism was added.
- Added a routed application composition service using the production Codex singleton by default and the existing execution and integration services.
- Added a service-owned integration projection and current-checkpoint verification. Only complete fresh Plan evidence and matching Work Item contract/checkpoint lineage can reach integration. Checkpoints do not supply validation or close acceptance.
- Composed the target-owned validation and repair policy providers with the existing integration candidate service. Clean candidates advance through that service; conflict and validation failures reach the existing Integration Repair controller. Source patches, retry, Operator decisions and target advancement retain existing owners.
- Added bounded receipt inventory and validation retry entry points to the existing candidate owner. No parallel workflow state, renderer Git authority or execution engine was introduced.

A focused run exposed the direct-Plan representation mismatch in final report readiness: the routed projection uses an absent Phase while the existing Codex model uses null. Their comparison now normalizes absence; it does not manufacture a Phase.

## Attributable files

Created:

- `src/main/planExecution/routedImplementerContext.ts`
- `src/main/planExecution/routedDevelopmentApplicationService.ts`
- `src/main/planExecution/routedIntegrationService.ts`
- `src/shared/routedIntegrationContracts.ts`

Modified:

- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/planExecution/workItemCheckpointService.ts`
- `src/main/planExecution/integrationCandidateService.ts`
- `test/characterization/desktop-development-lifecycle.test.cjs`
- `test/support/work-intake-fixtures.cjs`
- This Implementer Report.

Deleted: none. Intentionally not created: new Git shell path, alternate execution engine, synthetic Phase, renderer authority, workflow sidecars, dependency changes, migrations, or UI cutover.

## Validation and evidence

The existing Git-boundary and Codex suites are reused. The lifecycle suite is extended with a materially distinct routed application composition scenario: controlled Codex transport events feed the real source checkpoint, real Work Item validation/close and Plan acceptance, then target-policy npm validation and clean/conflicted integration. The shared fixture permits repository policy setup before Intake branch creation. No production policy callbacks are injected. Model output is a controlled boundary; no live external model acceptance is claimed. No tests are consolidated or retired.

| Exact command | Lane | Observed result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows, static | Intermediate type errors corrected (nullable direct-Plan Phase and shared context comparison); latest exit 0. |
| `npm run build` | Normal Windows, static/build | Exit 0 on initial and corrected builds; 1658 renderer modules. Uses the previously established normal lane after sandbox EPERM. |
| `node --test --test-concurrency=1 --test-name-pattern='routed application checkpoints' test/characterization/desktop-development-lifecycle.test.cjs` | Normal Windows, focused production-path debugging | Exit 1; three reported tests failed (two cases plus parent); 630416.3721 ms. Both model runs completed, but final report readiness blocked checkpointing on the direct-Plan Phase representation mismatch. |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern='routed application checkpoints' test/characterization/desktop-development-lifecycle.test.cjs` | Normal Windows, corrected focused debugging | Exit 0; 3/3 tests passed, no skips; 2184020.4603 ms. Clean case 820196.0241 ms, conflicted case 1363357.6541 ms. |
| `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs test/characterization/desktop-development-lifecycle.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs` | Required normal Windows regression | Interrupted with exit 1 solely on explicit Operator direction to skip testing. All emitted cases passed, including the complete Git-boundary suite and clean routed case (864429.6847 ms), with stale-Plan and checkpoint-separation assertions. No combined-suite pass claimed. |
| `git diff --check` | Restricted Windows, hygiene | Exit 0. |

The corrected clean-target case passed through a real routed `WI01: source checkpoint`, durable validation/close, Plan acceptance, target-policy validation, integration and service recreation. The conflicted case also passed through production repair-policy resolution, rejection of an unapproved patch, bounded semantic repair, configured validation and target advancement. The combined required regression was interrupted during the second routed case when the Operator explicitly directed skipping tests. Its unfinished cases are unverified in that run. Full repository regression is reserved for WIR23. No launch, packaging, visual acceptance, live external integration or final product acceptance is claimed. Further test execution is skipped under current Operator direction.

## Safety, checkpoint and next task

No source-repository Git mutation during this card so far. Fixture Git operations are confined to disposable repositories. Unrelated concurrent changes remain preserved. Runtime source stays under `src`, tests under `test`; authored durable artifacts use repository-relative paths. The 10 attributable files passed bounded secret/local-path/generated-artifact inspection and diff whitespace checks; exact staged-diff review is performed immediately before the single checkpoint.

Checkpoint after the passing focused proof and Operator-directed waiver of remaining tests: `WIR22-REPAIR06: Wire Routed Completion to Machine-Owned Git and Integration Services`. Hash remains pending at report write time; report the actual hash after commit without amending solely to embed it.

Manual Operator validation: none for this card; final presentation and user-flow judgment remain WIR23. Next card after this bounded checkpoint: **WIR04-REPAIR01**.
