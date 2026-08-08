# Architect Review — WC46-REPAIR16 Repository Authority/MCP Binding Separation and Compact Draft IDs

Document.Status=Approved  
Review revision: 1  
Reviewed artifact: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR16_repository_authority_mcp_binding_and_compact_draft_ids.md`  
Reviewed Work Card: `planning/phases/phase-08/Work_Cards/WC46-REPAIR16_repository_authority_mcp_binding_and_compact_draft_ids.md` revision 1

## Disposition

Approved for Operator validation.

WC46-REPAIR16 satisfies the bounded repair contract. The implementation separates repository authority from MCP workspace binding readiness and replaces full source-path encoded Architect draft submission IDs with compact deterministic source-path digests. No blocking production defect was found in the reviewed path.

## Repository Verification

Repository reviewed through ChampCity MCP workspace `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`.

The working tree remains dirty from the active WC46 repair series. No Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, tag, or other Git mutation was performed during this review. Final MCP status reported zero staged files.

## Inputs Reviewed

- Approved Repair Work Card: `planning/phases/phase-08/Work_Cards/WC46-REPAIR16_repository_authority_mcp_binding_and_compact_draft_ids.md`, revision 1, sha256 `a42806ed6f20bfe8e0bd1dcab90e47f0e1fa3e40a2dad0b231c5ae33741c1fac`
- Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR16_repository_authority_mcp_binding_and_compact_draft_ids.md`, sha256 `9d0c221bf2ce0c5c939584d0fbcec64c56701c6e2c0848e6c8bba445cad79e9a`
- Production files reviewed:
  - `src/main/documents/repositoryAuthority.ts`
  - `src/main/integrations/mcpWorkspacePromptContract.ts`
  - `src/main/integrations/architectMcpHandoffService.ts`
  - `src/main/architectOutputs/architectDraftPaths.ts`
  - `src/main/architectOutputs/architectOutputWorkspaceService.ts`
  - targeted source-handoff reuse evidence in `src/main/architectOutputs/architectOutputRuntimeService.ts`
- Test files reviewed:
  - `test/support/canonical-markdown-fixtures.cjs`
  - `test/architect-outputs/architect-draft-ingestion.test.cjs`
  - `test/project-intake/project-intake-service.test.cjs`
  - `test/architect-interview/architect-interview-workspace.test.cjs`

I did not rerun validation commands. Implementer-reported command results are treated as reported evidence only.

## Contract Alignment

### Defect A — Repository authority and MCP binding separation

The implementation now separates the two readiness concepts.

`src/main/documents/repositoryAuthority.ts` now defines `requireRepositoryAuthorityForPrompt(...)` as repository-authority-only validation and introduces `requireMcpWorkspaceBindingForPrompt(...)` for the distinct MCP binding requirement. Missing repository authority now throws `BLOCKED_REPOSITORY_AUTHORITY_REQUIRED`; missing explicit MCP binding now throws `BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED`. This satisfies the Work Card requirement to stop calling missing MCP binding a corrupt/missing repository authority condition.

`src/main/integrations/mcpWorkspacePromptContract.ts` now resolves binding for prompt generation by using `repositoryAuthority.mcpWorkspaceBinding` when present, otherwise using the explicit project/app binding file when present, and otherwise throwing `BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED`. It does not derive a workspace ID from `projectRepository`, folder name, Git remote, repository name, diagnostics, or artifact search.

`src/main/integrations/architectMcpHandoffService.ts` now reads the prompt document workflowData and delegates binding resolution to `resolveMcpWorkspaceBindingForPrompt(...)`. This preserves a single prompt-routing contract and removes the earlier hard dependency on `requireRepositoryAuthorityForPrompt(...)` as an MCP-binding gate.

### Defect B — Compact Architect draft submission IDs

`src/main/architectOutputs/architectDraftPaths.ts` now builds deterministic Architect draft submission IDs using a compact source-path digest instead of the full base32-encoded source handoff path.

The new ID shape is:

```text
ad-<owning-workspace>-<output-kind>-<submission-key>-src-<20-hex-sha256-prefix>-r<revision>
```

The full source path is still normalized and included in the digest input, but the full path remains stored as `submission.sourceHandoff.path` rather than embedded into the directory name. Existing runtime reuse and stale/source mismatch checks continue to compare the full stored `sourceHandoff.path` and `sourceHandoff.revision`, not the digest alone.

## Evidence From Tests

