<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR11",
    "repairId": "WC46-REPAIR11",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Workspace-Bound MCP Prompt Contracts",
    "status": "approved_for_implementation",
    "executionMode": "one systemic prompt-contract repair after repeated cross-workspace Architect prompt drift",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "The first selected-workspace repair improved the Formal Work Card Architect prompt path, but workspace-binding rules were not propagated to every generated MCP prompt. Advisory Architect Review, Repair Work Card Architect, phase/project architect prompts, and artifact-toolbox examples still contain open-ended workspace resolution placeholders. When multiple MCP workspaces are configured, those prompts allow the embedded ChatGPT session to infer or search for a workspace instead of using application-bound workspace authority.",
    "rootCause": "MCP prompt instructions are duplicated across multiple prompt builders. WC46-REPAIR04 repaired the Formal Work Card prompt surface instead of introducing a shared workspace-bound MCP prompt contract consumed by all MCP prompt generators. Current prompt builders still contain phrases such as resolving the configured workspace ID when not known, repository reference <PROJECT_REPO>, and artifact_toolbox workspaceId <resolved workspace ID>.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Implement a shared workspace-bound MCP prompt contract and update every generated MCP prompt to consume it. This is not a regression repair of one prompt; it is systemic propagation of the selected-workspace authority model.",
    "reviewedAt": "2026-08-06"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR11 — Workspace-Bound MCP Prompt Contracts

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Classification

This is a systemic follow-up repair after repeated prompt-level workspace drift.

The immediate Operator-reported failure was in an Architect-review flow. The embedded ChatGPT session inferred `champcity_ai`, failed to resolve the supplied exact Work Card path there, searched configured workspaces, found `revisionary`, and then began reviewing the wrong workspace shape instead of stopping.

This is the same defect class that WC46-REPAIR04 partially addressed for Formal Work Card Architect prompting. The current failure is not evidence that the Formal Work Card prompt fix regressed. Repository evidence shows the fix was prompt-specific and incomplete. The same unsafe prompt pattern remains in other MCP prompt generators.

## Confirmed Defect

Generated MCP prompts are not consistently bound to the application-selected MCP workspace.

When multiple MCP workspaces exist, any prompt that asks the model to resolve the workspace, infer a repository, or fill `workspaceId` with a placeholder can route the Architect session into the wrong repository. That breaks Architect-review authority before any code review begins.

The invalid runtime behavior is:

```text
Prompt contains open workspace language
→ model calls diagnostics_toolbox.list_workspaces
→ multiple workspaces are returned
→ model infers or searches for matching files
→ exact artifact path is absent in the initially inferred workspace
→ model searches another workspace
→ model reviews the wrong repository or wrong project shape
```

The valid behavior is:

```text
Application-selected MCP workspace is bound before prompt generation
→ generated prompt contains the exact bound workspaceId
→ every MCP example uses that exact workspaceId
→ model may confirm the bound workspaceId exists, but may not choose another workspace
→ exact required artifact path is read from that workspace
→ missing path/revision/sha stops as BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH
→ no cross-workspace search occurs
```

## Source Evidence

