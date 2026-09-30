# WTR02F — Lazily Materialize Workflow SourceLine and RepositoryCheckout from the Exact SourceBaseline

**Milestone:** WTR02 — Repository, checkout, MCP, and source ownership contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Depends on:** WTR02E closed at 8801fd59c53e686d13a2bd8890cd73ab5ddd0eed  
**Architecture:** docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md  
**Operator decisions:** docs/implementation-bundles/workflow-topology-recovery/OPERATOR_DECISIONS_2026-09-23.md  
**Plan:** docs/implementation-bundles/workflow-topology-recovery/WORK_CARD_PLAN.md  
**Report:** docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02F_IMPLEMENTER_REPORT.md

## 1. Objective

Implement the first complete lazy source-materialization path for a substantive Workflow:

~~~
substantive Workflow
→ immutable SourceBaseline already exists
→ first source-changing need
→ create/reuse Workflow SourceBinding
→ create/recover Workflow SourceLine from exact recorded baseline
→ create/recover Workflow RepositoryCheckout
→ register checkout with Agent Harness
→ mark SourceBinding ready
~~~

Before this card, ChampCity has the semantic contracts but no canonical operation that joins them.

After this card, a substantive Workflow can move from SourceBaseline-only state to SourceBaseline + Workflow-owned SourceBinding + Workflow SourceLine + RepositoryCheckout without WIR owning any source resource.

This card does not move checkpoint or integration ownership. That is WTR02G.

## 2. Lazy means explicit, not automatic

Do not materialize source when:

- a Workflow is merely created;
- a SourceBaseline is captured;
- a WIR is captured;
- routing occurs;
- planning begins;
- a Research Workflow closes through Evidence/Decision without source mutation.

Expose one application-owned materialization operation that a later Workflow execution service can call only when repository mutation is actually required.

WTR02F does not wire that trigger into every Workflow UI or execution path yet.

## 3. New application service

Create:

src/main/sourceControl/workflowSourceMaterializationService.ts

Expose a bounded application service equivalent to:

~~~ts
export interface RepositoryCheckoutRegistrationPort {
  registerRepositoryCheckout(
    workspaceId: string,
    checkout: RepositoryCheckout,
  ): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary>;
}

export function createWorkflowSourceMaterializationService(options: {
  projectContainerRoot: string;
  projectId: string;
  mcpWorkspaceId: string;
  checkoutRegistration: RepositoryCheckoutRegistrationPort;
}) {
  return {
    materialize(workflowId: string): Promise<WorkflowSourceMaterializationResult>
  };
}
~~~

Exact type placement may follow current project conventions.

Do not instantiate AgentHarnessServiceHostClient inside the source-control service.

The materializer depends on a semantic checkout-registration port. Production composition can supply the WTR02D Service Host client later; focused tests may supply AgentHarnessService or a bounded adapter.

## 4. Input Workflow must be the current substantive Workflow record

materialize(workflowId) must require:

- exact canonical Workflow entity ID;
- Workflow exists in the selected Project;
- Workflow is current/active;
- Workflow type is not work-intake-routing;
- Workflow state is not closed or cancelled.

Reject:

- WIR;
- foreign Project Workflow;
- superseded historical Workflow record when a current successor exists;
- terminal Workflow.

Do not infer a Workflow from Work Intake provenance.

## 5. SourceBaseline is mandatory and remains immutable

Resolve the Workflow lineage and require exactly one SourceBaseline belonging to that lineage.

If no SourceBaseline exists:

- fail before provider mutation;
- do not create a SourceBinding;
- do not create a branch;
- do not create a checkout.

If more than one lineage baseline is somehow present, fail closed as invalid source state.

Use only the recorded repositoryId, integrationTargetSourceLineId, and baseRevisionId from SourceBaseline.

Do not refresh, recapture, rebase, or replace the baseline.

## 6. Physical source identity is anchored to immutable baseline Workflow ID

This card resolves the supersession timing problem explicitly.

A Workflow record may be superseded while retaining the same Workflow lineage.

Example:

~~~
Workflow A
→ SourceBaseline(workflowId = A)
→ Workflow A is superseded by Workflow A'
→ source mutation is first required after supersession
~~~

