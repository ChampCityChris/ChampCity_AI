# Architect Audit — Workflow Topology, Multiplicity, Execution Kernel, and SCL Drift

**Date:** 2026-09-23  
**Repository:** ChampCity_AI  
**Reviewed baseline:** `dev` at `64a0465371ff7c3b3e87bd38ff5436418bde050f`  
**Disposition:** Architecture repair required before further product expansion.

## 1. Executive finding

The SCL implementation contains valuable Structured Project State and source-control mechanics, but the runtime topology is not the intended ChampCity product model.

The primary architectural drift is that Work Intake Routing became the parent lifecycle for most new work instead of remaining an optional routing Workflow that hands off to an independent substantive Workflow instance.

A second drift preserved old Markdown workflow runtime beside the new Structured Project State model as a long-lived compatibility/provider mode. The Operator has corrected that requirement: old in-progress workflows are abandoned rather than migrated, and the product must converge to one current Structured Project State runtime.

A third drift duplicated post-plan workspaces/services across Development, Issue, and WIR-routed execution instead of consolidating them into one reusable execution kernel.

## 2. Correct target model

The corrected governing model is documented in:

`docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`

Key points:

- Project owns many independent Workflow instances.
- Repeatable workflow types support multiple concurrent instances.
- WIR is optional and routing-only.
- Direct workflow entry is first-class.
- Workflow-specific behavior is concentrated in intake/assessment/planning.
- Post-plan Work Item/Phase execution is shared.
- SourceLine ownership belongs to the substantive Workflow instance.
- Structured Project State is the only current workflow authority.
- Legacy workflow instances are abandoned, not migrated.

## 3. Critical finding A — WIR owns the lifecycle after routing

### Evidence

`WorkIntakeNavigationService` defines:

`intake → routing → assessment → plan → execution → integration`

and drives non-Issue routes through `workPlanningKernel` and `routedWorkflowService`.

The renderer keeps those stages under one `work-intake` shell.

`ProjectStateService.createWorkIntake()` automatically creates one `Workflow` with:

- `workflowType: "work-intake"`;
- `workspace: "work-intake"`;
- `governingEntityId: intake.id`.

`recordRouteDecision()` records the route and marks the intake `routed`, but it does not instantiate a Feature, Migration, Infrastructure, Integration, Research, Greenfield, or Issue Workflow.

### Impact

The selected route is treated as configuration of one WIR-owned pipeline rather than creation of a new independent Workflow instance.

This prevents the intended Workflow multiplicity model from existing.

### Severity

Critical.

## 4. Critical finding B — substantive workflow types are not first-class runtime instances

### Evidence

`src/shared/workflowHubContracts.ts` exposes only:

- `development`;
- `issue-resolution`.

The Workflow Hub presents:

- Start Work;
- Source Control;
- a disclosure labeled `Continue legacy Development or Issue work`.

There is no first-class direct Feature, Refactor/Migration, Integration/Composition, Infrastructure/Platform, or Research/Prototype instance inventory.

### Impact

The product cannot naturally represent:

- two simultaneous Feature workflows;
- three open Issues plus a Migration;
- multiple independent Research workflows;
- direct known-type work without WIR.

### Severity

Critical.

## 5. Critical finding C — source lifecycle ownership is hard-coded to Work Intake

### Evidence

`sourceLifecycleContracts.ts` defines:

`WorkSourceOwner { kind: "work-intake"; workIntakeId }`

and all readiness/checkpoint/integration graph contracts use `workIntakeId`.

Project State entities also encode:

- `SourceBinding.workIntakeId`;
- `SourceCheckpoint.workIntakeId`;
- `IntegrationRecord.workIntakeId`.

`SourceControlService.createWorkSource()` rejects any owner that is not `work-intake` and derives the branch from Work Intake identity.

Structured checkpoint, integration, and Source Graph services all resolve source state through Work Intake identity.

### Impact

Git topology is attached to WIR instead of the independent Workflow instance performing the work.

That defeats the desired concurrency model where many Feature/Issue/Migration workflow instances own independent SourceLines simultaneously.

### Severity

Critical.

## 6. Critical finding D — Structured Project State adapters are not production workflow runtime

### Evidence

SCL01W created `createProjectWorkflowStateFacade()`.

SCL01X created `createEngineeringWorkflowStateFacade()`.

Repository search finds no production callers of either façade.

Their Implementer Reports explicitly say V1 UI/IPC remains on the legacy path.