Repository verified through ChampCity MCP workspace `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. The working tree is dirty from the active WC46 repair series. No Git mutation is authorized.

Inspected production paths and prompt builders:

```text
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/projectPlanning/projectPlanningService.ts
src/main/projectPlanning/projectPlanningDraftBundle.ts
src/main/phaseInterview/phaseInterviewService.ts
src/main/phaseInterview/phaseInterviewDraftOutput.ts
src/main/phaseMap/phaseMapService.ts
src/main/phaseMap/phaseMapDraftOutput.ts
src/main/phasePlanning/phasePlanningService.ts
src/main/phasePlanning/phasePlanningDraftBundle.ts
src/main/integrations/architectMcpHandoffService.ts
src/main/workspaceSettings.ts
src/shared/workspaceContracts.ts
```

Confirmed source facts:

1. `src/main/workCardPlanning/workCardPlanningService.ts` contains the WC46-REPAIR04 Formal Work Card prompt improvement: the prompt now says the application has already resolved the selected workspace, forbids other workspaces, and includes selected-workspace target evidence.
2. The same Formal Work Card prompt still includes an artifact-tool invocation example with `"workspaceId": "<resolved workspace ID>"`; therefore the prior fix was incomplete even on the formal prompt path.
3. `src/main/workCardValidation/workCardValidationService.ts` still emits advisory Architect Review prompts containing `Use ChampCity MCP with repository reference <PROJECT_REPO>.` and `Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.`
4. `src/main/workCardRepair/workCardRepairService.ts` tells the Repair Work Card Architect to use the selected workspace and not inspect others, but still gives an artifact-tool invocation example with `"workspaceId": "<resolved workspace ID>"`.
5. Project and phase architect prompt builders still contain the old generic pattern: `Use ChampCity MCP with repository reference <PROJECT_REPO>.` followed by workspace-resolution instructions.
6. `src/main/integrations/architectMcpHandoffService.ts` returns `repositoryReference: "<PROJECT_REPO>"` rather than a concrete MCP workspace binding.
7. `src/main/workspaceSettings.ts` currently stores the selected local workspace root, not a durable MCP `workspaceId` binding that can be embedded into ChatGPT MCP tool calls.
8. Existing tests prove the Formal Work Card prompt wording was improved, but there is no repository-wide prompt contract test preventing the old workspace-resolution phrasing from remaining in other generated prompts.

## Objective

Create one shared workspace-bound MCP prompt contract and make every generated MCP prompt consume it.

The Implementer must remove open-ended workspace resolution from generated prompts. The app must either generate prompts with a concrete application-bound MCP `workspaceId`, or refuse to generate/copy the prompt with a clear blocked state explaining that the selected workspace lacks MCP workspace binding.

This repair is not a broad workflow rewrite. It is a prompt-contract and workspace-binding repair.

## Runtime Sequence

### Bound prompt generation

```text
Operator selects or has already selected a project workspace in the app
→ app resolves/loads the selected MCP workspace binding for that workspace
→ prompt generator receives a bound MCP workspace descriptor
→ prompt includes the exact workspaceId value
→ prompt includes exact required artifact paths, revisions, and sha256 values when applicable
→ prompt explicitly forbids inspecting or searching any other MCP workspace
→ prompt artifact_toolbox examples use the exact workspaceId value, not a placeholder
```

### Architect review preflight

```text
Embedded Architect chat receives prompt
→ it may call diagnostics_toolbox.list_workspaces only to confirm that the bound workspaceId exists
→ it must call repository/artifact/git tools using the exact bound workspaceId
→ it reads the exact Work Card / report / handoff / validation paths in that workspace
→ if any exact path, revision, or sha256 cannot be verified in that workspace, it stops as BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH
→ it does not search other configured workspaces
→ it does not infer repository identity from filenames or path matches
```

### Prompt blocked state

```text
Prompt requested
→ app cannot provide a concrete bound MCP workspaceId
→ app does not emit a prompt containing <PROJECT_REPO> or <resolved workspace ID>
→ UI/model returns blocked status requiring Operator to configure or select the MCP workspace binding
```

## Required Changes

### 1. Add a shared workspace-bound MCP prompt contract builder

Create one shared main-process helper responsible for generating MCP workspace binding instructions for prompts.

The exact file name is implementer-owned, but it must be narrowly named and centrally reusable, for example:

```text
src/main/integrations/mcpWorkspacePromptContract.ts
src/main/integrations/workspaceBoundMcpPrompt.ts
src/main/architectOutputs/workspaceBoundPromptPrelude.ts
```

The helper must produce a consistent prompt block equivalent to:

```text
MCP workspace binding:
- Bound workspaceId: <exact workspaceId>
- Bound workspace label: <safe label if available>
- Bound repository: <repositoryName if available, otherwise Not git-backed / Not provided>
- Use this workspaceId in every ChampCity MCP tool call.
- Do not inspect, search, compare, or fall back to any other configured workspace.
- diagnostics_toolbox.list_workspaces may be used only to confirm that this workspaceId exists.
- If the bound workspaceId is absent, inaccessible, or does not contain the exact required artifact path, stop with BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH.
```

The helper must also support artifact-writing prompts by producing concrete invocation examples:

```json
{
  "action": "create_markdown_artifact",
  "workspaceId": "<literal-bound-workspace-id>",
  "params": {
    "relativePath": "<target draft path>",
    "content": "<body markdown>",
    "overwrite": false
  }
}
```

`<literal-bound-workspace-id>` above means the generated prompt must contain the actual bound workspace ID string. It must not contain the placeholder text `resolved workspace ID`.

### 2. Add or expose durable MCP workspace binding in selected workspace state

The app currently stores the selected local workspace root. That is insufficient for ChatGPT MCP tool calls when multiple MCP workspaces exist.

Add a durable binding path so prompt generation can access an exact MCP workspace ID. Approved implementation approaches:

- extend selected workspace settings/contracts to include `mcpWorkspaceId` and optional display fields such as label, repositoryName, branch, and git-backed state;
- add a typed resolver that maps the selected app workspace to an MCP workspace ID only when the match is unambiguous and test-proven;
- require explicit Operator configuration of the MCP workspace ID before MCP handoff prompts can be generated.

If an exact MCP workspace ID cannot be resolved, prompt generation must fail closed with a clear blocked state. It must not emit a prompt that asks ChatGPT to resolve or infer the workspace.

Do not expose unnecessary absolute local paths in copied prompts unless a pre-existing prompt contract already requires a working-directory path for local tool execution. MCP binding should use safe workspace identity fields, exact repository-relative paths, and exact artifact metadata.

### 3. Update every generated MCP prompt to consume the shared binding

Replace local duplicated workspace instructions in all prompt generators that instruct ChatGPT to use ChampCity MCP.

At minimum, update these prompt surfaces:

```text
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/projectPlanning/projectPlanningService.ts
src/main/projectPlanning/projectPlanningDraftBundle.ts
src/main/phaseInterview/phaseInterviewService.ts
src/main/phaseInterview/phaseInterviewDraftOutput.ts
src/main/phaseMap/phaseMapService.ts
src/main/phaseMap/phaseMapDraftOutput.ts
src/main/phasePlanning/phasePlanningService.ts
src/main/phasePlanning/phasePlanningDraftBundle.ts
src/main/integrations/architectMcpHandoffService.ts
```

For each prompt, preserve its domain-specific instructions, but replace generic workspace language with the shared workspace-bound MCP contract.

Forbidden generated prompt language after this repair:

```text
Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.
Resolve the configured workspace ID
when it is not already known
workspaceId": "<resolved workspace ID>"
Treat that selected workspace as <PROJECT_REPO>
Use ChampCity MCP with repository reference <PROJECT_REPO>.
```

Allowed prompt behavior:

```text
Use ChampCity MCP workspaceId "<actual-bound-id>" only.
Confirm the bound workspace exists if needed.
Stop if exact required artifacts cannot be read there.
Do not inspect or search any other workspace.
```

If any of the forbidden strings remain only in tests as negative-test fixtures, the tests must make that context explicit.

### 4. Repair Advisory Architect Review prompt generation

`buildAdvisoryArchitectReviewPrompt(...)` is a confirmed defective path.

Required advisory review prompt behavior:

```text
- include exact bound workspaceId;
- include exact Formal Work Card path, revision, and sha256;
- include exact Implementer Report path, revision, and sha256;
- instruct Architect to read those exact paths only from the bound workspace;
- instruct Architect to stop as BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH if either artifact fails exact verification;
- forbid searching other workspaces;
- forbid treating a missing exact path as implementation absence.
```

Advisory review remains advisory only. Do not allow it to approve, reject, validate, write files, or create repair artifacts.

### 5. Repair Repair Work Card Architect prompt generation

`buildRepairWorkCardPreparedInstruction(...)` must stop using `workspaceId: "<resolved workspace ID>"` in its artifact creation instruction.

Required Repair Work Card Architect prompt behavior:

```text
- include exact bound workspaceId;
- include exact Validation Record path when post-validation;
- include exact Implementer Report path;
- include exact Formal Work Card path when known;
- include exact Approved Repair Architect handoff path and revision;
- include exact temporary draft target path;
- artifact_toolbox.create_markdown_artifact example uses the exact bound workspaceId;
- no other workspace may be inspected or written;
- if any exact source path is absent from the bound workspace, stop as BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH.
```

### 6. Upgrade Formal Work Card Architect prompt generation without regressing WC46-REPAIR04

Preserve the selected-workspace target evidence added by WC46-REPAIR04, but upgrade the remaining placeholder parts:

```text
- replace repository reference <PROJECT_REPO> with exact bound workspaceId language;
- replace artifact_toolbox workspaceId <resolved workspace ID> with the exact bound workspaceId;
- preserve handoff path, Formal Work Card target path, and Implementer Report target path evidence;
- preserve the abort condition when exact selected workspace verification fails.
```

### 7. Repair phase/project architect prompt generation

Project Planning, Phase Interview, Phase Map, and Phase Planning prompt generation must consume the same shared MCP workspace binding.

Do not leave older variants of:

```text
Use ChampCity MCP with repository reference <PROJECT_REPO>.
Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.
workspaceId": "<resolved workspace ID>"
```

Those prompts may still instruct the Architect to read exact source inputs and write exact draft paths, but all MCP calls and artifact creation examples must use the bound workspaceId.

### 8. Add repository-wide prompt contract tests

Add or update tests so this defect class cannot reappear in one prompt family while another remains defective.

Required tests:

```text
- Generate each MCP prompt family and assert it includes a concrete bound workspaceId.
- Assert generated prompts do not include the forbidden open-ended workspace strings.
- Assert artifact_toolbox examples use the exact bound workspaceId, not a placeholder.
- Assert advisory review prompts stop/forbid cross-workspace fallback on exact path/revision/sha mismatch.
- Assert repair-work-card prompts stop/forbid cross-workspace fallback and use exact workspaceId in create_markdown_artifact examples.
- Assert Formal Work Card prompt still includes selected workspace target evidence from WC46-REPAIR04 while using exact workspaceId.
- Assert prompt generation is blocked when the app lacks a bound MCP workspaceId.
```

At least one negative test must model multiple configured MCP workspaces:

```text
Given multiple MCP workspaces exist
And the prompt is bound to workspaceId "alpha"
And the requested artifact path is absent from "alpha" but present in "beta"
Then the prompt contract requires BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH
And the model is forbidden from searching or switching to "beta"
```

This may be a prompt-contract fixture test rather than a live MCP call test.

## Preserved Behavior

Preserve unchanged:

- WC46-REPAIR04 selected-workspace target binding semantics for Formal Work Card Architect prompts;
- Formal Work Card path, Implementer Report path, draft path, and source-revision generation;
- Repair Work Card Architect handoff authority from Validation Record / Implementer Report / Formal Work Card / Repair Architect handoff;
- Advisory Architect Review as decision-support only;
- project and phase prompt bodies and required output headings except for workspace-binding preflight and artifact-tool invocation examples;
- application-owned artifact promotion, canonical metadata, final writes, review state, and cleanup;
- existing workspace-root validation behavior unless extending it to include MCP workspace ID binding;
- no hidden sidecar documents, alternate authority records, route tokens, global repo search, or cross-workspace fallback;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/integrations/architectMcpHandoffService.ts
src/main/workspaceSettings.ts
src/shared/workspaceContracts.ts
src/main/main.ts
src/preload/index.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/projectPlanning/projectPlanningService.ts
src/main/projectPlanning/projectPlanningDraftBundle.ts
src/main/phaseInterview/phaseInterviewService.ts
src/main/phaseInterview/phaseInterviewDraftOutput.ts
src/main/phaseMap/phaseMapService.ts
src/main/phaseMap/phaseMapDraftOutput.ts
src/main/phasePlanning/phasePlanningService.ts
src/main/phasePlanning/phasePlanningDraftBundle.ts
```

