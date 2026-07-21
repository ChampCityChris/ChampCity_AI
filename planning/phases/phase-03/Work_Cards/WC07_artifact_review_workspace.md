<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC07_artifact_review_workspace",
  "artifactType": "work_card",
  "createdAt": "2026-07-13T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC07_artifact_review_workspace.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC07_artifact_review_workspace.md",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: WC07 — Artifact Review Workspace"
  },
  "payloadHash": "sha256:f07e0f4216b49335daaf633bd3f709b94fbd7292412a10e99b2c11e2a78af021",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC07",
      "champcity-ai/phase-03/architect_review/WC07-REPAIR01",
      "champcity-ai/phase-03/implementer_report/WC07",
      "champcity-ai/phase-03/operator_validation/WC07"
    ],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Work Card: WC07 — Artifact Review Workspace

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Work Card ID: WC07
Created: 2026-07-13

## Purpose

Tie artifact review and artifact creation to the current workflow step instead of requiring the Operator to manually hunt through disconnected screens, file paths, or action-bar entries.

## Human Goal

The Operator should be able to answer these questions from the current routed workspace:

- What am I supposed to review or create right now?
- Which source artifacts matter for this step?
- What did the Work Card say?
- What did the Implementer Report say?
- What did the Architect Review decide?
- What validation, approval, or repair record is expected next?
- What action can I take from here without losing the routed workflow context?

WC07 should make the workspace useful, not just reachable.

## Background

WC04 made the current-action panel the primary guided surface.

WC05 preserved subordinate navigation as supporting tools while keeping the router authoritative.

WC06 made the full locked workflow visible left to right and preserved support-only step navigation.

The remaining usability gap is that the center workspace still does not reliably present the actual artifacts the Operator needs to inspect at a given step. During WC06 repair validation, the Operator observed that the Work Card Loop action area does not allow practical navigation to see the Work Card, Implementer Report, or Architect Review captured information. That is a direct WC07 concern.

## Source Inputs

Primary sources:

- `planning/phases/phase-03/Work_Card_Plan.md`
- `planning/phases/phase-03/Work_Cards/WC07_artifact_review_workspace.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC06-REPAIR01_current_action_validation_route_after_architect_review.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC05_subordinate_navigation_and_manual_fallback_preservation.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability_2.md`
- Current `WorkflowRouterShell` and current-action routing implementation

Supporting context:

- WC04 current-action panel must remain the primary authority.
- WC05 supporting screens must remain support/reference tools.
- WC06 left-to-right workflow guide must remain view-only and must not become a durable-state mutation surface.

## Problem

The app currently knows the current action and exposes supporting screens, but the center workspace is not yet a reliable artifact review surface.

This causes several related problems:

- The Operator may know that validation is required but still cannot easily inspect the Work Card, Implementer Report, Architect Review, source evidence, or expected validation record from the same routed workspace.
- Full repo-relative paths are noisy and not useful as the primary review affordance.
- Supporting screens can be reachable but blank or disconnected from the current action.
- The app does not yet clearly distinguish source artifacts, draft artifacts, pending decision artifacts, and expected output artifacts inside the workspace.
- The Operator cannot easily tell which artifact is authoritative for the current action versus merely supporting context.

## Scope

Implement an artifact review workspace that is routed by the current action and presents the artifacts relevant to that step.

WC07 is not a full route-specific screen rewrite. It is the workspace layer that makes source artifacts and expected outputs visible, inspectable, and actionable inside the existing WC04/WC05/WC06 shell.

## Required Implementation

### 1. Current-action-driven artifact workspace

The center workspace must derive its primary artifact context from the current-action result, not from arbitrary manual screen selection.

At minimum, when a current action is loaded, the workspace should show:

- current Work Card ID/title when present;
- current phase;
- current workflow step;
- expected output artifact;
- source artifacts grouped by role;
- missing artifacts grouped separately;
- validation, approval, review, or repair context when applicable.

### 2. Artifact role grouping

Source artifacts should be grouped in useful Operator-facing categories, such as:

- Work Card;
- Implementer Report;
- Architect Review;
- Operator Validation;
- Repair Work Card;
- Phase planning artifacts;
- Project planning artifacts;
- Roadmap / Phase Map;
- Evidence / screenshot files;
- Other supporting artifacts.

The exact category names may differ, but Work Card, Implementer Report, Architect Review, Operator Validation, Repair, and expected output must be distinguishable.

