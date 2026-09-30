# WRB02-02 Implementer Report

## Scope and repository

- Repository root: verified as the approved repository for this card; durable paths below are repository-relative.
- Card: Work Card WRB02-02, Replace Workflow Hub with Multi-Instance Inventory and Direct-Start UX.
- Branch: `dev`; remote status at start and before checkpoint: `origin/dev`, ahead by 112 commits.
- Worktree: began clean after WRB02-01 checkpoint.

## Files changed

- Modified: `src/main/main.ts`, `src/preload/index.ts`, `src/renderer/app/App.tsx`, `src/renderer/app/WorkflowHubWorkspace.tsx`, `src/renderer/styles.css`, `src/shared/workspaceContracts.ts`, `test/app-shell/app-shell.test.cjs`, `test/renderer/workflow-hub-shell.test.cjs`, `validation/capability-map.json`.
- Created: `src/main/workflow/workflowApplicationIpc.ts`, `src/renderer/app/WorkflowInstanceWorkspace.tsx`.
- Deleted: `src/shared/workflowHubContracts.ts`, which encoded the obsolete Development/Issue canonical identity registry.
- Intentionally not created: generic Project State renderer mutations, direct Project Creation start action, substantive Work Intake creation from direct start, new dependencies, and bespoke workflow planning workspaces (owned by WRB03).

## Implementation and evidence

Added bounded main/preload APIs for list, direct start, and exact Workflow ID lookup. Main resolves the active Current Project root and validates arguments; the renderer cannot supply a project root, workspace, source seed, or extra start fields.

Replaced the Hub with the canonical Workflow registry’s six direct-start type groups and Work Intake Routing. Rows preserve exact Workflow IDs, display titles, state, and workspace, and keep completed instances visible with distinct styling. Existing Project Creation instances may appear as history without a start action. Source Control remains gated by optional repository identity.

Direct start requires a trimmed 1–200 character title, refreshes inventory, then opens the exact returned ID in the generic instance shell. Exact WIR rows reopen the initiating saved intake; the WIR action opens Work Intake capture. Added exact selection preservation while the ID remains in refreshed inventory and a Back to Workflows shell for substantive instances.

Focused proof covers all seven groups/actions, independent Feature and Issue rows, completed visibility, exact-ID start/open, WIR routing, Source Control gating, IPC argument bounds, and main-owned project root selection. The app-shell test’s obsolete assertion that `src/main/workflow` must be absent was removed because WRB02-01 established that canonical module.

## Validation

- `npm run build` — normal Windows lane, exit 0. TypeScript, Vite renderer bundle, and branding assets passed; Vite emitted the existing >500 kB chunk advisory.
- `node --test test/renderer/workflow-hub-shell.test.cjs` — normal Windows lane, exit 0; 12/12 tests passed.
- `node --test test/app-shell/app-shell.test.cjs` — normal Windows lane, exit 0; 11/11 tests passed.
- `npm run validate:plan -- --profile work-item --changes tmp/wrb02-02-changes.json` — preview passed; selected 61 test files across affected fast/integration lanes plus a production build.
- `npm run test:affected -- --changes tmp/wrb02-02-changes.json` — final normal Windows work-item run `f52ba872-d14e-486e-96eb-298f22cd46ab`, exit 0; production build and all 61 selected test files passed, with no failure evidence.
- The restricted `npm run build` attempt and focused `node --test` attempt each returned `spawn EPERM`; each was recorded once and rerun in the normal Windows lane per Validation Command Lanes. Those restricted failures are not counted as source failures or passes.
- `git diff --check` — passed before checkpoint.
- No launch smoke, external integration, or Operator experiential acceptance was performed or claimed.

## Git, safety, and remaining work

- Required card checkpoint commit: pending at report authoring; this report is included in the WRB02-02 checkpoint.
- Secret/local-path/generated-artifact scan: no secrets, concrete local paths, temporary artifacts, or generated output are included in the intended source changes. Validation input and preview output remain under ignored `tmp/` and are excluded from the checkpoint.
- No production code imports tests, planning, archive, or generated output.
- Remaining Operator manual validation: optional visual judgment of the Hub and workflow-instance shell.
- Blockers/residual risks: substantive type-specific intake/planning bodies remain intentionally deferred to WRB03; the new generic shell displays identity and provenance only.
- Recommended next task: proceed to WRB02-03 after creating the WRB02-02 checkpoint.
