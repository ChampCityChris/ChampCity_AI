# Implementer Report - WC46-REPAIR16 Repository Authority/MCP Binding Separation and Compact Draft IDs

Status: Pending Architect/Operator review

## Pass Type

Numbered repair Work Card implementation pass.

## Repository Path Inspected

Verified approved repo root: `<PROJECT_REPO>`.

## Git Branch And Remote Status

- Branch inspected: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Remote tracking status inspected: branch tracks `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Git mutation authorized: no.
- Git actions performed: read-only status and diff inspection only.
- Commit created: no.
- Commit hash: not applicable; Git mutation was prohibited.
- Tag created: no.

The worktree contained prior uncommitted WC46 repair and UI/test changes before this pass. This pass did not stage, commit, push, branch, pull, rebase, merge, reset, clean, stash, checkout, or tag.

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR16_repository_authority_mcp_binding_and_compact_draft_ids.md`

## Files Modified

- `src/main/documents/repositoryAuthority.ts`
- `src/main/integrations/mcpWorkspacePromptContract.ts`
- `src/main/integrations/architectMcpHandoffService.ts`
- `src/main/architectOutputs/architectDraftPaths.ts`
- `test/support/canonical-markdown-fixtures.cjs`
- `test/architect-outputs/architect-draft-ingestion.test.cjs`
- `test/project-intake/project-intake-service.test.cjs`
- `test/architect-interview/architect-interview-workspace.test.cjs`

## Files Intentionally Not Created

- No JSON sidecars for governed Work Cards or reports.
- No legacy document migration or backfill utility.
- No MCP server change.
- No inferred workspace lookup cache or repository-name matching helper.
- No renderer UI redesign.
- No Git staging, commit, push, branch, pull, rebase, merge, reset, clean, stash, checkout, or tag.

## RCA Confirmation

Defect A was confirmed in the repository-authority prompt path. The previous helper required `repositoryAuthority.mcpWorkspaceBinding` whenever repository authority existed, so a valid `repositoryAuthority.projectRepository` packet without MCP binding was reported as a repository-authority/workspace mismatch. The repair separates repository-authority presence from MCP prompt readiness.

Defect B was confirmed in Architect draft path construction. The deterministic submission ID embedded the full encoded `sourceHandoff.path`, so valid long handoff paths could exceed the 240-character submission ID bound. The repair replaces the full path component with a compact deterministic source-path digest while keeping full source handoff evidence in the submission record.

## Implementation Summary

`src/main/documents/repositoryAuthority.ts` now distinguishes missing repository authority from missing MCP binding. `requireRepositoryAuthorityForPrompt(...)` requires only repository authority. `requireMcpWorkspaceBindingForPrompt(...)` requires the optional explicit MCP binding and raises `BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED` when that binding is absent.

`src/main/integrations/mcpWorkspacePromptContract.ts` now resolves prompt routing in this order: inherited `repositoryAuthority.mcpWorkspaceBinding` when present, otherwise an explicit configured project/app binding when present, otherwise the MCP binding setup blocker. It does not derive a workspace ID from `projectRepository`, folder name, Git remote, repository name, diagnostics, or artifact search.

`src/main/integrations/architectMcpHandoffService.ts` now reads prompt metadata and resolves the explicit MCP binding through the same prompt contract before returning a ready manifest. It returns the explicit `mcpWorkspaceBinding` instead of a generic repository reference.

`src/main/architectOutputs/architectDraftPaths.ts` now builds IDs in this shape:

```text
ad-<owning-workspace>-<output-kind>-<submission-key>-src-<20-hex-sha256-prefix>-r<revision>
```

The digest is computed from the normalized repository-relative `sourceHandoff.path`. The revision remains a separate `r<revision>` component. This is deterministic for the same owning workspace, output kind, submission key, source path, and revision, remains path-safe under the existing segment pattern, and keeps long valid source paths below both submission ID and draft relative path limits.

## Before And After Behavior

Before this repair, `repositoryAuthority.projectRepository` without `mcpWorkspaceBinding` produced a workspace/artifact mismatch that implied repository authority was invalid. After this repair, Architect Interview document projection remains usable when Project Intake and Prompt are otherwise ready; MCP-dependent handoff preparation blocks with `BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED` before emitting a prompt or artifact-tool JSON.

Before this repair, Architect draft IDs included the full encoded source handoff path. After this repair, IDs include only `src-<digest>` plus revision, while `submission.sourceHandoff.path` and `submission.sourceHandoff.revision` still store the full authoritative path and revision for reuse, stale checks, and promotion-context validation.

## Source Handoff Authority Proof

