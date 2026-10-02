# RWS04C — Activate Structured Intake and Generated Markdown Review UI

**Status:** IMPLEMENTER_READY  
**Depends on:** RWS04A and RWS04B accepted  
**Type:** Intake-family production cutover / generated projection / renderer parity  
**Baseline:** use current `dev` after accepted RWS04B.

## Objective

Activate Structured Project State as Intake authority for all seven substantive Workflow types while preserving the approved Greenfield Intake UX:

- questions/form on the left;
- generated Intake Markdown on the right;
- Document Disposition beneath the form;
- top Workflow stage rail above the workspace.

Markdown is derived review material only. Save and review mutate SQL.

## 1. Generated Markdown projection

Create a dedicated **derived projection writer**, not the legacy canonical Markdown writer.

It must be allowed regardless of `project_state_authority` because it never claims state authority.

Do not weaken `legacyCanonicalWriteFence.ts`.

### Paths

For existing-project Workflows:

`planning/workflows/<workflowId>/Intake/WORKFLOW_INTAKE_<workflowType>.md`

For Project Creation/Greenfield, preserve the existing familiar Project Intake path when one exists; otherwise use the existing Greenfield path convention.

### Projection content

Generated Markdown must contain a conspicuous machine-generated header, for example:

`<!-- GENERATED FROM CHAMPCITY STRUCTURED PROJECT STATE — DO NOT EDIT AS AUTHORITY -->`

Then render:

```markdown
# <Workflow label> Intake: <Workflow title>

## <Field label>
<value or Not provided.>
```

Include a bounded generated metadata comment sufficient to identify:

- WorkflowIntake entity ID;
- Intake recordVersion;
- Workflow ID/type;
- effective structured disposition;
- generated timestamp.

This metadata is projection identity only. It is not a canonical Markdown governance block.

Manual file edits never flow back into SQL.

### Materialization semantics

After structured Intake save/review:

1. commit SQL mutation first;
2. regenerate the Markdown projection from the committed SQL state;
3. projection write failure must not roll back or rewrite canonical SQL state;
4. return/report projection materialization failure explicitly.

Use atomic contained file replacement and deterministic path validation.

## 2. Keep generated files out of legacy authority discovery

Generated Intake projections must not be reinterpreted as legacy canonical planning authority.

Update planning-document discovery/classification so the generated projection marker/path is excluded from legacy canonical corpus decisions.

Do not broadly hide unrelated Markdown.

## 3. Review-document adapter

Return a renderer review projection from SQL with the shape needed by `FigmaDocumentCard`:

- generated filename/path;
- generated Markdown body;
- effective disposition mapped to Pending/Approved/RevisionRequested/Rejected;
- no dependence on global selected-document state.

The card displays structured state rendered as Markdown, not repository-file state read back as authority.

## 4. Existing-project Intake renderer

Update `WorkflowIntakeWorkspace`:

- continue using `IntakeWorkspaceShell`;
- left side uses the existing RWS02 field definitions;
- right side = `FigmaDocumentCard` using structured review projection;
- no embedded ChatGPT in Intake;
- before first save: standard “No document yet” state;
- after Save: generated Markdown appears immediately;
- after document exists: render shared `FigmaDocumentDispositionPanel`;
- Apply Review calls structured Workflow Intake review API;
- a local edit after approval disables next-stage continuation until Save + current-revision approval.

Feature Assessment and Issue RCA buttons require current approved Intake revision.

Other four existing-project Workflows remain at Intake after approval until their Architect-stage workspaces are built.

## 5. Greenfield Project Intake cutover

Port the approved Greenfield `ProjectIntakeWorkspace` to the same structured Intake API.

Preserve its visible form, field order, labels, repository chooser, layout, disposition panel and top rail.

Remove Greenfield Intake authority from `projectIntakeService.ts`.

The old Greenfield canonical Intake Markdown path becomes generated projection output after migration/cutover.

Do not change Architect Interview UI in this card.

## 6. Renderer/API cleanup

After all Intake callers use structured service:

- retire renderer-facing legacy Project Intake submit/persistence APIs that are no longer needed;
- remove Intake browser attachment from App eligibility;
- keep browser attachment for Architect Interview/Assessment/RCA and later applicable workspaces;
- keep RWS03-R01 `WorkflowStageRail` unchanged;
- keep `IntakeWorkspaceShell` generic.

Do not delete historical legacy Markdown or old Findings.

