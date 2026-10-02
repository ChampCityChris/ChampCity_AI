# RWS01 — Extract Intake Workspace Shell and Port Greenfield Project Intake

**Status:** IMPLEMENTER_READY  
**Type:** Renderer architecture / UI extraction  
**Baseline reviewed:** `dev` at `6ef37e55825d55560c3077288ab86a02f2142659`  
**Governing UI direction:** `docs/architecture/RENDERER_WORKSPACE_UI_UX_REBASELINE_2026-09-30.md`

## Objective

Extract the current Greenfield **Project Intake** UI into a reusable `IntakeWorkspaceShell` and move Greenfield Project Intake onto that shell **without redesigning its UI or changing its behavior**.

This card establishes the reusable intake presentation boundary only. It does not add the other Workflow intakes yet.

## Verified current state

Repository review confirms:

- `App.tsx` directly owns the Greenfield Project Intake composition, `ProjectIntakeCapture`, and a duplicate Project Intake disposition panel.
- `styles.css` currently defines the approved intake geometry through `.figma-intake-workspace`: two columns above 1100 px, 40 px gap, independently bounded columns, form-column scrolling, two-column form fields, and the existing single-column responsive collapse.
- Greenfield currently uses `FigmaDocumentCard` as its right-side companion surface. The future shared intake shell must therefore expose a **generic companion slot**; it must not hard-code a document card or ChatGPT browser.
- `NestedWorkflowRail` is global lifecycle navigation and remains outside the intake shell.
- `DocumentChatWorkspaceShell` is a separate document/chat-stage shell and is not the intake-shell implementation.
- Project Intake submission, post-submit document selection/review, and navigation are already owned by existing App/application logic and must not be redesigned in this card.

## Architecture decision

Create two renderer components:

### 1. `IntakeWorkspaceShell.tsx`

A presentation-only reusable shell that owns:

- the workspace-local heading/action row;
- the intake two-column body;
- the left intake/content column;
- the right companion column;
- the current desktop/responsive layout and scroll ownership.

The shell accepts React content through typed props. At minimum it must support:

- heading;
- optional workspace-local header actions;
- left/intake content;
- right/companion content;
- bounded class-name hooks only where needed for specialization.

The shell must contain **no Workflow-specific domain types, no Greenfield-specific labels, and no `window.champcity` calls**.

The companion slot is intentionally generic. Greenfield passes its existing `FigmaDocumentCard`; later cards may supply embedded ChatGPT or another approved companion without changing shell geometry.

### 2. `ProjectIntakeWorkspace.tsx`

Move the current Greenfield Project Intake presentation out of `App.tsx` and compose it through `IntakeWorkspaceShell`.

Move into this component:

- the current Project Intake form presentation;
- the current submission confirmation presentation;
- the current Project Intake document/disposition presentation.

Use the existing `FigmaDocumentDispositionPanel` rather than retaining the duplicate `FigmaProjectIntakeDispositionPanel`. Preserve the current Project Intake disabling semantics by passing the existing local-error/applying state into the shared panel.

`ProjectIntakeWorkspace` receives current values and callbacks from `App.tsx`; it does not take over Electron/API orchestration in this card.

## Greenfield parity contract

After extraction, Greenfield Project Intake must preserve the current approved experience:

- top Project lifecycle rail unchanged;
- heading remains **Project Intake Questionnaire** in the same visual position;
- Project Name;
- Project Purpose;
- Desired Outcome;
- Project Type;
- existing-source/planning checkbox;
- Constraints / Non-Negotiables;
- Project Repository and Choose action;
- conditional repository review context;
- full-width Submit Project Intake action;
- existing post-submit confirmation;
- existing right-side document card and Project Intake review/disposition flow;
- dark/light styling;
- desktop two-column composition and current responsive collapse.

Do not alter wording, field requirement semantics, field order, submission behavior, document review behavior, or navigation.

## CSS boundary

Add/use a shell-owned class such as `.intake-workspace-shell` for the reusable layout while preserving the current Greenfield measurements and behavior.

Do **not** globally repurpose or remove `.figma-intake-workspace` in a way that changes `WorkIntakeWorkspace` or another provisional workspace in this card.

The extracted shell must preserve:

- desktop grid: `minmax(0, 1fr) minmax(360px, 1fr)`;
- 40 px desktop gap;
- 16 px workspace padding;
- left-column vertical scrolling;
- current form field/grid behavior;
- current <=1100 px single-column collapse and 14 px gap.

Do not perform unrelated stylesheet cleanup.

## App.tsx boundary

After this card, `App.tsx` should:

- decide that `project-intake-capture` is active;
- provide current state and callbacks;
- render `ProjectIntakeWorkspace`.

It must no longer contain:

- inline Greenfield Project Intake workspace body markup;
- `ProjectIntakeCapture`;
- `FigmaProjectIntakeDispositionPanel`.

Keep the global Project rail and unrelated workspace routing in `App.tsx`.

## Required production areas

Create:

- `src/renderer/app/IntakeWorkspaceShell.tsx`
- `src/renderer/app/ProjectIntakeWorkspace.tsx`

Modify only as required:

- `src/renderer/app/App.tsx`
- `src/renderer/styles.css`

Reuse:

- `src/renderer/app/FigmaDocumentCard.tsx`
- `src/renderer/app/FigmaDocumentDispositionPanel.tsx`

No main-process, preload, Project State, database, Git/source-control, workflow-domain, or API contract change is authorized.

## Preserve

Preserve unchanged:

- `ProjectIntakeSubmission` contract;
- `submitProjectIntake()` behavior;
- repository chooser/binding behavior;
- `applySuccessfulProjectIntakeSubmission` behavior;
- resolver-driven post-submit selection;
- Project Intake review/disposition authority;
- Project lifecycle rail status/navigation;
- all non-Greenfield workspace behavior.

## Forbidden changes

Do not:

- add Migration, Feature, Issue, Integration, Infrastructure, or Research intake UI in this card;
- create a generic dynamic-form/schema framework;
- change intake questions or prompts;
- move persistence/API authority into the shell;
- call `window.champcity` from `IntakeWorkspaceShell`;
- redesign Greenfield layout or styling;
- rewrite `DocumentChatWorkspaceShell`;
- rebuild provisional Issue/Feature/WIR/Execution workspaces;
- change backend/domain contracts;
- perform broad App.tsx cleanup beyond the extracted Greenfield intake surface.

## Focused proof

Prefer existing test owners.

1. Extend `test/renderer/figma-redesign-shell.test.cjs` to prove:
   - `IntakeWorkspaceShell` renders distinct intake and companion regions;
   - heading and optional action slot render through the shell;
   - Greenfield `ProjectIntakeWorkspace` renders the current fields, submit action, companion document surface, and disposition surface through the shell.
2. Reuse `test/project-intake/post-submit-review-state.test.cjs` unchanged unless extraction requires a narrowly scoped import/presentation update. Its post-submit selection/navigation assertions must remain green.
3. Reuse `test/renderer/project-rail-presentation.test.cjs` unchanged to protect the lifecycle rail boundary.
4. Do not create a new permanent test file unless these owners cannot prove a materially distinct shell contract; if one is added, the Implementer Report must state the exact coverage gap.

## Validation

Create an exact temporary changed-path JSON input and run:

- `npm run validate:plan -- --profile work-item --changes tmp/rws01-changes.json`
- `npm run test:affected -- --changes tmp/rws01-changes.json`

After the build owned by the composed validation lane, run the focused renderer/project-intake tests if they were not all selected by the affected plan.

Also run:

- `git diff --check`

Do not run full/release qualification for this card.

A normal Electron launch may be used as non-acceptance visual smoke. Final visual parity with the approved Greenfield intake remains Operator validation.

## Acceptance criteria

1. Greenfield Project Intake is rendered through `ProjectIntakeWorkspace -> IntakeWorkspaceShell`.
2. Its visible UI and interaction flow remain materially unchanged.
3. The reusable shell owns intake layout; Greenfield content no longer owns its own page geometry.
4. The shell has a generic companion slot and does not hard-code `FigmaDocumentCard`, `FigmaBrowserPanel`, Greenfield semantics, or Electron APIs.
5. `App.tsx` no longer contains the Greenfield intake body, capture component, or duplicate Project Intake disposition panel.
6. Existing submission, post-submit review, resolver navigation, and lifecycle rail behavior remain intact.
7. No other Workflow intake or provisional workspace is redesigned in this card.
8. Work-item validation and `git diff --check` pass.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS01_IMPLEMENTER_REPORT.md`

Report:

- verified baseline/root;
- production files changed;
- extracted shell API and ownership boundary;
- exact Greenfield parity behavior preserved;
- App.tsx code removed/moved;
- focused and composed validation results;
- tests reused unchanged, tests extended, and any new permanent test with coverage-gap justification;
- deviations/blockers;
- remaining Operator visual validation.

## Checkpoint and STOP

Create one attributable checkpoint commit:

`RWS01 extract intake workspace shell and port Greenfield`

Then STOP for Architect review and Operator visual validation before RWS02 defines the remaining Workflow intake contracts/questions.
