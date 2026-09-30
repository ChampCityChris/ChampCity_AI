# WTR01A — Establish Canonical Workflow Type Registry

**Milestone:** WTR01 — Workflow domain contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Depends on:** adopted Workflow Topology Recovery architecture and Operator decisions  
**Architecture:** `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`  
**Plan:** `docs/implementation-bundles/workflow-topology-recovery/WORK_CARD_PLAN.md`  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR01A_IMPLEMENTER_REPORT.md`

## 1. Objective

Create the canonical, provider-neutral Workflow type registry and repeatability metadata.

This card establishes names and metadata only.

It does **not** yet migrate the existing `Workflow` entity body, ProjectStateService callers, WIR, source control, renderer navigation, or legacy runtime paths to those identifiers. Those changes belong to later cards.

## 2. Verified current evidence

The current code does not have one canonical Workflow Definition registry.

Relevant current state:

- `src/shared/projectState/domainContracts.ts` defines `Workflow.workflowType` as an unrestricted `string`.
- `src/shared/projectState/entityTypeRegistry.ts` validates `workflowType` as generic bounded text.
- `src/main/projectState/engineeringWorkflowStateFacade.ts` currently uses the old literal `development`.
- `src/shared/projectState/projectStateService.ts` currently creates a Work Intake Workflow using the old literal `work-intake`.
- `src/main/projectState/projectWorkflowStateFacade.ts` accepts arbitrary `workflowType: string`.
- `src/shared/workflowHubContracts.ts` currently exposes only the legacy `development | issue-resolution` UI set.
- the adopted recovery architecture defines eight initial Workflow types and their repeatability rules.

Those old callers are known drift and are **not** to be repaired in this card.

## 3. Canonical Workflow type set

Create exactly these initial canonical IDs:

| ID | Label | Repeatable |
| --- | --- | --- |
| `project-creation` | Project Creation / Greenfield | No |
| `feature-capability` | Feature / Capability | Yes |
| `refactor-migration` | Refactor / Migration | Yes |
| `integration-composition` | Integration / Composition | Yes |
| `infrastructure-platform` | Infrastructure / Platform | Yes |
| `research-prototype` | Research / Prototype | Yes |
| `issue-resolution` | Issue Resolution | Yes |
| `work-intake-routing` | Work Intake Routing | Yes |

Do not add aliases such as `development`, `work-intake`, `greenfield`, or `project-planning` to the canonical registry.

Future Workflow types such as UI Builder or Art Asset Creation are intentionally not part of this card.

## 4. Required implementation

Create:

`src/shared/projectState/workflowTypeRegistry.ts`

It must export, at minimum:

- an immutable ordered list/tuple of the eight canonical IDs;
- a `WorkflowType` type derived from that list;
- a `WorkflowTypeDefinition` contract containing:
  - `workflowType`;
  - `label`;
  - `repeatable`;
- one immutable registry keyed by canonical Workflow type;
- `isWorkflowType(value: unknown): value is WorkflowType`;
- `getWorkflowTypeDefinition(value: unknown): WorkflowTypeDefinition | undefined`.

Required behavior:

1. every canonical ID appears exactly once;
2. every registry entry's `workflowType` equals its key;
3. `project-creation` is the only non-repeatable type;
4. all seven other initial types are repeatable;
5. unknown values have no definition;
6. no function infers, normalizes, aliases, or falls back from an old identifier to a canonical identifier;
7. the module imports no Electron, Git, filesystem, database, Markdown, renderer, or model-runtime implementation.

## 5. Required focused proof

Add a focused permanent test:

`test/project-state/workflow-type-registry.test.cjs`

The test must prove:

- exact canonical ID membership;
- no duplicates;
- exact labels;
- exact repeatability metadata;
- only `project-creation` is non-repeatable;
- every canonical ID resolves through `isWorkflowType` and `getWorkflowTypeDefinition`;
- representative unknown/legacy values such as `development`, `work-intake`, `greenfield`, and `project-planning` are rejected/undefined rather than mapped;
- registry/list definitions cannot be mutated through ordinary consumer code.

If repository validation policy requires a capability-map entry for the new permanent test, add only the minimal attributable entry required for this test.

## 6. Explicit non-scope

Do **not** in WTR01A:

- change `EntityBodyMap["Workflow"]`;
- change `ENTITY_TYPE_REGISTRY.Workflow`;
- change `ProjectStateService.createWorkflow`;
- change `ProjectStateService.createWorkIntake`;
- change `engineeringWorkflowStateFacade`;
- change `projectWorkflowStateFacade`;
- change `workflowHubContracts.ts`;
- change Work Intake route IDs or route profiles;
- add `routes_to` or other relationships;
- change SourceBinding / SourceCheckpoint / IntegrationRecord;
- change branch naming or source-control mechanics;
- change any renderer/UI;
- change SQLite schema or migrations;
- modify or remove legacy migration/provider code;
- add Project container/Main/Dev/MCP behavior;
- attempt to make old runtime callers use the new registry.

If compilation remains green without touching those surfaces, leave them untouched. Their mismatch with the new canonical registry is deliberate temporary state until later WTR cards.

## 7. Expected owned files

Expected source/test scope is:

- `src/shared/projectState/workflowTypeRegistry.ts` — new;
- `test/project-state/workflow-type-registry.test.cjs` — new;
- `validation/capability-map.json` — only if required by the permanent-test catalog.

Any additional production file change requires a specific implementation necessity explained in the Implementer Report. Do not widen scope merely to “clean up” nearby Workflow terminology.

## 8. Acceptance criteria

WTR01A is complete only when:

1. the eight canonical Workflow IDs are represented exactly once;
2. the registry exposes deterministic labels and repeatability metadata;
3. Project Creation is the only non-repeatable type;
4. legacy/noncanonical identifiers are not silently accepted;
5. the registry is provider-neutral and side-effect free;
6. the focused registry test passes;
7. final changed-source validation passes;
8. no out-of-scope runtime/UI/source-control behavior was changed.

## 9. Validation

Run only bounded validation attributable to this card.

Required:

1. `npm run build`;
2. `node --test test/project-state/workflow-type-registry.test.cjs`;
3. if `validation/capability-map.json` changes, `node --test test/validation/capability-map.test.cjs`;
4. run the validation planner / work-item affected profile for the exact final changed paths;
5. `git diff --check`.

Do not run the broad historical full suite unless the validation planner specifically selects it from these changed paths.

Repair any card-local failure before reporting completion.

## 10. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR01A_IMPLEMENTER_REPORT.md`

The report must include:

- starting `dev` SHA;
- files created/modified;
- exact registry IDs/metadata implemented;
- focused validation commands/results;
- any corrected card-local failure;
- explicit confirmation that no later WTR scope was implemented.

## 11. Checkpoint and stop boundary

Create one attributable checkpoint commit after the card and report are complete.

Suggested subject:

`WTR01A establish canonical workflow type registry`

Then **STOP**.

Do not begin WTR01B.

The Architect will review the code, tests, report, and commit before the next card is authored or released.
