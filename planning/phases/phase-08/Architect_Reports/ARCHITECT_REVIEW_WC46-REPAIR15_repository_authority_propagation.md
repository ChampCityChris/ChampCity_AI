# Architect Review — WC46-REPAIR15 Repository Authority Propagation

Document.Status=RevisionRequested  
Review revision: 1  
Reviewed artifact: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR15_repository_authority_propagation.md`  
Reviewed Work Card: `planning/phases/phase-08/Work_Cards/WC46-REPAIR15_repository_authority_propagation.md` revision 1

## Disposition

RevisionRequested.

WC46-REPAIR15 is directionally correct and the reviewed production implementation mostly matches the intended architecture: repository authority is now a shared packet, Project Intake seeds it, downstream writers generally inherit it, and MCP prompt generation still requires an explicit MCP binding rather than deriving workspace IDs. However, one Work Card acceptance criterion remains unproven: the required prospective-chain test does not prove repositoryAuthority is written into Project Profile and Project Roadmap outputs.

This is a proof gap, not a confirmed production-code failure. The production code reviewed for Project Profile and Project Roadmap appears to merge repositoryAuthority into those outputs. The issue is that the Work Card explicitly required tests to prove the prospective chain into Project Planning handoff/Profile/Roadmap and Work Card Intake/Formal Work Card, and the current tests only prove the Project Planning handoff plus Work Card Intake/Formal Work Card portions.

## Repository Verification

Repository reviewed through ChampCity MCP workspace `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`.

The working tree remains dirty from the active WC46 repair series. No Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, tag, or other Git mutation was performed during this review.

## Inputs Reviewed

- Approved Work Card: `planning/phases/phase-08/Work_Cards/WC46-REPAIR15_repository_authority_propagation.md`, revision 1, sha256 `0232ef8c9ba6154c610f7a223eb9236ccb3f2b24641cb0e3d0e34fd7cd323641`
- Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR15_repository_authority_propagation.md`, sha256 `5477035c02a2227af5e2634647929ae4c60fcdb47aa17b496623b5fe07b39932`
- Production files reviewed:
  - `src/main/documents/repositoryAuthority.ts`
  - `src/main/integrations/mcpWorkspacePromptContract.ts`
  - `src/main/integrations/architectMcpHandoffService.ts`
  - `src/main/projectIntake/projectIntakeService.ts`
  - `src/main/architectInterview/architectInterviewDraftPilot.ts`
  - `src/main/projectPlanning/projectPlanningService.ts`
  - `src/main/projectPlanning/projectPlanningDraftBundle.ts`
  - `src/main/projectPlanning/projectPlanningContext.ts`
  - `src/main/phaseMap/phaseMapDraftOutput.ts`
  - `src/main/phaseClose/phaseCloseService.ts`
  - `src/main/projectClose/projectCloseService.ts`
  - Work Card service search results for `workCardIntake`, `workCardPlanning`, `workCardBuilding`, `workCardValidation`, and `workCardRepair`
- Test files reviewed:
  - `test/project-intake/project-intake-service.test.cjs`
  - `test/project-planning/project-planning-service.test.cjs`
  - `test/phase-map/phase-map-service.test.cjs`
  - `test/work-card-planning/work-card-planning-service.test.cjs`

I did not rerun validation commands. Implementer command results are treated as reported evidence only.

## Passing Findings

### P-01 — Shared repository-authority helper exists and preserves separation of concerns

`src/main/documents/repositoryAuthority.ts` defines the intended shared packet:

```text
RepositoryAuthority.projectRepository
RepositoryAuthority.mcpWorkspaceBinding
```

The helper keeps `projectRepository` and `mcpWorkspaceBinding.mcpWorkspaceId` separate. `repositoryAuthorityFromWorkflowData(...)` treats top-level `projectRepository` as legacy-compatible project authority only. `requireRepositoryAuthorityForPrompt(...)` fails closed when repository authority exists without an explicit `mcpWorkspaceBinding`.

No reviewed code derives MCP workspace ID from project repository path, Git remote, folder name, diagnostics, or artifact search.

### P-02 — Project Intake correctly seeds repository authority prospectively

`src/main/projectIntake/projectIntakeService.ts` now builds repository authority from the normalized `submission.projectRepository` and explicit project-local MCP binding when present. It writes:

```text
workflowData.projectRepository
workflowData.repositoryAuthority.projectRepository
workflowData.repositoryAuthority.mcpWorkspaceBinding, when explicit binding exists
```

The Project Architect Interview Prompt metadata spreads the same `intakeContent`, preserving the authority packet.

### P-03 — MCP prompt binding continues to fail closed correctly

`src/main/integrations/mcpWorkspacePromptContract.ts` now resolves MCP prompt binding from inherited repositoryAuthority when present. If repositoryAuthority exists but lacks explicit `mcpWorkspaceBinding`, prompt generation fails through `requireRepositoryAuthorityForPrompt(...)`.

The legacy explicit app/project binding path remains available only when no repositoryAuthority packet exists. This preserves REPAIR12's no-fallback rule while allowing older readable documents without repositoryAuthority to remain usable under explicit app/project binding.

### P-04 — Downstream production writers generally merge repository authority through source revisions

