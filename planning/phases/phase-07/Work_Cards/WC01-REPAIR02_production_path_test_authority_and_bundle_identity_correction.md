# Work Card — Phase 07 WC01-REPAIR02 Production-Path Test Authority and Bundle Identity Correction

Status: pending Operator approval through ChatGPT
Revision: 2
Phase: Phase 07
Parent: `WC01_unified_operator_decision_and_disposition_contract`
Prior repair: `WC01-REPAIR01_execution_authority_historical_bundle_validation_correction`
Repair sequence: 2
Risk: high
Owner after approval: Implementer
Recommended model: GPT-5.6 Thinking, high reasoning
Implementation authorized: no — separate Operator approval required
Git mutation authorized: no

## Purpose

Correct only the defects identified during Architect review of the WC01-REPAIR01 implementation.

The valid WC01-REPAIR01 corrections must be preserved:

- legacy `codeChangesAuthorized` authority remains removed;
- `historical_record` remains removed;
- `historical-operator-review` remains removed;
- the stage-owned historical UI remains in place;
- the permanent capability-oriented test tree remains in place;
- automatic Node test discovery remains in place;
- the Windows validation wrapper continues to propagate nonzero child exits;
- the obsolete `scripts/verify-governance-repair-approval-mounted.cjs` remains deleted.

Do not revert or replace those successful corrections.

WC01 remains unresolved. WC02 through WC13 remain unauthorized.

## Governing defects

WC01-REPAIR01 failed review because:

1. the workflow routing test manually fabricated `WorkflowDomain`, approval projections, and authorization booleans;
2. the mounted renderer file exited successfully without executing assertions when discovered by the Node unit lane;
3. historical Phase Planning and Work Card Plan rows shared a target hash but still derived different decision artifact identities;
4. runtime outcome validation did not reject unsupported outcome kinds or values and did not require a superseding identity;
5. the contract test locally reimplemented SHA-256 target hashing;
6. required adversarial decision and bundle tests were absent;
7. the Execution Run test silently added a third authority fixture that the report did not disclose.

This Work Card prescribes the exact corrections. The Implementer must not choose an alternative architecture.

## Test-change classification and preservation rule

Only one test contains fabricated product authority and is authorized for complete replacement:

`test/workflow/operator-decision-routing.test.cjs`

Every other test change in this Work Card is targeted and bounded:

- `test/renderer/operator-approval-workspace.mounted.cjs`: preserve the existing Electron fixture, UI interactions, assertions, cleanup, and failure behavior; replace only the non-Electron startup branch so Node discovery launches and waits for the same Electron assertions.
- `test/governance/operator-decision-contract.test.cjs`: preserve all existing valid normalization, reason, target-change, and validation assertions; replace only the local hash computation and add the expressly missing runtime validation cases.
- `test/governance/operator-decision-service.test.cjs`: preserve all existing production-service scenarios and assertions; add the expressly missing adversarial cases and post-decision bundle-convergence proof. Do not rebuild the suite from scratch.
- `test/execution-runs/execution-run-authority.test.cjs`: preserve the existing eligible-list, start, idempotent-repeat, wrong-revision, temporary-repository, and cleanup assertions; add explicit fixture disclosure and exact Registry assertions only.
- `test/repository/test-suite-integrity.test.cjs`: preserve every existing integrity assertion; add only the new architecture guardrails listed in Correction 8.
- `test/repository/validation-runner.test.cjs`: no change is authorized.

The Implementer must not delete, replace, weaken, consolidate, or substantially rewrite an existing passing assertion unless this Work Card identifies that exact assertion or mechanism as defective. When an existing assertion must change because of a prescribed production correction, the Implementer Report must identify the old assertion, the exact reason it was invalid, and the replacement assertion.

A smaller or differently organized test suite is not an acceptable substitute. Passing assertions unrelated to the listed defects must remain present and behaviorally equivalent.

## Correction 1 — One decision identity for both Phase Planning bundle rows

### Required production refactor

Modify only `src/main/artifacts/governanceApprovalService.ts` for this correction.

Replace the current binding-only `resolvePhasePlanningBundle()` result with one exact resolved bundle object equivalent to:

```ts
interface ResolvedPhasePlanningBundle {
  phasePlanning: VerifiedDecisionTarget;
  workCardPlan: VerifiedDecisionTarget;
  bindings: OperatorDecisionTargetBinding[];
}
```

The method must:

1. require the target to have non-empty `projectId` and `phaseId`;
2. derive historical mode only as `target.status === "historical"`;
3. select visible, registered, non-archived records with the same project, phase, and historical mode;
4. require exactly one `phase_planning` member;
5. require exactly one `work_card_plan` member;
6. read both members through `ArtifactPairService.readArtifactByPaths()`;
7. return verified entries, verified artifacts, and normalized bindings;
8. sort bindings through the production normalization function.

### Required queue behavior

In `listQueue()`:

- for either a `phase_planning` row or a `work_card_plan` row, resolve the bundle first;
- derive `TargetIdentity` from `resolved.phasePlanning.entry` for both rows;
- pass that same identity and resolved bundle into target-state calculation;
- do not call `targetIdentity()` on the Work Card Plan row itself.

Both queue rows for one bundle must expose identical:

- `approvalArtifactId`;
- target bindings;
- `targetSetHash`;
- `existingApprovalArtifactId` when decided;
- decision timeline;
- approval status;
- decision workspace screen and label.

### Required identity formulas

For a non-historical Phase Planning bundle, both rows must use:

```text
<projectId>/<phaseId>/operator_approval/Operator_Phase_Approval
```

and the existing `Operator_Phase_Approval` canonical location.

For a historical Phase Planning bundle, both rows must derive the collision-safe key from the exact Phase Planning artifact ID only:

```text
stableTargetKey(resolved.phasePlanning.artifact.artifactId)
```

Both rows must therefore use:

```text
<projectId>/<phaseId>/operator_approval/<phase-planning-derived-key>
```

and the same `OPERATOR_DISPOSITION_<phase-planning-derived-key>` file stem.

Do not derive a historical bundle decision ID from the Work Card Plan artifact ID.

### Required post-decision proof

After one exact historical Phase Planning decision is persisted:

- the Phase Planning row must be `exact`;
- the Work Card Plan row must be `exact`;
- both rows must report the same `approvalArtifactId`;
- both rows must report the same `existingApprovalArtifactId`;
- both rows must expose the same single decision event;
- no second approval artifact may be created.

## Correction 2 — Complete runtime outcome validation

Modify `src/shared/operatorDecisionContract.ts` exactly as follows.

### Export supported values

Add and export:

```ts
export const operatorStageDecisionValues = [
  "approved",
  "revision_requested",
  "rejected",
] as const;

export const operatorRecordDispositionValues = [
  "accepted_as_current",
  "accepted_as_historical_evidence",
  "superseded",
  "merged",
  "deferred",
  "cancelled",
  "invalid",
  "revision_required",
] as const;
```

Derive the corresponding value types from these arrays. Do not maintain a second handwritten union.

### Validate the discriminated union

`validateOperatorDecisionIntentShape()` must reject:

- an outcome whose `kind` is not exactly `stage_decision` or `record_disposition`;
- a `stage_decision` whose `decision` is not in `operatorStageDecisionValues`;
- a `record_disposition` whose `disposition` is not in `operatorRecordDispositionValues`;
- `merged` without a non-empty `canonicalSurvivingArtifactId`;
- `superseded` without a non-empty `supersedingArtifactId`;
- every outcome already requiring an Operator reason when the normalized reason is empty.

Do not coerce, infer, or default an unsupported value.

### Make target hashing production authority

Add and export:

```ts
export function computeOperatorDecisionTargetSetHash(input: {
  stage: OperatorDecisionStage;
  targets: readonly OperatorDecisionTargetBinding[];
}): string
```

It must compute SHA-256 over `stableOperatorDecisionTargetSetPayload(input)` and return the lowercase hexadecimal digest.

In `src/main/artifacts/governanceApprovalService.ts`:

- import and use `computeOperatorDecisionTargetSetHash()` everywhere;
- delete the local `targetSetHashFor()` helper;
- import and use `operatorDecisionOutcomeEquals()` for idempotency comparison;
- delete the local `sameDecisionOutcome()` helper.

There must be one production target-hash implementation and one production outcome-equality implementation.

## Correction 3 — Direct legacy-evidence lookup

In `GovernanceApprovalService.lookupDecisionState()`:

- derive the exact identity anchor through the same stage and bundle path used by `decide()`;
- locate an approval through `findApprovalEntryForTarget()` using that anchor and identity, not only `findDecisionArtifactEntry()`;
- when the located approval is legacy-format evidence, return `pending_operator_disposition` with that evidence;
- do not reinterpret the legacy decision as a new-system event.

Direct lookup must therefore expose legacy evidence without resolving the new exact target.

## Correction 4 — Complete rewrite of the sole fabricated test

`test/workflow/operator-decision-routing.test.cjs` is the only test authorized for complete replacement.

Rewrite that file completely because its current assertions depend on manually fabricated workflow authority rather than production-derived state.

Delete all current functions and objects that manually construct:

- `WorkflowDomain`;
- `WorkflowArtifactState`;
- phase identities;
- candidate identities;
- approval projections;
- `implementationAuthorized`;
- `phaseProgressionAuthorized`;
- kernel inputs.

The rewritten test must not import or call `resolveWorkflowKernel()` directly.

### Required production modules

Import compiled production modules from `dist/`:

- `ArtifactPairService`;
- `GovernanceApprovalService`;
- `scanVerifiedArtifactGraph`;
- `RelationshipDrivenWorkflowResolver`.

### Required scenario construction

For each routing scenario, create a separate temporary repository and:

1. create a configured project object for that temporary repository;
2. commit an active `phase_activation` artifact through `ArtifactPairService.commitArtifact()`;
3. commit one active `phase_planning` artifact;
4. commit one active `work_card_plan` artifact that identifies one planned candidate;
5. use `GovernanceApprovalService.listQueue()` to obtain the exact Phase Planning bundle;
6. approve that exact bundle through `GovernanceApprovalService.decide()`;
7. commit the Work Card through `ArtifactPairService.commitArtifact()`;
8. obtain the exact Work Card queue item through `GovernanceApprovalService.listQueue()`;
9. approve the Work Card through `GovernanceApprovalService.decide()`;
10. call `scanVerifiedArtifactGraph(configuredProject, fixedClock)`;
11. call `new RelationshipDrivenWorkflowResolver().resolve(configuredProject, graph, 1)`;
12. assert the actual production resolver result and Implementer assignment;
13. remove the temporary repository in `finally`.

### Required routing scenarios

Run these as separate isolated scenarios:

1. `requiresImplementer: true`, with `codeChangesAuthorized` absent:
   - resolver action is `implementer_execution_required`;
   - assignment references the exact Work Card approval;
   - assignment references the exact expected Implementer Report.

2. `requiresImplementer: true`, with `codeChangesAuthorized: false`:
   - result is identical in authority and route to scenario 1.

3. `requiresImplementer: false`, with `codeChangesAuthorized: true`:
   - resolver must not produce `implementer_execution_required`;
   - no Implementer assignment may be present.

Do not manually add an approval to a workflow domain. The resolver must discover authority from the exact artifacts committed to the temporary repository.

## Correction 5 — Targeted mounted-renderer launcher correction

Amend only the startup control in:

`test/renderer/operator-approval-workspace.mounted.cjs`

Preserve the existing Electron fixture construction, production artifact commits, workspace configuration, UI navigation, UI assertions, timeout handling, cleanup, and nonzero failure exits. Do not replace the mounted scenario with a new fixture or reduce its assertions.

The file must use one dual-mode launcher around those preserved Electron assertions.

### Node test-runner mode

When `process.versions.electron` is absent:

1. import `test` from `node:test`;
2. import `spawnSync` from `node:child_process`;
3. resolve the Electron executable using `require("electron")`;
4. register one Node test named:

```text
mounted Operator approval workspace executes through Electron
```