The full source path and revision remain in `ArchitectDraftSubmission.sourceHandoff`. Existing runtime reuse and promotion checks continue comparing full `submission.sourceHandoff.path` and `submission.sourceHandoff.revision`, not the digest alone. New tests assert that the real `pocket_decision_log` prompt path and a long Repair handoff path stay stored in `submission.sourceHandoff` while the submission ID contains only `src-<20-hex-digest>`.

## No MCP Inference Proof

- No code was added to inspect Git remotes, folder names, repository names, MCP diagnostics, artifact paths, or similarity matches for workspace ID derivation.
- `projectRepository` is still not accepted as an MCP workspace ID; the negative Project Intake test now uses an unbound fixture to prove this.
- Prompt JSON is emitted only after an explicit MCP binding is resolved.
- Explicit binding, when present, is used literally as `workspaceId`.

## Validation Performed

- `pwd`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: read-only shell.
  - Exit code: 0.
  - Result: verified approved repo root.

- `git status --short --branch`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: read-only Git.
  - Exit code: 0.
  - Result: branch and dirty worktree inspected before implementation.

- `Get-Content docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: read-only shell.
  - Exit code: 0.
  - Result: repository boundary read before production/test changes.

- `Get-Content docs/dev/VALIDATION_COMMAND_LANES.md`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: read-only shell.
  - Exit code: 0.
  - Result: validation lane instructions read before build/test commands.

- `Get-Content planning/phases/phase-08/Work_Cards/WC46-REPAIR16_repository_authority_mcp_binding_and_compact_draft_ids.md`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: read-only shell.
  - Exit code: 0.
  - Result: approved Work Card read.

- `npx tsc --noEmit`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: Direct clean-room automated validation.
  - Exit code: 0.
  - Result: typecheck passed.

- `npx tsc`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: sandbox first.
  - Exit code: 1.
  - Result: documented sandbox write restriction while emitting `dist/` files.

- `npx tsc`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: normal Windows validation lane after sandbox write failure.
  - Exit code: 0.
  - Result: TypeScript emit/build passed.

- `node --test --test-concurrency=1 test/architect-outputs/architect-draft-ingestion.test.cjs test/project-intake/project-intake-service.test.cjs test/architect-interview/architect-interview-workspace.test.cjs`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: sandbox first.
  - Exit code: 1.
  - Result: documented child-process `spawn EPERM` sandbox false-failure mode before test bodies executed.

- `node --test --test-concurrency=1 test/architect-outputs/architect-draft-ingestion.test.cjs test/project-intake/project-intake-service.test.cjs test/architect-interview/architect-interview-workspace.test.cjs`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: normal Windows validation lane after sandbox `spawn EPERM`.
  - Exit code: 1.
  - Result: 18 passed, 1 failed. The no-binding Architect Interview test fixture left Project Intake Pending, so prerequisites blocked before MCP binding readiness.

- `node --test --test-concurrency=1 test/architect-outputs/architect-draft-ingestion.test.cjs test/project-intake/project-intake-service.test.cjs test/architect-interview/architect-interview-workspace.test.cjs`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: normal Windows validation lane after fixture correction.
  - Exit code: 0.
  - Result: targeted regression suites passed, 19 tests passed, 0 failed.

- `npx vite build`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: sandbox first.
  - Exit code: 1.
  - Result: documented esbuild child-process `spawn EPERM` sandbox false-failure mode.

- `npx vite build`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: normal Windows validation lane after sandbox `spawn EPERM`.
  - Exit code: 0.
  - Result: renderer production build passed; 1622 modules transformed.

- `node --test --test-concurrency=1`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: normal Windows validation lane after sandbox `spawn EPERM`.
  - Exit code: 0.
  - Result: full suite passed, 316 tests passed, 0 failed.

- `rg -n "<local-machine-path-patterns>" <WC46-REPAIR16 touched files>`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: read-only safety scan.
  - Exit code: 1.
  - Result: no concrete local machine path matches found.

- `rg -n "<secret-shaped token patterns>" <WC46-REPAIR16 touched files>`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: read-only safety scan.
  - Exit code: 1.
  - Result: no secret-shaped token, private-key, credential, or `.env` matches found.

- `git diff -- <WC46-REPAIR16 touched files>`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: read-only Git.
  - Exit code: 0.
  - Result: reviewed bounded production/test diff.

- `git status --short`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: final read-only Git status.
  - Exit code: 0.
  - Result: work remains unstaged and uncommitted as required; prior dirty files outside this pass remain in the worktree.

- `rg -n "<local-machine-path-and-secret-patterns>" <WC46-REPAIR16 touched files and report>`
  - Working directory: `<PROJECT_REPO>`.
  - Lane: final read-only safety scan.
  - Exit code: 0.
  - Result: matches were limited to this report's own security-note wording for `.env`, token, private-key, and credential terms; no secret values or concrete local machine paths were found.

## Acceptance Criteria Mapping

1. `repositoryAuthority.projectRepository` remains persisted and propagated prospectively: satisfied; no propagation removal was made and full suite passed.
2. `repositoryAuthority.mcpWorkspaceBinding` remains optional and explicit-only: satisfied by helper split and no-binding fixture.
3. Missing `mcpWorkspaceBinding` no longer produces a repository-authority missing/corrupt claim: satisfied by `BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED` and regression assertions.
4. Missing `mcpWorkspaceBinding` blocks MCP-dependent handoff/prompt generation before prompt emission: satisfied by Architect Interview no-binding test and no draft directory creation assertion.
5. No MCP workspace ID is inferred from repository evidence or diagnostics: satisfied by code inspection and negative prompt test.
6. Explicit `mcpWorkspaceBinding.mcpWorkspaceId` is used literally when present: preserved and covered by existing prompt tests and full suite.
7. `buildDeterministicArchitectDraftSubmissionId(...)` no longer embeds the full encoded source path: satisfied by compact `src-<digest>` implementation and negative ID assertions.
8. Submission IDs remain deterministic and path-safe: satisfied by existing identity-pair assertions, digest regex assertions, typecheck, and tests.
9. Full source handoff path/revision remain stored and authoritative: satisfied by sourceHandoff assertions and unchanged runtime comparison logic.
10. The real `pocket_decision_log` prompt path no longer causes a 240-character failure with explicit MCP binding: satisfied by Architect Interview long-path regression.
11. A long Repair handoff path no longer causes a 240-character failure: satisfied by Architect draft path regression.
12. Tests include a new-project fixture without `.champcity/mcp-workspace-binding.json` and prove repositoryAuthority.projectRepository still persists: satisfied by `tempWorkspaceWithoutBinding(...)` and Project Intake test.
13. Tests prove no prompt/artifact-tool JSON is emitted without explicit MCP binding: satisfied by Architect Interview no-binding test and no draft directory assertion.
14. Existing explicit-binding happy-path tests continue to pass: satisfied by targeted and full test suites.
15. No legacy document migration is performed: satisfied; no migration/backfill code was added.
16. No unrelated workflow routing, validation, repair, close, Codex, or UI redesign changes introduced: no renderer/UI changes were made by this pass; full suite passed.
17. No Git mutation performed: satisfied.

## Validation Skipped

- Operator manual validation: not performed by Implementer; remains required.
- Real embedded ChatGPT/MCP validation: not performed; automated prompt-contract and handoff tests cover local fail-closed and explicit-binding behavior only.
- Legacy migration validation: skipped because no legacy migration is authorized or implemented.
- Electron launch smoke: skipped because this repair is backend/test focused and full typecheck/build/test validation passed.
- Git staging/commit/push: skipped because Git mutation is prohibited.

## Security And Secret-Safety Notes

No secrets, credentials, API keys, token values, `.env` contents, private keys, screenshots, archives, or generated junk were intentionally added. Durable artifacts in this report use `<PROJECT_REPO>` and repo-relative paths instead of concrete local machine paths. Renderer filesystem authority was not broadened.

## Manual Validation Required

1. Create a new project without explicit MCP binding.
2. Confirm Project Intake and Project Architect Interview Prompt metadata contain `repositoryAuthority.projectRepository`.
3. Confirm Architect Interview workspace displays normally after Project Intake is Approved.
4. Click Prepare Handoff and confirm the error is a clear MCP binding setup blocker, not a repository-authority failure.
5. Add explicit MCP binding for the project.
6. Click Prepare Handoff again and confirm no 240-character Architect draft submission ID error occurs.
7. Confirm Copy Handoff becomes available after successful preparation.
8. Confirm no legacy document was migrated solely for this repair.

## Residual Risks

- Automated validation proves repository-contained local behavior, not real Operator MCP workspace availability.
- The compact digest is collision-resistant for draft identity, but the full source path and revision remain the authoritative stale/source check by design.
- Existing legacy documents without repository authority or binding remain unchanged by design.
- The worktree still contains prior dirty files outside this pass; review should distinguish WC46-REPAIR16 files from earlier uncommitted changes.

## Blocking Questions

None.

## Recommended Next Implementer Task

Run Architect review on this report, then perform the Operator manual validation steps for the no-binding and explicit-binding handoff flows.
