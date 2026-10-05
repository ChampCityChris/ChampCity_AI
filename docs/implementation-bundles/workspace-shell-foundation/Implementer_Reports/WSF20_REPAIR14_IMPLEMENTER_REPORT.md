# WSF20-REPAIR14 Implementer Report

Date: 2026-10-04 (Operator timezone). Repair Card WSF20-REPAIR14; parent WSF20; defects D33-D36.

## Repository and scope

Verified the approved `Dev` primary checkout with `git rev-parse --show-toplevel`, repository instructions, and the active Repair Card. Branch: `dev`. Starting HEAD: `a45a8c32faa017924adefba433172fb6ab06040f`. Origin fetch/push configuration points to the ChampCityChris/ChampCity_AI GitHub repository. No fetch, push, merge, branch, worktree, reset, restore, or stash operation was performed.

The existing dirty `src/main/agentHarness/tools/toolRegistry.ts`, Forgejo bootstrap artifacts, and other pre-existing untracked bundle documents were preserved and excluded from R14 staging. No SQL schema, advisory authority model, save API, browser authorization, dependency, or integration change was introduced.

## Implementation

Review & Validation now opens Documents with Implementer Report selected. Local Documents / Tester / Criteria / Decision tabs use the existing selector styling and render one active body. The Decision tab contains advisory recommendation/currentness, notes, explicit defect text, and final disposition controls. Tab/document selection remains ephemeral and performs no SQL/navigation mutation. Inspection permits viewing, Copy, and Export while preparation, Tester/Validator/proof, Repair, and disposition controls remain guarded.

The right pane uses `WorkflowCandidateBrowserActions` for Reload ChatGPT, Prepare Advisory Handoff, Copy Advisory Handoff, Refresh, and recovery Retry. Existing browser recovery owns reload/reattachment. Browser actions retain intrinsic height and the browser and left body fill independently.

The handoff includes the actual SQL-generated Implementer Report, approved execution contract, exact attempt/result identities, current Tester, concise Criterion proof, current checkpoints, semantic Repair lineage, and cycle identity/revision/currentness. It directs exact MCP stage/scope submission and states that Architect advice confers no disposition or Repair authority. Preparation and submission continue to use existing cycle services and typed ingress.

SQL advisory fields generate a read-only Architect Advisory document with Summary, Recommendation, Blocking findings (including explicit None), optional Suggested repair defect, and exact Review basis. The selector exposes that document after Refresh. Validation Record uses semantic Markdown sections with full SQL detail retained in a metadata/evidence section; it no longer stringifies the review object as raw JSON.

Existing Validate Passed eligibility, explicit Request Repair defect requirements, independent proof authority, and exact Repair callbacks remain intact.

## Files

Modified:

- `src/main/workCardValidation/structuredWorkItemReviewService.ts`
- `src/shared/structuredWorkItemReviewContracts.ts`
- `src/renderer/app/OperatorValidationPresentation.tsx`
- `src/renderer/app/WorkCardReviewValidationShell.tsx`
- `src/renderer/app/WorkCardReviewValidationWorkspace.tsx`
- `src/renderer/styles.css`
- `test/renderer/work-card-report-review-workspace.test.cjs`
- `test/phase-planning/phase-planning-service.test.cjs`
- `test/fixtures/greenfield-application-viewport/renderer.tsx`
- `test/fixtures/greenfield-application-viewport/electron.cjs`

Created: this report. Deleted: none. Intentionally not created: schema migrations, new advisory API, sidecars, parallel test suites, new runtime dependencies. Temporary change selection, receipts, and logs remain ignored under `tmp/`; compiled assets are not staged.

