# WTR02H — Move Source Graph Identity from Work Intake to Workflow

**Milestone:** WTR02 — Repository, checkout, MCP, and source ownership contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Depends on:** WTR02G closed at e2955e70a8f9e4477f37fb425c32ef05002d0116  
**Architecture:** docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md  
**Operator decisions:** docs/implementation-bundles/workflow-topology-recovery/OPERATOR_DECISIONS_2026-09-23.md  
**Plan:** docs/implementation-bundles/workflow-topology-recovery/WORK_CARD_PLAN.md  
**Report:** docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02H_IMPLEMENTER_REPORT.md

## 1. Objective

Complete WTR02 by removing the final Work Intake identity from the current Source Graph contract and UI.

After WTR02H, the Source Graph is a read-only projection of:

- provider repository topology;
- substantive Workflow source lineages;
- Workflow-owned checkpoints;
- Workflow-owned integration state.

It is not a Work Intake dashboard.

WIR provenance may still exist elsewhere in Project State, but Source Graph identity, admission, selection, filtering, labels, and source-line ownership must not depend on Work Intake.

## 2. Hard Source Graph contract cut

Update:

src/shared/sourceLifecycleContracts.ts

Remove the current Work Intake keyed fields:

~~~
sourceLines[].workIntakeIds
workBindings
workBindings[].workIntakeId
workBindings[].route
workBindings[].workType
truncation.workBindingsTruncated
~~~

Replace them with Workflow-native fields:

~~~
sourceLines[].workflowIds
workflowBindings
workflowBindings[].workflowId
workflowBindings[].sourceAnchorWorkflowId
workflowBindings[].workflowType
truncation.workflowBindingsTruncated
~~~

Do not keep compatibility aliases.

No Source Graph field may expose Work Intake identity after this card.

## 3. Canonical SourceGraph shape

Use a contract equivalent to:

~~~ts
export interface SourceGraph {
  repositoryId: string;

  integrationTargets: Array<{
    id: string;
    lineId: string;
    headRevisionId: string;
  }>;

  sourceLines: Array<{
    id: string;
    headRevisionId: string;
    providerBranchName?: string;
    role: "main" | "dev" | "work";
    workflowIds: string[];
  }>;

  revisions: Array<{
    id: string;
    parents: string[];
    timestamp: string;
    headOfLineIds: string[];
    checkpointKinds: Array<"implementation" | "disposition">;
    integrationStates: string[];
  }>;

  workflowBindings: Array<{
    workflowId: string;
    sourceAnchorWorkflowId: string;
    lineId: string | null;
    title: string;
    workflowType: WorkflowType;
    lifecycleState: string;
    workflowState: string;
    baseRevisionId: string;
    currentRevisionId: string | null;
    checkpointKinds: Array<"implementation" | "disposition">;
    integrationState: string | null;
  }>;

  truncation: {
    maxRevisions: number;
    maxLines: number;
    revisionsTruncated: boolean;
    linesTruncated: boolean;
    omittedParentLinks: number;
    workflowBindingsTruncated: boolean;
  };

  providerDiagnostics: {
    provider: "git";
    currentBranch?: string;
    metadata: "available" | "missing" | "unavailable";
  };
}
~~~

Import and use the canonical WorkflowType type if practical.

Do not invent a second Workflow type enum.

## 4. Current Workflow identity versus physical source anchor

WTR02F and WTR02G established two distinct but valid identities.

Example:

~~~
Workflow A
→ SourceBaseline.workflowId = A
→ physical SourceLine = workflow/A
→ physical RepositoryCheckout = workflow-A

Workflow A superseded by A'

current source lifecycle owner = A'
physical source anchor remains A
~~~

Source Graph must represent both facts explicitly:

~~~
workflowBinding.workflowId = A'
workflowBinding.sourceAnchorWorkflowId = A
~~~

The source line must attach to the current Workflow identity:

~~~
sourceLine.workflowIds includes A'
~~~

Do not attach A merely because A is the immutable source anchor.

