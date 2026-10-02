# RWS06J — Final Structured-State Cutover, App Shell Cleanup, and Bundle Qualification

**Status:** IMPLEMENTER_READY
**Sequence:** follows accepted RWS06A–RWS06I and their accepted repairs
**Repair/clarification basis:** Architect review of the incomplete RWS06J preparation plus current Operator direction

## Continuous execution contract

RWS06J-A through RWS06J-D are complete at their checkpoint commits. Architect review of those checkpoints and the first E qualification attempt established the final remaining sequence:

1. `RWS06J-REPAIR01_converge_greenfield_on_shared_workitem_pipeline.md`
2. `RWS06J-REPAIR02_retire_greenfield_workcard_compatibility_state.md`
3. `RWS06J-E-REPAIR01_retire_stale_legacy_proofs_after_cutover.md`
4. `RWS06J-E_qualify_structured_workflow_bundle.md`

The Implementer must execute that remaining sequence without returning between cards.

- Each intermediate repair writes its Implementer Report and creates its own attributable checkpoint.
- Those checkpoints are mechanical evidence and rollback boundaries only. They are **not** review, approval, or handback points.
- After each repair checkpoint succeeds, immediately continue to the next card in the same run.
- Do not pause because the next card deletes transitional code or performs final qualification; those actions are already authorized by this bundle.
- Stop early only for a genuine external blocker that cannot be corrected within the remaining bounded cards.
- Test failures, cleanup scope, or the significance of final qualification are not by themselves reasons to stop.
- The normal handback occurs only after RWS06J-E completes and the final bundle qualification report and final checkpoint exist.

The authoritative remaining execution order is also recorded in `RWS06J_FINAL_COMPLETION_SEQUENCE.md`.

## Objective

Finish the RWS06 cutover cleanly.

The target is not to preserve the old Markdown workflow architecture beside the new SQL workflow architecture. The target is:

- Structured Project State is the sole live workflow authority.
- `App.tsx` is an application shell, not a workflow implementation container.
- Workflow-specific state, effects, IPC commands, semantic parsing, review/disposition logic, and stage composition live in dedicated workflow/application components and services.
- Obsolete legacy workflow code is removed after its replacement is wired.
- Old ChampCity planning Markdown is not migrated into SQL as current workflow state.
- Existing repository import remains supported by inspecting source/repository state and starting fresh structured work; historical documents may be supplied as evidence/context but are never used to infer current lifecycle position.
- The final application is qualified with the structured-authority fence active.

## Operator decisions incorporated by this revision

### 1. App.tsx architectural invariant

`App.tsx` may own only genuine application concerns:

- top-level application route/navigation;
- selected Project and Workflow identity;
- global application chrome;
- application-level browser host mounting;
- settings entry/exit;
- cross-workspace coordination that cannot belong to one workflow.

`App.tsx` must not own:

- workflow-stage state;
- workflow-specific `useEffect` orchestration;
- workflow-specific IPC mutation handlers;
- Issue/Feature/Greenfield stage machines;
- Architect/Planning/Validation/Close semantic parsing;
- review/disposition forms;
- WorkItem/Phase selection logic;
- workflow-specific handoff construction;
- duplicated stage-specific JSX composition.

If the implementation adds new workflow-specific state/effects/handlers to `App.tsx`, that is a design regression.

### 2. No legacy planning-state migration requirement

The current product has one Operator/user, who accepts losing any still-active legacy Markdown planning state in existing ChampCity-managed repositories.

Therefore:

- do not preserve or expand Markdown-to-SQL workflow-state migration;
- do not infer current workflow position from historical planning documents;
- do not build a generic migration system for arbitrary existing-user planning files;
- physical Markdown files may remain in repositories as historical files;
- historical documents may be explicitly supplied as evidence/context in future work, but never auto-promoted to live state.

For a future existing repository entering ChampCity, the supported model is:

```text
existing repository
    -> inspect current source/repository
    -> establish SourceBaseline / current architecture context
    -> create fresh Intake / Assessment for new work
    -> create fresh Structured Project State
```

