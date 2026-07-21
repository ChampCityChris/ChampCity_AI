<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-04/implementer_report/WC03-active-project-workspace-and-refresh-parity-stabilization",
  "artifactType": "implementer_report",
  "createdAt": "2026-07-16T20:35:00.000Z",
  "jsonPath": "planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC03_active_project_workspace_and_refresh_parity_stabilization.json",
  "markdownPath": "planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC03_active_project_workspace_and_refresh_parity_stabilization.md",
  "parentArtifactId": "champcity-ai/phase-04/work_card/WC03",
  "payload": {
    "kind": "implementer_report",
    "title": "Implementer Report: WC03 Active Project Workspace and Refresh Parity Stabilization"
  },
  "payloadHash": "sha256:c54dc9ef261225d664efbb8a5ddf3f33b19b306cb7599779fd63d2fe151fac32",
  "phaseId": "phase-04",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-04/architect_review/WC03"
    ],
    "sources": [
      "champcity-ai/phase-04/candidate_disposition/WC02",
      "champcity-ai/phase-04/operator_validation/WC02",
      "champcity-ai/phase-04/work_card/WC03",
      "champcity-ai/project/observation/PROJ-OBS-010"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-16T20:35:00.000Z",
  "workCardId": "WC03"
}
-->

# Implementer Report: WC03 Active Project Workspace and Refresh Parity Stabilization

Pass type: numbered Work Card implementation pass
Work Card id: WC03 - Active Project Workspace and Refresh Parity Stabilization
Repository path inspected: verified approved repo root
Branch: feature/phase-04-wc01-repair01-evidence-derived-workflow
Remote: origin https://github.com/ChampCityChris/ChampCity_AI.git
Base HEAD before edits: 680b4a99aad2aae6d1bb68d7c338efca74857424
Intended commit message: Stabilize active project workspace refresh
Commit created: pending until commit is created
Commit hash: pending until commit is created under the same-commit hash rule

## Repository Identity Checks

- pwd: verified approved repo root.
- git rev-parse --show-toplevel: verified approved repo root.
- git branch --show-current: feature/phase-04-wc01-repair01-evidence-derived-workflow.
- git remote -v: origin matched ChampCityChris/ChampCity_AI.
- git status --short before edits: WC03 Work Card JSON/Markdown were already staged before implementation; branch was ahead of origin by one commit.
- git rev-parse HEAD before edits: 680b4a99aad2aae6d1bb68d7c338efca74857424.

## RCA

1. Manual refresh did not always produce the same result as rebuild/cold start because the active runtime held a constructed RepositoryRefreshService while project selection lived in the persisted ProjectWorkspaceRegistry. Refresh used the already-active service, so a stale or invalid selected project state could survive until restart rebuilt the runtime from persisted evidence.
2. Rebuild could progress while refresh remained stale because cold start reconstructed the verified artifact graph and evidence projection from repository files, while manual refresh could leave the renderer unchanged on a graph-fingerprint no-op and could surface registry availability errors from a mismatched active service.
3. The stale pieces were ProjectWorkspaceRegistry selected-project state, renderer state after no-op refresh, and RepositoryRefreshService snapshot notification behavior. lastScanResult remains diagnostic state only; it is not current-action authority. Renderer routed bindings remain preview/save guards only.
4. The Active Project dropdown could show a project refresh could not resolve because registry listing returned enabled configured projects without validating that repositoryRoot, planningRoot, and package metadata were still reachable.
5. The repository path textbox and Add Project button were not Operator-usable because the textbox exposed raw local path mechanics as the primary workflow control and Add Project depended on the Operator typing a valid repository path by hand.
6. Before this repair, active project authority was split across canonicalRuntime, ProjectWorkspaceRegistry, RepositoryRefreshService, RepositoryObserver, workCardFileStore root listeners, and renderer-held project-list state.
7. After this repair, selected-project authority flows through ProjectWorkspaceRegistry validation, canonicalRuntime.ensureActiveSelectedProject, RepositoryRefreshService graph/projection refresh, and projection listeners that update renderer current action and project metadata.
8. Removed/replaced behavior: silent duplicate-root reuse, invalid projects in the active dropdown, constructor-era active-service refresh without selected-project alignment, no-op refresh listener suppression, and the raw path/add textbox. Retained behavior: local workspace registry persistence, project switching, observer refresh, routed process authorization, and diagnostic branch/project metadata.

## Chosen Implementation Option

Chosen option: minimal working local project registration.

Reason: the existing Electron/main/preload stack already had registry and add/select APIs, so repairing registration with an Electron folder picker, validation, duplicate rejection, and selected-project activation was feasible without adding dependencies or broad portfolio management.

## Implementation Summary

- Added an Electron folder-picker IPC, projects:chooseFolder, and renderer Add local project action.
- Replaced the unexplained repository path textbox with plain-language project controls and secondary diagnostic metadata.
- Made registry list/get/select validate that enabled projects still resolve to a local ChampCity workspace before exposing them as selectable.
- Rejected duplicate project roots and duplicate project IDs with actionable errors.
- Made manual refresh align the active runtime with the persisted selected project before scanning.
- Ensured successful refresh notifies projection listeners even when the graph fingerprint is a no-op, so renderer current action and header metadata are refreshed from the latest snapshot.
- Added startup recovery behavior so moved/invalid selected projects do not silently fall back to another project.
- Added repository gates to prevent reintroducing stale no-op refresh, raw path Add Project UI, duplicate-root reuse, and refresh without selected-project guard.

## Files Created

- planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC03_active_project_workspace_and_refresh_parity_stabilization.json
- planning/phases/phase-04/Implementer_Reports/IMPLEMENTER_REPORT_WC03_active_project_workspace_and_refresh_parity_stabilization.md

