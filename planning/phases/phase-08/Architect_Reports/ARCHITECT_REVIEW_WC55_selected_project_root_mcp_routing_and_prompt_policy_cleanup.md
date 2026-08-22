<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC55"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "reviewKind": "work-card-architect-review",
    "workCardId": "WC55",
    "disposition": "approved_for_operator_validation",
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "WC55 implementation satisfies the source contract and is approved for Operator validation. MCP routing now derives from the application-selected project root, Implementer Report repository-authority mutation is rejected, and the Codex prompt-policy cleanup removes the overbroad path/artifact rules while retaining narrow secret protection. No unrelated ideological or political prompt-policy language was found in the reviewed production source.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC55 Selected Project Root MCP Routing and Prompt Policy Cleanup

## Disposition

Approved for Operator validation.

## Scope Reviewed

Reviewed WC55 against:

- `planning/phases/phase-08/Work_Cards/WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md`
- `src/main/integrations/mcpWorkspacePromptContract.ts`
- `src/main/integrations/architectMcpHandoffService.ts`
- `src/main/workCardValidation/workCardValidationService.ts`
- `src/main/workCardBuilding/workCardBuildingReviewService.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workspaceSettings.ts`
- focused routing, report-readiness, Project Intake/Planning, Architect-output, and Codex execution tests

Repository status was verified through ChampCity MCP on branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. The worktree remains dirty with pre-existing Phase 08 changes. No staging, commit, push, reset, clean, stash, or other Git mutation was performed during this review.

## Findings

The production implementation satisfies the WC55 routing and prompt-policy contract.

### Selected-root MCP routing

`mcpWorkspacePromptContract.ts` now constructs the normal MCP route exclusively from the application-selected `workspaceRoot`:

```text
path.resolve(workspaceRoot)
→ path.basename(...)
→ normalizeWorkspaceId(...)
```

`requireBoundMcpWorkspace`, `resolveMcpWorkspaceBindingForPrompt`, `buildMcpWorkspaceBindingPromptBlock`, and `buildCreateMarkdownArtifactJsonBlock` all use that selected-root route. Mutable artifact `workflowData`, `repositoryAuthority.projectRepository`, and explicit binding metadata cannot override the normal route.

The intended normalization convention is preserved. A selected root folder named `ChampCity_PDL` produces `champcity_pdl`. The regression test in `test/work-card-validation/work-card-validation-service.test.cjs` explicitly supplies Implementer Report evidence containing `projectRepository = "repository root"` and verifies that the advisory prompt contains `champcity_pdl` and does not contain `repository_root`.

Current production MCP prompt consumers continue to call the shared helper across Architect Interview, Project Planning, Phase Map, Phase Interview, Phase Planning, Work Card Planning, Repair Work Card, Advisory Work Card Validation, and body-only Architect draft artifact invocation paths. Some call sites still pass a workflowData argument for compatibility, but the shared helper deliberately ignores it; no current production route derives workspaceId from that argument.

`workspaceIdFromProjectRepository(...)` and the older explicit-binding requirement helper remain exported but have no current production call sites. They are not part of the active prompt-routing path and do not override selected-root routing.

### Advisory Architect Review

`buildAdvisoryArchitectReviewPrompt(...)` now builds the MCP binding block from `workspaceRoot` only. Its current Implementer Report resolution flows through `requireReadyImplementerReportForReview(...)`, so the new repository-authority integrity check is active before advisory prompt generation.

This removes the confirmed WC55 defect in which mutable Implementer Report metadata could produce the nonexistent `repository_root` workspace ID.

### Implementer Report authority integrity

`workCardBuildingReviewService.ts` now compares nested Implementer Report `repositoryAuthority` against authority inherited from the approved source Work Card revisions when that authority exists. A mismatch classifies the report as invalid for review rather than accepting the Implementer-authored value as application authority.

The focused regression test verifies that a report changing nested `repositoryAuthority.projectRepository` to `repository root` is rejected.

### Codex Implementer prompt policy

The production prompt no longer contains:

```text
Do not modify files outside this repository root.
Do not write absolute local machine paths into repository artifacts.
```

The prior broad artifact prohibition covering production endpoints, screenshots, archives, and build outputs is also absent.

The replacement is narrow secret protection covering secrets, credentials, authentication tokens, API/provider keys, and private environment-file contents, subject to explicit secure handling authorized by the Approved Work Card.

The prompt now explicitly states that no generic security scan, safety scan, path-sanitization scan, or secret-like-string scan is an Implementer completion requirement unless the Work Card or project validation instructions require it. Auxiliary scans cannot replace Work Card acceptance evidence.