Do not attempt to infer an in-progress ChampCity lifecycle from arbitrary repository documents.

## Verified current implementation state

The new workflow system is already primarily extracted into dedicated files rather than being implemented inside `App.tsx`.

Important existing owners include:

- `src/renderer/app/StructuredWorkflowWorkspace.tsx`
- `src/renderer/app/GreenfieldWorkspace.tsx`
- `src/renderer/app/OptionalWorkIntakeWorkspace.tsx`
- `src/renderer/app/ApplicationBrowserHost.tsx`
- `src/renderer/app/ApplicationSettingsController.tsx`
- `src/renderer/app/ApplicationSettingsWorkspace.tsx`
- `src/renderer/app/StructuredArchitectWorkspace.tsx`
- `src/renderer/app/ExactWorkflowPlanningWorkspace.tsx`
- `src/renderer/app/WorkflowExecutionWorkspace.tsx`
- `src/renderer/app/StructuredProjectPlanningWorkspace.tsx`
- `src/renderer/app/StructuredPhaseMapWorkspace.tsx`
- `src/renderer/app/StructuredPhaseLoopWorkspace.tsx`
- `src/renderer/app/WorkItemPlanningWorkspace.tsx`

The incomplete J preparation also created separate application/browser/settings/workflow composition modules, but they are not yet wired into the active root.

Current defects/blockers include:

- `App.tsx` still owns substantial legacy Issue and Greenfield workflow machinery.
- `StructuredWorkflowWorkspace` does not yet dispatch the shared `"planning"` surface added by RWS06B-REPAIR01.
- `GreenfieldWorkspace` still calls `getCurrentWorkspaceModel()`, which enters the legacy planning-document inventory and will fail after structured authority selection.
- structured Phase Map / Phase Loop / WorkItem Planning / WorkItem Review services still contain automatic legacy Markdown import logic.
- `workReview:migrate` remains exposed through IPC/preload.
- legacy Issue paths reachable from `App.tsx` still call Markdown-authoritative services such as `applyIssueValidationDecision()`.
- the global Structured Project State authority marker is correctly not yet selected.

## Implementation plan

Implement the following four bounded slices in sequence. This is one RWS06J card, not four new approval gates.

---

## J1 — Complete the structured application/workflow composition layer

### A. Finish StructuredWorkflowWorkspace

Make `StructuredWorkflowWorkspace` the single workflow router beneath the application shell.

It must cover:

- optional Work Intake Routing;
- Project Creation / Greenfield;
- Feature / Capability;
- Issue Resolution;
- Refactor / Migration;
- Integration / Composition;
- Infrastructure / Platform;
- Research / Prototype.

Update exact-workflow dispatch to include the RWS06B shared `planning` surface:

- Feature: `feature-planning`
- Issue: `issue-planning`
- Migration / Integration / Infrastructure / Research: shared `planning`
- accepted/execution stages: shared execution workspace.

Do not duplicate route-specific Planning components.

### B. Wire prepared application owners

Wire these existing prepared owners into the active root where applicable:

- `ApplicationBrowserHost`
- `ApplicationSettingsController`
- `StructuredWorkflowWorkspace`
- `OptionalWorkIntakeWorkspace`
- `GreenfieldWorkspace`

Preserve:

- browser attachment generation and resize/bounds acknowledgement behavior;
- browser detach cleanup;
- settings polling/actions;
- Project selection/adoption;
- dashboard and Workflow Hub navigation;
- direct workflow start;
- optional WIR flow.

### C. App.tsx cleanup is destructive replacement of ownership, not coexistence

As each extracted owner becomes active:

- delete the superseded `App.tsx` state;
- delete superseded effects;
- delete superseded workflow-specific callbacks;
- delete superseded JSX branches;
- delete superseded imports and types.

Do not leave the old workflow implementation in `App.tsx` merely because the new component is wired.

Incremental editing is acceptable and preferred for execution safety, but the final result must be clean. The implementation method does not justify retaining duplicate legacy code.

### D. Retire the old Issue UI state machine

The active application must no longer use the legacy Issue foreground/stage/fix-card state machine in `App.tsx`.

