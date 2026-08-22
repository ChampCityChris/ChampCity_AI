<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC50"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC49_project_planning_first_handoff_enablement.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC49_project_planning_first_handoff_enablement.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Phase Map First-Handoff Surface Restoration",
    "status": "approved_for_implementation",
    "executionMode": "bounded workflow-hardening Work Card, not a repair pass",
    "confirmedDefect": "After Project Planning completes, the Phase Map rail correctly reaches Ready, but the Phase Map workspace renders only the special Phase Map document/review surface and excludes the embedded browser/action surface. With no Phase Map handoff yet, the Operator has no visible Prepare/Copy Handoff path even though the backend already has generatePhaseMapHandoff(...).",
    "rootCause": "src/renderer/app/App.tsx special-cases project-phase-map out of the generic architect-output document/chat workspace and also excludes it from architectBrowserWorkspaceAvailable. The special Phase Map renderer is correct and must remain, but the renderer composition removed the common browser/action pane that exposes the existing handoff controls.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC50_phase_map_first_handoff_surface_restoration.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Workflow hardening: preserve the special Phase Map renderer while restoring embedded browser and Prepare/Copy Phase Map Handoff actions for the first Phase Map handoff path.",
    "reviewedAt": "2026-08-08"
  }
}
CHAMPCITY-METADATA -->

# WC50 — Phase Map First-Handoff Surface Restoration

Status: Approved for Implementer execution  
Phase: `phase-08`  
Work Card type: workflow hardening, not a repair  
Git mutation: prohibited

## Confirmed Defect

After Project Planning completes, the Phase Map rail reaches `Ready`, but the Phase Map workspace does not expose the handoff controls required to create the first Phase Map handoff.

Operator-visible evidence:

```text
Project Intake: Completed
Architect Interview: Completed
Project Planning: Completed
Phase Map: Ready

Phase Map workspace body:
- Shows special Phase Map document card.
- Shows "No Phase Map selected".
- Does not show embedded ChatGPT browser.
- Does not show Browser Actions.
- Does not show Prepare Phase Map Handoff.
- Does not show Copy Phase Map Handoff.
```

Current `ChampCity_PDL` project evidence confirms the workspace is correctly ready for Phase Map handoff generation:

```text
planning/project/Project_Intake/PROJECT_INTAKE_pocket_decision_log.md
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_pocket_decision_log.md
planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_pocket_decision_log.md
planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_pocket_decision_log.md
planning/project/PROJECT_PROFILE.md
planning/project/Project_Roadmap/PROJECT_ROADMAP_pocket_decision_log.md
```

Current missing downstream Phase Map artifacts are expected in the first-handoff state:

```text
planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_pocket_decision_log.md
planning/project/Phase_Map/PHASE_MAP_pocket_decision_log.md
```

This must be a ready-to-prepare state, not a dead workspace.

## Source Evidence

The backend already owns a controlled Phase Map handoff-generation path:

```text
src/main/phaseMap/phaseMapService.ts
- generatePhaseMapHandoff(workspaceRoot)
  - requires current Approved Project Profile
  - requires current Approved Project Roadmap
  - writes planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_<projectSlug>.md
  - prepares/reuses the Phase Map draft submission

src/main/architectOutputs/architectOutputWorkspaceService.ts
- prepareArchitectOutputHandoff(..., "project-phase-map") routes to generatePhaseMapHandoff(workspaceRoot)
```

The renderer currently blocks the visible path:

```text
src/renderer/app/App.tsx

const isPhaseMapFigmaWorkspace =
  activeWorkspaceId === "project-phase-map";

const architectBrowserWorkspaceAvailable =
  (isVisibleArchitectOutputWorkspace && !isPhaseMapFigmaWorkspace) || isWorkCardReportReview;

...

{isPhaseMapFigmaWorkspace ? (
  <FigmaPhaseMapWorkspace ... />
) : null}

{isVisibleArchitectOutputWorkspace && !isPhaseMapFigmaWorkspace ? (
  <generic document/chat workspace with FigmaBrowserPanel and FigmaBrowserActionsPanel />
) : null}
```

The special Phase Map workspace is necessary and should not be removed. The defect is that the special workspace does not compose in the common embedded browser/action column.

## Root Cause

Phase Map is a valid Architect-output workflow with a backend handoff generator, but the renderer routes `project-phase-map` into a special document/review-only surface and excludes it from the shared embedded browser/action pane.

The special Phase Map renderer is not itself wrong. The renderer composition is wrong:

```text
special Phase Map renderer retained
+ embedded browser/actions omitted
= no visible first-handoff path
```

## Objective