Do not rename or rematerialize source because the Workflow record was superseded.

## 5. Resolve one current Workflow projection per SourceBinding lineage

For every Structured Project State SourceBinding selected for the repository:

1. resolve its SourceBaseline;
2. resolve SourceBinding owner Workflow;
3. resolve SourceBaseline owner Workflow;
4. require all belong to the same Workflow lineage;
5. enumerate Workflow records in that lineage;
6. resolve exactly one current lineage record for projection.

For Source Graph projection, current means:

- lifecycleState is not superseded;
- lifecycleState is not voided;
- Workflow type is substantive, not work-intake-routing;
- exactly one record remains current in that lineage.

The current graph record may be active or completed.

This differs from WTR02G source mutation rules, which require active/nonterminal ownership.

Source Graph is historical/read-only and may show completed Workflows.

If the lineage has no unique current substantive Workflow record, fail structured metadata projection closed.

The outer graph may still fall back to mechanical repository topology with providerDiagnostics.metadata = unavailable, as it does for other metadata failures.

## 6. Workflow admission must not require WIR provenance

Delete the current structured metadata admission path:

~~~
SourceBinding
→ Workflow lineage
→ routes_to
→ WIR Workflow
→ initiates
→ WorkIntake
→ include binding only if WorkIntake exists
~~~

That path is architecturally invalid.

New admission:

~~~
SourceBinding
→ SourceBaseline.repositoryId matches requested repository
→ valid substantive Workflow lineage
→ current Workflow projection
→ include
~~~

A direct-started Feature, Issue, Migration, Infrastructure, Integration, Research-with-source, or Project Creation Workflow must be graphable without:

- WorkIntake;
- WIR Workflow;
- routes_to;
- initiates;
- RouteAssessment;
- route Decision.

## 7. WIR itself is never a source binding entry

A work-intake-routing Workflow must not appear in workflowBindings.

Do not create a synthetic graph entry for WIR.

WIR has no implementation SourceBaseline, SourceLine, or RepositoryCheckout under the adopted architecture.

## 8. Workflow binding title and type

Populate workflowBindings from the current Workflow record:

~~~
workflowId = current Workflow record ID
title = current Workflow.body.title
workflowType = current Workflow.body.workflowType
lifecycleState = current Workflow.lifecycleState
workflowState = current Workflow.body.workflowState
~~~

Do not use WorkIntake.request as the graph title.

Do not use route labels as Workflow identity.

## 9. Source anchor and revisions

Populate:

~~~
sourceAnchorWorkflowId = SourceBaseline.workflowId
baseRevisionId = SourceBaseline.baseRevisionId
currentRevisionId = SourceBinding.currentRevisionId ?? null
~~~

lineId is:

- the deterministic graph line ID for SourceBinding.workSourceLineId when that provider branch is included in the bounded branch inventory;
- null otherwise.

Do not use repositoryCheckoutId as a graph line identity.

## 10. Checkpoint aggregation by Workflow lineage

SourceCheckpoint is now Workflow-owned.

For each workflowBinding, aggregate checkpointKinds from every SourceCheckpoint whose workflowId belongs to that Workflow lineage.

This deliberately includes historical checkpoints created before Workflow supersession.

Example:

~~~
checkpoint owned by A
A superseded by A'
graph binding owned by A'
checkpointKinds still includes A's checkpoint
~~~

Do not require checkpoint.workflowId to equal the current exact Workflow ID.

Lineage is the historical aggregation boundary.

## 11. Integration aggregation by Workflow lineage

Apply the same rule to IntegrationRecord.

workflowBinding.integrationState is the latest applicable IntegrationRecord state across the lineage, ordered deterministically by updatedAt then ID as today.

Historical IntegrationRecords owned by a predecessor remain visible through the current Workflow binding.

Do not rewrite their ownership.

## 12. Revision annotations

Retain current revision annotation behavior:

- revision.checkpointKinds derives from SourceCheckpoint.resultingRevisionId;
- revision.integrationStates derives from IntegrationRecord resultRevisionId or incomingRevisionId.

