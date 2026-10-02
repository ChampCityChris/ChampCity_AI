# RWS06J-D — Activate Project-Wide Structured Authority

**Status:** IMPLEMENTER_READY
**Execution mode:** CONTINUOUS_BUNDLE_STEP — complete this card, write its report, create its checkpoint, then immediately begin RWS06J-E in the same execution run. Do not return to the Operator/Architect between cards. A checkpoint is evidence, not a stop point.
**Parent:** RWS06J
**Sequence:** after RWS06J-C checkpoint

## Objective

Perform the actual Project-wide authority cutover only after active workflow cleanup is complete.

## Architecture

`project_state_authority` is Project-wide. It is not selected per Workflow.

Use the existing provider-generation mechanism to advance the selected Current Project to `authority: "structured"`.

The public/runtime operation must be Project-scoped and idempotent. It must not accept a Workflow ID merely as a pretext for changing Project authority.

For current/new managed Projects after this cutover, Project activation may ensure structured authority once the exact registered SQL Project identity is established. Inventory reads and individual Workflow opens must remain read-only with respect to provider generation.

## Required implementation

- replace/remove the workflow-scoped authority-selection API introduced during partial J;
- expose or use a Project-scoped structured-authority activation boundary;
- activate authority for the selected registered Project at the appropriate Project activation/cutover point;
- preserve generation compare-and-swap semantics;
- leave the legacy read/write fence strict.

## Required fence proof

With authority structured:

- legacy canonical workflow reads fail closed;
- legacy canonical workflow writes fail closed;
- all current structured workflow list/open/start/route/navigation operations continue functioning;
- generated readability projections and explicit export continue functioning because they are not canonical authority;
- historical Markdown presence/edit/delete cannot alter current SQL workflow state.

## Preserve

- all J-A/B/C structured routing and cleanup;
- Source Control;
- Project registration identity;
- generated projections;
- no arbitrary historical-document import.

## Required proof

1. opening/listing/starting a Workflow does not advance provider generation;
2. Project activation advances from null/legacy to structured exactly once;
3. repeated Project activation is idempotent;
4. stale generation CAS fails normally;
5. legacy read/write fence is demonstrably active;
6. current structured Intake/Architect/Planning/Execution/Close still operate;
7. build and focused Project State/workflow tests pass;
8. `git diff --check` passes.

## Expected production scope

- Project/current-registration activation boundary;
- workflow application service only to remove the temporary workflow-scoped API;
- IPC/preload/shared contract for the Project-scoped boundary if required;
- fence/current-project tests.

## Forbidden changes

- no workflow-scoped authority selection;
- no weakening the fence;
- no migration fallback;
- no renderer workflow cleanup beyond removing obsolete authority calls;
- no bundle-wide qualification in this card.

## Implementer Report

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06J-D_IMPLEMENTER_REPORT.md`

## Checkpoint

Commit:

`RWS06J-D activate project structured authority`

No approval gate is introduced.

**Do not stop here.** After the commit succeeds, immediately open and execute RWS06J-E. Do not wait for review, approval, confirmation, or another user message. Stop only for a genuine external blocker that prevents safe continuation and cannot be repaired within the remaining RWS06J cards.
