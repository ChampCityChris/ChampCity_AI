# WSF20-REPAIR18 Implementer Report

Date: 2026-10-09. Card: Repair, WSF20-REPAIR18, defects D43/D44.

## Scope and repository verification

Verified the approved primary `Dev` repository with `git rev-parse --show-toplevel`, on `dev` at the required starting HEAD `b828394249604b7ecfd833e9bbe56d6f7f260db4`. Origin remains the existing ChampCity_AI GitHub remote; `dev` has no configured upstream. No fetch, push, branch change, release operation, or live Greenfield_Test access/mutation was performed.

Attributable files:

- Modified `src/main/sourceControl/structuredWorkflowCheckpointService.ts`.
- Modified `test/phase-planning/phase-planning-service.test.cjs`.
- Modified `test/source-control/structured-workflow-checkpoint.test.cjs`.
- Created this report at the card's required path.

No files deleted. Intentionally not created: schema migrations, dependencies, new authority stores, source/packet replacements, new harnesses, Greenfield-specific runtime forks, renderer changes, or live SQL/Git/packet edits. All pre-existing untracked Forgejo/bootstrap, MPSI and WSF work is outside the checkpoint. Temporary scripts, plans and receipts remain ignored under `tmp/repair18/`.

## Historical chronology and digest RCA

The following live history is supplied by the approved card's read-only SQL/Git RCA; this implementation did not revisit the live workspace:

| Evidence | Durable history |
| --- | --- |
| Parent reservation | Attempt `eeb23acd-d3c4-4417-825a-5658449345b3` v1, 2026-10-04 20:13:53 UTC, reserved binding `5bce00f5-cfa7-47a1-af6d-6e20a9fbc259@1`, revision `5e9ae23798f177efba1453bfc7cd39a77006376a`. |
| Binding v1 | Unprepared, original Workflow and SourceBaseline identities present; checkout, SourceLine and current revision absent. |
| Materialization | Same binding v2/v3 preparing, v4 ready at 21:20:45 UTC with the exact checkout, SourceLine and reserved revision. |
| Execution | Same parent attempt running at 21:20:46 UTC, completed at 21:21:28 UTC. Normal WorkItem ready → in_progress → validation_pending transitions; all 14 unrelated reserved member versions remain current. |
| Stranded result | Binding v7 blocked with `REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED`; approved conformance file dirty; no parent SourceCheckpoint. |

SQL `work-item-reservation` digest is SHA-256 of `JSON.stringify([member ID/version pairs, [sourceBaselineId, sourceBindingId, reservedRevision]])`. The supplied parent value is `dcea2a60cc04e4fe376f1956748af9ee4537a525b6f09e8230b037fcf5ae3aa9`.

Runtime `work-item-contract` digest is SHA-256 of the complete execution-context body serialized by `createWorkItemExecutionContract()`: exact project/workflow/work item/version, objective, solution, Phase, criteria, dependencies, scopes, constraints, approved boundaries/paths/proof, mutation semantics and source revision. The supplied historical packet value is `a9b22928f93f42af825f37f34376e52298c2c905193073d1bf4e9385acd29dcd`. Production `persistAndFinishWorkflowAttempt()` writes this execution digest. These algorithms have different inputs and are not interchangeable.

## Bounded correction and actual verification

Legacy inspection loads the exact SourceBinding version named by the original reservation; no substitute binding or historical layout entry is invented. A ready reservation remains supported. An unprepared reservation must have its original immutable SourceBaseline and Workflow identity, no pre-existing checkout/line/revision fields, and a baseline revision equal to the attempt's reserved revision.

The existing SQL reader supplies saved SourceBinding/ImplementationAttempt versions and immutable StateChange records. Each relevant audit record must match its transactional outbox event by change identity, entity, operation and from/to versions. The outbox's durable sequence proves that an exact ready binding version preceded the attempt's unique prepared → running transition, including equal-timestamp cases. Readiness inferred only from today's binding or wall-clock timestamps is insufficient. Binding history from the reserved version through the current version must retain baseline/Workflow and any populated checkout/SourceLine identities; populated revisions before Run must equal the reserved revision. After Run, revisions must remain the reservation or exact current Git HEAD; an advanced HEAD is admitted only through the existing independent saved checkpoint/commit/receipt reconciliation. Temporary unrelated revision drift cannot be hidden by restoring today's binding. Missing history/chronology or readiness established only after Run refuses recovery with a specific inspection reason.