Only records associated with Workflow lineages selected into current workflowBindings for the requested repository may annotate the structured graph.

Do not allow unrelated Project Workflows/repositories to annotate revisions.

## 13. sourceLines[].workflowIds

For each provider source line:

~~~
workflowIds =
  current workflowBinding.workflowId values
  whose workflowBinding.lineId equals this sourceLine.id
~~~

Rules:

- sorted deterministically;
- unique;
- main/dev normally have [];
- one Workflow source line normally has one current Workflow ID;
- never expose Work Intake IDs.

Do not derive workflowIds from branch name parsing.

## 14. includeCompleted semantics

Retain SourceGraphOptions.includeCompleted.

Default behavior remains current behavior: include completed Workflows unless includeCompleted === false.

When includeCompleted === false, exclude workflowBindings whose current Workflow is completed/cancelled according to current Workflow state/lifecycle semantics.

At minimum, exclude:

- workflowState = closed;
- workflowState = cancelled;
- lifecycleState = closed;
- lifecycleState = archived;
- lifecycleState = voided.

A filtered Workflow does not appear in workflowBindings or sourceLine.workflowIds.

Its physical Git branch remains in sourceLines if it is inside the bounded mechanical branch inventory.

The option filters semantic Workflow metadata, not provider topology.

## 15. No WIR route field in Source Graph

Remove route from Source Graph binding metadata.

The Source Graph already carries canonical workflowType.

If routed provenance is needed later, another projection may expose it explicitly.

Do not retain route or rename it to originRoute merely to preserve the old Work Intake display.

This card intentionally removes WIR semantics from Source Graph.

## 16. No legacy Work Intake identity synthesis

Current sourceGraphService has legacyMetadata() that reads planning/work-intake/intakes and projects Work Intake branch bindings into Source Graph.

Remove that behavior.

When no Structured Project State authority is available:

- mechanical Git topology remains readable;
- workflowBindings = [];
- sourceLines[].workflowIds = [];
- providerDiagnostics.metadata is missing or unavailable according to the existing missing-metadata convention;
- do not synthesize Workflow IDs from intake IDs, branch labels, Markdown filenames, route names, or hashes.

readWorkProjectIdentity() may remain solely as a repository-identity fallback for selectedSourceGraphRepositoryId().

readWorkIntake() must no longer be used by Source Graph metadata projection.

## 17. sourceGraphService cleanup

Update:

src/main/sourceControl/sourceGraphService.ts

Remove structured graph dependencies that exist only to reconstruct Work Intake identity:

- WorkIntake inventory;
- intakeForBinding;
- WorkIntake-based admission;
- WorkIntake request titles;
- WorkIntake lifecycle state;
- route assessment/decision lookup used only for route display;
- legacy Work Intake binding projection.

Retain only Project State data required for Workflow-owned graph semantics.

Expected structured inputs:

- SourceBaseline;
- SourceBinding;
- Workflow;
- SourceCheckpoint;
- IntegrationRecord.

Relationships may be read only if needed to validate or aggregate current Workflow semantics.

Do not broaden Source Graph into a general Project State browser.

## 18. Bound and truncation semantics

Retain current bounds:

- MAX_LINES;
- MAX_REVISIONS;
- MAX_BINDINGS or equivalent Workflow binding bound.

Rename internal terminology where appropriate.

The public truncation field must become:

~~~
workflowBindingsTruncated
~~~

not workBindingsTruncated.

Do not expose both.

## 19. Renderer contract hard cut

Update:

src/renderer/app/SourceControlWorkspace.tsx

The Source Control workspace must consume:

~~~
graph.workflowBindings
workflow.workflowId
sourceLine.workflowIds
graph.truncation.workflowBindingsTruncated
~~~

It must not consume:

- graph.workBindings;
- workIntakeId;
- workIntakeIds;
- workBindingsTruncated.

## 20. Renderer selection identity

Change selection kind:

~~~
kind: "work"
~~~

