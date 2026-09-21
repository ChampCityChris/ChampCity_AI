# TVA02A — Eliminate Same-Day Projection and Process-Amplification Regressions

**Order:** 2 of 10  
**Depends on:** TVA01  
**Governing architecture:** `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`  
**RCA:** `docs/implementation-bundles/test-execution-architecture/CODE_REVIEW_AND_RCA.md`  
**Implementer Report:** `docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA02A_IMPLEMENTER_REPORT.md`

## Purpose

Recover from the specific performance regressions introduced during the 2026-09-20 WIR22 repair sequence before broader lane decomposition continues.

This card is not general test cleanup. It owns four confirmed same-day amplification mechanisms:

1. repeated planning snapshot/inventory acquisition in routed projections;
2. full routed lifecycle replay inside ordinary focused tests;
3. real npm process execution repeated across semantic policy scenarios;
4. production Integration Repair/source-control provider execution repeated across more semantic scenarios than necessary.

## Measured Failed Baseline

Repository Implementer Reports establish:

```text
WIR20 git-mutation boundary:
30 tests   209.52 s

REPAIR06A:
43 tests   638.92 s

REPAIR06A-REPAIR01:
46 tests   673.57 s

REPAIR06B:
48 tests 1,117.39 s

REPAIR06 routed application checkpoint focus:
parent + clean/conflicted subcases 2,184.02 s
clean subcase                       820.20 s
conflicted subcase                1,363.36 s
```

These measurements are the fail-before evidence. Do not replace them with timeout declarations.

## Objective

Restore focused validation to a bounded execution model by eliminating repeated repository/planning scans and isolating real process/provider conformance from higher-level semantic scenario matrices.

## Required Change 1 — Collapse Routed Planning Snapshot Acquisition

Current `loadRoutedDevelopmentExecution()` performs a full planning-document inventory and then calls root-based helpers that independently acquire additional snapshots.

Required:

1. Create one `PlanningProjectionContext` for a stable routed projection.
2. Reuse that context/snapshot for:
   - planning-document listing;
   - document freshness evaluation;
   - Work Item/Repair/completion projection helpers where their semantics permit one stable read generation.
3. Add context-aware helper variants where required rather than repeatedly calling root-based APIs.
4. Do not cache across mutations in a way that hides changed source. A mutation may require a fresh post-write context.
5. Eliminate snapshot acquisition from inner artifact loops.
6. Add structural instrumentation using the existing snapshot test hooks.

Required structural proof:

- one stable routed `query()` performs exactly one planning inventory scan;
- one read-only routed action precondition performs one stable planning inventory scan;
- a mutation requiring post-write projection performs only the explicitly justified pre/post scans;
- scan count does not grow linearly with the number of planning documents or Work Items.

Use a large synthetic planning fixture so this proves asymptotic behavior rather than a tiny lucky case.

## Required Change 2 — Stop Replaying the Entire Product Lifecycle for Focused Integration Semantics

The current routed application characterization test constructs the entire lifecycle twice before testing clean/conflicted integration.

Required:

1. Preserve one explicit end-to-end routed lifecycle acceptance path in an appropriate wider integration profile.
2. For ordinary focused integration behavior, seed the **nearest valid durable boundary** needed by the behavior under test.
3. Clean integration proof should begin from a completed/checkpointed routed Work Item/Plan fixture rather than replaying every earlier planning/review action.
4. Conflict/Integration Repair proof should begin from the same bounded completed state plus the minimum target divergence required.
5. Existing owner tests remain responsible for:
   - routing;
   - planning;
   - Formal Work Card creation/review;
   - Implementer report readiness;
   - Work Item validation/Repair/close;
   - Phase/Plan acceptance.
6. The routed integration composition test proves composition/lineage/integration, not every predecessor capability again.

Do not weaken the end-to-end acceptance boundary. Move it to a deliberate wider profile.

## Required Change 3 — Separate Real npm Adapter Conformance from Policy Semantics

The target-owned policy scenario matrix currently pays real npm subprocess cost across many semantic cases.

Required:

1. Identify the minimum cases that genuinely require a real npm process:
   - trusted script executes in candidate cwd;
   - pre/post/workspace/script-shell override suppression;
   - nonzero failure evidence;
   - timeout and descendant termination;
   - output ceiling;
   - candidate mutation detection if it specifically depends on the real adapter.