A new narrowly named shared prompt-contract helper is authorized under one of these areas:

```text
src/main/integrations/
src/main/architectOutputs/
src/main/documents/
```

Renderer files are authorized only if needed to display or configure the selected MCP workspace binding or blocked prompt state:

```text
src/renderer/app/App.tsx
src/renderer/app/WorkCardPlanningWorkspace.tsx
src/renderer/app/WorkCardRepairWorkspace.tsx
src/renderer/app/WorkCardReportReviewWorkspace.tsx
src/renderer/styles.css
```

If a listed renderer file does not exist, do not create it merely to satisfy this list. Use the existing renderer surface that owns the relevant prompt UI.

Tests authorized:

```text
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/work-card-planning/work-card-planning-service.test.cjs
test/work-card-validation/work-card-validation-service.test.cjs
test/work-card-repair/work-card-repair-service.test.cjs
test/project-planning/project-planning-service.test.cjs
test/phase-interview/phase-interview-service.test.cjs
test/phase-map/phase-map-service.test.cjs
test/phase-planning/phase-planning-service.test.cjs
test/app-shell/app-shell.test.cjs
test/preload/preload-contract.test.cjs
test/shared/workspace-contracts.test.cjs
```

A new prompt-contract test file is authorized if no existing test file cleanly owns repository-wide generated MCP prompt assertions.