### 3. Readable artifact cards instead of raw path walls

Full repo-relative paths may be available, but they must not be the primary visual label.

Artifact entries should show a readable display name, artifact role, existence/status where available, and a shorter path/details line. Long paths must wrap or be hidden behind a details affordance.

### 4. Open or preview artifact affordance

Where the application already has safe file-reading capability for repo-relative planning artifacts, provide an affordance to open or preview the artifact content inside the workspace.

Acceptable approaches:

- inline Markdown preview;
- split-pane preview;
- modal/side panel preview;
- selectable artifact list with preview area;
- “Open artifact” action that loads the repo-relative content into the workspace.

Do not add unrestricted renderer filesystem access. Any read must use existing safe IPC/preload/repository paths or an equivalent constrained app-owned path.

### 5. Expected output / draft artifact area

The workspace must clearly show the artifact the current step is expected to create or update.

For example:

- Operator validation required → expected Operator Validation path;
- Architect review required → expected Architect Review path;
- full Work Card creation required → expected Work Card path;
- phase closeout required → expected closeout record path.

Where an existing form is already responsible for creating the artifact, the workspace may link or route to that form, but it should still explain the expected output and show whether a draft/record already exists.

### 6. Pending decision context

Where the current action involves an Operator or Architect decision, the workspace should expose the relevant decision context.

Examples:

- Operator validation: show Work Card, Implementer Report, Architect Review, prior validation/repair records if any, and expected Operator Validation.
- Architect review: show Work Card and Implementer Report, plus expected Architect Review output.
- Work Card review: show Work Card and Work Card candidate context.
- Repair validation: show parent Work Card, failed validation record, repair Work Card, repair Implementer Report, and expected repair validation record.

### 7. Preserve current-action authority

The artifact workspace must not become a separate workflow router.

It may show artifacts, preview content, and provide support actions, but it must not independently decide the workflow state. The current-action evaluator remains the authority.

### 8. Preserve support-navigation behavior

Opening or previewing an artifact must not mutate durable workflow state.

Opening a supporting artifact or supporting screen must not imply workflow advancement.

### 9. Preserve left-to-right workflow visibility

WC06 workflow guide behavior must remain intact. The workflow guide may help select reference context, but the artifact workspace must not convert it into a separate route engine.

### 10. Blank supporting screen mitigation

For screens or routes that are currently blank but have current-action artifacts available, provide at least a useful artifact context state rather than an empty workspace.

The goal is not to fully implement every route-specific screen. The goal is to prevent blank screens where the app already knows relevant artifacts from current-action evidence.

## Out of Scope

- Do not implement WC08 Current Step Context Inspector.
- Do not implement WC09-WC15 route-specific workflow corrections.
- Do not redesign the full shell.
- Do not change the locked workflow sequence.
- Do not add unrestricted filesystem access.
- Do not add provider SDKs, cloud services, database, authentication, deployment, MCP passthrough, browser automation, or external connectors.
- Do not create Operator validation records.
- Do not close Phase 03.
- Do not merge to `dev`.
- Do not push to `master`.

## Acceptance Criteria

- The routed workspace presents current-action artifact context, not a blank or unrelated screen, when current-action evidence exists.
- Work Card, Implementer Report, Architect Review, Operator Validation, Repair, source evidence, missing evidence, and expected output are distinguishable where present.
- Artifact entries use readable labels instead of raw full-path walls as the primary display.
- Long paths wrap or are placed behind details/secondary display.
- The Operator can inspect or preview at least safe Markdown planning artifacts through constrained app-owned mechanisms.
- Operator validation context exposes Work Card, Implementer Report, Architect Review, and expected Operator Validation when those artifacts exist.
- Architect review context exposes Work Card, Implementer Report, and expected Architect Review output when those artifacts exist.
- Repair validation context exposes parent Work Card, failed validation, repair Work Card, repair Implementer Report, and expected repair validation output when present.
- Expected output/draft artifact context is clearly separated from source artifacts.
- Opening or previewing artifacts does not save records, approve, validate, repair, advance state, or mutate the current-action route.
- WC04 current-action panel behavior remains intact.
- WC05 support-navigation behavior remains intact.
- WC06 left-to-right workflow guide behavior remains intact.
- WC08-WC15 behavior is not implemented prematurely.
- Implementer Report exists and documents validation results, skipped checks, and residual risks.

## Validation Expectations

The Implementer must:

- Read `AGENTS.md` before work.
- Read `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run the approved normal Windows validation lane.
- Run type/build validation.
- Run current-action fixture validation if affected.
- Run WC04/WC05/WC06 focused fixture validation if affected.
- Add focused artifact-workspace fixture checks if feasible.
- Verify no unrestricted renderer filesystem access was introduced.
- Run local safety scans before staging.

Operator validation remains manual and must not be performed by the Implementer.

## Manual Validation Guidance For Operator After Architect Review

The Operator should validate that:

1. The current routed workspace shows useful artifact context instead of blank or unrelated content.
2. Operator validation context shows the Work Card, Implementer Report, Architect Review, and expected Operator Validation.
3. Artifact labels are readable and do not rely on full raw paths as the primary display.
4. Long paths remain available but do not dominate the UI.
5. Safe planning artifacts can be opened or previewed without leaving the routed workflow context.
6. Expected output is visually separate from source evidence.
7. Missing evidence is visually separate from available source evidence.
8. Opening or previewing artifacts does not advance workflow state.
9. WC04 current-action panel remains primary.
10. WC05 supporting tools remain subordinate.
11. WC06 left-to-right workflow guide remains visible and view-only.
12. WC08-WC15 behavior does not appear prematurely.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC07_artifact_review_workspace.md`

The report must include:

- branch name;
- implementation summary;
- files created/modified;
- how artifact roles are grouped;
- how artifact labels avoid raw path walls;
- how artifact preview/open behavior works;
- how expected output/draft context is displayed;
- how Operator validation context exposes Work Card, Implementer Report, and Architect Review;
- how Architect review and repair validation contexts are handled;
- confirmation that current-action authority is preserved;
- confirmation that artifact inspection does not mutate durable workflow state;
- confirmation that WC04/WC05/WC06 behavior is preserved;
- confirmation WC08-WC15 were not implemented;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Work Card:
WC07 — Artifact Review Workspace

Base branch:
dev

Target branch:
feature/phase-03-wc07-artifact-review-workspace

Expected remote:
ChampCityChris/ChampCity_AI

Use this Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC07_artifact_review_workspace.md

Implement only WC07.

Do not implement WC08-WC15.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Create a current-action-driven artifact review workspace so the Operator can inspect relevant Work Cards, Implementer Reports, Architect Reviews, validation records, repair records, source evidence, missing evidence, and expected output artifacts without losing workflow context.

Human objective:
The Operator should not have to hunt through blank screens or raw paths to understand the evidence behind the current step. When validating, reviewing, approving, or repairing, the workspace should show the actual artifacts that matter.

Before editing:
1. Confirm current repo and remote.
2. Confirm dev is clean and available.
3. Create and switch to feature/phase-03-wc07-artifact-review-workspace.
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read the WC07 Work Card.
7. Read WC04, WC05, and WC06 validation reports and repair reports.
8. Inspect WorkflowRouterShell, current-action routing, artifact/source evidence structures, validation screen, support navigation, and safe file read/preview capability.

Required implementation:
1. Present current-action artifact context in the center workspace.
2. Group artifacts by role: Work Card, Implementer Report, Architect Review, Operator Validation, Repair, expected output, source evidence, missing evidence, and other support.
3. Use readable artifact labels instead of full raw paths as the primary display.
4. Provide a safe open/preview affordance for repo-relative planning artifacts where supported by existing constrained app mechanisms.
5. Clearly separate source artifacts from expected output/draft artifacts.
6. Expose Work Card, Implementer Report, and Architect Review during Operator validation when present.
7. Expose Work Card and Implementer Report during Architect review when present.
8. Expose parent Work Card, failed validation, repair Work Card, repair report, and expected repair validation during repair validation when present.
9. Prevent blank supporting workspaces when current-action artifact context exists.
10. Preserve current-action router authority.
11. Preserve WC04 current-action panel behavior.
12. Preserve WC05 support-navigation behavior.
13. Preserve WC06 left-to-right workflow guide behavior.
14. Do not implement WC08-WC15.

Validation:
- Run the approved normal Windows validation lane.
- Run type/build validation.
- Run current-action fixture validation if affected.
- Run WC04/WC05/WC06 focused fixtures if affected.
- Add focused artifact-workspace fixture checks if feasible.
- Run local safety scans before staging.

Required Implementer Report:
Create:
planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC07_artifact_review_workspace.md

Final response must include:
- pushed branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.

## Document Disposition
Document.Status=Pending