Physical source topology must not depend on whether materialization happened before or after supersession.

Therefore:

~~~
sourceAnchorWorkflowId = SourceBaseline.workflowId
~~~

The immutable baseline Workflow ID is the stable physical source anchor for that Workflow lineage.

The current SourceBinding may still store workflowId = current Workflow record ID, such as A'. That is already the WTR02B semantic model.

Do not use current successor ID, lineageId itself, title, Workflow type, or Work Intake ID to name physical source resources.

## 7. Deterministic source identities

For sourceAnchorWorkflowId = baseline.workflowId:

### SourceLine

~~~
workflow/<sourceAnchorWorkflowId>
~~~

Use WTR02E workflowSourceLineName(sourceAnchorWorkflowId).

### RepositoryCheckout ID

~~~
workflow-<sourceAnchorWorkflowId>
~~~

Example:

~~~
workflow-a1b2c3d4-e5f6-4789-8abc-0123456789ab
~~~

### Project-relative checkout path

~~~
.champcity/checkouts/<sourceAnchorWorkflowId>
~~~

Use WTR02C topology resolution.

No random IDs, timestamps, title slugs, hashes, route labels, or Work Intake identity.

## 8. Add deterministic checkout-ID helper

Add a bounded helper in:

src/main/sourceControl/projectSourceTopology.ts

Equivalent behavior:

~~~ts
export function workflowRepositoryCheckoutId(workflowId: string): string
~~~

It must:

- require the same canonical lowercase Workflow UUID as Workflow checkout path resolution;
- return exactly workflow-<workflow-id>;
- satisfy the WTR02C bounded opaque checkout-ID contract;
- reject malformed, uppercase, or traversal-like values.

Do not change the general RepositoryCheckout validator to require every Workflow checkout in all contexts to use this generated ID.

WTR02F uses this deterministic identity; the generic contract remains provider/application neutral.

## 9. Integration checkout prerequisite

WTR02F does not create or adopt permanent Main/Dev topology. That remains WTR03C.

For this card, materialization requires the managed Dev checkout to already exist at:

~~~
<Project>/Dev
~~~

and SourceBaseline must currently identify:

~~~
integrationTargetSourceLineId = dev
~~~

If the baseline identifies another integration target:

- fail visibly;
- do not silently use Dev;
- do not create another permanent target checkout.

## 10. Dev checkout validation

Before creating source:

1. resolve the canonical non-Git Project container;
2. resolve the WTR02C managed topology;
3. require Dev/ to exist;
4. reject redirect/symlink/reparse aliasing;
5. require Dev/ to be an exact Git working-tree root;
6. require a dev SourceLine to exist in that Repository;
7. require the recorded baseRevisionId to resolve in that Repository.

Do not require current Dev HEAD to equal the baseline.

Dev may have advanced during planning. The Workflow SourceLine must still start from the immutable recorded baseline.

## 11. SourceBinding creation/reuse

Resolve all SourceBinding records for the Workflow lineage.

### No binding

Create exactly one SourceBinding using createWorkflowSourceBinding(projectId, currentWorkflowId, baseline.id).

Initial state is unprepared.

### One binding

Reuse it if it belongs to the same Workflow lineage and same SourceBaseline.

Do not move or recreate it merely because its exact workflowId points to an earlier record in the same lineage.

### More than one

Fail closed. Do not create a second binding.

## 12. SourceBinding ready now requires checkout identity

Update assertSourceBindingBody() so preparationState = ready requires all of:

- SourceBaseline has baseRevisionId;
- workSourceLineId;
- currentRevisionId;
- repositoryCheckoutId;
- no failureCode.

This completes the deferred WTR02B rule.

A SourceBinding is not ready for source-changing execution merely because a branch exists. It is ready when ChampCity has both the source line and explicit execution checkout identity.

## 13. Current Project State view must expose ready source target

Extend CurrentProjectStateView.sourceBindings[] to include:

~~~ts
workSourceLineId: string | null;
currentRevisionId: string | null;
repositoryCheckoutId: string | null;
~~~

Retain id, workflowId, sourceBaselineId, and preparationState.

