# WRB03-R01-01 — Restore Feature/Issue Planning IPC Reachability

**Parent:** WRB03 Repair01  
**Starting checkpoint:** `46da96bcd8d596b68b2924d0fa8dce8e11e06e9d`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Restore the actual renderer → preload → main-process path for the new Feature and Issue planning workspaces.

The underlying planning services are not the problem in this card. The new IPC registries reject legitimate mutation calls before those services run because their Workflow-ID helper requires the complete argument list to contain exactly one value.

This card repairs only the IPC/product-path boundary and adds proof at that boundary.

## 1. Correct Workflow-ID validation

In:

- `src/main/featurePlanning/featurePlanningIpc.ts`;
- `src/main/issuePlanning/issuePlanningIpc.ts`;

replace the current helper that validates both identity and total argument count.

Workflow ID validation must:
- validate only the first argument as a bounded non-empty exact Workflow ID string;
- never infer validity from the total argument count.

Then enforce channel-specific arity explicitly.

Required Feature channel shapes:

- `featurePlanning:get(workflowId)`
- `featurePlanning:copy(workflowId)`
- `featurePlanning:saveIntake(workflowId, intake)`
- `featurePlanning:prepare(workflowId, stage)`
- `featurePlanning:act(workflowId, action)`

Required Issue channel shapes:

- `issuePlanning:get(workflowId)`
- `issuePlanning:copy(workflowId)`
- `issuePlanning:saveIntake(workflowId, intake)`
- `issuePlanning:addEvidence(workflowId, files)`
- `issuePlanning:prepare(workflowId, stage)`
- `issuePlanning:act(workflowId, action)`

Reject missing and surplus arguments rather than silently ignoring them.

Do not weaken exact Workflow-ID validation.

## 2. Keep preload contracts aligned

Inspect `src/preload/index.ts` and shared workspace/API contracts.

The preload already sends the correct separate arguments. Preserve that shape unless a real contract mismatch is found.

Do not work around the defect by wrapping every call in one untyped object merely to satisfy the old validator.

Do not translate exact Workflow ID into WorkIntake ID, route identity, Issue alias, or Workflow type.

## 3. Bound runtime action validation

The IPC boundary currently casts action payloads through `any`.

Do not build a large duplicate schema system, but add enough outer-shape validation that:
- the action payload is an ordinary object;
- the action `type` is one of the service-supported actions for that surface;
- stage/outcome values are bounded to their declared enums when present;
- malformed payloads fail before service execution.

Leave semantic graph/RCA validation in the owning service/Project State command.

## 4. Surface renderer JSON parse failures

The Feature and Issue renderers parse Architect JSON synchronously inside click handlers.

A malformed draft must:
- set the workspace error state;
- leave the current draft/review state untouched;
- not throw an uncaught renderer event exception;
- not call the disposition IPC.

Keep this repair small. Do not redesign the Architect UX.

## 5. Permanent proof at the actual IPC boundary

Add focused proof that registers the Feature and Issue IPC listeners against stub services, then invokes the captured listeners with the exact arguments emitted by preload.

Prove at minimum:

Feature:
- get and copy accept one Workflow ID;
- saveIntake accepts Workflow ID + intake;
- prepare accepts Workflow ID + stage;
- act accepts Workflow ID + action;
- missing/surplus arguments reject.

Issue:
- get and copy accept one Workflow ID;
- saveIntake accepts Workflow ID + intake;
- addEvidence accepts Workflow ID + files;
- prepare accepts Workflow ID + stage;
- act accepts Workflow ID + action;
- missing/surplus arguments reject.

Also retain one renderer-level assertion that invalid JSON is converted to visible error state rather than an uncaught action.

Prefer extending an existing IPC/application proof file if it remains coherent. One small focused test file is acceptable if there is no existing correct home; do not add a broad lifecycle test.

## Non-scope

Do not change:
- canonical planning graph ownership;
- Feature assessment semantics;
- Issue RCA semantics;
- source materialization;
- Work Item execution;
- integration;
- legacy Issue execution callers.

Those belong to the following repair cards or WRB04.

## Validation

Run:
- build;
- focused new IPC listener proof;
- Feature/Issue renderer planning tests affected by parse handling;
- exact preload/API contract proof if an existing test owns it;
- validation-plan preview;
- `git diff --check`.

Do not run the full historical development/Issue lifecycle suite.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB03/Repair01/Reports/WRB03-R01-01_IMPLEMENTER_REPORT.md`

Suggested commit:

`WRB03-R01-01 restore planning IPC reachability`

Then proceed directly to R01-02.
