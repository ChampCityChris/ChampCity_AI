# WTR02G — Move SourceCheckpoint and IntegrationRecord Ownership to Workflow

**Milestone:** WTR02 — Repository, checkout, MCP, and source ownership contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Depends on:** WTR02F closed at 7f8fb5ecba9bf99e4edd0a10bd67e9c898f81159  
**Architecture:** docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md  
**Operator decisions:** docs/implementation-bundles/workflow-topology-recovery/OPERATOR_DECISIONS_2026-09-23.md  
**Plan:** docs/implementation-bundles/workflow-topology-recovery/WORK_CARD_PLAN.md  
**Report:** docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02G_IMPLEMENTER_REPORT.md

## 1. Objective

Complete the canonical source-lifecycle ownership cut begun in WTR02A–F.

After WTR02G:

~~~
substantive Workflow
├── SourceBaseline
├── SourceBinding
├── RepositoryCheckout
├── SourceCheckpoint
└── IntegrationRecord
~~~

All five belong to the substantive Workflow lineage.

Work Intake Routing may explain provenance, but it is not a source lifecycle owner.

This card also makes source checkpoint execution operate against the explicit Workflow RepositoryCheckout created by WTR02F instead of assuming the Project root is a Git checkout.

WTR02H remains responsible for Source Graph identity/projection.

## 2. Hard ownership cut

Remove canonical Work Intake ownership from:

~~~
SourceCheckpoint.workIntakeId
IntegrationRecord.workIntakeId
~~~

Replace with:

~~~
SourceCheckpoint.workflowId
IntegrationRecord.workflowId
~~~

Do not keep dual fields.

Do not add:

- workIntakeId aliases;
- optional legacy ownership;
- owner unions;
- WIR fallback fields.

This is a semantic hard cut in current Structured Project State.

Legacy Markdown/source-control artifacts may still contain Work Intake terminology until their later owning bundles retire them.

## 3. Shared Project State body contracts

Update:

src/shared/projectState/domainContracts.ts

SourceCheckpoint becomes equivalent to:

~~~ts
{
  boundaryId: string;
  workflowId: EntityId;
  sourceLineId: string;
  expectedRevisionId: string;
  resultingRevisionId?: string;
  receiptDigest?: string;
  checkpointKind: "implementation" | "disposition";
  checkpointState: "not-required" | "pending" | "committed" | "blocked" | "inspection-required";
}
~~~

IntegrationRecord becomes equivalent to:

~~~ts
{
  workflowId: EntityId;
  incomingRevisionId: string;
  targetSourceLineId: string;
  targetBeforeRevisionId: string;
  candidateRevisionId?: string;
  targetAfterRevisionId?: string;
  resultRevisionId?: string;
  integrationState: "prepared" | "validating" | "repairing" | "ready" | "integrated" | "blocked" | "failed";
  outcome: "pending" | "integrated" | "blocked" | "failed";
  validationIds: EntityId[];
  repairWorkItemIds: EntityId[];
}
~~~

No schema migration is required for historical abandoned legacy Workflow state. Current test/project stores are recreated from current schema.

## 4. Entity registry

Update:

src/shared/projectState/entityTypeRegistry.ts

Change required fields:

~~~
SourceCheckpoint: workIntakeId → workflowId
IntegrationRecord: workIntakeId → workflowId
~~~

Keep all other field validation unchanged unless compile correctness requires a narrow correction.

No Work Intake compatibility field remains in these canonical bodies.

## 5. Relationship registry

Update source semantic relationship endpoints.

Current:

~~~
checkpoints:
SourceCheckpoint → SourceBinding | WorkIntake | WorkItem | ImplementationRecord

integrates:
IntegrationRecord → WorkIntake | SourceBinding | WorkItem | ImplementationRecord
~~~

New:

~~~
checkpoints:
SourceCheckpoint → Workflow | SourceBinding | WorkItem | ImplementationRecord

integrates:
IntegrationRecord → Workflow | SourceBinding | WorkItem | ImplementationRecord
~~~

WorkIntake must no longer be an allowed source semantic endpoint for these predicates.

Generic creation remains blocked by ProjectStateService typed-command rules.

## 6. Workflow-lineage invariant

