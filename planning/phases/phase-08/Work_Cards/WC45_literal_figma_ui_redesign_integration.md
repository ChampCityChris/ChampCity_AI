<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC45"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR03_review_validation_workspace_layout_and_document_viewer.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Literal Figma UI Redesign Integration",
    "status": "approved_for_implementation",
    "executionMode": "one bounded renderer redesign integration pass",
    "sourceDesignBundle": "Redesign UI for Electron App.zip",
    "sourceDesignBundleSha256": "49d153333d20f67e31f1a2f1fb28cb3d6ef514511a307b67c3f318da2d087e4d",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC45_literal_figma_ui_redesign_integration.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Integrate the Operator-supplied Figma source bundle literally into the ChampCity A/I renderer while wiring existing production state, IPC/preload APIs, document rendering, embedded browser behavior, Codex execution, advisory review, validation, and repair flows into the new design. The Implementer may adapt names and data bindings only to connect real source behavior; they may not redesign the UI or replace the product workflow.",
    "reviewedAt": "2026-08-03"
  }
}
CHAMPCITY-METADATA -->

# WC45 — Literal Figma UI Redesign Integration

Status: Approved for Implementer execution  
Git mutation: prohibited

## Verified Repository Evidence

The supplied design bundle was inspected before this card was written.

Uploaded source bundle:

```text
Redesign UI for Electron App.zip
SHA-256: 49d153333d20f67e31f1a2f1fb28cb3d6ef514511a307b67c3f318da2d087e4d
Size: 3,135,041 bytes
```

The bundle contains 66 files. The visible design is concentrated in:

```text
src/app/App.tsx
src/styles/theme.css
src/styles/index.css
src/styles/fonts.css
src/styles/tailwind.css
src/styles/globals.css
```

The bundle also contains generated support files:

```text
src/app/components/figma/ImageWithFallback.tsx
src/app/components/ui/*.tsx
src/imports/ChampCityAI.pdf
package.json
postcss.config.mjs
vite.config.ts
pnpm-workspace.yaml
ATTRIBUTIONS.md
guidelines/Guidelines.md
default_shadcn_theme.css
```

The uploaded `src/app/App.tsx` defines the actual Figma visual shell and screen patterns through these components and sections:

```text
WebviewPanel
Sidebar
PipelineNav
LoopNav
ScreenHeader
StatusPill
ActionBtn
DocViewer
StatusPanel
InfoGrid
Card
EmptyDocSlot
DocSelectSlot
ScreenIntake
ScreenDocChat
ScreenPhaseMap
ScreenWCSelection
ScreenBuild
ScreenReview
ScreenClose
ScreenRepair
App
```

The uploaded `src/app/App.tsx` imports only:

```text
react
lucide-react
```

It does not import the uploaded shadcn/Radix/MUI component files, `ChampCityAI.pdf`, React Router, MUI, or the PDF import. The bundle `package.json` lists many dependencies, but most are not used by the visible source. Current ChampCity A/I already has React, Vite, Tailwind, TypeScript, Electron, and `lucide-react`.

The current ChampCity A/I production renderer was inspected. It currently routes real application state through:

```text
src/renderer/main.tsx
src/renderer/app/App.tsx
src/renderer/styles.css
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/ExecutionContextDashboard.tsx
src/renderer/app/WorkCardIntakeWorkspace.tsx
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/renderer/app/WorkCardReportReviewWorkspace.tsx
src/renderer/app/phaseMapPresentation.tsx
src/renderer/app/workCardPlanPresentation.tsx
src/shared/workspaceContracts.ts
src/shared/workspaces/documentWorkspace.ts
src/shared/workspaces/projectRailPresentation.ts
src/preload/index.ts
src/main/main.ts
```

The current renderer has real production wiring that must be preserved:

- workspace selection and project selection;
- lifecycle rail projection;
- current-workflow model loading;
- document inventory and document reading;
- project intake submission;
- Architect-output handoff preparation, copy, polling, and review;
- embedded ChatGPT browser attachment and resize behavior;
- Work Card intake generation;
- Implementer Build / Codex execution status, start, and cancel;
- Review & Validation advisory prompt copy, Operator validation decisions, and validation-record authority;
- repair, validation, close, and current-disposition routes;
- all IPC/preload contracts.

The current implementation has many accumulated Phase 08 changes in a dirty worktree. This card authorizes a renderer redesign integration only; it does not authorize unrelated cleanup, lifecycle redesign, Git mutation, or non-renderer authority changes.

