# WIR22-REPAIR06A — Establish Project Integration Validation Policy

**Parent / failed workflow:** WIR22-REPAIR06  
**Failed evidence:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06_IMPLEMENTER_REPORT.md`  
**Required prior passing checkpoint:** `89744cb2704596aeb9acda6f254c845b7775c1af` — WIR22-REPAIR05  
**Repair Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06A_IMPLEMENTER_REPORT.md`

## Confirmed Defect

`createIntegrationCandidateService(...)` requires a bounded nonempty set of trusted main-process validation checks, but ChampCity has no production project-level provider that resolves those checks for the selected Repository.

The existing tests inject callbacks directly. That proves the integration-candidate mechanism, not a production validation policy.

## Root Cause

The validation-governance standard defines semantic lanes, but exact executable checks are intentionally project-specific. No runtime contract currently maps a selected Repository to trusted check identities and bounded application-owned runners.

Using hard-coded ChampCity commands globally, parsing Plan prose into commands, or accepting commands from a renderer/model would create the wrong authority boundary.

## Architectural Decision

Use the existing repository-owned runtime configuration namespace under `.champcity/`.

Create a bounded repository contract at:

`.champcity/integration-policy.json`

The policy defines **check identities and bounded runner adapters**, not arbitrary shell command strings.

Initial supported runner adapter for the current repository may be `npm-script`:

- the policy names an npm script;
- the runner verifies that exact script exists in the candidate checkout's `package.json`;
- execution occurs through a bounded non-shell process adapter in the isolated integration checkout;
- no free-form command, shell fragment, renderer command, or model-generated command is accepted.

Unsupported runner kinds fail closed. The contract must be extensible to future bounded ecosystem adapters without changing the integration-candidate API.

The existing `validation/` directory MUST NOT become runtime configuration; current architecture reserves it for validation metadata and prohibits production runtime behavior from importing it.

## Repair Objective

Implement the repository-owned integration-validation policy contract, loader, runner registry, and production check provider required by WIR20/REPAIR06.

## Required Correction

1. Define a strict versioned shared contract for `.champcity/integration-policy.json`.
2. Require a bounded list of unique validation checks. Each check has:
   - stable `checkId`;
   - semantic validation lane;
   - bounded runner-adapter identity and adapter-specific parameters.
3. Define the policy's nonempty `requiredIntegrationChecks` as check IDs referencing declared checks.
4. Implement main-process loading with repository containment, ordinary-file/no-symlink rules, byte/count bounds, exact-schema rejection, and fail-closed errors for missing/invalid required policy.
5. Implement a trusted runner registry. For the current repository, support bounded `npm-script` execution without arbitrary command text or arbitrary arguments.
6. Run checks against the isolated candidate checkout supplied by `integrationCandidateService`, not the operator's source checkout.
7. Bound process duration/output and convert results into the existing `IntegrationValidationEvidence` shape without persisting raw machine paths or uncontrolled diagnostics.
8. Provide a production provider that resolves `requiredIntegrationChecks` into `IntegrationCandidateHooks.checks`.
9. Add the current ChampCity Repository policy at `.champcity/integration-policy.json` using existing package scripts. Avoid duplicate build work; the policy should compose existing scripts so compilation is not unnecessarily repeated.
10. Policy changes after candidate creation must invalidate/recreate the candidate or otherwise fail closed; validation policy used for integration must be identifiable in durable evidence.
11. Do not yet wire the provider into the routed Development integration caller. Original REPAIR06 owns orchestration after 06A/06B exist.

## Preserved Behavior

- WIR20 integration-candidate safety and target-isolation behavior.
- WIR21 Integration Repair behavior.
- WIR22-REPAIR01–05 routed execution and completion.
- Existing Work Card validation selection remains separate from integration-candidate validation.
- Operator remains the product authority; validation checks provide evidence, not product disposition.

## In-Scope Surface to Inspect

- `src/main/planExecution/integrationCandidateService.ts`
- `src/shared/integrationCandidateContracts.ts`
- bounded process-execution utilities already used by ChampCity
- repository path/containment utilities
- `package.json`
- `.champcity/`
- `docs/governance/TEST_ARCHITECTURE_AND_VALIDATION_GOVERNANCE_STANDARD.md`
- `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`
- `test/agent-harness/git-mutation-boundary.test.cjs`

## Negative Constraints

- No arbitrary shell-command field.
- No command text generated by AI, Plan prose, renderer, or Work Intake input.
- No hard-coded assumption that every Project is Node/npm.
- No runtime import from `validation/capability-map.json`.
- No integration-candidate production orchestration yet.
- No Integration Repair editable-scope policy; REPAIR06B owns it.
- No Hub/UI work.

## Acceptance Criteria

1. A valid repository policy resolves a deterministic nonempty set of trusted integration checks.
2. Current ChampCity policy resolves to existing npm scripts through the bounded adapter and executes against a disposable isolated checkout.
3. Missing check ID, unsupported runner, missing package script, redirected config, malformed config, duplicate identity, timeout, and execution failure all fail visibly without advancing a target.
4. No arbitrary shell command can be supplied through the policy.
5. Check results use existing bounded `IntegrationValidationEvidence`.
6. Policy identity/content used for a candidate is detectable so changed policy cannot silently validate an old candidate.
7. Existing WIR20 integration-candidate fixture behavior remains green.

## Validation

Inspect existing proof first. Extend the existing integration boundary suite unless a distinct permanent test boundary is genuinely required.

Required:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs`

Do not run the full suite.

## Implementer Report

Write:

`docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06A_IMPLEMENTER_REPORT.md`

Include the confirmed defect/root cause, policy schema implemented, current ChampCity policy check IDs, files changed, exact validation results, test changes, and remaining blockers.

## Checkpoint

After passing validation, create exactly one checkpoint commit:

`WIR22-REPAIR06A: Establish Project Integration Validation Policy`

Do not merge, push, tag, release, or publish.

## Return to Workflow

Stop after the verified checkpoint. Do **not** open REPAIR06B in this chat.

The next independent chat receives only:

`WIR22-REPAIR06B_establish_integration_repair_scope_policy.md`