The new no-binding Project Intake test uses `tempWorkspaceWithoutBinding(...)` and verifies Project Intake still persists `repositoryAuthority.projectRepository` while `repositoryAuthority.mcpWorkspaceBinding` remains absent. The negative test still confirms `projectRepository` is not accepted as an MCP workspace ID.

The Architect Interview no-binding test verifies the workspace model remains usable after Project Intake approval, while `prepareArchitectInterviewHandoff(...)` blocks specifically with `BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED` and does not create a draft directory.

The Architect Interview long-path test covers the real failed prompt path:

```text
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_pocket_decision_log.md
```

It verifies the active submission ID matches the compact digest shape, the full source path and revision remain stored, the draft invocation path uses the compact submission ID, and the full source path words are not embedded into the ID.

The Architect draft ingestion test covers both the real long Architect Interview prompt path and a long repair handoff path, verifies digest-shaped IDs, verifies submission and draft path length bounds, verifies deterministic behavior for identical inputs, and verifies source path/revision changes still produce distinct IDs.

## Acceptance Criteria Assessment

1. `repositoryAuthority.projectRepository` remains persisted and propagated prospectively — Pass.
2. `repositoryAuthority.mcpWorkspaceBinding` remains optional and explicit-only — Pass.
3. Missing `mcpWorkspaceBinding` no longer produces an error claiming repository authority is missing or corrupt — Pass.
4. Missing `mcpWorkspaceBinding` blocks MCP-dependent handoff/prompt generation before prompt emission with a clear MCP binding setup message — Pass.
5. No MCP workspace ID is inferred from `projectRepository`, folder name, Git remote, repository name, diagnostics, or artifact path search — Pass in reviewed code.
6. Explicit `mcpWorkspaceBinding.mcpWorkspaceId` is used literally when present — Pass.
7. `buildDeterministicArchitectDraftSubmissionId(...)` no longer embeds the full encoded `sourceHandoff.path` in the submission ID — Pass.
8. Submission IDs remain deterministic and path-safe — Pass.
9. Full `sourceHandoff.path` and `sourceHandoff.revision` remain stored in the submission record and remain the authority for stale/source mismatch checks — Pass.
10. The real failing Architect Interview Prompt path for `pocket_decision_log` no longer causes a 240-character submission ID failure when explicit MCP binding exists — Pass.
11. A long Work Card or Repair handoff path no longer causes a 240-character submission ID failure — Pass for the reviewed long repair handoff test.
12. Tests include a new-project fixture without `.champcity/mcp-workspace-binding.json` and prove `repositoryAuthority.projectRepository` still persists — Pass.
13. Tests prove no prompt/artifact-tool JSON is emitted without explicit MCP binding — Pass via no-binding handoff failure and no draft directory assertion.
14. Existing explicit-binding happy-path tests continue to pass — Supported by Implementer-reported full-suite pass.
15. No legacy document migration is performed — Pass; no migration/backfill code was introduced.
16. No unrelated workflow routing, validation, repair, close, Codex, or UI redesign changes are introduced — Pass in reviewed surface.
17. No Git mutation is performed — Pass.

## Blocking Findings

None.

## Non-Blocking Concerns

The Implementer-reported validation is strong, but I did not independently run the commands. Operator manual validation remains required for the actual embedded-app flow.

The compact digest is appropriate for draft directory identity. The design remains correct because the full `sourceHandoff.path` and revision are preserved in the submission record and continue to drive stale/source validation.

## Validation Evidence Recorded From Implementer Report

The Implementer reported:

```text
npx tsc --noEmit → exit 0
npx tsc → exit 0 after sandbox emit restriction false failure
targeted regression suites → exit 0, 19 tests passed
npx vite build → exit 0 after sandbox spawn EPERM false failure
node --test --test-concurrency=1 → exit 0, 316 tests passed, 0 failed
```

Those results were not rerun by this review.

## Manual Validation Required

Operator should validate:

1. Create or use a new project without explicit MCP binding.
2. Confirm Project Intake and Project Architect Interview Prompt metadata contain `repositoryAuthority.projectRepository`.
3. Confirm Architect Interview workspace displays normally after Project Intake approval.
4. Click Prepare Handoff and confirm the error is a clear MCP binding setup blocker, not a repository-authority failure.
5. Add explicit MCP binding for the project.
6. Click Prepare Handoff again and confirm no 240-character Architect draft submission ID error occurs.
7. Confirm Copy Handoff becomes available after successful preparation.
8. Confirm no legacy document was migrated solely for this repair.

## Final Disposition

Approved for Operator validation.
