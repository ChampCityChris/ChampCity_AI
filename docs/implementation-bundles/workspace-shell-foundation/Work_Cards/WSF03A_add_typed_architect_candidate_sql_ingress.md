# WSF03A — Add reusable typed Architect candidate ingress to SQL

**Type:** Architecture Foundation Work Card  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Depends on:** WSF03 checkpoint `3bbbaf3`  
**Unblocks:** WSF04, WSF05, WSF08, WSF09, WSF14, WSF17, and live Architect Interview candidate submission.

## Objective

Implement one reusable bounded LLM-response ingress from the ChampCity MCP application boundary into existing structured SQL stage-save services.

This replaces renderer-owned JSON paste boxes. It does not restore Markdown authority and does not redesign the recovered shells.

Read and follow `../WSF03A_ARCHITECT_CANDIDATE_INGRESS_AUDIT.md` and `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`.

## Architecture

Public MCP surface:

`workflow_toolbox.submit_stage_candidate`

The action accepts:

- exact `workflowId`;
- bounded stage enum;
- optional exact scope entity identity for Phase/WorkItem stages;
- bounded `candidateJson`.

Supported Greenfield stage semantics for this card:

- `architect-interview`
- `project-planning`
- `phase-map`
- `phase-interview`
- `phase-planning`
- `work-item-planning`

Work Card Repair uses `work-item-planning` against the exact Repair WorkItem; do not create a parallel repair candidate transport.

## Candidate ownership

The model supplies only semantic candidate content required by the stage contract.

The ingress application service must resolve/inject mechanical state already owned by ChampCity wherever practical:

- current exact Workflow identity/type;
- current Intake ID/version for Architect output;
- exact Phase ID for Phase stages;
- exact WorkItem ID/version for WorkItem planning;
- current authoritative source/member revisions;
- expected review/cycle revision.

Do not require the model to copy mechanical revision values merely because the current renderer JSON contract did.

If a current service contract requires those fields, construct the full internal input after resolving the current stage model, then call the existing save service.

## Required routing

Use existing services; do not duplicate SQL mutation logic:

- Architect Interview → `createStructuredArchitectWorkspaceService().save`
- Project Planning → `createStructuredProjectPlanningService().save`
- Phase Map → `createStructuredPhaseMapService().save`
- Phase Interview/Planning → `createStructuredPhaseLoopService().save`
- Work Card Planning/Repair → `createStructuredWorkItemPlanningService().save`

The ingress service may be a dedicated dispatcher under `src/main/workflow/` or `src/main/architectOutputs/`, but stage-specific validation remains with existing contracts/services.

## MCP registry

Replace the reserved `workflow_toolbox` provider with an implemented provider containing at minimum:

- `status`
- `submit_stage_candidate`

Use `files.write` scope.

Add an explicit semantic mutation action kind such as `workflow-write` if needed rather than misclassifying SQL workflow mutation as artifact/patch writing.

The action is Project-container bound, not RepositoryCheckout bound.

## Handoff integration

Update the structured handoff builders for the supported Greenfield stages so the embedded Architect receives:

- exact stage identity;
- semantic candidate contract;
- instruction to submit the completed candidate through `workflow_toolbox.submit_stage_candidate`;
- exact MCP workspace binding already used by ChampCity.

The handoff must not instruct the model to paste JSON back to the Operator or write canonical Markdown.

## Renderer behavior

Do not add candidate JSON textareas.

WSF03 Architect Interview must be able to:

1. Prepare/Copy the handoff;
2. model submits candidate through MCP;
3. Operator presses existing Refresh;
4. SQL-generated Architect Review appears;
5. Operator reviews it.

WSF04+ shells will consume the same pattern.

## Authority / safety

- candidate submission creates proposed/reviewable state only;
- no Operator approval/disposition is created by MCP;
- exact stale/mismatched Workflow/Phase/WorkItem state fails closed;
- peer Workflow records cannot be mutated;
- unsupported stage fails closed;
- malformed/oversized JSON fails closed;
- generated Markdown remains SQL projection only;
- no generic file-to-SQL watcher;
- no arbitrary SQL/entity mutation tool;
- no Git mutation;
- no schema migration.

## Focused proof

Prove through production services/tool registry:

1. `workflow_toolbox` is implemented and advertises only authorized actions;
2. read-only OAuth scope cannot submit candidates;
3. Architect Interview submission persists typed SQL candidate/review state without renderer JSON entry;
4. Project Planning candidate submission reaches the existing Project Planning save path;
5. Phase Map candidate reaches existing Phase Map save path;
6. Phase Interview and Planning candidates route to the exact Phase/stage;
7. WorkItem candidate routes to exact WorkItem planning, including a Repair WorkItem fixture;
8. stale/mismatched workflow/scope/candidate fails with no partial mutation;
9. submission never records an Operator review Decision;
10. refreshed stage projection exposes the generated SQL review document;
11. handoff text directs the model to the MCP submission action and never to canonical Markdown promotion;
12. WSF03 recovered Architect shell requires no candidate textarea.

## Existing transport code

Do not delete the historical Architect Output runtime/draft definitions in this card. They remain useful evidence and may still have non-WSF consumers. Cleanup comes only after Greenfield Operator acceptance and a separate ownership audit.

## Validation

Run focused Agent Harness registry/tool contract proof plus structured Architect, Project Planning, Phase Map, Phase loop and WorkItem Planning owners. Run build/static and exact affected-plan validation. Do not run release qualification.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF03A_IMPLEMENTER_REPORT.md`.

Report:
- exact public tool contract;
- ingress dispatcher mapping;
- mechanical fields injected by ChampCity versus semantic fields supplied by model;
- each stage fixture result;
- negative/stale proof;
- WSF03 live refresh integration proof;
- tests reused/extended/new with coverage-gap reason;
- remaining external/Operator validation.

## Checkpoint

`WSF03A add typed Architect candidate SQL ingress`

After checkpoint, resume WSF04 and continue the bundle sequentially.