SCL01Z qualification says V1 renderer/IPC projection adaptation remains later work.

### Impact

SCL built a tested parallel semantic implementation but did not move normal Project/Development/Issue runtime onto it.

The old Markdown runtime remains the actual product path.

### Severity

Critical.

## 7. Critical finding E — a structured Work Intake cannot continue through WIR

### Evidence

`App.openWorkIntake()` detects `projection.authority === "structured"`, clears navigation, and leaves the UI at Intake.

After Save, the renderer intentionally does not advance to Routing when authority is structured.

Meanwhile:

- `getWorkIntakeNavigation()`;
- `workRoutingAssessmentService`;
- `workRouteDecisionService`;
- `workPlanningKernel`

still depend on legacy Markdown Work Intake readers, which reject access after structured authority selection.

### Impact

The production structured WIR path stops after Intake capture.

SCL10 qualified source-control behavior through synthetic services, not the real end-to-end user workflow.

### Severity

Critical.

## 8. Critical finding F — New Project creation was coupled to WIR

### Evidence

Landing copy says Start New Project begins through Project Intake.

Actual `startNewProjectFromLanding()` routes the selected directory to `work-intake`.

`captureGreenfieldWorkIntake()` then:

1. creates the Project record;
2. creates the repository resource;
3. selects structured authority;
4. immediately captures the first Work Intake.

The existing Project Intake → Architect Interview → Project Planning lifecycle is bypassed.

### Impact

Project creation and starting a body of work became the same operation despite the earlier architecture explicitly distinguishing them.

### Severity

Critical.

## 9. Critical finding G — legacy compatibility was implemented as product architecture

### Evidence

SQLite schema stores `project_state_authority.authority IN ('legacy','structured')`.

SCL01T–SCL01Y implement:

- legacy Markdown authority inventory;
- staged legacy importer;
- semantic equivalence;
- provider-generation cutover;
- rollback to legacy when permitted.

SCL10 explicitly retains legacy Work Intake behavior for projects left on legacy authority.

Workflow Hub exposes legacy Development/Issue entry points.

### Operator correction

There is no legacy workflow migration requirement.

Old in-progress workflows are abandoned. Current work must be restarted as current Workflow instances.

### Impact

The implementation spends code, tests, UI, and conceptual complexity preserving two workflow systems that should not coexist in the final product.

### Severity

Critical.

## 10. High finding H — post-plan renderer duplication

Three overlapping execution families exist.

### Development / Work Card family

- `WorkCardMapWorkspace`
- `WorkCardBuildingReviewWorkspace`
- `WorkCardReportReviewWorkspace`
- `WorkCardRepairWorkspace`
- `WorkCardCloseWorkspace`
- Phase validation/close rendering in App

### Issue / Fix Card family

`IssueFixCardMapWorkspace.tsx` is approximately 1,020 lines and exports distinct:

- Fix Card Map;
- Planning;
- Implement;
- Review & Validation;
- Close;
- Repair workspaces.

It reuses some Development presentation primitives but retains a bespoke lifecycle wrapper.

### WIR / Routed family

- `RoutedExecutionWorkspace`
- `RoutedWorkItemMapWorkspace`
- `RoutedWorkItemPlanningWorkspace`
- `RoutedImplementWorkspace`
- `RoutedReviewValidationWorkspace`
- `RoutedRepairWorkspace`
- `RoutedCloseWorkspace`
- `RoutedAcceptanceWorkspace`
- `RoutedIntegrationWorkspace`

Several Routed components already wrap Development presentation primitives:

- Codex execution actions/console;
- OperatorValidationPresentation;
- WorkCardRepairPresentation;
- WorkCardClosePresentation.

This proves the underlying tasks are already similar enough to share presentation, but the lifecycle wrappers remain duplicated.

### Impact

Every execution improvement risks three implementations drifting.

### Severity

High.

## 11. High finding I — backend execution is partially shared but still duplicated around the kernel

### Salvageable shared kernel

`planExecution/planExecutor.ts` already owns generic:

- Work Item stage projection;
- dependency eligibility;
- Phase eligibility;
- Plan/Phase/Work Item completion projection.

Development and Issue both adapt into it.

### Duplicate surrounding stacks

Development uses:

- `developmentExecutionAdapter`;
- `workCardLoopStateService`;
- phase close services;
- Markdown Work Card lifecycle services.

Issue uses:

- `issueExecutionAdapter`;
- Issue service lifecycle state;
- Fix Card-specific planning/validation/close logic.

