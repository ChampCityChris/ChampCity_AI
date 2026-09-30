# WRB02-01 — Establish Workflow Application Service and Exact Instance/Source-Baseline Semantics

**Bundle:** WRB02 — Workflow Application, Inventory, and Routing
**Starting checkpoint:** `76ecb4f97ca8aa52b46fdfc95f25e186af20bc4b`
**Implementer:** GPT 6.0 Luna Medium

## Objective

Create one production Workflow application boundary for the Current Project. It must list/open exact Workflow instances and create repeatable substantive Workflow instances with the correct immutable source baseline when the Project is source-backed.

Direct-start and later WIR handoff must call this same service. This card does not wire the renderer or WIR handoff yet.

## 1. Enrich the canonical Workflow type registry

Extend `WorkflowTypeDefinition` so one registry owns application entry metadata in addition to label/repeatability.

Required fields equivalent to:
- `entryWorkspace: string`;
- `directStart: boolean`;
- `hubOrder: number`;
- `startLabel?: string`.

Canonical values:

| Workflow type | entryWorkspace | directStart | start label |
| --- | --- | --- | --- |
| `project-creation` | `project-intake` | false | none |
| `feature-capability` | `feature-intake` | true | `Start Feature` |
| `refactor-migration` | `refactor-intake` | true | `Start Migration` |
| `integration-composition` | `integration-intake` | true | `Start Integration` |
| `infrastructure-platform` | `infrastructure-intake` | true | `Start Infrastructure Work` |
| `research-prototype` | `research-intake` | true | `Start Research` |
| `issue-resolution` | `issue-intake` | true | `New Issue` |
| `work-intake-routing` | `work-intake` | false | none |

`project-creation` is entered only through New Project creation. `work-intake-routing` is created only by Work Intake capture.

Do not add aliases such as Development, Feature Development, Hotfix, or Maintenance.

## 2. Define the WIR route-to-Workflow mapping

Add one shared reviewed mapping/validator. Existing-Project WIR routes are exactly:
- `feature-change` → `feature-capability`;
- `refactor-migration` → `refactor-migration`;
- `integration-composition` → `integration-composition`;
- `infrastructure-platform` → `infrastructure-platform`;
- `research-prototype` → `research-prototype`;
- `issue-resolution` → `issue-resolution`.

`greenfield` is not a WIR-selectable route. It remains the Project Creation planning/profile identity and is entered through New Project.

Do not silently map unknown routes or `greenfield` to another Workflow.

## 3. Atomic substantive Workflow creation in Project State

Add a typed Project State command used by the application service to create one substantive Workflow plus its optional source semantics atomically.

Input must contain:
- exact Workflow type;
- bounded non-empty title;
- registry-owned entryWorkspace (caller may not invent a different workspace);
- optional immutable source seed `{ repositoryId, integrationTargetSourceLineId, baseRevisionId }`.

Required behavior:
- reject `work-intake-routing` through this substantive command;
- enforce the existing non-repeatable Project Creation rule;
- create Workflow as current/active;
- when source seed is present, create exactly one SourceBaseline for the Workflow and one SourceBinding in `unprepared` state in the same Project State transaction;
- when source seed is absent, create no SourceBaseline/SourceBinding;
- no SourceLine, branch, worktree, RepositoryCheckout, checkpoint, or integration is created.

Factor the internal record construction so WRB02-04 can reuse the same semantic creation primitive inside atomic WIR handoff. Do not duplicate source-baseline rules in two commands.

## 4. Current Workflow application contracts

Create a shared contract file such as `src/shared/workflowApplicationContracts.ts`.

Define bounded DTOs for:
- Workflow instance summary: exact `workflowId`, `lineageId`, `workflowType`, title, workflow state, lifecycle state, currentWorkspace, created/updated timestamps, optional `workIntakeId`, optional routed target/source provenance IDs;
- Workflow inventory grouped by canonical Workflow type;
- direct-start request `{ workflowType, title }`;
- direct-start result containing the exact created Workflow summary;
- exact Workflow open/detail result.

No DTO may use title/type as identity. Exact Workflow ID is the navigation key.

## 5. Current Workflow application service

Create a main-process service under `src/main/workflow/` or equivalent.

Required operations:
- `listCurrentProjectWorkflows(projectRoot)`;
- `getCurrentProjectWorkflow(projectRoot, workflowId)`;
- `startDirectWorkflow(projectRoot, input)`.

All operations:
- resolve the exact Current Project via WRB01 registration;
- reject foreign/obsolete Project state;
- operate only on current Workflow records (superseded/voided records are history, not independent Hub instances);
- include closed instances in inventory as completed history.

`startDirectWorkflow`:
- accepts only registry definitions with `directStart === true`;
- validates title without enforcing uniqueness;
- supports multiple same-type concurrent instances;
- if Current Project has no source Repository, creates the Workflow with no source seed;
- if source-backed, resolve the managed Dev checkout, require exact Git root and exact local `dev` branch, inspect the exact `dev` commit, and pass `{ repositoryId, integrationTargetSourceLineId: "dev", baseRevisionId: <exact dev commit> }` into the atomic Project State command;
- dirty/untracked Dev state is not an authority gate and is not included in the baseline;
- source inspection failure fails before Workflow creation; do not create a source-backed Workflow with a fabricated/missing baseline.

Do not materialize the Workflow SourceLine/checkout here. WTR02F remains the later explicit lazy materialization service.

## 6. Inventory provenance

For WIR instances, inventory resolves the initiating WorkIntake ID through active/historical `initiates` provenance.

For routed substantive instances, inventory may expose the WIR source Workflow ID/WorkIntake ID through immutable `routes_to`/`initiates` provenance.

Direct-started substantive instances have no WIR provenance and must still produce the same core instance DTO.

Ambiguous provenance fails closed rather than choosing an arbitrary edge.

## 7. Permanent proof

Create focused application-service proof covering:
- exact canonical registry metadata and direct-start eligibility;
- two Feature instances with the same title remain distinct by Workflow ID;
- Feature + Issue + Migration coexist concurrently;
- direct-start Project Creation and WIR are rejected;
- source-backed direct start captures exact Dev commit as immutable SourceBaseline and creates unprepared SourceBinding without branch/worktree;
- dirty Dev does not block creation and its uncommitted bytes are not baseline state;
- non-source Current Project creates the same Workflow type with no source records;
- missing/invalid Dev on a source-backed Project fails before Workflow creation;
- inventory includes active and closed current Workflow instances but not superseded/voided historical records;
- routed and direct-started instances share the same core inventory shape.

Extend `workflow-type-registry.test.cjs` for the new registry metadata rather than creating duplicate registry proof.

## Non-scope

Do not modify Workflow Hub UI, Work Intake routing UI, Architect output runtime, route decisions, WIR closure, target handoff, planning workspaces, Workflow source materialization, shared execution, or legacy Issue/Development retirement.

## Validation

Run build, the Workflow type registry test, the new Workflow application service test, focused source semantic tests selected by the changed Project State command, validation-plan preview, bounded affected lanes if reasonable, and `git diff --check`.

## Report/checkpoint

Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Reports/WRB02-01_IMPLEMENTER_REPORT.md`.

Suggested commit: `WRB02-01 establish Workflow application service`.

Then proceed directly to WRB02-02.