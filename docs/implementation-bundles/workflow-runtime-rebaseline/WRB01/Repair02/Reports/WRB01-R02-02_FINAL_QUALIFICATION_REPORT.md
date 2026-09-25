# WRB01-R02-02 Final Qualification Report

## Repository and card

- Approved repository root verified: `ChampCity_AI` repository root.
- Card: Repair Card WRB01-R02-02 — Complete Optional-Source Surfaces and Final WRB01 Qualification.
- Starting checkpoint: WRB01-R02-01 commit `9d14f0d`; branch `dev`; `origin/dev` was 106 commits behind the local branch at start.

## Implementation summary

Current Project identity uses the dedicated `current-project-registration` resource. The optional Git Repository identity comes only from an active `source-repository` resource; Source Graph rejects non-source Current Projects before attempting managed Dev resolution. The Hub receives an explicit source capability and omits Source Control for non-source Projects. Greenfield and conventional Existing Project entry continue to register one source Repository after bootstrap or mechanical source detection; incomplete managed topology fails before Current Project registration.

Conventional local Git adoption now treats an empty successful `git remote -v` result as valid and preserves the empty remote set. Structured Work Intake and retry report `source: not-applicable` regardless of Project backing. Projections load branches from managed Dev when a Current Project has a Repository, and return empty branch data with `repositoryId: null` when it does not. The legacy branch-based Work Intake path no longer receives a nullable Repository identity.

The old lifecycle package fixture was rewritten to prove that WIR owns no SourceBaseline/SourceBinding and that substantive routed target Workflows own their separate records. Checkpoint, integration, Source Graph, and revision detail behavior remain covered by their focused suites.

## Files changed

- Modified production: `src/main/main.ts`, `src/main/projectState/currentProjectRegistrationService.ts`, `src/main/sourceControl/managedProjectSourceService.ts`, `src/main/sourceControl/sourceGraphService.ts`, `src/main/workIntake/structuredWorkIntakeService.ts`, `src/main/workIntake/workIntakeService.ts`, `src/renderer/app/App.tsx`, `src/renderer/app/WorkflowHubWorkspace.tsx`, `src/shared/sourceLifecycleContracts.ts`, and `src/shared/workIntakeContracts.ts`.
- Modified proof: `test/project-state/current-project-entry.test.cjs`, `test/renderer/workflow-hub-shell.test.cjs`, `test/source-control/managed-project-source.test.cjs`, `test/source-control/source-graph-projection.test.cjs`, `test/source-control/source-lifecycle-package.test.cjs`, and `test/work-intake/structured-work-intake-capture.test.cjs`.
- Modified `validation/capability-map.json` for current behavior ownership and test counts.
- Created this report and updated `Reports/WRB01-05_BUNDLE_QUALIFICATION_REPORT.md`.
- No tests were deleted. Existing tests were modified or extended; no new test files were added. No dependency, schema, or migration was added.

## Qualification evidence

- `npm run build` — normal Windows lane, exit 0; TypeScript, Vite, and branding copy passed. Vite emitted the existing chunk-size advisory. A restricted run returned the documented `spawn EPERM`; the normal Windows rerun passed.
- `node --test test/project-state/current-project-registration.test.cjs test/project-state/current-project-entry.test.cjs test/source-control/managed-project-source.test.cjs test/work-intake/greenfield-source-bootstrap.test.cjs test/source-control/source-graph-projection.test.cjs test/work-intake/structured-work-intake-capture.test.cjs test/renderer/workflow-hub-shell.test.cjs test/source-control/source-lifecycle-package.test.cjs test/validation/capability-map.test.cjs` — normal Windows lane, final run passed 48/48.
- Coverage includes non-Git Existing Project identity and fail-closed Source Graph, source-backed Greenfield/Existing entry, remote-less conventional adoption, Main/Dev managed topology, dirty and untracked state preservation, reopen stability, Source Graph and revision detail, source-neutral WIR capture/retry and projections, Hub capability gating, target Workflow source ownership, and capability-map integrity.
- `npm run validate:plan -- --profile repair --changes tmp/wrb01-r02-02-changes.json` — normal Windows lane, exit 0; preview selected 97 tests (3 static, 12 fast, 21 affected-capability, 61 integration), estimated 775176 ms (~12m55s). Preview only; the expanded repair profile was not run. No Repair-profile pass is claimed.
- No Electron launch, package, external integration, or release qualification was run.

## Deferred runtime and review

- The legacy generic Work Intake fallback remains reachable only when no Current Project registration exists. Its caller is `workIntake:submit`; Current Project landing paths register first and do not use that fallback. Its eventual retirement remains separate work.
- Direct internal Source Control fixtures may still use explicit conventional single-root Git paths. The desktop Current Project Source Graph path requires the registered optional Repository and managed Dev.
- Security/local-path scan found no credentials, tokens, or concrete machine paths in the durable diff. Generated output and temporary validation manifests are not included in the checkpoint.
- Remaining workflow step: Human Architect review of WRB01. WRB02 has not started.
- Required checkpoint: `WRB01-R02-02 complete optional source foundation and qualify WRB01`; hash will be reported after commit.