5. spawn Electron with this same file as the entry script;
6. inherit or capture output so failures are reportable;
7. assert the child process status is exactly `0`;
8. do not call `process.exit(0)` merely because the parent process is not Electron.

### Electron mode

When `process.versions.electron` is present:

- execute the existing mounted fixture setup and UI assertions;
- exit `0` only after every assertion and cleanup succeeds;
- exit nonzero on any assertion, timeout, startup, cleanup, or renderer failure.

### Prohibited bypasses

The file must not:

- print a message and return success without spawning Electron;
- call `process.exit(0)` before the mounted assertions;
- skip because Electron is unavailable;
- convert an Electron child failure into a warning.

Because `test:unit:built` uses automatic discovery, the unit lane must execute the mounted behavior through the Node test wrapper. `test:renderer:built` must also continue to execute the file directly through Electron.

## Correction 6 — Required adversarial governance tests

Update `test/governance/operator-decision-contract.test.cjs` through targeted edits only. Preserve every existing valid assertion that is unrelated to local hash duplication or the missing validation cases below.

### Remove shadow hashing

- delete the `node:crypto` import;
- delete the local `targetHash()` helper;
- import `computeOperatorDecisionTargetSetHash()` from the compiled production contract;
- use that production function for every hash assertion.

### Add runtime validation assertions

Prove rejection of:

- unsupported outcome kind;
- unsupported stage-decision value;
- unsupported record-disposition value;
- `merged` without `canonicalSurvivingArtifactId`;
- `superseded` without `supersedingArtifactId`.

Update `test/governance/operator-decision-service.test.cjs` additively. Preserve its existing temporary-repository setup, production service usage, pending lookup proof, persisted artifact assertions, idempotent retry proof, historical bundle setup, and legacy-evidence queue assertions unless a specific assertion must change to reflect the prescribed production identity correction.

Add direct production-service tests proving:

1. an exact retry with identical normalized reason is idempotent and appends no event;
2. the same outcome with a changed reason conflicts;
3. a different outcome for the same exact target set conflicts;
4. a mixed-project Phase Planning bundle is rejected;
5. a same-mode mixed-phase bundle is rejected;
6. a stale bundle is rejected after one member is revised;
7. two distinct Phase Planning records for one phase/status cause bundle resolution to fail;
8. two distinct Work Card Plan records for one phase/status cause bundle resolution to fail;
9. direct `lookupDecisionState()` against legacy evidence returns pending plus evidence;
10. one historical bundle decision resolves both queue rows to one exact approval identity and one event.

Do not reduce these to source-text assertions.

## Correction 7 — Execution Run fixture dependency must be explicit

The current `ExecutionRunAuthorityService` retains a production dependency on:

```text
champcity-ai/phase-06/architect_review/WC05
```

This repair does not authorize changing Execution Run production code.

Apply targeted changes to `test/execution-runs/execution-run-authority.test.cjs`. Preserve the existing production services, temporary-repository lifecycle, eligible-list assertion, start assertion, exact repeat-start assertion, wrong-revision assertion, and no-Phase-07 assertion.

Make the retained compatibility dependency explicit by requiring the temporary repository to contain exactly these three pre-run authority artifacts, committed in this order:

1. `planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC05_execution_pass_independent_verification_foundation_recovery.json`
2. `planning/phases/phase-06/Work_Cards/WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json`
3. `planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json`

The test must:

- state in its test name that the WC05 review is a retained compatibility dependency;
- assert the temporary Registry contains exactly those three source authority entries before starting the run;
- assert no Phase 07 entry exists;
- run eligible listing, start, exact repeat start, and wrong-revision rejection;
- remove the temporary repository;
- not read or copy the live Registry.

The Implementer Report must identify this dependency as temporary and assign its deletion to WC12.

Do not modify `src/main/executionRuns/` in this repair.

## Correction 8 — Strengthen the test-integrity enforcement

Update `test/repository/test-suite-integrity.test.cjs` to retain every existing integrity assertion and add these exact checks.

### Governance contract test integrity

For `test/governance/operator-decision-contract.test.cjs`, assert:

- it does not import `node:crypto`;
- it does not contain `createHash(`;
- it imports or references `computeOperatorDecisionTargetSetHash`.

