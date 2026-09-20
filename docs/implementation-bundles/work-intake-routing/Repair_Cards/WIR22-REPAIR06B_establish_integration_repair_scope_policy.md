# WIR22-REPAIR06B — Establish Integration Repair Scope Policy

**Parent / failed workflow:** WIR22-REPAIR06  
**Depends on:** passing WIR22-REPAIR06A checkpoint and report  
**Failed evidence:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06_IMPLEMENTER_REPORT.md`  
**Repair Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06B_IMPLEMENTER_REPORT.md`

## Confirmed Defect

WIR21's Integration Repair controller correctly requires an application-owned `IntegrationRepairPolicy`, but no production provider determines:

- the bounded source files an Integration Repair agent may edit; or
- the additional architecture/contract evidence supplied alongside the mandatory Work Intake and approved Plan.

The test suite injects fixture-specific policies. That is not a production policy.

## Root Cause

Integration Repair was implemented before a project-owned integration policy existed. The controller therefore has enforcement mechanics but no deterministic Repository-specific scope resolver.

Letting the model choose its own editable files or governing contracts would make the model the authority over its own repair boundary.

## Architectural Decision

Extend the repository-owned runtime policy introduced by REPAIR06A at:

`.champcity/integration-policy.json`

with a bounded **repair policy** section.

The repository policy defines:

- allowed editable roots;
- optional explicitly excluded/protected roots or paths;
- bounded architecture/contract evidence paths.

For each failed integration candidate, ChampCity derives the **actual editable file list deterministically** from candidate evidence:

1. mechanical conflict paths; plus
2. files changed by the incoming Work Intake relative to the current target/integration candidate;

then filters that set through the configured allowed/protected boundaries.

The agent does not select or expand this set.

If required repair would need a file outside the resolved bounded set, the repair stops for Operator/replanning rather than silently broadening scope.

The mandatory current Work Intake and approved Plan remain automatically included as governing evidence. Configured architecture/contract sources supplement them and are never editable through Integration Repair.

## Repair Objective

Implement the project-owned Integration Repair policy contract and resolver that produces a valid bounded `IntegrationRepairPolicy` for the current integration candidate.

## Required Correction

1. Extend the REPAIR06A policy schema with a strict repair section containing:
   - bounded allowed editable roots;
   - optional protected/excluded roots or paths;
   - bounded governing evidence entries with role `architecture` or `contract`.
2. Validate every configured path as repository-relative, contained, nonredirected, and appropriate for its role.
3. Build the production resolver from current Integration Candidate, Work Intake branch binding, approved Plan, and source-control diff/conflict evidence.
4. Always include exactly one current Work Intake and exactly one current approved Plan in `IntegrationRepairPolicy.sources`.
5. Add only configured current architecture/contract documents as supplemental governing sources; stale/missing/redirected sources fail closed.
6. Derive `editablePaths` from candidate conflict paths and candidate/incoming changed-file evidence, filtered by policy boundaries.
7. Exclude Intake, Plan, policy configuration, governing architecture/contracts, Git metadata, generated/dependency output, and any protected path from editability.
8. Preserve the existing Integration Repair bound of at most 32 editable paths. If the deterministic set exceeds the bound, is empty when repair requires edits, or contains an out-of-policy conflict, stop with an Operator/replanning-required result.
9. Do not allow the renderer, model, or Repair prompt to add paths after resolution.
10. Provide the production `repairPolicy` provider expected by `createIntegrationCandidateService` / `createIntegrationRepairController`.
11. Extend the current ChampCity `.champcity/integration-policy.json` with the minimal stable editable roots and governing architecture/contracts needed for this Project.
12. Do not wire the integration service into routed Development yet; original REPAIR06 owns that final orchestration.

## Preserved Behavior

- WIR21 source-patch/hash/index guards remain unchanged.
- Current Integration Candidate remains target-isolated.
- Intake and approved Plan intent are always mandatory governing evidence.
- Git remains machine-owned.
- Agent remains limited to source edits inside the resolved repair set.
- REPAIR06A trusted validation checks remain separate from repair-source scope.

## In-Scope Surface to Inspect

- `src/shared/integrationRepairContracts.ts`
- `src/main/planExecution/integrationRepairService.ts`
- `src/main/planExecution/integrationCandidateService.ts`
- source-control diff/integration inspection services
- repository containment/path-policy utilities
- `.champcity/integration-policy.json`
- `test/agent-harness/git-mutation-boundary.test.cjs`

## Negative Constraints

- No model-selected editable paths.
- No renderer-selected editable paths.
- No wildcard allowing the whole Repository.
- No editing Work Intake, approved Plan, integration policy, or governing contracts.
- No automatic scope expansion after a failed repair attempt.
- No separate Integration Repair engine.
- No routed Development orchestration; original REPAIR06 remains downstream.

## Acceptance Criteria

1. A conflicted candidate resolves an editable set containing only in-policy conflicted/changed source files.
2. A validation-failed candidate with no textual conflict resolves the bounded incoming-change set needed for semantic repair.
3. Intake and Plan are present exactly once as governing sources.
4. Configured architecture/contract evidence is current, contained, bounded, and noneditable.
5. Out-of-policy conflict, protected path, excessive path count, missing/stale governing source, or policy change fails closed.
6. An agent cannot add an unapproved file through its patch request.
7. Existing WIR21 repair attempts, hash guards, staging guards, retries, and Operator-decision behavior remain green.
8. Production code can supply `repairPolicy` without fixture-only callbacks.

## Validation

Prefer extending the existing integration/repair scenario family.

Required:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs`

Do not run the full suite.

## Implementer Report

Write:

`docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06B_IMPLEMENTER_REPORT.md`

Include resolved policy rules, current ChampCity allowed/protected boundaries and governing sources, files changed, exact validation, failure cases proven, and remaining blockers.

## Checkpoint

After passing validation, create exactly one checkpoint commit:

`WIR22-REPAIR06B: Establish Integration Repair Scope Policy`

Do not merge, push, tag, release, or publish.

## Return to Workflow

Stop after the verified checkpoint.

The next chat should receive the **existing original**:

`docs/implementation-bundles/work-intake-routing/Repair_Cards/WIR22-REPAIR06_wire_routed_completion_to_machine_owned_git_and_integration_services.md`

REPAIR06 must re-read the passing 06A/06B reports and resume from its original objective. Do not combine REPAIR06 implementation into this chat.