## Objective

Replace the current ChampCity A/I renderer presentation with the Operator-supplied Figma design while preserving the existing production application behavior.

The result must look and feel like the uploaded design, but it must operate against real ChampCity A/I source data and actions rather than the generated Figma fixtures.

This is a literal integration card, not a redesign card.

## Runtime Sequence

```text
existing selected project and repository evidence
→ renderer loads current workspace model, document inventory, execution context, browser status, and Codex status through existing APIs
→ new Figma-derived layout renders project/phase/work-card navigation, sidebar context, workspace body, document previews, embedded ChatGPT pane, Codex build pane, and Review & Validation pane
→ Operator uses the redesigned UI to run the same application actions
→ existing IPC/preload/main services perform state transitions and persistence
→ Operator-visible result matches the supplied Figma visual design while preserving current lifecycle authority
```

Failure path:

```text
missing design source, compile failure, missing real production binding, broken document loading, broken browser attachment, or broken workflow action
→ implementation remains incomplete
→ no fallback legacy screen is accepted as completion
→ no alternate authority, dummy data, placeholder fixture, or hard-coded project state may be used to mask the failure
```

## Required Changes

### 1. Treat the supplied zip as a required implementation input

The Implementer must use the exact Operator-supplied source bundle:

```text
Redesign UI for Electron App.zip
SHA-256: 49d153333d20f67e31f1a2f1fb28cb3d6ef514511a307b67c3f318da2d087e4d
```

If the bundle is not available to the Implementer, implementation must stop and report the missing input. Do not recreate the design from screenshots, memory, or interpretation.

The Implementer must copy or extract the design source into a temporary working location as needed, but only production source that is actually used by the integrated renderer should be committed to the application source tree.

### 2. Install the Figma visual shell literally

Use the uploaded `src/app/App.tsx` as the visual source of truth for the new application shell.

The integrated renderer must adopt these concrete design elements from the uploaded source:

- compact top application strip;
- two-row navigation system: project pipeline row plus phase/work-card loop row;
- left sidebar with selected project and execution context;
- dark card styling, small uppercase metadata labels, compact typography, and thin borders;
- stage/status pills and loop-tab behavior;
- document + embedded ChatGPT split screens;
- Implementer Build screen pattern;
- Review & Validation screen pattern;
- Repair and Close / Next screen patterns;
- compact document preview and status card patterns.

Do not ask the Implementer to invent an alternate design. Do not redesign the supplied layout. Adapt only as required to connect the real application state and to fit the existing Electron renderer structure.

### 3. Replace Figma fixtures with real ChampCity data

The uploaded design contains static constants such as `STAGES`, `WC_LOOP_TABS`, `PHASE_LOOP_TABS`, `PHASE_LIST`, and `PROJECT`. These are visual scaffolding only.

Replace their data source with existing production projections:

```text
workspaceDefinitions
NestedWorkflowRail / rail status projections
getCurrentWorkspaceModel()
executionContext
workspace selection
listDocuments()
readDocument()
architectOutput workspace models
workCardBuildingReview projection
Codex execution model
Review & Validation projection and decision state
```

Static strings from the Figma source may remain only as labels or fallbacks. They must not become authoritative project, phase, work-card, report, disposition, path, or validation data.

### 4. Preserve existing application actions

All existing production user actions must remain available through the redesigned UI:

```text
choose project
clear project
refresh
submit project intake
prepare/copy Architect handoff
review Architect output
prepare Work Card intake handoff
create Implementer Report
run Codex Implementer
cancel Codex run
copy advisory review prompt
Validate Passed
Request Repair
create repair handoff/card path through existing flow
create validation attempt only where legacy path still applies
close Work Card / phase / project where applicable
read and switch documents
show/hide or attach embedded ChatGPT where applicable
```

Do not remove production capability because it is not represented in a static Figma fixture. Incorporate it into the closest matching supplied design pattern.

### 5. Preserve current authority model

Do not change lifecycle authority.

Preserve:

- Formal Work Card approval and report registration;
- Implementer Build as Codex execution only;
- Review & Validation as Operator authority with advisory ChatGPT review;
- Validation Record as pass-or-repair authority;
- Implementer Report as evidence only;
- repair creation from RevisionRequested Validation Record;
- Approved Validation Record as close/next evidence;
- no ChatGPT advisory output as disposition authority;
- no Codex execution state as disposition authority;
- no Git operation by ChampCity A/I.

### 6. Integrate embedded browser behavior into the design