2. Keep those as explicit npm-adapter integration proof.
3. Policy schema, identity, stale-target, service recreation, proposed-policy transition, and higher-level candidate semantics should use a deterministic in-process runner/test seam when real npm behavior is not the subject.
4. Production must still use only the registered application-owned runner. The test seam must not create a renderer/model command injection path.
5. Do not spawn npm merely to prove candidate state that can be asserted directly through the provider/service boundary.

## Required Change 4 — Separate Real Provider Mechanics from Integration Repair Controller Semantics

REPAIR06B made preserved semantic scenarios traverse the full production repair policy/provider mechanics.

Required:

1. Preserve a bounded real-provider conformance set proving:
   - immutable target-policy reads;
   - changed-path calculation;
   - allowed/protected path enforcement;
   - checkout ownership;
   - stale governing-source rejection;
   - exact source digest behavior.
2. Controller state-machine semantics such as retry ownership, Operator-decision state, attempt bounds, and semantic patch disposition should use the narrowest deterministic provider fixture/seam that proves the controller behavior.
3. Do not recreate a real repository/worktree/npm process stack for every state-machine branch when lower-level provider conformance is already independently proven.
4. Keep at least one end-to-end real-provider Integration Repair path.

## Instrumentation Requirement

Before optimization, add test-only timing/count instrumentation sufficient to record:

- planning snapshot acquisitions;
- planning inventory scans;
- bounded Git process invocations;
- npm runner process invocations;
- integration checkout creations;
- per-major-stage duration in the routed end-to-end fixture.

Instrumentation may use existing test hooks or new test-only hooks. Do not add unbounded production logging.

The Implementer Report must include before/after counts and measured durations.

## Acceptance Criteria

### Routed projection

- stable routed projection: one planning inventory scan;
- no per-document snapshot reacquisition;
- scan count remains constant when fixture planning-document count increases;
- routed state/freshness semantics remain unchanged.

### Routed integration tests

- ordinary clean/conflict routed integration focus no longer replays the full predecessor lifecycle;
- one explicit wider end-to-end route still proves full production composition;
- ordinary focused routed integration completes in **under 120 seconds total** on the supported workstation;
- no individual ordinary subcase exceeds 60 seconds without a documented external/infrastructure blocker.

### Git/integration policy boundary

- full `git-mutation-boundary.test.cjs` returns to **at most the pre-today 240-second review envelope** before later TVA optimization;
- target after the remaining cards is lower, but TVA02A must eliminate the 10–18 minute regression first;
- real npm invocation count is bounded to the explicit adapter-conformance cases, not the full semantic matrix;
- semantic target-policy cases still prove policy identity/transition/freshness behavior.

### Integration Repair

- real-provider conformance remains;
- controller semantic scenarios no longer require full real-provider process setup where unnecessary;
- no loss of conflict, validation-failure, retry, stale-source, protected-path, Operator-decision, or target-isolation coverage.

## Negative Constraints

- Do not solve the regression by increasing timeouts.
- Do not merely move the 36-minute test into another lane and declare success.
- Do not merely parallelize repeated expensive work.
- Do not remove target-policy authority or candidate source integrity checks.
- Do not eliminate the real npm/process-tree tests; isolate them.
- Do not delete the end-to-end routed acceptance case; make it deliberate and bounded.
- Do not introduce stale cross-action planning caches.
- Do not change product semantics solely to satisfy a timing budget.

## Validation

Run and measure:

1. structural routed snapshot-acquisition tests;
2. ordinary focused routed clean/conflict integration;
3. explicit end-to-end routed acceptance;
4. real npm adapter conformance subset;
5. semantic target-policy subset without unnecessary real npm;
6. real repair-provider conformance subset;
7. semantic Integration Repair controller subset;
8. full `git-mutation-boundary.test.cjs` once after the decomposed proof passes.

Do not proceed to TVA02 if the full Git boundary remains above the 240-second same-day recovery envelope or ordinary routed focus remains above 120 seconds without a concrete external blocker.

## Implementer Report

Write `TVA02A_IMPLEMENTER_REPORT.md` with:

- measured before/after timings;
- before/after snapshot inventory counts;
- before/after npm and bounded Git process counts;
- exact tests moved/decomposed;
- retained end-to-end proof;
- behavioral proof that snapshot reuse remains fresh after mutation;
- any remaining hotspot above 30 seconds;
- commands/results and deviations.

## Post-Implementation

After implementation, validation, and report completion, read TVA02. Do not pause for repository-placement mechanics.
