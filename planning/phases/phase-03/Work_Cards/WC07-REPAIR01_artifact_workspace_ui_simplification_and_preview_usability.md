# Repair Work Card: WC07-REPAIR01 — Artifact Workspace UI Simplification and Preview Usability

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC07 — Artifact Review Workspace
Repair ID: WC07-REPAIR01
Created: 2026-07-14
Revision: 2 — tightened UI repair authority after Operator clarification that the defect is existing pane clutter and duplicated information, not merely lack of another cleaner pane.

## Repair Trigger

WC07 received a deferred Operator validation decision. The validation report records that the Operator could not meaningfully validate WC07 because the artifact review workspace was visually confusing, did not make document access obvious, and did not visibly prove that artifact documents were being pulled into the workspace.

Primary source:

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC07_artifact_review_workspace.md`

Supporting sources:

- `planning/phases/phase-03/Work_Cards/WC07_artifact_review_workspace.md`
- `planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC07_artifact_review_workspace.md`
- `planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC07_artifact_review_workspace.md`
- `planning/phases/phase-03/Observation_Register.md`

## Failed Validation Summary

The Operator validation report records:

- Validation Result: `Not Tested`
- Operator Decision: `Deferred - not validated yet`

The report lists these failed WC07 checks:

1. Current routed workspace shows useful artifact context above the route-specific screen.
2. Operator validation routes show Work Card, Implementer Report, Architect Review, and expected Validation Report.
3. Architect review routes show Work Card, Implementer Report, and expected Architect Review output.
4. Artifact labels are readable and full paths do not dominate.
5. Planning Markdown preview works inline and stays read-only.
6. Expected output, source artifacts, and missing evidence are visually distinct.

The report also records these usability failures in plain language:

- The Operator could not tell what information was being displayed.
- It was not clear that artifact documents were actually being loaded for viewing.
- Architect Review could not be clicked/opened in a way that allowed validation.
- Artifact cards became useless because they did not open in a Markdown viewer or open externally.
- The Markdown preview appeared empty or unusably small.
- The UI became a jumbled set of repeated embedded panels.
- Clicking the Work Card Loop action moved the Operator away from the current screen and required `Return to current action` to continue.
- Other action bar clicks did not clearly show different information, or the UI made the change impossible to understand.

## Diagnosis

The WC07 implementation appears to have satisfied some data-model and fixture requirements, but it failed the human UI requirement. The implementation gave the app additional artifact context mechanics, but the visible interface did not make that context understandable or usable.

The core defect is not merely that one button failed. The defect is that the Artifact Review Workspace lacks a disciplined information architecture. It added more surfaces instead of creating one clear place where the Operator can inspect artifacts while preserving the current workflow context.

## Non-Negotiable UI Correction

The existing WC07 UI already has too many panes, repeated artifact summaries, duplicated current-action information, and competing places that appear to show the same context.

The repair must **remove, consolidate, or collapse existing duplicate information**. It must not add a new pane beside the existing clutter. It must not solve the problem by embedding another window inside the current window. It must not create another copy of source evidence, route metadata, expected output, or current-action summary in a different location.

The expected result is a simpler UI than the failed WC07 implementation, not a more elaborate UI.

## Repair Goal

Replace the confusing artifact-review presentation with a simple, constrained, Operator-readable artifact workspace.

Human goal:

The Operator should be able to answer these questions in under five seconds:

1. What artifact am I looking at?
2. Is it the Work Card, Implementer Report, Architect Review, Validation Report, Repair artifact, source evidence, missing evidence, or expected output?
3. Can I preview or open it?
4. Where is the current routed action?
5. Am I still on the current action, or am I only looking at supporting information?

## Required UI Structure

Do not invent a new complex UI pattern. Implement a clear artifact workspace with this structure:

### 1. Single artifact review area

The center workspace must have one obvious artifact review area. Do not create multiple competing panels that repeat the same source evidence, expected output, route metadata, current-action title, Work Card ID, or artifact list.

Required behavior:

- There must be exactly one primary artifact list for the current route.
- There must be exactly one primary preview/details area for the selected artifact.
- Current-action summary remains in the existing current-action panel, not repeated across multiple center panels.
- Expected output appears once in the artifact workspace.
- Source artifacts appear once in the artifact workspace.
- Missing evidence appears once in the artifact workspace.
- Path details may be hidden behind details controls, but the same path list must not appear in several UI regions.

Acceptable structure:

- A top artifact context header.
- A single artifact list grouped by role.
- A large readable preview/details pane.
- A clear route-specific action area or tab.

Unacceptable structure:

- Multiple nested embedded windows.
- Duplicate artifact lists in more than one place.
- Duplicate current-action summaries in the left panel and multiple center panels.
- Duplicate expected-output blocks.
- Duplicate source-evidence blocks.
- Tiny preview panes that cannot be read.
- Artifact cards that look clickable but do nothing.
- Artifact context scattered between left panel, center workspace, route screen, and hidden details with no clear hierarchy.

### 2. Duplicate information removal rule

Before adding new UI, remove or consolidate existing duplicate UI.

If the same information is already visible in the current-action panel, the artifact workspace may reference it briefly but must not reproduce the full panel content.

If the same artifact appears in more than one artifact group, pick one group and explain its role there. Do not show the same artifact repeatedly unless there is a clear, distinct purpose that is visible to the Operator.

If a supporting screen already shows blank or confusing content, do not rely on that screen as the primary artifact review method. The artifact workspace must provide the useful current-action artifact context directly.

### 3. Artifact list must be explicit and grouped

The artifact list must clearly show these groups when applicable:

- Expected Output
- Work Card
- Implementer Report
- Architect Review
- Validation Report
- Repair Artifacts
- Source Evidence
- Missing Evidence
- Other Support

The groups must be visually distinguishable. Source artifacts, missing evidence, and expected output must not be blended together.

### 4. Artifact cards must have working actions

Every artifact card must clearly indicate one of the following:

- `Preview` — safe Markdown preview is available.
- `Open supporting screen` — existing app screen is the available viewing method.
- `Not previewable` — the file type cannot currently be previewed.
- `Missing` — the artifact is expected but not available.

If an artifact cannot be previewed, the UI must say why in plain language. Do not show a button that appears to open something but does nothing.

### 5. Markdown preview must be usable

If Markdown preview is supported, it must be visibly usable.

Minimum requirements:

- The preview pane must be large enough to read on a normal desktop window.
- Selecting a previewable Markdown artifact must visibly load content.
- Empty preview states must explain whether no artifact is selected, the artifact is not previewable, loading failed, or the artifact is missing.
- The preview must show the selected artifact label and path context.
- The preview must remain read-only.

Do not hide the preview behind a tiny embedded window. Do not create a preview area that is technically present but visually useless.

### 6. Route-specific screen must not disappear or be confused with artifact preview

The current routed workflow screen must remain accessible, but it should not be buried under repeated artifact panels.

Acceptable approaches:

- A clear two-tab structure: `Artifacts` and `Current action form`.
- A split layout where one pane is artifact list/preview and one pane is the current action form, if both remain readable.
- A large artifact review workspace with a clear button or tab back to the current-action form.

The Operator must always know whether they are looking at artifact evidence or the form/screen used to complete the current action.

### 7. Process/action bar clicks must not create confusing context switches

Clicking the Work Card Loop / process rail must not dump the Operator into a different confusing screen without clear context.

If a click opens a support/reference view, the UI must clearly say:

- This is support/reference only.
- The current action has not changed.
- Use `Return to current action` to go back.

However, WC07 should reduce the need to use process/action bar navigation for artifact review. The required Work Card, Implementer Report, Architect Review, validation, repair, and expected-output artifacts should be visible in the Artifact Review Workspace itself.

## Carried-Forward Observations Included

### PH03-OBS-003 — Source Evidence should not show full raw paths

- Source: `planning/phases/phase-03/Observation_Register.md`
- Included because: WC07 artifact review must use readable labels and functional preview/open affordances instead of raw path walls.
- Acceptance impact: Full paths may exist under details, but they must not be the primary UI label.

### PH03-OBS-004 — Supporting screens are reachable but not populated

- Source: `planning/phases/phase-03/Observation_Register.md`
- Included because: WC07 must prevent blank artifact workspace states when current-action artifact context exists.
- Acceptance impact: Current-action artifact context must populate the workspace even if route-specific screens remain imperfect.

### PH03-OBS-006 — Work Card Loop needs artifact access during validation

- Source: `planning/phases/phase-03/Observation_Register.md`
- Included because: WC07 must expose Work Card, Implementer Report, Architect Review, validation records, repair records, and expected output during validation/review routes.
- Acceptance impact: Operator validation must allow the Operator to inspect those artifacts without hunting through blank supporting screens.

## Out Of Scope

- Do not implement WC08-WC15.
- Do not build a full document management system.
- Do not add unrestricted renderer filesystem access.
- Do not add browser automation, Playwright, provider SDKs, database, cloud service, authentication, MCP, connector, deployment, or release features.
- Do not redesign the entire app shell.
- Do not replace the current-action router.
- Do not mutate durable workflow state through artifact preview or support navigation.
- Do not create Operator validation records.
- Do not close Phase 03.
- Do not merge to `dev`.
- Do not push to `master`.

## Acceptance Criteria

- The center workspace has one clear artifact review area, not a jumble of duplicated embedded panels.
- The repair removes, consolidates, or collapses existing duplicated artifact/context surfaces.
- It is visually obvious that the repaired UI has fewer competing artifact/context panels than the failed WC07 implementation.
- Artifact groups are visually clear and include expected output, source artifacts, missing evidence, Work Card, Implementer Report, Architect Review, validation, and repair artifacts where applicable.
- Artifact labels are readable and do not use full paths as the primary display.
- Full paths are available only as secondary details.
- Previewable Markdown artifacts visibly load in a readable pane.
- Non-previewable artifacts clearly say they cannot be previewed.
- Missing artifacts clearly say they are missing.
- Operator validation routes visibly expose Work Card, Implementer Report, Architect Review, and expected Validation Report when present.
- Architect review routes visibly expose Work Card, Implementer Report, and expected Architect Review output when present.
- Repair validation routes visibly expose parent Work Card, failed validation, repair Work Card, repair Implementer Report, and expected repair validation output when present.
- Expected output, source artifacts, and missing evidence are visually distinct and not duplicated in multiple locations.
- Previewing artifacts remains read-only and does not save, approve, validate, repair, or advance workflow state.
- Process/action bar navigation remains support-only and does not become workflow authority.
- WC04 current-action panel remains primary.
- WC05 support-navigation behavior remains intact.
- WC06 left-to-right workflow guide remains intact.
- WC08-WC15 behavior does not appear prematurely.
- WC07-REPAIR01 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run the approved normal Windows validation lane.
- Run TypeScript/type validation and build validation.
- Run WC07 artifact workspace focused fixture validation if maintained or updated.
- Run current-action-only fixture validation if affected.
- Run WC04/WC05/WC06 preservation fixtures if affected.
- Add or update a focused assertion that the artifact workspace does not render duplicate primary artifact lists or duplicate expected/source/missing sections.
- Run local safety scans before staging.
- Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC07-REPAIR01_artifact_workspace_ui_simplification_and_preview_usability.md`

