# TSR12 Architect Review — Synthetic Validation Lane Contracts

**Review date:** 2026-09-22  
**Card:** TSR12 — Restore Synthetic Validation Lane Contracts  
**Disposition:** PASS / CLOSE  
**Owner disposition:** retain `integration-profile-gate.test.cjs`

## Result

TSR12 is conforming.

The Implementer repaired the stale synthetic ValidationCatalog fixtures exactly at the test-support boundary identified by the RCA. No product, WIR, IntegrationCandidate, validation-schema, planner, executor, or runner behavior was changed.

The remaining profile-gate failure is resolved. Retirement is not required.

## Code Review

### Shared fixture contract

`test/support/validation-fixture.cjs` now exports:

`applyValidationLaneFixtureContract(record, lane)`

The helper owns one synthetic lane mapping:

| Lane | Resources | Scheduling | Platform |
| --- | --- | --- | --- |
| ordinary | `temp-filesystem-isolated` | `parallel-safe` | any |
| desktop-platform | `electron-desktop`, `temp-filesystem-isolated` | `exclusive-desktop` | windows |
| packaging | `packaging`, `temp-filesystem-isolated` | `exclusive-packaging` | any |
| performance-soak | `performance-soak`, `temp-filesystem-isolated` | `exclusive-performance` | any |

`validationFixture()` now applies that contract before setting its scenario-specific `requiresBuild`.

This removes the prior invalid behavior where changing only `proposedValidationLane` left generic parallel/resource metadata behind.

### Profile owner reuse

`test/agent-harness/integration-profile-gate.test.cjs` imports the same helper and uses it for both stale fixture sites identified by the RCA:

1. the intentionally weaker future candidate catalog moved to `performance-soak`;
2. the four-record `prepareProfile()` catalog covering integration, desktop-platform, packaging, and performance-soak.

The test therefore no longer carries a second hand-authored lane/resource mapping.

The weaker incoming candidate remains intentionally weaker but now remains schema-valid, which restores the actual behavior being tested: target-owned authority defeats valid incoming metadata rather than merely rejecting malformed metadata.

### Change boundary

Observed implementation remains inside:
- `test/support/validation-fixture.cjs`;
- `test/agent-harness/integration-profile-gate.test.cjs`;
- Implementer Report.

No production or validation architecture changes were made.

No new permanent test was added.

## Independent Authoritative Verification

Architect review used the connected ChampCity `test_toolbox.run_test_file` path.

### Validation runner

`test/validation/validation-runner.test.cjs`

- 8/8 passed;
- zero skipped/cancelled;
- test process: 7.137 s.

### Integration profile gate — first Architect run

`test/agent-harness/integration-profile-gate.test.cjs`

- 7/7 passed;
- zero skipped/cancelled;
- test process: 25.410 s.

### Capability map

`test/validation/capability-map.test.cjs`

- 5/5 passed;
- zero skipped/cancelled;
- test process: 0.161 s.

### Integration profile gate — second consecutive Architect run

`test/agent-harness/integration-profile-gate.test.cjs`

- 7/7 passed;
- zero skipped/cancelled;
- test process: 25.467 s.

All runtime acceptance criteria are satisfied.

## Retirement Decision

Do not retire `integration-profile-gate.test.cjs`.

The one allowed repair attempt succeeded, and the owner continues to protect unique candidate-specific validation-profile behavior:

- immutable target toolkit authority;
- exact target/incoming/candidate revision binding;
- weaker-but-valid incoming metadata cannot replace target authority;
- profile evidence persistence;
- failing profile evidence blocks target eligibility;
- stale context rejection;
- repair revalidation;
- unknown-source rejection.

The repair confirms the earlier RCA: the failure was stale test fixture data, not application behavior.

## Experiment / Card Assessment

This is a successful V2.1 bounded-continuation example.

The Implementer did not need to redesign product behavior, did not use a mismatch escape hatch, and did not add more tests. The card supplied the governing invariant, exact fixture ownership, continuation envelope, and final retirement rule.

No follow-on repair is required.

## Final Disposition

- TSR12: **PASS / CLOSE**
- Test owner: **RETAIN**
- Product repair required: **NO**
- Further WIR repair required: **NO**
- Further test-maintenance repair required for this issue: **NO**
