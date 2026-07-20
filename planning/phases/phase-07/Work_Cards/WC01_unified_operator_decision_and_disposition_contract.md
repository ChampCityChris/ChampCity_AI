# Work Card — Phase 07 WC01 Unified Operator Decision and Disposition Contract

Status: pending Operator approval through ChatGPT
Phase: Phase 07 — Operator-Centered Workflow Recovery, Historical Corpus Migration, and Live Development Map
Plan order: 1 of 13
Work type: bounded authority-model refactor
Risk tier: high
Owner after approval: Implementer
Recommended Implementer model: GPT-5.6 Thinking, high reasoning
Phase authorization: Phase 07 Planning Revision 2 approved by the Operator through ChatGPT on 2026-07-20
Source-code execution authorized by this Work Card: no — separate Operator approval of WC01 is required
Git mutation authorized: no

## Plain-Language Summary

Replace the current approval vocabulary with one exact Operator decision and disposition contract that can be used for current and historical records.

This Work Card establishes the data contract and decision-persistence behavior only. It does not migrate the historical corpus, create the new stage workspaces, rewrite the complete workflow router, or build the development-state UI. Those are separate Phase 07 Work Cards.

## Current Repository Problem

The current implementation reviewed before authoring this Work Card contains several authority conflations:

- `src/shared/projects/projectWorkspace.ts` defines separate current and historical approval actions.
- `src/main/artifacts/governanceApprovalService.ts` classifies records as `canonical_phase`, `canonical_work_card`, or `historical_non_routing`.
- Historical decisions are represented by special `approve_historical_revision` and `reject_historical_revision` actions.
- New Operator approval artifacts persist `implementationAuthorized`, `phaseProgressionAuthorized`, and `routeSelectionAuthorized` in addition to the decision itself.
- Work Card implementation authority is currently conditioned on `requiresImplementer === true` and `codeChangesAuthorized === true`.
- Idempotency currently treats the same action against the same exact revision as an idempotent retry even when the Operator reason differs.
- Approval discovery currently supports only Phase Planning, Work Card Plan, and Work Card records.

The Phase 07 model requires one decision contract that binds exact records or exact bundles. Historical status must not create a separate non-routing approval class.

## Objective

Implement a single, validated Operator decision schema that:

1. binds an exact record or exact stage bundle;
2. records either a stage decision or a record disposition;
3. supports current and historical records without separate historical decision actions;
4. preserves exact-target finality and true idempotency;
5. does not persist secondary authorization booleans;
6. can be consumed by later Phase 07 Work Cards for Project Planning, Phase Planning, Work Card Approval, Operator Validation, Phase Closeout, historical migration, and the development-state map;
7. defines `pending_operator_disposition` as the explicit current-schema review state for an exact current target that has not received a new-system Operator decision.

## Required Decision Contract

Create one shared contract named `OperatorDecisionRecordV1` or an equivalently direct name. Do not create multiple competing approval models.

The contract must contain the following concepts.

### Decision stage

Use exactly these stage values:

- `project_planning`
- `phase_planning`
- `work_card`
- `operator_validation`
- `phase_closeout`

Historical status does not change the stage. A historical Work Card remains a `work_card` target. A historical closeout remains a `phase_closeout` target.

### Exact target binding

Each target binding must contain:

- `artifactId`
- `artifactType`
- `revision`
- `payloadHash`

A decision must contain a non-empty target list.

For a single-record decision, the target list contains one binding. For a stage bundle, the target list contains every exact bundle member.

Reject:

- duplicate artifact IDs within one target list;
- missing or empty IDs, types, or hashes;
- revisions below 1;
- target records that do not match the repository snapshot supplied to the decision service;
- stale target revisions or hashes.

### Deterministic target-set identity

Compute one `targetSetHash` from:

- the decision stage;
- the exact target bindings.

The hash must use deterministic serialization. Sort bindings by `artifactId` before serialization so the same bundle cannot produce different identities because a UI supplied members in a different order.

Do not infer stage, phase, Work Card, or authority from characters in an artifact ID, filename, title, or path.

### Outcome

Use one discriminated outcome union with two forms.

#### Stage decision

Supported values:

- `approved`
- `revision_requested`
- `rejected`

`approved` means the exact target or bundle was approved. It does not carry separate implementation, source-code, progression, route-selection, push, or execution-pass flags.

