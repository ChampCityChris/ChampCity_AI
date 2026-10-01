# RWS04C Implementer Report

Status: implementation checkpoint; Architect review and Operator visual validation pending. This is not acceptance or release qualification.

## Repository and delegated scope

Verified the approved primary `Dev` repository root and branch `dev`. Baseline HEAD: `4da261f` (RWS04B), preceded by accepted-domain implementation `ee5313c` (RWS04A). Remote-tracking inspection at start: `dev` was 245 commits ahead and 0 behind `origin/dev`; no fetch, push, merge or branch change was performed. Unrelated existing modifications and untracked work cards were preserved.

Card: RWS04C, Intake-family production cutover / derived projection / renderer parity. Required checkpoint commit is pending while this report is authored; the actual hash will be reported after committing, without amending solely to insert the hash.

## Implementation

All substantive Intake forms now use the structured Workflow Intake API. First access invokes RWS04B exact-Workflow ensure/migration. Existing structured state wins; supported unambiguous legacy state imports once; ambiguous sources remain untouched and produce a precise blocker. Existing Findings are retained.

A dedicated derived writer renders SQL values and disposition into a conspicuously generated Markdown review document with Intake ID/version, Workflow ID/type, disposition and stable generation timestamp. Existing-project output uses the card's exact Workflow path. Greenfield keeps the migrated familiar path or the existing project-name slug convention; later name edits retain the original first-record path. Reads and refresh rebuild output from SQL. Manual Markdown edits never flow into SQL.

Save and review commit SQL first. The materialization result is separate: a file replacement failure returns committed SQL and an explicit `materializationError`, and does not reverse the mutation. The writer validates deterministic paths, rejects linked/non-directory ancestors and non-regular targets, fsyncs a unique sibling temporary file, and atomically renames it over the contained target. It works independently of the global legacy writer fence. No authority marker, schema or topology migration was added.

The renderer uses a shared local Intake hook, shared Figma Markdown review card and shared disposition panel. There is no selected-document-global dependency and no Intake browser companion. Review sends only bounded Operator notes/outcome and the exact record version. Unsaved changes and new revisions disable continuation; current approval enables Feature Assessment/Issue RCA and Greenfield Interview preparation. The other four existing-project Intake types stay at Intake. The generic Intake shell and RWS03-R01 top rail component/model remain unchanged; Greenfield feeds SQL review status to the existing rail.

The legacy Greenfield runtime writer and main/preload submit route were retired. Supported legacy Markdown construction needed by historical-domain tests now lives exclusively in a test fixture builder and is not imported by production. Old repository Markdown is not deleted; the migrated Greenfield Intake path becomes the generated output as directed by the card.

Supporting read-only adapters allow the existing synchronous Interview and planning/lifecycle consumers to resolve Intake from a coherent SQL snapshot. They share the domain disposition selector, never read generated file contents, and preserve existing Interview UI. Exact familiar stale Interview prompts can be regenerated from a newly approved SQL revision; unrelated conflicting prompts remain blocked. This supporting adapter work changes Intake source resolution, not planning topology, execution, Assessment/RCA UI, validation or close workflows.

## Files and test ownership

Created: derived marker/path contract; Workflow Intake writer; read-only SQL Intake projection adapter; shared disposition selector; renderer Intake hook and review components; test-only legacy Intake fixture; this report.

Modified: Workflow Intake service and IPC, constrained preload/API contracts, App and both Intake workspaces, browser attachment eligibility, planning-document discovery/freshness/continuation adapters, Interview context/prompt regeneration, Project Planning Intake input adapter, and current architecture documents.

Deleted: `src/main/projectIntake/projectIntakeService.ts` (retired authority).

No dependencies, schemas, JSON state sidecars, historical Findings deletions, browser/rail redesign, source-control/execution/validation/close workflow implementation, screenshots or generated build output were added to the checkpoint.

Extended existing `workflow-application-service` ownership for SQL projection reconstruction, manual-edit isolation, exact review, revised approval, materialization failure, path containment, synthetic authority-fence independence and Greenfield preparation. Extended existing renderer suites for shared form/review presentation and actual hook save/review/dirty-state behavior for Greenfield, Refactor/Migration and Feature. Reused RWS04B seven-family migration proof with only activation expectations adjusted. Existing downstream fixtures now explicitly approve Intake before preparation. The validation catalog change only classifies the retired writer's test-only fixture; production validation behavior is unchanged.

## Validation

- Required `validate:plan -- --profile work-item --changes tmp/rws04c-changes.json`: passed; final affected selection contained 124 files.
- Initial `npm run test:affected -- --changes tmp/rws04c-changes.json` in restricted Windows execution returned `spawn EPERM` before compilation. Recorded once; reran in normal Windows execution as prescribed by `docs/dev/VALIDATION_COMMAND_LANES.md`.
- First normal-Windows affected run built successfully, then reported card-related regressions plus previously recorded baseline failures. Card-related regressions were corrected. Prior RWS04B receipt confirms eight shared failing suites; no unrelated harness, source-control or validation behavior was modified to mask them.
- Intermediate `npm run typecheck` identified implementation type errors; repaired before the production build. Normal-Windows diagnostic builds passed. Focused test iterations identified and repaired the Greenfield lifecycle SQL adapter and obsolete legacy-byte expectations.
- Final normal-Windows affected run: production build passed; source context stable; 1,004 tests, 978 passed, 25 failed, 1 skipped, 0 cancelled; 124 files; 769.314 seconds. Overall failed, so this checkpoint does not claim a green affected profile.
- Eight failing suites also appear in the RWS04B receipt: repository-io-hardening, reserved-toolbox-namespace, post-submit-review-state, project-planning-service, execution-completion, runtime-wiring-source, managed-project-source, workflow-integration-service. The Issue integration fixture now reaches the same downstream failed-versus-integrated boundary as Feature.
- Two additional selected suites failed outside Intake scope: release-toolbox-boundary (command-adapter executable expectation and release toolbox scope assertion), and source-lifecycle-package (Work Intake form validation). A bounded diagnostic reproduced their three failures; these are not claimed as proven RWS04B baseline failures. Their implementation was not changed by this card.
- Final focused command (workflow-application-service, workflow-hub-shell, figma-redesign-shell, architect-interview-workspace, production-service-proof): 74 tests passed, 0 failed/skipped; 77.996 seconds. All SQL projection, migration, containment, failure isolation, Greenfield preparation and renderer approval/edit proofs passed.
- Full/release qualification was not run, as directed.
- `git diff --check`: passed.

## Safety, remaining review and stop boundary

The attributable staged diff was reviewed; bounded added-line secret/local-path and staged generated-artifact scans passed. Only card-attributable files are included in the checkpoint; unrelated dirty work is preserved. The required checkpoint commit follows this report, with its actual hash returned to the Operator. The global legacy canonical fence is unchanged and structured authority is not selected by Intake migration.

Operator visual validation remains required: Refactor/Migration migrated form values, generated right pane, Save, Approve, edit/save returning Pending, and no embedded ChatGPT; Greenfield's preserved form/chooser/layout, SQL disposition, generated right pane, and approved structured Interview preparation. Automated semantic/renderer proof does not establish Operator visual acceptance. Stop after the required checkpoint for Architect review and Operator validation; do not begin Assessment/RCA workspace-family work.