The report must include:

- repair branch name;
- implementation summary;
- files changed;
- what duplicate or competing panes were removed, consolidated, or collapsed;
- how the artifact workspace UI was simplified;
- how duplicate source evidence, expected output, missing evidence, and current-action displays were avoided;
- how artifact grouping is displayed;
- how readable labels replaced raw path-dominant display;
- how Markdown preview usability was fixed;
- how non-previewable and missing artifacts are explained;
- how Operator validation, Architect review, and repair validation routes expose the required artifacts;
- how current-action router authority is preserved;
- how WC04/WC05/WC06 behavior was preserved;
- confirmation WC08-WC15 were not implemented;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Repair Work Card:
WC07-REPAIR01 — Artifact Workspace UI Simplification and Preview Usability

Base branch:
feature/phase-03-wc07-artifact-review-workspace

Target repair branch:
feature/phase-03-wc07-repair01-artifact-ui-simplification

Expected remote:
ChampCityChris/ChampCity_AI

Use this Repair Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC07-REPAIR01_artifact_workspace_ui_simplification_and_preview_usability.md

Implement only WC07-REPAIR01.

Do not implement WC08-WC15.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Repair the WC07 artifact workspace so it is usable by a human Operator. The current implementation may have data plumbing, but the visible UI is too confusing to validate.