SourceCheckpoint and IntegrationRecord ownership is by substantive Workflow lineage.

For every create operation:

1. resolve the requested/current owning Workflow;
2. require Workflow entity type;
3. require non-WIR Workflow;
4. require Workflow lineage to match the SourceBinding Workflow lineage;
5. require referenced SourceBaseline owner to belong to that same lineage;
6. require SourceBinding to be ready;
7. require SourceBinding.repositoryCheckoutId.

No source lifecycle record may be created for:

- WIR;
- unrelated Workflow;
- foreign Project Workflow;
- ambiguous SourceBinding lineage.

## 7. ProjectState createSourceCheckpoint signature

Change the typed command to require Workflow ownership explicitly.

Target shape equivalent to:

~~~ts
createSourceCheckpoint(
  projectId,
  bindingId,
  workflowId,
  targetId,
  input,
  context?
)
~~~

Do not derive Workflow ownership from WIR provenance.

The method must validate workflowId against the SourceBinding lineage.

The stored body uses exactly the supplied validated workflowId.

This permits a current Workflow successor to own a checkpoint while SourceBaseline remains anchored to the historical original Workflow record in the same lineage.

## 8. SourceCheckpoint target rules

Allowed checkpoint targets:

### Implementation checkpoint

Target must be:

- ImplementationRecord;
- whose WorkItem belongs through part_of ancestry to the owning Workflow lineage.

### Disposition checkpoint

Target may be:

- WorkItem belonging to owning Workflow lineage; or
- Workflow in the same owning lineage.

WorkIntake is no longer a valid source checkpoint target.

Route selection on WIR therefore cannot create a SourceCheckpoint.

## 9. SourceCheckpoint relationships

Typed creation must link each SourceCheckpoint to:

- owning SourceBinding;
- owning Workflow record identified by body.workflowId;
- semantic target entity.

Deduplicate endpoints if target is the same Workflow entity.

Do not link SourceCheckpoint to WorkIntake provenance.

## 10. SourceCheckpoint revision invariants

Retain:

- boundaryId uniqueness;
- expected revision must equal SourceBinding.currentRevisionId at creation;
- committed requires resultingRevisionId;
- non-committed may not carry resultingRevisionId;
- existing transition rules.

workflowId is immutable after creation.

advanceSourceCheckpoint() must not change ownership.

## 11. ProjectState createIntegrationRecord signature

Change the typed command to require Workflow ownership explicitly.

Target shape equivalent to:

~~~ts
createIntegrationRecord(
  projectId,
  bindingId,
  workflowId,
  input,
  context?
)
~~~

Stored IntegrationRecord.workflowId is the validated Workflow owner.

Do not derive or require Work Intake provenance.

## 12. IntegrationRecord target rules

Optional targetEntityId may remain:

- WorkItem; or
- ImplementationRecord.

If supplied, it must belong to the same Workflow lineage as workflowId.

No WorkIntake target is permitted.

## 13. IntegrationRecord relationships

Typed creation must link IntegrationRecord to:

- owning SourceBinding;
- owning Workflow;
- optional WorkItem/ImplementationRecord target.

No WorkIntake integrates relationship is created.

Repair WorkItems linked later through integrates must also belong to the same Workflow lineage.

Add or retain validation in advanceIntegrationRecord() so a repair WorkItem cannot be attached from another Workflow.

## 14. Current Project State view

Update CurrentProjectStateView.sourceCheckpoints[] from workIntakeId to workflowId.

Update CurrentProjectStateView.integrations[] from workIntakeId to workflowId.

No compatibility ownership field is emitted.

## 15. Source semantic view

getSourceSemanticView() already resolves checkpoint/integration entities through SourceBinding relationships.

Preserve that behavior.

Update any Work Intake body/filter assumptions so the returned canonical records are Workflow-owned.

Do not redesign SourceSemanticView shape beyond the canonical body change.

## 16. Shared checkpoint request DTO hard cut

Update:

src/shared/sourceLifecycleContracts.ts

ImplementationCheckpointRequest:

~~~ts
{
  boundaryId: string;
  workflowId: string;
  targetEntityId: string;
  sourceLineId: string;
  expectedRevisionId: string;
  repositoryCheckoutId: string;
  attributablePaths: string[];
}
~~~