The existing latest successful completed attempt/result, approved unchanged WorkItem, unrelated reserved-member immutability, unique Workflow/source ownership, bounded real packet identity/schema/size, exact five semantic result fields, approved paths, Git root/common directory/branch/HEAD and saved checkpoint/receipt checks remain. Ordinary source binding/checkpoint readiness and Start clean-checkout requirements are unchanged. Existing recovery still acquires the exclusive source lease, reinspects qualified proof, creates/reconciles one semantic checkpoint, advances the binding and clears obsolete failure, then uses typed preparation to abandon/recreate the stale Repair attempt before the exact Codex Start.

The invalid cross-contract digest equality is removed. The packet digest is checked only for 64 hexadecimal SHA-256 shape and retained as **non-authorizing metadata**. It is not cryptographically verified. The reservation layout does not capture the full runtime execution context at contract creation, including all dependency/projection state and versions after source materialization; the existing execution serializer reads current eligible projections. Reconstructing from current projections or copying the SQL reservation digest would invent an expected value. Recovery instead relies on independent immutable SQL results, historical source identity, approval and Git/checkpoint ownership proof. Neither packet bytes nor original parent SQL records are rewritten. A positive well-formed arbitrary-digest fixture explicitly exercises this limitation; malformed digests still refuse.

## Regression evidence

Before production changes, built the exact R17 production baseline and ran the extended Greenfield fixture through real `CodexImplementerExecutionService.start()`. The pre-materialization subcase returned Unavailable with `Inspection required: exact reserved SourceBinding identity is unavailable.` The independently ready-at-reservation subcases returned Unavailable with `Inspection required: legacy packet does not match the exact successful attempt.` Expected Running assertions failed for both predicates, so D44 was not hidden by D43.

The same fixture now reserves before materialization, checks the saved unprepared layout version, creates an exact ready version before Run, and writes the real execution-contract digest while explicitly asserting it differs from the reservation digest and all five result fields match immutable SQL. It omits `sourceCheckpointAttempt`. It then persists actual failed materialization, starts the approved Repair through the production service, and requires exactly one committed parent checkpoint/commit, unchanged parent attempt/result/packet, clean exact source, advanced ready binding with failure cleared, abandoned stale Repair reservation, exactly one live replacement and one Running Codex session. Repeated Start remains idempotent. The existing ready-at-reservation and Git/SQL interrupted finalization cases use real execution digests as well.

Structured recovery coverage retains existing approval, lease, source drift, out-of-scope file, ambiguous/newer ownership, incompatible checkpoint, altered receipt/content and unproven-commit refusals. Added cases cover readiness only after Run, transient checkout/revision drift restored before Run, revision drift restored after Run, missing saved binding/baseline versions, missing running-transition outbox chronology, malformed digest, wrong Project/attempt identity, altered result, redirected packet path and forged attribution. Refusal assertions preserve Git HEAD/index/status, approved file bytes, immutable attempts/results and packet bytes. Existing semantic, workflow and Codex owners retain ordinary readiness, R16 reconciliation and R13 no-mutation proof.

## Validation receipts

All execution used the verified primary repository and isolated synthetic SQL/Git workspaces. Normal Windows denotes the approved nonsandboxed child-process lane.