#### Record disposition

Supported values:

- `accepted_as_current`
- `accepted_as_historical_evidence`
- `superseded`
- `merged`
- `deferred`
- `cancelled`
- `invalid`
- `revision_required`

Requirements:

- `merged` must identify the canonical surviving artifact ID.
- `superseded` must identify the superseding artifact ID when one exists.
- `revision_required`, `rejected`, `invalid`, `cancelled`, `deferred`, `merged`, and `superseded` require an Operator reason.
- The service may require a reason for additional non-approval outcomes when doing so improves auditability, but it must not create additional authority fields.

### Pending Operator disposition state

Define `pending_operator_disposition` as the explicit current-schema review state for an exact current record revision or exact current stage bundle that has no new-system Operator decision.

This state is not a stage decision, record disposition, approval, rejection, or decision event. It must not:

- create or append an `OperatorDecisionEvent`;
- imply acceptance, rejection, authorization, completion, or historical recognition;
- be inferred from a legacy approval-like field;
- be persisted as though the Operator made a decision.

The shared contract and decision read model must make the state available to later migration and routing consumers. For an exact target set:

- when no new-system decision exists, decision lookup reports `pending_operator_disposition`;
- after a valid exact decision is recorded, lookup reports the durable decision rather than the pending state;
- a new artifact revision, payload hash, or bundle membership creates a different exact target set that may again be `pending_operator_disposition` until the Operator decides it;
- legacy decisions may be shown as evidence but do not remove the pending state for the new exact target set.

WC01 defines and implements this state and its exact-target lookup semantics. WC01 does not inventory the corpus or assign the state across repository records; WC02 and WC03 perform that work.

### Decision event

Persist at least:

- schema version;
- stage;
- exact target bindings;
- target-set hash;
- outcome;
- Operator reason when required or supplied;
- related canonical or superseding artifact ID when required by the disposition;
- decision timestamp.

The decision artifact may maintain a timeline across later target revisions, but each event must remain bound to its own exact target-set hash.

## Required Finality and Idempotency Rules

Use the key:

```text
stage + targetSetHash
```

For an exact target set:

- the first valid decision is durable;
- an exact retry is idempotent only when the normalized outcome, Operator reason, and required related artifact IDs are identical;
- the service must not append another event for a true idempotent retry;
- a different outcome for the same exact target set is a conflict;
- the same outcome with a different reason or different related artifact ID is also a conflict, not an idempotent retry;
- a new artifact revision, payload hash, or bundle membership produces a different target-set hash and may receive a new decision.

Do not silently overwrite or reinterpret an existing exact decision.

## Persistence Requirements

Retain the existing canonical `operator_approval` artifact type for this Work Card unless a direct repository constraint proves that a rename is required. Do not introduce a second decision artifact type solely to coexist with the old service.

Newly written decision data must use the new contract and must not persist:

- `approvalClassification` as an authority value;
- `historical_non_routing`;
- `implementationAuthorized`;
- `phaseProgressionAuthorized`;
- `routeSelectionAuthorized`;
- approval-level `sourceCodeChangesAuthorized`;
- approval-level `codeChangesAuthorized`;
- approval-level `pushAuthorized`;
- `authorizationGranted` for an already approved Work Card;
- `executionPassesAuthorized`.

Legacy Operator approval artifacts may still be read as historical evidence. Do not rewrite the historical corpus in WC01.

Any compatibility projection required to keep current code compiling must be:

- derived in memory from the new decision outcome;
- non-persisted;
- incapable of overriding the exact decision;
- explicitly marked for removal by the relevant later Phase 07 Work Card.

For example, an existing internal boolean may temporarily be derived as `true` only from an exact `approved` stage decision for the applicable stage. It must not be independently read from or written to an approval artifact.

Do not dual-write both old and new authority schemas.

## Required Shared Types

The implementation must provide validated shared types equivalent to:

- `OperatorDecisionStage`
- `OperatorDecisionTargetBinding`
- `OperatorStageDecision`
- `OperatorRecordDisposition`
- `OperatorDecisionOutcome`
- `OperatorDispositionReviewState` or an equivalently direct type containing `pending_operator_disposition`
- `OperatorDecisionLookupState` or an equivalent discriminated read model that distinguishes pending from decided
- `OperatorDecisionIntent`
- `OperatorDecisionEvent`
- `OperatorDecisionRecordV1`
- `OperatorDecisionResult`

