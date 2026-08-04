<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC45-REPAIR01",
    "repairId": "WC45-REPAIR01",
    "parentWorkCardId": "WC45"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC45_literal_figma_ui_redesign_integration.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC45_literal_figma_ui_redesign_integration.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR04_operator_validation_decision_workspace_transition.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Updated Figma UI Design Source Integration",
    "status": "approved_for_implementation",
    "executionMode": "one bounded updated Figma renderer integration repair",
    "parentWorkCardId": "WC45",
    "previousSourceDesignBundle": "Redesign UI for Electron App.zip",
    "previousSourceDesignBundleSha256": "49d153333d20f67e31f1a2f1fb28cb3d6ef514511a307b67c3f318da2d087e4d",
    "sourceDesignBundle": "Redesign UI for Electron App(1).zip",
    "sourceDesignBundleSha256": "49d138047aecee972294f1231d459d5d40cafe96dfc88af4eceb5fec5f960ce5",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC45-REPAIR01_updated_figma_ui_design_source_integration.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Integrate the updated Operator-supplied Figma source bundle literally over the existing WC45 renderer integration. Main required updates are redesigned workspace screens, dark and light theme support, and the revised side panel. Preserve real ChampCity application behavior and do not redesign from interpretation.",
    "reviewedAt": "2026-08-04"
  }
}
CHAMPCITY-METADATA -->

# WC45-REPAIR01 — Updated Figma UI Design Source Integration

Status: Approved for Implementer execution  
Parent: `WC45`  
Git mutation: prohibited

## Verified Repository Evidence

The first Figma redesign Work Card, `WC45`, integrated the earlier Operator-supplied bundle:

```text
Redesign UI for Electron App.zip
SHA-256: 49d153333d20f67e31f1a2f1fb28cb3d6ef514511a307b67c3f318da2d087e4d
Size: 3,135,041 bytes
File count: 66
```

The current WC45 Implementer Report states that the earlier bundle was integrated through the production renderer without adopting the prototype fixtures, unused shadcn/Radix files, unused PDF, or bundle dependency list. It created or modified the current renderer shell around:

```text
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/figma/FigmaAppStrip.tsx
src/renderer/app/figma/FigmaBrowserPanel.tsx
src/renderer/styles.css
```

The newly supplied design bundle was inspected before this card was written:

```text
Redesign UI for Electron App(1).zip
SHA-256: 49d138047aecee972294f1231d459d5d40cafe96dfc88af4eceb5fec5f960ce5
Size: 3,148,177 bytes
File count: 68
```

Delta from the prior bundle:

```text
Added:
- src/imports/image.png
- src/imports/image-1.png

Changed:
- src/app/App.tsx
- src/styles/theme.css
```

The new uploaded `src/app/App.tsx` grew from the prior bundle's 1,538 lines to 2,341 lines and adds or materially changes these design components and screen patterns:

```text
StageIcon
PipelineNav with icon/status circles
SubPill
SubConnector
PhaseLoopBar
WCLoopBar
Sidebar with pinned Dark / Light theme toggle
IntakeMdViewer
ScreenIntake
ScreenArchitect
DualDocScreen
ScreenPlanning
ScreenPhasePlanning
ScreenPhaseIntake
ScreenDocChat
ScreenPhaseMap
ScreenWCSelection
ScreenBuild
ScreenReview
ScreenClose
ScreenRepair
```

The updated bundle's visible `src/app/App.tsx` imports only:

```text
react
lucide-react
```

It does not import the uploaded shadcn/Radix/MUI component files, PDF, image files, React Router, MUI, or the PDF import. The new image files are present in the bundle but are not referenced by `src/app/App.tsx`.

The updated `src/styles/theme.css` retains tokenized light and dark theme variables. It defines a `.dark` theme and light-theme `:root` defaults. The uploaded `Sidebar` exposes an explicit two-button Dark / Light toggle pinned to the bottom of the side panel.

Current production behavior that must remain wired through the redesign:

- selected workspace and selected project handling;
- document inventory and document reads;
- current workflow model and execution-context projection;
- project intake capture and submission;
- Architect-output handoff preparation, copy, polling, and review;
- embedded ChatGPT browser attachment, resize, retry, hide/show, and reload;
- Work Card Intake generation;
- Implementer Build report creation and Codex run/cancel/status;
- Review & Validation advisory prompt copy and Operator validation decisions;
- validation-record authority and post-decision workspace transition from `WC44-REPAIR04`;
- repair, close, and current-workflow actions;
- all existing IPC/preload contracts.

