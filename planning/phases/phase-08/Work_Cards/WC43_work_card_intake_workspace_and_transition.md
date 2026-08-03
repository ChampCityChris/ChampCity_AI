<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC43"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC37_phase_planning_workspace_and_atomic_bundle_cutover.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC40_simultaneous_seven_flow_architect_output_product_cutover.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC42_work_card_plan_structured_review_and_architect_ui_consistency.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC41_domain_specific_architect_handoff_prompt_contracts.md",
      "revision": 4
    }
  ],
  "workflowData": {
    "title": "Work Card Intake Workspace and Automatic Planning Transition",
    "status": "approved_for_implementation",
    "executionMode": "one bounded intake-workspace product correction",
    "dependsOn": [
      "WC42"
    ],
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43_work_card_intake_workspace_and_transition.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Replace the generic empty Work Card Intake surface with one selected-candidate intake workspace, generate the application-owned non-review handoff through the existing action, and transition immediately to Formal Work Card Planning. Do not add another authority or review gate.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# WC43 — Work Card Intake Workspace and Automatic Planning Transition

Status: Approved for Implementer execution  
Git mutation: prohibited

## Confirmed Defect

Operator validation reached `Phase → Work Cards → Work Card Intake` after approval of the Phase Planning bundle. The backend correctly selected `MVP-01-WC01` and authorized generation of its Work Card Intake handoff, but the renderer displayed the generic lifecycle surface:

- generic current-step banner;
- generic `Run Current Handoff Action` button;
- empty document list;
- empty canonical-document preview;
- stale prior disposition feedback;
- `Document workflow not yet implemented` placeholder.

Work Card Intake is not a review workspace and does not require ChatGPT. It is an application-owned transition:

```text
Approved Phase Planning bundle
→ select next eligible canonical Work Card candidate
→ generate one Approved non-review Work Card Intake handoff
→ move to Formal Work Card Planning
```

The generic action handler also refreshes the current model after generation without navigating to the newly resolved `work-card-planning` workspace, so the UI can remain on the completed intake step.

## Objective

Provide one dedicated, readable Work Card Intake workspace that shows the exact selected candidate, generates the existing application-owned handoff, and immediately advances the Operator to Formal Work Card Planning.

Do not create a document disposition, approval, Architect-output definition, embedded ChatGPT surface, or additional authority gate for Work Card Intake.

## Required Changes

### 1. One canonical Work Card Intake projection

Expose one optional read-only Work Card Intake projection on the existing `CurrentWorkspaceModel` only when `activeWorkspaceId=work-card-intake`.

The projection must be derived from the same `selectNextWorkCardCandidate()` result and canonical Work Card Plan metadata used by `generateWorkCardIntakeHandoff()`.

Include:

```text
phaseId
sourceWorkCardPlanPath
selectionReason
candidate.candidateId
candidate.order
candidate.title
candidate.purpose
candidate.dependsOn
candidate.resolutionStatus
candidate.resolutionReason
candidate.evidencePaths
candidate.carriedForwardToPhaseId when present
handoffMarkdownPath
formalWorkCardMarkdownPath
```

Use one shared context/path resolver so preview and write execution cannot drift. Do not duplicate candidate selection, slug, or target-path logic in the renderer.

### 2. Dedicated Work Card Intake workspace

When the active workspace is `work-card-intake`, render one dedicated workspace instead of the generic `CurrentActionPanel` and generic document list/preview.

Display:

- phase ID and phase title;
- candidate order and candidate ID;
- candidate title;
- complete purpose;
- dependencies, or `None`;
- planned/resolution status and resolution reason;
- selection eligibility explanation;
- evidence paths;
- source Work Card Plan path;
- exact intake-handoff target;
- exact Formal Work Card target.

The presentation must clearly state that the handoff is application-generated and non-review. No disposition is required at this step.

### 3. One explicit action

Replace the generic label:

```text
Run Current Handoff Action
```

with one primary action:

```text
Generate Work Card Intake Handoff
```

Use the existing `currentWorkflow:generateHandoff` route and existing `generateWorkCardIntakeHandoff()` production service. Do not add another IPC/preload action.

The button must:

- be disabled while the action is running;
- use the established application button style;
- expose an accurate accessible label;
- show an actionable local error when generation fails;
- never create a second handoff through repeated in-flight activation.

### 4. Advance immediately to Planning

After successful generation:

```text
refresh repository documents
→ refresh CurrentWorkspaceModel
→ require the next resolved workspace to be work-card-planning
→ transition the UI to Planning
→ allow the existing Formal Work Card Prepare/Copy workflow to take over
```

Do not leave the Operator on Work Card Intake after the handoff exists.

If the post-action model does not resolve to `work-card-planning`, remain on Work Card Intake and display the exact inconsistency instead of silently navigating elsewhere.

### 5. Remove irrelevant generic content

The Work Card Intake workspace must not render:

- an empty document list;
- `Select a document`;
- canonical Markdown `Waiting`;
- `Document workflow not yet implemented`;
- disposition or review controls;
- embedded ChatGPT;
- stale feedback from a prior workspace action.

The generated intake handoff may become repository evidence for the next Planning workspace, but it is not an Operator review target.

## Preserved Behavior

Preserve unchanged:

- candidate selection order and dependency rules;
- canonical Work Card Plan metadata as candidate authority;
- planned, deferred, superseded, already-satisfied, and carried-forward semantics;
- candidate completion derived from Approved validation evidence;
- existing Work Card Intake handoff path, artifact type, identity, source revisions, workflow data, Approved disposition, and non-review role;
- exact Formal Work Card target construction;
- Formal Work Card Architect-output definition, prompts, promotion, review, and disposition;
- nested workflow rails and execution-context dashboard;
- no hidden active-workspace persistence;
- no Git operation.

## Authorized Surface

```text
src/main/workCardIntake/workCardIntakeService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardIntakeWorkspace.tsx
src/renderer/styles.css
test/work-card-intake/work-card-intake-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-intake-workspace.test.cjs
test/renderer/document-review-surface-source.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43_work_card_intake_workspace_and_transition.md
```

A narrow existing renderer helper/test update is authorized only when required to prove automatic transition without duplicating production logic.

Do not modify main-process IPC registration, preload contracts, Architect-output catalog, Formal Work Card definition, document disposition services, or canonical writer behavior.

## Acceptance Criteria

1. `CurrentWorkspaceModel` exposes the exact selected-candidate intake projection only for `work-card-intake`.
2. Projection and handoff generation use one shared selection/path context with no duplicated slug or target logic.
3. Work Card Intake renders the selected candidate purpose, dependencies, resolution details, evidence, source plan, and exact output paths.
4. The workspace clearly identifies the handoff as application-generated and non-review.
5. The only primary action is `Generate Work Card Intake Handoff`.
6. The action uses the existing `currentWorkflow:generateHandoff` route and existing persistence service.
7. Successful generation creates the same Approved `work-card-intake-handoff` artifact and exact Formal Work Card target as before.
8. Successful generation automatically transitions the renderer to `work-card-planning`.
9. Failed generation remains on Work Card Intake and shows the exact error.
10. Work Card Intake renders no empty document browser, canonical preview, disposition control, placeholder message, or embedded ChatGPT.
11. Previously displayed feedback from another workspace is not shown on the intake surface.
12. Formal Work Card Planning behavior remains unchanged after transition.
13. Static rendered-markup tests exercise the production Work Card Intake component; source-string checks alone are insufficient.
14. Typecheck, TypeScript build, Vite build, focused tests, and complete Node tests pass in the approved normal Windows environment.
15. No Git operation occurs.

## Negative Constraints

Do not:

- add an approval or disposition step to Work Card Intake;
- make the generated handoff a gating review document;
- add an Architect-output catalog entry for Work Card Intake;
- add embedded ChatGPT to this workspace;
- add a new IPC or preload route;
- parse Work Card Plan Markdown in the renderer;
- invent or edit candidates;
- alter candidate completion or dependency semantics;
- add hidden navigation state, route tokens, sidecars, or marker files;
- add dependencies;
- use Playwright;
- perform Git operations.

## Implementer Report Requirements

Create:

```text
planning/phases/phase-08/Implementer_Reports/
IMPLEMENTER_REPORT_WC43_work_card_intake_workspace_and_transition.md
```

Report:

- every changed file;
- the exact projection fields and their source authority;
- proof that preview and generation share one context/path resolver;
- rendered workspace evidence;
- successful generate-and-transition evidence;
- failed-action behavior;
- confirmation that no disposition, Architect-output, IPC, preload, candidate, path, metadata, or persistence behavior changed;
- focused and complete validation commands and results;
- any unresolved responsive or accessibility issue.

## Manual Validation

After Architect approval, Operator validation must confirm:

1. Work Card Intake displays the selected candidate rather than an empty document workspace.
2. The candidate purpose, dependencies, evidence, and target paths are readable.
3. The action is labeled `Generate Work Card Intake Handoff`.
4. One activation generates the intake handoff and moves directly to Planning.
5. Planning opens the existing Formal Work Card Prepare/Copy workspace for the same candidate.