Reviewed production writers now call `mergeRepositoryAuthorityIntoWorkflowData(...)` with `inheritRepositoryAuthorityFromSourceRevisions(...)` in the relevant metadata construction points, including Project Planning handoff, Project Profile/Roadmap output promotion, Phase Map output, Work Card Intake handoff, Formal Work Card, Implementer Report reservation, Validation Record, Repair handoff, Repair Work Card, Phase Closeout, and Project Closeout.

This matches the intended prospective propagation model: temporary body-only drafts remain body-only, while application-owned canonical writers inject repositoryAuthority into durable metadata.

### P-05 — Architect Interview and Repair scope expansion is warranted

The Implementer touched Architect Interview and Repair paths because they are active canonical or MCP-prompt surfaces in the required propagation chain. That is within the Work Card's authorized surface and is not an unauthorized expansion.

## Blocking Findings

### B-01 — Required prospective-chain test does not prove Project Profile and Project Roadmap repositoryAuthority

WC46-REPAIR15 acceptance criterion 11 requires tests to prove a prospective new-project chain carries repositoryAuthority from Project Intake into at least:

```text
Project Planning handoff
Project Profile
Project Roadmap
Work Card Intake
Formal Work Card
```

The current tests prove most of this chain, but not Project Profile and Project Roadmap.

Evidence reviewed:

- `test/project-planning/project-planning-service.test.cjs` asserts `repositoryAuthority` on the Project Planning handoff metadata.
- The Project Planning promotion test reads the generated Project Profile and Project Roadmap, but asserts only artifact type, participation role, revision, disposition, and source revisions. It does not assert `profile.metadata.workflowData.repositoryAuthority` or `roadmap.metadata.workflowData.repositoryAuthority`.
- `test/work-card-planning/work-card-planning-service.test.cjs` asserts repositoryAuthority on the Work Card Intake handoff and Formal Work Card metadata.

Therefore, the required proof chain currently has this shape:

```text
Project Intake → proved
Project Architect Interview Prompt → proved
Project Planning handoff → proved
Project Profile → not test-proved
Project Roadmap → not test-proved
Work Card Intake → proved
Formal Work Card → proved
```

The reviewed Project Profile/Roadmap production code appears correct because `freshBundleMetadata(...)` and replacement promotion paths merge inherited repositoryAuthority into both outputs. But the Work Card did not ask only for source inspection; it explicitly required test proof for this part of the prospective chain.

Required correction:

```text
Add assertions to the existing Project Planning promotion test, or a focused equivalent test, proving:
- Project Profile metadata.workflowData.repositoryAuthority equals the inherited Project Planning handoff/source authority;
- Project Roadmap metadata.workflowData.repositoryAuthority equals the same authority;
- both preserve projectRepository and explicit mcpWorkspaceBinding.mcpWorkspaceId.
```

No production code change is required unless those assertions expose a real defect.

## Non-Blocking Concerns

### NB-01 — Conflict behavior is first-authority-wins

`inheritRepositoryAuthorityFromSources(...)` returns the first source containing repositoryAuthority and does not detect conflicting repositoryAuthority packets across multiple source documents.

This is not a blocker for WC46-REPAIR15 because the current prospective chain should carry one consistent authority packet from Project Intake forward. It is, however, a future hardening point if imported or manually altered documents can introduce conflicting repositoryAuthority values.

## Acceptance Criteria Assessment

1. Shared helper exists and is used by document writers — Pass.
2. New Project Intake metadata includes `repositoryAuthority.projectRepository` and preserves top-level `projectRepository` — Pass.
3. New Project Architect Interview Prompt metadata includes same repositoryAuthority — Pass.
4. New Project Architect Interview output metadata inherits repositoryAuthority — Pass by code review; no blocking defect found.
5. New Project Planning handoff/Profile/Roadmap inherit repositoryAuthority — Partial. Handoff is test-proved; Profile/Roadmap are code-reviewed but not test-proved.
6. New Phase Map / Phase Interview / Phase Planning / Work Card Plan inherit repositoryAuthority — Pass by reviewed writer pattern and reported validation; no blocking source defect found.
7. New Work Card Intake / Formal Work Card / Implementer Report / Validation Record / Repair handoff / Repair Work Card inherit repositoryAuthority — Pass by reviewed writer pattern; Work Card Intake/Formal Work Card are test-proved.
8. New Phase Closeout and Project Closeout inherit repositoryAuthority — Pass by code review.
9. MCP prompt generation uses only explicit repositoryAuthority/app binding — Pass.
10. Missing MCP binding still fails closed — Pass.
11. Tests prove prospective chain into Project Planning handoff/Profile/Roadmap and Work Card Intake/Formal Work Card — Fail, limited to missing Project Profile/Roadmap assertions.
12. Tests prove Project Repository is not used as MCP workspaceId — Pass.
13. No legacy migration — Pass.
14. No unrelated UI/workflow/routing/Codex changes — Pass for this pass; renderer changes in the dirty tree belong to prior REPAIR14, not REPAIR15.
15. No Git mutation — Pass.

## Validation Notes

The Implementer reported:

```text
npx tsc --noEmit → exit 0
npx tsc → exit 0 after sandbox emit failure in Windows lane
npx vite build → exit 0 after sandbox spawn EPERM false failure
node --test --test-concurrency=1 → exit 0, 313 tests passed
```

These results were not rerun during this review.

## Final Disposition

RevisionRequested.

Required repair is narrow: add the missing Project Profile and Project Roadmap repositoryAuthority assertions to the prospective Project Planning promotion test or equivalent focused test. Production code should remain unchanged unless that test exposes an actual propagation failure.