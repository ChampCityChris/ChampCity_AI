# Workflow Topology Recovery — Repair Work Card Plan

**Package ID:** WTR  
**Status:** PROPOSED — Operator review required before repair cards are authored  
**Target repair Implementer:** GPT 6.0 Luna Medium  
**Source audit:** `ARCHITECT_AUDIT_2026-09-23.md`  
**Governing proposed architecture:** `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`

## 1. Package objective

Correct the SCL/WIR topology drift without discarding the useful Structured Project State, source-control, planning-profile, execution-runtime, and integration work already implemented.

The completed package must produce:

- independent, multi-instance Workflow types;
- optional routing-only WIR;
- direct workflow entry;
- workflow-owned SourceLines;
- bespoke workflow intake/assessment/planning;
- one shared post-plan execution kernel;
- one current Structured Project State runtime;
- no legacy workflow migration/coexistence product mode;
- no duplicate post-plan Workspace families.

## 2. Execution strategy

This repair package is intended for Phase 2 card-standard calibration with GPT 6.0 Luna Medium.

Accordingly:

- cards must be bounded and explicit;
- architectural diagnosis belongs in the cards, not in Luna's inference burden;
- each card gets exact ownership boundaries, retained components, deletion targets, and acceptance criteria;
- avoid broad “refactor as appropriate” instructions;
- one report + checkpoint commit per card;
- cards execute sequentially unless a true architecture blocker is found;
- no full-suite default; use exact affected/work-item profiles and card-owned focused tests;
- do not preserve old behavior merely to keep obsolete tests green.

Temporary coexistence between old/new code during the sequence is allowed only as implementation staging. Final package acceptance forbids permanent dual runtime.

## 3. Proposed card sequence

### Foundation

### WTR01 — Correct Workflow domain contracts and type registry

Purpose:

Establish Workflow Definition versus Workflow Instance as explicit first-class concepts.

Required outcome:

- typed Workflow types for:
  - Greenfield / Project Creation;
  - Feature / Capability;
  - Refactor / Migration;
  - Integration / Composition;
  - Infrastructure / Platform;
  - Research / Prototype;
  - Issue Resolution;
  - Work Intake Routing;
- repeatability metadata: all except Project Creation support N instances;
- Workflow instance has Project, type, title, lifecycle/current Workspace, governing semantic identity;
- add WIR-to-target Workflow provenance relationship;
- remove the invariant that a Work Intake necessarily owns the substantive Workflow;
- preserve WorkIntake as WIR-specific semantic state;
- multiplicity tests prove two same-type Workflow instances coexist.

Do not change UI yet.

### WTR02 — Generalize source lifecycle ownership from Work Intake to Workflow

Purpose:

Make Git topology represent independent Workflow instances.

Required outcome:

- replace `WorkSourceOwner.kind = work-intake` with Workflow-owned source identity;
- SourceBinding belongs to Workflow;
- SourceCheckpoint and IntegrationRecord identify Workflow;
- RepositoryService branch naming accepts workflow type/identity;
- checkpoints and integration resolve through Workflow SourceBinding;
- Source Graph contracts expose Workflow bindings, not Work Intake bindings;
- no dependency on WIR identity for ordinary source operations.

Keep Work Intake IDs only as optional provenance where a Workflow originated from WIR.

### WTR03 — Establish fresh Structured Project bootstrap; define legacy abandonment

Purpose:

Remove migration as a prerequisite to using the current runtime.

Required outcome:

- opening an existing repository without current Project State creates/registers a fresh Project + repository resource without importing legacy workflow state;
- new Structured Project State is current authority by construction;
- old workflow Markdown remains ordinary historical repository evidence only;
- no legacy workflow instance is created from repository scans;
- old in-progress work can only continue by starting a new current Workflow;
- define safe handling of pre-repair `.champcity/project-state.sqlite` state for this pre-release product without semantic workflow migration.

Do not delete old runtime code yet; later cards still need a compiling transition.