DispositionCheckpointRequest:

~~~ts
{
  boundaryId: string;
  workflowId: string;
  targetEntityId: string;
  sourceLineId: string;
  expectedRevisionId: string;
  repositoryCheckoutId: string;
  dispositionId: string;
  attributablePaths: string[];
}
~~~

Changes:

- workIntakeId removed;
- workflowId required;
- repositoryCheckoutId becomes required.

No fallback to Work Intake routing is permitted.

## 17. IntegrationCandidateRequest hard cut

Update the currently shared provider-neutral request contract from workIntakeId to workflowId + repositoryCheckoutId.

Equivalent:

~~~ts
export interface IntegrationCandidateRequest {
  workflowId: string;
  repositoryCheckoutId: string;
  incomingRevision: SourceRevision;
  target: IntegrationTarget;
}
~~~

This contract is currently lightly used, but it must stop advertising Work Intake source ownership.

Do not redesign IntegrationCandidateRecord persistence in this card.

## 18. SourceReadiness remains transitional

Do not change SourceReadiness.workIntakeId in WTR02G.

That shape is still a WIR presentation compatibility contract and is not canonical source ownership.

Its retirement belongs to WIR/front-half recovery.

WTR02H owns SourceGraph Work Intake identity.

## 19. semanticCheckpointService becomes Workflow-first

Update:

src/main/sourceControl/semanticCheckpointService.ts

Public checkpoint operations remain:

- createImplementationCheckpoint(projectRoot, projectId, request);
- createDispositionCheckpoint(projectRoot, projectId, request).

But request ownership is now workflowId.

Do not resolve source through WorkIntake → targetWorkflowId.

Resolve directly:

~~~
request.workflowId
→ Workflow lineage
→ unique ready SourceBinding
→ SourceBaseline
→ explicit RepositoryCheckout
~~~

Direct-started Workflows with no WIR provenance must work.

## 20. Project root is not the checkpoint Git root

The root parameter to semantic checkpoint operations is the Project container root.

It is not a Git checkout.

Do not call createSourceControlService() on the Project root.

Using WTR02F/WTR02C semantics:

1. resolve SourceBinding;
2. require binding.repositoryCheckoutId;
3. resolve SourceBaseline;
4. sourceAnchorWorkflowId = SourceBaseline.workflowId;
5. require binding.repositoryCheckoutId == workflowRepositoryCheckoutId(sourceAnchorWorkflowId);
6. require binding.workSourceLineId == workflowSourceLineName(sourceAnchorWorkflowId);
7. resolve checkout path through resolveManagedWorkflowCheckoutPath(projectRoot, sourceAnchorWorkflowId);
8. verify exact Git worktree;
9. operate Git only inside that Workflow checkout.

## 21. Checkpoint checkout verification

Before any file digest, staging, commit, or Git mutation, verify:

- checkout path exists;
- path is not redirected;
- git rev-parse --show-toplevel equals exact Workflow checkout root;
- branch --show-current equals binding.workSourceLineId;
- HEAD equals request.expectedRevisionId before checkpoint mutation;
- Git common directory matches managed Dev Repository;
- request.repositoryCheckoutId equals binding.repositoryCheckoutId;
- request.sourceLineId equals binding.workSourceLineId.

If mismatch:

- block or require inspection using existing bounded checkpoint result semantics;
- do not reconstruct materialization;
- do not reset, clean, or switch checkout.

WTR02F owns materialization and drift recovery.

## 22. Attributable file paths are Workflow-checkout-relative

safePath() remains a repository-relative policy.

fileDigest() and changed-file inspection must operate relative to the Workflow checkout root.

Do not read attributable implementation files from the Project container.

The Project container .champcity state is outside the Workflow source checkout and must never be checkpointed.

## 23. Checkpoint concurrency lock

Current semanticCheckpointService serializes by selected root.

That would globally serialize all Workflows in one Project.

Change locking so the checkpoint exclusion key is the exact Workflow checkout root or repositoryCheckoutId.

Required:

- two concurrent checkpoint operations for the same Workflow checkout remain serialized or fail boundedly;
- different Workflow checkouts in the same Project are not rejected merely because another Workflow is checkpointing.

