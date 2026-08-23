# Implementer Report: RECONSTRUCTION-REPAIR01-REPAIR03 Project Planning Gate Boundary and Baseline Canonical Correction

## Pass Type

Repair implementation pass for `RECONSTRUCTION-REPAIR01-REPAIR03`.

## Repository / Branch / Status Verification

- Repository path inspected: verified approved repo root (`<PROJECT_REPO>`).
- Branch inspected: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Remote verified: `origin` points to the approved public ChampCity A/I repository.
- Starting status: worktree already contained substantial unrelated deleted, modified, and untracked reconstruction files before this pass.
- Git mutation: not performed. No branch switch, pull, rebase, stage, commit, push, tag, reset, checkout, stash, or clean was run because the Repair Card forbids Git mutation unless separately authorized.
- Commit hash: not applicable; no commit created.

## Live Validation Failure Repaired

Operator live validation after RECONSTRUCTION-REPAIR01-REPAIR02 showed Project Planning using the correct authoritative blocker banner, but blocked with:

`Malformed canonical planning evidence must be resolved before Project Planning: planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md.`

The same blocker evidence also included unrelated repository source/configuration paths, which violated the intended boundary between planning-integrity blockers and repository reconciliation context.

## Root Causes

- Baseline duplicate-delimiter root cause: `planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md` contained a body prose example with the reserved canonical metadata opening and closing delimiter strings. `parseCanonicalMarkdownDocument()` correctly rejects any second delimiter occurrence anywhere in a canonical document.
- Preflight boundary root cause: `src/main/projectPlanning/projectPlanningPreflight.ts` merged `sourceEvidencePaths`, `legacyPlanningPaths`, `malformedPlanningPaths`, and `targetCollisions` into one `evidencePaths` array, then used that same array for `needs-attention` blockers.
- Source mismatch root cause: the same preflight returned `needs-attention` when Project Intake declared no existing source/planning but bounded repository source/config discovery found substantive source outside `planning/`.

## Files Created

- `repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR03_project_planning_gate_boundary_and_baseline_canonical_correction.md`

## Files Modified

- `planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md`
- `src/main/projectPlanning/projectPlanningPreflight.ts`
- `test/project-planning/project-planning-service.test.cjs`
- `test/reconstruction/reconstruction-repair01.test.cjs`

## Files Intentionally Not Created

- No JSON sidecars.
- No Project Profile or Project Roadmap placeholders.
- No new repository approval, validation disposition, persistent reconciliation state, or second Project Planning authority.
- No new parser compatibility bypass or duplicate metadata allowance.

## Implementation Summary

- Replaced the baseline body's literal reserved delimiter example with abstract placeholder text:
  - `[canonical metadata opening delimiter]`
  - `{ ...canonical JSON metadata... }`
  - `[canonical metadata closing delimiter]`
- Preserved the canonical parser unchanged, including duplicate metadata opening/closing delimiter rejection.
- Removed `sourceEvidencePaths` from Project Planning preflight blocker `evidencePaths`.
- Removed the `hasExistingSourceOrPlanning=false` plus source/config discovery `needs-attention` branch.
- Kept source/config discovery as repository reconciliation context through `sourceEvidencePaths`, `reconciliationMode=reconciliation-required`, and `repositoryReviewRequired=true`.
- Preserved planning-folder blockers for malformed canonical planning evidence and exact target collisions.

## Before / After Preflight Semantics

Before:

- Source/config paths outside `planning/` were merged into blocker evidence.
- Greenfield Intake plus substantive source could independently produce `needs-attention`.
- A malformed planning document blocker could display unrelated source/config evidence.

After:

- `sourceEvidencePaths` remains separate repository context.
- Source/config discovery outside `planning/` cannot independently produce `needs-attention`.
- Repository evidence causes or preserves `reconciliation-required` and `repositoryReviewRequired=true`.
- `needs-attention` blocker evidence is derived from planning artifacts/targets only.

## Proof: Baseline Parses Successfully

Command:

`node -e "...listPlanningDocuments...getProjectPlanningWorkspaceModel..."`

Result:

- `planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md`
  - `documentReadState=readable`
  - `participationRole=contextOnly`
  - `effectiveDisposition=Approved`
- Project Planning live corpus model:
  - `state=ready-for-handoff`
  - `railStatus=Ready`
  - `canPrepareHandoff=true`
  - `reconciliationMode=reconciliation-required`
  - `repositoryReviewRequired=true`

## Proof: Repository Source Cannot Independently Block

Updated focused fixture:

`test/project-planning/project-planning-service.test.cjs`

Scenario:

- Approved Intake/Prompt/Interview.
- Intake does not declare existing source/planning.
- `src/index.ts` exists outside `planning/`.

Expected and validated:

- `state=ready-for-handoff`
- `railStatus=Ready`
- `canPrepareHandoff=true`
- `reconciliationMode=reconciliation-required`
- `repositoryReviewRequired=true`
- `sourceEvidencePaths=["src/index.ts"]`
- `evidencePaths` does not include `src/index.ts`
- Project Planning handoff can be generated.

## Proof: True Planning Defects Still Block

Added focused fixture:

`test/project-planning/project-planning-service.test.cjs`

Scenario:

- Approved Intake/Prompt/Interview.
- Substantive `src/index.ts` and `package.json` exist outside `planning/`.
- Malformed canonical Markdown exists under `planning/`.