### WTR04 — Implement Workflow Instance application service and inventory

Purpose:

Create the production service boundary for independent Workflow instances.

Required outcome:

- create direct Workflow instance;
- list instances by Project/type/state;
- open one exact Workflow;
- update current Workspace/state;
- close/cancel Workflow;
- preserve multiple active same-type instances;
- stable display identity independent of Git branch;
- production IPC/service contract no longer assumes one active Development pipeline.

### Routing and planning ownership

### WTR05 — Decouple planning kernel from WIR and bind planning to Workflow instances

Purpose:

Preserve the strong route/profile planning content while moving ownership to the substantive Workflow.

Required outcome:

- workflow-specific profiles remain data-driven;
- planning context is `projectId + workflowId + workflowType`, not `intakeId + routeDecisionId`;
- target Workflow's own intake/evidence feeds assessment/planning;
- planning emits canonical BoundedSolution/WorkItem/Phase/Criterion/dependency state;
- Issue keeps RCA-specific pre-plan semantics;
- Research may close without an execution graph;
- no route owns a private execution engine.

### WTR06 — Reduce WIR to routing-only handoff

Purpose:

End WIR at target Workflow creation.

Required outcome:

- WIR stages become Intake → Route Assessment → Operator Route Decision → Handoff/Closed;
- route acceptance creates one independent target Workflow instance;
- WIR evidence is linked/seeds target Workflow context;
- WIR records durable `routes_to` provenance;
- WIR closes after successful handoff;
- WIR does not create/own SourceBinding;
- remove WIR assessment/plan/execution/integration stages;
- direct target Workflow creation and WIR-created target Workflow use the same creation service.

### WTR07 — Restore Project Creation / Greenfield entry independently of WIR

Purpose:

Repair the Landing/New Project lifecycle.

Required outcome:

- Start New Project opens Project Intake / Greenfield workflow;
- remove `captureGreenfieldWorkIntake()` as Project-creation authority;
- Project Intake, Architect product understanding, and Greenfield planning are current Structured Project State operations;
- establish initial `main → dev` topology at the appropriate Greenfield boundary;
- initial implementation uses the shared execution kernel later in the package;
- WIR is not involved unless the Operator explicitly starts WIR after Project creation.

### Shared execution service kernel

### WTR08 — Promote canonical Structured Project execution kernel

Purpose:

Turn existing ProjectStateService/engineering façade/planExecutor assets into the production execution service.

Required outcome:

- one WorkflowExecutionService keyed by `projectId + workflowId`;
- resolve canonical execution graph from WorkItems/Phases/Criteria/relationships;
- Work Item eligibility/progression;
- Phase eligibility/progression;
- implementation attempt recording;
- Validation/Evidence/Decision integration;
- Repair relationships;
- deterministic completion;
- source checkpoint hooks by Workflow SourceBinding;
- no Markdown state scan;
- no Work Intake identity requirement;
- preserve useful pure logic from `planExecutor`.

### Shared execution Workspaces

### WTR09 — Consolidate Work Item Map and Work Card Planning Workspaces

Purpose:

Create one map/planning Workspace family for all implementation-bearing workflows.

Required outcome:

- one WorkItemMapWorkspace consuming normalized execution projection;
- one WorkItemPlanningWorkspace consuming `workflowId + workItemId`;
- reuse decomposition and Architect browser primitives;
- adapters may provide workflow labels/context but not fork lifecycle logic;
- replace Development, Issue Fix Card Map/planning, and Routed map/planning wrappers where their task is equivalent.

### WTR10 — Consolidate Implement Workspace and runtime controls

Purpose:

Use one implementation Workspace/runtime presentation.

Required outcome:

- one ImplementWorkspace;
- reuse CodexExecutionActions/Console and environment presentation;
- runtime owner references Workflow/WorkItem identity;
- Development, Issue, Feature, Migration, etc. all invoke same execution service;
- no RoutedImplement or IssueFixCardImplement lifecycle wrapper remains.