## Acceptance Criteria

1. A shared workspace-bound MCP prompt contract builder exists and is consumed by all generated MCP prompt families listed in this card.
2. Prompt generation has access to a concrete bound MCP `workspaceId`, or prompt generation fails closed with a clear blocked state.
3. No generated MCP prompt asks ChatGPT to resolve a workspace ID when it is not known.
4. No generated MCP prompt contains `workspaceId: "<resolved workspace ID>"` or equivalent placeholder artifact-tool examples.
5. Advisory Architect Review prompts include exact bound workspaceId, exact Formal Work Card path/revision/sha256, exact Implementer Report path/revision/sha256, and explicit BLOCKED behavior for mismatch.
6. Repair Work Card Architect prompts include exact bound workspaceId and exact source/target paths, and their artifact-tool examples use the exact bound workspaceId.
7. Formal Work Card Architect prompts preserve WC46-REPAIR04 selected-workspace target evidence while replacing remaining open placeholders with exact bound workspaceId behavior.
8. Project Planning, Phase Interview, Phase Map, and Phase Planning prompts no longer use open-ended workspace-resolution instructions or placeholder workspace IDs.
9. Missing exact source artifact in the bound workspace is treated as a blocked workspace/artifact mismatch, not as proof the artifact does not exist anywhere and not as permission to search other workspaces.
10. Tests cover at least one multi-workspace negative scenario where the artifact exists in another workspace but must not be used.
11. Tests fail if future generated prompts reintroduce open-ended workspace resolution language.
12. Non-MCP workflow routing, artifact promotion, canonical metadata, and review state behavior remain unchanged.
13. No Git mutation is performed.

