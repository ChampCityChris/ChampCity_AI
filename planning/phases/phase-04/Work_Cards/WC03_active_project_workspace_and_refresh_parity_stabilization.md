<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/work_card/WC03",
  "artifactType": "work_card",
  "createdAt": "2026-07-16T20:05:00.000Z",
  "jsonPath": "planning/phases/phase-04/Work_Cards/WC03_active_project_workspace_and_refresh_parity_stabilization.json",
  "markdownPath": "planning/phases/phase-04/Work_Cards/WC03_active_project_workspace_and_refresh_parity_stabilization.md",
  "payloadHash": "sha256:9d97c2d03588fca72405e9469eb349d94bd5bab09c502c8cefe1f2d2da22872b",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/implementer_report/WC03-active-project-workspace-and-refresh-parity-stabilization"
    ],
    "sources": [
      "champcity-ai/phase-04/candidate_disposition/WC02",
      "champcity-ai/phase-04/validation_report/WC02",
      "champcity-ai/project/observation/PROJ-OBS-010",
      "champcity-ai/phase-04/work_card/WC02",
      "champcity-ai/phase-04/architect_review/WC02-REPAIR02"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T20:05:00.000Z",
  "workCardId": "WC03",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: WC03 Active Project Workspace and Refresh Parity Stabilization"
  }
}
-->

# Work Card: Phase 04 WC03 Active Project Workspace and Refresh Parity Stabilization

Status: ready_for_implementer
Phase: phase-04 — Workflow Authority Cutover and Operator Recovery Stabilization
Work Card: WC03
Risk: critical
Change strategy: replace broken project-registration UI with minimal working project workspace registration
Acceptance target: manual Refresh Repository State and cold start use the same selected project workspace and produce the same current action for the same repository evidence.

## Authority

WC03 is authorized because WC02 proved the transition engine can reach the correct next route from committed repository evidence, but Operator validation then showed that manual Refresh Repository State is not equivalent to cold start / rebuild projection.

The visible symptom is:

- rebuilding the application progresses to the disposition event;
- manual Refresh Repository State does not reliably progress to that same state;
- the Active Project area contains a long repository path text box and Add Project button that are unintuitive and have not worked reliably;
- refresh and project registration were designed together, so broken multi-project registration is likely part of the same project-workspace authority defect.

ChampCity A/I must support dogfooding multiple ChampCity projects, not only ChampCity_AI. Target dogfood projects include:

- ChampCity_AI
- ChampCity_GPT / ChampCity MCP
- ChampCity_RP_Desktop
- Revisionary

This Work Card does not require full enterprise project management. It requires minimal working project registration and reliable active-project refresh authority.

## Required Product Model

Replace the ambiguous repository text field / broken Add Project behavior with a minimal, plain-language project workspace flow.

Required operator model:

1. The Operator can choose an existing active project from the Active Project dropdown.
2. The Operator can add a project using a clear Select Project Folder / Browse action.
3. The app validates that the selected folder is a supported ChampCity project workspace.
4. The app persists the selected project.
5. Manual Refresh Repository State uses the same persisted selected project as cold start.
6. Restart/rebuild and manual refresh produce the same current action for the same repository evidence.

The Operator must not need to understand Git, branch mechanics, repository internals, package metadata, planning-root conventions, artifact scanner details, or workflow-state internals to use this flow.

## Required Work

1. Replace or repair the current long repository path field and Add Project button.
   - Preferred UI: Select Project Folder / Browse.
   - The selected path should be shown as project metadata after selection, not as the primary control.
   - Add Project must either work or be removed/hidden. Do not leave a visible dead control.

2. Implement minimal working project registration.
   - Validate repository root.
   - Validate planning root.
   - Validate required project metadata or provide a clear guided error.
   - Persist projectId, displayName, repositoryRoot, planningRoot, branch behavior, enabled state, and last scan result.
   - Prevent duplicate project roots and duplicate project IDs with actionable messages.

3. Stabilize active-project selection.
   - The Active Project dropdown must only show enabled configured projects.
   - Selecting a project must update the selectedProjectId and refresh/runtime authority consistently.
   - The dropdown must not show a project that manual refresh cannot resolve.
   - The selected project must survive restart/rebuild.

4. Make manual refresh equivalent to cold start.
   - Manual Refresh Repository State must rebuild the verified artifact graph from the selected persisted project.
   - Manual refresh and cold start must compute the same scan result, branch, blocker list, current action, expected output, artifact summary, and routed workspace for identical repository evidence.
   - Refresh must not use stale renderer binding, stale lastScanResult, stale reference navigation, stale selected-project cache, or stale Workflow State artifact as route authority.

5. Preserve the WC02 evidence regression.
   - With committed WC02 Validation Report and Candidate Disposition evidence present, cold start and manual refresh must both advance to the same disposition / next-step route.
   - The app must not require rebuild to progress after a new canonical artifact is committed or written.

