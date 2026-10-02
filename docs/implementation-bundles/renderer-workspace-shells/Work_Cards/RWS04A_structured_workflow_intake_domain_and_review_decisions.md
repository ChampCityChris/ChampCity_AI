# RWS04A — Structured Workflow Intake Domain and Review Decisions

**Status:** IMPLEMENTER_READY  
**Type:** Structured Project State domain foundation  
**Baseline reviewed:** `dev` at `fd52612c3aae17fd0f8ed3d18674ff77e3df509b`  
**Supersedes:** the authority direction in blocked RWS03-REPAIR02; do not resume that card.

## Objective

Add one first-class SQL-backed `WorkflowIntake` entity and exact-record-version Operator review semantics to Structured Project State.

This card does **not** switch any production Intake UI/service caller yet. It establishes and proves the domain primitives that RWS04B/C will consume.

## Governing architecture

For the Intake workspace family:

- Structured Project State is authoritative.
- Markdown is a generated human-readable projection only.
- Editing/deleting generated Markdown cannot mutate or destroy Intake state.
- Operator disposition is a Structured Project State `Decision`, not Markdown metadata.
- `project_state_authority` remains the final **project-wide legacy-writer cutover fence**. Do not set or weaken it in this card. Incremental workspace-family migration may use structured entities before the final project-wide fence is selected.

## Domain model

Add `WorkflowIntake` to `EntityBodyMap`:

```ts
WorkflowIntake: {
  workflowId: EntityId;
  workflowType: WorkflowType;
  values: Record<string, string | boolean>;
}
```

Add it to `ENTITY_TYPE_REGISTRY`.

### Bounded map field

Add one explicit registry field kind for the `values` object (name may be `scalar-map`).

It must accept only an ordinary object with:

- at most 32 keys;
- key length 1–128, no control characters;
- values only non-empty bounded strings or booleans;
- each string <= 4,096 UTF-8 bytes;
- normal overall 65,536-byte record limit still enforced.

The registry validates structure/bounds. Workflow-specific required/optional keys remain the application contract owned by `workflowIntakeContracts.ts`.

Do not add arbitrary nested JSON support.

## Ownership relationship

Add:

`intake_for: WorkflowIntake -> Workflow`

Requirements:

- immutable provenance relationship;
- exact same Project;
- target Workflow must be active/current;
- `WorkflowIntake.body.workflowId` must equal the target Workflow ID;
- `WorkflowIntake.body.workflowType` must equal target `Workflow.body.workflowType`;
- Work Intake Routing is not a valid target.

Unlike `workflow_member`, `intake_for` must allow `project-creation`.

## ProjectStateService commands

Add bounded typed commands:

### `saveWorkflowIntake(...)`

Inputs include exact Project ID, Workflow ID, Workflow type, validated values, and optional expected Intake record version.

Behavior:

- resolve exact active Workflow;
- reject type mismatch;
- require zero or one active `WorkflowIntake` linked by `intake_for`;
- zero -> create one WorkflowIntake + `intake_for`;
- one -> revise the same entity and increment its record version exactly once;
- >1 -> fail closed;
- Workflow/currentWorkspace is not advanced.

### `recordWorkflowIntakeDecision(...)`

Inputs:

- exact Intake ID;
- exact expected Intake record version;
- outcome: `approved | revision_requested | rejected`;
- bounded rationale/notes.

Requirements:

- human Operator principal only;
- target must be current active WorkflowIntake at the expected version;
- `revision_requested` requires non-empty notes;
- create immutable `Decision` with:
  - `decisionType: "workflow-intake-review"`
  - `decisionScope: "workflow-intake:<intakeId>@<recordVersion>"`
- link Decision -> WorkflowIntake with `governs`.

### `getWorkflowIntakeDisposition(...)`

Return only a Decision whose `decisionScope` matches the **current** Intake ID + recordVersion.

Therefore:

- revision of Intake automatically makes an older approval/rejection/revision request stale;
- no special mutation of old Decisions is required;
- current disposition becomes `none` until the current Intake revision is reviewed.

Do not use generic `getEffectiveDisposition` alone for Intake-currentness because it is entity-ID scoped rather than record-version scoped.

## Architecture docs

Update narrowly:

- `CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md`
- `CHAMPCITY_STRUCTURED_PROJECT_STATE_SQLITE_PERSISTENCE_ARCHITECTURE.md`

Record:

- WorkflowIntake is canonical SQL state;
- generated Markdown is a projection;
- `project_state_authority=structured` is the final project-wide legacy-writer cutoff, not a requirement that every domain must remain legacy until that moment.

## Required production areas

Expected:

- `src/shared/projectState/domainContracts.ts`
- `src/shared/projectState/entityTypeRegistry.ts`
- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- architecture docs above.

No renderer, IPC, preload, legacy Markdown service, workflow routing, Git/source-control, or SQLite table migration is authorized.

## Existing database compatibility

The current SQLite schema stores `entity_type` as open text and `body_json` as validated JSON; it does not enumerate application entity types in SQL CHECK constraints.

Therefore **adding WorkflowIntake does not require a SQLite schema migration**. Existing Project State databases can store the new entity after application/domain code is upgraded.

Prove this against an existing-schema fixture.

## Focused proof

Extend existing Project State domain/service owners to prove:

1. WorkflowIntake create/revise round trip;
2. one active Intake per exact Workflow;
3. Greenfield `project-creation` is allowed;
4. Work Intake Routing is rejected;
5. mismatched Workflow ID/type rejected;
6. scalar-map rejects nested objects, arrays, excess keys, unsupported values and byte overflow;
7. approval/revision/rejection Decisions govern exact Intake revision;
8. revising Intake makes prior Decision non-current;
9. Revision Requested without notes fails;
10. existing SQLite schema accepts WorkflowIntake without schema migration.

Prefer existing test files; new permanent test only with a documented coverage gap.

## Validation

- `npm run validate:plan -- --profile work-item --changes tmp/rws04a-changes.json`
- `npm run test:affected -- --changes tmp/rws04a-changes.json`
- focused Project State domain/store/service tests as needed;
- `git diff --check`.

Do not run full/release qualification.

## Acceptance criteria

1. WorkflowIntake is a registered first-class Project State entity.
2. It is owned by exactly one exact Workflow through `intake_for`.
3. Intake revision and Operator disposition are SQL state.
4. Disposition is record-version current, not merely entity-ID current.
5. Existing SQLite databases require no schema migration.
6. No production Intake caller has been switched yet.
7. Legacy canonical writer fence is unchanged.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS04A_IMPLEMENTER_REPORT.md`

Include domain changes, compatibility proof, test ownership, validation receipts, deviations/blockers.

## Checkpoint and STOP

Commit:

`RWS04A add structured workflow intake domain`

Then STOP for Architect review.