Restore the Phase Map first-handoff path while preserving the Phase Map-specific renderer.

Required outcome:

```text
Approved Project Profile exists
+ Approved Project Roadmap exists
+ no Phase Map handoff exists
→ Phase Map rail remains Ready
→ Phase Map special renderer remains visible
→ embedded browser/action column is visible beside the special renderer
→ Prepare Phase Map Handoff is visible and enabled
→ clicking it calls the existing generatePhaseMapHandoff path
→ PHASE_MAP_ARCHITECT_HANDOFF_<projectSlug>.md is created
→ Copy Phase Map Handoff becomes available
→ copied instruction includes the literal bound MCP workspaceId and temporary Phase Map draft path
```

## Non-Goal

This Work Card does not change Phase Map semantics, Phase Map validation, Phase Map JSON schema, Project Planning, Project Profile, Project Roadmap, Architect Interview, Phase Interview, Phase Planning, Work Card loops, Codex behavior, MCP workspace route derivation, or Git behavior.

Do not rewrite the Phase Map backend unless a narrowly required bug is confirmed while implementing this card.

## Required Runtime Sequence

### First Phase Map handoff

```text
Project Planning is complete:
- Project Profile exists, readable, fresh, and Approved.
- Project Roadmap exists, readable, fresh, and Approved.

Phase Map handoff is missing:
- planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_<projectSlug>.md does not exist.

Application behavior:
→ Phase Map rail/status remains Ready.
→ Phase Map workspace renders the special Phase Map document/review surface.
→ Embedded browser/action column is available on the same workspace.
→ Prepare Phase Map Handoff is enabled.
→ Copy Phase Map Handoff is disabled until preparation.
→ Operator clicks Prepare Phase Map Handoff.
→ app calls existing prepareArchitectOutputHandoff(..., "project-phase-map") path.
→ generatePhaseMapHandoff(workspaceRoot) writes the deterministic Approved Phase Map handoff.
→ Phase Map draft submission is prepared/reused.
→ Copy Phase Map Handoff becomes enabled.
```

### Copy Phase Map handoff

```text
Current Approved Phase Map handoff exists
+ Phase Map output is not present
→ Copy Phase Map Handoff returns the prepared instruction
→ instruction includes current Approved Project Profile path/revision
→ instruction includes current Approved Project Roadmap path/revision
→ instruction includes current generated Phase Map handoff path
→ instruction includes the temporary Phase Map body-only draft path under planning/Architect_Drafts/...
→ instruction includes literal bound workspaceId
→ instruction does not include workspace inference, workspace search fallback, or <resolved workspace ID>
```

### Existing/reusable Phase Map handoff

```text
Current Approved Phase Map handoff already exists
+ no Phase Map output exists
→ Phase Map workspace continues to show the embedded browser/action column
→ Prepare Phase Map Handoff may be idempotent
→ Copy Phase Map Handoff remains available or becomes available after re-prepare
```

### Review path

```text
Phase Map output exists and is reviewable
→ Phase Map special renderer/review panel remains available
→ Operator can apply Phase Map disposition through existing review flow
```

## Required Changes

### 1. Preserve special Phase Map renderer

Do not route Phase Map back through the generic document-review column. Preserve `FigmaPhaseMapWorkspace` and any Phase Map-specific presentation/review behavior.

The desired layout is a hybrid surface:

```text
<section Phase Map workspace>
  <left column>
    FigmaPhaseMapWorkspace
    Phase Map review/disposition panel when reviewable
  </left column>

  <right column>
    FigmaBrowserPanel
    FigmaBrowserActionsPanel
      Reload ChatGPT
      Prepare Phase Map Handoff
      Copy Phase Map Handoff
      Refresh
      Retry Browser when applicable
  </right column>
</section>
```

### 2. Restore embedded browser availability for Phase Map

Adjust renderer composition so `project-phase-map` can attach/show the embedded Architect browser when the Architect pane is visible.

The implementation must not leave this exclusion in effect for the Phase Map handoff path:

```text
architectBrowserWorkspaceAvailable excludes isPhaseMapFigmaWorkspace
```

The Implementer may refactor the boolean names if needed, but behavior must be clear and tested.

### 3. Restore visible handoff actions for Phase Map

Use the existing generic Architect-output handlers for Phase Map:

```text
onPrepareHandoff={prepareArchitectOutputFromAction}
onCopyHandoff={copyArchitectHandoff}
```

For `activeWorkspaceId === "project-phase-map"`, labels must be Phase Map-specific:

```text
Prepare Phase Map Handoff
Copy Phase Map Handoff
```