## Validation commands and results

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0 |
| `npm run build` | Restricted Windows | Exit 1: Vite/esbuild `spawn EPERM`; recorded once, then normal Windows lane used |
| `npm run test:repair -- --changes tmp/wsf20-r14-changes.json --preview` | Restricted Windows, planning only | Exit 0; selected 88 files, excluding dirty Forgejo from changed-path scope |
| `npm run test:repair -- --changes tmp/wsf20-r14-changes.json` | Normal Windows | Exit 1; production build passed; 82/88 files passed; 683 tests: 661 passed, 22 failed, none skipped; 473314 ms; run ID `f4734c00-0390-49e4-8608-7a3480850981` |
| `node --test test/renderer/greenfield-application-viewport.test.cjs` | Normal Windows, synthetic Electron production composition | Exit 0; 1/1 passed; 8065 ms |
| `node --test --test-concurrency=1 test/renderer/work-card-report-review-workspace.test.cjs test/renderer/greenfield-shell-composition.test.cjs test/workflow/workflow-execution-application-service.test.cjs test/phase-planning/phase-planning-service.test.cjs` | Normal Windows, focused production/service/renderer owners | Exit 1; 61/62 passed; obsolete renderer expectation corrected |
| `npm run build` | Normal Windows, final production source | Exit 0; existing Vite chunk-size warning only |
| `node --test --test-concurrency=1 test/renderer/work-card-report-review-workspace.test.cjs test/agent-harness/reserved-toolbox-namespace.test.cjs test/renderer/greenfield-shell-composition.test.cjs test/workflow/workflow-execution-application-service.test.cjs test/phase-planning/phase-planning-service.test.cjs` | Normal Windows, final focused owners | Exit 1; 65/66 passed; new tab-content assertion also matched the shared accessibility label and was narrowed to the actual heading |
| `node --test test/renderer/work-card-report-review-workspace.test.cjs` | Normal Windows, corrected final renderer proof | Exit 0; 7/7 passed |
| `git diff --check` | Restricted Windows, read-only hygiene | Exit 0 |

Final focused evidence across the last two test commands: review renderer 7/7, registered MCP candidate ingress 3/3, Greenfield composition/navigation 10/10, execution application service 35/35, Phase/Greenfield full SQL lifecycle 11/11. All 66 focused tests pass after the assertion correction. The SQL lifecycle owner proves exact Implementer Report inclusion, bounded handoff, all advisory fields on the exact cycle/revision, no new Operator Decision, and advisory document contents. It also preserves R13 source-backed no-mutation behavior. The Electron owner preserves R12 Implement geometry and verifies review tabs, Advisory document selection, disabled incomplete disposition, usable browser height, and native synthetic interaction.

The composed receipt is not a whole-repository pass. Its R14 renderer failure and preserved handoff wording failure were corrected and revalidated through the focused owners. Four remaining failing files are outside the changed R14 runtime paths:

- `test/agent-harness/repository-io-hardening.test.cjs`: 1 failure in registered-root/git-tool status.
- `test/project-state/execution-completion.test.cjs`: 6 failures including unavailable deterministic ValidationCatalog proof in source-neutral fixtures.
- `test/source-control/managed-project-source.test.cjs`: 7 failures including candidate Git preparation errors.
- `test/source-control/workflow-integration-service.test.cjs`: 6 failures expecting integrated state but receiving failed.

These failures were not repaired or attributed to a proven baseline cause. The broader profile exceeded its ordinary validation budget. The full 88-file profile was not repeated after bounded projection/assertion corrections; a fresh production build and all named focused owners were used instead. No release, packaging, external ChatGPT/MCP, or live Operator acceptance was claimed.

## Safety and checkpoint

No secrets or concrete machine paths were added to durable artifacts. The exact staged R14 diff was reviewed with a bounded secret/local-path/generated-artifact scan before commit. Only the ten modified files and this report are included in the checkpoint; unrelated dirty/untracked work is excluded.

Required checkpoint: `WSF20-R14 restore Review and Validation advisory workspace`. Commit hash pending at report creation; the actual hash is reported in the task response without amending the checkpoint merely to insert its own hash.

## Operator audit and remaining risks

Stop for Operator audit. Continue the live WorkItem through Documents, Prepare/Copy Advisory Handoff, actual ChatGPT MCP submission, Refresh/Architect Advisory inspection, Tester, Criteria, and Decision. Visual/experiential acceptance and external integration require the Operator's live evidence. Larger real evidence histories may produce longer inspectable Validation Records; the handoff avoids raw Project State dumps and includes concise current proof alongside the exact report.

Recommended next work: Operator audit of R14, followed by separately scoped investigation of the four wider validation failures if required. No release acceptance is inferred from focused success.