Remove the active renderer path that directly drives old Issue services such as:

- Issue-specific legacy stage navigation;
- old Issue planning/fix-card/validation/close composition;
- `applyIssueValidationDecision()` from the active root.

The exact SQL Issue Workflow is now the current implementation.

Do not rewrite the old Issue path to understand SQL. Remove it from active application ownership.

---

## J2 — Add SQL-only Greenfield navigation and remove currentWorkflow Markdown dependency

### A. Do not reuse currentWorkflowService as the new authority model

Do not teach `currentWorkflowService` to emulate Structured Project State.

The Greenfield workflow needs a small SQL-only navigation projection derived from the records already introduced by RWS04–RWS06.

Create a bounded service/contract, for example a Greenfield navigation projection, that returns only what the renderer needs, such as:

- exact Project Creation Workflow ID/currentness;
- current stage/workspace destination;
- current Phase ID when applicable;
- current WorkItem ID when applicable;
- next eligible destination;
- closed/completed state;
- reason/blockers when no stage is eligible.

The exact naming/location is an implementation detail; keep it beside the current structured workflow/application service boundary rather than in a Markdown document service.

### B. Derive Greenfield navigation from SQL facts

Derive navigation deterministically from Structured Project State, including where applicable:

- current approved WorkflowIntake;
- ArchitectReviewCycle and exact Decision;
- ProjectPlanningReviewCycle and exact Decision;
- PhaseMapReviewCycle and exact Decision;
- Phase / PhaseReviewCycle state;
- WorkItem state and `planningPreparedAt`;
- WorkItem planning review;
- ImplementationRecord / TesterResult / Validation / repair relationships;
- Phase/Workflow close lifecycle.

Do not reconstruct semantic state from generated Markdown.

### C. Cut GreenfieldWorkspace off from getCurrentWorkspaceModel

`GreenfieldWorkspace` must no longer call:

- `getCurrentWorkspaceModel()`;
- `createPlanningProjectionContext()`;
- `listPlanningDocuments()`;
- other legacy planning-document inventory to determine the current stage.

Use the new SQL navigation projection.

After this, the active Greenfield renderer must remain functional when legacy canonical reads are fenced.

### D. Retire active old Greenfield root composition

Once `GreenfieldWorkspace` owns the complete structured Greenfield lifecycle, remove the duplicate stage-specific Greenfield composition/state from `App.tsx`.

Do not retain two Greenfield routers.

---

## J3 — Remove Markdown workflow migration and obsolete legacy workflow code

### A. Delete automatic Markdown-to-SQL migration logic

Remove the current automatic legacy workflow-state adoption/import behavior from:

- `src/main/phaseMap/structuredPhaseMapService.ts`
- `src/main/phasePlanning/structuredPhaseLoopService.ts`
- `src/main/workCardPlanning/structuredWorkItemPlanningService.ts`
- `src/main/workCardValidation/structuredWorkItemReviewService.ts`

Specifically remove behavior that:

- enumerates `listPlanningDocuments()`;
- evaluates old document freshness to adopt state;
- reads typed legacy Phase Map/Phase Planning/Formal Work Card metadata into current SQL authority;
- records `legacy-phase-map-import`, `legacy-phase-plan-import`, `legacy-formal-contract-import`, or equivalent migration Evidence as part of automatic workflow continuation;
- adopts review/validation state from old controlled Markdown metadata.

When current structured state is absent, require fresh structured work through the current stage. Do not search the repository for a prior lifecycle to resume.

### B. Remove migration IPC/API surface

Remove the legacy review migration command and its public surface, including:

- `workReview:migrate`;
- `migrateStructuredWorkItemReview`;
- preload/shared contract exposure that exists only for this migration path.

Do not replace it with another migration API.

### C. Preserve historical documents only as inert files/evidence

Do not delete user repository Markdown as part of this card.

Old files may remain physically present.

They are not:

- lifecycle authority;
- current disposition authority;
- WorkItem/Phase/Workflow state;
- an automatic source for reconstruction.

If a future workflow explicitly supplies a historical document as evidence, it may be referenced as Evidence through the normal structured mechanism. There is no automatic scan/import.