6. Support multiple dogfood workspaces at a minimal level.
   - The app must be able to register more than one local ChampCity project workspace.
   - At minimum, test with multiple local project fixtures.
   - Do not require all real dogfood repositories to exist on the implementer's machine.
   - Manual validation should include the real Operator machine projects when available: ChampCity_AI, ChampCity_GPT / ChampCity MCP, ChampCity_RP_Desktop, and Revisionary.

7. Keep Git abstracted from the Operator.
   - Do not expose normal operation as Git commands.
   - The app may display branch/read-only scan metadata, but it must not require the Operator to understand Git to refresh or select a project.
   - Any required commit/stage/push behavior should be handled by application affordances or by Architect/Implementer instructions, not by casual Operator manual steps.

8. No fallback project authority.
   - Do not silently fall back to the first configured project.
   - Do not fall back to a hard-coded local path.
   - Do not fall back to stale selectedProjectId if that project is no longer configured.
   - Do not infer active project from a reference card, renderer state, or last opened route.
   - If selected project recovery is needed, show a clear recovery screen and require the Operator to select or add a project.

## Required Acceptance Criteria

1. The Add Project / Select Project Folder flow works end-to-end for a valid ChampCity project folder.
2. Invalid folders produce plain-language, actionable errors.
3. Active Project dropdown lists all enabled configured projects and no invalid/deleted projects.
4. Selecting a different project changes the active project and recomputes route authority from that project's repository evidence.
5. Manual Refresh Repository State and cold start produce the same current action for the same selected project and same repository contents.
6. Manual refresh does not lose the selected project.
7. Manual refresh does not leave stale current action after a new valid canonical artifact is added.
8. Branch, observer status, blocker count, current action, expected output, and artifact summary come from the same latest scan snapshot.
9. The repository path input is no longer a confusing primary workflow control.
10. The Operator can use the app without knowing Git commands or repository internals.
11. The current Phase 04 WC02 evidence state is covered as a regression: after candidate_disposition/WC02 exists, manual refresh and cold start route to the same next state.
12. Multi-project registration is covered by at least two local fixture projects with different project IDs and different current actions.
13. Project selection, restart, and manual refresh are covered by mounted Electron validation.
14. No fallback project selection, stale scan fallback, or reference-card authority is added.
15. Existing transition-authority tests from WC02-REPAIR02 continue to pass.
16. Repository gates continue to pass.
17. The Implementer Report clearly states whether the real Operator dogfood project set can be validated manually after the pass.

## Out of Scope

- Full cloud project synchronization.
- Authentication.
- Git remote management.
- Push/pull UI.
- Release packaging.
- Full dashboard for project portfolio management.
- New roadmap drafting.
- Phase closeout artifact creation.
- Broad UI redesign outside active-project registration and refresh controls.
- ChatGPT DOM automation.
- Provider API integration.

## Required Tests

Add or update tests for:

1. ProjectWorkspaceRegistry add/select/list/update scan behavior.
2. Duplicate project root and duplicate project ID rejection.
3. Invalid folder validation with clear error.
4. Manual refresh uses the selected project that exists in the persisted registry.
5. Manual refresh and cold start projection parity.
6. Active Project switch recomputes current action from the selected project.
7. UI branch/current-action/header state derive from the same scan snapshot.
8. Mounted Electron validation for:
   - add/register project fixture,
   - switch project,
   - refresh project A,
   - switch to project B,
   - refresh project B,
   - restart and confirm selected project remains selected,
   - confirm refresh and cold start route parity.

## Required Validation

Use the approved normal Windows validation lane.

Run at minimum:

- npm run validate:codex:build
- npm run validate:codex:unit
- npm run test:repository
- npm run test:renderer:built
- npm run validate:codex

Do not run Playwright unless it is already a required project validation command. Do not add provider SDKs or external service dependencies.

## Required Output

Create the synchronized Implementer Report pair:

`planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC03_active_project_workspace_and_refresh_parity_stabilization.{json,md}`

Canonical Implementer Report artifact:

`champcity-ai/phase-04/implementer_report/WC03-active-project-workspace-and-refresh-parity-stabilization`

The Implementer Report must include:

- repo identity checks;
- branch and HEAD before edits;
- RCA for why rebuild/cold start progresses but manual refresh does not;
- explanation of how project registration and refresh share one selected-project authority;
- UI changes made to the Active Project / Add Project area;
- tests added;
- validation commands and results;
- whether minimal multi-project registration is working;
- whether manual refresh equals cold start for the WC02 disposition evidence;
- residual risks;
- final git status.

## Manual Validation After Implementer

1. Launch ChampCity A/I.
2. Confirm the Active Project area is understandable without Git knowledge.
3. Add or confirm ChampCity_AI as an active project.
4. Refresh repository state and confirm it does not lose the selected project.
5. Confirm the current route after refresh matches the route after rebuild/cold start.
6. Add or select at least one additional dogfood project if present on the Operator machine.
7. Switch between projects and confirm current action and scan metadata change with the selected project.
8. Restart the app and confirm selected project state persists.
9. Confirm no dead Add Project button or confusing raw repo-path control remains.
10. Confirm no Git command knowledge is required for the Operator path.