WIR uses:

- `routedDevelopmentExecutionBinding`;
- `routedDevelopmentExecutionService`;
- `routedWorkflowService`;
- `routedExecutionAcceptance`.

### Impact

The generic executor exists, but evidence ownership, commands, acceptance, and UI orchestration fork by workflow.

### Severity

High.

## 12. High finding J — Issue has the right instance model but wrong post-plan ownership

Issue Resolution already supports selecting and tracking multiple Issue instances inside one Project.

That multiplicity pattern is the correct model for all repeatable Workflow types.

However its post-planning Fix Card implementation remains a bespoke execution family.

### Required correction

Retain:

- Issue instance inventory;
- Issue Intake;
- evidence/reproduction;
- RCA;
- Issue-specific correction planning.

After correction planning normalizes to Work Items/Phases/Criteria, use the shared execution kernel.

## 13. Salvageable assets

The audit does not recommend wholesale rewrite.

### Preserve / promote

- SQLite ProjectStateStore and recovery;
- ProjectStateService history/revision/Decision/Evidence/Validation semantics;
- Workflow-specific planning profiles:
  - Greenfield;
  - Feature;
  - Refactor/Migration;
  - Integration/Composition;
  - Infrastructure/Platform;
  - Research/Prototype;
  - Issue Resolution;
- `planExecutor`;
- Codex runtime and Implementer execution service;
- Integration candidate engine;
- Integration Repair mechanics;
- RepositoryService / provider-neutral source-control primitives;
- Source Graph rendering mechanics after ownership is generalized;
- DocumentChatWorkspaceShell;
- CodexExecutionActions / CodexExecutionConsole;
- OperatorValidationPresentation;
- WorkCardRepairPresentation;
- WorkCardClosePresentation;
- existing Issue multi-instance interaction concepts.

### Adapt

- `engineeringWorkflowStateFacade`: promote from unused test seam into the common execution service, removing the legacy comment/assumption.
- `projectWorkflowStateFacade`: retain useful Project/semantic operations but make Workflow types explicit.
- work-planning profiles/kernel: bind to target Workflow instances instead of WIR.
- Source Graph: display Workflow bindings instead of Work Intake bindings.

### Retire after replacement

- WIR-owned planning/execution/integration orchestration;
- Routed execution Workspace family;
- duplicate Issue post-plan Fix Card workspace family;
- legacy Development post-plan wrappers superseded by shared kernel;
- legacy Markdown current-workflow authority services;
- legacy/structured provider selection;
- legacy inventory/import/equivalence/cutover workflow migration stack;
- Workflow Hub legacy direct-entry disclosure.

## 14. Test-suite implications

Do not preserve tests solely because they prove retired architecture.

The repair must:

- keep tests for reusable mechanics;
- rewrite tests around Workflow-instance contracts;
- delete tests whose only obligation is legacy provider coexistence/migration;
- consolidate duplicate renderer tests around shared execution Workspace contracts;
- add multi-instance Project tests proving simultaneous Workflow state;
- add source-graph tests keyed to Workflow identity;
- avoid replacing retired compatibility code with a new permanent compatibility harness.

## 15. Required qualification scenario

A final qualification fixture must demonstrate one Project with, simultaneously:

- at least three Issue workflows;
- at least two Feature workflows;
- one Refactor/Migration workflow;
- one Research workflow;
- one WIR workflow that routes into another substantive workflow.

The test must prove:

- all instances remain independently queryable;
- each substantive Workflow can own an independent SourceLine;
- no Workflow must complete before another can be created/planned;
- WIR closes after handoff;
- direct start and WIR handoff converge on the same target Workflow model;
- at least two workflow types execute through the same Work Item/Phase kernel;
- Source Control graph shows all Workflow-owned lines;
- one writable checkout limitation does not block creation/planning of other instances;
- no legacy workflow appears as current product state;
- New Project entry goes to Project/Greenfield Intake rather than WIR.

## 16. Architect conclusion

SCL is not a total loss. It produced several important infrastructure pieces.

The repair is primarily an ownership/topology correction:

```text
WIR-owned pipeline
        ↓
independent Workflow instances

WorkIntake-owned source
        ↓
Workflow-owned source

three post-plan execution families
        ↓
one shared execution kernel

legacy + structured engines
        ↓
one Structured Project State runtime

singleton workflow entries
        ↓
multi-instance workflow collections
```

The repair-card plan should establish these foundations before doing further UI polish or new feature development.
