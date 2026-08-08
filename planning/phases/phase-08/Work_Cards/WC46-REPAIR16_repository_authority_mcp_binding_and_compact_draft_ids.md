<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR16",
    "repairId": "WC46-REPAIR16",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR15_repository_authority_propagation.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR15_repository_authority_propagation.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR15_repository_authority_propagation.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Repository Authority/MCP Binding Separation and Compact Architect Draft IDs",
    "status": "approved_for_implementation",
    "executionMode": "one bounded repair addressing two confirmed blockers exposed by WC46-REPAIR15 validation",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "WC46-REPAIR15 propagated repositoryAuthority but coupled repositoryAuthority presence to mandatory MCP binding in handoff preparation, then manual MCP binding exposed a second failure where Architect draft submission IDs encode long source handoff paths and exceed the 240-character submission ID limit.",
    "rootCause": "Repository authority and MCP tool-routing binding were treated as the same readiness requirement, while deterministic Architect draft submission IDs used full encoded source paths instead of compact deterministic path digests.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR16_repository_authority_mcp_binding_and_compact_draft_ids.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Separate repository authority from optional MCP binding and replace full-path encoded Architect draft IDs with compact deterministic IDs. Do not reintroduce workspace inference.",
    "reviewedAt": "2026-08-07"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR16 — Repository Authority/MCP Binding Separation and Compact Architect Draft IDs

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Confirmed Defect

Two blockers were confirmed after WC46-REPAIR15.

### Defect A — Repository authority is coupled to mandatory MCP binding

WC46-REPAIR15 made `repositoryAuthority` propagation broadly available, but MCP handoff preparation now treats a repositoryAuthority packet without `mcpWorkspaceBinding` as a hard repository-authority failure.

Confirmed implementation evidence:

```text
src/main/documents/repositoryAuthority.ts
- requireRepositoryAuthorityForPrompt(...) throws when repositoryAuthority exists without mcpWorkspaceBinding.

src/main/integrations/mcpWorkspacePromptContract.ts
- bindingForPrompt(...) calls requireRepositoryAuthorityForPrompt(...) whenever workflowData contains repositoryAuthority.

src/main/integrations/architectMcpHandoffService.ts
- buildArchitectHandoffManifest(...) reads Project Architect Interview Prompt workflowData and calls requireRepositoryAuthorityForPrompt(...).
```

Operator-visible failure:

```text
Error invoking remote method 'architectOutput:prepareHandoff':
Error: BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH: current repository authority has no explicit MCP workspace binding. Bind or select the ChampCity MCP workspace before generating this prompt.
```

This is wrong because `repositoryAuthority.projectRepository` is required repository evidence, while `repositoryAuthority.mcpWorkspaceBinding` is optional MCP tool-routing configuration. Missing MCP binding may block an MCP-dependent handoff action, but it must not mean repository authority is absent or corrupt.

### Defect B — Architect draft submission IDs encode full source paths and exceed length limits

After the Operator manually supplied MCP binding, the previous blocker cleared and a second error surfaced:

```text
Error invoking remote method 'architectOutput:prepareHandoff':
Error: Architect draft submission ID must be path-safe and 240 characters or fewer.
```

Confirmed implementation evidence:

```text
src/main/architectOutputs/architectDraftPaths.ts
- buildDeterministicArchitectDraftSubmissionId(...) builds the submission ID from owningWorkspaceId, outputKind, submissionKey, full base32-encoded sourceHandoff.path, and revision.
- assertSafeSubmissionId(...) rejects IDs longer than 240 characters.
```

The source handoff path for the observed project is valid but long:

```text
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_pocket_decision_log.md
```

Encoding the entire path into a directory-name component is the wrong design. The full source path is authority evidence and must remain stored in the submission record. It does not belong fully encoded into the path-safe submission ID.

## Objective

Repair both blockers without changing workflow authority.

Required outcome:

```text
repositoryAuthority.projectRepository remains mandatory and propagated
→ repositoryAuthority.mcpWorkspaceBinding remains optional and explicit-only
→ MCP-dependent handoff actions use explicit binding when present
→ missing MCP binding blocks only the MCP handoff action with a clear setup message
→ Architect draft submission IDs remain deterministic and path-safe using compact source-path identity
→ long valid source handoff paths no longer block draft preparation
```

## Runtime Sequence

### No explicit MCP binding

```text
New Project Intake submitted
→ projectRepository is persisted in repositoryAuthority
→ downstream documents inherit repositoryAuthority.projectRepository
→ Architect Interview workspace can display current documents normally
→ Prepare Handoff detects missing explicit MCP binding
→ action is blocked with an MCP setup/configuration message
→ no prompt is emitted
→ no workspaceId is inferred
```

### Explicit MCP binding present