Do not create a new Phase Map-specific backend IPC path unless the existing generic route is proven insufficient. The existing backend route through `prepareArchitectOutputHandoff(..., "project-phase-map")` should remain the default path.

### 4. Preserve backend Phase Map handoff contract

The generated Phase Map handoff must continue to use the existing deterministic path:

```text
planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_<projectSlug>.md
```

Required handoff metadata remains:

```text
artifactType: generated-handoff
participationRole: nonReviewHandoff
documentDisposition.status: Approved
workflowData.handoffKind: phase-map
workflowData.contractId: phase-map-output-submission-v1
workflowData.phaseMapTarget: planning/project/Phase_Map/PHASE_MAP_<projectSlug>.md
workflowData.requiredTitle: Phase Map
workflowData.requiredDomainBlocks includes champcity-phase-map
workflowData.repositoryAuthority.projectRepository inherited from Project Profile/Roadmap source revisions
sourceRevisions include current Project Profile and Project Roadmap revisions
```

### 5. Preserve Phase Map draft ingestion and review behavior

Do not bypass the existing draft path/promotion pipeline.

The copied Phase Map handoff must still instruct ChatGPT to create only a temporary body-only draft:

```text
planning/Architect_Drafts/.../phase-map.md
```

ChampCity A/I must remain owner of:

```text
- final canonical Phase Map target
- canonical metadata
- source revisions
- validation
- promotion
- cleanup
- review state
```

## Required Code Areas To Inspect And Adjust

The Implementer must inspect and, where necessary, adjust the complete affected path:

```text
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/shared/workspaceContracts.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/phaseMap/phaseMapService.ts
src/main/phaseMap/phaseMapDraftOutput.ts
src/main/integrations/mcpWorkspacePromptContract.ts
src/main/main.ts
src/preload/index.ts
test/renderer/figma-redesign-shell.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/phase-map/phase-map-service.test.cjs
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/architect-outputs/architect-output-workspace-repair.test.cjs
```

If source inspection proves a listed file does not require modification, the Implementer Report must state that.

## Required Preservation

Preserve all of the following:

```text
- Phase Map special renderer remains the Phase Map document/review surface.
- Phase Map backend generatePhaseMapHandoff(...) remains the first handoff creation path.
- Phase Map prompt contract remains body-only temporary draft creation.
- Phase Map validation still requires exactly one champcity-phase-map fenced JSON block in the body.
- Project Planning completion remains the prerequisite for Phase Map readiness.
- WC48 Architect Interview finalization gate remains intact.
- WC49 Project Planning first-handoff enablement remains intact.
- REPAIR17 projectRepository-owned workspace route remains intact.
- Bound workspaceId examples remain valid, including ChampCity_PDL → champcity_pdl.
- No Git mutation.
```

## Forbidden Changes

The Implementer must not:

```text
- Remove or bypass FigmaPhaseMapWorkspace.
- Replace the Phase Map special renderer with the generic document-review column.
- Create Phase Map output directly during handoff preparation.
- Write final canonical Phase Map content from ChatGPT.
- Skip generation of the Phase Map handoff Markdown.
- Add a second Phase Map handoff format.
- Add hidden local state as authority for Phase Map readiness.
- Reintroduce workspace inference, workspace search, <PROJECT_REPO>, or <resolved workspace ID> fallback into copied handoffs.
- Change Project Profile or Project Roadmap approval semantics.
- Change Phase Interview or Phase Planning routing.
- Add external services, provider SDKs, databases, authentication, or Git mutation.
```

## Acceptance Criteria

The implementation passes only if all criteria below are satisfied.

1. With current Approved Project Profile and Project Roadmap present, and no Phase Map handoff or Phase Map output present, the Phase Map workspace remains Ready.

2. In that first-handoff state, the Phase Map special renderer remains visible.

3. In that first-handoff state, the embedded browser/action surface is visible when the Architect pane is visible.

4. `Prepare Phase Map Handoff` is visible and enabled in the first-handoff state.

5. `Copy Phase Map Handoff` is visible but disabled before preparation, unless the existing architecture intentionally auto-prepares on copy; either behavior must be deterministic and tested.

6. Clicking Prepare Phase Map Handoff uses the existing generic Architect-output prepare path and calls the existing Phase Map backend handoff generator.

7. Preparation writes `planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_<projectSlug>.md`.

8. The generated handoff has `artifactType=generated-handoff`, `participationRole=nonReviewHandoff`, `documentDisposition.status=Approved`, `workflowData.handoffKind=phase-map`, and `contractId=phase-map-output-submission-v1`.

9. The generated handoff sourceRevisions include the current Project Profile and Project Roadmap revisions.