## Objective

Update the current WC45 renderer integration to the second Operator-supplied Figma design bundle.

The implementation must literally import the visual structure, workspace patterns, side panel, and dark/light theme model from the new bundle while keeping all real ChampCity application data and actions wired to existing production source.

This is not a redesign assignment. The Implementer must not invent a new UI, substitute another navigation model, or preserve the old WC45 visual shell where the new bundle provides an updated pattern.

## Runtime Sequence

```text
existing production renderer state and IPC/preload contracts
→ application loads selected project, current workflow, documents, browser state, Codex state, and validation authority through existing APIs
→ updated Figma-derived shell renders the new compact titlebar, pipeline row, separate phase/work-card loop bars, side panel, theme toggle, and updated workspace screens
→ all static Figma fixtures are replaced with real ChampCity projections and documents
→ Operator uses the redesigned UI to perform the same application actions
→ main-process services persist the same canonical artifacts and workflow transitions
→ Operator-visible result matches the updated Figma bundle while preserving lifecycle authority
```

Failure path:

```text
missing updated bundle, bundle SHA mismatch, build failure, fixture leakage, broken document loading, broken browser attachment, broken Codex control, broken validation decision, or broken workspace transition
→ implementation is incomplete
→ do not mask the failure with old WC45 UI, placeholder text, hard-coded Revisionary fixture values, or fake ChatGPT content
```

## Required Changes

### 1. Use the new bundle as the source of truth

The Implementer must use this exact design source:

```text
Redesign UI for Electron App(1).zip
SHA-256: 49d138047aecee972294f1231d459d5d40cafe96dfc88af4eceb5fec5f960ce5
```

If the bundle is not available to the Implementer, implementation must stop and the Implementer Report must state the missing input. Do not approximate the design from memory, screenshots, or the prior WC45 bundle.

The prior bundle remains evidence only. The production renderer must reflect the newer bundle.

### 2. Integrate the updated visual shell literally

Update the current WC45 renderer shell to match the new uploaded `src/app/App.tsx` patterns.

Required visible updates include:

- compact titlebar using the updated ChampCity AI visual language;
- project pipeline row with `StageIcon` status circles;
- separate `PhaseLoopBar` and `WCLoopBar` rows instead of a generic loop row;
- updated spacing, typography, dark card treatment, uppercase metadata labels, thin borders, and token-driven surface colors;
- redesigned workspace bodies for Intake, Architect Interview, Project Planning, Phase Intake, Phase Planning, Phase Map, Work Card Selection, Implementer Build, Review & Validation, Close / Next, and Repair;
- updated Browser / ChatGPT panel chrome where applicable;
- updated document/status/action card patterns.

Implementer may rename functions and split components to fit the current repository structure, but the visual result must come from the supplied code rather than discretionary redesign.

### 3. Replace all design fixtures with real ChampCity state

The uploaded bundle contains static prototype values such as `PROJECT`, `PHASE_LIST`, `STAGES`, `WC_LOOP_TABS`, `PHASE_LOOP_TABS`, and `DOC_*` fixtures.

Those fixtures are not production data and must not drive runtime behavior.

Map the new visual components to real projections:

```text
selected project name/path -> WorkspaceSelection and projectDisplayName(workspace)
project pipeline statuses -> current workspace model + rail status projections
phase loop state -> CurrentWorkspaceModel.executionContext.phase and active WorkspaceId
work-card loop state -> CurrentWorkspaceModel.executionContext.workCard and active WorkspaceId
document labels/paths/body -> listDocuments(), readDocument(), selectedDocument
workspace status/action text -> CurrentWorkspaceModel fields
browser panel -> existing architect browser attachment state and host ref
Codex build state -> existing CodexImplementerExecutionModel
operator validation controls -> existing applyOperatorValidationDecisionForCurrentWorkCard flow
repair/close actions -> existing current workflow actions
```

No static `Revisionary`, `MVP-01`, `MVP-01-WC01`, fixture repository path, fake report path, fake ChatGPT conversation, or fake validation outcome may appear unless that value is actually read from the selected repository.

### 4. Implement dark and light themes from the bundle

Integrate the updated `src/styles/theme.css` token model into the production renderer.

Requirements:

- support both light and dark theme modes;
- default to dark unless a saved local renderer preference says otherwise;
- apply or remove the `.dark` class at the renderer app root or document root consistently with the supplied CSS;
- expose the uploaded side-panel Dark / Light toggle as a real control;
- persist the Operator's theme selection using a renderer-only mechanism such as `localStorage` under a stable key;
- do not require main-process persistence, schema changes, or settings service changes;
- do not introduce remote font imports or font binaries.

The implementation must ensure existing legacy dark-only styles do not override the new light theme. Any remaining dark-only `text-slate-200`, hard-coded backgrounds, or borders in active screens must be adjusted where they would make light theme unreadable.

### 5. Revamp the side panel from the new bundle

Replace the current WC45 sidebar presentation with the updated bundle's side panel pattern.

Required side panel behavior:

- 185px visual width target from the bundle unless the Implementer proves an Electron layout constraint requires a minor adjustment;
- `Select Project` section with real Choose Project and Clear Project actions;
- `Current Project` from selected workspace state;
- `Current Phase` from execution context, including phase ID, title, position when available, and loop step;
- `Current Work Card` from execution context, including Work Card ID, title, position when available, and loop step;
- pinned bottom Dark / Light theme toggle;
- no static `PROJECT` or `PHASE_LIST` fixture usage.

### 6. Preserve existing behavior and authority

Do not modify main-process lifecycle services unless a narrowly justified renderer binding requires it.

Preserve:

- current project selection and clearing;
- document inventory/read behavior;
- Architect-output review behavior;
- embedded ChatGPT attachment behavior;
- Codex SDK execution behavior;
- Review & Validation advisory-only ChatGPT model;
- Operator-only validation authority;
- Validation Record as durable pass-or-repair authority;
- post-validation transition from `WC44-REPAIR04`;
- repair and close workflow behavior;
- no Implementer Report disposition as normal authority.

### 7. Do not import unused generated code or dependencies

The updated bundle still includes many generated `src/app/components/ui/*.tsx` files and a broad dependency list. Because the visible `src/app/App.tsx` imports only React and `lucide-react`, those generated files and dependency list must not be blindly imported.

Rules:

- no package dependency changes unless a specific imported design component requires it and the Implementer proves it is used by production code;
- do not import or commit unused shadcn/Radix/MUI files;
- do not commit `src/imports/ChampCityAI.pdf` unless production code uses it, which the uploaded App source does not;
- do not commit `src/imports/image.png` or `src/imports/image-1.png` unless production code uses them, which the uploaded App source does not;
- do not add remote Google font imports;
- do not add screenshots, build output, archives, or copied zip files to production source.

### 8. Testing requirements

Add or update renderer tests to prove the new design has actually replaced the old WC45 shell and remains production-bound.

Minimum test proof:

- updated titlebar renders;
- pipeline row renders with status icons derived from real or test-supplied workspace state;
- phase loop row and work-card loop row render separately where appropriate;
- side panel renders real selected project, phase, and Work Card values;
- Dark / Light toggle changes the theme class and persists selection;
- active document content still comes from `readDocument()` data, not `DOC_*` fixtures;
- embedded ChatGPT pane still exposes the real `architect-browser-host` attachment surface;
- Implementer Build still exposes real Codex status/run/cancel bindings;
- Review & Validation still exposes advisory prompt copy and Operator validation decision bindings;
- no static prototype `PROJECT`, `PHASE_LIST`, `DOC_*`, fake ChatGPT conversation, or fake report path drives production rendering;
- no unused Figma dependency list was added to `package.json`.

## Preserved Behavior

Preserve unchanged:

- Electron main/preload IPC contracts;
- current workflow service authority;
- canonical artifact writers;
- Work Card Planning and Repair Architect-output flow;
- Codex SDK/local auth boundary;
- advisory-only Architect review;
- Operator validation authority;
- Validation Record transition behavior;
- repair and close routing;
- no Git operation.

## Authorized Surface

```text
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/ExecutionContextDashboard.tsx
src/renderer/app/figma/FigmaAppStrip.tsx
src/renderer/app/figma/FigmaBrowserPanel.tsx
src/renderer/app/figma/<new narrowly scoped components if needed>
src/renderer/app/WorkCardIntakeWorkspace.tsx
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/renderer/app/WorkCardReportReviewWorkspace.tsx
src/renderer/styles.css
test/renderer/figma-redesign-shell.test.cjs
test/renderer/work-card-building-review-workspace.test.cjs
test/renderer/work-card-report-review-workspace.test.cjs
test/renderer/document-review-surface-source.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/app-shell/app-shell.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC45-REPAIR01_updated_figma_ui_design_source_integration.md
```