### D. Delete obsolete legacy workflow code after reachability proof

Perform a post-wiring reachability analysis from active renderer/main-process entry points.

For code belonging to migrated workflow families:

- if it has no current legitimate consumer, delete it;
- remove dead IPC handlers, preload methods, types, imports, and tests that prove only retired behavior;
- do not keep obsolete modules merely for archaeology.

This includes old Issue/Greenfield planning/validation/close services and renderer components that become unreachable after the new structured composition is wired.

Do not delete genuinely unrelated non-workflow functionality.

### E. Legacy authority audit classification

Re-run the canonical writer/read/freshness inventory after deletion.

Classify remaining callsites as:

1. non-workflow historical/export concern;
2. genuinely unrelated/unmigrated application concern;
3. active migrated-workflow dependency — defect, must be removed before cutover.

The objective is not "zero occurrences in the repository." The objective is zero active migrated-workflow authority dependencies and no dead migrated workflow rubble intentionally retained.

---

## J4 — Select structured authority and qualify the actual post-cutover application

### A. Structured authority selection

After J1–J3 leave no active migrated workflow dependent on canonical Markdown authority, advance the Project State provider generation to `authority: "structured"` through the existing Project State store/provider-generation mechanism.

Do not directly mutate SQLite tables ad hoc.

Use the existing generation/currentness semantics around `advanceProviderGeneration(...)` or a narrowly exposed application command built on that mechanism.

Do not weaken `legacyCanonicalWriteFence`.

### B. Prove the fence is active

With structured authority selected:

- legacy canonical writes must fail closed if accidentally invoked;
- legacy canonical reads used to reconstruct workflow state must fail closed;
- the current application must continue to open and navigate structured workflows without touching those paths.

This is required runtime proof of the cutover.

### C. Bundle qualification

Build an exact changed-file manifest from accepted RWS05F through final RWS06J, including accepted RWS05/RWS06 repairs.

Run the appropriate validation planner/affected lanes plus focused proof for:

- application shell routing and extracted ownership;
- browser host attach/resize/detach;
- settings ownership;
- direct workflow start;
- optional WIR routing;
- all six existing-project substantive Workflow lifecycles;
- complete Greenfield lifecycle;
- exact Planning reopen behavior;
- deterministic topology;
- WorkItem planning;
- execution;
- validation/repair;
- integration/close;
- Research no-Plan;
- Research implementation Plan;
- generated Markdown edit/delete isolation;
- exact SQL review-currentness;
- structured authority selected with legacy read/write fence active;
- no active migrated workflow calling canonical planning-document APIs;
- `git diff --check`.

Do not use full-suite failure counts as a substitute for attributable source review. Report unrelated existing failures separately.

## Required final architecture

The target renderer ownership is:

```text
App.tsx
|
|-- application route/navigation
|-- selected Project / Workflow
|-- global chrome
|-- settings -> ApplicationSettingsController
|-- browser -> ApplicationBrowserHost
`-- workflow -> StructuredWorkflowWorkspace
                |
                |-- OptionalWorkIntakeWorkspace
                |-- GreenfieldWorkspace
                `-- exact existing-project workflows
                    |-- Intake
                    |-- Architect
                    |-- Planning
                    `-- Execution / Validation / Repair / Close
