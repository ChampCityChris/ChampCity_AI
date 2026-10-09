# WSF20-REPAIR17 Implementer Report

Date: 2026-10-09. Card: Repair, WSF20-REPAIR17 (D42).

## Scope and repository verification

Verified the approved primary `Dev` repository, branch `dev`, at exact starting HEAD `193c2cf672c806433598be8403a50ee905720a39` before edits. Origin is the existing ChampCity_AI GitHub remote; no fetch, push, remote change, branch change, or live-project operation was performed. This branch has no configured upstream in the observed local status.

Preserved the pre-existing `src/main/agentHarness/tools/toolRegistry.ts` development change and all untracked Forgejo/bootstrap and WSF documents. Only the following eight bounded files belong to this checkpoint:

- Modified `src/main/sourceControl/structuredWorkflowCheckpointService.ts`.
- Modified `src/main/sourceControl/semanticCheckpointService.ts`.
- Modified `src/main/workflow/workflowExecutionApplicationService.ts`.
- Modified `src/shared/projectState/projectStateService.ts`.
- Modified `test/phase-planning/phase-planning-service.test.cjs`.
- Modified `test/source-control/structured-workflow-checkpoint.test.cjs`.
- Modified `test/source-control/semantic-checkpoint-service.test.cjs`.
- Created this report.

No file deletion, schema migration, dependency, recovery authority store, alternate checkpoint engine, Greenfield-specific source path, renderer change, or live source/SQL/packet change was introduced. Temporary diagnostics and receipts remain ignored under `tmp/`.

## RCA and correction

R16 inspection required a ready binding, semantic checkpointing independently required readiness, and Start entered legacy recovery only for dirty Git status. Actual failed dirty-source materialization persists the binding as blocked, making the otherwise exact successful parent unrecoverable. The SQL `createSourceCheckpoint` operation also had a readiness guard; the first implementation diagnostic exposed that additional gate explicitly.

Legacy inspection now accepts only ready bindings or the precise materialization-blocked state. It still requires unique current substantive Workflow and active binding ownership, the original reserved ready binding/baseline/checkout/line identities, approved unchanged planning, latest successful completed mutation-required parent evidence, and the exact historical packet with the reserved contract digest. Git checkout root, common directory, branch and revision remain constrained to the managed baseline anchor. Competing checkpoint evidence, running source owners, and newer overlapping successful implementation ownership refuse recovery.

The semantic recovery entry point accepts only durable owner IDs. It obtains the existing exclusive Implementer/Tester source lease and reinspects proof under that lease. A private qualification enters the existing checkpoint machinery with its existing receipt digest, staged-content verification, Git commit verification, checkpoint relationships and pending/blocked retry semantics. Ordinary semantic checkpoint and domain checkpoint entry points retain their ready requirement.

The necessary shared-domain change is bounded: a recovery-specific checkpoint creation operation derives the boundary and expected revision from the original completed attempt, then validates exact successful current approved ownership and the materialization-blocked binding inside SQL checkpoint creation. It does not expose a generic readiness flag. Existing ordinary creation delegates to the same unchanged persistence/linking path.

After verified commit and checkpoint completion, full provenance and clean exact Git identity are checked again. Binding readiness and failure clearing use existing blocked → preparing → ready transitions inside one SQL transaction. The binding revision becomes the committed revision. No externally observable half-completed preparation state or blanket dirty-source cleanup is used.

For interrupted finalization, clean source may be accepted only with the exact saved boundary, links, commit parent, receipt, changed paths, recomputed content digest and compatible old/resulting binding revision. A committed checkpoint can finish blocked-binding lifecycle completion without another commit. Start invokes this recovery even with empty Git status. Candidate selection reads durable checkpoint identity internally because public blocked-source projections intentionally hide the revision.

Start still reserves the exact Repair, recovers the parent when needed, materializes/verifies source, and uses typed attempt preparation to abandon/recreate the stale Repair reservation before Codex Start. Recovery errors retain bounded inspection details. Ordinary Status and recovery projections remain read-only. Renderer Start-result presentation is unchanged.

## Red-to-green and interruption evidence

Before production edits, compiled the exact R16 source and extended its existing Greenfield fixture to call the real materializer with the stranded approved file. Asserted durable blocked state and `REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED`. Normal Windows execution then failed at actual Repair Start: expected Running, received Unavailable with that failure code. This is the mandatory baseline red proof, separate from the sandbox runner failure.

The same existing fixture now exercises four states through real Repair Start:

1. Dirty checkout with the actual persisted materialization failure.
2. Git committed but SQL finalization interrupted: an injected synthetic source adapter commits through the real checkpoint operation and throws before the result is saved; actual materialization persists the blocked binding on revision mismatch.
3. SQL checkpoint committed with lifecycle completion still blocked at the resulting revision.
4. SQL checkpoint committed with lifecycle completion still blocked at the reserved old revision.

Every case requires one parent checkpoint and one parent Git commit, original parent record/attempt and packet bytes unchanged, clean source, ready binding with failure cleared, stale Repair attempt abandoned and exactly one live replacement. Repeated Start creates no second session. The deterministic Codex adapter reaches Running and completes the Repair with its own checkpoint and clean source. Status/projection reads preserve SQL mutation history.