to:

~~~
kind: "workflow"
~~~

Workflow selections are keyed by workflowId.

Refresh must preserve selected Workflow only if that exact current Workflow ID is still present.

If supersession changes the current graph owner from A to A', the old A selection may naturally fall back to the first source line.

Do not invent a hidden lineage selection ID in this card.

## 21. Renderer language

Replace Work Intake graph language with Workflow language.

Required examples:

~~~
"Inspect source lines, revision ancestry, and Workflow progress."

"Workflows"

"No Workflow binding"

"Workflow"

"Workflow type"

"Workflow identity"

"Select a source line, Workflow, or revision to inspect it."
~~~

Remove from SourceControlWorkspace:

- "Work Intakes";
- "Work Intake";
- "Work Intake progress";
- "Work Intake identity";
- "No Work Intake binding";
- "Some Work Intake details are omitted."

This is a Source Graph UI only.

Do not globally rename Work Intake elsewhere in the product.

## 22. Renderer Workflow status

Replace workStatus() with Workflow semantics.

Equivalent behavior:

- integrationState = integrated → Integrated;
- workflowState = closed or cancelled → Completed;
- closed/archived lifecycle may display Completed;
- otherwise Active.

Do not use Work Intake lifecycle state.

## 23. Renderer detail content

Workflow list/detail should display:

- current Workflow title;
- Workflow type;
- Workflow state/lifecycle;
- base revision;
- current revision;
- checkpoint kinds;
- integration state;
- current Workflow ID.

Provider/source details may additionally show sourceAnchorWorkflowId when useful, especially when it differs from workflowId.

Do not show Work Intake ID.

Do not require a route label.

## 24. sourceGraphLayout contract

Update:

src/renderer/app/sourceGraphLayout.ts

Replace graph.workBindings with graph.workflowBindings.

Fast-forward semantic integration links continue to derive from:

- Workflow binding lineId;
- Workflow binding integrationState;
- graph integration targets.

Update comments from Work Intake line to Workflow line.

Do not change graph geometry unless required by the contract rename.

## 25. Structured Source Graph permanent proof

Rewrite/extend:

test/source-control/source-graph-projection.test.cjs

The focused proof must no longer rely on Work Intake as the admission identity.

Create at least three substantive Workflow source bindings in one Project/repository using distinct provider branches already present in the synthetic repository.

Required coverage:

### Routed Workflow

One Workflow may have WIR provenance.

Prove:

- it appears by current Workflow ID;
- WIR ID and WorkIntake ID do not appear in SourceGraph output.

### Direct-started Workflow

At least one substantive Workflow must have no WorkIntake, no WIR, no routes_to provenance.

Prove:

- it still appears in workflowBindings;
- its source line workflowIds includes its Workflow ID.

### Multiple simultaneous Workflow source lines

At least three source-backed Workflows must appear simultaneously.

Prove:

- distinct workflowIds;
- distinct lineIds where provider branches exist;
- sourceLines attach the correct workflowIds;
- main/dev have no Workflow owner IDs unless an actual substantive Workflow binding points there.

## 26. Supersession Source Graph proof

Required:

1. create Workflow A;
2. create SourceBaseline anchored to A;
3. create SourceBinding/source line;
4. create at least one SourceCheckpoint or IntegrationRecord owned by A while A is current, if convenient;
5. supersede A → A';
6. optionally create later lifecycle evidence owned by A';
7. read Source Graph.

Prove:

~~~
workflowBinding.workflowId = A'
workflowBinding.sourceAnchorWorkflowId = A
workflowBinding checkpoint/integration aggregation includes relevant lineage history
sourceLine.workflowIds includes A'
sourceLine.workflowIds does not include A
~~~

The provider branch/source line remains the original physical line.

## 27. includeCompleted proof

Create a source-backed substantive Workflow that is completed/cancelled after its source binding exists.

Prove:

- default Source Graph includes it;
- getSourceGraph({ includeCompleted: false }) omits its workflowBinding;
- its mechanical provider source line may still remain in sourceLines;
- that line's workflowIds becomes empty when the semantic binding is filtered.