```

`App.tsx` should not know how an Issue RCA, Phase Interview, Plan review, WorkItem validation, or workflow close actually works.

Do not chase an arbitrary line-count target, but significant reduction is expected because duplicated workflow ownership must be deleted.

## Existing repository / future-user product rule

Document this product behavior in the applicable architecture/source comment/tests where useful:

- ChampCity can adopt an existing repository as source.
- ChampCity does not attempt to import arbitrary planning documents into live workflow state.
- New work starts through a fresh structured Intake/Assessment.
- Historical documents are optional evidence only.
- No lifecycle stage is inferred from arbitrary repository prose or files.

Do not build heuristics for arbitrary third-party planning formats.

## Preserve

Preserve:

- Structured Project State domain contracts accepted through RWS06I;
- RWS06A deterministic topology;
- RWS06B exact Planning persistence repair;
- RWS06I Close/Advance repair;
- RWS05 shared Architect workspace behavior;
- direct workflow start;
- optional WIR;
- SourceBaseline behavior;
- Git/source checkpoint semantics;
- browser host behavior;
- settings behavior;
- Project/repository binding;
- generated Markdown as readability/export projection only.

## Forbidden changes

- No workflow-specific state machine additions to `App.tsx`.
- No new canonical Markdown authority.
- No Markdown-to-SQL lifecycle migration system.
- No arbitrary historical-document inference.
- No weakening legacy read/write fences.
- No parallel old/new workflow routers left intentionally active.
- No schema redesign unless an unavoidable missing field is proven and reported before expansion.
- No wholesale "keep everything just in case" legacy strategy.
- No deletion of user historical Markdown files from managed repositories.

## Expected production areas

Likely active areas include:

- `src/renderer/app/App.tsx`
- `src/renderer/app/StructuredWorkflowWorkspace.tsx`
- `src/renderer/app/GreenfieldWorkspace.tsx`
- `src/renderer/app/OptionalWorkIntakeWorkspace.tsx`
- `src/renderer/app/ApplicationBrowserHost.tsx`
- `src/renderer/app/ApplicationSettingsController.tsx`
- `src/renderer/app/ApplicationSettingsWorkspace.tsx`
- a new or existing structured Greenfield navigation service/contract;
- `src/main/workflow/workflowApplicationIpc.ts`;
- `src/preload/index.ts`;
- `src/shared/workspaceContracts.ts`;
- the four structured services containing legacy migration logic;
- obsolete legacy workflow modules proven unreachable;
- focused tests/capability-map entries actually owned by the changed behavior.

Do not sweep unrelated dirty files into the checkpoint.

## Acceptance criteria

RWS06J passes when:

1. `App.tsx` is an application shell and contains no migrated workflow-specific state machine or stage composition.
2. `StructuredWorkflowWorkspace` is the single active substantive workflow router and supports the shared `planning` stage.
3. Greenfield navigation is derived solely from Structured Project State and does not call `getCurrentWorkspaceModel()` or planning-document inventory.
4. The old active Issue renderer/service path is retired.
5. automatic Markdown-to-SQL workflow-state migration logic is removed.
6. `workReview:migrate` and equivalent migration-only public APIs are removed.
7. obsolete migrated workflow modules with no current consumer are deleted rather than left as dead parallel implementations.
8. existing historical Markdown files are untouched but cannot affect current workflow state.
9. existing repository onboarding starts fresh structured work from repository/source state rather than inferred planning-document state.
10. provider generation is advanced to `authority: "structured"` through the Project State mechanism.
11. legacy canonical reads/writes fail closed after cutover, while every current workflow remains functional.
12. all seven substantive Workflow types complete their applicable current lifecycle without canonical Markdown authority and without forcing WIR.
13. focused/affected qualification and `git diff --check` produce truthful receipts.
14. the final report identifies any remaining unrelated legacy/non-workflow Markdown callsites and why they are not active workflow authority.

## Implementer Report

Rewrite/finalize:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06J_BUNDLE_QUALIFICATION_REPORT.md`

The final report must replace the current incomplete/blocker language and include:

- exact final checkpoint;
- RWS06A–J plus repair checkpoint table;
- exact changed-file manifest;
- `App.tsx` ownership removed;
- structured workflow routing matrix;
- Greenfield SQL navigation proof;
- deleted legacy migration surface;
- deleted obsolete workflow modules;
- remaining non-workflow/historical Markdown inventory classification;
- structured provider-generation receipt;
- fence-active runtime proof;
- seven-workflow end-to-end matrix;
- tests reused/modified/retired/added with coverage-gap justification;
- validation commands/results;
- unrelated failures;
- deviations, if any.

## Checkpoint

Commit:

`RWS06J complete structured-state cutover and qualify bundle`

Use bounded/path-aware staging so unrelated dirty work is not captured.

Return the checkpoint and final Implementer Report for source-code review.

This card creates no additional approval or execution gate.
