# WSF20-REPAIR19 Implementer Report

Status: implemented; bounded proof passes; canonical repair profile has residual failures outside this repair. Await Architect code review and live Operator acceptance.

## Authority, repository and Git

- Active Repair Card: `WSF20-REPAIR19`, defects D45, D46 and D47; predecessor R18.
- Verified the approved repository root is `Dev/`, with its repository-local `AGENTS.md`, source, package manifest and Git administration. Read repository boundary and Windows validation-lane contracts before changes or validation.
- Branch: `dev`. Verified starting HEAD `f667a26f05fc619a61fddbc4bbd1f627cf3467a7`, exactly matching the card.
- Remote: `origin`, repository-configured GitHub URL; no fetch, push, merge, rebase, release action or branch/worktree change. The local pre-checkpoint branch was 330 commits ahead and zero behind the locally recorded `origin/dev`; remote freshness was not independently verified.
- Preserve the pre-existing untracked Forgejo/bootstrap, MPSI and WSF documents. Only the attributable files below enter the requested checkpoint.
- Required checkpoint message: `WSF20-R19 restore failed Implement revision and truthful navigation`. Commit hash: pending creation; report the actual hash in the handoff, without amending solely to insert it here.

## RCA and implementation

**D45:** The old renderer enabled Continue for any completed ImplementationAttempt, while the SQL resolver correctly retained Implement for an unsuccessful ready WorkItem. Continue now requires the exact SQL Review boundary, the latest matching successful ImplementationRecord, completed attempt, validation-pending WorkItem, and a committed checkpoint or a legitimate empty-path checkpoint-not-required contract. A completed partial/failed/abandoned ready result explains why Review/Tester is unavailable. Polling reads the SQL projection without advancing the parent presentation. Explicit Refresh catches read/navigation errors, reports success and reconciles parent navigation. Feedback/errors remain visible in the existing bounded tab body with either Implement or Context selected; they never create extra workspace grid cells. Start's surfaced R16 result remains preserved until explicit Refresh or subsequent authoritative execution evidence.

Checkpoint presentation uses error styling for blocked, success for committed, and a neutral palette for not-required. Other incomplete checkpoint states use warning styling.

**D46:** The existing SQL disposition was reachable from Planning/Repair but unavailable from canonical failed Implement. The new exact-context action requires an Operator revision reason and invokes `reviewStructuredWorkItemPlanning` with `revision_requested`, the exact IDs and record-version CAS. It refreshes canonical navigation into the existing Repair or ordinary Planning stage. Read-only inspection never becomes writable. A generation check prevents a delayed revision response from navigating a different WorkItem.

The planning save path already checked unsuccessful history, Tester/Validation/checkpoint conflicts and the clean unchanged SourceBinding revision. The typed planning-review path previously only recorded a disposition through its domain version/state guard; it did not apply those source/history checks. Extracted the existing execution-planning guard for reuse by the new derived revision eligibility and the typed review entrypoint. Reject live attempts and any prior successful implementation. Existing domain CAS and replacement-plan approval remain in place. This is an internal shared guard, not a new recovery service, schema, persisted model, IPC mutation or approval gate.

**D47:** The generic source-backed Implementer prompt now separates implementation-local checks from downstream Tester/Validator/integration proof. It identifies `champcity-source-integrity` as application-owned validation of registered isolated candidates, explains that a callable WorkItem npm/shell entrypoint is not expected, preserves truthful residual risk and semantic outcomes, and keeps required-mutation versus no-mutation checkpoint obligations explicit. No runner shim or validation authority was introduced.

## Attributable files

Modified production:

- `src/renderer/app/WorkCardImplementWorkspace.tsx`
- `src/renderer/app/WorkCardImplementShell.tsx`
- `src/renderer/app/GreenfieldStageComposition.tsx`
- `src/renderer/app/GreenfieldWorkspace.tsx`
- `src/renderer/styles.css`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workCardPlanning/structuredWorkItemPlanningService.ts`
- `src/main/workflow/workflowExecutionApplicationService.ts`

Extended existing test owners:

- `test/renderer/work-card-implement-workspace.test.cjs`
- `test/renderer/greenfield-shell-composition.test.cjs`
- `test/phase-planning/phase-planning-service.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`

Created this report at `docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR19_IMPLEMENTER_REPORT.md`. Deleted no source files. Intentionally created no schema, migration, dependency, runner shim, alternate Greenfield pipeline, production fixture, JSON workflow sidecar or live workflow artifact. Temporary change sets, diagnostics, baseline snapshots and receipts remain ignored under `tmp/`.

## Focused acceptance evidence

The extended existing source-backed Greenfield fixture begins with a real SQL Repair and a correct existing source file, conditional preserve-if-correct wording and a nonempty affected-path contract. The real bounded Codex adapter returns partial, the SQL attempt completes, the WorkItem becomes ready, and no SourceCheckpoint exists. Runtime failed status is kept distinct from SQL attempt completion.

- The actual renderer reads this SQL projection: Continue is disabled with the partial-result explanation; checkpoint is blocked; explicit Refresh reports success, reconciles Implement and produces no SQL mutation.
- Request Revision through the actual renderer and typed planning API records the exact disposition and enters canonical Repair Planning.
- Running-attempt review/save, stale version, dirty checkout and successful-result revision are refused. Renderer fixtures additionally cover peer identity, read-only inspection, prepared/running attempts, unsuccessful outcome variants and mismatched canonical Review identity.
- Existing candidate ingress submits the replacement empty-path contract; Start is unavailable until normal Operator approval.
- The next real Start owns a new reservation, emits a source-backed `sourceMutation=not-required` contract and read-only options, returns implemented, requires no checkpoint, and reaches SQL Review. Independent Tester contract/result creation succeeds at the unchanged source revision.
- HEAD and checkout remain unchanged; zero ghost checkpoints; original unsuccessful attempt and ImplementationRecord values and packet bytes remain identical.
- Successful committed and no-mutation renderer transitions are enabled only at exact canonical Review; one Continue action invokes canonical progression. Refresh read and parent-navigation failures are visible.
- Prompt assertions distinguish downstream application-owned proof from local implementation and preserve truthful outcomes and mutation obligations.

Existing R13/R16-R18 and strict mutation scope/checkpoint owner tests also passed in the composed profile; see counts below.

## Validation commands, lanes and receipts

Commands ran from `Dev/`. All child-process diagnostics after the one sandbox EPERM used the approved normal Windows lane. Redirected outputs are retained locally under ignored `tmp/` and summarized here; they are not durable workflow evidence or release receipts.

| Exact command | Lane / exit | Result |
| --- | --- | --- |
| `npm run test:repair -- --changes tmp/wsf20-r19-changes.json --preview` | restricted / 1, then 0 | Initial scope previews rejected two inferred capability names; corrected them from the catalog. Final scope preview includes all attributable paths and preserved Workflow, renderer and managed-source capabilities. |
| `npm run test:repair -- --changes tmp/wsf20-r19-changes.json` | restricted / 1 | Build spawn EPERM; no tests ran. Receipt `f76cd3b7-d550-4c03-a2f4-b91b647a7d51`. Recorded once and switched lanes. |
| `npm run test:repair -- --changes tmp/wsf20-r19-changes.json` | normal Windows / 1 | TypeScript rejected an assumed ImplementationRecord workflowId field. Corrected to exact projection lineage and owned WorkItem identity. Receipt `9afa212d-4921-4b0f-b723-c1a87a684de1`. |
| `npm run test:repair -- --changes tmp/wsf20-r19-changes.json` | normal Windows / 1 | Build passes; 98 selected files, 794 tests, 772 pass, 21 fail, 1 skip. Receipt `aa5b0534-bfa2-45e9-984d-d6e851c19a14`; source stable at the verified baseline with attributable dirty changes. 606321 ms; advisory repair budget is review-required. |
| `node --test test/renderer/work-card-implement-workspace.test.cjs` | normal Windows / 0 | Diagnostic: 8/8 pass. |
| `npm run build` | normal Windows / 0 | Final production TypeScript/Vite/assets pass after Context-tab feedback, generation check, stricter no-mutation eligibility and the final staged-review correction keeping status inside the bounded tab body. Existing bundle-size warning remains advisory. |
| `node --test test/renderer/work-card-implement-workspace.test.cjs test/renderer/greenfield-shell-composition.test.cjs` | normal Windows / 0 | Final renderer/composition proof: 18/18 pass, including Context-tab feedback and composition refresh dispatch. |
| `node --test --test-name-pattern="through failed Implement governed revision" test/phase-planning/phase-planning-service.test.cjs` | normal Windows / 0 final | Final real renderer/SQL failed-to-revision-to-no-mutation loop: 1/1 pass, 17188 ms process duration. Earlier diagnostic failures corrected fixture assumptions about runtime failed versus SQL completed and unordered entity enumeration; the final fixture uses the authoritative latest-attempt query. |
| `node --test test/agent-harness/integration-policy-semantics.test.cjs` | normal Windows / 0 | 11/11 pass; application-owned isolated source-integrity policy/runner ownership preserved. |
| `node --require ./tmp/wsf20-r19-baseline-preload.cjs --test --test-name-pattern="Feature source-backed vertical\|repo_toolbox and workspace-only git_toolbox\|reviewed Workflow planning graph normalizes atomically\|submodule and alternate metadata" test/source-control/workflow-integration-service.test.cjs test/agent-harness/repository-io-hardening.test.cjs test/project-state/execution-completion.test.cjs test/source-control/managed-project-source.test.cjs` | normal Windows / 1 | Baseline diagnostic: 5 selected assertions, 2 pass and 3 fail. Temporary preload supplies the three changed main owners from starting HEAD without changing source/Git; repository I/O and two source-neutral deterministic assertions reproduce. |
| `node --require ./tmp/wsf20-r19-baseline-preload.cjs --test --test-name-pattern="typed WorkItem decomposition preserves exact ownership\|same typed WorkItem decomposition command" test/project-state/execution-completion.test.cjs` | normal Windows / 1 | Both decomposition assertions fail against baseline with the same source-neutral deterministic-proof rejection. |
| `node --test --test-name-pattern="Feature source-backed vertical\|submodule and alternate metadata" test/source-control/workflow-integration-service.test.cjs test/source-control/managed-project-source.test.cjs` | normal Windows / 0 | 2/2 current counterparts pass when run individually, matching baseline success. |
| `git diff --check` | restricted / 0 | No whitespace defects. |

The canonical profile's existing owned checks passed: renderer Implement 8/8; Greenfield composition 10/10; Workflow execution 35/35; Codex Implementer/Tester R13 owner 8/8; semantic checkpoint 6/6; structured checkpoint 36/36. The Phase Planning owner passed 17/18 before the new fixture correction, including all five R16-R18 interruption/recovery cases. The corrected and extended new case subsequently passes with actual SQL renderer actions. Final focused proofs supersede that repair-local fixture failure. The broad profile was not repeatedly rerun; final deltas received a fresh build and their exact focused owners.

### Residual canonical-profile failures outside R19

| Owner | Observed failures | Evidence / limitation |
| --- | --- | --- |
| `test/agent-harness/repository-io-hardening.test.cjs` | 1 | Workspace-only git toolbox status assertion reproduces with baseline owners. |
| `test/project-state/execution-completion.test.cjs` | 6 | Source-neutral deterministic graph/decomposition fixtures conflict with the unchanged domain policy. Representative graph and both decomposition failures reproduce with baseline owners. |
| `test/source-control/managed-project-source.test.cjs` | 7 | Candidate Git preparation failures in the composed profile. Representative submodule case passes individually with both baseline and current owners; other cases were not individually reproduced. |
| `test/source-control/workflow-integration-service.test.cjs` | 6 | Profile integration candidate failed instead of integrated. Representative Feature vertical passes individually with both baseline and current owners; other cases were not individually reproduced. |

These 20 residual failures are distinct from the corrected R19 fixture. Do not interpret individual passing diagnostics as a green composed profile or evidence that every profile-only failure is baseline-confirmed. No unrelated Git-adoption, validation policy or integration behavior was changed. The profile's one skipped test and budget overrun remain qualification limitations.

## Preservation, security and handoff

No live Greenfield_Test Project State, runtime packet, source checkout or Git state was opened for mutation or repaired manually. All semantic/Git execution evidence above comes from synthetic test workspaces. Live partial outcomes remain partial. No dummy edits, retroactive result conversions, manual cleanup or fake checkpoints were introduced.

Before checkpoint, inspect the exact staged diff and perform the bounded credential/private-key, concrete local-path and generated-artifact scans. Results: bounded attributable-file credential/private-key and concrete-local-path scans pass; no generated or unrelated artifacts are selected. Exact staged attribution and staged-byte safety verification passed for all 13 files before checkpoint. Only source, existing owned tests and this report may be staged. No screenshots, generated build output, dependencies or diagnostics enter the checkpoint.

No Electron live-workflow run, visual Operator acceptance, external Codex/Forgejo integration exercise or release acceptance was performed. Remaining Operator acceptance is the card's existing Greenfield_Test exercise: reload the new build; observe failed Implement/Refresh/revision behavior; have the Architect submit the exact approved no-mutation Repair revision if appropriate; approve it normally; rerun Implement and proceed through R13 Review/Tester. This implementation does not infer or automatically change that live plan.

Recommended next task: Architect review of this checkpoint and residual profile evidence, followed by the bounded live Operator acceptance. Investigate the unrelated profile failures and budget overrun under their own authorized scope before broader qualification. Stop after the requested implementation checkpoint; do not push or run the live Greenfield workflow.