## 28. Missing metadata proof

Retain and update the existing mechanical-topology test.

With no Structured Project State metadata:

- Source Graph succeeds;
- providerDiagnostics.metadata indicates missing/unavailable metadata;
- workflowBindings is [];
- every sourceLine.workflowIds is [];
- revision topology remains valid.

No Work Intake Markdown is required.

## 29. Read-only invariant

Retain proof that Source Graph:

- does not switch branches;
- does not stage;
- does not commit;
- does not mutate Project State;
- does not create source lines;
- does not materialize checkouts.

H is projection-only.

## 30. Renderer permanent proof

Update:

test/renderer/source-control-graph-layout.test.cjs

Fixture must use:

- workflowIds;
- workflowBindings.

Required assertions:

- layout behavior remains unchanged;
- fast-forward integration semantic link still renders from Workflow binding;
- SourceControlWorkspace loading state remains;
- static workspace language includes "Workflows";
- source workspace does not contain "Work Intakes" or "Work Intake progress";
- no source mutation controls appear.

If another existing renderer test directly constructs SourceGraph, update it as part of this contract cut.

## 31. Old source-lifecycle-package test

test/source-control/source-lifecycle-package.test.cjs still encodes the retired Work Intake source architecture and is already failing earlier under WTR03C-owned bootstrap/topology assumptions.

Do not turn H into a rewrite of that lifecycle package.

If affected validation reaches its Source Graph assertions, do not preserve workBindings/workIntakeId compatibility for that test.

The test may remain deferred to the post-H re-baseline/Project topology bundle.

Document the exact failure if selected.

## 32. Source Control workspace CSS

Existing CSS class names such as source-work-list may remain if they are purely styling hooks.

Do not spend H on cosmetic CSS renaming unless required by a test or semantics visible to the user.

Semantic TypeScript identifiers and user-visible Work Intake labels in the Source Graph path must change.

## 33. No Project topology work

Do not change the physical root model in WTR02H.

Current Source Graph mechanical Git inspection may continue using the currently selected repository checkout until the post-H Project topology bundle rewires source graph entry to the managed repository/checkouts.

Do not implement WTR03C here.

H changes semantic graph identity, not Project bootstrap/layout.

## 34. No Workflow Hub or execution work

Do not implement:

- Workflow Hub inventory;
- direct Workflow start UI;
- planning profiles;
- shared execution kernel;
- Workflow completion;
- integration-kernel redesign;
- Existing Project Registration;
- Greenfield bootstrap.

Those belong to the post-H vertical bundles.

## 35. Expected production scope

Expected:

- src/shared/sourceLifecycleContracts.ts
- src/main/sourceControl/sourceGraphService.ts
- src/renderer/app/SourceControlWorkspace.tsx
- src/renderer/app/sourceGraphLayout.ts

Possible narrow compile consumers:

- src/shared/workspaceContracts.ts only if generated/static typing requires direct shape adjustment;
- preload/main IPC should not need semantic changes because they pass SourceGraph through unchanged.

Remove obsolete imports from sourceGraphService where Work Intake metadata is no longer used.

Any additional production file must be justified in the Implementer Report.

## 36. Expected test scope

Expected:

- test/source-control/source-graph-projection.test.cjs
- test/renderer/source-control-graph-layout.test.cjs

Potential minimal updates to any other test that directly constructs SourceGraph.

Do not repair old full-lifecycle Work Intake fixtures merely to make affected validation green.

validation/capability-map.json may change only if permanent Source Graph proof metadata/counts require it.

## 37. Explicit non-scope

Do not in WTR02H:

- modify SourceBaseline ownership;
- modify SourceBinding ownership;
- modify SourceCheckpoint ownership;
- modify IntegrationRecord ownership;
- change WTR02F materialization;
- change WTR02G current-owner rules;
- change RepositoryCheckout MCP routing;
- rename SourceReadiness.workIntakeId;
- redesign IntegrationCandidateRecord;
- redesign WIR;
- create Main/Dev topology;
- implement WTR03+;
- begin the post-H implementation bundles.