## Negative Constraints

Do not:

- fix this by adding more prose to one individual prompt only;
- leave duplicated local workspace-binding prompt fragments in multiple services;
- make ChatGPT infer workspace identity from diagnostics results;
- search all configured workspaces when an exact path is absent in the bound workspace;
- silently choose the workspace that contains a matching path;
- treat a missing exact artifact path in the bound workspace as an implementation defect;
- emit prompts containing `<PROJECT_REPO>` as the operative repository authority;
- emit artifact-tool examples containing `"workspaceId": "<resolved workspace ID>"`;
- expose unnecessary absolute local paths in copied prompts;
- change MCP server behavior;
- alter unrelated Work Card loop authority, repair routing, validation disposition, or Codex implementer behavior;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

After implementation, the Work Card loop must remain on WC46-REPAIR11 implementation/report review.

Expected return sequence:

```text
WC46-REPAIR11 implementation complete
→ application-owned Implementer Report at planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md
→ Architect review of that report
→ Operator validation
→ return to the active WC46 repair/work-card loop according to existing resolver authority
```

## Implementer Report Requirements

The Implementer Report must be written to exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR11_workspace_bound_mcp_prompt_contracts.md
```

The report must include:

- summary of the shared workspace-bound MCP prompt contract implementation;
- exact production files changed;
- every prompt family updated;
- before/after examples for at least Advisory Architect Review, Repair Work Card Architect, Formal Work Card Architect, and one phase/project prompt;
- evidence that artifact-tool examples now use exact bound workspaceId or fail closed when missing;
- negative-test evidence for multi-workspace blocked behavior;
- exact validation commands, working directory, exit codes, and result summaries;
- acceptance-criteria mapping;
- any skipped validation or residual risk.

The report must remain `Pending` for Architect/Operator review.

## Manual Validation

Manual validation after implementation:

1. Generate/copy an Advisory Architect Review prompt while multiple MCP workspaces are configured.
2. Confirm the prompt contains one exact bound workspaceId and does not contain generic workspace-resolution language.
3. Confirm the prompt instructs the reviewer to stop if the exact Work Card or Implementer Report path is not present in the bound workspace.
4. Generate/copy a Repair Work Card Architect prompt.
5. Confirm the `artifact_toolbox.create_markdown_artifact` example contains the exact bound workspaceId and not a placeholder.
6. Generate/copy a Formal Work Card Architect prompt.
7. Confirm it still includes selected workspace target evidence and now uses exact MCP workspace ID authority.
8. Generate/copy a Project/Phase Architect prompt.
9. Confirm it uses the same shared workspace-bound MCP preflight.
10. Confirm no prompt suggests searching another configured workspace when exact artifacts are missing.