The existing WC07 UI already has too many panes and duplicated information. Do not add another pane. Do not embed another window. Remove, consolidate, or collapse duplicate artifact/context surfaces and replace the failed implementation with one clear artifact review workspace.

Before editing:
1. Confirm current repo and remote.
2. Confirm the base branch is available:
   feature/phase-03-wc07-artifact-review-workspace
3. Create and switch to:
   feature/phase-03-wc07-repair01-artifact-ui-simplification
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read this WC07-REPAIR01 Work Card.
7. Read the failed WC07 validation report.
8. Read WC07 Work Card, Implementer Report, and Architect Review.
9. Read planning/phases/phase-03/Observation_Register.md.
10. Inspect WorkflowRouterShell, artifactReviewWorkspace model, preview IPC, current-action routing, support navigation, and Human Validation screen.

Required repair:
- Build one clear artifact review area.
- Remove, consolidate, or collapse duplicate/competing artifact and context panels that already exist.
- Do not add another nested pane or embedded window.
- Make artifact groups readable and role-based.
- Make artifact preview or non-previewable/missing state explicit.
- Make Markdown preview large enough and visibly populated when a previewable artifact is selected.
- Avoid duplicate source evidence, expected output, missing evidence, and current-action summary displays.
- Keep current routed action accessible without burying it in nested panels.
- Keep process/action bar clicks support-only.
- Preserve WC04/WC05/WC06 behavior.

Final response must include:
- pushed repair branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.
