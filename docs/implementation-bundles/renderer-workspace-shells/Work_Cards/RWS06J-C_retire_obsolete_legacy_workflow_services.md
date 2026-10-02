# RWS06J-C — Retire Obsolete Legacy Workflow Services

**Status:** IMPLEMENTER_READY
**Execution mode:** CONTINUOUS_BUNDLE_STEP — complete this card, write its report, create its checkpoint, then immediately begin RWS06J-D in the same execution run. Do not return to the Operator/Architect between cards. A checkpoint is evidence, not a stop point.
**Parent:** RWS06J
**Sequence:** after RWS06J-B checkpoint

## Objective

Remove obsolete migrated-workflow service/API/test rubble after the renderer cutover has made it unreachable.

This card owns reachability-based deletion, not another migration layer.

## Required implementation

Starting from active renderer/main/preload entry points, trace remaining migrated-workflow dependencies.

For Project Creation, Issue Resolution, structured Intake, Architect, Planning, Phase, WorkItem, validation/repair, and close:

- delete legacy modules with no current legitimate consumer;
- delete obsolete IPC handlers/preload methods/contracts;
- delete tests that prove only retired behavior;
- remove capability-map entries for deleted proof;
- remove legacy Markdown freshness/import helpers no longer reachable.

The current `issueResolutionService.ts` should not remain merely fenced if no active product path legitimately consumes it. If reachability proves it dead, delete it and its retired service/API surface.

Likewise, retire `currentWorkflowService` and other Markdown-backed workflow navigation services if no active current workflow uses them.

Historical Markdown files in user repositories are not deleted.

## Classification rule

Every remaining canonical Markdown callsite touched by migrated workflow families must be classified as one of:

- active current workflow authority — defect, remove;
- explicit generated readability/export projection — keep;
- historical/evidence-only utility — keep only if genuinely reachable and non-authoritative;
- dead migrated workflow code — delete;
- unrelated application functionality — leave outside scope.

Do not retain dead code for archaeology.

## Preserve

- SQL workflow services accepted through RWS06I;
- generated Intake/Architect/review projections;
- Markdown Export;
- Source Control;
- unrelated non-workflow features;
- historical files on disk.

## Required proof

Prove:

1. no active migrated workflow calls `listPlanningDocuments()`, legacy disposition/freshness resolvers, or canonical writers for semantic state;
2. old Issue service/API is deleted if no active consumer exists;
3. old current-workspace Markdown navigation is deleted if no active consumer exists;
4. removed renderer/service tests are also removed from validation catalog;
5. no public preload/IPC method references deleted services;
6. build passes;
7. focused workflow tests pass;
8. `git diff --check` passes.

Produce a concise remaining-callsite classification in the Implementer Report rather than a broad archaeology document.

## Expected production scope

- legacy Issue/Greenfield/current-workflow services proven dead;
- `src/main/main.ts` and/or workflow IPC only where retired handlers are removed;
- `src/preload/index.ts`;
- shared contracts;
- corresponding tests;
- `validation/capability-map.json`.

## Forbidden changes

- no structured authority cutover yet;
- no new migration/adoption feature;
- no deletion of user repository Markdown;
- no unrelated service cleanup.

## Implementer Report

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06J-C_IMPLEMENTER_REPORT.md`

Include deleted modules/APIs/tests and the remaining legitimate Markdown callsite classification.

## Checkpoint

Commit:

`RWS06J-C retire obsolete legacy workflow services`

No approval gate is introduced.

**Do not stop here.** After the commit succeeds, immediately open and execute RWS06J-D. Do not wait for review, approval, confirmation, or another user message. Stop only for a genuine external blocker that prevents safe continuation and cannot be repaired within the remaining RWS06J cards.
