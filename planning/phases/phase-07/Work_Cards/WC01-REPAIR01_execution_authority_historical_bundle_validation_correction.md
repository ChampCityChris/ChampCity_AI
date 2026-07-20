# Work Card — Phase 07 WC01-REPAIR01 Execution Authority, Historical Bundle, and Validation Correction

Status: pending Operator approval through ChatGPT
Phase: Phase 07
Parent: `WC01_unified_operator_decision_and_disposition_contract`
Repair sequence: 1
Risk: high
Owner after approval: Implementer
Recommended model: GPT-5.6 Thinking, high reasoning
Implementation authorized: no — separate Operator approval required
Git mutation authorized: no

## Purpose

Correct only the defects found in the WC01 implementation review. WC01 remains unresolved. WC02 through WC13 remain unauthorized.

Source report:

`planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC01_unified_operator_decision_and_disposition_contract.md`

## Defect 1 — Legacy execution gate remains active

`src/main/artifacts/governanceApprovalService.ts` still requires both `requiresImplementer === true` and `codeChangesAuthorized === true` before an approved Work Card can route to execution.

### Required fix

1. Delete the current `canAuthorizeImplementation()` behavior.
2. Replace it with `workCardRequiresImplementer()` or an equivalently direct helper.
3. The helper returns true only for a Work Card whose payload has `requiresImplementer === true`.
4. The helper must not read `codeChangesAuthorized`, `sourceCodeChangesAuthorized`, `implementationAuthorized`, `authorizationGranted`, `executionPassesAuthorized`, `pushAuthorized`, or renamed equivalents.
5. Use that helper for queue projection and for the temporary in-memory execution projection after an exact `approved` Work Card decision.
6. The Work Card’s declared Implementer Report expected output may be copied into the new approval artifact only when `requiresImplementer === true` and the exact decision is `approved`.
7. Do not migrate or delete legacy fields from repository artifacts; ignore them.

Required behavior:

- `requiresImplementer: true`, with `codeChangesAuthorized` absent, routes to execution after exact approval.
- `requiresImplementer: true`, with `codeChangesAuthorized: false`, behaves identically.
- `requiresImplementer: false`, with `codeChangesAuthorized: true`, does not route to execution.
- Changing only `codeChangesAuthorized` changes no decision, hash, queue, or route result.

## Defect 2 — Historical records use a separate approval class and screen

The implementation added `historical_record` and `historical-operator-review`. Historical status must not create a separate decision class or workspace.

### Required fix

In `src/shared/projects/projectWorkspace.ts`:

- remove `historical_record` from `approvalClassification`;
- remove `historical-operator-review` from `decisionWorkspaceScreenId`.

In `src/main/artifacts/governanceApprovalService.ts`:

- derive classification from stage and artifact type, never status;
- historical Work Cards use stage `work_card`, classification `work_card`, screen `operator-work-card-approval`, label `Work Card Approval`;
- historical Phase Planning and Work Card Plan records use stage `phase_planning`, classification `phase_planning`, screen `operator-phase-approval`, label `Operator Phase Approval`;
- historical status remains available through `status` and legacy evidence;
- collision-safe decision artifact paths may remain, but must not change stage, class, screen, or semantics.

In `src/renderer/app/App.tsx`:

- delete the `historical-operator-review` screen ID;
- delete the Historical Review navigation item;
- delete the separate historical screen mapping;
- display historical status and evidence inside the existing stage-owned approval workspace.

Update `src/renderer/global.d.ts` only if needed by the type removal. Do not add an alias screen.

Update `scripts/verify-governance-repair-approval-mounted.cjs` so historical outcome selection uses item status and stage, while asserting a normal stage-owned screen.

## Defect 3 — Historical Phase Planning does not form the exact stage bundle

Add `resolvePhasePlanningBundle()` in `governanceApprovalService.ts`.

Given a Phase Planning or Work Card Plan target, it must:

1. require project ID and phase ID;
2. set `historicalMode = target.status === "historical"`;
3. select visible, registered, non-archived entries with the same project and phase, type `phase_planning` or `work_card_plan`, and the same historical mode;
4. require exactly one `phase_planning` and exactly one `work_card_plan`;
5. reject missing or duplicate members;
6. read and verify both exact pairs;
7. return exactly those two normalized bindings.

Use this helper for current and historical Phase Planning queue items. Remove the condition that excludes historical targets. Both queue representations of one bundle must expose the same bindings and `targetSetHash`.

## Defect 4 — Multi-target decisions trust invalid membership

Add `verifyDecisionTargetSet()` and call it from both `decide()` and `lookupDecisionState()` after exact reads and before lookup or persistence.

For every target set:

- all targets must belong to the configured project;
- every artifact type must map to the supplied stage;
- all targets must be visible and non-archived;
- choose the anchor by artifact type, never list position, filename, path, or lexical ID order.

For `phase_planning`:

- require exactly two targets;
- require one `phase_planning` and one `work_card_plan`;
- require the same non-empty project ID and phase ID;
- require both historical or both non-historical;
- require the normalized submitted bindings to exactly equal `resolvePhasePlanningBundle()` output;
- reject incomplete, extra, duplicate-type, mixed-project, mixed-phase, mixed-stage, mixed historical/current, or stale bundles.

For `work_card`, `operator_validation`, and `phase_closeout`, require exactly one target in this repair.

For `phase_planning`, use the exact `phase_planning` artifact as the approval identity anchor. Permit multiple targets because the stage is `phase_planning`, not because of a classification value.

Do not implement the Project Planning bundle; WC04 owns that work.

## Defect 5 — Pending lookup lacks direct proof

Add direct tests of `lookupDecisionState()` proving:

- no decision returns `pending_operator_disposition`;
- lookup creates no approval artifact or event and does not change Registry revision or file count;
- legacy evidence does not resolve the new exact target;
- after a decision, lookup returns `decided` with the durable event;
- a later target revision is pending while the prior decision remains durable for its prior hash.

## Required test changes

Primary suite:

`test/wc09/artifact-authority.test.cjs`

Add tests for every required behavior above, including rejection of one-member, extra-member, mixed-phase, mixed-stage, mixed-mode, duplicate-type, and stale bundles. Preserve target-order hash invariance and changed-reason conflict tests.

Historical Work Cards must assert `operator-work-card-approval`. Historical Phase Planning must assert `operator-phase-approval`. No test may expect `historical-operator-review`.

## Isolate the failing WC06 test; do not restore obsolete Phase 07 files

Do not restore:

- `planning/phases/phase-07/Work_Cards/WC01_champcity_gpt_portability_review_shared_core_architecture_contract.json`
- `planning/phases/phase-07/Work_Cards/WC01_champcity_gpt_portability_review_shared_core_architecture_contract.md`

Do not modify Execution Run production code.

In `test/wc06/execution-run-activation.test.cjs`:

1. Replace the live-repository authority fixture with a temporary repository created by `mkdtemp`.
2. Read these source JSON artifacts:
   - `planning/phases/phase-06/Work_Cards/WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json`
   - `planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.json`
3. Commit them into the temporary repository through `ArtifactPairService.commitArtifact()`, Work Card first and approval second.
4. Preserve ID, type, status, project, phase, Work Card ID, parent, relationships, payload, and canonical relative location.
5. Construct the execution services against that temporary root.
6. Run eligible-list, start, repeat-start, and wrong-revision assertions there.
7. Remove the temporary root after the test.
8. Do not copy the live Registry; let `ArtifactPairService` create the fixture Registry.

Keep compile-definition and preload-boundary assertions unchanged except for mechanical fixture plumbing.

## Authorized production files

- `src/main/artifacts/governanceApprovalService.ts`
- `src/shared/projects/projectWorkspace.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/global.d.ts` only if required
- `src/main/workflow/normalizedWorkflowDomainAdapter.ts` only if required to compile the existing in-memory projection; it must not read legacy authorization fields

## Authorized test files

- `test/wc09/artifact-authority.test.cjs`
- `test/wc06/execution-run-activation.test.cjs`
- `scripts/verify-governance-repair-approval-mounted.cjs`
- another existing WC01-modified mounted script only if it asserts the removed historical screen

Do not modify `package.json` or add a test command.

## Out of scope

Do not migrate the corpus, clean duplicates, assign pending state across records, build later stage workspaces, build the roadmap UI, redesign the workflow kernel, Registry, Governance Repair, IPC, or Execution Runs, restore ChampCity_GPT records, add fallback authority, or perform Git operations.

## Validation

Run through the documented Windows lanes:

```text
npm run typecheck
npm run build
npm run test:unit
npm run test:repository
npm run test:renderer:built
npm run test:full
```

Do not use Playwright. A wrapper exit code is not a pass when child output contains a failed test. No pre-existing-failure exception is granted; the full lane must be green.

## Implementer Report

Create only:

`planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_execution_authority_historical_bundle_validation_correction.md`

The report must include:

- repository, remote, branch, starting HEAD, parent WC01 hash, and initial/final status;
- exact files changed;
- proof that no WC01 path reads `codeChangesAuthorized` for authority;
- historical stage/workspace correction;
- bundle resolver and validator behavior;
- direct pending lookup proof;
- WC06 temporary-fixture proof;
- all commands, lanes, and results;
- a criterion-by-criterion evidence table;
- every retained in-memory compatibility projection and deletion owner: stage projections to WC05-WC08, execution projection to WC12;
- confirmation that no historical-only class/screen remains, no obsolete pair was restored, no Git mutation occurred, and no later Work Card was implemented.

Do not create a JSON sidecar, Registry entry, application approval artifact, release, package, tag, or commit.

## Acceptance criteria

1. `codeChangesAuthorized` and equivalents have no effect on decision or execution routing.
2. `requiresImplementer: true` plus exact approval is sufficient for the temporary execution projection.
3. `requiresImplementer: false` cannot become execution work through a legacy flag.
4. `historical_record` and `historical-operator-review` are removed.
5. Historical Work Cards use the normal Work Card stage and workspace.
6. Historical Phase Planning uses the normal two-record Phase Planning bundle and workspace.
7. Bundle resolution requires exactly one Phase Planning and one Work Card Plan for one project, phase, and historical mode.
8. Submitted multi-target decisions must exactly equal the resolved bundle.
9. Anchoring uses artifact type, not target ordering or ID text.
10. Pending lookup is directly proven non-mutating.
11. Decisions remain `operator_approval` artifacts using the WC01 payload schema and no prohibited fields.
12. The WC06 test is isolated from the live corpus and passes without Phase 07 files.
13. The obsolete ChampCity_GPT WC01 pair remains absent.
14. The complete validation lane passes.
15. The report provides complete evidence and compatibility-removal assignments.
16. Scope and Git restrictions are respected.

## Manual validation after Architect review

The Operator should confirm:

1. a historical Work Card opens Work Card Approval and is marked historical;
2. a historical Phase Planning bundle opens Operator Phase Approval and shows both exact members;
3. no Historical Review destination remains;
4. an approved implementation Work Card displays no separate code-change or implementation authorization control;
5. legacy evidence remains visible but does not resolve the new exact target.

WC01 remains unresolved until this repair is implemented, reviewed, and accepted. WC02 through WC13 remain unauthorized.