10. The generated handoff workflowData preserves repositoryAuthority inherited from upstream planning documents.

11. After preparation, Copy Phase Map Handoff is enabled.

12. The copied Phase Map handoff instruction includes a temporary Phase Map draft path under `planning/Architect_Drafts/`.

13. The copied Phase Map handoff instruction includes the literal bound workspaceId for the selected project, including `champcity_pdl` for `ChampCity_PDL`.

14. The copied Phase Map handoff instruction does not include `diagnostics_toolbox.list_workspaces`, workspace inference/search fallback, `<PROJECT_REPO>`, or `<resolved workspace ID>` placeholders unless an existing approved Phase Map prompt contract explicitly requires diagnostics-only confirmation. If diagnostics text remains, the Implementer Report must justify why and prove no fallback/inference is present.

15. Existing Phase Map review/disposition behavior still works when Phase Map output exists.

16. Existing WC48 and WC49 tests remain valid.

17. Project Intake, Architect Interview, Project Planning, Phase Interview, Phase Planning, Work Card, validation, and repair flows remain unaffected.

## Required Tests

Add or update focused tests that prove at least these scenarios:

```text
Scenario A — renderer composition
Given activeWorkspaceId is project-phase-map
When the Phase Map workspace renders
Then the source still renders FigmaPhaseMapWorkspace
And it also renders FigmaBrowserPanel/FigmaBrowserActionsPanel or an equivalent embedded browser/action column for Phase Map.

Scenario B — first Phase Map handoff action labels
Given project-phase-map is active
Then the renderer uses labels:
- Prepare Phase Map Handoff
- Copy Phase Map Handoff

Scenario C — first Phase Map handoff backend path
Given Approved Project Profile and Approved Project Roadmap
And no Phase Map handoff exists
When prepareArchitectOutputHandoff(root, "project-phase-map") is called
Then the deterministic Phase Map handoff Markdown is created
And the prepared instruction becomes copyable.

Scenario D — Phase Map instruction route
Given a ChampCity_PDL project repository authority
When the Phase Map handoff instruction is copied
Then it contains workspaceId champcity_pdl
And it contains the temporary Phase Map draft path.

Scenario E — special renderer preservation
Given Phase Map output exists and is reviewable
Then the Phase Map special review/disposition path remains available and is not replaced by the generic review surface.
```

## Validation Commands

The Implementer must run applicable validation lanes and report exact commands/results:

```text
npx tsc --noEmit
npx tsc
node --test --test-concurrency=1 test/phase-map/phase-map-service.test.cjs
node --test --test-concurrency=1 test/architect-outputs/architect-output-prompt-contracts.test.cjs
node --test --test-concurrency=1 test/architect-outputs/architect-output-workspace-repair.test.cjs
node --test --test-concurrency=1 test/renderer/figma-redesign-shell.test.cjs
node --test --test-concurrency=1 test/renderer/project-rail-presentation.test.cjs
node --test --test-concurrency=1
npx vite build
```

If sandbox execution hits known `EPERM` or `spawn EPERM` behavior, rerun in the normal Windows lane and report both attempts exactly.

## Manual Validation After Codex

After implementation and Architect review, the Operator must verify in the built app:

```text
1. Use a project with Completed Project Planning and no Phase Map handoff.
2. Open Phase Map.
3. Confirm the Phase Map-specific document/review surface is still visible.
4. Confirm embedded ChatGPT/browser/action surface is visible beside it.
5. Confirm Prepare Phase Map Handoff is enabled.
6. Click Prepare Phase Map Handoff.
7. Confirm PHASE_MAP_ARCHITECT_HANDOFF_<projectSlug>.md is created under planning/project/Architect_Handoffs/.
8. Confirm Copy Phase Map Handoff becomes available.
9. Copy the handoff and confirm it contains champcity_pdl for the Pocket Decision Log project.
10. Confirm it contains the temporary Phase Map draft path.
11. Confirm Phase Map draft creation and promotion continue through the existing temporary-draft workflow.
```

## Implementer Report Requirement

Create the Implementer Report at:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC50_phase_map_first_handoff_surface_restoration.md
```

The report must include:

```text
- repository verification
- files changed
- implementation summary
- before/after Phase Map workspace behavior
- proof that FigmaPhaseMapWorkspace remains
- proof that embedded browser/action controls are restored for Phase Map
- generated Phase Map handoff metadata proof
- copied Phase Map handoff route proof
- test commands and results
- deviations, if any
- remaining Operator validation steps
```

## Remaining Passes For Phase

After WC50, return to Operator validation of the Pocket Decision Log workflow unless new evidence identifies a separate bounded workflow-hardening card.
