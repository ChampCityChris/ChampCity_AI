# TVA02 — Split Mixed-Lane Tests and Isolate Performance/Desktop Proof

**Order:** 2 of 9  
**Depends on:** TVA01  
**Governing architecture:** `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA02_IMPLEMENTER_REPORT.md`

## Confirmed Defect

File-level lane execution cannot isolate expensive evidence while files combine ordinary functional regression with performance/soak or platform-specific scenarios.

Confirmed examples:

- `test/agent-harness/mcp-operational-diagnostics.test.cjs` contains ordinary diagnostics proof, a two-batch 1,000-session reconnect soak, and a literal sixty-second idle CPU/event-loop measurement.
- `test/agent-harness/mcp-session-lifecycle.test.cjs` combines ordinary lifecycle correctness with high-volume churn/pressure scenarios that require explicit lane review.
- `test/agent-harness/agent-harness-process-boundary.test.cjs` is real Electron/process evidence and must remain outside ordinary fast execution.

## Objective

Make test file boundaries compatible with deterministic lane selection so slow/real-time/platform evidence can be selected intentionally without deleting it.

## Required Changes

1. Split the reconnect soak and sixty-second idle measurement out of ordinary operational diagnostics into explicit `test/performance/` proof.
2. Review HOTFIX20 session-lifecycle cases and move only genuinely performance/soak volume proof to an explicit performance file; preserve ordinary functional admission/lifecycle regression in the integration owner.
3. Keep real Electron/service-host process-boundary proof in an explicit Desktop/platform lane; rename/move only if needed to make ownership unambiguous.
4. Review any other executable file currently classified as mixed where one test's lane forces unrelated expensive proof into the same file.
5. Update `validation/capability-map.json` so every new/moved executable test file has exact behavior coverage and correct lane/dependencies/duration basis.
6. Preserve every assertion/behavior unless a redundant proof is explicitly documented; TVA08 owns broader consolidation/retirement.
7. Prefer simulated clocks for functional TTL/timing semantics; preserve real elapsed-time measurement only where performance itself is the contract.

## Negative Constraints

- No deletion of the 60-second performance qualification.
- No weakening HOTFIX20 functional regression.
- No integration policy change yet.
- No global concurrency change yet.
- Do not reclassify a test merely because it is inconvenient.

## Acceptance Criteria

1. Ordinary diagnostics/integration files contain no deliberate sixty-second wall-clock sleep.
2. Performance/soak profile selects the moved long-running proof.
3. Fast/affected profiles do not select performance/soak files unless explicitly requested by a wider profile.
4. Desktop/process evidence is not selected by ordinary fast profile.
5. Capability-map exact executable coverage remains green.
6. Moved tests still pass in their destination lane.

## Validation

Run:

- capability-map validator;
- affected original and destination test files;
- explicit performance lane selection preview;
- explicit Desktop lane selection preview.

A full repository regression is not required by this bounded structural card.

## Implementer Report

List every moved/split test case, old/new file, lane, preserved behavior mapping, measured/estimated duration updates, commands/results, and checkpoint commit.

## Post-Implementation

Checkpoint TVA02 only, then read TVA03.