Do not introduce a Project-wide source mutation gate.

## 24. Checkpoint receipt identity

Change receipt digest ownership input from workIntakeId to workflowId + repositoryCheckoutId.

The digest continues to include:

- version;
- kind;
- projectId;
- boundaryId;
- targetEntityId;
- dispositionId when applicable;
- sourceLineId;
- expectedRevisionId;
- attributable file digests.

Saved SourceCheckpoint identity comparison uses checkpoint.body.workflowId.

No Work Intake identifier participates in canonical checkpoint identity.

## 25. Checkpoint target ownership validation

semanticCheckpointService must fail closed before source mutation if target ownership is invalid.

Implementation target:

~~~
ImplementationRecord
→ implements_work_item
→ WorkItem
→ part_of ancestry
→ requested Workflow lineage
~~~

Disposition target:

~~~
WorkItem
→ part_of ancestry
→ requested Workflow lineage
~~~

or target Workflow is in requested Workflow lineage.

Operator Decision must govern that exact target.

Do not accept a WorkItem under WIR or another substantive Workflow.

## 26. WIR route selection no longer source-checkpoints

Current selectStructuredWorkRoute() attempts to checkpoint the Operator route decision on a source branch.

That is architecturally invalid because WIR has no SourceLine.

Update:

src/main/sourceControl/structuredWorkflowCheckpointService.ts

selectStructuredWorkRoute() must:

- persist or reuse the route Decision as it does now;
- perform no SourceBinding lookup;
- perform no Git operation;
- create no SourceCheckpoint.

Preserve the existing return shape by extending CheckpointResult to permit:

~~~
state = "not-required"
checkpointId = null
revision = null
message = "Routing decision does not own source."
~~~

Do not fabricate a Workflow SourceLine for WIR.

WTR06 will later redesign the routing lifecycle/UI.

## 27. Workflow-key structured implementation wrapper

Change recordStructuredImplementation() from intake-keyed source ownership to Workflow-keyed ownership.

Target signature equivalent to:

~~~ts
recordStructuredImplementation(
  projectRoot,
  projectId,
  workflowId,
  workItemId,
  input,
  boundaryId,
  attributablePaths
)
~~~

It must:

1. assert WorkItem belongs to workflowId lineage;
2. resolve ready Workflow SourceBinding directly;
3. record or reuse ImplementationRecord;
4. call createImplementationCheckpoint() with workflowId, sourceLineId, repositoryCheckoutId, expected revision;
5. never resolve source through WorkIntake.

WIR provenance is irrelevant.

## 28. Workflow-key structured disposition wrapper

Change recordStructuredWorkDisposition() from intake-keyed source ownership to Workflow-keyed ownership.

It must:

1. assert target WorkItem belongs to workflowId lineage;
2. record or reuse Operator Decision;
3. resolve ready Workflow SourceBinding;
4. call createDispositionCheckpoint() using workflowId and repositoryCheckoutId.

No Work Intake source ownership remains.

## 29. bindingForWorkflow helper

Replace transitional bindingFor(store, projectId, intakeId) with Workflow-first resolution.

Required behavior:

~~~
workflowId
→ Workflow
→ lineage
→ exactly one active SourceBinding
→ matching SourceBaseline lineage
→ preparationState = ready
→ currentRevisionId present
→ workSourceLineId present
→ repositoryCheckoutId present
~~~

No WIR lookup.

Prefer current active Workflow IDs for new operations.

## 30. structuredIntegrationService — canonical ownership cut

Update:

src/main/sourceControl/structuredIntegrationService.ts

The canonical IntegrationRecord synchronized by this service must be Workflow-owned.

When entered from the existing transitional WIR-facing wrapper:

~~~
intakeId
→ targetWorkflowId
→ Workflow lineage
→ Workflow-owned SourceBinding
→ Workflow-owned IntegrationRecord
~~~

Change IntegrationRecord queries and creation from workIntakeId to workflowId.

No canonical IntegrationRecord stores Work Intake ID.

## 31. structuredIntegrationService — explicit checkout consumption

The structured integration wrapper must stop treating the Project container as a Git repository.

Use two explicit physical roles.

### Incoming source

