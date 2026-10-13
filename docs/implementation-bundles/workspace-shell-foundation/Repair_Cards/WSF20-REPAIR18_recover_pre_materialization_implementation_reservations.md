# WSF20-REPAIR18 — Recover authentic pre-materialization reservations and runtime packets

**Type:** Repair Card  
**Parent:** WSF20 — Workspace Shell Foundation  
**Defects:** WSF20-D43 (historical binding readiness), WSF20-D44 (incompatible contract digests)  
**Predecessor:** WSF20-REPAIR17  
**Implementation starting baseline:** `b828394249604b7ecfd833e9bbe56d6f7f260db4` (`Dev` after MPSI01; reverify HEAD)  
**R17 failure baseline:** `6ec90dee7216a0653f11a24856f27039a1cde92e`

> Implement only this recovery correction. Preserve unrelated dirty Forgejo/bootstrap, WSF and other development work. No live `greenfield_test` SQL/Git/packet edits as part of implementation.

## Objective

Allow the existing Greenfield_Test Repair **Implement Start** to safely recover its successful but uncheckpointed parent, whose attempt was reserved before source materialization and whose historical runtime packet contains a distinct execution-contract digest. R17 currently refuses that valid history at two successive predicates, even though the parent checkout, immutable result and approved file are identifiable.

Required result: one authentic parent SourceCheckpoint/commit, clean exact Workflow checkout, advanced `ready` SourceBinding, obsolete materialization error cleared, stale Repair reservation replaced through the typed lifecycle, and the exact Repair Codex session starts. Do not change general source-control or no-mutation policy.

## Confirmed live RCA — SQL and repository review, read-only

**Workspace:** `greenfield_test`; Workflow `3500ba39-001e-4a09-82fd-23a1e4f5aa75`; parent WorkItem `7ae778e7-6f49-4dcb-8262-fd4ee277dfde`; parent ImplementationAttempt `eeb23acd-d3c4-4417-825a-5658449345b3`; parent ImplementationRecord `e1a36e62-3158-4f2c-81a8-5103313bba49`.

**D43 — the first failing R17 predicate is now verified:**

- Parent attempt v1 was created **2026-10-04 20:13:53 UTC**, reserving SourceBinding `5bce00f5-cfa7-47a1-af6d-6e20a9fbc259@1` in `layout.sources`, at revision `5e9ae23798f177efba1453bfc7cd39a77006376a`.
- Reserved SourceBinding **v1 was `unprepared`**, with only its workflow ID and SourceBaseline ID; `currentRevisionId`, `repositoryCheckoutId`, and `workSourceLineId` were not yet populated.
- The **same** SourceBinding became `preparing` in v2/v3 and `ready` in **v4 at 21:20:45 UTC**, with exact reserved revision, managed Workflow SourceLine and RepositoryCheckout.
- The original attempt transitioned to `running` **afterward, at 21:20:46 UTC**, and to `completed` at 21:21:28 UTC. The WorkItem changed only through normal ready → in_progress → validation_pending lifecycle; all 14 other reserved entity versions remain current.
- The current SourceBinding v7 is `blocked` with `REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED`. Live Git remains at the same reserved HEAD, with exactly `?? conformance/phase-1/work-card-01.txt`; file contents are `Greenfield_Test Phase 1 lifecycle proof 01`. There are no SourceCheckpoint entities.

R17 `structuredWorkflowCheckpointService.inspectLegacyImplementationCheckpoint()` incorrectly requires the **reservation-time** SourceBinding version to be `ready` and to already contain the eventual checkout/line/revision fields. That makes this otherwise supported reservation-before-materialization lifecycle fail with `Inspection required: exact reserved SourceBinding identity is unavailable.`

**D44 — a second, independent R17 rejection immediately follows D43:**