## 7. Structured authority marker

Do **not** set `project_state_authority=structured` merely because Intake has migrated.

That marker remains the final project-wide legacy-writer cutoff and can only be selected when every still-authoritative legacy Markdown workflow family has been migrated.

Intake is SQL-authoritative independently of that final marker.

## Architecture docs

Update:

- `RENDERER_WORKSPACE_UI_UX_REBASELINE_2026-09-30.md`
- relevant Structured Project State/source-control architecture text

to record:

```text
Intake form -> SQL WorkflowIntake -> generated Markdown projection -> Operator review -> SQL Decision
```

and:

```text
Intake right pane = Markdown review projection
Architect workspaces right pane = embedded ChatGPT where applicable
```

## Required production areas

Expected:

- structured Workflow Intake IPC/preload contracts;
- derived Markdown projection writer/service;
- `WorkflowIntakeWorkspace.tsx`;
- `ProjectIntakeWorkspace.tsx`;
- `App.tsx`;
- `architectSurfaceEligibility.ts`;
- planning-document discovery/classification only as needed to exclude generated projection authority;
- legacy Project Intake API/service surfaces only as required to retire authority.

Do not modify source-control, execution, Assessment/RCA UI, planning topology, validation, or close workflows.

## Existing-project behavior

On first access to an Intake:

- if structured Intake exists: use it;
- if not, invoke the RWS04B exact-Workflow ensure/migration;
- if migration is ready: migrate and render structured state;
- if no legacy state: show empty form;
- if blocked: preserve legacy source and show a precise migration blocker.

Thus existing Projects are supported. They are not required to be recreated.

## Focused proof

### Derived projection

Prove:

1. SQL save creates/revises WorkflowIntake and then materializes Markdown;
2. deleting generated Markdown and refreshing regenerates identical semantic content from SQL;
3. editing generated Markdown does not change SQL;
4. review Decision changes SQL disposition and regenerated projection;
5. Intake revision invalidates prior approval and projection returns Pending;
6. projection writer works even when synthetic `project_state_authority=structured` is selected;
7. legacy canonical writer remains fenced in the same synthetic state.

### Renderer

Prove for Greenfield plus Refactor/Migration and one Feature/Issue case:

- same shared Intake shell;
- Markdown review card on right;
- disposition panel only after Intake exists;
- no Intake ChatGPT pane;
- approved current revision gates next stage;
- unsaved/revised content disables continuation;
- top rail unchanged.

### Migration

Reuse RWS04B migration proof. Add only activation-path assertions required by this card.

## Validation

- `npm run validate:plan -- --profile work-item --changes tmp/rws04c-changes.json`
- `npm run test:affected -- --changes tmp/rws04c-changes.json`
- focused renderer / Workflow Intake / Greenfield / projection tests;
- `git diff --check`.

Do not run full/release qualification.

Operator visual validation is required.

## Operator validation

Validate at least:

### Refactor / Migration

1. open Intake;
2. existing RWS03 values migrate/populate;
3. right pane initially/currently shows generated Markdown;
4. Save changes SQL and refreshes Markdown;
5. Approve via Document Disposition;
6. edit/save again -> approval becomes stale/Pending;
7. no embedded ChatGPT appears in Intake.

### Greenfield

1. open Project Intake;
2. visible form/layout remains unchanged;
3. legacy Intake migrates or current structured Intake loads;
4. right pane displays generated Markdown;
5. disposition is SQL-backed;
6. Architect Interview preparation still consumes the approved structured Intake.

## Acceptance criteria

1. All seven substantive Intake families are SQL-authoritative.
2. Markdown is generated/rebuildable and never an authority source.
3. Operator disposition is an exact-record-version SQL Decision.
4. Existing Projects migrate lazily when unambiguous; blocked legacy ambiguity is preserved and reported.
5. Greenfield and existing-project Intake use the same approved review interaction pattern.
6. Intake has no embedded ChatGPT.
7. RWS03-R01 top rail remains intact.
8. Legacy global Markdown fence remains intact.
9. `project_state_authority` is not prematurely advanced.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS04C_IMPLEMENTER_REPORT.md`

Report migration activation, projection semantics, retired APIs, visual scope, test ownership, exact validation, blockers/deviations.

## Checkpoint and STOP

Commit:

`RWS04C activate structured intake and generated review projection`

Then STOP for Architect review and Operator validation before beginning the Architect Assessment/RCA workspace family.
