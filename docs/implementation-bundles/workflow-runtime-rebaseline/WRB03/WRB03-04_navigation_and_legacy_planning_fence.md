# WRB03-04 — Converge Exact-Instance Navigation and Fence Current Project Legacy Route-Owned Planning

**Depends on:** WRB03-03 checkpoint  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Make the WRB03 planning front halves the only Current Project Feature/Issue planning paths.

Exact Workflow instance navigation must dispatch to the correct task-oriented workspace based on the selected Workflow record and its currentWorkspace. The old WorkIntake/route-owned planning surfaces must be unreachable from Current Project Feature/Issue navigation.

This card does not delete a still-reachable historical module merely for cleanup and does not begin WRB04 execution.

## 1. Exact Workflow workspace dispatch

Replace the generic WorkflowInstanceWorkspace body for supported WRB03 types with exact-instance task surfaces.

Required dispatch:

feature-capability:
- feature-intake;
- feature-assessment;
- feature-planning;
- work-item-map.

issue-resolution:
- issue-intake;
- issue-rca;
- issue-planning;
- work-item-map.

The exact workflowId remains selected throughout every step.

Do not convert navigation identity back to:
- workflow type;
- Issue display alias;
- WorkIntake ID;
- route Decision ID;
- Markdown path.

Unsupported substantive Workflow types remain on the bounded generic exact-instance shell.

Project Creation remains on its existing one-time path and is not normalized by WRB03.

## 2. Main/preload/API convergence

Expose only the bounded Current Project APIs required by the new Feature/Issue front halves.

Every planning mutation/read endpoint must take or resolve exact Workflow ID and validate that it belongs to the selected Current Project.

Reject:
- foreign Project Workflow IDs;
- WIR as Feature/Issue planning owner;
- type/workspace mismatch;
- stale canonical plan acceptance.

Remove/fence Current Project callers that still enter route-owned workPlanningKernel or old Issue ownership bridges for Feature/Issue.

Do not add compatibility endpoints that translate exact Workflow ID back into a synthetic WorkIntake/route Decision identity.

## 3. Work Item Map boundary view

Use the WRB03-01 Workflow-scoped projection.

The read-only map must make the accepted structure understandable:
- direct versus phased topology;
- Bounded Solution;
- ordered Phases;
- WorkItems and dependencies;
- Criteria and validation policy;
- Issue RCA context where relevant;
- source baseline identity/status where relevant.

It must not expose execution controls.

If an old WorkCardMap/IssueFixCardMap presentation can be safely reused as pure rendering, it may be adapted. Do not reuse its legacy storage/identity assumptions.

## 4. Current Project planning authority fence

Search renderer/main/preload production paths for Current Project Feature/Issue access to:
- workPlanningKernel keyed by intakeId;
- planning/work-intake/planning artifacts;
- workRouteDecisionService as target planning authority;
- Work Intake branch verification as planning admission;
- routedDevelopmentExecutionBinding;
- issueExecutionPlan/private Issue Fix Card planning;
- RoutedIssueBridge or equivalent route-owned Issue identity.

For Feature/Issue exact Workflow instances, these must be unreachable after this card.

Zero-production-caller modules may be removed with their obsolete tests if removal is bounded. Modules still required by Project Creation or later unsupported Workflow families may remain, but the Implementer Report must name the exact remaining production caller and explain why it is not Current Project Feature/Issue authority.

Do not create a provider/legacy mode switch.

## 5. State recovery

Restart/reopen behavior must recover the active workspace from canonical Workflow.currentWorkspace plus SPS state.

Required examples:
- saved Feature Intake reopens Feature Intake/Assessment as appropriate;
- accepted Feature plan reopens work-item-map;
- accepted Issue RCA reopens correction planning if no accepted correction plan;
- accepted Issue correction plan reopens work-item-map;
- closed WIR reopening still remains on WIR summary and does not redirect.

No Markdown scan may be required to determine which Current Project Feature/Issue planning workspace is active.

## 6. No accidental source/execution work

Opening/reopening/refreshing any WRB03 planning workspace must not:
- materialize Workflow source;
- create branch/worktree;
- create SourceCheckpoint;
- create ImplementationRecord;
- create Validation;
- create repair WorkItem;
- create IntegrationRecord;
- advance Dev.

The source lifecycle remains lazy and WRB04 starts mutation/execution.

## 7. Permanent proof

Add focused renderer/application proof for:
- exact Feature dispatch by currentWorkspace;
- exact Issue dispatch by currentWorkspace;
- two same-type instances maintain independent navigation state;
- reopen/restart from SPS state;
- WIR completed summary behavior remains intact;
- unsupported Workflow types remain exact generic shells;
- Project Creation remains separate;
- no Current Project Feature/Issue production IPC invokes legacy route-owned planning;
- work-item-map has no execution actions;
- open/refresh causes no source materialization or execution state.

## Non-scope

Do not implement WRB04 execution, Work Card decomposition, validation, repair, Phase close, source checkpoints, integration candidate work, or the linked-worktree integration repair.

## Validation

Run build; exact navigation/renderer tests; Feature/Issue planning service tests; Workflow Hub/WIR regressions needed by the dispatch change; focused IPC/preload contract tests; validation-plan preview; git diff --check.

Do not run retired route-owned lifecycle tests merely to preserve abandoned behavior.

## Report/checkpoint

Write docs/implementation-bundles/workflow-runtime-rebaseline/WRB03/Reports/WRB03-04_IMPLEMENTER_REPORT.md.

Suggested commit: WRB03-04 converge Workflow planning navigation.

Then proceed directly to WRB03-05.