Existing source-control owners also exercise matching-code/wrong-identity rejection, other blocking reasons, unapproved revised planning, changed branch/HEAD, redirected checkout, newer same-item and overlapping peer owners, wrong packet digest, competing leases, unrelated checkpoints, conflicting saved receipts, clean unproven commits, forged commit content and dirty interrupted commits. Rejected recovery retains source and immutable records/attempts/packet bytes. Ready checkpointing, saved own blocked checkpoint retry and repeated checkpoint idempotence remain covered. The existing semantic owner explicitly proves that ordinary checkpoint entry points cannot ready a matching-code blocked binding without exact legacy attempt/planning proof.

## Validation receipts

All commands run from the verified primary repository. Normal Windows denotes approved nonsandboxed child-process execution. No live Greenfield_Test workspace is used by these synthetic Git/SQLite fixtures.

| Command | Lane | Observed result |
| --- | --- | --- |
| `npx tsc` | Restricted Windows, diagnostic compilation | Initial R16 compilation passed; subsequent diagnostic compilations passed after correcting a closure narrowing error. These are not composed build receipts. |
| `node --test --test-name-pattern='Greenfield stranded parent checkpoint' test/phase-planning/phase-planning-service.test.cjs` | Restricted Windows | Exit 1: `spawn EPERM`, recorded once; not a source failure or pass. |
| Same named baseline command | Normal Windows, exact R16 source | Exit 1: actual materialization durably blocked the binding; Repair Start returned Unavailable with the materialization failure code. |
| Same named fixture after initial R17 correction | Normal Windows | Exit 0: original blocked-dirty regression passed before expanding interruption cases. |
| Named three-owner final diagnostic below | Normal Windows | Exit 0: 27/27 tests, no failures/skips, 157,095.3488 ms. Earlier iteration failures identified the extra SQL readiness guard, hidden blocked projection revision, overly generic inspection failures and a test attempt to end immutable provenance; corrected with the bounded domain entry point, internal checkpoint selection, bounded inspection errors and an actual unapproved revised planning contract. |
| `node tmp/r17-focused-validation.cjs --preview` | Restricted Windows, read-only planning | Exit 0: canonical repair planner selects all ten focused owners and one production build. |
| `node tmp/r17-focused-validation.cjs > tmp/r17-focused-receipt.json` | Normal Windows, focused composed repair | Exit 0: run `9f9c86fc-007c-40aa-9be9-9bb99cfef065`, fresh production build passed (13,032 ms), 117/117 tests passed across ten owners, zero failures/skips/unavailable/blocked files, source stable, total 256,428 ms. |
| `git diff --check`, `git diff --cached --check`, `python tmp/r17-stage-safety.py` | Primary repository, read-only | Exit 0: exact eight-file staged allowlist and index content matched, staged diff reviewed, zero whitespace/secret/local-path/generated-artifact findings. All 43 unrelated untracked documentation files and the tracked development file retained their bytes. |

Final diagnostic command:

```text
node --test --test-concurrency=2 --test-reporter=tap --test-name-pattern='legacy checkpoint recovery|Greenfield stranded parent checkpoint|implementation checkpoint writes only' test/source-control/structured-workflow-checkpoint.test.cjs test/phase-planning/phase-planning-service.test.cjs test/source-control/semantic-checkpoint-service.test.cjs > tmp/r17-final-diagnostic.tap
```

The focused runner uses canonical `planValidation(profile: repair)` with all eight R17 paths and explicit preserved capabilities `project-state-service`, `release-and-git-operations`, and `renderer-navigation-and-presentation`. It then narrows execution to the card's six named owners, source materialization, shared source semantic references, and both static owners, recalculating the canonical schedule. `executePlan` owns one fresh production build, environment probes, isolation, source-stability checks and per-owner receipts. This is intentionally a ten-owner focused receipt, not a pass claim for the broader 103-file repair selection.

The focused run exceeded the advisory 60,000 ms repair budget (`review-required`); the slowest owners were Phase Planning (213,732 ms) and structured checkpoints (166,925 ms). Resource scheduling used four concurrent slots with two isolated Git fixture permits. This advisory timing result does not change the observed assertion/build pass.

The wider baseline failures already established by R16's exact-baseline same-executor comparison remain separate: release toolbox (2), repository IO hardening (1), execution completion (6), managed project source (7), source lifecycle package (1), workflow integration (6), and one Codex runtime-manager skip. See `WSF20_REPAIR16_IMPLEMENTER_REPORT.md`. They were not rerun or claimed fixed here; this card requests focused repair proof and no repeated unrelated broad suites.

## Git and safety

Required checkpoint message: `WSF20-R17 recover blocked SourceBinding after failed materialization`.

Commit hash: pending checkpoint creation; the actual hash will be reported in the handoff. No amend solely to add that hash to this report.

Exact staged allowlist/diff review and bounded secret-literal, concrete-local-path and generated-artifact scan passed with zero findings. Unrelated source and documentation fingerprints matched. The repair stays in main/shared services with existing constrained Start semantics; no renderer filesystem access, live manual Git/SQL recovery, packet rewriting or source deletion is added.

## Remaining Operator acceptance

Build/relaunch and reopen the existing Greenfield_Test Repair Implement workspace. Press Implement without manual cleanup. Verify parent checkpoint recovery, clean source, advanced ready binding, refreshed Repair reservation and Running Codex session, or the exact inspection blocker with historical source/evidence preserved.

Synthetic deterministic adapter proof does not establish a live external Codex session or visual/experiential acceptance. No live-project recovery, app relaunch, release/packaging, dependency change or Forgejo/bootstrap remediation was performed. Stop at the bounded checkpoint for Operator audit; do not recreate the project.