## Files Modified

- scripts/verify-wc01-mounted-evidence-workflow.cjs
- scripts/verify-wc02-transition-authority-mounted.cjs
- scripts/verify-wc09-repository-gates.mjs
- src/main/canonicalRuntime.ts
- src/main/main.ts
- src/main/projects/projectWorkspaceRegistry.ts
- src/main/repository/repositoryRefreshService.ts
- src/preload/index.ts
- src/renderer/app/App.tsx
- src/renderer/global.d.ts
- src/shared/projects/projectWorkspace.ts
- test/wc01-repair01/evidence-workflow.test.cjs

## Files Deleted

None.

## Files Intentionally Not Created

- No full project portfolio manager.
- No Git branch-management UI.
- No cloud sync, authentication, database, provider SDK, browser automation, release packaging, or deployment artifact.
- No Playwright tests, per Work Card instruction.

## Tests Added Or Updated

- Added unit coverage for duplicate project root rejection, duplicate project ID rejection, invalid folder validation, invalid selected-project recovery, manual refresh/cold-start route parity after committed disposition evidence, and multi-project route isolation.
- Updated mounted Electron coverage to assert the plain-language project bar, visible Add local project action, no raw repository-directory textbox, selected project persistence, manual refresh stability, and no configured-project warning for a valid project.
- Added an active_project_workspace_authority repository gate.

## Validation Commands And Results

Execution lane: approved normal Windows validation lane for build/test/Electron commands.

- pwd: passed; verified approved repo root.
- git rev-parse --show-toplevel: passed; verified approved repo root.
- git branch --show-current: passed; target feature branch confirmed.
- git remote -v: passed; origin matched ChampCityChris/ChampCity_AI.
- git status --short: passed; recorded pre-existing staged WC03 Work Card pair.
- git rev-parse HEAD: passed; 680b4a99aad2aae6d1bb68d7c338efca74857424.
- npm run validate:codex:build: failed twice during implementation for TypeScript dialog typing, then passed in the approved Windows lane.
- node --test --test-concurrency=1 test/wc01-repair01/evidence-workflow.test.cjs: sandbox attempt failed with spawn EPERM and was not counted; approved Windows lane rerun passed 16 tests.
- npm run validate:codex:unit: passed; build plus 54 built unit tests.
- npm run test:repository: passed all repository gates, including active_project_workspace_authority.
- npm run test:renderer:built: passed mounted Electron WC01 initial, WC01 restart, WC02 Architect Bridge, and WC02 transition-authority scripts. Electron printed GPU warnings after successful assertions.
- npm run validate:codex: passed full build, unit, repository, and mounted renderer suite.

## Validation Skipped And Reason

- Playwright was not run because the Work Card explicitly said not to run Playwright.
- Operator manual validation and Work Card acceptance were not performed; they remain Operator-owned.
- Real dogfood projects beyond ChampCity_AI were not manually selected on the Operator machine by the Implementer.

## Refresh/Cold-Start Parity Result

Resolved in automated coverage. Manual refresh and a fresh RepositoryRefreshService cold-start projection produce the same routed current action for identical repository evidence. The WC02 transition-authority mounted regression confirms manual refresh keeps the selected project, does not show the configured-project warning for a valid project, and preserves the same route after refresh.

## Minimal Multi-Project Dogfooding Result

Minimally supported. The registry can register multiple local ChampCity workspaces, list only enabled reachable workspaces, persist selection, switch projects, and refresh each project from its own evidence without route bleed. Real dogfood projects ChampCity_GPT / ChampCity MCP, ChampCity_RP_Desktop, and Revisionary remain Operator manual validation targets when available locally.

## Security And Secret-Safety Notes

No secrets, tokens, API keys, credentials, or .env files were requested, printed, or stored. Repository gates passed secret, local-path, provider-dependency, generated-junk, and changed-file scope checks. The broad local-path scan matched existing regex literals in source, not new concrete local machine paths in committed artifacts.

## Manual Validation Required

1. Launch ChampCity A/I.
2. Confirm the Active project area is understandable without Git knowledge.
3. Confirm the raw repository path textbox is gone and Add local project is visible.
4. Confirm ChampCity_AI is selected.
5. Click Refresh project state.
6. Confirm no configured-project warning appears for ChampCity_AI.
7. Confirm refresh shows the same current action as cold start/rebuild.
8. Restart the app and confirm the same project and route are restored.
9. Add or select another local dogfood project if available.
10. Switch projects and confirm route evidence does not bleed across projects.

## Residual Risks

- Operator visual/usability validation is still required.
- Folder picker behavior itself is covered by code path and Electron API typing, but the full native dialog cannot be accepted by automated mounted tests without manual interaction.
- Invalid selected project recovery opens the app into recoverable state, but routed workflow actions remain unavailable until the Operator chooses a valid folder.
- Full project portfolio management remains intentionally out of scope.

## Git Actions Performed

- Branch verified: feature/phase-04-wc01-repair01-evidence-derived-workflow.
- dev, master, and main were not modified.
- Commit created: pending until commit is created.
- Commit hash: pending until commit is created.
- Push status: pending.

## Final Git Status Before Commit

Pending final staging after this synchronized report pair is written. Current modified files are limited to WC03 source, tests, gates, mounted checks, the pre-staged WC03 Work Card pair, and this Implementer Report pair.

## Blocking Questions

None.

## Recommended Next Implementer Task

Return WC03 to Architect review and then Operator manual validation. If Operator validation passes, Phase 04 can proceed toward closeout / roadmap rebaseline review.

## Document Disposition
Document.Status=Pending