The uploaded design includes a `WebviewPanel` visual pattern. It must be wired to the existing embedded ChatGPT browser attachment mechanism rather than implemented as a fake webview.

Use the existing browser attachment coordinator, measurement, retry, status, show/hide, and resize behavior. The design component may provide the shell/header/visual chrome, but the underlying browser surface remains the current production embedded-browser mechanism.

Do not create another browser service, WebSocket client, DOM automation layer, ChatGPT login flow, credential path, or provider integration.

### 7. Integrate document viewing into the design

The uploaded design includes `DocViewer`, document tabs, status cards, and document/chat split patterns. These must be wired to current production document loading:

```text
listDocuments()
readDocument(logicalDocumentId)
classifyPlanningDocument()
selectedDocumentId
selectedDocument
readError
freshness/read status where available
```

For Review & Validation, Implementer Report must remain selected by default and document switching must display the selected document in the visible pane.

Do not use Figma fixture document bodies except inside tests or story-like examples. Real repository documents must render in the running application.

### 8. Dependency boundary

Do not blindly install the uploaded bundle dependency list.

Authorized dependency decision:

- `react`, `react-dom`, `vite`, `tailwindcss`, and `lucide-react` already exist or are already part of the application.
- The uploaded visible `src/app/App.tsx` imports only `react` and `lucide-react`.
- No MUI, Radix, shadcn, carousel, chart, router, form, or drag/drop dependency may be added unless the Implementer proves the integrated production source imports it and no local implementation can preserve the supplied design without it.

Do not copy unused dependency lists from the Figma bundle into `package.json`.

Do not import Google Fonts or add a remote font fetch. Preserve the visual font intent using existing local/system font stacks unless a local packaged font is already available. Never commit external font binaries.

### 9. Asset boundary

Do not commit `src/imports/ChampCityAI.pdf` unless it is actually referenced by the integrated renderer. The inspected uploaded `src/app/App.tsx` does not reference it.

Do not add screenshots, archives, generated PDFs, build output, or source bundle copies to production source unless explicitly required and documented. If the supplied design source is staged for reference, it must be placed under a clearly non-runtime design-source path and excluded from production imports.

### 10. Testing requirements

Update tests to prove real production behavior through the redesigned UI surface.

Required proof must include:

- renderer source and/or rendered-markup tests showing Figma-derived navigation shell, sidebar, loop rows, and screen regions are present;
- document selection still loads current repository document bodies;
- embedded ChatGPT attachment still uses existing production attachment mechanism;
- Architect-output workspace actions still prepare/copy/review through existing APIs;
- Implementer Build still exposes Codex status/run/cancel from the existing APIs;
- Review & Validation still exposes advisory prompt copy and Operator Validate Passed / Request Repair decisions;
- global placeholders from the old generic layout do not appear in redesigned workspaces where they were removed;
- current workflow and document classification tests continue to pass;
- no renderer-supplied command, path, prompt, report ID, or Work Card ID is introduced.

Source-string tests may support wiring, but at least the key visual shell and major workspace surfaces must be proven through rendered component output or equivalent renderer-level tests.

## Preserved Behavior

Preserve unchanged:

- main-process lifecycle services;
- IPC and preload API names and argument boundaries unless a renderer-only adapter is necessary;
- canonical Markdown persistence;
- document freshness and disposition semantics;
- Architect-output runtime and review behavior;
- Codex SDK execution behavior;
- embedded browser security and attachment behavior;
- Review & Validation Operator-authority model;
- repair/validation/close workflow;
- package scripts;
- no Git operations.

## Authorized Surface

```text
src/renderer/main.tsx
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/ExecutionContextDashboard.tsx
src/renderer/app/WorkCardIntakeWorkspace.tsx
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/renderer/app/WorkCardReportReviewWorkspace.tsx
src/renderer/app/phaseMapPresentation.tsx
src/renderer/app/workCardPlanPresentation.tsx
src/renderer/app/figma/*
src/renderer/app/design-system/*
src/renderer/styles.css
src/renderer/styles/*
src/shared/workspaces/projectRailPresentation.ts
test/renderer/*.test.cjs
test/app-shell/app-shell.test.cjs
test/repository/runtime-wiring-source.test.cjs
test/workflow/current-execution-context.test.cjs
package.json
package-lock.json
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC45_literal_figma_ui_redesign_integration.md
```

Use `src/renderer/app/figma/*` or `src/renderer/app/design-system/*` only for extracted reusable visual components from the supplied bundle. Keep production source organized enough for future maintenance, but do not turn this into a broad refactor.

