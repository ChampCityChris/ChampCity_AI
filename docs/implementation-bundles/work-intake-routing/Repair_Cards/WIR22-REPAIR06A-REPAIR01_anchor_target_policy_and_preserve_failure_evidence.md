# WIR22-REPAIR06A-REPAIR01 — Anchor Integration Validation to Target Policy and Preserve Failure Evidence

**Parent Repair Card:** `WIR22-REPAIR06A — Establish Project Integration Validation Policy`  
**Failed review evidence:** Architect review of the uncommitted REPAIR06A implementation on 2026-09-20  
**Parent Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06A_IMPLEMENTER_REPORT.md`  
**Starting baseline:** `927d1bf5907a66fbcd712cc37ca538ef422d2cb2` plus the current uncommitted REPAIR06A implementation  
**Repair Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06A-REPAIR01_IMPLEMENTER_REPORT.md`

## Confirmed Defects

The REPAIR06A implementation correctly introduced a strict repository-owned integration policy and bounded `npm-script` runner, but review identified two defects in the trust/evidence boundary.

### Defect 1 — Incoming work can currently weaken its own integration policy

The production provider loads `.champcity/integration-policy.json` from the selected incoming Work Intake checkout, and the npm runner resolves the named script from that candidate's `package.json`.

The SHA-256 guard proves consistency with those incoming bytes, but it does **not** prove that the checks are the trusted policy that governed the target before the incoming work existed.

An incoming branch could therefore weaken `.champcity/integration-policy.json` and/or replace a required npm script body with an unconditional success before candidate creation. The current implementation would faithfully bind and execute the weakened incoming policy.

### Defect 2 — Validation failure evidence is too weak for Integration Repair

The npm runner currently discards stdout/stderr and persists only generic summaries such as:

`Required npm script failed.`

WIR21 intentionally passes `record.validation` into the Integration Repair handoff. A generic failure label does not provide enough bounded semantic evidence to identify the failed test/contract or repair the post-merge semantic conflict.

Raw uncontrolled process output must still not be persisted, but complete suppression of useful diagnostic context breaks the downstream Integration Repair contract.

### Governance defect — new architecture contract is not registered

`docs/architecture/PROJECT_INTEGRATION_VALIDATION_POLICY.md` is a runtime-governing architecture contract but is not registered in `docs/architecture/CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md`.

## Root Cause

REPAIR06A bound policy identity to the **incoming repository state** rather than the immutable integration target baseline. The runner likewise treats the candidate's package-script definition as the executable definition of a trusted check.

The evidence adapter then overcorrects for diagnostic safety by discarding all process output instead of deterministically reducing it to a bounded sanitized failure summary.

## Architectural Decision

### Target-owned policy is authoritative for the current integration

The validation policy used to judge an incoming Work Intake MUST be resolved from the immutable target commit selected for that integration candidate.

The incoming branch may contain a proposed future policy, but that proposed policy does not govern its own integration.

At candidate construction:

1. determine the immutable target commit through the existing integration-target resolution;
2. read the target commit's `.champcity/integration-policy.json` through bounded application-owned Git/read mechanics;
3. parse that target policy with the existing strict REPAIR06A contract;
4. resolve the required checks/runners from that trusted target policy;
5. bind the exact target-policy digest to the candidate receipt.

The implementation may generalize the REPAIR06A provider/hook contract as needed so policy resolution occurs when the target commit is known. Do not retain a production design where the service snapshots policy from the incoming checkout before target resolution.

### Required npm scripts are also target-trusted definitions

For the current `npm-script` adapter, an incoming Work Intake MUST NOT be able to change the implementation of a check that is judging that same Work Intake.

For every required target-policy npm script:

- resolve the trusted script definition from the target commit's bounded `package.json`;
- before execution, require the candidate checkout to contain the same script definition for that required script;
- if the required script definition differs or is missing, fail closed and do not advance the target.

This repair does **not** create a general policy/script migration mechanism.

A legitimate policy evolution may be integrated under the previously trusted target policy, provided the currently required target-owned check definitions remain intact for that integration. A later Work Intake can then operate under the newly integrated policy. Changes that require replacing currently governing script definitions must be decomposed into a safe transition rather than weakening the current candidate's gate.

### Incoming replacement policy may not govern the current candidate

If the incoming candidate changes `.champcity/integration-policy.json`:

- the candidate is still validated under the target policy;
- the incoming policy must at minimum parse as a valid supported policy before target advancement if it will become the new target policy;
- its bytes/check identities do not replace the target policy for the current candidate;
- the candidate receipt identifies the target policy used for validation.

### Failure evidence must be useful but bounded

The npm runner may capture process output transiently, but durable `IntegrationValidationEvidence.summary` must be deterministic, bounded, and sanitized.

On failure, preserve enough semantic context to identify the failing validation boundary when available, such as:

- failing test/check name;
- assertion/error headline;
- short relevant failure message;
- repository-relative source/test reference where safely derivable.

Do not persist:

- candidate checkout absolute paths;
- user/home/temp paths;
- environment dumps;
- credentials/tokens/private-key material;
- uncontrolled full stdout/stderr;
- unbounded stack traces or logs.

Use a small fixed diagnostic budget. Prefer deterministic line selection/redaction over AI summarization. If safe diagnostic extraction cannot produce useful content, fall back to a fixed generic failure summary.

The existing Integration Repair source-text safety checks remain authoritative for persisted prompt content.

## Repair Objective

Correct only the REPAIR06A trust and failure-evidence defects while preserving its already-passing schema, containment, runner registry, timeout/output/process-tree, isolated-checkout, and candidate-safety behavior.

## Required Correction

1. Change the production validation-policy provider so the integration candidate's required checks are resolved from the **immutable target commit**, not the incoming/source checkout.
2. Add or reuse a bounded Git blob/read primitive capable of reading only the required repository-relative policy/manifest files from an exact commit without switching the implementation repository branch.
3. Bind the exact target-policy SHA-256 to `IntegrationCandidateRecord.validationPolicySha256` and candidate identity.
4. Ensure candidate creation, validation, service recreation, and target advancement all continue to use/verify the same target-policy identity.
5. Remove the current requirement that the candidate checkout's policy bytes equal the target policy. An incoming policy update may exist but cannot govern the current candidate.
6. If the candidate contains a changed `.champcity/integration-policy.json`, validate that proposed replacement against the strict supported schema before target advancement.
7. For every target-policy `npm-script` check, resolve the trusted script definition from the target commit's `package.json`.
8. Before executing a required npm-script check, require the candidate's same script definition to match the trusted target definition exactly. Missing or changed required script definition fails closed.
9. Preserve execution cwd as the isolated integration checkout so checks evaluate candidate source, not target source.
10. Replace generic-only failed npm evidence with a deterministic bounded sanitizer/extractor that retains useful failure context when safely available.
11. Keep durable summaries within the existing `IntegrationValidationEvidence` contract unless a narrowly justified bounded contract extension is required.
12. Prove that absolute candidate/user/temp paths and credential-shaped content do not survive into durable validation summaries.
13. Register `PROJECT_INTEGRATION_VALIDATION_POLICY.md` in `CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md` with its runtime-governing role.
14. Update `PROJECT_INTEGRATION_VALIDATION_POLICY.md` to state the target-owned trust model, target-script integrity rule, controlled policy-transition behavior, and bounded diagnostic-evidence contract.
15. Do not implement REPAIR06B or original REPAIR06 orchestration in this repair.

## Preserved Behavior

- Strict versioned `.champcity/integration-policy.json` schema.
- No free-form command or argument fields in policy.
- `validation/` remains non-runtime metadata.
- Bounded ordinary-file/containment/no-redirection policy reads.
- Bounded `npm-script` adapter and application-owned runner registry.
- Non-shell process launch of npm itself.
- Fixed timeout and output ceilings.
- Process-tree termination on timeout/output overflow.
- Validation executes against isolated integration candidate checkout.
- WIR20 candidate isolation/target advancement safety.
- WIR21 Integration Repair Git ownership and semantic-repair boundary.
- Direct application-injected test hooks remain compatible where explicitly used by existing WIR20/WIR21 fixtures.
- No routed Development orchestration yet.

## In-Scope Surface to Inspect

- `src/main/planExecution/integrationPolicyProvider.ts`
- `src/main/planExecution/integrationPolicyRunners.ts`
- `src/main/planExecution/integrationPolicyFiles.ts`
- `src/main/planExecution/integrationCandidateService.ts`
- `src/shared/integrationCandidateContracts.ts`
- `src/shared/integrationPolicyContracts.ts`
- bounded Git read/plumbing under `src/main/agentHarness/repository/`
- `test/agent-harness/git-mutation-boundary.test.cjs`
- `docs/architecture/PROJECT_INTEGRATION_VALIDATION_POLICY.md`
- `docs/architecture/CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md`
- current `.champcity/integration-policy.json`

