# WSF20-REPAIR15 Implementer Report

Date: 2026-10-06. Card: Repair Card WSF20-REPAIR15; defects WSF20-D37 and WSF20-D38.

## Repository and scope

Verified `<PROJECT_REPO>/Dev` as the primary repository root using Git; the containing project directory is not itself a Git repository. Branch: `dev`. Starting HEAD: `197cace436aa0b12e5b8734b82fd20f961bae5a1`, matching the card. `origin` is the configured GitHub remote; local `dev` was 325 commits ahead and zero behind the locally recorded `origin/dev`. No fetch, push, branch change, release action, or live project mutation was performed.

The pre-existing modified `src/main/agentHarness/tools/toolRegistry.ts` and unrelated untracked Forgejo/bootstrap and workspace-shell documents were preserved. Validation used an ignored archive of the exact starting HEAD under `tmp/r15-validation`, the installed dependency directory, and copies of only the eight R15 source/test files. All eight copies were compared byte-for-byte with the primary checkout. No unrelated dirty source entered the build. The validation receipt inherits the enclosing checkout's Git metadata; the archive construction and byte comparison establish the isolated source actually tested.

## Implementation and evidence

Repair's right column now renders compact Architect status, the unchanged supplied browser panel, then Prepare Repair Work Card Prompt / Copy Handoff / Reload ChatGPT / Refresh, followed by bounded feedback inside the action region. Document and disposition controls remain in the left column. Existing callbacks and enabled/disabled behavior remain intact. Browser content owns the flexible height; status/actions are intrinsic and feedback scrolls within its bound.

For an exact WorkItem with no durable attempt or live session, Implementer status reads the current execution projection. It requires exact Workflow/WorkItem identity, a single matching active planned/ready item, eligible execution without blockers, and populated execution planning. Explicitly blocked source remains unavailable. Unprepared and ready source-backed items return Ready with the exact WorkItem version, `canRunAgain=true`, no failure/retry blocker, and an unresolved execution contract digest. Status neither reserves an attempt nor materializes source. Source-neutral contract resolution is preserved. Ambiguous attempt lookup errors now fail closed rather than being treated as absence of an attempt.

Start production code was not changed. It still prepares/reuses the durable attempt, validates its reservation, prepares source, verifies the exact SourceBinding/checkout, derives mutation intent from approved affectedPaths, and uses the durable attempt ID as executionRef. Existing prepared, running-without-session, completed no-mutation, and checkpoint recovery branches remain intact.

Existing proof owners were extended; no new test suite was introduced:

- Repair renderer proves browser-before-actions DOM order and retains callback/disabled behavior.
- Synthetic Electron production composition proves browser fill height, intrinsic action height across resize, all four controls below the browser, and preserved R14 Review & Validation ordering.
- Greenfield SQL fixture reaches ordinary Implement, parent Review & Validation, Request Repair, approved Repair planning, and canonical Repair Implement. Actual renderer adapter/button callbacks call the real execution service with a synthetic Codex adapter. Before each Start, status is Ready, SQL state is unchanged, and no attempt is reserved. Start prepares source once and creates one exact durable attempt. Parent no-mutation execution remains read-only/checkpoint-not-required; Repair's approved `repair.txt` mutation creates its committed checkpoint.
- Implementer owner covers unprepared/ready/blocked source, wrong/duplicate identities, inactive/downstream/ineligible items, missing planning, stale/ambiguous attempts, prepared reuse, and running-session recovery. Existing R13 Implementer/Tester qualification passes before and after the change; Tester production code is unchanged.

## Files

Modified:

- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/renderer/app/WorkCardRepairShell.tsx`
- `src/renderer/styles.css`
- `test/renderer/work-card-repair-workspace.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/phase-planning/phase-planning-service.test.cjs`
- `test/fixtures/greenfield-application-viewport/renderer.tsx`
- `test/fixtures/greenfield-application-viewport/electron.cjs`

Created: this report. Deleted: none. Intentionally not created or modified: schema migrations, SQL repair scripts, dependencies, Tester production changes, Forgejo/bootstrap changes, parallel execution stacks, or governed JSON sidecars. Build output, archive, selection input, and receipts remain ignored temporary artifacts.

## Validation

Commands below ran from the isolated validation root unless stated otherwise. Normal Windows denotes the approved execution lane outside the restricted child-process sandbox.

| Exact command | Lane | Result |
| --- | --- | --- |
| `npm run build` on starting HEAD | Restricted Windows | Exit 1: Vite/esbuild `spawn EPERM`; recorded once, rerun normally |
| `npm run build` on starting HEAD | Normal Windows | Exit 0 |
| `node --test --test-name-pattern='source-backed no-mutation WorkItems' test/work-card-building/codex-implementer-execution-service.test.cjs` on starting HEAD | Normal Windows | Exit 0; 1/1 passed; 19943 ms; mandatory R13 gate passed |
| `npm run build` with R15 changes | Normal Windows | Exit 0; TypeScript, renderer, and assets passed |
| `node --test --test-name-pattern='Greenfield fresh source-backed\|Repair renders' test/phase-planning/phase-planning-service.test.cjs test/renderer/work-card-repair-workspace.test.cjs` | Normal Windows | Exit 1; Repair renderer passed; new test fixture had a syntax error, corrected |
| `node --check test/phase-planning/phase-planning-service.test.cjs` | Restricted Windows, primary checkout | Exit 0 after syntax correction |
| `node --test --test-name-pattern='Greenfield fresh source-backed' test/phase-planning/phase-planning-service.test.cjs` | Normal Windows, three diagnostic runs | Exit 1 each: exposed the fixture's missing unprepared SourceBinding, then diagnosed it explicitly; after matching production source-seeded Workflow setup, only an assertion expecting optional readOnly to equal false failed. Corrected to assert writable checkout access and absence of read-only mode. Final owner passes below |
| `npm run validate:plan -- --profile repair --changes tmp/r15-changes.json` | Restricted Windows, primary checkout | Preview exit 0; parsing npm's banner as JSON failed in the follow-up diagnostic; direct CLI preview used instead |
| `node scripts/validation/cli.cjs preview --profile repair --changes r15-changes.json` | Restricted Windows | Exit 0; selected 98 files and one production build |
| `node --test test/renderer/greenfield-application-viewport.test.cjs` | Normal Windows, synthetic Electron | Exit 0; 1/1 passed; 8990 ms |
| `npm run test:repair -- --changes r15-changes.json` | Normal Windows | Exit 1; production build passed; 94/98 files passed; 750 tests: 729 passed, 20 failed, 1 skipped; 458143 ms; source stable |
| `git diff --check` | Restricted Windows, primary checkout | Exit 0 |

Authoritative composed run ID: `81f3b177-1ee2-4ad6-a1c1-9c7d735b9ae0`. Local receipt: `tmp/r15-validation/r15-receipt.json`; output: `tmp/r15-validation/r15-repair.log`. Existing Vite chunk-size warning remains. The profile exceeded the ordinary repair budget; no tests were dropped.

Mandatory focused owners in that receipt all passed: Repair renderer 3/3, Implement renderer 7/7, Codex Implementer execution including R13 8/8, workflow execution application 35/35, Phase/Greenfield SQL lifecycle including fresh Repair 11/11. Preserved Review & Validation renderer passed 7/7. Together with Electron geometry, these provide 72 passing focused tests.

The broader profile is not a repository-wide pass. Its four failing files are outside the edited runtime paths and are the same four files already recorded as failing in the R14 Implementer Report:

- `test/agent-harness/repository-io-hardening.test.cjs`: 1 failure; registered-root git-tool status returned false.
- `test/project-state/execution-completion.test.cjs`: 6 failures; source-neutral fixture planning requests unavailable deterministic ValidationCatalog proof.
- `test/source-control/managed-project-source.test.cjs`: 7 failures; candidate repository Git preparation fails.
- `test/source-control/workflow-integration-service.test.cjs`: 6 failures; expected integrated state, received failed.

These failures were not repaired, and no new causal baseline comparison is claimed. The skipped test is the opt-in Windows managed runtime qualification in `codex-runtime-manager.test.cjs`; external runtime qualification was not enabled. No packaging, release, external ChatGPT/Codex acceptance, or live Operator acceptance is claimed.

## Safety, checkpoint, and remaining acceptance

R15 adds no secrets, concrete machine paths, generated artifacts, or dependencies to committed files. The card-local staged diff is reviewed and scanned for secrets, local paths, and generated output before checkpoint. Only the eight listed source/test files and this report are staged. No unrelated files are staged, amended, restored, or modified.

Required checkpoint: `WSF20-R15 fix Repair browser actions and fresh Implement readiness`. Commit hash pending at report creation; the actual hash is reported after committing, without amending solely to insert its own hash.

Remaining Operator acceptance: continue the live Repair, confirm controls below ChatGPT, approve Repair planning, confirm canonical Implement shows Ready/enabled with a ready model/runtime, and click Implement to prepare/verify and start that exact Repair without manual source preparation. On the parent no-mutation return to Review & Validation, confirm Tester permits the exact R13 checkpoint-not-required case. Synthetic execution/layout evidence does not replace live visual/session acceptance. Broader validation failures remain unresolved and prevent claiming full repository qualification.

Recommended next task: Operator audit of R15 and the live Repair loop, with the four broader validation failures tracked separately. Stop after the required checkpoint.