Naming may vary only where it improves clarity without changing the contract.

The decision contract should be placed in a focused shared module rather than adding more unrelated responsibilities to `projectWorkspace.ts`. Existing exports may be redirected to the focused module during migration.

## Required Service Behavior

Refactor the existing approval decision path so one production service owns:

- intent validation;
- exact target verification;
- deterministic target-set hashing;
- required-reason validation;
- disposition-specific related-record validation;
- finality and idempotency;
- canonical decision artifact persistence;
- readback of current exact decision state;
- exact-target lookup that returns `pending_operator_disposition` when no new-system decision exists without persisting a fabricated decision event.

`GovernanceApprovalService` may remain as the production facade to avoid broad import churn, but it must delegate to or directly implement the new contract as the sole decision-persistence authority. Do not leave a second executable legacy decision writer.

WC01 does not need to expand the queue to every historical artifact type. It must, however, remove the assumption from the decision contract that a historical target is inherently non-routing or limited to historical recognition/rejection actions.

## Bounded Production Surface

Primary authorized production files:

- `src/shared/projects/projectWorkspace.ts` — remove or redirect the old approval decision types.
- A focused new shared decision-contract module under `src/shared/` and its index export.
- `src/main/artifacts/governanceApprovalService.ts` — replace legacy decision validation, persistence fields, and finality behavior.
- `src/main/workflow/normalizedWorkflowDomainAdapter.ts` only if required to read the new decision record without persisting duplicate authority.
- `src/shared/workflow/workflowDomain.ts` only if a compile-time compatibility projection is required.

Direct compile consumers may be changed only where required by the shared type replacement:

- `src/main/main.ts`
- `src/preload/index.ts`
- `src/renderer/global.d.ts`
- the existing approval UI submission component or section in `src/renderer/app/App.tsx`

Renderer changes are limited to preserving current submission capability under the new intent type. Do not build the Project Planning, Phase Planning, historical disposition, Operator Validation, Phase Closeout, or development-map screens in WC01.

Any additional production file requires the Implementer Report to identify the exact compile dependency that made it necessary. Do not broaden into workflow-kernel, Registry, Governance Repair, Execution Run, or corpus migration changes.

## Required Test Surface

Update existing approval-authority tests rather than creating a parallel permanent suite for the same capability where practical.

Expected test locations include:

- `test/wc09/artifact-authority.test.cjs`
- the existing governance approval mounted script only if its current contract directly exercises decision submission;
- a focused new Phase 07 decision-contract test file only when the existing suite cannot cleanly isolate deterministic hashing and validation.

If a new permanent test file is created, add it to the normal unit lane. Do not create a Work-Card-only test command that is excluded from `npm test`.

## Required Automated Proof

Tests must prove:

1. A single exact target can be approved.
2. A multi-record exact bundle can be approved.
3. Target input order does not change `targetSetHash`.
4. A revision or hash change creates a different target-set hash.
5. Duplicate target IDs are rejected.
6. A stale target revision or hash is rejected.
7. A stage decision and a disposition use the same decision service.
8. Historical status does not force `historical_non_routing` classification or special historical decision actions.
9. `merged` requires a canonical survivor ID.
10. `superseded` preserves the superseding target when supplied.
11. Required reasons are enforced.
12. A byte-for-byte equivalent normalized retry is idempotent and creates no new event.
13. The same outcome with a changed reason conflicts.
14. A different outcome against the same target-set hash conflicts.
15. New decision artifacts do not persist any prohibited authorization field.
16. Legacy decisions can be surfaced as historical evidence without becoming a new-system exact decision automatically.
17. No second production decision writer remains active.
18. Existing unrelated repository behavior continues to pass the normal test lane.
19. Lookup of an exact current target with no new-system decision returns `pending_operator_disposition`.
20. Reporting `pending_operator_disposition` creates no decision artifact or decision event and implies no approval or disposition.
21. After an exact decision is recorded, lookup returns that durable decision; a later target revision is independently pending until decided.

## Out of Scope

Do not perform any of the following in WC01:

- inventory or migrate historical artifacts;
- merge or delete duplicate files;
- assign `pending_operator_disposition` to the corpus;
- build Project Planning or Phase Planning bundles;
- change current-action sequencing for the five stages beyond minimal compatibility required to consume the new record;
- create stage-owned approval workspaces;
- change Work Card revision routing;
- change Architect Review or Operator Validation authority;
- change Phase Closeout rules;
- build the roadmap-driven development-state UI;
- change Governance Repair preemption;
- change Registry authority;
- change routed IPC policy broadly;
- change Execution Run authority;
- add ChatGPT, Codex, or ChampCity_GPT integration;
- perform Git staging, commit, push, reset, clean, stash, merge, tag, release, or history rewrite.

## Repository Boundary Declaration

- Production code location: bounded files listed above.
- Capability test suite to update: existing approval-authority tests and, only if necessary, one permanent Phase 07 decision-contract test.
- New permanent test suite authorized: conditional, only for isolated decision-contract behavior and only when included in the default unit lane.
- Temporary Work-Card-specific fixtures: permitted only under the test fixture directory and must not be imported by production code.
- Supported migration obligation: none in WC01; historical corpus migration begins in WC02 and WC03.
- Historical or abandoned utilities affected: legacy historical approval actions and legacy persisted authorization-field writer.
- Historical utility promoted to supported capability: no.
- Release-package impact: none.
- Package-content exclusions to verify: temporary fixtures, reports, and planning-only files must not enter production imports.

The Implementer must follow `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` and stop when a required boundary decision is missing.

## Validation Commands

Use the documented Windows validation lane. At minimum run:

```text
npm run typecheck
npm run build
npm run test:unit
npm run test:repository
npm run test:full
```

When the sandbox produces the documented child-process `EPERM` condition, use the normal Windows validation lane described by the repository rather than repeatedly reasoning about the known sandbox limitation.

Do not use Playwright. Mounted Electron tests already present in the repository may be run through the documented lane.

## Implementer Report

Create only:

`planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC01_unified_operator_decision_and_disposition_contract.md`

The report must include:

- repository path, branch, and HEAD verified before editing;
- all files changed;
- exact new decision schema;
- exact representation and lookup behavior for `pending_operator_disposition`;
- evidence that the pending state creates no decision event or implied Operator outcome;
- legacy fields and actions removed;
- any temporary in-memory compatibility projection retained and the later Work Card responsible for deleting it;
- tests added or updated;
- validation commands and results;
- pre-existing failures, if any;
- final Git status;
- confirmation that no Git mutation was performed;
- unresolved risks or blockers.

Do not create a JSON sidecar, Registry entry, application Operator Approval artifact, release, tag, package, or commit.

## Acceptance Criteria

WC01 is acceptable only when:

1. One production Operator decision contract supports exact single records and exact bundles.
2. The contract supports both stage decisions and historical/current record dispositions.
3. Historical records are not assigned a special non-routing decision class.
4. Exact target-set hashing is deterministic and independently tested.
5. Finality rejects contradictory or differently reasoned decisions for the same exact target set.
6. True identical retries are idempotent and create no new event.
7. Newly persisted decisions contain no secondary authorization booleans.
8. Legacy decision records remain evidence but do not automatically become new-system exact decisions.
9. No dual-write or second executable decision service remains.
10. The implementation stays within the bounded production surface.
11. Typecheck, build, default unit tests, repository gates, and full validation pass.
12. The Implementer Report provides exact evidence for every criterion.
13. The Implementer does not approve WC01, validate WC01 on behalf of the Operator, or perform any Git mutation.
14. `pending_operator_disposition` is defined as the non-decision review state for an exact target with no new-system Operator decision.
15. Exact-target lookup reports the pending state without persisting a decision event, and replaces it with the durable exact decision after the Operator decides that target.

## Manual Validation After Implementer

The Operator will review the Implementer Report and, where a current UI submission surface remains available, confirm:

1. One exact approval can be submitted.
2. Repeating the identical decision does not create another decision event.
3. Attempting a contradictory decision returns a clear conflict.
4. No displayed or persisted decision claims separate implementation, phase-progression, route-selection, source-code, push, or execution-pass authorization.

WC01 completion does not require the final Phase 07 Project Planning workspace or historical review UI. Those are later Work Cards.

## Remaining Phase 07 Passes

After Operator acceptance of WC01, the next authorized planning action is to author WC02 — Historical Corpus Inventory and Duplicate Resolution Manifest.

WC02 through WC13 remain unauthored and unauthorized for implementation.