Only modify additional files when required to implement these exact boundaries.

## Negative Constraints

- No policy resolution from incoming/source working-tree bytes for production integration.
- No renderer/model/Plan-supplied validation commands.
- No arbitrary shell-command contract.
- No weakening of required checks because the incoming branch changed its policy.
- No executing a changed candidate npm script as though it were the trusted target check.
- No automatic broad policy migration mechanism.
- No raw stdout/stderr persistence.
- No AI-generated diagnostic summarization.
- No secrets or absolute machine paths in durable evidence.
- No REPAIR06B editable-scope work.
- No original REPAIR06 production orchestration.
- No Hub/UI work.
- No merge, push, tag, release, or publication.

## Acceptance Criteria

1. A candidate with unchanged policy/scripts is validated using the exact policy from the immutable target commit.
2. Candidate receipt records the SHA-256 of the **target** validation policy used for the integration.
3. An incoming branch that weakens `.champcity/integration-policy.json` cannot reduce or replace the current candidate's required checks.
4. A syntactically invalid incoming replacement policy blocks target advancement.
5. A valid incoming future-policy change may coexist with current validation but does not govern the current candidate.
6. An incoming change that modifies/removes the currently required target npm script definition fails closed before that check can be treated as passing.
7. Required checks still execute with cwd/source from the isolated candidate checkout.
8. Service recreation cannot advance a candidate under a different target-policy identity.
9. Policy/target changes invalidate stale candidate advancement as already required by WIR20.
10. A deliberately failing validation test produces bounded durable evidence identifying the failing test/check or assertion context when safely available.
11. Durable failure evidence contains no candidate absolute path, user/home/temp path, credential/token fixture, or uncontrolled full log.
12. Timeout/output-overflow/non-start failures continue to produce bounded fixed summaries and preserve the target.
13. Existing WIR20/WIR21 candidate and Integration Repair scenarios remain green.
14. `PROJECT_INTEGRATION_VALIDATION_POLICY.md` is registered in the architecture corpus and accurately documents the repaired trust model.

## Regression Proof

Inspect existing proof and `validation/capability-map.json` before adding tests. Prefer extending `test/agent-harness/git-mutation-boundary.test.cjs` at the existing policy/candidate boundary.

Required focused scenarios include:

- strong target policy + weakened incoming policy → target checks still govern;
- target policy + changed required candidate script body → blocked;
- target policy + valid incoming future policy + unchanged current required scripts → current checks still run under target policy;
- invalid incoming replacement policy → advancement blocked;
- failed test with useful assertion/test identity → bounded sanitized summary retained;
- diagnostic containing candidate absolute path/home/temp/token fixture → sensitive content redacted/omitted;
- timeout/output overflow → existing fixed bounded summary and target unchanged;
- service recreation/stale target policy → advancement blocked;
- original direct-hook WIR20/WIR21 scenarios still pass.

Required commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs`
- `git diff --check`

Do not run the full suite. WIR23 retains bundle-wide regression ownership.

## Repair Implementer Report

Write:

`docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06A-REPAIR01_IMPLEMENTER_REPORT.md`

Include:

- confirmed defects/root cause;
- target-policy resolution mechanism;
- target package-script integrity mechanism;
- incoming policy transition behavior;
- diagnostic sanitization/bounds;
- files changed;
- exact command results;
- test reuse/extensions/new tests with coverage-gap justification;
- any residual limitation requiring Operator judgment.

Do not claim REPAIR06A complete if the trust or diagnostic boundaries above remain unresolved.

## Source-Control Scope

Do not create a checkpoint commit unless the Operator explicitly directs Git after review.

When later authorized, this repair and the parent REPAIR06A implementation may be checkpointed together using the parent repair's intended commit identity if the Operator chooses, or as a separate child-repair commit if directed. Do not infer that choice from this card.

## Manual Validation

None. This is a production policy/security/evidence repair. Final running-product and integration acceptance remains WIR23.

## Return to Workflow

After implementation, stop for Architect review.

Do not open REPAIR06B in this chat.
