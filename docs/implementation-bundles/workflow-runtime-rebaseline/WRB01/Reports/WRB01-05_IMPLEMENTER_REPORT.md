# WRB01-05 Implementer Report

## Repository and card

- Approved repository root verified: `ChampCity_AI` repository root.
- Card: Work Card WRB01-05 — Qualify Current Project Runtime and Fence Legacy Current-State Reconstruction.
- Starting checkpoint: `e217f29`; branch `dev`; remote status: `origin/dev`, 97 commits ahead.

## Implementation

Moved Project identity discovery into `currentProjectRegistrationService.selectedCurrentProjectId`. Current discovery now requires the SPS `selected-project` ProjectResource locator and never consults provider-generation metadata. Existing source locators from the prior provider cutover fail closed without rewriting the Project or importing its Workflow state. Main, source graph, source materialization, semantic checkpoint, structured checkpoint, and integration paths now depend on Current Project registration directly rather than discovering identity through Work Intake.

Removed the zero-production-caller migration chain for legacy inventory, equivalence verification, staged import, and provider-generation cutover, plus its five migration qualification suites and obsolete catalog capabilities. Retired two old Greenfield Work Intake bootstrap scenarios that required Git at the Project root. The remaining Work Intake capture fixtures now establish SPS Current Project registration without provider-generation rows. The generic Work Intake Greenfield fallback remains as an unreplaced legacy surface; its main-process caller is `workIntake:submit` only when no Current Project is registered. The WRB01 landing path registers Current Project first and does not reach that fallback.

## Files changed

- Modified `src/main/main.ts`, Current Project registration/discovery and remaining Work Intake services, five source-control services, and `validation/capability-map.json`.
- Modified focused Current Project and Work Intake tests; retired two Project-root-Git Work Intake scenarios.
- Deleted four production migration modules: `legacyAuthorityInventory.ts`, `legacyEquivalenceVerification.ts`, `stagedLegacyImporter.ts`, and `structuredProviderCutover.ts`.
- Deleted five migration suites for inventory, equivalence, staged import, provider cutover, and structured-state qualification.
- Created this report and `WRB01-05_BUNDLE_QUALIFICATION_REPORT.md`.
- No dependencies, schemas, or migrations were added.

## Validation

- `npm run build` — normal Windows lane, exit 0; TypeScript and renderer build passed with the existing Vite chunk-size advisory.
- Focused WRB01 qualification command `node --test test/project-state/current-project-entry.test.cjs test/project-state/current-project-registration.test.cjs test/source-control/managed-project-source.test.cjs test/work-intake/greenfield-source-bootstrap.test.cjs test/work-intake/structured-work-intake-capture.test.cjs` — normal Windows lane, 17 passed, 0 failed. Covers real Greenfield and Existing Project IPC/preload paths, SPS state with no WIR records, conventional repository adoption with historical Markdown/ref/remote/dirty source preservation, explicit Main/Dev registrations, Agent Harness Project-container MCP file access, idempotent reopen, tracked ignore behavior, and retained Work Intake source-unprepared behavior without provider-generation selection.
- `node --test test/validation/capability-map.test.cjs` — normal Windows lane, 5 passed, 0 failed after removal of retired migration proof.
- Repository reference scan for the deleted migration modules, provider selector, and removed capabilities — no remaining source/catalog references outside historical bundle records.
- `npm run validate:plan -- --profile work-item --changes tmp/changes.json` — pending final exact manifest preview.
- `npm run test:affected -- --changes tmp/changes.json` — pending final normal Windows run.
- `git diff --check` — pending checkpoint review.
- Skipped: historical full suite, Electron launch, and external integrations; not selected or required.

## Git, safety, and remaining review

- Git actions: one WRB01-05 checkpoint commit is required; hash will be reported after the commit.
- Security/local-path safety: no credentials or concrete machine paths were added. Historical Markdown is not parsed into SPS Workflow state. The current selector ignores provider-generation records and fails closed on incompatible ProjectResource identity. Generated `dist/` and temporary `tmp/changes.json` are excluded from the checkpoint.
- Remaining review: Architect review is requested after this checkpoint. The Work Item affected profile did not complete, so its evidence remains incomplete and should be considered during review.
- Residual/deferred runtime: generic Work Intake and routed Work Intake surfaces remain outside the WRB01 landing path. The fallback `captureGreenfieldWorkIntake` still writes its legacy provider-generation marker when called without a Current Project; the Current Project landing path cannot reach it. Later retirement remains separate work.
- Recommended next task: Architect review of the completed WRB01 bundle; do not begin WRB02 before that review.
