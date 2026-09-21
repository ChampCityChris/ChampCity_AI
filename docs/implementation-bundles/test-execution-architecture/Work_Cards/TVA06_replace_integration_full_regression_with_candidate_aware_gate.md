# TVA06 — Replace Integration Full Regression with the Candidate-Aware Integration Gate

**Order:** 7 of 10  
**Depends on:** TVA01–TVA05 and current target-owned integration validation policy  
**Governing architecture:** `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA06_IMPLEMENTER_REPORT.md`

## Failed Integration Evidence

Current `.champcity/integration-policy.json` requires `typecheck`, `build`, and `test:unit:built` for every candidate. The latter executes every test serially, making routine HOTFIX20 integration exceed 26 minutes of Operator wall-clock time.

The current integration runner accepts only fixed npm-script checks and does not receive exact target/incoming/candidate context for affected-capability planning.

## Objective

Replace the routine integration full-regression check with a target-owned, candidate-aware `integration-gate` validation profile while preserving exact candidate/target safety and the ability to request broader profiles when warranted.

## Required Changes

1. Extend the integration validation runner contract with an application-owned validation-profile runner kind or equivalent semantic adapter.
2. The repository policy may select only a registered profile identity and bounded timeout/options; it may not inject arbitrary commands or test paths.
3. Supply immutable runner context from IntegrationCandidate:
   - repository identity;
   - target revision;
   - incoming revision;
   - candidate revision;
   - target integration identity;
   - supported platform/environment facts required by planner.
4. Compute target→candidate changed paths mechanically through application-owned source-control code.
5. Use TVA05 planner to create the `integration-gate` plan.
6. The gate must:
   - establish static/build proof once;
   - run affected fast proof;
   - run affected integration proof;
   - run any small repository-wide sentinels explicitly declared by profile;
   - verify candidate remains clean/unchanged.
7. By default exclude Desktop, packaging, migration-unaffected, performance/soak, and full-regression lanes.
8. Allow target policy/profile rules to add a wider lane when the changed capability requires it.
9. Preserve target-owned policy identity, exact target script/profile trust, controlled policy transition, sanitized failure evidence, and stale-target rejection.
10. Update `.champcity/integration-policy.json` and `PROJECT_INTEGRATION_VALIDATION_POLICY.md` only after the replacement profile passes its own focused proof.
11. Retain an explicit full-regression profile for phase/release or target policy that genuinely requires it.

## Safety Invariants

- No candidate advances without all selected required checks passing.
- Candidate selection is based on exact immutable revisions, not working-tree guesses.
- Unknown changed source blocks planning/integration.
- Incoming implementation changes cannot weaken the target-owned validation profile that judges them.
- Integration Repair revalidation uses the same profile identity and candidate-aware plan semantics.

## Acceptance Criteria

1. A HOTFIX20-shaped MCP lifecycle fixture selects MCP/static/integration proof without performance/soak/Desktop/packaging/full regression.
2. A renderer-only fixture excludes Agent Harness process/soak proof.
3. A source-control/integration-policy fixture selects appropriate source-control integration sentinels.
4. Unknown/unmapped changed source blocks integration.
5. Explicit profile/policy can still request full regression for a broad candidate.
6. Target policy identity and candidate source integrity protections remain green.
7. Ordinary integration-gate measured runtime is within the architecture review threshold on the supported workstation or has a documented in-scope blocker before TVA09.
8. No regression in Integration Repair revalidation.

## Primary Surfaces

- `.champcity/integration-policy.json`
- `src/shared/integrationPolicyContracts.ts`
- `src/main/planExecution/integrationPolicyProvider.ts`
- `src/main/planExecution/integrationPolicyRunners.ts`
- `src/main/planExecution/integrationCandidateService.ts`
- source-control diff adapter
- validation planner/executor
- `test/agent-harness/git-mutation-boundary.test.cjs`

## Validation

Focused integration-policy/candidate fixture tests are mandatory.

Do not use the legacy monolithic full suite as the only proof that the new gate works. An explicit one-time full supported-platform regression may be run after the focused replacement passes, but its cost is not the acceptance metric for ordinary integration.

## Implementer Report

Include old/new policy composition, exact selected plans for representative candidates, target-policy safety proof, measured integration-gate duration, excluded lanes with reasons, commands/results,.

## Post-Implementation

After implementation, validation, and report completion, read TVA07. Do not pause for source-control mechanics.
