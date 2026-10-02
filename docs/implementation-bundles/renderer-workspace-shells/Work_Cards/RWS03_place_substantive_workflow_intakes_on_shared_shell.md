# RWS03 — Put All Existing-Project Workflow Intakes on the Shared Intake Shell

**Status:** IMPLEMENTER_READY  
**Depends on:** RWS01 and RWS02 accepted  
**Type:** Workflow intake persistence / renderer composition  
**Baseline reviewed:** `dev` at `cace333a57178ea15d61572596b618e9673d35a6`  
**Governing UI:** `docs/architecture/RENDERER_WORKSPACE_UI_UX_REBASELINE_2026-09-30.md`

## Objective

Make the RWS01 `IntakeWorkspaceShell` the single renderer presentation for the six direct-start existing-project Workflow intake stages:

- Feature / Capability
- Refactor / Migration
- Integration / Composition
- Issue Resolution
- Infrastructure / Platform
- Research / Prototype

Use the exact questions/contracts defined by RWS02. Persist the four newly defined intake families in canonical Project State, preserve Feature/Issue domain behavior, and remove the current ad-hoc intake forms from the provisional Feature/Issue planning workspaces.

This card stops at the Intake workspace family. It does **not** build or redesign Architect Assessment/RCA, Plan, Work Item Map, execution, validation, or close workspaces.

## Verified current state

Repository review confirms:

- RWS01 provides `IntakeWorkspaceShell` with a left intake slot and generic right companion slot.
- RWS02 provides `WORKFLOW_INTAKE_DEFINITIONS` and typed inputs for exactly the six direct-start existing-project Workflow types.
- `workflowPlanningDispatch.ts` currently routes only Feature and Issue front halves; Refactor/Migration, Integration, Infrastructure, and Research fall to `WorkflowInstanceWorkspace`.
- `FeaturePlanningWorkspace.tsx` and `IssueWorkflowPlanningWorkspace.tsx` still contain their own one-column intake forms.
- Feature and Issue already persist exact-Workflow intake as Workflow-owned `Finding` records through their existing planning services.
- The other four Workflow families have no exact-Workflow intake persistence.
- `App.tsx` already has the embedded Architect browser surface used by Workflow-instance workspaces.
- Canonical Project State `text` is bounded to **4,096 UTF-8 bytes**. RWS02 inherited the older Feature/Issue 8,000-character UI/service limit, which is not actually persistable as one `Finding.statement`.

## Architect correction: intake text limit

Correct the RWS02 field contract before wiring persistence:

- change intake field `maxLength` from 8,000 to **4,096 characters**;
- add `maxUtf8Bytes: 4096`;
- renderer `maxLength` must use the shared definition;
- the application service must also reject any value whose UTF-8 encoded size exceeds 4,096 bytes.

This is a bounded contract correction required by the canonical Project State storage limit. Do not increase Project State text limits, chunk intake strings, or invent alternate sidecar storage.

Update the RWS02 registry proof accordingly.

## Architecture

### 1. One application-facing intake API

Add a single exact-Workflow intake facade:

- `getWorkflowIntake(workflowId)`
- `saveWorkflowIntake(workflowId, payload)`

Extend `src/shared/workflowIntakeContracts.ts` with a discriminated typed payload/projection sufficient for those methods.

The save payload must carry the declared Workflow type plus its typed values. The main process resolves the exact Workflow by ID and rejects any payload whose type does not match the canonical Workflow record.

Expose only this generic intake API to the new intake renderer.

### 2. Preserve Feature and Issue domain owners

Create a main-process `workflowIntakeService` that acts as a facade.

For:

- `feature-capability`: delegate read/save to the existing Feature planning service.
- `issue-resolution`: delegate read/save to the existing Issue planning service.

Do not duplicate Feature or Issue Finding persistence.

The facade must apply the shared RWS02 field validation before delegation so Feature/Issue no longer present an 8,000-character path that Project State cannot store.

The existing Feature/Issue service methods may remain internal implementation APIs, but the renderer must no longer use the old type-specific intake save APIs.

### 3. Persist the four missing Workflow intakes as Workflow-owned Findings

For:

- `refactor-migration`
- `integration-composition`
- `infrastructure-platform`
- `research-prototype`