## 38. Acceptance search invariant

After H, the following current Source Graph path must contain no Work Intake identity fields:

- src/shared/sourceLifecycleContracts.ts SourceGraph definition;
- src/main/sourceControl/sourceGraphService.ts current metadata projection;
- src/renderer/app/SourceControlWorkspace.tsx;
- src/renderer/app/sourceGraphLayout.ts;
- focused Source Graph tests.

Specifically, no current Source Graph code in those files may use:

~~~
workIntakeId
workIntakeIds
workBindings
workBindingsTruncated
~~~

SourceReadiness.workIntakeId elsewhere in sourceLifecycleContracts is explicitly deferred and is not a SourceGraph field.

Other Work Intake product code outside the Source Graph path is not part of this search invariant.

## 39. Acceptance criteria

WTR02H is complete only when:

1. SourceGraph sourceLines expose workflowIds, not workIntakeIds;
2. SourceGraph exposes workflowBindings, not workBindings;
3. workflowBindings are keyed by current Workflow identity;
4. sourceAnchorWorkflowId preserves immutable physical source ancestry;
5. direct-started Workflows appear without WIR provenance;
6. routed and direct Workflows use the same graph contract;
7. WIR itself does not appear as a source owner;
8. checkpoint/integration history aggregates by Workflow lineage;
9. superseded Workflow lineage projects the current Workflow ID while retaining historical source anchor;
10. includeCompleted filters Workflow metadata rather than Work Intake metadata;
11. no legacy Work Intake Markdown is synthesized into Workflow graph identity;
12. renderer selection and labels are Workflow-based;
13. mechanical Git topology remains read-only and available without Workflow metadata;
14. no WTR03+ implementation begins.

## 40. Validation

Required:

1. npm run build;
2. node --test test/source-control/source-graph-projection.test.cjs;
3. node --test test/renderer/source-control-graph-layout.test.cjs;
4. node --test test/project-state/source-semantic-references.test.cjs;
5. node --test test/source-control/workflow-source-materialization.test.cjs;
6. validation planner preview for exact final changed-path manifest using work-item profile;
7. npm run test:affected -- --changes <exact-changed-path manifest>;
8. git diff --check.

Do not run the historical full suite unless selected by the exact affected plan.

Failures owned by the post-H Project topology/bootstrap work may remain deferred.

All H-owned Source Graph and renderer proofs must pass.

## 41. Implementer Report

Write:

docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02H_IMPLEMENTER_REPORT.md

Include:

- starting SHA;
- exact files changed;
- SourceGraph contract before/after summary;
- workflowBindings shape;
- current Workflow resolution rule;
- sourceAnchorWorkflowId rule;
- direct Workflow no-WIR proof;
- routed/direct convergence proof;
- supersession proof;
- checkpoint/integration lineage aggregation proof;
- includeCompleted proof;
- missing metadata/legacy behavior;
- renderer selection/language changes;
- acceptance search result for retired Source Graph Work Intake fields;
- focused validation;
- deferred failures by future bundle ownership;
- explicit confirmation that WTR03+ was not started.

Do not edit the committed report afterward solely to add its own checkpoint hash.

## 42. Git checkpoint and stop boundary

The Operator has already authorized routine card-local Git mechanics for WTR.

After implementation, validation, report, exact staged-diff review, and safety scan, create exactly one attributable checkpoint commit.

Suggested subject:

WTR02H move Source Graph identity to Workflow

No additional Operator Git approval is required.

Do not push, merge, tag, release, reset, clean, restore unrelated files, or perform Git actions outside this card.

Then STOP.

Do not begin WTR03.

After Architect review and closure of H, the current WTR micro-card sequence is complete. The next Architect action is the agreed re-baseline of WTR03-WTR25 into larger vertical implementation bundles for sequential Luna execution with human Architect review at bundle boundaries.