Do not add host-local checkout paths.

## 14. Materialization state machine

Fresh path:

~~~
unprepared
→ preparing
→ ready
~~~

Failure path:

~~~
preparing
→ blocked
~~~

Retry path:

~~~
blocked
→ preparing
→ ready | blocked
~~~

Use existing updateSourceBinding() transitions.

Do not create another materialization-state store.

## 15. Required operation sequence

For a fresh materialization:

1. validate Project, Workflow, lineage, and SourceBaseline;
2. resolve or create SourceBinding;
3. validate managed Project topology and Dev prerequisite;
4. transition binding to preparing;
5. create or recover deterministic Workflow SourceLine from exact SourceBaseline revision;
6. persist or reconfirm preparing binding workSourceLineId and currentRevisionId;
7. create or recover Workflow worktree at exact managed checkout path;
8. construct and validate RepositoryCheckout descriptor;
9. register it through the WTR02D registration port;
10. transition SourceBinding to ready with workSourceLineId, exact checkout HEAD as currentRevisionId, repositoryCheckoutId, and no failureCode;
11. return the ready binding and RepositoryCheckout descriptor.

Do not expose the checkout to execution before ready state is durable.

## 16. Provider SourceLine creation

For a fresh branch, call the WTR02E provider operation:

~~~ts
createWorkSource({
  baseRevision: {
    repositoryId: baseline.repositoryId,
    revisionId: baseline.baseRevisionId
  },
  owner: {
    kind: "workflow",
    workflowId: sourceAnchorWorkflowId
  }
})
~~~

Do not manually duplicate WTR02E branch naming logic in the materializer.

The returned SourceLine must exactly match the deterministic expected SourceLine.

## 17. SourceLine recovery on retry

Because branch creation and Project State persistence cannot be one atomic transaction, retry must be safe.

If the deterministic Workflow SourceLine already exists while the binding is preparing or blocked:

- inspect it;
- require its exact branch/ref name;
- require its head still equals the recorded SourceBaseline revision before readiness;
- reuse it only if those facts match.

If it exists at another revision before the binding has ever reached ready:

- do not reset;
- do not force-update;
- do not delete;
- mark source preparation blocked;
- require inspection.

Do not invent a suffixed replacement branch.

## 18. Workflow worktree creation

Create the Workflow checkout as a linked Git worktree at exactly:

~~~
<Project>/.champcity/checkouts/<sourceAnchorWorkflowId>
~~~

from the deterministic Workflow SourceLine.

Use bounded Git execution.

The materializer may create the missing managed parent directory:

~~~
<Project>/.champcity/checkouts
~~~

only after WTR02C path/redirection validation succeeds.

Do not create Project root, .champcity root, Main, Dev, or repository metadata storage.

## 19. Do not use old managed-worktree storage identity

Do not use:

- managedCheckoutPath();
- managedWorkspaceId();
- registerManaged();
- <git-common-dir>/champcity-mcp-worktrees/.

That is the older Agent Harness managed-worktree mechanism.

WTR02F uses:

~~~
<Project>/.champcity/checkouts/<workflow-id>
~~~

The existing generic repository lock in managedWorktrees.ts may be reused only if needed to serialize Git worktree metadata operations.

Do not inherit its path or workspace-identity policy.

## 20. Workflow checkout verification

Before declaring the checkout usable, prove:

- checkout root exists;
- exact canonical root equals expected WTR02C path;
- checkout is not redirected;
- git rev-parse --show-toplevel equals exact checkout root;
- git branch --show-current equals deterministic Workflow SourceLine;
- HEAD equals expected SourceLine revision;
- Git common directory matches Dev's Repository;
- checkout is clean before first ready transition.

Do not use --force, reset, clean, or destructive recovery.

## 21. Checkout recovery on retry

If the expected Workflow checkout path already exists while binding is preparing or blocked:

- validate it as the exact expected linked worktree;
- require expected Workflow SourceLine;
- require HEAD equals baseline revision;
- require clean pending state;
- reuse it if all facts match.

If the path exists but is not a Git worktree, is redirected, is attached to another SourceLine/Repository, is at another revision, or is dirty/untracked:

- do not delete or overwrite it;
- mark preparation blocked;
- fail for inspection.

## 22. RepositoryCheckout descriptor

Construct exactly:

~~~text
repositoryCheckoutId = workflow-<sourceAnchorWorkflowId>
repositoryId = SourceBaseline.repositoryId
sourceLineId = workflow/<sourceAnchorWorkflowId>
role = workflow
projectRelativePath = .champcity/checkouts/<sourceAnchorWorkflowId>
workflowId = sourceAnchorWorkflowId
~~~

Validate it with validateRepositoryCheckoutContract() before registration.

No host-local root enters the descriptor.

## 23. Agent Harness registration

Register the validated descriptor through RepositoryCheckoutRegistrationPort.registerRepositoryCheckout(mcpWorkspaceId, checkout).

Require returned summary to identify the same semantic checkout and availability = available.

Registration is idempotent under WTR02D.

If registration already exists with the exact contract, retry may continue.

Do not register the Workflow checkout as a separate MCP Project workspace.

## 24. Deterministic failure codes

When materialization has entered SourceBinding preparation and cannot finish, transition the binding to blocked with one stable bounded code from:

~~~
SOURCE_MATERIALIZATION_STATE_MISMATCH
SOURCE_LINE_MATERIALIZATION_FAILED
REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED
REPOSITORY_CHECKOUT_REGISTRATION_FAILED
SOURCE_INTEGRATION_TARGET_UNSUPPORTED
~~~

Use the most specific applicable code.

Do not persist raw local paths, Git stderr, credentials, or arbitrary exception prose in failureCode.

## 25. Partial failure preservation

Do not automatically delete a branch or worktree merely because a later materialization step failed.

Examples:

### SourceLine created, checkout creation fails

Retain the deterministic SourceLine, mark blocked, and allow retry to verify/reuse it.

### Checkout created, Agent Harness registration fails

Leave the exact checkout intact, mark blocked, retry registration later.

### Registration succeeds, final SourceBinding update fails

Do not unregister or delete the checkout automatically.

A retry must revalidate all facts and converge the binding to ready.

Recovery principle:

> Preserve inspectable source state; never hide partial failure through destructive cleanup.

## 26. Ready-binding idempotence

Calling materialize again for a binding already in ready must not create anything.

It must revalidate:

- SourceBinding lineage and baseline;
- deterministic SourceLine identity;
- deterministic RepositoryCheckout identity;
- expected checkout path;
- exact Git worktree;
- current checkout HEAD equals binding.currentRevisionId;
- Agent Harness registration can be idempotently confirmed.

If all facts match, return existing ready state without a state revision merely for retry.

If ready state and physical checkout disagree:

- transition ready → blocked if possible;
- do not recreate/reset/overwrite source;
- require inspection.

## 27. Supersession-before-materialization proof

Permanent proof must explicitly cover:

~~~
Workflow A
→ SourceBaseline anchored to A
→ supersede Workflow A with A'
→ materialize(A')
~~~

Required results:

- SourceBinding may be created on or resolve to current A' lineage state;
- physical source anchor remains A;
- SourceLine = workflow/A;
- RepositoryCheckout ID = workflow-A;
- checkout path = .champcity/checkouts/A;
- no workflow/A' SourceLine exists;
- no .champcity/checkouts/A' checkout exists.

## 28. No baseline refresh when Dev advances

Permanent proof must cover:

1. capture SourceBaseline at Dev revision R1;
2. advance Dev to R2;
3. materialize Workflow;
4. Workflow SourceLine and checkout start at R1;
5. Dev remains at R2.

Do not silently branch from current Dev HEAD.

## 29. Multiple concurrent Workflow proof

Create two substantive Workflows with distinct SourceBaselines that point to the same Dev base revision.

Materialize both.

Prove:

- distinct SourceBinding IDs;
- distinct Workflow SourceLines;
- distinct RepositoryCheckout IDs;
- distinct checkout paths;
- both checkouts exist simultaneously;
- Dev checkout remains on Dev;
- no serialized admission rule prevents the second Workflow from being materialized.

## 30. Project State fixture updates

Because ready now requires repositoryCheckoutId, update permanent tests that manually synthesize a ready SourceBinding.

Known owners include:

- test/project-state/source-semantic-references.test.cjs;
- test/project-state/current-state-queries.test.cjs;
- test/project-state/authoritative-context-event-feed.test.cjs;
- test/source-control/structured-workflow-checkpoint.test.cjs;

and any directly selected fixture that manually calls updateSourceBinding(... preparationState: "ready" ...).

For synthetic state-only fixtures, use a bounded opaque fake checkout ID such as workflow-checkout-fixture unless the test specifically exercises WTR02F physical materialization.

Do not rewrite those tests around the materializer unless they specifically test materialization.

## 31. Current-state projection proof

Update test/project-state/current-state-queries.test.cjs to prove a ready SourceBinding projection exposes:

- workSourceLineId;
- currentRevisionId;
- repositoryCheckoutId;

and never exposes an absolute checkout root.

## 32. New permanent materialization test

Create:

test/source-control/workflow-source-materialization.test.cjs

Use a neutral temporary Project container with:

~~~
<Project>/
├── .champcity/
│   └── project-state.sqlite
└── Dev/
    └── real Git working tree
~~~

The test setup may create Dev. Production materialization code may not.

Use a real ProjectStateService and a real bounded RepositoryCheckout registration boundary where practical.

Required cases:

1. fresh Workflow materialization;
2. exact baseline R1 while Dev advanced to R2;
3. supersession before materialization;
4. two simultaneous Workflow materializations;
5. retry/idempotence of already-ready materialization;
6. blocked recovery from existing exact branch/worktree where practical;
7. refusal to overwrite conflicting existing checkout path;
8. WIR, terminal, and no-baseline rejection before provider mutation.

Keep this bounded. Do not turn it into another full lifecycle test.

## 33. Existing provider proof remains valid

Run unchanged:

test/agent-harness/source-control-service-boundary.test.cjs

WTR02E provider SourceLine creation semantics must remain intact.

## 34. Do not fix checkpoint services yet

Do not modify:

- semanticCheckpointService.ts;
- structuredWorkflowCheckpointService.ts;
- structuredIntegrationService.ts;
- SourceCheckpoint ownership;
- IntegrationRecord ownership.

Those services still contain Work Intake transitional semantics and some still assume the selected root is a Git checkout.

WTR02G will move them onto Workflow-owned binding/checkout semantics.

WTR02F only establishes the ready source resources they will consume.

## 35. Do not fix Source Graph yet

Do not modify sourceGraphService.ts or public SourceGraph Work Intake identity.

WTR02H owns that cut.

Existing Source Graph fixture failures may remain deferred.

## 36. Do not change Work Intake capture

Do not modify structuredWorkIntakeService.ts to create SourceLines, SourceBindings, or checkouts.

WIR remains routing-only source-neutral intake.

Its current compatibility SourceReadiness projection may remain transitional until the WIR recovery cards.

Do not reintroduce source materialization during Work Intake capture.

## 37. Expected production scope

Expected:

- new src/main/sourceControl/workflowSourceMaterializationService.ts;
- src/main/sourceControl/projectSourceTopology.ts;
- src/shared/projectState/projectStateService.ts.

Potential imports/use only, normally no semantic modification:

- src/main/sourceControl/sourceControlService.ts;
- src/main/sourceControl/workSourceNaming.ts;
- src/main/agentHarness/repository/boundedGit.ts;
- WTR02D checkout registration types/contracts.

No Project State schema migration should be required because repositoryCheckoutId already exists on SourceBinding.

Any additional production file must be justified in the Implementer Report.

## 38. Expected test scope

Expected:

- new test/source-control/workflow-source-materialization.test.cjs;
- test/project-state/source-semantic-references.test.cjs;
- test/project-state/current-state-queries.test.cjs;
- test/project-state/authoritative-context-event-feed.test.cjs;
- test/source-control/structured-workflow-checkpoint.test.cjs;
- test/agent-harness/source-control-service-boundary.test.cjs only if a narrowly necessary expectation changes; prefer unchanged.

Other fixtures may receive only the minimal synthetic repositoryCheckoutId addition required by the tightened ready invariant.

Do not update WTR02G/H-owned fixtures semantically merely to make the affected run green.

validation/capability-map.json may change only if the new permanent materialization test must be classified accurately.

## 39. Explicit non-scope

Do not in WTR02F:

- create or adopt Main/Dev in production;
- implement Existing Project Registration;
- implement Greenfield bootstrap;
- create repository common metadata at .champcity/repository.git;
- refresh/rebase SourceBaseline;
- change Workflow creation;
- materialize source automatically at Workflow creation/planning;
- make WIR own source;
- modify WorkIntakeBranchService;
- use old managed-worktree paths/IDs;
- move checkpoint ownership;
- move integration ownership;
- modify Source Graph ownership;
- implement Workflow close/checkout retirement;
- add cleanup that deletes blocked source;
- begin WTR02G+.

## 40. Acceptance criteria

WTR02F is complete only when:

1. substantive Workflow source is materialized only on explicit request;
2. one immutable SourceBaseline is required;
3. SourceBinding is created/reused by Workflow lineage;
4. physical source identity is anchored to immutable SourceBaseline.workflowId;
5. SourceLine starts from exact recorded baseline even if Dev advanced;
6. Workflow checkout path is exactly WTR02C managed topology;
7. RepositoryCheckout ID is deterministic;
8. SourceBinding ready requires RepositoryCheckout identity;
9. checkout is registered through WTR02D semantic registration boundary;
10. Project root remains non-Git;
11. Dev checkout is not switched or rewound;
12. multiple Workflow checkouts coexist;
13. retries recover only exact matching partial state;
14. conflicting, dirty, or mismatched partial state is preserved and blocked, not overwritten;
15. WIR, terminal, or no-baseline materialization fails before provider mutation;
16. no checkpoint, integration, or Source Graph ownership work is performed.

## 41. Validation

Required:

1. npm run build;
2. node --test test/source-control/workflow-source-materialization.test.cjs;
3. node --test test/project-state/source-semantic-references.test.cjs test/project-state/current-state-queries.test.cjs test/project-state/authoritative-context-event-feed.test.cjs;
4. node --test test/agent-harness/source-control-service-boundary.test.cjs;
5. node --test test/source-control/structured-workflow-checkpoint.test.cjs if modified;
6. validation planner preview for exact final changed-path manifest using the work-item profile;
7. npm run test:affected -- --changes <exact-changed-path manifest>;
8. git diff --check.

Do not run the historical full suite unless selected by the exact affected plan.

Failures solely owned by WTR02G/H or WTR03C may remain classified as deferred.

The new WTR02F materialization proof must pass.

## 42. Implementer Report

Write:

docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02F_IMPLEMENTER_REPORT.md

Include:

- starting SHA;
- exact files changed;
- materialization service API;
- checkout registration port shape;
- physical source anchor rule;
- deterministic SourceLine, checkout ID, and path;
- Dev prerequisite validation;
- SourceBinding create/reuse behavior;
- fresh state-transition sequence;
- partial-failure and retry behavior;
- exact-baseline proof with advanced Dev;
- supersession-before-materialization proof;
- multi-Workflow coexistence proof;
- ready-binding idempotence proof;
- current-state projection change;
- focused validation;
- affected failures classified by WTR02G/H/WTR03C where applicable;
- explicit confirmation that Work Intake capture, checkpoint/integration ownership, Source Graph, Main/Dev bootstrap, and legacy WorkIntakeBranchService were not modified.

Do not edit the committed report afterward solely to add its own checkpoint hash.

## 43. Git checkpoint and stop boundary

The Operator has already authorized routine card-local Git mechanics for WTR.

After implementation, validation, report, exact staged-diff review, and safety scan, create exactly one attributable checkpoint commit.

Suggested subject:

WTR02F materialize Workflow source from exact baseline

No additional Operator Git approval is required.

Do not push, merge, tag, release, reset, clean, restore unrelated files, or perform Git actions outside this card.

Then STOP.

Do not begin WTR02G.

The Architect will review WTR02F before Workflow-owned checkpoint/integration semantics are released.