Workflow RepositoryCheckout from WTR02F:

~~~
SourceBinding.repositoryCheckoutId
→ baseline source anchor
→ .champcity/checkouts/<baseline.workflowId>
~~~

Use it to verify source branch identity, exact incoming HEAD, and clean/current source requirements.

### Integration target and candidate engine

Managed Dev checkout:

~~~
<Project>/Dev
~~~

Use Dev as the primary Git checkout root supplied to createIntegrationCandidateService and integration policy/candidate mechanics.

Do not use the neutral Project root for Git.

Do not switch Dev to the Workflow branch.

## 32. Existing integration candidate engine is a temporary execution adapter

Do not redesign:

- IntegrationCandidateRecord.intakeId;
- WorkIntakeBranchBinding;
- IntegrationCompletionEvidence.routeDecisionId;
- candidate receipt Markdown schema;
- generic integration candidate engine.

Those are older execution-mechanics contracts scheduled for the later shared-integration bundle.

For the existing structured WIR-facing integration wrapper only, it may continue projecting WIR completion evidence into that engine.

That compatibility data is not Structured Project State authority.

Canonical IntegrationRecord must still be Workflow-owned.

## 33. Integration candidate compatibility binding

When structuredIntegrationService must provide WorkIntakeBranchBinding to the existing candidate engine, derive its source facts from Workflow-owned SourceBinding and SourceBaseline.

Allowed compatibility projection:

~~~
intakeId = existing WIR intakeId used only by old candidate receipt
repositoryId = baseline.repositoryId
baseBranch = dev
baseCommit = baseline.baseRevisionId
workBranch = binding.workSourceLineId
currentHead = binding.currentRevisionId
~~~

Do not use this compatibility object as canonical ownership.

Do not write its intakeId into IntegrationRecord.

## 34. IntegrationRecord Workflow identity during sync

When syncing candidate evidence into Project State:

- resolve target Workflow from existing WIR wrapper provenance;
- use that target Workflow ID as IntegrationRecord.workflowId;
- accept an existing IntegrationRecord only when its workflowId belongs to that same Workflow lineage;
- incomingRevisionId and targetBeforeRevisionId remain part of uniqueness/evidence matching.

Do not filter canonical integration records by workIntakeId.

## 35. Integration checkpoints and chain lookup

structuredIntegrationService currently loads SourceCheckpoint records by Work Intake ID.

Change it to load checkpoints by Workflow lineage.

For target Workflow:

1. compute lineage IDs;
2. select SourceCheckpoint records whose workflowId is in that lineage;
3. require committed checkpoint chain;
4. chain from SourceBaseline.baseRevisionId to SourceBinding.currentRevisionId exactly as today.

This removes WIR provenance from source revision evidence.

## 36. Current Project State tests

Update permanent Project State tests for the body hard cut.

Known files include:

- test/project-state/domain-contracts.test.cjs;
- test/project-state/source-semantic-references.test.cjs;
- test/project-state/current-state-queries.test.cjs;
- test/project-state/authoritative-context-event-feed.test.cjs.

Required proofs:

- SourceCheckpoint.workflowId present;
- IntegrationRecord.workflowId present;
- workIntakeId absent;
- direct Workflow with no WIR provenance can create SourceCheckpoint;
- direct Workflow with no WIR provenance can create IntegrationRecord;
- cross-Workflow target is rejected;
- relationships link to Workflow + SourceBinding + target, not WorkIntake.

## 37. semantic checkpoint permanent proof

Rewrite:

test/source-control/semantic-checkpoint-service.test.cjs

away from greenfield Work Intake source materialization.

Use a WTR02F-style neutral Project fixture:

~~~
<Project>/
├── .champcity/project-state.sqlite
├── Dev/
└── .champcity/checkouts/<workflow-anchor>/
~~~

Create substantive Workflow, exact SourceBaseline, WTR02F materialized SourceBinding/checkout, WorkItem under Workflow, and ImplementationRecord.

Then prove:

1. implementation checkpoint commits only attributable Workflow-checkout files;
2. Project root remains non-Git;
3. Dev remains on dev and unchanged by checkpoint;
4. SourceBinding currentRevision advances;
5. SourceCheckpoint.workflowId is correct;
6. repositoryCheckoutId mismatch blocks;
7. sourceLineId mismatch blocks;
8. retry after post-commit state failure reconciles same checkpoint;
9. disposition empty checkpoint works on same Workflow checkout;
10. direct Workflow fixture uses no WIR provenance.

## 38. checkpoint concurrency proof

Add a bounded proof that two independently materialized Workflow checkouts in one Project can checkpoint without a Project-global already-running rejection.

The test need not benchmark concurrency.

It must prove the lock key is scoped to the Workflow checkout rather than the Project container.

## 39. structured Workflow wrapper proof

Update:

test/source-control/structured-workflow-checkpoint.test.cjs

Required:

- route selection returns checkpoint.state = not-required and performs no source mutation;
- target Workflow is created independently;
- source is materialized through WTR02F;
- recordStructuredImplementation() uses workflowId;
- recordStructuredWorkDisposition() uses workflowId;
- Work Item under WIR is rejected;
- Work Item under another substantive Workflow is rejected;
- implementation and disposition checkpoint records contain workflowId and no workIntakeId.

Do not preserve intakeId merely to keep the old test shape.

## 40. structured integration proof

Update:

test/source-control/structured-integration.test.cjs

to current topology as far as WTR02G owns it:

- neutral Project root;
- managed Dev checkout;
- target substantive Workflow;
- WTR02F Workflow checkout;
- Workflow-owned checkpoints;
- structuredIntegrationService may still be entered through existing WIR intakeId compatibility wrapper;
- IntegrationRecord stores workflowId;
- IntegrationRecord contains no workIntakeId;
- incoming Workflow checkout remains independent;
- Dev target advances through integration candidate mechanics;
- Project root is never used as Git root.

Do not use captureGreenfieldWorkIntake() as a shortcut to old Work Intake-owned source materialization.

## 41. source-lifecycle-package fixture

test/source-control/source-lifecycle-package.test.cjs currently encodes several retired assumptions simultaneously.

Do not expand WTR02G into a full rewrite of that package lifecycle fixture.

If the affected runner selects it and it still fails because of WTR03C Project topology/bootstrap, WTR02H Source Graph identity, or later Workflow front-half/shared execution changes, classify those exact failures to their owning work.

Only repair assertions directly caused by the WTR02G ownership cut if doing so does not require implementing later architecture.

## 42. No Source Graph cut

Do not change:

- SourceGraph.sourceLines[].workIntakeIds;
- SourceGraph.workBindings[].workIntakeId;
- sourceGraphService.ts;
- Source Graph labels/projection.

WTR02H owns the final graph identity cut.

The Project State CurrentProjectStateView is not SourceGraph and must change in G because it directly projects canonical SourceCheckpoint and IntegrationRecord bodies.

## 43. No workflow integration-kernel redesign

Do not implement WTR13/shared integration architecture in this card.

Specifically do not:

- redesign IntegrationCandidateRecord;
- rename every intake field in legacy candidate machinery;
- rebuild integration repair;
- generalize every integration completion envelope;
- create new UI;
- implement direct Workflow integration navigation.

G corrects canonical ownership and physical checkout routing.

Later implementation bundles will consolidate the integration execution kernel.

## 44. Expected production scope

Expected:

- src/shared/projectState/domainContracts.ts
- src/shared/projectState/entityTypeRegistry.ts
- src/shared/projectState/relationshipRegistry.ts
- src/shared/projectState/projectStateService.ts
- src/shared/sourceLifecycleContracts.ts
- src/main/sourceControl/semanticCheckpointService.ts
- src/main/sourceControl/structuredWorkflowCheckpointService.ts
- src/main/sourceControl/structuredIntegrationService.ts

Possible narrow helper reuse/import changes:

- src/main/sourceControl/projectSourceTopology.ts
- src/main/sourceControl/workSourceNaming.ts
- src/main/sourceControl/workflowSourceMaterializationService.ts

Do not alter WTR02F materialization semantics unless a compile-only export/helper is needed.

Any additional production file must be justified in the Implementer Report.

## 45. Expected test scope

Expected:

- test/project-state/domain-contracts.test.cjs
- test/project-state/source-semantic-references.test.cjs
- test/project-state/current-state-queries.test.cjs
- test/project-state/authoritative-context-event-feed.test.cjs
- test/source-control/semantic-checkpoint-service.test.cjs
- test/source-control/structured-workflow-checkpoint.test.cjs
- test/source-control/structured-integration.test.cjs

Potential minimal fixture updates where canonical bodies are directly constructed.

validation/capability-map.json may change only where permanent proof metadata or counts actually change.

## 46. Explicit non-scope

Do not in WTR02G:

- change SourceBaseline ownership;
- change SourceBinding ownership/materialization;
- change WTR02F deterministic identities;
- change MCP RepositoryCheckout routing;
- change Source Graph identity;
- create Main or Dev topology in production;
- implement Existing Project Registration;
- implement Greenfield bootstrap;
- redesign integration candidate records;
- redesign Integration Repair;
- implement Workflow Hub;
- implement WTR03+;
- begin WTR02H.

## 47. Acceptance criteria

WTR02G is complete only when:

1. SourceCheckpoint canonical body has workflowId and no workIntakeId;
2. IntegrationRecord canonical body has workflowId and no workIntakeId;
3. source semantic relationships target Workflow, not WorkIntake;
4. direct substantive Workflow can create checkpoint and integration records with no WIR provenance;
5. cross-Workflow source targets fail closed;
6. checkpoint request DTOs are Workflow-owned;
7. repositoryCheckoutId is mandatory for checkpoint execution;
8. checkpoint Git operates only inside WTR02F Workflow checkout;
9. Project root is not treated as Git;
10. checkpoint locks do not globally serialize all Project Workflows;
11. WIR route selection creates no source checkpoint;
12. implementation and disposition wrapper APIs are Workflow-keyed;
13. structured integration canonical records are Workflow-owned;
14. structured integration uses Workflow checkout for incoming source verification and Dev for candidate mechanics;
15. no canonical checkpoint or integration record is selected by Work Intake ownership;
16. Source Graph Work Intake identity remains deferred to H.

## 48. Validation

Required:

1. npm run build;
2. node --test test/project-state/domain-contracts.test.cjs test/project-state/source-semantic-references.test.cjs test/project-state/current-state-queries.test.cjs test/project-state/authoritative-context-event-feed.test.cjs;
3. node --test test/source-control/semantic-checkpoint-service.test.cjs;
4. node --test test/source-control/structured-workflow-checkpoint.test.cjs;
5. node --test test/source-control/structured-integration.test.cjs;
6. node --test test/source-control/workflow-source-materialization.test.cjs;
7. validation planner preview for exact final changed-path manifest using work-item profile;
8. npm run test:affected -- --changes <exact-changed-path manifest>;
9. git diff --check.

Do not run the historical full suite unless selected by the exact affected plan.

Failures owned solely by WTR02H or WTR03C may remain classified as deferred.

All WTR02G-owned focused proofs must pass.

## 49. Implementer Report

Write:

docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02G_IMPLEMENTER_REPORT.md

Include:

- starting SHA;
- exact files changed;
- SourceCheckpoint body cut;
- IntegrationRecord body cut;
- relationship changes;
- direct Workflow no-WIR Project State proof;
- checkpoint request hard cut;
- checkout resolution and verification;
- checkpoint lock key;
- route-selection no-checkpoint behavior;
- Workflow-key implementation and disposition wrapper behavior;
- structured integration ownership and Git-root routing;
- explicit compatibility boundaries left in integration candidate engine;
- focused validation results;
- affected failures classified by H/03C where applicable;
- confirmation that Source Graph and later integration-kernel redesign were not implemented.

Do not edit the committed report afterward solely to add its own checkpoint hash.

## 50. Git checkpoint and stop boundary

The Operator has already authorized routine card-local Git mechanics for WTR.

After implementation, validation, report, exact staged-diff review, and safety scan, create exactly one attributable checkpoint commit.

Suggested subject:

WTR02G move checkpoints and integration to Workflow ownership

No additional Operator Git approval is required.

Do not push, merge, tag, release, reset, clean, restore unrelated files, or perform Git actions outside this card.

Then STOP.

Do not begin WTR02H.

The Architect will review WTR02G before the final WTR02 Source Graph identity card is released.
