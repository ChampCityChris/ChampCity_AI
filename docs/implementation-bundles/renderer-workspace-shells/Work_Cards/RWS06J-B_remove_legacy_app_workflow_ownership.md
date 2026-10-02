# RWS06J-B — Remove Legacy App Workflow Ownership

**Status:** IMPLEMENTER_READY
**Execution mode:** CONTINUOUS_BUNDLE_STEP — complete this card, write its report, create its checkpoint, then immediately begin RWS06J-C in the same execution run. Do not return to the Operator/Architect between cards. A checkpoint is evidence, not a stop point.
**Parent:** RWS06J
**Sequence:** after RWS06J-A checkpoint

## Objective

Finish the `App.tsx` ownership cutover.

The active root must be an application shell only. Delete the dormant legacy Issue and duplicate Greenfield workflow machinery that remains after the structured router became active.

## Verified remaining source

Current `App.tsx` still contains substantial legacy workflow-specific state/effects/callbacks, including many references to:

- `activeIssueStageId`;
- old Issue validation/close/planning callbacks;
- legacy Greenfield `activeWorkspaceId` stage composition;
- legacy project Phase/WorkItem polling and transition helpers;
- duplicate structured Greenfield JSX branches outside `GreenfieldWorkspace`.

The old Issue renderer files have begun deletion, but root state/effects remain.

## Required implementation

Delete from `App.tsx` all workflow-specific state, effects, callbacks, computed flags, JSX, imports, and polling that are no longer reachable through:

- `StructuredWorkflowWorkspace`;
- `GreenfieldWorkspace`;
- `OptionalWorkIntakeWorkspace`.

Retain only true root concerns:

- selected Project/Workflow identity;
- dashboard/workflow/settings/source-control route;
- global chrome/sidebar;
- application-level settings/browser mounting;
- Workflow inventory/open/start coordination.

Do not move deleted workflow logic into another root helper merely to reduce line count.

Remove now-unused Issue sidebar/root props and any root-only compatibility helpers made unreachable by the cutover.

## Preserve

- current structured router behavior;
- direct Workflow start;
- optional WIR;
- Workflow Hub;
- Source Control;
- settings;
- browser attachment;
- exact SQL workflow stages;
- RWS05 shared Architect UI.

## Required proof

Prove:

1. `activeIssueStageId` and the old Issue state machine no longer exist in production `App.tsx`;
2. old Greenfield stage-specific JSX is absent from `App.tsx`;
3. `App.tsx` does not directly render Phase Map, Phase Loop, WorkItem Planning, execution, validation, or close components for substantive workflows;
4. substantive workflow rendering enters through `StructuredWorkflowWorkspace`;
5. Project Creation rendering enters through `GreenfieldWorkspace`;
6. Workflow Hub/direct-start/optional-WIR navigation still works;
7. settings/source-control/landing remain reachable;
8. build and focused renderer routing proof pass;
9. `git diff --check` passes.

## Expected production scope

Primarily:

- `src/renderer/app/App.tsx`
- `src/renderer/app/figma/FigmaSidebar.tsx`
- any root-only helper proven unused;
- existing renderer routing tests.

## Forbidden changes

- no authority marker change;
- no main-process legacy service deletion in this card;
- no new workflow behavior;
- no SQL schema change;
- no compatibility fallback to old root workflow machinery.

## Implementer Report

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06J-B_IMPLEMENTER_REPORT.md`

## Checkpoint

Commit:

`RWS06J-B remove legacy app workflow ownership`

No approval gate is introduced.

**Do not stop here.** After the commit succeeds, immediately open and execute RWS06J-C. Do not wait for review, approval, confirmation, or another user message. Stop only for a genuine external blocker that prevents safe continuation and cannot be repaired within the remaining RWS06J cards.