The prompt also states that canonical identity, source revisions, repository authority, and disposition authority are application-owned report metadata fields that the Implementer must not rewrite.

WC54 full local execution authority remains intact. Current production policy still resolves `sandboxMode = danger-full-access`, `approvalPolicy = never`, and network access enabled, and focused tests capture those exact SDK thread options.

### Workspace settings adaptation

`src/main/workspaceSettings.ts` is outside WC55's listed expected production surface, but the change is directly coupled to the shared helper semantic change rather than an unrelated redesign. Workspace settings now expose only an explicitly configured MCP binding as binding metadata; they do not misrepresent the selected-root-derived route as an explicit stored binding. This preserves the distinction required by WC55 between selected-root routing and optional binding metadata.

No new workspace discovery, similarity matching, Git-remote inference, diagnostics search, or cross-workspace fallback was introduced.

## Prompt-Policy Contamination Check

A production-source search found no `nazi`, `fasc`, `politic`, or `ideolog` strings in `src/main`. No unrelated political, ideological, or behavioral doctrine was added to the Implementer prompt or other reviewed production prompt paths.

The only generic security-scan phrase remaining in production is the WC55-required negative instruction stating that such scans are not completion gates.

## Automated Validation Evidence

Implementer-reported validation results:

- `npx tsc --noEmit`: passed.
- `npx tsc`: passed in the normal Windows validation lane.
- `npx vite build`: passed in the normal Windows validation lane.
- focused WC55 tests: 45/45 passed in the normal Windows validation lane.
- app-shell regression tests: 8/8 passed.
- full Node test suite: 330/330 passed.

The Implementer documented the expected restricted-environment `EPERM`/`spawn EPERM` failures before rerunning the affected commands in the normal Windows lane. Those environment failures do not contradict the final validation results.

The Architect did not independently rerun Node/npm commands during this MCP review; production code and regression tests were inspected directly.

## Non-Blocking Concerns

Two compatibility remnants remain:

1. several prompt call sites still pass workflowData into shared MCP helper signatures even though those parameters are ignored; and
2. legacy exported helpers for projectRepository/explicit-binding interpretation remain present with no current production consumers.

Neither provides a current mutable-artifact routing path, so neither violates WC55 acceptance behavior. They are cleanup candidates only if a later card deliberately removes obsolete compatibility API surface.

The Implementer Report body still says `Status: Pending Implementer completion.` even though its evidence and metadata represent a completed Pending-for-review report. This is wording inconsistency only; the required `Document.Status=Pending` and canonical Pending disposition are correct.

## Acceptance Criteria Assessment

1. PASS — selected `ChampCity_PDL` root produces `champcity_pdl` independent of report projectRepository evidence.
2. PASS — regression test reproduces the observed `repository root` defect and excludes `repository_root`.
3. PASS — Advisory Architect Review routes from selected root.
4. PASS — current production MCP prompt families use the shared selected-root route; workflowData arguments are inert where still passed.
5. PASS — normal route requires no explicit binding file, binding metadata, Git remote, diagnostics search, or cross-workspace fallback.
6. PASS — generated prompts retain one literal workspaceId and prohibit workspace switching/search.
7. PASS — report readiness rejects repository-authority mutation when application/approved-contract authority exists.
8. PASS — repository-boundary prompt prohibition removed.
9. PASS — absolute-local-path prompt prohibition removed.
10. PASS — broad artifact prohibition removed and replaced with narrow secret protection.
11. PASS — generic scan behavior is explicitly not an implicit completion gate.
12. PASS — Implementer Report inventories production prompt families inspected and records the equivalent language changed.
13. PASS — Implementer reports focused and full regression suites green; reviewed tests cover the changed production contracts.
14. PASS — Implementer reports typecheck, build, and full test suite passing in the normal ChampCity validation lanes.

No blocking acceptance failure was identified. No repair card is warranted from the reviewed repository evidence.

## Required Operator Validation

Use the selected `ChampCity_PDL` project and perform the WC55 manual validation exactly as defined by the Work Card:

1. Generate the Advisory Architect Review prompt from the current PDL repair report containing descriptive `projectRepository = "repository root"` evidence.
2. Confirm the prompt contains `Bound workspaceId: champcity_pdl` and `Use ChampCity MCP workspaceId "champcity_pdl" only.`
3. Confirm `repository_root` does not appear.
4. Send the prompt to embedded ChatGPT and confirm the exact Work Card and Implementer Report are readable from `champcity_pdl` without workspace mismatch.
5. Run a normal Codex Implementer cycle and confirm the production prompt does not impose absolute-path sanitization, repository-only tool-installation constraints, or a generic security/safety scan completion requirement.

## Final Disposition

WC55 is approved for Operator validation. No Git mutation was performed.