### WTR11 — Consolidate Review & Validation Workspace

Purpose:

Use one post-implementation review/validation station.

Required outcome:

- one ReviewValidationWorkspace;
- canonical Evidence/Validation semantics;
- reusable Architect advisory review where policy requires it;
- no workflow-specific validation lifecycle owner;
- Issue, Development and Routed review wrappers retired after replacement.

### WTR12 — Consolidate Repair and Close / Next Workspaces

Purpose:

Unify correction and Work Item completion.

Required outcome:

- one RepairWorkspace over a Repair WorkItem relationship;
- one CloseNextWorkspace;
- reuse WorkCardRepairPresentation and WorkCardClosePresentation where appropriate;
- return target derives from Workflow execution projection;
- no Routed/Issue/Development-specific close loop.

### WTR13 — Consolidate Phase validation/close and Integration Workspaces

Purpose:

Finish the shared post-plan kernel.

Required outcome:

- one PhaseValidation/Close experience over canonical Phase Criteria;
- direct Plans skip Phase UI;
- one Integration workspace over Workflow SourceBinding/IntegrationRecord;
- Integration Repair remains application-owned and reusable;
- remove routed-specific acceptance path and manual repository evidence-path entry;
- evidence selection uses canonical Evidence identities.

## 4. Independent workflow front halves

These cards intentionally occur after the shared execution contracts are stable so they do not create another family of bespoke execution Workspaces.

### WTR14 — Feature / Capability Workflow

- independent direct start;
- multiple Feature instances;
- Feature-specific intake;
- preserve existing feature planning profile;
- compile into shared execution state;
- Workflow owns SourceLine;
- WIR Feature handoff lands in the same Feature intake/planning lifecycle.

### WTR15 — Refactor / Migration Workflow

- independent direct start;
- multiple Migration instances;
- current/target/transformation/cutover/retirement intake and planning;
- preserve existing migration profile;
- shared execution kernel after planning;
- no permanent compatibility layer unless the specific Migration Plan explicitly requires a temporary product compatibility mechanism.

### WTR16 — Integration / Composition Workflow

- independent direct start;
- multiple Integration instances;
- characterize-first/build-vs-integrate intake and planning;
- preserve existing integration profile;
- shared execution after planning.

### WTR17 — Infrastructure / Platform Workflow

- independent direct start;
- multiple Infrastructure instances;
- operational topology/provision/rollback/health intake and planning;
- preserve existing infrastructure profile;
- shared execution after planning.

### WTR18 — Research / Prototype Workflow

- independent direct start;
- multiple Research instances;
- bounded question/hypothesis/evidence/decision intake;
- preserve existing research profile;
- close on accepted evidence when no implementation is needed;
- when Work Items are needed, enter the shared execution kernel;
- production follow-up creates a separate appropriate Workflow, not a nested continuation.

### WTR19 — Issue Resolution Workflow on current state + shared kernel

Purpose:

Keep the strongest part of the existing Issue model—many independent Issue instances—while removing its duplicate execution implementation.

Required outcome:

- Issue inventory is backed by current Workflow instances;
- keep Issue-specific Intake, evidence/reproduction, Architect/RCA, and correction planning;
- correction plan normalizes to shared WorkItems/Phases/Criteria;
- Fix Cards become ordinary shared Work Items with Issue semantics/context;
- remove bespoke Issue Implement/Review/Repair/Close execution ownership;
- multiple Issues remain concurrently open.

### WTR20 — Complete Greenfield execution through shared kernel

Purpose:

Finish Project Creation without a private implementation loop.

Required outcome:

- approved Greenfield planning emits normal execution state;
- shared Work Item/Phase kernel handles build/review/repair/close;
- Project Creation completes into Workflow Hub;
- no separate Greenfield execution workspace family.

## 5. Product navigation and visibility

### WTR21 — Rebuild Workflow Hub as multi-instance dashboard

Purpose:

Expose the corrected topology.

Required outcome:

- one section/card group per Workflow type;
- `+ Start <type>` direct creation;
- show multiple active/recent instances per type;
- open exact instance;
- WIR entry labeled as routing/help rather than mandatory Start Work;
- Source Control entry remains first-class;
- remove `Continue legacy Development or Issue work`;
- no singleton `activeWorkflowId` model for repeatable workflows.

### WTR22 — Update Source Control graph for Workflow multiplicity

Purpose:

Make Git visibly reflect the product model.

Required outcome:

- graph lines labeled by Workflow type/title/status;
- multiple same-type Workflow SourceLines shown simultaneously;
- WIR provenance may be visible in detail but WIR is not source owner;
- integration target chronology remains clear;
- one checkout limitation is diagnostics, not workflow eligibility.

## 6. Retirement

### WTR23 — Retire duplicate routed/legacy execution code

Delete/retire only after replacement paths are live and tested.

Expected targets include, subject to exact final dependency audit:

- `RoutedExecutionWorkspace`;
- Routed Work Item map/planning/implement/review/repair/close/acceptance wrappers;
- `routedDevelopmentApplicationService`;
- `routedDevelopmentExecutionService`;
- `routedDevelopmentExecutionBinding`;
- WIR-owned routed integration orchestration no longer needed after generic Integration service ownership;
- duplicate Issue post-plan Fix Card workspace implementations;
- superseded Development post-plan lifecycle wrappers.

Retain reusable presentation components and low-level services that now serve the shared kernel.

### WTR24 — Remove legacy workflow migration/provider compatibility stack

Expected retirement:

- legacy authority inventory;
- staged legacy workflow importer;
- legacy equivalence verifier;
- structured-provider cutover/rollback;
- `legacy | structured` workflow authority selection;
- legacy canonical read/write fence used solely for dual-engine coexistence;
- legacy Workflow Hub entries;
- tests/capability records whose only purpose is preserving the retired compatibility architecture.

Repository Markdown remains ordinary documentation/historical evidence where applicable.

## 7. Qualification

### WTR25 — Qualify multi-instance workflows and shared execution kernel

Required end-to-end proof:

One Project simultaneously contains at least:

- Issue A;
- Issue B;
- Issue C;
- Feature A;
- Feature B;
- Migration A;
- Research A;
- WIR A routing to an additional substantive Workflow.

Prove:

1. all are independent Workflow identities;
2. all remain queryable concurrently;
3. each substantive Workflow has an independent SourceLine;
4. no existing Workflow must close before another is created/planned;
5. direct Feature start and WIR→Feature handoff converge on the same Feature workflow contract;
6. Issue and Feature execute through the same post-plan kernel;
7. Repair and validation use the same shared Workspace contracts across at least two workflow types;
8. Source Graph shows simultaneous lines correctly;
9. switching Workflow UI context does not mutate another Workflow;
10. the transitional single-checkout limitation does not block Workflow creation/planning;
11. New Project enters Project/Greenfield Intake, not WIR;
12. no legacy workflow/provider mode is exposed;
13. repository old workflow artifacts do not become current Project State;
14. duplicate retired execution components have no production callers;
15. targeted visual inspection covers Workflow Hub, two same-type instances, shared execution, and Source Control graph.

## 8. Proposed deletion principle

Do not keep a wrapper merely because it once had a distinct workflow name.

After WTR25, any remaining workflow-specific post-plan component/service must have a documented material task difference.

If it cannot state that difference, it is code duplication and should be removed.

## 9. Plan review questions

Operator review should focus on:

1. whether the Workflow type set is correct;
2. whether WIR should own no SourceLine by default;
3. whether fresh existing-Project registration without old workflow import is the desired bootstrap;
4. whether Greenfield / Project Creation should be repeatable or one-time;
5. whether the proposed 25-card granularity is appropriate for Luna Medium calibration;
6. whether SourceLine creation should occur at Workflow creation or be delayed until planning determines implementation is required (Research is the main edge case).

No repair cards should be authored until these architecture/sequence questions are accepted or corrected.