- SQL `ImplementationAttempt.contractDigest` is `dcea2a60cc04e4fe376f1956748af9ee4537a525b6f09e8230b037fcf5ae3aa9`. It is the `work-item-reservation` digest; its SHA-256 input was independently reproduced from the original member-version pairs and `[sourceBaselineId, sourceBindingId, reservedRevision]`.
- The real runtime packet `eeb23acd-d3c4-4417-825a-5658449345b3.json` carries `contractDigest = a9b22928f93f42af825f37f34376e52298c2c905193073d1bf4e9385acd29dcd`.
- Production `codexImplementerExecutionService.persistAndFinishWorkflowAttempt()` writes `exact.contract.digest` from `createWorkItemExecutionContract()`, hashing the complete execution context—not the SQL reservation fingerprint. These digests are **not interchangeable**.
- R17 introduced `packet.contractDigest !== attempt.body.contractDigest` in legacy inspection. It will reject the authentic packet even after D43 is fixed.
- The original packet's schema/project/workflow/WorkItem/executionRef and **all five semantic result fields** match the immutable ImplementationRecord. It has no `sourceCheckpointAttempt` (the R16 recovery case). The packet is not demonstrably corrupt.
- R16/R17 tests fabricated `contractDigest: attempt.body.contractDigest` in their packets, so every passing recovery fixture used a digest shape that the real execution writer does **not** produce. The `wrong-packet-digest` negative test is consequently based on an invalid equality premise.

This is a verified pair of defects in the **same** bounded R17 legacy-recovery proof, not a request for a new checkpoint system.

## Required correction

### 1. Prove the historically valid binding transition, not readiness at reservation

In `src/main/sourceControl/structuredWorkflowCheckpointService.ts`, correct only legacy implementation inspection:

- Require the original SourceBinding ID in `attempt.layout.sources` and load its exact saved version. Do not invent historical layout entries or substitute another binding.
- Accept the historical `unprepared` reservation shape only where its original SourceBaseline/workflow identity and reserved attempt revision match the unique current Workflow lineage.
- Query the same binding's durable **version history** to establish that an exact `ready` version with the expected SourceLine, checkout ID and reserved revision existed **before the successful attempt transitioned to running**. Use the existing SQL reader/domain history and state-change chronology, not a time-only assumption or newly fabricated source record.
- Prove the current binding still refers to that identity and that Git root, common directory, branch, HEAD, approved dirty paths and exclusive source lease match R17's exact recovery requirements. Preserve interrupted checkpoint receipt/commit reconciliation.
- Retain existing checks of the latest successful completed ImplementationAttempt/ImplementationRecord, approved unchanged WorkItem contract, immutability of unrelated reserved members, absence of ambiguous source owners, and no incompatible SourceCheckpoint.
- Keep the R17 `ready`-at-reservation case valid. A binding that **never** became ready before execution, or whose baseline/checkout/source revision changed, must fail closed with a specific inspection reason.
- Do not weaken ordinary `bindingForWorkflow()`, the semantic checkpoint entry point, or Start-time clean-checkout verification.

### 2. Validate the packet using the correct contract semantics

Replace the invalid R17 cross-contract equality; do **not** demand that a `work-item-contract` digest equal a `work-item-reservation` digest.

- Preserve bounded packet file identity, realpath/size/schema checks, 64-character SHA-256-shaped digest, exact Project/Workflow/WorkItem/executionRef binding, immutable ImplementationRecord result equality, approved source attribution, and the R17 lease/checkpoint identity guards.
- Treat the packet execution-contract digest as its **own** schema. If deterministic reconstruction from trusted historical execution context is feasible within the existing bounded path, compare it to a digest computed using that **same** execution-contract serializer; otherwise leave it as non-authorizing packet metadata and rely on the independent immutable SQL, Git, approval and checkpoint ownership proofs. Do not silently replace its value or synthesize a new expected digest.
- An arbitrary well-formed digest must **not** be claimed as cryptographically verified merely because other evidence agrees; document the actual verification performed.
- Keep rejection for malformed packet/digest, mismatched project/attempt IDs, altered semantic result, redirected packet, forged checkpoint paths, stale source, and incompatible ownership. Revise R17's `wrong-packet-digest` fixture to test an actually enforceable contract invariant; do not preserve the incorrect cross-digest comparison solely to satisfy the existing test.
- Historical packet bytes and original SQL ImplementationAttempt/Record remain immutable.

### 3. Preserve the complete R17 recovery and Start path

Use the existing `recoverLegacyImplementationCheckpoint`/semantic checkpoint machinery, without new authority or Git primitives:

1. Detect exactly one stranded parent and inspect its provenance before any source mutation.
2. Acquire the existing exclusive lease and **recheck** the qualified proof.
3. Create/reconcile exactly one committed implementation SourceCheckpoint linked to the original parent result.
4. Advance the SourceBinding to the committed revision and return it to `ready` with obsolete failure cleared; verify checkout clean and exact.
5. Run normal source preparation; abandon/reprepare the stale Repair reservation through `prepareImplementationAttempt()`.
6. Return `running` for the exact Repair Implementer session, or bounded, persistent inspection evidence if unsafe.