```text
New Project Intake submitted with explicit MCP binding available
→ repositoryAuthority includes projectRepository and mcpWorkspaceBinding
→ Prepare Handoff reads the explicit mcpWorkspaceBinding
→ Architect draft submission ID is generated with a compact deterministic source identity
→ submission directory path stays within length limits
→ prepared handoff can be copied
```

## Required Changes

### 1. Separate repository authority from MCP binding readiness

Keep `repositoryAuthority.projectRepository` mandatory for repository authority propagation.

Keep `repositoryAuthority.mcpWorkspaceBinding` optional and explicit-only.

Do not treat missing `mcpWorkspaceBinding` as missing repository authority.

Update the prompt/handoff helpers so they distinguish:

```text
repositoryAuthority missing
→ metadata propagation defect or legacy no-authority condition, depending current path

repositoryAuthority.projectRepository present but mcpWorkspaceBinding missing
→ MCP workspace binding required for this handoff action
```

The blocked message for MCP-dependent prompt generation must be clear and specific, for example:

```text
BLOCKED_MCP_WORKSPACE_BINDING_REQUIRED: current project has repository authority but no explicit MCP workspace binding. Bind/select the ChampCity MCP workspace before preparing MCP handoff prompts.
```

Exact wording may differ, but it must not claim repository authority is missing when only MCP binding is missing.

### 2. Preserve explicit-only MCP behavior

Do not reintroduce any inferred MCP workspace path.

MCP workspace ID must not be derived from:

```text
projectRepository
folder name
Git remote
repository name
MCP diagnostics
artifact path search
similarity matching
```

When explicit binding exists in `repositoryAuthority.mcpWorkspaceBinding` or another WC46-REPAIR12-authorized explicit app/project binding source, use it literally.

When explicit binding does not exist, do not emit an MCP prompt.

### 3. Fix Architect draft submission ID construction

Update `src/main/architectOutputs/architectDraftPaths.ts` so `buildDeterministicArchitectDraftSubmissionId(...)` no longer includes the full base32-encoded `sourceHandoff.path` in the submission ID.

Replace the full path component with a compact deterministic source-path digest.

Approved shape example:

```text
ad-<owning-workspace>-<output-kind>-<submission-key>-src-<short-digest>-r<revision>
```

Requirements:

- deterministic for the same owning workspace, output kind, submission key, sourceHandoff.path, and sourceHandoff.revision;
- path-safe under the existing `safeSegmentPattern`;
- short enough to remain below `maxArchitectDraftSubmissionIdLength` and `maxArchitectDraftRelativePathLength` for valid long source paths;
- collision-resistant enough for draft directory identity; use an existing Node crypto digest or an equivalent deterministic hash;
- do not remove full `sourceHandoff.path` and `sourceHandoff.revision` from the submission record;
- stale/source mismatch checks must continue to use the full stored sourceHandoff path and revision, not the digest alone.

### 4. Add real-path regression tests

Add or update tests so the real failing path is covered:

```text
planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_pocket_decision_log.md
```

The test must prove Architect Interview handoff preparation does not fail due to submission ID length when explicit MCP binding exists.

Add at least one second long valid source handoff path covering a Work Card or Repair handoff path.

### 5. Add no-binding regression tests

Add a fixture that does not automatically create `.champcity/mcp-workspace-binding.json`.

Tests must prove:

- new Project Intake with only `projectRepository` still writes repositoryAuthority.projectRepository;
- Project Architect Interview Prompt metadata can carry repositoryAuthority without mcpWorkspaceBinding;
- Architect Interview workspace/document projection remains usable;
- Prepare Handoff blocks only because MCP binding is missing;
- the error is an MCP binding setup blocker, not a repository-authority corruption claim;
- no prompt or artifact-tool JSON is emitted without explicit MCP binding.

The existing fixture that auto-creates `.champcity/mcp-workspace-binding.json` must not be the only fixture covering new project flows.

## Preserved Behavior

Preserve unchanged:

- WC46-REPAIR12 prohibition against inferred MCP workspace fallbacks;
- WC46-REPAIR13 top-level `workflowData.projectRepository` compatibility;
- WC46-REPAIR15 prospective `repositoryAuthority.projectRepository` propagation;
- canonical metadata ownership by the application, not ChatGPT;
- temporary Architect drafts remain body-only;
- sourceHandoff path and revision stored in submission records;
- draft promotion stale/source mismatch protections;
- Work Card loop authority, repair routing, validation authority, close/next routing, Codex behavior, and renderer UI behavior except for displaying the corrected error message already returned by backend;
- no legacy migration;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/documents/repositoryAuthority.ts
src/main/integrations/mcpWorkspacePromptContract.ts
src/main/integrations/architectMcpHandoffService.ts
src/main/architectOutputs/architectDraftPaths.ts
```

Supporting production files may be changed only if required to pass the revised helper API through existing call sites:

```text
src/main/architectOutputs/architectDraftSubmissionService.ts
src/main/architectOutputs/architectOutputRuntimeService.ts
src/main/architectInterview/architectInterviewDraftPilot.ts
src/main/architectInterview/architectInterviewService.ts
src/main/projectIntake/projectIntakeService.ts
```

Tests authorized:

```text
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/architect-interview/architect-interview-workspace.test.cjs
test/project-intake/project-intake-service.test.cjs
test/work-card-planning/work-card-planning-service.test.cjs
test/work-card-repair/work-card-repair-service.test.cjs
test/support/canonical-markdown-fixtures.cjs
```

A new focused Architect draft path or repository-authority/MCP binding test file is authorized if cleaner.

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR16_repository_authority_mcp_binding_and_compact_draft_ids.md
```

## Acceptance Criteria

1. `repositoryAuthority.projectRepository` remains persisted and propagated prospectively.
2. `repositoryAuthority.mcpWorkspaceBinding` remains optional and explicit-only.
3. Missing `mcpWorkspaceBinding` no longer produces an error claiming repository authority is missing or corrupt.
4. Missing `mcpWorkspaceBinding` blocks MCP-dependent handoff/prompt generation before prompt emission with a clear MCP binding setup message.
5. No MCP workspace ID is inferred from `projectRepository`, folder name, Git remote, repository name, diagnostics, or artifact path search.
6. Explicit `mcpWorkspaceBinding.mcpWorkspaceId` is used literally when present.
7. `buildDeterministicArchitectDraftSubmissionId(...)` no longer embeds the full encoded `sourceHandoff.path` in the submission ID.
8. Submission IDs remain deterministic and path-safe.
9. Full `sourceHandoff.path` and `sourceHandoff.revision` remain stored in the submission record and remain the authority for stale/source mismatch checks.
10. The real failing Architect Interview Prompt path for `pocket_decision_log` no longer causes a 240-character submission ID failure when explicit MCP binding exists.
11. A long Work Card or Repair handoff path no longer causes a 240-character submission ID failure.
12. Tests include a new-project fixture without `.champcity/mcp-workspace-binding.json` and prove repositoryAuthority.projectRepository still persists.
13. Tests prove no prompt/artifact-tool JSON is emitted without explicit MCP binding.
14. Existing explicit-binding happy-path tests continue to pass.
15. No legacy document migration is performed.
16. No unrelated workflow routing, validation, repair, close, Codex, or UI redesign changes are introduced.
17. No Git mutation is performed.

## Negative Constraints

Do not:

- make `projectRepository` a substitute for `mcpWorkspaceId`;
- infer or synthesize MCP workspace ID from path, folder, Git, diagnostics, repository name, or artifact search;
- make repositoryAuthority optional in new prospective canonical documents;
- rewrite or backfill legacy documents;
- raise the submission ID length limit as the primary fix;
- remove sourceHandoff path/revision from submission records;
- weaken stale/source mismatch protections;
- reintroduce body-authored metadata or hidden ChatGPT authority fields;
- change MCP server behavior;
- redesign workspace-selection UI;
- alter unrelated lifecycle rails, browser panes, validation decisions, repair routing, close routing, or Codex execution;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

```text
WC46-REPAIR16 implementation complete
→ planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR16_repository_authority_mcp_binding_and_compact_draft_ids.md
→ Architect review
→ Operator validation
→ return to active WC46 workflow according to existing resolver authority
```

## Implementer Report Requirements

The Implementer Report must include:

- exact files changed;
- RCA confirmation for both defects;
- before/after behavior for missing MCP binding;
- before/after behavior for long source handoff paths;
- exact new submission ID shape and why it remains deterministic;
- proof that full sourceHandoff path/revision remain in the submission record;
- proof that no MCP inference fallback was introduced;
- validation commands, working directory, exit codes, and result summaries;
- acceptance-criteria mapping;
- skipped validation or residual risk.

The report must remain `Pending` for Architect/Operator review.

## Manual Validation

1. Create a new project without explicit MCP binding.
2. Confirm Project Intake and Project Architect Interview Prompt metadata contain `repositoryAuthority.projectRepository`.
3. Confirm Architect Interview workspace displays normally.
4. Click Prepare Handoff and confirm the error is a clear MCP binding setup blocker, not a repository-authority failure.
5. Add explicit MCP binding for the project.
6. Click Prepare Handoff again and confirm no 240-character Architect draft submission ID error occurs.
7. Confirm Copy Handoff becomes available after successful preparation.
8. Confirm no legacy document was migrated solely for this repair.
