<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/architect_review/WC03",
  "artifactType": "architect_review",
  "createdAt": "2026-07-16T20:40:00.000Z",
  "jsonPath": "planning/phases/phase-04/Architect_Reviews/ARCHITECT_REVIEW_WC03_active_project_workspace_and_refresh_parity_stabilization.json",
  "markdownPath": "planning/phases/phase-04/Architect_Reviews/ARCHITECT_REVIEW_WC03_active_project_workspace_and_refresh_parity_stabilization.md",
  "payloadHash": "sha256:e5ff9cfce61f5c24baeaf74e6cc1bec9d41a2851b50d0871a5fab1a766337667",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/validation_report/WC03"
    ],
    "sources": [
      "champcity-ai/phase-04/work_card/WC03",
      "champcity-ai/phase-04/implementer_report/WC03-active-project-workspace-and-refresh-parity-stabilization",
      "champcity-ai/phase-04/candidate_disposition/WC02",
      "champcity-ai/phase-04/validation_report/WC02",
      "champcity-ai/project/observation/PROJ-OBS-010"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T20:40:00.000Z",
  "workCardId": "WC03",
  "payload": {
    "kind": "architect_review",
    "title": "Architect Review: WC03 Active Project Workspace and Refresh Parity Stabilization"
  }
}
-->

# Architect Review: WC03 Active Project Workspace and Refresh Parity Stabilization

## Decision

Ready for Operator validation.

## Review Scope

Reviewed the WC03 Implementer Report, the associated source/test changes in commit `c69045495de2c7b81bf7960f2c31b3ccd7c62a53`, and post-implementation validation.

## Findings

The implementation addresses the core WC03 acceptance target. The app now has a minimal local project registration path using a folder picker instead of the prior raw repository path textbox. Active project selection is validated through the project workspace registry, manual refresh aligns with the persisted selected project, and refresh no longer suppresses renderer projection updates on no-op graph fingerprints.

The implementation also adds regression coverage for the refresh/cold-start parity failure that caused Phase 04 to remain open after WC02. Unit coverage now includes duplicate root rejection, duplicate project ID rejection, invalid folder validation, invalid selected-project recovery, manual refresh/cold-start route parity after committed disposition evidence, and multi-project route isolation. Mounted Electron coverage now verifies the plain-language project bar, Add local project action, removal of the raw repository-directory textbox, selected project persistence, manual refresh stability, and absence of configured-project warnings for valid projects.

The selected implementation option is appropriate: minimal working local project registration rather than a full portfolio-management system. That fits Phase 04 stabilization scope while preserving the future dogfooding need for ChampCity_AI, ChampCity_GPT / ChampCity MCP, ChampCity_RP_Desktop, and Revisionary.

## Validation Assessment

Repository validation passed after review. The normal Windows validation lane reported successful build, 54 unit/integration tests, repository gates including active_project_workspace_authority, and mounted Electron regressions. Electron GPU warnings appeared in stderr but did not fail validation.

## Residual Risks

Operator manual validation remains required. The native folder picker cannot be fully exercised by noninteractive mounted tests, so the real Add local project path must be checked manually. Real dogfood projects beyond ChampCity_AI were not selected by the Implementer because they depend on the Operator machine.

The Implementer Report still says commit/hash pending even though the implementation commit exists. This is an evidence hygiene issue in the report template, not a blocker to Operator validation.

## Operator Validation Authorization

Operator validation is authorized for WC03.

Expected validation output:

`champcity-ai/phase-04/validation_report/WC03`

## Operator Validation Instructions

1. Launch ChampCity A/I.
2. Confirm the Active project area is understandable without Git knowledge.
3. Confirm the raw repository path textbox is gone.
4. Confirm `Add local project` is visible and not a dead control.
5. Confirm ChampCity_AI is selected.
6. Click Refresh project state.
7. Confirm no configured-project warning appears for ChampCity_AI.
8. Confirm refresh shows the same current action as cold start/rebuild.
9. Restart the app and confirm the same project and route are restored.
10. Add or select an additional dogfood project if available locally, then confirm no route evidence bleeds between projects.

## Required Repair

No Implementer repair is required before Operator validation.