### Workflow routing test integrity

For `test/workflow/operator-decision-routing.test.cjs`, assert it does not contain:

- `resolveWorkflowKernel`;
- `WorkflowDomain`;
- `implementationAuthorized:`;
- `phaseProgressionAuthorized:`;
- a function named `routeFor`;
- a function named `artifactState`.

Assert that it references:

- `scanVerifiedArtifactGraph`;
- `RelationshipDrivenWorkflowResolver`;
- `GovernanceApprovalService`;
- `ArtifactPairService`.

### Mounted renderer integrity

For `test/renderer/operator-approval-workspace.mounted.cjs`, assert:

- it contains a Node `test(` registration;
- it contains `spawnSync`;
- it references `require("electron")` or the equivalent single-quoted expression;
- it does not contain a non-Electron branch that calls `process.exit(0)` before spawning Electron.

### Execution Run disclosure integrity

For `test/execution-runs/execution-run-authority.test.cjs`, assert it references exactly the three approved source JSON paths above and no other Phase 06 source JSON fixture.

These source-integrity checks enforce test architecture only. They do not replace behavioral tests.

## Files authorized for modification

Production:

- `src/shared/operatorDecisionContract.ts`
- `src/main/artifacts/governanceApprovalService.ts`

Permanent tests:

- `test/workflow/operator-decision-routing.test.cjs` — complete replacement authorized because the current test fabricates workflow authority.
- `test/governance/operator-decision-contract.test.cjs` — targeted amendment only.
- `test/governance/operator-decision-service.test.cjs` — additive and targeted amendment only.
- `test/execution-runs/execution-run-authority.test.cjs` — targeted fixture-disclosure and Registry-assertion amendment only.
- `test/renderer/operator-approval-workspace.mounted.cjs` — targeted launcher amendment only; existing Electron scenario and assertions must remain.
- `test/repository/test-suite-integrity.test.cjs` — additive guardrails only.

Report:

- `planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR02_production_path_test_authority_and_bundle_identity_correction.md`

No other production, test, script, package, policy, renderer, preload, Registry, planning, or workflow file is authorized.

## Files that must remain unchanged

Do not modify:

- `package.json`;
- `scripts/codex-validate.ps1`;
- `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`;
- `src/renderer/app/App.tsx`;
- `src/shared/projects/projectWorkspace.ts`;
- `src/main/workflow/normalizedWorkflowDomainAdapter.ts`;
- any file under `src/main/executionRuns/`;
- `test/repository/validation-runner.test.cjs`;
- WC01, WC01-REPAIR01, or either prior Implementer Report.

The current valid changes in those files are preserved as the starting baseline for this repair.

## Prohibited substitutions

Do not:

- manually construct workflow domain or approval authority in a behavioral test;
- duplicate production hashing or outcome comparison in test code;
- add a helper module under `test/`;
- add another test file;
- rename the seven permanent test files;
- add a test whitelist;
- add a Work-Card-named test path;
- restore a deleted legacy test;
- invoke `scripts/verify-*` from an npm test command;
- use source-text inspection as product-behavior proof;
- delete, weaken, replace, or substantially rewrite an existing valid test assertion outside the exact defective mechanisms identified by this Work Card;
- collapse multiple existing behavioral assertions into a broader but less specific assertion;
- silently skip Electron assertions;
- alter Execution Run production authority;
- restore the obsolete ChampCity_GPT Phase 07 WC01 pair;
- perform Git staging, commit, push, reset, clean, stash, restore, merge, rebase, tag, release, or history rewriting.

## Required validation

Use the documented normal Windows lanes and run every command:

```text
npm run typecheck
npm run build
npm run test:unit
npm run test:repository
npm run test:renderer:built
npm run test:full
npm run validate:codex:unit
npm run validate:codex:build
npm run validate:codex
```

Do not use Playwright.

No failed, bypassed, or skipped test is permitted.

The unit lane must report seven discovered Node tests, including the mounted renderer test that spawns Electron and waits for its actual result.

The report must distinguish:

- Node test count;
- Electron child execution count;
- direct renderer-lane execution count;
- passed, failed, skipped, and cancelled tests;
- wrapper and child exit codes.

A successful parent exit with unexecuted child assertions is a failure.

## Implementer Report

Create only:

`planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR02_production_path_test_authority_and_bundle_identity_correction.md`

The report must include:

- verified repository, remote, branch, starting HEAD, parent WC01 hash, WC01-REPAIR01 hash, and WC01-REPAIR02 hash;
- initial and final Git status;
- exact files changed;
- a test-preservation table listing each existing test file, whether it was completely rewritten or targeted, the exact pre-existing assertions preserved, the exact assertions changed, and the reason for each change;
- confirmation that only `test/workflow/operator-decision-routing.test.cjs` was completely rewritten;
- exact production symbols changed;
- proof that both historical bundle rows converge on one approval artifact before and after decision;
- proof of runtime rejection for every unsupported outcome case;
- proof that tests use production target hashing;
- proof that the workflow routing test traverses production artifact persistence, scan, normalization, and resolver paths;
- proof that no workflow domain or approval boolean is manually constructed;
- proof that Node discovery executes the mounted Electron behavior rather than bypassing it;
- proof for every adversarial decision and bundle case;
- explicit disclosure of the WC05 Architect Review compatibility dependency and WC12 deletion ownership;
- exact validation commands, lanes, parent/child exit codes, and test counts;
- a criterion-by-criterion evidence table citing production symbol, test file, test name, command, and observed result;
- confirmation that no unauthorized file changed;
- confirmation that no Git mutation occurred;
- confirmation that no later Work Card was implemented.

Do not create a JSON sidecar, Registry entry, application approval artifact, release, package, tag, or commit.

## Acceptance criteria

WC01-REPAIR02 is acceptable only when:

1. both Phase Planning bundle rows derive identity from the exact Phase Planning anchor;
2. both rows expose one approval ID before decision and one existing approval ID after decision;
3. one bundle decision makes both rows exact without creating a second approval artifact;
4. unsupported outcome kinds, decisions, and dispositions are rejected at runtime;
5. `superseded` requires a superseding artifact ID;
6. production owns target hashing and outcome equality;
7. no governance test locally implements target hashing;
8. direct legacy-evidence lookup returns pending plus evidence;
9. changed-reason and different-outcome conflicts are behaviorally proven;
10. mixed-project, mixed-phase, stale, duplicate-Phase-Planning, and duplicate-Work-Card-Plan cases are rejected;
11. the workflow routing test uses the complete production persistence, scan, normalization, and resolver path;
12. no workflow domain, approval projection, or authorization boolean is fabricated by the test;
13. Node automatic discovery executes the mounted renderer assertions through Electron;
14. the mounted file contains no successful non-Electron bypass;
15. the Execution Run test explicitly uses exactly three documented authority source artifacts;
16. the WC05 review dependency is disclosed and assigned to WC12;
17. all existing test-tree and validation-wrapper integrity protections remain green;
18. all seven permanent capability files remain the only files under `test/`;
19. every required validation command passes with zero failed, skipped, cancelled, or bypassed tests;
20. only `test/workflow/operator-decision-routing.test.cjs` is completely rewritten;
21. all unaffected valid assertions in the other permanent tests are preserved and remain behaviorally equivalent;
22. the Implementer Report identifies every removed or changed assertion and proves that each change was expressly required by this Work Card;
23. no unauthorized file or Git state is changed;
24. the Implementer Report provides exact non-narrative evidence for every criterion.

## Manual validation after Architect review

No new Operator manual UI step is added by this repair. The Operator validation procedure remains the WC01-REPAIR01 procedure:

1. historical Work Card opens Work Card Approval and is visibly historical;
2. historical Phase Planning opens Operator Phase Approval and shows both exact members;
3. no Historical Review destination exists;
4. approved implementation Work Card shows no separate code-change authorization control;
5. legacy evidence remains visible without resolving the exact pending target.

WC01 remains unresolved until WC01-REPAIR02 is implemented, independently reviewed, and accepted. WC02 through WC13 remain unauthorized.
