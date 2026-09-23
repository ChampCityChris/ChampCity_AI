# SCL02 Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a workstation path.
- Card: Work Card `SCL02`, Persist Work Intake Independently from Source Preparation.
- Predecessor: SCL01Z checkpoint `18314293dfd5cb863dfdbb908a0abc6fa45f22ed`.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.

## Files

- Created: `src/main/workIntake/structuredWorkIntakeService.ts`, `test/work-intake/structured-work-intake-capture.test.cjs`, and this report.
- Modified: `src/main/main.ts`, `src/preload/index.ts`, `src/renderer/app/App.tsx`, `src/renderer/app/WorkIntakeWorkspace.tsx`, `src/shared/projectState/domainContracts.ts`, `src/shared/projectState/entityTypeRegistry.ts`, `src/shared/projectState/projectStateService.ts`, `src/shared/workIntakeContracts.ts`, `src/shared/workspaceContracts.ts`, and `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: a second Markdown persistence adapter, dual-written Work Intake state, a renderer Git API, or SCL03 source-line policy.

## Implementation and evidence

For a Project whose durable provider row selects structured authority, the main-process Save handler creates canonical WorkIntake and SourceBinding records before invoking RepositoryService source operations. SourceBinding advances from `unprepared` through `preparing` to `ready` or `blocked`; bounded failure codes and an inspection-required marker survive reload. The retry action re-resolves the target and inspects any existing work line before creating or accepting it. Branch creation uses the SCL01 semantic `createWorkSource` boundary and never switches or cleans the selected checkout. The saved form content, including the existing-source indicator, is held in Project State. Generated Markdown is not used for Save admission or persistence.

The structured projection reads current Intake and source state from SQLite. The Work Intake screen restores a saved Intake, shows the source state, and offers Retry after a blocked preparation or a new Intake form. Save eligibility checks form validity and busy state; repository cleanliness does not disable it. For non-cut-over Projects, the existing V1 compatibility handler and downstream routing UI remain in place. A cut-over Project stays on its saved Intake screen because later routing renderer projections have not been adapted to structured state. This card does not claim that legacy-only downstream UI is ready after cutover.

Synthetic Git and SQLite tests confirm that a dirty primary checkout still captures a Work Intake and creates a work source without changing the checkout, and that a missing target yields visible blocked state which reload and retry can recover. They also verify persisted content and the renderer Save contract.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows, static/build | Passed; final affected profile rebuilt the final source. |
| `node --test test/work-intake/structured-work-intake-capture.test.cjs` | Normal Windows, focused capture/UI | Passed 3/3 after correcting missing-branch inspection to use the full branch inventory. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows, catalog | Passed 5/5 after declaring the affected-capability lane and Git/process resources. |
| `node --test test/renderer/work-intake-routed-workspaces.test.cjs` | Normal Windows, focused renderer | Passed 30/30 after handling an already-saved view without reading form fields. |
| `npm run test:affected -- --changes tmp/scl02-changes.json` | Normal Windows, work-item | Final receipt `586e656e-dee3-4af2-bd96-7017a1c14baf` passed 345/345 in 49 selected files; source stable. |
| `git diff --check` and `git diff --cached --check` | Read-only source/staged checks | Passed. |

An earlier affected receipt `b6108390-2b34-4677-9567-30fcf5744f13` failed one renderer fixture because it supplied empty form state for an already saved Intake. The final profile passed after the UI correction. No required check was skipped. The work-item profile includes build, fast, affected, and applicable integration checks. No external integration, visual acceptance, or release result is claimed.

## Git and safety

The Operator directed one checkpoint commit for this card. Its hash is pending at report creation and will be reported after commit. Exact staged diff inspection, whitespace check, and added-line secret, concrete local-path, and generated-artifact scans passed with no findings. No push, merge, rebase, reset, clean, restore, or stash was performed.

## Remaining validation and next task

The repository itself still fails the SCL01Y migration inventory gate, so these structured Save scenarios use qualified synthetic Projects. Non-cut-over Projects continue their legacy compatibility path. Later cards own exact `dev` source-line policy and downstream structured routing/UI adaptation. Continue to SCL03 after this checkpoint.