persist intake fields in the current Project State database as exact-Workflow `Finding` records.

Use this identity convention for each field:

`workflow-intake:<workflowType>:<fieldKey>`

as the Finding category.

Requirements:

- one current intake Finding at most for each exact Workflow + field key;
- title = the RWS02 operator-facing field label;
- statement = trimmed Operator value;
- impact = `<Workflow label> intake context`;
- findingState = `current` for a supplied value;
- link every created Finding to the exact Workflow with `workflow_member`;
- revise the existing record on subsequent saves rather than creating duplicates.

For optional fields:

- absent/blank on first save: no Finding is required;
- clearing a previously populated optional field: revise that Finding to `findingState: "omitted"` with the deterministic statement `Optional intake field omitted by Operator.`;
- projection maps `omitted` back to an absent/empty optional value.

Do not use file sidecars, JSON blobs, Markdown artifacts, a new database table, or a new Project State entity type.

### 4. Intake save authority

`saveWorkflowIntake` must fail closed unless:

- the exact Workflow exists;
- it is active;
- its Workflow type is one of the six RWS02 intake types;
- its `currentWorkspace` exactly equals the registry `entryWorkspace`;
- payload Workflow type equals the exact Workflow type;
- payload contains no unknown keys;
- every required field is nonblank;
- every value respects both shared character and UTF-8 byte limits.

Saving Intake does **not** advance `currentWorkspace`. The next workspace family will own that transition.

Routed provenance, SourceBaseline, branch/source state, and Work Intake lineage are untouched.

Do not auto-fill Workflow Intake from the earlier Work Intake routing request in this card.

## Renderer

Create:

`src/renderer/app/WorkflowIntakeWorkspace.tsx`

It is the one existing-project substantive Intake renderer.

It must:

- consume `WORKFLOW_INTAKE_DEFINITIONS[workflow.workflowType]`;
- render all fields in the exact RWS02 order;
- use the approved `IntakeWorkspaceShell`;
- use the same `intake-form`, field, spacing, scrolling, and responsive presentation established by Greenfield/RWS01;
- render help text from the shared definition without inventing new explanatory copy;
- mark required fields from the shared definition;
- use the shared field maximums;
- load existing saved values through `getWorkflowIntake`;
- save through `saveWorkflowIntake`;
- show bounded error/feedback state in the left intake region;
- provide **Back to Workflows** through the shell header action area;
- place the existing embedded ChatGPT/`FigmaBrowserPanel` supplied by App in the shell companion region.

Do not render Workflow IDs, SourceBaseline IDs, route provenance, raw Project State records, or service/debug metadata in the normal intake UI.

### Feature and Issue progression

Preserve existing progression without redesigning the next workspace:

- after a saved Feature intake, retain the existing **Prepare Feature Assessment** action and existing Feature planning service transition;
- after a saved Issue intake, retain the existing **Prepare Issue RCA** action and existing Issue planning service transition.

These are bounded continuation actions only. The resulting Feature Assessment and Issue RCA workspaces remain provisional and are not redesigned in RWS03.

For Refactor/Migration, Integration, Infrastructure, and Research, do not invent a next-stage transition yet. Their saved Intake remains editable in the intake workspace until the next workspace-family card implements their Architect stage.

## Remove alternate intake presentations

Update the provisional planning workspaces so they no longer own Intake UI:

### `FeaturePlanningWorkspace.tsx`

Remove:

- local Feature intake form markup;
- duplicated Feature intake label array;
- renderer calls to the old Feature-specific intake save API.

Keep existing Feature Assessment, Feature Plan, and Work Item Map behavior unchanged.

### `IssueWorkflowPlanningWorkspace.tsx`

Remove:

- local Issue intake form markup;
- duplicated Issue intake field array;
- renderer calls to the old Issue-specific intake save API.

Keep existing Issue evidence/RCA, correction planning, and Work Item Map behavior unchanged.

The generic Workflow intake workspace becomes the only active existing-project Intake renderer.

## Dispatch and browser attachment

Update `workflowPlanningDispatch.ts` so an active Workflow returns an `intake` surface exactly when:

- its type exists in `WORKFLOW_INTAKE_DEFINITIONS`; and
- `currentWorkspace === WORKFLOW_TYPE_REGISTRY[workflowType].entryWorkspace`.

Preserve:

- Feature Assessment/Planning -> Feature planning workspace;
- Issue RCA/Planning -> Issue planning workspace;
- existing Feature/Issue post-plan execution dispatch;
- closed/unsupported states -> generic fallback.

Do not route an unrelated workspace name by suffix or lexical convention.

In `App.tsx`, render `WorkflowIntakeWorkspace` for the new `intake` surface before Feature/Issue planning branches.

Rename the misleading Architect attachment input `featureForeground` to a generic name such as `substantiveWorkflowForeground`, and attach the embedded browser for supported active Workflow-instance surfaces including the new Intake workspace.

Do not introduce a second browser owner.

## IPC / preload boundary

Add bounded Workflow intake handlers to the Workflow application IPC boundary.

Required renderer API:

- `getWorkflowIntake(workflowId)`
- `saveWorkflowIntake(workflowId, payload)`

Validate exact argument count and bounded object shape before service execution.

Retire the renderer-facing intake-save methods:

- `saveFeatureIntake`
- `saveIssueWorkflowIntake`

from `ChampCityApi` and preload after the new generic renderer no longer uses them.

Their underlying service methods remain available internally for the facade; do not remove Feature/Issue planning persistence.

Keep the existing Feature/Issue get/prepare/act/copy APIs required by later provisional stages.

## Shell/CSS boundary

RWS01 shell geometry is authoritative.

Only add CSS needed for the new consumer, principally:

- intake help text;
- allowing the supplied `FigmaBrowserPanel` to fill the companion column.

Do not redesign the shell dimensions, Greenfield styling, theme, breakpoints, field hierarchy, or global workflow chrome.

## Required production areas

Expected new file:

- `src/main/workflow/workflowIntakeService.ts`
- `src/renderer/app/WorkflowIntakeWorkspace.tsx`

Expected modifications:

- `src/shared/workflowIntakeContracts.ts`
- `src/shared/workspaceContracts.ts`
- `src/main/workflow/workflowApplicationIpc.ts`
- `src/preload/index.ts`
- `src/renderer/app/workflowPlanningDispatch.ts`
- `src/renderer/app/architectSurfaceEligibility.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/FeaturePlanningWorkspace.tsx`
- `src/renderer/app/IssueWorkflowPlanningWorkspace.tsx`
- `src/renderer/styles.css`

Modify Feature/Issue planning services only if required to make their internal intake validation consistent with the canonical 4,096-byte bound. Do not alter their assessment/plan behavior.

Update `validation/capability-map.json` only for exact new/changed ownership required by validation classification.

## Preserve

Must not regress:

- RWS01 Greenfield Project Intake visual/functional parity;
- Workflow Hub direct-start and reopen behavior;
- routed Workflow identity/provenance;
- Feature intake persistence semantics;
- Issue intake persistence/evidence semantics;
- Feature Assessment/Plan behavior after leaving intake;
- Issue RCA/Plan behavior after leaving intake;
- SourceBaseline/source-binding behavior;
- Work Intake Routing decision behavior;
- Back to Workflows navigation;
- embedded browser single-owner attachment behavior.

## Forbidden changes

Do not:

- redesign Architect Assessment/RCA or Plan workspaces;
- wire the old generic `workPlanningKernel` back into these Workflows;
- create route-specific intake page layouts;
- copy intake form JSX into six components;
- create a dynamic general-purpose form framework;
- create a new Project State entity type or database table;
- add Markdown/file persistence for intake;
- auto-advance the four newly supported Workflows beyond intake;
- auto-populate from Work Intake routing prose;
- change Workflow type IDs or entry workspace IDs;
- change source-control/Git behavior;
- modify execution, validation, integration, or close mechanics.

## Focused proof

Prefer existing test owners.

### Workflow/persistence proof

Extend `test/workflow/workflow-application-service.test.cjs` (or the existing exact-Workflow service owner if extraction makes that cleaner) to prove:

1. each of the four new Workflow families starts with no saved exact intake;
2. save/read round trip uses the exact Workflow identity and correct field values;
3. required/optional semantics follow RWS02;
4. optional value can be cleared and projects back as omitted;
5. duplicate current Findings are not created by revision;
6. wrong Workflow type, extra field, missing required field, wrong workspace, over-character-limit, and over-UTF-8-byte-limit inputs fail;
7. save does not advance `currentWorkspace`;
8. Feature/Issue generic facade saves are visible through their existing planning service projections.

### IPC/preload proof

Extend the existing Workflow application/planning IPC owner to prove:

- generic get/save renderer argument shapes;
- surplus/missing arguments fail;
- old Feature/Issue renderer intake-save API is no longer exposed;
- existing Feature/Issue later-stage APIs remain exposed.

### Renderer/dispatch proof

Extend `test/renderer/workflow-hub-shell.test.cjs` to prove:

- all six exact entry workspaces dispatch to `intake`;
- Feature assessment/planning and Issue RCA/planning retain current owners;
- wrong-workflow workspace IDs do not gain intake access;
- `WorkflowIntakeWorkspace` renders through `IntakeWorkspaceShell`;
- the correct RWS02 questions appear for at least Migration plus one existing Feature/Issue case;
- optional fields are not marked required;
- Back to Workflows, Save Intake, feedback/error surface, and embedded Architect companion are present;
- active Refactor/Migration no longer falls through to `WorkflowInstanceWorkspace`;
- Architect browser eligibility is generic to supported substantive Workflow foregrounds rather than Feature-only.

Extend the RWS02 registry proof for the corrected 4,096 character / 4,096 UTF-8 byte contract.

Do not create a new permanent test file unless existing owners cannot prove a materially distinct boundary; justify any new file in the Implementer Report.

## Validation

Use an exact changed-path input:

- `npm run validate:plan -- --profile work-item --changes tmp/rws03-changes.json`
- `npm run test:affected -- --changes tmp/rws03-changes.json`

After the composed build, run focused named tests when the receipt does not clearly prove them:

- Workflow application/intake service owner
- Workflow application/planning IPC owner
- `test/project-state/workflow-type-registry.test.cjs`
- `test/renderer/workflow-hub-shell.test.cjs`
- RWS01 Greenfield renderer proof if not selected

Also run:

- `git diff --check`

Do not run full/release qualification.

An Electron launch is appropriate as non-acceptance smoke. Operator visual validation remains required because this card changes user-facing Workflow intake presentation.

## Acceptance criteria

1. Every active direct-start existing-project Workflow entry workspace renders the approved RWS01 `IntakeWorkspaceShell`.
2. Refactor/Migration no longer opens the generic metadata fallback shown in the original defect.
3. All six Workflow types render the exact RWS02 field definitions; no route-specific intake layout exists.
4. Right companion is the existing embedded ChatGPT browser; left side is the intake form; Back to Workflows is in the shell header action area.
5. Feature and Issue retain their existing canonical intake persistence and next-stage transitions.
6. The four missing Workflow families persist/reload exact-Workflow intake in Project State Findings with no duplicate current field records.
7. Saving does not advance the four new Workflows beyond intake.
8. RWS02 limits are corrected to the canonical 4,096 character / 4,096 UTF-8 byte persistence boundary.
9. No renderer caller remains for `saveFeatureIntake` or `saveIssueWorkflowIntake`; new intake UI uses the generic API.
10. Greenfield Project Intake remains unchanged.
11. Assessment/RCA/Plan/execution UI is not redesigned by this card.
12. Focused owned proof passes; unrelated broader failures are reported and not repaired opportunistically.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS03_IMPLEMENTER_REPORT.md`

Report:

- exact baseline/root;
- files changed;
- generic intake facade and persistence ownership;
- Finding category convention used for the four new Workflow types;
- Feature/Issue delegation proof;
- field-limit correction;
- renderer/dispatch/browser changes;
- confirmation Greenfield was not redesigned;
- tests reused/extended/new and any coverage-gap justification;
- exact validation commands/results;
- deviations/blockers;
- remaining Operator visual validation.

## Checkpoint and STOP

Create one attributable checkpoint commit:

`RWS03 place substantive workflow intakes on shared shell`

Then STOP for Architect review and Operator visual validation before beginning the next workspace-family extraction.
