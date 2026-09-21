# TSR07 — Repair IntegrationCandidate and Release-Toolbox Failures

**Type:** Repair Work Card  
**Parent:** Test Suite Recovery

## Failed Evidence

### IntegrationCandidate

`test/agent-harness/integration-candidate-semantics.test.cjs` takes ~118 s and currently fails the `remote-target` scenario because post-merge validation reports `validation-failed` where the test expects `validated`.

The file also performs approximately 2,111 bounded Git operations across seven candidate scenarios.

### Release toolbox

`test/agent-harness/release-toolbox-boundary.test.cjs` has one concrete failure:

`production command adapter fixes executables, arguments, deadlines, and safe receipt paths`

with:

`killer.on is not a function`

## Objective

Repair the actual IntegrationCandidate/release process defects while reducing unnecessary repeated real-provider setup where semantic cases do not require it.

## Required Work

1. RCA the `remote-target` validation failure against current target-owned validation semantics.
2. Preserve stale-target/remote-movement safety; do not make the test pass by weakening source integrity.
3. Separate semantic IntegrationCandidate cases from repeated real Git/provider conformance where existing narrower owners already prove mechanics.
4. Repair the release process-tree termination adapter so mocked/real killer behavior follows the supported contract.
5. Keep release-toolbox boundary proof intact.
6. Reconcile capability metadata/timings if test ownership changes.

## Acceptance

1. Current remote-target behavior is either repaired to the governing contract or the stale expectation is corrected with architecture evidence.
2. Release command termination no longer throws `killer.on is not a function`.
3. The IntegrationCandidate semantic owner completes in under 60 seconds unless a remaining wider sentinel is explicitly justified.
4. Source-control safety and target-owned validation remain fail closed.
5. Focused named owners pass.

## Focused Proof

Only IntegrationCandidate/provider owners necessary for the remote-target path and `release-toolbox-boundary.test.cjs`. No full suite.

## Repair Implementer Report

Write `docs/implementation-bundles/test-suite-recovery/Implementer_Reports/TSR07_IMPLEMENTER_REPORT.md`.