A small renderer helper file may be added under `src/renderer/app/figma/` only when it directly carries a component from the supplied updated design. Any added helper must be documented in the Implementer Report.

No main-process, preload, shared schema, persistence, Codex service, validation service, repair service, or package dependency change is expected. If the Implementer believes one is necessary, it must be narrowly justified and tested through the production path.

## Risks and Constraints

This is a renderer integration repair over a dirty Phase 08 worktree. The Implementer must preserve existing uncommitted work and must not revert unrelated WC43/WC44/WC45 changes.

The implementation must not use the new Figma source as a static prototype app. It must behave as ChampCity A/I.

Automated tests can prove binding, fixture absence, and render structure. Final visual equivalence to the design remains Operator validation.

## Acceptance Criteria

1. The implementation verifies the new bundle SHA-256 exactly before integration.
2. The production renderer reflects the second Figma bundle, not the prior WC45 bundle.
3. The redesigned side panel is visible with real Choose Project and Clear Project actions.
4. The side panel shows real current project, phase, and Work Card values from production state.
5. The side panel includes the Dark / Light toggle pinned at the bottom.
6. Dark and light themes both render readable application surfaces using the updated theme tokens.
7. Theme choice persists across renderer reloads using renderer-local persistence.
8. Pipeline navigation renders the updated status-icon design and remains driven by real workspace state.
9. Phase loop and Work Card loop render as separate rows when their lifecycle context is active.
10. Redesigned workspace screens are integrated for Project Intake, Architect Interview, Project Planning, Phase Intake, Phase Planning, Phase Map, Work Card Selection, Implementer Build, Review & Validation, Close / Next, and Repair.
11. Document viewers still render real selected document data and not bundled `DOC_*` fixtures.
12. Embedded ChatGPT still uses the existing browser attachment host and behavior.
13. Codex Build still uses existing status/start/cancel APIs.
14. Review & Validation still uses existing advisory prompt copy and Operator validation decision APIs.
15. Post-validation workspace transition from `WC44-REPAIR04` remains intact.
16. No static prototype values drive runtime behavior unless they match real repository state by coincidence.
17. No unused PDF, image files, shadcn/Radix/MUI components, remote fonts, or broad Figma dependency list are introduced.
18. No main/preload lifecycle authority, persistence writer, Codex service, validation service, or repair service behavior changes without narrow justification.
19. Positive and negative tests cover the updated Figma shell, side panel, theme toggle, real data bindings, fixture absence, document/browser/Codex/review bindings, and dependency restraint.
20. Typecheck, TypeScript build, Vite build, focused renderer tests, and full Node test lane pass in the approved normal Windows environment.
21. No Git operation occurs.

## Negative Constraints

Do not:

- redesign beyond the supplied source;
- approximate the new UI from screenshots;
- keep the old WC45 shell where the new source has changed it;
- use prototype constants as runtime data;
- add broad unused dependencies;
- add PDF/image assets unless used by production code;
- add remote fonts or font binaries;
- break embedded ChatGPT attachment;
- break Codex execution controls;
- break Operator validation authority;
- change main-process lifecycle authority;
- perform Git operations.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/
IMPLEMENTER_REPORT_WC45-REPAIR01_updated_figma_ui_design_source_integration.md
```

The report must map every acceptance criterion to concrete proof and include:

- the observed SHA-256 and size of the new bundle;
- all changed files;
- exact mapping from updated Figma components to production components;
- side panel integration proof;
- dark/light theme integration proof;
- evidence that real production state replaced fixtures;
- evidence that unused generated assets and dependency lists were not imported;
- browser, Codex, Review & Validation, and post-validation transition preservation proof;
- commands and results;
- Operator validation remaining;
- scope expansion and residual risks.

## Manual Validation

After Architect approval, the Operator must validate in the running app:

1. Confirm visual match to the second uploaded Figma design.
2. Confirm side panel layout, Choose/Clear Project actions, current phase/work-card values, and bottom theme toggle.
3. Switch Dark and Light themes and confirm all major workspaces remain readable.
4. Exercise project pipeline, phase loop, and Work Card loop navigation with real current state.
5. Open key redesigned workspaces: Intake, Architect Interview, Project Planning, Phase Intake, Phase Planning, Phase Map, Work Card Selection, Build, Review & Validation, Close / Next, and Repair.
6. Confirm embedded ChatGPT, Codex Build, advisory prompt copy, Operator validation decision, repair, and close behavior still work through existing application authority.