Preserve R17 interrupted Git/SQL finalization and idempotence, R16 final Git-path reconciliation and surfaced Start failures, and R13 source-backed no-mutation logic.

## Required focused regression — real ordering and real digest

Extend the existing Greenfield Phase Planning/Repair lifecycle test and structured/semantic checkpoint owners.

**Red on R17 / green on R18:**

1. Create a real SQL/Git synthetic Greenfield workflow and approved parent with a SourceBaseline and **unprepared** SourceBinding.
2. Prepare the parent ImplementationAttempt **before** materialization. Assert its historical `layout.sources` points to the unprepared version.
3. Materialize source, prove an exact ready historical binding **before** beginning that same attempt, and then complete it with semantic `implemented`.
4. Construct the legacy runtime packet using the **real `createWorkItemExecutionContract().digest` schema** (or use the production packet builder), not `attempt.body.contractDigest`. Explicitly assert the two digests differ and the packet result matches the immutable ImplementationRecord. Omit `sourceCheckpointAttempt` as in the live case.
5. Leave only the approved conformance file dirty. Create/approve a Repair and prepare its old-revision reservation; invoke failed materialization so the binding becomes `blocked`.
6. Exercise **Repair Start through the real Codex Implementer execution service**. Before correction, assert R17's historical-binding failure, then independently exercise the packet-digest check so D44 cannot remain hidden behind D43.
7. With R18, verify one committed parent checkpoint, unchanged parent records/packet bytes, clean Git source, advanced ready binding, cleared failure, abandoned stale Repair reservation, one new live Repair attempt and one Running Codex session.

Retain R17's ready-at-reservation positive fixtures, interrupted Git/SQL finalization cases and retry idempotence. Negative cases must cover: no historically ready checkout before Run, changed/missing baseline/source identity, unapproved contract, invalid packet identity/result/digest format, out-of-scope dirty file, ambiguous checkpoint/attempt owner, altered saved receipt, branch/HEAD drift and competing lease. None may mutate the original source on refusal.

Required focused owners: `test/phase-planning/phase-planning-service.test.cjs`, `test/source-control/structured-workflow-checkpoint.test.cjs`, `test/source-control/semantic-checkpoint-service.test.cjs`, `test/workflow/workflow-execution-application-service.test.cjs` and `test/work-card-building/codex-implementer-execution-service.test.cjs`; static/build proof and canonical repair-profile validation with exact changed paths. Reuse tests rather than creating another test harness or running repeated unrelated broad suites.

## Deliberately separate downstream issue

The **live Repair** itself is a test-only Request Repair that says no defect was identified and instructs the Implementer to **preserve the existing file unchanged if it already conforms**. That file currently conforms, while the approved Repair `affectedPaths` is nonempty; today's mutation-required completion semantics reject a genuinely unchanged result. This may surface **after Start succeeds**. It is a separate Repair-planning/no-mutation semantic issue, not D43/D44.

Do **not** fabricate a file edit, silently revise the approved Repair contract or weaken R13 to make R18's live acceptance appear green. R18 acceptance is **parent checkpoint recovery plus Repair Start Running**; record subsequent no-change completion behavior separately for Architect/Operator review.

## Forbidden changes and Implementer handoff

- No live Greenfield_Test Git/SQLite/packet mutation; no manual cleanup, `git clean`, reset, direct database updates or creation of replacement parent records.
- No schema migration, historical packet rewrite, new trust authority, Greenfield-only execution fork, generic checkpoint readiness bypass, unrelated Tester redesign, Forgejo work or broad source lifecycle refactor.
- Preserve all unrelated dirty `Dev` changes. Only attributable implementation/test/report files may be committed.

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR18_IMPLEMENTER_REPORT.md`. Include the historical v1 → v4 → attempt-running SQL chronology, the two distinct digest algorithms/values, red-to-green proof for **both** predicates, validation receipts and honest residual risks.

**Checkpoint:** `WSF20-R18 recover historical binding and execution packet provenance`

Checkpoint only this bounded repair and stop for Architect code review. No live-project recovery during implementation.