Expected and validated:

- `state=needs-attention`
- `railStatus=Needs Attention`
- `canPrepareHandoff=false`
- reason identifies malformed canonical planning evidence.
- evidence includes the malformed planning path.
- every blocker evidence path starts with `planning/`.
- blocker evidence excludes `src/index.ts` and `package.json`.

Updated preservation fixture:

`test/reconstruction/reconstruction-repair01.test.cjs`

Scenario:

- Source evidence exists outside `planning/`.
- A malformed planning document exists inside `planning/`.
- Rail and workspace model consume one Project Planning authority.

Expected and validated:

- Project Planning blocks on malformed planning evidence.
- Rail and workspace model agree.
- Source evidence is not included in blocker evidence.

## Commands Run and Results

- `pwd`
  - Result: verified approved repo root.
- `git status --short --branch`
  - Result: dirty worktree already present; no mutation performed.
- `git remote -v`
  - Result: approved `origin` remote verified.
- `npm run typecheck`
  - Lane: package validation, sandbox.
  - Result: passed, exit 0.
- `npm run build`
  - Lane: package validation, sandbox.
  - Result: failed with documented Vite/esbuild `spawn EPERM` before source build completion.
- `npm run build`
  - Lane: approved normal Windows rerun after documented sandbox `spawn EPERM`.
  - Result: passed, exit 0. Vite transformed 1624 modules and built `dist/renderer`.
- `node --test --test-concurrency=1 test/documents/canonical-markdown-document.test.cjs test/documents/planning-document-service.test.cjs test/project-planning/project-planning-service.test.cjs test/reconstruction/reconstruction-repair01.test.cjs test/renderer/project-planning-blocker-banner.test.cjs`
  - Lane: focused package test, sandbox.
  - Result: failed with documented test-runner `spawn EPERM` before executing test files.
- `node --test --test-concurrency=1 test/documents/canonical-markdown-document.test.cjs test/documents/planning-document-service.test.cjs test/project-planning/project-planning-service.test.cjs test/reconstruction/reconstruction-repair01.test.cjs test/renderer/project-planning-blocker-banner.test.cjs`
  - Lane: approved normal Windows rerun after documented sandbox `spawn EPERM`.
  - Result: passed, 46 tests passed, 0 failed.
- `node -e "...listPlanningDocuments...getProjectPlanningWorkspaceModel..."`
  - Lane: direct Node verification.
  - Result: live corpus baseline readable/contextOnly/Approved; Project Planning Ready/ready-for-handoff with `canPrepareHandoff=true`.
- `rg -n "(^|[^A-Za-z])([A-Za-z]:\\\\|[A-Za-z]:/)|/home/|/Users/|\\\\Users\\\\" ...`
  - Lane: local path safety scan over changed files and report.
  - Result: no concrete local machine path findings.
- `rg -n "sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|AKIA[0-9A-Z]{16}|BEGIN PRIVATE KEY|PRIVATE KEY-----" ...`
  - Lane: obvious secret-pattern safety scan over changed files and report.
  - Result: no findings.
- `git status --short -- <repair scope paths>`
  - Lane: read-only Git status.
  - Result: scoped changed files remain unstaged as required by the Repair Card.

## Validation Performed

- Canonical parser duplicate delimiter tests still pass.
- Planning document service focused suite passes.
- Project Planning service focused suite passes with new source-reconciliation and malformed-planning boundary tests.
- Reconstruction repair focused suite passes with planning-only blocker evidence.
- REPAIR02 blocker banner preservation suite passes.
- Live current corpus check confirms the actual baseline is readable and Project Planning is Ready.

## Validation Skipped and Reason

- Full historical test suite was not run because the Repair Card required the focused validation lane and explicitly said not to run the entire historical suite by default.
- Electron launch smoke was not run because this repair did not change runtime startup or UI placement and the Repair Card reserves live validation for the Operator after Architect review.
- Operator manual validation was not performed; Implementer authority is limited to automated/code validation and non-acceptance checks.

## Security / Secret-Safety Notes

- No secrets, tokens, credentials, `.env` content, or API keys were added.
- Durable artifacts use repo-relative paths and `<PROJECT_REPO>` rather than concrete local machine paths.
- No filesystem authority was broadened.
- No parser weakening or filename-specific bypass was introduced.

## Deviations / Blockers

- No implementation blockers remain.
- Git mutation was intentionally skipped to comply with the Repair Card.
- The broader worktree remains dirty with unrelated reconstruction changes that predated or sit outside this pass.

## Manual Validation Required

After Architect review passes, the Operator should:

1. Launch ChampCity A/I against the current cleaned reconstruction corpus.
2. Verify Project Intake and Architect Interview remain Completed.
3. Verify `CURRENT_APPLICATION_BASELINE.md` no longer produces malformed canonical planning evidence.
4. Verify Project Planning shows Ready before entering the workspace.
5. Enter Project Planning and verify it remains Ready.
6. Verify no blocker banner is shown for repository source/config existence alone.
7. Verify `Prepare Project Planning Handoff` is enabled.
8. Prepare the Project Planning handoff and continue the normal reconstruction workflow.

## Recommended Next Implementer Task

Return this repair for Architect code review. If review passes, proceed to Operator live validation using the required manual validation steps above.