Changes outside this surface are not expected. If a narrow adjacent change is necessary to preserve real production behavior, document the reason and proof in the Implementer Report.

## Risks and Constraints

The supplied design source is a generated Figma/Vite prototype. It contains static fixtures and unused generated component/dependency material. The risk is that a literal copy would create a fake app. The required implementation is literal visual integration with real data bindings, not a static prototype replacement.

This card deliberately authorizes renderer redesign breadth. It does not authorize lifecycle, persistence, or service redesign.

## Acceptance Criteria

1. The running renderer uses the supplied Figma visual shell: compact top strip, two-row navigation, left sidebar, card styling, compact metadata labels, and dark theme proportions.
2. The app no longer primarily renders the previous generic ChampCity layout for current workspaces; redesigned surfaces are the normal production UI.
3. All visible lifecycle/workspace navigation is driven by current production workspace state, not Figma static fixture state.
4. The left sidebar displays real selected project and execution-context data from current production projections.
5. Document-centered workspaces render real repository document bodies and can switch documents using real logical document IDs.
6. Embedded ChatGPT panes use the existing production browser attachment and resize mechanism inside the Figma-derived visual shell.
7. Architect-output workspaces still prepare, copy, poll, and review through the existing production APIs.
8. Implementer Build still uses the existing Codex SDK execution status/start/cancel APIs and does not introduce a new command path.
9. Review & Validation still uses advisory ChatGPT plus Operator Validate Passed / Request Repair decisions, with Validation Record authority unchanged.
10. Repair and Close / Next paths remain reachable and use existing production actions.
11. No static Figma project, phase, work-card, report, disposition, or path fixture is used as application authority.
12. No unused Figma dependencies are added. Any added dependency is justified by an actual production import and tested build necessity.
13. The uploaded PDF and unused generated assets are not committed or imported unless actually required by the integrated renderer.
14. No external font fetch is introduced.
15. No lifecycle authority, persistence writer, IPC/preload command boundary, Codex auth boundary, or embedded-browser service is redesigned.
16. Positive tests prove the redesigned shell and major workspace surfaces render with real production data; negative tests prove old generic placeholders and static fixture authority are absent.
17. Typecheck, TypeScript build, Vite build, focused renderer tests, current workflow tests, and complete Node test lane pass in the approved normal Windows environment.
18. No Git operation occurs.

## Negative Constraints

Do not:

- redesign the supplied Figma UI;
- replace the product with a static Figma prototype;
- hard-code Revisionary, MVP-01, MVP-01-WC01, report paths, phase counts, or dispositions as production state;
- install the full uploaded dependency list without actual imports and proof;
- add MUI, Radix, router, chart, form, carousel, drag/drop, or shadcn dependencies unless strictly required by integrated source;
- import remote Google fonts;
- commit font binaries;
- commit the uploaded PDF unless used by production source;
- remove or bypass existing IPC/preload contracts;
- create new lifecycle authority;
- alter Codex execution, authentication, or command boundary;
- alter embedded-browser security or create another browser service;
- alter canonical document persistence;
- perform Git operations.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/
IMPLEMENTER_REPORT_WC45_literal_figma_ui_redesign_integration.md
```

The report must include:

- verification that the supplied design bundle was available, including SHA-256 comparison;
- list of design files copied, adapted, or intentionally not used;
- every created and modified file;
- dependency changes and justification for each added dependency;
- exact mapping from Figma source components to production renderer components;
- proof that static fixtures were replaced with real production data;
- proof that existing IPC/preload, browser, Codex, validation, repair, and document flows still work;
- rendered UI/test evidence for the redesigned shell and key workspaces;
- commands run, working directory, exit codes, and result summaries;
- any scope expansion and why it was necessary;
- Operator validation remaining;
- residual risks.

## Manual Validation

After Architect approval, the Operator must validate the running Electron app:

1. Confirm the application visually matches the supplied Figma design at normal desktop size.
2. Confirm the project pipeline row, phase loop row, and work-card loop row operate with real current workflow state.
3. Confirm the left sidebar shows real selected project and execution context.
4. Confirm document workspaces show real documents and document switching is visible.
5. Confirm embedded ChatGPT panes attach and resize correctly in the redesigned shell.
6. Confirm Implementer Build can run/cancel Codex exactly as before.
7. Confirm Review & Validation preserves advisory ChatGPT and Operator validation authority.
8. Confirm Repair and Close / Next still work from the redesigned UI.