| Exact command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Restricted Windows | Exit 1, Vite/esbuild `spawn EPERM`; recorded once, not a source failure/pass. |
| `npm run build` | Normal Windows, R17 baseline | Exit 0, TypeScript/Vite/assets passed. Existing large renderer chunk advisory remained. |
| `node --test --test-name-pattern='Greenfield stranded parent' test/phase-planning/phase-planning-service.test.cjs` | Normal Windows, R17 red diagnostic | Exit 1, 0/6 tests passed; one parent suite and five subcases, with distinct D43 and D44 Start failures above. Output: `tmp/repair18/red-phase.txt`. |
| `npm run build` | Normal Windows, R18 diagnostic build | Exit 0, TypeScript/Vite/assets passed. |
| `node --test --test-name-pattern='Greenfield stranded parent\|legacy checkpoint recovery' test/phase-planning/phase-planning-service.test.cjs test/source-control/structured-workflow-checkpoint.test.cjs` | Normal Windows, focused diagnostic | Exit 1, 38/40 passed, 229,316.7615 ms. All five Start/interruption subcases passed. One new forged-attribution test incorrectly expected the nonlegacy attributed-retry hint to be false; corrected to assert direct legacy inspection and attributed-retry refusal, preserving source/packet assertions. The failing subcase also failed its parent test. Final composed run below owns the corrected proof. |
| `npm run test:repair -- --changes tmp/repair18/changes.json --preview` | Restricted Windows, read-only planning | Exit 0; canonical repair plan includes all four exact changed paths and preserved `semantic-source-checkpoints` / `managed-project-source-topology` capabilities. |
| `node tmp/repair18/focused-validation.cjs --preview` | Restricted Windows, read-only planning | Exit 0; six owners (five required plus static capability-map owner), all four exact changed paths, one production build. |
| `node tmp/repair18/focused-validation.cjs > tmp/repair18/receipt.json` (first execution, retained as `receipt-first.json`) | Normal Windows, focused canonical repair executor | Exit 0, run `294bd2af-d2eb-4ca9-8248-1e0039b9d4ae`; 106/106 passed, no failures/skips/unavailable/blocked owners, fresh build 13,600 ms, source stable, total 324,582 ms. Final review then added post-Run historical revision-drift refusal and its regression, requiring the final run below. |
| `node tmp/repair18/focused-validation.cjs > tmp/repair18/receipt.json 2> tmp/repair18/progress.jsonl` | Normal Windows, final focused canonical repair executor | Exit 0, run `979d14f8-b2ca-4079-8d04-26b4b76c2cf5`; 107/107 passed, no failures/skips/cancellations/unavailable/blocked owners, fresh build 14,148 ms, source stable, total 344,156 ms. |
| `node tmp/repair18/safety.cjs --snapshot` | Restricted Windows | Node-to-Git `spawnSync git EPERM`; recorded once, rerun normally. |
| Same snapshot command; `node tmp/repair18/safety.cjs --preservation` | Normal Windows, read-only preservation checks | Exit 0 for snapshot. Initial preservation comparison found only two transient renderer-loader test outputs changing during active tests. Excluded that exact generated test-directory pattern from the saved snapshot and comparison; all 45 original durable untracked documents matched their original bytes. No document fingerprint was recaptured to hide changes. |
| `git diff --check`; `git diff --cached --check`; `node tmp/repair18/safety.cjs` | Primary repository / normal Windows, read-only staged safety | Exit 0; exact four-file allowlist and normalized index/worktree content match, staged diff reviewed, no whitespace/secret/concrete-local-path/generated-artifact findings. All 45 unrelated durable untracked document fingerprints preserved. |

The focused composed run retains the card's five named owners and the selected static owner from canonical `planValidation(profile: repair)`, recalculates the canonical resource schedule, and uses `executePlan` for a fresh production build, environment probes, source-stability checks and per-owner receipts. This follows the preceding bundle's focused-validation precedent and the card's prohibition on repeated unrelated broad suites. It does not claim the broader 78-file planner selection passed. No release/packaging, app relaunch, visual acceptance, external Codex integration, or live recovery is required/performed in this implementation.

Final per-owner receipt:

| Owner | Passed/tests | Duration (ms) |
| --- | --- | --- |
| `test/phase-planning/phase-planning-service.test.cjs` | 17/17 | 253,465 |
| `test/source-control/structured-workflow-checkpoint.test.cjs` | 36/36 | 264,924 |
| `test/source-control/semantic-checkpoint-service.test.cjs` | 6/6 | 64,544 |
| `test/workflow/workflow-execution-application-service.test.cjs` | 35/35 | 23,092 |
| `test/work-card-building/codex-implementer-execution-service.test.cjs` | 8/8 | 73,234 |
| `test/validation/capability-map.test.cjs` | 5/5 | 347 |

The final run exceeds the advisory 60,000 ms repair budget (`review-required`). Slowest owners are structured checkpoints and Phase Planning, which run complete isolated Git/SQL lifecycles and interrupted-finalization scenarios. The repository resource schedule permits four workers and two isolated Git fixtures. This timing advisory does not change assertion/build results or silently omit proof.

## Git, safety and handoff

Required checkpoint: `WSF20-R18 recover historical binding and execution packet provenance`.

Commit hash: pending card-local checkpoint creation; actual hash will be reported in the final handoff. No amend solely to insert that hash here.

Exact staged allowlist/diff review, bounded secret/local-path/generated-artifact scan, and preservation fingerprints passed. The checkpoint includes only the four attributable files above; all 45 unrelated durable untracked documents retain their bytes. Only card-required staging and the checkpoint commit are authorized Git mutations; no push, merge, reset, cleanup or live-project Git/SQL operation is performed.

Stop for Architect code review after the checkpoint. Live acceptance remains parent checkpoint recovery plus exact Repair Start Running, and has not been executed. Historical digest metadata is not an independently authenticated contract. Missing/damaged history fails closed. Validation duration is reported as evidence rather than hidden by reduced assertions.

The live test-only Repair's instruction to preserve an already conforming file may subsequently produce a no-change result while its approved affected paths remain nonempty. That mutation-required completion conflict remains a separate Architect/Operator planning/no-mutation issue. R18 does not fabricate edits, revise the approved Repair, or weaken R13. Recommended next task: Architect review of this checkpoint, followed by authorized live Start acceptance and separate review of any no-change completion outcome.
